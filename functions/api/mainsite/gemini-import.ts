import { marked } from 'marked'
import { GoogleGenAI } from '@google/genai'

/**
 * gemini-import.ts — Cloudflare Pages Function
 * POST /api/mainsite/gemini-import
 * Fetches a Gemini share URL directly and utilizes Gemini SDK to cleanly parse its conversation.
 */

interface Env {
  GEMINI_API_KEY: string
  BIGDATA_DB?: D1Database
}

interface D1Database {
  prepare(query: string): { bind(...values: unknown[]): { run(): Promise<unknown> } }
}

interface PagesContext<E = Env> {
  request: Request
  env: E
}

type PagesFunction<E = Env> = (context: PagesContext<E>) => Promise<Response> | Response

interface ImportRequest {
  url: string
}

const GEMINI_CONFIG = {
  model: 'gemini-pro-latest',
  temperature: 0.1,
  topP: 0.8,
  maxRetries: 2,
  retryDelayMs: 1000
};

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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

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

  if (!context.env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Falta variável GEMINI_API_KEY no deploy.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const _telemetryStart = Date.now();
  let finalMarkdown = '';
  let finalTitle = '';

  try {
    // 1. Fetch the Gemini URL directly
    const shareRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!shareRes.ok) {
      throw new Error(`O servidor respondeu com status ${shareRes.status}`);
    }

    const htmlText = await shareRes.text();
    // 2. Strip standard html bloat to save tokens (SVGs, <script>, <style>)
    const cleanedHtml = htmlText
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

    // 3. Prompt native Gemini SDK to act as an extractor, returning JSON mode
    const systemInstructionConfig = `Você é um sistema de extração inteligente super avançado encarregado de parsear links de compartilhamento do Gemini.
Atue como um conversor de alta fidelidade para Markdown garantindo:
1. FIDELIDADE ABSOLUTA: Recupere todo o conteúdo da conversa (perguntas do usuário e respostas da IA) de forma idêntica ao original. Não resuma, não omita.
2. PRESERVAÇÃO DE ATIVOS: Você DEVE preservar TODAS as imagens (usando a sintaxe ![alt](url) do markdown extraindo os links 'src' verdadeiros das tags <img> do HTML do artigo), bem como quaisquer tabelas (formatadas precisamente como tabelas Markdown) e blocos de código (com as especificações de linguagem corretas).
3. LIMPEZA DE RUÍDO: Descarte inteiramente as partes que são puramente interface de usuário ('Sign in', 'Settings', botões de rodapé/menu), retendo exclusivamente o fluxo de conversa.
4. TÍTULO: Infira ou deduz o cabeçalho original ou título principal da conversa.`;

    const safetySettings = [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
    ];

    const config = {
      systemInstruction: systemInstructionConfig,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      safetySettings: safetySettings as any,
      temperature: GEMINI_CONFIG.temperature,
      topP: GEMINI_CONFIG.topP,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          title: {
            type: "STRING",
            description: "O título deduzido ou o cabeçalho original da conversa (ex: 'Plano de Marketing 2025')"
          },
          markdown: {
            type: "STRING",
            description: "O conteúdo puro da conversa integralmente limpo e reescrito em formatação Markdown (ex: *texto*, links em (), listas etc)"
          }
        },
        required: ["title", "markdown"],
      }
    };

    const ai = new GoogleGenAI({ apiKey: context.env.GEMINI_API_KEY });
    let usageMetadata = { promptTokens: 0, outputTokens: 0, cachedTokens: 0 };

    for (let tentativa = 0; tentativa < GEMINI_CONFIG.maxRetries; tentativa++) {
      try {
        const response = await ai.models.generateContent({
          model: GEMINI_CONFIG.model,
          contents: `Análise detalhadamente o código HTML da página do Gemini Share abaixo e extraia a conversa:\n\nHTML:\n${cleanedHtml}`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: config as any
        });

        if (response.text) {
          usageMetadata = {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
            cachedTokens: response.usageMetadata?.cachedContentTokenCount || 0,
          };

          logAiUsage(context.env.BIGDATA_DB, {
            module: 'mainsite_gemini_import',
            model: GEMINI_CONFIG.model,
            input_tokens: usageMetadata.promptTokens,
            output_tokens: usageMetadata.outputTokens,
            latency_ms: Date.now() - _telemetryStart,
            status: 'ok',
          });

          // Parse JSON safely
          const result = JSON.parse(response.text) as { title: string, markdown: string };
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
    logAiUsage(context.env.BIGDATA_DB, {
      module: 'mainsite_gemini_import',
      model: GEMINI_CONFIG.model,
      input_tokens: 0,
      output_tokens: 0,
      latency_ms: Date.now() - _telemetryStart,
      status: 'error',
      error_detail: err instanceof Error ? err.message : 'unknown',
    });
    structuredLog('error', 'Falha no import nativo do Gemini', { error: err instanceof Error ? err.message : 'Unknown' });

    const message = err instanceof Error ? err.message : 'Erro na leitura do HTML';
    return new Response(
      JSON.stringify({ error: `O Gemini encontrou erro ou falhou ao ler o link do formato compartilhado. Tente recriar o link público. Detalhe: ${message}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!finalMarkdown || finalMarkdown.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'Link privado ou nenhum conteúdo da conversa extraído do link fornecido.' }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Promise wrap is safe for future marked extensions compatibility
  const html = await marked.parse(finalMarkdown)

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

