// admin-app/functions/api/financeiro/sumup-cancel.ts
// POST - Cancela checkout SumUp via SDK oficial
// Dados live: validação de estado via SDK, sem D1

import SumUp from '@sumup/sdk'

interface Env {
  SUMUP_API_KEY_PRIVATE: string
}

type CancelContext = {
  request: Request
  env: Env
}

export const onRequestPost = async (context: CancelContext) => {
  const url = new URL(context.request.url)
  const id = url.searchParams.get('id')

  if (!id) return Response.json({ success: false, error: 'ID do pagamento ausente.' }, { status: 400 })

  const token = context.env.SUMUP_API_KEY_PRIVATE
  if (!token) return Response.json({ success: false, error: 'SUMUP_API_KEY_PRIVATE ausente.' }, { status: 503 })

  try {
    const client = new SumUp({ apiKey: token })

    try {
      await client.checkouts.deactivate(id)
    } catch (apiErr) {
      let errMsg = apiErr instanceof Error ? apiErr.message : 'Falha ao cancelar.'

      try {
        if (errMsg.includes('{')) {
          const jsonStr = errMsg.substring(errMsg.indexOf('{'))
          const parsed = JSON.parse(jsonStr)
          if (parsed?.message) errMsg = parsed.message
          if (parsed?.detail) errMsg = parsed.detail
          if (parsed?.error_code === 'NOT FOUND') errMsg = 'Checkout nao encontrado.'
          if (parsed?.error_code === 'CONFLICT') errMsg = 'Este checkout nao pode ser cancelado no estado atual.'
        }
      } catch { /* Mantem mensagem original. */ }

      const isConflict = errMsg.includes('cancelado no estado atual') || (apiErr instanceof Error && apiErr.message.includes('409'))

      if (isConflict) {
        // Verificar diretamente no provider se já foi pago
        try {
          const checkRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })

          if (checkRes.ok) {
            const checkoutData = await checkRes.json() as {
              status?: string
              transactions?: Array<{ id?: string; status?: string }>
            }

            const txStatus = checkoutData.transactions?.[0]?.status
            const rawStatus = String(txStatus || checkoutData.status || 'UNKNOWN').toUpperCase()
            const realStatus = rawStatus === 'PAID' ? 'SUCCESSFUL' : rawStatus

            if (checkoutData.status === 'PAID' || realStatus === 'SUCCESSFUL') {
              return Response.json(
                {
                  success: false,
                  error: 'A transacao foi confirmada/paga na SumUp. Atualize o painel e utilize Estornar Transacao (Refund) ao inves de cancelar.'
                },
                { status: 400 }
              )
            }
          }
        } catch { /* Ignora erro secundario de diagnostico. */ }
      } else {
        return Response.json({ success: false, error: `Cancelamento recusado pela SumUp: ${errMsg}` }, { status: 400 })
      }
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json(
      { success: false, error: err instanceof Error ? err.message : 'Falha estrutural ao cancelar.' },
      { status: 500 }
    )
  }
}
