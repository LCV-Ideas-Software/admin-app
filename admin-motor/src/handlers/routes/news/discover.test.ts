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
    generateRequests: [] as Record<string, unknown>[],
    generateText: JSON.stringify([{ name: 'Portal Exemplo', url: 'https://exemplo.com/rss', category: 'Brasil' }]),
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
      generateContent: async (request: Record<string, unknown>) => {
        runtime.generateRequests.push(request);
        if (runtime.generateError) throw runtime.generateError;
        return {
          text: runtime.generateText,
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 7 },
        };
      },
    };
  },
}));

import { onRequestGet } from './discover';

type DiscoverPayload = {
  ok: boolean;
  suggestions: { id: string; url: string; source: string }[];
  layers?: { geminiAi: boolean };
};

const context = (query: string, env: Record<string, unknown>) =>
  ({
    request: new Request(`https://admin.example/api/news/discover?q=${encodeURIComponent(query)}`),
    env,
  }) as unknown as Parameters<typeof onRequestGet>[0];

beforeEach(() => {
  runtime.constructorOptions.length = 0;
  runtime.generateRequests.length = 0;
  runtime.generateText = JSON.stringify([
    { name: 'Portal Exemplo', url: 'https://exemplo.com/rss', category: 'Brasil' },
  ]);
  runtime.generateError = null;
});

describe('GET /api/news/discover (camada Vertex opcional)', () => {
  it('sem VERTEX_SA_KEY: responde ok com layers.geminiAi=false e não instancia o cliente', async () => {
    const res = await onRequestGet(context('tecnologia', {}));
    expect(res.status).toBe(200);
    const body = (await res.json()) as DiscoverPayload;
    expect(body.ok).toBe(true);
    expect(body.layers?.geminiAi).toBe(false);
    expect(runtime.constructorOptions).toHaveLength(0);
  });

  it('com VERTEX_SA_KEY: agrega sugestões da IA com source gemini-ai', async () => {
    const res = await onRequestGet(context('tecnologia', { VERTEX_SA_KEY: '{"sa":"x"}' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as DiscoverPayload;
    expect(body.ok).toBe(true);
    expect(body.layers?.geminiAi).toBe(true);
    expect(runtime.constructorOptions[0]?.saKeyJson).toBe('{"sa":"x"}');
    const aiItems = body.suggestions.filter((s) => s.source === 'gemini-ai');
    expect(aiItems.map((s) => s.url)).toContain('https://exemplo.com/rss');
    const gen = runtime.generateRequests[0] as { model: string };
    expect(gen.model).toBe('gemini-2.5-flash');
  });

  it('falha da IA é silenciosa: responde ok sem itens gemini-ai', async () => {
    runtime.generateError = new runtime.MockVertexHttpError(
      'Vertex generateContent falhou (HTTP 500): interno',
      500,
      'generateContent',
    );
    const res = await onRequestGet(context('tecnologia', { VERTEX_SA_KEY: '{"sa":"x"}' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as DiscoverPayload;
    expect(body.ok).toBe(true);
    expect(body.suggestions.filter((s) => s.source === 'gemini-ai')).toHaveLength(0);
  });
});
