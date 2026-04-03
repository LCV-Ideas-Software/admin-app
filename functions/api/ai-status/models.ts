// Módulo: admin-app/functions/api/ai-status/models.ts
// Descrição: Catálogo completo de modelos Gemini com metadados (token limits, thinking, etc).


interface Env { GEMINI_API_KEY: string }
interface Ctx { env: Env }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function formatModelName(id: string): string {
  if (!id) return '';
  return id.replace(/^gemini-/i, 'Gemini ')
           .replace(/-pro/i, ' Pro')
           .replace(/-flash/i, ' Flash')
           .replace(/-lite/i, ' Lite')
           .replace(/-exp(.*)/i, ' (Experimental$1)')
           .replace(/-preview(.*)/i, ' (Preview$1)')
           .trim();
}

export const onRequestGet = async ({ env }: Ctx) => {
  const apiKey = env?.GEMINI_API_KEY
  if (!apiKey) return json({ ok: false, error: 'GEMINI_API_KEY não configurada.' }, 503)

  try {
    const start = Date.now()

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

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    
    interface ModelOutput { name: string; displayName: string; description: string; inputTokenLimit: number; outputTokenLimit: number; supportedGenerationMethods: string[]; temperature?: number; topP?: number; maxTemperature?: number }
    const data = await res.json() as { models: ModelOutput[] };

    for (const m of data.models || []) {
      if (!m.name) continue;
      
      const id = m.name.replace('models/', '');
      const lower = id.toLowerCase();
      const rawModel = m as Record<string, unknown>;
      // Filtrar só Gemini
      if (!lower.startsWith('gemini')) continue;

      // Retirada validação supportedMethods nativa pois não vem mais na SDK nova
      const supportedMethods = [] as string[];

      // Determinar família
      let family = 'other';
      if (lower.includes('flash-lite')) family = 'flash-lite';
      else if (lower.includes('flash')) family = 'flash';
      else if (lower.includes('pro')) family = 'pro';

      // Determinar tier (stable vs preview vs experimental)
      let tier = 'stable';
      if (lower.includes('preview')) tier = 'preview';
      else if (lower.includes('exp')) tier = 'experimental';

      allModels.set(id, {
        id,
        displayName: m.displayName || formatModelName(id),
        description: m.description || '',
        api: 'sdk',
        inputTokenLimit: (rawModel.inputTokenLimit as number) || 0,
        outputTokenLimit: (rawModel.outputTokenLimit as number) || 0,
        thinking: (rawModel.thinking as boolean) || false,
        temperature: (rawModel.temperature as number) ?? null,
        maxTemperature: (rawModel.maxTemperature as number) ?? null,
        methods: supportedMethods,
        family,
        tier,
      });
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
