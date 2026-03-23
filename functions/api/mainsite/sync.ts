import { finishSyncRun, logModuleOperationalEvent, startSyncRun } from '../_lib/operational'
import type { D1Database } from '../_lib/operational'

type Env = {
  BIGDATA_DB?: D1Database
  MAINSITE_WORKER_API_BASE_URL?: string
}

type Context = {
  request: Request
  env: Env
}

type LegacyPost = {
  id?: number
  title?: string
  content?: string
  is_pinned?: number | boolean
  display_order?: number
  created_at?: string
}

type LegacySettingsPayload = Record<string, unknown>

type SyncPostRow = {
  id: number
  title: string
  content: string
  isPinned: number
  displayOrder: number
  createdAt: string
}

const DEFAULT_MAINSITE_WORKER_URL = 'https://mainsite-app.lcv.rio.br'

const parseLimit = (rawValue: string | null) => {
  const parsed = Number.parseInt(rawValue ?? '200', 10)
  if (!Number.isFinite(parsed)) {
    return 200
  }
  return Math.min(1000, Math.max(1, parsed))
}

const parseDryRun = (rawValue: string | null) => rawValue === '1' || rawValue === 'true'

const normalizeBaseUrl = (value: string) => value.endsWith('/') ? value.slice(0, -1) : value

const toHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

const toSyncPostRow = (item: LegacyPost) => {
  const id = Number(item.id)
  const title = String(item.title ?? '').trim()
  const content = String(item.content ?? '').trim()
  const createdAt = String(item.created_at ?? '').trim()
  const displayOrder = Number(item.display_order ?? 0)

  if (!Number.isFinite(id) || !title || !content || !createdAt) {
    return null
  }

  return {
    id,
    title,
    content,
    isPinned: Number(item.is_pinned) === 1 || item.is_pinned === true ? 1 : 0,
    displayOrder: Number.isFinite(displayOrder) ? Math.trunc(displayOrder) : 0,
    createdAt,
  } satisfies SyncPostRow
}

const toSyncSettingRow = (id: string, payload: LegacySettingsPayload) => ({
  id,
  payload: JSON.stringify(payload),
})

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
  const baseUrl = normalizeBaseUrl(env.MAINSITE_WORKER_API_BASE_URL ?? DEFAULT_MAINSITE_WORKER_URL)

  const startedAt = Date.now()
  const syncRunId = await startSyncRun(env.BIGDATA_DB, {
    module: 'mainsite',
    status: 'running',
    startedAt,
    metadata: { limit, dryRun },
  })

  try {
    const [postsResponse, appearanceResponse, rotationResponse, disclaimersResponse] = await Promise.all([
      fetch(`${baseUrl}/api/posts`, { headers: { Accept: 'application/json' } }),
      fetch(`${baseUrl}/api/settings`, { headers: { Accept: 'application/json' } }),
      fetch(`${baseUrl}/api/settings/rotation`, { headers: { Accept: 'application/json' } }),
      fetch(`${baseUrl}/api/settings/disclaimers`, { headers: { Accept: 'application/json' } }),
    ])

    if (!postsResponse.ok) {
      throw new Error(`Falha ao ler posts do MainSite legado: HTTP ${postsResponse.status}`)
    }

    if (!appearanceResponse.ok || !rotationResponse.ok || !disclaimersResponse.ok) {
      throw new Error('Falha ao ler settings públicos do MainSite legado.')
    }

    const postsPayload = await postsResponse.json() as LegacyPost[]
    const appearancePayload = await appearanceResponse.json() as LegacySettingsPayload
    const rotationPayload = await rotationResponse.json() as LegacySettingsPayload
    const disclaimersPayload = await disclaimersResponse.json() as LegacySettingsPayload

    const posts = (Array.isArray(postsPayload) ? postsPayload : [])
      .map((item) => toSyncPostRow(item))
      .filter((item): item is SyncPostRow => item !== null)
      .slice(0, limit)

    const settings = [
      toSyncSettingRow('mainsite/appearance', appearancePayload),
      toSyncSettingRow('mainsite/rotation', rotationPayload),
      toSyncSettingRow('mainsite/disclaimers', disclaimersPayload),
    ]

    let postsUpserted = 0
    let settingsUpserted = 0

    if (!dryRun) {
      for (const post of posts) {
        await env.BIGDATA_DB.prepare(`
          INSERT INTO mainsite_posts (id, title, content, is_pinned, display_order, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            content = excluded.content,
            is_pinned = excluded.is_pinned,
            display_order = excluded.display_order,
            created_at = excluded.created_at
        `)
          .bind(post.id, post.title, post.content, post.isPinned, post.displayOrder, post.createdAt)
          .run()

        postsUpserted += 1
      }

      for (const setting of settings) {
        await env.BIGDATA_DB.prepare(`
          INSERT INTO mainsite_settings (id, payload, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            payload = excluded.payload,
            updated_at = CURRENT_TIMESTAMP
        `)
          .bind(setting.id, setting.payload)
          .run()

        settingsUpserted += 1
      }
    }

    const recordsRead = posts.length + settings.length
    const recordsUpserted = dryRun ? 0 : postsUpserted + settingsUpserted

    await finishSyncRun(env.BIGDATA_DB, {
      id: syncRunId,
      status: 'success',
      finishedAt: Date.now(),
      recordsRead,
      recordsUpserted,
    })

    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'mainsite',
      source: 'bigdata_db',
      fallbackUsed: false,
      ok: true,
      metadata: {
        action: 'sync',
        pulledFrom: 'legacy-worker',
        dryRun,
        limit,
        postsLidos: posts.length,
        postsUpserted: dryRun ? 0 : postsUpserted,
        settingsLidos: settings.length,
        settingsUpserted: dryRun ? 0 : settingsUpserted,
        skippedPrivateSettings: ['mainsite/ratelimit'],
      },
    })

    return new Response(JSON.stringify({
      ok: true,
      dryRun,
      syncRunId,
      recordsRead,
      recordsUpserted,
      posts: {
        lidos: posts.length,
        upserted: dryRun ? 0 : postsUpserted,
      },
      settings: {
        lidos: settings.length,
        upserted: dryRun ? 0 : settingsUpserted,
        ignorados: ['mainsite/ratelimit'],
      },
      startedAt,
      finishedAt: Date.now(),
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha inesperada no sync do MainSite'

    await finishSyncRun(env.BIGDATA_DB, {
      id: syncRunId,
      status: 'error',
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message,
    })

    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'mainsite',
      source: 'bigdata_db',
      fallbackUsed: false,
      ok: false,
      errorMessage: message,
      metadata: {
        action: 'sync',
        pulledFrom: 'legacy-worker',
        dryRun,
        limit,
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
