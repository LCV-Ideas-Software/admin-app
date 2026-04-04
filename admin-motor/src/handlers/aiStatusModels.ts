type Env = { GEMINI_API_KEY?: string };

type Context = { request: Request; env: Env };

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

export const handleAiStatusModelsGet = async (context: Context) => {
  const { env } = context;
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[ai-status/models] api-key:missing');
    return json({ ok: false, error: 'GEMINI_API_KEY não configurada.' }, 503);
  }

  try {
    const start = Date.now();
    const allModels = new Map<
      string,
      {
        id: string;
        displayName: string;
        description: string;
        api: string;
        inputTokenLimit: number;
        outputTokenLimit: number;
        thinking: boolean;
        temperature: number | null;
        maxTemperature: number | null;
        methods: string[];
        family: string;
        tier: string;
      }
    >();

    const baseUrl = 'https://generativelanguage.googleapis.com';
    const requestHeaders: Record<string, string> = {};

    const res = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`, { headers: requestHeaders });
    if (!res.ok) {
      const upstreamBody = await res.text().catch(() => '');
      console.error('[ai-status/models] upstream:error', {
        status: res.status,
        directGoogle: true,
        bodyPreview: upstreamBody.slice(0, 300),
      });
      throw new Error(`API Error: ${res.status}`);
    }

    interface ModelOutput {
      name: string;
      displayName: string;
      description: string;
      inputTokenLimit: number;
      outputTokenLimit: number;
      temperature?: number;
      maxTemperature?: number;
    }

    const data = (await res.json()) as { models: ModelOutput[] };

    for (const m of data.models || []) {
      if (!m.name) continue;

      const id = m.name.replace('models/', '');
      const lower = id.toLowerCase();
      const rawModel = m as unknown as Record<string, unknown>;
      if (!lower.startsWith('gemini')) continue;

      let family = 'other';
      if (lower.includes('flash-lite')) family = 'flash-lite';
      else if (lower.includes('flash')) family = 'flash';
      else if (lower.includes('pro')) family = 'pro';

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
        methods: [],
        family,
        tier,
      });
    }

    const latencyMs = Date.now() - start;

    const tierOrder: Record<string, number> = { stable: 0, preview: 1, experimental: 2 };
    const familyOrder: Record<string, number> = { pro: 0, flash: 1, 'flash-lite': 2, other: 3 };

    const models = [...allModels.values()].sort((a, b) => {
      const td = (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9);
      if (td !== 0) return td;
      const fd = (familyOrder[a.family] ?? 9) - (familyOrder[b.family] ?? 9);
      if (fd !== 0) return fd;
      return a.id.localeCompare(b.id);
    });

    console.info('[ai-status/models] request:ok', {
      total: models.length,
      latencyMs,
      directGoogle: true,
    });
    return json({ ok: true, models, total: models.length, latencyMs });
  } catch (err) {
    console.error('[ai-status/models] request:error', {
      directGoogle: true,
      error: err instanceof Error ? err.message : String(err),
    });
    return json({ ok: false, error: err instanceof Error ? err.message : 'Erro ao listar modelos.' }, 500);
  }
};
