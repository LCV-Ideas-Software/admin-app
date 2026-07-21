import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestGet } from './overview';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const SCRIPTS_URL = `${BASE}/workers/scripts`;
const PAGES_URL = `${BASE}/pages/projects`;

type OverviewBody = {
  ok: boolean;
  error?: string;
  summary?: { totalWorkers: number; totalPages: number };
  workers?: Array<{ scriptName: string }>;
  workersPagination?: { page: number; perPage: number; totalCount?: number; hasMore: boolean };
  searchFallback?: boolean;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const getContext = (query = '') => ({
  request: new Request(`https://admin.test/api/cfpw/overview${query}`),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as OverviewBody;

describe('cfpw overview handler (pagination/search)', () => {
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

  it('keeps the full-list behavior when no search/pagination params are sent', async () => {
    const { calls } = stubCloudflareFetch([
      { url: SCRIPTS_URL, reply: { json: cfEnvelope([{ id: 'w1' }, { id: 'w2' }]) } },
      { url: PAGES_URL, reply: { json: cfEnvelope([]) } },
    ]);

    const response = await onRequestGet(getContext());
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.summary?.totalWorkers).toBe(2);
    expect(body.workersPagination).toBeUndefined();
    expect(body.searchFallback).toBeUndefined();
    expect(calls.map((call) => call.url).sort()).toEqual([PAGES_URL, SCRIPTS_URL]);
  });

  it('uses the scripts-search endpoint when q is present and reports pagination', async () => {
    const { calls } = stubCloudflareFetch([
      {
        url: `${BASE}/workers/scripts-search?name=motor&page=1&per_page=20`,
        reply: { json: cfEnvelope([{ id: 'admin-motor' }], { result_info: { total_count: 1 } }) },
      },
      { url: PAGES_URL, reply: { json: cfEnvelope([]) } },
    ]);

    const response = await onRequestGet(getContext('?q=motor'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.workers?.map((worker) => worker.scriptName)).toEqual(['admin-motor']);
    expect(body.workersPagination).toEqual({ page: 1, perPage: 20, totalCount: 1, hasMore: false });
    expect(body.summary?.totalWorkers).toBe(1);
    expect(body.searchFallback).toBeUndefined();
    expect(calls[0]?.url).toBe(`${BASE}/workers/scripts-search?name=motor&page=1&per_page=20`);
  });

  it('falls back to the full list with local filter/slice when scripts-search returns 404', async () => {
    stubCloudflareFetch([
      {
        url: `${BASE}/workers/scripts-search?name=motor&page=1&per_page=1`,
        reply: cfErrorEnvelope(7003, 'Could not route request', 404),
      },
      {
        url: SCRIPTS_URL,
        reply: { json: cfEnvelope([{ id: 'admin-motor' }, { id: 'tlsrpt-motor' }, { id: 'outro' }]) },
      },
      { url: PAGES_URL, reply: { json: cfEnvelope([]) } },
    ]);

    const response = await onRequestGet(getContext('?q=motor&workersPage=1&workersPerPage=1'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.searchFallback).toBe(true);
    expect(body.workers?.map((worker) => worker.scriptName)).toEqual(['admin-motor']);
    expect(body.workersPagination).toEqual({ page: 1, perPage: 1, totalCount: 2, hasMore: true });
    expect(body.summary?.totalWorkers).toBe(2);
  });

  it('rejects non-integer pagination params with 400', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestGet(getContext('?workersPage=abc'));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('inteiros positivos');
  });
});
