// admin-app/functions/api/financeiro/mp-balance.ts
// GET — Calcula saldo Mercado Pago via REST API live
// Soma transações por status direto do provider, sem D1

interface Env {
  MP_ACCESS_TOKEN: string
}

type BalanceContext = { request: Request; env: Env }

const FINANCIAL_CUTOFF = '2026-03-01'

export const onRequestGet = async (context: BalanceContext) => {
  const token = context.env.MP_ACCESS_TOKEN
  if (!token) return Response.json({ available_balance: 0, unavailable_balance: 0 })

  const url = new URL(context.request.url)
  const rawStart = url.searchParams.get('start_date') || FINANCIAL_CUTOFF
  const startDate = rawStart < FINANCIAL_CUTOFF ? FINANCIAL_CUTOFF : rawStart

  try {
    // Buscar pagamentos aprovados
    const approvedRes = await fetch(
      `https://api.mercadopago.com/v1/payments/search?status=approved&begin_date=${startDate}T00:00:00-03:00&limit=100&sort=date_created&criteria=desc`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const approvedData = await approvedRes.json() as { results?: Array<{ transaction_amount?: number }> }

    // Buscar pagamentos pendentes
    const pendingRes = await fetch(
      `https://api.mercadopago.com/v1/payments/search?status=pending&begin_date=${startDate}T00:00:00-03:00&limit=100&sort=date_created&criteria=desc`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const pendingData = await pendingRes.json() as { results?: Array<{ transaction_amount?: number }> }

    // Buscar in_process
    const inProcessRes = await fetch(
      `https://api.mercadopago.com/v1/payments/search?status=in_process&begin_date=${startDate}T00:00:00-03:00&limit=100&sort=date_created&criteria=desc`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const inProcessData = await inProcessRes.json() as { results?: Array<{ transaction_amount?: number }> }

    const sumAmounts = (results: Array<{ transaction_amount?: number }> | undefined) =>
      (results || []).reduce((sum, tx) => sum + Number(tx?.transaction_amount || 0), 0)

    return Response.json({
      available_balance: sumAmounts(approvedData?.results),
      unavailable_balance: sumAmounts(pendingData?.results) + sumAmounts(inProcessData?.results),
    })
  } catch {
    return Response.json({ available_balance: 0, unavailable_balance: 0 })
  }
}
