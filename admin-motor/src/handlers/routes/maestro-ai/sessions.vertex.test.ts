import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const createDb = () => {
  const makeStmt = () => {
    const stmt = {
      bind: (..._args: unknown[]) => stmt,
      run: async () => ({}),
      all: async () => ({ results: [] as unknown[] }),
      first: async () => null,
    };
    return stmt;
  };
  return { prepare: makeStmt };
};

const context = (env: Record<string, unknown>, body?: unknown) =>
  ({
    request: new Request('https://admin.example/api/maestro-ai/settings', {
      method: body === undefined ? 'GET' : 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: { 'Content-Type': 'application/json' },
    }),
    env: { BIGDATA_DB: createDb(), ...env },
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
