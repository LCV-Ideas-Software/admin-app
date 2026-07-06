import { GoogleGenAI } from '@google/genai';
import { toHeaders } from '../../../../../functions/api/_lib/mainsite-admin';
import { formatBlockManifestForPrompt, validateRevisionContentLock } from './content-lock.ts';

type D1Database = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
    };
    run(): Promise<unknown>;
  };
};

export type MaestroAiEnv = {
  BIGDATA_DB?: D1Database;
  CLOUDFLARE_PW?: string;
  CF_ACCOUNT_ID?: string;
  MAESTRO_SECRET_STORE_ID?: string;
  MAESTRO_OPENAI_API_KEY?: string;
  MAESTRO_ANTHROPIC_API_KEY?: string;
  MAESTRO_GEMINI_API_KEY?: string;
  MAESTRO_DEEPSEEK_API_KEY?: string;
  MAESTRO_GROK_API_KEY?: string;
  MAESTRO_PERPLEXITY_API_KEY?: string;
};

type RequestContext = {
  request: Request;
  env: MaestroAiEnv;
  waitUntil?: (promise: Promise<unknown>) => void;
};

type ProviderKey = 'claude' | 'codex' | 'gemini' | 'deepseek' | 'grok' | 'perplexity';

type ProviderRates = {
  input_usd_per_million?: number;
  output_usd_per_million?: number;
  request_usd_per_1k?: number;
};

type MaestroSessionRequest = {
  title?: string;
  prompt?: string;
  protocol_text?: string;
  initial_agent?: ProviderKey;
  active_agents?: ProviderKey[];
  initial_content?: string;
  max_cost_usd?: number;
  rates?: Partial<Record<ProviderKey, ProviderRates>>;
  models?: Partial<Record<ProviderKey, string>>;
  max_cycles?: number;
};

type MaestroResolvedSessionInput = Required<
  Pick<
    MaestroSessionRequest,
    | 'title'
    | 'prompt'
    | 'protocol_text'
    | 'initial_agent'
    | 'active_agents'
    | 'max_cost_usd'
    | 'rates'
    | 'models'
    | 'max_cycles'
  >
> & {
  initial_content?: string;
  max_runtime_minutes?: number | null;
};

type MaestroSettingsRow = {
  id: string;
  protocol_text: string;
  max_cost_usd: number;
  max_runtime_minutes: number | null;
  max_cycles: number;
  configured_secrets_json: string;
  rates_json: string;
  models_json: string;
  updated_at: string;
};

type MaestroSettingsRequest = {
  protocol_text?: string;
  max_cost_usd?: number;
  max_runtime_minutes?: number | null;
  max_cycles?: number;
  rates?: Partial<Record<ProviderKey, ProviderRates>>;
  models?: Partial<Record<ProviderKey, string>>;
  api_keys?: Partial<Record<ProviderKey, string>>;
};

type MaestroSessionRow = {
  id: string;
  title: string;
  prompt: string;
  protocol_text: string;
  status: string;
  initial_agent: string;
  active_agents_json: string;
  current_author: string | null;
  current_text: string;
  final_text: string | null;
  observed_cost_usd: number;
  max_cost_usd: number;
  max_runtime_minutes: number | null;
  max_cycles: number;
  rates_json: string;
  models_json: string;
  events_json: string;
  created_at: string;
  updated_at: string;
  error: string | null;
};

type MaestroArtifactRow = {
  id: string;
  session_id: string;
  cycle: number;
  turn: number;
  agent: string;
  role: 'draft' | 'revision';
  status: string;
  title: string;
  content_md: string;
  revision_report_json: string;
  link_audit_json: string;
  cost_usd: number;
  model: string | null;
  previous_artifact_id: string | null;
  content_bytes: number;
  created_at: string;
};

type ProviderCallResult = {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  model: string;
};

type ProviderResponsePayload = {
  content?: Array<{ type?: string; text?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
  message?: string;
  raw?: string;
};

type HttpProviderKey = Exclude<ProviderKey, 'gemini'>;

type ProviderHttpRequest = {
  endpoint: string;
  init: RequestInit;
};

type SessionEvent = {
  at: string;
  agent?: ProviderKey;
  role?: 'draft' | 'revision';
  status: 'queued' | 'running' | 'ready' | 'not_ready' | 'blocked' | 'error' | 'finished';
  message: string;
  cost_usd?: number;
  model?: string;
  link_audit?: LinkAuditResult[];
  /** Structured release-audit context (canonical audit_context), persisted in
   *  events_json whenever a release-audit failure produces this event. */
  final_audit?: { gate: string; reason: string; context: Record<string, unknown> };
};

type LinkAuditResult = {
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
  /** Canonical audit tone: ok | error | warn | blocked (warn fails nothing). */
  tone?: string;
};

type ArtifactInput = {
  sessionId: string;
  cycle: number;
  turn: number;
  agent: ProviderKey;
  role: 'draft' | 'revision';
  status: string;
  title: string;
  contentMd: string;
  revisionReport: string;
  linkAudit: LinkAuditResult[];
  costUsd: number;
  model?: string;
  previousArtifactId?: string | null;
};

const AGENT_LABELS: Record<ProviderKey, string> = {
  claude: 'Claude',
  codex: 'Codex',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
  grok: 'Grok',
  perplexity: 'Perplexity',
};

const DEFAULT_MODELS: Record<ProviderKey, string> = {
  claude: 'claude-opus-4-7',
  codex: 'gpt-5.5',
  gemini: 'gemini-2.5-pro',
  deepseek: 'deepseek-v4-pro',
  grok: 'grok-4.20-multi-agent-0309',
  perplexity: 'sonar-reasoning-pro',
};

const DEFAULT_RATES: Record<ProviderKey, ProviderRates> = {
  claude: { input_usd_per_million: 5, output_usd_per_million: 25 },
  codex: { input_usd_per_million: 5, output_usd_per_million: 30 },
  gemini: { input_usd_per_million: 1.25, output_usd_per_million: 10 },
  deepseek: { input_usd_per_million: 1.74, output_usd_per_million: 3.48 },
  grok: { input_usd_per_million: 1.25, output_usd_per_million: 2.5 },
  perplexity: { input_usd_per_million: 2, output_usd_per_million: 8, request_usd_per_1k: 14 },
};

const PROVIDER_KEYS: ProviderKey[] = ['claude', 'codex', 'gemini', 'deepseek', 'grok', 'perplexity'];
const MAX_OUTPUT_TOKENS = 20_000;
const SETTINGS_ID = 'default';
const SECRET_STORE_SCOPES = ['workers', 'ai_gateway'] as const;
const API_TEST_SYSTEM = 'You are an API health-check endpoint. Return a short plain-text acknowledgement only.';
const API_TEST_PROMPT = 'Reply with exactly: OK';

const SECRET_NAMES: Record<ProviderKey, string> = {
  claude: 'MAESTRO_ANTHROPIC_API_KEY',
  codex: 'MAESTRO_OPENAI_API_KEY',
  gemini: 'MAESTRO_GEMINI_API_KEY',
  deepseek: 'MAESTRO_DEEPSEEK_API_KEY',
  grok: 'MAESTRO_GROK_API_KEY',
  perplexity: 'MAESTRO_PERPLEXITY_API_KEY',
};

const DEFAULT_PROTOCOL = `# Maestro Editorial Protocol

Internal agent coordination must be in en_US.
Only the operator-facing final text must be delivered in pt_BR.

No agent may review or revise its own immediately produced text.
The work proceeds as a serial circular review-rewrite chain.
Each reviewer must focus only on cited defects, blockers, or protocol-grounded corrections.
Approved content is locked and must not be restyled, shortened, broadened, reordered, simplified, or rewritten without a concrete editorial defect.
Weaker agents must not impoverish stronger prose. Preserve breadth, depth, nuance, articulation, and reflexive structure unless a narrow correction is mandatory.
Do not reproduce this protocol in artifacts. Read it, obey it, and cite only the specific rule basis in the revision report.`;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: toHeaders(),
  });

const nowIso = () => new Date().toISOString();
const LOG_PREFIX = 'MAESTRO_AI_WEB';

function logMaestro(level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown> = {}): void {
  const payload = { prefix: LOG_PREFIX, event, ...data };
  if (level === 'error') {
    console.error(LOG_PREFIX, JSON.stringify(payload));
  } else if (level === 'warn') {
    console.warn(LOG_PREFIX, JSON.stringify(payload));
  } else {
    console.log(LOG_PREFIX, JSON.stringify(payload));
  }
}

function sanitizeText(value: unknown, max = 4000): string {
  return String(value ?? '')
    .split('\u0000')
    .join('')
    .trim()
    .slice(0, max);
}

function sanitizeAgent(value: unknown, fallback: ProviderKey): ProviderKey {
  const normalized = sanitizeText(value, 80).toLowerCase();
  if ((PROVIDER_KEYS as string[]).includes(normalized)) return normalized as ProviderKey;
  if (normalized === 'anthropic') return 'claude';
  if (normalized === 'openai' || normalized === 'chatgpt') return 'codex';
  if (normalized === 'google') return 'gemini';
  if (normalized === 'xai') return 'grok';
  if (normalized === 'sonar') return 'perplexity';
  if (normalized === 'agy' || normalized === 'antigravity') return 'gemini';
  if (normalized === 'deepseek-api') return 'deepseek';
  if (normalized === 'grok-api') return 'grok';
  if (normalized === 'perplexity-api') return 'perplexity';
  return fallback;
}

function sanitizeAgents(values: unknown, initial: ProviderKey): ProviderKey[] {
  const raw = Array.isArray(values) ? values : PROVIDER_KEYS;
  const selected: ProviderKey[] = [];
  for (const value of raw) {
    const agent = sanitizeAgent(value, initial);
    if (!selected.includes(agent)) selected.push(agent);
  }
  if (!selected.includes(initial)) selected.unshift(initial);
  return selected.slice(0, PROVIDER_KEYS.length);
}

function defaultRates(): Record<ProviderKey, ProviderRates> {
  return Object.fromEntries(PROVIDER_KEYS.map((agent) => [agent, { ...DEFAULT_RATES[agent] }])) as Record<
    ProviderKey,
    ProviderRates
  >;
}

function sanitizeRates(value: unknown): Record<ProviderKey, ProviderRates> {
  const raw = value && typeof value === 'object' ? (value as Partial<Record<ProviderKey, ProviderRates>>) : {};
  const next = defaultRates();
  for (const agent of PROVIDER_KEYS) {
    const rates = raw[agent] ?? {};
    const defaults = DEFAULT_RATES[agent];
    const inputRate = Number(rates.input_usd_per_million);
    const outputRate = Number(rates.output_usd_per_million);
    const requestRate = Number(rates.request_usd_per_1k);
    next[agent] = {
      input_usd_per_million: Number.isFinite(inputRate) && inputRate > 0 ? inputRate : defaults.input_usd_per_million,
      output_usd_per_million:
        Number.isFinite(outputRate) && outputRate > 0 ? outputRate : defaults.output_usd_per_million,
      request_usd_per_1k:
        Number.isFinite(requestRate) && requestRate > 0 ? requestRate : (defaults.request_usd_per_1k ?? 0),
    };
  }
  return next;
}

function sanitizeModels(value: unknown): Record<ProviderKey, string> {
  const raw = value && typeof value === 'object' ? (value as Partial<Record<ProviderKey, string>>) : {};
  return Object.fromEntries(
    PROVIDER_KEYS.map((agent) => [agent, sanitizeText(raw[agent], 120) || DEFAULT_MODELS[agent]]),
  ) as Record<ProviderKey, string>;
}

async function ensureSchema(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS maestro_ai_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        prompt TEXT NOT NULL,
        protocol_text TEXT NOT NULL,
        initial_agent TEXT NOT NULL,
        active_agents_json TEXT NOT NULL,
        current_author TEXT,
        current_text TEXT NOT NULL DEFAULT '',
        final_text TEXT,
        status TEXT NOT NULL,
        observed_cost_usd REAL NOT NULL DEFAULT 0,
        max_cost_usd REAL NOT NULL,
        max_runtime_minutes REAL,
        max_cycles INTEGER NOT NULL DEFAULT 2,
        rates_json TEXT NOT NULL,
        models_json TEXT NOT NULL,
        events_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        error TEXT
      )`,
    )
    .run();
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS maestro_ai_settings (
        id TEXT PRIMARY KEY,
        protocol_text TEXT NOT NULL,
        max_cost_usd REAL NOT NULL DEFAULT 0,
        max_runtime_minutes REAL,
        max_cycles INTEGER NOT NULL DEFAULT 2,
        configured_secrets_json TEXT NOT NULL DEFAULT '{}',
        rates_json TEXT NOT NULL,
        models_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    )
    .run();
  await db
    .prepare(
      `INSERT OR IGNORE INTO maestro_ai_settings (
        id, protocol_text, max_cost_usd, max_runtime_minutes, max_cycles, configured_secrets_json, rates_json, models_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      SETTINGS_ID,
      DEFAULT_PROTOCOL,
      0,
      null,
      2,
      '{}',
      JSON.stringify(defaultRates()),
      JSON.stringify(DEFAULT_MODELS),
      nowIso(),
    )
    .run();
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS maestro_ai_artifacts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        cycle INTEGER NOT NULL,
        turn INTEGER NOT NULL,
        agent TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        title TEXT NOT NULL,
        content_md TEXT NOT NULL,
        revision_report_json TEXT NOT NULL,
        link_audit_json TEXT NOT NULL,
        cost_usd REAL NOT NULL DEFAULT 0,
        model TEXT,
        previous_artifact_id TEXT,
        content_bytes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY(session_id) REFERENCES maestro_ai_sessions(id) ON DELETE CASCADE
      )`,
    )
    .run();
  await db
    .prepare(
      'CREATE INDEX IF NOT EXISTS idx_maestro_ai_artifacts_session_turn ON maestro_ai_artifacts(session_id, cycle, turn)',
    )
    .run();
  try {
    await db.prepare('ALTER TABLE maestro_ai_sessions ADD COLUMN max_runtime_minutes REAL').run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/duplicate column|already exists/i.test(message)) {
      throw error;
    }
  }
  try {
    await db.prepare('ALTER TABLE maestro_ai_settings ADD COLUMN max_runtime_minutes REAL').run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/duplicate column|already exists/i.test(message)) {
      throw error;
    }
  }
  try {
    await db
      .prepare("ALTER TABLE maestro_ai_settings ADD COLUMN configured_secrets_json TEXT NOT NULL DEFAULT '{}'")
      .run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/duplicate column|already exists/i.test(message)) {
      throw error;
    }
  }
  try {
    await db.prepare('ALTER TABLE maestro_ai_sessions ADD COLUMN max_cycles INTEGER NOT NULL DEFAULT 2').run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/duplicate column|already exists/i.test(message)) {
      throw error;
    }
  }
}

function requireDb(env: MaestroAiEnv): D1Database {
  if (!env.BIGDATA_DB) throw new Error('BIGDATA_DB nao configurado para Maestro AI.');
  return env.BIGDATA_DB;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function loadSettings(db: D1Database): Promise<MaestroSettingsRow> {
  const row = await db
    .prepare(
      'SELECT id, protocol_text, max_cost_usd, max_runtime_minutes, max_cycles, configured_secrets_json, rates_json, models_json, updated_at FROM maestro_ai_settings WHERE id = ? LIMIT 1',
    )
    .bind(SETTINGS_ID)
    .first<MaestroSettingsRow>();
  if (!row) {
    const updatedAt = nowIso();
    return {
      id: SETTINGS_ID,
      protocol_text: DEFAULT_PROTOCOL,
      max_cost_usd: 0,
      max_runtime_minutes: null,
      max_cycles: 2,
      configured_secrets_json: '{}',
      rates_json: JSON.stringify(defaultRates()),
      models_json: JSON.stringify(DEFAULT_MODELS),
      updated_at: updatedAt,
    };
  }
  return row;
}

function hasPositiveRates(rates: ProviderRates | undefined): boolean {
  if (!rates) {
    return false;
  }

  const inputRate = Number(rates.input_usd_per_million);
  const outputRate = Number(rates.output_usd_per_million);

  return Number.isFinite(inputRate) && inputRate > 0 && Number.isFinite(outputRate) && outputRate > 0;
}

function settingsRates(row: MaestroSettingsRow): Record<ProviderKey, ProviderRates> {
  return sanitizeRates(parseJson(row.rates_json, defaultRates()));
}

function settingsModels(row: MaestroSettingsRow): Record<ProviderKey, string> {
  return sanitizeModels(parseJson(row.models_json, DEFAULT_MODELS));
}

function configuredAgents(env: MaestroAiEnv, rates: Record<ProviderKey, ProviderRates>): ProviderKey[] {
  return PROVIDER_KEYS.filter((agent) => Boolean(secretForAgent(env, agent)) && hasPositiveRates(rates[agent]));
}

function publicSettings(env: MaestroAiEnv, row: MaestroSettingsRow) {
  const rates = settingsRates(row);
  const models = settingsModels(row);
  const configuredSecrets = parseJson<Partial<Record<ProviderKey, boolean>>>(row.configured_secrets_json, {});
  return {
    protocol_text: row.protocol_text,
    max_cost_usd: Number(row.max_cost_usd) || 0,
    max_runtime_minutes: Number(row.max_runtime_minutes) > 0 ? Number(row.max_runtime_minutes) : null,
    max_cycles: Number(row.max_cycles) || 2,
    rates,
    models,
    agents: PROVIDER_KEYS.map((agent) => ({
      key: agent,
      label: AGENT_LABELS[agent],
      secret_name: SECRET_NAMES[agent],
      configured: Boolean(secretForAgent(env, agent)) || configuredSecrets[agent] === true,
      runtime_ready: Boolean(secretForAgent(env, agent)),
      financially_ready: hasPositiveRates(rates[agent]),
      model: models[agent],
      rates: rates[agent],
    })),
    updated_at: row.updated_at,
  };
}

function publicSession(row: MaestroSessionRow) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    initial_agent: row.initial_agent,
    active_agents: parseJson<ProviderKey[]>(row.active_agents_json, []),
    current_author: row.current_author,
    current_text: row.current_text,
    final_text: row.final_text,
    observed_cost_usd: row.observed_cost_usd,
    max_cost_usd: row.max_cost_usd,
    max_runtime_minutes: row.max_runtime_minutes,
    max_cycles: row.max_cycles,
    events: parseJson<SessionEvent[]>(row.events_json, []),
    created_at: row.created_at,
    updated_at: row.updated_at,
    error: row.error,
  };
}

function publicArtifactSummary(row: MaestroArtifactRow) {
  const linkAudit = parseJson<LinkAuditResult[]>(row.link_audit_json, []);
  return {
    id: row.id,
    session_id: row.session_id,
    cycle: row.cycle,
    turn: row.turn,
    agent: row.agent,
    role: row.role,
    status: row.status,
    title: row.title,
    cost_usd: Number(row.cost_usd) || 0,
    model: row.model,
    previous_artifact_id: row.previous_artifact_id,
    content_bytes: Number(row.content_bytes) || 0,
    invalid_links: linkAudit.filter((link) => !link.ok).length,
    created_at: row.created_at,
  };
}

function publicArtifactDetail(row: MaestroArtifactRow, previous?: MaestroArtifactRow | null) {
  return {
    ...publicArtifactSummary(row),
    content_md: row.content_md,
    revision_report: row.revision_report_json,
    link_audit: parseJson<LinkAuditResult[]>(row.link_audit_json, []),
    previous_content_md: previous?.content_md ?? '',
  };
}

function markdownByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function buildArtifactMarkdown(input: ArtifactInput): string {
  const invalidLinks = input.linkAudit.filter((link) => !link.ok);
  return [
    `# Maestro AI Artifact - ${input.title}`,
    '',
    `- Session: ${input.sessionId}`,
    `- Cycle: ${input.cycle}`,
    `- Turn: ${input.turn}`,
    `- Agent: ${AGENT_LABELS[input.agent]}`,
    `- Role: ${input.role}`,
    `- Status: ${input.status}`,
    `- Model: ${input.model || 'unknown'}`,
    `- Cost USD: ${Number(input.costUsd || 0).toFixed(6)}`,
    `- Previous artifact: ${input.previousArtifactId || 'none'}`,
    `- Invalid links: ${invalidLinks.length}`,
    '',
    '## Revision Report',
    '',
    input.revisionReport || '{}',
    '',
    '## Link Audit',
    '',
    '```json',
    JSON.stringify(input.linkAudit, null, 2),
    '```',
    '',
    '## Current Text',
    '',
    input.contentMd,
    '',
  ].join('\n');
}

async function createArtifact(db: D1Database, input: ArtifactInput): Promise<MaestroArtifactRow> {
  const id = `artifact-${crypto.randomUUID()}`;
  const createdAt = nowIso();
  const contentMd = sanitizeText(buildArtifactMarkdown(input), 500_000);
  const row: MaestroArtifactRow = {
    id,
    session_id: input.sessionId,
    cycle: input.cycle,
    turn: input.turn,
    agent: input.agent,
    role: input.role,
    status: input.status,
    title: sanitizeText(input.title, 240),
    content_md: contentMd,
    revision_report_json: sanitizeText(input.revisionReport || '{}', 120_000),
    link_audit_json: JSON.stringify(input.linkAudit),
    cost_usd: Number(input.costUsd) || 0,
    model: input.model || null,
    previous_artifact_id: input.previousArtifactId || null,
    content_bytes: markdownByteLength(contentMd),
    created_at: createdAt,
  };
  await db
    .prepare(
      `INSERT INTO maestro_ai_artifacts (
        id, session_id, cycle, turn, agent, role, status, title, content_md, revision_report_json,
        link_audit_json, cost_usd, model, previous_artifact_id, content_bytes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.session_id,
      row.cycle,
      row.turn,
      row.agent,
      row.role,
      row.status,
      row.title,
      row.content_md,
      row.revision_report_json,
      row.link_audit_json,
      row.cost_usd,
      row.model,
      row.previous_artifact_id,
      row.content_bytes,
      row.created_at,
    )
    .run();
  return row;
}

function secretForAgent(env: MaestroAiEnv, agent: ProviderKey): string | undefined {
  const value =
    agent === 'claude'
      ? env.MAESTRO_ANTHROPIC_API_KEY
      : agent === 'codex'
        ? env.MAESTRO_OPENAI_API_KEY
        : agent === 'gemini'
          ? env.MAESTRO_GEMINI_API_KEY
          : agent === 'deepseek'
            ? env.MAESTRO_DEEPSEEK_API_KEY
            : agent === 'grok'
              ? env.MAESTRO_GROK_API_KEY
              : env.MAESTRO_PERPLEXITY_API_KEY;
  return value?.trim() || undefined;
}

type CloudflareApiEnvelope<T> = {
  success?: boolean;
  result?: T;
  errors?: Array<{ message?: string; code?: number }>;
};

type SecretStoreSecret = {
  id: string;
  name: string;
  status?: string;
};

function requireSecretStoreConfig(env: MaestroAiEnv): { token: string; accountId: string; storeId: string } {
  const token = env.CLOUDFLARE_PW?.trim();
  const accountId = env.CF_ACCOUNT_ID?.trim();
  const storeId = env.MAESTRO_SECRET_STORE_ID?.trim();
  if (!token || !accountId || !storeId) {
    throw new Error(
      'CLOUDFLARE_PW, CF_ACCOUNT_ID e MAESTRO_SECRET_STORE_ID sao obrigatorios para salvar chaves no Cloudflare Secret Store.',
    );
  }
  return { token, accountId, storeId };
}

async function cloudflareRequest<T>(env: MaestroAiEnv, path: string, init: RequestInit = {}): Promise<T> {
  const { token } = requireSecretStoreConfig(env);
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let parsed: CloudflareApiEnvelope<T>;
  try {
    parsed = text ? (JSON.parse(text) as CloudflareApiEnvelope<T>) : {};
  } catch {
    throw new Error(`Cloudflare API retornou resposta invalida (${response.status}).`);
  }
  if (!response.ok || parsed.success === false) {
    const message =
      parsed.errors
        ?.map((error) => error.message)
        .filter(Boolean)
        .join('; ') ||
      text ||
      `HTTP ${response.status}`;
    throw new Error(`Cloudflare Secret Store falhou: ${sanitizeText(message, 600)}`);
  }
  return parsed.result as T;
}

async function listSecretStoreSecrets(env: MaestroAiEnv): Promise<SecretStoreSecret[]> {
  const { accountId, storeId } = requireSecretStoreConfig(env);
  // The store is shared with other apps, so the MAESTRO_* secrets can sit past
  // the first page (the API defaults to per_page=20); read every page or the
  // upsert below falls into the create branch and Cloudflare rejects the
  // duplicate name.
  const secrets: SecretStoreSecret[] = [];
  const perPage = 100;
  for (let page = 1; page <= 50; page += 1) {
    const batch = await cloudflareRequest<SecretStoreSecret[]>(
      env,
      `/accounts/${encodeURIComponent(accountId)}/secrets_store/stores/${encodeURIComponent(storeId)}/secrets?page=${page}&per_page=${perPage}`,
    );
    secrets.push(...(batch ?? []));
    if (!batch || batch.length < perPage) break;
  }
  return secrets;
}

async function upsertSecretStoreSecret(env: MaestroAiEnv, agent: ProviderKey, value: string): Promise<void> {
  const secretValue = value.trim();
  if (!secretValue) return;
  const { accountId, storeId } = requireSecretStoreConfig(env);
  const name = SECRET_NAMES[agent];
  const existing = (await listSecretStoreSecrets(env)).find(
    (secret) => secret.name === name && secret.status !== 'deleted',
  );
  const body = {
    value: secretValue,
    scopes: [...SECRET_STORE_SCOPES],
    comment: `Managed by admin-app Maestro AI settings for ${AGENT_LABELS[agent]}.`,
  };
  if (existing?.id) {
    await cloudflareRequest<Record<string, unknown>>(
      env,
      `/accounts/${encodeURIComponent(accountId)}/secrets_store/stores/${encodeURIComponent(storeId)}/secrets/${encodeURIComponent(existing.id)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    );
    return;
  }
  await cloudflareRequest<Record<string, unknown>[]>(
    env,
    `/accounts/${encodeURIComponent(accountId)}/secrets_store/stores/${encodeURIComponent(storeId)}/secrets`,
    {
      method: 'POST',
      body: JSON.stringify([{ name, ...body }]),
    },
  );
}

function estimateCost(prompt: string, maxOutputTokens: number, rates: ProviderRates): number {
  const inputTokens = Math.ceil(prompt.length / 4);
  const inputRate = rates.input_usd_per_million;
  const outputRate = rates.output_usd_per_million;
  const requestRate = Number(rates.request_usd_per_1k) || 0;
  if (!inputRate || !outputRate) return Number.NaN;
  return (inputTokens / 1_000_000) * inputRate + (maxOutputTokens / 1_000_000) * outputRate + requestRate / 1000;
}

function calculateObservedCost(result: ProviderCallResult, fallbackPrompt: string, rates: ProviderRates): number {
  const inputTokens = result.inputTokens ?? Math.ceil(fallbackPrompt.length / 4);
  const outputTokens = result.outputTokens ?? Math.ceil(result.text.length / 4);
  const inputRate = Number(rates.input_usd_per_million);
  const outputRate = Number(rates.output_usd_per_million);
  const requestRate = Number(rates.request_usd_per_1k) || 0;
  if (!Number.isFinite(inputRate) || !Number.isFinite(outputRate) || inputRate <= 0 || outputRate <= 0) {
    return Number.NaN;
  }
  return (inputTokens / 1_000_000) * inputRate + (outputTokens / 1_000_000) * outputRate + requestRate / 1000;
}

// Canonical session time budget (editorial_inputs.rs:205-215 / session_orchestration.rs):
// null = no limit; exhaustion is `remaining < 2s`, checked before the draft and
// before every turn. The anchor is created_at on a fresh run and `now` on resume.
const SESSION_TIME_EXHAUSTION_CUTOFF_MS = 2_000;

function remainingSessionMs(anchorMs: number, maxRuntimeMinutes?: number | null): number | null {
  if (!Number.isFinite(Number(maxRuntimeMinutes)) || Number(maxRuntimeMinutes) <= 0) return null;
  return Math.max(0, anchorMs + Number(maxRuntimeMinutes) * 60_000 - Date.now());
}

function sessionTimeExhausted(anchorMs: number, maxRuntimeMinutes?: number | null): boolean {
  const remaining = remainingSessionMs(anchorMs, maxRuntimeMinutes);
  return remaining !== null && remaining < SESSION_TIME_EXHAUSTION_CUTOFF_MS;
}

// Rust char::is_whitespace / str::trim / split_whitespace use the Unicode
// White_Space property, which differs from JS \s and String.trim(): it
// INCLUDES U+0085 (NEL) and EXCLUDES U+FEFF (BOM/ZWNBSP). The parity port
// must use this exact class, not \s.
const RUST_WS_CLASS = '[\\t\\n\\u000B\\f\\r \\u0085\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]';
const RUST_WS_RUN = new RegExp(`${RUST_WS_CLASS}+`, 'g');
const RUST_WS_EDGES = new RegExp(`^${RUST_WS_CLASS}+|${RUST_WS_CLASS}+$`, 'g');

function rustTrim(text: string): string {
  return text.replace(RUST_WS_EDGES, '');
}

// Rust to_ascii_uppercase: only a-z are uppercased; Unicode case mappings
// (e.g. 'ſ' -> 'S') must NOT apply.
function asciiUppercase(text: string): string {
  return text.replace(/[a-z]/g, (character) => character.toUpperCase());
}

function extractStatus(text: string): 'READY' | 'NOT_READY' {
  // Desktop parity (editorial_io.rs extract_maestro_status): every line is
  // scanned; the trimmed, ASCII-uppercased line must equal the marker exactly
  // (single space after the colon); the first matching line decides.
  for (const line of text.split(/\r?\n/)) {
    const normalized = asciiUppercase(rustTrim(line));
    if (normalized === 'MAESTRO_STATUS: READY') return 'READY';
    if (normalized === 'MAESTRO_STATUS: NOT_READY') return 'NOT_READY';
  }
  return 'NOT_READY';
}

function extractTagged(text: string, tag: string): string | null {
  // Desktop parity (editorial_io.rs extract_tagged_block): resolve to the
  // LAST complete <tag>..</tag> pair so a duplicated or echoed block yields
  // the agent's final version instead of the echo. The Rust charset guard
  // rejects only invalid characters — an empty tag name passes.
  if (!/^[A-Za-z0-9_-]*$/.test(tag)) return null;
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const closeAt = text.lastIndexOf(close);
  if (closeAt < open.length) return null;
  const openAt = text.lastIndexOf(open, closeAt - open.length);
  if (openAt === -1) return null;
  const value = rustTrim(text.slice(openAt + open.length, closeAt));
  return value || null;
}

// Desktop parity (session_orchestration.rs normalized_editorial_text):
// peripheral whitespace, line breaks and redundant internal whitespace are
// cosmetic; punctuation and capitalization are substantive.
function normalizedEditorialText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(RUST_WS_RUN).filter(Boolean).join(' ');
}

function isSubstantiveEditorialChange(before: string, after: string): boolean {
  return normalizedEditorialText(before) !== normalizedEditorialText(after);
}

// ── Plan B1: serial turn output contract (desktop parity) ───────────────────
// Byte-exact ports of the session_orchestration.rs validators. The report
// field scanning mirrors the Rust micro-parser (strict-JSON first, then a
// quoted/bare scalar scan with line/brace key-position rules).

const MAX_CORRECTIVE_CONTRACT_RETRIES_PER_TURN = 3;
// Canonical escalation threshold: 3 consecutive operational turn failures pause
// the session as paused_reviewer_outage (consecutive_reviewer_outage_rounds).
const REVIEWER_OUTAGE_ESCALATION_THRESHOLD = 3;

const RUST_WS_START = new RegExp(`^${RUST_WS_CLASS}+`);

function rustTrimStart(text: string): string {
  return text.replace(RUST_WS_START, '');
}

// Rust to_ascii_lowercase: only A-Z are lowercased; Unicode case mappings
// must NOT apply.
function asciiLowercase(text: string): string {
  return text.replace(/[A-Z]/g, (character) => character.toLowerCase());
}

function asciiEqualsIgnoreCase(a: string, b: string): boolean {
  return asciiLowercase(a) === asciiLowercase(b);
}

function countOccurrences(text: string, needle: string): number {
  let count = 0;
  let index = text.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(needle, index + needle.length);
  }
  return count;
}

function requireBalancedTag(stdout: string, tag: string): string | null {
  const open = countOccurrences(stdout, `<${tag}>`);
  const close = countOccurrences(stdout, `</${tag}>`);
  if (open === 0 && close === 0) return `missing ${tag} block`;
  // Tolerate a duplicated/echoed block as long as it is balanced;
  // extractTagged resolves to the last complete one.
  if (open === close) return null;
  return `incomplete ${tag} block`;
}

function requireBalancedOptionalTag(stdout: string, tag: string): string | null {
  const open = countOccurrences(stdout, `<${tag}>`);
  const close = countOccurrences(stdout, `</${tag}>`);
  return open === close ? null : `incomplete ${tag} block`;
}

const PROMPT_ECHO_MARKERS = [
  '# maestro editorial ai - serial review-rewrite turn',
  '## full editorial protocol',
  '## required output contract',
  '## sovereign approved-content lock',
  '## current text under custody',
  '## prior serial revision reports',
  'internal coordination, critique, changelog, and revision report',
] as const;

function containsPromptOrProtocolEcho(stdout: string): boolean {
  const normalized = asciiLowercase(stdout);
  return PROMPT_ECHO_MARKERS.some((marker) => normalized.includes(marker));
}

function charAtOffset(value: string, offset: number): [string, number] | null {
  if (offset >= value.length) return null;
  const codePoint = value.codePointAt(offset);
  if (codePoint === undefined) return null;
  const character = String.fromCodePoint(codePoint);
  return [character, offset + character.length];
}

function advancePastUnclosedQuoteLine(value: string, offset: number): number {
  const newlineOffset = value.indexOf('\n', offset);
  return newlineOffset === -1 ? value.length : newlineOffset + 1;
}

function isStructureStart(value: string, offset: number): boolean {
  const before = value.slice(0, offset);
  if (rustTrim(before) === '') return true;
  const lastNewline = before.lastIndexOf('\n');
  if (lastNewline !== -1) return rustTrim(before.slice(lastNewline + 1)) === '';
  return false;
}

function isFieldKeyStart(value: string, offset: number): boolean {
  const before = value.slice(0, offset);
  if (rustTrim(before) === '') return true;
  const lastNewline = before.lastIndexOf('\n');
  if (lastNewline !== -1 && rustTrim(before.slice(lastNewline + 1)) === '') return true;
  const braceOffset = before.lastIndexOf('{');
  if (braceOffset !== -1) {
    return rustTrim(before.slice(braceOffset + 1)) === '' && isStructureStart(value, braceOffset);
  }
  return false;
}

function parseQuotedToken(value: string, start: number, quote: string): [string, number] | null {
  let token = '';
  let offset = start + quote.length;
  let escaped = false;
  while (offset < value.length) {
    const step = charAtOffset(value, offset);
    if (!step) return null;
    const [character, nextOffset] = step;
    if (escaped) {
      token += character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === quote) {
      return [token, nextOffset];
    } else {
      token += character;
    }
    offset = nextOffset;
  }
  return null;
}

function isFieldNameCharacter(character: string): boolean {
  return /^[A-Za-z0-9_]$/.test(character);
}

function isBareFieldBoundary(value: string, offset: number, fieldLen: number): boolean {
  const beforeOk = offset === 0 || !isFieldNameCharacter(value.charAt(offset - 1));
  const afterOffset = offset + fieldLen;
  const afterOk = afterOffset >= value.length || !isFieldNameCharacter(value.charAt(afterOffset));
  return beforeOk && afterOk;
}

function isScalarValueCharacter(character: string): boolean {
  return /^[A-Za-z0-9_-]$/.test(character);
}

function arrayFieldHasContent(afterField: string): boolean {
  const afterSeparator = rustTrimStart(afterField);
  if (!afterSeparator.startsWith(':')) return false;
  const afterColon = rustTrimStart(afterSeparator.slice(1));
  if (!afterColon.startsWith('[')) return false;
  return !rustTrimStart(afterColon.slice(1)).startsWith(']');
}

function scalarFieldMatchesValue(afterField: string, expected: string): boolean {
  const afterSeparator = rustTrimStart(afterField);
  if (!afterSeparator.startsWith(':')) return false;
  const afterColon = rustTrimStart(afterSeparator.slice(1));
  const first = charAtOffset(afterColon, 0);
  if (first) {
    const [quote] = first;
    if (quote === '"' || quote === "'" || quote === '`') {
      const parsed = parseQuotedToken(afterColon, 0, quote);
      return parsed !== null && asciiEqualsIgnoreCase(rustTrim(parsed[0]), expected);
    }
  }
  let actual = '';
  for (const character of afterColon) {
    if (!isScalarValueCharacter(character)) break;
    actual += character;
  }
  return actual !== '' && asciiEqualsIgnoreCase(actual, expected);
}

function fieldPrefixMatches(text: string, offset: number, normalizedField: string): boolean {
  return asciiLowercase(text.slice(offset, offset + normalizedField.length)) === normalizedField;
}

function reportDeclaresScalarFieldValue(report: string, field: string, expected: string): boolean {
  const normalizedField = asciiLowercase(field);
  let offset = 0;
  while (offset < report.length) {
    const step = charAtOffset(report, offset);
    if (!step) break;
    const [character, nextOffset] = step;
    if (character === '"' || character === "'" || character === '`') {
      const parsed = parseQuotedToken(report, offset, character);
      if (!parsed) {
        offset = advancePastUnclosedQuoteLine(report, nextOffset);
        continue;
      }
      const [quoted, afterQuote] = parsed;
      if (
        isFieldKeyStart(report, offset) &&
        asciiEqualsIgnoreCase(quoted, normalizedField) &&
        scalarFieldMatchesValue(report.slice(afterQuote), expected)
      ) {
        return true;
      }
      offset = afterQuote;
      continue;
    }
    if (
      fieldPrefixMatches(report, offset, normalizedField) &&
      isFieldKeyStart(report, offset) &&
      isBareFieldBoundary(report, offset, field.length) &&
      scalarFieldMatchesValue(report.slice(offset + field.length), expected)
    ) {
      return true;
    }
    offset = nextOffset;
  }
  return false;
}

function tryParseJsonObject(report: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(report);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Not strict JSON — fall back to the scalar/array field scan.
  }
  return null;
}

function reportDeclaresNonemptyArrayField(report: string, field: string): boolean {
  const parsedObject = tryParseJsonObject(report);
  if (parsedObject) {
    const items = parsedObject[field];
    return Array.isArray(items) && items.length > 0;
  }
  const normalizedField = asciiLowercase(field);
  let offset = 0;
  while (offset < report.length) {
    const step = charAtOffset(report, offset);
    if (!step) break;
    const [character, nextOffset] = step;
    if (character === '"' || character === "'" || character === '`') {
      const parsed = parseQuotedToken(report, offset, character);
      if (!parsed) {
        offset = advancePastUnclosedQuoteLine(report, nextOffset);
        continue;
      }
      const [quoted, afterQuote] = parsed;
      if (
        isFieldKeyStart(report, offset) &&
        asciiEqualsIgnoreCase(quoted, normalizedField) &&
        arrayFieldHasContent(report.slice(afterQuote))
      ) {
        return true;
      }
      offset = afterQuote;
      continue;
    }
    if (
      fieldPrefixMatches(report, offset, normalizedField) &&
      isFieldKeyStart(report, offset) &&
      isBareFieldBoundary(report, offset, field.length) &&
      arrayFieldHasContent(report.slice(offset + field.length))
    ) {
      return true;
    }
    offset = nextOffset;
  }
  return false;
}

function reportDeclaresCustodyValue(report: string, value: string): boolean {
  const parsedObject = tryParseJsonObject(report);
  if (parsedObject) {
    const custody = parsedObject.custody;
    return typeof custody === 'string' && asciiEqualsIgnoreCase(rustTrim(custody), value);
  }
  return reportDeclaresScalarFieldValue(report, 'custody', value);
}

function reportDeclaresNonemptyChanges(report: string): boolean {
  return reportDeclaresNonemptyArrayField(report, 'changes');
}

function asciiFoldedAlnum(character: string): string | null {
  if (/^[a-z0-9]$/.test(character)) return character;
  switch (character) {
    case 'á':
    case 'à':
    case 'ã':
    case 'â':
    case 'ä':
      return 'a';
    case 'é':
    case 'è':
    case 'ê':
    case 'ë':
      return 'e';
    case 'í':
    case 'ì':
    case 'î':
    case 'ï':
      return 'i';
    case 'ó':
    case 'ò':
    case 'õ':
    case 'ô':
    case 'ö':
      return 'o';
    case 'ú':
    case 'ù':
    case 'û':
    case 'ü':
      return 'u';
    case 'ç':
      return 'c';
    default:
      return null;
  }
}

function compactAsciiSignature(value: string): string {
  let compact = '';
  for (const character of value.toLowerCase()) {
    const folded = asciiFoldedAlnum(character);
    if (folded) compact += folded;
  }
  return compact;
}

function asciiFoldedTokens(value: string): string[] {
  const tokens: string[] = [];
  let current = '';
  for (const character of value.toLowerCase()) {
    const folded = asciiFoldedAlnum(character);
    if (folded) {
      current += folded;
    } else if (current) {
      tokens.push(current);
      current = '';
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function containsUncertainDateMarker(raw: string, tokens: string[]): boolean {
  if (!/[0-9]/.test(raw)) return false;
  if (raw.includes('?') || raw.includes('--')) return true;
  for (let index = 0; index + 3 < tokens.length; index += 1) {
    if (
      tokens[index] === 'entre' &&
      /^[0-9]+$/.test(tokens[index + 1] ?? '') &&
      tokens[index + 2] === 'e' &&
      /^[0-9]+$/.test(tokens[index + 3] ?? '')
    ) {
      return true;
    }
  }
  return false;
}

function isBibliographicLacunaMarker(raw: string, compact: string): boolean {
  if (
    ['sd', 'nd', 'sl', 'sn', 'slsn', 'sineloco', 'sinenomine', 'sinedata'].includes(compact) ||
    compact.includes('sinedata') ||
    compact.includes('sineloco') ||
    compact.includes('sinenomine')
  ) {
    return true;
  }
  const tokens = asciiFoldedTokens(raw);
  for (let index = 0; index + 1 < tokens.length; index += 1) {
    const first = tokens[index];
    const second = tokens[index + 1];
    if (
      (first === 's' && second === 'd') ||
      (first === 'n' && second === 'd') ||
      (first === 's' && second === 'l') ||
      (first === 's' && second === 'n')
    ) {
      return true;
    }
  }
  return containsUncertainDateMarker(raw, tokens);
}

function containsFinalReleaseBlocker(text: string): boolean {
  const compact = compactAsciiSignature(text);
  if (compact.includes('evidenciapendente') || compact.includes('edicaoconsultadanaoidentificada')) {
    return true;
  }
  let remaining = text;
  for (;;) {
    const open = remaining.indexOf('[');
    if (open === -1) break;
    const afterOpen = remaining.slice(open + 1);
    const close = afterOpen.indexOf(']');
    if (close === -1) break;
    const bracketed = afterOpen.slice(0, close);
    const marker = compactAsciiSignature(bracketed);
    if (
      isBibliographicLacunaMarker(bracketed, marker) ||
      marker.includes('evidenciapendente') ||
      marker.includes('edicaoconsultadanaoidentificada')
    ) {
      return true;
    }
    remaining = afterOpen.slice(close + 1);
  }
  return false;
}

function validateFinalReleaseCandidate(text: string): string | null {
  if (containsFinalReleaseBlocker(text)) {
    return 'final candidate failed bibliographic integrity gate: unresolved evidence marker or bibliographic lacuna found';
  }
  return null;
}

function validateSerialTurnOutput(
  rawText: string,
  status: string,
  report: string | null,
  finalText: string | null,
): string | null {
  if (status !== 'READY' && status !== 'NOT_READY') return `invalid serial status: ${status}`;
  if (containsPromptOrProtocolEcho(rawText)) return 'output appears to reproduce prompt/protocol scaffolding';
  const reportTagError = requireBalancedTag(rawText, 'maestro_revision_report');
  if (reportTagError) return reportTagError;
  const finalTagError = requireBalancedOptionalTag(rawText, 'maestro_final_text');
  if (finalTagError) return finalTagError;
  if (report === null) return 'missing complete maestro_revision_report block';
  if (rustTrim(report) === '') return 'empty maestro_revision_report block';
  const hasRevisedCustody = reportDeclaresCustodyValue(report, 'revised');
  const hasUnchangedCustody = reportDeclaresCustodyValue(report, 'unchanged');
  if (hasRevisedCustody && hasUnchangedCustody) return 'ambiguous custody declaration in maestro_revision_report';
  if (finalText !== null) {
    if (rustTrim(finalText) === '') return 'empty maestro_final_text block';
    if (!hasRevisedCustody) return 'maestro_final_text requires custody revised in the report';
    const releaseError = validateFinalReleaseCandidate(finalText);
    if (releaseError) return releaseError;
  }
  if (finalText === null && hasRevisedCustody) return 'revised custody requires a complete maestro_final_text block';
  if (finalText === null && !hasUnchangedCustody) {
    return `${status} without maestro_final_text must explicitly declare custody unchanged`;
  }
  if (finalText === null && hasUnchangedCustody && reportDeclaresNonemptyChanges(report)) {
    return 'correctable changes require custody revised and a complete maestro_final_text block';
  }
  return null;
}

function editorialQualityTier(agentKey: string): number {
  switch (asciiLowercase(agentKey)) {
    case 'claude':
    case 'codex':
      return 3;
    case 'gemini':
      return 2;
    case 'deepseek':
    case 'grok':
    case 'perplexity':
      return 1;
    default:
      return 0;
  }
}

function qualityGuardBlocksRevision(
  currentAuthorKey: string | null,
  reviewerKey: string,
  before: string,
  after: string,
  substantiveChange: boolean,
): boolean {
  if (!substantiveChange) return false;
  if (currentAuthorKey === null) return false;
  if (editorialQualityTier(reviewerKey) >= editorialQualityTier(currentAuthorKey)) return false;
  const beforeChars = Array.from(before).length;
  const afterChars = Array.from(after).length;
  return beforeChars >= 400 && afterChars * 100 < beforeChars * 85;
}

// ── Plan B3: cumulative stable-approval convergence + reviewer selection ────
// Ports of session_orchestration.rs 2595-2671. Convergence = every non-author
// agent of the rotation is in the stable-approval set; the draft lead (closing
// redactor) is schedulable only after every other peer completed a valid turn
// this round; an ineligible nominal slot redraws pseudo-randomly among the
// pending reviewers.

function hasAllIndependentApprovals(
  order: readonly string[],
  currentAuthorKey: string | null,
  stableApprovals: ReadonlySet<string>,
): boolean {
  if (currentAuthorKey === null) return false;
  const required = order.filter((agent) => agent !== currentAuthorKey);
  return required.length > 0 && required.every((agent) => stableApprovals.has(agent));
}

function closingTurnHasRequiredPriorReviews(
  order: readonly string[],
  draftLeadKey: string,
  validRoundAgents: ReadonlySet<string>,
): boolean {
  const required = order.filter((agent) => agent !== draftLeadKey);
  return required.length > 0 && required.every((agent) => validRoundAgents.has(agent));
}

function selectSerialReviewerIndex(
  order: readonly string[],
  nominalTurnIndex: number,
  currentAuthorKey: string,
  draftLeadKey: string,
  validRoundAgents: ReadonlySet<string>,
  stableApprovals: ReadonlySet<string>,
  selectionSeed: number,
): number | null {
  if (order.length === 0) return null;
  const nominalIndex = nominalTurnIndex % order.length;
  const nominal = order[nominalIndex] as string;
  const closureReady = closingTurnHasRequiredPriorReviews(order, draftLeadKey, validRoundAgents);
  const nominalIsPending =
    nominal !== currentAuthorKey && !stableApprovals.has(nominal) && (nominal !== draftLeadKey || closureReady);
  if (nominalIsPending) return nominalIndex;
  const pending: number[] = [];
  order.forEach((agent, index) => {
    if (agent !== currentAuthorKey && !stableApprovals.has(agent) && (agent !== draftLeadKey || closureReady)) {
      pending.push(index);
    }
  });
  if (pending.length === 0) return null;
  const offset = selectionSeed % pending.length;
  return pending[offset] ?? null;
}

// Desktop parity: the exact Mandatory Corrective Retry prompt section injected
// on each corrective re-run of a contract-violating reviewer turn.
function correctiveRetrySection(retryCount: number): string {
  return [
    '\n\n## Mandatory Corrective Retry\n',
    `\nThis is corrective retry ${retryCount}/${MAX_CORRECTIVE_CONTRACT_RETRIES_PER_TURN} for this same reviewer turn.`,
    '\nYour previous answer failed the required output contract or identified a blocker without revising the article.',
    '\nYou MUST resolve every correctable blocker in this turn by producing `custody: "revised"` and a complete `<maestro_final_text>`.',
    '\nUnresolved evidence markers or bibliographic lacunae in the current text are correctable defects: if supplied evidence does not verify them, remove or rewrite the unsupported claim/reference in the article and explain the quarantine in the report. Do not preserve `[EVIDENCIA_PENDENTE]`, bracketed lacunae, or unverifiable reference placeholders in `<maestro_final_text>`.',
    '\nOnly request operator evidence for a decision that cannot be made by deleting, narrowing, or quarantining the unsupported claim without harming the article.\n',
  ].join('');
}

/**
 * Block link-audit fetches against private, loopback, link-local and internal
 * hosts. The audited text is LLM-authored (and may be steered by untrusted web
 * search content), so the auto-fetch must never reach internal infrastructure
 * (SSRF). Returns true when the host must NOT be fetched.
 */
/** True when an IPv4 literal falls in a blocked range (canonical link_audit.rs
 *  table): this-network, RFC1918, loopback, CGNAT 100.64/10, link-local,
 *  RFC6890 192.0.0/24, TEST-NETs, benchmarking 198.18/15, multicast/reserved. */
function isPrivateIpv4(host: string): boolean {
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!ipv4) return false;
  const [a, b, c] = [Number(ipv4[1]), Number(ipv4[2]), Number(ipv4[3])];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

/**
 * Extract the embedded IPv4 from an IPv4-mapped/compatible IPv6 literal so the
 * private-range check can be applied. URL.hostname normalizes such literals to
 * the hex form (e.g. ::ffff:127.0.0.1 -> ::ffff:7f00:1), which would otherwise
 * slip past the prefix checks and allow SSRF to loopback/private IPv4 targets.
 */
function embeddedIpv4FromIpv6(host: string): string | null {
  const dotted = /^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(host);
  if (dotted) return dotted[1] ?? null;
  const hex = /^::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
  if (hex) {
    const hi = Number.parseInt(hex[1] ?? '0', 16);
    const lo = Number.parseInt(hex[2] ?? '0', 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return null;
}

function isBlockedAuditHost(hostname: string): boolean {
  const host = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host === 'localhost.localdomain' || host.endsWith('.localhost')) return true;
  // Web hardening beyond the desktop list (documented deviation): `.internal`
  // and bare single-label hosts are always internal from a Worker's egress.
  if (host.endsWith('.internal') || host.endsWith('.local')) return true;
  // Bare single-label hostnames (no dot) resolve to internal names.
  if (!host.includes('.') && !host.includes(':')) return true;

  // IPv4 literal in private / loopback / link-local / unspecified ranges.
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return isPrivateIpv4(host);
  }

  // IPv6 loopback / unspecified / unique-local (fc00::/7) / link-local
  // (fe80::/10) / multicast (ff00::/8) / documentation (2001:db8::/32).
  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true;
    if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
    if (/^fe[89ab][0-9a-f]:/.test(host)) return true;
    if (/^ff[0-9a-f]{2}:/.test(host)) return true;
    if (/^2001:0?db8:/.test(host)) return true;
    // IPv4-mapped / IPv4-compatible IPv6 (e.g. ::ffff:127.0.0.1): apply the
    // IPv4 private-range check to the embedded address.
    const embedded = embeddedIpv4FromIpv6(host);
    if (embedded) return isPrivateIpv4(embedded);
    return false;
  }

  return false;
}

// ── Plan D: canonical release link audit (port of link_audit.rs) ──
// The full audit (capacity + HTTP) runs only on finalization attempts:
// convergence, READY-unchanged and NOT_READY-unchanged turns. Per-revision
// audits were removed for parity — a broken link pauses the release, it no
// longer kills the session mid-run.
const LINK_AUDIT_MAX_UNIQUE_URLS = 30;
const LINK_AUDIT_MAX_MATCHES = 80;
const LINK_AUDIT_TIMEOUT_MS = 15_000;
const LINK_AUDIT_MAX_REDIRECT_HOPS = 5;
// Canonical extraction regex: stop-set is whitespace and < > " ' ) ] — no `}`.
const LINK_AUDIT_URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;

type LinkCandidate = { url: string; rejection: string | null };

/** Canonical rejection reason for a non-public/invalid audit URL, or null. */
function publicHttpUrlRejectionReason(value: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return 'URL invalida ou incompleta';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'somente links http:// ou https:// podem ser auditados';
  }
  if (!parsed.hostname) return 'link sem host/dominio';
  if (isBlockedAuditHost(parsed.hostname)) {
    return 'endereco local, privado ou reservado bloqueado por seguranca';
  }
  return null;
}

/** Canonical extraction: first 80 matches scanned, trailing .,;: trimmed,
 *  deduped on the cleaned string, capped at 30 candidates, sorted
 *  lexicographically (BTreeSet parity). Rejected candidates are KEPT with a
 *  rejection reason so they surface as blocked rows instead of vanishing. */
function extractUrlCandidates(text: string): LinkCandidate[] {
  const seen = new Set<string>();
  const candidates: LinkCandidate[] = [];
  let matches = 0;
  for (const match of text.matchAll(LINK_AUDIT_URL_REGEX)) {
    matches += 1;
    if (matches > LINK_AUDIT_MAX_MATCHES) break;
    const cleaned = match[0].replace(/[.,;:]+$/g, '');
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    candidates.push({ url: cleaned, rejection: publicHttpUrlRejectionReason(cleaned) });
    if (candidates.length >= LINK_AUDIT_MAX_UNIQUE_URLS) break;
  }
  return candidates.sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
}

/** Canonical capacity counter: counts ALL unique cleaned URLs (including
 *  blocked ones) across the first 80 matches, stopping at 31. */
function countUniqueUrlCandidates(text: string): number {
  const seen = new Set<string>();
  let matches = 0;
  for (const match of text.matchAll(LINK_AUDIT_URL_REGEX)) {
    matches += 1;
    if (matches > LINK_AUDIT_MAX_MATCHES) break;
    const cleaned = match[0].replace(/[.,;:]+$/g, '');
    if (cleaned) seen.add(cleaned);
    if (seen.size > LINK_AUDIT_MAX_UNIQUE_URLS) break;
  }
  return seen.size;
}

/** DoH pre-flight (web analogue of the desktop's system-resolver pre-flight +
 *  connection-bound resolver, which Workers cannot host): resolves A and AAAA
 *  via Cloudflare DoH and blocks when ANY answer is in a blocked range.
 *  Fails open on resolver errors (canonical parity: the fetch would fail to
 *  connect anyway); the connection-bound anti-rebinding layer has no Workers
 *  equivalent and is a documented deviation. */
async function hostResolvesToBlockedIp(host: string): Promise<boolean> {
  // IP literals are already range-checked lexically; DoH applies to names only.
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) || host.includes(':')) return false;
  const lookups = ['A', 'AAAA'].map(async (type) => {
    const endpoint = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`;
    const response = await fetchWithTimeout(endpoint, { headers: { accept: 'application/dns-json' } }, 5_000);
    if (!response.ok) return false;
    const payload = (await response.json()) as { Answer?: Array<{ type?: number; data?: string }> };
    return (payload.Answer ?? []).some((answer) => {
      // Type 1 = A, 28 = AAAA; other records (CNAME etc) carry no address.
      if (answer.type !== 1 && answer.type !== 28) return false;
      return isBlockedAuditHost(String(answer.data ?? ''));
    });
  });
  try {
    const results = await Promise.all(lookups);
    return results.some(Boolean);
  } catch {
    return false;
  }
}

/** Full per-URL guard: lexical + DoH pre-flight. Returns a rejection reason or null. */
async function auditTargetRejectionReason(target: URL): Promise<string | null> {
  const lexical = publicHttpUrlRejectionReason(target.toString());
  if (lexical) return lexical;
  if (await hostResolvesToBlockedIp(target.hostname.toLowerCase())) {
    return 'dominio resolve para IP privado/reservado bloqueado por seguranca';
  }
  return null;
}

/** One HTTP request with the canonical audit client settings. */
async function auditFetch(target: string, method: 'HEAD' | 'GET'): Promise<Response> {
  return fetchWithTimeout(
    target,
    {
      method,
      redirect: 'manual',
      // Canonical UA is "Maestro Editorial AI/{version}"; the worker has no
      // package-version binding, so the web port identifies itself as /web.
      headers: { 'user-agent': 'Maestro Editorial AI/web' },
    },
    LINK_AUDIT_TIMEOUT_MS,
  );
}

function linkAuditRow(
  url: string,
  status: number | undefined,
  error: string | undefined,
  tone: string,
): LinkAuditResult {
  return {
    url: sanitizeText(url, 240),
    ok: tone === 'ok',
    ...(status !== undefined ? { status } : {}),
    ...(error !== undefined ? { error: sanitizeText(error, 180) } : {}),
    tone: sanitizeText(tone, 16),
  };
}

/** Canonical tone for a final HTTP status: 2xx/3xx ok; 4xx/5xx error; anything
 *  else (1xx, non-standard like 999) warn — counted in neither ok nor failed. */
function toneForStatus(status: number): 'ok' | 'error' | 'warn' {
  if (status >= 200 && status < 400) return 'ok';
  if (status >= 400 && status < 600) return 'error';
  return 'warn';
}

/**
 * Canonical probe: HEAD first; GET fallback on 405/403 or HEAD transport
 * error; no retries. Redirects are followed manually up to 5 hops, re-running
 * the full guard (lexical + DoH) on every hop; a hop into a blocked target is
 * a `blocked` row. A chain still redirecting at the hop cap keeps its final
 * 3xx status, which is canonically `ok`.
 */
async function probePublicUrl(url: string): Promise<LinkAuditResult> {
  const headOrGet = async (target: string): Promise<Response> => {
    let response: Response;
    try {
      response = await auditFetch(target, 'HEAD');
    } catch {
      return auditFetch(target, 'GET');
    }
    if (response.status === 405 || response.status === 403) {
      return auditFetch(target, 'GET');
    }
    return response;
  };
  try {
    let current = url;
    let response = await headOrGet(current);
    for (
      let hops = 0;
      response.status >= 300 && response.status < 400 && hops < LINK_AUDIT_MAX_REDIRECT_HOPS;
      hops += 1
    ) {
      const location = response.headers.get('location');
      if (!location) break; // 3xx without Location: final status, canonical ok.
      let target: URL;
      try {
        target = new URL(location, current);
      } catch {
        return linkAuditRow(url, response.status, 'redirect invalido', 'blocked');
      }
      const rejection = await auditTargetRejectionReason(target);
      if (rejection) {
        return linkAuditRow(url, response.status, `redirect bloqueado: ${rejection}`, 'blocked');
      }
      current = target.toString();
      response = await headOrGet(current);
    }
    return linkAuditRow(url, response.status, undefined, toneForStatus(response.status));
  } catch (error) {
    return linkAuditRow(url, undefined, error instanceof Error ? error.message : String(error), 'error');
  }
}

type LinkAuditAggregate = {
  urlsFound: number;
  checked: number;
  ok: number;
  failed: number;
  rows: LinkAuditResult[];
};

/**
 * Canonical run_link_audit: blocked/invalid candidates become `blocked` rows
 * without any fetch; public candidates are probed. Desktop probes sequentially
 * on a blocking client — the web probes in parallel (documented deviation for
 * the Worker budget) but rows keep the canonical lexicographic order.
 * `failed` counts error+blocked; `warn` rows count in neither ok nor failed.
 */
async function runLinkAudit(text: string): Promise<LinkAuditAggregate> {
  const candidates = extractUrlCandidates(text);
  const rows = await Promise.all(
    candidates.map(async (candidate) => {
      if (candidate.rejection) return linkAuditRow(candidate.url, undefined, candidate.rejection, 'blocked');
      const dohRejection = await hostResolvesToBlockedIp(new URL(candidate.url).hostname.toLowerCase());
      if (dohRejection) {
        return linkAuditRow(
          candidate.url,
          undefined,
          'dominio resolve para IP privado/reservado bloqueado por seguranca',
          'blocked',
        );
      }
      return probePublicUrl(candidate.url);
    }),
  );
  const checked = candidates.filter((candidate) => candidate.rejection === null).length;
  const ok = rows.filter((row) => row.tone === 'ok').length;
  const failed = rows.filter((row) => row.tone === 'error' || row.tone === 'blocked').length;
  return { urlsFound: candidates.length, checked, ok, failed, rows };
}

type FinalReleaseAuditFailure = {
  reason: string;
  context: Record<string, unknown> & { gate: string };
};

/**
 * Canonical final_release_audit_failure: three short-circuiting stages —
 * bibliographic integrity, link-audit capacity (> 30 unique URLs), HTTP link
 * audit (failed > 0). All three funnel into the single paused_final_audit
 * status (desktop PAUSED_FINAL_REFERENCE_AUDIT).
 */
async function finalReleaseAuditFailure(text: string): Promise<FinalReleaseAuditFailure | null> {
  const bibliographicError = validateFinalReleaseCandidate(text);
  if (bibliographicError) {
    return {
      reason: bibliographicError,
      context: { gate: 'bibliographic_integrity', policy: 'final_text_must_not_hide_unverified_references' },
    };
  }
  const urlCount = countUniqueUrlCandidates(text);
  if (urlCount > LINK_AUDIT_MAX_UNIQUE_URLS) {
    return {
      reason: 'final candidate exceeds link audit capacity',
      context: {
        gate: 'link_audit_capacity',
        urls_found: urlCount,
        max_urls: LINK_AUDIT_MAX_UNIQUE_URLS,
        policy: 'final_text_must_not_contain_unaudited_public_links',
      },
    };
  }
  const audit = await runLinkAudit(text);
  if (audit.failed > 0) {
    return {
      reason: 'final candidate failed link audit',
      context: {
        gate: 'link_audit',
        urls_found: audit.urlsFound,
        checked: audit.checked,
        ok: audit.ok,
        failed: audit.failed,
        rows: audit.rows,
        policy: 'all_final_public_links_must_be_valid_before_release',
      },
    };
  }
  return null;
}

function buildDraftPrompt(input: MaestroResolvedSessionInput, runId: string): string {
  return `# Maestro Editorial AI - Web/API Draft Request

Run: \`${runId}\`
Session: ${sanitizeText(input.title, 200)}

## Language Contract

- Internal coordination between agents/peers MUST be written in en_US.
- The operator-facing deliverable MUST be written in Brazilian Portuguese (pt_BR).
- Do not use CLI or local filesystem. This web module operates through provider APIs only.

## Role Contract

You are the drafter selected to open the editorial session.
You submit a complete text to the editorial panel, but you never vote as reviewer of your own text.
Read and obey the full editorial protocol before writing. The protocol is provided by the Maestro web engine automatically; do not ask the operator to provide it again.
Do not invent links. If evidence is missing, mark it explicitly as [EVIDENCIA_PENDENTE].

## Operator Request

${input.prompt}

## Existing Editor Content

${input.initial_content || 'No existing editor content was provided.'}

## Full Editorial Protocol

\`\`\`markdown
${input.protocol_text}
\`\`\`
`;
}

async function buildRevisionPrompt(args: {
  input: MaestroResolvedSessionInput;
  runId: string;
  turn: number;
  currentText: string;
  currentAuthor: ProviderKey;
  reviewer: ProviderKey;
  history: SessionEvent[];
}): Promise<string> {
  const blockManifest = await formatBlockManifestForPrompt(args.currentText);
  return `# Maestro Editorial AI - Web/API Serial Review-Rewrite Turn

Run: \`${args.runId}\`
Turn: \`${args.turn}\`
Session: ${sanitizeText(args.input.title, 200)}

## Language Contract

- Internal coordination, critique, changelog, and revision report MUST be written in en_US.
- The operator-facing article inside <maestro_final_text> MUST be written in Brazilian Portuguese (pt_BR).
- The editorial protocol is authoritative input, not output. Read and obey it, but do not quote, summarize, restate, or reproduce protocol text in the artifact.

## Role Contract

- Current version author/curator: \`${args.currentAuthor}\`.
- Current reviewer-reviser: \`${args.reviewer}\`.
- You are not allowed to revise a version you just produced.
- You must act as reviewer and reviser in one turn: inspect the current text, apply only authorized corrections, and return the complete current article only when custody changes.
- A Maestro round is a full circular pass through every configured eligible AI agent. A new round can start only after custody has completed the full circle and returned to the original drafter.
- The web engine validates links automatically after each draft/revision. Do not fabricate URLs. If a link cannot be verified from the provided context, mark it as [EVIDENCIA_PENDENTE] instead of inventing one.

## Sovereign Approved-Content Lock

Approved content is locked by default.
You may alter a passage only when at least one hard gate applies:

1. A prior revision report or blocker explicitly cites that passage.
2. The passage contains a concrete, protocol-grounded defect that blocks safe final delivery.
3. A tiny adjacent edit is strictly necessary to keep grammar or continuity after an authorized correction.

If none of those gates applies, preserve the passage exactly. Do not restyle, shorten, reorder, simplify, expand, or replace it.
If a concern is optional, stylistic, vague, or outside scope, mark it as OUT_OF_SCOPE in the report and leave the text unchanged.

## Quality Preservation / Anti-Impoverishment Gate

Codex and Claude are the strongest long-form writers in this system. Gemini is second. DeepSeek, Grok, and Perplexity are useful reviewers but must not flatten stronger prose.
Preserve the strongest existing formulation unless a concrete editorial-protocol defect requires a narrow change.
Do not reduce breadth, depth, articulation, nuance, reflexivity, or argumentative amplitude.

## Evidence and Bibliographic Integrity Gate

- Do not invent links, editions, publishers, years, URLs, page ranges, or source details.
- If evidence is missing, do not pass [EVIDENCIA_PENDENTE], bracketed lacunae, or unsupported reference placeholders forward inside <maestro_final_text>.
- Unverified claims or references are correctable defects when they can be removed, narrowed, generalized, or quarantined without damaging the article.
- Do not convert evidence-pending markers into publicable references, bracketed lacunae, or bibliographic placeholders such as [s. d.], [S. l.: s. n.], or [Edição consultada não identificada].
- If the current text depends on an unverified reference, source, link, or bibliographic detail, revise the article in this same turn by deleting, narrowing, generalizing, or quarantining that dependency unless the missing evidence or operator decision is truly indispensable.
- Missing evidence by itself is not a sufficient reason to pass the blocker forward. First remove, narrow, generalize, or quarantine the unsupported claim/reference; request operator evidence only for a blocker that cannot be resolved by any of those editorial actions.
- A text is not final-deliverable while it still depends on unresolved evidence markers or bibliographic lacunae.
- A blocker that can be corrected with the current text, prior reports, supplied evidence, or the editorial protocol MUST be corrected in this same turn. Do not merely point it out or pass it to the next reviewer.
- Do not return MAESTRO_STATUS: NOT_READY with custody set to "unchanged". That is an invalid pass-through objection.
- If no concrete blocker remains, return MAESTRO_STATUS: READY, set custody to "unchanged", keep changes empty, and omit <maestro_final_text>.
- If any concrete blocker remains, correct it in this same turn, return MAESTRO_STATUS: READY or MAESTRO_STATUS: NOT_READY according to the revised article's safety, set custody to "revised", and include the complete corrected article inside <maestro_final_text>.
- Use operator_evidence_required only to document external evidence still desirable after you have already removed, narrowed, generalized, or quarantined the unsupported dependency in the revised article.

## Required Output Contract

The answer MUST contain exactly these parts:

1. First line: MAESTRO_STATUS: READY or MAESTRO_STATUS: NOT_READY.
2. <maestro_revision_report> containing en_US JSON-like audit data:
   - reviewer
   - current_author
   - status
   - changed_blocks: list every changed received block using block_id, change_type, reason, protocol_basis, and required: true|false. Use change_type: "split" or "addition" whenever the revised article creates extra blocks, and change_type: "reorder" whenever approved blocks move.
   - unchanged_approved_blocks: list approved block IDs that you intentionally preserved.
   - changes: list of changed passages, received line/passage reference, reason, protocol citation, and whether the change was required.
   - operator_evidence_required: list of blockers that cannot be corrected from supplied materials and require external evidence or operator decision.
   - out_of_scope: concerns intentionally not changed.
   - quality_preservation: explicit statement that approved strong formulations were preserved; if not, justify each reduction.
   - custody: exactly "revised" when you changed the article, or exactly "unchanged" only when you approve the current article without changing custody.
3. Include <maestro_final_text> containing only the complete operator-facing article in pt_BR only when custody is "revised".
4. If custody is "unchanged", status MUST be READY, changes MUST be empty, <maestro_final_text> MUST be omitted, and all remaining concerns must be non-blocking out_of_scope notes.
5. MAESTRO_STATUS: NOT_READY with custody: "unchanged" is a contract violation: either fix the blocker and transfer revised custody, or approve the current version as READY unchanged.

Anything outside those tags may be discarded by the app.
An incomplete tag, missing closing tag, reproduced protocol text, or truncated JSON/report is a contract violation and will not count as READY.

## Current Text Block Manifest

Every received block is locked by default. If <maestro_final_text> changes, deletes, compresses, splits, moves, or replaces a received block, the corresponding received block_id MUST appear in changed_blocks with a concrete protocol_basis. Silent changes to approved blocks are contract violations. Extra blocks require change_type: "split" or "addition"; moved approved blocks require change_type: "reorder".

${blockManifest}

## Operator Request

${args.input.prompt}

## Full Editorial Protocol

\`\`\`markdown
${args.input.protocol_text}
\`\`\`

## Current Text Under Custody

\`\`\`markdown
${args.currentText}
\`\`\`

## Prior Session Events

\`\`\`json
${JSON.stringify(args.history.slice(-12), null, 2)}
\`\`\`
`;
}

const PROVIDER_TIMEOUT_MS = 120_000;

/**
 * fetch with a hard timeout. A single hung provider/network call must not be
 * allowed to consume the entire runner budget (and silently exceed the
 * waitUntil window); it fails fast with a clear error instead.
 */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = PROVIDER_TIMEOUT_MS,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort);
  if (externalSignal?.aborted) controller.abort();
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (externalSignal?.aborted) {
      throw new ProviderCancelledError('Provider request aborted by session cancellation.', { cause: error });
    }
    if (controller.signal.aborted) {
      throw new Error(`Provider request excedeu o tempo limite de ${Math.round(timeoutMs / 1000)}s.`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

// Canonical provider retry policy (provider_retry.rs): max 2 attempts; a network
// error retries once after a 1500ms backoff; ONLY HTTP 429 retries, waiting
// Retry-After (delta-seconds or HTTP-date, default 30s, cap 120s). Any other
// status is returned as-is for normal classification. Waits are cancel-aware:
// sliced sleeps (5s) polling the cooperative cancel check (web analogue of the
// desktop CancellationToken).
const PROVIDER_RETRY_MAX_ATTEMPTS = 2;
const PROVIDER_RETRY_NETWORK_BACKOFF_MS = 1_500;
const PROVIDER_RETRY_429_DEFAULT_SECS = 30;
const PROVIDER_RETRY_429_CAP_SECS = 120;
const CANCEL_POLL_SLICE_MS = 5_000;

/** Web analogue of the desktop STOPPED_BY_USER interruption: the runner catches
 *  this and returns silently without clobbering the canceller's terminal write. */
class ProviderCancelledError extends Error {}

function parseRetryAfterHeader(headers: Headers): number | null {
  const value = headers.get('retry-after');
  if (value === null) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) return Math.max(0, Math.round((dateMs - Date.now()) / 1000));
  return null;
}

/** Sleep for ms, polling isCancelled every slice. Returns true if cancelled mid-wait. */
async function cancelAwareSleep(ms: number, isCancelled: () => Promise<boolean>): Promise<boolean> {
  let waited = 0;
  while (waited < ms) {
    if (await isCancelled()) return true;
    const step = Math.min(CANCEL_POLL_SLICE_MS, ms - waited);
    await new Promise((resolve) => setTimeout(resolve, step));
    waited += step;
  }
  return await isCancelled();
}

async function fetchProviderWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  isCancelled: () => Promise<boolean>,
): Promise<Response | 'cancelled'> {
  for (let attempt = 1; ; attempt += 1) {
    let response: Response;
    // Abortive cancel (web analogue of the desktop CancellationToken): while the
    // provider call is in flight, a poller watches the cooperative cancel check
    // and aborts the request instead of letting it run to completion/timeout.
    const cancelAbort = new AbortController();
    const poller = setInterval(() => {
      void isCancelled()
        .then((cancelled) => {
          if (cancelled) cancelAbort.abort();
        })
        .catch(() => {});
    }, CANCEL_POLL_SLICE_MS);
    try {
      response = await fetchWithTimeout(input, init, timeoutMs, cancelAbort.signal);
    } catch (error) {
      if (error instanceof ProviderCancelledError) return 'cancelled';
      if (attempt >= PROVIDER_RETRY_MAX_ATTEMPTS) throw error;
      if (await cancelAwareSleep(PROVIDER_RETRY_NETWORK_BACKOFF_MS, isCancelled)) return 'cancelled';
      continue;
    } finally {
      clearInterval(poller);
    }
    if (response.status !== 429 || attempt >= PROVIDER_RETRY_MAX_ATTEMPTS) return response;
    const retryAfterSecs = Math.min(
      parseRetryAfterHeader(response.headers) ?? PROVIDER_RETRY_429_DEFAULT_SECS,
      PROVIDER_RETRY_429_CAP_SECS,
    );
    if (await cancelAwareSleep(retryAfterSecs * 1_000, isCancelled)) return 'cancelled';
  }
}

/** Reject a promise if it does not settle within timeoutMs (for SDK calls that take no AbortSignal). */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} excedeu o tempo limite de ${Math.round(timeoutMs / 1000)}s.`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

interface ProviderCallOptions {
  /** Per-call timeout, canonically min(120s, remaining session time). */
  timeoutMs?: number;
  /** Cooperative cancel check; enables retry waits + in-flight abort polling. */
  isCancelled?: () => Promise<boolean>;
}

async function callProvider(
  env: MaestroAiEnv,
  agent: ProviderKey,
  prompt: string,
  models: Partial<Record<ProviderKey, string>>,
  maxOutputTokens = MAX_OUTPUT_TOKENS,
  systemOverride?: string,
  options?: ProviderCallOptions,
): Promise<ProviderCallResult> {
  const apiKey = secretForAgent(env, agent);
  if (!apiKey) throw new Error(`${AGENT_LABELS[agent]} API key is not configured in admin-motor secrets.`);
  const model = sanitizeText(models[agent], 120) || DEFAULT_MODELS[agent];
  const system =
    systemOverride ??
    `You are ${AGENT_LABELS[agent]} inside Maestro Editorial AI. Internal coordination must be in en_US. Operator-facing deliverables must be in pt_BR. Follow the current Maestro role contract exactly.`;

  const timeoutMs = options?.timeoutMs ?? PROVIDER_TIMEOUT_MS;
  if (agent === 'gemini') {
    // Documented web deviation: the Gemini SDK exposes no Response/AbortSignal,
    // so this path keeps the deadline-coupled timeout but has no 429 retry or
    // in-flight abort (the cooperative cancel checks around the call cover it).
    const ai = new GoogleGenAI({ apiKey });
    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: `${system}\n\n${prompt}`,
        config: { temperature: 0.2, topP: 0.9, maxOutputTokens },
      }),
      timeoutMs,
      `${AGENT_LABELS[agent]} request`,
    );
    return {
      text: response.text?.trim() || '',
      inputTokens: response.usageMetadata?.promptTokenCount ?? undefined,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? undefined,
      model,
    };
  }

  const request = buildProviderHttpRequest(agent, apiKey, model, system, prompt, maxOutputTokens);
  const response = options?.isCancelled
    ? await fetchProviderWithRetry(request.endpoint, request.init, timeoutMs, options.isCancelled)
    : await fetchWithTimeout(request.endpoint, request.init, timeoutMs);
  if (response === 'cancelled') {
    throw new ProviderCancelledError('Provider call cancelled by cooperative session cancellation.');
  }
  const parsed = await parseProviderResponse(response);

  if (agent === 'claude') {
    const text = parsed.content?.find((item: { type?: string }) => item.type === 'text')?.text ?? '';
    return {
      text: String(text).trim(),
      inputTokens: parsed.usage?.input_tokens,
      outputTokens: parsed.usage?.output_tokens,
      model,
    };
  }

  if (agent === 'codex' || agent === 'grok') {
    const text =
      parsed.output_text ??
      parsed.output
        ?.flatMap((item: { content?: Array<{ text?: string; type?: string }> }) => item.content ?? [])
        .find((item: { text?: string }) => typeof item.text === 'string')?.text ??
      '';
    return {
      text: String(text).trim(),
      inputTokens: parsed.usage?.input_tokens ?? parsed.usage?.prompt_tokens,
      outputTokens: parsed.usage?.output_tokens ?? parsed.usage?.completion_tokens,
      model,
    };
  }

  const text = parsed.choices?.[0]?.message?.content ?? '';
  return {
    text: String(text)
      .replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, '')
      .trim(),
    inputTokens: parsed.usage?.prompt_tokens ?? parsed.usage?.input_tokens,
    outputTokens: parsed.usage?.completion_tokens ?? parsed.usage?.output_tokens,
    model,
  };
}

function buildProviderHttpRequest(
  agent: HttpProviderKey,
  apiKey: string,
  model: string,
  system: string,
  prompt: string,
  maxOutputTokens = MAX_OUTPUT_TOKENS,
): ProviderHttpRequest {
  if (agent === 'claude') {
    return {
      endpoint: 'https://api.anthropic.com/v1/messages',
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxOutputTokens,
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
        }),
      },
    };
  }

  if (agent === 'codex' || agent === 'grok') {
    const endpoint = agent === 'codex' ? 'https://api.openai.com/v1/responses' : 'https://api.x.ai/v1/responses';
    return {
      endpoint,
      init: {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          instructions: system,
          input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
          max_output_tokens: maxOutputTokens,
          store: false,
        }),
      },
    };
  }

  const endpoint =
    agent === 'deepseek' ? 'https://api.deepseek.com/chat/completions' : 'https://api.perplexity.ai/v1/sonar';
  return {
    endpoint,
    init: {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        stream: false,
        max_tokens: maxOutputTokens,
        temperature: 0.2,
        top_p: 0.9,
        ...(agent === 'perplexity'
          ? {
              search_mode: 'web',
              reasoning_effort: 'high',
              web_search_options: { search_context_size: 'high' },
              return_images: false,
              return_related_questions: false,
            }
          : {}),
      }),
    },
  };
}

function publicApiHealthResult(
  agent: ProviderKey,
  result: ProviderCallResult,
): { agent: ProviderKey; ok: true; message: string; model?: string } {
  return {
    agent,
    ok: true,
    message: result.text.slice(0, 120) || 'Chamada autenticada aceita; resposta textual vazia.',
    model: result.model,
  };
}

// Plan C (canonical resume): only convergence is terminal — everything else can
// be resumed. The runner re-validates every limit with a fresh per-execution
// scope (cost baseline, `now` time anchor) and recovers only custody
// text/author; approvals and round accounting restart empty.
const RESUMABLE_STATUSES = new Set([
  'paused_cost_limit',
  'paused_time_limit',
  'paused_cycle_limit',
  'paused_round_incomplete',
  'paused_final_audit',
  'paused_self_review',
  'paused_reviewer_outage',
  'paused_draft_unavailable',
  'blocked_cancelled',
  'blocked_max_cycles',
  'blocked_link_audit',
  'error',
]);

export const maestroAiTestHooks = {
  buildProviderHttpRequest,
  buildRevisionPrompt,
  publicApiHealthResult,
  extractStatus,
  extractTagged,
  isSubstantiveEditorialChange,
  sanitizeAgent,
  reportDeclaresCustodyValue,
  reportDeclaresNonemptyChanges,
  containsFinalReleaseBlocker,
  containsPromptOrProtocolEcho,
  validateSerialTurnOutput,
  qualityGuardBlocksRevision,
  hasAllIndependentApprovals,
  closingTurnHasRequiredPriorReviews,
  selectSerialReviewerIndex,
  isBlockedAuditHost,
  extractUrlCandidates,
  countUniqueUrlCandidates,
  hostResolvesToBlockedIp,
  probePublicUrl,
  runLinkAudit,
  finalReleaseAuditFailure,
  fetchWithTimeout,
  parseRetryAfterHeader,
  remainingSessionMs,
  sessionTimeExhausted,
  fetchProviderWithRetry,
  persistSession,
  runSession,
  sweepStaleSessions,
  RESUMABLE_STATUSES,
};

async function parseProviderResponse(response: Response): Promise<ProviderResponsePayload> {
  const body = await response.text();
  let parsed: ProviderResponsePayload;
  try {
    parsed = body ? (JSON.parse(body) as ProviderResponsePayload) : {};
  } catch {
    parsed = { raw: body };
  }
  if (!response.ok) {
    const message = parsed?.error?.message || parsed?.message || body || `HTTP ${response.status}`;
    throw new Error(`PROVIDER_HTTP_${response.status}: ${sanitizeText(message, 500)}`);
  }
  return parsed;
}

async function loadSession(db: D1Database, id: string): Promise<MaestroSessionRow | null> {
  return db.prepare('SELECT * FROM maestro_ai_sessions WHERE id = ? LIMIT 1').bind(id).first<MaestroSessionRow>();
}

type SessionPatch = Partial<
  Pick<
    MaestroSessionRow,
    'status' | 'current_author' | 'current_text' | 'final_text' | 'observed_cost_usd' | 'events_json' | 'error'
  >
>;

const PERSIST_COLUMNS: ReadonlyArray<keyof SessionPatch> = [
  'status',
  'current_author',
  'current_text',
  'final_text',
  'observed_cost_usd',
  'events_json',
  'error',
];

/**
 * Atomic partial update: writes ONLY the columns present in `patch` in a single
 * UPDATE, with no preceding read. This removes the read-modify-write race (a
 * concurrent writer touching other columns is no longer clobbered) and lets a
 * nullable column be set explicitly to null (the old `?? row.x` merge could
 * never persist null for final_text). Column names come from a fixed allowlist;
 * values are always bound.
 *
 * Returns whether the UPDATE modified a row (D1 meta.changes): a CAS-guarded
 * write that lost the race reports false so callers can refuse follow-up
 * actions (e.g. the resume handler must not dispatch a second runner).
 */
async function persistSession(
  db: D1Database,
  id: string,
  patch: SessionPatch,
  opts: { ifStatusIn?: readonly string[] } = {},
): Promise<boolean> {
  const assignments: string[] = [];
  const values: unknown[] = [];
  for (const column of PERSIST_COLUMNS) {
    if (Object.hasOwn(patch, column)) {
      assignments.push(`${column} = ?`);
      values.push(patch[column]);
    }
  }
  if (assignments.length === 0) return false;
  assignments.push('updated_at = ?');
  values.push(nowIso());
  let where = 'id = ?';
  values.push(id);
  // Optional compare-and-swap guard: only apply the write if the row is still in
  // one of the expected statuses. This makes terminal transitions atomic so a
  // concurrent operator cancel / sweeper / finalization cannot be clobbered.
  if (opts.ifStatusIn?.length) {
    where += ` AND status IN (${opts.ifStatusIn.map(() => '?').join(', ')})`;
    values.push(...opts.ifStatusIn);
  }
  const result = (await db
    .prepare(`UPDATE maestro_ai_sessions SET ${assignments.join(', ')} WHERE ${where}`)
    .bind(...values)
    .run()) as { meta?: { changes?: number } } | undefined;
  // D1 reports modified rows in meta.changes; a store that omits it (older
  // mocks) is treated as applied to preserve unconditional-write semantics.
  return (result?.meta?.changes ?? 1) > 0;
}

/** True when the runner must stop: the row is gone or no longer in a runnable
 *  (queued/running) status, i.e. an operator cancel / sweeper / finalization has
 *  already written a terminal status that must not be clobbered. */
function runnerStopRequested(row: { status?: unknown } | null): boolean {
  const status = row?.status;
  return !row || (status !== 'queued' && status !== 'running');
}

async function runSession(db: D1Database, env: MaestroAiEnv, id: string): Promise<void> {
  const row = await loadSession(db, id);
  if (!row) return;
  const input: MaestroResolvedSessionInput = {
    title: row.title,
    prompt: row.prompt,
    protocol_text: row.protocol_text,
    initial_agent: sanitizeAgent(row.initial_agent, 'claude'),
    active_agents: parseJson<ProviderKey[]>(row.active_agents_json, []),
    initial_content: row.current_text,
    max_cost_usd: row.max_cost_usd,
    max_runtime_minutes: row.max_runtime_minutes,
    rates: parseJson(row.rates_json, {}),
    models: parseJson(row.models_json, {}),
    max_cycles: row.max_cycles,
  };
  const activeAgents = input.active_agents?.length ? input.active_agents : PROVIDER_KEYS;
  const initialAgent = sanitizeAgent(input.initial_agent, activeAgents[0] ?? 'claude');
  const events = parseJson<SessionEvent[]>(row.events_json, []);
  const pushEvent = async (event: SessionEvent) => {
    events.push(event);
    logMaestro(event.status === 'error' ? 'error' : event.status === 'blocked' ? 'warn' : 'info', 'session_event', {
      session_id: id,
      agent: event.agent,
      role: event.role,
      status: event.status,
      message: event.message,
      cost_usd: event.cost_usd,
      model: event.model,
      invalid_links: event.link_audit?.filter((link) => !link.ok).length ?? 0,
    });
    await persistSession(db, id, { events_json: JSON.stringify(events) });
  };
  let observedCost = row.observed_cost_usd || 0;
  let currentAuthor: ProviderKey = initialAgent;
  let artifactTurn = 0;
  let previousArtifactId: string | null = null;
  const correctiveRetryCounts = new Map<string, number>();
  // ── Plan C: resumable lifecycle ──
  // Resume detection (canonical limited recovery: custody text + author). A
  // resumed run skips the draft phase and re-enters the review circuit.
  const isResume = Boolean(row.current_text?.trim() && row.current_author);
  // Canonical time anchor: created_at on a fresh run, `now` on resume.
  const createdAtMs = Date.parse(row.created_at);
  const timeAnchorMs = isResume || !Number.isFinite(createdAtMs) ? Date.now() : createdAtMs;
  // Canonical cost_scope: the cost cap applies per runner execution, so a
  // resumed run guards against (observed - baseline), not lifetime spend.
  const costBaseline = observedCost;
  // Canonical consecutive operational-outage counter (3-strike escalation).
  let consecutiveOutages = 0;
  const isCancelled = async () => runnerStopRequested(await loadSession(db, id));
  const callTimeoutMs = () => {
    const remaining = remainingSessionMs(timeAnchorMs, input.max_runtime_minutes);
    return remaining === null ? PROVIDER_TIMEOUT_MS : Math.max(1, Math.min(PROVIDER_TIMEOUT_MS, remaining));
  };
  const callOptions = (): ProviderCallOptions => ({ timeoutMs: callTimeoutMs(), isCancelled });
  // Plan D (documented web deviation): the desktop re-runs the full release
  // audit (incl. HTTP) on every unchanged turn; on Workers that would multiply
  // subrequests past the platform budget, so within ONE execution the audit
  // result is cached per custody text.
  const releaseAuditCache = new Map<string, FinalReleaseAuditFailure | null>();
  const cachedFinalReleaseAuditFailure = async (text: string): Promise<FinalReleaseAuditFailure | null> => {
    if (releaseAuditCache.has(text)) return releaseAuditCache.get(text) ?? null;
    const failure = await finalReleaseAuditFailure(text);
    releaseAuditCache.set(text, failure);
    return failure;
  };
  // Machine-readable release-audit context for durable session events
  // (canonical audit_context): rows are excluded from the summary because they
  // travel in the event's own link_audit field.
  const finalAuditEventField = (
    failure: FinalReleaseAuditFailure,
  ): { gate: string; reason: string; context: Record<string, unknown> } => {
    const { rows: _rows, ...contextSummary } = failure.context;
    return { gate: failure.context.gate, reason: failure.reason, context: contextSummary };
  };

  try {
    logMaestro('info', 'session_started', { session_id: id, initial_agent: initialAgent, active_agents: activeAgents });
    // Cooperative cancellation (pre-draft): an operator cancel / sweeper can flip
    // the status to terminal while the session is still queued. Detect it BEFORE
    // the cost guard, the paid provider call, and any draft event/artifact.
    const preDraftLive = await loadSession(db, id);
    if (runnerStopRequested(preDraftLive)) {
      logMaestro('warn', 'session_interrupted', { session_id: id, status: preDraftLive?.status });
      return;
    }
    let currentText = '';
    if (isResume) {
      // Canonical resume (limited recovery): custody text/author are restored,
      // the draft phase is skipped, and the review circuit restarts with empty
      // approval/round accounting. Link auditing happens only at finalization
      // attempts (Plan D canonical placement), not here.
      currentText = String(row.current_text);
      currentAuthor = sanitizeAgent(row.current_author ?? '', initialAgent);
      await pushEvent({
        at: nowIso(),
        agent: currentAuthor,
        role: 'draft',
        status: 'running',
        message: 'Session resumed: draft phase skipped, custody text recovered.',
      });
      await persistSession(db, id, { status: 'running' }, { ifStatusIn: ['queued', 'running'] });
    } else {
      // Canonical draft fallback: the lead drafts first; an operational failure
      // or empty draft falls through to the next active agent; cost/time
      // exhaustion pauses; all agents failing pauses as draft-unavailable.
      const draftPrompt = buildDraftPrompt(input, id);
      const draftAgents = [initialAgent, ...activeAgents.filter((agent) => agent !== initialAgent)];
      let draftAuthor: ProviderKey | null = null;
      let draft: ProviderCallResult | null = null;
      let draftCost = 0;
      for (const draftAgent of draftAgents) {
        if (sessionTimeExhausted(timeAnchorMs, input.max_runtime_minutes)) {
          await pushEvent({
            at: nowIso(),
            agent: draftAgent,
            role: 'draft',
            status: 'blocked',
            message: `Time guard blocked draft call before ${AGENT_LABELS[draftAgent]}.`,
          });
          await persistSession(
            db,
            id,
            { status: 'paused_time_limit', observed_cost_usd: observedCost },
            { ifStatusIn: ['queued', 'running'] },
          );
          return;
        }
        const draftRates = input.rates?.[draftAgent] ?? {};
        const projectedDraftCost = estimateCost(draftPrompt, MAX_OUTPUT_TOKENS, draftRates);
        if (
          !Number.isFinite(projectedDraftCost) ||
          observedCost - costBaseline + projectedDraftCost > Number(input.max_cost_usd)
        ) {
          await pushEvent({
            at: nowIso(),
            agent: draftAgent,
            role: 'draft',
            status: 'blocked',
            message: `Cost guard blocked draft call before ${AGENT_LABELS[draftAgent]}.`,
            cost_usd: projectedDraftCost,
          });
          await persistSession(
            db,
            id,
            { status: 'paused_cost_limit', observed_cost_usd: observedCost },
            { ifStatusIn: ['queued', 'running'] },
          );
          return;
        }
        await pushEvent({
          at: nowIso(),
          agent: draftAgent,
          role: 'draft',
          status: 'running',
          message: draftAgent === initialAgent ? 'Draft call started.' : 'Draft fallback call started.',
        });
        // Re-check immediately before the paid call: a cancel can land during the
        // `await pushEvent` above, and the provider request must not run (cost) for a
        // session that is no longer queued/running. This load is the last statement
        // before callProvider, so no await can interpose a stale read.
        const beforeCallLive = await loadSession(db, id);
        if (runnerStopRequested(beforeCallLive)) {
          logMaestro('warn', 'session_interrupted', { session_id: id, status: beforeCallLive?.status });
          return;
        }
        try {
          const attempt = await callProvider(
            env,
            draftAgent,
            draftPrompt,
            input.models ?? {},
            MAX_OUTPUT_TOKENS,
            undefined,
            callOptions(),
          );
          draftCost = calculateObservedCost(attempt, draftPrompt, draftRates);
          observedCost += draftCost;
          // M3: an empty provider response (e.g. a thinking-only completion) is a
          // draft failure, not a silent blank custody — fall through to the next agent.
          if (!attempt.text.trim()) {
            throw new Error(`O provedor ${AGENT_LABELS[draftAgent]} retornou um rascunho vazio (texto em branco).`);
          }
          draft = attempt;
          draftAuthor = draftAgent;
        } catch (error) {
          if (error instanceof ProviderCancelledError) {
            logMaestro('warn', 'session_interrupted', { session_id: id, reason: 'cancelled_during_draft' });
            return;
          }
          await pushEvent({
            at: nowIso(),
            agent: draftAgent,
            role: 'draft',
            status: 'blocked',
            message: `Draft attempt failed with ${AGENT_LABELS[draftAgent]}: ${sanitizeText(
              error instanceof Error ? error.message : String(error),
              300,
            )}. Trying next active agent.`,
          });
          await persistSession(db, id, { observed_cost_usd: observedCost });
          continue;
        }
        break;
      }
      if (!draft || !draftAuthor) {
        await persistSession(
          db,
          id,
          {
            status: 'paused_draft_unavailable',
            observed_cost_usd: observedCost,
            error: 'All active agents failed to produce an initial draft.',
          },
          { ifStatusIn: ['queued', 'running'] },
        );
        return;
      }
      // Cooperative cancellation (post-draft): if the session was cancelled while
      // the initial provider call was in flight, do not write the draft
      // artifact/events for the now-cancelled session.
      const postDraftLive = await loadSession(db, id);
      if (runnerStopRequested(postDraftLive)) {
        logMaestro('warn', 'session_interrupted', { session_id: id, status: postDraftLive?.status });
        return;
      }
      currentText = draft.text;
      currentAuthor = draftAuthor;
      // Plan D canonical placement: no per-draft link audit — links are audited
      // only when a text attempts finalization (release audit stages 2-3).
      artifactTurn += 1;
      const draftArtifact = await createArtifact(db, {
        sessionId: id,
        cycle: 0,
        turn: artifactTurn,
        agent: draftAuthor,
        role: 'draft',
        status: 'ready',
        title: input.title,
        contentMd: currentText,
        revisionReport: JSON.stringify({
          reviewer: draftAuthor,
          role: 'initial_drafter',
          status: 'ready',
          custody: 'created',
        }),
        linkAudit: [],
        costUsd: draftCost,
        model: draft.model,
        previousArtifactId,
      });
      previousArtifactId = draftArtifact.id;
      await pushEvent({
        at: nowIso(),
        agent: draftAuthor,
        role: 'draft',
        status: 'ready',
        message: 'Initial draft produced.',
        cost_usd: draftCost,
        model: draft.model,
      });
      await persistSession(
        db,
        id,
        {
          status: 'running',
          current_author: currentAuthor,
          current_text: currentText,
          observed_cost_usd: observedCost,
        },
        { ifStatusIn: ['queued', 'running'] },
      );
    }

    const order = [
      ...activeAgents.slice(activeAgents.indexOf(initialAgent) + 1),
      ...activeAgents.slice(0, activeAgents.indexOf(initialAgent)),
      initialAgent,
    ];
    // ── Plan B3: desktop round/turn accounting and cumulative convergence ──
    // READY-unchanged turns add the reviewer to stableApprovals; substantive
    // changes, contract/lock violations and quality-guard blocks clear it.
    // The session finalizes the moment every non-author agent of the rotation
    // is in the set (mid-round capable), and a global serial-turn cap bounds
    // deliberation. Since Plan C the paused_* statuses are resumable.
    let converged = false;
    const maxCycles = Math.max(1, Math.min(5, Number(input.max_cycles || 2)));
    const roundTurnCount = order.length;
    const maxSerialTurns = Math.max(roundTurnCount * 4, roundTurnCount);
    let round = 1;
    let roundTurnIndex = 0;
    let serialTurns = 0;
    const validRoundAgents = new Set<string>();
    const stableApprovals = new Set<string>();
    // ── Plan C: operational turn failures (canonical 3-strike escalation) ──
    // A provider/network/timeout failure or an exhausted corrective-retry turn
    // does NOT kill the session: it skips the turn (stableApprovals PRESERVED —
    // only violations clear it), and three consecutive operational failures
    // escalate to paused_reviewer_outage. A clean turn resets the counter. A
    // failure on the round's closing turn pauses as paused_round_incomplete.
    const handleOperationalFailure = async (reviewer: ProviderKey, message: string): Promise<'stop' | 'skip'> => {
      consecutiveOutages += 1;
      await pushEvent({
        at: nowIso(),
        agent: reviewer,
        role: 'revision',
        status: 'blocked',
        message: `Operational turn failure (${consecutiveOutages}/${REVIEWER_OUTAGE_ESCALATION_THRESHOLD}): ${sanitizeText(message, 300)}`,
      });
      if (consecutiveOutages >= REVIEWER_OUTAGE_ESCALATION_THRESHOLD) {
        await persistSession(
          db,
          id,
          {
            status: 'paused_reviewer_outage',
            current_author: currentAuthor,
            current_text: currentText,
            observed_cost_usd: observedCost,
            error: `${REVIEWER_OUTAGE_ESCALATION_THRESHOLD} consecutive reviewer turns failed operationally; session paused for operator action.`,
          },
          { ifStatusIn: ['queued', 'running'] },
        );
        return 'stop';
      }
      roundTurnIndex += 1;
      if (roundTurnIndex >= roundTurnCount) {
        await persistSession(
          db,
          id,
          {
            status: 'paused_round_incomplete',
            current_author: currentAuthor,
            current_text: currentText,
            observed_cost_usd: observedCost,
            error: 'Operational failure at the end of the round; review circuit incomplete.',
          },
          { ifStatusIn: ['queued', 'running'] },
        );
        return 'stop';
      }
      return 'skip';
    };
    for (;;) {
      // Cooperative cancellation: an operator cancel (or sweeper) flips the
      // stored status to a terminal state; detect it between turns and stop
      // without clobbering the terminal status the canceller already wrote.
      const live = await loadSession(db, id);
      if (live && live.status !== 'running') {
        logMaestro('warn', 'session_interrupted', { session_id: id, status: live.status });
        return;
      }
      // Desktop parity: convergence is checked at the top of every iteration,
      // so the session finalizes mid-round when the last approval lands.
      if (hasAllIndependentApprovals(order, currentAuthor, stableApprovals)) {
        converged = true;
        break;
      }
      // Desktop parity (turn cap): serialTurns counts every iteration —
      // including retries, skips and redraws — and hard-stops runaway
      // deliberation at roundTurnCount * 4.
      serialTurns += 1;
      if (serialTurns > maxSerialTurns) {
        await pushEvent({
          at: nowIso(),
          status: 'blocked',
          message: `Serial turn cap reached (${maxSerialTurns}); session stopped without unanimity.`,
        });
        await persistSession(
          db,
          id,
          {
            status: 'paused_cycle_limit',
            current_author: currentAuthor,
            current_text: currentText,
            observed_cost_usd: observedCost,
            error: `Serial turn cap of ${maxSerialTurns} turns reached without unanimity.`,
          },
          { ifStatusIn: ['queued', 'running'] },
        );
        return;
      }
      // Interim operator bound (documented deviation until Plan C): the
      // desktop has no round cap, only the turn cap above; the operator's
      // max_cycles setting is honored as an outer round bound meanwhile.
      if (round > maxCycles) break;
      const selectionSeed = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
      const selectedIndex = selectSerialReviewerIndex(
        order,
        roundTurnIndex,
        currentAuthor,
        initialAgent,
        validRoundAgents,
        stableApprovals,
        selectionSeed,
      );
      if (selectedIndex === null) {
        // Desktop parity: an empty pending set means every schedulable peer
        // has already approved the current version.
        converged = true;
        break;
      }
      const reviewer = order[selectedIndex] as ProviderKey;
      if (selectedIndex !== roundTurnIndex % roundTurnCount) {
        await pushEvent({
          at: nowIso(),
          agent: reviewer,
          role: 'revision',
          status: 'running',
          message: 'Reviewer redrawn: nominal slot is the current author or already approved this version.',
        });
      }
      roundTurnIndex = selectedIndex;
      if (reviewer === currentAuthor) {
        // Defensive scheduler invariant (desktop PAUSED_SELF_REVIEW_BLOCKED).
        await persistSession(
          db,
          id,
          {
            status: 'paused_self_review',
            current_author: currentAuthor,
            current_text: currentText,
            observed_cost_usd: observedCost,
            error: 'Scheduler invariant violation: selected reviewer is the current version author.',
          },
          { ifStatusIn: ['queued', 'running'] },
        );
        return;
      }
      if (sessionTimeExhausted(timeAnchorMs, input.max_runtime_minutes)) {
        await pushEvent({
          at: nowIso(),
          agent: reviewer,
          role: 'revision',
          status: 'blocked',
          message: `Time guard blocked provider call before ${AGENT_LABELS[reviewer]}.`,
        });
        await persistSession(
          db,
          id,
          { status: 'paused_time_limit', observed_cost_usd: observedCost },
          { ifStatusIn: ['queued', 'running'] },
        );
        return;
      }
      {
        let correctiveRetryCount = 0;
        // Desktop parity: a contract-violating turn is retried with the SAME
        // reviewer up to MAX_CORRECTIVE_CONTRACT_RETRIES_PER_TURN times, with a
        // Mandatory Corrective Retry section appended to the prompt; exhaustion
        // skips the turn, and an exhausted turn at the end of the round pauses
        // the circuit as paused_round_incomplete.
        for (;;) {
          await pushEvent({
            at: nowIso(),
            agent: reviewer,
            role: 'revision',
            status: 'running',
            message:
              correctiveRetryCount > 0
                ? `Corrective retry ${correctiveRetryCount}/${MAX_CORRECTIVE_CONTRACT_RETRIES_PER_TURN} started in round ${round}.`
                : `Serial revision turn started in round ${round}.`,
          });
          const prompt =
            (await buildRevisionPrompt({
              input,
              runId: id,
              turn: events.length + 1,
              currentText,
              currentAuthor,
              reviewer,
              history: events,
            })) + (correctiveRetryCount > 0 ? correctiveRetrySection(correctiveRetryCount) : '');
          const rates = input.rates?.[reviewer] ?? {};
          const projected = estimateCost(prompt, MAX_OUTPUT_TOKENS, rates);
          if (!Number.isFinite(projected) || observedCost - costBaseline + projected > Number(input.max_cost_usd)) {
            await pushEvent({
              at: nowIso(),
              agent: reviewer,
              role: 'revision',
              status: 'blocked',
              message: `Cost guard blocked provider call before ${AGENT_LABELS[reviewer]}.`,
              cost_usd: projected,
            });
            await persistSession(
              db,
              id,
              { status: 'paused_cost_limit', observed_cost_usd: observedCost },
              { ifStatusIn: ['queued', 'running'] },
            );
            return;
          }
          // Cooperative cancellation (pre-call): a cancel can land during the
          // revision start event's await above; re-check immediately before the paid
          // reviewer call so it is not issued for a no-longer-running session.
          const beforeReviewLive = await loadSession(db, id);
          if (runnerStopRequested(beforeReviewLive)) {
            logMaestro('warn', 'session_interrupted', { session_id: id, status: beforeReviewLive?.status });
            return;
          }
          let result: ProviderCallResult;
          try {
            result = await callProvider(
              env,
              reviewer,
              prompt,
              input.models ?? {},
              MAX_OUTPUT_TOKENS,
              undefined,
              callOptions(),
            );
          } catch (error) {
            if (error instanceof ProviderCancelledError) {
              logMaestro('warn', 'session_interrupted', { session_id: id, reason: 'cancelled_during_review' });
              return;
            }
            // Canonical operational turn failure: skip the turn instead of
            // killing the session; three consecutive failures escalate.
            const action = await handleOperationalFailure(
              reviewer,
              error instanceof Error ? error.message : String(error),
            );
            if (action === 'stop') return;
            break;
          }
          const cost = calculateObservedCost(result, prompt, rates);
          observedCost += cost;
          // Cooperative cancellation (post-call): if cancelled while the reviewer
          // call was in flight, do not write revision artifacts/events for the
          // now-cancelled session.
          const afterReviewLive = await loadSession(db, id);
          if (runnerStopRequested(afterReviewLive)) {
            logMaestro('warn', 'session_interrupted', { session_id: id, status: afterReviewLive?.status });
            return;
          }
          // M3: an empty reviewer response is a provider failure, not a silent
          // NOT_READY vote — an operational turn failure, not a session error.
          if (!result.text.trim()) {
            await persistSession(db, id, { observed_cost_usd: observedCost });
            const action = await handleOperationalFailure(
              reviewer,
              `O provedor ${AGENT_LABELS[reviewer]} retornou uma revisao vazia (texto em branco).`,
            );
            if (action === 'stop') return;
            break;
          }
          const status = extractStatus(result.text);
          const report = extractTagged(result.text, 'maestro_revision_report');
          const revisedText = extractTagged(result.text, 'maestro_final_text');
          let effectiveStatus: 'READY' | 'NOT_READY' = status;
          let readyRejectedReason: string | null = null;
          // Structured audit context (canonical audit_context) of the unchanged
          // turn's release audit, propagated into the durable turn event.
          let unchangedAuditFailure: FinalReleaseAuditFailure | null = null;
          let contractError = validateSerialTurnOutput(result.text, status, report, revisedText);
          if (!contractError && revisedText === null) {
            // Desktop parity (unrevised-turn audit): an unchanged turn is a
            // finalization attempt, so it runs the FULL release audit
            // (bibliographic -> capacity -> HTTP, Plan D). A READY vote on a
            // custody text that fails is rewritten to NOT_READY without retry
            // (ReadyRejected); NOT_READY without a corrective text takes the
            // audit failure (or the unchanged-ban) to corrective retry.
            const custodyReleaseFailure = await cachedFinalReleaseAuditFailure(currentText);
            if (status === 'READY' && custodyReleaseFailure) {
              effectiveStatus = 'NOT_READY';
              readyRejectedReason = custodyReleaseFailure.reason;
              unchangedAuditFailure = custodyReleaseFailure;
            } else if (status === 'NOT_READY') {
              if (custodyReleaseFailure) unchangedAuditFailure = custodyReleaseFailure;
              contractError =
                custodyReleaseFailure?.reason ??
                'NOT_READY unchanged is not a valid serial-review outcome: the reviewer must either return READY unchanged when no blocker remains, or return a revised complete text that resolves the concrete blocker.';
            }
          }
          if (!contractError && revisedText !== null) {
            // Desktop parity (validate_serial_revised_content_lock): a revised
            // custody may only change/reorder/grow blocks declared in the
            // report's changed_blocks section; violations take the same
            // CONTRACT_VIOLATION corrective-retry path.
            contractError = validateRevisionContentLock(currentText, revisedText, report ?? '');
          }
          if (contractError) {
            const retryKey = `${round}:${roundTurnIndex}:${reviewer}:${currentText}`;
            const retryCount = (correctiveRetryCounts.get(retryKey) ?? 0) + 1;
            correctiveRetryCounts.set(retryKey, retryCount);
            // Desktop parity: any contract violation clears the cumulative
            // stable-approval set.
            stableApprovals.clear();
            artifactTurn += 1;
            await createArtifact(db, {
              sessionId: id,
              cycle: round,
              turn: artifactTurn,
              agent: reviewer,
              role: 'revision',
              status: 'blocked',
              title: input.title,
              contentMd: currentText,
              revisionReport: JSON.stringify({
                guard: 'serial_turn_contract',
                reclassified: 'CONTRACT_VIOLATION',
                reason: contractError,
                attempt: retryCount,
                attempted_report: (report ?? '').slice(0, 2000),
              }),
              linkAudit: [],
              costUsd: cost,
              model: result.model,
              previousArtifactId,
            });
            await pushEvent({
              at: nowIso(),
              agent: reviewer,
              role: 'revision',
              status: 'blocked',
              message: `Reclassificado para CONTRACT_VIOLATION: ${sanitizeText(contractError, 300)}`,
              cost_usd: cost,
              model: result.model,
              ...(unchangedAuditFailure
                ? {
                    final_audit: finalAuditEventField(unchangedAuditFailure),
                    ...(unchangedAuditFailure.context.rows
                      ? { link_audit: unchangedAuditFailure.context.rows as LinkAuditResult[] }
                      : {}),
                  }
                : {}),
            });
            await persistSession(db, id, { observed_cost_usd: observedCost });
            if (retryCount <= MAX_CORRECTIVE_CONTRACT_RETRIES_PER_TURN) {
              correctiveRetryCount = retryCount;
              continue;
            }
            // Desktop parity: an exhausted corrective-retry turn is an
            // operational failure — it feeds the same 3-strike escalation and
            // pauses the circuit when it lands on the round's closing turn.
            const action = await handleOperationalFailure(
              reviewer,
              'Corrective retries exhausted; reviewer turn skipped without a vote.',
            );
            if (action === 'stop') return;
            break;
          }
          const changedByReviewer = Boolean(revisedText && isSubstantiveEditorialChange(currentText, revisedText));
          if (
            revisedText !== null &&
            changedByReviewer &&
            qualityGuardBlocksRevision(currentAuthor, reviewer, currentText, revisedText, true)
          ) {
            // Desktop parity (anti-impoverishment quality ratchet): the shrunk
            // revision from a lower-tier reviewer is rejected and discarded; the
            // custody text and author stay unchanged and the session continues.
            artifactTurn += 1;
            await createArtifact(db, {
              sessionId: id,
              cycle: round,
              turn: artifactTurn,
              agent: reviewer,
              role: 'revision',
              status: 'blocked',
              title: input.title,
              contentMd: currentText,
              revisionReport: JSON.stringify({
                guard: 'anti_impoverishment_quality_ratchet',
                reason: 'Lower-tier reviewer shrank stronger custody text beyond the allowed ratio; revision rejected.',
                attempted_report: (report ?? '').slice(0, 2000),
              }),
              linkAudit: [],
              costUsd: cost,
              model: result.model,
              previousArtifactId,
            });
            await pushEvent({
              at: nowIso(),
              agent: reviewer,
              role: 'revision',
              status: 'blocked',
              message: 'Quality guard rejected lower-tier shrink revision; custody unchanged.',
              cost_usd: cost,
              model: result.model,
            });
            await persistSession(db, id, { observed_cost_usd: observedCost });
            // Desktop parity: the rejected revision clears the stable set and
            // the turn does NOT count as a valid round agent. The provider
            // itself responded, so the operational-outage streak resets.
            consecutiveOutages = 0;
            stableApprovals.clear();
            roundTurnIndex += 1;
            if (roundTurnIndex >= roundTurnCount) {
              round += 1;
              roundTurnIndex = 0;
              validRoundAgents.clear();
              stableApprovals.clear();
            }
            break;
          }
          const candidateText = revisedText && changedByReviewer ? revisedText : currentText;
          // Plan D canonical placement: revision turns carry no link audit —
          // links are audited only when a text attempts finalization.
          artifactTurn += 1;
          const artifact = await createArtifact(db, {
            sessionId: id,
            cycle: round,
            turn: artifactTurn,
            agent: reviewer,
            role: 'revision',
            status: effectiveStatus.toLowerCase(),
            title: input.title,
            contentMd: candidateText,
            revisionReport: report ?? '',
            linkAudit: [],
            costUsd: cost,
            model: result.model,
            previousArtifactId,
          });
          previousArtifactId = artifact.id;
          // Desktop parity: ReadyRejected turns do not count as valid round
          // agents; every other accepted turn feeds the closure gating. Any
          // accepted turn is a clean provider response: outage streak resets.
          consecutiveOutages = 0;
          if (readyRejectedReason === null) validRoundAgents.add(reviewer);
          if (revisedText && changedByReviewer) {
            // Substantive revision: custody transfers and the new version must
            // earn a fresh full rotation of independent approvals.
            currentText = revisedText;
            currentAuthor = reviewer;
            stableApprovals.clear();
          } else if (effectiveStatus === 'READY') {
            stableApprovals.add(reviewer);
          } else {
            stableApprovals.clear();
          }
          await pushEvent({
            at: nowIso(),
            agent: reviewer,
            role: 'revision',
            status: effectiveStatus === 'READY' ? 'ready' : 'not_ready',
            message: readyRejectedReason
              ? `READY rejected by release gate: ${sanitizeText(readyRejectedReason, 300)}`
              : changedByReviewer
                ? 'Reviewer revised custody text.'
                : 'Reviewer left custody unchanged.',
            cost_usd: cost,
            model: result.model,
            ...(unchangedAuditFailure && readyRejectedReason
              ? {
                  final_audit: finalAuditEventField(unchangedAuditFailure),
                  ...(unchangedAuditFailure.context.rows
                    ? { link_audit: unchangedAuditFailure.context.rows as LinkAuditResult[] }
                    : {}),
                }
              : {}),
          });
          // Do NOT re-assert status:'running' here. The session is already
          // 'running'; rewriting it would clobber a concurrent operator cancel
          // (blocked_cancelled) that landed during this turn, defeating the
          // cooperative-cancel check at the top of the next iteration.
          await persistSession(db, id, {
            current_author: currentAuthor,
            current_text: currentText,
            observed_cost_usd: observedCost,
          });
          roundTurnIndex += 1;
          if (roundTurnIndex >= roundTurnCount) {
            round += 1;
            roundTurnIndex = 0;
            validRoundAgents.clear();
          }
          break;
        }
      }
    }

    if (converged) {
      // Desktop parity (final release audit, all three canonical stages):
      // bibliographic integrity -> link-audit capacity (> 30 unique URLs) ->
      // HTTP link audit (any error/blocked row). A unanimous version that
      // fails any stage is not deliverable and pauses for the operator.
      // Canonical parity: the finalization gate re-runs the audit FRESH (the
      // desktop has no cache here — a link that died between the last vote and
      // finalization must still pause). The per-execution cache only serves
      // the repeated unchanged-turn votes.
      const finalGateFailure = await finalReleaseAuditFailure(currentText);
      if (finalGateFailure) {
        const auditRows = finalGateFailure.context.rows as LinkAuditResult[] | undefined;
        // Canonical macro parity (pause_final_reference_audit!): the pause is
        // logged with the FULL structured audit context, and the event carries
        // a compact context summary (gate/policy/counts) plus the rows.
        logMaestro('warn', 'session_final_reference_audit_blocked', {
          session_id: id,
          reason: finalGateFailure.reason,
          audit: finalGateFailure.context,
        });
        await pushEvent({
          at: nowIso(),
          status: 'blocked',
          message: `Final release audit failed (${finalGateFailure.context.gate}): ${sanitizeText(
            finalGateFailure.reason,
            300,
          )}`,
          final_audit: finalAuditEventField(finalGateFailure),
          ...(auditRows ? { link_audit: auditRows } : {}),
        });
        await persistSession(
          db,
          id,
          {
            status: 'paused_final_audit',
            current_author: currentAuthor,
            current_text: currentText,
            observed_cost_usd: observedCost,
            events_json: JSON.stringify(events),
            error: finalGateFailure.reason,
          },
          { ifStatusIn: ['queued', 'running'] },
        );
        return;
      }
    }
    await pushEvent({
      at: nowIso(),
      status: 'finished',
      message: converged ? 'All eligible reviewers returned READY.' : 'Maximum cycles reached without unanimity.',
    });
    logMaestro(converged ? 'info' : 'warn', 'session_finished', {
      session_id: id,
      status: converged ? 'converged' : 'blocked_max_cycles',
      observed_cost_usd: observedCost,
      current_author: currentAuthor,
    });
    await persistSession(
      db,
      id,
      {
        status: converged ? 'converged' : 'blocked_max_cycles',
        current_author: currentAuthor,
        current_text: currentText,
        final_text: converged ? currentText : null,
        observed_cost_usd: observedCost,
        events_json: JSON.stringify(events),
      },
      { ifStatusIn: ['queued', 'running'] },
    );
  } catch (error) {
    logMaestro('error', 'session_failed', {
      session_id: id,
      message: error instanceof Error ? error.message : String(error),
      observed_cost_usd: observedCost,
    });
    await pushEvent({
      at: nowIso(),
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown Maestro AI failure.',
    });
    await persistSession(
      db,
      id,
      {
        status: 'error',
        observed_cost_usd: observedCost,
        events_json: JSON.stringify(events),
        error: error instanceof Error ? error.message : String(error),
      },
      { ifStatusIn: ['queued', 'running'] },
    );
  }
}

async function resolveStartRequest(
  env: MaestroAiEnv,
  db: D1Database,
  body: MaestroSessionRequest,
): Promise<{ ok: true; value: MaestroResolvedSessionInput } | { ok: false; error: string }> {
  const settings = await loadSettings(db);
  const rates = settingsRates(settings);
  const models = settingsModels(settings);
  const title = sanitizeText(body.title || 'Sessao Maestro AI', 200);
  const prompt = sanitizeText(body.prompt, 40_000);
  const protocolText = sanitizeText(settings.protocol_text, 160_000);
  const eligibleAgents = configuredAgents(env, rates);
  const initialAgent = sanitizeAgent(body.initial_agent, eligibleAgents[0] ?? 'claude');
  const requestedAgents =
    Array.isArray(body.active_agents) && body.active_agents.length > 0 ? body.active_agents : eligibleAgents;
  const activeAgents = sanitizeAgents(requestedAgents, initialAgent).filter((agent) => eligibleAgents.includes(agent));
  const maxCostUsd = Number(body.max_cost_usd ?? settings.max_cost_usd);
  const maxRuntimeMinutes =
    settings.max_runtime_minutes == null || Number(settings.max_runtime_minutes) <= 0
      ? null
      : Number(settings.max_runtime_minutes);
  const maxCycles = Number(settings.max_cycles ?? 2);
  if (!prompt) return { ok: false, error: 'Prompt editorial obrigatorio.' };
  if (protocolText.length < 100)
    return { ok: false, error: 'Configure e salve o protocolo editorial integral antes de iniciar.' };
  if (activeAgents.length < 2) {
    return { ok: false, error: 'Configure pelo menos dois agentes com chave e tarifas antes de iniciar.' };
  }
  if (!Number.isFinite(maxCostUsd) || maxCostUsd <= 0) {
    return { ok: false, error: 'Teto financeiro em USD e obrigatorio nas configuracoes ou na sessao.' };
  }
  if (!Number.isInteger(maxCycles) || maxCycles < 1 || maxCycles > 5) {
    return { ok: false, error: 'Ciclos maximos devem estar entre 1 e 5 nas configuracoes.' };
  }
  for (const agent of activeAgents) {
    if (!secretForAgent(env, agent)) {
      return { ok: false, error: `${AGENT_LABELS[agent]} sem secret configurado no admin-motor.` };
    }
    if (!hasPositiveRates(rates[agent])) {
      return { ok: false, error: `Configure tarifas de entrada e saida para ${AGENT_LABELS[agent]}.` };
    }
  }
  return {
    ok: true,
    value: {
      title,
      prompt,
      protocol_text: protocolText,
      initial_agent: activeAgents.includes(initialAgent) ? initialAgent : activeAgents[0],
      active_agents: activeAgents,
      initial_content: sanitizeText(body.initial_content, 120_000),
      max_cost_usd: maxCostUsd,
      max_runtime_minutes: maxRuntimeMinutes,
      rates,
      models,
      max_cycles: maxCycles,
    },
  };
}

export async function handleMaestroAiSessionsGet(context: RequestContext, sessionId?: string): Promise<Response> {
  try {
    const db = requireDb(context.env);
    await ensureSchema(db);
    if (sessionId) {
      const row = await loadSession(db, sessionId);
      if (!row) return json({ ok: false, error: 'Sessao Maestro AI nao encontrada.' }, 404);
      return json({ ok: true, session: publicSession(row) });
    }
    const rows = await db
      .prepare(
        `SELECT id, title, status, initial_agent, active_agents_json, current_author, current_text, final_text,
                observed_cost_usd, max_cost_usd, max_runtime_minutes, max_cycles, events_json, created_at, updated_at, error
         FROM maestro_ai_sessions
         ORDER BY updated_at DESC
         LIMIT 30`,
      )
      .all<MaestroSessionRow>();
    return json({ ok: true, sessions: rows.results.map(publicSession) });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Erro ao listar Maestro AI.' }, 500);
  }
}

export async function handleMaestroAiSessionsPost(context: RequestContext): Promise<Response> {
  try {
    const db = requireDb(context.env);
    await ensureSchema(db);
    const body = (await context.request.json()) as MaestroSessionRequest;
    const validated = await resolveStartRequest(context.env, db, body);
    if (!validated.ok) return json({ ok: false, error: validated.error }, 400);

    const id = `web-${crypto.randomUUID()}`;
    const createdAt = nowIso();
    const initialEvent: SessionEvent = {
      at: createdAt,
      status: 'queued',
      message: 'Maestro AI web session queued.',
    };
    await db
      .prepare(
        `INSERT INTO maestro_ai_sessions (
          id, title, prompt, protocol_text, initial_agent, active_agents_json,
          current_author, current_text, final_text, status, observed_cost_usd,
          max_cost_usd, max_runtime_minutes, max_cycles, rates_json, models_json, events_json, created_at, updated_at, error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        validated.value.title,
        validated.value.prompt,
        validated.value.protocol_text,
        validated.value.initial_agent,
        JSON.stringify(validated.value.active_agents),
        null,
        sanitizeText(validated.value.initial_content, 120_000),
        null,
        'queued',
        0,
        validated.value.max_cost_usd,
        validated.value.max_runtime_minutes,
        validated.value.max_cycles,
        JSON.stringify(validated.value.rates ?? {}),
        JSON.stringify(validated.value.models ?? {}),
        JSON.stringify([initialEvent]),
        createdAt,
        createdAt,
        null,
      )
      .run();

    const runPromise = runSession(db, context.env, id);
    context.waitUntil?.(runPromise);
    const row = await loadSession(db, id);
    return json({ ok: true, session: row ? publicSession(row) : { id } }, 202);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Erro ao iniciar Maestro AI.' }, 500);
  }
}

export async function handleMaestroAiArtifactsGet(
  context: RequestContext,
  sessionId: string,
  artifactId?: string,
): Promise<Response> {
  try {
    const db = requireDb(context.env);
    await ensureSchema(db);
    const session = await loadSession(db, sessionId);
    if (!session) return json({ ok: false, error: 'Sessao Maestro AI nao encontrada.' }, 404);
    if (artifactId) {
      const artifact = await db
        .prepare('SELECT * FROM maestro_ai_artifacts WHERE session_id = ? AND id = ? LIMIT 1')
        .bind(sessionId, artifactId)
        .first<MaestroArtifactRow>();
      if (!artifact) return json({ ok: false, error: 'Artefato Maestro AI nao encontrado.' }, 404);
      const previous = artifact.previous_artifact_id
        ? await db
            .prepare('SELECT * FROM maestro_ai_artifacts WHERE session_id = ? AND id = ? LIMIT 1')
            .bind(sessionId, artifact.previous_artifact_id)
            .first<MaestroArtifactRow>()
        : null;
      return json({ ok: true, artifact: publicArtifactDetail(artifact, previous) });
    }
    const rows = await db
      .prepare(
        `SELECT id, session_id, cycle, turn, agent, role, status, title, content_md, revision_report_json,
                link_audit_json, cost_usd, model, previous_artifact_id, content_bytes, created_at
         FROM maestro_ai_artifacts
         WHERE session_id = ?
         ORDER BY cycle ASC, turn ASC`,
      )
      .bind(sessionId)
      .all<MaestroArtifactRow>();
    return json({ ok: true, artifacts: rows.results.map(publicArtifactSummary) });
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao carregar autos Maestro AI.' },
      500,
    );
  }
}

export async function handleMaestroAiSettingsGet(context: RequestContext): Promise<Response> {
  try {
    const db = requireDb(context.env);
    await ensureSchema(db);
    const row = await loadSettings(db);
    return json({ ok: true, settings: publicSettings(context.env, row) });
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao carregar configuracoes Maestro AI.' },
      500,
    );
  }
}

export async function handleMaestroAiSettingsPut(context: RequestContext): Promise<Response> {
  try {
    const db = requireDb(context.env);
    await ensureSchema(db);
    const current = await loadSettings(db);
    const body = (await context.request.json()) as MaestroSettingsRequest;
    const protocolText = sanitizeText(body.protocol_text ?? current.protocol_text, 160_000);
    const maxCostUsd = Number(body.max_cost_usd ?? current.max_cost_usd);
    // Distinguish "field present and null" (clear the limit) from "field absent"
    // (keep current). A bare `??` treats an explicit null as absent, making the
    // limit impossible to clear back to "no limit" once set.
    const rawRuntimeLimit = Object.hasOwn(body, 'max_runtime_minutes')
      ? body.max_runtime_minutes
      : current.max_runtime_minutes;
    const maxRuntimeMinutes = rawRuntimeLimit == null || Number(rawRuntimeLimit) <= 0 ? null : Number(rawRuntimeLimit);
    const maxCycles = Number(body.max_cycles ?? current.max_cycles);
    if (protocolText.length < 100) {
      return json({ ok: false, error: 'Protocolo editorial integral deve ter pelo menos 100 caracteres.' }, 400);
    }
    if (!Number.isFinite(maxCostUsd) || maxCostUsd <= 0) {
      return json({ ok: false, error: 'Teto financeiro em USD deve ser positivo.' }, 400);
    }
    if (!Number.isInteger(maxCycles) || maxCycles < 1 || maxCycles > 5) {
      return json({ ok: false, error: 'Ciclos maximos devem ser um inteiro entre 1 e 5.' }, 400);
    }
    if (
      maxRuntimeMinutes != null &&
      (!Number.isFinite(maxRuntimeMinutes) || maxRuntimeMinutes < 1 || maxRuntimeMinutes > 720)
    ) {
      return json({ ok: false, error: 'Limite de tempo opcional deve ficar entre 1 e 720 minutos.' }, 400);
    }
    const rates = sanitizeRates(body.rates ?? parseJson(current.rates_json, defaultRates()));
    const models = sanitizeModels(body.models ?? parseJson(current.models_json, DEFAULT_MODELS));
    const configuredSecrets = parseJson<Partial<Record<ProviderKey, boolean>>>(current.configured_secrets_json, {});
    const apiKeys = body.api_keys && typeof body.api_keys === 'object' ? body.api_keys : {};
    for (const agent of PROVIDER_KEYS) {
      const value = apiKeys[agent];
      if (typeof value === 'string' && value.trim()) {
        await upsertSecretStoreSecret(context.env, agent, value);
        configuredSecrets[agent] = true;
      }
    }
    const updatedAt = nowIso();
    await db
      .prepare(
        `INSERT INTO maestro_ai_settings (
          id, protocol_text, max_cost_usd, max_runtime_minutes, max_cycles, configured_secrets_json, rates_json, models_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          protocol_text = excluded.protocol_text,
          max_cost_usd = excluded.max_cost_usd,
          max_runtime_minutes = excluded.max_runtime_minutes,
          max_cycles = excluded.max_cycles,
          configured_secrets_json = excluded.configured_secrets_json,
          rates_json = excluded.rates_json,
          models_json = excluded.models_json,
          updated_at = excluded.updated_at`,
      )
      .bind(
        SETTINGS_ID,
        protocolText,
        maxCostUsd,
        maxRuntimeMinutes,
        maxCycles,
        JSON.stringify(configuredSecrets),
        JSON.stringify(rates),
        JSON.stringify(models),
        updatedAt,
      )
      .run();
    logMaestro('info', 'settings_saved', {
      updated_api_keys: PROVIDER_KEYS.filter(
        (agent) => typeof apiKeys[agent] === 'string' && Boolean(apiKeys[agent]?.trim()),
      ),
      max_cost_usd: maxCostUsd,
      max_runtime_minutes: maxRuntimeMinutes,
      max_cycles: maxCycles,
    });
    const row = await loadSettings(db);
    return json({ ok: true, settings: publicSettings(context.env, row) });
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao salvar configuracoes Maestro AI.' },
      500,
    );
  }
}

export async function handleMaestroAiSettingsTestPost(context: RequestContext): Promise<Response> {
  try {
    const db = requireDb(context.env);
    await ensureSchema(db);
    const row = await loadSettings(db);
    const models = settingsModels(row);
    const rates = settingsRates(row);
    const results: Array<{ agent: ProviderKey; ok: boolean; message: string; model?: string }> = [];
    for (const agent of PROVIDER_KEYS) {
      if (!secretForAgent(context.env, agent)) {
        results.push({ agent, ok: false, message: 'Chave nao configurada.' });
        continue;
      }
      if (!hasPositiveRates(rates[agent])) {
        results.push({ agent, ok: false, message: 'Tarifas financeiras ausentes.' });
        continue;
      }
      try {
        const result = await callProvider(context.env, agent, API_TEST_PROMPT, models, 256, API_TEST_SYSTEM);
        results.push(publicApiHealthResult(agent, result));
      } catch (error) {
        results.push({
          agent,
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    logMaestro('info', 'api_test_finished', {
      total: results.length,
      failed: results.filter((result) => !result.ok).length,
      failed_agents: results
        .filter((result) => !result.ok)
        .map((result) => ({
          agent: result.agent,
          model: result.model ?? models[result.agent],
          message: sanitizeText(result.message, 300),
        })),
    });
    return json({ ok: true, results });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Erro ao testar APIs Maestro AI.' }, 500);
  }
}

export async function handleMaestroAiSessionContentPut(context: RequestContext, sessionId: string): Promise<Response> {
  try {
    const db = requireDb(context.env);
    await ensureSchema(db);
    const body = (await context.request.json()) as { title?: string; content?: string };
    const row = await loadSession(db, sessionId);
    if (!row) return json({ ok: false, error: 'Sessao Maestro AI nao encontrada.' }, 404);
    if (row.status === 'running' || row.status === 'queued') {
      return json(
        { ok: false, error: 'Sessao em execucao; aguarde terminar ou cancele antes de editar o conteudo.' },
        409,
      );
    }
    // Fallback simétrico: title e content ausentes preservam o valor atual.
    // Sem isso, `content` omitido apagaria current_text (sanitizeText(undefined) === '').
    await db
      .prepare('UPDATE maestro_ai_sessions SET title = ?, current_text = ?, updated_at = ? WHERE id = ?')
      .bind(
        sanitizeText(body.title ?? row.title, 200),
        sanitizeText(body.content ?? row.current_text, 160_000),
        nowIso(),
        sessionId,
      )
      .run();
    const next = await loadSession(db, sessionId);
    return json({ ok: true, session: next ? publicSession(next) : null });
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao salvar conteudo Maestro AI.' },
      500,
    );
  }
}

const ACTIVE_SESSION_STATUSES = new Set(['queued', 'running']);

/**
 * P0: operator-driven cancellation. A session whose runner is wedged (or simply
 * unwanted) can be moved to a terminal state without surgery on D1. The running
 * runner detects this between turns (cooperative cancel) and stops.
 */
export async function handleMaestroAiSessionCancelPost(context: RequestContext, sessionId: string): Promise<Response> {
  try {
    const db = requireDb(context.env);
    await ensureSchema(db);
    const row = await loadSession(db, sessionId);
    if (!row) return json({ ok: false, error: 'Sessao Maestro AI nao encontrada.' }, 404);
    if (!ACTIVE_SESSION_STATUSES.has(row.status)) {
      return json({ ok: false, error: 'Sessao ja finalizada; nada a cancelar.' }, 409);
    }
    const events = parseJson<SessionEvent[]>(row.events_json, []);
    events.push({ at: nowIso(), status: 'blocked', message: 'Sessao cancelada pelo operador.' });
    await persistSession(
      db,
      sessionId,
      {
        status: 'blocked_cancelled',
        events_json: JSON.stringify(events),
        error: 'Sessao cancelada pelo operador.',
      },
      { ifStatusIn: ['queued', 'running'] },
    );
    const next = await loadSession(db, sessionId);
    return json({ ok: true, session: next ? publicSession(next) : null });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Erro ao cancelar Maestro AI.' }, 500);
  }
}

export async function handleMaestroAiSessionResumePost(context: RequestContext, sessionId: string): Promise<Response> {
  try {
    const db = requireDb(context.env);
    await ensureSchema(db);
    const row = await loadSession(db, sessionId);
    if (!row) return json({ ok: false, error: 'Sessao Maestro AI nao encontrada.' }, 404);
    if (ACTIVE_SESSION_STATUSES.has(row.status)) {
      return json({ ok: false, error: 'Sessao ainda ativa; nada a retomar.' }, 409);
    }
    if (!RESUMABLE_STATUSES.has(row.status) || row.final_text != null) {
      return json({ ok: false, error: 'Sessao concluida; nada a retomar.' }, 409);
    }
    const events = parseJson<SessionEvent[]>(row.events_json, []);
    events.push({ at: nowIso(), status: 'running', message: 'Sessao retomada pelo operador.' });
    const applied = await persistSession(
      db,
      sessionId,
      { status: 'queued', events_json: JSON.stringify(events), error: null },
      { ifStatusIn: [row.status] },
    );
    if (!applied) {
      // CAS lost: a concurrent resume/cancel changed the row after our read.
      // The winner (if any) already dispatched a runner — do NOT dispatch another.
      return json({ ok: false, error: 'Sessao mudou de estado durante a retomada; tente novamente.' }, 409);
    }
    const resumed = await loadSession(db, sessionId);
    if (resumed?.status !== 'queued') {
      return json({ ok: false, error: 'Sessao mudou de estado durante a retomada; tente novamente.' }, 409);
    }
    const runPromise = runSession(db, context.env, sessionId);
    context.waitUntil?.(runPromise);
    return json({ ok: true, session: publicSession(resumed) }, 202);
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Erro ao retomar Maestro AI.' }, 500);
  }
}

// A session whose updated_at has not advanced within this window while still in
// a non-terminal state is considered orphaned (the waitUntil runner was evicted
// or the worker was redeployed mid-run) and is swept to a terminal state.
const STALE_SESSION_MS = 10 * 60_000;

/**
 * P0: reap orphaned sessions. The runner advances updated_at after every turn,
 * so a queued/running row that has been silent past STALE_SESSION_MS will never
 * complete on its own — move it to a terminal 'error' instead of leaving it
 * stuck forever. Returns the number of sessions reaped.
 */
async function sweepStaleSessions(db: D1Database, nowMs = Date.now()): Promise<number> {
  const rows = await db
    .prepare("SELECT id, status, updated_at FROM maestro_ai_sessions WHERE status IN ('queued', 'running')")
    .bind()
    .all<{ id: string; status: string; updated_at: string }>();
  let reaped = 0;
  for (const row of rows.results) {
    if (row.status !== 'queued' && row.status !== 'running') continue;
    const updatedMs = Date.parse(String(row.updated_at));
    if (Number.isFinite(updatedMs) && nowMs - updatedMs > STALE_SESSION_MS) {
      await persistSession(
        db,
        row.id,
        {
          status: 'error',
          error:
            'Sessao interrompida: o processamento nao avancou dentro do tempo esperado e foi encerrado automaticamente.',
        },
        { ifStatusIn: ['queued', 'running'] },
      );
      reaped += 1;
    }
  }
  return reaped;
}

/** Cron entry point: ensure the schema exists and reap stale sessions. */
export async function runMaestroSweep(env: MaestroAiEnv): Promise<number> {
  const db = env.BIGDATA_DB;
  if (!db) return 0;
  await ensureSchema(db);
  return sweepStaleSessions(db);
}
