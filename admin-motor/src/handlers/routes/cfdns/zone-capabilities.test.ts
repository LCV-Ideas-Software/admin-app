import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestGet } from './zone-capabilities.ts';

const ZONE_URL = 'https://api.cloudflare.com/client/v4/zones/zone-1';

type CapabilitiesBody = {
  ok: boolean;
  zoneId?: string;
  error?: string;
  tagsSupported?: boolean;
  commentMaxLength?: number;
  batchOpsLimit?: number;
  analyticsRetentionDays?: number;
  planLabel?: string | null;
  status?: string | null;
  paused?: boolean;
  nameServers?: string[];
  originalNameServers?: string[] | null;
};

const stubZone = (zone: Record<string, unknown>) =>
  stubCloudflareFetch([{ url: ZONE_URL, reply: { json: cfEnvelope(zone) } }]);

const getCapabilities = (query = '?zoneId=zone-1') =>
  onRequestGet({
    request: new Request(`https://admin.test/api/cfdns/zone-capabilities${query}`),
    env: { CLOUDFLARE_DNS: 'dns-token' },
  });

describe('cfdns zone-capabilities handler', () => {
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

  it('derives free-plan limits (no tags, smaller comment/batch/retention caps)', async () => {
    stubZone({
      status: 'active',
      paused: false,
      name_servers: ['a.ns.cloudflare.com', 'b.ns.cloudflare.com'],
      original_name_servers: ['ns1.registrador.com', 'ns2.registrador.com'],
      plan: { legacy_id: 'free', name: 'Free Website' },
    });

    const response = await getCapabilities();
    const body = (await response.json()) as CapabilitiesBody;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      zoneId: 'zone-1',
      tagsSupported: false,
      commentMaxLength: 100,
      batchOpsLimit: 200,
      analyticsRetentionDays: 8,
      planLabel: 'Free Website',
      status: 'active',
      paused: false,
      nameServers: ['a.ns.cloudflare.com', 'b.ns.cloudflare.com'],
      originalNameServers: ['ns1.registrador.com', 'ns2.registrador.com'],
    });
  });

  it('derives enterprise-plan limits (tags supported, largest retention)', async () => {
    stubZone({
      status: 'active',
      paused: false,
      name_servers: ['a.ns.cloudflare.com'],
      plan: { legacy_id: 'enterprise', name: 'Enterprise Website' },
    });

    const response = await getCapabilities();
    const body = (await response.json()) as CapabilitiesBody;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      tagsSupported: true,
      commentMaxLength: 500,
      batchOpsLimit: 3500,
      analyticsRetentionDays: 62,
      planLabel: 'Enterprise Website',
      originalNameServers: null,
    });
  });

  it('derives pro-plan retention of 31 days', async () => {
    stubZone({ plan: { legacy_id: 'pro', name: 'Pro Website' } });

    const body = (await (await getCapabilities()).json()) as CapabilitiesBody;

    expect(body.tagsSupported).toBe(true);
    expect(body.analyticsRetentionDays).toBe(31);
  });

  it('returns 404 with the diagnostic pt-BR message when the zone does not exist', async () => {
    stubCloudflareFetch([{ url: ZONE_URL, reply: cfErrorEnvelope(7003, 'Could not route request', 404) }]);

    const response = await getCapabilities();
    const body = (await response.json()) as CapabilitiesBody;

    expect(response.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('não encontrado');
    expect(body.error).toContain('7003');
  });

  it('rejects requests without zoneId', async () => {
    const response = await getCapabilities('');
    const body = (await response.json()) as CapabilitiesBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('zoneId');
  });
});
