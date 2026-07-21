import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  onRequestGetRegistration,
  onRequestGetRegistrationStatus,
  onRequestGetRegistrations,
  onRequestGetUpdateStatus,
  onRequestPatchRegistration,
  onRequestPostCheck,
  onRequestPostRegistration,
  onRequestPutDomain,
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

  it('treats missing Registrar workflows as an empty status instead of a gateway error', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const target = String(input);
      expect(target).toMatch(/\/registrar\/registrations\/lcvmail\.com\/(registration-status|update-status)$/);

      return new Response(
        JSON.stringify({
          success: false,
          errors: [
            {
              code: 10000,
              message: 'No workflow found for lcvmail.com',
            },
          ],
        }),
        { status: 404 },
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    const registrationResponse = await onRequestGetRegistrationStatus({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/registration-status?domain=lcvmail.com'),
      env: {
        CLOUDFLARE_DNS: 'dns-token',
        CF_ACCOUNT_ID: 'acct-123',
      },
    });
    const updateResponse = await onRequestGetUpdateStatus({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/update-status?domain=lcvmail.com'),
      env: {
        CLOUDFLARE_DNS: 'dns-token',
        CF_ACCOUNT_ID: 'acct-123',
      },
    });

    expect(registrationResponse.status).toBe(200);
    expect(updateResponse.status).toBe(200);
    await expect(registrationResponse.json()).resolves.toMatchObject({
      ok: true,
      status: null,
      workflow_missing: true,
    });
    await expect(updateResponse.json()).resolves.toMatchObject({
      ok: true,
      status: null,
      workflow_missing: true,
    });
  });

  it('maps unexpected Registrar workflow failures to 500 (502 would be swallowed by the CF edge)', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            errors: [
              {
                code: 1000,
                message: 'Unexpected Cloudflare Registrar workflow failure',
              },
            ],
          }),
          { status: 500 },
        ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestGetRegistrationStatus({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/registration-status?domain=lcvmail.com'),
      env: {
        CLOUDFLARE_DNS: 'dns-token',
        CF_ACCOUNT_ID: 'acct-123',
      },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('Unexpected Cloudflare Registrar workflow failure'),
    });
  });

  it('checks valid domains and skips malformed ones instead of failing the batch', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('https://api.cloudflare.com/client/v4/accounts/acct-123/registrar/domain-check');
      expect(JSON.parse(String(init?.body))).toEqual({ domains: ['good.dev'] });

      return new Response(
        JSON.stringify({
          success: true,
          result: {
            domains: [
              {
                name: 'good.dev',
                registrable: true,
                pricing: { currency: 'USD', registration_cost: '10.11', renewal_cost: '10.11' },
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
        body: JSON.stringify({ domains: ['good.dev', 'bad domain'] }),
      }),
      env: { CLOUDFLARE_DNS: 'dns-token', CF_ACCOUNT_ID: 'acct-123' },
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      ok: boolean;
      domains: Array<{ name: string }>;
      skipped: string[];
    };
    expect(payload.ok).toBe(true);
    expect(payload.domains.map((domain) => domain.name)).toEqual(['good.dev']);
    expect(payload.skipped).toEqual(['bad domain']);
  });

  it('rejects a domain-check batch where every domain is malformed', async () => {
    const response = await onRequestPostCheck({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/check', {
        method: 'POST',
        body: JSON.stringify({ domains: ['bad domain', '.nope'] }),
      }),
      env: { CLOUDFLARE_DNS: 'dns-token', CF_ACCOUNT_ID: 'acct-123' },
    });

    expect(response.status).toBe(400);
  });

  it('surfaces Cloudflare rate-limiting (HTTP 429) instead of flattening to 500', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: false, errors: [{ code: 971, message: 'rate limited' }] }), {
          status: 429,
        }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestGetRegistrations({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/registrations'),
      env: { CLOUDFLARE_DNS: 'dns-token', CF_ACCOUNT_ID: 'acct-123' },
    });

    expect(response.status).toBe(429);
  });

  it('returns 500 (configuration error) when the Cloudflare token is missing', async () => {
    const response = await onRequestGetRegistrations({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/registrations'),
      env: { CF_ACCOUNT_ID: 'acct-123' },
    });

    expect(response.status).toBe(500);
  });

  it('surfaces a Cloudflare domain-check rejection (HTTP 400) as 400, not a 500 upstream error', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            errors: [{ code: 1003, message: 'None of the provided domains are valid or have supported extensions' }],
          }),
          { status: 400 },
        ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPostCheck({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/check', {
        method: 'POST',
        body: JSON.stringify({ domains: ['naoexiste.zz'] }),
      }),
      env: { CLOUDFLARE_DNS: 'dns-token', CF_ACCOUNT_ID: 'acct-123' },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('None of the provided domains are valid or have supported extensions'),
    });
  });

  it('treats an HTTP 404 with code 10000 as workflow_missing but surfaces other 404s as errors', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: false, errors: [{ code: 7003, message: 'Could not route request' }] }), {
          status: 404,
        }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestGetRegistrationStatus({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/registration-status?domain=lcvmail.com'),
      env: { CLOUDFLARE_DNS: 'dns-token', CF_ACCOUNT_ID: 'acct-123' },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining('Could not route request'),
    });
  });

  it('paginates the registrations list until every page is fetched', async () => {
    const pages = [
      {
        result: [{ domain_name: 'aaa.com', status: 'active' }],
        result_info: { page: 1, per_page: 1, total_pages: 2, count: 1, total_count: 2 },
      },
      {
        result: [{ domain_name: 'bbb.com', status: 'active' }],
        result_info: { page: 2, per_page: 1, total_pages: 2, count: 1, total_count: 2 },
      },
    ];
    let call = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (call === 0) {
        expect(url).toBe('https://api.cloudflare.com/client/v4/accounts/acct-123/registrar/registrations');
      } else {
        expect(url).toContain('page=2');
      }
      const body = pages[call];
      call += 1;
      return new Response(JSON.stringify({ success: true, ...body }), { status: 200 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestGetRegistrations({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/registrations'),
      env: { CLOUDFLARE_DNS: 'dns-token', CF_ACCOUNT_ID: 'acct-123' },
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { registrations: Array<{ domain_name: string }> };
    expect(payload.registrations.map((registration) => registration.domain_name)).toEqual(['aaa.com', 'bbb.com']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('updates registrar domain lock and privacy via the legacy domains endpoint', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        'https://api.cloudflare.com/client/v4/accounts/acct-123/registrar/domains/lcvmail.com',
      );
      expect(init?.method).toBe('PUT');
      expect(JSON.parse(String(init?.body))).toEqual({ locked: true, privacy: false });

      return new Response(JSON.stringify({ success: true, result: {} }), { status: 200 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPutDomain({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/domain?domain=lcvmail.com', {
        method: 'PUT',
        body: JSON.stringify({ locked: true, privacy: false }),
      }),
      env: { CLOUDFLARE_DNS: 'dns-token', CF_ACCOUNT_ID: 'acct-123' },
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { ok: boolean; account: { accountId: string } };
    expect(payload.ok).toBe(true);
    expect(payload.account.accountId).toBe('acct-123');
  });

  it('rejects a domain settings update with neither locked nor privacy', async () => {
    const response = await onRequestPutDomain({
      request: new Request('https://admin.lcv.dev/api/cfdns/registrar/domain?domain=lcvmail.com', {
        method: 'PUT',
        body: JSON.stringify({}),
      }),
      env: { CLOUDFLARE_DNS: 'dns-token', CF_ACCOUNT_ID: 'acct-123' },
    });

    expect(response.status).toBe(400);
  });
});
