import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestPost } from './ops';

const postContext = (body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/ops', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  env: { CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' },
});

type OpsBody = {
  ok: boolean;
  error?: string;
};

const readBody = async (response: Response) => (await response.json()) as OpsBody;

describe('cfpw ops raw-cloudflare-request (guard anti-bypass de recursos protegidos)', () => {
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

  it('blocks mutating methods on a protected worker path with 403 and zero CF calls', async () => {
    const { calls } = stubCloudflareFetch([]);

    for (const rawMethod of ['PUT', 'PATCH', 'DELETE', 'POST']) {
      const response = await onRequestPost(
        postContext({
          action: 'raw-cloudflare-request',
          rawMethod,
          rawPath: '/accounts/acct-1/workers/scripts/admin-motor/content',
        }),
      );
      const body = await readBody(response);

      expect(response.status, `método ${rawMethod} deveria ser bloqueado`).toBe(403);
      expect(body.error).toContain('recurso de PRODUÇÃO');
    }
    expect(calls).toHaveLength(0);
  });

  it('blocks mutating methods on the protected Pages project path with 403 and zero CF calls', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPost(
      postContext({
        action: 'raw-cloudflare-request',
        rawMethod: 'PATCH',
        rawPath: '/accounts/acct-1/pages/projects/admin-app',
      }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.error).toContain('recurso de PRODUÇÃO');
    expect(calls).toHaveLength(0);
  });

  it('still allows GET diagnostics on a protected worker path', async () => {
    stubCloudflareFetch([
      {
        method: 'GET',
        url: 'https://api.cloudflare.com/client/v4/accounts/acct-1/workers/scripts/admin-motor/settings',
        reply: { json: cfEnvelope({ compatibility_date: '2026-01-01' }) },
      },
    ]);

    const response = await onRequestPost(
      postContext({
        action: 'raw-cloudflare-request',
        rawMethod: 'GET',
        rawPath: '/accounts/acct-1/workers/scripts/admin-motor/settings',
      }),
    );

    expect(response.status).toBe(200);
    expect((await readBody(response)).ok).toBe(true);
  });

  it('blocks a percent-encoded protected path (no bypass via encoding)', async () => {
    const { calls } = stubCloudflareFetch([]);

    // 'admin-motor' com o hífen percent-encoded (%2D) e o path com %2F.
    const response = await onRequestPost(
      postContext({
        action: 'raw-cloudflare-request',
        rawMethod: 'DELETE',
        rawPath: '/accounts/acct-1/workers%2Fscripts%2Fadmin%2Dmotor',
      }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.error).toContain('recurso de PRODUÇÃO');
    expect(calls).toHaveLength(0);
  });

  it('still allows mutating methods on non-protected worker paths', async () => {
    stubCloudflareFetch([
      {
        method: 'PUT',
        url: 'https://api.cloudflare.com/client/v4/accounts/acct-1/workers/scripts/worker-qualquer/schedules',
        reply: { json: cfEnvelope({ schedules: [] }) },
      },
    ]);

    const response = await onRequestPost(
      postContext({
        action: 'raw-cloudflare-request',
        rawMethod: 'PUT',
        rawPath: '/accounts/acct-1/workers/scripts/worker-qualquer/schedules',
        rawBodyJson: JSON.stringify([{ cron: '*/5 * * * *' }]),
      }),
    );

    expect(response.status).toBe(200);
    expect((await readBody(response)).ok).toBe(true);
  });
});
