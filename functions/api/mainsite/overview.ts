import { logModuleOperationalEvent } from '../_lib/operational'
import { createResponseTrace } from '../_lib/request-trace'

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement
  first: <T>() => Promise<T | null>
  all: <T>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

type D1Database = {
  prepare: (query: string) => D1PreparedStatement
}

type Env = {
  BIGDATA_DB?: D1Database
  MAINSITE_WORKER_API_BASE_URL?: string
}

type Context = {
  request: Request
  env: Env
}

type MainsitePostRow = {
  id?: number
  title?: string
  created_at?: string
  is_pinned?: number
}

type LegacyPost = {
  id?: number
  title?: string
  created_at?: string
  is_pinned?: number
}

type MainsiteOverviewResponse = {
  ok: boolean
  fonte: 'bigdata_db' | 'legacy-worker'
  filtros: {
    limit: number
  }
  avisos: string[]
  resumo: {
    totalPosts: number
    totalPinned: number
    totalFinancialLogs: number | null
    totalApprovedFinancialLogs: number | null
  }
  ultimosPosts: Array<{
    id: number
    title: string
    createdAt: string
    isPinned: boolean
  }>
}

const DEFAULT_MAINSITE_WORKER_URL = 'https://mainsite-app.lcv.rio.br'

const toResponseHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

const normalizeBaseUrl = (value: string) => value.endsWith('/') ? value.slice(0, -1) : value

const parseLimit = (rawValue: string | null) => {
  const parsed = Number.parseInt(rawValue ?? '20', 10)
  if (!Number.isFinite(parsed)) {
    return 20
  }
  return Math.min(50, Math.max(1, parsed))
}

const mapPost = (post: MainsitePostRow | LegacyPost) => {
  const id = Number(post.id)
  const title = String(post.title ?? '').trim()
  const createdAt = String(post.created_at ?? '').trim()
  const isPinned = Number(post.is_pinned ?? 0) === 1

  if (!Number.isFinite(id) || !title || !createdAt) {
    return null
  }

  return {
    id,
    title,
    createdAt,
    isPinned,
  }
}

const queryBigdata = async (db: D1Database, limit: number): Promise<MainsiteOverviewResponse> => {
  const [totalPostsRow, totalPinnedRow, totalFinancialRow, totalApprovedFinancialRow, latestRows] = await Promise.all([
    db.prepare('SELECT COUNT(1) AS total FROM mainsite_posts').first<{ total?: number }>(),
    db.prepare('SELECT COUNT(1) AS total FROM mainsite_posts WHERE is_pinned = 1').first<{ total?: number }>(),
    db.prepare('SELECT COUNT(1) AS total FROM mainsite_financial_logs').first<{ total?: number }>(),
    db.prepare("SELECT COUNT(1) AS total FROM mainsite_financial_logs WHERE lower(status) IN ('approved', 'successful')").first<{ total?: number }>(),
    db.prepare('SELECT id, title, created_at, is_pinned FROM mainsite_posts ORDER BY is_pinned DESC, display_order ASC, created_at DESC LIMIT ?').bind(limit).all<MainsitePostRow>(),
  ])

  const ultimosPosts = (latestRows.results ?? [])
    .map((row) => mapPost(row))
    .filter((item): item is NonNullable<ReturnType<typeof mapPost>> => item !== null)

  return {
    ok: true,
    fonte: 'bigdata_db',
    filtros: { limit },
    avisos: [],
    resumo: {
      totalPosts: Number(totalPostsRow?.total ?? 0),
      totalPinned: Number(totalPinnedRow?.total ?? 0),
      totalFinancialLogs: Number(totalFinancialRow?.total ?? 0),
      totalApprovedFinancialLogs: Number(totalApprovedFinancialRow?.total ?? 0),
    },
    ultimosPosts,
  }
}

const queryLegacyWorker = async (baseUrl: string, limit: number, avisos: string[]): Promise<MainsiteOverviewResponse> => {
  const endpoint = `${baseUrl}/api/posts`

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Falha no worker legado: HTTP ${response.status}`)
  }

  const payload = await response.json() as LegacyPost[]
  const posts = Array.isArray(payload) ? payload : []

  const mapped = posts
    .map((post) => mapPost(post))
    .filter((item): item is NonNullable<ReturnType<typeof mapPost>> => item !== null)
    .slice(0, limit)

  const totalPinned = mapped.filter((post) => post.isPinned).length

  avisos.push('Telemetria financeira indisponível no fallback público do worker legado.')

  return {
    ok: true,
    fonte: 'legacy-worker',
    filtros: { limit },
    avisos,
    resumo: {
      totalPosts: mapped.length,
      totalPinned,
      totalFinancialLogs: null,
      totalApprovedFinancialLogs: null,
    },
    ultimosPosts: mapped,
  }
}

export async function onRequestGet(context: Context) {
  const { request, env } = context
  const trace = createResponseTrace(request)
  const url = new URL(request.url)
  const limit = parseLimit(url.searchParams.get('limit'))
  const avisos: string[] = []

  if (env.BIGDATA_DB) {
    try {
      const payload = await queryBigdata(env.BIGDATA_DB, limit)
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            totalPosts: payload.resumo.totalPosts,
            totalPinned: payload.resumo.totalPinned,
          },
        })
      } catch {
        // Não bloquear resposta por falha de telemetria.
      }

      return new Response(JSON.stringify({
        ...payload,
        ...trace,
      }), {
        headers: toResponseHeaders(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao consultar bigdata_db'
      avisos.push(`Fallback para worker legado ativado: ${message}`)
    }
  }

  const legacyBaseUrl = normalizeBaseUrl(env.MAINSITE_WORKER_API_BASE_URL ?? DEFAULT_MAINSITE_WORKER_URL)

  try {
    const payload = await queryLegacyWorker(legacyBaseUrl, limit, avisos)

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-worker',
          fallbackUsed: true,
          ok: true,
          metadata: {
            totalPosts: payload.resumo.totalPosts,
            totalPinned: payload.resumo.totalPinned,
          },
        })
      } catch {
        // Não bloquear resposta por falha de telemetria.
      }
    }

    return new Response(JSON.stringify({
      ...payload,
      ...trace,
    }), {
      headers: toResponseHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido no módulo MainSite'

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-worker',
          fallbackUsed: true,
          ok: false,
          errorMessage: message,
        })
      } catch {
        // Não bloquear resposta por falha de telemetria.
      }
    }

    return new Response(JSON.stringify({
      ok: false,
      ...trace,
      error: message,
      filtros: { limit },
      avisos,
      resumo: {
        totalPosts: 0,
        totalPinned: 0,
        totalFinancialLogs: null,
        totalApprovedFinancialLogs: null,
      },
      ultimosPosts: [],
    }), {
      status: 502,
      headers: toResponseHeaders(),
    })
  }
}
