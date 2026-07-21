// Lib de acesso à API Workers KV da Cloudflare (client/v4, produto 'storage'
// — token CLOUDFLARE_STORAGE com fallback CLOUDFLARE_PW resolvido pelo
// cf-api-core). Funções finas sobre cfApiRequest/cfApiRequestRaw; validação de
// entrada e mapeamento HTTP ficam nos handlers (routes/cfpw/storage/kv.ts).

import { cfApiRequest, cfApiRequestRaw, cfPagePaginate } from './cf-api-core';

export type KvApiEnv = {
  CLOUDFLARE_STORAGE?: string;
  CLOUDFLARE_PW?: string;
};

export type KvNamespace = {
  id: string;
  title: string;
  supports_url_encoding?: boolean;
};

export type KvNamespacesPagination = {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
};

export type KvKeyEntry = {
  name: string;
  expiration?: number;
  metadata?: unknown;
};

type CfPageResultInfo = {
  page?: number;
  per_page?: number;
  total_count?: number;
  total_pages?: number;
};

type CfCursorResultInfo = {
  count?: number;
  cursor?: string | null;
};

const kvNamespacesBase = (accountId: string) => `/accounts/${encodeURIComponent(accountId)}/storage/kv/namespaces`;

/** Uma página da listagem de namespaces KV, com paginação do result_info. @public */
export const listKvNamespacesPage = async (
  env: KvApiEnv,
  accountId: string,
  page: number,
  perPage: number,
): Promise<{ namespaces: KvNamespace[]; pagination: KvNamespacesPagination }> => {
  const { result, resultInfo } = await cfApiRequest<KvNamespace[]>(
    env,
    'storage',
    `${kvNamespacesBase(accountId)}?page=${page}&per_page=${perPage}`,
    'Falha ao listar namespaces KV',
  );
  const namespaces = Array.isArray(result) ? result : [];
  const info = (resultInfo ?? {}) as CfPageResultInfo;
  return {
    namespaces,
    pagination: {
      page: Number(info.page) > 0 ? Number(info.page) : page,
      perPage: Number(info.per_page) > 0 ? Number(info.per_page) : perPage,
      totalCount: Number.isFinite(Number(info.total_count)) ? Number(info.total_count) : namespaces.length,
      totalPages: Number(info.total_pages) > 0 ? Number(info.total_pages) : 1,
    },
  };
};

/**
 * Busca server-side por título (contains, case-insensitive): varre até
 * `maxPages` páginas de 100 e filtra localmente — a API KV não tem filtro de
 * título nativo.
 * @public
 */
export const searchKvNamespacesByTitle = async (
  env: KvApiEnv,
  accountId: string,
  search: string,
  opts?: { maxPages?: number },
): Promise<KvNamespace[]> => {
  const needle = search.toLowerCase();
  const all = await cfPagePaginate<KvNamespace>(
    async (page) => {
      const { namespaces, pagination } = await listKvNamespacesPage(env, accountId, page, 100);
      return { items: namespaces, totalPages: pagination.totalPages };
    },
    { maxPages: opts?.maxPages ?? 10 },
  );
  return all.filter((namespace) =>
    String(namespace.title ?? '')
      .toLowerCase()
      .includes(needle),
  );
};

export const createKvNamespace = async (env: KvApiEnv, accountId: string, title: string): Promise<KvNamespace> => {
  const { result } = await cfApiRequest<KvNamespace>(
    env,
    'storage',
    kvNamespacesBase(accountId),
    `Falha ao criar o namespace KV "${title}"`,
    { method: 'POST', body: JSON.stringify({ title }) },
  );
  return result;
};

export const getKvNamespace = async (env: KvApiEnv, accountId: string, namespaceId: string): Promise<KvNamespace> => {
  const { result } = await cfApiRequest<KvNamespace>(
    env,
    'storage',
    `${kvNamespacesBase(accountId)}/${encodeURIComponent(namespaceId)}`,
    `Falha ao ler o namespace KV ${namespaceId}`,
  );
  return result;
};

export const renameKvNamespace = async (
  env: KvApiEnv,
  accountId: string,
  namespaceId: string,
  title: string,
): Promise<void> => {
  await cfApiRequest<unknown>(
    env,
    'storage',
    `${kvNamespacesBase(accountId)}/${encodeURIComponent(namespaceId)}`,
    `Falha ao renomear o namespace KV ${namespaceId}`,
    { method: 'PUT', body: JSON.stringify({ title }) },
  );
};

export const deleteKvNamespace = async (env: KvApiEnv, accountId: string, namespaceId: string): Promise<void> => {
  await cfApiRequest<unknown>(
    env,
    'storage',
    `${kvNamespacesBase(accountId)}/${encodeURIComponent(namespaceId)}`,
    `Falha ao excluir o namespace KV ${namespaceId}`,
    { method: 'DELETE' },
  );
};

/** Lista chaves por cursor (uma página); cursor null = fim da listagem. @public */
export const listKvKeys = async (
  env: KvApiEnv,
  accountId: string,
  namespaceId: string,
  params: { prefix?: string; cursor?: string; limit: number },
): Promise<{ keys: KvKeyEntry[]; cursor: string | null; listComplete: boolean }> => {
  const query = new URLSearchParams({ limit: String(params.limit) });
  if (params.prefix) query.set('prefix', params.prefix);
  if (params.cursor) query.set('cursor', params.cursor);

  const { result, resultInfo } = await cfApiRequest<KvKeyEntry[]>(
    env,
    'storage',
    `${kvNamespacesBase(accountId)}/${encodeURIComponent(namespaceId)}/keys?${query.toString()}`,
    'Falha ao listar chaves do namespace KV',
  );
  const info = (resultInfo ?? {}) as CfCursorResultInfo;
  const cursor = String(info.cursor ?? '').trim() || null;
  return {
    keys: Array.isArray(result) ? result : [],
    cursor,
    listComplete: cursor === null,
  };
};

/** GET cru do valor (binário/stream): devolve a Response 2xx intacta. @public */
export const fetchKvValueRaw = async (
  env: KvApiEnv,
  accountId: string,
  namespaceId: string,
  key: string,
): Promise<Response> =>
  cfApiRequestRaw(
    env,
    'storage',
    `${kvNamespacesBase(accountId)}/${encodeURIComponent(namespaceId)}/values/${encodeURIComponent(key)}`,
    `Falha ao ler o valor da chave "${key}" no KV`,
  );

export const fetchKvMetadata = async (
  env: KvApiEnv,
  accountId: string,
  namespaceId: string,
  key: string,
): Promise<unknown> => {
  const { result } = await cfApiRequest<unknown>(
    env,
    'storage',
    `${kvNamespacesBase(accountId)}/${encodeURIComponent(namespaceId)}/metadata/${encodeURIComponent(key)}`,
    `Falha ao ler o metadata da chave "${key}" no KV`,
  );
  return result;
};

/**
 * Grava um valor: com metadata usa multipart (campos `value` + `metadata`);
 * sem metadata envia o corpo cru. Expiração vai na query string da CF.
 * @public
 */
export const putKvValue = async (
  env: KvApiEnv,
  accountId: string,
  namespaceId: string,
  key: string,
  params: { value: string; metadata?: Record<string, unknown>; expirationTtl?: number; expiration?: number },
): Promise<void> => {
  const query = new URLSearchParams();
  if (params.expirationTtl !== undefined) query.set('expiration_ttl', String(params.expirationTtl));
  if (params.expiration !== undefined) query.set('expiration', String(params.expiration));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  const path = `${kvNamespacesBase(accountId)}/${encodeURIComponent(namespaceId)}/values/${encodeURIComponent(key)}${suffix}`;
  const fallbackPtBr = `Falha ao gravar a chave "${key}" no KV`;

  if (params.metadata !== undefined) {
    const form = new FormData();
    form.append('value', params.value);
    form.append('metadata', JSON.stringify(params.metadata));
    await cfApiRequest<unknown>(env, 'storage', path, fallbackPtBr, { method: 'PUT', body: form });
    return;
  }

  await cfApiRequest<unknown>(env, 'storage', path, fallbackPtBr, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: params.value,
  });
};

export const deleteKvValue = async (
  env: KvApiEnv,
  accountId: string,
  namespaceId: string,
  key: string,
): Promise<void> => {
  await cfApiRequest<unknown>(
    env,
    'storage',
    `${kvNamespacesBase(accountId)}/${encodeURIComponent(namespaceId)}/values/${encodeURIComponent(key)}`,
    `Falha ao excluir a chave "${key}" no KV`,
    { method: 'DELETE' },
  );
};

export type KvBulkPair = {
  key: string;
  value: string;
  metadata?: Record<string, unknown>;
  expiration_ttl?: number;
};

export const putKvBulk = async (
  env: KvApiEnv,
  accountId: string,
  namespaceId: string,
  pairs: KvBulkPair[],
): Promise<unknown> => {
  const { result } = await cfApiRequest<unknown>(
    env,
    'storage',
    `${kvNamespacesBase(accountId)}/${encodeURIComponent(namespaceId)}/bulk`,
    'Falha na gravação em lote no KV',
    { method: 'PUT', body: JSON.stringify(pairs) },
  );
  return result;
};

// Atenção: a exclusão em lote é POST .../bulk/delete (não DELETE .../bulk).
export const postKvBulkDelete = async (
  env: KvApiEnv,
  accountId: string,
  namespaceId: string,
  keys: string[],
): Promise<unknown> => {
  const { result } = await cfApiRequest<unknown>(
    env,
    'storage',
    `${kvNamespacesBase(accountId)}/${encodeURIComponent(namespaceId)}/bulk/delete`,
    'Falha na exclusão em lote no KV',
    { method: 'POST', body: JSON.stringify(keys) },
  );
  return result;
};
