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
    listModels: [] as { name?: string; displayName?: string }[],
    listError: null as Error | null,
    MockVertexHttpError,
  };
});

vi.mock('./_shared/vertex', () => ({
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
    };
  },
}));

import { handleOraculoModelosGet } from './oraculoModelos';

type ModelPayload = { id: string; displayName: string; api: string; vision: boolean };

const context = (env: Record<string, unknown>) =>
  ({
    request: new Request('https://admin.example/api/oraculo/modelos'),
    env,
  }) as unknown as Parameters<typeof handleOraculoModelosGet>[0];

beforeEach(() => {
  runtime.constructorOptions.length = 0;
  runtime.listRequests.length = 0;
  runtime.listModels = [];
  runtime.listError = null;
});

describe('handleOraculoModelosGet (catálogo via Vertex)', () => {
  it('retorna 500 quando VERTEX_SA_KEY está ausente', async () => {
    const res = await handleOraculoModelosGet(context({}));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: 'VERTEX_SA_KEY não configurada.' });
  });

  it('lista gemini flash/pro com id extraído de publishers/google/models/<id>', async () => {
    runtime.listModels = [
      { name: 'publishers/google/models/gemini-3.1-pro-preview' },
      { name: 'publishers/google/models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
      { name: 'publishers/google/models/imagen-4.0-generate-001' },
      { name: 'publishers/google/models/gemini-embedding-001' },
    ];
    const res = await handleOraculoModelosGet(context({ VERTEX_SA_KEY: '{"sa":"x"}' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; models: ModelPayload[]; total: number };
    expect(body.ok).toBe(true);
    expect(body.total).toBe(2);
    expect(body.models.map((m) => m.id)).toEqual(['gemini-2.5-flash', 'gemini-3.1-pro-preview']);
    expect(body.models[0]).toEqual({
      id: 'gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash',
      api: 'vertex',
      vision: true,
    });
    expect(body.models[1]?.displayName).toBe('Gemini 3.1 Pro (Preview)');
    expect(runtime.constructorOptions[0]?.saKeyJson).toBe('{"sa":"x"}');
    expect(runtime.listRequests[0]).toEqual({
      config: { pageSize: 300, httpOptions: { timeout: 20_000 } },
    });
  });

  it('com location regional omite modelos preview/exp, que só existem no endpoint global', async () => {
    runtime.listModels = [
      { name: 'publishers/google/models/gemini-3.1-pro-preview' },
      { name: 'publishers/google/models/gemini-2.0-flash-exp' },
      { name: 'publishers/google/models/gemini-2.5-flash' },
      { name: 'publishers/google/models/gemini-2.5-pro' },
    ];
    const res = await handleOraculoModelosGet(context({ VERTEX_SA_KEY: '{"sa":"x"}', VERTEX_LOCATION: 'us-central1' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { models: ModelPayload[]; total: number };
    expect(body.models.map((m) => m.id)).toEqual(['gemini-2.5-pro', 'gemini-2.5-flash']);
  });

  it('retorna 500 com a mensagem do erro quando a listagem falha', async () => {
    runtime.listError = new runtime.MockVertexHttpError(
      'Vertex listModels falhou (HTTP 403): sem permissão',
      403,
      'listModels',
    );
    const res = await handleOraculoModelosGet(context({ VERTEX_SA_KEY: '{"sa":"x"}' }));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain('listModels');
  });
});
