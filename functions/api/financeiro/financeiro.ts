// admin-app/functions/api/financeiro/financeiro.ts
// GET — Query mainsite_financial_logs from BIGDATA_DB with filters
// Returns logs, totals, and approved counts

interface Env {
  BIGDATA_DB: D1Database
}

interface FinancialLog {
  id: number
  payment_id: string | null
  status: string
  amount: number
  method: string | null
  payer_email: string | null
  raw_payload: string | null
  created_at: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.BIGDATA_DB
  const url = new URL(context.request.url)

  const status = url.searchParams.get('status') || ''
  const method = url.searchParams.get('method') || ''
  const startDate = url.searchParams.get('start_date') || ''
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 100))

  try {
    // Build dynamic WHERE clauses
    const conditions: string[] = []
    const params: (string | number)[] = []

    if (status) {
      conditions.push('LOWER(status) = LOWER(?)')
      params.push(status)
    }
    if (method) {
      conditions.push('LOWER(method) = LOWER(?)')
      params.push(method)
    }
    if (startDate) {
      conditions.push('created_at >= ?')
      params.push(startDate)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Parallel queries: logs + totals
    const [logsResult, totalRow, approvedRow, sumRow, distinctStatuses, distinctMethods] = await Promise.all([
      db.prepare(
        `SELECT id, payment_id, status, amount, method, payer_email, raw_payload, created_at
         FROM mainsite_financial_logs ${whereClause}
         ORDER BY created_at DESC LIMIT ?`
      ).bind(...params, limit).all<FinancialLog>(),

      db.prepare(
        `SELECT COUNT(1) AS total FROM mainsite_financial_logs ${whereClause}`
      ).bind(...params).first<{ total: number }>(),

      db.prepare(
        `SELECT COUNT(1) AS total FROM mainsite_financial_logs
         WHERE LOWER(status) IN ('approved', 'successful', 'paid')
         ${conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''}`
      ).bind(...params).first<{ total: number }>(),

      db.prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total_amount FROM mainsite_financial_logs ${whereClause}`
      ).bind(...params).first<{ total_amount: number }>(),

      db.prepare(
        'SELECT DISTINCT LOWER(status) AS status FROM mainsite_financial_logs WHERE status IS NOT NULL ORDER BY status'
      ).all<{ status: string }>(),

      db.prepare(
        'SELECT DISTINCT LOWER(method) AS method FROM mainsite_financial_logs WHERE method IS NOT NULL ORDER BY method'
      ).all<{ method: string }>(),
    ])

    return Response.json({
      ok: true,
      logs: logsResult.results ?? [],
      totals: {
        count: Number(totalRow?.total ?? 0),
        approved: Number(approvedRow?.total ?? 0),
        totalAmount: Number(sumRow?.total_amount ?? 0),
      },
      filters: {
        statuses: (distinctStatuses.results ?? []).map((r) => r.status),
        methods: (distinctMethods.results ?? []).map((r) => r.method),
      },
    })
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro interno ao consultar logs financeiros.' },
      { status: 500 },
    )
  }
}
