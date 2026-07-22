import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestGet, onRequestPut } from './worker-code';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const CONTENT_URL = `${BASE}/workers/scripts/meu-worker/content/v2`;
const CONTENT_PUT_URL = `${BASE}/workers/scripts/meu-worker/content`;
const SETTINGS_URL = `${BASE}/workers/scripts/meu-worker/settings`;
const SCRIPTS_LIST_URL = `${BASE}/workers/scripts`;

type CodeBody = {
  ok: boolean;
  error?: string;
  modules?: Array<{ name: string; content: string; contentType: string; binary: boolean }>;
  mainModule?: string | null;
  compatibilityDate?: string | null;
  etag?: string;
  deployed?: boolean;
  warnings?: Array<{ code: string; message: string }>;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const getContext = (query: string) => ({
  request: new Request(`https://admin.test/api/cfpw/worker-code${query}`),
  env: baseEnv(),
});

const putContext = (body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/worker-code', {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as CodeBody;

describe('cfpw worker-code handler', () => {
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

  it('parses a multipart response into text and base64 binary modules with etag and settings', async () => {
    const upstreamForm = new FormData();
    upstreamForm.append(
      'index.js',
      new Blob(['export default {}'], { type: 'application/javascript+module' }),
      'index.js',
    );
    upstreamForm.append(
      'lib.wasm',
      new Blob([new Uint8Array([0x00, 0x61, 0x73, 0x6d])], { type: 'application/wasm' }),
      'lib.wasm',
    );

    stubCloudflareFetch([
      { url: CONTENT_URL, reply: { body: upstreamForm } },
      {
        url: SETTINGS_URL,
        reply: { json: cfEnvelope({ main_module: 'index.js', compatibility_date: '2026-01-01' }) },
      },
      { url: SCRIPTS_LIST_URL, reply: { json: cfEnvelope([{ id: 'meu-worker', etag: 'etag-abc' }]) } },
    ]);

    const response = await onRequestGet(getContext('?scriptName=meu-worker'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.modules).toEqual([
      {
        name: 'index.js',
        content: 'export default {}',
        contentType: 'application/javascript+module',
        binary: false,
      },
      { name: 'lib.wasm', content: 'AGFzbQ==', contentType: 'application/wasm', binary: true },
    ]);
    expect(body.mainModule).toBe('index.js');
    expect(body.compatibilityDate).toBe('2026-01-01');
    expect(body.etag).toBe('etag-abc');
    expect(body.warnings).toEqual([]);
  });

  it('wraps a single-body script into one module named from the CF-worker-main-module header', async () => {
    stubCloudflareFetch([
      {
        url: CONTENT_URL,
        reply: {
          body: 'export default { fetch: () => new Response("ok") }',
          headers: { 'Content-Type': 'application/javascript', 'CF-worker-main-module': 'main.js' },
        },
      },
      { url: SETTINGS_URL, reply: { json: cfEnvelope({}) } },
      { url: SCRIPTS_LIST_URL, reply: { json: cfEnvelope([{ id: 'meu-worker', etag: 'etag-abc' }]) } },
    ]);

    const body = await readBody(await onRequestGet(getContext('?scriptName=meu-worker')));

    expect(body.ok).toBe(true);
    expect(body.modules).toHaveLength(1);
    expect(body.modules?.[0]?.name).toBe('main.js');
    expect(body.modules?.[0]?.binary).toBe(false);
    expect(body.mainModule).toBe('main.js');
  });

  it('rejects GET without scriptName', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestGet(getContext(''));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('scriptName');
  });

  it('passes a CF 404 through with the translated message', async () => {
    stubCloudflareFetch([
      { url: CONTENT_URL, reply: cfErrorEnvelope(10007, 'workers.api.error.script_not_found', 404) },
    ]);

    const response = await onRequestGet(getContext('?scriptName=meu-worker'));
    const body = await readBody(response);

    expect(response.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error).toContain('10007');
  });

  it('uploads metadata and module parts as multipart on PUT and reports deployed', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'PUT', url: CONTENT_PUT_URL, reply: { json: cfEnvelope({ id: 'meu-worker' }) } },
    ]);

    const response = await onRequestPut(
      putContext({
        scriptName: 'meu-worker',
        modules: [{ name: 'index.js', content: 'export default {}' }],
        mainModule: 'index.js',
      }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.deployed).toBe(true);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe('PUT');
    const form = calls[0]?.init?.body as FormData;
    expect([...form.keys()]).toEqual(['metadata', 'index.js']);
    const metadataPart = form.get('metadata') as File;
    expect(metadataPart.type).toBe('application/json');
    expect(JSON.parse(await metadataPart.text())).toEqual({ main_module: 'index.js' });
    const modulePart = form.get('index.js') as File;
    expect(modulePart.type).toBe('application/javascript+module');
    expect(modulePart.name).toBe('index.js');
    expect(await modulePart.text()).toBe('export default {}');
  });

  it('preserves each text module content type when rebuilding the multipart payload', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'PUT', url: CONTENT_PUT_URL, reply: { json: cfEnvelope({ id: 'meu-worker' }) } },
    ]);

    const response = await onRequestPut(
      putContext({
        scriptName: 'meu-worker',
        modules: [
          {
            name: 'index.js',
            content: 'import config from "./config.json"; export default config;',
            contentType: 'application/javascript+module',
          },
          { name: 'config.json', content: '{"enabled":true}', contentType: 'application/json' },
          { name: 'message.txt', content: 'olá', contentType: 'text/plain' },
        ],
        mainModule: 'index.js',
      }),
    );

    expect(response.status).toBe(200);
    const form = calls[0]?.init?.body as FormData;
    expect((form.get('index.js') as File).type).toBe('application/javascript+module');
    expect((form.get('config.json') as File).type).toBe('application/json');
    expect((form.get('message.txt') as File).type).toBe('text/plain');
  });

  it('rejects binary modules on PUT with 400', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPut(
      putContext({
        scriptName: 'meu-worker',
        modules: [{ name: 'lib.wasm', content: 'AGFzbQ==', binary: true }],
        mainModule: 'lib.wasm',
      }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('binário');
    expect(calls).toHaveLength(0);
  });

  it('rejects PUT when mainModule does not reference an uploaded module', async () => {
    stubCloudflareFetch([]);

    const response = await onRequestPut(
      putContext({
        scriptName: 'meu-worker',
        modules: [{ name: 'index.js', content: 'export default {}' }],
        mainModule: 'outro.js',
      }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('mainModule');
  });

  it('blocks a protected worker PUT without the confirm phrase (403, no upstream call)', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPut(
      putContext({
        scriptName: 'admin-motor',
        modules: [{ name: 'index.js', content: 'export default {}' }],
        mainModule: 'index.js',
      }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.error).toContain('worker de PRODUÇÃO');
    expect(body.error).toContain('EU ENTENDO O RISCO');
    expect(calls).toHaveLength(0);
  });

  it('allows a protected worker PUT with the exact confirm phrase', async () => {
    stubCloudflareFetch([
      {
        method: 'PUT',
        url: `${BASE}/workers/scripts/admin-motor/content`,
        reply: { json: cfEnvelope({ id: 'admin-motor' }) },
      },
    ]);

    const response = await onRequestPut(
      putContext({
        scriptName: 'admin-motor',
        modules: [{ name: 'index.js', content: 'export default {}' }],
        mainModule: 'index.js',
        confirmPhrase: 'EU ENTENDO O RISCO',
      }),
    );

    expect(response.status).toBe(200);
    expect((await readBody(response)).deployed).toBe(true);
  });

  it('returns 409 when expectedEtag no longer matches the current script etag', async () => {
    const { calls } = stubCloudflareFetch([
      { url: SCRIPTS_LIST_URL, reply: { json: cfEnvelope([{ id: 'meu-worker', etag: 'etag-new' }]) } },
    ]);

    const response = await onRequestPut(
      putContext({
        scriptName: 'meu-worker',
        modules: [{ name: 'index.js', content: 'export default {}' }],
        mainModule: 'index.js',
        expectedEtag: 'etag-old',
      }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(409);
    expect(body.error).toContain('modificado por outra via');
    expect(calls.some((call) => call.url === CONTENT_PUT_URL)).toBe(false);
  });
});
