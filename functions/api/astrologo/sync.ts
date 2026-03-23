import { finishSyncRun, logModuleOperationalEvent, startSyncRun } from '../_lib/operational'
import type { D1Database } from '../_lib/operational'

type LegacyMapa = {
  id?: string
  nome?: string
  data_nascimento?: string
}

type Env = {
  BIGDATA_DB?: D1Database
  ASTROLOGO_SOURCE_DB?: D1Database
}

type Context = {
  request: Request
  env: Env
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

const toSyncRow = (mapa: LegacyMapa) => {
  const id = String(mapa.id ?? '').trim()
  const nome = String(mapa.nome ?? '').trim()
  const dataNascimento = String(mapa.data_nascimento ?? '').trim()

  if (!id || !nome || !dataNascimento) {
    return null
  }

  return {
    id,
    nome,
    dataNascimento,
  }
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

  if (!env.ASTROLOGO_SOURCE_DB) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'ASTROLOGO_SOURCE_DB não configurado no runtime.',
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
    module: 'astrologo',
    status: 'running',
    startedAt,
    metadata: { limit, dryRun },
  })

  try {
    const source = await env.ASTROLOGO_SOURCE_DB.prepare(`
      SELECT id, nome, data_nascimento
      FROM mapas_astrologicos
      ORDER BY created_at DESC
      LIMIT ?
    `)
      .bind(limit)
      .all<LegacyMapa>()

    const rows = (source.results ?? [])
      .map((mapa) => toSyncRow(mapa))
      .filter((item): item is NonNullable<ReturnType<typeof toSyncRow>> => item !== null)

    let upserted = 0

    if (!dryRun) {
      for (const row of rows) {
        await env.BIGDATA_DB.prepare(`
          INSERT INTO astrologo_mapas (id, nome, data_nascimento, created_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            nome = excluded.nome,
            data_nascimento = excluded.data_nascimento
        `)
          .bind(row.id, row.nome, row.dataNascimento)
          .run()

        upserted += 1
      }
    }

    await finishSyncRun(env.BIGDATA_DB, {
      id: syncRunId,
      status: 'success',
      finishedAt: Date.now(),
      recordsRead: rows.length,
      recordsUpserted: dryRun ? 0 : upserted,
    })

    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'astrologo',
      source: 'bigdata_db',
      fallbackUsed: false,
      ok: true,
      metadata: {
        action: 'sync',
        dryRun,
        limit,
        recordsRead: rows.length,
        recordsUpserted: dryRun ? 0 : upserted,
      },
    })

    return new Response(JSON.stringify({
      ok: true,
      dryRun,
      syncRunId,
      recordsRead: rows.length,
      recordsUpserted: dryRun ? 0 : upserted,
      startedAt,
      finishedAt: Date.now(),
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha inesperada no sync do Astrólogo'

    await finishSyncRun(env.BIGDATA_DB, {
      id: syncRunId,
      status: 'error',
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message,
    })

    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'astrologo',
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
