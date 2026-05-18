import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  onRequestGetRegistration,
  onRequestGetRegistrations,
  onRequestPatchRegistration,
  onRequestPostCheck,
  onRequestPostRegistration,
} from './registrar.ts';

describe('cfdns registrar routes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists Cloudflare Registrar registrations using the existing Cloudflare token resolver', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.cloudflare.com/client/v4/accounts/acct-123/registrar/registrations');
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer dns-token');

      return new Response(
        JSON.stringify({
          success: true,
          result: [
            {
              domain_name: 'LCVMAIL.COM',
              status: 'active',
              created_at: '2026-01-01T00:00:00Z',
              expires_at: '2027-01-01T00:00:00Z',
              auto_renew: true,
              privacy_mode: 'redaction',
              locked: true,
            },
          ],
          result_info: {
            page: 1,
            per_page: 20,
            total_pages: 1,
            count: 1,
            total_count: 1,
          },
        }),
        { status: 200 },
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestGetRegistrations({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/registrations'),
      env: {
        CLOUDFLARE_DNS: 'dns-token',
        CF_ACCOUNT_ID: 'acct-123',
      },
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      ok: boolean;
      registrations: Array<{
        domain_name: string;
        auto_renew: boolean;
        locked: boolean;
      }>;
      account: { accountId: string; source: string };
    };

    expect(payload.ok).toBe(true);
    expect(payload.account).toMatchObject({
      accountId: 'acct-123',
      source: 'CF_ACCOUNT_ID',
    });
    expect(payload.registrations).toEqual([
      {
        domain_name: 'lcvmail.com',
        status: 'active',
        created_at: '2026-01-01T00:00:00Z',
        expires_at: '2027-01-01T00:00:00Z',
        auto_renew: true,
        privacy_mode: 'redaction',
        locked: true,
      },
    ]);
  });

  it('rejects registration detail requests without a domain', async () => {
    const response = await onRequestGetRegistration({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/registration'),
      env: {
        CLOUDFLARE_DNS: 'dns-token',
        CF_ACCOUNT_ID: 'acct-123',
      },
    });

    expect(response.status).toBe(400);
    const payload = (await response.json()) as { ok: boolean; error: string };
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain('domain');
  });

  it('checks domain availability before registration', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.cloudflare.com/client/v4/accounts/acct-123/registrar/domain-check');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({ domains: ['newbrand.dev'] });

      return new Response(
        JSON.stringify({
          success: true,
          result: {
            domains: [
              {
                name: 'newbrand.dev',
                registrable: true,
                pricing: {
                  currency: 'USD',
                  registration_cost: '10.11',
                  renewal_cost: '10.11',
                },
                tier: 'standard',
              },
            ],
          },
        }),
        { status: 200 },
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPostCheck({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/check', {
        method: 'POST',
        body: JSON.stringify({ domains: ['newbrand.dev'] }),
      }),
      env: {
        CLOUDFLARE_DNS: 'dns-token',
        CF_ACCOUNT_ID: 'acct-123',
      },
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; domains: Array<{ name: string; registrable: boolean }> };
    expect(payload.ok).toBe(true);
    expect(payload.domains).toEqual([
      {
        name: 'newbrand.dev',
        registrable: true,
        pricing: {
          currency: 'USD',
          registration_cost: '10.11',
          renewal_cost: '10.11',
        },
        reason: null,
        tier: 'standard',
      },
    ]);
  });

  it('starts billable registration workflows asynchronously', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.cloudflare.com/client/v4/accounts/acct-123/registrar/registrations');
      expect(init?.method).toBe('POST');
      expect(new Headers(init?.headers).get('Prefer')).toBe('respond-async');
      expect(JSON.parse(String(init?.body))).toEqual({
        domain_name: 'newbrand.dev',
        auto_renew: true,
        privacy_mode: 'redaction',
        years: 1,
      });

      return new Response(
        JSON.stringify({
          success: true,
          result: {
            state: 'pending',
            completed: false,
            links: {
              self: '/accounts/acct-123/registrar/registrations/newbrand.dev/registration-status',
            },
          },
        }),
        { status: 202 },
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPostRegistration({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/registrations', {
        method: 'POST',
        body: JSON.stringify({
          domain_name: 'newbrand.dev',
          auto_renew: true,
          privacy_mode: 'redaction',
          years: 1,
        }),
      }),
      env: {
        CLOUDFLARE_DNS: 'dns-token',
        CF_ACCOUNT_ID: 'acct-123',
      },
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; status: { state: string; completed: boolean } };
    expect(payload.ok).toBe(true);
    expect(payload.status).toMatchObject({ state: 'pending', completed: false });
  });

  it('updates auto-renew through the current registration endpoint', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        'https://api.cloudflare.com/client/v4/accounts/acct-123/registrar/registrations/lcvmail.com',
      );
      expect(init?.method).toBe('PATCH');
      expect(JSON.parse(String(init?.body))).toEqual({ auto_renew: false });

      return new Response(
        JSON.stringify({
          success: true,
          result: {
            state: 'in_progress',
            completed: false,
          },
        }),
        { status: 202 },
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPatchRegistration({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/registration?domain=lcvmail.com', {
        method: 'PATCH',
        body: JSON.stringify({ auto_renew: false }),
      }),
      env: {
        CLOUDFLARE_DNS: 'dns-token',
        CF_ACCOUNT_ID: 'acct-123',
      },
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; status: { state: string } };
    expect(payload.ok).toBe(true);
    expect(payload.status.state).toBe('in_progress');
  });
});
