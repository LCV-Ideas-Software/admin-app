import { describe, expect, it } from 'vitest';
import { resolveAdminBearerToken, validatePutAuth } from './auth.ts';

describe('resolveAdminBearerToken', () => {
  it('prefers the dedicated ADMIN_BEARER_TOKEN over CLOUDFLARE_PW', () => {
    expect(resolveAdminBearerToken({ ADMIN_BEARER_TOKEN: 'dedicated', CLOUDFLARE_PW: 'cf-account-token' })).toBe(
      'dedicated',
    );
  });

  it('falls back to CLOUDFLARE_PW when no dedicated bearer is configured', () => {
    expect(resolveAdminBearerToken({ CLOUDFLARE_PW: 'cf-account-token' })).toBe('cf-account-token');
  });

  it('returns undefined when neither secret is set, and ignores blank values', () => {
    expect(resolveAdminBearerToken({})).toBeUndefined();
    expect(resolveAdminBearerToken({ ADMIN_BEARER_TOKEN: '   ', CLOUDFLARE_PW: '  ' })).toBeUndefined();
  });
});

describe('validatePutAuth', () => {
  it('accepts a valid bearer token in constant time flow', async () => {
    const request = new Request('https://admin.lcv.app.br/api/test', {
      headers: { Authorization: 'Bearer super-secret-token' },
    });

    const result = await validatePutAuth(request, 'super-secret-token');

    expect(result.isAuthenticated).toBe(true);
    expect(result.source).toBe('bearer');
  });

  it('rejects bearer-only browser requests without Cloudflare Access', async () => {
    const request = new Request('https://admin.lcv.app.br/api/test', {
      headers: {
        Authorization: 'Bearer super-secret-token',
        Origin: 'https://admin.lcv.app.br',
        'Sec-Fetch-Mode': 'cors',
      },
    });

    const result = await validatePutAuth(request, 'super-secret-token');

    expect(result.isAuthenticated).toBe(false);
    expect(result.source).toBe('bearer');
    expect(result.error).toContain('Bearer-only');
  });

  it('fails closed when CF Access audience is missing', async () => {
    const request = new Request('https://admin.lcv.app.br/api/test', {
      headers: {
        'CF-Access-Authenticated-User-Email': 'admin@lcv.app.br',
        'CF-Access-JWT-Assertion': 'header.payload.signature',
      },
    });

    const result = await validatePutAuth(request, undefined, {
      teamDomain: 'lcv',
      enforcement: 'block',
    });

    expect(result.isAuthenticated).toBe(false);
    expect(result.source).toBe('cloudflare-access');
    expect(result.error).toContain('audience');
  });
});
