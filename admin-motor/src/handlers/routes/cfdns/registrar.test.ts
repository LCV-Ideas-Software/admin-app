import { afterEach, describe, expect, it, vi } from 'vitest';

import { onRequestGetRegistration, onRequestGetRegistrations } from './registrar.ts';

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
});
