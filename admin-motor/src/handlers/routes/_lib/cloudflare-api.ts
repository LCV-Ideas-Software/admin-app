type CloudflareApiError = {
  code?: number | string;
  message?: string;
};

type CloudflareApiResponse<T> = {
  success?: boolean;
  errors?: CloudflareApiError[];
  result?: T;
  result_info?: {
    cursor?: string;
    page?: number;
    per_page?: number;
    total_pages?: number;
    count?: number;
    total_count?: number;
  };
};

export type CloudflareZone = {
  id?: string;
  name?: string;
};

export type CloudflareAccount = {
  id: string;
  name: string;
};

export type CloudflareAccountResolution = {
  accountId: string;
  accountName: string | null;
  source: 'CF_ACCOUNT_ID' | 'auto-discovery';
  accounts: CloudflareAccount[];
};

type CloudflareDnsRecord = {
  id?: string;
  type?: string;
  content?: string;
  name?: string;
  ttl?: number;
  proxied?: boolean;
  priority?: number;
  comment?: string;
  tags?: string[];
  created_on?: string;
  modified_on?: string;
  data?: Record<string, unknown>;
};

type CloudflareDnsRecordListResult = {
  records: CloudflareDnsRecord[];
  pagination: {
    page: number;
    perPage: number;
    totalPages: number;
    totalCount: number;
    count: number;
  };
};

export type CloudflareDnsRecordInput = {
  type: string;
  name: string;
  content?: string | null;
  ttl?: number | null;
  proxied?: boolean | null;
  priority?: number | null;
  comment?: string | null;
  tags?: string[] | null;
  data?: Record<string, unknown> | null;
};

type EnvWithCloudflareToken = {
  CLOUDFLARE_DNS?: string;
  CLOUDFLARE_PW?: string;
  CLOUDFLARE_CACHE?: string;
  CF_ACCOUNT_ID?: string;
};

export type CloudflareRegistrarRegistration = {
  domain_name: string;
  status: string;
  created_at: string | null;
  expires_at: string | null;
  auto_renew: boolean | null;
  privacy_mode: string | null;
  locked: boolean | null;
};

export type CloudflareRegistrarPricing = {
  currency: string;
  registration_cost: string;
  renewal_cost: string;
};

export type CloudflareRegistrarAvailability = {
  name: string;
  registrable: boolean;
  pricing: CloudflareRegistrarPricing | null;
  reason: string | null;
  tier: string | null;
};

export type CloudflareRegistrarListResult = {
  account: CloudflareAccountResolution;
  registrations: CloudflareRegistrarRegistration[];
  pagination: {
    cursor: string | null;
    page: number;
    perPage: number;
    totalPages: number;
    totalCount: number;
    count: number;
  };
};

export type CloudflareRegistrarWorkflowStatus = {
  domain_name?: string;
  state?: string;
  completed?: boolean;
  created_at?: string;
  updated_at?: string;
  context?: Record<string, unknown>;
  error?: {
    code?: string;
    message?: string;
  };
  links?: {
    self?: string;
    resource?: string;
  };
};

export type CloudflareRegistrarCreateInput = {
  domain_name: string;
  auto_renew?: boolean;
  privacy_mode?: 'off' | 'redaction';
  years?: number;
  contacts?: Record<string, unknown>;
};

export type CloudflareRegistrarRegistrationPatch = {
  auto_renew: boolean;
};

export type CloudflareRegistrarDomainPatch = {
  locked?: boolean;
  privacy?: boolean;
};

const resolveToken = (env: EnvWithCloudflareToken) => {
  const byDnsToken = env.CLOUDFLARE_DNS?.trim();
  if (byDnsToken) {
    console.debug('[cloudflare-api] token:using-CLOUDFLARE_DNS', {
      tokenLength: byDnsToken.length,
    });
    return byDnsToken;
  }

  const byPwToken = env.CLOUDFLARE_PW?.trim();
  if (byPwToken) {
    console.warn('[cloudflare-api] token:fallback-CLOUDFLARE_PW', {
      tokenLength: byPwToken.length,
    });
    return byPwToken;
  }

  const byCacheToken = env.CLOUDFLARE_CACHE?.trim();
  if (byCacheToken) {
    console.warn('[cloudflare-api] token:fallback-CLOUDFLARE_CACHE', {
      tokenLength: byCacheToken.length,
    });
    return byCacheToken;
  }

  console.error('[cloudflare-api] token:missing', {
    hasDnsToken: Boolean(env.CLOUDFLARE_DNS?.trim()),
    hasPwToken: Boolean(env.CLOUDFLARE_PW?.trim()),
    hasCacheToken: Boolean(env.CLOUDFLARE_CACHE?.trim()),
  });
  return '';
};

const parseJsonOrThrow = <T>(rawText: string, fallback: string, response: Response): T => {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error(`${fallback}: corpo vazio inesperado (HTTP ${response.status}).`);
  }

  const looksLikeHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html');
  if (looksLikeHtml) {
    throw new Error(`${fallback}: resposta HTML inesperada da API Cloudflare (HTTP ${response.status}).`);
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`${fallback}: resposta não-JSON da API Cloudflare (HTTP ${response.status}).`);
  }
};

export class CloudflareRequestError extends Error {
  readonly status: number;
  readonly code: number | string | null;
  readonly apiMessage: string | null;

  constructor(message: string, options: { status: number; code?: number | string | null; apiMessage?: string | null }) {
    super(message);
    this.name = 'CloudflareRequestError';
    this.status = options.status;
    this.code = options.code ?? null;
    this.apiMessage = options.apiMessage ?? null;
  }
}

const toFirstErrorDetails = (payload: CloudflareApiResponse<unknown>) => {
  const firstError = Array.isArray(payload.errors) && payload.errors.length > 0 ? payload.errors[0] : null;
  return {
    code: firstError?.code ?? null,
    message: firstError?.message?.trim() || null,
  };
};

// O endpoint de status responde HTTP 404 + código `10000` quando não há
// workflow para o domínio. Exigimos AMBOS: um 404 isolado também ocorre em
// erros de roteamento/configuração (ex.: código `7003` "could not route
// request"); tratá-los como "sem workflow" mascararia falha operacional como
// sucesso. O texto da mensagem (em inglês) não é contrato e não é usado.
const isNoRegistrarWorkflowFound = (error: unknown) =>
  error instanceof CloudflareRequestError && error.status === 404 && String(error.code) === '10000';

const cloudflareRequest = async <T>(
  env: EnvWithCloudflareToken,
  path: string,
  fallback: string,
  init?: RequestInit,
) => {
  const payload = await cloudflareRequestPayload<T>(env, path, fallback, init);
  return payload.result as T;
};

const cloudflareRequestPayload = async <T>(
  env: EnvWithCloudflareToken,
  path: string,
  fallback: string,
  init?: RequestInit,
) => {
  const token = resolveToken(env);
  if (!token) {
    throw new Error(
      'Token Cloudflare ausente no runtime (configure CLOUDFLARE_DNS, CLOUDFLARE_PW ou CLOUDFLARE_CACHE).',
    );
  }

  console.debug('[cloudflare-api] request:start', {
    method: init?.method ?? 'GET',
    path,
    fallback,
  });

  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...(init?.body !== undefined ? { body: init.body } : {}),
  });

  const rawText = await response.text();
  const payload = parseJsonOrThrow<CloudflareApiResponse<T>>(rawText, fallback, response);

  if (!response.ok || payload.success !== true) {
    const { code, message } = toFirstErrorDetails(payload);
    console.error('[cloudflare-api] request:error', {
      method: init?.method ?? 'GET',
      path,
      status: response.status,
      code: code ?? null,
      message: message ?? null,
      fallback,
    });
    throw new CloudflareRequestError(message ? `${fallback}: ${message}` : `${fallback}: HTTP ${response.status}`, {
      status: response.status,
      code,
      apiMessage: message,
    });
  }

  console.info('[cloudflare-api] request:ok', {
    method: init?.method ?? 'GET',
    path,
    status: response.status,
  });

  return payload;
};

const normalizeCloudflareAccount = (account: { id?: string; name?: string }): CloudflareAccount => ({
  id: String(account.id ?? '').trim(),
  name: String(account.name ?? '').trim(),
});

export const listCloudflareAccounts = async (env: EnvWithCloudflareToken) => {
  const accounts = await cloudflareRequest<Array<{ id?: string; name?: string }>>(
    env,
    '/accounts?page=1&per_page=50',
    'Falha ao carregar contas da Cloudflare',
  );

  return (Array.isArray(accounts) ? accounts : []).map(normalizeCloudflareAccount).filter((account) => account.id);
};

export const resolveCloudflareAccount = async (env: EnvWithCloudflareToken): Promise<CloudflareAccountResolution> => {
  const byEnv = String(env.CF_ACCOUNT_ID ?? '').trim();
  if (byEnv) {
    return {
      accountId: byEnv,
      accountName: null,
      source: 'CF_ACCOUNT_ID',
      accounts: [],
    };
  }

  const accounts = await listCloudflareAccounts(env);
  const firstAccount = accounts[0];
  if (!firstAccount) {
    throw new Error('Nenhuma conta Cloudflare disponível para o token informado.');
  }

  return {
    accountId: firstAccount.id,
    accountName: firstAccount.name || null,
    source: 'auto-discovery',
    accounts,
  };
};

const normalizeRegistrarRegistration = (registration: Partial<CloudflareRegistrarRegistration>) => ({
  domain_name: String(registration.domain_name ?? '')
    .trim()
    .toLowerCase(),
  status: String(registration.status ?? '').trim(),
  created_at: registration.created_at ? String(registration.created_at) : null,
  expires_at: registration.expires_at ? String(registration.expires_at) : null,
  auto_renew: typeof registration.auto_renew === 'boolean' ? registration.auto_renew : null,
  privacy_mode: registration.privacy_mode ? String(registration.privacy_mode) : null,
  locked: typeof registration.locked === 'boolean' ? registration.locked : null,
});

const normalizeRegistrarAvailability = (domain: Partial<CloudflareRegistrarAvailability>) => {
  const pricing =
    domain.pricing && typeof domain.pricing === 'object'
      ? {
          currency: String(domain.pricing.currency ?? '').trim(),
          registration_cost: String(domain.pricing.registration_cost ?? '').trim(),
          renewal_cost: String(domain.pricing.renewal_cost ?? '').trim(),
        }
      : null;

  return {
    name: String(domain.name ?? '')
      .trim()
      .toLowerCase(),
    registrable: Boolean(domain.registrable),
    pricing,
    reason: domain.reason ? String(domain.reason) : null,
    tier: domain.tier ? String(domain.tier) : null,
  };
};

const normalizeDomainName = (domainName: string) => {
  const normalized = domainName.trim().toLowerCase();
  if (!normalized) {
    throw new Error('Domínio é obrigatório para consultar Registrar.');
  }
  if (!/^[a-z0-9.-]+$/.test(normalized) || normalized.includes('..') || normalized.startsWith('.')) {
    throw new Error('Domínio inválido para consulta Registrar.');
  }
  return normalized;
};

const normalizeSearchTerm = (term: string) => {
  const normalized = term.trim().toLowerCase();
  if (!normalized) {
    throw new Error('Termo de busca é obrigatório para consultar Registrar.');
  }
  if (normalized.length > 100) {
    throw new Error('Termo de busca Registrar deve ter no máximo 100 caracteres.');
  }
  if (normalized.startsWith('.') && !normalized.slice(1).includes('.')) {
    throw new Error('Busca por extensão isolada não é suportada; informe uma marca, termo ou domínio completo.');
  }
  return normalized;
};

const normalizeRegistrarDomainList = (raw: unknown) => {
  if (!raw || typeof raw !== 'object') {
    return [];
  }
  const domains = (raw as { domains?: unknown }).domains;
  return (Array.isArray(domains) ? domains : [])
    .map((domain) => normalizeRegistrarAvailability(domain as Partial<CloudflareRegistrarAvailability>))
    .filter((domain) => domain.name);
};

const normalizeRegistrarWorkflowStatus = (status: CloudflareRegistrarWorkflowStatus) => ({
  domain_name: status?.domain_name ? String(status.domain_name).trim().toLowerCase() : undefined,
  state: status?.state ? String(status.state) : undefined,
  completed: typeof status?.completed === 'boolean' ? status.completed : undefined,
  created_at: status?.created_at ? String(status.created_at) : undefined,
  updated_at: status?.updated_at ? String(status.updated_at) : undefined,
  context: status?.context && typeof status.context === 'object' ? status.context : undefined,
  error:
    status?.error && typeof status.error === 'object'
      ? {
          code: status.error.code ? String(status.error.code) : undefined,
          message: status.error.message ? String(status.error.message) : undefined,
        }
      : undefined,
  links:
    status?.links && typeof status.links === 'object'
      ? {
          self: status.links.self ? String(status.links.self) : undefined,
          resource: status.links.resource ? String(status.links.resource) : undefined,
        }
      : undefined,
});

const normalizeRegistrarCreateInput = (input: CloudflareRegistrarCreateInput) => {
  const domainName = normalizeDomainName(input.domain_name);
  const payload: CloudflareRegistrarCreateInput = {
    domain_name: domainName,
  };

  if (typeof input.auto_renew === 'boolean') {
    payload.auto_renew = input.auto_renew;
  }

  if (input.privacy_mode) {
    if (!['off', 'redaction'].includes(input.privacy_mode)) {
      throw new Error('privacy_mode inválido para registro Registrar.');
    }
    payload.privacy_mode = input.privacy_mode;
  }

  if (input.years != null) {
    const years = Number(input.years);
    if (!Number.isInteger(years) || years < 1 || years > 10) {
      throw new Error('years deve ser inteiro entre 1 e 10.');
    }
    payload.years = years;
  }

  if (input.contacts && typeof input.contacts === 'object') {
    payload.contacts = input.contacts;
  }

  return payload;
};

// Limite de segurança contra laço infinito caso a API ignore os parâmetros de
// paginação. A terminação normal é por `total_pages`/`cursor`; este teto só age
// se a API se comportar mal. 200 cobre o máximo de 100 domínios por conta mesmo
// num page size degenerado de 1 item/página (200 > 100), com folga.
const REGISTRAR_LIST_MAX_PAGES = 200;

export const listCloudflareRegistrarRegistrations = async (
  env: EnvWithCloudflareToken,
): Promise<CloudflareRegistrarListResult> => {
  const account = await resolveCloudflareAccount(env);

  // A lista é paginada: uma única chamada pode truncar silenciosamente contas
  // com muitos domínios. Seguimos `cursor` (se presente) ou `page` até esgotar.
  const byDomain = new Map<string, CloudflareRegistrarRegistration>();
  let cursor = '';
  let page = 1;
  let totalCount = 0;

  for (let fetched = 0; fetched < REGISTRAR_LIST_MAX_PAGES; fetched += 1) {
    const query = new URLSearchParams();
    if (cursor) {
      query.set('cursor', cursor);
    } else if (page > 1) {
      query.set('page', String(page));
    }
    const queryString = query.toString();

    const payload = await cloudflareRequestPayload<CloudflareRegistrarRegistration[]>(
      env,
      `/accounts/${encodeURIComponent(account.accountId)}/registrar/registrations${queryString ? `?${queryString}` : ''}`,
      'Falha ao listar domínios registrados na Cloudflare',
    );

    const batch = Array.isArray(payload.result) ? payload.result : [];
    for (const registration of batch.map(normalizeRegistrarRegistration)) {
      if (registration.domain_name) {
        byDomain.set(registration.domain_name, registration);
      }
    }

    const info = payload.result_info ?? {};
    totalCount = Number(info.total_count ?? totalCount);
    const nextCursor = info.cursor ? String(info.cursor) : '';
    const totalPages = Number(info.total_pages ?? 1);

    if (batch.length === 0) {
      break;
    }
    if (nextCursor && nextCursor !== cursor) {
      cursor = nextCursor;
      continue;
    }
    if (!nextCursor && Number.isFinite(totalPages) && page < totalPages) {
      page += 1;
      continue;
    }
    break;
  }

  const registrations = [...byDomain.values()].sort((a, b) => a.domain_name.localeCompare(b.domain_name));

  return {
    account,
    registrations,
    pagination: {
      cursor: null,
      page: 1,
      perPage: registrations.length,
      totalPages: 1,
      totalCount: Math.max(totalCount, registrations.length),
      count: registrations.length,
    },
  };
};

export const searchCloudflareRegistrarDomains = async (
  env: EnvWithCloudflareToken,
  options: {
    q: string;
    extensions?: string[];
    limit?: number;
  },
) => {
  const account = await resolveCloudflareAccount(env);
  const query = new URLSearchParams({
    q: normalizeSearchTerm(options.q),
  });
  const limit = options.limit == null ? 20 : Number(options.limit);
  if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
    throw new Error('limit deve estar entre 1 e 50.');
  }
  query.set('limit', String(Math.trunc(limit)));

  const extensions = Array.isArray(options.extensions)
    ? options.extensions.map((extension) => extension.trim().replace(/^\./, '').toLowerCase()).filter(Boolean)
    : [];
  for (const extension of extensions.slice(0, 20)) {
    query.append('extensions', extension);
  }

  const result = await cloudflareRequest<{ domains?: CloudflareRegistrarAvailability[] }>(
    env,
    `/accounts/${encodeURIComponent(account.accountId)}/registrar/domain-search?${query.toString()}`,
    'Falha ao buscar domínios disponíveis na Cloudflare',
  );

  return {
    account,
    domains: normalizeRegistrarDomainList(result),
  };
};

export const checkCloudflareRegistrarDomains = async (env: EnvWithCloudflareToken, domains: string[]) => {
  const account = await resolveCloudflareAccount(env);

  // A API documenta que nomes malformados podem ser omitidos da resposta — ou
  // seja, um lote misto deve render resultados parciais, não falhar inteiro.
  // Domínios inválidos são separados em `skipped` em vez de abortar a checagem.
  const normalizedDomains: string[] = [];
  const skipped: string[] = [];
  for (const candidate of Array.isArray(domains) ? domains : []) {
    try {
      normalizedDomains.push(normalizeDomainName(String(candidate ?? '')));
    } catch {
      skipped.push(String(candidate ?? ''));
    }
  }

  if (normalizedDomains.length === 0) {
    throw new Error('Informe ao menos um domínio válido para checagem Registrar.');
  }
  if (normalizedDomains.length > 20) {
    throw new Error('A checagem Registrar aceita no máximo 20 domínios válidos por chamada.');
  }

  const result = await cloudflareRequest<{ domains?: CloudflareRegistrarAvailability[] }>(
    env,
    `/accounts/${encodeURIComponent(account.accountId)}/registrar/domain-check`,
    'Falha ao checar disponibilidade no Cloudflare Registrar',
    {
      method: 'POST',
      body: JSON.stringify({
        domains: normalizedDomains,
      }),
    },
  );

  return {
    account,
    domains: normalizeRegistrarDomainList(result),
    skipped,
  };
};

export const createCloudflareRegistrarRegistration = async (
  env: EnvWithCloudflareToken,
  input: CloudflareRegistrarCreateInput,
) => {
  const account = await resolveCloudflareAccount(env);
  const payload = normalizeRegistrarCreateInput(input);
  const status = await cloudflareRequest<CloudflareRegistrarWorkflowStatus>(
    env,
    `/accounts/${encodeURIComponent(account.accountId)}/registrar/registrations`,
    `Falha ao registrar domínio ${payload.domain_name} na Cloudflare`,
    {
      method: 'POST',
      headers: {
        Prefer: 'respond-async',
      },
      body: JSON.stringify(payload),
    },
  );

  return {
    account,
    status: normalizeRegistrarWorkflowStatus(status),
  };
};

export const updateCloudflareRegistrarRegistration = async (
  env: EnvWithCloudflareToken,
  domainName: string,
  patch: CloudflareRegistrarRegistrationPatch,
) => {
  const account = await resolveCloudflareAccount(env);
  const normalizedDomain = normalizeDomainName(domainName);
  if (typeof patch.auto_renew !== 'boolean') {
    throw new Error('auto_renew booleano é obrigatório para atualizar Registrar.');
  }

  const status = await cloudflareRequest<CloudflareRegistrarWorkflowStatus>(
    env,
    `/accounts/${encodeURIComponent(account.accountId)}/registrar/registrations/${encodeURIComponent(normalizedDomain)}`,
    `Falha ao atualizar registro Registrar ${normalizedDomain}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'respond-async',
      },
      body: JSON.stringify({
        auto_renew: patch.auto_renew,
      }),
    },
  );

  return {
    account,
    status: normalizeRegistrarWorkflowStatus(status),
  };
};

// Lock de transferência e privacidade WHOIS não são aceitos pelo PATCH de
// `/registrar/registrations` (que hoje só suporta `auto_renew`). O endpoint
// documentado para esses campos é o legado `PUT /registrar/domains/{domain}`.
export const updateCloudflareRegistrarDomain = async (
  env: EnvWithCloudflareToken,
  domainName: string,
  patch: CloudflareRegistrarDomainPatch,
) => {
  const account = await resolveCloudflareAccount(env);
  const normalizedDomain = normalizeDomainName(domainName);

  const body: Record<string, boolean> = {};
  if (typeof patch.locked === 'boolean') {
    body.locked = patch.locked;
  }
  if (typeof patch.privacy === 'boolean') {
    body.privacy = patch.privacy;
  }
  if (Object.keys(body).length === 0) {
    throw new Error('Informe locked e/ou privacy para atualizar o domínio Registrar.');
  }

  await cloudflareRequest<unknown>(
    env,
    `/accounts/${encodeURIComponent(account.accountId)}/registrar/domains/${encodeURIComponent(normalizedDomain)}`,
    `Falha ao atualizar domínio Registrar ${normalizedDomain}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );

  return { account };
};

export const getCloudflareRegistrarRegistration = async (env: EnvWithCloudflareToken, domainName: string) => {
  const account = await resolveCloudflareAccount(env);
  const normalizedDomain = normalizeDomainName(domainName);
  const registration = await cloudflareRequest<CloudflareRegistrarRegistration>(
    env,
    `/accounts/${encodeURIComponent(account.accountId)}/registrar/registrations/${encodeURIComponent(normalizedDomain)}`,
    `Falha ao consultar registro Registrar ${normalizedDomain}`,
  );

  return {
    account,
    registration: normalizeRegistrarRegistration(registration ?? {}),
  };
};

export const getCloudflareRegistrarRegistrationStatus = async (env: EnvWithCloudflareToken, domainName: string) => {
  const account = await resolveCloudflareAccount(env);
  const normalizedDomain = normalizeDomainName(domainName);
  try {
    const status = await cloudflareRequest<CloudflareRegistrarWorkflowStatus>(
      env,
      `/accounts/${encodeURIComponent(account.accountId)}/registrar/registrations/${encodeURIComponent(normalizedDomain)}/registration-status`,
      `Falha ao consultar status de registro Registrar ${normalizedDomain}`,
    );

    return {
      account,
      status: normalizeRegistrarWorkflowStatus(status),
      workflow_missing: false,
    };
  } catch (error) {
    if (isNoRegistrarWorkflowFound(error)) {
      return {
        account,
        status: null,
        workflow_missing: true,
      };
    }
    throw error;
  }
};

export const getCloudflareRegistrarUpdateStatus = async (env: EnvWithCloudflareToken, domainName: string) => {
  const account = await resolveCloudflareAccount(env);
  const normalizedDomain = normalizeDomainName(domainName);
  try {
    const status = await cloudflareRequest<CloudflareRegistrarWorkflowStatus>(
      env,
      `/accounts/${encodeURIComponent(account.accountId)}/registrar/registrations/${encodeURIComponent(normalizedDomain)}/update-status`,
      `Falha ao consultar status de atualização Registrar ${normalizedDomain}`,
    );

    return {
      account,
      status: normalizeRegistrarWorkflowStatus(status),
      workflow_missing: false,
    };
  } catch (error) {
    if (isNoRegistrarWorkflowFound(error)) {
      return {
        account,
        status: null,
        workflow_missing: true,
      };
    }
    throw error;
  }
};

export const listCloudflareZones = async (env: EnvWithCloudflareToken) => {
  const zones = await cloudflareRequest<CloudflareZone[]>(
    env,
    '/zones?status=active&per_page=500',
    'Falha ao carregar zonas da Cloudflare',
  );

  return (Array.isArray(zones) ? zones : [])
    .map((zone) => ({
      id: String(zone.id ?? '').trim(),
      name: String(zone.name ?? '')
        .trim()
        .toLowerCase(),
    }))
    .filter((zone) => zone.id && zone.name)
    .sort((a, b) => a.name.localeCompare(b.name));
};

const extractDnsResult = async (env: EnvWithCloudflareToken, path: string, fallback: string) => {
  try {
    const result = await cloudflareRequest<CloudflareDnsRecord[]>(env, path, fallback);
    const normalized = Array.isArray(result) ? result : [];
    console.debug('[cloudflare-api] extractDnsResult:ok', {
      path,
      total: normalized.length,
    });
    return normalized;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[cloudflare-api] extractDnsResult:error', {
      path,
      fallback,
      error: message,
    });
    throw error;
  }
};

const quoteTxtContent = (content: string) => {
  const normalized = content.trim().replace(/^"|"$/g, '');
  return `"${normalized}"`;
};

const normalizeZoneId = (zoneId: string) => {
  const normalized = zoneId.trim();
  if (!normalized) {
    throw new Error('Zone ID é obrigatório.');
  }
  return normalized;
};

const normalizeRecordId = (recordId: string) => {
  const normalized = recordId.trim();
  if (!normalized) {
    throw new Error('Record ID é obrigatório.');
  }
  return normalized;
};

const normalizeRecordType = (recordType: string) => {
  const normalized = recordType.trim().toUpperCase();
  if (!normalized) {
    throw new Error('Tipo de registro DNS é obrigatório.');
  }
  return normalized;
};

const normalizeRecordName = (recordName: string) => {
  const normalized = recordName.trim().toLowerCase();
  if (!normalized) {
    throw new Error('Nome do registro DNS é obrigatório.');
  }
  return normalized;
};

const normalizeRecordInput = (input: CloudflareDnsRecordInput) => {
  const type = normalizeRecordType(input.type);
  const name = normalizeRecordName(input.name);
  const content = String(input.content ?? '').trim();
  const ttl = Number(input.ttl ?? 1);
  const proxied = input.proxied == null ? null : Boolean(input.proxied);
  const priority = input.priority == null || Number.isNaN(Number(input.priority)) ? null : Number(input.priority);
  const comment = String(input.comment ?? '').trim();
  const tags = Array.isArray(input.tags) ? input.tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
  const data = input.data && typeof input.data === 'object' ? input.data : null;

  if (!content && !data) {
    throw new Error('Informe content ou data para o registro DNS.');
  }

  if (!Number.isFinite(ttl) || (ttl !== 1 && (ttl < 60 || ttl > 86400))) {
    throw new Error('TTL inválido. Use 1 (auto) ou um valor entre 60 e 86400 segundos.');
  }

  if (priority != null && (!Number.isInteger(priority) || priority < 0 || priority > 65535)) {
    throw new Error('Priority inválido. Use um inteiro entre 0 e 65535.');
  }

  return {
    type,
    name,
    content,
    ttl,
    proxied,
    priority,
    comment,
    tags,
    data,
  };
};

const buildDnsRecordPayload = (input: CloudflareDnsRecordInput) => {
  const normalized = normalizeRecordInput(input);

  const payload: Record<string, unknown> = {
    type: normalized.type,
    name: normalized.name,
    ttl: normalized.ttl,
  };

  if (normalized.content) {
    payload.content = normalized.content;
  }
  if (normalized.proxied != null) {
    payload.proxied = normalized.proxied;
  }
  if (normalized.priority != null) {
    payload.priority = normalized.priority;
  }
  if (normalized.comment) {
    payload.comment = normalized.comment;
  }
  if (normalized.tags.length > 0) {
    payload.tags = normalized.tags;
  }
  if (normalized.data) {
    payload.data = normalized.data;
  }

  return payload;
};

export const upsertCloudflareTxtRecord = async (
  env: EnvWithCloudflareToken,
  zoneId: string,
  name: string,
  content: string,
) => {
  const normalizedZoneId = zoneId.trim();
  const normalizedName = name.trim().toLowerCase();
  const normalizedContent = content.trim();

  if (!normalizedZoneId || !normalizedName || !normalizedContent) {
    throw new Error('ZoneId, name e content são obrigatórios para upsert TXT na Cloudflare.');
  }

  const existing = await extractDnsResult(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=TXT&name=${encodeURIComponent(normalizedName)}`,
    `Falha ao consultar TXT ${normalizedName}`,
  );

  const existingRecordId = String(existing[0]?.id ?? '').trim();

  if (existingRecordId) {
    await cloudflareRequest<CloudflareDnsRecord>(
      env,
      `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records/${encodeURIComponent(existingRecordId)}`,
      `Falha ao atualizar TXT ${normalizedName}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          content: quoteTxtContent(normalizedContent),
        }),
      },
    );

    return {
      mode: 'update' as const,
      recordId: existingRecordId,
    };
  }

  const created = await cloudflareRequest<CloudflareDnsRecord>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records`,
    `Falha ao criar TXT ${normalizedName}`,
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'TXT',
        name: normalizedName,
        content: quoteTxtContent(normalizedContent),
        ttl: 1,
      }),
    },
  );

  return {
    mode: 'create' as const,
    recordId: String(created?.id ?? '').trim(),
  };
};

export const getCloudflareDnsSnapshot = async (env: EnvWithCloudflareToken, domain: string, zoneId: string) => {
  const normalizedDomain = domain.trim().toLowerCase();
  const normalizedZoneId = zoneId.trim();

  if (!normalizedDomain || !normalizedZoneId) {
    throw new Error('Domain e zoneId são obrigatórios para auditar DNS na Cloudflare.');
  }

  const [mxRecordsRaw, tlsRptRaw, mtastsRaw] = await Promise.all([
    extractDnsResult(
      env,
      `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=MX`,
      `Falha ao consultar MX de ${normalizedDomain}`,
    ),
    extractDnsResult(
      env,
      `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=TXT&name=${encodeURIComponent(`_smtp._tls.${normalizedDomain}`)}`,
      `Falha ao consultar TLS-RPT de ${normalizedDomain}`,
    ),
    extractDnsResult(
      env,
      `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=TXT&name=${encodeURIComponent(`_mta-sts.${normalizedDomain}`)}`,
      `Falha ao consultar MTA-STS TXT de ${normalizedDomain}`,
    ),
  ]);

  const mxRecords = mxRecordsRaw
    .map((record) =>
      String(record.content ?? '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const tlsRptContent = String(tlsRptRaw[0]?.content ?? '').replace(/["\s]/g, '');
  const tlsRptMatch = tlsRptContent.match(/mailto:([^;]+)/i);
  const dnsTlsRptEmail = tlsRptMatch?.[1]?.trim().toLowerCase() || null;

  const mtastsContent = String(mtastsRaw[0]?.content ?? '').replace(/["\s]/g, '');
  const mtastsMatch = mtastsContent.match(/id=([a-zA-Z0-9_-]+)/);
  const dnsMtaStsId = mtastsMatch?.[1]?.trim() || null;

  return {
    mxRecords,
    dnsTlsRptEmail,
    dnsMtaStsId,
  };
};

export const listCloudflareDnsRecords = async (
  env: EnvWithCloudflareToken,
  zoneId: string,
  options?: {
    page?: number;
    perPage?: number;
    type?: string;
    search?: string;
  },
): Promise<CloudflareDnsRecordListResult> => {
  const normalizedZoneId = normalizeZoneId(zoneId);
  const page =
    Number.isFinite(Number(options?.page)) && Number(options?.page) > 0 ? Math.trunc(Number(options?.page)) : 1;
  const perPage =
    Number.isFinite(Number(options?.perPage)) && Number(options?.perPage) > 0
      ? Math.min(Math.trunc(Number(options?.perPage)), 500)
      : 100;
  const type = String(options?.type ?? '')
    .trim()
    .toUpperCase();
  const search = String(options?.search ?? '')
    .trim()
    .toLowerCase();

  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    order: 'type',
    direction: 'asc',
  });

  if (type) {
    query.set('type', type);
  }

  if (search) {
    query.set('name', search);
  }

  const payload = await cloudflareRequestPayload<CloudflareDnsRecord[]>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?${query.toString()}`,
    'Falha ao listar registros DNS da zona',
  );

  const records = Array.isArray(payload.result) ? payload.result : [];
  const info = payload.result_info ?? {};

  return {
    records,
    pagination: {
      page: Number(info.page ?? page),
      perPage: Number(info.per_page ?? perPage),
      totalPages: Number(info.total_pages ?? 1),
      totalCount: Number(info.total_count ?? records.length),
      count: Number(info.count ?? records.length),
    },
  };
};

export const createCloudflareDnsRecord = async (
  env: EnvWithCloudflareToken,
  zoneId: string,
  input: CloudflareDnsRecordInput,
) => {
  const normalizedZoneId = normalizeZoneId(zoneId);
  const payload = buildDnsRecordPayload(input);
  const created = await cloudflareRequest<CloudflareDnsRecord>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records`,
    `Falha ao criar registro DNS ${String(payload.type ?? '').toUpperCase()} ${String(payload.name ?? '')}`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  return created;
};

export const updateCloudflareDnsRecord = async (
  env: EnvWithCloudflareToken,
  zoneId: string,
  recordId: string,
  input: CloudflareDnsRecordInput,
) => {
  const normalizedZoneId = normalizeZoneId(zoneId);
  const normalizedRecordId = normalizeRecordId(recordId);
  const payload = buildDnsRecordPayload(input);

  const updated = await cloudflareRequest<CloudflareDnsRecord>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records/${encodeURIComponent(normalizedRecordId)}`,
    `Falha ao atualizar registro DNS ${String(payload.type ?? '').toUpperCase()} ${String(payload.name ?? '')}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );

  return updated;
};

export const deleteCloudflareDnsRecord = async (env: EnvWithCloudflareToken, zoneId: string, recordId: string) => {
  const normalizedZoneId = normalizeZoneId(zoneId);
  const normalizedRecordId = normalizeRecordId(recordId);

  await cloudflareRequest<CloudflareDnsRecord>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records/${encodeURIComponent(normalizedRecordId)}`,
    'Falha ao remover registro DNS',
    {
      method: 'DELETE',
    },
  );
};
