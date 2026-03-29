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

export const onRequestGet = async ({ env }: Ctx) => {
  const apiKey = env?.GEMINI_API_KEY
  if (!apiKey) return json({ ok: false, error: 'GEMINI_API_KEY não configurada.', keyConfigured: false }, 503)

  try {
    const start = Date.now()
    // Faz uma chamada leve ao endpoint de modelos para verificar saúde da API
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`
    )
    const latencyMs = Date.now() - start

    if (res.ok) {
      return json({
        ok: true,
        keyConfigured: true,
        apiReachable: true,
        latencyMs,
        httpStatus: res.status,
        checkedAt: new Date().toISOString(),
      })
    }

    // A API respondeu mas com erro (key inválida, quota, etc)
    const errorBody = await res.text().catch(() => '')
    return json({
      ok: false,
      keyConfigured: true,
      apiReachable: true,
      latencyMs,
      httpStatus: res.status,
      errorDetail: errorBody.slice(0, 500),
      checkedAt: new Date().toISOString(),
    })
  } catch (err) {
    return json({
      ok: false,
      keyConfigured: true,
      apiReachable: false,
      latencyMs: null,
      httpStatus: null,
      error: err instanceof Error ? err.message : 'Network error',
      checkedAt: new Date().toISOString(),
    })
  }
}
