import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestDelete, onRequestGet } from './page-deployment';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const DEPLOYMENT_URL = `${BASE}/pages/projects/meu-projeto/deployments/dep-1`;
const LOGS_URL = `${DEPLOYMENT_URL}/history/logs`;

type DeploymentBody = {
  ok: boolean;
  error?: string;
  deployment?: Record<string, unknown> | null;
  logs?: Record<string, unknown> | null;
  warnings?: Array<{ code?: string; message?: string }>;
  deleted?: boolean;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const getContext = (query: string) => ({
  request: new Request(`https://admin.test/api/cfpw/page-deployment${query}`),
  env: baseEnv(),
});

const deleteContext = (query: string) => ({
  request: new Request(`https://admin.test/api/cfpw/page-deployment${query}`, { method: 'DELETE' }),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as DeploymentBody;

describe('cfpw page-deployment handler', () => {
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

  it('fetches only the logs when logsOnly=true (cheap polling)', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: LOGS_URL, reply: { json: cfEnvelope({ total: 2, data: [{ line: 'build ok' }] }) } },
    ]);

    const response = await onRequestGet(getContext('?projectName=meu-projeto&deploymentId=dep-1&logsOnly=true'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.logs).toMatchObject({ total: 2 });
    expect(body.deployment).toBeUndefined();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(LOGS_URL);
  });

  it('returns deployment detail and logs in parallel without warnings', async () => {
    stubCloudflareFetch([
      {
        method: 'GET',
        url: DEPLOYMENT_URL,
        reply: {
          json: cfEnvelope({
            id: 'dep-1',
            environment: 'production',
            stages: [{ name: 'build', status: 'success' }],
            deployment_trigger: { type: 'github:push', metadata: { branch: 'main' } },
          }),
        },
      },
      { method: 'GET', url: LOGS_URL, reply: { json: cfEnvelope({ total: 1, data: [] }) } },
    ]);

    const response = await onRequestGet(getContext('?projectName=meu-projeto&deploymentId=dep-1'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.deployment).toMatchObject({ id: 'dep-1', environment: 'production' });
    expect(body.logs).toMatchObject({ total: 1 });
    expect(body.warnings).toEqual([]);
  });

  it('degrades to a partial warning when only the logs fail', async () => {
    stubCloudflareFetch([
      { method: 'GET', url: DEPLOYMENT_URL, reply: { json: cfEnvelope({ id: 'dep-1' }) } },
      { method: 'GET', url: LOGS_URL, reply: cfErrorEnvelope(7003, 'Could not route to logs', 404) },
    ]);

    const response = await onRequestGet(getContext('?projectName=meu-projeto&deploymentId=dep-1'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.deployment).toMatchObject({ id: 'dep-1' });
    expect(body.logs).toBeNull();
    expect(body.warnings?.[0]?.code).toBe('CFPW-PAGE-DEPLOYMENT-PARTIAL-LOGS');
  });

  it('deletes the deployment with force=true', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'DELETE', url: `${DEPLOYMENT_URL}?force=true`, reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestDelete(deleteContext('?projectName=meu-projeto&deploymentId=dep-1'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.deleted).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe('DELETE');
  });

  it('rejects GET without deploymentId', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestGet(getContext('?projectName=meu-projeto'));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('deploymentId');
    expect(calls).toHaveLength(0);
  });
});
