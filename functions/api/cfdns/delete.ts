import { logModuleOperationalEvent } from '../_lib/operational'
import type { D1Database } from '../_lib/operational'
import { resolveAdminActorFromRequest } from '../_lib/admin-actor'
import { createResponseTrace } from '../_lib/request-trace'
import { deleteCloudflareDnsRecord } from '../_lib/cloudflare-api'

type Context = {
  request: Request
  env: {
    BIGDATA_DB?: D1Database
    CF_API_TOKEN?: string
    CLOUDFLARE_DNS?: string
    CLOUDFLARE_API_TOKEN?: string
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

export async function onRequestDelete(context: Context) {
  const trace = createResponseTrace(context.request)
  const url = new URL(context.request.url)
  const zoneId = String(url.searchParams.get('zoneId') ?? '').trim()
  const recordId = String(url.searchParams.get('recordId') ?? '').trim()
  const adminActor = resolveAdminActorFromRequest(context.request)

  if (!zoneId || !recordId) {
    return toError('Parâmetros zoneId e recordId são obrigatórios.', trace, 400)
  }

  try {
    await deleteCloudflareDnsRecord(context.env, zoneId, recordId)

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'record-delete',
            provider: 'cloudflare-api',
            adminActor,
            zoneId,
            recordId,
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
      recordId,
      deleted: true,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao remover registro DNS.'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'record-delete',
            provider: 'cloudflare-api',
            zoneId,
            recordId,
          },
        })
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return toError(message, trace, 502)
  }
}
