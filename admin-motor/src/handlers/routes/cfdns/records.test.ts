import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestGet } from './records.ts';

const RECORDS_URL_PATTERN = /https:\/\/api\.cloudflare\.com\/client\/v4\/zones\/zone-1\/dns_records\?/;

type RecordsBody = {
  ok: boolean;
  zoneId?: string;
  error?: string;
  records?: Array<Record<string, unknown>>;
  pagination?: {
    page: number;
    perPage: number;
    totalPages: number;
    totalCount: number;
    count: number;
  };
};

const stubRecordsList = () =>
  stubCloudflareFetch([
    {
      url: RECORDS_URL_PATTERN,
      reply: {
        json: cfEnvelope([{ id: 'rec-1', type: 'A', name: 'www.example.com', content: '192.0.2.1' }], {
          result_info: { page: 1, per_page: 100, total_pages: 1, count: 1, total_count: 1 },
        }),
      },
    },
  ]);

const listRecords = (query: string) =>
  onRequestGet({
    request: new Request(`https://admin.test/api/cfdns/records${query}`),
    env: { CLOUDFLARE_DNS: 'dns-token' },
  });

const cfQueryParams = (calls: Array<{ url: string }>) => new URL(String(calls[0]?.url)).searchParams;

describe('cfdns records handler', () => {
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

  it('lists records with the default order=type&direction=asc and keeps the response shape', async () => {
    const { calls } = stubRecordsList();

    const response = await listRecords('?zoneId=zone-1');
    const body = (await response.json()) as RecordsBody;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.zoneId).toBe('zone-1');
    expect(body.records).toHaveLength(1);
    expect(body.pagination).toEqual({ page: 1, perPage: 100, totalPages: 1, totalCount: 1, count: 1 });

    const params = cfQueryParams(calls);
    expect(params.get('order')).toBe('type');
    expect(params.get('direction')).toBe('asc');
    expect(params.get('page')).toBe('1');
    expect(params.get('per_page')).toBe('100');
  });

  it('forwards order and direction exactly as requested', async () => {
    const { calls } = stubRecordsList();

    const response = await listRecords('?zoneId=zone-1&order=name&direction=desc');

    expect(response.status).toBe(200);
    const params = cfQueryParams(calls);
    expect(params.get('order')).toBe('name');
    expect(params.get('direction')).toBe('desc');
  });

  it('rejects an unknown order field with 400 listing the valid values', async () => {
    const response = await listRecords('?zoneId=zone-1&order=created_on');
    const body = (await response.json()) as RecordsBody;

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('order');
    expect(body.error).toContain('type, name, content, ttl, proxied');
  });

  it('rejects an invalid direction with 400', async () => {
    const response = await listRecords('?zoneId=zone-1&direction=sideways');
    const body = (await response.json()) as RecordsBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('direction');
    expect(body.error).toContain('asc, desc');
  });

  it('maps search to the Cloudflare multi-property search param, never the exact-match name alias', async () => {
    const { calls } = stubRecordsList();

    const response = await listRecords('?zoneId=zone-1&search=mail');

    expect(response.status).toBe(200);
    const params = cfQueryParams(calls);
    expect(params.get('search')).toBe('mail');
    expect(params.get('name')).toBeNull();
  });

  it('maps each advanced filter to the exact Cloudflare query key', async () => {
    const { calls } = stubRecordsList();

    const response = await listRecords(
      '?zoneId=zone-1&nameContains=www&contentContains=192.0&commentContains=migrado&tagExact=team:infra&tagPresent=team&proxied=true&match=any',
    );

    expect(response.status).toBe(200);
    const params = cfQueryParams(calls);
    expect(params.get('name.contains')).toBe('www');
    expect(params.get('content.contains')).toBe('192.0');
    expect(params.get('comment.contains')).toBe('migrado');
    expect(params.get('tag.exact')).toBe('team:infra');
    expect(params.get('tag.present')).toBe('team');
    expect(params.get('proxied')).toBe('true');
    expect(params.get('match')).toBe('any');
  });

  it('maps commentPresent=true to comment.present (presence-based CF filter)', async () => {
    const { calls } = stubRecordsList();

    const response = await listRecords('?zoneId=zone-1&commentPresent=true');

    expect(response.status).toBe(200);
    const params = cfQueryParams(calls);
    expect(params.has('comment.present')).toBe(true);
    expect(params.has('comment.absent')).toBe(false);
  });

  it('maps commentPresent=false to comment.absent', async () => {
    const { calls } = stubRecordsList();

    const response = await listRecords('?zoneId=zone-1&commentPresent=false');

    expect(response.status).toBe(200);
    const params = cfQueryParams(calls);
    expect(params.has('comment.absent')).toBe(true);
    expect(params.has('comment.present')).toBe(false);
  });

  it('rejects a non-boolean commentPresent with 400', async () => {
    const response = await listRecords('?zoneId=zone-1&commentPresent=talvez');
    const body = (await response.json()) as RecordsBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('commentPresent');
  });

  it('rejects a non-boolean proxied with 400', async () => {
    const response = await listRecords('?zoneId=zone-1&proxied=sim');
    const body = (await response.json()) as RecordsBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('proxied');
  });

  it('rejects an invalid match with 400', async () => {
    const response = await listRecords('?zoneId=zone-1&match=some');
    const body = (await response.json()) as RecordsBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('match');
    expect(body.error).toContain('all, any');
  });

  it('rejects tagExact without the nome:valor format with 400', async () => {
    const response = await listRecords('?zoneId=zone-1&tagExact=semvalor');
    const body = (await response.json()) as RecordsBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('tagExact');
  });

  it('clamps perPage into 1..500 and keeps the 100 default for invalid values', async () => {
    const oversized = stubRecordsList();
    await listRecords('?zoneId=zone-1&perPage=9999');
    expect(cfQueryParams(oversized.calls).get('per_page')).toBe('500');
    vi.unstubAllGlobals();

    const allowed = stubRecordsList();
    await listRecords('?zoneId=zone-1&perPage=200');
    expect(cfQueryParams(allowed.calls).get('per_page')).toBe('200');
    vi.unstubAllGlobals();

    const invalid = stubRecordsList();
    await listRecords('?zoneId=zone-1&perPage=abc');
    expect(cfQueryParams(invalid.calls).get('per_page')).toBe('100');
  });

  it('rejects requests without zoneId', async () => {
    const response = await listRecords('');
    const body = (await response.json()) as RecordsBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('zoneId');
  });
});
