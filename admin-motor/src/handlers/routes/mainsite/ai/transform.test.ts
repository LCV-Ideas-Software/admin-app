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
    countRequests: [] as Record<string, unknown>[],
    generateRequests: [] as Record<string, unknown>[],
    totalTokens: 10,
    generateText: 'texto transformado',
    generateError: null as Error | null,
    MockVertexHttpError,
  };
});

vi.mock('../../../_shared/vertex', () => ({
  VertexHttpError: runtime.MockVertexHttpError,
  VertexGenAI: class {
    constructor(options: Record<string, unknown>) {
      runtime.constructorOptions.push(options);
    }
    readonly models = {
      countTokens: async (request: Record<string, unknown>) => {
        runtime.countRequests.push(request);
        return { totalTokens: runtime.totalTokens };
      },
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

import { onRequestPost } from './transform';

const context = (body: unknown, env: Record<string, unknown>) =>
  ({
    request: new Request('https://admin.example/api/mainsite/ai/transform', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    env,
    data: {},
  }) as unknown as Parameters<typeof onRequestPost>[0];

beforeEach(() => {
  runtime.constructorOptions.length = 0;
  runtime.countRequests.length = 0;
  runtime.generateRequests.length = 0;
  runtime.totalTokens = 10;
  runtime.generateText = 'texto transformado';
  runtime.generateError = null;
});

describe('POST /api/mainsite/ai/transform (Vertex)', () => {
  it('retorna 500 quando VERTEX_SA_KEY está ausente', async () => {
    const res = await onRequestPost(context({ action: 'grammar', text: 'ola' }, {}));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'VERTEX_SA_KEY não configurada.' });
  });

  it('transforma texto com safety settings REST e timeouts por chamada', async () => {
    const res = await onRequestPost(context({ action: 'grammar', text: 'ola mundo' }, { VERTEX_SA_KEY: '{"sa":"x"}' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: 'texto transformado' });

    expect(runtime.constructorOptions[0]?.saKeyJson).toBe('{"sa":"x"}');
    const count = runtime.countRequests[0] as { model: string; config?: { httpOptions?: { timeout?: number } } };
    expect(count.model).toBe('gemini-2.5-pro');
    expect(count.config?.httpOptions?.timeout).toBe(20_000);

    const gen = runtime.generateRequests[0] as {
      model: string;
      config: {
        safetySettings: { category: string; threshold: string }[];
        httpOptions?: { timeout?: number };
        temperature: number;
      };
    };
    expect(gen.model).toBe('gemini-2.5-pro');
    expect(gen.config.httpOptions?.timeout).toBe(80_000);
    expect(gen.config.temperature).toBe(0.3);
    expect(gen.config.safetySettings).toEqual([
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    ]);
  });

  it('retorna 400 sem texto ou ação', async () => {
    const res = await onRequestPost(context({ action: 'grammar' }, { VERTEX_SA_KEY: '{"sa":"x"}' }));
    expect(res.status).toBe(400);
  });

  it('retorna 413 quando a contagem de tokens excede o limite', async () => {
    runtime.totalTokens = 200_000;
    const res = await onRequestPost(context({ action: 'grammar', text: 'ola' }, { VERTEX_SA_KEY: '{"sa":"x"}' }));
    expect(res.status).toBe(413);
    expect(runtime.generateRequests).toHaveLength(0);
  });

  it('retorna 500 após esgotar retries quando a geração falha', async () => {
    runtime.generateError = new runtime.MockVertexHttpError(
      'Vertex generateContent falhou (HTTP 500): interno',
      500,
      'generateContent',
    );
    const res = await onRequestPost(context({ action: 'grammar', text: 'ola' }, { VERTEX_SA_KEY: '{"sa":"x"}' }));
    expect(res.status).toBe(500);
    expect(runtime.generateRequests).toHaveLength(2);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('generateContent');
  });
});
