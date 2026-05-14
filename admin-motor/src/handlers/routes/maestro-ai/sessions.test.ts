import { describe, expect, it, vi } from 'vitest';

import {
  handleMaestroAiArtifactsGet,
  handleMaestroAiSessionsPost,
  handleMaestroAiSettingsGet,
  handleMaestroAiSettingsPut,
  maestroAiTestHooks,
} from './sessions.ts';

const protocolText = `${'Full editorial protocol. '.repeat(8)}Agents must follow the circular review contract.`;

const rates = {
  claude: { input_usd_per_million: 5, output_usd_per_million: 25 },
  codex: { input_usd_per_million: 5, output_usd_per_million: 30 },
  gemini: { input_usd_per_million: 1.25, output_usd_per_million: 10 },
  deepseek: { input_usd_per_million: 1.74, output_usd_per_million: 3.48 },
  grok: { input_usd_per_million: 1.25, output_usd_per_million: 2.5 },
  perplexity: { input_usd_per_million: 2, output_usd_per_million: 8, request_usd_per_1k: 14 },
};

type Row = Record<string, unknown>;

function createMaestroDb(options: { settings?: Partial<Row>; sessions?: Row[]; artifacts?: Row[] } = {}) {
  const settings: Row = {
    id: 'default',
    protocol_text: protocolText,
    max_cost_usd: 20,
    max_runtime_minutes: null,
    max_cycles: 2,
    configured_secrets_json: '{}',
    rates_json: JSON.stringify(rates),
    models_json: JSON.stringify({}),
    updated_at: '2026-05-14T00:00:00.000Z',
    ...options.settings,
  };
  const sessions = new Map<string, Row>((options.sessions ?? []).map((row) => [String(row.id), row]));
  const artifacts = new Map<string, Row>((options.artifacts ?? []).map((row) => [String(row.id), row]));
  return {
    prepare(query: string) {
      return {
        bind(...values: unknown[]) {
          return {
            run: async () => {
              if (/INSERT INTO maestro_ai_sessions/i.test(query)) {
                sessions.set(String(values[0]), {
                  id: values[0],
                  title: values[1],
                  prompt: values[2],
                  protocol_text: values[3],
                  initial_agent: values[4],
                  active_agents_json: values[5],
                  current_author: values[6],
                  current_text: values[7],
                  final_text: values[8],
                  status: values[9],
                  observed_cost_usd: values[10],
                  max_cost_usd: values[11],
                  max_runtime_minutes: values[12],
                  max_cycles: values[13],
                  rates_json: values[14],
                  models_json: values[15],
                  events_json: values[16],
                  created_at: values[17],
                  updated_at: values[18],
                  error: values[19],
                });
              }
              if (/INSERT INTO maestro_ai_settings/i.test(query) && /ON CONFLICT/i.test(query)) {
                Object.assign(settings, {
                  id: values[0],
                  protocol_text: values[1],
                  max_cost_usd: values[2],
                  max_runtime_minutes: values[3],
                  max_cycles: values[4],
                  configured_secrets_json: values[5],
                  rates_json: values[6],
                  models_json: values[7],
                  updated_at: values[8],
                });
              }
              if (/INSERT INTO maestro_ai_artifacts/i.test(query)) {
                artifacts.set(String(values[0]), {
                  id: values[0],
                  session_id: values[1],
                  cycle: values[2],
                  turn: values[3],
                  agent: values[4],
                  role: values[5],
                  status: values[6],
                  title: values[7],
                  content_md: values[8],
                  revision_report_json: values[9],
                  link_audit_json: values[10],
                  cost_usd: values[11],
                  model: values[12],
                  previous_artifact_id: values[13],
                  content_bytes: values[14],
                  created_at: values[15],
                });
              }
              return { success: true };
            },
            first: async <T>() => {
              if (/FROM maestro_ai_settings/i.test(query)) return settings as T;
              if (/FROM maestro_ai_sessions/i.test(query)) return (sessions.get(String(values[0])) ?? null) as T | null;
              if (/FROM maestro_ai_artifacts/i.test(query)) {
                const artifact = artifacts.get(String(values[1]));
                return (artifact && artifact.session_id === values[0] ? artifact : null) as T | null;
              }
              return null;
            },
            all: async <T>() => {
              if (/FROM maestro_ai_artifacts/i.test(query)) {
                return {
                  results: [...artifacts.values()]
                    .filter((artifact) => artifact.session_id === values[0])
                    .sort((a, b) => Number(a.turn) - Number(b.turn)) as T[],
                };
              }
              return { results: [] as T[] };
            },
          };
        },
        run: async () => ({ success: true }),
      };
    },
  };
}

function createContext(body: unknown, env: Record<string, unknown> = {}, db = createMaestroDb()) {
  return {
    env: {
      BIGDATA_DB: db,
      MAESTRO_ANTHROPIC_API_KEY: 'secret-claude',
      MAESTRO_OPENAI_API_KEY: 'secret-openai',
      CLOUDFLARE_PW: 'cf-token',
      CF_ACCOUNT_ID: 'cf-account',
      MAESTRO_SECRET_STORE_ID: 'store-id',
      ...env,
    },
    request: new Request('https://admin.local/api/maestro-ai/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
    waitUntil: () => {
      throw new Error('waitUntil should not run for invalid Maestro AI requests');
    },
  };
}

describe('handleMaestroAiSessionsPost', () => {
  it('rejects sessions without the required runtime Secret Store binding', async () => {
    const response = await handleMaestroAiSessionsPost(
      createContext(
        {
          title: 'Secret Store gate',
          prompt: 'Write an editorial article.',
          initial_agent: 'claude',
        },
        { MAESTRO_ANTHROPIC_API_KEY: undefined },
      ),
    );

    const payload = (await response.json()) as { ok: boolean; error: string };

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain('dois agentes');
  });

  it('rejects paid API sessions without a configured financial ceiling', async () => {
    const db = createMaestroDb({ settings: { max_cost_usd: 0 } });
    const response = await handleMaestroAiSessionsPost(
      createContext(
        {
          title: 'Financial gate',
          prompt: 'Write an editorial article.',
          initial_agent: 'claude',
        },
        {},
        db,
      ),
    );

    const payload = (await response.json()) as { ok: boolean; error: string };

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain('Teto financeiro');
  });

  it('rejects settings that would leave an agent reviewing only itself', async () => {
    const response = await handleMaestroAiSessionsPost(
      createContext(
        {
          title: 'Self-review gate',
          prompt: 'Write an editorial article.',
          initial_agent: 'claude',
        },
        { MAESTRO_OPENAI_API_KEY: undefined },
      ),
    );

    const payload = (await response.json()) as { ok: boolean; error: string };

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain('dois agentes');
  });

  it('rejects invalid configured max_cycles values at the backend boundary', async () => {
    const db = createMaestroDb({ settings: { max_cycles: 0 } });
    const response = await handleMaestroAiSessionsPost(
      createContext(
        {
          title: 'Cycle gate',
          prompt: 'Write an editorial article.',
          initial_agent: 'claude',
        },
        {},
        db,
      ),
    );

    const payload = (await response.json()) as { ok: boolean; error: string };

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toContain('Ciclos');
  });
});

describe('Maestro AI settings', () => {
  it('returns secret status without exposing secret values', async () => {
    const response = await handleMaestroAiSettingsGet(createContext({}, {}, createMaestroDb()));
    const payload = (await response.json()) as {
      settings: {
        models: Record<string, string>;
        agents: Array<{ key: string; configured: boolean; runtime_ready: boolean; model: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.settings.agents.find((agent) => agent.key === 'claude')).toMatchObject({
      configured: true,
      runtime_ready: true,
      model: 'claude-opus-4-7',
    });
    expect(payload.settings.models).toMatchObject({
      claude: 'claude-opus-4-7',
      codex: 'gpt-5.5',
      gemini: 'gemini-2.5-pro',
      deepseek: 'deepseek-v4-pro',
      grok: 'grok-4.20-multi-agent-0309',
      perplexity: 'sonar-reasoning-pro',
    });
    expect(JSON.stringify(payload)).not.toContain('secret-claude');
  });

  it('saves API keys through Cloudflare Secret Store and not into D1 settings JSON', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/secrets') && !init?.method) {
        return new Response(JSON.stringify({ success: true, result: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: true, result: [{ id: 'created' }] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const db = createMaestroDb();
    const response = await handleMaestroAiSettingsPut(
      createContext(
        {
          protocol_text: protocolText,
          max_cost_usd: 20,
          max_runtime_minutes: null,
          max_cycles: 2,
          rates,
          api_keys: { claude: 'new-secret-claude' },
        },
        {},
        db,
      ),
    );
    const payload = (await response.json()) as { ok: boolean; settings: unknown };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/secrets'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.stringify(payload.settings)).not.toContain('new-secret-claude');
    vi.unstubAllGlobals();
  });
});

describe('Maestro AI autos/artifacts', () => {
  const session = {
    id: 'web-session-1',
    title: 'Autos vivos',
    prompt: 'Write.',
    protocol_text: protocolText,
    initial_agent: 'claude',
    active_agents_json: JSON.stringify(['claude', 'codex']),
    current_author: 'codex',
    current_text: 'Texto atual',
    final_text: null,
    status: 'running',
    observed_cost_usd: 0.1,
    max_cost_usd: 20,
    max_runtime_minutes: null,
    max_cycles: 2,
    rates_json: JSON.stringify(rates),
    models_json: JSON.stringify({}),
    events_json: '[]',
    created_at: '2026-05-14T00:00:00.000Z',
    updated_at: '2026-05-14T00:00:01.000Z',
    error: null,
  };

  const artifacts = [
    {
      id: 'artifact-1',
      session_id: 'web-session-1',
      cycle: 0,
      turn: 1,
      agent: 'claude',
      role: 'draft',
      status: 'ready',
      title: 'Draft',
      content_md: '# Draft\n\nTexto inicial',
      revision_report_json: '{}',
      link_audit_json: '[]',
      cost_usd: 0.02,
      model: 'claude-opus-4-7',
      previous_artifact_id: null,
      content_bytes: 22,
      created_at: '2026-05-14T00:00:01.000Z',
    },
    {
      id: 'artifact-2',
      session_id: 'web-session-1',
      cycle: 1,
      turn: 2,
      agent: 'codex',
      role: 'revision',
      status: 'ready',
      title: 'Revision',
      content_md: '# Revision\n\nTexto revisado',
      revision_report_json: '{"changes":["narrow correction"]}',
      link_audit_json: JSON.stringify([{ url: 'https://example.com/', ok: false, status: 404 }]),
      cost_usd: 0.03,
      model: 'gpt-5.5',
      previous_artifact_id: 'artifact-1',
      content_bytes: 27,
      created_at: '2026-05-14T00:00:02.000Z',
    },
  ];

  it('lists session autos without exposing full markdown payloads in the summary', async () => {
    const db = createMaestroDb({ sessions: [session], artifacts });
    const response = await handleMaestroAiArtifactsGet(createContext({}, {}, db), 'web-session-1');
    const payload = (await response.json()) as { ok: boolean; artifacts: Array<{ id: string; invalid_links: number; content_md?: string }> };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.artifacts).toHaveLength(2);
    expect(payload.artifacts[1]).toMatchObject({ id: 'artifact-2', invalid_links: 1 });
    expect(payload.artifacts[0].content_md).toBeUndefined();
  });

  it('returns artifact detail with current and previous markdown for UI diffing', async () => {
    const db = createMaestroDb({ sessions: [session], artifacts });
    const response = await handleMaestroAiArtifactsGet(createContext({}, {}, db), 'web-session-1', 'artifact-2');
    const payload = (await response.json()) as {
      ok: boolean;
      artifact: { id: string; content_md: string; previous_content_md: string; link_audit: Array<{ ok: boolean }> };
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.artifact.id).toBe('artifact-2');
    expect(payload.artifact.content_md).toContain('Texto revisado');
    expect(payload.artifact.previous_content_md).toContain('Texto inicial');
    expect(payload.artifact.link_audit[0].ok).toBe(false);
  });
});

describe('maestro provider request construction', () => {
  const system = 'System contract';
  const prompt = 'Editorial prompt';

  it('uses the OpenAI Responses API for Codex requests without storing responses', () => {
    const request = maestroAiTestHooks.buildProviderHttpRequest('codex', 'openai-secret', 'gpt-5.5', system, prompt);
    const body = JSON.parse(String(request.init.body)) as { instructions: string; input: unknown; store: boolean };

    expect(request.endpoint).toBe('https://api.openai.com/v1/responses');
    expect(request.init.headers).toMatchObject({ authorization: 'Bearer openai-secret' });
    expect(body.instructions).toBe(system);
    expect(body.input).toEqual([{ role: 'user', content: [{ type: 'input_text', text: prompt }] }]);
    expect(body.store).toBe(false);
  });

  it('uses the Anthropic Messages API for Claude requests', () => {
    const request = maestroAiTestHooks.buildProviderHttpRequest('claude', 'anthropic-secret', 'claude-opus-4-7', system, prompt);
    const body = JSON.parse(String(request.init.body)) as {
      model: string;
      system: Array<{ text: string; cache_control?: { type: string } }>;
      messages: Array<{ role: string; content: Array<{ text: string }> }>;
    };

    expect(request.endpoint).toBe('https://api.anthropic.com/v1/messages');
    expect(request.init.headers).toMatchObject({
      'x-api-key': 'anthropic-secret',
      'anthropic-version': '2023-06-01',
    });
    expect(body.model).toBe('claude-opus-4-7');
    expect(body.system[0]).toMatchObject({ text: system, cache_control: { type: 'ephemeral' } });
    expect(body.messages[0]).toMatchObject({ role: 'user', content: [{ type: 'text', text: prompt }] });
  });

  it('uses the xAI Responses API for Grok requests', () => {
    const request = maestroAiTestHooks.buildProviderHttpRequest('grok', 'xai-secret', 'grok-4.20-multi-agent-0309', system, prompt);
    const body = JSON.parse(String(request.init.body)) as { model: string; input: unknown };

    expect(request.endpoint).toBe('https://api.x.ai/v1/responses');
    expect(request.init.headers).toMatchObject({ authorization: 'Bearer xai-secret' });
    expect(body.model).toBe('grok-4.20-multi-agent-0309');
    expect(body.input).toEqual([{ role: 'user', content: [{ type: 'input_text', text: prompt }] }]);
  });

  it('uses the DeepSeek chat completions endpoint for DeepSeek requests', () => {
    const request = maestroAiTestHooks.buildProviderHttpRequest('deepseek', 'deepseek-secret', 'deepseek-v4-pro', system, prompt);
    const body = JSON.parse(String(request.init.body)) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      stream: boolean;
    };

    expect(request.endpoint).toBe('https://api.deepseek.com/chat/completions');
    expect(request.init.headers).toMatchObject({ authorization: 'Bearer deepseek-secret' });
    expect(body.model).toBe('deepseek-v4-pro');
    expect(body.messages).toEqual([
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ]);
    expect(body.stream).toBe(false);
  });

  it('uses the Perplexity Sonar endpoint with chat messages', () => {
    const request = maestroAiTestHooks.buildProviderHttpRequest(
      'perplexity',
      'perplexity-secret',
      'sonar-reasoning-pro',
      system,
      prompt,
    );
    const body = JSON.parse(String(request.init.body)) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      search_mode: string;
    };

    expect(request.endpoint).toBe('https://api.perplexity.ai/v1/sonar');
    expect(request.init.headers).toMatchObject({ authorization: 'Bearer perplexity-secret' });
    expect(body.model).toBe('sonar-reasoning-pro');
    expect(body.messages).toEqual([
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ]);
    expect(body.search_mode).toBe('web');
  });
});

describe('maestro revision contract guard', () => {
  it('blocks READY reviewers from changing custody text', () => {
    const result = maestroAiTestHooks.validateRevisionGuard(
      'Texto aprovado anterior.',
      'Texto aprovado anterior com mudanca.',
      'READY',
      'Changed line 1 based on protocol rule.',
    );

    expect(result).toContain('READY reviewers cannot alter');
  });

  it('blocks material text impoverishment', () => {
    const previous = `${'Paragrafo robusto com argumento, contexto e nuance. '.repeat(40)}`;
    const candidate = 'Versao curta.';
    const result = maestroAiTestHooks.validateRevisionGuard(
      previous,
      candidate,
      'NOT_READY',
      'Changed lines 1-20 based on protocol rule because the text needed correction.',
    );

    expect(result).toContain('anti-impoverishment');
  });

  it('allows a documented focused correction', () => {
    const result = maestroAiTestHooks.validateRevisionGuard(
      'Linha 1\nLinha 2 com erro factual.',
      'Linha 1\nLinha 2 com correcao factual.',
      'NOT_READY',
      'Changed line 2 based on the protocol rule for factual precision; no other line was altered.',
    );

    expect(result).toBeNull();
  });
});
