// Núcleo compartilhado para TODAS as chamadas à API Cloudflare (client/v4).
// Centraliza resolução de token por produto, guards de resposta não-JSON,
// tradução diagnóstica de erros para pt-BR e retry único em 429 (GET/HEAD).
// As libs legadas (cloudflare-api.ts, cfpw-api.ts) delegam para este módulo
// preservando seus contratos de erro originais.

/** Produto Cloudflare que determina qual secret de token é usado. @public */
export type CfProduct = 'dns' | 'pw' | 'cache' | 'storage';

type CfApiEnv = {
  CLOUDFLARE_DNS?: string;
  CLOUDFLARE_PW?: string;
  CLOUDFLARE_CACHE?: string;
  CLOUDFLARE_STORAGE?: string;
};

type CfErrorDetail = {
  code: number;
  message: string;
};

// Discrimina a origem da falha para que as libs legadas reconstruam suas
// mensagens de erro originais sem re-parsear texto.
type CfApiErrorKind = 'missing-token' | 'empty-body' | 'html-body' | 'non-json' | 'api';

type CfApiEnvelope<T> = {
  success?: boolean;
  errors?: Array<{ code?: number | string; message?: string }>;
  result?: T;
  result_info?: unknown;
};

export class CfApiError extends Error {
  readonly kind: CfApiErrorKind;
  readonly status: number;
  readonly code: number | null;
  readonly apiMessage: string | null;
  readonly errors: CfErrorDetail[];
  /** Mensagem diagnóstica em pt-BR (causa + ação sugerida + código CF bruto). */
  readonly ptBr: string;

  constructor(
    ptBr: string,
    options: {
      kind?: CfApiErrorKind;
      status: number;
      code?: number | null;
      apiMessage?: string | null;
      errors?: CfErrorDetail[];
    },
  ) {
    super(ptBr);
    this.name = 'CfApiError';
    this.kind = options.kind ?? 'api';
    this.status = options.status;
    this.code = options.code ?? null;
    this.apiMessage = options.apiMessage ?? null;
    this.errors = options.errors ?? [];
    this.ptBr = ptBr;
  }
}

/**
 * Resolve o token Bearer para o produto. Cadeias de fallback preservam o
 * comportamento legado: dns usa DNS→PW→CACHE; pw e cache não têm fallback;
 * storage usa STORAGE→PW.
 * @public
 */
export const resolveCfToken = (env: CfApiEnv, product: CfProduct): string | null => {
  switch (product) {
    case 'dns': {
      const byDnsToken = env.CLOUDFLARE_DNS?.trim();
      if (byDnsToken) {
        return byDnsToken;
      }
      const byPwToken = env.CLOUDFLARE_PW?.trim();
      if (byPwToken) {
        console.warn('[cf-api-core] token:fallback-CLOUDFLARE_PW', { product });
        return byPwToken;
      }
      const byCacheToken = env.CLOUDFLARE_CACHE?.trim();
      if (byCacheToken) {
        console.warn('[cf-api-core] token:fallback-CLOUDFLARE_CACHE', { product });
        return byCacheToken;
      }
      return null;
    }
    case 'pw':
      return env.CLOUDFLARE_PW?.trim() || null;
    case 'cache':
      return env.CLOUDFLARE_CACHE?.trim() || null;
    case 'storage': {
      const byStorageToken = env.CLOUDFLARE_STORAGE?.trim();
      if (byStorageToken) {
        return byStorageToken;
      }
      const byPwToken = env.CLOUDFLARE_PW?.trim();
      if (byPwToken) {
        console.warn('[cf-api-core] token:fallback-CLOUDFLARE_PW', { product });
        return byPwToken;
      }
      return null;
    }
  }
};

const MISSING_TOKEN_GUIDANCE: Record<CfProduct, string> = {
  dns: 'CLOUDFLARE_DNS (ou CLOUDFLARE_PW / CLOUDFLARE_CACHE)',
  pw: 'CLOUDFLARE_PW',
  cache: 'CLOUDFLARE_CACHE',
  storage: 'CLOUDFLARE_STORAGE (ou CLOUDFLARE_PW)',
};

const buildMissingTokenError = (product: CfProduct) =>
  new CfApiError(`Token Cloudflare ausente: configure o secret ${MISSING_TOKEN_GUIDANCE[product]} no Secrets Store`, {
    kind: 'missing-token',
    status: 500,
  });

const formatCfCode = (status: number, error: CfErrorDetail | undefined) =>
  error ? `(código CF ${error.code}: ${error.message})` : `(HTTP ${status})`;

const findByCode = (errors: CfErrorDetail[], codes: number[]) => errors.find((error) => codes.includes(error.code));

const AUTH_ERROR_CODES = [9109, 10000, 10001];
const DNS_RECORD_ERROR_CODES = [81044, 81057];

type CfTranslationRule = {
  matches: (status: number, errors: CfErrorDetail[]) => boolean;
  translate: (status: number, errors: CfErrorDetail[], fallbackPtBr: string) => string;
};

// Código CF 1034: recurso de análises indisponível no plano da zona. É um
// código guarda-chuva — vale para a janela de tempo (ex.: Free limita análises
// DNS às últimas 6h) E para dimensões (ex.: `queryType` exige plano Business).
// A CF devolve isso como 403, então precede a regra de auth para não ser
// diagnosticado como falta de permissão; a mensagem da CF (repassada abaixo)
// já explica o motivo exato — não a interpretamos.
const PLAN_LIMIT_CODES = [1034];

// Tabela extensível de tradução: a primeira regra que casar vence; novos
// mapeamentos entram como novos itens do array.
const CF_ERROR_TRANSLATIONS: CfTranslationRule[] = [
  {
    matches: (_status, errors) => Boolean(findByCode(errors, PLAN_LIMIT_CODES)),
    translate: (status, errors) =>
      `Recurso de análises indisponível no plano da zona (não é problema de token nem de permissão) ${formatCfCode(status, findByCode(errors, PLAN_LIMIT_CODES))}`,
  },
  {
    matches: (status, errors) => status === 401 || status === 403 || Boolean(findByCode(errors, AUTH_ERROR_CODES)),
    translate: (status, errors) =>
      `Token Cloudflare sem permissão ou inválido para esta operação — verifique as permissões do token no dashboard ${formatCfCode(status, findByCode(errors, AUTH_ERROR_CODES) ?? errors[0])}`,
  },
  {
    matches: (status) => status === 429,
    translate: (status, errors) => {
      const firstError = errors[0];
      const detail = firstError ? `(código CF ${firstError.code})` : `(HTTP ${status})`;
      return `Limite de requisições da API Cloudflare atingido — aguarde alguns segundos e tente novamente ${detail}`;
    },
  },
  {
    matches: (_status, errors) => Boolean(findByCode(errors, [7003])),
    translate: (status, errors) =>
      `Recurso não encontrado na Cloudflare — o identificador (zona/conta/rota) não existe ou o token não o enxerga ${formatCfCode(status, findByCode(errors, [7003]))}`,
  },
  {
    matches: (_status, errors) => Boolean(findByCode(errors, DNS_RECORD_ERROR_CODES)),
    translate: (status, errors) =>
      `Registro DNS não encontrado ou já existente/conflitante — pode ter sido alterado em outra sessão; recarregue a lista ${formatCfCode(status, findByCode(errors, DNS_RECORD_ERROR_CODES))}`,
  },
  {
    matches: (_status, errors) => Boolean(findByCode(errors, [10021])),
    translate: (status, errors) =>
      `Já existe um recurso com esse nome na Cloudflare ${formatCfCode(status, findByCode(errors, [10021]))}`,
  },
  {
    matches: (status) => status >= 500 && status <= 599,
    translate: (status) => `Falha temporária na API da Cloudflare (HTTP ${status}) — tente novamente em instantes`,
  },
];

/**
 * Traduz uma falha da API Cloudflare para pt-BR diagnóstico (causa + ação
 * sugerida), sempre anexando o código/mensagem CF brutos entre parênteses.
 * @public
 */
export const translateCloudflareError = (
  status: number,
  errors: Array<{ code: number; message: string }>,
  fallbackPtBr: string,
): string => {
  for (const rule of CF_ERROR_TRANSLATIONS) {
    if (rule.matches(status, errors)) {
      return rule.translate(status, errors, fallbackPtBr);
    }
  }
  return `${fallbackPtBr} ${formatCfCode(status, errors[0])}`;
};

const toEnvelopeErrorFields = (payload: CfApiEnvelope<unknown>) => {
  const rawErrors = Array.isArray(payload.errors) ? payload.errors : [];
  const firstRawError = rawErrors[0];
  const firstCode = firstRawError?.code;

  return {
    errors: rawErrors.map((error) => ({
      code: Number.isFinite(Number(error?.code)) ? Number(error?.code) : 0,
      message: String(error?.message ?? '').trim(),
    })),
    code: firstCode != null && Number.isFinite(Number(firstCode)) ? Number(firstCode) : null,
    apiMessage: firstRawError?.message?.trim() || null,
  };
};

const toBodyPreview = (rawText: string) => {
  const collapsed = rawText.replace(/\s+/g, ' ').trim();
  return collapsed.length > 120 ? `${collapsed.slice(0, 120)}…` : collapsed;
};

const parseEnvelopeOrThrow = <T>(rawText: string, status: number, fallbackPtBr: string): CfApiEnvelope<T> => {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new CfApiError(`${fallbackPtBr}: a API Cloudflare devolveu corpo vazio em vez de JSON (HTTP ${status})`, {
      kind: 'empty-body',
      status,
    });
  }

  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    throw new CfApiError(
      `${fallbackPtBr}: a API Cloudflare devolveu uma página HTML em vez de JSON (HTTP ${status}; início: ${toBodyPreview(trimmed)})`,
      { kind: 'html-body', status },
    );
  }

  try {
    return JSON.parse(trimmed) as CfApiEnvelope<T>;
  } catch {
    throw new CfApiError(
      `${fallbackPtBr}: a API Cloudflare devolveu resposta não-JSON (HTTP ${status}; início: ${toBodyPreview(trimmed)})`,
      { kind: 'non-json', status },
    );
  }
};

const CF_API_BASE_URL = 'https://api.cloudflare.com/client/v4';
const RETRY_AFTER_CAP_MS = 2000;
const RETRY_AFTER_DEFAULT_MS = 500;

const resolveRetryDelayMs = (response: Response) => {
  const headerValue = response.headers.get('Retry-After');
  if (headerValue == null) {
    return RETRY_AFTER_DEFAULT_MS;
  }
  const retryAfterSeconds = Number(headerValue);
  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds < 0) {
    return RETRY_AFTER_DEFAULT_MS;
  }
  return Math.min(retryAfterSeconds * 1000, RETRY_AFTER_CAP_MS);
};

const waitMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const fetchCloudflareApi = async (
  env: CfApiEnv,
  product: CfProduct,
  path: string,
  init?: RequestInit,
): Promise<Response> => {
  const token = resolveCfToken(env, product);
  if (!token) {
    console.error('[cf-api-core] token:missing', { product });
    throw buildMissingTokenError(product);
  }

  const method = init?.method ?? 'GET';
  const hasContentTypeHeader = Boolean(init?.headers && new Headers(init.headers).has('Content-Type'));
  const isFormDataBody = typeof FormData !== 'undefined' && init?.body instanceof FormData;

  const performFetch = () =>
    fetch(`${CF_API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(hasContentTypeHeader || isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
        ...(init?.headers ?? {}),
      },
      ...(init?.body !== undefined ? { body: init.body } : {}),
      ...(init?.signal != null ? { signal: init.signal } : {}),
    });

  console.debug('[cf-api-core] request:start', { product, method, path });

  let response = await performFetch();

  // Retry único em rate limit, apenas para métodos idempotentes sem corpo.
  const normalizedMethod = method.toUpperCase();
  if (response.status === 429 && (normalizedMethod === 'GET' || normalizedMethod === 'HEAD')) {
    const delayMs = resolveRetryDelayMs(response);
    console.warn('[cf-api-core] request:retry-429', { product, method: normalizedMethod, path, delayMs });
    await waitMs(delayMs);
    response = await performFetch();
  }

  return response;
};

/**
 * Chamada JSON padrão à API Cloudflare: valida o envelope `success` e devolve
 * `result` + `result_info`. Falhas viram CfApiError com mensagem pt-BR
 * diagnóstica.
 */
export const cfApiRequest = async <T>(
  env: CfApiEnv,
  product: CfProduct,
  path: string,
  fallbackPtBr: string,
  init?: RequestInit,
): Promise<{ result: T; resultInfo?: unknown }> => {
  const response = await fetchCloudflareApi(env, product, path, init);
  const rawText = await response.text();
  const payload = parseEnvelopeOrThrow<T>(rawText, response.status, fallbackPtBr);

  if (!response.ok || payload.success !== true) {
    const { errors, code, apiMessage } = toEnvelopeErrorFields(payload);
    console.error('[cf-api-core] request:error', {
      product,
      method: init?.method ?? 'GET',
      path,
      status: response.status,
      code,
      message: apiMessage,
    });
    throw new CfApiError(translateCloudflareError(response.status, errors, fallbackPtBr), {
      kind: 'api',
      status: response.status,
      code,
      apiMessage,
      errors,
    });
  }

  console.info('[cf-api-core] request:ok', { product, method: init?.method ?? 'GET', path, status: response.status });

  return { result: payload.result as T, resultInfo: payload.result_info };
};

/**
 * Chamada crua (binário/stream): devolve a Response intacta em 2xx. Em falha,
 * tenta extrair o envelope de erro CF para traduzir; caso contrário usa o
 * status HTTP.
 * @public
 */
export const cfApiRequestRaw = async (
  env: CfApiEnv,
  product: CfProduct,
  path: string,
  fallbackPtBr: string,
  init?: RequestInit,
): Promise<Response> => {
  const response = await fetchCloudflareApi(env, product, path, init);
  if (response.ok) {
    return response;
  }

  const rawText = await response.text();
  let errors: CfErrorDetail[] = [];
  let code: number | null = null;
  let apiMessage: string | null = null;
  try {
    const fields = toEnvelopeErrorFields(JSON.parse(rawText) as CfApiEnvelope<unknown>);
    errors = fields.errors;
    code = fields.code;
    apiMessage = fields.apiMessage;
  } catch {
    // Corpo de erro não-JSON: a tradução abaixo cai no mapeamento por status HTTP.
  }

  console.error('[cf-api-core] request:error', {
    product,
    method: init?.method ?? 'GET',
    path,
    status: response.status,
    code,
    message: apiMessage,
  });
  throw new CfApiError(translateCloudflareError(response.status, errors, fallbackPtBr), {
    kind: 'api',
    status: response.status,
    code,
    apiMessage,
    errors,
  });
};

// Teto de segurança contra laço infinito caso a API ignore a paginação.
const DEFAULT_MAX_PAGES = 200;

/**
 * Pagina endpoints baseados em `page`/`total_pages`, acumulando os itens até a
 * última página (ou até `maxPages`, teto de segurança).
 * @public
 */
export const cfPagePaginate = async <T>(
  fetchPage: (page: number) => Promise<{ items: T[]; totalPages: number }>,
  opts?: { maxPages?: number },
): Promise<T[]> => {
  const maxPages = opts?.maxPages ?? DEFAULT_MAX_PAGES;
  const items: T[] = [];
  let totalPages = 1;

  for (let page = 1; page <= totalPages && page <= maxPages; page += 1) {
    const pageResult = await fetchPage(page);
    items.push(...pageResult.items);
    totalPages = pageResult.totalPages;
  }

  return items;
};

/**
 * Pagina endpoints baseados em cursor, seguindo a cadeia até cursor nulo (ou
 * até `maxPages`, teto de segurança).
 * @public
 */
export const cfCursorPaginate = async <T>(
  fetchPage: (cursor: string | null) => Promise<{ items: T[]; cursor: string | null }>,
  opts?: { maxPages?: number },
): Promise<T[]> => {
  const maxPages = opts?.maxPages ?? DEFAULT_MAX_PAGES;
  const items: T[] = [];
  let cursor: string | null = null;

  for (let fetchedPages = 0; fetchedPages < maxPages; fetchedPages += 1) {
    const pageResult = await fetchPage(cursor);
    items.push(...pageResult.items);
    if (!pageResult.cursor) {
      break;
    }
    cursor = pageResult.cursor;
  }

  return items;
};
