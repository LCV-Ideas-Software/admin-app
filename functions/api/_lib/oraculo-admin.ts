import type { D1Database } from './operational'

export type Env = {
  BIGDATA_DB?: D1Database
}

export type Context = {
  request: Request
  env: Env
}

type D1Row = Record<string, unknown>

export type OraculoRateLimitPolicy = {
  route: 'analisar-ia' | 'enviar-email' | 'contato' | 'tesouro-ipca-vision'
  label: string
  enabled: boolean
  max_requests: number
  window_minutes: number
  updated_at: string | null
  defaults: {
    enabled: boolean
    max_requests: number
    window_minutes: number
  }
  stats: {
    total_requests_window: number
    distinct_keys_window: number
  }
}

const DEFAULT_POLICIES = {
  'analisar-ia': {
    route: 'analisar-ia',
    label: 'Análise IA (Gemini)',
    enabled: 1,
    max_requests: 6,
    window_minutes: 15,
  },
  'enviar-email': {
    route: 'enviar-email',
    label: 'Envio de E-mail',
    enabled: 1,
    max_requests: 4,
    window_minutes: 60,
  },
  'contato': {
    route: 'contato',
    label: 'Formulário de Contato',
    enabled: 1,
    max_requests: 5,
    window_minutes: 30,
  },
  'tesouro-ipca-vision': {
    route: 'tesouro-ipca-vision',
    label: 'OCR Vision (Gemini)',
    enabled: 1,
    max_requests: 8,
    window_minutes: 15,
  },
} as const

export const SUPPORTED_ROUTES = ['analisar-ia', 'enviar-email', 'contato', 'tesouro-ipca-vision'] as const

const toDbRoute = (route: string) => route.startsWith('oraculo/') ? route : `oraculo/${route}`

export const toHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

const toInt = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const ensureRateLimitTables = async (db: D1Database) => {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS oraculo_rate_limit_policies (
      route TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      max_requests INTEGER NOT NULL,
      window_minutes INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run()

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS oraculo_api_rate_limits (
      key TEXT PRIMARY KEY,
      route TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run()
}

export const ensureDefaultPolicies = async (db: D1Database) => {
  await ensureRateLimitTables(db)

  for (const route of SUPPORTED_ROUTES) {
    const policy = DEFAULT_POLICIES[route]
    await db.prepare(`
      INSERT OR IGNORE INTO oraculo_rate_limit_policies (route, enabled, max_requests, window_minutes)
      VALUES (?, ?, ?, ?)
    `)
      .bind(toDbRoute(policy.route), policy.enabled, policy.max_requests, policy.window_minutes)
      .run()
  }
}

const getRateLimitWindowStats = async (db: D1Database, route: string, windowMinutes: number) => {
  const now = Date.now()
  const cutoff = now - (Math.max(1, toInt(windowMinutes, 10)) * 60 * 1000)

  const row = await db.prepare(`
    SELECT
      COALESCE(SUM(request_count), 0) AS total,
      COUNT(DISTINCT key) AS keys
    FROM oraculo_api_rate_limits
    WHERE route = ? AND window_start >= ?
  `)
    .bind(toDbRoute(route), cutoff)
    .first<{ total?: number; keys?: number }>()

  return {
    total_requests_window: toInt(row?.total, 0),
    distinct_keys_window: toInt(row?.keys, 0),
  }
}

export const listPoliciesWithStats = async (db: D1Database): Promise<OraculoRateLimitPolicy[]> => {
  await ensureDefaultPolicies(db)

  const output: OraculoRateLimitPolicy[] = []

  for (const route of SUPPORTED_ROUTES) {
    const fallback = DEFAULT_POLICIES[route]
    const row = await db.prepare(`
      SELECT route, enabled, max_requests, window_minutes, updated_at
      FROM oraculo_rate_limit_policies
      WHERE route = ?
      LIMIT 1
    `)
      .bind(toDbRoute(route))
      .first<D1Row>()

    const policy = {
      route,
      label: fallback.label,
      enabled: toInt(row?.enabled, fallback.enabled) === 1,
      max_requests: Math.max(1, toInt(row?.max_requests, fallback.max_requests)),
      window_minutes: Math.max(1, toInt(row?.window_minutes, fallback.window_minutes)),
      updated_at: typeof row?.updated_at === 'string' ? row.updated_at : null,
      defaults: {
        enabled: fallback.enabled === 1,
        max_requests: fallback.max_requests,
        window_minutes: fallback.window_minutes,
      },
      stats: {
        total_requests_window: 0,
        distinct_keys_window: 0,
      },
    } satisfies OraculoRateLimitPolicy

    policy.stats = await getRateLimitWindowStats(db, route, policy.window_minutes)
    output.push(policy)
  }

  return output
}

export const upsertRateLimitPolicy = async (
  db: D1Database,
  input: { route: string; enabled: number; maxRequests: number; windowMinutes: number },
) => {
  await ensureDefaultPolicies(db)

  await db.prepare(`
    INSERT INTO oraculo_rate_limit_policies (route, enabled, max_requests, window_minutes, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(route) DO UPDATE SET
      enabled = excluded.enabled,
      max_requests = excluded.max_requests,
      window_minutes = excluded.window_minutes,
      updated_at = CURRENT_TIMESTAMP
  `)
    .bind(toDbRoute(input.route), input.enabled, input.maxRequests, input.windowMinutes)
    .run()
}

export const resetRateLimitPolicy = async (db: D1Database, route: typeof SUPPORTED_ROUTES[number]) => {
  const fallback = DEFAULT_POLICIES[route]

  await upsertRateLimitPolicy(db, {
    route,
    enabled: fallback.enabled,
    maxRequests: fallback.max_requests,
    windowMinutes: fallback.window_minutes,
  })
}
