import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestPost } from './batch.ts';

const BATCH_URL = 'https://api.cloudflare.com/client/v4/zones/zone-1/dns_records/batch';

type BatchBody = {
  ok: boolean;
  zoneId?: string;
  error?: string;
  result?: {
    deletes?: unknown[];
    patches?: unknown[];
    puts?: unknown[];
    posts?: unknown[];
  };
};

const stubBatch = (result: Record<string, unknown>) =>
  stubCloudflareFetch([{ method: 'POST', url: BATCH_URL, reply: { json: cfEnvelope(result) } }]);

const postBatch = (body: Record<string, unknown>) =>
  onRequestPost({
    request: new Request('https://admin.test/api/cfdns/batch', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    env: { CLOUDFLARE_DNS: 'dns-token' },
  });

const sentBody = (calls: Array<{ url: string; init?: RequestInit }>) =>
  JSON.parse(String(calls[0]?.init?.body)) as Record<string, unknown>;

describe('cfdns batch handler', () => {
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

  it('applies a mixed batch forwarding deletes → patches → puts → posts in order to Cloudflare', async () => {
    const { calls } = stubBatch({
      deletes: [{ id: 'del-1' }],
      patches: [{ id: 'patch-1' }],
      puts: [{ id: 'put-1' }],
      posts: [{ id: 'post-1' }],
    });

    const response = await postBatch({
      zoneId: 'zone-1',
      deletes: [{ id: 'del-1' }],
      patches: [{ id: 'patch-1', ttl: 300, proxied: true }],
      puts: [{ id: 'put-1', type: 'A', name: 'WWW.Example.com', content: '192.0.2.1' }],
      posts: [{ type: 'TXT', name: 'example.com', content: 'v=spf1 -all' }],
    });
    const body = (await response.json()) as BatchBody;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.zoneId).toBe('zone-1');
    expect(body.result).toEqual({
      deletes: [{ id: 'del-1' }],
      patches: [{ id: 'patch-1' }],
      puts: [{ id: 'put-1' }],
      posts: [{ id: 'post-1' }],
    });

    const forwarded = sentBody(calls);
    expect(Object.keys(forwarded)).toEqual(['deletes', 'patches', 'puts', 'posts']);
    expect(forwarded).toEqual({
      deletes: [{ id: 'del-1' }],
      patches: [{ id: 'patch-1', ttl: 300, proxied: true }],
      puts: [{ id: 'put-1', type: 'A', name: 'www.example.com', content: '192.0.2.1', ttl: 1 }],
      posts: [{ type: 'TXT', name: 'example.com', content: 'v=spf1 -all', ttl: 1 }],
    });
  });

  it('rejects a batch without any operation with 400', async () => {
    const response = await postBatch({ zoneId: 'zone-1' });
    const body = (await response.json()) as BatchBody;

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('ao menos uma operação');
  });

  it('rejects a batch above 3500 operations with 400 naming both plan limits', async () => {
    const deletes = Array.from({ length: 3501 }, (_, index) => ({ id: `rec-${index}` }));
    const response = await postBatch({ zoneId: 'zone-1', deletes });
    const body = (await response.json()) as BatchBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('3501');
    expect(body.error).toContain('3500');
    expect(body.error).toContain('200');
    expect(body.error).toContain('Free');
  });

  it('rejects a missing zoneId with 400', async () => {
    const response = await postBatch({ deletes: [{ id: 'del-1' }] });
    const body = (await response.json()) as BatchBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('zoneId');
  });

  it('names the offending operation index when a post record is invalid', async () => {
    const response = await postBatch({
      zoneId: 'zone-1',
      posts: [
        { type: 'A', name: 'a.example.com', content: '192.0.2.1' },
        { type: 'A', name: 'b.example.com', content: '192.0.2.2' },
        { type: 'DS', name: 'example.com', data: { key_tag: 70000, algorithm: 13, digest_type: 2, digest: 'ABCDEF' } },
      ],
    });
    const body = (await response.json()) as BatchBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('posts[2]');
    expect(body.error).toContain('key_tag');
  });

  it('validates only the fields present in a patch (partial validation)', async () => {
    const response = await postBatch({
      zoneId: 'zone-1',
      patches: [{ id: 'patch-1', ttl: 30 }],
    });
    const body = (await response.json()) as BatchBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('patches[0]');
    expect(body.error).toContain('TTL inválido');
  });

  it('translates the Cloudflare all-or-nothing failure keeping the 4xx status', async () => {
    stubCloudflareFetch([
      { method: 'POST', url: BATCH_URL, reply: cfErrorEnvelope(81044, 'Record does not exist.', 400) },
    ]);

    const response = await postBatch({
      zoneId: 'zone-1',
      deletes: [{ id: 'missing-record' }],
    });
    const body = (await response.json()) as BatchBody;

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Registro DNS não encontrado');
    expect(body.error).toContain('81044');
  });
});
