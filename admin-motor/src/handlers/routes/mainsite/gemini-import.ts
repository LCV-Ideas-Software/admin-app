import { marked } from 'marked'/**
 * gemini-import.ts — Cloudflare Pages Function
 * POST /api/mainsite/gemini-import
 * Fetches a Gemini share URL directly and utilizes Gemini SDK to cleanly parse its conversation.
 */

interface Env {
  GEMINI_API_KEY: string
  JINA_API_KEY?: string
  BIGDATA_DB?: D1Database
  CF_AI_GATEWAY?: string
}

interface D1Database {
  prepare(query: string): { 
    bind(...values: unknown[]): { 
      run(): Promise<unknown>,
      all<T = unknown>(): Promise<{ results: T[] }>
    } 
  }
}

interface PagesContext<E = Env> {
  request: Request
  env: E
  data?: {
    env?: E
  }
}

type PagesFunction<E = Env> = (context: PagesContext<E>) => Promise<Response> | Response

interface ImportRequest {
  url: string
}

const GEMINI_CONFIG = {
  temperature: 0.1,
  maxRetries: 2,       // 2 tentativas efetivas na API Gemini
  retryDelayMs: 1500
};

const FALLBACK_MODEL = 'gemini-2.5-flash';

async function resolveModel(db: D1Database | undefined): Promise<string> {
  if (!db) return FALLBACK_MODEL;
  try {
    const res = await db.prepare('SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1')
      .bind('mainsite/ai_models').all<{ payload: string }>();
    if (res.results && res.results.length > 0 && res.results[0].payload) {
      const parsed = JSON.parse(res.results[0].payload) as { import?: string };
      if (parsed.import) return parsed.import;
    }
  } catch { /* fallback silently */ }
  return FALLBACK_MODEL;
}

// Jina.ai Reader API — fetches page content as clean markdown
// (direct fetch from Cloudflare Worker IPs ALWAYS triggers Google CAPTCHA)
//
// Tier 1: POST para a URL base (https://r.jina.ai/) com JSON body
// Tier 2: GET com URL no path  (https://r.jina.ai/{url})
const JINA_BASE_URL = 'https://r.jina.ai/';

// ── Tier 1: browser + readerlm-v2 (qualidade máxima, serverless com cold-start)
// X-Engine: 'browser' — Chromium headless (único engine válido para SPAs)
// readerlm-v2 é modelo AI serverless em beta — pode dar 503 ou timeout em páginas pesadas
// SEM retry no T1: se falhar, faz fallback IMEDIATO para T2 (evita desperdiçar 55s extra)
const JINA_TIMEOUT_MS_T1        = 65_000; // margem 7s acima do X-Timeout server
const JINA_SERVER_TIMEOUT_T1_S  = 58;     // Jina aguarda browser render (~20s) + ReaderLM (~30s)

// ── Tier 2: browser-only (fallback universal quando T1 falha por qualquer motivo)
// Confirmado via teste live (2026-04-05): X-Engine: 'browser' sem readerlm-v2 retorna 200 OK
const JINA_TIMEOUT_MS_T2        = 38_000;
const JINA_SERVER_TIMEOUT_T2_S  = 30;

// Retry: T1 = 1 tentativa (sem retry); T2 = 2 tentativas com backoff
const JINA_MAX_RETRIES_T1      = 1;      // sem retry — fallback imediato para T2
const JINA_MAX_RETRIES_T2      = 2;      // retry com backoff exponencial
const JINA_RETRY_BASE_DELAY_MS = 1_500;

/**
 * Fetch Gemini share page content as markdown via Jina Reader.
 *
 * Estratégia de 2 tiers (auditada e otimizada em 2026-04-05):
 *   Tier 1 — browser + readerlm-v2 (qualidade máxima, 1 tentativa):
 *             POST com JSON body, Accept: text/event-stream, resposta parseada via SSE.
 *             readerlm-v2 é serverless beta — pode dar 503, timeout, ou SSE error.
 *             SEM retry: se falhar por QUALQUER motivo → fallback IMEDIATO para T2.
 *   Tier 2 — browser-only (fallback universal, 2 tentativas com backoff):
 *             GET clássico, Accept: text/markdown; confirmado 200 OK em testes live.
 *
 * Limites Jina (ref: https://jina.ai/reader/):
 *  - Sem API key: 20 RPM por IP (IP compartilhado Cloudflare → risco alto)
 *  - Com API key: 500 RPM por key
 * Solução: JINA_API_KEY sempre presente via Cloudflare Secrets.
 *
 * Worst case total: ~65s (T1) + ~77s (T2×2) ≈ 142s — viável em Workers paid plan.
 */
async function fetchSharePageContent(url: string, jinaApiKey?: string): Promise<string> {
  // Diagnóstico de API key — não expõe o valor, apenas presença
  structuredLog('info', 'Jina fetch iniciado', {
    hasApiKey: Boolean(jinaApiKey && jinaApiKey.length > 0),
    url: url.substring(0, 80),
  });

  try {
    // Tier 1: browser + readerlm-v2 (qualidade máxima, 1 tentativa única)
    return await fetchJinaTier(url, jinaApiKey, true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Fallback UNIVERSAL para T2 — qualquer falha do T1 (timeout, 503, SSE error, etc)
    structuredLog('warn', 'Jina T1 falhou – degradando para Tier 2 (browser-only)', {
      url: url.substring(0, 80),
      t1Error: msg,
    });
    return await fetchJinaTier(url, jinaApiKey, false);
  }
}

/**
 * Executa fetch via Jina Reader com retry e exponential backoff.
 *
 * @param useReaderlm true = Tier 1 (POST + browser + readerlm-v2 + SSE, 1 tentativa)
 *                    false = Tier 2 (GET + browser + text/markdown, 2 tentativas)
 */
async function fetchJinaTier(
  url: string,
  jinaApiKey: string | undefined,
  useReaderlm: boolean,
): Promise<string> {
  const serverTimeoutS  = useReaderlm ? JINA_SERVER_TIMEOUT_T1_S : JINA_SERVER_TIMEOUT_T2_S;
  const clientTimeoutMs = useReaderlm ? JINA_TIMEOUT_MS_T1 : JINA_TIMEOUT_MS_T2;
  const maxRetries      = useReaderlm ? JINA_MAX_RETRIES_T1 : JINA_MAX_RETRIES_T2;
  const tierLabel       = useReaderlm ? 'T1(browser+readerlm-v2)' : 'T2(browser-only)';

  // ─ Tier 1: POST com JSON body (browser + readerlm-v2 + SSE)
  // ─ Tier 2: GET com URL no path (browser + markdown)
  const authHeader: Record<string, string> = jinaApiKey
    ? { 'Authorization': `Bearer ${jinaApiKey}` }
    : {};

  const fetchConfig: RequestInit = useReaderlm
    ? {
        method:  'POST',
        headers: {
          'Content-Type':         'application/json',
          // SSE stream — Jina entrega conteúdo progressivamente;
          // parseJinaSSEStream extrai o conteúdo final acumulado
          'Accept':               'text/event-stream',
          // Engine browser (Chromium headless) — engine correto para SPAs como Gemini Share
          // NOTA: 'cf-browser-rendering' é inválido no Jina Reader; usar 'browser'
          'X-Engine':             'browser',
          // Extração AI de conteúdo principal (remove nav/menus/botões)
          'X-Respond-With':       'readerlm-v2',
          // Gera alt-text para imagens (melhora fidelidade do markdown)
          'X-With-Generated-Alt':  'true',
          // Preserva imagens como data URLs base64 inline no markdown
          'X-Keep-Img-Data-Url':   'true',
          // Bypassa cache Jina — evita 503 cacheados de tentativas anteriores
          'X-No-Cache':           'true',
          // Do Not Cache or Track
          'DNT':                  '1',
          'X-Timeout':            String(serverTimeoutS),
          ...authHeader,
        },
        body: JSON.stringify({ url }),
      }
    : {
        method:  'GET',
        headers: {
          'Accept':          'text/markdown',
          'X-Return-Format': 'markdown',
          // Chromium headless — CRÍTICO para SPAs como Gemini Share
          'X-Engine':        'browser',
          'X-No-Cache':      'true',
          'DNT':             '1',
          'X-Timeout':       String(serverTimeoutS),
          ...authHeader,
        },
      };

  // URL: POST usa base URL (body contém a URL alvo); GET usa URL no path
  const jinaUrl = useReaderlm ? JINA_BASE_URL : `${JINA_BASE_URL}${url}`;

  let lastError: Error = new Error('Falha desconhecida ao buscar via Jina Reader.');

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Backoff antes da 2ª tentativa do mesmo tier
    if (attempt > 0) {
      const backoffMs = JINA_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1); // 1.5s
      await new Promise(r => setTimeout(r, backoffMs));
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), clientTimeoutMs);

    try {
      const jinaRes = await fetch(jinaUrl, { ...fetchConfig, signal: controller.signal });
      clearTimeout(timeoutId);

      // Rate limit: respeita Retry-After se presente
      if (jinaRes.status === 429) {
        const retryAfterHeader = jinaRes.headers.get('Retry-After');
        const waitMs = retryAfterHeader
          ? Math.min(parseInt(retryAfterHeader, 10) * 1000, 12_000)
          : JINA_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        lastError = new Error('Jina Reader retornou status 429 (tente novamente em breve).');
        structuredLog('warn', `Jina ${tierLabel} 429 – aguardando`, { attempt, waitMs });
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
        throw new Error('Jina Reader retornou status 429.');
      }

      if (!jinaRes.ok) {
        throw new Error(`Jina Reader retornou status ${jinaRes.status}.`);
      }

      // Tier 1: parseia SSE stream e retorna conteúdo final acumulado
      // Tier 2: leitura direta do body text (markdown puro)
      const content = useReaderlm
        ? await parseJinaSSEStream(jinaRes)
        : await jinaRes.text();

      structuredLog('info', `Jina sucesso via ${tierLabel}`, { attempt, url: url.substring(0, 80) });
      return content;

    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        lastError = new Error(`Jina ${tierLabel} timeout (${serverTimeoutS}s). A página pode ser muito pesada.`);
        structuredLog('warn', `Jina ${tierLabel} timeout`, { attempt, serverTimeoutS, clientTimeoutMs });
        if (attempt < maxRetries - 1) continue;
        throw lastError;
      }

      lastError = err instanceof Error ? err : new Error(String(err));
      structuredLog('warn', `Jina ${tierLabel} erro`, { attempt, detail: lastError.message });
      if (attempt < maxRetries - 1) continue;
      throw lastError;
    }
  }

  throw lastError;
}

/**
 * Parseia stream SSE do Jina Reader (Accept: text/event-stream).
 *
 * O Jina usa compound SSE events com campo 'event:' que indica o tipo:
 *   - Evento normal:  sem 'event:' (default 'message') → data contém JSON com 'content'
 *   - Evento de erro: 'event: error' → data contém JSON com 'code' e 'message'
 *
 * IMPORTANTE: Jina retorna HTTP 200 mesmo quando readerlm-v2 está em capacidade!
 * O 503 é transmitido DENTRO do stream SSE como 'event: error'.
 * Este parser detecta e propaga esse erro com o código embutido na mensagem,
 * permitindo que fetchSharePageContent acione o fallback Tier 2 via msg.includes('503').
 *
 * Formato confirmado via live test (2026-04-05):
 *   event: error\n
 *   data: {"code":503,"name":"ServiceNodeResourceDrainError","message":"..."}\n\n
 */
async function parseJinaSSEStream(response: Response): Promise<string> {
  if (!response.body) {
    throw new Error('Jina SSE: resposta sem body stream.');
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer      = '';
  let lastContent = '';

  /**
   * Processa um bloco SSE completo (separado por \n\n).
   * Retorna false (noop) ou lança erro se for evento de erro.
   */
  function processSSEBlock(block: string): void {
    const lines = block.split('\n');
    let eventType  = 'message'; // default SSE type quando 'event:' ausente
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        dataLines.push(line.slice(6));
      }
    }

    const raw = dataLines.join('\n').trim();
    if (!raw || raw === '[DONE]') return;

    if (eventType === 'error') {
      // Jina transmite 'event: error' com código HTTP dentro do JSON
      // (ex.: 503 quando readerlm-v2 está em capacidade)
      try {
        const errPayload = JSON.parse(raw) as {
          code?: number; status?: number; message?: string;
        };
        const code = errPayload.code ?? errPayload.status ?? 0;
        const msg  = errPayload.message ?? 'Erro no Jina SSE';
        // Inclui o código na mensagem para que o caller detecte '503'
        throw new Error(`Jina SSE erro ${code}: ${msg}`);
      } catch (e) {
        // Re-lança erros já formatados; para parse failure usa raw
        if (e instanceof Error && e.message.startsWith('Jina SSE erro')) throw e;
        throw new Error(`Jina SSE erro: ${raw.substring(0, 100)}`);
      }
    }

    // Evento de dados normal: extrai 'content' do JSON
    try {
      const payload = JSON.parse(raw) as { content?: string; text?: string };
      const text = payload.content ?? payload.text ?? '';
      if (text) lastContent = text;
    } catch {
      // Fallback: dado não-JSON — trata como markdown literal acumulado
      if (raw.length > lastContent.length) lastContent = raw;
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Eventos SSE são separados por \n\n
      const events = buffer.split('\n\n');
      // Último elemento pode estar incompleto — mantém no buffer
      buffer = events.pop() ?? '';

      for (const event of events) {
        processSSEBlock(event);
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Processa buffer residual após stream finalizar
  if (buffer.trim()) {
    processSSEBlock(buffer);
  }

  if (!lastContent) {
    throw new Error('Jina SSE: sem conteúdo válido no stream de resposta.');
  }
  return lastContent;
}

// Log estruturado
function structuredLog(level: 'info' | 'warn' | 'error', message: string, context: Record<string, unknown> = {}) {
  const logStr = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...context
  });
  if (level === 'error') console.error(logStr);
  else if (level === 'warn') console.warn(logStr);
  else console.info(logStr);
}

// Telemetria (fire-and-forget)
interface TelemetryPayload {
  module: string; model: string;
  input_tokens: number; output_tokens: number;
  latency_ms: number; status: string;
  error_detail?: string;
}
function logAiUsage(db: D1Database | undefined, payload: TelemetryPayload) {
  if (!db) return;
  db.prepare(`
    INSERT INTO ai_usage_logs (module, model, input_tokens, output_tokens, latency_ms, status, error_detail)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    payload.module, payload.model,
    payload.input_tokens, payload.output_tokens,
    payload.latency_ms, payload.status,
    payload.error_detail || null,
  ).run().catch(() => { /* do not break flow */ });
}

const GEMINI_SHARE_RE = /^https:\/\/(?:gemini\.google\.com|g\.co\/gemini)\/share\/[a-zA-Z0-9_-]+\/?(?:\?.*)?$/

function normalizeGeminiShareUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl.trim())
  if (parsed.hostname === 'g.co' && parsed.pathname.startsWith('/gemini/share/')) {
    return `https://gemini.google.com${parsed.pathname}${parsed.search}`
  }
  if (parsed.hostname === 'gemini.google.com' && parsed.pathname.startsWith('/share/')) {
    return parsed.toString()
  }
  return rawUrl.trim()
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
  processed = processed.replace(/<p style="text-align: justify; text-indent: 1.5rem">(\s*)🖼️/g, '<p style="text-align: justify">$1🖼️');
  
  // 3. Insere um espaçamento vertical explícito (linha vazia) entre blocos de parágrafos
  // <br> é reconhecido garantidamente pelo Tiptap como quebra de linha rígida
  processed = processed.replace(/<\/p>\s*<p/g, '</p>\n<p><br></p>\n<p');
  
  return processed;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // Outer bulletproof catch — NEVER let an unhandled exception escape
  // (CF Pages returns its own 502 HTML page if the Worker crashes without a Response)
  try {
    return await handleGeminiImport(context, corsHeaders);
  } catch (outerErr) {
    const detail = outerErr instanceof Error ? outerErr.message : String(outerErr);
    const stack = outerErr instanceof Error ? outerErr.stack : undefined;
    structuredLog('error', 'Uncaught fatal error in gemini-import', { detail, stack });
    return new Response(
      JSON.stringify({ error: `Erro fatal no servidor. Detalhe: ${detail}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleGeminiImport(
  context: Parameters<PagesFunction<Env>>[0],
  corsHeaders: Record<string, string>
): Promise<Response> {
  const env = context.data?.env || context.env;

  const contentType = context.request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: ImportRequest
  try {
    const parsed = await context.request.json() as unknown
    body = parsed as ImportRequest
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rawUrl = body.url || ''
  const url = normalizeGeminiShareUrl(rawUrl)

  if (!url || !GEMINI_SHARE_RE.test(url)) {
    return new Response(
      JSON.stringify({ error: 'URL inválida. Use um link de compartilhamento do Gemini: https://gemini.google.com/share/...' }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!env?.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Falta variável GEMINI_API_KEY no deploy.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
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

    for (let tentativa = 0; tentativa < GEMINI_CONFIG.maxRetries; tentativa++) {
      try {
        const payload = {
          contents: [{ parts: [{ text: `Extraia a conversa do conteúdo abaixo:\n\n${pageContent}` }] }],
          systemInstruction: { parts: [{ text: systemInstructionConfig }] },
          generationConfig: {
            temperature: GEMINI_CONFIG.temperature,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                title: { type: "string", description: "Título da conversa" },
                markdown: { type: "string", description: "Conteúdo em Markdown" }
              },
              required: ["title", "markdown"],
            }
          }
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${env?.GEMINI_API_KEY}`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as { 
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>, 
          usageMetadata?: { promptTokenCount?: number, candidatesTokenCount?: number, cachedContentTokenCount?: number } 
        };
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          usageMetadata = {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
            cachedTokens: data.usageMetadata?.cachedContentTokenCount || 0,
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
          const result = JSON.parse(text) as { title: string, markdown: string };
          finalTitle = result.title;
          finalMarkdown = result.markdown;
          break;
        } else {
          throw new Error('Sem resposta da IA.');
        }
      } catch (err) {
        if (tentativa === GEMINI_CONFIG.maxRetries - 1) throw err;
        await new Promise(r => setTimeout(r, GEMINI_CONFIG.retryDelayMs));
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
    structuredLog('error', 'Falha no import nativo do Gemini', { error: err instanceof Error ? err.message : 'Unknown' });

    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    // NEVER return 502 — Cloudflare proxy intercepts it and replaces body with HTML error page
    return new Response(
      JSON.stringify({ error: `Falha na importação Gemini. Detalhe: ${message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!finalMarkdown || finalMarkdown.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'Link privado ou nenhum conteúdo da conversa extraído do link fornecido.' }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Aplica pre-processamento (títulos e imagens)
  const preparedMarkdown = preprocessMarkdown(finalMarkdown)

  // Promise wrap is safe for future marked extensions compatibility
  let html = await marked.parse(preparedMarkdown)
  
  // Aplica pos-processamento (identação, justificação, espaçamento)
  html = postprocessHtml(html)

  return new Response(
    JSON.stringify({ html, title: finalTitle || undefined }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

