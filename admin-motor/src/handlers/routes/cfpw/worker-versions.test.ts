import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, cfErrorEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import { onRequestGetDetail, onRequestGetList } from './worker-versions';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const DEPLOYMENTS_URL = `${BASE}/workers/scripts/meu-worker/deployments`;

type VersionsBody = {
  ok: boolean;
  error?: string;
  versions?: Array<Record<string, unknown>>;
  pagination?: Record<string, unknown> | null;
  activeDeployment?: Record<string, unknown> | null;
  version?: Record<string, unknown>;
  warnings?: Array<{ code: string; message: string }>;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const listContext = (query: string) => ({
  request: new Request(`https://admin.test/api/cfpw/worker-versions${query}`),
  env: baseEnv(),
});

const detailContext = (query: string) => ({
  request: new Request(`https://admin.test/api/cfpw/worker-version${query}`),
  env: baseEnv(),
});

const readBody = async (response: Response) => (await response.json()) as VersionsBody;

describe('cfpw worker-versions handler', () => {
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

  it('lists versions enriched with active flag and percentage from the first deployment', async () => {
    stubCloudflareFetch([
      {
        url: `${BASE}/workers/scripts/meu-worker/versions?page=1&per_page=25`,
        reply: {
          json: cfEnvelope(
            [
              { id: 'v1', number: 2, metadata: { author_email: 'ops@lcv.dev' }, annotations: {} },
              { id: 'v2', number: 1, metadata: {}, annotations: {} },
            ],
            { result_info: { page: 1, per_page: 25, total_count: 2 } },
          ),
        },
      },
      {
        url: DEPLOYMENTS_URL,
        reply: {
          json: cfEnvelope({
            deployments: [{ id: 'dep-1', versions: [{ version_id: 'v1', percentage: 100 }] }],
          }),
        },
      },
    ]);

    const response = await onRequestGetList(listContext('?scriptName=meu-worker'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.versions?.[0]).toMatchObject({ id: 'v1', active: true, percentage: 100 });
    expect(body.versions?.[1]).toMatchObject({ id: 'v2', active: false });
    expect(body.versions?.[1]).not.toHaveProperty('percentage');
    expect(body.pagination).toEqual({ page: 1, per_page: 25, total_count: 2 });
    expect(body.activeDeployment).toMatchObject({ id: 'dep-1' });
    expect(body.warnings).toEqual([]);
  });

  it('passes page, perPage and deployable through to the CF versions endpoint', async () => {
    const { calls } = stubCloudflareFetch([
      {
        url: `${BASE}/workers/scripts/meu-worker/versions?page=2&per_page=10&deployable=true`,
        reply: { json: cfEnvelope([]) },
      },
      { url: DEPLOYMENTS_URL, reply: { json: cfEnvelope({ deployments: [] }) } },
    ]);

    const response = await onRequestGetList(listContext('?scriptName=meu-worker&page=2&perPage=10&deployable=true'));

    expect(response.status).toBe(200);
    expect(calls[0]?.url).toBe(`${BASE}/workers/scripts/meu-worker/versions?page=2&per_page=10&deployable=true`);
  });

  it('keeps the listing when the deployments enrichment fails, adding a warning', async () => {
    stubCloudflareFetch([
      {
        url: `${BASE}/workers/scripts/meu-worker/versions?page=1&per_page=25`,
        reply: { json: cfEnvelope([{ id: 'v1', number: 1 }]) },
      },
      { url: DEPLOYMENTS_URL, reply: cfErrorEnvelope(10000, 'Authentication error', 403) },
    ]);

    const body = await readBody(await onRequestGetList(listContext('?scriptName=meu-worker')));

    expect(body.ok).toBe(true);
    expect(body.versions?.[0]).toMatchObject({ id: 'v1', active: false });
    expect(body.warnings?.[0]?.code).toBe('CFPW-WORKER-VERSIONS-PARTIAL-DEPLOYMENTS');
  });

  it('rejects the list without scriptName and with a non-integer page', async () => {
    stubCloudflareFetch([]);

    const missingScript = await onRequestGetList(listContext(''));
    expect(missingScript.status).toBe(400);
    expect((await readBody(missingScript)).error).toContain('scriptName');

    const badPage = await onRequestGetList(listContext('?scriptName=meu-worker&page=abc'));
    expect(badPage.status).toBe(400);
    expect((await readBody(badPage)).error).toContain('inteiros positivos');
  });

  it('returns the version detail as passthrough', async () => {
    stubCloudflareFetch([
      {
        url: `${BASE}/workers/scripts/meu-worker/versions/v-123`,
        reply: {
          json: cfEnvelope({
            id: 'v-123',
            metadata: { source: 'api' },
            annotations: { 'workers/message': 'deploy X' },
            resources: { bindings: [{ type: 'plain_text', name: 'MODO' }] },
          }),
        },
      },
    ]);

    const response = await onRequestGetDetail(detailContext('?scriptName=meu-worker&versionId=v-123'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.version).toEqual({
      id: 'v-123',
      metadata: { source: 'api' },
      annotations: { 'workers/message': 'deploy X' },
      resources: { bindings: [{ type: 'plain_text', name: 'MODO' }] },
    });
  });

  it('rejects the detail without versionId and passes a CF 404 through', async () => {
    stubCloudflareFetch([
      {
        url: `${BASE}/workers/scripts/meu-worker/versions/v-404`,
        reply: cfErrorEnvelope(10007, 'workers.api.error.version_not_found', 404),
      },
    ]);

    const missingVersion = await onRequestGetDetail(detailContext('?scriptName=meu-worker'));
    expect(missingVersion.status).toBe(400);
    expect((await readBody(missingVersion)).error).toContain('versionId');

    const notFound = await onRequestGetDetail(detailContext('?scriptName=meu-worker&versionId=v-404'));
    expect(notFound.status).toBe(404);
    expect((await readBody(notFound)).error).toContain('10007');
  });
});
