import { CfApiError, cfApiRequest } from '../_lib/cf-api-core';
import type { D1Database } from '../_lib/operational';
import { logModuleOperationalEvent } from '../_lib/operational';
import { createResponseTrace } from '../_lib/request-trace';

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

type CloudflareZoneDetails = {
  status?: string;
  paused?: boolean;
  name_servers?: string[];
  original_name_servers?: string[] | null;
  plan?: {
    legacy_id?: string;
    name?: string;
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

const resolveAnalyticsRetentionDays = (legacyId: string) => {
  if (legacyId === 'free') {
    return 8;
  }
  if (legacyId === 'enterprise') {
    return 62;
  }
  return 31;
};

// Zona inexistente (ou invisível ao token) responde 404 ou código CF 7003;
// o admin deve ver 404 com a mensagem diagnóstica, não um 502 de gateway.
const isZoneNotFound = (error: unknown) =>
  error instanceof CfApiError &&
  (error.status === 404 || error.code === 7003 || error.errors.some((detail) => detail.code === 7003));

const resolveErrorStatus = (error: unknown) => {
  if (isZoneNotFound(error)) {
    return 404;
  }
  if (error instanceof CfApiError && error.kind === 'missing-token') {
    return 500;
  }
  return 502;
};

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request);
  const url = new URL(context.request.url);
  const zoneId = String(url.searchParams.get('zoneId') ?? '').trim();
  const env = context.data?.env ?? context.env;

  if (!zoneId) {
    return toError('Parâmetro zoneId é obrigatório.', trace, 400);
  }

  try {
    const { result } = await cfApiRequest<CloudflareZoneDetails>(
      env,
      'dns',
      `/zones/${encodeURIComponent(zoneId)}`,
      'Falha ao consultar a zona na Cloudflare — verifique se o zoneId existe e se o token tem acesso à zona',
    );

    const legacyId = String(result?.plan?.legacy_id ?? '')
      .trim()
      .toLowerCase();
    const isFreePlan = legacyId === 'free';

    // Limites derivados do plano da zona (plan.legacy_id): o plano Free não
    // suporta tags e tem tetos menores de comentário, lote e retenção.
    const payload = {
      zoneId,
      tagsSupported: !isFreePlan,
      commentMaxLength: isFreePlan ? 100 : 500,
      batchOpsLimit: isFreePlan ? 200 : 3500,
      analyticsRetentionDays: resolveAnalyticsRetentionDays(legacyId),
      planLabel: result?.plan?.name ?? null,
      status: result?.status ?? null,
      paused: Boolean(result?.paused),
      nameServers: Array.isArray(result?.name_servers) ? result.name_servers : [],
      originalNameServers: result?.original_name_servers ?? null,
    };

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'zone-capabilities',
            provider: 'cloudflare-api',
            zoneId,
            planLegacyId: legacyId,
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
        ...payload,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar capacidades da zona na Cloudflare.';

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'zone-capabilities',
            provider: 'cloudflare-api',
            zoneId,
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return toError(message, trace, resolveErrorStatus(error));
  }
}
