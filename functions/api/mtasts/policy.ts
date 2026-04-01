import { logModuleOperationalEvent } from '../_lib/operational'
import { createResponseTrace } from '../_lib/request-trace'
import { getCloudflareDnsSnapshot } from '../_lib/cloudflare-api'

type PolicyResponse = {
  savedPolicy: string | null
  savedEmail: string | null
  dnsTlsRptEmail: string | null
  dnsMtaStsId: string | null
  lastGeneratedId: string | null
  mxRecords: string[]
}

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

type DbPolicyRow = {
  policy_text?: string | null
  tlsrpt_email?: string | null
}

type DbHistoryRow = {
  gerado_em?: string | null
}

const normalizeDomain = (rawValue: string | null) => String(rawValue ?? '').trim().toLowerCase()

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
  const url = new URL(context.request.url)
  const domain = normalizeDomain(url.searchParams.get('domain'))
  const zoneId = String(url.searchParams.get('zoneId') ?? '').trim()

  if (!domain || !zoneId) {
    return toError('Parâmetros domain e zoneId são obrigatórios.', trace, 400)
  }

  try {
    const dnsSnapshot = await getCloudflareDnsSnapshot(context.env, domain, zoneId)

    let savedPolicy: string | null = null
    let savedEmail: string | null = null
    let lastGeneratedId: string | null = null

    if (context.env.BIGDATA_DB) {
      const policyRow = await context.env.BIGDATA_DB.prepare(`
        SELECT policy_text, tlsrpt_email
        FROM mtasts_mta_sts_policies
        WHERE domain = ?
        LIMIT 1
      `)
        .bind(domain)
        .first<DbPolicyRow>()

      const historyRow = await context.env.BIGDATA_DB.prepare(`
        SELECT gerado_em
        FROM mtasts_history
        WHERE domain = ?
        ORDER BY id DESC
        LIMIT 1
      `)
        .bind(domain)
        .first<DbHistoryRow>()

      savedPolicy = typeof policyRow?.policy_text === 'string' ? policyRow.policy_text : null
      savedEmail = typeof policyRow?.tlsrpt_email === 'string' ? policyRow.tlsrpt_email.trim().toLowerCase() : null
      lastGeneratedId = typeof historyRow?.gerado_em === 'string' ? historyRow.gerado_em.trim() : null
    }

    const mapped: PolicyResponse = {
      savedPolicy,
      savedEmail,
      dnsTlsRptEmail: dnsSnapshot.dnsTlsRptEmail,
      dnsMtaStsId: dnsSnapshot.dnsMtaStsId,
      lastGeneratedId,
      mxRecords: dnsSnapshot.mxRecords,
    }

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mtasts',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'policy-read',
            provider: 'cloudflare-api',
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
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'policy-read',
            provider: 'cloudflare-api',
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
