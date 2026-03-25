/// <reference types="@cloudflare/workers-types" />

/**
 * @typedef {Object} GeminiConfig
 * @property {string} model - Modelo Gemini (ex: 'gemini-pro-latest')
 * @property {string} version - Versão da API (ex: 'v1beta')
 * @property {number} maxTokensInput - Limite máximo tokens entrada (120000)
 * @property {number} maxRetries - Tentativas (2)
 * @property {number} retryDelayMs - Delay entre tentativas (800)
 */

export interface Env {
  GEMINI_API_KEY: string
}

interface GeminiResponse {
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    cachedContentTokenCount?: number;
  };
  candidates?: {
    content?: {
      parts?: {
        text?: string;
        thought?: boolean;
      }[];
    };
  }[];
}

const GEMINI_CONFIG = {
  model: 'gemini-pro-latest',
  version: 'v1beta',
  maxTokensInput: 120000,
  maxRetries: 2,
  retryDelayMs: 800,
  defaultThinkingConfig: { thinkingLevel: 'HIGH' },
  endpoints: {
    transform: {
      temperature: 0.3,
      topP: 0.8,
      maxOutputTokens: 4096
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

/**
 * Estima contagem de tokens via countTokens API
 * @param {string} text 
 * @param {string} apiKey 
 * @returns {Promise<number>}
 */
async function estimateTokenCount(text: string, apiKey: string): Promise<number> {
  try {
    const url = `https://generativelanguage.googleapis.com/${GEMINI_CONFIG.version}/models/${GEMINI_CONFIG.model}:countTokens?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text }] }] };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json() as { totalTokens?: number };
      return data.totalTokens || 0;
    }
    return 0;
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

/**
 * Extrai usageMetadata do payload de resposta
 * @param {Object} responseData 
 */
function extractUsageMetadata(responseData: GeminiResponse) {
  if (!responseData?.usageMetadata) return { promptTokens: 0, outputTokens: 0, cachedTokens: 0 };
  return {
    promptTokens: responseData.usageMetadata.promptTokenCount || 0,
    outputTokens: responseData.usageMetadata.candidatesTokenCount || 0,
    cachedTokens: responseData.usageMetadata.cachedContentTokenCount || 0
  };
}

/**
 * Extrai apenas o texto válido ignorando o thinking block
 * @param {Array} parts 
 */
function extractTextFromParts(parts: { text?: string; thought?: boolean }[] | undefined) {
  return (parts || [])
    .filter(p => p.text && !p.thought)
    .map(p => p.text)
    .join('');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  if (!context.env.GEMINI_API_KEY) {
    structuredLog('error', 'GEMINI_API_KEY missing');
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada." }), { status: 500 });
  }

  structuredLog('info', 'transform API call starting', { endpoint: 'transform' });

  try {
    const body = await context.request.json() as { action: string, text: string };
    const { action, text } = body;
    
    if (!text || !action) {
      return new Response(JSON.stringify({ error: "Ação ou texto não fornecido." }), { status: 400 });
    }

    let promptInfo = "";
    switch (action) {
      case "grammar": promptInfo = "Corrija a gramática e a ortografia do texto a seguir. Retorne APENAS o texto corrigido."; break;
      case "summarize": promptInfo = "Resuma o texto a seguir de forma clara e concisa. Retorne APENAS o resumo direto."; break;
      case "expand": promptInfo = "Expanda o texto a seguir adicionando detalhes e contexto, mantendo o tom original. Retorne APENAS o texto expandido."; break;
      case "formal": promptInfo = "Reescreva o texto a seguir adotando um tom formal e profissional. Retorne APENAS o texto reescrito."; break;
      default: return new Response(JSON.stringify({ error: "Ação de IA desconhecida." }), { status: 400 });
    }

    const fullPrompt = `${promptInfo}\n\nTexto:\n${text}`;

    // 1 & 10. Token Counting & Input Validation
    const inputTokens = await estimateTokenCount(fullPrompt, context.env.GEMINI_API_KEY);
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

    const generateUrl = `https://generativelanguage.googleapis.com/${GEMINI_CONFIG.version}/models/${GEMINI_CONFIG.model}:generateContent?key=${context.env.GEMINI_API_KEY}`;
    
    const payload = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      safetySettings,
      generationConfig: {
        temperature: GEMINI_CONFIG.endpoints.transform.temperature,
        topP: GEMINI_CONFIG.endpoints.transform.topP,
        maxOutputTokens: GEMINI_CONFIG.endpoints.transform.maxOutputTokens, // 4. MaxOutputTokens Configurado
        // 8. Thinking Model Support
        thinkingConfig: GEMINI_CONFIG.defaultThinkingConfig
      }
    };

    let lastStatus = 502;
    let finalResponse: GeminiResponse | null = null;

    // 7. Detailed Retry Handling
    for (let tentativa = 0; tentativa < GEMINI_CONFIG.maxRetries; tentativa++) {
      try {
        structuredLog('info', `Gemini request attempt ${tentativa + 1}`, {
          endpoint: 'transform', attempt: tentativa + 1
        });
        
        const response = await fetch(generateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          const data = await response.json() as GeminiResponse;
          // 5. Usage Metadata Tracking
          const usage = extractUsageMetadata(data);
          structuredLog('info', 'Gemini request succeeded', {
            endpoint: 'transform', attempt: tentativa + 1, status: response.status, usageMetadata: usage
          });
          
          finalResponse = data;
          break;
        }
        
        lastStatus = response.status;
        structuredLog('warn', `Gemini request failed, will retry`, {
          endpoint: 'transform', attempt: tentativa + 1, status: response.status
        });
        
        if (tentativa === 0) {
          await new Promise(r => setTimeout(r, GEMINI_CONFIG.retryDelayMs));
        }
      } catch (err) {
        structuredLog('error', 'Gemini request error', {
          endpoint: 'transform', attempt: tentativa + 1, error: (err as Error).message
        });
      }
    }

    if (!finalResponse) {
      throw new Error(`Gemini API failed permanently. Last status: ${lastStatus}`);
    }

    const parts = finalResponse.candidates?.[0]?.content?.parts;
    const generatedText = extractTextFromParts(parts);
    
    if (!generatedText) {
      throw new Error("Resposta vazia da IA ou bloqueada.");
    }

    return new Response(JSON.stringify({ text: generatedText.trim() }), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });

  } catch (error) {
    structuredLog('error', 'transform fatal error', { error: error instanceof Error ? error.message : "Erro desconhecido" });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido na geração por IA." }), { status: 500 });
  }
};
