import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import {
  onRequestDelete,
  onRequestGet,
  onRequestPatch,
  onRequestPost,
  onRequestPostActivationCheck,
} from './zones-admin.ts';

const ZONES_PAGE_1_URL = 'https://api.cloudflare.com/client/v4/zones?per_page=50&page=1';
const ZONES_PAGE_2_URL = 'https://api.cloudflare.com/client/v4/zones?per_page=50&page=2';
const ZONES_URL = 'https://api.cloudflare.com/client/v4/zones';
const ZONE_1_URL = 'https://api.cloudflare.com/client/v4/zones/zone-1';
const ACTIVATION_CHECK_URL = 'https://api.cloudflare.com/client/v4/zones/zone-1/activation_check';

const ENV = { CLOUDFLARE_DNS: 'dns-token', CF_ACCOUNT_ID: 'acct-123' };

type ZoneSummary = {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  type: string;
  planLegacyId: string | null;
  planLabel: string | null;
  nameServers: string[];
  originalNameServers: string[] | null;
  critical: boolean;
};

type ZonesAdminBody = {
  ok: boolean;
  error?: string;
  zones?: ZoneSummary[];
  zone?: ZoneSummary;
  zoneId?: string;
  zoneName?: string;
};

const makeZone = (index: number, page: number) => ({
  id: `zone-p${page}-${index}`,
  name: `dominio-p${page}-${index}.com`,
  status: 'active',
  paused: false,
  type: 'full',
  plan: { legacy_id: 'free', name: 'Free Website' },
  name_servers: ['a.ns.cloudflare.com', 'b.ns.cloudflare.com'],
});

const jsonRequest = (method: string, body: unknown) =>
  new Request('https://admin.test/api/cfdns/zones-admin', {
    method,
    body: JSON.stringify(body),
  });

describe('cfdns zones-admin handler', () => {
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

  it('lists zones aggregating all pages (per_page=50) and marks the admin zone as critical', async () => {
    const page1 = [
      ...Array.from({ length: 49 }, (_, index) => makeZone(index, 1)),
      {
        id: 'zone-lcv',
        name: 'LCV.APP.BR',
        status: 'active',
        paused: false,
        type: 'full',
        plan: { legacy_id: 'pro', name: 'Pro Website' },
        name_servers: ['a.ns.cloudflare.com'],
        original_name_servers: ['ns1.registrador.com'],
      },
    ];
    const page2 = Array.from({ length: 50 }, (_, index) => makeZone(index, 2));

    stubCloudflareFetch([
      { url: ZONES_PAGE_1_URL, reply: { json: cfEnvelope(page1, { result_info: { total_pages: 2 } }) } },
      { url: ZONES_PAGE_2_URL, reply: { json: cfEnvelope(page2, { result_info: { total_pages: 2 } }) } },
    ]);

    const response = await onRequestGet({
      request: new Request('https://admin.test/api/cfdns/zones-admin'),
      env: ENV,
    });
    const body = (await response.json()) as ZonesAdminBody;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.zones).toHaveLength(100);

    const criticalZone = body.zones?.find((zone) => zone.id === 'zone-lcv');
    expect(criticalZone).toMatchObject({
      name: 'lcv.app.br',
      critical: true,
      planLegacyId: 'pro',
      planLabel: 'Pro Website',
      nameServers: ['a.ns.cloudflare.com'],
      originalNameServers: ['ns1.registrador.com'],
    });
    expect(body.zones?.filter((zone) => zone.critical)).toHaveLength(1);
  });

  it('creates a zone with the exact CF body (account id, name, type full)', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'POST',
        url: ZONES_URL,
        reply: {
          json: cfEnvelope({
            id: 'zone-new',
            name: 'nova-zona.com',
            status: 'pending',
            paused: false,
            type: 'full',
            plan: { legacy_id: 'free', name: 'Free Website' },
            name_servers: ['c.ns.cloudflare.com', 'd.ns.cloudflare.com'],
          }),
        },
      },
    ]);

    const response = await onRequestPost({
      request: jsonRequest('POST', { name: 'Nova-Zona.com' }),
      env: ENV,
    });
    const body = (await response.json()) as ZonesAdminBody;

    expect(response.status).toBe(200);
    expect(body.zone).toMatchObject({
      id: 'zone-new',
      name: 'nova-zona.com',
      status: 'pending',
      nameServers: ['c.ns.cloudflare.com', 'd.ns.cloudflare.com'],
      critical: false,
    });

    const createCall = calls.find((call) => call.url === ZONES_URL);
    expect(JSON.parse(String(createCall?.init?.body))).toEqual({
      account: { id: 'acct-123' },
      name: 'nova-zona.com',
      type: 'full',
    });
  });

  it('rejects zone creation with an implausible hostname', async () => {
    const response = await onRequestPost({
      request: jsonRequest('POST', { name: 'https://invalido' }),
      env: ENV,
    });
    const body = (await response.json()) as ZonesAdminBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('Nome de zona inválido');
  });

  it('rejects deletion when confirmName does not match the zone name', async () => {
    const { calls } = stubCloudflareFetch([
      { url: ZONE_1_URL, reply: { json: cfEnvelope({ id: 'zone-1', name: 'example.com' }) } },
    ]);

    const response = await onRequestDelete({
      request: jsonRequest('DELETE', { zoneId: 'zone-1', confirmName: 'exemplo.com' }),
      env: ENV,
    });
    const body = (await response.json()) as ZonesAdminBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('Confirmação divergente: digite exatamente o nome da zona');
    expect(calls.some((call) => String(call.init?.method).toUpperCase() === 'DELETE')).toBe(false);
  });

  it('blocks critical-zone deletion without confirmCritical and deletes with both confirmations', async () => {
    const routes = [
      { url: ZONE_1_URL, reply: { json: cfEnvelope({ id: 'zone-1', name: 'lcv.app.br' }) } },
      { method: 'DELETE', url: ZONE_1_URL, reply: { json: cfEnvelope({ id: 'zone-1' }) } },
    ];

    stubCloudflareFetch(routes);
    const blocked = await onRequestDelete({
      request: jsonRequest('DELETE', { zoneId: 'zone-1', confirmName: 'lcv.app.br' }),
      env: ENV,
    });
    const blockedBody = (await blocked.json()) as ZonesAdminBody;

    expect(blocked.status).toBe(400);
    expect(blockedBody.error).toContain('CRÍTICA');
    expect(blockedBody.error).toContain('admin-app');

    const { calls } = stubCloudflareFetch(routes);
    const allowed = await onRequestDelete({
      request: jsonRequest('DELETE', { zoneId: 'zone-1', confirmName: 'lcv.app.br', confirmCritical: true }),
      env: ENV,
    });
    const allowedBody = (await allowed.json()) as ZonesAdminBody;

    expect(allowed.status).toBe(200);
    expect(allowedBody).toMatchObject({ ok: true, zoneId: 'zone-1', zoneName: 'lcv.app.br' });
    expect(calls.some((call) => call.url === ZONE_1_URL && String(call.init?.method).toUpperCase() === 'DELETE')).toBe(
      true,
    );
  });

  it('requires both confirmations to pause the critical zone', async () => {
    stubCloudflareFetch([{ url: ZONE_1_URL, reply: { json: cfEnvelope({ id: 'zone-1', name: 'lcv.app.br' }) } }]);

    const response = await onRequestPatch({
      request: jsonRequest('PATCH', { zoneId: 'zone-1', paused: true }),
      env: ENV,
    });
    const body = (await response.json()) as ZonesAdminBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('Confirmação divergente');
  });

  it('unpauses without confirmations and sends only { paused } to CF', async () => {
    const { calls } = stubCloudflareFetch([
      { url: ZONE_1_URL, reply: { json: cfEnvelope({ id: 'zone-1', name: 'lcv.app.br' }) } },
      {
        method: 'PATCH',
        url: ZONE_1_URL,
        reply: { json: cfEnvelope({ id: 'zone-1', name: 'lcv.app.br', paused: false, status: 'active' }) },
      },
    ]);

    const response = await onRequestPatch({
      request: jsonRequest('PATCH', { zoneId: 'zone-1', paused: false }),
      env: ENV,
    });
    const body = (await response.json()) as ZonesAdminBody;

    expect(response.status).toBe(200);
    expect(body.zone?.paused).toBe(false);

    const patchCall = calls.find((call) => String(call.init?.method).toUpperCase() === 'PATCH');
    // A API de PATCH /zones/{id} aceita só 1 propriedade por chamada.
    expect(JSON.parse(String(patchCall?.init?.body))).toEqual({ paused: false });
  });

  it('pauses the critical zone with both confirmations, still sending only { paused }', async () => {
    const { calls } = stubCloudflareFetch([
      { url: ZONE_1_URL, reply: { json: cfEnvelope({ id: 'zone-1', name: 'lcv.app.br' }) } },
      {
        method: 'PATCH',
        url: ZONE_1_URL,
        reply: { json: cfEnvelope({ id: 'zone-1', name: 'lcv.app.br', paused: true, status: 'active' }) },
      },
    ]);

    const response = await onRequestPatch({
      request: jsonRequest('PATCH', {
        zoneId: 'zone-1',
        paused: true,
        confirmName: 'lcv.app.br',
        confirmCritical: true,
      }),
      env: ENV,
    });

    expect(response.status).toBe(200);
    const patchCall = calls.find((call) => String(call.init?.method).toUpperCase() === 'PATCH');
    expect(JSON.parse(String(patchCall?.init?.body))).toEqual({ paused: true });
  });

  it('maps the activation-check rate limit to the diagnostic pt-BR message', async () => {
    stubCloudflareFetch([
      {
        method: 'PUT',
        url: ACTIVATION_CHECK_URL,
        reply: cfErrorEnvelope(1224, 'You may only perform this action once per hour', 429),
      },
    ]);

    const response = await onRequestPostActivationCheck({
      request: jsonRequest('POST', { zoneId: 'zone-1' }),
      env: ENV,
    });
    const body = (await response.json()) as ZonesAdminBody;

    expect(response.status).toBe(429);
    expect(body.error).toBe(
      'Verificação de ativação limitada pela Cloudflare: a cada hora no plano Free, a cada 5 minutos nos pagos — aguarde e tente novamente',
    );
  });

  it('runs the activation check via PUT and returns ok', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'PUT', url: ACTIVATION_CHECK_URL, reply: { json: cfEnvelope({ id: 'zone-1' }) } },
    ]);

    const response = await onRequestPostActivationCheck({
      request: jsonRequest('POST', { zoneId: 'zone-1' }),
      env: ENV,
    });
    const body = (await response.json()) as ZonesAdminBody;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, zoneId: 'zone-1' });
    expect(calls.some((call) => call.url === ACTIVATION_CHECK_URL)).toBe(true);
  });
});
