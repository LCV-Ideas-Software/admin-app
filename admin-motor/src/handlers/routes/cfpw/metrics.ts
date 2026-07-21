// Métricas GraphQL Analytics (workersInvocationsAdaptive) — PW-2.
// GET /api/cfpw/worker-metrics?scriptName=&hours=  — série do Worker.
// GET /api/cfpw/account-metrics?hours=             — série agregada da conta.
//
// As queries GraphQL são FIXAS no servidor (nunca aceitamos GraphQL do
// cliente). hours é whitelist (1|6|24|72|168|720, default 24); períodos ≤ 6h
// usam a dimensão datetimeFifteenMinutes, os demais datetimeHour. Como a API
// GraphQL rejeita variável declarada e não usada, há query separada por
// escopo (worker inclui $scriptName; conta omite o filtro inteiro).
//
// A API GraphQL devolve HTTP 200 com array `errors` em falha: erro com cara de
// autenticação vira 403 pt-BR (sugere Account Analytics Read no token
// CLOUDFLARE_PW); o restante vira 500 com a primeira mensagem CF — nunca 502,
// porque o edge da Cloudflare intercepta respostas 502 da origem e troca o
// body JSON de diagnóstico pela página HTML de erro dele.

import { resolveCfToken } from '../_lib/cf-api-core';
import { resolveCloudflarePwAccount } from '../_lib/cfpw-api';
import { createResponseTrace } from '../_lib/request-trace';
import {
  type CfpwRouteContext,
  getRouteEnv,
  logCfpwEvent,
  resolveCfpwErrorStatus,
  toErrorResponse,
  toJsonResponse,
} from './_respond';

const HOURS_WHITELIST = [1, 6, 24, 72, 168, 720];
const DEFAULT_HOURS = 24;
const CACHE_TTL_MS = 60_000;
const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';
const GRAPHQL_AUTH_PATTERN = /auth|permission|token|unauthorized|forbidden|access/i;

const ANALYTICS_PERMISSION_HINT =
  'Token Cloudflare sem permissão para GraphQL Analytics — adicione a permissão "Account Analytics: Read" ao token CLOUDFLARE_PW no dashboard';

type MetricsPoint = {
  t: string;
  requests: number;
  errors: number;
  subrequests: number;
  cpuP50: number;
  cpuP99: number;
  durP50: number;
  durP99: number;
  scriptName?: string;
};

type MetricsPayload = {
  scope: string;
  hours: number;
  series: MetricsPoint[];
  totals: { requests: number; errors: number; subrequests: number };
};

// Cache best-effort por isolate (TTL 60s): evita marretar a API GraphQL em
// re-renderizações e polling do dashboard.
const cache = new Map<string, { expiresAt: number; payload: MetricsPayload }>();

/** Zera o cache module-level entre testes. @public */
export function __resetMetricsCacheForTests() {
  cache.clear();
}

const seriesBlock = (dimension: string, withScriptName: boolean) => `
      series: workersInvocationsAdaptive(
        limit: 10000
        filter: {datetime_geq: $since, datetime_leq: $until${withScriptName ? ', scriptName: $scriptName' : ''}}
        orderBy: [${dimension}_ASC]
      ) {
        sum { requests errors subrequests }
        quantiles { cpuTimeP50 cpuTimeP99 durationP50 durationP99 }
        dimensions { ${dimension}${withScriptName ? ' scriptName' : ''} }
      }`;

const buildQuery = (dimension: string, withScriptName: boolean) => `
query ($accountTag: string!, $since: Time!, $until: Time!${withScriptName ? ', $scriptName: string!' : ''}) {
  viewer {
    accounts(filter: {accountTag: $accountTag}) {${seriesBlock(dimension, withScriptName)}
    }
  }
}`;

const WORKER_QUERY_HOURLY = buildQuery('datetimeHour', true);
const WORKER_QUERY_FIFTEEN_MINUTES = buildQuery('datetimeFifteenMinutes', true);
const ACCOUNT_QUERY_HOURLY = buildQuery('datetimeHour', false);
const ACCOUNT_QUERY_FIFTEEN_MINUTES = buildQuery('datetimeFifteenMinutes', false);

/** Erro de métricas com status HTTP já resolvido para a resposta. */
class MetricsError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'MetricsError';
    this.status = status;
  }
}

type GraphqlSeriesItem = {
  sum?: { requests?: unknown; errors?: unknown; subrequests?: unknown };
  quantiles?: { cpuTimeP50?: unknown; cpuTimeP99?: unknown; durationP50?: unknown; durationP99?: unknown };
  dimensions?: { datetimeHour?: unknown; datetimeFifteenMinutes?: unknown; scriptName?: unknown };
};

type GraphqlEnvelope = {
  data?: { viewer?: { accounts?: Array<{ series?: GraphqlSeriesItem[] }> } } | null;
  errors?: Array<{ message?: string }> | null;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toPoint = (item: GraphqlSeriesItem): MetricsPoint => {
  const dimensions = item.dimensions ?? {};
  const sum = item.sum ?? {};
  const quantiles = item.quantiles ?? {};
  const scriptName = String(dimensions.scriptName ?? '').trim();

  return {
    t: String(dimensions.datetimeHour ?? dimensions.datetimeFifteenMinutes ?? '').trim(),
    requests: toNumber(sum.requests),
    errors: toNumber(sum.errors),
    subrequests: toNumber(sum.subrequests),
    cpuP50: toNumber(quantiles.cpuTimeP50),
    cpuP99: toNumber(quantiles.cpuTimeP99),
    durP50: toNumber(quantiles.durationP50),
    durP99: toNumber(quantiles.durationP99),
    ...(scriptName ? { scriptName } : {}),
  };
};

const runMetricsQuery = async (
  env: ReturnType<typeof getRouteEnv>,
  accountId: string,
  hours: number,
  scriptName: string | null,
): Promise<MetricsPayload> => {
  const token = resolveCfToken(env, 'pw');
  if (!token) {
    throw new MetricsError('Token Cloudflare ausente: configure o secret CLOUDFLARE_PW no Secrets Store', 500);
  }

  const useFifteenMinutes = hours <= 6;
  const query = scriptName
    ? useFifteenMinutes
      ? WORKER_QUERY_FIFTEEN_MINUTES
      : WORKER_QUERY_HOURLY
    : useFifteenMinutes
      ? ACCOUNT_QUERY_FIFTEEN_MINUTES
      : ACCOUNT_QUERY_HOURLY;

  const until = new Date();
  const since = new Date(until.getTime() - hours * 3_600_000);
  const variables: Record<string, string> = {
    accountTag: accountId,
    since: since.toISOString(),
    until: until.toISOString(),
    ...(scriptName ? { scriptName } : {}),
  };

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 401 || response.status === 403) {
    throw new MetricsError(`${ANALYTICS_PERMISSION_HINT} (HTTP ${response.status})`, 403);
  }
  if (!response.ok) {
    throw new MetricsError(
      `Falha temporária na API GraphQL Analytics da Cloudflare (HTTP ${response.status}) — tente novamente em instantes`,
      500,
    );
  }

  let payload: GraphqlEnvelope;
  try {
    payload = (await response.json()) as GraphqlEnvelope;
  } catch {
    throw new MetricsError('Resposta não-JSON da API GraphQL Analytics da Cloudflare (HTTP 200)', 500);
  }

  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  if (errors.length > 0) {
    const firstMessage = String(errors[0]?.message ?? '').trim() || 'erro GraphQL sem mensagem';
    if (errors.some((item) => GRAPHQL_AUTH_PATTERN.test(String(item?.message ?? '')))) {
      throw new MetricsError(`${ANALYTICS_PERMISSION_HINT} (erro CF GraphQL: ${firstMessage})`, 403);
    }
    throw new MetricsError(`Falha na consulta GraphQL Analytics da Cloudflare: ${firstMessage}`, 500);
  }

  const rawSeries = payload.data?.viewer?.accounts?.[0]?.series;
  const series = (Array.isArray(rawSeries) ? rawSeries : []).map(toPoint);
  const totals = series.reduce(
    (acc, point) => ({
      requests: acc.requests + point.requests,
      errors: acc.errors + point.errors,
      subrequests: acc.subrequests + point.subrequests,
    }),
    { requests: 0, errors: 0, subrequests: 0 },
  );

  return {
    scope: scriptName ? `worker:${scriptName}` : 'account',
    hours,
    series,
    totals,
  };
};

const handleMetricsRequest = async (context: CfpwRouteContext, scriptName: string | null) => {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const action = scriptName ? 'worker-metrics' : 'account-metrics';

  const hoursRaw = String(url.searchParams.get('hours') ?? '').trim();
  const hours = hoursRaw ? Number(hoursRaw) : DEFAULT_HOURS;
  if (!HOURS_WHITELIST.includes(hours)) {
    return toErrorResponse(`Parâmetro hours inválido: use um de ${HOURS_WHITELIST.join(', ')}.`, trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const cacheKey = `${scriptName ? `worker:${scriptName}` : 'account'}:${hours}`;

    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return toJsonResponse({ ok: true, ...trace, cached: true, ...cached.payload });
    }

    const payload = await runMetricsQuery(env, accountInfo.accountId, hours, scriptName);
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });

    await logCfpwEvent(env, action, true, {
      accountId: accountInfo.accountId,
      scriptName: scriptName ?? null,
      hours,
      points: payload.series.length,
      requests: payload.totals.requests,
    });

    return toJsonResponse({ ok: true, ...trace, cached: false, ...payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar métricas GraphQL Analytics.';
    const status = error instanceof MetricsError ? error.status : resolveCfpwErrorStatus(error);
    await logCfpwEvent(env, action, false, { scriptName: scriptName ?? null, hours }, message);
    return toErrorResponse(message, trace, status);
  }
};

export async function onRequestGetWorkerMetrics(context: CfpwRouteContext) {
  const url = new URL(context.request.url);
  const scriptName = String(url.searchParams.get('scriptName') ?? '').trim();

  if (!scriptName) {
    const trace = createResponseTrace(context.request);
    return toErrorResponse('Parâmetro scriptName é obrigatório.', trace, 400);
  }

  return handleMetricsRequest(context, scriptName);
}

export async function onRequestGetAccountMetrics(context: CfpwRouteContext) {
  return handleMetricsRequest(context, null);
}
