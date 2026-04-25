import { resolveAdminActorFromRequest } from '../../../../../functions/api/_lib/admin-actor';
import { deleteCloudflareDnsRecord } from '../../../../../functions/api/_lib/cloudflare-api';
import type { D1Database } from '../../../../../functions/api/_lib/operational';
import { logModuleOperationalEvent } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace } from '../../../../../functions/api/_lib/request-trace';

type Context = {
  request: Request;
  env: {
    BIGDATA_DB?: D1Database;
    CLOUDFLARE_DNS?: string;
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

  if (!zoneId || !recordId) {
    return toError('Parâmetros zoneId e recordId são obrigatórios.', trace, 400);
  }

  try {
    await deleteCloudflareDnsRecord((context as any).data?.env || context.env, zoneId, recordId);

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
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

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
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

    return toError(message, trace, 502);
  }
}
