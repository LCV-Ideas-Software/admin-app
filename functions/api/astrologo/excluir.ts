import { logModuleOperationalEvent } from '../_lib/operational'
import { toHeaders, type Context } from '../_lib/astrologo-admin'
import { resolveAdminActorFromRequest } from '../_lib/admin-actor'

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: toHeaders(),
})

export async function onRequestPost(context: Context) {
  if (!context.env.ASTROLOGO_SOURCE_DB) {
    return json({ ok: false, error: 'ASTROLOGO_SOURCE_DB não configurado no runtime.' }, 503)
  }

  try {
    const body = await context.request.json() as Record<string, unknown>
    const adminActor = resolveAdminActorFromRequest(context.request, body)
    const id = String(body.id ?? '').trim()

    if (!id) {
      return json({ ok: false, error: 'ID inválido.' }, 400)
    }

    await context.env.ASTROLOGO_SOURCE_DB.prepare('DELETE FROM mapas_astrologicos WHERE id = ?')
      .bind(id)
      .run()

    if (context.env.BIGDATA_DB) {
      await context.env.BIGDATA_DB.prepare('DELETE FROM astrologo_mapas WHERE id = ?')
        .bind(id)
        .run()

      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'astrologo',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'delete-mapa',
            mapaId: id,
            adminActor,
          },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: true, id, admin_actor: adminActor })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao excluir mapa do Astrólogo'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'astrologo',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: 'delete-mapa' },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: false, error: message }, 500)
  }
}
