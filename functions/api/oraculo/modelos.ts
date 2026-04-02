// Módulo: admin-app/functions/api/oraculo/gemini-models.ts
// Descrição: Lista modelos Gemini (Flash + Pro) disponíveis via SDK.

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
    const allModels = new Map<string, { id: string; displayName: string; api: string; vision: boolean }>()

    const response = await ai.models.list();

    for await (const m of response) {
      if (!m.name) continue;

      const id = m.name.replace('models/', '')
      const lower = id.toLowerCase()
      // Filtrar apenas Flash e Pro (estáveis e preview)
      const isFlashOrPro = lower.includes('flash') || lower.includes('pro')
      const isGemini = lower.startsWith('gemini')
      
      if (!isGemini || !isFlashOrPro) continue

      const rawModel = m as Record<string, unknown>;
      const supportedMethods = (rawModel.supportedGenerationMethods as string[]) || [];

      // Verificar se suporta geração de conteúdo
      const supportsGenerate = supportedMethods.includes('generateContent');
      if (!supportsGenerate) continue

      // Detectar se suporta visão (imagem)
      const hasVision = lower.includes('vision') || lower.includes('pro') || lower.includes('flash')

      if (!allModels.has(id)) {
        allModels.set(id, {
          id,
          displayName: m.displayName || id,
          api: 'sdk',
          vision: hasVision,
        })
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
