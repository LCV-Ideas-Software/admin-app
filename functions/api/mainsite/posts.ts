import { logModuleOperationalEvent } from '../_lib/operational'
import { toHeaders, type Context } from '../_lib/mainsite-admin'
import { resolveAdminActorFromRequest } from '../_lib/admin-actor'
import { createResponseTrace, type ResponseTrace } from '../_lib/request-trace'

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement
  first: <T>() => Promise<T | null>
  all: <T>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

type D1Database = {
  prepare: (query: string) => D1PreparedStatement
}

type MainsiteEnv = Context['env'] & {
  BIGDATA_DB?: D1Database
}

type MainsiteContext = {
  request: Request
  env: MainsiteEnv
}

type PostRow = {
  id?: number
  title?: string
  content?: string
  created_at?: string
  updated_at?: string
  is_pinned?: number
}

const parseId = (rawValue: unknown) => {
  const parsed = Number(rawValue)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

const parseText = (rawValue: unknown) => String(rawValue ?? '').trim()

const mapPostRow = (row: PostRow) => {
  const id = Number(row.id)
  const title = String(row.title ?? '').trim()
  const content = String(row.content ?? '').trim()
  const createdAt = String(row.created_at ?? '').trim()
  const updatedAt = row.updated_at ? String(row.updated_at).trim() : null

  if (!Number.isFinite(id) || !title || !content || !createdAt) {
    return null
  }

  return {
    id,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    is_pinned: Number(row.is_pinned ?? 0) === 1 ? 1 : 0,
  }
}

const buildErrorResponse = (message: string, trace: ResponseTrace, status = 500) => new Response(JSON.stringify({
  ok: false,
  error: message,
  ...trace,
}), {
  status,
  headers: toHeaders(),
})

const requireDb = (env: MainsiteEnv) => {
  if (!env.BIGDATA_DB) {
    throw new Error('BIGDATA_DB não configurado no runtime do admin-app.')
  }
  return env.BIGDATA_DB
}

export async function onRequestGet(context: MainsiteContext) {
  const { request } = context
  const trace = createResponseTrace(request)
  const url = new URL(request.url)
  const id = parseId(url.searchParams.get('id'))

  try {
    const db = requireDb(context.env)

    if (id) {
      const row = await db.prepare(`
        SELECT id, title, content, created_at, updated_at, is_pinned
        FROM mainsite_posts
        WHERE id = ?
        LIMIT 1
      `)
        .bind(id)
        .first<PostRow>()

      const post = row ? mapPostRow(row) : null
      if (!post) {
        return buildErrorResponse('Post não encontrado para o ID informado.', trace, 404)
      }

      return new Response(JSON.stringify({ ok: true, post, ...trace }), {
        headers: toHeaders(),
      })
    }

    const rows = await db.prepare(`
      SELECT id, title, content, created_at, updated_at, is_pinned
      FROM mainsite_posts
      ORDER BY is_pinned DESC, display_order ASC, created_at DESC
    `).all<PostRow>()

    const posts = (rows.results ?? [])
      .map((row) => mapPostRow(row))
      .filter((item): item is NonNullable<ReturnType<typeof mapPostRow>> => item !== null)

    return new Response(JSON.stringify({ ok: true, posts, ...trace }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar posts do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: id ? 'post-detail' : 'posts-list',
          },
        })
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, trace, 500)
  }
}

export async function onRequestPost(context: MainsiteContext) {
  const trace = createResponseTrace(context.request)

  try {
    const db = requireDb(context.env)
    const body = await context.request.json() as { title?: unknown; content?: unknown }
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>)
    const title = parseText(body.title)
    const content = parseText(body.content)

    if (!title || !content) {
      return buildErrorResponse('Título e conteúdo são obrigatórios para criar um post.', trace, 400)
    }

    await db.prepare(`
      INSERT INTO mainsite_posts (title, content, is_pinned, display_order, created_at, updated_at)
      VALUES (?, ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
      .bind(title, content)
      .run()

    const created = await db.prepare(`
      SELECT id, title, content, created_at, is_pinned
      FROM mainsite_posts
      ORDER BY id DESC
      LIMIT 1
    `).first<PostRow>()

    const createdPost = created ? mapPostRow(created) : null

    try {
      await logModuleOperationalEvent(db, {
        module: 'mainsite',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: 'create-post',
          adminActor,
          createdId: createdPost?.id ?? null,
          titleLength: title.length,
        },
      })
    } catch {
      // Telemetria não deve bloquear a resposta.
    }

    return new Response(JSON.stringify({
      ok: true,
      post: createdPost,
      admin_actor: adminActor,
      ...trace,
    }), {
      status: 201,
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao criar post do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'create-post',
          },
        })
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, trace)
  }
}

export async function onRequestPut(context: MainsiteContext) {
  const trace = createResponseTrace(context.request)

  try {
    const db = requireDb(context.env)
    const body = await context.request.json() as { id?: unknown; title?: unknown; content?: unknown }
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>)
    const id = parseId(body.id)
    const title = parseText(body.title)
    const content = parseText(body.content)

    if (!id || !title || !content) {
      return buildErrorResponse('ID, título e conteúdo são obrigatórios para atualizar um post.', trace, 400)
    }

    await db.prepare('UPDATE mainsite_posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(title, content, id)
      .run()

    const row = await db.prepare(`
      SELECT id, title, content, created_at, is_pinned
      FROM mainsite_posts
      WHERE id = ?
      LIMIT 1
    `)
      .bind(id)
      .first<PostRow>()

    const updatedPost = row ? mapPostRow(row) : null
    if (!updatedPost) {
      return buildErrorResponse('Post não encontrado para atualização.', trace, 404)
    }

    try {
      await logModuleOperationalEvent(db, {
        module: 'mainsite',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: 'update-post',
          adminActor,
          id,
        },
      })
    } catch {
      // Telemetria não deve bloquear a resposta.
    }

    return new Response(JSON.stringify({
      ok: true,
      post: updatedPost,
      admin_actor: adminActor,
      ...trace,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao atualizar post do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'update-post',
          },
        })
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, trace)
  }
}

export async function onRequestDelete(context: MainsiteContext) {
  const trace = createResponseTrace(context.request)

  try {
    const db = requireDb(context.env)
    const body = await context.request.json() as { id?: unknown }
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>)
    const id = parseId(body.id)

    if (!id) {
      return buildErrorResponse('ID válido é obrigatório para excluir um post.', trace, 400)
    }

    await db.prepare('DELETE FROM mainsite_posts WHERE id = ?')
      .bind(id)
      .run()

    try {
      await logModuleOperationalEvent(db, {
        module: 'mainsite',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: 'delete-post',
          adminActor,
          id,
        },
      })
    } catch {
      // Telemetria não deve bloquear a resposta.
    }

    return new Response(JSON.stringify({
      ok: true,
      deletedId: id,
      admin_actor: adminActor,
      ...trace,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao excluir post do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'delete-post',
          },
        })
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, trace)
  }
}
