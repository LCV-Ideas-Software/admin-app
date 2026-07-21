import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestPost } from './worker-deployments';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const DEPLOYMENTS_URL = `${BASE}/workers/scripts/meu-worker/deployments`;

type DeploymentsBody = {
  ok: boolean;
  error?: string;
  deployment?: Record<string, unknown>;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const postContext = (body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/worker-deployments', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as DeploymentsBody;

describe('cfpw worker-deployments handler', () => {
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

  it('deploys a single version at 100% with the default annotation message', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'POST', url: DEPLOYMENTS_URL, reply: { json: cfEnvelope({ id: 'dep-2' }) } },
    ]);

    const response = await onRequestPost(
      postContext({ scriptName: 'meu-worker', versions: [{ versionId: 'v1', percentage: 100 }] }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.deployment).toEqual({ id: 'dep-2' });

    expect(calls[0]?.url).toBe(DEPLOYMENTS_URL);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      strategy: 'percentage',
      versions: [{ version_id: 'v1', percentage: 100 }],
      annotations: { 'workers/message': 'Deploy via admin-app' },
    });
  });

  it('supports a two-version gradual deploy with custom message and force=true', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'POST', url: `${DEPLOYMENTS_URL}?force=true`, reply: { json: cfEnvelope({ id: 'dep-3' }) } },
    ]);

    const response = await onRequestPost(
      postContext({
        scriptName: 'meu-worker',
        versions: [
          { versionId: 'v1', percentage: 90 },
          { versionId: 'v2', percentage: 10 },
        ],
        message: 'canary 10%',
        force: true,
      }),
    );

    expect(response.status).toBe(200);
    expect(calls[0]?.url).toBe(`${DEPLOYMENTS_URL}?force=true`);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      strategy: 'percentage',
      versions: [
        { version_id: 'v1', percentage: 90 },
        { version_id: 'v2', percentage: 10 },
      ],
      annotations: { 'workers/message': 'canary 10%' },
    });
  });

  it('rejects percentages that do not sum exactly 100', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPost(
      postContext({
        scriptName: 'meu-worker',
        versions: [
          { versionId: 'v1', percentage: 60 },
          { versionId: 'v2', percentage: 50 },
        ],
      }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('somar exatamente 100');
    expect(calls).toHaveLength(0);
  });

  it('rejects more than two versions', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestPost(
      postContext({
        scriptName: 'meu-worker',
        versions: [
          { versionId: 'v1', percentage: 40 },
          { versionId: 'v2', percentage: 30 },
          { versionId: 'v3', percentage: 30 },
        ],
      }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('1 ou 2 versões');
  });

  it('rejects non-integer percentages', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestPost(
      postContext({
        scriptName: 'meu-worker',
        versions: [
          { versionId: 'v1', percentage: 50.5 },
          { versionId: 'v2', percentage: 49.5 },
        ],
      }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('inteiro entre 1 e 100');
  });

  it('blocks a protected worker deploy without the confirm phrase', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPost(
      postContext({ scriptName: 'tlsrpt-motor', versions: [{ versionId: 'v1', percentage: 100 }] }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.error).toContain('worker de PRODUÇÃO');
    expect(body.error).toContain('EU ENTENDO O RISCO');
    expect(calls).toHaveLength(0);
  });

  it('allows a protected worker deploy with the exact confirm phrase', async () => {
    stubCloudflareFetch([
      {
        method: 'POST',
        url: `${BASE}/workers/scripts/tlsrpt-motor/deployments`,
        reply: { json: cfEnvelope({ id: 'dep-9' }) },
      },
    ]);

    const response = await onRequestPost(
      postContext({
        scriptName: 'tlsrpt-motor',
        versions: [{ versionId: 'v1', percentage: 100 }],
        confirmPhrase: 'EU ENTENDO O RISCO',
      }),
    );

    expect(response.status).toBe(200);
    expect((await readBody(response)).deployment).toEqual({ id: 'dep-9' });
  });
});
