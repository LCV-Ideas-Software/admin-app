import type { D1Database } from './operational'

export type Env = {
  ITAU_SOURCE_DB?: D1Database
  BIGDATA_DB?: D1Database
}

export type Context = {
  request: Request
  env: Env
}

type D1Row = Record<string, unknown>

export type ItauRateLimitPolicy = {
  route_key: 'oraculo_ia' | 'enviar_email'
  label: string
  enabled: boolean
  max_requests: number
  window_minutes: number
  updated_at: number
  updated_by: string | null
  defaults: {
    enabled: boolean
    max_requests: number
    window_minutes: number
  }
  stats: {
    total_requests_window: number
    distinct_ips_window: number
  }
}

const DEFAULT_PARAMS = {
  iof_cartao: 0.035,
  iof_global: 0.035,
  spread_cartao: 0.055,
  spread_global_aberto: 0.0078,
  spread_global_fechado: 0.0118,
  fator_calibragem_global: 0.99934,
  backtest_mape_boa_percent: 1.0,
  backtest_mape_atencao_percent: 2.0,
}

const DEFAULT_POLICIES = {
  oraculo_ia: {
    route_key: 'oraculo_ia',
    label: 'Síntese da IA',
    enabled: 1,
    max_requests: 2,
    window_minutes: 10,
  },
  enviar_email: {
    route_key: 'enviar_email',
    label: 'Envio de E-mail',
    enabled: 1,
    max_requests: 2,
    window_minutes: 10,
  },
} as const

export const SUPPORTED_ROUTES = ['oraculo_ia', 'enviar_email'] as const

export const toHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

const toInt = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const toRate = (percentValue: unknown) => {
  const value = Number(percentValue)
  if (!Number.isFinite(value)) {
    return null
  }
  return value / 100
}

export const validateRate = (name: string, rate: number | null) => {
  if (!Number.isFinite(Number(rate))) {
    return `${name} inválido.`
  }
  if (Number(rate) < 0 || Number(rate) > 1) {
    return `${name} deve estar entre 0% e 100%.`
  }
  return null
}

export const ensureParametrosTables = async (db: D1Database) => {
  await db.prepare(
    'CREATE TABLE IF NOT EXISTS itau_parametros_customizados (id INTEGER PRIMARY KEY AUTOINCREMENT, chave TEXT NOT NULL, valor TEXT NOT NULL)',
  ).run()

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS itau_parametros_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      admin_email TEXT NOT NULL,
      chave TEXT NOT NULL,
      valor_anterior TEXT,
      valor_novo TEXT NOT NULL,
      origem TEXT NOT NULL
    )
  `).run()
}

export const readLatestParams = async (db: D1Database) => {
  await ensureParametrosTables(db)

  const rows = await db.prepare('SELECT chave, valor FROM itau_parametros_customizados ORDER BY id DESC').all<D1Row>()
  const result = { ...DEFAULT_PARAMS }

  for (const row of rows.results ?? []) {
    const key = String(row.chave ?? '').trim()
    if (!(key in result)) {
      continue
    }

    const parsed = Number.parseFloat(String(row.valor ?? ''))
    if (Number.isFinite(parsed)) {
      result[key as keyof typeof DEFAULT_PARAMS] = parsed
    }
  }

  return result
}

export const ensureRateLimitTables = async (db: D1Database) => {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS itau_rate_limit_policies (
      route_key TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL,
      max_requests INTEGER NOT NULL,
      window_minutes INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      updated_by TEXT
    )
  `).run()

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS itau_rate_limit_hits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_key TEXT NOT NULL,
      ip TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `).run()
}

export const ensureDefaultPolicies = async (db: D1Database) => {
  await ensureRateLimitTables(db)

  for (const routeKey of SUPPORTED_ROUTES) {
    const policy = DEFAULT_POLICIES[routeKey]
    await db.prepare(`
      INSERT OR IGNORE INTO itau_rate_limit_policies (route_key, enabled, max_requests, window_minutes, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
      .bind(policy.route_key, policy.enabled, policy.max_requests, policy.window_minutes, Date.now(), 'system-default')
      .run()
  }
}

const getRateLimitWindowStats = async (db: D1Database, routeKey: string, windowMinutes: number) => {
  const now = Date.now()
  const cutoff = now - (Math.max(1, toInt(windowMinutes, 10)) * 60 * 1000)

  const row = await db.prepare(`
    SELECT COUNT(1) AS total, COUNT(DISTINCT ip) AS ips
    FROM itau_rate_limit_hits
    WHERE route_key = ? AND created_at >= ?
  `)
    .bind(routeKey, cutoff)
    .first<{ total?: number; ips?: number }>()

  return {
    total_requests_window: toInt(row?.total, 0),
    distinct_ips_window: toInt(row?.ips, 0),
  }
}

export const listPoliciesWithStats = async (db: D1Database): Promise<ItauRateLimitPolicy[]> => {
  await ensureDefaultPolicies(db)

  const output: ItauRateLimitPolicy[] = []

  for (const routeKey of SUPPORTED_ROUTES) {
    const fallback = DEFAULT_POLICIES[routeKey]
    const row = await db.prepare(`
      SELECT route_key, enabled, max_requests, window_minutes, updated_at, updated_by
      FROM itau_rate_limit_policies
      WHERE route_key = ?
      LIMIT 1
    `)
      .bind(routeKey)
      .first<D1Row>()

    const policy = {
      route_key: routeKey,
      label: fallback.label,
      enabled: toInt(row?.enabled, fallback.enabled) === 1,
      max_requests: Math.max(1, toInt(row?.max_requests, fallback.max_requests)),
      window_minutes: Math.max(1, toInt(row?.window_minutes, fallback.window_minutes)),
      updated_at: toInt(row?.updated_at, Date.now()),
      updated_by: typeof row?.updated_by === 'string' && row.updated_by.trim() ? row.updated_by.trim() : null,
      defaults: {
        enabled: fallback.enabled === 1,
        max_requests: fallback.max_requests,
        window_minutes: fallback.window_minutes,
      },
      stats: {
        total_requests_window: 0,
        distinct_ips_window: 0,
      },
    } satisfies ItauRateLimitPolicy

    policy.stats = await getRateLimitWindowStats(db, routeKey, policy.window_minutes)
    output.push(policy)
  }

  return output
}

export const upsertRateLimitPolicy = async (
  db: D1Database,
  input: { routeKey: string; enabled: number; maxRequests: number; windowMinutes: number; updatedBy: string | null },
) => {
  await ensureDefaultPolicies(db)

  await db.prepare(`
    INSERT INTO itau_rate_limit_policies (route_key, enabled, max_requests, window_minutes, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(route_key) DO UPDATE SET
      enabled = excluded.enabled,
      max_requests = excluded.max_requests,
      window_minutes = excluded.window_minutes,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `)
    .bind(input.routeKey, input.enabled, input.maxRequests, input.windowMinutes, Date.now(), input.updatedBy)
    .run()
}

export const resetRateLimitPolicy = async (db: D1Database, routeKey: typeof SUPPORTED_ROUTES[number], updatedBy: string | null) => {
  const fallback = DEFAULT_POLICIES[routeKey]

  await upsertRateLimitPolicy(db, {
    routeKey,
    enabled: fallback.enabled,
    maxRequests: fallback.max_requests,
    windowMinutes: fallback.window_minutes,
    updatedBy,
  })
}
