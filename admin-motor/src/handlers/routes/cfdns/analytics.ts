import { CfApiError, cfApiRequest } from '../_lib/cf-api-core';
import type { D1Database } from '../_lib/operational';
import { logModuleOperationalEvent } from '../_lib/operational';
import { createResponseTrace } from '../_lib/request-trace';

// DNS-4: análises DNS da zona (dns_analytics). Dois endpoints somente-leitura:
// bytime (série temporal de consultas por responseCode) e top (ranking por
// dimensão). Passthrough do shape da CF ({rows, data, totals, min, max, query,
// time_intervals}) — a transformação para gráficos vive no frontend.

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

type DnsAnalyticsReport = {
  rows?: number;
  data?: unknown[];
  totals?: Record<string, unknown>;
  min?: Record<string, unknown>;
  max?: Record<string, unknown>;
  query?: Record<string, unknown>;
  time_intervals?: unknown[];
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

const TOP_DIMENSIONS = ['queryName', 'queryType', 'responseCode'];

// Janela ≤72h em granularidade horária; acima disso, diária (mantém o payload
// pequeno e alinhado à retenção por plano).
const HOUR_DELTA_MAX_MS = 72 * 60 * 60 * 1000;

type AnalyticsWindow = {
  since: string;
  until: string;
  windowMs: number;
};

// Valida since/until como ISO e exige since < until. Devolve os strings crus
// (após trim) para passthrough à CF, evitando re-serialização com surpresas.
const parseAnalyticsWindow = (url: URL): AnalyticsWindow | { error: string } => {
  const since = String(url.searchParams.get('since') ?? '').trim();
  const until = String(url.searchParams.get('until') ?? '').trim();

  if (!since || !until) {
    return { error: 'Parâmetros since e until (ISO 8601) são obrigatórios.' };
  }

  const sinceMs = Date.parse(since);
  const untilMs = Date.parse(until);
  if (Number.isNaN(sinceMs)) {
    return { error: `Parâmetro since inválido: "${since}" não é uma data ISO 8601.` };
  }
  if (Number.isNaN(untilMs)) {
    return { error: `Parâmetro until inválido: "${until}" não é uma data ISO 8601.` };
  }
  if (sinceMs >= untilMs) {
    return { error: 'Parâmetro since deve ser anterior a until.' };
  }

  return { since, until, windowMs: untilMs - sinceMs };
};

const resolveErrorStatus = (error: unknown) => {
  if (error instanceof CfApiError && error.kind === 'missing-token') {
    return 500;
  }
  if (error instanceof CfApiError && error.status === 400) {
    return 400;
  }
  return 502;
};

// CF responde 400 quando a janela pedida ultrapassa a retenção de análises do
// plano da zona; traduzimos com a causa provável + a tabela de retenção.
const toClientMessage = (error: unknown, fallback: string) => {
  if (error instanceof CfApiError && error.kind === 'api' && error.status === 400) {
    const cfDetail =
      error.code != null || error.apiMessage
        ? ` (código CF ${error.code ?? '—'}: ${error.apiMessage ?? 'sem mensagem'})`
        : '';
    return `Cloudflare rejeitou a consulta de análises DNS — a janela solicitada provavelmente ultrapassa a retenção do plano da zona (retenção: 8 dias no Free, 31 dias no Pro/Business, 62 dias no Enterprise)${cfDetail}`;
  }
  return error instanceof Error ? error.message : fallback;
};

const logAnalyticsEvent = async (
  env: Env,
  action: 'analytics-bytime' | 'analytics-top',
  zoneId: string,
  errorMessage?: string,
) => {
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
        zoneId,
      },
    });
  } catch {
    // Telemetria não bloqueia resposta.
  }
};

export async function onRequestGetBytime(context: Context) {
  const trace = createResponseTrace(context.request);
  const url = new URL(context.request.url);
  const zoneId = String(url.searchParams.get('zoneId') ?? '').trim();
  const env = context.data?.env ?? context.env;

  if (!zoneId) {
    return toError('Parâmetro zoneId é obrigatório.', trace, 400);
  }

  const window = parseAnalyticsWindow(url);
  if ('error' in window) {
    return toError(window.error, trace, 400);
  }

  const timeDelta = window.windowMs <= HOUR_DELTA_MAX_MS ? 'hour' : 'day';
  const query = new URLSearchParams({
    metrics: 'queryCount,uncachedCount,staleCount',
    dimensions: 'responseCode',
    since: window.since,
    until: window.until,
    time_delta: timeDelta,
  });

  try {
    const { result } = await cfApiRequest<DnsAnalyticsReport>(
      env,
      'dns',
      `/zones/${encodeURIComponent(zoneId)}/dns_analytics/report/bytime?${query.toString()}`,
      'Falha ao consultar a série temporal de análises DNS na Cloudflare',
    );

    await logAnalyticsEvent(env, 'analytics-bytime', zoneId);

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        zoneId,
        report: result,
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = toClientMessage(error, 'Falha ao consultar a série temporal de análises DNS na Cloudflare.');
    await logAnalyticsEvent(env, 'analytics-bytime', zoneId, message);
    return toError(message, trace, resolveErrorStatus(error));
  }
}

export async function onRequestGetTop(context: Context) {
  const trace = createResponseTrace(context.request);
  const url = new URL(context.request.url);
  const zoneId = String(url.searchParams.get('zoneId') ?? '').trim();
  const dimension = String(url.searchParams.get('dimension') ?? '').trim();
  const env = context.data?.env ?? context.env;

  if (!zoneId) {
    return toError('Parâmetro zoneId é obrigatório.', trace, 400);
  }
  if (!TOP_DIMENSIONS.includes(dimension)) {
    return toError(
      `Parâmetro dimension inválido: "${dimension}". Valores aceitos: ${TOP_DIMENSIONS.join(', ')}.`,
      trace,
      400,
    );
  }

  const window = parseAnalyticsWindow(url);
  if ('error' in window) {
    return toError(window.error, trace, 400);
  }

  const query = new URLSearchParams({
    metrics: 'queryCount',
    dimensions: dimension,
    sort: '-queryCount',
    limit: '15',
    since: window.since,
    until: window.until,
  });

  try {
    const { result } = await cfApiRequest<DnsAnalyticsReport>(
      env,
      'dns',
      `/zones/${encodeURIComponent(zoneId)}/dns_analytics/report?${query.toString()}`,
      'Falha ao consultar o ranking de análises DNS na Cloudflare',
    );

    await logAnalyticsEvent(env, 'analytics-top', zoneId);

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        zoneId,
        report: result,
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = toClientMessage(error, 'Falha ao consultar o ranking de análises DNS na Cloudflare.');
    await logAnalyticsEvent(env, 'analytics-top', zoneId, message);
    return toError(message, trace, resolveErrorStatus(error));
  }
}
