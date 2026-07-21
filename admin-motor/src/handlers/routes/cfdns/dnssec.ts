// DNS-3: leitura e alteração de DNSSEC da zona (GET/PATCH
// /zones/{id}/dnssec). Desativar DNSSEC na zona crítica exige confirmação
// reforçada (nome digitado + flag de ciência), pois pode derrubar a resolução
// de todos os apps enquanto o DS antigo permanecer no registrador.

import { resolveAdminActorFromRequest } from '../_lib/admin-actor';
import { CfApiError, cfApiRequest } from '../_lib/cf-api-core';
import type { D1Database } from '../_lib/operational';
import { logModuleOperationalEvent } from '../_lib/operational';
import { createResponseTrace } from '../_lib/request-trace';
import { isCriticalZoneName } from './zones-admin';

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

type CloudflareDnssec = {
  status?: string;
  algorithm?: string | null;
  digest?: string | null;
  digest_algorithm?: string | null;
  digest_type?: string | null;
  ds?: string | null;
  flags?: number | null;
  key_tag?: number | null;
  key_type?: string | null;
  public_key?: string | null;
  dnssec_multi_signer?: boolean;
  dnssec_presigned?: boolean;
  dnssec_use_nsec3?: boolean;
  modified_on?: string | null;
};

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

const getEnv = (context: Context) => context.data?.env ?? context.env;

const isZoneNotFound = (error: unknown) =>
  error instanceof CfApiError &&
  (error.status === 404 || error.code === 7003 || error.errors.some((detail) => detail.code === 7003));

const resolveErrorStatus = (error: unknown) => {
  if (isZoneNotFound(error)) {
    return 404;
  }
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

const logDnssecEvent = async (
  context: Context,
  action: 'dnssec-get' | 'dnssec-patch',
  metadata: Record<string, unknown>,
  errorMessage?: string,
) => {
  const env = getEnv(context);
  if (!env.BIGDATA_DB) {
    return;
  }

  try {
    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'cfdns',
      source: 'bigdata_db',
      fallbackUsed: false,
      ok: !errorMessage,
      ...(errorMessage !== undefined ? { errorMessage } : {}),
      metadata: {
        action,
        provider: 'cloudflare-api',
        ...metadata,
      },
    });
  } catch {
    // Telemetria não bloqueia resposta.
  }
};

// Passthrough explícito dos campos documentados do resultado de DNSSEC.
const toDnssecPayload = (result: CloudflareDnssec) => ({
  status: result?.status ?? null,
  algorithm: result?.algorithm ?? null,
  digest: result?.digest ?? null,
  digest_algorithm: result?.digest_algorithm ?? null,
  digest_type: result?.digest_type ?? null,
  ds: result?.ds ?? null,
  flags: result?.flags ?? null,
  key_tag: result?.key_tag ?? null,
  key_type: result?.key_type ?? null,
  public_key: result?.public_key ?? null,
  dnssec_multi_signer: result?.dnssec_multi_signer ?? null,
  dnssec_presigned: result?.dnssec_presigned ?? null,
  dnssec_use_nsec3: result?.dnssec_use_nsec3 ?? null,
  modified_on: result?.modified_on ?? null,
});

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request);
  const url = new URL(context.request.url);
  const zoneId = String(url.searchParams.get('zoneId') ?? '').trim();
  const env = getEnv(context);

  if (!zoneId) {
    return toError('Parâmetro zoneId é obrigatório.', trace, 400);
  }

  try {
    const { result } = await cfApiRequest<CloudflareDnssec>(
      env,
      'dns',
      `/zones/${encodeURIComponent(zoneId)}/dnssec`,
      'Falha ao consultar o DNSSEC da zona na Cloudflare',
    );

    await logDnssecEvent(context, 'dnssec-get', { zoneId });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        zoneId,
        dnssec: toDnssecPayload(result ?? {}),
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar o DNSSEC da zona.';
    await logDnssecEvent(context, 'dnssec-get', { zoneId }, message);
    return toError(message, trace, resolveErrorStatus(error));
  }
}

type DnssecPatchBody = {
  zoneId?: unknown;
  status?: unknown;
  dnssecMultiSigner?: unknown;
  dnssecPresigned?: unknown;
  dnssecUseNsec3?: unknown;
  confirmName?: unknown;
  confirmCritical?: unknown;
};

const DNSSEC_STATUS_VALUES = ['active', 'disabled'];

export async function onRequestPatch(context: Context) {
  const trace = createResponseTrace(context.request);
  const env = getEnv(context);

  let body: DnssecPatchBody;
  try {
    body = (await context.request.json()) as DnssecPatchBody;
  } catch {
    return toError('Corpo da requisição inválido: envie JSON com zoneId e os campos DNSSEC a alterar.', trace, 400);
  }

  const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>);
  const zoneId = String(body.zoneId ?? '').trim();

  if (!zoneId) {
    return toError('zoneId é obrigatório.', trace, 400);
  }

  if (body.status != null && !DNSSEC_STATUS_VALUES.includes(String(body.status))) {
    return toError(
      `status DNSSEC inválido: "${String(body.status)}". Valores aceitos: ${DNSSEC_STATUS_VALUES.join(', ')}.`,
      trace,
      400,
    );
  }

  const toggles: Array<[keyof DnssecPatchBody, string]> = [
    ['dnssecMultiSigner', 'dnssec_multi_signer'],
    ['dnssecPresigned', 'dnssec_presigned'],
    ['dnssecUseNsec3', 'dnssec_use_nsec3'],
  ];

  // Só os campos presentes no body vão para a CF, já mapeados para snake_case.
  const cfBody: Record<string, unknown> = {};
  if (body.status != null) {
    cfBody.status = String(body.status);
  }
  for (const [inputKey, cfKey] of toggles) {
    const value = body[inputKey];
    if (value == null) {
      continue;
    }
    if (typeof value !== 'boolean') {
      return toError(`${inputKey} deve ser boolean (true/false).`, trace, 400);
    }
    cfBody[cfKey] = value;
  }

  if (Object.keys(cfBody).length === 0) {
    return toError(
      'Informe ao menos um campo DNSSEC para alterar (status, dnssecMultiSigner, dnssecPresigned ou dnssecUseNsec3).',
      trace,
      400,
    );
  }

  try {
    // Guarda da zona crítica: desativar DNSSEC pode derrubar a resolução dos
    // apps (o registrador continua publicando o DS antigo). Nome e criticidade
    // vêm de um re-fetch autoritativo, nunca do cliente.
    if (cfBody.status === 'disabled') {
      const { result: zone } = await cfApiRequest<{ name?: string }>(
        env,
        'dns',
        `/zones/${encodeURIComponent(zoneId)}`,
        'Falha ao consultar a zona na Cloudflare — verifique se o zoneId existe e se o token tem acesso à zona',
      );
      const zoneName = String(zone?.name ?? '')
        .trim()
        .toLowerCase();

      if (isCriticalZoneName(zoneName)) {
        const confirmName = String(body.confirmName ?? '').trim();
        if (confirmName !== zoneName) {
          return toError(
            `Confirmação divergente: digite exatamente o nome da zona (${zoneName}) para desativar o DNSSEC.`,
            trace,
            400,
          );
        }
        if (body.confirmCritical !== true) {
          return toError(
            `A zona ${zoneName} é CRÍTICA: desativar o DNSSEC pode derrubar a resolução do admin-app e de todos os apps enquanto o registrador mantiver o registro DS antigo. Marque a confirmação de ciência (confirmCritical) para prosseguir.`,
            trace,
            400,
          );
        }
      }
    }

    const { result } = await cfApiRequest<CloudflareDnssec>(
      env,
      'dns',
      `/zones/${encodeURIComponent(zoneId)}/dnssec`,
      'Falha ao alterar o DNSSEC da zona na Cloudflare',
      {
        method: 'PATCH',
        body: JSON.stringify(cfBody),
      },
    );

    await logDnssecEvent(context, 'dnssec-patch', { adminActor, zoneId, fields: Object.keys(cfBody) });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        zoneId,
        dnssec: toDnssecPayload(result ?? {}),
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao alterar o DNSSEC da zona.';
    await logDnssecEvent(context, 'dnssec-patch', { adminActor, zoneId, fields: Object.keys(cfBody) }, message);
    return toError(message, trace, resolveErrorStatus(error));
  }
}
