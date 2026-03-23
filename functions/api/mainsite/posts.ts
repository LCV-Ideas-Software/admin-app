import { logModuleOperationalEvent } from '../_lib/operational'
import { deletePostFromBigdata, fetchLegacyAdminJson, fetchLegacyJson, type Context, type LegacyPost, toHeaders, upsertPostsIntoBigdata } from '../_lib/mainsite-admin'
import { resolveAdminActorFromRequest } from '../_lib/admin-actor'

const parseId = (rawValue: unknown) => {
  const parsed = Number(rawValue)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

const parseText = (rawValue: unknown) => String(rawValue ?? '').trim()

const buildErrorResponse = (message: string, status = 500) => new Response(JSON.stringify({
  ok: false,
  error: message,
}), {
  status,
  headers: toHeaders(),
})

export async function onRequestGet(context: Context) {
  const { request } = context
  const url = new URL(request.url)
  const id = parseId(url.searchParams.get('id'))

  try {
    if (id) {
      const payload = await fetchLegacyJson<LegacyPost>(context.env, `/api/posts/${id}`, 'Falha ao consultar post do MainSite legado')
      return new Response(JSON.stringify({ ok: true, post: payload }), {
        headers: toHeaders(),
      })
    }

    const payload = await fetchLegacyJson<LegacyPost[]>(context.env, '/api/posts', 'Falha ao listar posts do MainSite legado')
    return new Response(JSON.stringify({ ok: true, posts: Array.isArray(payload) ? payload : [] }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar posts do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-worker',
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

    return buildErrorResponse(message, 502)
  }
}

export async function onRequestPost(context: Context) {
  try {
    const body = await context.request.json() as { title?: unknown; content?: unknown }
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>)
    const title = parseText(body.title)
    const content = parseText(body.content)

    if (!title || !content) {
      return buildErrorResponse('Título e conteúdo são obrigatórios para criar um post.', 400)
    }

    await fetchLegacyAdminJson<{ success?: boolean }>(
      context.env,
      '/api/posts',
      'POST',
      'Falha ao criar post no MainSite legado',
      { title, content },
      adminActor,
    )

    let syncedPosts = 0
    if (context.env.BIGDATA_DB) {
      const posts = await fetchLegacyJson<LegacyPost[]>(context.env, '/api/posts', 'Falha ao reconfirmar posts do MainSite legado')
      syncedPosts = await upsertPostsIntoBigdata(context.env.BIGDATA_DB, Array.isArray(posts) ? posts : [])

      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-worker',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'create-post',
            adminActor,
            syncedPosts,
            titleLength: title.length,
          },
        })
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      syncedPosts,
      admin_actor: adminActor,
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
          source: 'legacy-worker',
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

    return buildErrorResponse(message)
  }
}

export async function onRequestPut(context: Context) {
  try {
    const body = await context.request.json() as { id?: unknown; title?: unknown; content?: unknown }
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>)
    const id = parseId(body.id)
    const title = parseText(body.title)
    const content = parseText(body.content)

    if (!id || !title || !content) {
      return buildErrorResponse('ID, título e conteúdo são obrigatórios para atualizar um post.', 400)
    }

    await fetchLegacyAdminJson<{ success?: boolean }>(
      context.env,
      `/api/posts/${id}`,
      'PUT',
      'Falha ao atualizar post no MainSite legado',
      { title, content },
      adminActor,
    )

    let syncedPosts = 0
    if (context.env.BIGDATA_DB) {
      const post = await fetchLegacyJson<LegacyPost>(context.env, `/api/posts/${id}`, 'Falha ao recarregar post do MainSite legado')
      syncedPosts = await upsertPostsIntoBigdata(context.env.BIGDATA_DB, [post])

      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-worker',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'update-post',
            adminActor,
            id,
            syncedPosts,
          },
        })
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      syncedPosts,
      admin_actor: adminActor,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao atualizar post do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-worker',
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

    return buildErrorResponse(message)
  }
}

export async function onRequestDelete(context: Context) {
  try {
    const body = await context.request.json() as { id?: unknown }
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>)
    const id = parseId(body.id)

    if (!id) {
      return buildErrorResponse('ID válido é obrigatório para excluir um post.', 400)
    }

    await fetchLegacyAdminJson<{ success?: boolean }>(
      context.env,
      `/api/posts/${id}`,
      'DELETE',
      'Falha ao excluir post no MainSite legado',
      undefined,
      adminActor,
    )

    if (context.env.BIGDATA_DB) {
      await deletePostFromBigdata(context.env.BIGDATA_DB, id)

      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-worker',
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
    }

    return new Response(JSON.stringify({
      ok: true,
      deletedId: id,
      admin_actor: adminActor,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao excluir post do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-worker',
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

    return buildErrorResponse(message)
  }
}
