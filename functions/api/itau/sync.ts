import { finishSyncRun, logModuleOperationalEvent, startSyncRun } from '../_lib/operational'
import type { D1Database } from '../_lib/operational'

type LegacyOverviewResponse = {
  oraculo_historico?: {
    ultimas_analises?: Array<{
      created_at?: number
      status?: string
      from_cache?: boolean
      force_refresh?: boolean
      moeda?: string | null
      valor_original?: number | null
      preview?: string | null
      error_message?: string | null
    }>
  }
}

type LegacyRateLimitResponse = {
  policies?: Array<{
    route_key?: string
    enabled?: boolean
    max_requests?: number
    window_minutes?: number
    updated_at?: number
    updated_by?: string | null
  }>
}

type Env = {
  BIGDATA_DB?: D1Database
  CALC_ADMIN_API_BASE_URL?: string
  CALC_CF_ACCESS_CLIENT_ID?: string
  CALC_CF_ACCESS_CLIENT_SECRET?: string
}

type Context = {
  request: Request
  env: Env
}

type ObservabilidadeRow = {
  createdAt: number
  status: string
  fromCache: number
  forceRefresh: number
  durationMs: number | null
  moeda: string | null
  valorOriginal: number | null
  preview: string | null
  errorMessage: string | null
  appVersion: string
}

type RateLimitPolicyRow = {
  routeKey: string
  enabled: number
  maxRequests: number
  windowMinutes: number
  updatedAt: number
  updatedBy: string | null
}

const DEFAULT_CALC_ADMIN_URL = 'https://admin.lcv.app.br'

const normalizeBaseUrl = (value: string) => value.endsWith('/') ? value.slice(0, -1) : value

const parseLimit = (rawValue: string | null) => {
  const parsed = Number.parseInt(rawValue ?? '300', 10)
  if (!Number.isFinite(parsed)) {
    return 300
  }
  return Math.min(1000, Math.max(1, parsed))
}

const parseDryRun = (rawValue: string | null) => rawValue === '1' || rawValue === 'true'

const toHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

const parseObservabilidadeRows = (payload: LegacyOverviewResponse, limit: number): ObservabilidadeRow[] => {
  const source = Array.isArray(payload.oraculo_historico?.ultimas_analises)
    ? payload.oraculo_historico?.ultimas_analises
    : []

  const rows: ObservabilidadeRow[] = []

  for (const item of source.slice(0, limit)) {
    const createdAt = Number(item.created_at)
    const status = String(item.status ?? '').trim()

    if (!Number.isFinite(createdAt) || !status) {
      continue
    }

    rows.push({
      createdAt,
      status,
      fromCache: item.from_cache ? 1 : 0,
      forceRefresh: item.force_refresh ? 1 : 0,
      durationMs: null,
      moeda: typeof item.moeda === 'string' && item.moeda.trim().length > 0 ? item.moeda.trim().toUpperCase() : null,
      valorOriginal: Number.isFinite(Number(item.valor_original)) ? Number(item.valor_original) : null,
      preview: typeof item.preview === 'string' && item.preview.trim().length > 0 ? item.preview.trim() : null,
      errorMessage: typeof item.error_message === 'string' && item.error_message.trim().length > 0 ? item.error_message.trim() : null,
      appVersion: 'legacy-sync',
    })
  }

  return rows
}

const parseRateLimitPolicies = (payload: LegacyRateLimitResponse): RateLimitPolicyRow[] => {
  const source = Array.isArray(payload.policies) ? payload.policies : []
  const now = Date.now()

  return source
    .map((item) => {
      const routeKey = String(item.route_key ?? '').trim()
      const maxRequests = Number(item.max_requests)
      const windowMinutes = Number(item.window_minutes)
      const updatedAt = Number(item.updated_at)

      if (!routeKey || !Number.isFinite(maxRequests) || !Number.isFinite(windowMinutes)) {
        return null
      }

      return {
        routeKey,
        enabled: item.enabled ? 1 : 0,
        maxRequests: Math.max(1, Math.trunc(maxRequests)),
        windowMinutes: Math.max(1, Math.trunc(windowMinutes)),
        updatedAt: Number.isFinite(updatedAt) ? Math.trunc(updatedAt) : now,
        updatedBy: typeof item.updated_by === 'string' && item.updated_by.trim().length > 0 ? item.updated_by.trim() : null,
      }
    })
    .filter((item): item is RateLimitPolicyRow => item !== null)
}

const existsObservabilidade = async (db: D1Database, row: ObservabilidadeRow) => {
  const existing = await db.prepare(`
    SELECT id
    FROM calc_oraculo_observabilidade
    WHERE
      created_at = ?
      AND status = ?
      AND IFNULL(moeda, '') = IFNULL(?, '')
      AND IFNULL(preview, '') = IFNULL(?, '')
      AND IFNULL(error_message, '') = IFNULL(?, '')
    LIMIT 1
  `)
    .bind(row.createdAt, row.status, row.moeda, row.preview, row.errorMessage)
    .first<{ id?: number }>()

  return Number.isFinite(Number(existing?.id))
}

export async function onRequestPost(context: Context) {
  const { request, env } = context

  if (!env.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'BIGDATA_DB não configurado no runtime.',
    }), {
      status: 503,
      headers: toHeaders(),
    })
  }

  const url = new URL(request.url)
  const limit = parseLimit(url.searchParams.get('limit'))
  const dryRun = parseDryRun(url.searchParams.get('dryRun'))

  const startedAt = Date.now()
  const syncRunId = await startSyncRun(env.BIGDATA_DB, {
    module: 'calculadora',
    status: 'running',
    startedAt,
    metadata: { limit, dryRun },
  })

  try {
    const baseUrl = normalizeBaseUrl(env.CALC_ADMIN_API_BASE_URL ?? DEFAULT_CALC_ADMIN_URL)

    const cfAccessHeaders: Record<string, string> = {}
    if (env.CALC_CF_ACCESS_CLIENT_ID && env.CALC_CF_ACCESS_CLIENT_SECRET) {
      cfAccessHeaders['CF-Access-Client-Id'] = env.CALC_CF_ACCESS_CLIENT_ID
      cfAccessHeaders['CF-Access-Client-Secret'] = env.CALC_CF_ACCESS_CLIENT_SECRET
    }

    const hasCfAccessToken = !!(env.CALC_CF_ACCESS_CLIENT_ID && env.CALC_CF_ACCESS_CLIENT_SECRET)

    const [overviewResponse, rateLimitResponse] = await Promise.all([
      fetch(`${baseUrl}/api/admin/overview`, {
        method: 'GET',
        redirect: 'follow',
        headers: { Accept: 'application/json', ...cfAccessHeaders },
      }),
      fetch(`${baseUrl}/api/admin/rate-limit`, {
        method: 'GET',
        redirect: 'follow',
        headers: { Accept: 'application/json', ...cfAccessHeaders },
      }),
    ])

    const overviewCt = overviewResponse.headers.get('Content-Type') ?? ''
    if (!overviewResponse.ok || overviewCt.includes('text/html')) {
      const hint = overviewCt.includes('text/html')
        ? `CF Access bloqueou (HTML recebido, status=${overviewResponse.status}, token_presente=${hasCfAccessToken}) — verifique se a policy Service Auth do app calculadora-admin inclui o Service Token`
        : `HTTP ${overviewResponse.status}`
      throw new Error(`Falha no backend legado do Calculadora (/overview): ${hint}`)
    }

    const rateLimitCt = rateLimitResponse.headers.get('Content-Type') ?? ''
    if (!rateLimitResponse.ok || rateLimitCt.includes('text/html')) {
      const hint = rateLimitCt.includes('text/html')
        ? `CF Access bloqueou (HTML recebido, status=${rateLimitResponse.status}, token_presente=${hasCfAccessToken}) — verifique se a policy Service Auth do app calculadora-admin inclui o Service Token`
        : `HTTP ${rateLimitResponse.status}`
      throw new Error(`Falha no backend legado do Calculadora (/rate-limit): ${hint}`)
    }

    const overviewPayload = await overviewResponse.json() as LegacyOverviewResponse
    const rateLimitPayload = await rateLimitResponse.json() as LegacyRateLimitResponse

    const observabilidadeRows = parseObservabilidadeRows(overviewPayload, limit)
    const rateLimitRows = parseRateLimitPolicies(rateLimitPayload)

    let observabilidadeInserted = 0
    let rateLimitUpserted = 0

    if (!dryRun) {
      for (const row of observabilidadeRows) {
        const alreadyExists = await existsObservabilidade(env.BIGDATA_DB, row)
        if (alreadyExists) {
          continue
        }

        await env.BIGDATA_DB.prepare(`
          INSERT INTO calc_oraculo_observabilidade (
            created_at,
            status,
            from_cache,
            force_refresh,
            duration_ms,
            moeda,
            valor_original,
            preview,
            error_message,
            app_version
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
          .bind(
            row.createdAt,
            row.status,
            row.fromCache,
            row.forceRefresh,
            row.durationMs,
            row.moeda,
            row.valorOriginal,
            row.preview,
            row.errorMessage,
            row.appVersion,
          )
          .run()

        observabilidadeInserted += 1
      }

      for (const row of rateLimitRows) {
        await env.BIGDATA_DB.prepare(`
          INSERT INTO calc_rate_limit_policies (
            route_key,
            enabled,
            max_requests,
            window_minutes,
            updated_at,
            updated_by
          )
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(route_key) DO UPDATE SET
            enabled = excluded.enabled,
            max_requests = excluded.max_requests,
            window_minutes = excluded.window_minutes,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by
        `)
          .bind(
            row.routeKey,
            row.enabled,
            row.maxRequests,
            row.windowMinutes,
            row.updatedAt,
            row.updatedBy,
          )
          .run()

        rateLimitUpserted += 1
      }
    }

    const recordsRead = observabilidadeRows.length + rateLimitRows.length
    const recordsUpserted = dryRun ? 0 : observabilidadeInserted + rateLimitUpserted

    await finishSyncRun(env.BIGDATA_DB, {
      id: syncRunId,
      status: 'success',
      finishedAt: Date.now(),
      recordsRead,
      recordsUpserted,
    })

    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'calculadora',
      source: 'legacy-admin',
      fallbackUsed: true,
      ok: true,
      metadata: {
        action: 'sync',
        dryRun,
        limit,
        observabilidadeLidas: observabilidadeRows.length,
        observabilidadeInseridas: dryRun ? 0 : observabilidadeInserted,
        rateLimitLidas: rateLimitRows.length,
        rateLimitUpserted: dryRun ? 0 : rateLimitUpserted,
      },
    })

    return new Response(JSON.stringify({
      ok: true,
      dryRun,
      syncRunId,
      recordsRead,
      recordsUpserted,
      observabilidade: {
        lidas: observabilidadeRows.length,
        inseridas: dryRun ? 0 : observabilidadeInserted,
      },
      rateLimit: {
        lidas: rateLimitRows.length,
        upserted: dryRun ? 0 : rateLimitUpserted,
      },
      startedAt,
      finishedAt: Date.now(),
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha inesperada no sync da Calculadora'

    await finishSyncRun(env.BIGDATA_DB, {
      id: syncRunId,
      status: 'error',
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message,
    })

    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'calculadora',
      source: 'legacy-admin',
      fallbackUsed: true,
      ok: false,
      errorMessage: message,
      metadata: {
        action: 'sync',
        limit,
        dryRun,
      },
    })

    return new Response(JSON.stringify({
      ok: false,
      error: message,
      syncRunId,
    }), {
      status: 500,
      headers: toHeaders(),
    })
  }
}
