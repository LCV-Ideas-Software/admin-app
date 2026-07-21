import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { PROTECTED_CONFIRM_PHRASE } from './_protected';
import { onRequestPost } from './delete-worker';

const SCRIPT_URL = (scriptName: string) =>
  `https://api.cloudflare.com/client/v4/accounts/acct-1/workers/scripts/${scriptName}`;

type DeleteBody = {
  ok: boolean;
  error?: string;
  message?: string;
};

const postContext = (body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/delete-worker', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  env: { CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' },
});

const readBody = async (response: Response) => (await response.json()) as DeleteBody;

describe('cfpw delete-worker handler (guard de worker protegido)', () => {
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

  it('returns 403 and never calls the CF API when deleting admin-motor without the confirm phrase', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPost(postContext({ scriptName: 'admin-motor', confirmation: 'admin-motor' }));
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error).toContain(PROTECTED_CONFIRM_PHRASE);
    expect(calls).toHaveLength(0);
  });

  it('deletes admin-motor when the exact confirm phrase is sent', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'DELETE', url: SCRIPT_URL('admin-motor'), reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestPost(
      postContext({
        scriptName: 'admin-motor',
        confirmation: 'admin-motor',
        confirmPhrase: PROTECTED_CONFIRM_PHRASE,
      }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(calls.filter((call) => call.init?.method === 'DELETE')).toHaveLength(1);
  });

  it('deletes a non-protected worker without requiring the confirm phrase', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'DELETE', url: SCRIPT_URL('worker-qualquer'), reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestPost(
      postContext({ scriptName: 'worker-qualquer', confirmation: 'worker-qualquer' }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(calls.filter((call) => call.init?.method === 'DELETE')).toHaveLength(1);
  });
});
