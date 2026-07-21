import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestPost } from './worker-create';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const SCRIPT_PUT_URL = `${BASE}/workers/scripts/meu-worker`;
const SCRIPT_SETTINGS_URL = `${BASE}/workers/scripts/meu-worker/settings`;
const SCRIPT_SUBDOMAIN_URL = `${BASE}/workers/scripts/meu-worker/subdomain`;
const ACCOUNT_SUBDOMAIN_URL = `${BASE}/workers/subdomain`;

// Checagem de existência (PUT da CF é upsert): 404/10007 = nome livre.
const settingsNotFoundRoute = {
  method: 'GET',
  url: SCRIPT_SETTINGS_URL,
  reply: cfErrorEnvelope(10007, 'workers.api.error.script_not_found', 404),
};

type CreateBody = {
  ok: boolean;
  error?: string;
  scriptName?: string;
  worker?: Record<string, unknown>;
  scriptSubdomain?: unknown;
  accountSubdomain?: string | null;
  subdomainPending?: boolean;
  warnings?: Array<{ code: string; message: string }>;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const postContext = (body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/worker', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as CreateBody;

describe('cfpw worker-create handler', () => {
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

  it('creates the worker from template with observability enabled and enables the script subdomain', async () => {
    const { calls } = stubCloudflareFetch([
      settingsNotFoundRoute,
      { method: 'PUT', url: SCRIPT_PUT_URL, reply: { json: cfEnvelope({ id: 'meu-worker' }) } },
      {
        method: 'POST',
        url: SCRIPT_SUBDOMAIN_URL,
        reply: { json: cfEnvelope({ enabled: true, previews_enabled: true }) },
      },
      { url: ACCOUNT_SUBDOMAIN_URL, reply: { json: cfEnvelope({ subdomain: 'lcv' }) } },
    ]);

    const response = await onRequestPost(postContext({ scriptName: 'meu-worker' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.scriptName).toBe('meu-worker');
    expect(body.worker).toEqual({ id: 'meu-worker' });
    expect(body.accountSubdomain).toBe('lcv');
    expect(body.subdomainPending).toBeUndefined();
    expect(body.warnings).toEqual([]);

    const createCall = calls.find((call) => call.url === SCRIPT_PUT_URL);
    expect(createCall?.init?.method).toBe('PUT');
    const form = createCall?.init?.body as FormData;
    expect([...form.keys()]).toEqual(['metadata', 'index.js']);
    const metadata = JSON.parse(String(form.get('metadata'))) as Record<string, unknown>;
    expect(metadata.main_module).toBe('index.js');
    expect(metadata.observability).toEqual({ enabled: true });
    expect(metadata.usage_model).toBe('standard');
    expect(String(metadata.compatibility_date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const modulePart = form.get('index.js') as File;
    expect(modulePart.type).toBe('application/javascript+module');
    expect(await modulePart.text()).toContain('export default');

    const subdomainCall = calls.find((call) => call.url === SCRIPT_SUBDOMAIN_URL);
    expect(JSON.parse(String(subdomainCall?.init?.body))).toEqual({ enabled: true, previews_enabled: true });
  });

  it('rejects invalid script names with a 400 explaining the rule', async () => {
    stubCloudflareFetch([]);

    for (const scriptName of ['Meu-Worker', '-abc', 'abc-', 'a'.repeat(64), '']) {
      const response = await onRequestPost(postContext({ scriptName }));
      const body = await readBody(response);
      expect(response.status, `scriptName aceito indevidamente: ${scriptName}`).toBe(400);
      expect(body.error).toContain('scriptName inválido');
    }
  });

  it('rejects invalid JSON bodies with 400', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestPost(postContext('not-json'));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('JSON inválido');
  });

  it('maps a CF 10021 conflict to 409 with a pt-BR message', async () => {
    stubCloudflareFetch([
      settingsNotFoundRoute,
      {
        method: 'PUT',
        url: SCRIPT_PUT_URL,
        reply: cfErrorEnvelope(10021, 'A worker with this name already exists', 409),
      },
    ]);

    const response = await onRequestPost(postContext({ scriptName: 'meu-worker' }));
    const body = await readBody(response);

    expect(response.status).toBe(409);
    expect(body.error).toContain('Já existe um worker com esse nome');
    expect(body.error).toContain('10021');
  });

  it('flags subdomainPending when the account has no workers.dev subdomain', async () => {
    stubCloudflareFetch([
      settingsNotFoundRoute,
      { method: 'PUT', url: SCRIPT_PUT_URL, reply: { json: cfEnvelope({ id: 'meu-worker' }) } },
      {
        method: 'POST',
        url: SCRIPT_SUBDOMAIN_URL,
        reply: { json: cfEnvelope({ enabled: true, previews_enabled: true }) },
      },
      { url: ACCOUNT_SUBDOMAIN_URL, reply: cfErrorEnvelope(10007, 'workers.api.error.subdomain_not_found', 404) },
    ]);

    const response = await onRequestPost(postContext({ scriptName: 'meu-worker' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.subdomainPending).toBe(true);
    expect(body.accountSubdomain).toBeNull();
  });

  it('skips the script subdomain call when enableSubdomain is false', async () => {
    const { calls } = stubCloudflareFetch([
      settingsNotFoundRoute,
      { method: 'PUT', url: SCRIPT_PUT_URL, reply: { json: cfEnvelope({ id: 'meu-worker' }) } },
      { url: ACCOUNT_SUBDOMAIN_URL, reply: { json: cfEnvelope({ subdomain: 'lcv' }) } },
    ]);

    const response = await onRequestPost(postContext({ scriptName: 'meu-worker', enableSubdomain: false }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.scriptSubdomain).toBeNull();
    expect(calls.map((call) => call.url)).toEqual([SCRIPT_SETTINGS_URL, SCRIPT_PUT_URL, ACCOUNT_SUBDOMAIN_URL]);
  });

  it('returns 409 without any PUT when the worker name already exists (CF PUT is upsert)', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: SCRIPT_SETTINGS_URL, reply: { json: cfEnvelope({ compatibility_date: '2026-01-01' }) } },
    ]);

    const response = await onRequestPost(postContext({ scriptName: 'meu-worker' }));
    const body = await readBody(response);

    expect(response.status).toBe(409);
    expect(body.error).toContain('Já existe um worker com esse nome');
    expect(calls.some((call) => String(call.init?.method).toUpperCase() === 'PUT')).toBe(false);
  });

  it('never overwrites a protected production worker via create (409, no PUT)', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'GET',
        url: `${BASE}/workers/scripts/admin-motor/settings`,
        reply: { json: cfEnvelope({ compatibility_date: '2026-01-01' }) },
      },
    ]);

    const response = await onRequestPost(postContext({ scriptName: 'admin-motor' }));
    const body = await readBody(response);

    expect(response.status).toBe(409);
    expect(body.error).toContain('Já existe um worker com esse nome');
    expect(calls.some((call) => String(call.init?.method).toUpperCase() === 'PUT')).toBe(false);
  });
});
