import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestGet } from './page-details';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const PROJECT_URL = `${BASE}/pages/projects/meu-projeto`;
const DEPLOYMENTS_URL = `${PROJECT_URL}/deployments`;

type DetailsBody = {
  ok: boolean;
  error?: string;
  deployments?: Array<Record<string, unknown>>;
  deploymentsPagination?: { page: number; perPage: number; hasMore: boolean };
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const getContext = (query: string) => ({
  request: new Request(`https://admin.test/api/cfpw/page-details${query}`),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as DetailsBody;

describe('cfpw page-details pagination (PW-3)', () => {
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

  it('keeps the legacy behavior (no query, no pagination block) when no paging param is sent', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: PROJECT_URL, reply: { json: cfEnvelope({ name: 'meu-projeto' }) } },
      { method: 'GET', url: DEPLOYMENTS_URL, reply: { json: cfEnvelope([{ id: 'dep-1' }]) } },
    ]);

    const response = await onRequestGet(getContext('?projectName=meu-projeto'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.deployments).toHaveLength(1);
    expect(body.deploymentsPagination).toBeUndefined();
    expect(calls.some((call) => call.url === DEPLOYMENTS_URL)).toBe(true);
  });

  it('forwards page/perPage/env to the CF deployments list and reports pagination', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: PROJECT_URL, reply: { json: cfEnvelope({ name: 'meu-projeto' }) } },
      {
        method: 'GET',
        url: `${DEPLOYMENTS_URL}?page=2&per_page=10&env=preview`,
        reply: {
          json: cfEnvelope([{ id: 'dep-11' }], {
            result_info: { page: 2, per_page: 10, total_pages: 3, total_count: 25 },
          }),
        },
      },
    ]);

    const response = await onRequestGet(getContext('?projectName=meu-projeto&page=2&perPage=10&env=preview'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.deployments).toEqual([{ id: 'dep-11' }]);
    expect(body.deploymentsPagination).toEqual({ page: 2, perPage: 10, hasMore: true });
    expect(calls.some((call) => call.url === `${DEPLOYMENTS_URL}?page=2&per_page=10&env=preview`)).toBe(true);
  });

  it('rejects an invalid env filter with 400', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestGet(getContext('?projectName=meu-projeto&env=staging'));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('env');
    expect(calls).toHaveLength(0);
  });
});
