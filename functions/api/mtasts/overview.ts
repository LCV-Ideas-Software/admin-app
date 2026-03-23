import { logModuleOperationalEvent } from '../_lib/operational'

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement
  first: <T>() => Promise<T | null>
  all: <T>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

type D1Database = {
  prepare: (query: string) => D1PreparedStatement
}

type Env = {
  BIGDATA_DB?: D1Database
  MTASTS_ADMIN_API_BASE_URL?: string
}

type Context = {
  request: Request
  env: Env
}

type MtastsHistoryRow = {
  gerado_em?: string
  domain?: string | null
  data_criacao?: string
}

type MtastsPolicyRow = {
  domain?: string
  policy_text?: string
  tlsrpt_email?: string | null
  updated_at?: string
}

type LegacyHistoryRow = {
  gerado_em?: string
  domain?: string | null
}

const DEFAULT_MTASTS_ADMIN_URL = 'https://mtasts-admin.lcv.app.br'

const toResponseHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

const normalizeBaseUrl = (value: string) => value.endsWith('/') ? value.slice(0, -1) : value

const parseLimit = (rawValue: string | null) => {
  const parsed = Number.parseInt(rawValue ?? '30', 10)
  if (!Number.isFinite(parsed)) {
    return 30
  }
  return Math.min(100, Math.max(1, parsed))
}

const normalizeDomain = (rawValue: string | null) => String(rawValue ?? '').trim().toLowerCase()

const mapHistoryRow = (row: MtastsHistoryRow | LegacyHistoryRow) => {
  const geradoEm = String(row.gerado_em ?? '').trim()
  if (!geradoEm) {
    return null
  }

  return {
    geradoEm,
    domain: row.domain == null ? null : String(row.domain).trim().toLowerCase(),
  }
}

const mapPolicyRow = (row: MtastsPolicyRow) => {
  const domain = String(row.domain ?? '').trim().toLowerCase()
  const policyText = String(row.policy_text ?? '').trim()
  if (!domain || !policyText) {
    return null
  }

  return {
    domain,
    policyText,
    tlsrptEmail: row.tlsrpt_email == null ? null : String(row.tlsrpt_email).trim().toLowerCase(),
    updatedAt: row.updated_at == null ? null : String(row.updated_at),
  }
}

export async function onRequestGet(context: Context) {
  const { request, env } = context
  const url = new URL(request.url)

  const domain = normalizeDomain(url.searchParams.get('domain'))
  const limit = parseLimit(url.searchParams.get('limit'))
  const avisos: string[] = []

  if (env.BIGDATA_DB) {
    try {
      const historyRows = domain
        ? await env.BIGDATA_DB.prepare('SELECT gerado_em, domain, data_criacao FROM mtasts_history WHERE domain = ? ORDER BY id DESC LIMIT ?').bind(domain, limit).all<MtastsHistoryRow>()
        : await env.BIGDATA_DB.prepare('SELECT gerado_em, domain, data_criacao FROM mtasts_history ORDER BY id DESC LIMIT ?').bind(limit).all<MtastsHistoryRow>()

      const policyRows = domain
        ? await env.BIGDATA_DB.prepare('SELECT domain, policy_text, tlsrpt_email, updated_at FROM mtasts_mta_sts_policies WHERE domain = ? ORDER BY updated_at DESC LIMIT 10').bind(domain).all<MtastsPolicyRow>()
        : await env.BIGDATA_DB.prepare('SELECT domain, policy_text, tlsrpt_email, updated_at FROM mtasts_mta_sts_policies ORDER BY updated_at DESC LIMIT 10').all<MtastsPolicyRow>()

      const history = (historyRows.results ?? [])
        .map((row) => mapHistoryRow(row))
        .filter((item): item is NonNullable<ReturnType<typeof mapHistoryRow>> => item !== null)

      const policies = (policyRows.results ?? [])
        .map((row) => mapPolicyRow(row))
        .filter((item): item is NonNullable<ReturnType<typeof mapPolicyRow>> => item !== null)

      const payload = {
        ok: true,
        fonte: 'bigdata_db',
        filtros: { domain, limit },
        avisos,
        resumo: {
          totalHistorico: history.length,
          totalPolicies: policies.length,
        },
        historico: history,
        policies,
      }

      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'mtasts',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            totalHistorico: payload.resumo.totalHistorico,
            totalPolicies: payload.resumo.totalPolicies,
          },
        })
      } catch {
        // Não bloquear resposta por falha de telemetria.
      }

      return new Response(JSON.stringify(payload), {
        headers: toResponseHeaders(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao consultar bigdata_db'
      avisos.push(`Fallback para legado ativado: ${message}`)
    }
  }

  const legacyBaseUrl = normalizeBaseUrl(env.MTASTS_ADMIN_API_BASE_URL ?? DEFAULT_MTASTS_ADMIN_URL)
  const legacyUrl = `${legacyBaseUrl}/api/id`

  try {
    const response = await fetch(legacyUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Falha no backend legado MTA-STS: HTTP ${response.status}`)
    }

    const legacyPayload = await response.json() as LegacyHistoryRow[]
    const rows = Array.isArray(legacyPayload) ? legacyPayload : []

    let history = rows
      .map((row) => mapHistoryRow(row))
      .filter((item): item is NonNullable<ReturnType<typeof mapHistoryRow>> => item !== null)

    if (domain) {
      history = history.filter((item) => item.domain === domain)
    }

    history = history.slice(0, limit)

    avisos.push('Policies não disponíveis no fallback público (/api/id) do legado MTA-STS.')

    const payload = {
      ok: true,
      fonte: 'legacy-admin',
      filtros: { domain, limit },
      avisos,
      resumo: {
        totalHistorico: history.length,
        totalPolicies: 0,
      },
      historico: history,
      policies: [],
    }

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'mtasts',
          source: 'legacy-admin',
          fallbackUsed: true,
          ok: true,
          metadata: {
            totalHistorico: payload.resumo.totalHistorico,
            totalPolicies: payload.resumo.totalPolicies,
          },
        })
      } catch {
        // Não bloquear resposta por falha de telemetria.
      }
    }

    return new Response(JSON.stringify(payload), {
      headers: toResponseHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido no módulo MTA-STS'

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'mtasts',
          source: 'legacy-admin',
          fallbackUsed: true,
          ok: false,
          errorMessage: message,
        })
      } catch {
        // Não bloquear resposta por falha de telemetria.
      }
    }

    return new Response(JSON.stringify({
      ok: false,
      error: message,
      filtros: { domain, limit },
      avisos,
      resumo: {
        totalHistorico: 0,
        totalPolicies: 0,
      },
      historico: [],
      policies: [],
    }), {
      status: 502,
      headers: toResponseHeaders(),
    })
  }
}
