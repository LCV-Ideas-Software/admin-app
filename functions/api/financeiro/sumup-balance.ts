// admin-app/functions/api/financeiro/sumup-balance.ts
// GET — Calcula saldo SumUp via SDK live (transactions-advanced)
// Soma transações por status direto do provider, sem D1

import SumUp from '@sumup/sdk'

interface Env {
  SUMUP_API_KEY_PRIVATE: string
  SUMUP_MERCHANT_CODE: string
}

type BalanceContext = { request: Request; env: Env }

const FINANCIAL_CUTOFF = '2026-03-01'

export const onRequestGet = async (context: BalanceContext) => {
  const token = context.env.SUMUP_API_KEY_PRIVATE
  const merchantCode = context.env.SUMUP_MERCHANT_CODE
  if (!token || !merchantCode) return Response.json({ available_balance: 0, unavailable_balance: 0 })

  const url = new URL(context.request.url)
  const rawStart = url.searchParams.get('start_date') || FINANCIAL_CUTOFF
  const startDate = rawStart < FINANCIAL_CUTOFF ? FINANCIAL_CUTOFF : rawStart

  try {
    const client = new SumUp({ apiKey: token })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txData = await (client.transactions as any).list({
      merchantCode,
      changes_since: `${startDate}T00:00:00-03:00`,
      limit: 100,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = Array.isArray(txData?.items) ? txData.items : []

    let available = 0
    let unavailable = 0

    for (const tx of items) {
      const status = String(tx?.status || '').toUpperCase()
      const amount = Number(tx?.amount || 0)
      if (['SUCCESSFUL', 'PAID', 'APPROVED'].includes(status)) {
        available += amount
      } else if (['PENDING', 'IN_PROCESS', 'PROCESSING'].includes(status)) {
        unavailable += amount
      }
    }

    return Response.json({ available_balance: available, unavailable_balance: unavailable })
  } catch {
    return Response.json({ available_balance: 0, unavailable_balance: 0 })
  }
}
