import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestGet, onRequestPostRecheck } from './page-domain';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const DOMAIN_URL = `${BASE}/pages/projects/meu-projeto/domains/www.exemplo.com.br`;

type DomainBody = {
  ok: boolean;
  error?: string;
  domain?: Record<string, unknown>;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const getContext = (query: string) => ({
  request: new Request(`https://admin.test/api/cfpw/page-domain${query}`),
  env: baseEnv(),
});

const recheckContext = (body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/page-domain-recheck', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as DomainBody;

describe('cfpw page-domain handlers', () => {
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

  it('returns the CF domain detail as passthrough on GET', async () => {
    stubCloudflareFetch([
      {
        method: 'GET',
        url: DOMAIN_URL,
        reply: {
          json: cfEnvelope({
            name: 'www.exemplo.com.br',
            status: 'pending',
            verification_data: { status: 'pending', error_message: null },
            validation_data: { status: 'initializing', method: 'http' },
            certificate_authority: 'google',
            zone_tag: 'zone-1',
          }),
        },
      },
    ]);

    const response = await onRequestGet(getContext('?projectName=meu-projeto&domainName=www.exemplo.com.br'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.domain).toMatchObject({
      status: 'pending',
      certificate_authority: 'google',
      verification_data: { status: 'pending' },
      validation_data: { method: 'http' },
      zone_tag: 'zone-1',
    });
  });

  it('rejects GET without projectName or domainName', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestGet(getContext('?projectName=meu-projeto'));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('domainName');
    expect(calls).toHaveLength(0);
  });

  it('rechecks the domain via PATCH with no body (retry validation semantics)', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'PATCH',
        url: DOMAIN_URL,
        reply: { json: cfEnvelope({ name: 'www.exemplo.com.br', status: 'active' }) },
      },
    ]);

    const response = await onRequestPostRecheck(
      recheckContext({ projectName: 'meu-projeto', domainName: 'www.exemplo.com.br' }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.domain).toMatchObject({ status: 'active' });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe('PATCH');
    expect(calls[0]?.init?.body).toBeUndefined();
  });
});
