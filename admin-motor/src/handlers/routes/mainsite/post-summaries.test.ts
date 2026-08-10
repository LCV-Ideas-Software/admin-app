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
    generateParts: [{ text: JSON.stringify({ summary_og: 'resumo curto', summary_ld: 'resumo longo' }) }] as {
      text?: string;
      thought?: boolean;
    }[],
    generateError: null as Error | null,
    onGenerate: null as (() => void) | null,
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
      countTokens: async (request: Record<string, unknown>) => {
        runtime.countRequests.push(request);
        return { totalTokens: 42 };
      },
      generateContent: async (request: Record<string, unknown>) => {
        runtime.generateRequests.push(request);
        runtime.onGenerate?.();
        if (runtime.generateError) throw runtime.generateError;
        return {
          candidates: [{ content: { parts: runtime.generateParts } }],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 7 },
          text: runtime.generateParts[0]?.text ?? '',
        };
      },
    };
  },
}));

import { onRequestPost } from './post-summaries';

const POST_ROW = {
  id: 7,
  title: 'Título do post',
  content: `<p>${'Conteúdo relevante do post para resumo. '.repeat(4)}</p>`,
};

const createDb = (posts: (typeof POST_ROW)[] = []) => {
  const makeStmt = (sql: string) => {
    const stmt = {
      bind: (..._args: unknown[]) => stmt,
      run: async () => ({}),
      all: async () => ({ results: sql.includes('SELECT id, title, content FROM mainsite_posts') ? posts : [] }),
      first: async () => (sql.includes('FROM mainsite_posts WHERE id') ? POST_ROW : null),
    };
    return stmt;
  };
  return { prepare: makeStmt };
};

const context = (body: unknown, env: Record<string, unknown>, posts: (typeof POST_ROW)[] = []) =>
  ({
    request: new Request('https://admin.example/api/mainsite/post-summaries', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
    env: { BIGDATA_DB: createDb(posts), ...env },
  }) as unknown as Parameters<typeof onRequestPost>[0];

beforeEach(() => {
  runtime.constructorOptions.length = 0;
  runtime.countRequests.length = 0;
  runtime.generateRequests.length = 0;
  runtime.generateParts = [{ text: JSON.stringify({ summary_og: 'resumo curto', summary_ld: 'resumo longo' }) }];
  runtime.generateError = null;
  runtime.onGenerate = null;
});

describe('POST /api/mainsite/post-summaries action=regenerate (Vertex)', () => {
  it('retorna 500 quando VERTEX_SA_KEY está ausente', async () => {
    const res = await onRequestPost(context({ action: 'regenerate', postId: 7 }, {}));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe('VERTEX_SA_KEY não configurada.');
  });

  it('gera resumos com safety settings REST (5 categorias) e timeouts por chamada', async () => {
    const res = await onRequestPost(
      context({ action: 'regenerate', postId: 7, model: 'gemini-2.5-flash' }, { VERTEX_SA_KEY: '{"sa":"x"}' }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; summary_og: string; summary_ld: string };
    expect(body.ok).toBe(true);
    expect(body.summary_og).toBe('resumo curto');
    expect(body.summary_ld).toBe('resumo longo');

    expect(runtime.constructorOptions[0]?.saKeyJson).toBe('{"sa":"x"}');
    const count = runtime.countRequests[0] as { config?: { httpOptions?: { timeout?: number } } };
    expect(count.config?.httpOptions?.timeout).toBe(20_000);

    const gen = runtime.generateRequests[0] as {
      model: string;
      config: {
        safetySettings: { category: string; threshold: string }[];
        responseMimeType?: string;
        httpOptions?: { timeout?: number };
      };
    };
    expect(gen.model).toBe('gemini-2.5-flash');
    expect(gen.config.responseMimeType).toBe('application/json');
    expect(gen.config.httpOptions?.timeout).toBe(80_000);
    expect(gen.config.safetySettings).toEqual([
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_ONLY_HIGH' },
    ]);
  });

  it('generate-all limita cada chamada ao tempo que resta do teto do lote', async () => {
    const res = await onRequestPost(
      context({ action: 'generate-all', mode: 'all', model: 'gemini-2.5-flash' }, { VERTEX_SA_KEY: '{"sa":"x"}' }, [
        POST_ROW,
      ]),
    );
    expect(res.status).toBe(200);

    const count = runtime.countRequests[0] as { config?: { httpOptions?: { timeout?: number } } };
    const gen = runtime.generateRequests[0] as { config?: { httpOptions?: { timeout?: number } } };
    const countTimeout = count.config?.httpOptions?.timeout ?? 0;
    const genTimeout = gen.config?.httpOptions?.timeout ?? 0;
    // O lote inteiro tem 40s antes do 524 do proxy; nenhuma chamada individual
    // pode pedir mais do que resta dele (o single-post segue com 20s/80s).
    expect(countTimeout).toBeGreaterThan(0);
    expect(countTimeout).toBeLessThanOrEqual(40_000);
    expect(genTimeout).toBeGreaterThan(0);
    expect(genTimeout).toBeLessThanOrEqual(40_000);
  });

  it('regenerate (post único) também tem prazo total: a 2a tentativa recebe o que resta', async () => {
    let clock = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    runtime.onGenerate = () => {
      clock += 50_000;
    };
    runtime.generateError = new runtime.MockVertexHttpError(
      'Vertex generateContent falhou (HTTP 500): interno',
      500,
      'generateContent',
    );

    await onRequestPost(
      context({ action: 'regenerate', postId: 7, model: 'gemini-2.5-flash' }, { VERTEX_SA_KEY: '{"sa":"x"}' }),
    );

    expect(runtime.generateRequests).toHaveLength(2);
    const [primeira, segunda] = runtime.generateRequests as Array<{ config?: { httpOptions?: { timeout?: number } } }>;
    const t1 = primeira?.config?.httpOptions?.timeout ?? 0;
    const t2 = segunda?.config?.httpOptions?.timeout ?? 0;
    // Sem prazo total, cada tentativa pediria 80s novos e o request passaria
    // dos 100s do proxy, virando 524 no lugar do JSON de erro do handler.
    expect(t1).toBe(80_000);
    expect(t2).toBe(45_000);
    vi.restoreAllMocks();
  });

  it('retorna 500 com "AI falhou." após esgotar retries', async () => {
    runtime.generateError = new runtime.MockVertexHttpError(
      'Vertex generateContent falhou (HTTP 500): interno',
      500,
      'generateContent',
    );
    const res = await onRequestPost(
      context({ action: 'regenerate', postId: 7, model: 'gemini-2.5-flash' }, { VERTEX_SA_KEY: '{"sa":"x"}' }),
    );
    expect(res.status).toBe(500);
    expect(runtime.generateRequests).toHaveLength(2);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.error).toContain('AI falhou.');
  });
});
