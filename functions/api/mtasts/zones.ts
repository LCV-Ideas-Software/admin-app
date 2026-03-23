import { logModuleOperationalEvent } from '../_lib/operational'
import { createResponseTrace } from '../_lib/request-trace'
import { fetchLegacyJson, normalizeDomain, type Context, type LegacyZone, toHeaders } from '../_lib/mtasts-admin'

const mapZone = (zone: LegacyZone) => {
  const name = normalizeDomain(zone.name)
  const id = String(zone.id ?? '').trim()

  if (!name || !id) {
    return null
  }

  return {
    name,
    id,
  }
}

const toError = (message: string, trace: { request_id: string; timestamp: string }, status = 500) => new Response(JSON.stringify({
  ok: false,
  ...trace,
  error: message,
}), {
  status,
  headers: toHeaders(),
})

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request)
  try {
    const zones = await fetchLegacyJson<LegacyZone[]>(context.env, '/api/zones', 'Falha ao carregar zonas do legado MTA-STS')
    const payload = (Array.isArray(zones) ? zones : [])
      .map((zone) => mapZone(zone))
      .filter((zone): zone is NonNullable<ReturnType<typeof mapZone>> => zone !== null)

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mtasts',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'zones-list',
            totalZones: payload.length,
          },
        })
      } catch {
        // Telemetria não deve bloquear resposta.
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      ...trace,
      zones: payload,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar zonas do MTA-STS'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mtasts',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'zones-list',
          },
        })
      } catch {
        // Telemetria não deve bloquear resposta.
      }
    }

    return toError(message, trace, 502)
  }
}
