// Módulo: admin-app/functions/api/calculadora/gemini-models.ts
// Descrição: Lista modelos Gemini (Flash + Pro) disponíveis nas APIs v1 e v1beta para uso no módulo Calculadora.

interface Env { GEMINI_API_KEY: string }
interface Ctx { env: Env }

interface GeminiModel {
  name: string
  displayName: string
  description?: string
  supportedGenerationMethods?: string[]
}

interface ModelsResponse {
  models?: GeminiModel[]
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestGet = async ({ env }: Ctx) => {
  const apiKey = env?.GEMINI_API_KEY
  if (!apiKey) return json({ ok: false, error: 'GEMINI_API_KEY não configurada.' }, 503)

  try {
    // Consultar ambas as APIs em paralelo
    const [v1Res, v1betaRes] = await Promise.allSettled([
      fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`),
      fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`),
    ])

    const allModels = new Map<string, { id: string; displayName: string; api: string; vision: boolean }>()

    for (const [apiLabel, result] of [['v1', v1Res], ['v1beta', v1betaRes]] as const) {
      if (result.status !== 'fulfilled' || !result.value.ok) continue
      const data = await result.value.json() as ModelsResponse
      if (!data.models) continue

      for (const m of data.models) {
        // Filtrar apenas Flash e Pro (estáveis e preview)
        const id = m.name.replace('models/', '')
        const lower = id.toLowerCase()
        const isFlashOrPro = lower.includes('flash') || lower.includes('pro')
        const isGemini = lower.startsWith('gemini')
        if (!isGemini || !isFlashOrPro) continue

        // Verificar se suporta geração de conteúdo
        const supportsGenerate = m.supportedGenerationMethods?.includes('generateContent') ?? false
        if (!supportsGenerate) continue

        // Detectar se suporta visão (imagem)
        const hasVision = lower.includes('vision') ||
          lower.includes('pro') ||
          lower.includes('flash')

        if (!allModels.has(id)) {
          allModels.set(id, {
            id,
            displayName: m.displayName || id,
            api: apiLabel,
            vision: hasVision,
          })
        }
      }
    }

    // Ordenar: estáveis primeiro, depois preview; Pro antes de Flash
    const models = [...allModels.values()].sort((a, b) => {
      const aPreview = a.id.includes('preview') || a.id.includes('exp') ? 1 : 0
      const bPreview = b.id.includes('preview') || b.id.includes('exp') ? 1 : 0
      if (aPreview !== bPreview) return aPreview - bPreview
      const aPro = a.id.includes('pro') ? 0 : 1
      const bPro = b.id.includes('pro') ? 0 : 1
      return aPro - bPro || a.id.localeCompare(b.id)
    })

    return json({ ok: true, models, total: models.length })
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'Erro ao listar modelos.' }, 500)
  }
}
