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
const SECRET_STORE_SCOPE = 'workers';

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
  return Object.fromEntries(PROVIDER_KEYS.map((agent) => [agent, { ...DEFAULT_RATES[agent] }])) as Record<ProviderKey, ProviderRates>;
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
      output_usd_per_million: Number.isFinite(outputRate) && outputRate > 0 ? outputRate : defaults.output_usd_per_million,
      request_usd_per_1k: Number.isFinite(requestRate) && requestRate > 0 ? requestRate : (defaults.request_usd_per_1k ?? 0),
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
    .bind(SETTINGS_ID, DEFAULT_PROTOCOL, 0, null, 2, '{}', JSON.stringify(defaultRates()), JSON.stringify(DEFAULT_MODELS), nowIso())
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
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_maestro_ai_artifacts_session_turn ON maestro_ai_artifacts(session_id, cycle, turn)').run();
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
    await db.prepare("ALTER TABLE maestro_ai_settings ADD COLUMN configured_secrets_json TEXT NOT NULL DEFAULT '{}'").run();
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
    .prepare('SELECT id, protocol_text, max_cost_usd, max_runtime_minutes, max_cycles, configured_secrets_json, rates_json, models_json, updated_at FROM maestro_ai_settings WHERE id = ? LIMIT 1')
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
  return Boolean(
    rates &&
      Number.isFinite(Number(rates.input_usd_per_million)) &&
      Number(rates.input_usd_per_million) > 0 &&
      Number.isFinite(Number(rates.output_usd_per_million)) &&
      Number(rates.output_usd_per_million) > 0,
  );
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
    throw new Error('CLOUDFLARE_PW, CF_ACCOUNT_ID e MAESTRO_SECRET_STORE_ID sao obrigatorios para salvar chaves no Cloudflare Secret Store.');
  }
  return { token, accountId, storeId };
}

async function cloudflareRequest<T>(
  env: MaestroAiEnv,
  path: string,
  init: RequestInit = {},
): Promise<T> {
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
    const message = parsed.errors?.map((error) => error.message).filter(Boolean).join('; ') || text || `HTTP ${response.status}`;
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
  const existing = (await listSecretStoreSecrets(env)).find((secret) => secret.name === name && secret.status !== 'deleted');
  const body = {
    value: secretValue,
    scopes: [SECRET_STORE_SCOPE],
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

function validateRevisionGuard(previousText: string, candidateText: string, status: string, revisionReport: string): string | null {
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

function extractUrls(text: string): string[] {
  const urls = new Set<string>();
  for (const match of text.matchAll(/https?:\/\/[^\s<>"')\]}]+/gi)) {
    const url = match[0].replace(/[.,;:!?]+$/g, '');
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') urls.add(parsed.toString());
    } catch {
      // Ignore malformed candidates; the checker reports only concrete URLs.
    }
  }
  return [...urls].slice(0, 40);
}

async function checkOneLink(url: string): Promise<LinkAuditResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    }
    return { url, ok: response.status >= 200 && response.status < 400, status: response.status };
  } catch (error) {
    return { url, ok: false, error: error instanceof Error ? sanitizeText(error.message, 240) : String(error) };
  } finally {
    clearTimeout(timer);
  }
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

async function callProvider(
  env: MaestroAiEnv,
  agent: ProviderKey,
  prompt: string,
  models: Partial<Record<ProviderKey, string>>,
  maxOutputTokens = MAX_OUTPUT_TOKENS,
): Promise<ProviderCallResult> {
  const apiKey = secretForAgent(env, agent);
  if (!apiKey) throw new Error(`${AGENT_LABELS[agent]} API key is not configured in admin-motor secrets.`);
  const model = sanitizeText(models[agent], 120) || DEFAULT_MODELS[agent];
  const system = `You are ${AGENT_LABELS[agent]} inside Maestro Editorial AI. Internal coordination must be in en_US. Operator-facing deliverables must be in pt_BR. Follow the current Maestro role contract exactly.`;

  if (agent === 'gemini') {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: `${system}\n\n${prompt}`,
      config: { temperature: 0.2, topP: 0.9, maxOutputTokens },
    });
    return {
      text: response.text?.trim() || '',
      inputTokens: response.usageMetadata?.promptTokenCount ?? undefined,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? undefined,
      model,
    };
  }

  const request = buildProviderHttpRequest(agent, apiKey, model, system, prompt, maxOutputTokens);
  const response = await fetch(request.endpoint, request.init);
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
    text: String(text).replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, '').trim(),
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

export const maestroAiTestHooks = {
  buildProviderHttpRequest,
  validateRevisionGuard,
};

async function parseProviderResponse(response: Response): Promise<any> {
  const body = await response.text();
  let parsed: any;
  try {
    parsed = body ? JSON.parse(body) : {};
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

async function persistSession(
  db: D1Database,
  id: string,
  patch: Partial<Pick<MaestroSessionRow, 'status' | 'current_author' | 'current_text' | 'final_text' | 'observed_cost_usd' | 'events_json' | 'error'>>,
): Promise<void> {
  const row = await loadSession(db, id);
  if (!row) return;
  await db
    .prepare(
      `UPDATE maestro_ai_sessions
       SET status = ?, current_author = ?, current_text = ?, final_text = ?, observed_cost_usd = ?, events_json = ?, error = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      patch.status ?? row.status,
      patch.current_author ?? row.current_author,
      patch.current_text ?? row.current_text,
      patch.final_text ?? row.final_text,
      patch.observed_cost_usd ?? row.observed_cost_usd,
      patch.events_json ?? row.events_json,
      patch.error ?? row.error,
      nowIso(),
      id,
    )
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
    await pushEvent({ at: nowIso(), agent: initialAgent, role: 'draft', status: 'running', message: 'Draft call started.' });
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
    const draftLinkAudit = await auditLinks(currentText);
    const invalidDraftLinks = draftLinkAudit.filter((result) => !result.ok);
    artifactTurn += 1;
    const draftArtifact = await createArtifact(db, {
      sessionId: id,
      cycle: 0,
      turn: artifactTurn,
      agent: initialAgent,
      role: 'draft',
      status: invalidDraftLinks.length ? 'blocked' : 'ready',
      title: input.title,
      contentMd: currentText,
      revisionReport: JSON.stringify({
        reviewer: initialAgent,
        role: 'initial_drafter',
        status: invalidDraftLinks.length ? 'blocked' : 'ready',
        custody: 'created',
      }),
      linkAudit: draftLinkAudit,
      costUsd: draftCost,
      model: draft.model,
      previousArtifactId,
    });
    previousArtifactId = draftArtifact.id;
    await pushEvent({
      at: nowIso(),
      agent: initialAgent,
      role: 'draft',
      status: invalidDraftLinks.length ? 'blocked' : 'ready',
      message: invalidDraftLinks.length
        ? `Initial draft produced with ${invalidDraftLinks.length} invalid link(s).`
        : 'Initial draft produced.',
      cost_usd: draftCost,
      model: draft.model,
      link_audit: draftLinkAudit,
    });
    if (invalidDraftLinks.length) {
      await persistSession(db, id, {
        status: 'error',
        current_author: currentAuthor,
        current_text: currentText,
        observed_cost_usd: observedCost,
        error: `Link audit blocked draft: ${invalidDraftLinks
          .map((result) => `${result.url} (${result.status ?? result.error ?? 'invalid'})`)
          .join('; ')}`,
      });
      return;
    }
    await persistSession(db, id, {
      status: 'running',
      current_author: currentAuthor,
      current_text: currentText,
      observed_cost_usd: observedCost,
    });

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
        if (runtimeLimitExceeded(startedAtMs, input.max_runtime_minutes)) {
          await pushEvent({
            at: nowIso(),
            agent: reviewer,
            role: 'revision',
            status: 'blocked',
            message: `Time guard blocked provider call before ${AGENT_LABELS[reviewer]}.`,
          });
          await persistSession(db, id, { status: 'blocked_time', observed_cost_usd: observedCost });
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
          await persistSession(db, id, { status: 'blocked_cost', observed_cost_usd: observedCost });
          return;
        }
        const result = await callProvider(env, reviewer, prompt, input.models ?? {});
        const cost = calculateObservedCost(result, prompt, rates);
        observedCost += cost;
        const status = extractStatus(result.text);
        const revisionReport = extractTagged(result.text, 'maestro_revision_report') || JSON.stringify({
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
          await persistSession(db, id, {
            status: 'blocked_revision_contract',
            current_author: currentAuthor,
            current_text: currentText,
            observed_cost_usd: observedCost,
            error: revisionGuardError,
          });
          return;
        }
        const linkAudit = await auditLinks(candidateText);
        const invalidLinks = linkAudit.filter((link) => !link.ok);
        artifactTurn += 1;
        const artifact = await createArtifact(db, {
          sessionId: id,
          cycle,
          turn: artifactTurn,
          agent: reviewer,
          role: 'revision',
          status: invalidLinks.length ? 'blocked' : status.toLowerCase(),
          title: input.title,
          contentMd: candidateText,
          revisionReport,
          linkAudit,
          costUsd: cost,
          model: result.model,
          previousArtifactId,
        });
        previousArtifactId = artifact.id;
        if (invalidLinks.length) {
          await pushEvent({
            at: nowIso(),
            agent: reviewer,
            role: 'revision',
            status: 'blocked',
            message: `Automatic link audit blocked ${invalidLinks.length} invalid link(s).`,
            cost_usd: cost,
            model: result.model,
            link_audit: linkAudit,
          });
          await persistSession(db, id, {
            status: 'error',
            current_author: currentAuthor,
            current_text: currentText,
            observed_cost_usd: observedCost,
            error: `Link audit blocked revision: ${invalidLinks
              .map((link) => `${link.url} (${link.status ?? link.error ?? 'invalid'})`)
              .join('; ')}`,
          });
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
        await persistSession(db, id, {
          status: 'running',
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
    await persistSession(db, id, {
      status: converged ? 'converged' : 'blocked_max_cycles',
      current_author: currentAuthor,
      current_text: currentText,
      final_text: converged ? currentText : null,
      observed_cost_usd: observedCost,
      events_json: JSON.stringify(events),
    });
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
    await persistSession(db, id, {
      status: 'error',
      observed_cost_usd: observedCost,
      events_json: JSON.stringify(events),
      error: error instanceof Error ? error.message : String(error),
    });
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
  const requestedAgents = Array.isArray(body.active_agents) && body.active_agents.length > 0 ? body.active_agents : eligibleAgents;
  const activeAgents = sanitizeAgents(requestedAgents, initialAgent).filter((agent) => eligibleAgents.includes(agent));
  const maxCostUsd = Number(body.max_cost_usd ?? settings.max_cost_usd);
  const maxRuntimeMinutes =
    settings.max_runtime_minutes == null || Number(settings.max_runtime_minutes) <= 0
      ? null
      : Number(settings.max_runtime_minutes);
  const maxCycles = Number(settings.max_cycles ?? 2);
  if (!prompt) return { ok: false, error: 'Prompt editorial obrigatorio.' };
  if (protocolText.length < 100) return { ok: false, error: 'Configure e salve o protocolo editorial integral antes de iniciar.' };
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
    return json({ ok: false, error: error instanceof Error ? error.message : 'Erro ao carregar autos Maestro AI.' }, 500);
  }
}

export async function handleMaestroAiSettingsGet(context: RequestContext): Promise<Response> {
  try {
    const db = requireDb(context.env);
    await ensureSchema(db);
    const row = await loadSettings(db);
    return json({ ok: true, settings: publicSettings(context.env, row) });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Erro ao carregar configuracoes Maestro AI.' }, 500);
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
    const rawRuntimeLimit = body.max_runtime_minutes ?? current.max_runtime_minutes;
    const maxRuntimeMinutes =
      rawRuntimeLimit == null || Number(rawRuntimeLimit) <= 0 ? null : Number(rawRuntimeLimit);
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
    if (maxRuntimeMinutes != null && (!Number.isFinite(maxRuntimeMinutes) || maxRuntimeMinutes < 1 || maxRuntimeMinutes > 720)) {
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
      updated_api_keys: PROVIDER_KEYS.filter((agent) => typeof apiKeys[agent] === 'string' && Boolean(apiKeys[agent]?.trim())),
      max_cost_usd: maxCostUsd,
      max_runtime_minutes: maxRuntimeMinutes,
      max_cycles: maxCycles,
    });
    const row = await loadSettings(db);
    return json({ ok: true, settings: publicSettings(context.env, row) });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Erro ao salvar configuracoes Maestro AI.' }, 500);
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
        const result = await callProvider(
          context.env,
          agent,
          'Return exactly: MAESTRO_API_TEST_OK',
          models,
          64,
        );
        results.push({
          agent,
          ok: /MAESTRO_API_TEST_OK/i.test(result.text) || result.text.length > 0,
          message: result.text.slice(0, 120) || 'Resposta vazia.',
          model: result.model,
        });
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
    await db
      .prepare('UPDATE maestro_ai_sessions SET title = ?, current_text = ?, updated_at = ? WHERE id = ?')
      .bind(sanitizeText(body.title || row.title, 200), sanitizeText(body.content, 160_000), nowIso(), sessionId)
      .run();
    const next = await loadSession(db, sessionId);
    return json({ ok: true, session: next ? publicSession(next) : null });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Erro ao salvar conteudo Maestro AI.' }, 500);
  }
}
