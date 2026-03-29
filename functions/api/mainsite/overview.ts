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

type MainsiteOverviewResponse = {
  ok: boolean
  fonte: 'bigdata_db'
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

const toResponseHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

const parseLimit = (rawValue: string | null) => {
  const parsed = Number.parseInt(rawValue ?? '20', 10)
  if (!Number.isFinite(parsed)) {
    return 20
  }
  return Math.min(50, Math.max(1, parsed))
}

const mapPost = (post: MainsitePostRow) => {
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
  const [totalPostsRow, totalPinnedRow, latestRows] = await Promise.all([
    db.prepare('SELECT COUNT(1) AS total FROM mainsite_posts').first<{ total?: number }>(),
    db.prepare('SELECT COUNT(1) AS total FROM mainsite_posts WHERE is_pinned = 1').first<{ total?: number }>(),
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
      totalFinancialLogs: null,
      totalApprovedFinancialLogs: null,
    },
    ultimosPosts,
  }
}

export async function onRequestGet(context: Context) {
  const { request, env } = context
  const trace = createResponseTrace(request)
  const url = new URL(request.url)
  const limit = parseLimit(url.searchParams.get('limit'))

  if (!env.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: false,
      ...trace,
      error: 'BIGDATA_DB não configurado no runtime do admin-app.',
      filtros: { limit },
      avisos: ['Leitura de overview do MainSite depende do BIGDATA_DB interno.'],
      resumo: {
        totalPosts: 0,
        totalPinned: 0,
        totalFinancialLogs: null,
        totalApprovedFinancialLogs: null,
      },
      ultimosPosts: [],
    }), {
      status: 503,
      headers: toResponseHeaders(),
    })
  }

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
    const message = error instanceof Error ? error.message : 'Erro desconhecido no módulo MainSite'

    try {
      await logModuleOperationalEvent(env.BIGDATA_DB, {
        module: 'mainsite',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: false,
        errorMessage: message,
      })
    } catch {
      // Não bloquear resposta por falha de telemetria.
    }

    return new Response(JSON.stringify({
      ok: false,
      ...trace,
      error: message,
      filtros: { limit },
      avisos: [],
      resumo: {
        totalPosts: 0,
        totalPinned: 0,
        totalFinancialLogs: null,
        totalApprovedFinancialLogs: null,
      },
      ultimosPosts: [],
    }), {
      status: 500,
      headers: toResponseHeaders(),
    })
  }
}
