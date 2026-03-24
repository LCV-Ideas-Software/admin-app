// admin-app/functions/api/financeiro/mp-sync.ts
// POST — Sincroniza pagamentos Mercado Pago com D1 via mercadopago SDK
// Portado 1:1 do mainsite-worker /api/mp/sync

import { MercadoPagoConfig, Payment } from 'mercadopago'

interface Env {
  BIGDATA_DB: D1Database
  MP_ACCESS_TOKEN: string
}

const FINANCIAL_CUTOFF_BRT = '2026-03-01T00:00:00-03:00'
const FINANCIAL_CUTOFF_UTC = new Date(FINANCIAL_CUTOFF_BRT)
const FINANCIAL_CUTOFF_ISO = FINANCIAL_CUTOFF_UTC.toISOString()
const FINANCIAL_CUTOFF_DB_UTC = FINANCIAL_CUTOFF_ISO.slice(0, 19).replace('T', ' ')

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.BIGDATA_DB
  const token = context.env.MP_ACCESS_TOKEN
  if (!token) return Response.json({ error: 'MP_ACCESS_TOKEN ausente.' }, { status: 503 })

  try {
    const client = new MercadoPagoConfig({ accessToken: token })
    const paymentApi = new Payment(client)

    // 1) Atualiza registros locais existentes
    const { results: localLogs = [] } = await db.prepare(
      "SELECT payment_id FROM mainsite_financial_logs WHERE payment_id IS NOT NULL AND (method IS NULL OR method != 'sumup_card') AND datetime(created_at) >= datetime(?) ORDER BY created_at DESC LIMIT 100"
    ).bind(FINANCIAL_CUTOFF_DB_UTC).all<{ payment_id: string }>()

    let inserted = 0, updated = 0, tracked = 0

    for (const log of localLogs) {
      const paymentId = String(log.payment_id || '').trim()
      if (!paymentId) continue

      try {
        const paymentData = await paymentApi.get({ id: paymentId })
        const status = ((paymentData as Record<string, unknown>).status as string || 'unknown').toLowerCase()
        const amount = Number((paymentData as Record<string, unknown>).transaction_amount || 0)
        const payer = (paymentData as Record<string, Record<string, unknown>>).payer || {}
        const email = (payer.email as string) || 'N/A'
        const method = ((paymentData as Record<string, unknown>).payment_method_id as string) || 'N/A'
        const raw = JSON.stringify(paymentData)

        await db.prepare(
          "UPDATE mainsite_financial_logs SET status = ?, amount = ?, method = ?, payer_email = ?, raw_payload = ? WHERE payment_id = ? AND (method IS NULL OR method != 'sumup_card')"
        ).bind(status, amount, method, email, raw, paymentId).run()

        tracked++
        updated++
      } catch {
        // Continua sincronização dos demais
      }
    }

    // 2) Busca ampla no MP (best-effort)
    let scanned = localLogs.length
    try {
      const payload = await paymentApi.search({
        options: {
          sort: 'date_created',
          criteria: 'desc',
          range: 'date_created',
          begin_date: FINANCIAL_CUTOFF_ISO,
          end_date: new Date().toISOString(),
          limit: 100,
        },
      })

      const payments: Record<string, unknown>[] = Array.isArray((payload as Record<string, unknown>).results) ? (payload as Record<string, unknown>).results as Record<string, unknown>[] : []
      scanned = payments.length

      for (const paymentData of payments) {
        const paymentId = String(paymentData.id || '').trim()
        if (!paymentId) continue

        const externalRef = String(paymentData.external_reference || '').trim()
        const description = String(paymentData.description || '').toLowerCase()
        const looksLikeSiteDonation = externalRef.startsWith('DON-') || description.includes('divagações filosóficas') || description.includes('divagacoes filosoficas')
        if (!looksLikeSiteDonation) continue

        const existing = await db.prepare(
          "SELECT id FROM mainsite_financial_logs WHERE payment_id = ? AND (method IS NULL OR method != 'sumup_card') LIMIT 1"
        ).bind(paymentId).first()

        if (existing) continue

        const status = (String(paymentData.status || 'unknown')).toLowerCase()
        const amount = Number(paymentData.transaction_amount || 0)
        const payer = (paymentData.payer || {}) as Record<string, unknown>
        const email = (payer.email as string) || 'N/A'
        const method = (paymentData.payment_method_id as string) || 'N/A'
        const raw = JSON.stringify(paymentData)

        await db.prepare(
          'INSERT INTO mainsite_financial_logs (payment_id, status, amount, method, payer_email, raw_payload) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(paymentId, status, amount, method, email, raw).run()

        inserted++
      }
    } catch {
      // Busca ampla é best-effort
    }

    return Response.json({ success: true, inserted, updated, total: tracked + inserted, scanned })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Falha ao sincronizar MP.' }, { status: 500 })
  }
}
