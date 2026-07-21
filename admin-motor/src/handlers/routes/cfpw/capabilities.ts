/**
 * Route handler for Cloudflare capabilities discovery.
 * GET /api/cfpw/capabilities -> sonda 6 produtos (kv, d1, r2, observability, builds, analytics)
 * e classifica cada um como habilitado, sem-permissao, indisponivel ou erro.
 *
 * Cache best-effort em módulo (TTL 5min; isolates do Workers podem não retê-lo).
 * `?refresh=true` ignora o cache e sonda novamente.
 */

import { CfApiError, cfApiRequest, resolveCfToken } from '../_lib/cf-api-core';
import { resolveCloudflarePwAccount } from '../_lib/cfpw-api';
import type { D1Database } from '../_lib/operational';
import { logModuleOperationalEvent } from '../_lib/operational';
import { createResponseTrace } from '../_lib/request-trace';

type Env = {
  BIGDATA_DB?: D1Database;
  CLOUDFLARE_PW?: string;
  CLOUDFLARE_STORAGE?: string;
  CF_ACCOUNT_ID?: string;
};

type Context = {
  request: Request;
  env: Env;
  data?: {
    env?: Env;
  };
};

type ProbeResult =
  | { enabled: true }
  | { enabled: false; reason: 'sem-permissao' | 'indisponivel' | 'erro'; detail: string };

type CapabilityKey = 'kv' | 'd1' | 'r2' | 'observability' | 'builds' | 'analytics';

type CapabilitiesPayload = {
  capabilities: Record<CapabilityKey, ProbeResult>;
  account: { id: string; source: string };
  probedAt: string;
};

const PROBE_TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Cache best-effort por isolate: novos isolates começam frios, o que é aceitável.
let cache: { expiresAt: number; payload: CapabilitiesPayload } | null = null;

/** Zera o cache module-level entre testes. @public */
export function __resetCapabilitiesCacheForTests() {
  cache = null;
}

const toHeaders = () => ({
  'Content-Type': 'application/json',
});

const toError = (message: string, trace: { request_id: string; timestamp: string }, status = 500) =>
  new Response(JSON.stringify({ ok: false, ...trace, error: message }), {
    status,
    headers: toHeaders(),
  });

const AUTH_ERROR_CODES = [9109, 10000, 10001];

const hasAnyCode = (error: CfApiError, codes: number[]) =>
  (error.code !== null && codes.includes(error.code)) || error.errors.some((detail) => codes.includes(detail.code));

const classifyProbeFailure = (error: unknown): ProbeResult => {
  if (error instanceof CfApiError) {
    if (error.status === 401 || error.status === 403 || hasAnyCode(error, AUTH_ERROR_CODES)) {
      return { enabled: false, reason: 'sem-permissao', detail: error.ptBr };
    }
    if (error.status === 404 || hasAnyCode(error, [7003])) {
      return { enabled: false, reason: 'indisponivel', detail: error.ptBr };
    }
    return { enabled: false, reason: 'erro', detail: error.ptBr };
  }

  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return {
      enabled: false,
      reason: 'erro',
      detail: `Tempo limite de ${PROBE_TIMEOUT_MS / 1000}s excedido ao sondar a API Cloudflare`,
    };
  }

  return { enabled: false, reason: 'erro', detail: error instanceof Error ? error.message : String(error) };
};

const restProbe = async (
  env: Env,
  product: 'pw' | 'storage',
  path: string,
  fallbackPtBr: string,
): Promise<ProbeResult> => {
  await cfApiRequest<unknown>(env, product, path, fallbackPtBr, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
  return { enabled: true };
};

type GraphqlEnvelope = {
  data?: { viewer?: unknown } | null;
  errors?: Array<{ message?: string }> | null;
};

const GRAPHQL_AUTH_PATTERN = /auth|permission|token|unauthorized|forbidden|access/i;

// A API GraphQL devolve HTTP 200 com array `errors` em falha de permissão,
// então a sonda de analytics não pode reutilizar o envelope REST do core.
const graphqlProbe = async (env: Env, accountId: string): Promise<ProbeResult> => {
  const token = resolveCfToken(env, 'pw');
  if (!token) {
    return {
      enabled: false,
      reason: 'erro',
      detail: 'Token Cloudflare ausente: configure o secret CLOUDFLARE_PW no Secrets Store',
    };
  }

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'query($tag: string){ viewer { accounts(filter: {accountTag: $tag}) { accountTag } } }',
      variables: { tag: accountId },
    }),
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });

  if (response.status === 401 || response.status === 403) {
    return {
      enabled: false,
      reason: 'sem-permissao',
      detail: `Token Cloudflare sem permissão para GraphQL Analytics (HTTP ${response.status})`,
    };
  }
  if (response.status === 404) {
    return {
      enabled: false,
      reason: 'indisponivel',
      detail: 'Endpoint GraphQL Analytics não encontrado na Cloudflare (HTTP 404)',
    };
  }
  if (!response.ok) {
    return {
      enabled: false,
      reason: 'erro',
      detail: `Falha ao sondar GraphQL Analytics (HTTP ${response.status})`,
    };
  }

  let payload: GraphqlEnvelope;
  try {
    payload = (await response.json()) as GraphqlEnvelope;
  } catch {
    return {
      enabled: false,
      reason: 'erro',
      detail: 'Resposta não-JSON da API GraphQL Analytics (HTTP 200)',
    };
  }

  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  if (errors.length > 0) {
    const firstMessage = String(errors[0]?.message ?? '').trim() || 'erro GraphQL sem mensagem';
    if (errors.some((item) => GRAPHQL_AUTH_PATTERN.test(String(item?.message ?? '')))) {
      return {
        enabled: false,
        reason: 'sem-permissao',
        detail: `Token Cloudflare sem permissão para GraphQL Analytics (${firstMessage})`,
      };
    }
    return { enabled: false, reason: 'erro', detail: `Falha ao sondar GraphQL Analytics (${firstMessage})` };
  }

  if (payload.data && payload.data.viewer !== undefined && payload.data.viewer !== null) {
    return { enabled: true };
  }

  return {
    enabled: false,
    reason: 'erro',
    detail: 'Resposta GraphQL Analytics sem data.viewer — comportamento inesperado da API Cloudflare',
  };
};

const runProbes = async (env: Env, accountId: string): Promise<Record<CapabilityKey, ProbeResult>> => {
  const encodedAccountId = encodeURIComponent(accountId);

  const settled = await Promise.allSettled([
    restProbe(env, 'storage', `/accounts/${encodedAccountId}/storage/kv/namespaces?per_page=5`, 'Falha ao sondar KV'),
    restProbe(env, 'storage', `/accounts/${encodedAccountId}/d1/database?per_page=5`, 'Falha ao sondar D1'),
    restProbe(env, 'storage', `/accounts/${encodedAccountId}/r2/buckets`, 'Falha ao sondar R2'),
    restProbe(
      env,
      'pw',
      `/accounts/${encodedAccountId}/workers/observability/destinations`,
      'Falha ao sondar Observability',
    ),
    restProbe(env, 'pw', `/accounts/${encodedAccountId}/builds/account/limits`, 'Falha ao sondar Workers Builds'),
    graphqlProbe(env, accountId),
  ]);

  const toResult = (outcome: PromiseSettledResult<ProbeResult>): ProbeResult =>
    outcome.status === 'fulfilled' ? outcome.value : classifyProbeFailure(outcome.reason);

  const [kv, d1, r2, observability, builds, analytics] = settled;

  return {
    kv: toResult(kv),
    d1: toResult(d1),
    r2: toResult(r2),
    observability: toResult(observability),
    builds: toResult(builds),
    analytics: toResult(analytics),
  };
};

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request);
  const env = context.data?.env ?? context.env;
  const refresh = new URL(context.request.url).searchParams.get('refresh') === 'true';

  if (!refresh && cache && cache.expiresAt > Date.now()) {
    return new Response(JSON.stringify({ ok: true, ...trace, ...cache.payload }), { headers: toHeaders() });
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const capabilities = await runProbes(env, accountInfo.accountId);

    const payload: CapabilitiesPayload = {
      capabilities,
      account: { id: accountInfo.accountId, source: accountInfo.source },
      probedAt: new Date().toISOString(),
    };
    cache = { expiresAt: Date.now() + CACHE_TTL_MS, payload };

    const db = env.BIGDATA_DB;
    if (db) {
      try {
        await logModuleOperationalEvent(db, {
          module: 'cfpw',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'capabilities',
            provider: 'cloudflare-api',
            accountId: accountInfo.accountId,
            enabled: Object.values(capabilities).filter((probe) => probe.enabled).length,
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return new Response(JSON.stringify({ ok: true, ...trace, ...payload }), { headers: toHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao sondar capacidades Cloudflare.';
    console.error('[capabilities] GET error:', message);

    const db = env.BIGDATA_DB;
    if (db) {
      try {
        await logModuleOperationalEvent(db, {
          module: 'cfpw',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'capabilities',
            provider: 'cloudflare-api',
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return toError(message, trace, 500);
  }
}
