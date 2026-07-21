// Lib de acesso à API R2 da Cloudflare (client/v4, produto 'storage' — token
// CLOUDFLARE_STORAGE com fallback CLOUDFLARE_PW resolvido pelo cf-api-core).
// Funções finas sobre cfApiRequest/cfApiRequestRaw; validação de entrada,
// guard do mainsite-media e mapeamento HTTP ficam nos handlers
// (routes/cfpw/storage/r2.ts).

import { cfApiRequest, cfApiRequestRaw } from './cf-api-core';

export type R2ApiEnv = {
  CLOUDFLARE_STORAGE?: string;
  CLOUDFLARE_PW?: string;
};

/** Bucket R2 como devolvido pela CF (passthrough defensivo). @public */
export type R2BucketInfo = {
  name?: string;
  creation_date?: string;
  location?: string;
  storage_class?: string;
} & Record<string, unknown>;

/** Objeto R2 como devolvido pela CF na listagem (passthrough defensivo). @public */
export type R2ObjectInfo = {
  key?: string;
  size?: number;
  etag?: string;
  uploaded?: string;
  last_modified?: string;
  storage_class?: string;
  http_metadata?: Record<string, unknown>;
} & Record<string, unknown>;

const r2Base = (accountId: string) => `/accounts/${encodeURIComponent(accountId)}/r2/buckets`;

// A CF pode devolver o array direto em `result` ou aninhado em `result.buckets`.
export const listR2Buckets = async (env: R2ApiEnv, accountId: string): Promise<R2BucketInfo[]> => {
  const { result } = await cfApiRequest<R2BucketInfo[] | { buckets?: R2BucketInfo[] }>(
    env,
    'storage',
    r2Base(accountId),
    'Falha ao listar buckets R2',
  );
  if (Array.isArray(result)) {
    return result;
  }
  return Array.isArray(result?.buckets) ? result.buckets : [];
};

export const createR2Bucket = async (
  env: R2ApiEnv,
  accountId: string,
  params: { name: string; locationHint?: string; storageClass?: string },
): Promise<R2BucketInfo> => {
  const { result } = await cfApiRequest<R2BucketInfo>(
    env,
    'storage',
    r2Base(accountId),
    `Falha ao criar o bucket R2 "${params.name}"`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: params.name,
        ...(params.locationHint !== undefined ? { locationHint: params.locationHint } : {}),
        ...(params.storageClass !== undefined ? { storageClass: params.storageClass } : {}),
      }),
    },
  );
  return result;
};

export const deleteR2Bucket = async (env: R2ApiEnv, accountId: string, bucket: string): Promise<void> => {
  await cfApiRequest<unknown>(
    env,
    'storage',
    `${r2Base(accountId)}/${encodeURIComponent(bucket)}`,
    `Falha ao excluir o bucket R2 "${bucket}"`,
    { method: 'DELETE' },
  );
};

export type R2ObjectsPage = {
  objects: R2ObjectInfo[];
  delimitedPrefixes: string[];
  cursor: string | null;
  isTruncated: boolean;
};

type R2CursorResultInfo = {
  cursor?: string | null;
  is_truncated?: boolean;
};

/**
 * Lista objetos por prefixo com delimiter '/' (uma página por cursor).
 * A forma do `result` varia: array de objetos OU envelope com `objects` +
 * `delimited_prefixes` — normaliza defensivamente para R2ObjectsPage.
 * @public
 */
export const listR2Objects = async (
  env: R2ApiEnv,
  accountId: string,
  bucket: string,
  params: { prefix?: string; cursor?: string; perPage: number },
): Promise<R2ObjectsPage> => {
  const query = new URLSearchParams({ delimiter: '/', per_page: String(params.perPage) });
  if (params.prefix) query.set('prefix', params.prefix);
  if (params.cursor) query.set('cursor', params.cursor);

  const { result, resultInfo } = await cfApiRequest<
    R2ObjectInfo[] | { objects?: R2ObjectInfo[]; delimited_prefixes?: string[] }
  >(
    env,
    'storage',
    `${r2Base(accountId)}/${encodeURIComponent(bucket)}/objects?${query.toString()}`,
    `Falha ao listar objetos do bucket R2 "${bucket}"`,
  );

  let objects: R2ObjectInfo[] = [];
  let delimitedPrefixes: string[] = [];
  if (Array.isArray(result)) {
    // Forma array: pastas chegam como entradas com key terminada em '/'.
    objects = result.filter((entry) => !String(entry?.key ?? '').endsWith('/'));
    delimitedPrefixes = result.map((entry) => String(entry?.key ?? '')).filter((key) => key.endsWith('/'));
  } else if (result && typeof result === 'object') {
    objects = Array.isArray(result.objects) ? result.objects : [];
    delimitedPrefixes = Array.isArray(result.delimited_prefixes) ? result.delimited_prefixes.map(String) : [];
  }

  const info = (resultInfo ?? {}) as R2CursorResultInfo;
  const cursor = String(info.cursor ?? '').trim() || null;
  return {
    objects,
    delimitedPrefixes,
    cursor,
    isTruncated: info.is_truncated === true,
  };
};

// Chaves R2 podem conter '/', que é parte do key — encodeURIComponent completo
// (a CF aceita %2F); NUNCA encodar por segmento.
const r2ObjectPath = (accountId: string, bucket: string, key: string) =>
  `${r2Base(accountId)}/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`;

/** GET cru do objeto (binário/stream): devolve a Response 2xx intacta. @public */
export const fetchR2ObjectRaw = async (
  env: R2ApiEnv,
  accountId: string,
  bucket: string,
  key: string,
): Promise<Response> =>
  cfApiRequestRaw(env, 'storage', r2ObjectPath(accountId, bucket, key), `Falha ao baixar o objeto "${key}" do R2`);

/** PUT do objeto com corpo cru (stream) e headers já montados pelo handler. @public */
export const putR2Object = async (
  env: R2ApiEnv,
  accountId: string,
  bucket: string,
  key: string,
  body: BodyInit,
  headers: Record<string, string>,
): Promise<unknown> => {
  const { result } = await cfApiRequest<unknown>(
    env,
    'storage',
    r2ObjectPath(accountId, bucket, key),
    `Falha ao enviar o objeto "${key}" ao R2`,
    { method: 'PUT', headers, body },
  );
  return result;
};

export const deleteR2Object = async (env: R2ApiEnv, accountId: string, bucket: string, key: string): Promise<void> => {
  await cfApiRequest<unknown>(
    env,
    'storage',
    r2ObjectPath(accountId, bucket, key),
    `Falha ao excluir o objeto "${key}" do R2`,
    { method: 'DELETE' },
  );
};

// ── Configurações do bucket (read-only no painel) ──

export const getR2ManagedDomain = async (env: R2ApiEnv, accountId: string, bucket: string): Promise<unknown> => {
  const { result } = await cfApiRequest<unknown>(
    env,
    'storage',
    `${r2Base(accountId)}/${encodeURIComponent(bucket)}/domains/managed`,
    `Falha ao ler o domínio r2.dev do bucket "${bucket}"`,
  );
  return result;
};

export const listR2CustomDomains = async (env: R2ApiEnv, accountId: string, bucket: string): Promise<unknown> => {
  const { result } = await cfApiRequest<unknown>(
    env,
    'storage',
    `${r2Base(accountId)}/${encodeURIComponent(bucket)}/domains/custom`,
    `Falha ao listar domínios custom do bucket "${bucket}"`,
  );
  return result;
};

export const getR2Cors = async (env: R2ApiEnv, accountId: string, bucket: string): Promise<unknown> => {
  const { result } = await cfApiRequest<unknown>(
    env,
    'storage',
    `${r2Base(accountId)}/${encodeURIComponent(bucket)}/cors`,
    `Falha ao ler a política CORS do bucket "${bucket}"`,
  );
  return result;
};

export const getR2Lifecycle = async (env: R2ApiEnv, accountId: string, bucket: string): Promise<unknown> => {
  const { result } = await cfApiRequest<unknown>(
    env,
    'storage',
    `${r2Base(accountId)}/${encodeURIComponent(bucket)}/lifecycle`,
    `Falha ao ler as regras de lifecycle do bucket "${bucket}"`,
  );
  return result;
};
