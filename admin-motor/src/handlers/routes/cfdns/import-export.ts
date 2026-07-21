import { resolveAdminActorFromRequest } from '../../../../../functions/api/_lib/admin-actor';
import type { D1Database } from '../../../../../functions/api/_lib/operational';
import { logModuleOperationalEvent } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace } from '../../../../../functions/api/_lib/request-trace';
import { CfApiError, cfApiRequest, cfApiRequestRaw } from '../_lib/cf-api-core';

type Env = {
  BIGDATA_DB?: D1Database;
  CLOUDFLARE_DNS?: string;
};

type Context = {
  request: Request;
  env: Env;
  data?: {
    env?: Env;
  };
};

// Teto local do arquivo de zona BIND aceito no import (2 MB): protege o motor
// de uploads acidentais gigantes antes de qualquer chamada à Cloudflare.
const IMPORT_MAX_FILE_BYTES = 2_000_000;

const toHeaders = () => ({
  'Content-Type': 'application/json',
});

const toError = (message: string, trace: { request_id: string; timestamp: string }, status = 500) =>
  new Response(
    JSON.stringify({
      ok: false,
      ...trace,
      error: message,
    }),
    {
      status,
      headers: toHeaders(),
    },
  );

const resolveErrorStatus = (error: unknown) => {
  if (error instanceof CfApiError) {
    if (error.kind === 'missing-token') {
      return 500;
    }
    if (error.kind === 'api' && error.status >= 400 && error.status < 500) {
      return error.status;
    }
  }
  return 502;
};

// Nome de arquivo seguro para o header Content-Disposition: só
// [A-Za-z0-9._-], sem aspas/quebras de linha que permitiriam header injection.
const sanitizeFilenamePart = (value: string) =>
  value
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

const logTelemetry = async (
  env: Env,
  event: { ok: boolean; action: 'export' | 'import'; errorMessage?: string; metadata: Record<string, unknown> },
) => {
  if (!env.BIGDATA_DB) {
    return;
  }
  try {
    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'cfdns',
      source: 'bigdata_db',
      fallbackUsed: false,
      ok: event.ok,
      ...(event.errorMessage ? { errorMessage: event.errorMessage } : {}),
      metadata: {
        action: event.action,
        provider: 'cloudflare-api',
        ...event.metadata,
      },
    });
  } catch {
    // Telemetria não bloqueia resposta.
  }
};

export async function onRequestGetExport(context: Context) {
  const trace = createResponseTrace(context.request);
  const url = new URL(context.request.url);
  const zoneId = String(url.searchParams.get('zoneId') ?? '').trim();
  const zoneName = String(url.searchParams.get('zoneName') ?? '').trim();
  const env = context.data?.env ?? context.env;

  if (!zoneId) {
    return toError('Parâmetro zoneId é obrigatório.', trace, 400);
  }

  try {
    const upstream = await cfApiRequestRaw(
      env,
      'dns',
      `/zones/${encodeURIComponent(zoneId)}/dns_records/export`,
      'Falha ao exportar a zona no formato BIND — verifique se o zoneId existe e se o token tem acesso à zona',
    );

    await logTelemetry(env, { ok: true, action: 'export', metadata: { zoneId } });

    const filename = `${sanitizeFilenamePart(zoneName) || sanitizeFilenamePart(zoneId) || 'zona'}.txt`;
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao exportar a zona no formato BIND.';
    await logTelemetry(env, { ok: false, action: 'export', errorMessage: message, metadata: { zoneId } });
    return toError(message, trace, resolveErrorStatus(error));
  }
}

export async function onRequestPostImport(context: Context) {
  const trace = createResponseTrace(context.request);
  const env = context.data?.env ?? context.env;
  const adminActor = resolveAdminActorFromRequest(context.request);

  let formData: FormData;
  try {
    formData = await context.request.formData();
  } catch {
    return toError(
      'Corpo da requisição inválido: envie multipart/form-data com os campos zoneId, file e proxied.',
      trace,
      400,
    );
  }

  const zoneId = String(formData.get('zoneId') ?? '').trim();
  const file = formData.get('file');
  const proxiedRaw = String(formData.get('proxied') ?? '')
    .trim()
    .toLowerCase();
  const proxied = proxiedRaw === 'true' ? 'true' : 'false';

  if (!zoneId) {
    return toError('Campo zoneId é obrigatório no formulário de import.', trace, 400);
  }

  if (!(file instanceof File)) {
    return toError('Campo file é obrigatório: anexe o arquivo de zona BIND (.txt ou .zone).', trace, 400);
  }

  if (file.size > IMPORT_MAX_FILE_BYTES) {
    return toError('Arquivo excede 2 MB — divida o arquivo de zona em partes menores antes de importar.', trace, 400);
  }

  try {
    // FormData novo para a Cloudflare: o cf-api-core não força Content-Type
    // quando o body é FormData, deixando o fetch definir o boundary multipart.
    const cfForm = new FormData();
    cfForm.append('file', file);
    cfForm.append('proxied', proxied);

    const { result } = await cfApiRequest<{ recs_added?: number; total_records_parsed?: number }>(
      env,
      'dns',
      `/zones/${encodeURIComponent(zoneId)}/dns_records/import`,
      'Falha ao importar o arquivo de zona BIND na Cloudflare',
      {
        method: 'POST',
        body: cfForm,
      },
    );

    const recsAdded = Number(result?.recs_added ?? 0);
    const totalRecordsParsed = Number(result?.total_records_parsed ?? 0);

    await logTelemetry(env, {
      ok: true,
      action: 'import',
      metadata: { adminActor, zoneId, proxied, fileBytes: file.size, recsAdded, totalRecordsParsed },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        zoneId,
        recsAdded,
        totalRecordsParsed,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao importar o arquivo de zona BIND.';
    await logTelemetry(env, {
      ok: false,
      action: 'import',
      errorMessage: message,
      metadata: { adminActor, zoneId, proxied, fileBytes: file.size },
    });
    return toError(message, trace, resolveErrorStatus(error));
  }
}
