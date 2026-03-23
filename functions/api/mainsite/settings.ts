import { logModuleOperationalEvent } from '../_lib/operational'
import { fetchLegacyAdminJson, readLegacyPublicSettings, type Context, type MainsitePublicSettings, toHeaders, upsertPublicSettingsIntoBigdata } from '../_lib/mainsite-admin'
import { resolveAdminActorFromRequest } from '../_lib/admin-actor'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const buildErrorResponse = (message: string, status = 500) => new Response(JSON.stringify({
  ok: false,
  error: message,
}), {
  status,
  headers: toHeaders(),
})

export async function onRequestGet(context: Context) {
  try {
    const settings = await readLegacyPublicSettings(context.env)

    return new Response(JSON.stringify({
      ok: true,
      settings,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar settings públicos do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-worker',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'read-public-settings',
          },
        })
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, 502)
  }
}

export async function onRequestPut(context: Context) {
  try {
    const body = await context.request.json() as Partial<MainsitePublicSettings>
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>)

    if (!isRecord(body.appearance) || !isRecord(body.rotation) || !isRecord(body.disclaimers)) {
      return buildErrorResponse('Appearance, rotation e disclaimers precisam ser objetos JSON válidos.', 400)
    }

    const settings: MainsitePublicSettings = {
      appearance: body.appearance,
      rotation: body.rotation,
      disclaimers: body.disclaimers,
    }

    await Promise.all([
      fetchLegacyAdminJson<{ success?: boolean }>(context.env, '/api/settings', 'PUT', 'Falha ao salvar appearance no MainSite legado', settings.appearance, adminActor),
      fetchLegacyAdminJson<{ success?: boolean }>(context.env, '/api/settings/rotation', 'PUT', 'Falha ao salvar rotation no MainSite legado', settings.rotation, adminActor),
      fetchLegacyAdminJson<{ success?: boolean }>(context.env, '/api/settings/disclaimers', 'PUT', 'Falha ao salvar disclaimers no MainSite legado', settings.disclaimers, adminActor),
    ])

    let settingsUpserted = 0
    if (context.env.BIGDATA_DB) {
      settingsUpserted = await upsertPublicSettingsIntoBigdata(context.env.BIGDATA_DB, settings)

      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-worker',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'save-public-settings',
            adminActor,
            settingsUpserted,
          },
        })
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      settingsUpserted,
      admin_actor: adminActor,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar settings públicos do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-worker',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'save-public-settings',
          },
        })
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message)
  }
}
