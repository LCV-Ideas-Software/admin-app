import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestPost } from './rum';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const PROJECT_URL = `${BASE}/pages/projects/meu-projeto`;
const SITE_INFO_URL = `${BASE}/rum/site_info`;

type RumBody = {
  ok: boolean;
  error?: string;
  host?: string;
  siteTag?: string;
  snippet?: string | null;
  dashboardUrl?: string;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const postContext = (body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/page-web-analytics', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as RumBody;

const projectFixture = () =>
  cfEnvelope({
    name: 'meu-projeto',
    subdomain: 'meu-projeto.pages.dev',
    build_config: { build_command: 'npm run build' },
  });

describe('cfpw rum (page-web-analytics) handler', () => {
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

  it('creates the RUM site and links tag/token to the project build_config (read-modify-write)', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: PROJECT_URL, reply: { json: projectFixture() } },
      {
        method: 'POST',
        url: SITE_INFO_URL,
        reply: {
          json: cfEnvelope({
            site_tag: 'tag-123',
            site_token: 'tok-456',
            auto_install: true,
            snippet: '<script defer src="beacon.js"></script>',
          }),
        },
      },
      { method: 'PATCH', url: PROJECT_URL, reply: { json: cfEnvelope({ name: 'meu-projeto' }) } },
    ]);

    const response = await onRequestPost(postContext({ projectName: 'meu-projeto' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.host).toBe('meu-projeto.pages.dev');
    expect(body.siteTag).toBe('tag-123');
    expect(body.snippet).toContain('beacon.js');
    expect(body.dashboardUrl).toBe('https://dash.cloudflare.com/acct-1/web-analytics');

    expect(calls).toHaveLength(3);
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({ host: 'meu-projeto.pages.dev', auto_install: true });
    expect(JSON.parse(String(calls[2]?.init?.body))).toEqual({
      build_config: {
        build_command: 'npm run build',
        web_analytics_tag: 'tag-123',
        web_analytics_token: 'tok-456',
      },
    });
  });

  it('translates a 403 from the RUM API into the permission hint', async () => {
    stubCloudflareFetch([
      { method: 'GET', url: PROJECT_URL, reply: { json: projectFixture() } },
      { method: 'POST', url: SITE_INFO_URL, reply: cfErrorEnvelope(10000, 'Authentication error', 403) },
    ]);

    const response = await onRequestPost(postContext({ projectName: 'meu-projeto' }));
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.error).toContain('Web Analytics (RUM)');
    expect(body.error).toContain('Account Rum');
  });

  it('returns 500 with a clear message when the RUM result lacks site_tag/site_token', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: PROJECT_URL, reply: { json: projectFixture() } },
      { method: 'POST', url: SITE_INFO_URL, reply: { json: cfEnvelope({ site_tag: 'tag-123' }) } },
    ]);

    const response = await onRequestPost(postContext({ projectName: 'meu-projeto' }));
    const body = await readBody(response);

    expect(response.status).toBe(500);
    expect(body.error).toContain('site_tag/site_token');
    // Sem tag/token o build_config do projeto não é tocado.
    expect(calls.filter((call) => call.init?.method === 'PATCH')).toHaveLength(0);
  });
});
