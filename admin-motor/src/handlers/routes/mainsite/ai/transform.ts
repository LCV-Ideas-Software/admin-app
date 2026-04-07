/// <reference types="@cloudflare/workers-types" />

/**
 * @typedef {Object} GeminiConfig
 * @property {string} version - Versão da API (ex: 'v1beta')
 * @property {number} maxTokensInput - Limite máximo tokens entrada (120000)
 * @property {number} maxRetries - Tentativas (2)
 * @property {number} retryDelayMs - Delay entre tentativas (800)
 */

export interface Env {
  GEMINI_API_KEY: string
  BIGDATA_DB?: D1Database
}

interface D1Database {
  prepare(query: string): { bind(...values: unknown[]): { run(): Promise<unknown>; first<T>(): Promise<T|null> }; run(): Promise<unknown> }
}

/** Fallback usado quando BIGDATA_DB não retorna modelo configurado para 'chat'. */
const FALLBACK_MODEL = 'gemini-2.5-pro';

const GEMINI_CONFIG = {
  version: 'v1beta',
  maxTokensInput: 120000,
  maxRetries: 2,
  retryDelayMs: 800,
  defaultThinkingConfig: { thinkingLevel: 'HIGH' },
  endpoints: {
    transform: {
      temperature: 0.3,
      topP: 0.8,
      maxOutputTokens: 8192
    }
  }
};

/**
 * Log estruturado em formato JSON
 * @param {'info'|'warn'|'error'} level 
 * @param {string} message 
 * @param {Object} context 
 */
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

async function resolveModel(db: D1Database | undefined): Promise<string> {
  if (!db) {
    structuredLog('warn', 'resolveModel: BIGDATA_DB unavailable, using fallback', { fallback: FALLBACK_MODEL });
    return FALLBACK_MODEL;
  }
  try {
    const row = await db.prepare('SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1').bind('mainsite/ai_models').first<{ payload?: string }>();
    if (row?.payload) {
      const parsed = JSON.parse(row.payload) as Record<string, unknown>;
      if (typeof parsed.editor === 'string' && parsed.editor) {
        structuredLog('info', 'resolveModel: model from DB', { model: parsed.editor });
        return parsed.editor;
      }
    }
  } catch (err) {
    structuredLog('warn', 'resolveModel: DB lookup failed, using fallback', { error: (err as Error).message, fallback: FALLBACK_MODEL });
  }
  structuredLog('info', 'resolveModel: no model in DB, using fallback', { fallback: FALLBACK_MODEL });
  return FALLBACK_MODEL;
}

/**
 * Estima contagem de tokens via countTokens API
 * @param {string} text 
 * @param {string} apiKey 
 * @param {string} baseUrl
 * @param {string} model
 * @returns {Promise<number>}
 */
async function estimateTokenCount(text: string, apiKey: string, baseUrl: string, model: string): Promise<number> {
  try {
    const payload = { contents: [{ parts: [{ text }] }] };
    const res = await fetch(`${baseUrl}/v1beta/models/${model}:countTokens?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return 0;
    const data = await res.json() as { totalTokens?: number };
    return data?.totalTokens || 0;
  } catch (error) {
    structuredLog('warn', 'Failed to count tokens', { error: (error as Error).message });
    return 0;
  }
}

/**
 * Valida a entrada de tokens
 * @param {number} tokenCount 
 */
function validateInputTokens(tokenCount: number) {
  if (tokenCount > GEMINI_CONFIG.maxTokensInput) {
    return {
      shouldReject: true,
      status: 413,
      error: `Texto enviado é muito extenso (${tokenCount} tokens > limite de ${GEMINI_CONFIG.maxTokensInput}).`
    };
  }
  return { shouldReject: false };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const resolvedEnv = ((context as { data?: { env?: Env } }).data?.env ?? context.env) as Env;

  if (!resolvedEnv.GEMINI_API_KEY) {
    structuredLog('error', 'GEMINI_API_KEY missing');
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada." }), { status: 500 });
  }

  const _telemetryStart = Date.now();
  structuredLog('info', 'transform API call starting', { endpoint: 'transform' });
  const activeModel = await resolveModel(resolvedEnv.BIGDATA_DB);
  if (!activeModel) {
    structuredLog('error', 'transform: no model resolved');
    return new Response(JSON.stringify({ error: 'Modelo de IA não configurado. Configure em Configurações > Modelos de IA.' }), { status: 500 });
  }
  const baseUrl: string = 'https://generativelanguage.googleapis.com';

  try {
    const body = await context.request.json() as { action: string, text: string, instruction?: string };
    const { action, text, instruction } = body;
    
    if (!text || !action) {
      return new Response(JSON.stringify({ error: "Ação ou texto não fornecido." }), { status: 400 });
    }

    let promptInfo = "";
    switch (action) {
      case "grammar": promptInfo = "Corrija a gramática e a ortografia do texto a seguir. Retorne APENAS o texto corrigido."; break;
      case "summarize": promptInfo = "Resuma o texto a seguir de forma clara e concisa. Retorne APENAS o resumo direto."; break;
      case "expand": promptInfo = "Expanda o texto a seguir adicionando detalhes e contexto, mantendo o tom original. Retorne APENAS o texto expandido."; break;
      case "formal": promptInfo = "Reescreva o texto a seguir adotando um tom formal e profissional. Retorne APENAS o texto reescrito."; break;
      case "freeform": 
        if (!instruction) return new Response(JSON.stringify({ error: "Instrução não fornecida para formatação livre." }), { status: 400 });
        promptInfo = `Aja como um assistente de edição de texto para publicação. Aplique estritamente a seguinte instrução do usuário no texto abaixo: "${instruction}". Retorne APENAS o resultado final editado, sem introduções ou comentários adicionais.`; 
        break;
      default: return new Response(JSON.stringify({ error: "Ação de IA desconhecida." }), { status: 400 });
    }

    const fullPrompt = `${promptInfo}\n\nTexto:\n${text}`;

    // 1 & 10. Token Counting & Input Validation
    const inputTokens = await estimateTokenCount(fullPrompt, resolvedEnv.GEMINI_API_KEY as string, baseUrl, activeModel);
    const validation = validateInputTokens(inputTokens);
    if (validation.shouldReject) {
      structuredLog('warn', 'Input rejected due to token count', { tokens: inputTokens });
      return new Response(JSON.stringify({ error: validation.error }), { status: validation.status });
    }

    // 3. Improved Safety Settings
    const safetySettings = [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" }
    ];

    let finalResponseText = '';
    let usageMetadata = { promptTokens: 0, outputTokens: 0, cachedTokens: 0 };
    
    // 7. Detailed Retry Handling
    for (let tentativa = 0; tentativa < GEMINI_CONFIG.maxRetries; tentativa++) {
      try {
        structuredLog('info', `Gemini request attempt ${tentativa + 1}`, {
          endpoint: 'transform', attempt: tentativa + 1, model: activeModel
        });
        
        const payload = {
          contents: [{ parts: [{ text: fullPrompt }] }],
          safetySettings,
          generationConfig: {
            temperature: GEMINI_CONFIG.endpoints.transform.temperature,
            topP: GEMINI_CONFIG.endpoints.transform.topP,
            maxOutputTokens: GEMINI_CONFIG.endpoints.transform.maxOutputTokens
          }
        };

        const response = await fetch(`${baseUrl}/v1beta/models/${activeModel}:generateContent?key=${resolvedEnv.GEMINI_API_KEY as string}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          structuredLog('error', 'Gemini API error response', {
            endpoint: 'transform', attempt: tentativa + 1,
            status: response.status, statusText: response.statusText,
            body: errBody.substring(0, 300),
            model: activeModel,
          });
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>, usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; cachedContentTokenCount?: number } };
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (responseText) {
          // 5. Usage Metadata Tracking
          usageMetadata = {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
            cachedTokens: data.usageMetadata?.cachedContentTokenCount || 0,
          };
          
          structuredLog('info', 'Gemini request succeeded', {
            endpoint: 'transform', attempt: tentativa + 1, status: 200, usageMetadata
          });

          // Telemetria → ai_usage_logs (fire-and-forget)
          logAiUsage(resolvedEnv.BIGDATA_DB as D1Database | undefined, {
            module: 'mainsite',
            model: activeModel,
            input_tokens: usageMetadata.promptTokens,
            output_tokens: usageMetadata.outputTokens,
            latency_ms: Date.now() - _telemetryStart,
            status: 'ok',
          });
          
          finalResponseText = responseText;
          break;
        } else {
          throw new Error('Sem texto retornado na resposta da IA');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const status = (err as { status?: number }).status || 500;
        structuredLog('warn', `Gemini request failed, will retry`, {
          endpoint: 'transform', attempt: tentativa + 1, status, error: errorMsg
        });
        
        if (tentativa === GEMINI_CONFIG.maxRetries - 1) {
           structuredLog('error', 'Gemini request error (final attempt)', {
             endpoint: 'transform', attempt: tentativa + 1, error: errorMsg
           });
           throw err;
        }
        
        if (tentativa === 0) {
          await new Promise(r => setTimeout(r, GEMINI_CONFIG.retryDelayMs));
        }
      }
    }

    if (!finalResponseText) {
      throw new Error(`Gemini API failed permanently após ${GEMINI_CONFIG.maxRetries} tentativas.`);
    }

    return new Response(JSON.stringify({ text: finalResponseText.trim() }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });

  } catch (error) {
    // Telemetria de erro
    logAiUsage(resolvedEnv.BIGDATA_DB as D1Database | undefined, {
      module: 'mainsite',
      model: activeModel,
      input_tokens: 0,
      output_tokens: 0,
      latency_ms: Date.now() - _telemetryStart,
      status: 'error',
      error_detail: error instanceof Error ? error.message : 'unknown',
    });
    structuredLog('error', 'transform fatal error', { model: activeModel, baseUrl, error: error instanceof Error ? error.message : 'Erro desconhecido' });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido na geração por IA." }), { status: 500 });
  }
};

/* ── Helper de telemetria (fire-and-forget, nunca bloqueia o fluxo) ── */
interface TelemetryPayload {
  module: string; model: string;
  input_tokens: number; output_tokens: number;
  latency_ms: number; status: string;
  error_detail?: string;
}
function logAiUsage(db: D1Database | undefined, payload: TelemetryPayload) {
  if (!db) return;
  (async () => {
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS ai_usage_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          module TEXT NOT NULL,
          model TEXT NOT NULL,
          input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0,
          latency_ms INTEGER DEFAULT 0,
          status TEXT DEFAULT 'ok',
          error_detail TEXT
        )
      `).run();
      await db.prepare(`
        INSERT INTO ai_usage_logs (module, model, input_tokens, output_tokens, latency_ms, status, error_detail)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        payload.module, payload.model,
        payload.input_tokens, payload.output_tokens,
        payload.latency_ms, payload.status,
        payload.error_detail || null,
      ).run();
    } catch (err) {
      console.warn('[telemetry] ai_usage_logs INSERT failed:', err instanceof Error ? err.message : err);
    }
  })();
}

