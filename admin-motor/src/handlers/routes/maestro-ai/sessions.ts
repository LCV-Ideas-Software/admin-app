import { GoogleGenAI } from '@google/genai';
import { toHeaders } from '../../../../../functions/api/_lib/mainsite-admin';

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
};

type LinkAuditResult = {
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
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
  return cloudflareRequest<SecretStoreSecret[]>(
    env,
    `/accounts/${encodeURIComponent(accountId)}/secrets_store/stores/${encodeURIComponent(storeId)}/secrets`,
  );
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

function validateRevisionGuard(
  previousText: string,
  candidateText: string,
  status: string,
  revisionReport: string,
): string | null {
  const previous = previousText.trim();
  const candidate = candidateText.trim();
  if (!candidate || candidate === previous) return null;
  if (status === 'READY') {
    return 'READY reviewers cannot alter custody text; READY means the current text is accepted unchanged.';
  }
  const previousLength = previous.length;
  const candidateLength = candidate.length;
  if (previousLength >= 1200 && candidateLength < previousLength * 0.85) {
    return `Revision rejected by anti-impoverishment guard: candidate length ${candidateLength} is below 85% of previous length ${previousLength}.`;
  }
  if (revisionReport.trim().length < 80) {
    return 'Revision changed custody text without a substantive revision report.';
  }
  if (!/(alter|change|linha|line|protocol|rule|corre|corrig|improv|melhor|justific|basis)/i.test(revisionReport)) {
    return 'Revision report does not identify concrete changed lines, protocol basis, or correction rationale.';
  }
  return null;
}

function runtimeLimitExceeded(startedAtMs: number, maxRuntimeMinutes?: number | null): boolean {
  if (!Number.isFinite(Number(maxRuntimeMinutes)) || Number(maxRuntimeMinutes) <= 0) return false;
  return Date.now() - startedAtMs > Number(maxRuntimeMinutes) * 60_000;
}

function extractStatus(text: string): 'READY' | 'NOT_READY' {
  const cleaned = text.replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, '').trim();
  const first = cleaned.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  return /\bMAESTRO_STATUS\s*:\s*READY\b/i.test(first) ? 'READY' : 'NOT_READY';
}

function extractTagged(text: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`, 'i').exec(text);
  return match?.[1]?.trim() || null;
}

/**
 * Block link-audit fetches against private, loopback, link-local and internal
 * hosts. The audited text is LLM-authored (and may be steered by untrusted web
 * search content), so the auto-fetch must never reach internal infrastructure
 * (SSRF). Returns true when the host must NOT be fetched.
 */
/** True when an IPv4 literal falls in a private / loopback / link-local / unspecified range. */
function isPrivateIpv4(host: string): boolean {
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!ipv4) return false;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
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
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.internal') || host.endsWith('.local')) return true;
  // Bare single-label hostnames (no dot) resolve to internal names.
  if (!host.includes('.') && !host.includes(':')) return true;

  // IPv4 literal in private / loopback / link-local / unspecified ranges.
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return isPrivateIpv4(host);
  }

  // IPv6 loopback / unspecified / unique-local (fc00::/7) / link-local (fe80::/10).
  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true;
    if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
    if (/^fe[89ab][0-9a-f]:/.test(host)) return true;
    // IPv4-mapped / IPv4-compatible IPv6 (e.g. ::ffff:127.0.0.1): apply the
    // IPv4 private-range check to the embedded address.
    const embedded = embeddedIpv4FromIpv6(host);
    if (embedded) return isPrivateIpv4(embedded);
    return false;
  }

  return false;
}

function extractUrls(text: string): string[] {
  const urls = new Set<string>();
  for (const match of text.matchAll(/https?:\/\/[^\s<>"')\]}]+/gi)) {
    const url = match[0].replace(/[.,;:!?]+$/g, '');
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      // Blocked (internal/private) hosts are NOT filtered out here: checkOneLink
      // rejects them as broken WITHOUT fetching, so an internal URL in the
      // content surfaces as an audit failure instead of being silently dropped.
      urls.add(parsed.toString());
    } catch {
      // Ignore malformed candidates; the checker reports only concrete URLs.
    }
  }
  return [...urls].slice(0, 40);
}

/** A 5xx or 429 may be momentary; everything else (e.g. 404) is decisive. */
function isRetryableLinkStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

type LinkAttempt = { ok: boolean; status?: number; error?: string; retryable: boolean };

/**
 * One link-reachability attempt. Follows redirects MANUALLY (bounded) so a
 * public link that redirects into an internal host is never fetched (SSRF
 * pivot), while a public redirect chain is still followed to its final status
 * so a redirect that ends in a 404 is correctly reported as broken.
 */
async function attemptLink(url: string, timeoutMs = 8000): Promise<LinkAttempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headOrGet = async (target: string): Promise<Response> => {
    let res = await fetch(target, { method: 'HEAD', redirect: 'manual', signal: controller.signal });
    if (res.status === 405 || res.status === 403) {
      res = await fetch(target, { method: 'GET', redirect: 'manual', signal: controller.signal });
    }
    return res;
  };
  try {
    let current = url;
    let response = await headOrGet(current);
    for (let hops = 0; response.status >= 300 && response.status < 400 && hops < 3; hops += 1) {
      const location = response.headers.get('location');
      if (!location) break; // 3xx without Location — stop following; judged not-reachable by the 2xx check below.
      let target: URL;
      try {
        target = new URL(location, current);
      } catch {
        return { ok: false, status: response.status, error: 'redirect invalido', retryable: false };
      }
      if (target.protocol !== 'http:' && target.protocol !== 'https:') {
        return { ok: false, status: response.status, error: 'redirect nao-http', retryable: false };
      }
      if (isBlockedAuditHost(target.hostname)) {
        return { ok: false, status: response.status, error: 'redirect para host bloqueado', retryable: false };
      }
      current = target.toString();
      response = await headOrGet(current);
    }
    // After resolving redirects ourselves, only a final 2xx confirms the link is
    // reachable. A leftover 3xx (redirect without a Location header, or a chain
    // still redirecting past the hop limit) is NOT confirmed and counts as broken.
    const ok = response.status >= 200 && response.status < 300;
    return { ok, status: response.status, retryable: !ok && isRetryableLinkStatus(response.status) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? sanitizeText(error.message, 240) : String(error),
      retryable: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkOneLink(url: string): Promise<LinkAuditResult> {
  // A blocked (internal/private/loopback) host is reported as broken WITHOUT any
  // fetch — this is the single point that both prevents SSRF and surfaces an
  // internal URL in the content as an audit failure (extractUrls no longer drops it).
  try {
    if (isBlockedAuditHost(new URL(url).hostname)) {
      return { url, ok: false, error: 'host bloqueado' };
    }
  } catch {
    return { url, ok: false, error: 'url invalida' };
  }
  // A single retry absorbs a momentary failure (timeout / network / 429 / 5xx)
  // without giving a PERSISTENTLY broken link a free pass: if the retry also
  // fails, the link is reported as broken and the session is blocked.
  let attempt = await attemptLink(url);
  if (!attempt.ok && attempt.retryable) {
    attempt = await attemptLink(url);
  }
  return {
    url,
    ok: attempt.ok,
    ...(attempt.status !== undefined ? { status: attempt.status } : {}),
    ...(attempt.error !== undefined ? { error: attempt.error } : {}),
  };
}

async function auditLinks(text: string): Promise<LinkAuditResult[]> {
  const urls = extractUrls(text);
  if (urls.length === 0) return [];
  return Promise.all(urls.map((url) => checkOneLink(url)));
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

function buildRevisionPrompt(args: {
  input: MaestroResolvedSessionInput;
  runId: string;
  turn: number;
  currentText: string;
  currentAuthor: ProviderKey;
  reviewer: ProviderKey;
  history: SessionEvent[];
}): string {
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

## Required Output Contract

The answer MUST contain exactly these parts:

1. First line: MAESTRO_STATUS: READY or MAESTRO_STATUS: NOT_READY.
2. <maestro_revision_report> containing en_US JSON-like audit data with reviewer, current_author, status, changes, out_of_scope, quality_preservation, and custody.
3. Include <maestro_final_text> containing only the complete operator-facing article in pt_BR only when custody is "revised".
4. If custody is "unchanged", omit <maestro_final_text> entirely. Do not repeat the current article.

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
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Provider request excedeu o tempo limite de ${Math.round(timeoutMs / 1000)}s.`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
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

async function callProvider(
  env: MaestroAiEnv,
  agent: ProviderKey,
  prompt: string,
  models: Partial<Record<ProviderKey, string>>,
  maxOutputTokens = MAX_OUTPUT_TOKENS,
  systemOverride?: string,
): Promise<ProviderCallResult> {
  const apiKey = secretForAgent(env, agent);
  if (!apiKey) throw new Error(`${AGENT_LABELS[agent]} API key is not configured in admin-motor secrets.`);
  const model = sanitizeText(models[agent], 120) || DEFAULT_MODELS[agent];
  const system =
    systemOverride ??
    `You are ${AGENT_LABELS[agent]} inside Maestro Editorial AI. Internal coordination must be in en_US. Operator-facing deliverables must be in pt_BR. Follow the current Maestro role contract exactly.`;

  if (agent === 'gemini') {
    const ai = new GoogleGenAI({ apiKey });
    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: `${system}\n\n${prompt}`,
        config: { temperature: 0.2, topP: 0.9, maxOutputTokens },
      }),
      PROVIDER_TIMEOUT_MS,
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
  const response = await fetchWithTimeout(request.endpoint, request.init);
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

export const maestroAiTestHooks = {
  buildProviderHttpRequest,
  publicApiHealthResult,
  validateRevisionGuard,
  isBlockedAuditHost,
  extractUrls,
  checkOneLink,
  fetchWithTimeout,
  persistSession,
  runSession,
  sweepStaleSessions,
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
 */
async function persistSession(
  db: D1Database,
  id: string,
  patch: SessionPatch,
  opts: { ifStatusIn?: readonly string[] } = {},
): Promise<void> {
  const assignments: string[] = [];
  const values: unknown[] = [];
  for (const column of PERSIST_COLUMNS) {
    if (Object.hasOwn(patch, column)) {
      assignments.push(`${column} = ?`);
      values.push(patch[column]);
    }
  }
  if (assignments.length === 0) return;
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
  await db
    .prepare(`UPDATE maestro_ai_sessions SET ${assignments.join(', ')} WHERE ${where}`)
    .bind(...values)
    .run();
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
  const startedAtMs = Date.now();

  try {
    logMaestro('info', 'session_started', { session_id: id, initial_agent: initialAgent, active_agents: activeAgents });
    await pushEvent({
      at: nowIso(),
      agent: initialAgent,
      role: 'draft',
      status: 'running',
      message: 'Draft call started.',
    });
    const draftPrompt = buildDraftPrompt(input, id);
    const draftRates = input.rates?.[initialAgent] ?? {};
    const projectedDraftCost = estimateCost(draftPrompt, MAX_OUTPUT_TOKENS, draftRates);
    if (!Number.isFinite(projectedDraftCost) || observedCost + projectedDraftCost > Number(input.max_cost_usd)) {
      throw new Error(`Cost guard blocked initial draft before provider call (${AGENT_LABELS[initialAgent]}).`);
    }
    const draft = await callProvider(env, initialAgent, draftPrompt, input.models ?? {});
    const draftCost = calculateObservedCost(draft, draftPrompt, draftRates);
    observedCost += draftCost;
    let currentText = draft.text;
    // M3: an empty provider response (e.g. a thinking-only completion) must not
    // silently start a paid review chain over a blank text. Fail fast.
    if (!currentText.trim()) {
      throw new Error(`O provedor ${AGENT_LABELS[initialAgent]} retornou um rascunho vazio (texto em branco).`);
    }
    let currentLinkAudit = await auditLinks(currentText);
    // M4: only a genuinely broken link (4xx other than 429) blocks the session.
    // Transient failures (timeout / network / 429 / 5xx) must not terminate a
    // paid session — they are logged but the run proceeds.
    const brokenDraftLinks = currentLinkAudit.filter((result) => !result.ok);
    artifactTurn += 1;
    const draftArtifact = await createArtifact(db, {
      sessionId: id,
      cycle: 0,
      turn: artifactTurn,
      agent: initialAgent,
      role: 'draft',
      status: brokenDraftLinks.length ? 'blocked' : 'ready',
      title: input.title,
      contentMd: currentText,
      revisionReport: JSON.stringify({
        reviewer: initialAgent,
        role: 'initial_drafter',
        status: brokenDraftLinks.length ? 'blocked' : 'ready',
        custody: 'created',
      }),
      linkAudit: currentLinkAudit,
      costUsd: draftCost,
      model: draft.model,
      previousArtifactId,
    });
    previousArtifactId = draftArtifact.id;
    await pushEvent({
      at: nowIso(),
      agent: initialAgent,
      role: 'draft',
      status: brokenDraftLinks.length ? 'blocked' : 'ready',
      message: brokenDraftLinks.length
        ? `Initial draft produced with ${brokenDraftLinks.length} broken link(s).`
        : 'Initial draft produced.',
      cost_usd: draftCost,
      model: draft.model,
      link_audit: currentLinkAudit,
    });
    if (brokenDraftLinks.length) {
      await persistSession(
        db,
        id,
        {
          status: 'blocked_link_audit',
          current_author: currentAuthor,
          current_text: currentText,
          observed_cost_usd: observedCost,
          error: `Link audit blocked draft: ${brokenDraftLinks
            .map((result) => `${result.url} (${result.status ?? result.error ?? 'invalid'})`)
            .join('; ')}`,
        },
        { ifStatusIn: ['queued', 'running'] },
      );
      return;
    }
    await persistSession(
      db,
      id,
      { status: 'running', current_author: currentAuthor, current_text: currentText, observed_cost_usd: observedCost },
      { ifStatusIn: ['queued', 'running'] },
    );

    const order = [
      ...activeAgents.slice(activeAgents.indexOf(initialAgent) + 1),
      ...activeAgents.slice(0, activeAgents.indexOf(initialAgent)),
      initialAgent,
    ];
    let converged = false;
    const maxCycles = Math.max(1, Math.min(5, Number(input.max_cycles || 2)));
    for (let cycle = 1; cycle <= maxCycles && !converged; cycle += 1) {
      let readyVotes = 0;
      let eligibleVotes = 0;
      let changedThisCycle = false;
      for (const reviewer of order) {
        if (reviewer === currentAuthor) continue;
        // Cooperative cancellation: an operator cancel (or sweeper) flips the
        // stored status to a terminal state; detect it between turns and stop
        // without clobbering the terminal status the canceller already wrote.
        const live = await loadSession(db, id);
        if (live && live.status !== 'running') {
          logMaestro('warn', 'session_interrupted', { session_id: id, status: live.status });
          return;
        }
        if (runtimeLimitExceeded(startedAtMs, input.max_runtime_minutes)) {
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
            { status: 'blocked_time', observed_cost_usd: observedCost },
            { ifStatusIn: ['queued', 'running'] },
          );
          return;
        }
        eligibleVotes += 1;
        await pushEvent({
          at: nowIso(),
          agent: reviewer,
          role: 'revision',
          status: 'running',
          message: `Serial revision turn started in cycle ${cycle}.`,
        });
        const prompt = buildRevisionPrompt({
          input,
          runId: id,
          turn: events.length + 1,
          currentText,
          currentAuthor,
          reviewer,
          history: events,
        });
        const rates = input.rates?.[reviewer] ?? {};
        const projected = estimateCost(prompt, MAX_OUTPUT_TOKENS, rates);
        if (!Number.isFinite(projected) || observedCost + projected > Number(input.max_cost_usd)) {
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
            { status: 'blocked_cost', observed_cost_usd: observedCost },
            { ifStatusIn: ['queued', 'running'] },
          );
          return;
        }
        const result = await callProvider(env, reviewer, prompt, input.models ?? {});
        const cost = calculateObservedCost(result, prompt, rates);
        observedCost += cost;
        // M3: an empty reviewer response is a provider failure, not a silent
        // NOT_READY vote. Fail fast instead of recording a meaningless turn.
        if (!result.text.trim()) {
          throw new Error(`O provedor ${AGENT_LABELS[reviewer]} retornou uma revisao vazia (texto em branco).`);
        }
        const status = extractStatus(result.text);
        const revisionReport =
          extractTagged(result.text, 'maestro_revision_report') ||
          JSON.stringify({
            reviewer,
            current_author: currentAuthor,
            status,
            custody: 'unstructured_report_missing',
          });
        const revisedText = extractTagged(result.text, 'maestro_final_text');
        const changedByReviewer = Boolean(revisedText && revisedText.trim() !== currentText.trim());
        const candidateText = revisedText && changedByReviewer ? revisedText : currentText;
        const revisionGuardError = validateRevisionGuard(currentText, candidateText, status, revisionReport);
        if (revisionGuardError) {
          artifactTurn += 1;
          await createArtifact(db, {
            sessionId: id,
            cycle,
            turn: artifactTurn,
            agent: reviewer,
            role: 'revision',
            status: 'blocked',
            title: input.title,
            contentMd: currentText,
            revisionReport: JSON.stringify({
              guard: 'approved_content_lock',
              reason: revisionGuardError,
              attempted_report: revisionReport.slice(0, 2000),
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
            message: revisionGuardError,
            cost_usd: cost,
            model: result.model,
          });
          await persistSession(
            db,
            id,
            {
              status: 'blocked_revision_contract',
              current_author: currentAuthor,
              current_text: currentText,
              observed_cost_usd: observedCost,
              error: revisionGuardError,
            },
            { ifStatusIn: ['queued', 'running'] },
          );
          return;
        }
        // M4: re-audit only when the custody text actually changed. Unchanged
        // text already passed the previous audit, so re-fetching its links only
        // risks a transient failure killing an otherwise-valid session.
        const linkAudit = changedByReviewer ? await auditLinks(candidateText) : currentLinkAudit;
        if (changedByReviewer) currentLinkAudit = linkAudit;
        const brokenLinks = linkAudit.filter((link) => !link.ok);
        artifactTurn += 1;
        const artifact = await createArtifact(db, {
          sessionId: id,
          cycle,
          turn: artifactTurn,
          agent: reviewer,
          role: 'revision',
          status: brokenLinks.length ? 'blocked' : status.toLowerCase(),
          title: input.title,
          contentMd: candidateText,
          revisionReport,
          linkAudit,
          costUsd: cost,
          model: result.model,
          previousArtifactId,
        });
        previousArtifactId = artifact.id;
        if (brokenLinks.length) {
          await pushEvent({
            at: nowIso(),
            agent: reviewer,
            role: 'revision',
            status: 'blocked',
            message: `Automatic link audit blocked ${brokenLinks.length} broken link(s).`,
            cost_usd: cost,
            model: result.model,
            link_audit: linkAudit,
          });
          await persistSession(
            db,
            id,
            {
              status: 'blocked_link_audit',
              current_author: currentAuthor,
              current_text: currentText,
              observed_cost_usd: observedCost,
              error: `Link audit blocked revision: ${brokenLinks
                .map((link) => `${link.url} (${link.status ?? link.error ?? 'invalid'})`)
                .join('; ')}`,
            },
            { ifStatusIn: ['queued', 'running'] },
          );
          return;
        }
        if (revisedText && changedByReviewer) {
          currentText = revisedText;
          currentAuthor = reviewer;
          changedThisCycle = true;
        }
        if (status === 'READY') readyVotes += 1;
        await pushEvent({
          at: nowIso(),
          agent: reviewer,
          role: 'revision',
          status: status === 'READY' ? 'ready' : 'not_ready',
          message: changedByReviewer ? 'Reviewer revised custody text.' : 'Reviewer left custody unchanged.',
          cost_usd: cost,
          model: result.model,
          link_audit: linkAudit,
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
      }
      converged = eligibleVotes > 0 && readyVotes === eligibleVotes && !changedThisCycle;
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
