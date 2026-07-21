import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestPost } from './observability';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const LIVE_TAIL_URL = `${BASE}/workers/observability/telemetry/live-tail`;
const HEARTBEAT_URL = `${BASE}/workers/observability/telemetry/live-tail/heartbeat`;

type ObsBody = {
  ok: boolean;
  error?: string;
  result?: Record<string, unknown>;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const postContext = (body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/observability', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as ObsBody;

describe('cfpw observability live-tail actions', () => {
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

  it('live-tail-start forwards the client body and passes the CF result through', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'POST',
        url: LIVE_TAIL_URL,
        reply: { json: { success: true, errors: [], result: { id: 'lt-1', expiresAt: 1752000000 } } },
      },
    ]);

    const response = await onRequestPost(
      postContext({ action: 'live-tail-start', body: { scriptId: 'meu-worker', filters: [] } }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.result).toEqual({ id: 'lt-1', expiresAt: 1752000000 });
    const forwarded = JSON.parse(String(calls[0]?.init?.body ?? '{}')) as Record<string, unknown>;
    expect(forwarded).toEqual({ scriptId: 'meu-worker', filters: [] });
  });

  it('live-tail-start maps a CF 404 to the pt-BR unavailable message', async () => {
    stubCloudflareFetch([
      {
        method: 'POST',
        url: LIVE_TAIL_URL,
        reply: { status: 404, json: { success: false, errors: [{ message: 'not found' }] } },
      },
    ]);

    const response = await onRequestPost(postContext({ action: 'live-tail-start', body: {} }));
    const body = await readBody(response);

    expect(response.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Live tail da Observability indisponível na conta');
    expect(body.error).toContain('modo polling');
  });

  it('live-tail-heartbeat forwards the body to the heartbeat endpoint', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'POST',
        url: HEARTBEAT_URL,
        reply: { json: { success: true, errors: [], result: { alive: true } } },
      },
    ]);

    const response = await onRequestPost(postContext({ action: 'live-tail-heartbeat', body: { id: 'lt-1' } }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.result).toEqual({ alive: true });
    const forwarded = JSON.parse(String(calls[0]?.init?.body ?? '{}')) as Record<string, unknown>;
    expect(forwarded).toEqual({ id: 'lt-1' });
  });
});
