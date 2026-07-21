import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestDelete, onRequestGet, onRequestPost, onRequestPostSubdomain } from './worker-domains';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const DOMAINS_LIST_URL = `${BASE}/workers/domains?service=meu-worker`;
const DOMAINS_URL = `${BASE}/workers/domains`;
const SCRIPT_SUBDOMAIN_URL = `${BASE}/workers/scripts/meu-worker/subdomain`;
const ACCOUNT_SUBDOMAIN_URL = `${BASE}/workers/subdomain`;

type DomainsBody = {
  ok: boolean;
  error?: string;
  domains?: Array<Record<string, unknown>>;
  scriptSubdomain?: { enabled: boolean; previews_enabled: boolean } | null;
  accountSubdomain?: unknown;
  scriptName?: string;
  domain?: Record<string, unknown>;
  domainId?: string;
  deleted?: boolean;
  warnings?: Array<{ code: string; message: string }>;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const getContext = (query: string) => ({
  request: new Request(`https://admin.test/api/cfpw/worker-domains${query}`),
  env: baseEnv(),
});

const postContext = (url: string, body: unknown) => ({
  request: new Request(url, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const deleteContext = (query: string) => ({
  request: new Request(`https://admin.test/api/cfpw/worker-domains${query}`, { method: 'DELETE' }),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as DomainsBody;

describe('cfpw worker-domains handler', () => {
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

  it('aggregates custom domains, script subdomain and account subdomain', async () => {
    stubCloudflareFetch([
      { url: DOMAINS_LIST_URL, reply: { json: cfEnvelope([{ id: 'dom-1', hostname: 'api.lcv.dev' }]) } },
      { url: SCRIPT_SUBDOMAIN_URL, reply: { json: cfEnvelope({ enabled: true, previews_enabled: false }) } },
      { url: ACCOUNT_SUBDOMAIN_URL, reply: { json: cfEnvelope({ subdomain: 'lcv' }) } },
    ]);

    const response = await onRequestGet(getContext('?scriptName=meu-worker'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.domains).toEqual([{ id: 'dom-1', hostname: 'api.lcv.dev' }]);
    expect(body.scriptSubdomain).toEqual({ enabled: true, previews_enabled: false });
    expect(body.accountSubdomain).toBe('lcv');
    expect(body.warnings).toEqual([]);
  });

  it('keeps ok=true with a warning when the account subdomain probe fails', async () => {
    stubCloudflareFetch([
      { url: DOMAINS_LIST_URL, reply: { json: cfEnvelope([]) } },
      { url: SCRIPT_SUBDOMAIN_URL, reply: { json: cfEnvelope({ enabled: false, previews_enabled: false }) } },
      { url: ACCOUNT_SUBDOMAIN_URL, reply: cfErrorEnvelope(10007, 'subdomain not found', 404) },
    ]);

    const body = await readBody(await onRequestGet(getContext('?scriptName=meu-worker')));

    expect(body.ok).toBe(true);
    expect(body.accountSubdomain).toBeNull();
    expect(body.warnings).toHaveLength(1);
    expect(body.warnings?.[0]?.code).toBe('CFPW-WORKER-DOMAINS-PARTIAL-ACCOUNT-SUBDOMAIN');
  });

  it('rejects GET without scriptName', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestGet(getContext(''));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('scriptName');
  });

  it('attaches a custom domain via PUT without the deprecated environment field', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'PUT', url: DOMAINS_URL, reply: { json: cfEnvelope({ id: 'dom-2', hostname: 'api.lcv.dev' }) } },
    ]);

    const response = await onRequestPost(
      postContext('https://admin.test/api/cfpw/worker-domains', {
        scriptName: 'meu-worker',
        hostname: 'api.lcv.dev',
        zoneId: 'zone-1',
      }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.domain).toEqual({ id: 'dom-2', hostname: 'api.lcv.dev' });

    expect(calls[0]?.init?.method).toBe('PUT');
    const sent = JSON.parse(String(calls[0]?.init?.body)) as Record<string, unknown>;
    expect(sent).toEqual({ zone_id: 'zone-1', hostname: 'api.lcv.dev', service: 'meu-worker' });
    expect(Object.keys(sent)).not.toContain('environment');
  });

  it('translates a permission failure on attach into pt-BR suggesting zone permissions', async () => {
    stubCloudflareFetch([
      { method: 'PUT', url: DOMAINS_URL, reply: cfErrorEnvelope(10000, 'Authentication error', 403) },
    ]);

    const response = await onRequestPost(
      postContext('https://admin.test/api/cfpw/worker-domains', {
        scriptName: 'meu-worker',
        hostname: 'api.lcv.dev',
        zoneId: 'zone-1',
      }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.error).toContain('permissão');
    expect(body.error).toContain('DNS Edit');
    expect(body.error).toContain('SSL and Certificates Edit');
    expect(body.error).toContain('CLOUDFLARE_PW');
  });

  it('rejects attach without hostname or zoneId', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestPost(
      postContext('https://admin.test/api/cfpw/worker-domains', { scriptName: 'meu-worker' }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('hostname');
  });

  it('deletes a custom domain attachment by id', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'DELETE', url: `${DOMAINS_URL}/dom-1`, reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestDelete(deleteContext('?domainId=dom-1'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.deleted).toBe(true);
    expect(body.domainId).toBe('dom-1');
    expect(calls[0]?.url).toBe(`${DOMAINS_URL}/dom-1`);
    expect(calls[0]?.init?.method).toBe('DELETE');
  });

  it('rejects DELETE without domainId', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestDelete(deleteContext(''));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('domainId');
  });

  it('creates the account subdomain and enables the script subdomain in one call', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'PUT', url: ACCOUNT_SUBDOMAIN_URL, reply: { json: cfEnvelope({ subdomain: 'lcv-novo' }) } },
      {
        method: 'POST',
        url: SCRIPT_SUBDOMAIN_URL,
        reply: { json: cfEnvelope({ enabled: true, previews_enabled: false }) },
      },
    ]);

    const response = await onRequestPostSubdomain(
      postContext('https://admin.test/api/cfpw/worker-subdomain', {
        accountSubdomain: 'lcv-novo',
        scriptName: 'meu-worker',
        enabled: true,
        previewsEnabled: false,
      }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.accountSubdomain).toEqual({ subdomain: 'lcv-novo' });
    expect(body.scriptName).toBe('meu-worker');

    const accountCall = calls.find((call) => call.url === ACCOUNT_SUBDOMAIN_URL);
    expect(JSON.parse(String(accountCall?.init?.body))).toEqual({ subdomain: 'lcv-novo' });
    const scriptCall = calls.find((call) => call.url === SCRIPT_SUBDOMAIN_URL);
    expect(JSON.parse(String(scriptCall?.init?.body))).toEqual({ enabled: true, previews_enabled: false });
  });

  it('rejects the subdomain POST when neither accountSubdomain nor scriptName is sent', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestPostSubdomain(postContext('https://admin.test/api/cfpw/worker-subdomain', {}));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('accountSubdomain');
  });
});
