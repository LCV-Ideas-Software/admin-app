import { finishSyncRun, logModuleOperationalEvent, startSyncRun } from '../_lib/operational'
import type { D1Database } from '../_lib/operational'

type LegacyMapa = {
  id?: string
  nome?: string
  data_nascimento?: string
}

type LegacyListResponse = {
  success?: boolean
  mapas?: LegacyMapa[]
}

type Env = {
  BIGDATA_DB?: D1Database
  ASTROLOGO_ADMIN_API_BASE_URL?: string
  ASTROLOGO_CF_ACCESS_CLIENT_ID?: string
  ASTROLOGO_CF_ACCESS_CLIENT_SECRET?: string
}

type Context = {
  request: Request
  env: Env
}

const DEFAULT_ASTROLOGO_ADMIN_URL = 'https://admin-astrologo.lcv.app.br'

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
    const baseUrl = normalizeBaseUrl(env.ASTROLOGO_ADMIN_API_BASE_URL ?? DEFAULT_ASTROLOGO_ADMIN_URL)
    const legacyListUrl = `${baseUrl}/api/admin/listar`

    const cfAccessHeaders: Record<string, string> = {}
    if (env.ASTROLOGO_CF_ACCESS_CLIENT_ID && env.ASTROLOGO_CF_ACCESS_CLIENT_SECRET) {
      cfAccessHeaders['CF-Access-Client-Id'] = env.ASTROLOGO_CF_ACCESS_CLIENT_ID
      cfAccessHeaders['CF-Access-Client-Secret'] = env.ASTROLOGO_CF_ACCESS_CLIENT_SECRET
    }

    const response = await fetch(legacyListUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...cfAccessHeaders,
      },
    })

    if (!response.ok) {
      throw new Error(`Falha no backend legado do Astrólogo: HTTP ${response.status}`)
    }

    const payload = await response.json() as LegacyListResponse
    if (!payload.success || !Array.isArray(payload.mapas)) {
      throw new Error('Resposta inválida do legado em /api/admin/listar')
    }

    const rows = payload.mapas
      .map((mapa) => toSyncRow(mapa))
      .filter((item): item is NonNullable<ReturnType<typeof toSyncRow>> => item !== null)
      .slice(0, limit)

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
      source: 'legacy-admin',
      fallbackUsed: true,
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
