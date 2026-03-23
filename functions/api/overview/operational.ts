import { ensureOperationalTables } from '../_lib/operational'
import type { D1Database } from '../_lib/operational'

type Env = {
  BIGDATA_DB?: D1Database
}

type Context = {
  env: Env
}

type EventAggRow = {
  module?: string
  total_events?: number
  fallback_events?: number
  error_events?: number
  last_source?: string
  last_ok?: number
}

type SyncAggRow = {
  module?: string
  total_runs?: number
  success_runs?: number
  error_runs?: number
  last_status?: string
  last_finished_at?: number | null
}

const toResponseHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

export async function onRequestGet(context: Context) {
  const { env } = context

  if (!env.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: true,
      source: 'no-bigdata-binding',
      modules: [],
      sync: [],
      generatedAt: Date.now(),
    }), { headers: toResponseHeaders() })
  }

  try {
    await ensureOperationalTables(env.BIGDATA_DB)

    const since = Date.now() - (24 * 60 * 60 * 1000)

    const eventsAgg = await env.BIGDATA_DB.prepare(`
      SELECT
        module,
        COUNT(1) AS total_events,
        SUM(CASE WHEN fallback_used = 1 THEN 1 ELSE 0 END) AS fallback_events,
        SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END) AS error_events,
        (SELECT source FROM adminapp_module_events e2 WHERE e2.module = e1.module ORDER BY e2.created_at DESC LIMIT 1) AS last_source,
        (SELECT ok FROM adminapp_module_events e3 WHERE e3.module = e1.module ORDER BY e3.created_at DESC LIMIT 1) AS last_ok
      FROM adminapp_module_events e1
      WHERE created_at >= ?
      GROUP BY module
      ORDER BY module ASC
    `).bind(since).all<EventAggRow>()

    const syncAgg = await env.BIGDATA_DB.prepare(`
      SELECT
        module,
        COUNT(1) AS total_runs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_runs,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_runs,
        (SELECT status FROM adminapp_sync_runs s2 WHERE s2.module = s1.module ORDER BY s2.started_at DESC LIMIT 1) AS last_status,
        (SELECT finished_at FROM adminapp_sync_runs s3 WHERE s3.module = s1.module ORDER BY s3.started_at DESC LIMIT 1) AS last_finished_at
      FROM adminapp_sync_runs s1
      GROUP BY module
      ORDER BY module ASC
    `).all<SyncAggRow>()

    const modules = (eventsAgg.results ?? []).map((row) => ({
      module: String(row.module ?? 'unknown'),
      totalEvents24h: Number(row.total_events ?? 0),
      fallbackEvents24h: Number(row.fallback_events ?? 0),
      errorEvents24h: Number(row.error_events ?? 0),
      lastSource: String(row.last_source ?? 'unknown'),
      lastOk: Number(row.last_ok ?? 0) === 1,
    }))

    const sync = (syncAgg.results ?? []).map((row) => ({
      module: String(row.module ?? 'unknown'),
      totalRuns: Number(row.total_runs ?? 0),
      successRuns: Number(row.success_runs ?? 0),
      errorRuns: Number(row.error_runs ?? 0),
      lastStatus: String(row.last_status ?? 'none'),
      lastFinishedAt: Number.isFinite(Number(row.last_finished_at)) ? Number(row.last_finished_at) : null,
    }))

    return new Response(JSON.stringify({
      ok: true,
      source: 'bigdata_db',
      generatedAt: Date.now(),
      modules,
      sync,
    }), { headers: toResponseHeaders() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro operacional desconhecido'
    return new Response(JSON.stringify({
      ok: false,
      error: message,
      modules: [],
      sync: [],
      generatedAt: Date.now(),
    }), {
      status: 500,
      headers: toResponseHeaders(),
    })
  }
}
