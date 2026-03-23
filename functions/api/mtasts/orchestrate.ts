import { logModuleOperationalEvent } from '../_lib/operational'
import { generateMtastsId, normalizeDomain, postLegacyJson, type Context, toHeaders } from '../_lib/mtasts-admin'

type OrchestratePayload = {
  domain?: unknown
  zoneId?: unknown
  policyText?: unknown
  tlsrptEmail?: unknown
}

const toError = (message: string, status = 500) => new Response(JSON.stringify({
  ok: false,
  error: message,
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
  try {
    const body = await context.request.json() as OrchestratePayload

    const domain = normalizeDomain(body.domain)
    const zoneId = String(body.zoneId ?? '').trim()
    const policyText = normalizePolicyText(body.policyText)
    const tlsrptEmail = normalizeTlsRptEmail(body.tlsrptEmail)

    if (!domain || !zoneId || !policyText) {
      return toError('Domain, zoneId e policyText são obrigatórios para orquestrar o MTA-STS.', 400)
    }

    const id = generateMtastsId()

    const [policyResult, dnsResult, idResult] = await Promise.all([
      postLegacyJson<{ success?: boolean }>(
        context.env,
        '/api/policy',
        `Falha ao salvar policy no legado para ${domain}`,
        { domain, policyText, tlsrptEmail },
      ),
      postLegacyJson<{ success?: boolean }>(
        context.env,
        '/api/update-mta-sts',
        `Falha ao atualizar DNS MTA-STS para ${domain}`,
        { domain, zoneId, id, tlsrptEmail },
      ),
      postLegacyJson<{ success?: boolean }>(
        context.env,
        '/api/id',
        `Falha ao registrar novo ID para ${domain}`,
        { id, domain },
      ),
    ])

    const legacyOk = Boolean(policyResult?.success) && Boolean(dnsResult?.success) && Boolean(idResult?.success)
    if (!legacyOk) {
      throw new Error(`Legado retornou payload incompleto na orquestração de ${domain}.`)
    }

    if (context.env.BIGDATA_DB) {
      await context.env.BIGDATA_DB.prepare(`
        INSERT INTO mtasts_mta_sts_policies (domain, policy_text, tlsrpt_email, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(domain) DO UPDATE SET
          policy_text = excluded.policy_text,
          tlsrpt_email = excluded.tlsrpt_email,
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
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'orchestrate',
            domain,
            zoneId,
            id,
            tlsrptEmail,
          },
        })
      } catch {
        // Telemetria não deve bloquear resposta.
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      domain,
      zoneId,
      id,
      dnsUpdated: true,
      policySaved: true,
      historySaved: true,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha inesperada na orquestração MTA-STS'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mtasts',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'orchestrate',
          },
        })
      } catch {
        // Telemetria não deve bloquear resposta.
      }
    }

    return toError(message)
  }
}
