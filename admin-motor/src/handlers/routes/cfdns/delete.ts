import { resolveAdminActorFromRequest } from '../../../../../functions/api/_lib/admin-actor';
import type { D1Database } from '../../../../../functions/api/_lib/operational';
import { logModuleOperationalEvent } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace } from '../../../../../functions/api/_lib/request-trace';
import { deleteCloudflareDnsRecord } from '../_lib/cloudflare-api';

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

export async function onRequestDelete(context: Context) {
  const trace = createResponseTrace(context.request);
  const url = new URL(context.request.url);
  const zoneId = String(url.searchParams.get('zoneId') ?? '').trim();
  const recordId = String(url.searchParams.get('recordId') ?? '').trim();
  const adminActor = resolveAdminActorFromRequest(context.request);
  const env = context.data?.env ?? context.env;

  if (!zoneId || !recordId) {
    return toError('Parâmetros zoneId e recordId são obrigatórios.', trace, 400);
  }

  try {
    await deleteCloudflareDnsRecord(env, zoneId, recordId);

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'record-delete',
            provider: 'cloudflare-api',
            adminActor,
            zoneId,
            recordId,
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        zoneId,
        recordId,
        deleted: true,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao remover registro DNS.';

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'record-delete',
            provider: 'cloudflare-api',
            zoneId,
            recordId,
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    // Falha de upstream vira 500 — nunca 502: o edge da Cloudflare intercepta
    // 502 da origem e troca o body JSON de diagnóstico pela página HTML dele.
    return toError(message, trace, 500);
  }
}
