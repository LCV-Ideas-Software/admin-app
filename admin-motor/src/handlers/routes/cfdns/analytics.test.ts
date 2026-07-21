import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestGetBytime, onRequestGetTop } from './analytics.ts';

const CF_BASE = 'https://api.cloudflare.com/client/v4';

type AnalyticsBody = {
  ok: boolean;
  zoneId?: string;
  error?: string;
  report?: Record<string, unknown>;
};

const BYTIME_REPORT = {
  rows: 2,
  data: [
    {
      dimensions: ['NOERROR'],
      metrics: [
        [10, 20],
        [1, 2],
        [0, 0],
      ],
    },
  ],
  totals: { queryCount: 30, uncachedCount: 3, staleCount: 0 },
  min: { queryCount: 10 },
  max: { queryCount: 20 },
  query: { metrics: ['queryCount', 'uncachedCount', 'staleCount'] },
  time_intervals: [
    ['2026-07-19T12:00:00Z', '2026-07-19T13:00:00Z'],
    ['2026-07-19T13:00:00Z', '2026-07-19T14:00:00Z'],
  ],
};

const getBytime = (query: string) =>
  onRequestGetBytime({
    request: new Request(`https://admin.test/api/cfdns/analytics/bytime${query}`),
    env: { CLOUDFLARE_DNS: 'dns-token' },
  });

const getTop = (query: string) =>
  onRequestGetTop({
    request: new Request(`https://admin.test/api/cfdns/analytics/top${query}`),
    env: { CLOUDFLARE_DNS: 'dns-token' },
  });

describe('cfdns analytics handlers', () => {
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

  it('assembles the exact bytime query with time_delta=hour for a 24h window and passes the report through', async () => {
    const { calls } = stubCloudflareFetch([
      { url: /\/dns_analytics\/report\/bytime\?/, reply: { json: cfEnvelope(BYTIME_REPORT) } },
    ]);

    const response = await getBytime('?zoneId=zone-1&since=2026-07-19T12:00:00.000Z&until=2026-07-20T12:00:00.000Z');
    const body = (await response.json()) as AnalyticsBody;

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      `${CF_BASE}/zones/zone-1/dns_analytics/report/bytime?metrics=queryCount%2CuncachedCount%2CstaleCount&dimensions=responseCode&since=2026-07-19T12%3A00%3A00.000Z&until=2026-07-20T12%3A00%3A00.000Z&time_delta=hour`,
    );
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.zoneId).toBe('zone-1');
    expect(body.report).toEqual(BYTIME_REPORT);
  });

  it('uses time_delta=day for a 7-day window', async () => {
    const { calls } = stubCloudflareFetch([
      { url: /\/dns_analytics\/report\/bytime\?/, reply: { json: cfEnvelope(BYTIME_REPORT) } },
    ]);

    const response = await getBytime('?zoneId=zone-1&since=2026-07-13T12:00:00.000Z&until=2026-07-20T12:00:00.000Z');

    expect(response.status).toBe(200);
    expect(calls[0]?.url).toContain('time_delta=day');
  });

  it('rejects an invalid since with 400 before hitting Cloudflare', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await getBytime('?zoneId=zone-1&since=nao-e-data&until=2026-07-20T12:00:00.000Z');
    const body = (await response.json()) as AnalyticsBody;

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('since');
    expect(calls).toHaveLength(0);
  });

  it('rejects since >= until with 400', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await getBytime('?zoneId=zone-1&since=2026-07-20T12:00:00.000Z&until=2026-07-20T12:00:00.000Z');
    const body = (await response.json()) as AnalyticsBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('anterior a until');
    expect(calls).toHaveLength(0);
  });

  it('rejects a top dimension outside the whitelist with a 400 listing valid values', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await getTop(
      '?zoneId=zone-1&dimension=origem&since=2026-07-19T12:00:00.000Z&until=2026-07-20T12:00:00.000Z',
    );
    const body = (await response.json()) as AnalyticsBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('dimension');
    expect(body.error).toContain('queryName, queryType, responseCode');
    expect(calls).toHaveLength(0);
  });

  it('assembles the exact top query and passes the report through', async () => {
    const topReport = {
      rows: 1,
      data: [{ dimensions: ['lcv.app.br'], metrics: [42] }],
      totals: { queryCount: 42 },
      min: {},
      max: {},
      query: { dimensions: ['queryName'] },
    };
    const { calls } = stubCloudflareFetch([
      { url: /\/dns_analytics\/report\?/, reply: { json: cfEnvelope(topReport) } },
    ]);

    const response = await getTop(
      '?zoneId=zone-1&dimension=queryName&since=2026-07-19T12:00:00.000Z&until=2026-07-20T12:00:00.000Z',
    );
    const body = (await response.json()) as AnalyticsBody;

    expect(calls[0]?.url).toBe(
      `${CF_BASE}/zones/zone-1/dns_analytics/report?metrics=queryCount&dimensions=queryName&sort=-queryCount&limit=15&since=2026-07-19T12%3A00%3A00.000Z&until=2026-07-20T12%3A00%3A00.000Z`,
    );
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.report).toEqual(topReport);
  });

  it('translates a Cloudflare 400 (window beyond retention) into a pt-BR message mentioning retention', async () => {
    stubCloudflareFetch([
      {
        url: /\/dns_analytics\/report\/bytime\?/,
        reply: cfErrorEnvelope(6003, 'since cannot be older than the retention period', 400),
      },
    ]);

    const response = await getBytime('?zoneId=zone-1&since=2025-01-01T00:00:00.000Z&until=2026-07-20T12:00:00.000Z');
    const body = (await response.json()) as AnalyticsBody;

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('retenção');
    expect(body.error).toContain('8 dias');
    expect(body.error).toContain('6003');
  });

  it('returns 500 when the Cloudflare token is missing', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestGetBytime({
      request: new Request(
        'https://admin.test/api/cfdns/analytics/bytime?zoneId=zone-1&since=2026-07-19T12:00:00.000Z&until=2026-07-20T12:00:00.000Z',
      ),
      env: {},
    });
    const body = (await response.json()) as AnalyticsBody;

    expect(response.status).toBe(500);
    expect(body.error).toContain('Token Cloudflare ausente');
    expect(calls).toHaveLength(0);
  });
});
