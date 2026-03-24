// admin-app/functions/api/financeiro/sumup-reindex.ts
// POST — Reindexa status SumUp no D1 para formato canônico do SDK
// Portado 1:1 do mainsite-worker /api/sumup/reindex-statuses

interface Env {
  BIGDATA_DB: D1Database
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

  try {
    let scanned = 0, updated = 0, offset = 0
    const pageSize = 500

    while (true) {
      const { results } = await db.prepare(
        "SELECT id, status, raw_payload FROM mainsite_financial_logs WHERE method = 'sumup_card' ORDER BY id ASC LIMIT ? OFFSET ?"
      ).bind(pageSize, offset).all<{ id: number; status: string; raw_payload: string | null }>()

      const rows = results ?? []
      if (!rows.length) break

      for (const row of rows) {
        scanned++

        let payloadStatus: string | null = null
        try {
          const payload = row.raw_payload ? JSON.parse(row.raw_payload) : null
          payloadStatus = payload?.transactions?.[0]?.status || payload?.transaction?.status || payload?.status || null
        } catch {
          payloadStatus = null
        }

        const nextStatus = normalizeSumupStatus(payloadStatus || row.status || 'UNKNOWN')
        if (nextStatus !== row.status) {
          await db.prepare(
            "UPDATE mainsite_financial_logs SET status = ? WHERE id = ? AND method = 'sumup_card'"
          ).bind(nextStatus, row.id).run()
          updated++
        }
      }

      if (rows.length < pageSize) break
      offset += pageSize
    }

    return Response.json({ success: true, scanned, updated })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Falha ao reindexar status SumUp.' }, { status: 500 })
  }
}
