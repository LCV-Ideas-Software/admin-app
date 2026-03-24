// admin-app/functions/api/financeiro/insights.ts
// GET — Consulta insights via SumUp e Mercado Pago SDKs
// Portado 1:1 do mainsite-worker para compliance total
// Parâmetro: provider=sumup|mp, type=transactions-summary|transactions-advanced|payment-methods|payouts-summary

// @ts-expect-error — SumUp SDK default export
import SumUp from '@sumup/sdk'
import { MercadoPagoConfig, Payment, PaymentMethod } from 'mercadopago'

interface Env {
  SUMUP_API_KEY_PRIVATE: string
  SUMUP_MERCHANT_CODE: string
  MP_ACCESS_TOKEN: string
}

const FINANCIAL_CUTOFF_BRT = '2026-03-01T00:00:00-03:00'
const FINANCIAL_CUTOFF_DATE = '2026-03-01'
const FINANCIAL_CUTOFF_UTC = new Date(FINANCIAL_CUTOFF_BRT)
const FINANCIAL_CUTOFF_ISO = FINANCIAL_CUTOFF_UTC.toISOString()

const getStartIsoWithCutoff = (rawDate: string | null): string => {
  if (!rawDate) return FINANCIAL_CUTOFF_ISO
  const parsed = new Date(rawDate)
  if (Number.isNaN(parsed.getTime())) return FINANCIAL_CUTOFF_ISO
  return parsed.getTime() < FINANCIAL_CUTOFF_UTC.getTime() ? FINANCIAL_CUTOFF_ISO : parsed.toISOString()
}

const isOnOrAfterCutoff = (value: string | null | undefined): boolean => {
  if (!value) return false
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.getTime() >= FINANCIAL_CUTOFF_UTC.getTime()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const provider = url.searchParams.get('provider') || ''
  const type = url.searchParams.get('type') || ''

  // ── SumUp Insights ──
  if (provider === 'sumup') {
    const token = context.env.SUMUP_API_KEY_PRIVATE
    const merchantCode = context.env.SUMUP_MERCHANT_CODE
    if (!token || !merchantCode) return Response.json({ error: 'SUMUP_API_KEY_PRIVATE ou SUMUP_MERCHANT_CODE ausentes.' }, { status: 503 })

    const client = new SumUp({ apiKey: token })

    // SumUp: Payment Methods
    if (type === 'payment-methods') {
      try {
        const amountRaw = Number(url.searchParams.get('amount'))
        const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 10
        const currency = (url.searchParams.get('currency') || 'BRL').toUpperCase()

        const data = await client.checkouts.listAvailablePaymentMethods(merchantCode, { amount, currency }) as AnyRecord
        const methods = Array.isArray(data?.available_payment_methods)
          ? data.available_payment_methods.map((m: AnyRecord) => m.id).filter(Boolean)
          : []

        return Response.json({ success: true, amount, currency, methods })
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : 'Falha ao listar métodos SumUp.' }, { status: 500 })
      }
    }

    // SumUp: Transactions Summary
    if (type === 'transactions-summary') {
      try {
        const limitRaw = Number(url.searchParams.get('limit'))
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50
        const changesSince = getStartIsoWithCutoff(url.searchParams.get('changes_since') || url.searchParams.get('start_date'))

        const txData = await client.transactions.list(merchantCode, {
          order: 'descending', limit, changes_since: changesSince,
        }) as AnyRecord

        const rawItems: AnyRecord[] = Array.isArray(txData?.items) ? txData.items : []
        const items = rawItems.filter((tx) => isOnOrAfterCutoff(tx?.timestamp))

        const byStatus: Record<string, number> = {}
        const byType: Record<string, number> = {}
        let totalAmount = 0
        for (const tx of items) {
          const status = (tx?.status || 'UNKNOWN').toUpperCase()
          const txType = (tx?.type || 'UNKNOWN').toUpperCase()
          byStatus[status] = (byStatus[status] || 0) + 1
          byType[txType] = (byType[txType] || 0) + 1
          totalAmount += Number(tx?.amount || 0)
        }

        return Response.json({
          success: true, scanned: items.length, limit, totalAmount, byStatus, byType,
          hasMore: Array.isArray(txData?.links) && txData.links.length > 0,
        })
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : 'Falha no resumo SumUp.' }, { status: 500 })
      }
    }

    // SumUp: Transactions Advanced
    if (type === 'transactions-advanced') {
      try {
        const limitRaw = Number(url.searchParams.get('limit'))
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50
        const changesSince = getStartIsoWithCutoff(url.searchParams.get('changes_since') || url.searchParams.get('start_date'))

        const txData = await client.transactions.list(merchantCode, {
          order: 'descending', limit, changes_since: changesSince,
        }) as AnyRecord

        const rawItems: AnyRecord[] = Array.isArray(txData?.items) ? txData.items : []
        const normalized = rawItems.filter((tx) => isOnOrAfterCutoff(tx?.timestamp)).map((tx) => ({
          id: tx?.id || tx?.transaction_id || null,
          transactionCode: tx?.transaction_code || null,
          amount: Number(tx?.amount || 0),
          currency: tx?.currency || 'BRL',
          status: tx?.status || 'UNKNOWN',
          type: tx?.type || 'UNKNOWN',
          paymentType: tx?.payment_type || 'UNKNOWN',
          cardType: tx?.card_type || null,
          timestamp: tx?.timestamp || null,
          user: tx?.user || null,
          refundedAmount: Number(tx?.refunded_amount || 0),
        }))

        return Response.json({ success: true, total: normalized.length, items: normalized })
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : 'Falha em transações avançadas SumUp.' }, { status: 500 })
      }
    }

    // SumUp: Payouts Summary
    if (type === 'payouts-summary') {
      try {
        const now = new Date()
        const requestedStart = url.searchParams.get('start_date') || FINANCIAL_CUTOFF_DATE
        const startDate = requestedStart < FINANCIAL_CUTOFF_DATE ? FINANCIAL_CUTOFF_DATE : requestedStart
        const endDate = url.searchParams.get('end_date') || now.toISOString().slice(0, 10)

        const payouts = await client.payouts.list(merchantCode, {
          start_date: startDate, end_date: endDate, order: 'desc', limit: 100,
        }) as AnyRecord[]

        const list: AnyRecord[] = Array.isArray(payouts) ? payouts : []
        let totalAmount = 0, totalFee = 0
        const byStatus: Record<string, number> = {}
        for (const p of list) {
          totalAmount += Number(p?.amount || 0)
          totalFee += Number(p?.fee || 0)
          const status = (p?.status || 'UNKNOWN').toUpperCase()
          byStatus[status] = (byStatus[status] || 0) + 1
        }

        return Response.json({ success: true, startDate, endDate, count: list.length, totalAmount, totalFee, byStatus })
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : 'Falha em payouts SumUp.' }, { status: 500 })
      }
    }
  }

  // ── Mercado Pago Insights ──
  if (provider === 'mp') {
    const token = context.env.MP_ACCESS_TOKEN
    if (!token) return Response.json({ error: 'MP_ACCESS_TOKEN ausente.' }, { status: 503 })

    const client = new MercadoPagoConfig({ accessToken: token })

    // MP: Payment Methods
    if (type === 'payment-methods') {
      try {
        const paymentMethodApi = new PaymentMethod(client)
        const methodsRaw: AnyRecord[] = (await paymentMethodApi.get() as AnyRecord[]) || []
        const methods = [...new Set(methodsRaw.map((m) => m?.id).filter(Boolean))]
        const types = [...new Set(methodsRaw.map((m) => m?.payment_type_id).filter(Boolean))]

        return Response.json({ success: true, scanned: methodsRaw.length, methods, types })
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : 'Falha ao listar métodos MP.' }, { status: 500 })
      }
    }

    // MP: Transactions Summary
    if (type === 'transactions-summary') {
      try {
        const limitRaw = Number(url.searchParams.get('limit'))
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50
        const begin_date = getStartIsoWithCutoff(url.searchParams.get('begin_date') || url.searchParams.get('start_date'))
        const end_date = url.searchParams.get('end_date') ? new Date(url.searchParams.get('end_date')!).toISOString() : new Date().toISOString()

        const paymentApi = new Payment(client)
        const payload = await paymentApi.search({
          options: { sort: 'date_created', criteria: 'desc', range: 'date_created', begin_date, end_date, limit, offset: 0 },
        }) as AnyRecord

        const items: AnyRecord[] = Array.isArray(payload?.results) ? payload.results : []
        const byStatus: Record<string, number> = {}
        const byType: Record<string, number> = {}
        let totalAmount = 0, totalNetAmount = 0
        for (const tx of items) {
          const status = String(tx?.status || 'unknown').toUpperCase()
          const txType = String(tx?.payment_type_id || 'unknown').toUpperCase()
          byStatus[status] = (byStatus[status] || 0) + 1
          byType[txType] = (byType[txType] || 0) + 1
          totalAmount += Number(tx?.transaction_amount || 0)
          totalNetAmount += Number(tx?.transaction_details?.net_received_amount || 0)
        }

        return Response.json({
          success: true, scanned: items.length, limit, totalAmount, totalNetAmount, byStatus, byType,
          paging: payload?.paging || { total: 0, limit, offset: 0 },
        })
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : 'Falha no resumo MP.' }, { status: 500 })
      }
    }
  }

  return Response.json({ error: 'Parâmetros inválidos: provider e type são obrigatórios.' }, { status: 400 })
}
