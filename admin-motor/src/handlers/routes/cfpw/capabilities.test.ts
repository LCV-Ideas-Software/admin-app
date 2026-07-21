import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { __resetCapabilitiesCacheForTests, onRequestGet } from './capabilities';

const KV_URL = 'https://api.cloudflare.com/client/v4/accounts/acct-1/storage/kv/namespaces?per_page=5';
const D1_URL = 'https://api.cloudflare.com/client/v4/accounts/acct-1/d1/database?per_page=5';
const R2_URL = 'https://api.cloudflare.com/client/v4/accounts/acct-1/r2/buckets';
const OBSERVABILITY_URL = 'https://api.cloudflare.com/client/v4/accounts/acct-1/workers/observability/destinations';
const BUILDS_URL = 'https://api.cloudflare.com/client/v4/accounts/acct-1/builds/account/limits';
const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';

type StubRoute = Parameters<typeof stubCloudflareFetch>[0][number];

type ProbeBody = { enabled: boolean; reason?: string; detail?: string };

type CapabilitiesBody = {
  ok: boolean;
  request_id: string;
  error?: string;
  capabilities: Record<'kv' | 'd1' | 'r2' | 'observability' | 'builds' | 'analytics', ProbeBody>;
  account: { id: string; source: string };
  probedAt: string;
};

const baseEnv = () => ({
  CLOUDFLARE_PW: 'pw-token',
  CLOUDFLARE_STORAGE: 'storage-token',
  CF_ACCOUNT_ID: 'acct-1',
});

const buildContext = (query = '', requestId = 'req-test') => ({
  request: new Request(`https://admin.test/api/cfpw/capabilities${query}`, {
    headers: { 'X-Request-Id': requestId },
  }),
  env: baseEnv(),
});

const happyRoutes = (): StubRoute[] => [
  { url: KV_URL, reply: { json: cfEnvelope([]) } },
  { url: D1_URL, reply: { json: cfEnvelope([]) } },
  { url: R2_URL, reply: { json: cfEnvelope({ buckets: [] }) } },
  { url: OBSERVABILITY_URL, reply: { json: cfEnvelope([]) } },
  { url: BUILDS_URL, reply: { json: cfEnvelope({}) } },
  {
    method: 'POST',
    url: GRAPHQL_URL,
    reply: { json: { data: { viewer: { accounts: [{ accountTag: 'acct-1' }] } } } },
  },
];

const happyRoutesWithout = (url: string) => happyRoutes().filter((route) => route.url !== url);

const readBody = async (response: Response) => (await response.json()) as CapabilitiesBody;

describe('cfpw capabilities handler', () => {
  beforeEach(() => {
    __resetCapabilitiesCacheForTests();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reports all capabilities enabled and probes each endpoint with the product token', async () => {
    const { calls } = stubCloudflareFetch(happyRoutes());

    const response = await onRequestGet(buildContext());
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.capabilities.kv).toEqual({ enabled: true });
    expect(body.capabilities.d1).toEqual({ enabled: true });
    expect(body.capabilities.r2).toEqual({ enabled: true });
    expect(body.capabilities.observability).toEqual({ enabled: true });
    expect(body.capabilities.builds).toEqual({ enabled: true });
    expect(body.capabilities.analytics).toEqual({ enabled: true });
    expect(body.account).toEqual({ id: 'acct-1', source: 'CF_ACCOUNT_ID' });
    expect(new Date(body.probedAt).getTime()).not.toBeNaN();

    expect(calls).toHaveLength(6);
    const tokenByUrl = new Map(calls.map((call) => [call.url, new Headers(call.init?.headers).get('Authorization')]));
    expect(tokenByUrl.get(KV_URL)).toBe('Bearer storage-token');
    expect(tokenByUrl.get(D1_URL)).toBe('Bearer storage-token');
    expect(tokenByUrl.get(R2_URL)).toBe('Bearer storage-token');
    expect(tokenByUrl.get(OBSERVABILITY_URL)).toBe('Bearer pw-token');
    expect(tokenByUrl.get(BUILDS_URL)).toBe('Bearer pw-token');
    expect(tokenByUrl.get(GRAPHQL_URL)).toBe('Bearer pw-token');

    for (const call of calls) {
      expect(call.init?.signal, `sonda sem AbortSignal: ${call.url}`).toBeInstanceOf(AbortSignal);
    }
  });

  it('classifies a 403 on kv as sem-permissao with the diagnostic pt-BR detail', async () => {
    stubCloudflareFetch([
      { url: KV_URL, reply: cfErrorEnvelope(9109, 'Invalid access token', 403) },
      ...happyRoutesWithout(KV_URL),
    ]);

    const body = await readBody(await onRequestGet(buildContext()));

    expect(body.ok).toBe(true);
    expect(body.capabilities.kv.enabled).toBe(false);
    expect(body.capabilities.kv.reason).toBe('sem-permissao');
    expect(body.capabilities.kv.detail).toContain('Token Cloudflare sem permissão ou inválido');
    expect(body.capabilities.kv.detail).toContain('código CF 9109');
    expect(body.capabilities.d1).toEqual({ enabled: true });
    expect(body.capabilities.builds).toEqual({ enabled: true });
  });

  it('classifies a 404 on builds as indisponivel', async () => {
    stubCloudflareFetch([
      { url: BUILDS_URL, reply: cfErrorEnvelope(7003, 'Could not route request', 404) },
      ...happyRoutesWithout(BUILDS_URL),
    ]);

    const body = await readBody(await onRequestGet(buildContext()));

    expect(body.capabilities.builds.enabled).toBe(false);
    expect(body.capabilities.builds.reason).toBe('indisponivel');
    expect(body.capabilities.builds.detail).toContain('código CF 7003');
    expect(body.capabilities.kv).toEqual({ enabled: true });
  });

  it('classifies a GraphQL 200 with auth errors as sem-permissao', async () => {
    stubCloudflareFetch([
      {
        method: 'POST',
        url: GRAPHQL_URL,
        reply: { json: { data: null, errors: [{ message: 'not authorized to access this account' }] } },
      },
      ...happyRoutesWithout(GRAPHQL_URL),
    ]);

    const body = await readBody(await onRequestGet(buildContext()));

    expect(body.capabilities.analytics.enabled).toBe(false);
    expect(body.capabilities.analytics.reason).toBe('sem-permissao');
    expect(body.capabilities.analytics.detail).toContain('not authorized to access this account');
    expect(body.capabilities.kv).toEqual({ enabled: true });
  });

  it('serves the second call from cache without refetching, with a fresh trace', async () => {
    const { calls } = stubCloudflareFetch(happyRoutes());

    const first = await readBody(await onRequestGet(buildContext('', 'req-1')));
    expect(calls).toHaveLength(6);
    expect(first.request_id).toBe('req-1');

    const second = await readBody(await onRequestGet(buildContext('', 'req-2')));
    expect(calls).toHaveLength(6);
    expect(second.ok).toBe(true);
    expect(second.request_id).toBe('req-2');
    expect(second.capabilities.kv).toEqual({ enabled: true });
    expect(second.probedAt).toBe(first.probedAt);
  });

  it('bypasses the cache when refresh=true', async () => {
    const { calls } = stubCloudflareFetch(happyRoutes());

    await onRequestGet(buildContext());
    expect(calls).toHaveLength(6);

    const body = await readBody(await onRequestGet(buildContext('?refresh=true')));
    expect(calls).toHaveLength(12);
    expect(body.ok).toBe(true);
  });
});
