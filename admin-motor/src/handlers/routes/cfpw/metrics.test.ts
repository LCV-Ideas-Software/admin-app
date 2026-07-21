import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { __resetMetricsCacheForTests, onRequestGetAccountMetrics, onRequestGetWorkerMetrics } from './metrics';

const GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';

type MetricsBody = {
  ok: boolean;
  error?: string;
  cached?: boolean;
  scope?: string;
  hours?: number;
  series?: Array<Record<string, unknown>>;
  totals?: { requests: number; errors: number; subrequests: number };
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const workerContext = (query: string) => ({
  request: new Request(`https://admin.test/api/cfpw/worker-metrics${query}`),
  env: baseEnv(),
});

const accountContext = (query: string) => ({
  request: new Request(`https://admin.test/api/cfpw/account-metrics${query}`),
  env: baseEnv(),
});

const graphqlSeries = (points: Array<Record<string, unknown>>) => ({
  data: { viewer: { accounts: [{ series: points }] } },
});

const samplePoint = {
  sum: { requests: 10, errors: 2, subrequests: 5 },
  quantiles: { cpuTimeP50: 1500, cpuTimeP99: 9000, durationP50: 2000, durationP99: 8000 },
  dimensions: { datetimeHour: '2026-07-21T10:00:00Z', scriptName: 'meu-worker' },
};

const readBody = async (response: Response) => (await response.json()) as MetricsBody;

const parseGraphqlCall = (call: { init?: RequestInit } | undefined) =>
  JSON.parse(String(call?.init?.body ?? '{}')) as { query?: string; variables?: Record<string, unknown> };

describe('cfpw metrics handler', () => {
  beforeEach(() => {
    __resetMetricsCacheForTests();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('worker-metrics sends the scriptName filter and normalizes series + totals', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'POST',
        url: GRAPHQL_URL,
        reply: {
          json: graphqlSeries([
            samplePoint,
            {
              sum: { requests: 4, errors: 1, subrequests: 3 },
              quantiles: { cpuTimeP50: 1000, cpuTimeP99: 5000, durationP50: 1000, durationP99: 4000 },
              dimensions: { datetimeHour: '2026-07-21T11:00:00Z', scriptName: 'meu-worker' },
            },
          ]),
        },
      },
    ]);

    const response = await onRequestGetWorkerMetrics(workerContext('?scriptName=meu-worker&hours=24'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.scope).toBe('worker:meu-worker');
    expect(body.hours).toBe(24);
    expect(body.series?.[0]).toEqual({
      t: '2026-07-21T10:00:00Z',
      requests: 10,
      errors: 2,
      subrequests: 5,
      cpuP50: 1500,
      cpuP99: 9000,
      durP50: 2000,
      durP99: 8000,
      scriptName: 'meu-worker',
    });
    expect(body.totals).toEqual({ requests: 14, errors: 3, subrequests: 8 });

    const { query, variables } = parseGraphqlCall(calls[0]);
    expect(query).toContain('scriptName: $scriptName');
    expect(query).toContain('datetimeHour');
    expect(query).not.toContain('datetimeFifteenMinutes');
    expect(variables?.scriptName).toBe('meu-worker');
    expect(variables?.accountTag).toBe('acct-1');
  });

  it('account-metrics omits the scriptName filter entirely', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'POST',
        url: GRAPHQL_URL,
        reply: {
          json: graphqlSeries([
            {
              sum: { requests: 7, errors: 0, subrequests: 1 },
              quantiles: { cpuTimeP50: 500, cpuTimeP99: 900, durationP50: 100, durationP99: 200 },
              dimensions: { datetimeHour: '2026-07-21T10:00:00Z' },
            },
          ]),
        },
      },
    ]);

    const body = await readBody(await onRequestGetAccountMetrics(accountContext('')));

    expect(body.ok).toBe(true);
    expect(body.scope).toBe('account');
    expect(body.hours).toBe(24);
    expect(body.series?.[0]).not.toHaveProperty('scriptName');

    const { query, variables } = parseGraphqlCall(calls[0]);
    expect(query).not.toContain('scriptName');
    expect(variables).not.toHaveProperty('scriptName');
  });

  it('uses the datetimeFifteenMinutes dimension for hours <= 6', async () => {
    const { calls } = stubCloudflareFetch([{ method: 'POST', url: GRAPHQL_URL, reply: { json: graphqlSeries([]) } }]);

    const body = await readBody(await onRequestGetWorkerMetrics(workerContext('?scriptName=meu-worker&hours=6')));

    expect(body.ok).toBe(true);
    const { query } = parseGraphqlCall(calls[0]);
    expect(query).toContain('datetimeFifteenMinutes');
    expect(query).toContain('datetimeFifteenMinutes_ASC');
    expect(query).not.toContain('datetimeHour');
  });

  it('rejects hours outside the whitelist with 400', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestGetWorkerMetrics(workerContext('?scriptName=meu-worker&hours=48'));
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain('hours inválido');
  });

  it('rejects worker-metrics without scriptName with 400', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestGetWorkerMetrics(workerContext(''));
    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('scriptName');
  });

  it('maps GraphQL auth errors (HTTP 200) to 403 suggesting Account Analytics Read', async () => {
    stubCloudflareFetch([
      {
        method: 'POST',
        url: GRAPHQL_URL,
        reply: { json: { data: null, errors: [{ message: 'not authorized to access this account' }] } },
      },
    ]);

    const response = await onRequestGetWorkerMetrics(workerContext('?scriptName=meu-worker'));
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.error).toContain('Account Analytics: Read');
    expect(body.error).toContain('CLOUDFLARE_PW');
  });

  it('maps other GraphQL errors to 502 with the first CF message', async () => {
    stubCloudflareFetch([
      {
        method: 'POST',
        url: GRAPHQL_URL,
        reply: { json: { data: null, errors: [{ message: 'unknown field durationP42' }] } },
      },
    ]);

    const response = await onRequestGetWorkerMetrics(workerContext('?scriptName=meu-worker'));
    const body = await readBody(response);

    expect(response.status).toBe(502);
    expect(body.error).toContain('unknown field durationP42');
  });

  it('serves a cache hit within the TTL without refetching', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'POST', url: GRAPHQL_URL, reply: { json: graphqlSeries([samplePoint]) } },
    ]);

    const first = await readBody(await onRequestGetWorkerMetrics(workerContext('?scriptName=meu-worker&hours=24')));
    expect(first.cached).toBe(false);
    expect(calls).toHaveLength(1);

    const second = await readBody(await onRequestGetWorkerMetrics(workerContext('?scriptName=meu-worker&hours=24')));
    expect(second.cached).toBe(true);
    expect(second.totals).toEqual(first.totals);
    expect(calls).toHaveLength(1);

    // Escopo diferente (outro hours) não reaproveita a mesma entrada.
    stubCloudflareFetch([{ method: 'POST', url: GRAPHQL_URL, reply: { json: graphqlSeries([]) } }]);
    const third = await readBody(await onRequestGetWorkerMetrics(workerContext('?scriptName=meu-worker&hours=72')));
    expect(third.cached).toBe(false);
  });

  it('returns 500 when the CLOUDFLARE_PW token is missing', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestGetWorkerMetrics({
      request: new Request('https://admin.test/api/cfpw/worker-metrics?scriptName=meu-worker'),
      env: { CF_ACCOUNT_ID: 'acct-1' },
    });
    const body = await readBody(response);

    expect(response.status).toBe(500);
    expect(body.error).toContain('CLOUDFLARE_PW');
  });
});
