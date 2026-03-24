// admin-app/functions/api/financeiro/mp-refund.ts
// POST — Efetua estorno no Mercado Pago via SDK oficial
// Portado 1:1 do mainsite-worker /api/mp-payment/:id/refund

import { MercadoPagoConfig, PaymentRefund } from 'mercadopago'

interface Env {
  BIGDATA_DB: D1Database
  MP_ACCESS_TOKEN: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.BIGDATA_DB
  const url = new URL(context.request.url)
  const id = url.searchParams.get('id')

  if (!id) return Response.json({ error: 'ID do pagamento ausente.' }, { status: 400 })

  const token = context.env.MP_ACCESS_TOKEN
  if (!token) return Response.json({ error: 'MP_ACCESS_TOKEN ausente.' }, { status: 503 })

  try {
    const client = new MercadoPagoConfig({ accessToken: token })
    const refundApi = new PaymentRefund(client)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refundBody: Record<string, any> = { payment_id: id }

    try {
      const body = await context.request.json() as { amount?: number }
      if (body.amount) refundBody.body = { amount: Number(body.amount) }
    } catch { /* sem body = estorno total */ }

    await refundApi.create(refundBody)

    const newStatus = refundBody.body?.amount ? 'partially_refunded' : 'refunded'
    await db.prepare(
      'UPDATE mainsite_financial_logs SET status = ? WHERE payment_id = ?'
    ).bind(newStatus, id).run()

    return Response.json({ success: true, status: newStatus })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Falha no estorno.' }, { status: 500 })
  }
}
