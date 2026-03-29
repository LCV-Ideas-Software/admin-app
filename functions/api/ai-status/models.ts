// Módulo: admin-app/functions/api/ai-status/models.ts
// Descrição: Catálogo completo de modelos Gemini com metadados (token limits, thinking, etc).

interface Env { GEMINI_API_KEY: string }
interface Ctx { env: Env }

interface GeminiModelRaw {
  name: string
  baseModelId?: string
  version?: string
  displayName: string
  description?: string
  inputTokenLimit?: number
  outputTokenLimit?: number
  supportedGenerationMethods?: string[]
  thinking?: boolean
  temperature?: number
  maxTemperature?: number
  topP?: number
  topK?: number
}

interface ModelsResponse {
  models?: GeminiModelRaw[]
  nextPageToken?: string
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
    const start = Date.now()

    // Consultar v1beta para lista mais completa (inclui preview/experimental)
    const allModels = new Map<string, {
      id: string
      displayName: string
      description: string
      api: string
      inputTokenLimit: number
      outputTokenLimit: number
      thinking: boolean
      temperature: number | null
      maxTemperature: number | null
      methods: string[]
      family: string
      tier: string
    }>()

    // Paginar para não perder modelos
    for (const apiVersion of ['v1', 'v1beta']) {
      let pageToken: string | undefined
      do {
        const url = new URL(`https://generativelanguage.googleapis.com/${apiVersion}/models`)
        url.searchParams.set('key', apiKey)
        url.searchParams.set('pageSize', '100')
        if (pageToken) url.searchParams.set('pageToken', pageToken)

        const res = await fetch(url.toString())
        if (!res.ok) break
        const data = await res.json() as ModelsResponse
        pageToken = data.nextPageToken

        for (const m of data.models || []) {
          const id = m.name.replace('models/', '')
          const lower = id.toLowerCase()
          // Filtrar só Gemini com generateContent
          if (!lower.startsWith('gemini')) continue
          if (!m.supportedGenerationMethods?.includes('generateContent')) continue

          // Determinar família
          let family = 'other'
          if (lower.includes('flash-lite')) family = 'flash-lite'
          else if (lower.includes('flash')) family = 'flash'
          else if (lower.includes('pro')) family = 'pro'

          // Determinar tier (stable vs preview vs experimental)
          let tier = 'stable'
          if (lower.includes('preview')) tier = 'preview'
          else if (lower.includes('exp')) tier = 'experimental'

          // Preferir v1beta (dados mais completos) sobre v1
          if (!allModels.has(id) || apiVersion === 'v1beta') {
            allModels.set(id, {
              id,
              displayName: m.displayName || id,
              description: m.description || '',
              api: apiVersion,
              inputTokenLimit: m.inputTokenLimit || 0,
              outputTokenLimit: m.outputTokenLimit || 0,
              thinking: m.thinking || false,
              temperature: m.temperature ?? null,
              maxTemperature: m.maxTemperature ?? null,
              methods: m.supportedGenerationMethods || [],
              family,
              tier,
            })
          }
        }
      } while (pageToken)
    }

    const latencyMs = Date.now() - start

    // Ordenar: Pro → Flash → Flash-Lite; estáveis primeiro
    const tierOrder: Record<string, number> = { stable: 0, preview: 1, experimental: 2 }
    const familyOrder: Record<string, number> = { pro: 0, flash: 1, 'flash-lite': 2, other: 3 }

    const models = [...allModels.values()].sort((a, b) => {
      const td = (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9)
      if (td !== 0) return td
      const fd = (familyOrder[a.family] ?? 9) - (familyOrder[b.family] ?? 9)
      if (fd !== 0) return fd
      return a.id.localeCompare(b.id)
    })

    return json({ ok: true, models, total: models.length, latencyMs })
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'Erro ao listar modelos.' }, 500)
  }
}
