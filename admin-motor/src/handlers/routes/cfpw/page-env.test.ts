import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cfEnvelope, stubCloudflareFetch } from '../../../test-utils/cf-fetch';
import type { D1Database, D1PreparedStatement } from '../_lib/operational';
import { onRequestGet, onRequestPatch } from './page-env';

const BASE = 'https://api.cloudflare.com/client/v4/accounts/acct-1';
const PROJECT_URL = `${BASE}/pages/projects/meu-projeto`;

type EnvBody = {
  ok: boolean;
  error?: string;
  environment?: string;
  envVars?: Record<string, { type: string; value?: string }>;
  bindings?: Record<string, Record<string, unknown>>;
  compatibilityDate?: string | null;
  compatibilityFlags?: string[];
  noOp?: boolean;
};

const baseEnv = () => ({ CLOUDFLARE_PW: 'pw-token', CF_ACCOUNT_ID: 'acct-1' });

const getContext = (query: string, db?: D1Database) => ({
  request: new Request(`https://admin.test/api/cfpw/page-env${query}`),
  env: { ...baseEnv(), ...(db ? { BIGDATA_DB: db } : {}) },
});

const patchContext = (body: unknown, db?: D1Database) => ({
  request: new Request('https://admin.test/api/cfpw/page-env', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  env: { ...baseEnv(), ...(db ? { BIGDATA_DB: db } : {}) },
});

const readBody = async (response: Response) => (await response.json()) as EnvBody;

/** Fake D1 que captura os binds do INSERT de telemetria (adminapp_module_events). */
const makeTelemetryDb = () => {
  const inserts: Array<Array<string | number | null>> = [];
  const makeStatement = (query: string): D1PreparedStatement => ({
    bind(...values: Array<string | number | null>) {
      if (query.includes('INSERT INTO adminapp_module_events')) {
        inserts.push(values);
      }
      return makeStatement(query);
    },
    async first<T>() {
      return null as T | null;
    },
    async all<T>() {
      return { results: [] as T[] };
    },
    async run() {
      return {};
    },
  });
  const db: D1Database = { prepare: (query: string) => makeStatement(query) };
  return { db, inserts };
};

const projectFixture = () =>
  cfEnvelope({
    name: 'meu-projeto',
    deployment_configs: {
      production: {
        compatibility_date: '2026-01-01',
        compatibility_flags: ['nodejs_compat'],
        env_vars: {
          MODO: { type: 'plain_text', value: 'producao' },
          API_KEY: { type: 'secret_text' },
        },
        kv_namespaces: { CACHE_KV: { namespace_id: 'kv-1' } },
        d1_databases: { BIGDATA_DB: { id: 'd1-1' } },
      },
      preview: {
        env_vars: {},
      },
    },
  });

describe('cfpw page-env handler', () => {
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

  it('returns env vars, mapped bindings and compat info for the environment on GET', async () => {
    stubCloudflareFetch([{ method: 'GET', url: PROJECT_URL, reply: { json: projectFixture() } }]);

    const response = await onRequestGet(getContext('?projectName=meu-projeto&environment=production'));
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.environment).toBe('production');
    expect(body.envVars).toEqual({
      MODO: { type: 'plain_text', value: 'producao' },
      API_KEY: { type: 'secret_text' },
    });
    expect(body.bindings?.kvNamespaces).toEqual({ CACHE_KV: { namespace_id: 'kv-1' } });
    expect(body.bindings?.d1Databases).toEqual({ BIGDATA_DB: { id: 'd1-1' } });
    expect(body.bindings?.r2Buckets).toEqual({});
    expect(body.compatibilityDate).toBe('2026-01-01');
    expect(body.compatibilityFlags).toEqual(['nodejs_compat']);
  });

  it('rejects GET with an unknown environment', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestGet(getContext('?projectName=meu-projeto&environment=staging'));

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain('environment');
    expect(calls).toHaveLength(0);
  });

  it('PATCHes only the changed keys, keeping null-delete and dropping deletes of missing keys', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: PROJECT_URL, reply: { json: projectFixture() } },
      { method: 'PATCH', url: PROJECT_URL, reply: { json: projectFixture() } },
    ]);

    const response = await onRequestPatch(
      patchContext({
        projectName: 'meu-projeto',
        environment: 'production',
        envVars: {
          NOVA_VAR: { type: 'plain_text', value: 'novo-valor' },
          MODO: null,
          NUNCA_EXISTIU: null,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      deployment_configs: {
        production: {
          env_vars: {
            NOVA_VAR: { type: 'plain_text', value: 'novo-valor' },
            MODO: null,
          },
        },
      },
    });
  });

  it('PATCHes bindings with null-delete and only the touched groups', async () => {
    const { calls } = stubCloudflareFetch([
      { method: 'GET', url: PROJECT_URL, reply: { json: projectFixture() } },
      { method: 'PATCH', url: PROJECT_URL, reply: { json: projectFixture() } },
    ]);

    const response = await onRequestPatch(
      patchContext({
        projectName: 'meu-projeto',
        environment: 'production',
        bindings: {
          kvNamespaces: { CACHE_KV: null },
          r2Buckets: { MEDIA: { name: 'media-bucket' } },
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      deployment_configs: {
        production: {
          kv_namespaces: { CACHE_KV: null },
          r2_buckets: { MEDIA: { name: 'media-bucket' } },
        },
      },
    });
  });

  it('rejects adding a secret_text with an empty value', async () => {
    const { calls } = stubCloudflareFetch([]);

    const response = await onRequestPatch(
      patchContext({
        projectName: 'meu-projeto',
        environment: 'production',
        envVars: { API_KEY: { type: 'secret_text', value: '' } },
      }),
    );

    expect(response.status).toBe(400);
    expect((await readBody(response)).error).toContain("variável secreta 'API_KEY'");
    expect(calls).toHaveLength(0);
  });

  it('never writes env var values into the telemetry payload', async () => {
    const { db, inserts } = makeTelemetryDb();
    stubCloudflareFetch([
      { method: 'GET', url: PROJECT_URL, reply: { json: projectFixture() } },
      { method: 'PATCH', url: PROJECT_URL, reply: { json: projectFixture() } },
    ]);

    const response = await onRequestPatch(
      patchContext(
        {
          projectName: 'meu-projeto',
          environment: 'production',
          envVars: { API_KEY: { type: 'secret_text', value: 'valor-super-secreto' } },
        },
        db,
      ),
    );

    expect(response.status).toBe(200);
    expect(inserts.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(inserts);
    expect(serialized).not.toContain('valor-super-secreto');
    expect(serialized).not.toContain('API_KEY');
    const metadata = JSON.parse(String(inserts[0]?.[6])) as Record<string, unknown>;
    expect(metadata.envVarsChanged).toBe(1);
  });

  it('answers noOp without PATCHing when the delta collapses to nothing', async () => {
    const { calls } = stubCloudflareFetch([{ method: 'GET', url: PROJECT_URL, reply: { json: projectFixture() } }]);

    const response = await onRequestPatch(
      patchContext({
        projectName: 'meu-projeto',
        environment: 'production',
        envVars: { NUNCA_EXISTIU: null },
      }),
    );
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.noOp).toBe(true);
    expect(calls).toHaveLength(1);
  });
});
