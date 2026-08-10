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
    generateRequests: [] as Record<string, unknown>[],
    generateText: JSON.stringify({ title: 'Conversa', markdown: 'Olá **mundo**' }),
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

import { onRequestPost } from './gemini-import';

const SHARE_URL = 'https://gemini.google.com/share/abc123';
const JINA_MARKDOWN = `# Conversa exportada\n${'conteúdo da conversa compartilhada. '.repeat(5)}`;

const context = (body: unknown, env: Record<string, unknown>) =>
  ({
    request: new Request('https://admin.example/api/mainsite/gemini-import', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    env,
  }) as unknown as Parameters<typeof onRequestPost>[0];

beforeEach(() => {
  runtime.constructorOptions.length = 0;
  runtime.generateRequests.length = 0;
  runtime.generateText = JSON.stringify({ title: 'Conversa', markdown: 'Olá **mundo**' });
  runtime.generateError = null;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      if (String(url).startsWith('https://r.jina.ai/')) {
        return new Response(JINA_MARKDOWN, { status: 200 });
      }
      throw new Error(`fetch inesperado no teste: ${String(url)}`);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/mainsite/gemini-import (Vertex)', () => {
  it('retorna 500 quando VERTEX_SA_KEY está ausente', async () => {
    const res = await onRequestPost(context({ url: SHARE_URL }, {}));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Falta variável VERTEX_SA_KEY no deploy.' });
  });

  it('mantém 422 para URL que não é share do Gemini', async () => {
    const res = await onRequestPost(context({ url: 'https://example.com/x' }, { VERTEX_SA_KEY: '{"sa":"x"}' }));
    expect(res.status).toBe(422);
  });

  it('importa conversa com responseSchema OpenAPI e timeout de 80s', async () => {
    const res = await onRequestPost(context({ url: SHARE_URL }, { VERTEX_SA_KEY: '{"sa":"x"}' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { html: string; title?: string };
    expect(body.title).toBe('Conversa');
    expect(body.html).toContain('<strong>mundo</strong>');

    expect(runtime.constructorOptions[0]?.saKeyJson).toBe('{"sa":"x"}');
    const gen = runtime.generateRequests[0] as {
      model: string;
      config: {
        responseSchema?: { type: string; required: string[] };
        responseMimeType?: string;
        systemInstruction?: string;
        temperature?: number;
        httpOptions?: { timeout?: number };
      };
    };
    expect(gen.model).toBe('gemini-2.5-flash');
    expect(gen.config.responseMimeType).toBe('application/json');
    expect(gen.config.responseSchema?.type).toBe('OBJECT');
    expect(gen.config.responseSchema?.required).toEqual(['title', 'markdown']);
    expect(gen.config.temperature).toBe(0.1);
    // O prazo é o que resta do orçamento do request (95s): a busca via Jina
    // divide o mesmo relógio, então a geração nunca leva 80s fixos por cima.
    const genTimeout = gen.config.httpOptions?.timeout ?? 0;
    expect(genTimeout).toBeGreaterThan(0);
    expect(genTimeout).toBeLessThanOrEqual(95_000);
    expect(gen.config.systemInstruction).toContain('FIDELIDADE');
  });

  it('retorna 500 com detalhe após esgotar retries quando a geração falha', async () => {
    runtime.generateError = new runtime.MockVertexHttpError(
      'Vertex generateContent falhou (HTTP 500): interno',
      500,
      'generateContent',
    );
    const res = await onRequestPost(context({ url: SHARE_URL }, { VERTEX_SA_KEY: '{"sa":"x"}' }));
    expect(res.status).toBe(500);
    expect(runtime.generateRequests).toHaveLength(2);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Falha na importação Gemini.');
    expect(body.error).toContain('generateContent');
  });
});
