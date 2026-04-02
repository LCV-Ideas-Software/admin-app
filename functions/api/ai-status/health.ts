// Módulo: admin-app/functions/api/ai-status/health.ts
// Descrição: Health check da API Gemini — valida key, mede latência, retorna status.

interface Env { GEMINI_API_KEY: string }
interface Ctx { env: Env }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

import { GoogleGenAI } from '@google/genai';

export const onRequestGet = async ({ env }: Ctx) => {
  const apiKey = env?.GEMINI_API_KEY
  if (!apiKey) return json({ ok: false, error: 'GEMINI_API_KEY não configurada.', keyConfigured: false }, 503)

  try {
    const ai = new GoogleGenAI({ apiKey });
    const start = Date.now()
    
    // Faz uma chamada leve ao endpoint de modelos para verificar saúde da API
    const model = await ai.models.get({ model: "gemini-2.5-flash" });
    const latencyMs = Date.now() - start

    if (model) {
      return json({
        ok: true,
        keyConfigured: true,
        apiReachable: true,
        latencyMs,
        httpStatus: 200,
        checkedAt: new Date().toISOString(),
      })
    }

    return json({
      ok: false,
      keyConfigured: true,
      apiReachable: true,
      latencyMs,
      httpStatus: 404,
      errorDetail: "Modelo gemini-2.5-flash não encontrado pela API",
      checkedAt: new Date().toISOString(),
    })
  } catch (err) {
    const errorBody = err instanceof Error ? err.message : String(err);
    return json({
      ok: false,
      keyConfigured: true,
      apiReachable: false,
      latencyMs: null,
      httpStatus: null,
      error: errorBody.slice(0, 500),
      checkedAt: new Date().toISOString(),
    })
  }
}
