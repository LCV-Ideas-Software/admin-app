import { describe, expect, it, vi } from 'vitest';

import {
  handleMaestroAiArtifactsGet,
  handleMaestroAiSessionCancelPost,
  handleMaestroAiSessionContentPut,
  handleMaestroAiSessionsGet,
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

// Exact-hostname match for fetch URLs (substring `.includes(host)` checks are
// both fragile and flagged by CodeQL's incomplete-URL-sanitization query).
const hostOf = (u: unknown): string => {
  try {
    return new URL(String(u)).hostname;
  } catch {
    return '';
  }
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

// Full in-memory D1 fake that honours INSERT / UPDATE (dynamic SET) / SELECT for
// the maestro tables. Used to exercise the orchestrator, sweeper, cancel and
// persistence paths that the regex mock above intentionally turns into no-ops.
function createInMemoryDb(seed: { settings?: Partial<Row>; sessions?: Row[]; artifacts?: Row[] } = {}) {
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
    ...seed.settings,
  };
  const sessions = new Map<string, Row>((seed.sessions ?? []).map((row) => [String(row.id), { ...row }]));
  const artifacts = new Map<string, Row>((seed.artifacts ?? []).map((row) => [String(row.id), { ...row }]));

  const sessionColumns = [
    'id',
    'title',
    'prompt',
    'protocol_text',
    'initial_agent',
    'active_agents_json',
    'current_author',
    'current_text',
    'final_text',
    'status',
    'observed_cost_usd',
    'max_cost_usd',
    'max_runtime_minutes',
    'max_cycles',
    'rates_json',
    'models_json',
    'events_json',
    'created_at',
    'updated_at',
    'error',
  ];
  const artifactColumns = [
    'id',
    'session_id',
    'cycle',
    'turn',
    'agent',
    'role',
    'status',
    'title',
    'content_md',
    'revision_report_json',
    'link_audit_json',
    'cost_usd',
    'model',
    'previous_artifact_id',
    'content_bytes',
    'created_at',
  ];

  const applyInsert = (columns: string[], store: Map<string, Row>, values: unknown[]) => {
    const row: Row = {};
    columns.forEach((col, i) => {
      row[col] = values[i];
    });
    store.set(String(values[0]), row);
  };

  const applyUpdate = (table: 'maestro_ai_sessions' | 'maestro_ai_settings', query: string, values: unknown[]) => {
    const setMatch = /SET\s+([\s\S]+?)\s+WHERE/i.exec(query);
    if (!setMatch) return;
    const assignments = (setMatch[1] ?? '').split(',').map((part) => part.trim());
    const setCols = assignments.map((a) => (a.split('=')[0] ?? '').trim());
    if (table === 'maestro_ai_settings') {
      setCols.forEach((col, i) => {
        settings[col] = values[i];
      });
      return;
    }
    const id = String(values[setCols.length]);
    const row = sessions.get(id);
    if (!row) return;
    // Honor an optional "AND status IN (?, ?)" CAS guard.
    if (/status\s+IN/i.test(query)) {
      const guardStatuses = values.slice(setCols.length + 1).map(String);
      if (guardStatuses.length && !guardStatuses.includes(String(row.status))) return;
    }
    setCols.forEach((col, i) => {
      row[col] = values[i];
    });
  };

  const makeStatement = (query: string, values: unknown[]) => ({
    run: async () => {
      if (/INSERT INTO maestro_ai_sessions/i.test(query)) applyInsert(sessionColumns, sessions, values);
      else if (/INSERT INTO maestro_ai_artifacts/i.test(query)) applyInsert(artifactColumns, artifacts, values);
      else if (/INSERT INTO maestro_ai_settings/i.test(query)) {
        applyInsert(
          [
            'id',
            'protocol_text',
            'max_cost_usd',
            'max_runtime_minutes',
            'max_cycles',
            'configured_secrets_json',
            'rates_json',
            'models_json',
            'updated_at',
          ],
          new Map(),
          values,
        );
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
      } else if (/UPDATE maestro_ai_sessions/i.test(query)) applyUpdate('maestro_ai_sessions', query, values);
      else if (/UPDATE maestro_ai_settings/i.test(query)) applyUpdate('maestro_ai_settings', query, values);
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
            .filter((a) => a.session_id === values[0])
            .sort((a, b) => Number(a.turn) - Number(b.turn)) as T[],
        };
      }
      if (/FROM maestro_ai_sessions/i.test(query)) {
        return {
          results: [...sessions.values()].sort((a, b) =>
            String(b.updated_at).localeCompare(String(a.updated_at)),
          ) as T[],
        };
      }
      return { results: [] as T[] };
    },
  });

  return {
    prepare(query: string) {
      return {
        bind: (...values: unknown[]) => makeStatement(query, values),
        ...makeStatement(query, []),
        run: async () => ({ success: true }),
      };
    },
    __sessions: sessions,
    __artifacts: artifacts,
    __settings: settings,
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
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(postCall?.[1]?.body))).toMatchObject([
      {
        scopes: ['workers', 'ai_gateway'],
      },
    ]);
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
    const payload = (await response.json()) as {
      ok: boolean;
      artifacts: Array<{ id: string; invalid_links: number; content_md?: string }>;
    };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.artifacts).toHaveLength(2);
    expect(payload.artifacts[1]).toMatchObject({ id: 'artifact-2', invalid_links: 1 });
    expect(payload.artifacts[0]?.content_md).toBeUndefined();
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
    expect(payload.artifact.link_audit[0]?.ok).toBe(false);
  });
});

describe('runSession orchestrator', () => {
  const runnableSession = (overrides: Partial<Row> = {}): Row => ({
    id: 'run-1',
    title: 'Sessao',
    prompt: 'Escreva um artigo.',
    protocol_text: protocolText,
    initial_agent: 'claude',
    active_agents_json: JSON.stringify(['claude', 'codex']),
    current_author: null,
    current_text: '',
    final_text: null,
    status: 'queued',
    observed_cost_usd: 0,
    max_cost_usd: 100,
    max_runtime_minutes: null,
    max_cycles: 1,
    rates_json: JSON.stringify(rates),
    models_json: '{}',
    events_json: '[]',
    created_at: '2026-05-14T00:00:00.000Z',
    updated_at: '2026-05-14T00:00:00.000Z',
    error: null,
    ...overrides,
  });

  // Maps each call to a provider/link response. anthropic=claude draft, openai=codex reviewer.
  const providerFetch = (opts: {
    claudeText?: string;
    codexText?: string;
    linkStatus?: number | 'timeout';
    onAnthropic?: () => void;
  }) =>
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (hostOf(url) === 'api.anthropic.com') {
        opts.onAnthropic?.();
        return new Response(
          JSON.stringify({
            content: [{ type: 'text', text: opts.claudeText ?? '' }],
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (hostOf(url) === 'api.openai.com') {
        return new Response(
          JSON.stringify({
            output_text: opts.codexText ?? 'MAESTRO_STATUS: READY',
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      // Link-audit fetch.
      if (opts.linkStatus === 'timeout') {
        if (init?.signal) {
          return new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          });
        }
        throw new Error('network');
      }
      return new Response('', { status: opts.linkStatus ?? 200 });
    });

  const env = {
    BIGDATA_DB: undefined as unknown,
    MAESTRO_ANTHROPIC_API_KEY: 'k-claude',
    MAESTRO_OPENAI_API_KEY: 'k-codex',
  };

  it('marks the session as error when the initial draft text is empty and never calls reviewers', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    const fetchMock = providerFetch({ claudeText: '   ' });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    expect(db.__sessions.get('run-1')?.status).toBe('error');
    expect(String(db.__sessions.get('run-1')?.error)).toMatch(/vazi|empty/i);
    expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === 'api.openai.com')).toBe(false);
  });

  it('converges when the sole reviewer returns READY without changing custody', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    vi.stubGlobal(
      'fetch',
      providerFetch({ claudeText: 'Texto de rascunho robusto e completo.', codexText: 'MAESTRO_STATUS: READY' }),
    );
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    expect(db.__sessions.get('run-1')?.status).toBe('converged');
    expect(db.__sessions.get('run-1')?.final_text).toBe('Texto de rascunho robusto e completo.');
  });

  it('marks the session as error when a reviewer returns empty text', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    vi.stubGlobal('fetch', providerFetch({ claudeText: 'Rascunho valido e completo.', codexText: '   ' }));
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    expect(db.__sessions.get('run-1')?.status).toBe('error');
    expect(String(db.__sessions.get('run-1')?.error)).toMatch(/vazi|empty/i);
  });

  it('blocks the session when a link is persistently 5xx (broken after retry)', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    vi.stubGlobal(
      'fetch',
      providerFetch({
        claudeText: 'Rascunho com link https://example.com/artigo aqui.',
        codexText: 'MAESTRO_STATUS: READY',
        linkStatus: 503,
      }),
    );
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    expect(db.__sessions.get('run-1')?.status).toBe('blocked_link_audit');
  });

  it('blocks the session as blocked_link_audit on a genuinely broken link (404)', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    const fetchMock = providerFetch({
      claudeText: 'Rascunho com link https://example.com/missing aqui.',
      linkStatus: 404,
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    expect(db.__sessions.get('run-1')?.status).toBe('blocked_link_audit');
    expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === 'api.openai.com')).toBe(false);
  });

  it('blocks the session when the draft contains an internal-host link, without ever fetching it', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (hostOf(url) === 'api.anthropic.com') {
        return new Response(
          JSON.stringify({
            content: [{ type: 'text', text: 'Veja http://169.254.169.254/latest/meta e http://localhost:8787/admin' }],
            usage: {},
          }),
          { status: 200 },
        );
      }
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    expect(db.__sessions.get('run-1')?.status).toBe('blocked_link_audit');
    // The internal hosts were judged broken WITHOUT any outbound fetch to them.
    expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === '169.254.169.254')).toBe(false);
    expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === 'localhost')).toBe(false);
    // ...and reviewers were never invoked.
    expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === 'api.openai.com')).toBe(false);
  });

  it('stops cooperatively when the session is cancelled mid-run and skips remaining reviewers', async () => {
    const db = createInMemoryDb({
      sessions: [
        runnableSession({ active_agents_json: JSON.stringify(['claude', 'codex', 'deepseek']), max_cycles: 2 }),
      ],
    });
    // First reviewer (codex) completes its turn, then the operator cancels.
    // The pre-turn check before deepseek must detect it and stop.
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (hostOf(url) === 'api.anthropic.com') {
        return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Rascunho valido.' }], usage: {} }), {
          status: 200,
        });
      }
      if (hostOf(url) === 'api.openai.com') {
        const row = db.__sessions.get('run-1');
        if (row) row.status = 'blocked_cancelled';
        return new Response(JSON.stringify({ output_text: 'MAESTRO_STATUS: NOT_READY' }), { status: 200 });
      }
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    expect(db.__sessions.get('run-1')?.status).toBe('blocked_cancelled');
    expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === 'api.deepseek.com')).toBe(false);
  });

  it('skips the initial draft provider call entirely when cancelled while queued', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    // Operator cancelled the session before the runner reached the draft call.
    const queued = db.__sessions.get('run-1');
    if (queued) queued.status = 'blocked_cancelled';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    // No paid provider work, no draft artifact, cancelled status preserved.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.__artifacts.size).toBe(0);
    expect(db.__sessions.get('run-1')?.status).toBe('blocked_cancelled');
  });

  it('does not write a draft artifact when cancelled during the initial draft call', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (hostOf(String(input)) === 'api.anthropic.com') {
        // Operator cancels while the draft provider call is in flight.
        const row = db.__sessions.get('run-1');
        if (row) row.status = 'blocked_cancelled';
        return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Rascunho valido.' }], usage: {} }), {
          status: 200,
        });
      }
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    // The draft artifact is not written for the cancelled session and no reviewer runs.
    expect(db.__sessions.get('run-1')?.status).toBe('blocked_cancelled');
    expect(db.__artifacts.size).toBe(0);
    expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === 'api.openai.com')).toBe(false);
  });

  it('does not make the paid draft call when cancelled during the start event (pre-call window)', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    // Simulate an operator cancel landing exactly while the "Draft call started"
    // event is persisted — the await between the pre-draft check and callProvider.
    const realPrepare = db.prepare.bind(db);
    db.prepare = ((query: string) => {
      const stmt = realPrepare(query);
      const realBind = stmt.bind.bind(stmt);
      stmt.bind = (...values: unknown[]) => {
        const bound = realBind(...values);
        const realRun = bound.run.bind(bound);
        bound.run = async () => {
          const result = await realRun();
          if (
            /UPDATE maestro_ai_sessions/i.test(query) &&
            values.some((v) => typeof v === 'string' && v.includes('Draft call started'))
          ) {
            const row = db.__sessions.get('run-1');
            if (row) row.status = 'blocked_cancelled';
          }
          return result;
        };
        return bound;
      };
      return stmt;
    }) as typeof db.prepare;
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    // The before-call re-check catches the cancel: no paid provider request, no artifact.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.__artifacts.size).toBe(0);
    expect(db.__sessions.get('run-1')?.status).toBe('blocked_cancelled');
  });

  it('does not write a revision artifact when cancelled during a reviewer call', async () => {
    const db = createInMemoryDb({
      sessions: [runnableSession({ active_agents_json: JSON.stringify(['claude', 'codex']), max_cycles: 1 })],
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (hostOf(url) === 'api.anthropic.com') {
        return new Response(
          JSON.stringify({ content: [{ type: 'text', text: 'Rascunho valido e robusto.' }], usage: {} }),
          { status: 200 },
        );
      }
      if (hostOf(url) === 'api.openai.com') {
        // Operator cancels while the reviewer call is in flight.
        const row = db.__sessions.get('run-1');
        if (row) row.status = 'blocked_cancelled';
        return new Response(JSON.stringify({ output_text: 'MAESTRO_STATUS: READY' }), { status: 200 });
      }
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    // The reviewer call happened but the cancelled turn writes no revision artifact;
    // only the draft artifact remains.
    expect(db.__sessions.get('run-1')?.status).toBe('blocked_cancelled');
    expect(db.__artifacts.size).toBe(1);
  });

  it('does not issue the reviewer call when cancelled during the revision start event', async () => {
    const db = createInMemoryDb({
      sessions: [runnableSession({ active_agents_json: JSON.stringify(['claude', 'codex']), max_cycles: 1 })],
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (hostOf(String(input)) === 'api.anthropic.com') {
        return new Response(
          JSON.stringify({ content: [{ type: 'text', text: 'Rascunho valido e robusto.' }], usage: {} }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ output_text: 'MAESTRO_STATUS: READY' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    // Cancel lands while the "Serial revision turn started" event is persisted —
    // the await between the pre-turn check and the reviewer callProvider.
    const realPrepare = db.prepare.bind(db);
    db.prepare = ((query: string) => {
      const stmt = realPrepare(query);
      const realBind = stmt.bind.bind(stmt);
      stmt.bind = (...values: unknown[]) => {
        const bound = realBind(...values);
        const realRun = bound.run.bind(bound);
        bound.run = async () => {
          const result = await realRun();
          if (
            /UPDATE maestro_ai_sessions/i.test(query) &&
            values.some((v) => typeof v === 'string' && v.includes('Serial revision turn started'))
          ) {
            const row = db.__sessions.get('run-1');
            if (row) row.status = 'blocked_cancelled';
          }
          return result;
        };
        return bound;
      };
      return stmt;
    }) as typeof db.prepare;
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    // The before-call re-check catches the cancel: the reviewer (openai) is never
    // called and only the draft artifact exists.
    expect(db.__sessions.get('run-1')?.status).toBe('blocked_cancelled');
    expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === 'api.openai.com')).toBe(false);
    expect(db.__artifacts.size).toBe(1);
  });
});

describe('handleMaestroAiSessionsGet (list)', () => {
  it('lists sessions newest-first as public projections', async () => {
    const base: Row = {
      id: 'a',
      title: 'A',
      prompt: 'p',
      protocol_text: protocolText,
      initial_agent: 'claude',
      active_agents_json: JSON.stringify(['claude', 'codex']),
      current_author: 'claude',
      current_text: 'x',
      final_text: null,
      status: 'converged',
      observed_cost_usd: 0.1,
      max_cost_usd: 20,
      max_runtime_minutes: null,
      max_cycles: 2,
      rates_json: JSON.stringify(rates),
      models_json: '{}',
      events_json: '[]',
      created_at: '2026-05-14T00:00:00.000Z',
      updated_at: '2026-05-14T00:00:01.000Z',
      error: null,
    };
    const db = createInMemoryDb({
      sessions: [base, { ...base, id: 'b', title: 'B', updated_at: '2026-05-14T00:00:09.000Z' }],
    });
    const response = await handleMaestroAiSessionsGet({
      env: { BIGDATA_DB: db },
      request: new Request('https://admin.local/api/maestro-ai/sessions'),
    });
    const payload = (await response.json()) as { ok: boolean; sessions: Array<{ id: string; prompt?: string }> };
    expect(response.status).toBe(200);
    expect(payload.sessions.map((s) => s.id)).toEqual(['b', 'a']);
    expect(payload.sessions[0]?.prompt).toBeUndefined();
  });
});

describe('session cancellation and sweeper', () => {
  const activeRow = (overrides: Partial<Row> = {}): Row => ({
    id: 'c-1',
    title: 'S',
    prompt: 'P',
    protocol_text: protocolText,
    initial_agent: 'claude',
    active_agents_json: JSON.stringify(['claude', 'codex']),
    current_author: 'claude',
    current_text: 'X',
    final_text: null,
    status: 'running',
    observed_cost_usd: 0.2,
    max_cost_usd: 20,
    max_runtime_minutes: null,
    max_cycles: 2,
    rates_json: JSON.stringify(rates),
    models_json: '{}',
    events_json: '[]',
    created_at: '2026-05-14T00:00:00.000Z',
    updated_at: '2026-05-14T00:00:00.000Z',
    error: null,
    ...overrides,
  });

  const cancelContext = (sessionId: string, db: ReturnType<typeof createInMemoryDb>) => ({
    env: { BIGDATA_DB: db },
    request: new Request(`https://admin.local/api/maestro-ai/sessions/${sessionId}/cancel`, { method: 'POST' }),
  });

  it('cancels a running session and marks it blocked_cancelled', async () => {
    const db = createInMemoryDb({ sessions: [activeRow()] });
    const response = await handleMaestroAiSessionCancelPost(cancelContext('c-1', db), 'c-1');
    expect(response.status).toBe(200);
    expect(db.__sessions.get('c-1')?.status).toBe('blocked_cancelled');
  });

  it('returns 409 when cancelling an already-terminal session', async () => {
    const db = createInMemoryDb({ sessions: [activeRow({ status: 'converged' })] });
    const response = await handleMaestroAiSessionCancelPost(cancelContext('c-1', db), 'c-1');
    expect(response.status).toBe(409);
    expect(db.__sessions.get('c-1')?.status).toBe('converged');
  });

  it('returns 404 for an unknown session', async () => {
    const db = createInMemoryDb({ sessions: [] });
    const response = await handleMaestroAiSessionCancelPost(cancelContext('nope', db), 'nope');
    expect(response.status).toBe(404);
  });

  it('reaps stale running/queued sessions and leaves fresh and terminal ones intact', async () => {
    const now = Date.parse('2026-06-12T12:00:00.000Z');
    const stale = new Date(now - 20 * 60_000).toISOString();
    const fresh = new Date(now - 60_000).toISOString();
    const db = createInMemoryDb({
      sessions: [
        activeRow({ id: 'stale', status: 'running', updated_at: stale }),
        activeRow({ id: 'queued-stale', status: 'queued', updated_at: stale }),
        activeRow({ id: 'fresh', status: 'running', updated_at: fresh }),
        activeRow({ id: 'done', status: 'converged', updated_at: stale }),
      ],
    });
    const reaped = await maestroAiTestHooks.sweepStaleSessions(db, now);
    expect(reaped).toBe(2);
    expect(db.__sessions.get('stale')?.status).toBe('error');
    expect(db.__sessions.get('queued-stale')?.status).toBe('error');
    expect(db.__sessions.get('fresh')?.status).toBe('running');
    expect(db.__sessions.get('done')?.status).toBe('converged');
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
    const request = maestroAiTestHooks.buildProviderHttpRequest(
      'claude',
      'anthropic-secret',
      'claude-opus-4-7',
      system,
      prompt,
    );
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
    const request = maestroAiTestHooks.buildProviderHttpRequest(
      'grok',
      'xai-secret',
      'grok-4.20-multi-agent-0309',
      system,
      prompt,
    );
    const body = JSON.parse(String(request.init.body)) as { model: string; input: unknown };

    expect(request.endpoint).toBe('https://api.x.ai/v1/responses');
    expect(request.init.headers).toMatchObject({ authorization: 'Bearer xai-secret' });
    expect(body.model).toBe('grok-4.20-multi-agent-0309');
    expect(body.input).toEqual([{ role: 'user', content: [{ type: 'input_text', text: prompt }] }]);
  });

  it('uses the DeepSeek chat completions endpoint for DeepSeek requests', () => {
    const request = maestroAiTestHooks.buildProviderHttpRequest(
      'deepseek',
      'deepseek-secret',
      'deepseek-v4-pro',
      system,
      prompt,
    );
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

  it('treats an authenticated empty provider response as a successful health check', () => {
    expect(
      maestroAiTestHooks.publicApiHealthResult('gemini', {
        text: '',
        model: 'gemini-2.5-pro',
      }),
    ).toMatchObject({
      agent: 'gemini',
      ok: true,
      message: 'Chamada autenticada aceita; resposta textual vazia.',
      model: 'gemini-2.5-pro',
    });
  });
});

describe('handleMaestroAiSettingsPut max_runtime_minutes clearing', () => {
  const settingsContext = (body: unknown, db: ReturnType<typeof createInMemoryDb>) => ({
    env: { BIGDATA_DB: db, CLOUDFLARE_PW: 'cf', CF_ACCOUNT_ID: 'acc', MAESTRO_SECRET_STORE_ID: 'store' },
    request: new Request('https://admin.local/api/maestro-ai/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
  });

  it('clears max_runtime_minutes when the field is sent as null', async () => {
    const db = createInMemoryDb({ settings: { max_runtime_minutes: 60 } });
    const response = await handleMaestroAiSettingsPut(
      settingsContext({ protocol_text: protocolText, max_cost_usd: 20, max_cycles: 2, max_runtime_minutes: null }, db),
    );
    const payload = (await response.json()) as { ok: boolean; settings: { max_runtime_minutes: number | null } };
    expect(response.status).toBe(200);
    expect(payload.settings.max_runtime_minutes).toBeNull();
  });

  it('keeps the current max_runtime_minutes when the field is absent from the body', async () => {
    const db = createInMemoryDb({ settings: { max_runtime_minutes: 60 } });
    const response = await handleMaestroAiSettingsPut(
      settingsContext({ protocol_text: protocolText, max_cost_usd: 20, max_cycles: 2 }, db),
    );
    const payload = (await response.json()) as { ok: boolean; settings: { max_runtime_minutes: number | null } };
    expect(response.status).toBe(200);
    expect(payload.settings.max_runtime_minutes).toBe(60);
  });
});

describe('handleMaestroAiSessionContentPut', () => {
  const editableSession: Row = {
    id: 'edit-1',
    title: 'Titulo antigo',
    prompt: 'P',
    protocol_text: protocolText,
    initial_agent: 'claude',
    active_agents_json: JSON.stringify(['claude', 'codex']),
    current_author: 'claude',
    current_text: 'CONTEUDO IMPORTANTE',
    final_text: null,
    status: 'converged',
    observed_cost_usd: 0.1,
    max_cost_usd: 20,
    max_runtime_minutes: null,
    max_cycles: 2,
    rates_json: JSON.stringify(rates),
    models_json: '{}',
    events_json: '[]',
    created_at: '2026-05-14T00:00:00.000Z',
    updated_at: '2026-05-14T00:00:00.000Z',
    error: null,
  };

  const contentContext = (sessionId: string, body: unknown, db: ReturnType<typeof createInMemoryDb>) => ({
    env: { BIGDATA_DB: db },
    request: new Request(`https://admin.local/api/maestro-ai/sessions/${sessionId}/content`, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
  });

  it('does not wipe current_text when the content field is omitted', async () => {
    const db = createInMemoryDb({ sessions: [{ ...editableSession }] });
    const response = await handleMaestroAiSessionContentPut(
      contentContext('edit-1', { title: 'Novo titulo' }, db),
      'edit-1',
    );
    expect(response.status).toBe(200);
    expect(db.__sessions.get('edit-1')?.current_text).toBe('CONTEUDO IMPORTANTE');
    expect(db.__sessions.get('edit-1')?.title).toBe('Novo titulo');
  });

  it('rejects edits while the session is still running (409)', async () => {
    const db = createInMemoryDb({ sessions: [{ ...editableSession, status: 'running' }] });
    const response = await handleMaestroAiSessionContentPut(
      contentContext('edit-1', { content: 'novo' }, db),
      'edit-1',
    );
    expect(response.status).toBe(409);
    expect(db.__sessions.get('edit-1')?.current_text).toBe('CONTEUDO IMPORTANTE');
  });
});

describe('persistSession (atomic partial update)', () => {
  const baseSession: Row = {
    id: 's1',
    title: 'T',
    prompt: 'P',
    protocol_text: protocolText,
    initial_agent: 'claude',
    active_agents_json: JSON.stringify(['claude', 'codex']),
    current_author: 'claude',
    current_text: 'ORIGINAL',
    final_text: 'PREVIOUS_FINAL',
    status: 'running',
    observed_cost_usd: 0.5,
    max_cost_usd: 20,
    max_runtime_minutes: null,
    max_cycles: 2,
    rates_json: JSON.stringify(rates),
    models_json: '{}',
    events_json: '[]',
    created_at: '2026-05-14T00:00:00.000Z',
    updated_at: '2026-05-14T00:00:00.000Z',
    error: null,
  };

  it('updates only the provided columns and leaves the others intact', async () => {
    const db = createInMemoryDb({ sessions: [{ ...baseSession }] });
    await maestroAiTestHooks.persistSession(db, 's1', { status: 'converged' });
    const row = db.__sessions.get('s1');
    expect(row?.status).toBe('converged');
    expect(row?.current_text).toBe('ORIGINAL');
    expect(row?.observed_cost_usd).toBe(0.5);
  });

  it('can explicitly set a nullable column to null (final_text)', async () => {
    const db = createInMemoryDb({ sessions: [{ ...baseSession }] });
    await maestroAiTestHooks.persistSession(db, 's1', { final_text: null });
    expect(db.__sessions.get('s1')?.final_text).toBeNull();
  });

  it('does NOT write when ifStatusIn guard does not match the current status (CAS)', async () => {
    const db = createInMemoryDb({ sessions: [{ ...baseSession, status: 'blocked_cancelled' }] });
    await maestroAiTestHooks.persistSession(db, 's1', { status: 'converged' }, { ifStatusIn: ['running'] });
    expect(db.__sessions.get('s1')?.status).toBe('blocked_cancelled');
  });

  it('writes when ifStatusIn guard matches (CAS)', async () => {
    const db = createInMemoryDb({ sessions: [{ ...baseSession, status: 'running' }] });
    await maestroAiTestHooks.persistSession(db, 's1', { status: 'converged' }, { ifStatusIn: ['running'] });
    expect(db.__sessions.get('s1')?.status).toBe('converged');
  });
});

describe('fetchWithTimeout', () => {
  it('aborts a hung request after the timeout and rejects', async () => {
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(maestroAiTestHooks.fetchWithTimeout('https://example.com/', {}, 20)).rejects.toThrow(
      /tempo limite|timeout|abort/i,
    );
    vi.unstubAllGlobals();
  });

  it('returns the response when it resolves before the timeout', async () => {
    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await maestroAiTestHooks.fetchWithTimeout('https://example.com/', {}, 1000);
    expect(response.status).toBe(200);
    vi.unstubAllGlobals();
  });
});

describe('checkOneLink (retry + bounded redirect follow)', () => {
  it('treats a persistently 5xx link as broken (not a free pass)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    );
    const result = await maestroAiTestHooks.checkOneLink('https://example.com/x');
    vi.unstubAllGlobals();
    expect(result.ok).toBe(false);
  });

  it('passes a momentary 5xx that recovers on retry', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        return new Response('', { status: calls === 1 ? 503 : 200 });
      }),
    );
    const result = await maestroAiTestHooks.checkOneLink('https://example.com/x');
    vi.unstubAllGlobals();
    expect(result.ok).toBe(true);
  });

  it('follows a public redirect to its final destination and reports a 404 as broken', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/start')) {
          return new Response('', { status: 301, headers: { location: 'https://example.com/missing' } });
        }
        return new Response('', { status: 404 });
      }),
    );
    const result = await maestroAiTestHooks.checkOneLink('https://example.com/start');
    vi.unstubAllGlobals();
    expect(result.ok).toBe(false);
  });

  it('treats a 3xx with no Location header as broken (not reachable)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 302 })),
    );
    const result = await maestroAiTestHooks.checkOneLink('https://example.com/x');
    vi.unstubAllGlobals();
    expect(result.ok).toBe(false);
  });

  it('treats an unresolving redirect chain (past the hop limit) as broken', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 301, headers: { location: 'https://example.com/next' } })),
    );
    const result = await maestroAiTestHooks.checkOneLink('https://example.com/start');
    vi.unstubAllGlobals();
    expect(result.ok).toBe(false);
  });

  it('refuses to follow a redirect into an internal host and never fetches it', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (hostOf(url) === '169.254.169.254') return new Response('secret', { status: 200 });
      return new Response('', { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await maestroAiTestHooks.checkOneLink('https://example.com/start');
    vi.unstubAllGlobals();
    expect(result.ok).toBe(false);
    expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === '169.254.169.254')).toBe(false);
  });
});

describe('maestro link-audit host safety (SSRF hardening)', () => {
  it('blocks private, loopback, link-local and internal hosts', () => {
    const blocked = [
      'http://127.0.0.1/x',
      'http://localhost/x',
      'http://10.0.0.5/x',
      'http://192.168.1.1/x',
      'http://172.16.4.2/x',
      'http://169.254.169.254/latest/meta-data',
      'http://[::1]/x',
      'https://admin-motor.internal/secrets',
      'http://intranet/x',
    ];
    for (const url of blocked) {
      const host = new URL(url).hostname;
      expect(maestroAiTestHooks.isBlockedAuditHost(host)).toBe(true);
    }
  });

  it('allows public hosts and public IPs', () => {
    for (const host of ['example.com', 'www.lcv.app.br', '8.8.8.8', 'sub.domain.co.uk']) {
      expect(maestroAiTestHooks.isBlockedAuditHost(host)).toBe(false);
    }
  });

  it('blocks IPv4-mapped/compat IPv6 literals that resolve to loopback/private (SSRF bypass)', () => {
    // URL.hostname normalizes ::ffff:127.0.0.1 -> ::ffff:7f00:1, ::ffff:192.168.0.1 -> ::ffff:c0a8:1
    for (const host of [
      '::ffff:7f00:1',
      '[::ffff:7f00:1]',
      '::ffff:127.0.0.1',
      '::ffff:c0a8:1',
      '::ffff:192.168.0.1',
      '::127.0.0.1',
    ]) {
      expect(maestroAiTestHooks.isBlockedAuditHost(host)).toBe(true);
    }
    // A mapped PUBLIC address (8.8.8.8 -> ::ffff:808:808) stays allowed.
    expect(maestroAiTestHooks.isBlockedAuditHost('::ffff:808:808')).toBe(false);
  });

  it('never fetches an IPv4-mapped IPv6 loopback target', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await maestroAiTestHooks.checkOneLink('http://[::ffff:127.0.0.1]/');
    vi.unstubAllGlobals();
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('flags a blocked-host URL as broken WITHOUT fetching it (audit failure, not silent omission)', async () => {
    // extractUrls surfaces the blocked host so the audit can report it...
    const urls = maestroAiTestHooks.extractUrls(
      'See https://example.com/ok and http://169.254.169.254/meta and http://localhost:8787/admin',
    );
    expect(urls).toContain('https://example.com/ok');
    expect(urls.some((u: string) => hostOf(u) === '169.254.169.254')).toBe(true);
    // ...but checkOneLink rejects it as !ok and never performs a fetch.
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const internal = await maestroAiTestHooks.checkOneLink('http://169.254.169.254/meta');
    const localhost = await maestroAiTestHooks.checkOneLink('http://localhost:8787/admin');
    vi.unstubAllGlobals();
    expect(internal.ok).toBe(false);
    expect(localhost.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces bracketed IPv6 URLs so internal IPv6 links are audited, not silently dropped', () => {
    // The URL tokenizer must not truncate `http://[::ffff:127.0.0.1]/` at the
    // bracket: an internal IPv6 literal has to reach checkOneLink as a real URL,
    // otherwise isBlockedAuditHost is never consulted and the link is ignored.
    const urls = maestroAiTestHooks.extractUrls(
      'Veja http://[::ffff:127.0.0.1]/latest e http://[::1]/admin e https://example.com/ok',
    );
    const hosts = urls.map((u: string) => hostOf(u));
    expect(hosts).toContain('[::ffff:7f00:1]'); // ::ffff:127.0.0.1 normalized by URL.hostname
    expect(hosts).toContain('[::1]');
    expect(urls).toContain('https://example.com/ok');
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
