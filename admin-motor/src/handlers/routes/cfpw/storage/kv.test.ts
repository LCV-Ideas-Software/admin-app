import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../../test-utils/cf-fetch';
import {
  onRequestDeleteNamespaces,
  onRequestDeleteValue,
  onRequestGetKeys,
  onRequestGetNamespaces,
  onRequestGetValue,
  onRequestPostBulkDelete,
  onRequestPostNamespaces,
  onRequestPutBulk,
  onRequestPutNamespaceRename,
  onRequestPutValue,
} from './kv';

const NS_BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1/storage/kv/namespaces';

type KvBody = {
  ok: boolean;
  error?: string;
  namespaces?: Array<{ id: string; title: string }>;
  pagination?: { page: number; perPage: number; totalCount: number; totalPages: number };
  namespace?: { id: string; title: string };
  namespaceId?: string;
  deleted?: boolean;
  saved?: boolean;
  keys?: Array<{ name: string; expiration?: number; metadata?: unknown }> | number;
  cursor?: string | null;
  listComplete?: boolean;
  type?: string;
  size?: number;
  value?: string;
  prettyJson?: boolean;
  metadata?: unknown;
  expiration?: number | null;
  pairs?: number;
};

const baseEnv = () => ({ CLOUDFLARE_STORAGE: 'storage-token', CF_ACCOUNT_ID: 'acct-1' });

const getContext = (path: string, query: Record<string, string>) => ({
  request: new Request(`https://admin.test/api/cfpw/storage/kv/${path}?${new URLSearchParams(query).toString()}`),
  env: baseEnv(),
});

const bodyContext = (method: string, body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/storage/kv/x', {
    method,
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as KvBody;

describe('cfpw storage/kv handlers', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ── Namespaces ──

  it('clamps perPage to 100 and passes result_info pagination through on namespaces list', async () => {
    stubCloudflareFetch([
      {
        url: `${NS_BASE}?page=2&per_page=100`,
        reply: {
          json: cfEnvelope([{ id: 'ns-1', title: 'cache' }], {
            result_info: { page: 2, per_page: 100, total_count: 250, total_pages: 3 },
          }),
        },
      },
    ]);

    const response = await onRequestGetNamespaces(getContext('namespaces', { page: '2', perPage: '500' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.namespaces).toEqual([{ id: 'ns-1', title: 'cache' }]);
    expect(body.pagination).toEqual({ page: 2, perPage: 100, totalCount: 250, totalPages: 3 });
  });

  it('filters namespaces across multiple pages (title contains, case-insensitive) when search is present', async () => {
    const { calls } = stubCloudflareFetch([
      {
        url: `${NS_BASE}?page=1&per_page=100`,
        reply: {
          json: cfEnvelope(
            [
              { id: '1', title: 'Blog Cache' },
              { id: '2', title: 'sessions' },
            ],
            { result_info: { page: 1, per_page: 100, total_count: 150, total_pages: 2 } },
          ),
        },
      },
      {
        url: `${NS_BASE}?page=2&per_page=100`,
        reply: {
          json: cfEnvelope([{ id: '3', title: 'meu-blog-kv' }], {
            result_info: { page: 2, per_page: 100, total_count: 150, total_pages: 2 },
          }),
        },
      },
    ]);

    const body = await readBody(await onRequestGetNamespaces(getContext('namespaces', { search: 'blog' })));

    expect(body.ok).toBe(true);
    expect(body.namespaces?.map((namespace) => namespace.id)).toEqual(['1', '3']);
    expect(body.pagination).toEqual({ page: 1, perPage: 2, totalCount: 2, totalPages: 1 });
    expect(calls).toHaveLength(2);
  });

  it('maps CF 10014 (duplicate title) to 409 with a pt-BR message on create', async () => {
    stubCloudflareFetch([
      {
        method: 'POST',
        url: NS_BASE,
        reply: cfErrorEnvelope(10014, 'a namespace with this account ID and title already exists', 400),
      },
    ]);

    const response = await onRequestPostNamespaces(bodyContext('POST', { title: 'cache' }));
    const body = await readBody(response);

    expect(response.status).toBe(409);
    expect(body.error).toContain('Já existe um namespace KV com o título "cache"');
    expect(body.error).toContain('10014');
  });

  it('rejects create with empty or oversized title without calling the CF API', async () => {
    const { calls } = stubCloudflareFetch([]);

    const emptyResponse = await onRequestPostNamespaces(bodyContext('POST', { title: '   ' }));
    expect(emptyResponse.status).toBe(400);
    expect((await readBody(emptyResponse)).error).toContain('title é obrigatório');

    const longResponse = await onRequestPostNamespaces(bodyContext('POST', { title: 'a'.repeat(513) }));
    expect(longResponse.status).toBe(400);
    expect((await readBody(longResponse)).error).toContain('512');

    expect(calls).toHaveLength(0);
  });

  it('renames a namespace via CF PUT .../namespaces/{id} with the new title', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'PUT', url: `${NS_BASE}/ns-1`, reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestPutNamespaceRename(bodyContext('PUT', { namespaceId: 'ns-1', title: 'novo-nome' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ title: 'novo-nome' });
  });

  it('rejects namespace delete with 400 when confirmTitle diverges from the real title', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: `${NS_BASE}/ns-1`, reply: { json: cfEnvelope({ id: 'ns-1', title: 'producao' }) } },
    ]);

    const response = await onRequestDeleteNamespaces(
      bodyContext('DELETE', { namespaceId: 'ns-1', confirmTitle: 'prod' }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain('Confirmação divergente');
    expect(body.error).toContain('producao');
    expect(calls.some((call) => String(call.init?.method).toUpperCase() === 'DELETE')).toBe(false);
  });

  it('deletes the namespace when confirmTitle matches the real title', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: `${NS_BASE}/ns-1`, reply: { json: cfEnvelope({ id: 'ns-1', title: 'producao' }) } },
      { method: 'DELETE', url: `${NS_BASE}/ns-1`, reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestDeleteNamespaces(
      bodyContext('DELETE', { namespaceId: 'ns-1', confirmTitle: 'producao' }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.deleted).toBe(true);
    expect(calls.some((call) => String(call.init?.method).toUpperCase() === 'DELETE')).toBe(true);
  });

  // ── Chaves ──

  it('clamps keys limit to 1000, forwards prefix/cursor and passes the result cursor through', async () => {
    stubCloudflareFetch([
      {
        url: `${NS_BASE}/ns-1/keys?limit=1000&prefix=user%3A&cursor=abc`,
        reply: {
          json: cfEnvelope([{ name: 'user:1', expiration: 1893456000, metadata: { origem: 'seed' } }], {
            result_info: { count: 1, cursor: 'next-cursor' },
          }),
        },
      },
    ]);

    const body = await readBody(
      await onRequestGetKeys(
        getContext('keys', { namespaceId: 'ns-1', limit: '5000', prefix: 'user:', cursor: 'abc' }),
      ),
    );

    expect(body.ok).toBe(true);
    expect(body.keys).toEqual([{ name: 'user:1', expiration: 1893456000, metadata: { origem: 'seed' } }]);
    expect(body.cursor).toBe('next-cursor');
    expect(body.listComplete).toBe(false);
  });

  it('reports listComplete=true with null cursor when CF omits the cursor', async () => {
    stubCloudflareFetch([
      {
        url: `${NS_BASE}/ns-1/keys?limit=10`,
        reply: { json: cfEnvelope([{ name: 'a' }], { result_info: { count: 1, cursor: '' } }) },
      },
    ]);

    const body = await readBody(await onRequestGetKeys(getContext('keys', { namespaceId: 'ns-1', limit: '3' })));

    expect(body.cursor).toBeNull();
    expect(body.listComplete).toBe(true);
  });

  // ── Valores: inspect/download ──

  it('inspects a UTF-8 value as text with prettyJson=true and attached metadata', async () => {
    stubCloudflareFetch([
      { url: `${NS_BASE}/ns-1/values/config`, reply: { body: '{"tema":"escuro"}' } },
      { url: `${NS_BASE}/ns-1/metadata/config`, reply: { json: cfEnvelope({ origem: 'painel' }) } },
    ]);

    const body = await readBody(
      await onRequestGetValue(getContext('value', { namespaceId: 'ns-1', key: 'config', expiration: '1893456000' })),
    );

    expect(body.ok).toBe(true);
    expect(body.type).toBe('text');
    expect(body.value).toBe('{"tema":"escuro"}');
    expect(body.prettyJson).toBe(true);
    expect(body.metadata).toEqual({ origem: 'painel' });
    expect(body.expiration).toBe(1893456000);
  });

  it('classifies invalid UTF-8 bytes as binary (metadata failure degrades to null)', async () => {
    stubCloudflareFetch([
      { url: `${NS_BASE}/ns-1/values/img`, reply: { body: new Uint8Array([0xff, 0xfe, 0x00, 0x01]) } },
      { url: `${NS_BASE}/ns-1/metadata/img`, reply: cfErrorEnvelope(10009, 'key not found', 404) },
    ]);

    const body = await readBody(await onRequestGetValue(getContext('value', { namespaceId: 'ns-1', key: 'img' })));

    expect(body.type).toBe('binary');
    expect(body.size).toBe(4);
    expect(body.value).toBeUndefined();
    expect(body.metadata).toBeNull();
  });

  it('classifies a value above 1 MiB as too-large without returning its content', async () => {
    const oneMibPlusOne = new Uint8Array(1_048_577);
    stubCloudflareFetch([
      { url: `${NS_BASE}/ns-1/values/grande`, reply: { body: oneMibPlusOne } },
      { url: `${NS_BASE}/ns-1/metadata/grande`, reply: { json: cfEnvelope(null) } },
    ]);

    const body = await readBody(await onRequestGetValue(getContext('value', { namespaceId: 'ns-1', key: 'grande' })));

    expect(body.type).toBe('too-large');
    expect(body.size).toBe(1_048_577);
    expect(body.value).toBeUndefined();
  });

  it('encodes unicode keys with encodeURIComponent in the CF path', async () => {
    const encodedKey = encodeURIComponent('chave/π/♥');
    const { calls } = stubCloudflareFetch([
      { url: `${NS_BASE}/ns-1/values/${encodedKey}`, reply: { body: 'valor' } },
      { url: `${NS_BASE}/ns-1/metadata/${encodedKey}`, reply: { json: cfEnvelope(null) } },
    ]);

    const body = await readBody(
      await onRequestGetValue(getContext('value', { namespaceId: 'ns-1', key: 'chave/π/♥' })),
    );

    expect(body.type).toBe('text');
    expect(calls.some((call) => call.url.includes('/values/chave%2F%CF%80%2F%E2%99%A5'))).toBe(true);
  });

  it('streams the value on mode=download with attachment filename and upstream content-type', async () => {
    stubCloudflareFetch([
      {
        url: `${NS_BASE}/ns-1/values/${encodeURIComponent('pasta/arquivo.json')}`,
        reply: { body: '{"a":1}', headers: { 'Content-Type': 'application/json' } },
      },
    ]);

    const response = await onRequestGetValue(
      getContext('value', { namespaceId: 'ns-1', key: 'pasta/arquivo.json', mode: 'download' }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="arquivo.json"');
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(await response.text()).toBe('{"a":1}');
  });

  // ── Valores: PUT/DELETE ──

  it('writes a value without metadata as raw body with expiration_ttl in the query string', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'PUT', url: `${NS_BASE}/ns-1/values/k1?expiration_ttl=120`, reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestPutValue(
      bodyContext('PUT', { namespaceId: 'ns-1', key: 'k1', value: 'hello', expirationTtl: 120 }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.saved).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.body).toBe('hello');
    expect(new Headers(calls[0]?.init?.headers).get('Content-Type')).toContain('text/plain');
  });

  it('writes a value with metadata as multipart form with value and metadata fields', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'PUT', url: `${NS_BASE}/ns-1/values/k1`, reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestPutValue(
      bodyContext('PUT', { namespaceId: 'ns-1', key: 'k1', value: 'hello', metadata: { origem: 'painel' } }),
    );

    expect(response.status).toBe(200);
    const form = calls[0]?.init?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('value')).toBe('hello');
    expect(JSON.parse(String(form.get('metadata')))).toEqual({ origem: 'painel' });
  });

  it('rejects expirationTtl below 60 seconds with 400 and no upstream call', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPutValue(
      bodyContext('PUT', { namespaceId: 'ns-1', key: 'k1', value: 'x', expirationTtl: 59 }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('60');
    expect(calls).toHaveLength(0);
  });

  it('counts the key limit in UTF-8 bytes (multibyte key of 257 chars = 514 bytes is rejected)', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPutValue(
      bodyContext('PUT', { namespaceId: 'ns-1', key: 'π'.repeat(257), value: 'x' }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain('512 bytes');
    expect(body.error).toContain('514');
    expect(calls).toHaveLength(0);
  });

  it('rejects metadata above 1024 bytes with 400', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPutValue(
      bodyContext('PUT', { namespaceId: 'ns-1', key: 'k1', value: 'x', metadata: { blob: 'a'.repeat(1100) } }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('1024');
    expect(calls).toHaveLength(0);
  });

  it('deletes a single value via CF DELETE .../values/{key}', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'DELETE', url: `${NS_BASE}/ns-1/values/k1`, reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestDeleteValue(bodyContext('DELETE', { namespaceId: 'ns-1', key: 'k1' }));

    expect(response.status).toBe(200);
    expect((await readBody(response)).deleted).toBe(true);
    expect(calls).toHaveLength(1);
  });

  // ── Operações em lote ──

  it('rejects bulk write above 1000 pairs with 400 and no upstream call', async () => {
    const { calls } = stubCloudflareFetch([]);
    const pairs = Array.from({ length: 1001 }, (_, index) => ({ key: `k${index}`, value: 'v' }));

    const response = await onRequestPutBulk(bodyContext('PUT', { namespaceId: 'ns-1', pairs }));
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain('1000');
    expect(body.error).toContain('1001');
    expect(calls).toHaveLength(0);
  });

  it('writes bulk pairs via CF PUT .../bulk with the sanitized JSON array', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'PUT', url: `${NS_BASE}/ns-1/bulk`, reply: { json: cfEnvelope({ successful_key_count: 2 }) } },
    ]);

    const response = await onRequestPutBulk(
      bodyContext('PUT', {
        namespaceId: 'ns-1',
        pairs: [
          { key: 'a', value: '1', extra: 'descartado' },
          { key: 'b', value: '2', expiration_ttl: 90 },
        ],
      }),
    );

    expect(response.status).toBe(200);
    expect((await readBody(response)).pairs).toBe(2);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: '2', expiration_ttl: 90 },
    ]);
  });

  it('bulk delete uses POST .../bulk/delete (not DELETE .../bulk) with the raw keys array', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'POST', url: `${NS_BASE}/ns-1/bulk/delete`, reply: { json: cfEnvelope({ successful_key_count: 2 }) } },
    ]);

    const response = await onRequestPostBulkDelete(bodyContext('POST', { namespaceId: 'ns-1', keys: ['a', 'b'] }));

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url.endsWith('/bulk/delete')).toBe(true);
    expect(String(calls[0]?.init?.method).toUpperCase()).toBe('POST');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual(['a', 'b']);
  });

  it('rejects bulk delete above 1000 keys with 400', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPostBulkDelete(
      bodyContext('POST', { namespaceId: 'ns-1', keys: Array.from({ length: 1001 }, (_, index) => `k${index}`) }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('1000');
    expect(calls).toHaveLength(0);
  });
});
