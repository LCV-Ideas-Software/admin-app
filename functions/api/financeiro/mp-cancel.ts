// admin-app/functions/api/financeiro/mp-cancel.ts
// POST — Cancela pagamento pendente no Mercado Pago via SDK oficial
// Dados live: SDK é a fonte de verdade, sem D1

import { MercadoPagoConfig, Payment } from 'mercadopago'

interface Env {
  MP_ACCESS_TOKEN: string
}

type CancelContext = { request: Request; env: Env }

export const onRequestPost = async (context: CancelContext) => {
  const url = new URL(context.request.url)
  const id = url.searchParams.get('id')

  if (!id) return Response.json({ error: 'ID do pagamento ausente.' }, { status: 400 })

  const token = context.env.MP_ACCESS_TOKEN
  if (!token) return Response.json({ error: 'MP_ACCESS_TOKEN ausente.' }, { status: 503 })

  try {
    const client = new MercadoPagoConfig({ accessToken: token })
    const paymentApi = new Payment(client)

    await paymentApi.cancel({ id })

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Falha ao cancelar.' }, { status: 500 })
  }
}
