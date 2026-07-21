import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../../test-utils/cf-fetch';
import type { D1Database } from '../../_lib/operational';
import {
  __resetD1NameCacheForTests,
  onRequestDeleteDatabases,
  onRequestGetDatabases,
  onRequestGetSchema,
  onRequestGetTable,
  onRequestPostDatabases,
  onRequestPostExport,
  onRequestPostImport,
  onRequestPostQuery,
} from './d1';

const D1_BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1/d1/database';

type D1Body = {
  ok: boolean;
  error?: string;
  databases?: Array<{ uuid: string; name: string; protected: boolean }>;
  database?: { uuid: string; name: string; protected: boolean };
  databaseId?: string;
  deleted?: boolean;
  requiresConfirmation?: boolean;
  statements?: Array<{ sql: string; kind: string; dangerous: boolean; reason?: string }>;
  result?: Array<{ results?: unknown[]; success?: boolean; meta?: Record<string, unknown> }> | Record<string, unknown>;
  objects?: Array<{ name: string; type: string; sql: string }>;
  columns?: Array<{ name: string; type: string }>;
  rows?: unknown[];
  total?: number;
  page?: number;
  perPage?: number;
};

const baseEnv = () => ({ CLOUDFLARE_STORAGE: 'storage-token', CF_ACCOUNT_ID: 'acct-1' });

const getContext = (path: string, query: Record<string, string>, env: Record<string, unknown> = baseEnv()) => ({
  request: new Request(`https://admin.test/api/cfpw/storage/d1/${path}?${new URLSearchParams(query).toString()}`),
  env,
});

const bodyContext = (method: string, body: unknown, env: Record<string, unknown> = baseEnv()) => ({
  request: new Request('https://admin.test/api/cfpw/storage/d1/x', {
    method,
    body: JSON.stringify(body),
  }),
  env,
});

const readBody = async (response: Response) => (await response.json()) as D1Body;

// Stub de fetch que casa respostas do endpoint /query pelo SQL do corpo —
// necessário porque schema/table fazem várias chamadas à MESMA URL.
const stubQueryFetchBySql = (
  replies: Array<{ sqlStartsWith: string; result: unknown }>,
): { calls: Array<{ url: string; body: { sql: string; params?: unknown[] } }> } => {
  const calls: Array<{ url: string; body: { sql: string; params?: unknown[] } }> = [];
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input);
    const body = JSON.parse(String(init?.body ?? '{}')) as { sql: string; params?: unknown[] };
    calls.push({ url, body });
    const reply = replies.find((candidate) => body.sql.startsWith(candidate.sqlStartsWith));
    if (!reply) {
      throw new Error(`stubQueryFetchBySql: SQL sem resposta mapeada — ${body.sql}`);
    }
    return new Response(JSON.stringify(cfEnvelope(reply.result)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  return { calls };
};

// Stub de BIGDATA_DB que captura os binds do INSERT de telemetria.
const makeOperationalDbStub = (): { db: D1Database; inserts: unknown[][] } => {
  const inserts: unknown[][] = [];
  const makeStatement = (query: string) => ({
    bind: (...values: Array<string | number | null>) => {
      if (query.includes('INSERT INTO adminapp_module_events')) {
        inserts.push(values);
      }
      return makeStatement(query);
    },
    first: async <T>() => null as T | null,
    all: async <T>() => ({ results: [] as T[] }),
    run: async () => ({}),
  });
  return { db: { prepare: makeStatement }, inserts };
};

describe('cfpw storage/d1 handlers', () => {
  beforeEach(() => {
    __resetD1NameCacheForTests();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ── Bancos: listagem/criação/exclusão ──

  it('lists databases marking bigdata_db as protected and forwarding search as CF name filter', async () => {
    const { calls } = stubCloudflareFetch([
      {
        url: `${D1_BASE}?page=1&per_page=100&name=big`,
        reply: {
          json: cfEnvelope([{ uuid: 'uuid-1', name: 'bigdata_db', num_tables: 12, file_size: 2048 }], {
            result_info: { total_pages: 1 },
          }),
        },
      },
    ]);

    const response = await onRequestGetDatabases(getContext('databases', { search: 'big' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.databases).toEqual([
      { uuid: 'uuid-1', name: 'bigdata_db', num_tables: 12, file_size: 2048, protected: true },
    ]);
    expect(calls).toHaveLength(1);
  });

  it('paginates the database listing across total_pages and flags non-protected names', async () => {
    const { calls } = stubCloudflareFetch([
      {
        url: `${D1_BASE}?page=1&per_page=100`,
        reply: { json: cfEnvelope([{ uuid: 'u1', name: 'app_db' }], { result_info: { total_pages: 2 } }) },
      },
      {
        url: `${D1_BASE}?page=2&per_page=100`,
        reply: { json: cfEnvelope([{ uuid: 'u2', name: 'logs_db' }], { result_info: { total_pages: 2 } }) },
      },
    ]);

    const body = await readBody(await onRequestGetDatabases(getContext('databases', {})));

    expect(body.databases?.map((database) => database.uuid)).toEqual(['u1', 'u2']);
    expect(body.databases?.every((database) => database.protected === false)).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it('rejects create with an invalid name (starts with dash, too long) without calling the CF API', async () => {
    const { calls } = stubCloudflareFetch([]);

    const dashResponse = await onRequestPostDatabases(bodyContext('POST', { name: '-inicia-com-hifen' }));
    expect(dashResponse.status).toBe(400);
    expect((await readBody(dashResponse)).error).toContain('Nome de banco D1 inválido');

    const longResponse = await onRequestPostDatabases(bodyContext('POST', { name: `a${'b'.repeat(63)}` }));
    expect(longResponse.status).toBe(400);

    expect(calls).toHaveLength(0);
  });

  it('creates a database via CF POST with the name in the body', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'POST', url: D1_BASE, reply: { json: cfEnvelope({ uuid: 'u9', name: 'novo_db' }) } },
    ]);

    const response = await onRequestPostDatabases(bodyContext('POST', { name: 'novo_db' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.database).toEqual({ uuid: 'u9', name: 'novo_db', protected: false });
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ name: 'novo_db' });
  });

  it('always blocks delete of bigdata_db with 403, even with correct confirmName and confirmPhrase', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'GET',
        url: `${D1_BASE}/uuid-big`,
        reply: { json: cfEnvelope({ uuid: 'uuid-big', name: 'bigdata_db' }) },
      },
    ]);

    const response = await onRequestDeleteDatabases(
      bodyContext('DELETE', {
        databaseId: 'uuid-big',
        confirmName: 'bigdata_db',
        confirmPhrase: 'EU ENTENDO O RISCO',
      }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.error).toContain('IMUTÁVEL');
    expect(body.error).toContain('bigdata_db');
    expect(calls.some((call) => String(call.init?.method).toUpperCase() === 'DELETE')).toBe(false);
  });

  it('rejects delete with 400 when confirmName diverges from the real database name', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: `${D1_BASE}/u1`, reply: { json: cfEnvelope({ uuid: 'u1', name: 'app_db' }) } },
    ]);

    const response = await onRequestDeleteDatabases(bodyContext('DELETE', { databaseId: 'u1', confirmName: 'app' }));
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain('Confirmação divergente');
    expect(body.error).toContain('app_db');
    expect(calls.some((call) => String(call.init?.method).toUpperCase() === 'DELETE')).toBe(false);
  });

  it('deletes an unprotected database when confirmName matches', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: `${D1_BASE}/u1`, reply: { json: cfEnvelope({ uuid: 'u1', name: 'app_db' }) } },
      { method: 'DELETE', url: `${D1_BASE}/u1`, reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestDeleteDatabases(bodyContext('DELETE', { databaseId: 'u1', confirmName: 'app_db' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.deleted).toBe(true);
    expect(calls.some((call) => String(call.init?.method).toUpperCase() === 'DELETE')).toBe(true);
  });

  // ── Console SQL: validação, confirmação e guards ──

  it('executes read-only SQL without confirmation and passes the CF result array through', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'POST',
        url: `${D1_BASE}/u1/query`,
        reply: {
          json: cfEnvelope([{ results: [{ id: 1 }], success: true, meta: { rows_read: 1, duration: 0.2 } }]),
        },
      },
    ]);

    const response = await onRequestPostQuery(
      bodyContext('POST', { databaseId: 'u1', sql: 'SELECT * FROM t', params: [] }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.result).toEqual([{ results: [{ id: 1 }], success: true, meta: { rows_read: 1, duration: 0.2 } }]);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ sql: 'SELECT * FROM t', params: [] });
  });

  it('returns 409 requiresConfirmation with the classified statements when a write lacks confirmDangerous', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPostQuery(
      bodyContext('POST', { databaseId: 'u1', sql: 'SELECT 1; UPDATE t SET a = 1' }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(409);
    expect(body.ok).toBe(false);
    expect(body.requiresConfirmation).toBe(true);
    expect(body.statements).toEqual([
      { sql: 'SELECT 1', kind: 'read', dangerous: false },
      { sql: 'UPDATE t SET a = 1', kind: 'write', dangerous: true, reason: 'UPDATE sem WHERE' },
    ]);
    expect(calls).toHaveLength(0);
  });

  it('executes a confirmed write on an unprotected database (name resolved via GET database)', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: `${D1_BASE}/u1`, reply: { json: cfEnvelope({ uuid: 'u1', name: 'app_db' }) } },
      {
        method: 'POST',
        url: `${D1_BASE}/u1/query`,
        reply: { json: cfEnvelope([{ results: [], success: true, meta: { changes: 1 } }]) },
      },
    ]);

    const response = await onRequestPostQuery(
      bodyContext('POST', { databaseId: 'u1', sql: 'UPDATE t SET a = 1 WHERE id = 2', confirmDangerous: true }),
    );

    expect(response.status).toBe(200);
    expect((await readBody(response)).ok).toBe(true);
    expect(calls.filter((call) => call.url.endsWith('/query'))).toHaveLength(1);
  });

  it('caches the uuid→name resolution: a second confirmed write does not re-GET the database', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: `${D1_BASE}/u1`, reply: { json: cfEnvelope({ uuid: 'u1', name: 'app_db' }) } },
      {
        method: 'POST',
        url: `${D1_BASE}/u1/query`,
        reply: { json: cfEnvelope([{ results: [], success: true }]) },
      },
    ]);

    const request = () =>
      onRequestPostQuery(
        bodyContext('POST', { databaseId: 'u1', sql: 'DELETE FROM t WHERE id = 1', confirmDangerous: true }),
      );
    expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(200);

    expect(calls.filter((call) => String(call.init?.method ?? 'GET').toUpperCase() === 'GET')).toHaveLength(1);
    expect(calls.filter((call) => call.url.endsWith('/query'))).toHaveLength(2);
  });

  it('blocks a confirmed write on bigdata_db with 403 when confirmPhrase is missing', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'GET',
        url: `${D1_BASE}/uuid-big`,
        reply: { json: cfEnvelope({ uuid: 'uuid-big', name: 'bigdata_db' }) },
      },
    ]);

    const response = await onRequestPostQuery(
      bodyContext('POST', { databaseId: 'uuid-big', sql: 'DELETE FROM eventos WHERE id = 1', confirmDangerous: true }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.error).toContain("confirmPhrase: 'EU ENTENDO O RISCO'");
    expect(calls.some((call) => call.url.endsWith('/query'))).toBe(false);
  });

  it('executes a write on bigdata_db when confirmDangerous and the exact confirmPhrase are sent', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'GET',
        url: `${D1_BASE}/uuid-big`,
        reply: { json: cfEnvelope({ uuid: 'uuid-big', name: 'bigdata_db' }) },
      },
      {
        method: 'POST',
        url: `${D1_BASE}/uuid-big/query`,
        reply: { json: cfEnvelope([{ results: [], success: true, meta: { changes: 1 } }]) },
      },
    ]);

    const response = await onRequestPostQuery(
      bodyContext('POST', {
        databaseId: 'uuid-big',
        sql: 'UPDATE eventos SET ok = 1 WHERE id = 7',
        confirmDangerous: true,
        confirmPhrase: 'EU ENTENDO O RISCO',
      }),
    );

    expect(response.status).toBe(200);
    expect(calls.some((call) => call.url.endsWith('/query'))).toBe(true);
  });

  it('passes per-statement success:false through so the frontend can show the failing statement', async () => {
    stubCloudflareFetch([
      {
        method: 'POST',
        url: `${D1_BASE}/u1/query`,
        reply: {
          json: cfEnvelope([
            { results: [{ id: 1 }], success: true, meta: {} },
            { results: [], success: false, meta: { error: 'no such table: nada' } },
          ]),
        },
      },
    ]);

    const body = await readBody(
      await onRequestPostQuery(bodyContext('POST', { databaseId: 'u1', sql: 'SELECT 1; SELECT * FROM nada' })),
    );

    expect(body.ok).toBe(true);
    expect(body.result).toEqual([
      { results: [{ id: 1 }], success: true, meta: {} },
      { results: [], success: false, meta: { error: 'no such table: nada' } },
    ]);
  });

  it('rejects SQL above 100000 chars, params that are not an array and empty statements with 400', async () => {
    const { calls } = stubCloudflareFetch([]);

    const tooLong = await onRequestPostQuery(
      bodyContext('POST', { databaseId: 'u1', sql: `SELECT '${'a'.repeat(100_001)}'` }),
    );
    expect(tooLong.status).toBe(400);
    expect((await readBody(tooLong)).error).toContain('100000');

    const badParams = await onRequestPostQuery(bodyContext('POST', { databaseId: 'u1', sql: 'SELECT 1', params: 'x' }));
    expect(badParams.status).toBe(400);
    expect((await readBody(badParams)).error).toContain('params');

    const emptySql = await onRequestPostQuery(bodyContext('POST', { databaseId: 'u1', sql: ' ;; ' }));
    expect(emptySql.status).toBe(400);

    expect(calls).toHaveLength(0);
  });

  it('maps a CF envelope error on query to the translated pt-BR message with passthrough 4xx status', async () => {
    stubCloudflareFetch([
      {
        method: 'POST',
        url: `${D1_BASE}/u1/query`,
        reply: cfErrorEnvelope(7500, 'near "FROM": syntax error', 400),
      },
    ]);

    const response = await onRequestPostQuery(bodyContext('POST', { databaseId: 'u1', sql: 'SELECT FROM' }));
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain('7500');
  });

  // ── Schema e navegação de tabelas ──

  it('requests the schema with the exact internal sqlite_master query', async () => {
    const { calls } = stubQueryFetchBySql([
      {
        sqlStartsWith: 'SELECT name, type, sql FROM sqlite_master',
        result: [
          {
            results: [{ name: 'eventos', type: 'table', sql: 'CREATE TABLE eventos (id INTEGER)' }],
            success: true,
          },
        ],
      },
    ]);

    const body = await readBody(await onRequestGetSchema(getContext('schema', { databaseId: 'u1' })));

    expect(body.ok).toBe(true);
    expect(body.objects).toEqual([{ name: 'eventos', type: 'table', sql: 'CREATE TABLE eventos (id INTEGER)' }]);
    expect(calls[0]?.body.sql).toBe(
      "SELECT name, type, sql FROM sqlite_master WHERE type IN ('table','view','index') AND name NOT LIKE 'sqlite_%' ORDER BY type, name",
    );
  });

  it('rejects table browsing with 400 when the name does not exist in sqlite_master (no free interpolation)', async () => {
    const { calls } = stubQueryFetchBySql([
      { sqlStartsWith: 'SELECT name FROM sqlite_master', result: [{ results: [], success: true }] },
    ]);

    const response = await onRequestGetTable(getContext('table', { databaseId: 'u1', table: 'inexistente' }));
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain('inexistente');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.body.params).toEqual(['inexistente']);
    expect(calls[0]?.body.sql).not.toContain('inexistente');
  });

  it('browses a validated table via PRAGMA batch and SELECT with LIMIT/OFFSET bind params', async () => {
    const { calls } = stubQueryFetchBySql([
      { sqlStartsWith: 'SELECT name FROM sqlite_master', result: [{ results: [{ name: 'eventos' }], success: true }] },
      {
        sqlStartsWith: 'PRAGMA table_info',
        result: [
          { results: [{ cid: 0, name: 'id', type: 'INTEGER' }], success: true },
          { results: [{ total: 321 }], success: true },
        ],
      },
      { sqlStartsWith: 'SELECT * FROM', result: [{ results: [{ id: 1 }], success: true }] },
    ]);

    const body = await readBody(
      await onRequestGetTable(getContext('table', { databaseId: 'u1', table: 'eventos', page: '3', perPage: '500' })),
    );

    expect(body.ok).toBe(true);
    expect(body.columns).toEqual([{ name: 'id', type: 'INTEGER' }]);
    expect(body.rows).toEqual([{ id: 1 }]);
    expect(body.total).toBe(321);
    expect(body.page).toBe(3);
    expect(body.perPage).toBe(200);

    const selectCall = calls.find((call) => call.body.sql.startsWith('SELECT * FROM'));
    expect(selectCall?.body.sql).toBe('SELECT * FROM "eventos" LIMIT ?1 OFFSET ?2');
    expect(selectCall?.body.params).toEqual([200, 400]);
    const pragmaCall = calls.find((call) => call.body.sql.startsWith('PRAGMA'));
    expect(pragmaCall?.body.sql).toBe('PRAGMA table_info("eventos"); SELECT COUNT(*) AS total FROM "eventos"');
  });

  it('escapes double quotes in the validated table name by doubling them', async () => {
    const { calls } = stubQueryFetchBySql([
      {
        sqlStartsWith: 'SELECT name FROM sqlite_master',
        result: [{ results: [{ name: 'tab"ela' }], success: true }],
      },
      { sqlStartsWith: 'PRAGMA table_info', result: [{ results: [] }, { results: [{ total: 0 }] }] },
      { sqlStartsWith: 'SELECT * FROM', result: [{ results: [] }] },
    ]);

    const response = await onRequestGetTable(getContext('table', { databaseId: 'u1', table: 'tab"ela' }));

    expect(response.status).toBe(200);
    const pragmaCall = calls.find((call) => call.body.sql.startsWith('PRAGMA'));
    expect(pragmaCall?.body.sql).toBe('PRAGMA table_info("tab""ela"); SELECT COUNT(*) AS total FROM "tab""ela"');
    const selectCall = calls.find((call) => call.body.sql.startsWith('SELECT * FROM'));
    expect(selectCall?.body.sql).toBe('SELECT * FROM "tab""ela" LIMIT ?1 OFFSET ?2');
  });

  // ── Export / Import ──

  it('starts an export with output_format polling and passes the CF result through', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'POST',
        url: `${D1_BASE}/u1/export`,
        reply: { json: cfEnvelope({ at_bookmark: 'bm-1', status: 'active', signed_url: null }) },
      },
    ]);

    const response = await onRequestPostExport(
      bodyContext('POST', { databaseId: 'u1', dumpOptions: { noData: true, tables: ['eventos'] } }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.result).toEqual({ at_bookmark: 'bm-1', status: 'active', signed_url: null });
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      output_format: 'polling',
      dump_options: { no_data: true, tables: ['eventos'] },
    });
  });

  it('resumes an export poll forwarding the bookmark as current_bookmark', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'POST',
        url: `${D1_BASE}/u1/export`,
        reply: { json: cfEnvelope({ at_bookmark: 'bm-1', status: 'complete', signed_url: 'https://r2/dump.sql' }) },
      },
    ]);

    const body = await readBody(await onRequestPostExport(bodyContext('POST', { databaseId: 'u1', bookmark: 'bm-1' })));

    expect(body.ok).toBe(true);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ output_format: 'polling', current_bookmark: 'bm-1' });
  });

  it('always blocks import into bigdata_db with 403 before touching the CF import endpoint', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'GET',
        url: `${D1_BASE}/uuid-big`,
        reply: { json: cfEnvelope({ uuid: 'uuid-big', name: 'bigdata_db' }) },
      },
    ]);

    const response = await onRequestPostImport(
      bodyContext('POST', { databaseId: 'uuid-big', action: 'init', etag: 'md5-x' }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.error).toContain('IMUTÁVEL');
    expect(calls.some((call) => call.url.endsWith('/import'))).toBe(false);
  });

  it('mirrors import init as {action, etag} and passes upload_url/filename through', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: `${D1_BASE}/u1`, reply: { json: cfEnvelope({ uuid: 'u1', name: 'app_db' }) } },
      {
        method: 'POST',
        url: `${D1_BASE}/u1/import`,
        reply: { json: cfEnvelope({ upload_url: 'https://r2-presigned/put', filename: 'file-abc.sql' }) },
      },
    ]);

    const body = await readBody(
      await onRequestPostImport(bodyContext('POST', { databaseId: 'u1', action: 'init', etag: 'md5-x' })),
    );

    expect(body.ok).toBe(true);
    expect(body.result).toEqual({ upload_url: 'https://r2-presigned/put', filename: 'file-abc.sql' });
    const importCall = calls.find((call) => call.url.endsWith('/import'));
    expect(JSON.parse(String(importCall?.init?.body))).toEqual({ action: 'init', etag: 'md5-x' });
  });

  it('mirrors import ingest as {action, etag, filename}', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: `${D1_BASE}/u1`, reply: { json: cfEnvelope({ uuid: 'u1', name: 'app_db' }) } },
      {
        method: 'POST',
        url: `${D1_BASE}/u1/import`,
        reply: { json: cfEnvelope({ at_bookmark: 'bm-9', status: 'active' }) },
      },
    ]);

    const body = await readBody(
      await onRequestPostImport(
        bodyContext('POST', { databaseId: 'u1', action: 'ingest', etag: 'md5-x', filename: 'file-abc.sql' }),
      ),
    );

    expect(body.ok).toBe(true);
    const importCall = calls.find((call) => call.url.endsWith('/import'));
    expect(JSON.parse(String(importCall?.init?.body))).toEqual({
      action: 'ingest',
      etag: 'md5-x',
      filename: 'file-abc.sql',
    });
  });

  it('mirrors import poll as {action, current_bookmark}', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: `${D1_BASE}/u1`, reply: { json: cfEnvelope({ uuid: 'u1', name: 'app_db' }) } },
      {
        method: 'POST',
        url: `${D1_BASE}/u1/import`,
        reply: { json: cfEnvelope({ status: 'complete', result: { num_queries: 10 } }) },
      },
    ]);

    const body = await readBody(
      await onRequestPostImport(bodyContext('POST', { databaseId: 'u1', action: 'poll', bookmark: 'bm-9' })),
    );

    expect(body.ok).toBe(true);
    const importCall = calls.find((call) => call.url.endsWith('/import'));
    expect(JSON.parse(String(importCall?.init?.body))).toEqual({ action: 'poll', current_bookmark: 'bm-9' });
  });

  it('rejects import with invalid action or missing per-action fields with 400 and no CF call', async () => {
    const { calls } = stubCloudflareFetch([]);

    const badAction = await onRequestPostImport(bodyContext('POST', { databaseId: 'u1', action: 'upload' }));
    expect(badAction.status).toBe(400);
    expect((await readBody(badAction)).error).toContain('init, ingest ou poll');

    const initSemEtag = await onRequestPostImport(bodyContext('POST', { databaseId: 'u1', action: 'init' }));
    expect(initSemEtag.status).toBe(400);
    expect((await readBody(initSemEtag)).error).toContain('etag');

    const ingestSemFilename = await onRequestPostImport(
      bodyContext('POST', { databaseId: 'u1', action: 'ingest', etag: 'md5-x' }),
    );
    expect(ingestSemFilename.status).toBe(400);
    expect((await readBody(ingestSemFilename)).error).toContain('filename');

    const pollSemBookmark = await onRequestPostImport(bodyContext('POST', { databaseId: 'u1', action: 'poll' }));
    expect(pollSemBookmark.status).toBe(400);
    expect((await readBody(pollSemBookmark)).error).toContain('bookmark');

    expect(calls).toHaveLength(0);
  });

  // ── Telemetria ──

  it('never logs any SQL text in telemetry: only statement/read/write counts', async () => {
    stubCloudflareFetch([
      { method: 'GET', url: `${D1_BASE}/u1`, reply: { json: cfEnvelope({ uuid: 'u1', name: 'app_db' }) } },
      { method: 'POST', url: `${D1_BASE}/u1/query`, reply: { json: cfEnvelope([{ results: [], success: true }]) } },
    ]);
    const { db, inserts } = makeOperationalDbStub();
    // Um segredo literal LOGO no início do SQL — dentro dos antigos 200 chars.
    const secret = 'sk-super-secreto-1234567890';
    const sql = `INSERT INTO tokens (v) VALUES ('${secret}')`;

    const response = await onRequestPostQuery(
      bodyContext('POST', { databaseId: 'u1', sql, confirmDangerous: true }, { ...baseEnv(), BIGDATA_DB: db }),
    );

    expect(response.status).toBe(200);
    expect(inserts).toHaveLength(1);
    const metadataJson = String(inserts[0]?.[6] ?? '');
    // Nenhum vestígio do SQL nem do segredo, nem em prefixo.
    expect(metadataJson).not.toContain(secret);
    expect(metadataJson).not.toContain('INSERT INTO tokens');
    const metadata = JSON.parse(metadataJson) as Record<string, unknown>;
    expect(metadata.sqlPreview).toBeUndefined();
    expect(metadata.statements).toBe(1);
    expect(metadata.writes).toBe(1);
    expect(metadata.reads).toBe(0);
  });
});
