import { finishSyncRun, logModuleOperationalEvent, startSyncRun } from '../_lib/operational'
import type { D1Database } from '../_lib/operational'

type Env = {
  BIGDATA_DB?: D1Database
  MTASTS_ADMIN_API_BASE_URL?: string
}

type Context = {
  request: Request
  env: Env
}

type LegacyZone = {
  name?: string
  id?: string
}

type LegacyHistoryRow = {
  gerado_em?: string
  domain?: string | null
}

type LegacyPolicyPayload = {
  savedPolicy?: string | null
  savedEmail?: string | null
}

type SyncHistoryRow = {
  geradoEm: string
  domain: string | null
}

type SyncPolicyRow = {
  domain: string
  policyText: string
  tlsrptEmail: string | null
}

const DEFAULT_MTASTS_ADMIN_URL = 'https://mtasts-admin.lcv.app.br'

const parseDryRun = (rawValue: string | null) => rawValue === '1' || rawValue === 'true'

const normalizeBaseUrl = (value: string) => value.endsWith('/') ? value.slice(0, -1) : value

const toHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

const toSyncHistoryRow = (row: LegacyHistoryRow) => {
  const geradoEm = String(row.gerado_em ?? '').trim()
  if (!geradoEm) {
    return null
  }

  const domain = row.domain == null ? null : String(row.domain).trim().toLowerCase()

  return {
    geradoEm,
    domain,
  } satisfies SyncHistoryRow
}

const toSyncPolicyRow = (zone: LegacyZone, payload: LegacyPolicyPayload) => {
  const domain = String(zone.name ?? '').trim().toLowerCase()
  const policyText = String(payload.savedPolicy ?? '').trim()

  if (!domain || !policyText) {
    return null
  }

  return {
    domain,
    policyText,
    tlsrptEmail: payload.savedEmail == null ? null : String(payload.savedEmail).trim().toLowerCase(),
  } satisfies SyncPolicyRow
}

export async function onRequestPost(context: Context) {
  const { request, env } = context

  if (!env.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'BIGDATA_DB não configurado no runtime.',
    }), {
      status: 503,
      headers: toHeaders(),
    })
  }

  const url = new URL(request.url)
  const dryRun = parseDryRun(url.searchParams.get('dryRun'))
  const baseUrl = normalizeBaseUrl(env.MTASTS_ADMIN_API_BASE_URL ?? DEFAULT_MTASTS_ADMIN_URL)

  const startedAt = Date.now()
  const syncRunId = await startSyncRun(env.BIGDATA_DB, {
    module: 'mtasts',
    status: 'running',
    startedAt,
    metadata: { dryRun },
  })

  try {
    const [historyResponse, zonesResponse] = await Promise.all([
      fetch(`${baseUrl}/api/id`, { headers: { Accept: 'application/json' } }),
      fetch(`${baseUrl}/api/zones`, { headers: { Accept: 'application/json' } }),
    ])

    if (!historyResponse.ok) {
      throw new Error(`Falha ao ler histórico do legado MTA-STS: HTTP ${historyResponse.status}`)
    }

    if (!zonesResponse.ok) {
      throw new Error(`Falha ao ler zonas do legado MTA-STS: HTTP ${zonesResponse.status}`)
    }

    const historyPayload = await historyResponse.json() as LegacyHistoryRow[]
    const zonesPayload = await zonesResponse.json() as LegacyZone[]

    const historyRows = (Array.isArray(historyPayload) ? historyPayload : [])
      .map((row) => toSyncHistoryRow(row))
      .filter((row): row is SyncHistoryRow => row !== null)

    const zones = (Array.isArray(zonesPayload) ? zonesPayload : [])
      .filter((zone) => String(zone.name ?? '').trim() && String(zone.id ?? '').trim())

    const policyResponses = await Promise.all(zones.map(async (zone) => {
      const domain = String(zone.name ?? '').trim().toLowerCase()
      const zoneId = String(zone.id ?? '').trim()
      const response = await fetch(`${baseUrl}/api/policy?domain=${encodeURIComponent(domain)}&zoneId=${encodeURIComponent(zoneId)}`, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`Falha ao ler policy de ${domain}: HTTP ${response.status}`)
      }

      const payload = await response.json() as LegacyPolicyPayload
      return toSyncPolicyRow(zone, payload)
    }))

    const policyRows = policyResponses.filter((row): row is SyncPolicyRow => row !== null)

    let historyUpserted = 0
    let policiesUpserted = 0

    if (!dryRun) {
      for (const row of historyRows) {
        await env.BIGDATA_DB.prepare(`
          INSERT INTO mtasts_history (gerado_em, domain, data_criacao)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(gerado_em) DO UPDATE SET
            domain = excluded.domain
        `)
          .bind(row.geradoEm, row.domain)
          .run()

        historyUpserted += 1
      }

      for (const row of policyRows) {
        await env.BIGDATA_DB.prepare(`
          INSERT INTO mtasts_mta_sts_policies (domain, policy_text, tlsrpt_email, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(domain) DO UPDATE SET
            policy_text = excluded.policy_text,
            tlsrpt_email = excluded.tlsrpt_email,
            updated_at = CURRENT_TIMESTAMP
        `)
          .bind(row.domain, row.policyText, row.tlsrptEmail)
          .run()

        policiesUpserted += 1
      }
    }

    const recordsRead = historyRows.length + policyRows.length
    const recordsUpserted = dryRun ? 0 : historyUpserted + policiesUpserted

    await finishSyncRun(env.BIGDATA_DB, {
      id: syncRunId,
      status: 'success',
      finishedAt: Date.now(),
      recordsRead,
      recordsUpserted,
    })

    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'mtasts',
      source: 'bigdata_db',
      fallbackUsed: false,
      ok: true,
      metadata: {
        action: 'sync',
        pulledFrom: 'legacy-admin',
        dryRun,
        historyLido: historyRows.length,
        historyUpserted: dryRun ? 0 : historyUpserted,
        policiesLidas: policyRows.length,
        policiesUpserted: dryRun ? 0 : policiesUpserted,
        zonesAuditadas: zones.length,
      },
    })

    return new Response(JSON.stringify({
      ok: true,
      dryRun,
      syncRunId,
      recordsRead,
      recordsUpserted,
      history: {
        lidos: historyRows.length,
        upserted: dryRun ? 0 : historyUpserted,
      },
      policies: {
        lidas: policyRows.length,
        upserted: dryRun ? 0 : policiesUpserted,
      },
      zonesAuditadas: zones.length,
      startedAt,
      finishedAt: Date.now(),
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha inesperada no sync do MTA-STS'

    await finishSyncRun(env.BIGDATA_DB, {
      id: syncRunId,
      status: 'error',
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message,
    })

    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'mtasts',
      source: 'bigdata_db',
      fallbackUsed: false,
      ok: false,
      errorMessage: message,
      metadata: {
        action: 'sync',
        pulledFrom: 'legacy-admin',
        dryRun,
      },
    })

    return new Response(JSON.stringify({
      ok: false,
      error: message,
      syncRunId,
    }), {
      status: 500,
      headers: toHeaders(),
    })
  }
}
