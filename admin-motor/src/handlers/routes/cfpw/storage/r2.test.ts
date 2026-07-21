import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../../test-utils/cf-fetch';
import {
  onRequestDeleteBuckets,
  onRequestDeleteObjects,
  onRequestGetBucketSettings,
  onRequestGetBuckets,
  onRequestGetObject,
  onRequestGetObjects,
  onRequestPostBuckets,
  onRequestPutObject,
} from './r2';

const BUCKETS_BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1/r2/buckets';

type R2Body = {
  ok: boolean;
  error?: string;
  buckets?: Array<{
    name: string;
    creation_date: string | null;
    location: string | null;
    storage_class: string | null;
    protected: boolean;
  }>;
  bucket?: { name: string; protected: boolean } | string;
  deleted?: boolean | number;
  objects?: Array<{
    key: string;
    size: number | null;
    etag: string | null;
    uploaded: string | null;
    storage_class: string | null;
    http_metadata?: Record<string, unknown>;
  }>;
  folders?: string[];
  cursor?: string | null;
  isTruncated?: boolean;
  key?: string;
  saved?: boolean;
  failures?: Array<{ key: string; error: string }>;
  managedDomain?: unknown;
  customDomains?: unknown;
  cors?: unknown;
  lifecycle?: unknown;
  warnings?: Array<{ code: string; message: string }>;
};

const baseEnv = () => ({ CLOUDFLARE_STORAGE: 'storage-token', CF_ACCOUNT_ID: 'acct-1' });

const getContext = (path: string, query: Record<string, string>) => ({
  request: new Request(`https://admin.test/api/cfpw/storage/r2/${path}?${new URLSearchParams(query).toString()}`),
  env: baseEnv(),
});

const bodyContext = (method: string, body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/storage/r2/x', {
    method,
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const putContext = (query: Record<string, string>, body: string | null, headers: Record<string, string>) => ({
  request: new Request(`https://admin.test/api/cfpw/storage/r2/object?${new URLSearchParams(query).toString()}`, {
    method: 'PUT',
    ...(body !== null ? { body } : {}),
    headers,
  }),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as R2Body;

describe('cfpw storage/r2 handlers', () => {
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

  // ── Buckets ──

  it('lists buckets from the nested {buckets: []} envelope and flags mainsite-media as protected', async () => {
    stubCloudflareFetch([
      {
        url: BUCKETS_BASE,
        reply: {
          json: cfEnvelope({
            buckets: [
              { name: 'mainsite-media', creation_date: '2025-01-01T00:00:00Z', location: 'ENAM' },
              { name: 'fotos', creation_date: '2025-02-02T00:00:00Z', storage_class: 'Standard' },
            ],
          }),
        },
      },
    ]);

    const response = await onRequestGetBuckets({ request: new Request('https://admin.test/x'), env: baseEnv() });
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.buckets).toEqual([
      {
        name: 'mainsite-media',
        creation_date: '2025-01-01T00:00:00Z',
        location: 'ENAM',
        storage_class: null,
        protected: true,
      },
      {
        name: 'fotos',
        creation_date: '2025-02-02T00:00:00Z',
        location: null,
        storage_class: 'Standard',
        protected: false,
      },
    ]);
  });

  it('lists buckets when the CF result is a plain array (defensive passthrough)', async () => {
    stubCloudflareFetch([{ url: BUCKETS_BASE, reply: { json: cfEnvelope([{ name: 'logs', location: 'WEUR' }]) } }]);

    const body = await readBody(
      await onRequestGetBuckets({ request: new Request('https://admin.test/x'), env: baseEnv() }),
    );

    expect(body.ok).toBe(true);
    expect(body.buckets).toEqual([
      { name: 'logs', creation_date: null, location: 'WEUR', storage_class: null, protected: false },
    ]);
  });

  it('creates a bucket sending exactly {name, locationHint, storageClass} to the CF API', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'POST', url: BUCKETS_BASE, reply: { json: cfEnvelope({ name: 'novo-bucket', location: 'SAM' }) } },
    ]);

    const response = await onRequestPostBuckets(
      bodyContext('POST', { name: 'novo-bucket', locationHint: 'wnam', storageClass: 'InfrequentAccess' }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      name: 'novo-bucket',
      locationHint: 'wnam',
      storageClass: 'InfrequentAccess',
    });
  });

  it('rejects invalid bucket names with 400 without calling the CF API', async () => {
    const { calls } = stubCloudflareFetch([]);

    for (const name of ['Maiusculo', 'ab', '-comeca-com-hifen', 'termina-com-hifen-', `a${'b'.repeat(63)}`]) {
      const response = await onRequestPostBuckets(bodyContext('POST', { name }));
      expect(response.status).toBe(400);
      expect((await readBody(response)).error).toContain('Nome de bucket R2 inválido');
    }
    expect(calls).toHaveLength(0);
  });

  it('rejects invalid locationHint and storageClass with 400 without calling the CF API', async () => {
    const { calls } = stubCloudflareFetch([]);

    const hintResponse = await onRequestPostBuckets(bodyContext('POST', { name: 'ok-bucket', locationHint: 'mars' }));
    expect(hintResponse.status).toBe(400);
    expect((await readBody(hintResponse)).error).toContain('locationHint inválido');

    const classResponse = await onRequestPostBuckets(bodyContext('POST', { name: 'ok-bucket', storageClass: 'Cold' }));
    expect(classResponse.status).toBe(400);
    expect((await readBody(classResponse)).error).toContain('storageClass inválido');

    expect(calls).toHaveLength(0);
  });

  it('returns 403 ALWAYS for mainsite-media delete, even with matching confirmName, without calling the CF API', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestDeleteBuckets(
      bodyContext('DELETE', { bucket: 'mainsite-media', confirmName: 'mainsite-media' }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.error).toContain('mainsite-media é o bucket de mídia de produção do mainsite');
    expect(body.error).toContain('MEDIA_BUCKET');
    expect(calls).toHaveLength(0);
  });

  it('rejects bucket delete with 400 when confirmName diverges, without calling the CF API', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestDeleteBuckets(bodyContext('DELETE', { bucket: 'fotos', confirmName: 'foto' }));
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain('Confirmação divergente');
    expect(calls).toHaveLength(0);
  });

  it('deletes the bucket via CF DELETE when confirmName matches', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'DELETE', url: `${BUCKETS_BASE}/fotos`, reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestDeleteBuckets(bodyContext('DELETE', { bucket: 'fotos', confirmName: 'fotos' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.deleted).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it('translates the CF "bucket not empty" error to pt-BR with 409', async () => {
    stubCloudflareFetch([
      {
        method: 'DELETE',
        url: `${BUCKETS_BASE}/fotos`,
        reply: cfErrorEnvelope(10008, 'The bucket you tried to delete is not empty', 409),
      },
    ]);

    const response = await onRequestDeleteBuckets(bodyContext('DELETE', { bucket: 'fotos', confirmName: 'fotos' }));
    const body = await readBody(response);

    expect(response.status).toBe(409);
    expect(body.error).toContain('esvazie o bucket antes de excluí-lo');
  });

  // ── Objetos ──

  it('lists objects with exact CF params: delimiter %2F, prefix, cursor and per_page clamped to 100', async () => {
    const { calls } = stubCloudflareFetch([
      {
        url: `${BUCKETS_BASE}/fotos/objects?delimiter=%2F&per_page=100&prefix=docs%2F&cursor=cur-1`,
        reply: { json: cfEnvelope({ objects: [], delimited_prefixes: [] }) },
      },
    ]);

    const response = await onRequestGetObjects(
      getContext('objects', { bucket: 'fotos', prefix: 'docs/', cursor: 'cur-1', perPage: '500' }),
    );

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  it('defaults per_page to 50 when perPage is absent', async () => {
    const { calls } = stubCloudflareFetch([
      {
        url: `${BUCKETS_BASE}/fotos/objects?delimiter=%2F&per_page=50`,
        reply: { json: cfEnvelope({ objects: [] }) },
      },
    ]);

    await onRequestGetObjects(getContext('objects', { bucket: 'fotos' }));

    expect(calls).toHaveLength(1);
  });

  it('normalizes the envelope form: objects + delimited_prefixes + result_info cursor/is_truncated', async () => {
    stubCloudflareFetch([
      {
        url: /\/objects\?/,
        reply: {
          json: cfEnvelope(
            {
              objects: [
                {
                  key: 'docs/manual.pdf',
                  size: 1234,
                  etag: 'etag-1',
                  uploaded: '2025-03-03T00:00:00Z',
                  storage_class: 'Standard',
                  http_metadata: { contentType: 'application/pdf' },
                },
              ],
              delimited_prefixes: ['docs/fotos/'],
            },
            { result_info: { cursor: 'next-cur', is_truncated: true } },
          ),
        },
      },
    ]);

    const body = await readBody(await onRequestGetObjects(getContext('objects', { bucket: 'fotos' })));

    expect(body.ok).toBe(true);
    expect(body.objects).toEqual([
      {
        key: 'docs/manual.pdf',
        size: 1234,
        etag: 'etag-1',
        uploaded: '2025-03-03T00:00:00Z',
        storage_class: 'Standard',
        http_metadata: { contentType: 'application/pdf' },
      },
    ]);
    expect(body.folders).toEqual(['docs/fotos/']);
    expect(body.cursor).toBe('next-cur');
    expect(body.isTruncated).toBe(true);
  });

  it('normalizes the array form: trailing-slash keys become folders and last_modified maps to uploaded', async () => {
    stubCloudflareFetch([
      {
        url: /\/objects\?/,
        reply: {
          json: cfEnvelope([
            { key: 'raiz.txt', size: 10, etag: 'e1', last_modified: '2025-04-04T00:00:00Z' },
            { key: 'subpasta/', size: 0 },
          ]),
        },
      },
    ]);

    const body = await readBody(await onRequestGetObjects(getContext('objects', { bucket: 'fotos' })));

    expect(body.objects).toEqual([
      { key: 'raiz.txt', size: 10, etag: 'e1', uploaded: '2025-04-04T00:00:00Z', storage_class: null },
    ]);
    expect(body.folders).toEqual(['subpasta/']);
    expect(body.cursor).toBeNull();
    expect(body.isTruncated).toBe(false);
  });

  it('streams the download preserving Content-Type/Length and attaching a sanitized filename', async () => {
    stubCloudflareFetch([
      {
        url: `${BUCKETS_BASE}/fotos/objects/docs%2Frelat%C3%B3rio%20final.pdf`,
        reply: { body: 'conteudo-pdf', headers: { 'Content-Type': 'application/pdf', 'Content-Length': '12' } },
      },
    ]);

    const response = await onRequestGetObject(
      getContext('object', { bucket: 'fotos', key: 'docs/relatório final.pdf' }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Length')).toBe('12');
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="relat_rio_final.pdf"');
    expect(await response.text()).toBe('conteudo-pdf');
  });

  it('encodes the whole key (including "/") with a single encodeURIComponent on download', async () => {
    const { calls } = stubCloudflareFetch([
      {
        url: `${BUCKETS_BASE}/fotos/objects/pasta%2F%CF%80.txt`,
        reply: { body: 'pi', headers: { 'Content-Type': 'text/plain' } },
      },
    ]);

    const response = await onRequestGetObject(getContext('object', { bucket: 'fotos', key: 'pasta/π.txt' }));

    expect(response.status).toBe(200);
    expect(calls[0]?.url).toBe(`${BUCKETS_BASE}/fotos/objects/pasta%2F%CF%80.txt`);
  });

  it('rejects upload without Content-Length with 411 without calling the CF API', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPutObject(putContext({ bucket: 'fotos', key: 'novo.bin' }, null, {}));
    const body = await readBody(response);

    expect(response.status).toBe(411);
    expect(body.error).toContain('Content-Length é obrigatório');
    expect(calls).toHaveLength(0);
  });

  it('rejects upload above 90 MiB with 413 pointing to wrangler/dashboard, without calling the CF API', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPutObject(
      putContext({ bucket: 'fotos', key: 'grande.bin' }, 'x', { 'Content-Length': '94371841' }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(413);
    expect(body.error).toContain('use wrangler ou o dashboard');
    expect(calls).toHaveLength(0);
  });

  it('uploads passing Content-Type/Length through and cf-r2-storage-class when storageClass is sent', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'PUT', url: `${BUCKETS_BASE}/fotos/objects/docs%2Fnovo.txt`, reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestPutObject(
      putContext({ bucket: 'fotos', key: 'docs/novo.txt', storageClass: 'InfrequentAccess' }, 'abc', {
        'Content-Length': '3',
        'Content-Type': 'text/plain',
      }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.saved).toBe(true);
    expect(calls).toHaveLength(1);
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get('Content-Type')).toBe('text/plain');
    expect(headers.get('Content-Length')).toBe('3');
    expect(headers.get('cf-r2-storage-class')).toBe('InfrequentAccess');
  });

  it('rejects bulk delete with 41 keys with 400 without calling the CF API', async () => {
    const { calls } = stubCloudflareFetch([]);

    const keys = Array.from({ length: 41 }, (_, index) => `objeto-${index}`);
    const response = await onRequestDeleteObjects(bodyContext('DELETE', { bucket: 'fotos', keys }));
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain('Máximo de 40 chaves');
    expect(calls).toHaveLength(0);
  });

  it('continues past per-key failures on bulk delete and reports {deleted, failures}', async () => {
    stubCloudflareFetch([
      { method: 'DELETE', url: `${BUCKETS_BASE}/fotos/objects/ok-1`, reply: { json: cfEnvelope(null) } },
      {
        method: 'DELETE',
        url: `${BUCKETS_BASE}/fotos/objects/quebrado`,
        reply: cfErrorEnvelope(10007, 'object not found', 404),
      },
      { method: 'DELETE', url: `${BUCKETS_BASE}/fotos/objects/ok-2`, reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestDeleteObjects(
      bodyContext('DELETE', { bucket: 'fotos', keys: ['ok-1', 'quebrado', 'ok-2'] }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.deleted).toBe(2);
    expect(body.failures).toHaveLength(1);
    expect(body.failures?.[0]?.key).toBe('quebrado');
    expect(body.failures?.[0]?.error).toBeTruthy();
  });

  // ── Configurações do bucket ──

  it('aggregates bucket settings via allSettled: 404 becomes null without warning, other failures warn', async () => {
    stubCloudflareFetch([
      {
        url: `${BUCKETS_BASE}/fotos/domains/managed`,
        reply: { json: cfEnvelope({ domain: 'pub-abc.r2.dev', enabled: true }) },
      },
      {
        url: `${BUCKETS_BASE}/fotos/domains/custom`,
        reply: { json: cfEnvelope({ domains: [{ domain: 'cdn.exemplo.com', enabled: true }] }) },
      },
      {
        url: `${BUCKETS_BASE}/fotos/cors`,
        reply: cfErrorEnvelope(10059, 'The CORS configuration does not exist', 404),
      },
      { url: `${BUCKETS_BASE}/fotos/lifecycle`, reply: cfErrorEnvelope(7500, 'internal error', 500) },
    ]);

    const response = await onRequestGetBucketSettings(getContext('bucket-settings', { bucket: 'fotos' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.managedDomain).toEqual({ domain: 'pub-abc.r2.dev', enabled: true });
    expect(body.customDomains).toEqual({ domains: [{ domain: 'cdn.exemplo.com', enabled: true }] });
    expect(body.cors).toBeNull();
    expect(body.lifecycle).toBeNull();
    expect(body.warnings).toHaveLength(1);
    expect(body.warnings?.[0]?.code).toBe('r2-lifecycle');
  });

  it('requires the bucket param on objects, object, put and bucket-settings with 400 pt-BR', async () => {
    stubCloudflareFetch([]);

    const objects = await onRequestGetObjects(getContext('objects', {}));
    expect(objects.status).toBe(400);
    expect((await readBody(objects)).error).toContain('bucket é obrigatório');

    const object = await onRequestGetObject(getContext('object', { key: 'x' }));
    expect(object.status).toBe(400);

    const put = await onRequestPutObject(putContext({ key: 'x' }, 'a', { 'Content-Length': '1' }));
    expect(put.status).toBe(400);

    const settings = await onRequestGetBucketSettings(getContext('bucket-settings', {}));
    expect(settings.status).toBe(400);
  });
});
