import { listCloudflareDnsRecords } from '../_lib/cloudflare-api';
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

const toPositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.trunc(parsed);
};

const ORDER_FIELDS = ['type', 'name', 'content', 'ttl', 'proxied'];
const DIRECTION_VALUES = ['asc', 'desc'];
const MATCH_VALUES = ['all', 'any'];

// Parâmetro booleano opcional: ausente → null; 'true'/'false' → boolean;
// qualquer outro valor → 'invalid' (o handler responde 400 nomeando o parâmetro).
const parseOptionalBooleanParam = (raw: string | null): boolean | null | 'invalid' => {
  const normalized = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return 'invalid';
};

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request);
  const url = new URL(context.request.url);
  const zoneId = String(url.searchParams.get('zoneId') ?? '').trim();
  const page = toPositiveInt(url.searchParams.get('page'), 1);
  const perPage = toPositiveInt(url.searchParams.get('perPage'), 100);
  const type = String(url.searchParams.get('type') ?? '')
    .trim()
    .toUpperCase();
  const search = String(url.searchParams.get('search') ?? '')
    .trim()
    .toLowerCase();
  const order = String(url.searchParams.get('order') ?? '')
    .trim()
    .toLowerCase();
  const direction = String(url.searchParams.get('direction') ?? '')
    .trim()
    .toLowerCase();
  const match = String(url.searchParams.get('match') ?? '')
    .trim()
    .toLowerCase();
  const nameContains = String(url.searchParams.get('nameContains') ?? '').trim();
  const contentContains = String(url.searchParams.get('contentContains') ?? '').trim();
  const commentContains = String(url.searchParams.get('commentContains') ?? '').trim();
  const tagExact = String(url.searchParams.get('tagExact') ?? '').trim();
  const tagPresent = String(url.searchParams.get('tagPresent') ?? '').trim();
  const commentPresent = parseOptionalBooleanParam(url.searchParams.get('commentPresent'));
  const proxied = parseOptionalBooleanParam(url.searchParams.get('proxied'));

  if (!zoneId) {
    return toError('Parâmetro zoneId é obrigatório.', trace, 400);
  }
  if (order && !ORDER_FIELDS.includes(order)) {
    return toError(`Parâmetro order inválido: "${order}". Valores aceitos: ${ORDER_FIELDS.join(', ')}.`, trace, 400);
  }
  if (direction && !DIRECTION_VALUES.includes(direction)) {
    return toError(
      `Parâmetro direction inválido: "${direction}". Valores aceitos: ${DIRECTION_VALUES.join(', ')}.`,
      trace,
      400,
    );
  }
  if (match && !MATCH_VALUES.includes(match)) {
    return toError(`Parâmetro match inválido: "${match}". Valores aceitos: ${MATCH_VALUES.join(', ')}.`, trace, 400);
  }
  if (commentPresent === 'invalid') {
    return toError('Parâmetro commentPresent inválido: use true ou false.', trace, 400);
  }
  if (proxied === 'invalid') {
    return toError('Parâmetro proxied inválido: use true ou false.', trace, 400);
  }
  if (tagExact && !tagExact.includes(':')) {
    return toError('Parâmetro tagExact inválido: use o formato nome:valor.', trace, 400);
  }

  const env = context.data?.env ?? context.env;

  try {
    const payload = await listCloudflareDnsRecords(env, zoneId, {
      page,
      perPage,
      type,
      search,
      order,
      direction,
      match,
      nameContains,
      contentContains,
      commentContains,
      tagExact,
      tagPresent,
      ...(commentPresent === null ? {} : { commentPresent }),
      ...(proxied === null ? {} : { proxied }),
    });

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'records-list',
            provider: 'cloudflare-api',
            zoneId,
            page: payload.pagination.page,
            perPage: payload.pagination.perPage,
            count: payload.pagination.count,
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
        ...payload,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar registros DNS da zona.';

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'records-list',
            provider: 'cloudflare-api',
            zoneId,
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return toError(message, trace, 502);
  }
}
