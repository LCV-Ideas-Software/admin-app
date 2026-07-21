import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestPost } from './upsert.ts';

const CREATE_URL = 'https://api.cloudflare.com/client/v4/zones/zone-1/dns_records';

type UpsertBody = {
  ok: boolean;
  mode?: string;
  zoneId?: string;
  error?: string;
  record?: Record<string, unknown>;
};

const stubCreate = () =>
  stubCloudflareFetch([{ method: 'POST', url: CREATE_URL, reply: { json: cfEnvelope({ id: 'rec-1' }) } }]);

const postUpsert = (record: Record<string, unknown>) =>
  onRequestPost({
    request: new Request('https://admin.test/api/cfdns/upsert', {
      method: 'POST',
      body: JSON.stringify({ zoneId: 'zone-1', record }),
    }),
    env: { CLOUDFLARE_DNS: 'dns-token' },
  });

const sentBody = (calls: Array<{ url: string; init?: RequestInit }>) =>
  JSON.parse(String(calls[0]?.init?.body)) as Record<string, unknown>;

type CreateCase = {
  record: Record<string, unknown>;
  expectedBody: Record<string, unknown>;
};

const LOC_DATA = {
  lat_degrees: 37,
  lat_minutes: 46,
  lat_seconds: 46.001,
  lat_direction: 'N',
  long_degrees: 122,
  long_minutes: 23,
  long_seconds: 35.999,
  long_direction: 'W',
  altitude: 0,
  size: 100,
  precision_horz: 0,
  precision_vert: 0,
};

// Um caso por tipo NOVO: o corpo enviado à Cloudflare deve carregar o objeto
// `data` intacto (tipos estruturados) ou `content` (tipos planos).
const createCases: Record<string, CreateCase> = {
  DS: {
    record: {
      type: 'DS',
      name: 'Example.com',
      data: { key_tag: 42, algorithm: 13, digest_type: 2, digest: 'ABCDEF0123456789' },
    },
    expectedBody: {
      type: 'DS',
      name: 'example.com',
      ttl: 1,
      data: { key_tag: 42, algorithm: 13, digest_type: 2, digest: 'ABCDEF0123456789' },
    },
  },
  DNSKEY: {
    record: {
      type: 'DNSKEY',
      name: 'example.com',
      data: { flags: 257, protocol: 3, algorithm: 13, public_key: 'mdsswUyr3DPW132mOi8V9xESWE8jTo0d' },
    },
    expectedBody: {
      type: 'DNSKEY',
      name: 'example.com',
      ttl: 1,
      data: { flags: 257, protocol: 3, algorithm: 13, public_key: 'mdsswUyr3DPW132mOi8V9xESWE8jTo0d' },
    },
  },
  SSHFP: {
    record: {
      type: 'SSHFP',
      name: 'host.example.com',
      data: { algorithm: 4, type: 2, fingerprint: '123456789ABCDEF67890123456789ABCDEF67890' },
    },
    expectedBody: {
      type: 'SSHFP',
      name: 'host.example.com',
      ttl: 1,
      data: { algorithm: 4, type: 2, fingerprint: '123456789ABCDEF67890123456789ABCDEF67890' },
    },
  },
  SMIMEA: {
    record: {
      type: 'SMIMEA',
      name: 'mail.example.com',
      data: { usage: 3, selector: 1, matching_type: 1, certificate: 'MIIBrjCCAROCAQ==' },
    },
    expectedBody: {
      type: 'SMIMEA',
      name: 'mail.example.com',
      ttl: 1,
      data: { usage: 3, selector: 1, matching_type: 1, certificate: 'MIIBrjCCAROCAQ==' },
    },
  },
  TLSA: {
    record: {
      type: 'TLSA',
      name: '_443._tcp.example.com',
      data: { usage: 3, selector: 1, matching_type: 1, certificate: '0123456789abcdef' },
    },
    expectedBody: {
      type: 'TLSA',
      name: '_443._tcp.example.com',
      ttl: 1,
      data: { usage: 3, selector: 1, matching_type: 1, certificate: '0123456789abcdef' },
    },
  },
  CERT: {
    record: {
      type: 'CERT',
      name: 'example.com',
      data: { type: 1, key_tag: 12345, algorithm: 8, certificate: 'MIIBrjCCAROCAQ==' },
    },
    expectedBody: {
      type: 'CERT',
      name: 'example.com',
      ttl: 1,
      data: { type: 1, key_tag: 12345, algorithm: 8, certificate: 'MIIBrjCCAROCAQ==' },
    },
  },
  LOC: {
    record: { type: 'LOC', name: 'example.com', data: { ...LOC_DATA } },
    expectedBody: { type: 'LOC', name: 'example.com', ttl: 1, data: { ...LOC_DATA } },
  },
  NAPTR: {
    record: {
      type: 'NAPTR',
      name: 'example.com',
      data: {
        order: 100,
        preference: 10,
        flags: 'S',
        service: 'SIP+D2U',
        regex: '',
        replacement: '_sip._udp.example.com',
      },
    },
    expectedBody: {
      type: 'NAPTR',
      name: 'example.com',
      ttl: 1,
      data: {
        order: 100,
        preference: 10,
        flags: 'S',
        service: 'SIP+D2U',
        regex: '',
        replacement: '_sip._udp.example.com',
      },
    },
  },
  OPENPGPKEY: {
    record: { type: 'OPENPGPKEY', name: 'hash._openpgpkey.example.com', content: 'mQINBGRjP0sBEADFn2uY' },
    expectedBody: { type: 'OPENPGPKEY', name: 'hash._openpgpkey.example.com', content: 'mQINBGRjP0sBEADFn2uY', ttl: 1 },
  },
  PTR: {
    record: { type: 'PTR', name: '1.2.0.192.in-addr.arpa', content: 'host.example.com' },
    expectedBody: { type: 'PTR', name: '1.2.0.192.in-addr.arpa', content: 'host.example.com', ttl: 1 },
  },
  NS: {
    record: { type: 'NS', name: 'sub.example.com', content: 'ns1.example.com' },
    expectedBody: { type: 'NS', name: 'sub.example.com', content: 'ns1.example.com', ttl: 1 },
  },
};

describe('cfdns upsert handler', () => {
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

  for (const [recordType, testCase] of Object.entries(createCases)) {
    it(`creates ${recordType} records forwarding the exact Cloudflare body`, async () => {
      const { calls } = stubCreate();

      const response = await postUpsert(testCase.record);
      const body = (await response.json()) as UpsertBody;

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.mode).toBe('create');
      expect(sentBody(calls)).toEqual(testCase.expectedBody);
    });
  }

  it('rejects a DS key_tag above 65535 with 400 naming the field and range', async () => {
    const response = await postUpsert({
      type: 'DS',
      name: 'example.com',
      data: { key_tag: 70000, algorithm: 13, digest_type: 2, digest: 'ABCDEF' },
    });
    const body = (await response.json()) as UpsertBody;

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('key_tag');
    expect(body.error).toContain('65535');
  });

  it('rejects a LOC lat_direction outside N/S with 400', async () => {
    const response = await postUpsert({
      type: 'LOC',
      name: 'example.com',
      data: { ...LOC_DATA, lat_direction: 'X' },
    });
    const body = (await response.json()) as UpsertBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('lat_direction');
    expect(body.error).toContain('N, S');
  });

  it('rejects a NAPTR without order with 400', async () => {
    const response = await postUpsert({
      type: 'NAPTR',
      name: 'example.com',
      data: { preference: 10, flags: 'S', service: 'SIP+D2U', regex: '', replacement: '.' },
    });
    const body = (await response.json()) as UpsertBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('order');
  });

  it('forwards tags to Cloudflare', async () => {
    const { calls } = stubCreate();

    const response = await postUpsert({
      type: 'A',
      name: 'www.example.com',
      content: '192.0.2.1',
      tags: ['team:infra', 'env:prod'],
    });

    expect(response.status).toBe(200);
    expect(sentBody(calls).tags).toEqual(['team:infra', 'env:prod']);
  });

  it('rejects more than 20 tags with 400', async () => {
    const tags = Array.from({ length: 21 }, (_, index) => `tag${index}:valor`);
    const response = await postUpsert({ type: 'A', name: 'www.example.com', content: '192.0.2.1', tags });
    const body = (await response.json()) as UpsertBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('20 tags');
  });

  it('rejects a tag outside the nome:valor format with 400', async () => {
    const response = await postUpsert({
      type: 'A',
      name: 'www.example.com',
      content: '192.0.2.1',
      tags: ['bad tag!'],
    });
    const body = (await response.json()) as UpsertBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('Tag inválida');
  });

  it('keeps plain A record creation unchanged (regression)', async () => {
    const { calls } = stubCreate();

    const response = await postUpsert({
      type: 'A',
      name: 'www.example.com',
      content: '192.0.2.1',
      ttl: 300,
      proxied: true,
    });
    const body = (await response.json()) as UpsertBody;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.zoneId).toBe('zone-1');
    expect(body.record).toEqual({ id: 'rec-1' });
    expect(sentBody(calls)).toEqual({
      type: 'A',
      name: 'www.example.com',
      content: '192.0.2.1',
      ttl: 300,
      proxied: true,
    });
  });
});
