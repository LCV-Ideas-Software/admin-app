import { logModuleOperationalEvent } from '../_lib/operational'
import { createResponseTrace } from '../_lib/request-trace'
import { fetchLegacyJson, normalizeDomain, type Context, type LegacyPolicyPayload, toHeaders } from '../_lib/mtasts-admin'

type PolicyResponse = {
  savedPolicy: string | null
  savedEmail: string | null
  dnsTlsRptEmail: string | null
  dnsMtaStsId: string | null
  lastGeneratedId: string | null
  mxRecords: string[]
}

const toError = (message: string, trace: { request_id: string; timestamp: string }, status = 500) => new Response(JSON.stringify({
  ok: false,
  ...trace,
  error: message,
}), {
  status,
  headers: toHeaders(),
})

const mapPolicyPayload = (payload: LegacyPolicyPayload): PolicyResponse => ({
  savedPolicy: typeof payload.savedPolicy === 'string' ? payload.savedPolicy : null,
  savedEmail: typeof payload.savedEmail === 'string' ? payload.savedEmail.trim().toLowerCase() : null,
  dnsTlsRptEmail: typeof payload.dnsTlsRptEmail === 'string' ? payload.dnsTlsRptEmail.trim().toLowerCase() : null,
  dnsMtaStsId: typeof payload.dnsMtaStsId === 'string' ? payload.dnsMtaStsId.trim() : null,
  lastGeneratedId: typeof payload.lastGeneratedId === 'string' ? payload.lastGeneratedId.trim() : null,
  mxRecords: Array.isArray(payload.mxRecords)
    ? payload.mxRecords.map((record) => String(record).trim().toLowerCase()).filter(Boolean)
    : [],
})

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request)
  const url = new URL(context.request.url)
  const domain = normalizeDomain(url.searchParams.get('domain'))
  const zoneId = String(url.searchParams.get('zoneId') ?? '').trim()

  if (!domain || !zoneId) {
    return toError('Parâmetros domain e zoneId são obrigatórios.', trace, 400)
  }

  try {
    const payload = await fetchLegacyJson<LegacyPolicyPayload>(
      context.env,
      `/api/policy?domain=${encodeURIComponent(domain)}&zoneId=${encodeURIComponent(zoneId)}`,
      `Falha ao auditar policy do domínio ${domain}`,
    )

    const mapped = mapPolicyPayload(payload)

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mtasts',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'policy-read',
            domain,
            hasSavedPolicy: Boolean(mapped.savedPolicy),
          },
        })
      } catch {
        // Telemetria não deve bloquear resposta.
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      ...trace,
      domain,
      zoneId,
      policy: mapped,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar policy do domínio'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mtasts',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'policy-read',
            domain,
          },
        })
      } catch {
        // Telemetria não deve bloquear resposta.
      }
    }

    return toError(message, trace, 502)
  }
}
