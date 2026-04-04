type Env = {
  GEMINI_API_KEY?: string;
  CF_AI_GATEWAY?: string;
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

    const gatewayUrl = 'https://gateway.ai.cloudflare.com/v1/d65b76a0e64c3791e932edd9163b1c71/workspace-gateway/google-ai-studio';
    const baseUrl = env.CF_AI_GATEWAY ? gatewayUrl : 'https://generativelanguage.googleapis.com';

    const requestHeaders: Record<string, string> = {};
    if (env.CF_AI_GATEWAY) {
      requestHeaders['cf-aig-authorization'] = `Bearer ${env.CF_AI_GATEWAY}`;
    }

    const res = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`, { headers: requestHeaders });
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
