import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestPost } from './page-deploy';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const DEPLOYMENTS_URL = `${BASE}/pages/projects/meu-projeto/deployments`;

type DeployBody = {
  ok: boolean;
  error?: string;
  branch?: string | null;
  deployment?: Record<string, unknown>;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const postContext = (body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/page-deploy', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as DeployBody;

describe('cfpw page-deploy handler', () => {
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

  it('sends multipart FormData with the branch field when branch is provided', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'POST', url: DEPLOYMENTS_URL, reply: { json: cfEnvelope({ id: 'dep-1' }) } },
    ]);

    const response = await onRequestPost(postContext({ projectName: 'meu-projeto', branch: 'develop' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.branch).toBe('develop');
    expect(calls).toHaveLength(1);
    const form = calls[0]?.init?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('branch')).toBe('develop');
  });

  it('omits the branch field to deploy the production branch', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'POST', url: DEPLOYMENTS_URL, reply: { json: cfEnvelope({ id: 'dep-2' }) } },
    ]);

    const response = await onRequestPost(postContext({ projectName: 'meu-projeto' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.branch).toBeNull();
    const form = calls[0]?.init?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect([...form.keys()]).toEqual([]);
  });

  it('maps the non-git (direct upload) CF error to 409 with the pt-BR diagnostic', async () => {
    stubCloudflareFetch([
      {
        method: 'POST',
        url: DEPLOYMENTS_URL,
        reply: cfErrorEnvelope(8000000, 'This project does not have a source connected to create deployments', 400),
      },
    ]);

    const response = await onRequestPost(postContext({ projectName: 'meu-projeto' }));
    const body = await readBody(response);

    expect(response.status).toBe(409);
    expect(body.error).toContain('Projeto de upload direto');
    expect(body.error).toContain('wrangler/CI');
  });

  it('rejects a POST without projectName', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPost(postContext({}));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('projectName');
    expect(calls).toHaveLength(0);
  });
});
