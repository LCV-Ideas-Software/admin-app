import { logModuleOperationalEvent } from '../_lib/operational'
import { toHeaders, type Context } from '../_lib/astrologo-admin'
import { resolveAdminActorFromRequest } from '../_lib/admin-actor'

type AstrologoMapa = {
  id?: string
  nome?: string
  data_nascimento?: string | null
  hora_nascimento?: string | null
  local_nascimento?: string | null
  dados_astronomica?: string | null
  dados_tropical?: string | null
  dados_globais?: string | null
  analise_ia?: string | null
  created_at?: string | null
}

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

    const mapa = await context.env.ASTROLOGO_SOURCE_DB.prepare(`
      SELECT
        id,
        nome,
        data_nascimento,
        hora_nascimento,
        local_nascimento,
        dados_astronomica,
        dados_tropical,
        dados_globais,
        analise_ia,
        created_at
      FROM mapas_astrologicos
      WHERE id = ?
      LIMIT 1
    `)
      .bind(id)
      .first<AstrologoMapa>()

    if (!mapa) {
      return json({ ok: false, error: 'Mapa não encontrado.' }, 404)
    }

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'astrologo',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'read-mapa',
            mapaId: id,
            adminActor,
          },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({
      ok: true,
      mapa,
      admin_actor: adminActor,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao ler mapa do Astrólogo'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'astrologo',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: 'read-mapa' },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: false, error: message }, 500)
  }
}
