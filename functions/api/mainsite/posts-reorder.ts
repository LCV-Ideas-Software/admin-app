import { logModuleOperationalEvent } from '../_lib/operational'
import { toHeaders, type Context } from '../_lib/mainsite-admin'
import { resolveAdminActorFromRequest } from '../_lib/admin-actor'
import { createResponseTrace } from '../_lib/request-trace'

type D1Database = {
  prepare: (query: string) => {
    bind: (...values: Array<string | number | null>) => {
      run: () => Promise<unknown>
    }
  }
}

type ReorderItem = {
  id: number
  display_order: number
}

type MainsiteEnv = Context['env'] & {
  BIGDATA_DB?: D1Database
}

type MainsiteContext = {
  request: Request
  env: MainsiteEnv
}

const buildErrorResponse = (message: string, trace: Record<string, unknown>, status = 500) => new Response(JSON.stringify({
  ok: false,
  error: message,
  ...trace,
}), {
  status,
  headers: toHeaders(),
})

export async function onRequestPost(context: MainsiteContext) {
  const trace = createResponseTrace(context.request)

  try {
    const db = context.env.BIGDATA_DB
    if (!db) {
      return buildErrorResponse('BIGDATA_DB não configurado no runtime.', trace, 503)
    }

    const body = await context.request.json() as { items?: unknown }
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>)

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return buildErrorResponse('Lista de itens para reordenação é obrigatória.', trace, 400)
    }

    const items: ReorderItem[] = body.items
      .filter((item: unknown): item is { id: number; display_order: number } => {
        if (typeof item !== 'object' || item === null) return false
        const obj = item as Record<string, unknown>
        return Number.isInteger(obj.id) && Number.isInteger(obj.display_order)
      })

    if (items.length === 0) {
      return buildErrorResponse('Nenhum item válido para reordenação.', trace, 400)
    }

    for (const item of items) {
      await db.prepare('UPDATE mainsite_posts SET display_order = ? WHERE id = ?')
        .bind(item.display_order, item.id)
        .run()
    }

    try {
      await logModuleOperationalEvent(context.env.BIGDATA_DB as Parameters<typeof logModuleOperationalEvent>[0], {
        module: 'mainsite',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: 'reorder-posts',
          adminActor,
          itemCount: items.length,
        },
      })
    } catch {
      // Telemetria não deve bloquear a resposta.
    }

    return new Response(JSON.stringify({
      ok: true,
      reordered: items.length,
      admin_actor: adminActor,
      ...trace,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao reordenar posts do MainSite'
    return buildErrorResponse(message, trace)
  }
}
