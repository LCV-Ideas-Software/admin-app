import { logModuleOperationalEvent } from '../_lib/operational'
import { resolveAdminActorFromRequest } from '../_lib/admin-actor'
import { createResponseTrace, type ResponseTrace } from '../_lib/request-trace'
import { upsertCloudflareTxtRecord } from '../_lib/cloudflare-api'

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement
  first: <T>() => Promise<T | null>
  all: <T>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

type D1Database = {
  prepare: (query: string) => D1PreparedStatement
}

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

const normalizeDomain = (value: unknown) => String(value ?? '').trim().toLowerCase()

const generateMtastsId = () => {
  const now = new Date()
  const prefix = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`
  const random = crypto.getRandomValues(new Uint32Array(4))
  const suffix = Array.from(random).map((chunk) => String(chunk).padStart(10, '0').slice(-4)).join('')
  return `${prefix}${suffix}`
}

type OrchestratePayload = {
  domain?: unknown
  zoneId?: unknown
  policyText?: unknown
  tlsrptEmail?: unknown
}

const toError = (message: string, trace: ResponseTrace, status = 500) => new Response(JSON.stringify({
  ok: false,
  error: message,
  ...trace,
}), {
  status,
  headers: toHeaders(),
})

const normalizePolicyText = (value: unknown) => String(value ?? '').trim()

const normalizeTlsRptEmail = (value: unknown) => {
  const email = String(value ?? '').trim().toLowerCase()
  if (!email) {
    return null
  }
  return email
}

export async function onRequestPost(context: Context) {
  const trace = createResponseTrace(context.request)

  if (!context.env.BIGDATA_DB) {
    return toError('BIGDATA_DB não configurado no runtime.', trace, 503)
  }

  try {
    const body = await context.request.json() as OrchestratePayload
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>)

    const domain = normalizeDomain(body.domain)
    const zoneId = String(body.zoneId ?? '').trim()
    const policyText = normalizePolicyText(body.policyText)
    const tlsrptEmail = normalizeTlsRptEmail(body.tlsrptEmail)

    if (!domain || !zoneId || !policyText) {
      return toError('Domain, zoneId e policyText são obrigatórios para orquestrar o MTA-STS.', trace, 400)
    }

    const id = generateMtastsId()

    const [mtaStsDnsResult, tlsRptDnsResult] = await Promise.all([
      upsertCloudflareTxtRecord(
        context.env,
        zoneId,
        `_mta-sts.${domain}`,
        `v=STSv1; id=${id}`,
      ),
      tlsrptEmail
        ? upsertCloudflareTxtRecord(
          context.env,
          zoneId,
          `_smtp._tls.${domain}`,
          `v=TLSRPTv1; rua=mailto:${tlsrptEmail}`,
        )
        : Promise.resolve(null),
    ])

    await context.env.BIGDATA_DB.prepare(`
      INSERT INTO mtasts_mta_sts_policies (domain, policy_text, tlsrpt_email, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(domain) DO UPDATE SET
        policy_text = excluded.policy_text,
        tlsrpt_email = COALESCE(excluded.tlsrpt_email, mtasts_mta_sts_policies.tlsrpt_email),
        updated_at = CURRENT_TIMESTAMP
    `)
      .bind(domain, policyText, tlsrptEmail)
      .run()

    await context.env.BIGDATA_DB.prepare(`
      INSERT INTO mtasts_history (gerado_em, domain, data_criacao)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(gerado_em) DO UPDATE SET
        domain = excluded.domain
    `)
      .bind(id, domain)
      .run()

    try {
      await logModuleOperationalEvent(context.env.BIGDATA_DB, {
        module: 'mtasts',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: 'orchestrate',
          provider: 'cloudflare-api',
          domain,
          zoneId,
          id,
          tlsrptEmail,
          adminActor,
          dnsMtaStsMode: mtaStsDnsResult.mode,
          dnsTlsRptMode: tlsRptDnsResult?.mode ?? null,
        },
      })
    } catch {
      // Telemetria não deve bloquear resposta.
    }

    return new Response(JSON.stringify({
      ok: true,
      domain,
      zoneId,
      id,
      dnsUpdated: true,
      policySaved: true,
      historySaved: true,
      provider: 'cloudflare-api',
      admin_actor: adminActor,
      ...trace,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha inesperada na orquestração MTA-STS'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mtasts',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'orchestrate',
            provider: 'cloudflare-api',
          },
        })
      } catch {
        // Telemetria não deve bloquear resposta.
      }
    }

    return toError(message, trace)
  }
}
