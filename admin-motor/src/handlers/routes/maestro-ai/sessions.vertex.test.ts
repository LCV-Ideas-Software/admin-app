import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => {
  class MockVertexHttpError extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly operation: string,
    ) {
      super(message);
      this.name = 'VertexHttpError';
    }
  }
  return {
    constructorOptions: [] as Record<string, unknown>[],
    listRequests: [] as Record<string, unknown>[],
    listModels: [{ name: 'publishers/google/models/gemini-3.1-pro-preview' }] as { name?: string }[],
    listError: null as Error | null,
    generateRequests: [] as Record<string, unknown>[],
    generateText: 'OK',
    generateError: null as Error | null,
    MockVertexHttpError,
  };
});

vi.mock('../../_shared/vertex', () => ({
  VertexHttpError: runtime.MockVertexHttpError,
  VertexGenAI: class {
    constructor(options: Record<string, unknown>) {
      runtime.constructorOptions.push(options);
    }
    readonly models = {
      list: (request: Record<string, unknown>) => {
        runtime.listRequests.push(request);
        return (async function* () {
          if (runtime.listError) throw runtime.listError;
          for (const m of runtime.listModels) {
            yield m;
          }
        })();
      },
      generateContent: async (request: Record<string, unknown>) => {
        runtime.generateRequests.push(request);
        if (runtime.generateError) throw runtime.generateError;
        return {
          text: runtime.generateText,
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 },
        };
      },
    };
  },
}));

import { handleMaestroAiSettingsGet, handleMaestroAiSettingsPut, handleMaestroAiSettingsTestPost } from './sessions';

/** Registra gravações no Secrets Store para provar atomicidade do PUT. */
const upsertedSecrets: string[] = [];

const SECRET_STORE_ENV = {
  CLOUDFLARE_PW: 'token-cf',
  CF_ACCOUNT_ID: 'acct-1',
  MAESTRO_SECRET_STORE_ID: 'store-1',
};

const createDb = (settingsRow: Record<string, unknown> | null = null) => {
  const makeStmt = (sql: string) => {
    const stmt = {
      bind: (..._args: unknown[]) => stmt,
      run: async () => ({}),
      all: async () => ({ results: [] as unknown[] }),
      first: async () => (sql.includes('FROM maestro_ai_settings') ? settingsRow : null),
    };
    return stmt;
  };
  return { prepare: makeStmt };
};

const context = (env: Record<string, unknown>, body?: unknown, settingsRow: Record<string, unknown> | null = null) =>
  ({
    request: new Request('https://admin.example/api/maestro-ai/settings', {
      method: body === undefined ? 'GET' : 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: { 'Content-Type': 'application/json' },
    }),
    env: { BIGDATA_DB: createDb(settingsRow), ...env },
  }) as unknown as Parameters<typeof handleMaestroAiSettingsTestPost>[0];

type TestResults = { ok: boolean; results: { agent: string; ok: boolean; message: string; model?: string }[] };

beforeEach(() => {
  runtime.constructorOptions.length = 0;
  runtime.listRequests.length = 0;
  runtime.listModels = [{ name: 'publishers/google/models/gemini-3.1-pro-preview' }];
  runtime.listError = null;
  runtime.generateRequests.length = 0;
  runtime.generateText = 'OK';
  runtime.generateError = null;
  upsertedSecrets.length = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/secrets_store/') && init?.method && init.method !== 'GET') {
        const body = String(init.body ?? '');
        upsertedSecrets.push(body.slice(0, 200));
      }
      return new Response(JSON.stringify({ success: true, result: [] }), { status: 200 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Maestro AI provider gemini via Vertex (SA OAuth)', () => {
  it('test-api: gemini resolve modelo via models.list e responde OK', async () => {
    const res = await handleMaestroAiSettingsTestPost(context({ VERTEX_SA_KEY: '{"sa":"x"}' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as TestResults;
    const gemini = body.results.find((r) => r.agent === 'gemini');
    expect(gemini?.ok).toBe(true);
    expect(gemini?.model).toBe('gemini-3.1-pro-preview');

    expect(runtime.constructorOptions.every((o) => o.saKeyJson === '{"sa":"x"}')).toBe(true);
    expect(runtime.listRequests).toHaveLength(1);
    // O catálogo precisa de prazo próprio: ele roda antes da geração e um
    // catálogo travado impediria o health check de chegar à chamada.
    expect(runtime.listRequests[0]).toEqual({
      config: { pageSize: 1000, httpOptions: { timeout: 15_000 } },
    });
    const gen = runtime.generateRequests[0] as {
      model: string;
      config: { temperature: number; topP: number; maxOutputTokens: number; httpOptions?: { timeout?: number } };
    };
    expect(gen.model).toBe('gemini-3.1-pro-preview');
    // O timeout do provider vira AbortSignal na própria chamada, não só uma
    // corrida de Promise — o Vertex agora aborta a requisição em voo.
    expect(gen.config).toEqual({
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 256,
      httpOptions: { timeout: 120_000 },
    });

    for (const other of body.results.filter((r) => r.agent !== 'gemini')) {
      expect(other.ok).toBe(false);
      expect(other.message).toBe('Chave nao configurada.');
    }
  });

  it('test-api: com location regional não usa o catálogo global (modelos global-only não existem lá)', async () => {
    const res = await handleMaestroAiSettingsTestPost(
      context({ VERTEX_SA_KEY: '{"sa":"x"}', VERTEX_LOCATION: 'us-central1' }),
    );
    const body = (await res.json()) as TestResults;
    const gemini = body.results.find((r) => r.agent === 'gemini');
    expect(gemini?.ok).toBe(true);
    expect(gemini?.model).toBe('gemini-2.5-pro');
    // Nada de consultar o catálogo global para escolher um modelo que será
    // chamado numa região onde ele pode não existir.
    expect(runtime.listRequests).toHaveLength(0);
  });

  it('test-api: modelo global-only já persistido não é usado numa location regional', async () => {
    const settingsRow = {
      id: 'default',
      protocol_text: 'p'.repeat(120),
      max_cost_usd: 10,
      max_runtime_minutes: null,
      max_cycles: 2,
      configured_secrets_json: '{}',
      rates_json: JSON.stringify(
        Object.fromEntries(
          ['claude', 'codex', 'gemini', 'deepseek', 'grok', 'perplexity'].map((k) => [
            k,
            { input_usd_per_million: 1, output_usd_per_million: 2 },
          ]),
        ),
      ),
      // O operador escolheu um preview: ele só existe no endpoint global.
      models_json: JSON.stringify({ gemini: 'gemini-3.1-pro-preview' }),
      updated_at: '2026-08-09T00:00:00Z',
    };

    const res = await handleMaestroAiSettingsTestPost(
      context({ VERTEX_SA_KEY: '{"sa":"x"}', VERTEX_LOCATION: 'us-central1' }, undefined, settingsRow),
    );
    const body = (await res.json()) as TestResults;
    const gemini = body.results.find((r) => r.agent === 'gemini');
    expect(gemini?.ok).toBe(true);
    // Sem essa checagem, a escolha persistida chegaria à região e devolveria 404.
    expect(gemini?.model).toBe('gemini-2.5-pro');
    const gen = runtime.generateRequests[0] as { model: string };
    expect(gen.model).toBe('gemini-2.5-pro');
  });

  it('test-api: falha na listagem cai no fallback gemini-2.5-pro', async () => {
    runtime.listError = new runtime.MockVertexHttpError('Vertex listModels falhou (HTTP 403): x', 403, 'listModels');
    const res = await handleMaestroAiSettingsTestPost(context({ VERTEX_SA_KEY: '{"sa":"x"}' }));
    const body = (await res.json()) as TestResults;
    const gemini = body.results.find((r) => r.agent === 'gemini');
    expect(gemini?.ok).toBe(true);
    expect(gemini?.model).toBe('gemini-2.5-pro');
  });

  it('test-api: sem VERTEX_SA_KEY o gemini reporta chave não configurada e não instancia cliente', async () => {
    const res = await handleMaestroAiSettingsTestPost(context({}));
    const body = (await res.json()) as TestResults;
    const gemini = body.results.find((r) => r.agent === 'gemini');
    expect(gemini?.ok).toBe(false);
    expect(gemini?.message).toBe('Chave nao configurada.');
    expect(runtime.constructorOptions).toHaveLength(0);
  });

  it('settings GET: painel expõe secret_name VERTEX_SA_KEY e runtime_ready', async () => {
    const res = await handleMaestroAiSettingsGet(context({ VERTEX_SA_KEY: '{"sa":"x"}' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      settings: { agents: { key: string; secret_name: string; runtime_ready: boolean }[] };
    };
    const gemini = body.settings.agents.find((a) => a.key === 'gemini');
    expect(gemini?.secret_name).toBe('VERTEX_SA_KEY');
    expect(gemini?.runtime_ready).toBe(true);
  });

  it('settings PUT: rejeita o gemini ANTES de gravar qualquer outro secret (atomicidade)', async () => {
    const res = await handleMaestroAiSettingsPut(
      context(
        { VERTEX_SA_KEY: '{"sa":"x"}', ...SECRET_STORE_ENV },
        {
          protocol_text: 'p'.repeat(120),
          max_cost_usd: 10,
          max_cycles: 2,
          // claude vem antes de gemini na ordem de PROVIDER_KEYS: sem validação
          // prévia, ele seria rotacionado e só então o gemini falharia.
          api_keys: { claude: 'chave-claude', gemini: 'alguma-coisa' },
        },
      ),
    );
    expect(res.status).toBe(400);
    expect(upsertedSecrets).toEqual([]);
  });

  it('settings PUT: gravação de api_key do gemini via painel é rejeitada com diagnóstico', async () => {
    const res = await handleMaestroAiSettingsPut(
      context(
        { VERTEX_SA_KEY: '{"sa":"x"}' },
        {
          protocol_text: 'p'.repeat(120),
          max_cost_usd: 10,
          max_cycles: 2,
          api_keys: { gemini: 'alguma-coisa' },
        },
      ),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain('VERTEX_SA_KEY');
    expect(body.error).toContain('vertex-sa-key');
  });
});
