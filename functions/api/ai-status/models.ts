// Módulo: admin-app/functions/api/ai-status/models.ts
// Descrição: Catálogo completo de modelos Gemini com metadados (token limits, thinking, etc).

import { GoogleGenAI } from '@google/genai';

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
  if (!apiKey) return json({ ok: false, error: 'GEMINI_API_KEY não configurada.' }, 503)

  try {
    const ai = new GoogleGenAI({ apiKey });
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

    // A SDK @google/genai chama nativamente a versão correta da API.
    // Usamos list() que nos dá um iterador automático.
    const response = await ai.models.list();
    
    for await (const m of response) {
      if (!m.name) continue;
      
      const rawModel = m as Record<string, unknown>;
      const supportedMethods = (rawModel.supportedGenerationMethods as string[]) || [];

      const id = m.name.replace('models/', '');
      const lower = id.toLowerCase();
      // Filtrar só Gemini com generateContent
      if (!lower.startsWith('gemini')) continue;
      if (!supportedMethods.includes('generateContent')) continue;

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
        displayName: m.displayName || id,
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
