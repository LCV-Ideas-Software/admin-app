// admin-app/functions/api/financeiro/sumup-refund.ts
// POST - Efetua estorno SumUp via SDK oficial
// Dados live: busca txnId direto do SDK, sem depender de D1

import SumUp from '@sumup/sdk'

interface Env {
  SUMUP_API_KEY_PRIVATE: string
}

type RefundContext = {
  request: Request
  env: Env
}

export const onRequestPost = async (context: RefundContext) => {
  const url = new URL(context.request.url)
  const id = url.searchParams.get('id')

  if (!id) return Response.json({ success: false, error: 'ID do pagamento ausente.' }, { status: 400 })

  const token = context.env.SUMUP_API_KEY_PRIVATE
  if (!token) return Response.json({ success: false, error: 'SUMUP_API_KEY_PRIVATE ausente.' }, { status: 503 })

  try {
    let amount: number | null = null
    try {
      const body = await context.request.json() as { amount?: number }
      if (body?.amount) amount = Number(body.amount)
    } catch { /* Estorno total quando body nao existir. */ }

    const client = new SumUp({ apiKey: token })

    // Buscar txnId direto do provider (SDK) — sem D1
    let txnId = id
    let originalAmount = 0

    try {
      const checkout = await client.checkouts.get(id) as {
        amount?: number
        transactions?: Array<{ id?: string; amount?: number }>
      }
      const extracted = checkout?.transactions?.[0]?.id
      if (extracted) txnId = extracted
      originalAmount = Number(checkout?.amount || checkout?.transactions?.[0]?.amount || 0)
    } catch { /* Mantem fallback com o proprio id. */ }

    // Executar estorno via SDK
    try {
      const refundPayload = amount ? { amount } : undefined
      await client.transactions.refund(txnId, refundPayload)
    } catch (apiErr) {
      let errMsg = apiErr instanceof Error ? apiErr.message : 'Falha no estorno.'
      try {
        if (errMsg.includes('{')) {
          const jsonStr = errMsg.substring(errMsg.indexOf('{'))
          const parsed = JSON.parse(jsonStr)
          if (parsed?.message) errMsg = parsed.message
          if (parsed?.detail) errMsg = parsed.detail
          if (parsed?.error_code === 'NOT FOUND') errMsg = 'Transacao nao encontrada ou aguardando compensacao.'
          if (parsed?.error_code === 'CONFLICT') errMsg = 'A transacao nao pode ser estornada no estado atual.'
        }
      } catch { /* Mantem mensagem original. */ }
      return Response.json({ success: false, error: `Estorno recusado pela SumUp: ${errMsg}` }, { status: 400 })
    }

    // Determinar status com dados live
    let newStatus = 'REFUNDED'
    if (amount && originalAmount > 0 && amount < originalAmount) {
      newStatus = 'PARTIALLY_REFUNDED'
    }

    // D1 write removido — dados live dos provedores são a fonte de verdade

    return Response.json({ success: true, status: newStatus })
  } catch (err) {
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : 'Falha estrutural ao estornar.' },
      { status: 500 }
    )
  }
}
