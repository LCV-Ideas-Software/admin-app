// admin-app/functions/api/financeiro/sumup-refund.ts
// POST - Efetua estorno SumUp via SDK oficial

import SumUp from '@sumup/sdk'
import type { D1Database } from '@cloudflare/workers-types'

interface Env {
  BIGDATA_DB: D1Database
  SUMUP_API_KEY_PRIVATE: string
}

type RefundContext = {
  request: Request
  env: Env
}

export const onRequestPost = async (context: RefundContext) => {
  const db = context.env.BIGDATA_DB
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
    } catch {
      // Estorno total quando body nao existir.
    }

    const client = new SumUp({ apiKey: token })

    let txnId = id

    try {
      const record = await db.prepare(
        "SELECT raw_payload FROM mainsite_financial_logs WHERE payment_id = ? AND method = 'sumup_card' LIMIT 1"
      ).bind(id).first() as { raw_payload?: string } | null

      if (record?.raw_payload) {
        const payload = JSON.parse(record.raw_payload)
        const extracted = payload?.transactions?.[0]?.id || payload?.transaction_id
        if (extracted) txnId = extracted
      }
    } catch {
      // Fallback para consulta direta no provider.
    }

    if (txnId === id) {
      try {
        const checkout = await client.checkouts.get(id)
        const extracted = checkout?.transactions?.[0]?.id
        if (extracted) txnId = extracted
      } catch {
        // Mantem fallback com o proprio id.
      }
    }

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
      } catch {
        // Mantem mensagem original.
      }

      return Response.json({ success: false, error: `Estorno recusado pela SumUp: ${errMsg}` }, { status: 400 })
    }

    const newStatus = amount ? 'PARTIALLY_REFUNDED' : 'REFUNDED'
    await db.prepare(
      "UPDATE mainsite_financial_logs SET status = ? WHERE payment_id = ? AND method = 'sumup_card'"
    ).bind(newStatus, id).run()

    return Response.json({ success: true, status: newStatus })
  } catch (err) {
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : 'Falha estrutural ao estornar.' },
      { status: 500 }
    )
  }
}
