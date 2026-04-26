import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';
import { logAiUsage } from '../_lib/ai-telemetry';

/**
 * gemini-import.ts — Cloudflare Pages Function
 * POST /api/mainsite/gemini-import
 * Fetches a Gemini share URL directly and utilizes Gemini SDK to cleanly parse its conversation.
 */

interface Env {
  GEMINI_API_KEY: string;
  JINA_API_KEY?: string;
  BIGDATA_DB?: D1Database;
}

interface D1Database {
  prepare(query: string): {
    bind(...values: unknown[]): {
      run(): Promise<unknown>;
      all<T = unknown>(): Promise<{ results: T[] }>;
    };
    run(): Promise<unknown>;
  };
}

interface PagesContext<E = Env> {
  request: Request;
  env: E;
  data?: {
    env?: E;
  };
}

type PagesFunction<E = Env> = (context: PagesContext<E>) => Promise<Response> | Response;

interface ImportRequest {
  url: string;
}

const GEMINI_CONFIG = {
  temperature: 0.1,
  maxRetries: 2, // 2 tentativas efetivas na API Gemini
  retryDelayMs: 1500,
};

const FALLBACK_MODEL = 'gemini-2.5-flash';

async function resolveModel(db: D1Database | undefined): Promise<string> {
  if (!db) return FALLBACK_MODEL;
  try {
    const res = await db
      .prepare('SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1')
      .bind('mainsite/ai_models')
      .all<{ payload: string }>();
    if (res.results && res.results.length > 0 && res.results[0].payload) {
      const parsed = JSON.parse(res.results[0].payload) as { import?: string };
      if (parsed.import) return parsed.import;
    }
  } catch {
    /* fallback silently */
  }
  return FALLBACK_MODEL;
}

// Jina.ai Reader API — fetches page content as clean markdown
// (direct fetch from Cloudflare Worker IPs ALWAYS triggers Google CAPTCHA)
//
// Arquitetura: tier único browser-only (GET https://r.jina.ai/{url})
//
// Histórico de decisão (2026-04-05):
//   readerlm-v2 foi avaliado e DESCARTADO — modelo beta, serverless, com 503
//   frequente ("ServiceNodeResourceDrainError") e latencia de 30-50s só para
//   descobrir que está em capacidade. O combo browser-only + Gemini cleanup
//   entrega qualidade equivalente com metade da latência e zero 503s.
const JINA_BASE_URL = 'https://r.jina.ai/';

// ── Orçamento de tempo (deadline)
// Cloudflare Pages proxy retorna 524 se a Pages Function demorar > 100s.
// Reservamos 15s para Gemini API + overhead → 85s de budget para Jina.
const JINA_TOTAL_BUDGET_MS = 85_000;

// ── Timeouts ideais para browser-only
// browser engine renderiza via Chromium headless (~15-25s para SPAs como Gemini)
const JINA_IDEAL_SERVER_S = 45; // X-Timeout para Jina server
const JINA_IDEAL_CLIENT_MS = 52_000; // margem 7s acima do X-Timeout

// Retry: 2 tentativas com backoff exponencial
const JINA_MAX_RETRIES = 2;
const JINA_RETRY_BASE_DELAY_MS = 1_500;

/**
 * Fetch Gemini share page content as markdown via Jina Reader (browser-only).
 *
 * Tier único com deadline dinâmico (auditada 2026-04-05):
 *   GET r.jina.ai/{url} com X-Engine: browser + Accept: text/markdown
 *   Chromium headless renderiza a SPA e retorna markdown puro.
 *   Gemini faz o pós-processamento (limpeza de UI, extração de conversa).
 *
 * Orçamento: 85s total (100s proxy CF - 15s Gemini/overhead)
 * Latência típica: 15-30s (browser render) → resultável em 1 tentativa
 *
 * Limites Jina (ref: https://jina.ai/reader/):
 *  - Sem API key: 20 RPM por IP (IP compartilhado Cloudflare → risco alto)
 *  - Com API key: 500 RPM por key
 * Solução: JINA_API_KEY sempre presente via Cloudflare Secrets.
 */
async function fetchSharePageContent(url: string, jinaApiKey?: string): Promise<string> {
  const deadline = Date.now() + JINA_TOTAL_BUDGET_MS;

  structuredLog('info', 'Jina fetch iniciado (browser-only)', {
    hasApiKey: Boolean(jinaApiKey && jinaApiKey.length > 0),
    url: url.substring(0, 80),
    budgetMs: JINA_TOTAL_BUDGET_MS,
  });

  // Headers base para browser-only (X-Timeout atualizado dinamicamente por tentativa)
  const authHeader: Record<string, string> = jinaApiKey ? { Authorization: `Bearer ${jinaApiKey}` } : {};

  const jinaUrl = `${JINA_BASE_URL}${url}`;
  let lastError: Error = new Error('Falha desconhecida ao buscar via Jina Reader.');

  for (let attempt = 0; attempt < JINA_MAX_RETRIES; attempt++) {
    // Backoff antes da 2ª tentativa
    if (attempt > 0) {
      const backoffMs = JINA_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, backoffMs));
    }

    // ── Recalcula timeout DINAMICAMENTE a cada tentativa baseado no budget restante ──
    // (Fix: usar valor stale pre-loop causava overshoot do deadline de 100s do CF proxy → 524)
    const remainingMs = deadline - Date.now();
    const clientTimeoutMs = Math.min(JINA_IDEAL_CLIENT_MS, remainingMs - 2_000);
    const serverTimeoutS = Math.min(JINA_IDEAL_SERVER_S, Math.floor((clientTimeoutMs - 5_000) / 1000));

    if (clientTimeoutMs < 12_000) {
      structuredLog('warn', 'Jina: budget insuficiente para tentativa', {
        attempt,
        remainingMs,
        clientTimeoutMs,
      });
      throw lastError.message !== 'Falha desconhecida ao buscar via Jina Reader.'
        ? lastError
        : new Error(`Jina: budget insuficiente (${Math.round(remainingMs / 1000)}s restantes).`);
    }

    structuredLog('info', `Jina browser-only tentativa ${attempt}`, {
      clientTimeoutMs,
      serverTimeoutS,
      remainingMs,
    });

    const fetchConfig: RequestInit = {
      method: 'GET',
      headers: {
        Accept: 'text/markdown',
        'X-Return-Format': 'markdown',
        // Chromium headless — CRÍTICO para SPAs como Gemini Share
        'X-Engine': 'browser',
        // Não incluir imagens — reduz payload e acelera resposta
        // Gemini faz a extração de conteúdo textual; imagens são desnecessárias
        'X-Retain-Images': 'none',
        // Bypassa cache Jina — evita respostas de erro cacheadas
        'X-No-Cache': 'true',
        DNT: '1',
        // X-Timeout recalculado por tentativa para respeitar o budget
        'X-Timeout': String(serverTimeoutS),
        ...authHeader,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), clientTimeoutMs);

    try {
      const jinaRes = await fetch(jinaUrl, { ...fetchConfig, signal: controller.signal });
      clearTimeout(timeoutId);

      // Rate limit: respeita Retry-After se presente
      if (jinaRes.status === 429) {
        const retryAfterHeader = jinaRes.headers.get('Retry-After');
        const waitMs = retryAfterHeader
          ? Math.min(parseInt(retryAfterHeader, 10) * 1000, 12_000)
          : JINA_RETRY_BASE_DELAY_MS * 2 ** attempt;
        lastError = new Error('Jina Reader retornou status 429 (rate limit).');
        structuredLog('warn', 'Jina 429 – aguardando', { attempt, waitMs });
        if (attempt < JINA_MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw new Error('Jina Reader retornou status 429.');
      }

      if (!jinaRes.ok) {
        throw new Error(`Jina Reader retornou status ${jinaRes.status}.`);
      }

      const content = await jinaRes.text();

      if (!content || content.trim().length < 50) {
        throw new Error('Jina Reader retornou conteúdo vazio ou insuficiente.');
      }

      structuredLog('info', 'Jina sucesso (browser-only)', {
        attempt,
        url: url.substring(0, 80),
        contentLength: content.length,
        elapsedMs: Date.now() - (deadline - JINA_TOTAL_BUDGET_MS),
      });
      return content;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        lastError = new Error(`Jina timeout (${serverTimeoutS}s). A página pode ser muito pesada.`);
        structuredLog('warn', 'Jina timeout', { attempt, serverTimeoutS, clientTimeoutMs });
        if (attempt < JINA_MAX_RETRIES - 1) continue;
        throw lastError;
      }

      lastError = err instanceof Error ? err : new Error(String(err));
      structuredLog('warn', 'Jina erro', { attempt, detail: lastError.message });
      if (attempt < JINA_MAX_RETRIES - 1) continue;
      throw lastError;
    }
  }

  throw lastError;
}

// Log estruturado
function structuredLog(level: 'info' | 'warn' | 'error', message: string, context: Record<string, unknown> = {}) {
  const logStr = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...context,
  });
  if (level === 'error') console.error(logStr);
  else if (level === 'warn') console.warn(logStr);
  else console.info(logStr);
}

const GEMINI_SHARE_RE = /^https:\/\/(?:gemini\.google\.com|g\.co\/gemini)\/share\/[a-zA-Z0-9_-]+\/?(?:\?.*)?$/;

function normalizeGeminiShareUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl.trim());
  if (parsed.hostname === 'g.co' && parsed.pathname.startsWith('/gemini/share/')) {
    return `https://gemini.google.com${parsed.pathname}${parsed.search}`;
  }
  if (parsed.hostname === 'gemini.google.com' && parsed.pathname.startsWith('/share/')) {
    return parsed.toString();
  }
  return rawUrl.trim();
}

function preprocessMarkdown(md: string): string {
  let processed = md;
  // 1. Ajusta títulos (de # até ######) para virarem no máximo H3 (###)
  processed = processed.replace(/^(#{1,6})\s/gm, '### ');
  // 2. Preserva imagens não estruturadas com um aviso formatado
  processed = processed.replace(/!\[([^\]]*)\]\([^)]+\)/g, '\n🖼️ *[Imagem não importada: $1]*\n');
  return processed;
}

function postprocessHtml(html: string): string {
  let processed = html;

  // 0. Remove parágrafos vazios preexistentes para evitar duplicação de espaçamento
  processed = processed.replace(/<p[^>]*>(?:<br\s*\/?>|&nbsp;|\s)*<\/p>\s*/gi, '');

  // 1. Configura justificação global e recuo de primeira linha (1.5rem) nos parágrafos normais
  // O TipTap lida com isso através da extensão TextIndent configurada em extensions.ts
  processed = processed.replace(/<p>/g, '<p style="text-align: justify; text-indent: 1.5rem">');

  // 2. Corrige parágrafos de placeholder de imagem marcados (removemos o recuo indesejado nelas)
  processed = processed.replace(
    /<p style="text-align: justify; text-indent: 1.5rem">(\s*)🖼️/g,
    '<p style="text-align: justify">$1🖼️',
  );

  // 3. Força alinhamento esquerdo nos headings (sem recuo de parágrafo)
  // Sem isso, h3 pode herdar text-align de contextos CSS ancestrais
  processed = processed.replace(/<h3>/g, '<h3 style="text-align: left">');

  // NOTA: NÃO inserimos <p><br></p> entre parágrafos.
  // O espaçamento entre parágrafos é controlado pelo CSS do PostReader:
  //   .html-content p { margin: 0 0 1.2rem 0 }
  // Inserir <p><br></p> adicional causa linhas em branco duplicadas.

  return processed;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://admin.lcv.app.br',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Outer bulletproof catch — NEVER let an unhandled exception escape
  // (CF Pages returns its own 502 HTML page if the Worker crashes without a Response)
  try {
    return await handleGeminiImport(context, corsHeaders);
  } catch (outerErr) {
    const detail = outerErr instanceof Error ? outerErr.message : String(outerErr);
    const stack = outerErr instanceof Error ? outerErr.stack : undefined;
    structuredLog('error', 'Uncaught fatal error in gemini-import', { detail, stack });
    return new Response(JSON.stringify({ error: `Erro fatal no servidor. Detalhe: ${detail}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

async function handleGeminiImport(
  context: Parameters<PagesFunction<Env>>[0],
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const env = context.data?.env || context.env;

  const contentType = context.request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: ImportRequest;
  try {
    const parsed = (await context.request.json()) as unknown;
    body = parsed as ImportRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawUrl = body.url || '';
  const url = normalizeGeminiShareUrl(rawUrl);

  if (!url || !GEMINI_SHARE_RE.test(url)) {
    return new Response(
      JSON.stringify({
        error: 'URL inválida. Use um link de compartilhamento do Gemini: https://gemini.google.com/share/...',
      }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (!env?.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'Falta variável GEMINI_API_KEY no deploy.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const activeModel = await resolveModel(env?.BIGDATA_DB);

  const _telemetryStart = Date.now();
  let finalMarkdown = '';
  let finalTitle = '';

  try {
    // 1. Fetch page content as clean markdown via Jina Reader
    const pageContent = await fetchSharePageContent(url, env?.JINA_API_KEY);

    // 2. Prompt Gemini Flash to extract structured conversation from markdown
    const systemInstructionConfig = `Você é um sistema de extração inteligente. Analise o conteúdo markdown de uma página de compartilhamento do Gemini.
Regras:
1. FIDELIDADE: Recupere todo o conteúdo da conversa (perguntas do usuário e respostas da IA) de forma idêntica ao original. Não resuma, não omita.
2. PRESERVAÇÃO: Mantenha imagens (![alt](url)), tabelas, e blocos de código com linguagem correta.
3. LIMPEZA: Descarte elementos de UI (Sign in, Settings, botões de menu).
4. TÍTULO: Infira o título principal da conversa.`;

    let usageMetadata = { promptTokens: 0, outputTokens: 0, cachedTokens: 0 };

    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    for (let tentativa = 0; tentativa < GEMINI_CONFIG.maxRetries; tentativa++) {
      try {
        const response = await ai.models.generateContent({
          model: activeModel,
          contents: `Extraia a conversa do conteúdo abaixo:\n\n${pageContent}`,
          config: {
            systemInstruction: systemInstructionConfig,
            temperature: GEMINI_CONFIG.temperature,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Título da conversa' },
                markdown: { type: 'STRING', description: 'Conteúdo em Markdown' },
              },
              required: ['title', 'markdown'],
            },
          },
        });

        const text = response.text;

        if (text) {
          usageMetadata = {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
            cachedTokens: response.usageMetadata?.cachedContentTokenCount || 0,
          };

          logAiUsage(env?.BIGDATA_DB, {
            module: 'mainsite_gemini_import',
            model: activeModel,
            input_tokens: usageMetadata.promptTokens,
            output_tokens: usageMetadata.outputTokens,
            latency_ms: Date.now() - _telemetryStart,
            status: 'ok',
          });

          // Parse JSON safely
          const result = JSON.parse(text) as { title: string; markdown: string };
          finalTitle = result.title;
          finalMarkdown = result.markdown;
          break;
        } else {
          throw new Error('Sem resposta da IA.');
        }
      } catch (err) {
        if (tentativa === GEMINI_CONFIG.maxRetries - 1) throw err;
        await new Promise((r) => setTimeout(r, GEMINI_CONFIG.retryDelayMs));
      }
    }
  } catch (err) {
    // Telemetria de erro
    logAiUsage(env?.BIGDATA_DB, {
      module: 'mainsite_gemini_import',
      model: activeModel,
      input_tokens: 0,
      output_tokens: 0,
      latency_ms: Date.now() - _telemetryStart,
      status: 'error',
      error_detail: err instanceof Error ? err.message : 'unknown',
    });
    structuredLog('error', 'Falha no import nativo do Gemini', {
      error: err instanceof Error ? err.message : 'Unknown',
    });

    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    // NEVER return 502 — Cloudflare proxy intercepts it and replaces body with HTML error page
    return new Response(JSON.stringify({ error: `Falha na importação Gemini. Detalhe: ${message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!finalMarkdown || finalMarkdown.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'Link privado ou nenhum conteúdo da conversa extraído do link fornecido.' }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Aplica pre-processamento (títulos e imagens)
  const preparedMarkdown = preprocessMarkdown(finalMarkdown);

  // Promise wrap is safe for future marked extensions compatibility
  let html = await marked.parse(preparedMarkdown);

  // Aplica pos-processamento (identação, justificação, espaçamento)
  html = postprocessHtml(html);

  return new Response(JSON.stringify({ html, title: finalTitle || undefined }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://admin.lcv.app.br',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
