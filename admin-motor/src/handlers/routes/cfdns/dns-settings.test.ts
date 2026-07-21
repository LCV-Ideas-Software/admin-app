import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestGet, onRequestPatch } from './dns-settings.ts';

const DNS_SETTINGS_URL = 'https://api.cloudflare.com/client/v4/zones/zone-1/dns_settings';

const ENV = { CLOUDFLARE_DNS: 'dns-token' };

type DnsSettingsBody = {
  ok: boolean;
  error?: string;
  zoneId?: string;
  settings?: Record<string, unknown>;
};

const CURRENT_SETTINGS = {
  flatten_all_cnames: false,
  foundation_dns: false,
  multi_provider: false,
  ns_ttl: 86400,
  secondary_overrides: false,
  zone_mode: 'standard',
  nameservers: { type: 'cloudflare.standard' },
  soa: {
    expire: 604800,
    min_ttl: 1800,
    mname: 'kristina.ns.cloudflare.com',
    refresh: 10000,
    retry: 2400,
    rname: 'admin.example.com',
    ttl: 3600,
  },
};

const patchRequest = (body: unknown) =>
  new Request('https://admin.test/api/cfdns/dns-settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

const patchSettings = (settings: Record<string, unknown>) =>
  onRequestPatch({
    request: patchRequest({ zoneId: 'zone-1', settings }),
    env: ENV,
  });

describe('cfdns dns-settings handler', () => {
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

  it('passes through the zone dns_settings on GET', async () => {
    stubCloudflareFetch([{ url: DNS_SETTINGS_URL, reply: { json: cfEnvelope(CURRENT_SETTINGS) } }]);

    const response = await onRequestGet({
      request: new Request('https://admin.test/api/cfdns/dns-settings?zoneId=zone-1'),
      env: ENV,
    });
    const body = (await response.json()) as DnsSettingsBody;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.zoneId).toBe('zone-1');
    expect(body.settings).toEqual(CURRENT_SETTINGS);
  });

  it('rejects GET without zoneId', async () => {
    const response = await onRequestGet({
      request: new Request('https://admin.test/api/cfdns/dns-settings'),
      env: ENV,
    });
    const body = (await response.json()) as DnsSettingsBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('zoneId');
  });

  it('rejects unknown settings keys naming the offender', async () => {
    const response = await patchSettings({ flatten_all_cnames: true, cname_flattening: 'flatten_all' });
    const body = (await response.json()) as DnsSettingsBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('cname_flattening');
    expect(body.error).toContain('desconhecida');
  });

  it('rejects ns_ttl out of the 30..86400 range', async () => {
    const tooLow = await patchSettings({ ns_ttl: 10 });
    const tooLowBody = (await tooLow.json()) as DnsSettingsBody;
    expect(tooLow.status).toBe(400);
    expect(tooLowBody.error).toContain('ns_ttl');

    const tooHigh = await patchSettings({ ns_ttl: 90000 });
    expect(tooHigh.status).toBe(400);

    const fractional = await patchSettings({ ns_ttl: 300.5 });
    expect(fractional.status).toBe(400);
  });

  it('requires the complete soa object when soa is present', async () => {
    const response = await patchSettings({
      soa: {
        expire: 604800,
        min_ttl: 1800,
        mname: 'kristina.ns.cloudflare.com',
        refresh: 10000,
        retry: 2400,
        rname: 'admin.example.com',
        // ttl ausente: a CF substitui o objeto inteiro, então tudo é obrigatório.
      },
    });
    const body = (await response.json()) as DnsSettingsBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('soa.ttl');
  });

  it('rejects an invalid zone_mode', async () => {
    const response = await patchSettings({ zone_mode: 'proxy_only' });
    const body = (await response.json()) as DnsSettingsBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('zone_mode inválido');
  });

  it('rejects an invalid nameservers type and ns_set out of range', async () => {
    const badType = await patchSettings({ nameservers: { type: 'custom.global' } });
    const badTypeBody = (await badType.json()) as DnsSettingsBody;
    expect(badType.status).toBe(400);
    expect(badTypeBody.error).toContain('nameservers.type');

    const badSet = await patchSettings({ nameservers: { type: 'custom.account', ns_set: 9 } });
    expect(badSet.status).toBe(400);
  });

  it('forwards only the provided keys to CF on a valid PATCH', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'PATCH',
        url: DNS_SETTINGS_URL,
        reply: { json: cfEnvelope({ ...CURRENT_SETTINGS, flatten_all_cnames: true, ns_ttl: 300 }) },
      },
    ]);

    const response = await patchSettings({ flatten_all_cnames: true, ns_ttl: 300 });
    const body = (await response.json()) as DnsSettingsBody;

    expect(response.status).toBe(200);
    expect(body.settings?.flatten_all_cnames).toBe(true);

    const patchCall = calls.find((call) => String(call.init?.method).toUpperCase() === 'PATCH');
    expect(JSON.parse(String(patchCall?.init?.body))).toEqual({ flatten_all_cnames: true, ns_ttl: 300 });
  });

  it('rejects a PATCH with an empty settings object', async () => {
    const response = await patchSettings({});
    const body = (await response.json()) as DnsSettingsBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('ao menos uma configuração DNS');
  });
});
