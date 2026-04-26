/// <reference types="@cloudflare/workers-types" />

/**
 * POST /api/mainsite/ai/transform — Transformação de texto via Gemini SDK.
 * Migrado de REST fetch direto para @google/genai SDK oficial.
 */

import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import { logAiUsage } from '../../_lib/ai-telemetry';

export interface Env {
  GEMINI_API_KEY: string;
  BIGDATA_DB?: D1Database;
}

interface D1Database {
  prepare(query: string): {
    bind(...values: unknown[]): { run(): Promise<unknown>; first<T>(): Promise<T | null> };
    run(): Promise<unknown>;
  };
}

/** Fallback usado quando BIGDATA_DB não retorna modelo configurado para 'chat'. */
const FALLBACK_MODEL = 'gemini-2.5-pro';

const GEMINI_CONFIG = {
  maxTokensInput: 120000,
  maxRetries: 2,
  retryDelayMs: 800,
  endpoints: {
    transform: {
      temperature: 0.3,
      topP: 0.8,
      maxOutputTokens: 8192,
    },
  },
};

/**
 * Log estruturado em formato JSON
 */
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

async function resolveModel(db: D1Database | undefined): Promise<string> {
  if (!db) {
    structuredLog('warn', 'resolveModel: BIGDATA_DB unavailable, using fallback', { fallback: FALLBACK_MODEL });
    return FALLBACK_MODEL;
  }
  try {
    const row = await db
      .prepare('SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1')
      .bind('mainsite/ai_models')
      .first<{ payload?: string }>();
    if (row?.payload) {
      const parsed = JSON.parse(row.payload) as Record<string, unknown>;
      if (typeof parsed.editor === 'string' && parsed.editor) {
        structuredLog('info', 'resolveModel: model from DB', { model: parsed.editor });
        return parsed.editor;
      }
    }
  } catch (err) {
    structuredLog('warn', 'resolveModel: DB lookup failed, using fallback', {
      error: (err as Error).message,
      fallback: FALLBACK_MODEL,
    });
  }
  structuredLog('info', 'resolveModel: no model in DB, using fallback', { fallback: FALLBACK_MODEL });
  return FALLBACK_MODEL;
}

/**
 * Estima contagem de tokens via SDK countTokens
 */
async function estimateTokenCount(ai: GoogleGenAI, text: string, model: string): Promise<number> {
  try {
    const resp = await ai.models.countTokens({
      model,
      contents: text,
    });
    return resp.totalTokens ?? 0;
  } catch (error) {
    structuredLog('warn', 'Failed to count tokens', { error: (error as Error).message });
    return 0;
  }
}

/**
 * Valida a entrada de tokens
 */
function validateInputTokens(tokenCount: number) {
  if (tokenCount > GEMINI_CONFIG.maxTokensInput) {
    return {
      shouldReject: true,
      status: 413,
      error: `Texto enviado é muito extenso (${tokenCount} tokens > limite de ${GEMINI_CONFIG.maxTokensInput}).`,
    };
  }
  return { shouldReject: false };
}

// Safety settings via SDK enums
const TRANSFORM_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const resolvedEnv = ((context as { data?: { env?: Env } }).data?.env ?? context.env) as Env;

  if (!resolvedEnv.GEMINI_API_KEY) {
    structuredLog('error', 'GEMINI_API_KEY missing');
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY não configurada.' }), { status: 500 });
  }

  const _telemetryStart = Date.now();
  structuredLog('info', 'transform API call starting', { endpoint: 'transform' });
  const activeModel = await resolveModel(resolvedEnv.BIGDATA_DB);
  if (!activeModel) {
    structuredLog('error', 'transform: no model resolved');
    return new Response(
      JSON.stringify({ error: 'Modelo de IA não configurado. Configure em Configurações > Modelos de IA.' }),
      { status: 500 },
    );
  }

  const ai = new GoogleGenAI({ apiKey: resolvedEnv.GEMINI_API_KEY });

  try {
    const body = (await context.request.json()) as { action: string; text: string; instruction?: string };
    const { action, text, instruction } = body;

    if (!text || !action) {
      return new Response(JSON.stringify({ error: 'Ação ou texto não fornecido.' }), { status: 400 });
    }

    let promptInfo = '';
    switch (action) {
      case 'grammar':
        promptInfo = 'Corrija a gramática e a ortografia do texto a seguir. Retorne APENAS o texto corrigido.';
        break;
      case 'summarize':
        promptInfo = 'Resuma o texto a seguir de forma clara e concisa. Retorne APENAS o resumo direto.';
        break;
      case 'expand':
        promptInfo =
          'Expanda o texto a seguir adicionando detalhes e contexto, mantendo o tom original. Retorne APENAS o texto expandido.';
        break;
      case 'formal':
        promptInfo =
          'Reescreva o texto a seguir adotando um tom formal e profissional. Retorne APENAS o texto reescrito.';
        break;
      case 'freeform':
        if (!instruction)
          return new Response(JSON.stringify({ error: 'Instrução não fornecida para formatação livre.' }), {
            status: 400,
          });
        promptInfo = `Aja como um assistente de edição de texto para publicação. Aplique estritamente a seguinte instrução do usuário no texto abaixo: "${instruction}". Retorne APENAS o resultado final editado, sem introduções ou comentários adicionais.`;
        break;
      default:
        return new Response(JSON.stringify({ error: 'Ação de IA desconhecida.' }), { status: 400 });
    }

    const fullPrompt = `${promptInfo}\n\nTexto:\n${text}`;

    // Token Counting via SDK
    const inputTokens = await estimateTokenCount(ai, fullPrompt, activeModel);
    const validation = validateInputTokens(inputTokens);
    if (validation.shouldReject) {
      structuredLog('warn', 'Input rejected due to token count', { tokens: inputTokens });
      return new Response(JSON.stringify({ error: validation.error }), { status: validation.status });
    }

    let finalResponseText = '';
    let usageMetadata = { promptTokens: 0, outputTokens: 0 };

    // Retry loop
    for (let tentativa = 0; tentativa < GEMINI_CONFIG.maxRetries; tentativa++) {
      try {
        structuredLog('info', `Gemini request attempt ${tentativa + 1}`, {
          endpoint: 'transform',
          attempt: tentativa + 1,
          model: activeModel,
        });

        const response = await ai.models.generateContent({
          model: activeModel,
          contents: fullPrompt,
          config: {
            safetySettings: TRANSFORM_SAFETY_SETTINGS,
            temperature: GEMINI_CONFIG.endpoints.transform.temperature,
            topP: GEMINI_CONFIG.endpoints.transform.topP,
            maxOutputTokens: GEMINI_CONFIG.endpoints.transform.maxOutputTokens,
          },
        });

        const responseText = response.text;

        if (responseText) {
          // Usage Metadata Tracking
          usageMetadata = {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
          };

          structuredLog('info', 'Gemini request succeeded', {
            endpoint: 'transform',
            attempt: tentativa + 1,
            status: 200,
            usageMetadata,
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
          endpoint: 'transform',
          attempt: tentativa + 1,
          status,
          error: errorMsg,
        });

        if (tentativa === GEMINI_CONFIG.maxRetries - 1) {
          structuredLog('error', 'Gemini request error (final attempt)', {
            endpoint: 'transform',
            attempt: tentativa + 1,
            error: errorMsg,
          });
          throw err;
        }

        if (tentativa === 0) {
          await new Promise((r) => setTimeout(r, GEMINI_CONFIG.retryDelayMs));
        }
      }
    }

    if (!finalResponseText) {
      throw new Error(`Gemini API failed permanently após ${GEMINI_CONFIG.maxRetries} tentativas.`);
    }

    return new Response(JSON.stringify({ text: finalResponseText.trim() }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
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
    structuredLog('error', 'transform fatal error', {
      model: activeModel,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido na geração por IA.' }),
      { status: 500 },
    );
  }
};

