// Lib de acesso à API D1 da Cloudflare (client/v4, produto 'storage' — token
// CLOUDFLARE_STORAGE com fallback CLOUDFLARE_PW resolvido pelo cf-api-core).
// Funções finas sobre cfApiRequest; validação de entrada, guards do bigdata_db
// e mapeamento HTTP ficam nos handlers (routes/cfpw/storage/d1.ts).

import { cfApiRequest, cfPagePaginate } from './cf-api-core';

export type D1ApiEnv = {
  CLOUDFLARE_STORAGE?: string;
  CLOUDFLARE_PW?: string;
};

/** Banco D1 como devolvido pela CF (list/get/create). @public */
export type D1DatabaseInfo = {
  uuid: string;
  name: string;
  version?: string;
  num_tables?: number;
  file_size?: number;
  created_at?: string;
};

/** Resultado por statement do endpoint de query da CF (passthrough). @public */
export type D1QueryStatementResult = {
  results?: unknown[];
  success?: boolean;
  meta?: Record<string, unknown>;
};

type CfPageResultInfo = {
  total_pages?: number;
};

const d1Base = (accountId: string) => `/accounts/${encodeURIComponent(accountId)}/d1/database`;

const listD1DatabasesPage = async (
  env: D1ApiEnv,
  accountId: string,
  page: number,
  search: string,
): Promise<{ databases: D1DatabaseInfo[]; totalPages: number }> => {
  const query = new URLSearchParams({ page: String(page), per_page: '100' });
  if (search) query.set('name', search);
  const { result, resultInfo } = await cfApiRequest<D1DatabaseInfo[]>(
    env,
    'storage',
    `${d1Base(accountId)}?${query.toString()}`,
    'Falha ao listar bancos D1',
  );
  const info = (resultInfo ?? {}) as CfPageResultInfo;
  return {
    databases: Array.isArray(result) ? result : [],
    totalPages: Number(info.total_pages) > 0 ? Number(info.total_pages) : 1,
  };
};

/** Lista bancos D1 (filtro `name` server-side da CF), paginando até `maxPages` páginas de 100. @public */
export const listD1Databases = async (
  env: D1ApiEnv,
  accountId: string,
  search: string,
  opts?: { maxPages?: number },
): Promise<D1DatabaseInfo[]> =>
  cfPagePaginate<D1DatabaseInfo>(
    async (page) => {
      const { databases, totalPages } = await listD1DatabasesPage(env, accountId, page, search);
      return { items: databases, totalPages };
    },
    { maxPages: opts?.maxPages ?? 10 },
  );

export const createD1Database = async (env: D1ApiEnv, accountId: string, name: string): Promise<D1DatabaseInfo> => {
  const { result } = await cfApiRequest<D1DatabaseInfo>(
    env,
    'storage',
    d1Base(accountId),
    `Falha ao criar o banco D1 "${name}"`,
    { method: 'POST', body: JSON.stringify({ name }) },
  );
  return result;
};

export const getD1Database = async (env: D1ApiEnv, accountId: string, databaseId: string): Promise<D1DatabaseInfo> => {
  const { result } = await cfApiRequest<D1DatabaseInfo>(
    env,
    'storage',
    `${d1Base(accountId)}/${encodeURIComponent(databaseId)}`,
    `Falha ao ler o banco D1 ${databaseId}`,
  );
  return result;
};

export const deleteD1Database = async (env: D1ApiEnv, accountId: string, databaseId: string): Promise<void> => {
  await cfApiRequest<unknown>(
    env,
    'storage',
    `${d1Base(accountId)}/${encodeURIComponent(databaseId)}`,
    `Falha ao excluir o banco D1 ${databaseId}`,
    { method: 'DELETE' },
  );
};

/**
 * Executa SQL no banco: devolve o array `result` da CF (um item por statement,
 * cada um com `results`/`success`/`meta`) — erro SQL por statement chega como
 * `success: false` e é repassado intacto ao chamador.
 * @public
 */
export const queryD1Database = async (
  env: D1ApiEnv,
  accountId: string,
  databaseId: string,
  sql: string,
  params?: unknown[],
): Promise<D1QueryStatementResult[]> => {
  const { result } = await cfApiRequest<D1QueryStatementResult[]>(
    env,
    'storage',
    `${d1Base(accountId)}/${encodeURIComponent(databaseId)}/query`,
    'Falha ao executar SQL no banco D1',
    { method: 'POST', body: JSON.stringify({ sql, ...(params !== undefined ? { params } : {}) }) },
  );
  return Array.isArray(result) ? result : [];
};

/** POST .../export (output_format polling): passthrough do `result` da CF. @public */
export const exportD1Database = async (
  env: D1ApiEnv,
  accountId: string,
  databaseId: string,
  body: Record<string, unknown>,
): Promise<unknown> => {
  const { result } = await cfApiRequest<unknown>(
    env,
    'storage',
    `${d1Base(accountId)}/${encodeURIComponent(databaseId)}/export`,
    'Falha ao exportar o banco D1',
    { method: 'POST', body: JSON.stringify(body) },
  );
  return result;
};

/** POST .../import (init/ingest/poll): passthrough do `result` da CF. @public */
export const importD1Database = async (
  env: D1ApiEnv,
  accountId: string,
  databaseId: string,
  body: Record<string, unknown>,
): Promise<unknown> => {
  const { result } = await cfApiRequest<unknown>(
    env,
    'storage',
    `${d1Base(accountId)}/${encodeURIComponent(databaseId)}/import`,
    'Falha na operação de import do banco D1',
    { method: 'POST', body: JSON.stringify(body) },
  );
  return result;
};
