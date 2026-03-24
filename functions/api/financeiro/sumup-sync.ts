// admin-app/functions/api/financeiro/sumup-sync.ts
// POST — Sincroniza checkouts SumUp com D1 usando @sumup/sdk
// Portado 1:1 do mainsite-worker /api/sumup/sync para compliance com SumUp SDK v0.1.2+

// @ts-expect-error — SumUp SDK default export
import SumUp from '@sumup/sdk'

interface Env {
  BIGDATA_DB: D1Database
  SUMUP_API_KEY_PRIVATE: string
  SUMUP_MERCHANT_CODE: string
}

const FINANCIAL_CUTOFF_BRT = '2026-03-01T00:00:00-03:00'
const FINANCIAL_CUTOFF_UTC = new Date(FINANCIAL_CUTOFF_BRT)

const isOnOrAfterCutoff = (value: string | null | undefined): boolean => {
  if (!value) return false
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.getTime() >= FINANCIAL_CUTOFF_UTC.getTime()
}

const normalizeSumupStatus = (status: string): string => {
  const s = String(status || '').trim().toUpperCase()
  if (!s) return 'UNKNOWN'
  const map: Record<string, string> = {
    PAID: 'SUCCESSFUL', APPROVED: 'SUCCESSFUL', SUCCESSFUL: 'SUCCESSFUL',
    PENDING: 'PENDING', IN_PROCESS: 'PENDING', PROCESSING: 'PENDING',
    FAILED: 'FAILED', FAILURE: 'FAILED',
    EXPIRED: 'EXPIRED',
    REFUNDED: 'REFUNDED',
    PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
    CANCELED: 'CANCELLED', CANCEL: 'CANCELLED', CANCELLED: 'CANCELLED',
    CHARGEBACK: 'CHARGE_BACK', CHARGE_BACK: 'CHARGE_BACK',
  }
  return map[s] || s
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.BIGDATA_DB
  const token = context.env.SUMUP_API_KEY_PRIVATE
  if (!token) return Response.json({ error: 'SUMUP_API_KEY_PRIVATE ausente.' }, { status: 503 })

  try {
    const client = new SumUp({ apiKey: token })
    const checkouts = await client.checkouts.list()
    if (!Array.isArray(checkouts)) throw new Error('Resposta inesperada da SumUp.')

    let inserted = 0, updated = 0
    for (const checkout of checkouts) {
      const tx = checkout.transactions?.[0]
      const sourceTimestamp = tx?.timestamp || checkout?.timestamp || checkout?.date || checkout?.created_at || null
      if (sourceTimestamp && !isOnOrAfterCutoff(sourceTimestamp)) continue

      const paymentId = tx?.id || checkout.id
      const status = normalizeSumupStatus(tx?.status || checkout.status || 'UNKNOWN')
      const amount = Number(checkout.amount || 0)
      const raw = JSON.stringify(checkout)

      const existing = await db.prepare(
        "SELECT id FROM mainsite_financial_logs WHERE payment_id = ? AND method = 'sumup_card' LIMIT 1"
      ).bind(paymentId).first()

      if (existing) {
        await db.prepare(
          "UPDATE mainsite_financial_logs SET status = ?, raw_payload = ? WHERE payment_id = ? AND method = 'sumup_card'"
        ).bind(status, raw, paymentId).run()
        updated++
      } else {
        await db.prepare(
          'INSERT INTO mainsite_financial_logs (payment_id, status, amount, method, payer_email, raw_payload) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(paymentId, status, amount, 'sumup_card', 'N/A', raw).run()
        inserted++
      }
    }

    return Response.json({ success: true, inserted, updated, total: checkouts.length })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Falha ao sincronizar SumUp.' }, { status: 500 })
  }
}
