import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import {
  CfApiError,
  cfApiRequest,
  cfApiRequestRaw,
  cfCursorPaginate,
  cfPagePaginate,
  resolveCfToken,
  translateCloudflareError,
} from './cf-api-core';

const expectCfApiError = async (promise: Promise<unknown>): Promise<CfApiError> => {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(CfApiError);
    return error as CfApiError;
  }
  throw new Error('Esperava CfApiError, mas a promise resolveu.');
};

describe('cf-api-core', () => {
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

  describe('resolveCfToken', () => {
    it('resolves each product to its dedicated secret', () => {
      const env = {
        CLOUDFLARE_DNS: 'dns-token',
        CLOUDFLARE_PW: 'pw-token',
        CLOUDFLARE_CACHE: 'cache-token',
        CLOUDFLARE_STORAGE: 'storage-token',
      };

      expect(resolveCfToken(env, 'dns')).toBe('dns-token');
      expect(resolveCfToken(env, 'pw')).toBe('pw-token');
      expect(resolveCfToken(env, 'cache')).toBe('cache-token');
      expect(resolveCfToken(env, 'storage')).toBe('storage-token');
    });

    it('keeps the legacy dns fallback chain (DNS → PW → CACHE)', () => {
      expect(resolveCfToken({ CLOUDFLARE_PW: 'pw-token', CLOUDFLARE_CACHE: 'cache-token' }, 'dns')).toBe('pw-token');
      expect(resolveCfToken({ CLOUDFLARE_CACHE: 'cache-token' }, 'dns')).toBe('cache-token');
      expect(resolveCfToken({}, 'dns')).toBeNull();
      expect(console.warn).toHaveBeenCalledTimes(2);
    });

    it('does not add fallbacks for pw and cache', () => {
      expect(resolveCfToken({ CLOUDFLARE_DNS: 'dns-token', CLOUDFLARE_CACHE: 'cache-token' }, 'pw')).toBeNull();
      expect(resolveCfToken({ CLOUDFLARE_DNS: 'dns-token', CLOUDFLARE_PW: 'pw-token' }, 'cache')).toBeNull();
    });

    it('falls back from storage to CLOUDFLARE_PW with a warning', () => {
      expect(resolveCfToken({ CLOUDFLARE_PW: 'pw-token' }, 'storage')).toBe('pw-token');
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(resolveCfToken({}, 'storage')).toBeNull();
    });
  });

  describe('cfApiRequest', () => {
    it('sends the bearer token and unwraps the envelope result', async () => {
      const { calls } = stubCloudflareFetch([
        {
          url: 'https://api.cloudflare.com/client/v4/zones?per_page=50',
          reply: { json: cfEnvelope([{ id: 'zone-1' }], { result_info: { page: 1, total_pages: 1 } }) },
        },
      ]);

      const payload = await cfApiRequest<Array<{ id: string }>>(
        { CLOUDFLARE_CACHE: 'cache-token' },
        'cache',
        '/zones?per_page=50',
        'Falha ao listar zonas',
      );

      expect(payload.result).toEqual([{ id: 'zone-1' }]);
      expect(payload.resultInfo).toEqual({ page: 1, total_pages: 1 });
      expect(calls).toHaveLength(1);
      expect(new Headers(calls[0]?.init?.headers).get('Authorization')).toBe('Bearer cache-token');
    });

    it('throws CfApiError 500 naming the exact missing secret per product', async () => {
      const dnsError = await expectCfApiError(cfApiRequest({}, 'dns', '/zones', 'Falha ao listar zonas'));
      expect(dnsError.status).toBe(500);
      expect(dnsError.ptBr).toContain('CLOUDFLARE_DNS');
      expect(dnsError.ptBr).toContain('Secrets Store');

      const pwError = await expectCfApiError(
        cfApiRequest({ CLOUDFLARE_DNS: 'dns-token' }, 'pw', '/accounts', 'Falha ao listar contas'),
      );
      expect(pwError.status).toBe(500);
      expect(pwError.ptBr).toContain('CLOUDFLARE_PW');

      const storageError = await expectCfApiError(cfApiRequest({}, 'storage', '/accounts', 'Falha no storage'));
      expect(storageError.status).toBe(500);
      expect(storageError.ptBr).toContain('CLOUDFLARE_STORAGE');
      expect(storageError.ptBr).toContain('CLOUDFLARE_PW');
    });

    it('retries GET once on 429 honoring Retry-After', async () => {
      const { calls } = stubCloudflareFetch([
        {
          url: 'https://api.cloudflare.com/client/v4/zones',
          reply: {
            status: 429,
            json: { success: false, errors: [{ code: 971, message: 'rate limited' }], messages: [], result: null },
            headers: { 'Retry-After': '0' },
          },
        },
      ]);

      const error = await expectCfApiError(
        cfApiRequest({ CLOUDFLARE_PW: 'pw-token' }, 'pw', '/zones', 'Falha ao listar zonas'),
      );

      expect(error.status).toBe(429);
      expect(error.ptBr).toContain('Limite de requisições da API Cloudflare');
      expect(error.ptBr).toContain('971');
      expect(calls).toHaveLength(2);
    });

    it('does not retry a 429 on POST', async () => {
      const { calls } = stubCloudflareFetch([
        {
          url: 'https://api.cloudflare.com/client/v4/zones/zone-1/purge_cache',
          reply: {
            status: 429,
            json: { success: false, errors: [{ code: 971, message: 'rate limited' }], messages: [], result: null },
            headers: { 'Retry-After': '0' },
          },
        },
      ]);

      const error = await expectCfApiError(
        cfApiRequest({ CLOUDFLARE_CACHE: 'cache-token' }, 'cache', '/zones/zone-1/purge_cache', 'Falha no purge', {
          method: 'POST',
          body: JSON.stringify({ purge_everything: true }),
        }),
      );

      expect(error.status).toBe(429);
      expect(calls).toHaveLength(1);
    });

    it('rejects an HTML body with status and preview in the pt-BR message', async () => {
      stubCloudflareFetch([
        {
          url: 'https://api.cloudflare.com/client/v4/zones',
          reply: { status: 502, body: '<!DOCTYPE html><html><body>Bad gateway</body></html>' },
        },
      ]);

      const error = await expectCfApiError(
        cfApiRequest({ CLOUDFLARE_PW: 'pw-token' }, 'pw', '/zones', 'Falha ao listar zonas'),
      );

      expect(error.status).toBe(502);
      expect(error.ptBr).toContain('HTML');
      expect(error.ptBr).toContain('HTTP 502');
      expect(error.ptBr).toContain('<!DOCTYPE html>');
    });

    it('rejects a non-JSON body with status and preview in the pt-BR message', async () => {
      stubCloudflareFetch([
        { url: 'https://api.cloudflare.com/client/v4/zones', reply: { status: 200, body: 'upstream falou texto' } },
      ]);

      const error = await expectCfApiError(
        cfApiRequest({ CLOUDFLARE_PW: 'pw-token' }, 'pw', '/zones', 'Falha ao listar zonas'),
      );

      expect(error.ptBr).toContain('não-JSON');
      expect(error.ptBr).toContain('HTTP 200');
      expect(error.ptBr).toContain('upstream falou texto');
    });

    it('translates permission failures with cause and raw CF code', async () => {
      stubCloudflareFetch([
        {
          url: 'https://api.cloudflare.com/client/v4/accounts',
          reply: cfErrorEnvelope(10000, 'Authentication error', 401),
        },
      ]);

      const error = await expectCfApiError(
        cfApiRequest({ CLOUDFLARE_PW: 'pw-token' }, 'pw', '/accounts', 'Falha ao listar contas'),
      );

      expect(error.status).toBe(401);
      expect(error.code).toBe(10000);
      expect(error.apiMessage).toBe('Authentication error');
      expect(error.ptBr).toContain('Token Cloudflare sem permissão ou inválido');
      expect(error.ptBr).toContain('código CF 10000: Authentication error');
    });

    it('translates 7003 as resource not found with the raw CF detail', async () => {
      stubCloudflareFetch([
        {
          url: 'https://api.cloudflare.com/client/v4/accounts/acct-1/registrar/registrations',
          reply: cfErrorEnvelope(7003, 'Could not route request', 404),
        },
      ]);

      const error = await expectCfApiError(
        cfApiRequest(
          { CLOUDFLARE_DNS: 'dns-token' },
          'dns',
          '/accounts/acct-1/registrar/registrations',
          'Falha ao listar registros',
        ),
      );

      expect(error.status).toBe(404);
      expect(error.code).toBe(7003);
      expect(error.ptBr).toContain('Recurso não encontrado na Cloudflare');
      expect(error.ptBr).toContain('código CF 7003: Could not route request');
    });
  });

  describe('cfApiRequestRaw', () => {
    it('returns the raw response untouched for passthrough flows', async () => {
      stubCloudflareFetch([
        {
          url: 'https://api.cloudflare.com/client/v4/accounts/acct-1/storage/download',
          reply: { status: 200, body: 'BINARIO', headers: { 'Content-Type': 'application/octet-stream' } },
        },
      ]);

      const response = await cfApiRequestRaw(
        { CLOUDFLARE_STORAGE: 'storage-token' },
        'storage',
        '/accounts/acct-1/storage/download',
        'Falha no download',
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
      await expect(response.text()).resolves.toBe('BINARIO');
    });

    it('translates CF error JSON on failures and falls back to the HTTP status otherwise', async () => {
      stubCloudflareFetch([
        {
          url: 'https://api.cloudflare.com/client/v4/private',
          reply: cfErrorEnvelope(9109, 'Invalid access token', 403),
        },
        { url: 'https://api.cloudflare.com/client/v4/broken', reply: { status: 404, body: 'not json' } },
      ]);

      const denied = await expectCfApiError(
        cfApiRequestRaw({ CLOUDFLARE_PW: 'pw-token' }, 'pw', '/private', 'Falha na operação raw'),
      );
      expect(denied.status).toBe(403);
      expect(denied.ptBr).toContain('Token Cloudflare sem permissão ou inválido');
      expect(denied.ptBr).toContain('código CF 9109: Invalid access token');

      const broken = await expectCfApiError(
        cfApiRequestRaw({ CLOUDFLARE_PW: 'pw-token' }, 'pw', '/broken', 'Falha na operação raw'),
      );
      expect(broken.status).toBe(404);
      expect(broken.ptBr).toBe('Falha na operação raw (HTTP 404)');
    });
  });

  describe('translateCloudflareError', () => {
    it('maps the known failure families to diagnostic pt-BR messages', () => {
      expect(translateCloudflareError(429, [], 'Falha')).toContain('Limite de requisições');
      expect(translateCloudflareError(429, [{ code: 971, message: 'rate limited' }], 'Falha')).toContain(
        'código CF 971',
      );
      expect(translateCloudflareError(400, [{ code: 81057, message: 'Record already exists.' }], 'Falha')).toContain(
        'já existente/conflitante',
      );
      expect(translateCloudflareError(400, [{ code: 81044, message: 'Record does not exist.' }], 'Falha')).toContain(
        'recarregue a lista',
      );
      expect(translateCloudflareError(400, [{ code: 10021, message: 'name taken' }], 'Falha')).toContain(
        'Já existe um recurso com esse nome',
      );
      expect(translateCloudflareError(500, [], 'Falha')).toBe(
        'Falha temporária na API da Cloudflare (HTTP 500) — tente novamente em instantes',
      );
      expect(translateCloudflareError(403, [], 'Falha')).toContain('verifique as permissões do token');
    });

    it('keeps the fallback with raw CF detail for unmapped failures', () => {
      expect(translateCloudflareError(418, [{ code: 1234, message: 'teapot' }], 'Falha na operação')).toBe(
        'Falha na operação (código CF 1234: teapot)',
      );
      expect(translateCloudflareError(400, [], 'Falha na operação')).toBe('Falha na operação (HTTP 400)');
    });
  });

  describe('cfPagePaginate', () => {
    it('stops at totalPages', async () => {
      const fetchPage = vi.fn(async (page: number) => ({ items: [`item-${page}`], totalPages: 3 }));

      await expect(cfPagePaginate(fetchPage)).resolves.toEqual(['item-1', 'item-2', 'item-3']);
      expect(fetchPage).toHaveBeenCalledTimes(3);
    });

    it('stops at maxPages even when the API reports more pages', async () => {
      const fetchPage = vi.fn(async (page: number) => ({ items: [page], totalPages: 10 }));

      await expect(cfPagePaginate(fetchPage, { maxPages: 2 })).resolves.toEqual([1, 2]);
      expect(fetchPage).toHaveBeenCalledTimes(2);
    });
  });

  describe('cfCursorPaginate', () => {
    it('follows the cursor chain and stops on null', async () => {
      const fetchPage = vi.fn(async (cursor: string | null) => {
        if (cursor === null) {
          return { items: ['a'], cursor: 'cursor-1' };
        }
        if (cursor === 'cursor-1') {
          return { items: ['b'], cursor: 'cursor-2' };
        }
        return { items: ['c'], cursor: null };
      });

      await expect(cfCursorPaginate(fetchPage)).resolves.toEqual(['a', 'b', 'c']);
      expect(fetchPage).toHaveBeenNthCalledWith(1, null);
      expect(fetchPage).toHaveBeenNthCalledWith(2, 'cursor-1');
      expect(fetchPage).toHaveBeenNthCalledWith(3, 'cursor-2');
    });

    it('stops at maxPages on a runaway cursor', async () => {
      const fetchPage = vi.fn(async () => ({ items: ['x'], cursor: 'loop' }));

      await expect(cfCursorPaginate(fetchPage, { maxPages: 3 })).resolves.toEqual(['x', 'x', 'x']);
      expect(fetchPage).toHaveBeenCalledTimes(3);
    });
  });
});
