import { logModuleOperationalEvent } from '../_lib/operational'
import { createResponseTrace } from '../_lib/request-trace'
import { listCloudflareZones } from '../_lib/cloudflare-api'

type Context = {
  request: Request
  env: {
    BIGDATA_DB?: D1Database
    CLOUDFLARE_DNS?: string
    }
}

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement
  first: <T>() => Promise<T | null>
  all: <T>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

type D1Database = {
  prepare: (query: string) => D1PreparedStatement
}

const toHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

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
    const payload = await listCloudflareZones(context.env)

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mtasts',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'zones-list',
            provider: 'cloudflare-api',
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
      fonte: 'cloudflare-api',
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
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'zones-list',
            provider: 'cloudflare-api',
          },
        })
      } catch {
        // Telemetria não deve bloquear resposta.
      }
    }

    return toError(message, trace, 502)
  }
}
