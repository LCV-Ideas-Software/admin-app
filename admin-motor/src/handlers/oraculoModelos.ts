import { VertexGenAI } from './_shared/vertex';

const DEFAULT_VERTEX_LOCATION = 'global';

type Env = {
  VERTEX_SA_KEY?: string;
  VERTEX_PROJECT?: string;
  VERTEX_LOCATION?: string;
};

type Context = {
  request: Request;
  env: Env;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const formatModelName = (id: string): string => {
  if (!id) return '';
  return id
    .replace(/^gemini-/i, 'Gemini ')
    .replace(/-pro/i, ' Pro')
    .replace(/-flash/i, ' Flash')
    .replace(/-lite/i, ' Lite')
    .replace(/-exp(.*)/i, ' (Experimental$1)')
    .replace(/-preview(.*)/i, ' (Preview$1)')
    .trim();
};

export const handleOraculoModelosGet = async (context: Context) => {
  const { env } = context;
  const saKeyJson = env.VERTEX_SA_KEY;
  if (!saKeyJson) return json({ ok: false, error: 'VERTEX_SA_KEY não configurada.' }, 500);

  try {
    const ai = new VertexGenAI({
      saKeyJson,
      project: env.VERTEX_PROJECT,
      location: env.VERTEX_LOCATION || DEFAULT_VERTEX_LOCATION,
    });
    const allModels = new Map<string, { id: string; displayName: string; api: string; vision: boolean }>();

    const pager = await ai.models.list({ config: { pageSize: 1000, httpOptions: { timeout: 20_000 } } });
    for await (const m of pager) {
      if (!m.name) continue;
      // Vertex retorna "publishers/google/models/<id>" (AI Studio retornava "models/<id>").
      const id = m.name.split('/').pop() ?? '';
      const lower = id.toLowerCase();
      const isFlashOrPro = lower.includes('flash') || lower.includes('pro');
      const isGemini = lower.startsWith('gemini');
      if (!isGemini || !isFlashOrPro) continue;

      const hasVision = lower.includes('vision') || lower.includes('pro') || lower.includes('flash');
      if (!allModels.has(id)) {
        allModels.set(id, {
          id,
          displayName: m.displayName || formatModelName(id),
          api: 'vertex',
          vision: hasVision,
        });
      }
    }

    const models = [...allModels.values()].sort((a, b) => {
      const aPreview = a.id.includes('preview') || a.id.includes('exp') ? 1 : 0;
      const bPreview = b.id.includes('preview') || b.id.includes('exp') ? 1 : 0;
      if (aPreview !== bPreview) return aPreview - bPreview;
      const aPro = a.id.includes('pro') ? 0 : 1;
      const bPro = b.id.includes('pro') ? 0 : 1;
      return aPro - bPro || a.id.localeCompare(b.id);
    });

    return json({ ok: true, models, total: models.length });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'Erro ao listar modelos.' }, 500);
  }
};
