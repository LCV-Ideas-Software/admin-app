// admin-app/functions/api/financeiro/mp-cancel.ts
// POST — Cancela pagamento pendente no Mercado Pago via SDK oficial
// Portado 1:1 do mainsite-worker /api/mp-payment/:id/cancel

import { MercadoPagoConfig, Payment } from 'mercadopago'

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
    const paymentApi = new Payment(client)

    await paymentApi.cancel({ id })

    await db.prepare(
      "UPDATE mainsite_financial_logs SET status = 'cancelled' WHERE payment_id = ?"
    ).bind(id).run()

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Falha ao cancelar.' }, { status: 500 })
  }
}
