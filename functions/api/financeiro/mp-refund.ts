// admin-app/functions/api/financeiro/mp-refund.ts
// POST — Efetua estorno no Mercado Pago via SDK oficial
// Dados live: SDK é a fonte de verdade, sem D1

import { MercadoPagoConfig, PaymentRefund } from 'mercadopago'

interface Env {
  MP_ACCESS_TOKEN: string
}

type RefundContext = { request: Request; env: Env }

export const onRequestPost = async (context: RefundContext) => {
  const url = new URL(context.request.url)
  const id = url.searchParams.get('id')

  if (!id) return Response.json({ error: 'ID do pagamento ausente.' }, { status: 400 })

  const token = context.env.MP_ACCESS_TOKEN
  if (!token) return Response.json({ error: 'MP_ACCESS_TOKEN ausente.' }, { status: 503 })

  try {
    const client = new MercadoPagoConfig({ accessToken: token })
    const refundApi = new PaymentRefund(client)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const refundBody: any = { payment_id: id }

    try {
      const body = await context.request.json() as { amount?: number }
      if (body.amount) refundBody.body = { amount: Number(body.amount) }
    } catch { /* sem body = estorno total */ }

    await refundApi.create(refundBody)

    const newStatus = refundBody.body?.amount ? 'partially_refunded' : 'refunded'

    return Response.json({ success: true, status: newStatus })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Falha no estorno.' }, { status: 500 })
  }
}
