// admin-app/functions/api/financeiro/sumup-balance.ts
// GET — Consulta saldo SumUp via logs D1 (approved)

interface Env {
  BIGDATA_DB: D1Database
}

const FINANCIAL_CUTOFF_DB_UTC = '2026-03-01 03:00:00'

const getStartDbWithCutoff = (rawDate: string | null): string => {
  if (!rawDate) return FINANCIAL_CUTOFF_DB_UTC
  return rawDate < '2026-03-01' ? FINANCIAL_CUTOFF_DB_UTC : rawDate
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.BIGDATA_DB
  const url = new URL(context.request.url)
  const startDb = getStartDbWithCutoff(url.searchParams.get('start_date'))

  try {
    const [available, unavailable] = await Promise.all([
      db.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM mainsite_financial_logs WHERE method = 'sumup_card' AND datetime(created_at) >= datetime(?) AND UPPER(status) IN ('SUCCESSFUL','PAID','APPROVED')"
      ).bind(startDb).first<{ total: number }>(),
      db.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM mainsite_financial_logs WHERE method = 'sumup_card' AND datetime(created_at) >= datetime(?) AND UPPER(status) IN ('PENDING','IN_PROCESS','PROCESSING')"
      ).bind(startDb).first<{ total: number }>(),
    ])

    return Response.json({
      available_balance: Number(available?.total ?? 0),
      unavailable_balance: Number(unavailable?.total ?? 0),
    })
  } catch {
    return Response.json({ available_balance: 0, unavailable_balance: 0 })
  }
}
