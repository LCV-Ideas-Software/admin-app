// admin-app/functions/api/financeiro/mp-balance.ts
// GET — Consulta saldo Mercado Pago via logs D1 (non-sumup_card)

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
        "SELECT COALESCE(SUM(amount), 0) as total FROM mainsite_financial_logs WHERE (method IS NULL OR method != 'sumup_card') AND datetime(created_at) >= datetime(?) AND lower(status) = 'approved'"
      ).bind(startDb).first<{ total: number }>(),
      db.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM mainsite_financial_logs WHERE (method IS NULL OR method != 'sumup_card') AND datetime(created_at) >= datetime(?) AND lower(status) IN ('pending', 'in_process')"
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
