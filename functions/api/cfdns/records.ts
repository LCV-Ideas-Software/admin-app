import { logModuleOperationalEvent } from '../_lib/operational'
import type { D1Database } from '../_lib/operational'
import { createResponseTrace } from '../_lib/request-trace'
import { listCloudflareDnsRecords } from '../_lib/cloudflare-api'

type Context = {
  request: Request
  env: {
    BIGDATA_DB?: D1Database
    CLOUDFLARE_DNS?: string
    }
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

const toPositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return Math.trunc(parsed)
}

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request)
  const url = new URL(context.request.url)
  const zoneId = String(url.searchParams.get('zoneId') ?? '').trim()
  const page = toPositiveInt(url.searchParams.get('page'), 1)
  const perPage = toPositiveInt(url.searchParams.get('perPage'), 100)
  const type = String(url.searchParams.get('type') ?? '').trim().toUpperCase()
  const search = String(url.searchParams.get('search') ?? '').trim().toLowerCase()

  if (!zoneId) {
    return toError('Parâmetro zoneId é obrigatório.', trace, 400)
  }

  try {
    const payload = await listCloudflareDnsRecords(context.env, zoneId, {
      page,
      perPage,
      type,
      search,
    })

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'records-list',
            provider: 'cloudflare-api',
            zoneId,
            page: payload.pagination.page,
            perPage: payload.pagination.perPage,
            count: payload.pagination.count,
          },
        })
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      ...trace,
      zoneId,
      ...payload,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar registros DNS da zona.'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'records-list',
            provider: 'cloudflare-api',
            zoneId,
          },
        })
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return toError(message, trace, 502)
  }
}
