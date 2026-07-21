import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import {
  onRequestGetBuild,
  onRequestGetBuildConfig,
  onRequestGetBuildLogs,
  onRequestGetBuilds,
  onRequestPostBuildCancel,
  onRequestPostBuildRetry,
} from './builds';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const SCRIPTS_URL = `${BASE}/workers/scripts`;

type BuildsBody = {
  ok: boolean;
  error?: string;
  connected?: boolean;
  config?: Record<string, unknown>;
  builds?: Array<Record<string, unknown>>;
  build?: Record<string, unknown>;
  lines?: unknown[];
  cursor?: string | null;
  truncated?: boolean;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const getContext = (path: string, query: string) => ({
  request: new Request(`https://admin.test/api/cfpw/${path}${query}`),
  env: baseEnv(),
});

const postContext = (path: string, body: unknown) => ({
  request: new Request(`https://admin.test/api/cfpw/${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const scriptsRoute = (workers: Array<Record<string, unknown>>) => ({
  url: SCRIPTS_URL,
  reply: { json: cfEnvelope(workers) },
});

const readBody = async (response: Response) => (await response.json()) as BuildsBody;

describe('cfpw builds handler', () => {
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

  it('lists builds resolving the worker script tag first', async () => {
    const { calls } = stubCloudflareFetch([
      scriptsRoute([{ id: 'meu-worker', tag: 'tag-abc' }]),
      {
        url: `${BASE}/builds/workers/tag-abc/builds?page=1&per_page=20`,
        reply: {
          json: cfEnvelope([{ build_uuid: 'b-1', status: 'stopped', build_outcome: 'success' }], {
            result_info: { page: 1, per_page: 20 },
          }),
        },
      },
    ]);

    const response = await onRequestGetBuilds(getContext('builds', '?scriptName=meu-worker'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.builds?.[0]).toMatchObject({ build_uuid: 'b-1', status: 'stopped' });
    expect(calls[0]?.url).toBe(SCRIPTS_URL);
    expect(calls[1]?.url).toBe(`${BASE}/builds/workers/tag-abc/builds?page=1&per_page=20`);
  });

  it('returns 404 pt-BR when the worker is not in the account listing', async () => {
    stubCloudflareFetch([scriptsRoute([{ id: 'outro-worker', tag: 'tag-zzz' }])]);

    const response = await onRequestGetBuilds(getContext('builds', '?scriptName=meu-worker'));
    const body = await readBody(response);

    expect(response.status).toBe(404);
    expect(body.error).toContain("Worker 'meu-worker' não encontrado");
  });

  it('rejects the list without scriptName and with a non-integer page', async () => {
    stubCloudflareFetch([]);

    const missingScript = await onRequestGetBuilds(getContext('builds', ''));
    expect(missingScript.status).toBe(400);
    expect((await readBody(missingScript)).error).toContain('scriptName');

    const badPage = await onRequestGetBuilds(getContext('builds', '?scriptName=meu-worker&page=abc'));
    expect(badPage.status).toBe(400);
    expect((await readBody(badPage)).error).toContain('inteiros positivos');
  });

  it('returns the build detail as passthrough', async () => {
    stubCloudflareFetch([
      {
        url: `${BASE}/builds/builds/b-77`,
        reply: { json: cfEnvelope({ build_uuid: 'b-77', status: 'running', trigger: { branch: 'main' } }) },
      },
    ]);

    const response = await onRequestGetBuild(getContext('build', '?buildId=b-77'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.build).toEqual({ build_uuid: 'b-77', status: 'running', trigger: { branch: 'main' } });
  });

  it('forwards the cursor to the logs endpoint and passes lines/cursor/truncated through', async () => {
    const { calls } = stubCloudflareFetch([
      {
        url: `${BASE}/builds/builds/b-1/logs?cursor=cur-1`,
        reply: {
          json: cfEnvelope({ lines: [[1752000000, 'linha 1']], cursor: 'cur-2', truncated: true }),
        },
      },
    ]);

    const response = await onRequestGetBuildLogs(getContext('build-logs', '?buildId=b-1&cursor=cur-1'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(calls[0]?.url).toBe(`${BASE}/builds/builds/b-1/logs?cursor=cur-1`);
    expect(body.lines).toEqual([[1752000000, 'linha 1']]);
    expect(body.cursor).toBe('cur-2');
    expect(body.truncated).toBe(true);
  });

  it('omits the cursor query when absent and returns null cursor for the last page', async () => {
    const { calls } = stubCloudflareFetch([
      {
        url: `${BASE}/builds/builds/b-1/logs`,
        reply: { json: cfEnvelope({ lines: [], truncated: false }) },
      },
    ]);

    const body = await readBody(await onRequestGetBuildLogs(getContext('build-logs', '?buildId=b-1')));

    expect(calls[0]?.url).toBe(`${BASE}/builds/builds/b-1/logs`);
    expect(body.lines).toEqual([]);
    expect(body.cursor).toBeNull();
    expect(body.truncated).toBe(false);
  });

  it('retry picks the first trigger and omits empty branch/commit from the CF body', async () => {
    const { calls } = stubCloudflareFetch([
      scriptsRoute([{ id: 'meu-worker', tag: 'tag-abc' }]),
      {
        url: `${BASE}/builds/workers/tag-abc/triggers`,
        reply: { json: cfEnvelope([{ trigger_uuid: 'trg-1', branch: 'main' }, { trigger_uuid: 'trg-2' }]) },
      },
      {
        method: 'POST',
        url: `${BASE}/builds/triggers/trg-1/builds`,
        reply: { json: cfEnvelope({ build_uuid: 'b-new', status: 'queued' }) },
      },
    ]);

    const response = await onRequestPostBuildRetry(postContext('build-retry', { scriptName: 'meu-worker' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.build).toMatchObject({ build_uuid: 'b-new' });
    const forwarded = JSON.parse(String(calls[2]?.init?.body ?? '{}')) as Record<string, unknown>;
    expect(forwarded).toEqual({});
  });

  it('retry forwards branch and commitHash when provided', async () => {
    const { calls } = stubCloudflareFetch([
      scriptsRoute([{ id: 'meu-worker', tag: 'tag-abc' }]),
      {
        url: `${BASE}/builds/workers/tag-abc/triggers`,
        reply: { json: cfEnvelope([{ trigger_uuid: 'trg-1' }]) },
      },
      {
        method: 'POST',
        url: `${BASE}/builds/triggers/trg-1/builds`,
        reply: { json: cfEnvelope({ build_uuid: 'b-new' }) },
      },
    ]);

    await onRequestPostBuildRetry(
      postContext('build-retry', { scriptName: 'meu-worker', branch: 'develop', commitHash: 'abc123' }),
    );

    const forwarded = JSON.parse(String(calls[2]?.init?.body ?? '{}')) as Record<string, unknown>;
    expect(forwarded).toEqual({ branch: 'develop', commit_hash: 'abc123' });
  });

  it('retry returns 404 pt-BR when the worker has no build trigger', async () => {
    stubCloudflareFetch([
      scriptsRoute([{ id: 'meu-worker', tag: 'tag-abc' }]),
      { url: `${BASE}/builds/workers/tag-abc/triggers`, reply: { json: cfEnvelope([]) } },
    ]);

    const response = await onRequestPostBuildRetry(postContext('build-retry', { scriptName: 'meu-worker' }));
    const body = await readBody(response);

    expect(response.status).toBe(404);
    expect(body.error).toContain('Worker sem CI conectado (Workers Builds)');
  });

  it('retry maps a CF 404 on triggers to the no-CI pt-BR message', async () => {
    stubCloudflareFetch([
      scriptsRoute([{ id: 'meu-worker', tag: 'tag-abc' }]),
      {
        url: `${BASE}/builds/workers/tag-abc/triggers`,
        reply: cfErrorEnvelope(7003, 'Could not route request', 404),
      },
    ]);

    const response = await onRequestPostBuildRetry(postContext('build-retry', { scriptName: 'meu-worker' }));
    const body = await readBody(response);

    expect(response.status).toBe(404);
    expect(body.error).toContain('Worker sem CI conectado (Workers Builds)');
  });

  it('cancel issues a PUT to the CF cancel endpoint', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'PUT',
        url: `${BASE}/builds/builds/b-9/cancel`,
        reply: { json: cfEnvelope({ build_uuid: 'b-9', status: 'stopped' }) },
      },
    ]);

    const response = await onRequestPostBuildCancel(postContext('build-cancel', { buildId: 'b-9' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.build).toMatchObject({ status: 'stopped' });
    expect(calls[0]?.init?.method).toBe('PUT');
  });

  it('build-config maps a CF 404 to connected:false without failing', async () => {
    stubCloudflareFetch([
      scriptsRoute([{ id: 'meu-worker', tag: 'tag-abc' }]),
      {
        url: `${BASE}/builds/workers/tag-abc`,
        reply: cfErrorEnvelope(7003, 'build configuration not found', 404),
      },
    ]);

    const response = await onRequestGetBuildConfig(getContext('build-config', '?scriptName=meu-worker'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.connected).toBe(false);
    expect(body.config).toBeUndefined();
  });

  it('build-config returns connected:true with the CF config on success', async () => {
    stubCloudflareFetch([
      scriptsRoute([{ id: 'meu-worker', tag: 'tag-abc' }]),
      {
        url: `${BASE}/builds/workers/tag-abc`,
        reply: { json: cfEnvelope({ build_caching_enabled: true, repo_connection: { repo_name: 'lcv/app' } }) },
      },
    ]);

    const body = await readBody(await onRequestGetBuildConfig(getContext('build-config', '?scriptName=meu-worker')));

    expect(body.ok).toBe(true);
    expect(body.connected).toBe(true);
    expect(body.config).toMatchObject({ build_caching_enabled: true });
  });
});
