import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestGet, onRequestPatch } from './dnssec.ts';

const ZONE_URL = 'https://api.cloudflare.com/client/v4/zones/zone-1';
const DNSSEC_URL = 'https://api.cloudflare.com/client/v4/zones/zone-1/dnssec';

const ENV = { CLOUDFLARE_DNS: 'dns-token' };

type DnssecBody = {
  ok: boolean;
  error?: string;
  zoneId?: string;
  dnssec?: Record<string, unknown>;
};

const FULL_DNSSEC = {
  status: 'active',
  algorithm: '13',
  digest: 'abc123def456',
  digest_algorithm: 'SHA256',
  digest_type: '2',
  ds: 'lcv.app.br. 3600 IN DS 2371 13 2 ABC123DEF456',
  flags: 257,
  key_tag: 2371,
  key_type: 'ECDSAP256SHA256',
  public_key: 'mdsswUyr3DPW132mOi8V9xESWE8jTo0dxCjjnopKl+GqJxpVXckHAeF+KkxLbxILfDLUT0rAK9iUzy1L53eKGQ==',
  dnssec_multi_signer: false,
  dnssec_presigned: false,
  dnssec_use_nsec3: false,
  modified_on: '2026-07-01T00:00:00Z',
};

const patchRequest = (body: unknown) =>
  new Request('https://admin.test/api/cfdns/dnssec', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

describe('cfdns dnssec handler', () => {
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

  it('passes through every documented DNSSEC field on GET', async () => {
    stubCloudflareFetch([{ url: DNSSEC_URL, reply: { json: cfEnvelope(FULL_DNSSEC) } }]);

    const response = await onRequestGet({
      request: new Request('https://admin.test/api/cfdns/dnssec?zoneId=zone-1'),
      env: ENV,
    });
    const body = (await response.json()) as DnssecBody;

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.zoneId).toBe('zone-1');
    expect(body.dnssec).toEqual(FULL_DNSSEC);
  });

  it('rejects GET without zoneId', async () => {
    const response = await onRequestGet({
      request: new Request('https://admin.test/api/cfdns/dnssec'),
      env: ENV,
    });
    const body = (await response.json()) as DnssecBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('zoneId');
  });

  it('sends only the provided fields to CF, mapped to snake_case', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'PATCH',
        url: DNSSEC_URL,
        reply: { json: cfEnvelope({ ...FULL_DNSSEC, dnssec_use_nsec3: true }) },
      },
    ]);

    const response = await onRequestPatch({
      request: patchRequest({ zoneId: 'zone-1', dnssecUseNsec3: true }),
      env: ENV,
    });
    const body = (await response.json()) as DnssecBody;

    expect(response.status).toBe(200);
    expect(body.dnssec?.dnssec_use_nsec3).toBe(true);

    const patchCall = calls.find((call) => String(call.init?.method).toUpperCase() === 'PATCH');
    expect(JSON.parse(String(patchCall?.init?.body))).toEqual({ dnssec_use_nsec3: true });
  });

  it('rejects an invalid DNSSEC status', async () => {
    const response = await onRequestPatch({
      request: patchRequest({ zoneId: 'zone-1', status: 'paused' }),
      env: ENV,
    });
    const body = (await response.json()) as DnssecBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('status DNSSEC inválido');
  });

  it('blocks disabling DNSSEC on the critical zone without the reinforced confirmations', async () => {
    stubCloudflareFetch([{ url: ZONE_URL, reply: { json: cfEnvelope({ id: 'zone-1', name: 'lcv.app.br' }) } }]);

    const withoutName = await onRequestPatch({
      request: patchRequest({ zoneId: 'zone-1', status: 'disabled' }),
      env: ENV,
    });
    const withoutNameBody = (await withoutName.json()) as DnssecBody;

    expect(withoutName.status).toBe(400);
    expect(withoutNameBody.error).toContain('Confirmação divergente');

    stubCloudflareFetch([{ url: ZONE_URL, reply: { json: cfEnvelope({ id: 'zone-1', name: 'lcv.app.br' }) } }]);
    const withoutFlag = await onRequestPatch({
      request: patchRequest({ zoneId: 'zone-1', status: 'disabled', confirmName: 'lcv.app.br' }),
      env: ENV,
    });
    const withoutFlagBody = (await withoutFlag.json()) as DnssecBody;

    expect(withoutFlag.status).toBe(400);
    expect(withoutFlagBody.error).toContain('CRÍTICA');
    expect(withoutFlagBody.error).toContain('DNSSEC');
  });

  it('disables DNSSEC on the critical zone once both confirmations are given', async () => {
    const { calls } = stubCloudflareFetch([
      { url: ZONE_URL, reply: { json: cfEnvelope({ id: 'zone-1', name: 'lcv.app.br' }) } },
      {
        method: 'PATCH',
        url: DNSSEC_URL,
        reply: { json: cfEnvelope({ ...FULL_DNSSEC, status: 'disabled' }) },
      },
    ]);

    const response = await onRequestPatch({
      request: patchRequest({
        zoneId: 'zone-1',
        status: 'disabled',
        confirmName: 'lcv.app.br',
        confirmCritical: true,
      }),
      env: ENV,
    });
    const body = (await response.json()) as DnssecBody;

    expect(response.status).toBe(200);
    expect(body.dnssec?.status).toBe('disabled');

    const patchCall = calls.find((call) => String(call.init?.method).toUpperCase() === 'PATCH');
    expect(JSON.parse(String(patchCall?.init?.body))).toEqual({ status: 'disabled' });
  });

  it('disables DNSSEC on a non-critical zone without confirmations', async () => {
    const { calls } = stubCloudflareFetch([
      { url: ZONE_URL, reply: { json: cfEnvelope({ id: 'zone-1', name: 'example.com' }) } },
      {
        method: 'PATCH',
        url: DNSSEC_URL,
        reply: { json: cfEnvelope({ ...FULL_DNSSEC, status: 'disabled' }) },
      },
    ]);

    const response = await onRequestPatch({
      request: patchRequest({ zoneId: 'zone-1', status: 'disabled' }),
      env: ENV,
    });

    expect(response.status).toBe(200);
    const patchCall = calls.find((call) => String(call.init?.method).toUpperCase() === 'PATCH');
    expect(JSON.parse(String(patchCall?.init?.body))).toEqual({ status: 'disabled' });
  });

  it('rejects a PATCH without any DNSSEC field', async () => {
    const response = await onRequestPatch({
      request: patchRequest({ zoneId: 'zone-1' }),
      env: ENV,
    });
    const body = (await response.json()) as DnssecBody;

    expect(response.status).toBe(400);
    expect(body.error).toContain('ao menos um campo DNSSEC');
  });
});
