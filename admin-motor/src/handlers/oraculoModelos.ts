type Env = {
  GEMINI_API_KEY?: string;
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
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return json({ ok: false, error: 'GEMINI_API_KEY não configurada.' }, 500);

  try {
    const allModels = new Map<string, { id: string; displayName: string; api: string; vision: boolean }>();

    const baseUrl = 'https://generativelanguage.googleapis.com';

    const res = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);

    interface ModelOutput {
      name: string;
      displayName: string;
    }

    const data = (await res.json()) as { models: ModelOutput[] };

    for (const m of data.models || []) {
      if (!m.name) continue;
      const id = m.name.replace('models/', '');
      const lower = id.toLowerCase();
      const isFlashOrPro = lower.includes('flash') || lower.includes('pro');
      const isGemini = lower.startsWith('gemini');
      if (!isGemini || !isFlashOrPro) continue;

      const hasVision = lower.includes('vision') || lower.includes('pro') || lower.includes('flash');
      if (!allModels.has(id)) {
        allModels.set(id, {
          id,
          displayName: m.displayName || formatModelName(id),
          api: 'sdk',
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
