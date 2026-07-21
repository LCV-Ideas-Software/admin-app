import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestPatchBuildConfig, onRequestPost, onRequestPostPurgeBuildCache } from './page-project';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const PROJECTS_URL = `${BASE}/pages/projects`;
const PROJECT_URL = `${PROJECTS_URL}/meu-projeto`;

type ResponseBody = {
  ok: boolean;
  error?: string;
  project?: Record<string, unknown>;
  buildConfig?: Record<string, unknown>;
  purged?: boolean;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const postContext = (body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/page-project', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const patchContext = (body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/page-build-config', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const purgeContext = (body: unknown) => ({
  request: new Request('https://admin.test/api/cfpw/page-purge-build-cache', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as ResponseBody;

describe('cfpw page-project handlers', () => {
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

  it('creates a project sending the exact CF body without source', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'POST', url: PROJECTS_URL, reply: { json: cfEnvelope({ name: 'meu-projeto' }) } },
    ]);

    const response = await onRequestPost(
      postContext({
        name: 'meu-projeto',
        productionBranch: 'main',
        buildConfig: { buildCommand: 'npm run build', destinationDir: 'dist' },
      }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      name: 'meu-projeto',
      production_branch: 'main',
      build_config: { build_command: 'npm run build', destination_dir: 'dist' },
    });
  });

  it('includes the github source block when source is provided', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'POST', url: PROJECTS_URL, reply: { json: cfEnvelope({ name: 'meu-projeto' }) } },
    ]);

    const response = await onRequestPost(
      postContext({
        name: 'meu-projeto',
        productionBranch: 'develop',
        source: { owner: 'lcv', repoName: 'meu-repo' },
      }),
    );

    expect(response.status).toBe(200);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      name: 'meu-projeto',
      production_branch: 'develop',
      source: {
        type: 'github',
        config: {
          owner: 'lcv',
          repo_name: 'meu-repo',
          production_branch: 'develop',
          deployments_enabled: true,
        },
      },
    });
  });

  it('rejects an invalid project name with 400 before calling Cloudflare', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPost(postContext({ name: 'Nome_Invalido' }));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('Nome de projeto Pages inválido');
    expect(calls).toHaveLength(0);
  });

  it('maps a CF name conflict to 409 with a pt-BR diagnostic', async () => {
    stubCloudflareFetch([
      {
        method: 'POST',
        url: PROJECTS_URL,
        reply: cfErrorEnvelope(8000015, 'A project with this name already exists.', 409),
      },
    ]);

    const response = await onRequestPost(postContext({ name: 'meu-projeto' }));
    const body = await readBody(response);

    expect(response.status).toBe(409);
    expect(body.error).toContain("Já existe um projeto Pages com esse nome ('meu-projeto')");
  });

  it('guides installing the GitHub App when CF rejects the git source', async () => {
    stubCloudflareFetch([
      {
        method: 'POST',
        url: PROJECTS_URL,
        reply: cfErrorEnvelope(8000014, 'GitHub installation not found for this account', 400),
      },
    ]);

    const response = await onRequestPost(
      postContext({ name: 'meu-projeto', source: { owner: 'lcv', repoName: 'meu-repo' } }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(400);
    expect(body.error).toContain('instale o GitHub App');
    expect(body.error).toContain('lcv/meu-repo');
  });

  it('merges the build config preserving fields that were not sent (read-modify-write)', async () => {
    const { calls } = stubCloudflareFetch([
      {
        method: 'GET',
        url: PROJECT_URL,
        reply: {
          json: cfEnvelope({
            name: 'meu-projeto',
            build_config: {
              build_command: 'npm run build',
              destination_dir: 'dist',
              root_dir: 'apps/site',
              build_caching: true,
            },
          }),
        },
      },
      {
        method: 'PATCH',
        url: PROJECT_URL,
        reply: {
          json: cfEnvelope({
            name: 'meu-projeto',
            build_config: {
              build_command: 'pnpm build',
              destination_dir: 'dist',
              root_dir: 'apps/site',
              build_caching: true,
            },
          }),
        },
      },
    ]);

    const response = await onRequestPatchBuildConfig(
      patchContext({ projectName: 'meu-projeto', buildCommand: 'pnpm build' }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      build_config: {
        build_command: 'pnpm build',
        destination_dir: 'dist',
        root_dir: 'apps/site',
        build_caching: true,
      },
    });
    expect(body.buildConfig).toMatchObject({ build_command: 'pnpm build', destination_dir: 'dist' });
  });

  it('rejects a build config PATCH without any field', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPatchBuildConfig(patchContext({ projectName: 'meu-projeto' }));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('Nenhum campo de build config');
    expect(calls).toHaveLength(0);
  });

  it('purges the build cache via the CF endpoint', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'POST', url: `${PROJECT_URL}/purge_build_cache`, reply: { json: cfEnvelope(null) } },
    ]);

    const response = await onRequestPostPurgeBuildCache(purgeContext({ projectName: 'meu-projeto' }));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.purged).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe('POST');
  });
});
