import { logModuleOperationalEvent } from '../_lib/operational'
import { fetchLegacyAdminJson, fetchLegacyJson, type Context, type LegacyPost, toHeaders, upsertPostsIntoBigdata } from '../_lib/mainsite-admin'
import { resolveAdminActorFromRequest } from '../_lib/admin-actor'

const parseId = (rawValue: unknown) => {
  const parsed = Number(rawValue)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

const buildErrorResponse = (message: string, status = 500) => new Response(JSON.stringify({
  ok: false,
  error: message,
}), {
  status,
  headers: toHeaders(),
})

export async function onRequestPost(context: Context) {
  try {
    const body = await context.request.json() as { id?: unknown }
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>)
    const id = parseId(body.id)

    if (!id) {
      return buildErrorResponse('ID válido é obrigatório para alternar fixação do post.', 400)
    }

    const payload = await fetchLegacyAdminJson<{ success?: boolean; is_pinned?: number }>(
      context.env,
      `/api/posts/${id}/pin`,
      'PUT',
      'Falha ao alternar fixação do post no MainSite legado',
      undefined,
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
            action: 'pin-post',
            adminActor,
            id,
            isPinned: Number(payload.is_pinned ?? 0) === 1,
            syncedPosts,
          },
        })
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      id,
      isPinned: Number(payload.is_pinned ?? 0) === 1,
      syncedPosts,
      admin_actor: adminActor,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao alternar fixação do post do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-worker',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'pin-post',
          },
        })
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message)
  }
}
