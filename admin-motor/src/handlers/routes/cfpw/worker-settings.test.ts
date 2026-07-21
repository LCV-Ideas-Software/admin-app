import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestGet, onRequestPatch } from './worker-settings';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const SETTINGS_URL = `${BASE}/workers/scripts/meu-worker/settings`;

type SettingsBody = {
  ok: boolean;
  error?: string;
  settings?: Record<string, unknown>;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const getContext = (query: string) => ({
  request: new Request(`https://admin.test/api/cfpw/worker-settings${query}`),
  env: baseEnv(),
});

const patchContext = (body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/worker-settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as SettingsBody;

describe('cfpw worker-settings handler', () => {
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

  it('returns the CF script settings as passthrough on GET', async () => {
    stubCloudflareFetch([
      {
        url: SETTINGS_URL,
        reply: {
          json: cfEnvelope({
            bindings: [{ type: 'plain_text', name: 'MODO', text: 'producao' }],
            compatibility_date: '2026-01-01',
            usage_model: 'standard',
            observability: { enabled: true },
          }),
        },
      },
    ]);

    const response = await onRequestGet(getContext('?scriptName=meu-worker'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.settings).toMatchObject({
      compatibility_date: '2026-01-01',
      usage_model: 'standard',
      observability: { enabled: true },
    });
  });

  it('rejects GET without scriptName', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestGet(getContext(''));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('scriptName');
  });

  it('builds the multipart settings part preserving binding order and never leaking secret values', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'PATCH', url: SETTINGS_URL, reply: { json: cfEnvelope({ bindings: [] }) } },
    ]);

    const bindings = [
      { type: 'inherit', name: 'BIGDATA_DB' },
      { type: 'plain_text', name: 'MODO', text: 'producao' },
      { type: 'secret_text', name: 'API_KEY' },
    ];

    const response = await onRequestPatch(patchContext({ scriptName: 'meu-worker', settings: { bindings } }));

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe('PATCH');

    const form = calls[0]?.init?.body as FormData;
    expect([...form.keys()]).toEqual(['settings']);
    const settingsPart = form.get('settings') as File;
    expect(settingsPart.type).toBe('application/json');

    const rawJson = await settingsPart.text();
    const parsed = JSON.parse(rawJson) as { bindings: Array<Record<string, unknown>> };
    expect(parsed).toEqual({ bindings });
    // Ordem exata preservada e binding secret sem nenhum valor de secret.
    expect(parsed.bindings.map((binding) => binding.name)).toEqual(['BIGDATA_DB', 'MODO', 'API_KEY']);
    expect(JSON.stringify(parsed.bindings[2])).toBe('{"type":"secret_text","name":"API_KEY"}');
  });

  it('rejects secret_text bindings carrying a text value', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPatch(
      patchContext({
        scriptName: 'meu-worker',
        settings: { bindings: [{ type: 'secret_text', name: 'API_KEY', text: 'valor-super-secreto' }] },
      }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('secrets são gerenciados pelo fluxo de secrets');
    expect(calls).toHaveLength(0);
  });

  it('rejects settings keys outside the whitelist', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestPatch(
      patchContext({ scriptName: 'meu-worker', settings: { main_module: 'index.js' } }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('Chaves não suportadas em settings: main_module');
  });

  it('rejects a future compatibility_date', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestPatch(
      patchContext({ scriptName: 'meu-worker', settings: { compatibility_date: '2999-01-01' } }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('futuro');
  });

  it('rejects an out-of-range observability head_sampling_rate', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestPatch(
      patchContext({
        scriptName: 'meu-worker',
        settings: { observability: { enabled: true, head_sampling_rate: 0 } },
      }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('head_sampling_rate');
  });

  it('blocks a protected worker PATCH without the confirm phrase', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPatch(patchContext({ scriptName: 'admin-motor', settings: { logpush: true } }));
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.error).toContain('EU ENTENDO O RISCO');
    expect(calls).toHaveLength(0);
  });

  it('allows a protected worker PATCH with the exact confirm phrase', async () => {
    stubCloudflareFetch([
      {
        method: 'PATCH',
        url: `${BASE}/workers/scripts/admin-motor/settings`,
        reply: { json: cfEnvelope({ logpush: true }) },
      },
    ]);

    const response = await onRequestPatch(
      patchContext({
        scriptName: 'admin-motor',
        settings: { logpush: true },
        confirmPhrase: 'EU ENTENDO O RISCO',
      }),
    );

    expect(response.status).toBe(200);
    expect((await readBody(response)).settings).toEqual({ logpush: true });
  });
});
