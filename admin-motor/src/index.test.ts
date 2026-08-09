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

vi.mock('./handlers/_shared/vertex', () => ({
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

import worker from './index';

type ModelPayload = { id: string; displayName: string; api: string; vision: boolean };

const TOKEN = 'admin-token-teste';

const dispatch = (path: string, env: Record<string, unknown>) =>
  (worker as unknown as { fetch: (r: Request, e: unknown, c: unknown) => Promise<Response> }).fetch(
    new Request(`https://admin.example${path}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    }),
    env,
    { waitUntil: () => {} },
  );

beforeEach(() => {
  runtime.constructorOptions.length = 0;
  runtime.listRequests.length = 0;
  runtime.listModels = [];
  runtime.listError = null;
});

describe('GET /api/mainsite/modelos e /api/calculadora/modelos (catálogo via Vertex)', () => {
  it('retorna 500 quando VERTEX_SA_KEY está ausente', async () => {
    const res = await dispatch('/api/mainsite/modelos', { ADMIN_BEARER_TOKEN: TOKEN });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe('VERTEX_SA_KEY não configurada.');
  });

  it('lista gemini flash/pro na rota mainsite com id de publishers/google/models/<id>', async () => {
    runtime.listModels = [
      { name: 'publishers/google/models/gemini-3.1-pro-preview' },
      { name: 'publishers/google/models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
      { name: 'publishers/google/models/imagen-4.0-generate-001' },
    ];
    const res = await dispatch('/api/mainsite/modelos', {
      ADMIN_BEARER_TOKEN: TOKEN,
      VERTEX_SA_KEY: '{"sa":"x"}',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; models: ModelPayload[]; total: number };
    expect(body.ok).toBe(true);
    expect(body.total).toBe(2);
    expect(body.models.map((m) => m.id)).toEqual(['gemini-2.5-flash', 'gemini-3.1-pro-preview']);
    expect(body.models[0]?.api).toBe('vertex');
    expect(runtime.constructorOptions[0]?.saKeyJson).toBe('{"sa":"x"}');
    expect(runtime.listRequests[0]).toEqual({ config: { pageSize: 1000 } });
  });

  it('serve o mesmo catálogo na rota calculadora', async () => {
    runtime.listModels = [{ name: 'publishers/google/models/gemini-2.5-flash' }];
    const res = await dispatch('/api/calculadora/modelos', {
      ADMIN_BEARER_TOKEN: TOKEN,
      VERTEX_SA_KEY: '{"sa":"x"}',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; models: ModelPayload[] };
    expect(body.models.map((m) => m.id)).toEqual(['gemini-2.5-flash']);
  });
});
