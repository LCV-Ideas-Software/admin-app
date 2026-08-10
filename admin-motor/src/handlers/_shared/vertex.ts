// Módulo: admin-motor/src/handlers/_shared/vertex.ts
// Cliente REST mínimo do Vertex AI (Gemini Enterprise Agent Platform).
// Autentica com service account via JWT RS256 (WebCrypto) trocado por access
// token OAuth2, com cache por identidade de chave e single-flight para mints
// concorrentes. Espelha a superfície do SDK @google/genai consumida pelos
// handlers do admin-motor (models.generateContent / models.countTokens /
// models.list), incluindo httpOptions.timeout (AbortSignal na chamada da
// API), saída estruturada (responseMimeType) e entrada multimodal: um array
// misto de parts (inlineData + string) é normalizado em um único content de
// usuário, formato validado empiricamente no REST v1. A listagem de publisher
// models existe apenas no v1beta1 e apenas no host global (provado
// empiricamente: v1 responde 404) — models.list usa esse endpoint fixo.

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  private_key_id: string;
  token_uri: string;
  project_id?: string;
}

export interface VertexGenAIOptions {
  saKeyJson: string;
  /** Opcional: quando ausente, o project é derivado do project_id da própria service account. */
  project?: string | undefined;
  location: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

interface HttpOptions {
  timeout?: number;
}

interface GenerateContentConfig {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  thinkingConfig?: Record<string, unknown>;
  safetySettings?: unknown[];
  systemInstruction?: string | Record<string, unknown>;
  responseMimeType?: string;
  responseJsonSchema?: unknown;
  /** Schema OpenAPI-style do Vertex (type OBJECT/STRING…) — provado no v1 em 2026-08-09. */
  responseSchema?: unknown;
  httpOptions?: HttpOptions;
}

interface GenerateContentArgs {
  model: string;
  contents: unknown;
  config?: GenerateContentConfig;
}

interface CountTokensArgs {
  model: string;
  contents: unknown;
  config?: { httpOptions?: HttpOptions };
}

interface VertexResponsePart {
  text?: string;
  thought?: boolean;
}

interface VertexCandidate {
  content?: { parts?: VertexResponsePart[] };
  finishReason?: string;
}

export interface VertexGenerateContentResponse {
  candidates?: VertexCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
  modelVersion?: string;
  text: string;
}

/** Operação de origem de um VertexHttpError — permite ao caller distinguir um
 * 404 de publisher model (fallback de seletor) de falhas da mint OAuth. */
export type VertexOperation = 'oauth-token' | 'generateContent' | 'countTokens' | 'listModels';

/** Item do catálogo de publisher models (v1beta1); name no formato
 * "publishers/google/models/<id>". */
export interface PublisherModelSummary {
  name?: string;
  displayName?: string;
  versionId?: string;
}

interface ListModelsArgs {
  config?: { pageSize?: number; httpOptions?: HttpOptions };
}

// Catálogo de publisher models: existe apenas no v1beta1 e apenas no host
// global — o v1 e os hosts regionais respondem 404 (provado empiricamente).
const LIST_MODELS_BASE_URL = 'https://aiplatform.googleapis.com/v1beta1/publishers/google/models';
// Intervalo aceito pelo endpoint, verificado contra a API em 2026-08-10:
// pageSize=1000 e pageSize=-1 respondem HTTP 400 ("Page size should be
// non-negative and the maximum size is 300") e derrubam a rota de catálogo
// inteira; 0 (padrão do servidor), 1 e 300 respondem 200. O cliente normaliza
// aqui porque é contrato da API, não preferência do caller — a paginação por
// nextPageToken continua trazendo o catálogo completo.
const LIST_MODELS_MIN_PAGE_SIZE = 0;
const LIST_MODELS_MAX_PAGE_SIZE = 300;
// `number` também admite NaN e Infinity, e Math.trunc/min/max propagam NaN —
// sem o guard, `pageSize=NaN` chegaria à URL e produziria o mesmo 400 que esta
// normalização existe para evitar. Um valor não finito cai no padrão do
// servidor (0), que é o comportamento mais próximo de "não especificado".
const clampPageSize = (value: number): number =>
  Number.isFinite(value)
    ? Math.min(Math.max(Math.trunc(value), LIST_MODELS_MIN_PAGE_SIZE), LIST_MODELS_MAX_PAGE_SIZE)
    : LIST_MODELS_MIN_PAGE_SIZE;

/** Erro HTTP com status numérico e operação de origem preservados para o classificador de retry/fallback do caller. */
export class VertexHttpError extends Error {
  override readonly name = 'VertexHttpError';

  constructor(
    message: string,
    readonly status: number,
    readonly operation: VertexOperation,
  ) {
    super(message);
  }
}

const OAUTH_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const OAUTH_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
const JWT_LIFETIME_S = 3600; // máximo permitido pelo fluxo server-to-server do Google
const JWT_CLOCK_SKEW_S = 30;
const TOKEN_SAFETY_MARGIN_S = 300;
const ERROR_BODY_EXCERPT = 300;
// A mint de token não herda o httpOptions.timeout do caller (esse contrato é
// da chamada da API); um teto próprio evita que um endpoint OAuth travado
// pendure o single-flight e todos os callers que aguardam a mesma mint.
const TOKEN_MINT_TIMEOUT_MS = 20_000;

// O location compõe o HOST do service endpoint regional
// (`<location>-aiplatform.googleapis.com`). A validação de rótulo DNS único
// minúsculo (sem pontos, barras ou espaços) garante que nenhuma configuração
// livre desloque a origem de uma requisição com bearer token para fora de
// googleapis.com, sem manter uma lista hard-coded que envelhece quando o
// Google adiciona regiões (ex.: europe-west10, asia-south2). Uma região
// bem-formada porém inexistente falha na resolução DNS da própria chamada.
// Fonte: https://cloud.google.com/vertex-ai/docs/reference/rest#service-endpoint
const VALID_VERTEX_LOCATION_LABEL = /^[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const resolveVertexBaseUrl = (location: string): string => {
  if (location === 'global') return 'https://aiplatform.googleapis.com';
  if (location === 'us' || location === 'eu') return `https://aiplatform.${location}.rep.googleapis.com`;
  if (VALID_VERTEX_LOCATION_LABEL.test(location)) return `https://${location}-aiplatform.googleapis.com`;

  throw new Error(
    'VERTEX_LOCATION inválida: use global, us, eu ou uma região oficial do Vertex AI (rótulo DNS minúsculo único, sem pontos).',
  );
};

// Cache module-level: sobrevive entre requests no mesmo isolate. Chaveado pela
// identidade da chave para nunca vazar token entre credenciais distintas.
const tokenCache = new Map<string, { token: string; expiresAtMs: number }>();
const inflightMints = new Map<string, Promise<string>>();

const base64UrlFromBytes = (bytes: Uint8Array): string => {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64UrlFromJson = (value: unknown): string =>
  base64UrlFromBytes(new TextEncoder().encode(JSON.stringify(value)));

const pemToPkcs8Bytes = (pem: string): Uint8Array<ArrayBuffer> => {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const parseServiceAccountKey = (saKeyJson: string): ServiceAccountKey => {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(saKeyJson) as Record<string, unknown>;
  } catch {
    // Mensagem genérica de propósito: o SyntaxError do V8 pode embutir trechos
    // do input (a própria SA, incluindo a chave privada) e os handlers logam
    // a cadeia de erros — nada do parse pode vazar para logs.
    throw new Error('VERTEX_SA_KEY inválido: o conteúdo do secret não é JSON parseável.');
  }
  for (const field of ['client_email', 'private_key', 'private_key_id', 'token_uri'] as const) {
    if (typeof parsed[field] !== 'string' || !parsed[field]) {
      throw new Error(`VERTEX_SA_KEY inválido: campo obrigatório ausente ou vazio: ${field}`);
    }
  }
  return parsed as unknown as ServiceAccountKey;
};

const mintAccessToken = async (
  sa: ServiceAccountKey,
  fetchImpl: typeof fetch,
  nowMs: number,
): Promise<{ token: string; expiresInS: number }> => {
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8Bytes(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const iat = Math.floor(nowMs / 1000) - JWT_CLOCK_SKEW_S;
  const header = { alg: 'RS256', typ: 'JWT', kid: sa.private_key_id };
  const claims = { iss: sa.client_email, scope: OAUTH_SCOPE, aud: sa.token_uri, iat, exp: iat + JWT_LIFETIME_S };
  const signingInput = `${base64UrlFromJson(header)}.${base64UrlFromJson(claims)}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
  const assertion = `${signingInput}.${base64UrlFromBytes(new Uint8Array(signature))}`;

  const res = await fetchImpl(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: OAUTH_GRANT_TYPE, assertion }).toString(),
    signal: AbortSignal.timeout(TOKEN_MINT_TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, ERROR_BODY_EXCERPT);
    throw new VertexHttpError(
      `Falha ao obter access token OAuth para ${sa.client_email} (HTTP ${res.status}): ${detail}`,
      res.status,
      'oauth-token',
    );
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error(`Resposta do token endpoint sem access_token (HTTP ${res.status}).`);
  }
  return { token: data.access_token, expiresInS: data.expires_in ?? JWT_LIFETIME_S };
};

/** Espera a mint sem nunca abortá-la: ela é compartilhada por single-flight e
 * outro caller pode ter orçamento maior. Quem estourou desiste sozinho. */
const awaitWithinBudget = async <T>(promise: Promise<T>, budgetMs: number, operation: VertexOperation): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () =>
        reject(new Error(`Vertex ${operation}: orçamento de ${budgetMs}ms esgotado durante a mint do access token.`)),
      budgetMs,
    );
  });
  try {
    return await Promise.race([promise, budget]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const getAccessToken = async (
  sa: ServiceAccountKey,
  fetchImpl: typeof fetch,
  now: () => number,
  budget?: { ms: number; operation: VertexOperation },
): Promise<string> => {
  const cacheKey = `${sa.client_email}|${sa.private_key_id}|${sa.token_uri}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAtMs > now()) return cached.token;
  const existing = inflightMints.get(cacheKey);
  if (existing) return budget ? awaitWithinBudget(existing, budget.ms, budget.operation) : existing;
  const mint = (async () => {
    const { token, expiresInS } = await mintAccessToken(sa, fetchImpl, now());
    tokenCache.set(cacheKey, { token, expiresAtMs: now() + (expiresInS - TOKEN_SAFETY_MARGIN_S) * 1000 });
    return token;
  })();
  inflightMints.set(cacheKey, mint);
  // A limpeza trata os dois desfechos: com `.finally` a rejeição da mint
  // sobreviveria na promise derivada e viraria unhandled rejection quando o
  // caller já tivesse desistido por orçamento.
  const cleanup = () => {
    inflightMints.delete(cacheKey);
  };
  mint.then(cleanup, cleanup);
  return budget ? awaitWithinBudget(mint, budget.ms, budget.operation) : mint;
};

const isContent = (item: unknown): boolean =>
  typeof item === 'object' && item !== null && 'role' in item && 'parts' in item;

// Os handlers do oraculo passam contents no formato do SDK: uma string simples
// ou um array misto de parts ({ inlineData } + string de prompt). O REST v1
// exige Content[] com role e parts — um array que ainda não é Content[] vira
// um único content de usuário, com strings promovidas a { text }.
const toContents = (contents: unknown): unknown => {
  if (typeof contents === 'string') return [{ role: 'user', parts: [{ text: contents }] }];
  if (Array.isArray(contents) && !contents.every(isContent)) {
    return [
      {
        role: 'user',
        parts: contents.map((item) => (typeof item === 'string' ? { text: item } : item)),
      },
    ];
  }
  return contents;
};

const toRestBody = (args: GenerateContentArgs): Record<string, unknown> => {
  const body: Record<string, unknown> = { contents: toContents(args.contents) };
  const config = args.config;
  if (!config) return body;
  const generationConfig: Record<string, unknown> = {};
  for (const field of [
    'temperature',
    'topP',
    'maxOutputTokens',
    'thinkingConfig',
    'responseMimeType',
    'responseJsonSchema',
    'responseSchema',
  ] as const) {
    if (config[field] !== undefined) generationConfig[field] = config[field];
  }
  if (Object.keys(generationConfig).length > 0) body.generationConfig = generationConfig;
  if (config.systemInstruction !== undefined) {
    body.systemInstruction =
      typeof config.systemInstruction === 'string'
        ? { role: 'user', parts: [{ text: config.systemInstruction }] }
        : config.systemInstruction;
  }
  if (config.safetySettings !== undefined) body.safetySettings = config.safetySettings;
  return body;
};

const extractText = (candidates: VertexCandidate[] | undefined): string => {
  const parts = candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('');
};

/** Espelha a superfície do SDK @google/genai consumida por analisar-ia.ts e tesouro-ipca-vision.ts. */
export class VertexGenAI {
  private readonly options: VertexGenAIOptions;
  private readonly vertexBaseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;

  readonly models = {
    generateContent: async (args: GenerateContentArgs): Promise<VertexGenerateContentResponse> => {
      const data = (await this.request(
        args.model,
        'generateContent',
        toRestBody(args),
        args.config?.httpOptions?.timeout,
      )) as Omit<VertexGenerateContentResponse, 'text'>;
      return { ...data, text: extractText(data.candidates) };
    },
    countTokens: async (args: CountTokensArgs): Promise<{ totalTokens?: number }> =>
      (await this.request(
        args.model,
        'countTokens',
        { contents: toContents(args.contents) },
        args.config?.httpOptions?.timeout,
      )) as { totalTokens?: number },
    list: (args: ListModelsArgs = {}): AsyncGenerator<PublisherModelSummary, void, undefined> => this.listModels(args),
  };

  constructor(options: VertexGenAIOptions) {
    this.vertexBaseUrl = resolveVertexBaseUrl(options.location);
    this.options = Object.freeze({ ...options });
    // O fetch global do workerd exige `this` global; chamar via this.fetchImpl
    // vazaria a instância como `this` e lança Illegal invocation em produção.
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.now = options.now ?? Date.now;
  }

  private baseUrl(): string {
    return this.vertexBaseUrl;
  }

  private async *listModels(args: ListModelsArgs): AsyncGenerator<PublisherModelSummary, void, undefined> {
    const sa = parseServiceAccountKey(this.options.saKeyJson);
    const timeoutMs = args.config?.httpOptions?.timeout;
    // Mesmo contrato do request(): o timeout é orçamento da listagem inteira,
    // mint incluída — senão uma mint fria consumiria o teto do caller (15s no
    // Maestro) e ainda somaria o prazo próprio de cada página. Um valor <= 0
    // significa prazo já esgotado, não ausência de prazo.
    const hasBudget = timeoutMs !== undefined && Number.isFinite(timeoutMs);
    const budgetMs = hasBudget ? Number(timeoutMs) : 0;
    if (hasBudget && budgetMs <= 0) {
      throw new Error('Vertex listModels: orçamento de tempo já esgotado quando a listagem foi solicitada.');
    }
    const startedAt = this.now();
    const remainingMs = () => budgetMs - (this.now() - startedAt);
    const token = await getAccessToken(
      sa,
      this.fetchImpl,
      this.now,
      hasBudget ? { ms: budgetMs, operation: 'listModels' } : undefined,
    );
    const pageSize = args.config?.pageSize;
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams();
      if (pageSize !== undefined) params.set('pageSize', String(clampPageSize(pageSize)));
      if (pageToken) params.set('pageToken', pageToken);
      const qs = params.toString();
      const url = `${LIST_MODELS_BASE_URL}${qs ? `?${qs}` : ''}`;
      const pageBudget = hasBudget ? remainingMs() : 0;
      if (hasBudget && pageBudget <= 0) {
        throw new Error(`Vertex listModels: orçamento de ${budgetMs}ms esgotado antes de pedir a próxima página.`);
      }
      const res = await this.fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}` },
        ...(hasBudget ? { signal: AbortSignal.timeout(pageBudget) } : {}),
      });
      if (!res.ok) {
        const detail = (await res.text()).slice(0, ERROR_BODY_EXCERPT);
        throw new VertexHttpError(`Vertex listModels falhou (HTTP ${res.status}): ${detail}`, res.status, 'listModels');
      }
      const data = (await res.json()) as { publisherModels?: PublisherModelSummary[]; nextPageToken?: string };
      for (const m of data.publisherModels ?? []) {
        yield m;
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  }

  private async request(
    model: string,
    verb: 'generateContent' | 'countTokens',
    body: Record<string, unknown>,
    timeoutMs?: number,
  ): Promise<unknown> {
    const sa = parseServiceAccountKey(this.options.saKeyJson);
    // O timeout do caller é orçamento da chamada INTEIRA (mint + requisição):
    // com cache frio, gastar o orçamento na mint e ainda disparar a geração
    // deixaria trabalho faturável correndo depois do prazo do handler.
    // Um timeout presente porém <= 0 significa prazo JÁ esgotado. Tratar isso
    // como "sem orçamento" faria a chamada sair sem AbortSignal exatamente no
    // caso em que ela não deveria sair.
    const hasBudget = timeoutMs !== undefined && Number.isFinite(timeoutMs);
    const budgetMs = hasBudget ? Number(timeoutMs) : 0;
    if (hasBudget && budgetMs <= 0) {
      throw new Error(`Vertex ${verb}: orçamento de tempo já esgotado quando a chamada foi solicitada.`);
    }
    const startedAt = this.now();
    const token = await getAccessToken(
      sa,
      this.fetchImpl,
      this.now,
      hasBudget ? { ms: budgetMs, operation: verb } : undefined,
    );
    const remainingMs = hasBudget ? budgetMs - (this.now() - startedAt) : 0;
    if (hasBudget && remainingMs <= 0) {
      throw new Error(`Vertex ${verb}: orçamento de ${budgetMs}ms esgotado antes da requisição.`);
    }
    const { location } = this.options;
    // Deploys de terceiros (forks) configuram apenas VERTEX_SA_KEY: sem project
    // explícito, o correto é o projeto dono da própria service account.
    const project = this.options.project || sa.project_id;
    if (!project) {
      throw new Error(
        'Projeto Vertex indefinido: a service account não tem project_id e VERTEX_PROJECT não está configurado.',
      );
    }
    const url = `${this.baseUrl()}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:${verb}`;
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      ...(hasBudget ? { signal: AbortSignal.timeout(remainingMs) } : {}),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, ERROR_BODY_EXCERPT);
      throw new VertexHttpError(`Vertex ${verb} falhou (HTTP ${res.status}): ${detail}`, res.status, verb);
    }
    return res.json();
  }
}
