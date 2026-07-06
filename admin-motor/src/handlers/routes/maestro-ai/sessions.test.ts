import { describe, expect, it, vi } from 'vitest';

import {
  handleMaestroAiArtifactsGet,
  handleMaestroAiSessionCancelPost,
  handleMaestroAiSessionContentPut,
  handleMaestroAiSessionResumePost,
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

  // Mirrors D1's meta.changes: returns the number of rows the UPDATE modified,
  // so a losing CAS write reports 0 changes like the real database.
  const applyUpdate = (
    table: 'maestro_ai_sessions' | 'maestro_ai_settings',
    query: string,
    values: unknown[],
  ): number => {
    const setMatch = /SET\s+([\s\S]+?)\s+WHERE/i.exec(query);
    if (!setMatch) return 0;
    const assignments = (setMatch[1] ?? '').split(',').map((part) => part.trim());
    const setCols = assignments.map((a) => (a.split('=')[0] ?? '').trim());
    if (table === 'maestro_ai_settings') {
      setCols.forEach((col, i) => {
        settings[col] = values[i];
      });
      return 1;
    }
    const id = String(values[setCols.length]);
    const row = sessions.get(id);
    if (!row) return 0;
    // Honor an optional "AND status IN (?, ?)" CAS guard.
    if (/status\s+IN/i.test(query)) {
      const guardStatuses = values.slice(setCols.length + 1).map(String);
      if (guardStatuses.length && !guardStatuses.includes(String(row.status))) return 0;
    }
    setCols.forEach((col, i) => {
      row[col] = values[i];
    });
    return 1;
  };

  const makeStatement = (query: string, values: unknown[]) => ({
    run: async () => {
      let changes = 1;
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
      } else if (/UPDATE maestro_ai_sessions/i.test(query)) changes = applyUpdate('maestro_ai_sessions', query, values);
      else if (/UPDATE maestro_ai_settings/i.test(query)) changes = applyUpdate('maestro_ai_settings', query, values);
      return { success: true, meta: { changes } };
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
      grok: 'grok-4.20-multi-agent',
      perplexity: 'sonar-reasoning-pro',
    });
    expect(JSON.stringify(payload)).not.toContain('secret-claude');
  });

  it('saves API keys through Cloudflare Secret Store and not into D1 settings JSON', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/models')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
      if (url.includes('/secrets?') && !init?.method) {
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

  it('updates an existing Secret Store key even when it sits beyond the first list page', async () => {
    const fillerPage = Array.from({ length: 100 }, (_, i) => ({
      id: `filler-${i}`,
      name: `FILLER_${i}`,
      status: 'active',
    }));
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/models')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
      if (url.includes('/secrets') && !url.includes('/secrets/') && (!init?.method || init.method === 'GET')) {
        const page = new URL(url).searchParams.get('page');
        const result =
          page === '1'
            ? fillerPage
            : page === '2'
              ? [{ id: 'sec-claude', name: 'MAESTRO_ANTHROPIC_API_KEY', status: 'active' }]
              : [];
        return new Response(JSON.stringify({ success: true, result }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: true, result: { id: 'sec-claude' } }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = await handleMaestroAiSettingsPut(
      createContext(
        {
          protocol_text: protocolText,
          max_cost_usd: 20,
          max_runtime_minutes: null,
          max_cycles: 2,
          rates,
          api_keys: { claude: 'rotated-secret-claude' },
        },
        {},
        createMaestroDb(),
      ),
    );
    const payload = (await response.json()) as { ok: boolean };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/secrets/sec-claude'),
      expect.objectContaining({ method: 'PATCH' }),
    );
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(postCall).toBeUndefined();
    vi.unstubAllGlobals();
  });
});

describe('Maestro AI desktop-parity parsing (Plan A)', () => {
  it('extractStatus matches desktop exact-line semantics', () => {
    const { extractStatus } = maestroAiTestHooks;
    expect(extractStatus('intro line\nMAESTRO_STATUS: READY\nrest')).toBe('READY');
    expect(extractStatus('maestro_status: ready')).toBe('READY');
    expect(extractStatus('MAESTRO_STATUS : READY')).toBe('NOT_READY');
    expect(extractStatus('prefix MAESTRO_STATUS: READY suffix')).toBe('NOT_READY');
    expect(extractStatus('MAESTRO_STATUS: NOT_READY\nMAESTRO_STATUS: READY')).toBe('NOT_READY');
    expect(extractStatus('no marker at all')).toBe('NOT_READY');
  });

  it('extractTagged resolves the LAST complete tag pair (desktop parity)', () => {
    const { extractTagged } = maestroAiTestHooks;
    expect(extractTagged('<t>first</t> and <t>second</t>', 't')).toBe('second');
    expect(extractTagged('<t>  padded  </t>', 't')).toBe('padded');
    expect(extractTagged('<t></t>', 't')).toBeNull();
    expect(extractTagged('no tags', 't')).toBeNull();
    expect(extractTagged('<t>x</t>', 'evil.*tag')).toBeNull();
  });

  it('isSubstantiveEditorialChange ignores whitespace-only differences (desktop parity)', () => {
    const { isSubstantiveEditorialChange } = maestroAiTestHooks;
    expect(isSubstantiveEditorialChange('a b', 'a\n\nb')).toBe(false);
    expect(isSubstantiveEditorialChange('a  b', 'a b')).toBe(false);
    expect(isSubstantiveEditorialChange('a b\r\n', 'a b')).toBe(false);
    expect(isSubstantiveEditorialChange('a b.', 'a b')).toBe(true);
    expect(isSubstantiveEditorialChange('A b', 'a b')).toBe(true);
  });

  it('mirrors Rust ASCII-uppercase and White_Space semantics exactly', () => {
    const { extractStatus, extractTagged, isSubstantiveEditorialChange } = maestroAiTestHooks;
    // Unicode uppercase must NOT apply: 'ſ' uppercases to 'S' in JS but
    // not in Rust to_ascii_uppercase, so this line must not match the marker.
    expect(extractStatus('maeſtro_status: ready')).toBe('NOT_READY');
    // U+0085 (NEL) is Rust whitespace: trim strips it, the marker matches.
    expect(extractStatus('MAESTRO_STATUS: READY')).toBe('READY');
    // U+FEFF is NOT Rust whitespace: it survives trim and blocks the match.
    expect(extractStatus('﻿MAESTRO_STATUS: READY')).toBe('NOT_READY');
    // Rust charset guard does not reject an empty tag name.
    expect(extractTagged('<>value</>', '')).toBe('value');
    // U+0085 collapses as whitespace; U+FEFF is a regular character.
    expect(isSubstantiveEditorialChange('ab', 'a b')).toBe(false);
    expect(isSubstantiveEditorialChange('a﻿b', 'a b')).toBe(true);
  });

  it('sanitizeAgent honors the desktop alias table', () => {
    const { sanitizeAgent } = maestroAiTestHooks;
    expect(sanitizeAgent('agy', 'claude')).toBe('gemini');
    expect(sanitizeAgent('antigravity', 'claude')).toBe('gemini');
    expect(sanitizeAgent('deepseek-api', 'claude')).toBe('deepseek');
    expect(sanitizeAgent('grok-api', 'claude')).toBe('grok');
    expect(sanitizeAgent('perplexity-api', 'claude')).toBe('perplexity');
    expect(sanitizeAgent('unknown', 'claude')).toBe('claude');
  });
});

describe('Maestro AI revision prompt teaches the block contract', () => {
  it('exposes the block manifest and changed_blocks schema in the revision prompt', async () => {
    const prompt = await maestroAiTestHooks.buildRevisionPrompt({
      input: {
        title: 'Sessao',
        prompt: 'Escreva.',
        protocol_text: protocolText,
        initial_agent: 'claude',
        active_agents: ['claude', 'codex'],
        initial_content: '',
        max_cost_usd: 10,
        max_runtime_minutes: null,
        rates,
        models: {},
        max_cycles: 2,
      } as Parameters<(typeof maestroAiTestHooks)['buildRevisionPrompt']>[0]['input'],
      runId: 'run-1',
      turn: 1,
      currentText: '# Titulo\n\nCorpo do artigo em custodia.',
      currentAuthor: 'claude',
      reviewer: 'codex',
      serialReports: [],
      closingTurn: false,
    });
    expect(prompt).toContain('## Current Text Block Manifest');
    expect(prompt).toContain('| block_id | kind | chars | sha256_12 | locked_by_default | excerpt |');
    expect(prompt).toContain('| B0001 | heading |');
    expect(prompt).toContain('changed_blocks: list every changed received block using block_id');
    expect(prompt).toContain('unchanged_approved_blocks');
    expect(prompt).toContain('change_type: "reorder"');
    expect(prompt).toContain('## Evidence and Bibliographic Integrity Gate');
    expect(prompt).toContain('Missing evidence by itself is not a sufficient reason to pass the blocker forward.');
    expect(prompt).toContain('A text is not final-deliverable while it still depends on unresolved evidence markers');
    expect(prompt).toContain('MAESTRO_STATUS: NOT_READY with custody: "unchanged" is a contract violation');
  });
});

describe('Maestro AI prior-reports feed, prompt sections and model resolution (Plan F)', () => {
  const promptInput = {
    title: 'Sessao',
    prompt: 'Escreva.',
    protocol_text: protocolText,
    initial_agent: 'claude',
    active_agents: ['claude', 'codex'],
    initial_content: '',
    max_cost_usd: 10,
    max_runtime_minutes: null,
    rates,
    models: {},
    max_cycles: 2,
  } as Parameters<(typeof maestroAiTestHooks)['buildRevisionPrompt']>[0]['input'];

  it('buildRevisionHistoryBlock formats prior reports canonically (cap, placeholder, skip, order, empty)', () => {
    const { buildRevisionHistoryBlock } = maestroAiTestHooks;
    // Empty history -> canonical fallback sentence.
    expect(buildRevisionHistoryBlock([])).toBe('No prior revision reports are recorded for this serial cycle.');
    const block = buildRevisionHistoryBlock([
      {
        name: 'Codex',
        role: 'review',
        status: 'NOT_READY',
        report: 'reviewer: codex\ncustody: "revised"',
        artifact: 'art-1',
      },
      { name: 'Claude', role: 'review', status: 'READY', report: null, artifact: 'art-2' },
      { name: 'Gemini', role: 'review', status: 'READY', report: '   ', artifact: 'art-3' },
    ]);
    // Chronological order with the canonical header/artifact/fence shape.
    expect(block).toContain('### Codex / review / `NOT_READY`');
    expect(block).toContain('Artifact: `art-1`');
    expect(block).toContain('```text\nreviewer: codex\ncustody: "revised"\n```');
    // Missing report -> canonical contract-failure placeholder.
    expect(block).toContain(
      'No complete maestro_revision_report block was returned by Claude. Treat this artifact as a contract failure, not as deliberative substance.',
    );
    // Whitespace-only extracted report -> the turn is skipped entirely.
    expect(block).not.toContain('Gemini');
    expect(block.indexOf('Codex')).toBeLessThan(block.indexOf('Claude'));
    // Per-report cap: 12,000 Unicode chars.
    const long = buildRevisionHistoryBlock([
      { name: 'Codex', role: 'review', status: 'READY', report: 'x'.repeat(15_000), artifact: 'a' },
    ]);
    const fenced = /```text\n(x+)\n```/.exec(long);
    expect(fenced?.[1]?.length).toBe(12_000);
  });

  it('revision prompt carries the canonical sections: section-ID rule, closing redactor, quality justification, prior reports', async () => {
    const prompt = await maestroAiTestHooks.buildRevisionPrompt({
      input: promptInput,
      runId: 'run-1',
      turn: 2,
      currentText: '# Titulo\n\nCorpo.',
      currentAuthor: 'codex',
      reviewer: 'claude',
      serialReports: [
        { name: 'Codex', role: 'review', status: 'NOT_READY', report: 'custody: "revised"', artifact: 'art-9' },
      ],
      closingTurn: true,
    });
    // Canonical Language Contract additions.
    expect(prompt).toContain('Cite compact section IDs only, such as `§V.14` or `§11.7`.');
    expect(prompt).toContain('Keep protocol markers exactly as specified.');
    // Canonical Role Contract additions.
    expect(prompt).toContain('Closing redactor turn: `true`.');
    expect(prompt).toContain('state `SELF_REVIEW_BLOCKED`');
    expect(prompt).toContain(
      'The original redactor may act in the closing redactor turn only when the current version author is another peer.',
    );
    // Canonical header.
    expect(prompt).toContain('Round turn: `2`');
    // Canonical Quality gate justification bullets.
    expect(prompt).toContain(
      'Any deletion, compression, simplification, or structural narrowing must be justified in the report with:',
    );
    expect(prompt).toContain('- the exact passage changed;');
    expect(prompt).toContain('why preserving the stronger formulation would be unsafe or incorrect');
    expect(prompt).toContain('If you are unsure, preserve the passage and report the concern instead of rewriting it.');
    // Prior reports replace the raw event feed.
    expect(prompt).toContain('## Prior Serial Revision Reports');
    expect(prompt).toContain('### Codex / review / `NOT_READY`');
    expect(prompt).not.toContain('## Prior Session Events');
  });

  it('choosePreferredModel picks the first live candidate, else first live model, else the fallback', () => {
    const { choosePreferredModel } = maestroAiTestHooks;
    expect(choosePreferredModel(['a', 'gpt-5.4', 'gpt-5.5'], ['gpt-5.5', 'gpt-5.4'], 'fb')).toBe('gpt-5.5');
    expect(choosePreferredModel(['a', 'gpt-5.4'], ['gpt-5.5', 'gpt-5.4'], 'fb')).toBe('gpt-5.4');
    expect(choosePreferredModel(['other-1', 'other-2'], ['gpt-5.5'], 'fb')).toBe('other-1');
    expect(choosePreferredModel([], ['gpt-5.5'], 'fb')).toBe('fb');
  });

  it('resolveProviderModel queries /models with canonical candidates, falls back on failure, and skips perplexity', async () => {
    const { resolveProviderModel } = maestroAiTestHooks;
    const endpoints: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        endpoints.push(url.toString());
        if (url.hostname === 'api.openai.com') {
          return new Response(JSON.stringify({ data: [{ id: 'gpt-5.3' }, { id: 'gpt-4.1' }] }), { status: 200 });
        }
        if (url.hostname === 'api.x.ai') throw new Error('network down');
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }),
    );
    // Candidate match: gpt-5.3 is the first canonical candidate present.
    expect(await resolveProviderModel('codex', 'key')).toBe('gpt-5.3');
    expect(endpoints.some((e) => e.includes('api.openai.com/v1/models'))).toBe(true);
    // Endpoint failure -> canonical hardcoded fallback.
    expect(await resolveProviderModel('grok', 'key')).toBe('grok-4.20-multi-agent');
    // Perplexity has NO live resolution (canonical): no fetch, default returned.
    endpoints.length = 0;
    expect(await resolveProviderModel('perplexity', 'key')).toBe('sonar-reasoning-pro');
    expect(endpoints).toEqual([]);
    vi.unstubAllGlobals();
  });
});

describe('Maestro AI release link audit (Plan D)', () => {
  it('extractUrlCandidates follows the canonical regex, trim, dedup, sorted order and caps', () => {
    const { extractUrlCandidates, countUniqueUrlCandidates } = maestroAiTestHooks;
    // Canonical stop-set has no `}`; trailing trim is only . , ; :
    const text =
      'Veja https://zeta.example/a. e https://alpha.example/b, https://zeta.example/a; ' +
      'markdown (https://mid.example/c) e https://brace.example/d}tail ' +
      'e https://bang.example/e! fim';
    const candidates = extractUrlCandidates(text);
    const urls = candidates.map((c: { url: string }) => c.url);
    // Sorted lexicographically (BTreeSet parity), deduped on the cleaned string.
    expect(urls).toEqual([
      'https://alpha.example/b',
      'https://bang.example/e!',
      'https://brace.example/d}tail',
      'https://mid.example/c',
      'https://zeta.example/a',
    ]);
    // Public candidates carry no rejection.
    expect(candidates.every((c: { rejection: string | null }) => c.rejection === null)).toBe(true);
    // Bracketed IPv6 stops at `]` and surfaces as an invalid (blocked) candidate.
    const v6 = extractUrlCandidates('interno http://[::1]/admin aqui');
    expect(v6.length).toBe(1);
    expect(v6[0]?.url).toBe('http://[::1');
    expect(v6[0]?.rejection).toMatch(/invalida/i);
    // Blocked hosts surface with a rejection reason instead of being dropped.
    const internal = extractUrlCandidates('http://localhost:8787/x e http://10.0.0.5/y');
    expect(internal.map((c: { rejection: string | null }) => Boolean(c.rejection))).toEqual([true, true]);
    // Candidate cap: 30 uniques; counter stops at 31.
    const many = Array.from({ length: 35 }, (_v, i) => `https://cap${String(i).padStart(2, '0')}.example/`).join(' ');
    expect(extractUrlCandidates(many).length).toBe(30);
    expect(countUniqueUrlCandidates(many)).toBe(31);
    expect(countUniqueUrlCandidates('sem links')).toBe(0);
  });

  it('isBlockedAuditHost covers the canonical deep-SSRF ranges (CGNAT, TEST-NETs, multicast, docs v6)', () => {
    const { isBlockedAuditHost } = maestroAiTestHooks;
    const blocked = [
      '100.64.0.1',
      '100.127.255.254', // CGNAT 100.64/10
      '192.0.0.1', // RFC 6890
      '192.0.2.7', // TEST-NET-1
      '198.18.0.1',
      '198.19.255.1', // benchmarking /15
      '198.51.100.9', // TEST-NET-2
      '203.0.113.20', // TEST-NET-3
      '224.0.0.1',
      '239.255.255.250',
      '255.255.255.255', // multicast + reserved/broadcast
      'ff02::1',
      'ff05::2', // v6 multicast
      '2001:db8::1', // v6 documentation
      'localhost.localdomain',
    ];
    for (const host of blocked) {
      expect(isBlockedAuditHost(host), host).toBe(true);
    }
    for (const host of [
      '100.63.255.254',
      '100.128.0.1',
      '198.17.0.1',
      '198.20.0.1',
      '223.255.255.254',
      '2001:db9::1',
    ]) {
      expect(isBlockedAuditHost(host), host).toBe(false);
    }
  });

  it('hostResolvesToBlockedIp uses DoH and fails open on resolver errors', async () => {
    const { hostResolvesToBlockedIp } = maestroAiTestHooks;
    const dohCalls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        dohCalls.push(`${url.searchParams.get('name')}:${url.searchParams.get('type')}`);
        if (url.hostname !== 'cloudflare-dns.com') throw new Error(`unexpected fetch ${url.hostname}`);
        const name = url.searchParams.get('name');
        if (name === 'rebind.example') {
          return new Response(JSON.stringify({ Answer: [{ type: 1, data: '10.0.0.5' }] }), { status: 200 });
        }
        if (name === 'ula.example' && url.searchParams.get('type') === 'AAAA') {
          return new Response(JSON.stringify({ Answer: [{ type: 28, data: 'fd00::1' }] }), { status: 200 });
        }
        if (name === 'down.example') throw new Error('doh outage');
        return new Response(JSON.stringify({ Answer: [{ type: 1, data: '93.184.216.34' }] }), { status: 200 });
      }),
    );
    expect(await hostResolvesToBlockedIp('rebind.example')).toBe(true);
    expect(await hostResolvesToBlockedIp('ula.example')).toBe(true);
    expect(await hostResolvesToBlockedIp('public.example')).toBe(false);
    // Fail-open on DoH outage (canonical pre-flight parity: Err => not blocked).
    expect(await hostResolvesToBlockedIp('down.example')).toBe(false);
    expect(dohCalls.some((c) => c.startsWith('rebind.example'))).toBe(true);
    vi.unstubAllGlobals();
  });

  it('probePublicUrl applies canonical tones: 2xx/3xx ok, 4xx incl 429 and 5xx error, 999 warn', async () => {
    const { probePublicUrl } = maestroAiTestHooks;
    const probe = async (status: number) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL) => {
          const url = new URL(String(input));
          if (url.hostname === 'cloudflare-dns.com') {
            return new Response(JSON.stringify({ Answer: [{ type: 1, data: '93.184.216.34' }] }), { status: 200 });
          }
          // The Response constructor rejects statuses outside 200-599 (e.g. 999),
          // so fake the minimal surface the probe reads.
          return { status, headers: new Headers() } as unknown as Response;
        }),
      );
      const row = await probePublicUrl('https://tone.example/x');
      vi.unstubAllGlobals();
      return row;
    };
    expect((await probe(204)).tone).toBe('ok');
    expect((await probe(404)).tone).toBe('error');
    expect((await probe(429)).tone).toBe('error');
    expect((await probe(503)).tone).toBe('error');
    const warn = await probe(999);
    expect(warn.tone).toBe('warn');
    expect(warn.ok).toBe(false);
    // 3xx without a Location header is a final redirection status: canonical ok.
    expect((await probe(302)).tone).toBe('ok');
  });

  it('probePublicUrl falls back HEAD->GET on 405/403 and on HEAD transport error, without retries', async () => {
    const { probePublicUrl } = maestroAiTestHooks;
    const methods: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        if (url.hostname === 'cloudflare-dns.com') {
          return new Response(JSON.stringify({ Answer: [{ type: 1, data: '93.184.216.34' }] }), { status: 200 });
        }
        methods.push(String(init?.method ?? 'GET'));
        if (init?.method === 'HEAD') return new Response(null, { status: 405 });
        return new Response(null, { status: 200 });
      }),
    );
    const row = await probePublicUrl('https://m.example/x');
    expect(row.tone).toBe('ok');
    expect(methods).toEqual(['HEAD', 'GET']);
    vi.unstubAllGlobals();

    // HEAD transport error -> single GET fallback; GET transport error -> error tone.
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        if (url.hostname === 'cloudflare-dns.com') {
          return new Response(JSON.stringify({ Answer: [{ type: 1, data: '93.184.216.34' }] }), { status: 200 });
        }
        void init;
        calls += 1;
        throw new Error('ECONNRESET');
      }),
    );
    const dead = await probePublicUrl('https://dead.example/x');
    expect(dead.tone).toBe('error');
    expect(calls).toBe(2); // HEAD + GET, no retry loop
    vi.unstubAllGlobals();
  });

  it('probePublicUrl follows redirects up to 5 hops re-validating each hop, and blocks internal pivots', async () => {
    const { probePublicUrl } = maestroAiTestHooks;
    const targets: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (url.hostname === 'cloudflare-dns.com') {
          return new Response(JSON.stringify({ Answer: [{ type: 1, data: '93.184.216.34' }] }), { status: 200 });
        }
        targets.push(url.toString());
        if (url.pathname === '/pivot') {
          return new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest' } });
        }
        if (url.pathname.startsWith('/hop')) {
          const hop = Number(url.pathname.replace('/hop', '') || 0);
          return new Response(null, { status: 301, headers: { location: `https://chain.example/hop${hop + 1}` } });
        }
        return new Response(null, { status: 200 });
      }),
    );
    // Redirect into an internal host: blocked, the internal target is never fetched.
    const pivot = await probePublicUrl('https://chain.example/pivot');
    expect(pivot.tone).toBe('blocked');
    expect(targets.some((t) => t.includes('169.254.169.254'))).toBe(false);
    // Endless chain: stops at the 5-hop cap; final 3xx is canonical ok.
    targets.length = 0;
    const looped = await probePublicUrl('https://chain.example/hop0');
    expect(looped.tone).toBe('ok');
    expect(targets.length).toBe(6); // initial + 5 followed hops
    vi.unstubAllGlobals();
  });

  it('finalReleaseAuditFailure short-circuits bibliographic -> capacity -> HTTP with structured context', async () => {
    const { finalReleaseAuditFailure } = maestroAiTestHooks;
    // Stage 1: bibliographic blocker wins without any fetch.
    const fetchSpy = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    const biblio = await finalReleaseAuditFailure('Texto com [EVIDENCIA_PENDENTE] e https://x.example/');
    expect(biblio?.context?.gate).toBe('bibliographic_integrity');
    expect(fetchSpy).not.toHaveBeenCalled();
    // Stage 2: capacity (31 unique URLs) pauses before any fetch.
    const many = Array.from({ length: 31 }, (_v, i) => `https://cap${String(i).padStart(2, '0')}.example/`).join(' ');
    const capacity = await finalReleaseAuditFailure(`Texto limpo ${many}`);
    expect(capacity?.context?.gate).toBe('link_audit_capacity');
    expect(capacity?.context?.urls_found).toBe(31);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    // Stage 3: HTTP audit fails on a 404 row; 999 (warn) does not fail.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (url.hostname === 'cloudflare-dns.com') {
          return new Response(JSON.stringify({ Answer: [{ type: 1, data: '93.184.216.34' }] }), { status: 200 });
        }
        if (url.hostname === 'missing.example') return new Response(null, { status: 404 });
        if (url.hostname === 'weird.example') return { status: 999, headers: new Headers() } as unknown as Response;
        return new Response(null, { status: 200 });
      }),
    );
    const http = await finalReleaseAuditFailure(
      'Texto https://ok.example/ https://missing.example/ https://weird.example/',
    );
    expect(http?.context?.gate).toBe('link_audit');
    expect(http?.context?.failed).toBe(1);
    expect(http?.context?.ok).toBe(1);
    const clean = await finalReleaseAuditFailure('Texto https://ok.example/ https://weird.example/');
    expect(clean).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('Maestro AI provider retry and time budget (Plan C)', () => {
  it('parseRetryAfterHeader handles delta-seconds, HTTP-date and absence', () => {
    const { parseRetryAfterHeader } = maestroAiTestHooks;
    expect(parseRetryAfterHeader(new Headers({ 'retry-after': '7' }))).toBe(7);
    expect(parseRetryAfterHeader(new Headers({ 'retry-after': ' 12 ' }))).toBe(12);
    const future = new Date(Date.now() + 45_000).toUTCString();
    const parsed = parseRetryAfterHeader(new Headers({ 'retry-after': future }));
    expect(parsed).toBeGreaterThanOrEqual(43);
    expect(parsed).toBeLessThanOrEqual(46);
    const past = new Date(Date.now() - 60_000).toUTCString();
    expect(parseRetryAfterHeader(new Headers({ 'retry-after': past }))).toBe(0);
    expect(parseRetryAfterHeader(new Headers())).toBeNull();
    expect(parseRetryAfterHeader(new Headers({ 'retry-after': 'garbage' }))).toBeNull();
  });

  it('remainingSessionMs and sessionTimeExhausted mirror the canonical 2s cutoff', () => {
    const { remainingSessionMs, sessionTimeExhausted } = maestroAiTestHooks;
    expect(remainingSessionMs(Date.now(), null)).toBeNull();
    expect(sessionTimeExhausted(Date.now(), null)).toBe(false);
    const fresh = remainingSessionMs(Date.now(), 10);
    expect(fresh).toBeGreaterThan(9 * 60_000);
    expect(sessionTimeExhausted(Date.now(), 10)).toBe(false);
    // Anchor 10 minutes in the past with a 10-minute budget: exhausted.
    expect(remainingSessionMs(Date.now() - 10 * 60_000, 10)).toBe(0);
    expect(sessionTimeExhausted(Date.now() - 10 * 60_000, 10)).toBe(true);
    // 1.5s remaining is below the canonical < 2s cutoff.
    expect(sessionTimeExhausted(Date.now() - 10 * 60_000 + 1_500, 10)).toBe(true);
    expect(sessionTimeExhausted(Date.now() - 10 * 60_000 + 30_000, 10)).toBe(false);
  });

  it('fetchProviderWithRetry retries 429 with Retry-After and network errors once', async () => {
    const { fetchProviderWithRetry } = maestroAiTestHooks;
    const never = async () => false;
    // 429 then 200: waits Retry-After (0s here) and returns the second response.
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        if (calls === 1) return new Response('slow down', { status: 429, headers: { 'retry-after': '0' } });
        return new Response('ok', { status: 200 });
      }),
    );
    const ok = await fetchProviderWithRetry('https://api.test/x', {}, 5_000, never);
    expect(ok).not.toBe('cancelled');
    expect((ok as Response).status).toBe(200);
    expect(calls).toBe(2);
    // Second 429 is returned as-is (max 2 attempts).
    calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        return new Response('slow', { status: 429, headers: { 'retry-after': '0' } });
      }),
    );
    const still429 = await fetchProviderWithRetry('https://api.test/x', {}, 5_000, never);
    expect((still429 as Response).status).toBe(429);
    expect(calls).toBe(2);
    // 500 never retries.
    calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        return new Response('boom', { status: 500 });
      }),
    );
    const err500 = await fetchProviderWithRetry('https://api.test/x', {}, 5_000, never);
    expect((err500 as Response).status).toBe(500);
    expect(calls).toBe(1);
    // Network error retries exactly once, then throws.
    calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        throw new Error('ECONNRESET');
      }),
    );
    await expect(fetchProviderWithRetry('https://api.test/x', {}, 5_000, never)).rejects.toThrow('ECONNRESET');
    expect(calls).toBe(2);
    // Cancellation during the 429 wait returns the sentinel.
    calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        return new Response('slow', { status: 429, headers: { 'retry-after': '1' } });
      }),
    );
    const cancelled = await fetchProviderWithRetry('https://api.test/x', {}, 5_000, async () => true);
    expect(cancelled).toBe('cancelled');
    expect(calls).toBe(1);
    vi.unstubAllGlobals();
  }, 30_000);

  it('aborts an in-flight provider call when the session is cancelled (abortive cancel poller)', async () => {
    const { fetchProviderWithRetry } = maestroAiTestHooks;
    // A hung provider call that only settles when its AbortSignal fires.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          }),
      ),
    );
    let cancelled = false;
    setTimeout(() => {
      cancelled = true;
    }, 1_000);
    const startedAt = Date.now();
    // 60s call timeout: without the abort poller this would hang for a minute.
    const result = await fetchProviderWithRetry('https://api.test/x', {}, 60_000, async () => cancelled);
    expect(result).toBe('cancelled');
    // One poller tick (5s) after the 1s cancel flag: well under the call timeout.
    expect(Date.now() - startedAt).toBeLessThan(20_000);
    vi.unstubAllGlobals();
  }, 30_000);
});
describe('Maestro AI stable-approval convergence and reviewer selection (Plan B3)', () => {
  it('hasAllIndependentApprovals requires every non-author agent in the stable set', () => {
    const { hasAllIndependentApprovals } = maestroAiTestHooks;
    const order = ['codex', 'deepseek', 'claude'];
    expect(hasAllIndependentApprovals(order, 'claude', new Set())).toBe(false);
    expect(hasAllIndependentApprovals(order, 'claude', new Set(['codex']))).toBe(false);
    expect(hasAllIndependentApprovals(order, 'claude', new Set(['codex', 'deepseek']))).toBe(true);
    // The author's own membership is irrelevant.
    expect(hasAllIndependentApprovals(order, 'claude', new Set(['codex', 'deepseek', 'claude']))).toBe(true);
    // No author yet (draft not produced) -> never converged.
    expect(hasAllIndependentApprovals(order, null, new Set(['codex', 'deepseek', 'claude']))).toBe(false);
  });

  it('closingTurnHasRequiredPriorReviews gates the draft lead on the full peer circuit', () => {
    const { closingTurnHasRequiredPriorReviews } = maestroAiTestHooks;
    const order = ['codex', 'deepseek', 'claude'];
    expect(closingTurnHasRequiredPriorReviews(order, 'claude', new Set())).toBe(false);
    expect(closingTurnHasRequiredPriorReviews(order, 'claude', new Set(['codex']))).toBe(false);
    expect(closingTurnHasRequiredPriorReviews(order, 'claude', new Set(['codex', 'deepseek']))).toBe(true);
    // A lead-only roster has no required reviewers -> never closure-ready.
    expect(closingTurnHasRequiredPriorReviews(['claude'], 'claude', new Set())).toBe(false);
  });

  it('selectSerialReviewerIndex prefers the eligible nominal slot and redraws otherwise', () => {
    const { selectSerialReviewerIndex } = maestroAiTestHooks;
    const order = ['codex', 'deepseek', 'claude'];
    // Nominal eligible: not the author, not approved, not the gated lead.
    expect(selectSerialReviewerIndex(order, 0, 'claude', 'claude', new Set(), new Set(), 0)).toBe(0);
    // Nominal is the current author -> redraw among pending (deepseek only:
    // claude is the lead and closure is not ready).
    expect(selectSerialReviewerIndex(order, 0, 'codex', 'claude', new Set(), new Set(), 0)).toBe(1);
    expect(selectSerialReviewerIndex(order, 0, 'codex', 'claude', new Set(), new Set(), 7)).toBe(1);
    // Nominal already stable-approved -> redraw skips it.
    expect(selectSerialReviewerIndex(order, 0, 'claude', 'claude', new Set(), new Set(['codex']), 0)).toBe(1);
    // Lead becomes schedulable once every other peer is a valid round agent.
    expect(
      selectSerialReviewerIndex(order, 2, 'codex', 'claude', new Set(['codex', 'deepseek']), new Set(['deepseek']), 0),
    ).toBe(2);
    // Nothing pending -> null (caller treats the version as converged).
    expect(
      selectSerialReviewerIndex(order, 0, 'claude', 'claude', new Set(), new Set(['codex', 'deepseek']), 0),
    ).toBeNull();
    // Redraw uses seed % pending.length over the pending index list.
    expect(selectSerialReviewerIndex(order, 2, 'claude', 'claude', new Set(), new Set(), 1)).toBe(1);
  });
});

describe('Maestro AI serial turn contract (Plan B1)', () => {
  it('reportDeclaresCustodyValue mirrors JSON-first then scalar-scan semantics', () => {
    const { reportDeclaresCustodyValue } = maestroAiTestHooks;
    expect(reportDeclaresCustodyValue('{"custody":"revised"}', 'revised')).toBe(true);
    expect(reportDeclaresCustodyValue('{"custody":"REVISED"}', 'revised')).toBe(true);
    expect(reportDeclaresCustodyValue('{"custody":"unchanged"}', 'revised')).toBe(false);
    expect(reportDeclaresCustodyValue('custody: revised', 'revised')).toBe(true);
    expect(reportDeclaresCustodyValue('"custody": \'Revised\'', 'revised')).toBe(true);
    expect(reportDeclaresCustodyValue('notes\ncustody: unchanged\nmore', 'unchanged')).toBe(true);
    expect(reportDeclaresCustodyValue('xcustody: revised', 'revised')).toBe(false);
    expect(reportDeclaresCustodyValue('the custody was transferred', 'revised')).toBe(false);
  });

  it('reportDeclaresNonemptyChanges detects non-empty arrays only', () => {
    const { reportDeclaresNonemptyChanges } = maestroAiTestHooks;
    expect(reportDeclaresNonemptyChanges('{"changes":["fixed typo"]}')).toBe(true);
    expect(reportDeclaresNonemptyChanges('{"changes":[]}')).toBe(false);
    expect(reportDeclaresNonemptyChanges('changes: ["a"]')).toBe(true);
    expect(reportDeclaresNonemptyChanges('changes: []')).toBe(false);
    expect(reportDeclaresNonemptyChanges('no such field')).toBe(false);
  });

  it('containsFinalReleaseBlocker flags evidence markers and bibliographic lacunae', () => {
    const { containsFinalReleaseBlocker } = maestroAiTestHooks;
    expect(containsFinalReleaseBlocker('texto com [EVIDENCIA_PENDENTE] no meio')).toBe(true);
    expect(containsFinalReleaseBlocker('nota [Edição consultada não identificada]')).toBe(true);
    expect(containsFinalReleaseBlocker('obra rara [s.d.] citada')).toBe(true);
    expect(containsFinalReleaseBlocker('publicado [S. l.] em 1990')).toBe(true);
    expect(containsFinalReleaseBlocker('datado [entre 1990 e 1995]')).toBe(true);
    expect(containsFinalReleaseBlocker('lançado [1990?]')).toBe(true);
    expect(containsFinalReleaseBlocker('impresso [sine data]')).toBe(true);
    expect(containsFinalReleaseBlocker('publicado em [2001]')).toBe(false);
    expect(containsFinalReleaseBlocker('fonte [IBGE Censo 2020]')).toBe(false);
    expect(containsFinalReleaseBlocker('texto limpo sem marcadores')).toBe(false);
  });

  it('containsPromptOrProtocolEcho matches the seven markers case-insensitively', () => {
    const { containsPromptOrProtocolEcho } = maestroAiTestHooks;
    expect(containsPromptOrProtocolEcho('...\n## Required Output Contract\n...')).toBe(true);
    expect(containsPromptOrProtocolEcho('# MAESTRO EDITORIAL AI - SERIAL REVIEW-REWRITE TURN')).toBe(true);
    expect(containsPromptOrProtocolEcho('## Current Text Under Custody')).toBe(true);
    expect(containsPromptOrProtocolEcho('normal reviewer output')).toBe(false);
  });

  it('validateSerialTurnOutput enforces the desktop output contract in order', () => {
    const { validateSerialTurnOutput } = maestroAiTestHooks;
    const wrap = (report: string, finalText?: string) =>
      `MAESTRO_STATUS: READY\n<maestro_revision_report>${report}</maestro_revision_report>${
        finalText === undefined ? '' : `\n<maestro_final_text>${finalText}</maestro_final_text>`
      }`;
    expect(validateSerialTurnOutput('x', 'MAYBE', 'r', null)).toBe('invalid serial status: MAYBE');
    expect(
      validateSerialTurnOutput(
        '## Required Output Contract\n<maestro_revision_report>x</maestro_revision_report>',
        'READY',
        'x',
        null,
      ),
    ).toBe('output appears to reproduce prompt/protocol scaffolding');
    expect(validateSerialTurnOutput('no tags at all', 'READY', null, null)).toBe(
      'missing maestro_revision_report block',
    );
    expect(validateSerialTurnOutput('<maestro_revision_report>x', 'READY', null, null)).toBe(
      'incomplete maestro_revision_report block',
    );
    const ambiguous = 'custody: "revised"\ncustody: "unchanged"';
    expect(validateSerialTurnOutput(wrap(ambiguous), 'READY', ambiguous, null)).toBe(
      'ambiguous custody declaration in maestro_revision_report',
    );
    expect(
      validateSerialTurnOutput(
        wrap('custody: "unchanged"', 'novo texto'),
        'READY',
        'custody: "unchanged"',
        'novo texto',
      ),
    ).toBe('maestro_final_text requires custody revised in the report');
    expect(
      validateSerialTurnOutput(
        wrap('custody: "revised"', 'texto com [EVIDENCIA_PENDENTE]'),
        'READY',
        'custody: "revised"',
        'texto com [EVIDENCIA_PENDENTE]',
      ),
    ).toBe(
      'final candidate failed bibliographic integrity gate: unresolved evidence marker or bibliographic lacuna found',
    );
    expect(validateSerialTurnOutput(wrap('custody: "revised"'), 'READY', 'custody: "revised"', null)).toBe(
      'revised custody requires a complete maestro_final_text block',
    );
    expect(validateSerialTurnOutput(wrap('relatorio sem custody'), 'READY', 'relatorio sem custody', null)).toBe(
      'READY without maestro_final_text must explicitly declare custody unchanged',
    );
    const correctable = 'custody: "unchanged"\nchanges: ["algo corrigivel"]';
    expect(validateSerialTurnOutput(wrap(correctable), 'NOT_READY', correctable, null)).toBe(
      'correctable changes require custody revised and a complete maestro_final_text block',
    );
    const cleanUnchanged = 'custody: "unchanged"\nchanges: []';
    expect(validateSerialTurnOutput(wrap(cleanUnchanged), 'READY', cleanUnchanged, null)).toBeNull();
    expect(
      validateSerialTurnOutput(
        wrap('custody: "revised"', 'texto novo limpo'),
        'NOT_READY',
        'custody: "revised"',
        'texto novo limpo',
      ),
    ).toBeNull();
  });

  it('treats complete-but-empty tag blocks exactly like the desktop (extract collapses to missing)', () => {
    const { extractTagged, validateSerialTurnOutput } = maestroAiTestHooks;
    // Canonical parity (editorial_io.rs:325): extract_tagged_block returns None
    // for an empty body, so the desktop maps <t></t> to the MISSING error, and
    // the "empty ... block" arms are unreachable on both platforms.
    const emptyReport = 'MAESTRO_STATUS: READY\n<maestro_revision_report></maestro_revision_report>';
    expect(extractTagged(emptyReport, 'maestro_revision_report')).toBeNull();
    expect(validateSerialTurnOutput(emptyReport, 'READY', null, null)).toBe(
      'missing complete maestro_revision_report block',
    );
    const emptyFinal =
      'MAESTRO_STATUS: NOT_READY\n<maestro_revision_report>custody: "revised"\nchanges: ["x"]</maestro_revision_report>\n<maestro_final_text></maestro_final_text>';
    expect(extractTagged(emptyFinal, 'maestro_final_text')).toBeNull();
    expect(validateSerialTurnOutput(emptyFinal, 'NOT_READY', 'custody: "revised"\nchanges: ["x"]', null)).toBe(
      'revised custody requires a complete maestro_final_text block',
    );
  });

  it('qualityGuardBlocksRevision fires only for lower-tier shrinkage of long text', () => {
    const { qualityGuardBlocksRevision } = maestroAiTestHooks;
    const longText = 'x'.repeat(500);
    const shrunk = 'x'.repeat(400);
    expect(qualityGuardBlocksRevision('claude', 'gemini', longText, shrunk, true)).toBe(true);
    expect(qualityGuardBlocksRevision('claude', 'codex', longText, shrunk, true)).toBe(false);
    expect(qualityGuardBlocksRevision('gemini', 'claude', longText, shrunk, true)).toBe(false);
    expect(qualityGuardBlocksRevision('claude', 'gemini', longText, shrunk, false)).toBe(false);
    expect(qualityGuardBlocksRevision('claude', 'gemini', 'x'.repeat(399), 'x'.repeat(100), true)).toBe(false);
    expect(qualityGuardBlocksRevision('claude', 'gemini', longText, 'x'.repeat(426), true)).toBe(false);
    expect(qualityGuardBlocksRevision(null, 'gemini', longText, shrunk, true)).toBe(false);
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
      // Plan F live model resolution: serve /models probes an empty list so the
      // canonical fallback model is used without touching turn-call counters.
      if (url.includes('/models')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
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
            output_text:
              opts.codexText ??
              'MAESTRO_STATUS: READY\n<maestro_revision_report>custody: "unchanged"\nchanges: []\nno blockers found in the current text</maestro_revision_report>',
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

  it('falls back to the next active agent when the initial draft text is empty (canonical draft fallback)', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    // Claude (lead) returns a blank draft; codex must take over as draft author.
    const fetchMock = providerFetch({
      claudeText:
        'MAESTRO_STATUS: READY\n<maestro_revision_report>custody: "unchanged"\nchanges: []\nno blockers found</maestro_revision_report>',
      codexText: 'Texto de rascunho de fallback robusto e completo.',
    });
    // Override: anthropic returns empty ONLY for the draft (first anthropic call).
    let anthropicCalls = 0;
    const withEmptyFirstDraft = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/models')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
      if (hostOf(String(input)) === 'api.anthropic.com') {
        anthropicCalls += 1;
        if (anthropicCalls === 1) {
          return new Response(
            JSON.stringify({ content: [{ type: 'text', text: '   ' }], usage: { input_tokens: 1, output_tokens: 1 } }),
            { status: 200 },
          );
        }
      }
      return fetchMock(input, init);
    });
    vi.stubGlobal('fetch', withEmptyFirstDraft);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    // codex drafted; claude (sole other reviewer) approved unchanged → converged.
    const row = db.__sessions.get('run-1');
    expect(row?.status).toBe('converged');
    expect(row?.current_author).toBe('codex');
    expect(row?.final_text).toBe('Texto de rascunho de fallback robusto e completo.');
    const events = JSON.parse(String(row?.events_json)) as Array<{ message?: string }>;
    expect(events.some((event) => /Draft attempt failed/.test(String(event.message)))).toBe(true);
  });

  it('pauses as paused_draft_unavailable when every active agent fails to draft', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    const fetchMock = providerFetch({ claudeText: '   ', codexText: '   ' });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    const row = db.__sessions.get('run-1');
    expect(row?.status).toBe('paused_draft_unavailable');
    expect(String(row?.error)).toMatch(/failed to produce an initial draft/i);
    // Both agents were tried for the draft.
    expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === 'api.anthropic.com')).toBe(true);
    expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === 'api.openai.com')).toBe(true);
  });

  it('converges when the sole reviewer returns READY without changing custody', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    vi.stubGlobal('fetch', providerFetch({ claudeText: 'Texto de rascunho robusto e completo.' }));
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    expect(db.__sessions.get('run-1')?.status).toBe('converged');
    expect(db.__sessions.get('run-1')?.final_text).toBe('Texto de rascunho robusto e completo.');
  });

  it('retries a NOT_READY-unchanged reviewer turn with the corrective section, then converges', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    let codexCalls = 0;
    const codexBodies: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/models')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
      if (hostOf(url) === 'api.anthropic.com') {
        return new Response(
          JSON.stringify({
            content: [{ type: 'text', text: 'Rascunho valido e completo.' }],
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (hostOf(url) === 'api.openai.com') {
        codexCalls += 1;
        codexBodies.push(String(init?.body ?? ''));
        const text =
          codexCalls === 1
            ? 'MAESTRO_STATUS: NOT_READY\n<maestro_revision_report>custody: "unchanged"\nchanges: []\nvague complaint without correction</maestro_revision_report>'
            : 'MAESTRO_STATUS: READY\n<maestro_revision_report>custody: "unchanged"\nchanges: []\nno blockers found in the current text</maestro_revision_report>';
        return new Response(JSON.stringify({ output_text: text, usage: { input_tokens: 10, output_tokens: 20 } }), {
          status: 200,
        });
      }
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    expect(codexCalls).toBe(2);
    expect(codexBodies[1]).toContain('Mandatory Corrective Retry');
    expect(db.__sessions.get('run-1')?.status).toBe('converged');
  });

  it('sends an undeclared block change to corrective retry via the approved-content lock', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    let codexCalls = 0;
    const codexBodies: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/models')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
      if (hostOf(url) === 'api.anthropic.com') {
        return new Response(
          JSON.stringify({
            content: [{ type: 'text', text: 'Rascunho valido e completo.' }],
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (hostOf(url) === 'api.openai.com') {
        codexCalls += 1;
        codexBodies.push(String(init?.body ?? ''));
        const text =
          codexCalls === 1
            ? 'MAESTRO_STATUS: READY\n<maestro_revision_report>custody: "revised"\nchanges: ["rewrote the paragraph"]</maestro_revision_report>\n<maestro_final_text>Texto reescrito sem declarar blocos.</maestro_final_text>'
            : 'MAESTRO_STATUS: READY\n<maestro_revision_report>custody: "unchanged"\nchanges: []\nno blockers found in the current text</maestro_revision_report>';
        return new Response(JSON.stringify({ output_text: text, usage: { input_tokens: 10, output_tokens: 20 } }), {
          status: 200,
        });
      }
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    // The undeclared block change is a content-lock CONTRACT_VIOLATION: the
    // same reviewer is retried and the original custody text survives.
    expect(codexCalls).toBe(2);
    expect(codexBodies[1]).toContain('Mandatory Corrective Retry');
    expect(db.__sessions.get('run-1')?.status).toBe('converged');
    expect(db.__sessions.get('run-1')?.final_text).toBe('Rascunho valido e completo.');
  });

  it('never lets NOT_READY-unchanged turns enable the closing redactor (closure gating lock)', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    let codexCalls = 0;
    let claudeReviewCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/models')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
      if (hostOf(url) === 'api.anthropic.com') {
        claudeReviewCalls += 1;
        return new Response(
          JSON.stringify({
            content: [{ type: 'text', text: 'Rascunho valido e completo.' }],
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (hostOf(url) === 'api.openai.com') {
        codexCalls += 1;
        const text =
          'MAESTRO_STATUS: NOT_READY' +
          String.fromCharCode(10) +
          '<maestro_revision_report>custody: "unchanged"' +
          String.fromCharCode(10) +
          'changes: []' +
          String.fromCharCode(10) +
          'pass-through objection without correction</maestro_revision_report>';
        return new Response(JSON.stringify({ output_text: text, usage: { input_tokens: 10, output_tokens: 20 } }), {
          status: 200,
        });
      }
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    // The pass-through reviewer exhausts its corrective retries (4 calls) and
    // each redraw re-selects it for one immediately-exhausted call (same
    // canonical retry key), never counting as a valid round agent — so the
    // closing redactor is NEVER scheduled. Since Plan C each exhausted turn is
    // an operational failure: the 3rd consecutive one escalates. 4 + 1 + 1 = 6.
    expect(codexCalls).toBe(6);
    expect(claudeReviewCalls).toBe(1); // draft only — the lead never reviews
    expect(db.__sessions.get('run-1')?.status).toBe('paused_reviewer_outage');
  });

  it('accepts READY with a substantive revision as a normal turn (desktop bans inversion)', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    const revised = 'Texto revisado, mais preciso e completo, sem marcadores pendentes.';
    // changed_blocks leads the report: the canonical section finder recognizes
    // the key at report start or after {, [ or , (a preceding quoted value
    // line would hide it, matching the desktop parser).
    const codexText = `MAESTRO_STATUS: READY\n<maestro_revision_report>changed_blocks: [{"block_id": "B0001", "protocol_basis": "precision rule"}]\ncustody: "revised"</maestro_revision_report>\n<maestro_final_text>${revised}</maestro_final_text>`;
    vi.stubGlobal('fetch', providerFetch({ claudeText: 'Rascunho original razoavel e completo.', codexText }));
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    const row = db.__sessions.get('run-1');
    // The revision is accepted and takes custody; the closing redactor then
    // fails its contract until retries exhaust at the end of the round, so the
    // circuit is incomplete (desktop PAUSED_ROUND_INCOMPLETE analog).
    expect(row?.current_text).toBe(revised);
    expect(row?.current_author).toBe('codex');
    expect(row?.status).toBe('paused_round_incomplete');
  });

  it('rejects a lower-tier shrink revision and keeps custody unchanged (quality ratchet)', async () => {
    const original = `Paragrafo extenso e detalhado. ${'Argumento com contexto e profundidade analitica. '.repeat(12)}`;
    const shrunk = original.slice(0, Math.floor(original.length * 0.5));
    const db = createInMemoryDb({
      sessions: [runnableSession({ active_agents_json: JSON.stringify(['claude', 'deepseek']) })],
    });
    let deepseekCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/models')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
      if (hostOf(url) === 'api.anthropic.com') {
        return new Response(
          JSON.stringify({
            content: [{ type: 'text', text: original }],
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (hostOf(url) === 'api.deepseek.com') {
        deepseekCalls += 1;
        const text = `MAESTRO_STATUS: NOT_READY\n<maestro_revision_report>changed_blocks: [{"block_id": "B0001", "protocol_basis": "concision rule"}]\ncustody: "revised"</maestro_revision_report>\n<maestro_final_text>${shrunk}</maestro_final_text>`;
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: text } }],
            usage: { prompt_tokens: 10, completion_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, MAESTRO_DEEPSEEK_API_KEY: 'k-ds', BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    const row = db.__sessions.get('run-1');
    expect(row?.current_text).toBe(original.trim());
    // The guard keeps rejecting the only pending reviewer until the serial
    // turn cap fires (desktop PAUSED_EDITORIAL_CYCLE_LIMIT analog). Ratchet
    // rejections are clean provider responses, so no outage escalation fires.
    expect(row?.status).toBe('paused_cycle_limit');
    // Every turn re-selects deepseek (the gated lead is never eligible), and
    // each rejection consumes one serial turn up to the cap of 8.
    expect(deepseekCalls).toBe(8);
  });

  it('escalates to paused_reviewer_outage after 3 consecutive empty reviewer turns (operational failures)', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    const fetchMock = providerFetch({ claudeText: 'Rascunho valido e completo.', codexText: '   ' });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    const row = db.__sessions.get('run-1');
    // Canonical 3-strike: each empty reviewer response is an operational turn
    // failure that skips the turn; the third consecutive one pauses the session.
    expect(row?.status).toBe('paused_reviewer_outage');
    expect(String(row?.error)).toMatch(/consecutive reviewer turns failed/i);
    expect(
      fetchMock.mock.calls.filter(([u]) => hostOf(u) === 'api.openai.com' && !String(u).includes('/models')).length,
    ).toBe(3);
    // The custody text survives the pause for a later resume.
    expect(row?.current_text).toBe('Rascunho valido e completo.');
  });

  it('a broken link no longer kills the draft: the release audit rejects READY-unchanged at finalization (Plan D)', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    // Draft carries a 404 link. The draft itself proceeds (no per-draft audit);
    // codex votes READY unchanged, which IS a finalization attempt -> the full
    // release audit runs, fails on the link, and the vote is ReadyRejected.
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === 'api.anthropic.com') {
        return new Response(
          JSON.stringify({
            content: [{ type: 'text', text: 'Rascunho com link https://example.com/missing aqui.' }],
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (url.hostname === 'api.openai.com') {
        return new Response(
          JSON.stringify({
            output_text:
              'MAESTRO_STATUS: READY\n<maestro_revision_report>custody: "unchanged"\nchanges: []\nno blockers found in the current text</maestro_revision_report>',
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (url.hostname === 'cloudflare-dns.com') {
        return new Response(JSON.stringify({ Answer: [{ type: 1, data: '93.184.216.34' }] }), { status: 200 });
      }
      return new Response('', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    const row = db.__sessions.get('run-1');
    // ReadyRejected forever (the link stays broken) -> serial turn cap.
    expect(row?.status).toBe('paused_cycle_limit');
    expect(row?.final_text ?? null).toBeNull();
    const events = JSON.parse(String(row?.events_json)) as Array<{ message?: string }>;
    expect(
      events.some((event) =>
        /READY rejected by release gate: final candidate failed link audit/.test(String(event.message)),
      ),
    ).toBe(true);
    // The broken link WAS probed (finalization attempt), and the per-execution
    // cache kept the HTTP audit to a single pass despite repeated votes.
    const linkProbes = fetchMock.mock.calls.filter(([input]) => new URL(String(input)).hostname === 'example.com');
    expect(linkProbes.length).toBeGreaterThanOrEqual(1);
    expect(linkProbes.length).toBeLessThanOrEqual(2); // HEAD (+GET fallback at most)
  });

  it('pauses as paused_final_audit with durable structured context when a link dies between the vote and finalization', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    // The link is healthy (200) during the READY-unchanged vote's audit, then
    // dies (404) when the finalization gate re-runs the audit FRESH (canonical:
    // the desktop has no cache at the finalization call sites).
    let linkProbes = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === 'api.anthropic.com') {
        return new Response(
          JSON.stringify({
            content: [{ type: 'text', text: 'Rascunho com link https://example.com/artigo aqui.' }],
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (url.hostname === 'api.openai.com') {
        return new Response(
          JSON.stringify({
            output_text:
              'MAESTRO_STATUS: READY\n<maestro_revision_report>custody: "unchanged"\nchanges: []\nno blockers found in the current text</maestro_revision_report>',
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (url.hostname === 'cloudflare-dns.com') {
        return new Response(JSON.stringify({ Answer: [{ type: 1, data: '93.184.216.34' }] }), { status: 200 });
      }
      linkProbes += 1;
      return new Response('', { status: linkProbes === 1 ? 200 : 404 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    const row = db.__sessions.get('run-1');
    expect(row?.status).toBe('paused_final_audit');
    expect(row?.final_text ?? null).toBeNull();
    expect(String(row?.error)).toBe('final candidate failed link audit');
    // The durable session event carries a machine-structured final_audit field
    // (gate/reason/context) plus the audit rows, persisted in events_json.
    const events = JSON.parse(String(row?.events_json)) as Array<{
      message?: string;
      link_audit?: unknown[];
      final_audit?: { gate?: string; reason?: string; context?: Record<string, unknown> };
    }>;
    const pauseEvent = events.find((event) => event.final_audit?.gate === 'link_audit');
    expect(pauseEvent).toBeDefined();
    expect(pauseEvent?.final_audit?.reason).toBe('final candidate failed link audit');
    expect(pauseEvent?.final_audit?.context?.urls_found).toBe(1);
    expect(pauseEvent?.final_audit?.context?.failed).toBe(1);
    expect(pauseEvent?.final_audit?.context?.rows).toBeUndefined(); // rows travel in link_audit
    expect(Array.isArray(pauseEvent?.link_audit)).toBe(true);
  });

  it('records structured final_audit context on the durable turn event for the bibliographic gate', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    const fetchSpyTargets: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === 'api.anthropic.com') {
        return new Response(
          JSON.stringify({
            content: [{ type: 'text', text: 'Texto com marcador [EVIDENCIA_PENDENTE] ainda presente.' }],
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (url.hostname === 'api.openai.com') {
        return new Response(
          JSON.stringify({
            output_text:
              'MAESTRO_STATUS: READY\n<maestro_revision_report>custody: "unchanged"\nchanges: []\nno blockers found in the current text</maestro_revision_report>',
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      fetchSpyTargets.push(url.hostname);
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    const row = db.__sessions.get('run-1');
    const events = JSON.parse(String(row?.events_json)) as Array<{
      final_audit?: { gate?: string; reason?: string };
    }>;
    const rejected = events.find((event) => event.final_audit?.gate === 'bibliographic_integrity');
    expect(rejected).toBeDefined();
    expect(String(rejected?.final_audit?.reason)).toMatch(/bibliographic integrity gate/);
    // Stage 1 short-circuits before any URL work: no audit fetches at all.
    expect(fetchSpyTargets).toEqual([]);
  });

  it('records structured final_audit context on the durable turn event for the capacity gate, with zero fetches', async () => {
    const manyLinks = Array.from({ length: 31 }, (_v, i) => `https://cap${String(i).padStart(2, '0')}.example/`).join(
      ' ',
    );
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    const auditTargets: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === 'api.anthropic.com') {
        return new Response(
          JSON.stringify({
            content: [{ type: 'text', text: `Texto com muitos links: ${manyLinks}` }],
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (url.hostname === 'api.openai.com') {
        return new Response(
          JSON.stringify({
            output_text:
              'MAESTRO_STATUS: READY\n<maestro_revision_report>custody: "unchanged"\nchanges: []\nno blockers found in the current text</maestro_revision_report>',
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      auditTargets.push(url.hostname);
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    const row = db.__sessions.get('run-1');
    const events = JSON.parse(String(row?.events_json)) as Array<{
      final_audit?: { gate?: string; context?: Record<string, unknown> };
    }>;
    const rejected = events.find((event) => event.final_audit?.gate === 'link_audit_capacity');
    expect(rejected).toBeDefined();
    expect(rejected?.final_audit?.context?.urls_found).toBe(31);
    expect(rejected?.final_audit?.context?.max_urls).toBe(30);
    // Stage 2 short-circuits before the HTTP stage: no audit fetches at all.
    expect(auditTargets).toEqual([]);
  });

  it('converges when the custody link is publicly reachable (release audit passes at finalization)', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    const probed: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === 'api.anthropic.com') {
        return new Response(
          JSON.stringify({
            content: [{ type: 'text', text: 'Rascunho com link https://example.com/artigo aqui.' }],
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (url.hostname === 'api.openai.com') {
        return new Response(
          JSON.stringify({
            output_text:
              'MAESTRO_STATUS: READY\n<maestro_revision_report>custody: "unchanged"\nchanges: []\nno blockers found in the current text</maestro_revision_report>',
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (url.hostname === 'cloudflare-dns.com') {
        return new Response(JSON.stringify({ Answer: [{ type: 1, data: '93.184.216.34' }] }), { status: 200 });
      }
      probed.push(url.hostname);
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    const row = db.__sessions.get('run-1');
    expect(row?.status).toBe('converged');
    expect(row?.final_text).toBe('Rascunho com link https://example.com/artigo aqui.');
    expect(probed).toContain('example.com');
  });

  it('rejects finalization of a custody text with internal-host links, without ever fetching them (Plan D SSRF)', async () => {
    const db = createInMemoryDb({ sessions: [runnableSession()] });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === 'api.anthropic.com') {
        return new Response(
          JSON.stringify({
            content: [
              { type: 'text', text: 'Veja http://169.254.169.254/latest/meta e http://localhost:8787/admin agora.' },
            ],
            usage: {},
          }),
          { status: 200 },
        );
      }
      if (url.hostname === 'api.openai.com') {
        return new Response(
          JSON.stringify({
            output_text:
              'MAESTRO_STATUS: READY\n<maestro_revision_report>custody: "unchanged"\nchanges: []\nno blockers found in the current text</maestro_revision_report>',
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          { status: 200 },
        );
      }
      if (url.hostname === 'cloudflare-dns.com') {
        return new Response(JSON.stringify({ Answer: [{ type: 1, data: '93.184.216.34' }] }), { status: 200 });
      }
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await maestroAiTestHooks.runSession(db, { ...env, BIGDATA_DB: db }, 'run-1');
    vi.unstubAllGlobals();

    const row = db.__sessions.get('run-1');
    // Internal links are blocked rows in the release audit: finalization is
    // rejected (ReadyRejected loop -> turn cap) and no final text is written.
    expect(row?.status).toBe('paused_cycle_limit');
    expect(row?.final_text ?? null).toBeNull();
    // The internal hosts were judged blocked WITHOUT any outbound fetch to them.
    expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === '169.254.169.254')).toBe(false);
    expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === 'localhost')).toBe(false);
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
      if (url.includes('/models')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
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
      if (url.includes('/models')) return new Response(JSON.stringify({ data: [] }), { status: 200 });
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

  describe('session resume (Plan C)', () => {
    const pausedRow = (overrides: Partial<Row> = {}): Row =>
      activeRow({
        id: 'r-1',
        status: 'paused_cost_limit',
        current_author: 'claude',
        current_text: 'Rascunho valido e completo.',
        // Lifetime spend already exceeds the cap: only the per-execution cost
        // baseline lets the resumed run proceed.
        observed_cost_usd: 19.9,
        max_cost_usd: 20,
        error: 'Cost guard blocked provider call.',
        ...overrides,
      });

    const resumeContext = (sessionId: string, db: ReturnType<typeof createInMemoryDb>) => {
      const captured: Promise<unknown>[] = [];
      return {
        context: {
          env: {
            BIGDATA_DB: db,
            MAESTRO_ANTHROPIC_API_KEY: 'k-claude',
            MAESTRO_OPENAI_API_KEY: 'k-codex',
          },
          request: new Request(`https://admin.local/api/maestro-ai/sessions/${sessionId}/resume`, { method: 'POST' }),
          waitUntil: (promise: Promise<unknown>) => {
            captured.push(promise);
          },
        },
        captured,
      };
    };

    const reviewerFetch = () =>
      vi.fn(async (input: RequestInfo | URL) => {
        if (hostOf(String(input)) === 'api.openai.com') {
          return new Response(
            JSON.stringify({
              output_text:
                'MAESTRO_STATUS: READY\n<maestro_revision_report>custody: "unchanged"\nchanges: []\nno blockers found in the current text</maestro_revision_report>',
              usage: { input_tokens: 10, output_tokens: 20 },
            }),
            { status: 200 },
          );
        }
        if (hostOf(String(input)) === 'api.anthropic.com') {
          throw new Error('draft must be skipped on resume');
        }
        return new Response('', { status: 200 });
      });

    it('resumes a paused_cost_limit session, skips the draft and converges under a fresh cost baseline', async () => {
      const db = createInMemoryDb({ sessions: [pausedRow()] });
      const fetchMock = reviewerFetch();
      vi.stubGlobal('fetch', fetchMock);
      const { context, captured } = resumeContext('r-1', db);
      const response = await handleMaestroAiSessionResumePost(context, 'r-1');
      expect(response.status).toBe(202);
      await Promise.all(captured);
      vi.unstubAllGlobals();

      const row = db.__sessions.get('r-1');
      // Draft skipped (anthropic never called), custody recovered, error
      // cleared, and the per-execution baseline let the reviewer run despite
      // lifetime spend at 19.9/20.
      expect(row?.status).toBe('converged');
      expect(row?.final_text).toBe('Rascunho valido e completo.');
      expect(row?.error).toBeNull();
      expect(fetchMock.mock.calls.some(([u]) => hostOf(u) === 'api.anthropic.com')).toBe(false);
    });

    it('anchors the time budget at resume time, not created_at', async () => {
      // created_at is 2 hours in the past with a 1-minute budget: a fresh-run
      // anchor would exhaust immediately; the resume anchor must be `now`.
      const db = createInMemoryDb({
        sessions: [
          pausedRow({
            status: 'paused_time_limit',
            max_runtime_minutes: 1,
            created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
            error: 'Time guard blocked provider call.',
          }),
        ],
      });
      const fetchMock = reviewerFetch();
      vi.stubGlobal('fetch', fetchMock);
      const { context, captured } = resumeContext('r-1', db);
      const response = await handleMaestroAiSessionResumePost(context, 'r-1');
      expect(response.status).toBe(202);
      await Promise.all(captured);
      vi.unstubAllGlobals();

      expect(db.__sessions.get('r-1')?.status).toBe('converged');
    });

    it('rejects a concurrent double-resume: the CAS loser gets 409 and never dispatches a second runner', async () => {
      const db = createInMemoryDb({ sessions: [pausedRow()] });
      // Race shape: handler B loaded the row while it was still paused, but
      // handler A's CAS write landed first (row is already queued and A's
      // runner dispatched). Serve B's first session SELECT from the stale
      // paused snapshot; the stored row is already queued.
      const staleRow = { ...(db.__sessions.get('r-1') as Row) };
      const winnerRow = db.__sessions.get('r-1') as Row;
      winnerRow.status = 'queued';
      let staleServed = false;
      const racedDb = {
        ...db,
        prepare(query: string) {
          const statement = db.prepare(query);
          if (!staleServed && /SELECT \* FROM maestro_ai_sessions/i.test(query)) {
            staleServed = true;
            return {
              ...statement,
              bind: (...values: unknown[]) => ({
                ...statement.bind(...values),
                first: async () => staleRow,
              }),
            };
          }
          return statement;
        },
      };
      const fetchMock = reviewerFetch();
      vi.stubGlobal('fetch', fetchMock);
      const { context, captured } = resumeContext('r-1', racedDb as unknown as ReturnType<typeof createInMemoryDb>);
      const response = await handleMaestroAiSessionResumePost(context, 'r-1');
      vi.unstubAllGlobals();

      // The CAS write matched 0 rows (status is queued, not paused): the loser
      // must return 409 and must NOT dispatch a second runSession.
      expect(response.status).toBe(409);
      expect(captured.length).toBe(0);
      expect(db.__sessions.get('r-1')?.status).toBe('queued');
    });

    it('returns 409 for a converged session and for a still-active session', async () => {
      const db = createInMemoryDb({
        sessions: [
          pausedRow({ id: 'done', status: 'converged', final_text: 'Final.' }),
          pausedRow({ id: 'live', status: 'running' }),
        ],
      });
      const done = await handleMaestroAiSessionResumePost(resumeContext('done', db).context, 'done');
      expect(done.status).toBe(409);
      const live = await handleMaestroAiSessionResumePost(resumeContext('live', db).context, 'live');
      expect(live.status).toBe(409);
      expect(db.__sessions.get('done')?.status).toBe('converged');
      expect(db.__sessions.get('live')?.status).toBe('running');
    });

    it('pauses a fresh run as paused_time_limit before any provider call when created_at already exhausts the budget', async () => {
      const db = createInMemoryDb({
        sessions: [
          pausedRow({
            status: 'queued',
            current_text: '',
            current_author: null,
            observed_cost_usd: 0,
            max_runtime_minutes: 1,
            created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
            error: null,
          }),
        ],
      });
      const fetchMock = reviewerFetch();
      vi.stubGlobal('fetch', fetchMock);
      await maestroAiTestHooks.runSession(
        db,
        { BIGDATA_DB: db, MAESTRO_ANTHROPIC_API_KEY: 'k-claude', MAESTRO_OPENAI_API_KEY: 'k-codex' },
        'r-1',
      );
      vi.unstubAllGlobals();

      expect(db.__sessions.get('r-1')?.status).toBe('paused_time_limit');
      expect(fetchMock.mock.calls.length).toBe(0);
    });
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
      'grok-4.20-multi-agent',
      system,
      prompt,
    );
    const body = JSON.parse(String(request.init.body)) as { model: string; input: unknown };

    expect(request.endpoint).toBe('https://api.x.ai/v1/responses');
    expect(request.init.headers).toMatchObject({ authorization: 'Bearer xai-secret' });
    expect(body.model).toBe('grok-4.20-multi-agent');
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

describe('probePublicUrl (canonical redirect follow to final status)', () => {
  const withDoh = (handler: (url: URL) => Response | Promise<Response>) =>
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === 'cloudflare-dns.com') {
        return new Response(JSON.stringify({ Answer: [{ type: 1, data: '93.184.216.34' }] }), { status: 200 });
      }
      return handler(url);
    });

  it('follows a public redirect to its final destination and reports a 404 as error', async () => {
    vi.stubGlobal(
      'fetch',
      withDoh((url) => {
        if (url.pathname === '/start') {
          return new Response('', { status: 301, headers: { location: 'https://example.com/missing' } });
        }
        return new Response('', { status: 404 });
      }),
    );
    const result = await maestroAiTestHooks.probePublicUrl('https://example.com/start');
    vi.unstubAllGlobals();
    expect(result.tone).toBe('error');
    expect(result.ok).toBe(false);
  });

  it('treats a persistent 5xx as error with no retry (single probe)', async () => {
    let probes = 0;
    vi.stubGlobal(
      'fetch',
      withDoh(() => {
        probes += 1;
        return new Response('', { status: 500 });
      }),
    );
    const result = await maestroAiTestHooks.probePublicUrl('https://example.com/x');
    vi.unstubAllGlobals();
    expect(result.tone).toBe('error');
    expect(probes).toBe(1); // canonical: no retry loop (HEAD only; 500 is decisive)
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

  it('runLinkAudit turns blocked/invalid candidates into failed rows WITHOUT any fetch', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === 'cloudflare-dns.com') {
        return new Response(JSON.stringify({ Answer: [{ type: 1, data: '93.184.216.34' }] }), { status: 200 });
      }
      return new Response('', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    // Internal hosts and a bracketed IPv6 literal (truncated at `]` by the
    // canonical tokenizer -> invalid URL) all surface as blocked rows; the
    // public link is probed and passes.
    const audit = await maestroAiTestHooks.runLinkAudit(
      'See https://example.com/ok and http://169.254.169.254/meta and http://localhost:8787/admin and http://[::ffff:127.0.0.1]/latest',
    );
    vi.unstubAllGlobals();
    expect(audit.urlsFound).toBe(4);
    expect(audit.checked).toBe(1);
    expect(audit.ok).toBe(1);
    expect(audit.failed).toBe(3);
    const fetched = fetchMock.mock.calls.map(([input]) => new URL(String(input)).hostname);
    expect(fetched.every((host) => host === 'cloudflare-dns.com' || host === 'example.com')).toBe(true);
  });
});
