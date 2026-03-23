import { finishSyncRun, logModuleOperationalEvent, startSyncRun } from '../_lib/operational'
import type { D1Database } from '../_lib/operational'

type ItauObservabilidadeSourceRow = {
  created_at?: number
  status?: string
  from_cache?: number | boolean
  force_refresh?: number | boolean
  duration_ms?: number | null
  moeda?: string | null
  valor_original?: number | null
  preview?: string | null
  error_message?: string | null
}

type ItauRateLimitSourceRow = {
  route_key?: string
  enabled?: number | boolean
  max_requests?: number
  window_minutes?: number
  updated_at?: number
  updated_by?: string | null
}

type Env = {
  BIGDATA_DB?: D1Database
  ITAU_SOURCE_DB?: D1Database
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

const parseObservabilidadeRows = (sourceRows: ItauObservabilidadeSourceRow[], limit: number): ObservabilidadeRow[] => {
  const source = Array.isArray(sourceRows) ? sourceRows : []

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
      fromCache: Number(item.from_cache) === 1 || item.from_cache === true ? 1 : 0,
      forceRefresh: Number(item.force_refresh) === 1 || item.force_refresh === true ? 1 : 0,
      durationMs: Number.isFinite(Number(item.duration_ms)) ? Number(item.duration_ms) : null,
      moeda: typeof item.moeda === 'string' && item.moeda.trim().length > 0 ? item.moeda.trim().toUpperCase() : null,
      valorOriginal: Number.isFinite(Number(item.valor_original)) ? Number(item.valor_original) : null,
      preview: typeof item.preview === 'string' && item.preview.trim().length > 0 ? item.preview.trim() : null,
      errorMessage: typeof item.error_message === 'string' && item.error_message.trim().length > 0 ? item.error_message.trim() : null,
      appVersion: 'legacy-sync',
    })
  }

  return rows
}

const parseRateLimitPolicies = (sourceRows: ItauRateLimitSourceRow[]): RateLimitPolicyRow[] => {
  const source = Array.isArray(sourceRows) ? sourceRows : []
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
        enabled: Number(item.enabled) === 1 || item.enabled === true ? 1 : 0,
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
    FROM itau_oraculo_observabilidade
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

  if (!env.ITAU_SOURCE_DB) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'ITAU_SOURCE_DB não configurado no runtime.',
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
    module: 'itau',
    status: 'running',
    startedAt,
    metadata: { limit, dryRun },
  })

  try {
    const [observSource, rateLimitSource] = await Promise.all([
      env.ITAU_SOURCE_DB.prepare(`
        SELECT created_at, status, from_cache, force_refresh, duration_ms, moeda, valor_original, preview, error_message
        FROM oraculo_observabilidade
        ORDER BY created_at DESC
        LIMIT ?
      `)
        .bind(limit)
        .all<ItauObservabilidadeSourceRow>(),
      env.ITAU_SOURCE_DB.prepare(`
        SELECT route_key, enabled, max_requests, window_minutes, updated_at, updated_by
        FROM rate_limit_policies
      `)
        .all<ItauRateLimitSourceRow>(),
    ])

    const observabilidadeRows = parseObservabilidadeRows(observSource.results ?? [], limit)
    const rateLimitRows = parseRateLimitPolicies(rateLimitSource.results ?? [])

    let observabilidadeInserted = 0
    let rateLimitUpserted = 0

    if (!dryRun) {
      for (const row of observabilidadeRows) {
        const alreadyExists = await existsObservabilidade(env.BIGDATA_DB, row)
        if (alreadyExists) {
          continue
        }

        await env.BIGDATA_DB.prepare(`
          INSERT INTO itau_oraculo_observabilidade (
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
          INSERT INTO itau_rate_limit_policies (
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
      module: 'itau',
      source: 'bigdata_db',
      fallbackUsed: false,
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
    const message = error instanceof Error ? error.message : 'Falha inesperada no sync do Itaú'

    await finishSyncRun(env.BIGDATA_DB, {
      id: syncRunId,
      status: 'error',
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message,
    })

    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'itau',
      source: 'bigdata_db',
      fallbackUsed: false,
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
