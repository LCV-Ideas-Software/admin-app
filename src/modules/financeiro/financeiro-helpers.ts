// admin-app/src/modules/financeiro/financeiro-helpers.ts
// Tipos, constantes, status configs, payload parsers e utilitários do módulo financeiro.
// Compliance: SumUp SDK v0.1.2+ / Mercado Pago REST API v1

// ── Tipos ──

export type FinancialLog = {
  id: number
  payment_id: string | null
  status: string
  amount: number
  method: string | null
  payer_email: string | null
  raw_payload: string | null
  created_at: string
}

export type StatusConfig = {
  color: string
  bg: string
  label: string
  canRefund?: boolean
  canCancel?: boolean
}

export type ProviderTab = 'sumup' | 'mercadopago'

export type AdvancedTx = {
  id: string | null
  transactionCode: string | null
  amount: number
  currency: string
  status: string
  type: string
  paymentType: string
  cardType: string | null
  timestamp: string | null
  user: string | null
  refundedAmount: number
}

export type ModalAction = {
  type: 'refund' | 'cancel' | 'delete'
  log: FinancialLog
} | null

// ── Constantes ──

export const FINANCIAL_CUTOFF_DATE = '2026-03-01'
export const SUMUP_FILTERS_KEY = 'adminapp_sumup_filters_v1'
export const MP_FILTERS_KEY = 'adminapp_mp_filters_v1'
export const WEBHOOK_POLL_MS = 15_000
export const AUTO_REFRESH_MS = 600_000

export type ProviderFilters = { statuses: string[]; types: string[]; limit: number }
export const defaultFilters = (): ProviderFilters => ({ statuses: [], types: [], limit: 50 })

export const loadFilters = (key: string): ProviderFilters => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaultFilters()
    const p = JSON.parse(raw)
    return {
      statuses: Array.isArray(p?.statuses) ? p.statuses : [],
      types: Array.isArray(p?.types) ? p.types : [],
      limit: Number(p?.limit) || 50,
    }
  } catch { return defaultFilters() }
}

export const saveFilters = (key: string, f: ProviderFilters) => {
  try { localStorage.setItem(key, JSON.stringify(f)) } catch { /* quota */ }
}

// ── Formatação (pt-BR, dd/mm/aaaa, 24h) ──

export const formatDateTimeBR = (v: string | null | undefined): string => {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
}

export const formatDateBR = (v: string | null | undefined): string => {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

export const formatBRL = (v: number | null | undefined): string =>
  `R$ ${Number(v || 0).toFixed(2)}`

// ── Date presets ──

export const clampStartDate = (dateStr: string): string =>
  (!dateStr || dateStr < FINANCIAL_CUTOFF_DATE) ? FINANCIAL_CUTOFF_DATE : dateStr

export const getPresetDate = (daysBack: number | null): string => {
  if (daysBack == null) return FINANCIAL_CUTOFF_DATE
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysBack)
  return clampStartDate(d.toISOString().slice(0, 10))
}

export const DATE_PRESETS = [
  { key: 'today', label: 'Hoje', value: getPresetDate(0) },
  { key: '7d', label: '7 dias', value: getPresetDate(7) },
  { key: '30d', label: '30 dias', value: getPresetDate(30) },
  { key: 'cutoff', label: 'Desde 01/03/2026', value: FINANCIAL_CUTOFF_DATE },
] as const

// ── Status configs (SumUp SDK + MP REST API — compliance total) ──

/** Cores padrão da indústria financeira:
 * Verde (#10b981) — aprovado/sucesso
 * Amarelo (#f59e0b) — pendente/processando
 * Azul (#3b82f6) — em análise
 * Vermelho (#ef4444) — rejeitado/falha
 * Lilás (#8b5cf6) — estornado/devolvido
 * Laranja (#f97316) — cancelado
 * Cinza (#6b7280) — expirado/desconhecido
 * Vermelho escuro (#dc2626) — chargeback/limite
 */

export const getSumupStatusConfig = (status: string): StatusConfig => {
  const s = (status || '').toUpperCase()
  if (['PAID', 'SUCCESSFUL', 'APPROVED'].includes(s))
    return { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'APROVADO', canRefund: true, canCancel: false }
  if (['PENDING', 'IN_PROCESS', 'PROCESSING'].includes(s))
    return { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'PENDENTE', canRefund: false, canCancel: true }
  if (['FAILED', 'FAILURE'].includes(s))
    return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'FALHA', canRefund: false, canCancel: false }
  if (s === 'EXPIRED')
    return { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', label: 'EXPIRADO', canRefund: false, canCancel: false }
  if (s === 'REFUNDED')
    return { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', label: 'ESTORNADO', canRefund: false, canCancel: false }
  if (s === 'PARTIALLY_REFUNDED')
    return { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', label: 'EST. PARCIAL', canRefund: true, canCancel: false }
  if (['CANCELLED', 'CANCEL', 'CANCELED'].includes(s))
    return { color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: 'CANCELADO', canRefund: false, canCancel: false }
  if (s.includes('CHARGEBACK') || s.includes('CHARGE_BACK'))
    return { color: '#dc2626', bg: 'rgba(220,38,38,0.15)', label: 'CONTESTAÇÃO', canRefund: false, canCancel: false }
  return { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', label: s || '?', canRefund: false, canCancel: false }
}

export const getMPStatusConfig = (status: string, statusDetail?: string): StatusConfig => {
  const s = (status || '').toLowerCase()
  const d = (statusDetail || '').toLowerCase()
  if (s === 'approved') {
    if (d === 'partially_refunded')
      return { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', label: 'EST. PARCIAL', canRefund: true, canCancel: false }
    return { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'APROVADO', canRefund: true, canCancel: false }
  }
  if (s === 'in_process')
    return { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', label: 'EM ANÁLISE', canRefund: false, canCancel: true }
  if (s === 'pending')
    return { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'PENDENTE', canRefund: false, canCancel: true }
  if (s === 'rejected') {
    if (d.includes('insufficient_amount'))
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'SEM SALDO', canRefund: false, canCancel: false }
    if (d.includes('call_for_authorize'))
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'LIGUE AO BANCO', canRefund: false, canCancel: false }
    if (d.includes('bad_filled') || d.includes('form_error'))
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'DADOS INVÁLIDOS', canRefund: false, canCancel: false }
    if (d.includes('duplicated'))
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'DUPLICADO', canRefund: false, canCancel: false }
    if (d.includes('max_attempts'))
      return { color: '#dc2626', bg: 'rgba(220,38,38,0.15)', label: 'LIMITE ATINGIDO', canRefund: false, canCancel: false }
    return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'RECUSADO', canRefund: false, canCancel: false }
  }
  if (s === 'refunded')
    return { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', label: 'ESTORNADO', canRefund: false, canCancel: false }
  if (s === 'cancelled')
    return { color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: 'CANCELADO', canRefund: false, canCancel: false }
  if (s === 'charged_back')
    return { color: '#dc2626', bg: 'rgba(220,38,38,0.15)', label: 'CONTESTAÇÃO', canRefund: false, canCancel: false }
  return { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', label: (status || '?').toUpperCase(), canRefund: false, canCancel: false }
}

// ── Payload parsers — compliance SumUp SDK v0.1.2+ e MP REST API v1 ──

export const parseSumupPayload = (raw: string | null) => {
  if (!raw) return {} as Record<string, unknown>
  try {
    const p = JSON.parse(raw)
    const allTxns: Record<string, unknown>[] = p?.transactions || []
    // Transação de pagamento original (primeira com type !== REFUND, ou fallback para [0])
    const paymentTx = allTxns.find(
      (t: Record<string, unknown>) => String(t.type || '').toUpperCase() !== 'REFUND'
    ) || allTxns[0] || p?.transaction || {}

    // Detectar refunds escaneando TODAS as transações do checkout
    const refundTxns = allTxns.filter(
      (t: Record<string, unknown>) =>
        String(t.type || '').toUpperCase() === 'REFUND' &&
        String(t.status || '').toUpperCase() === 'SUCCESSFUL'
    )
    let resolvedStatus = String(paymentTx?.status || p?.status || '—')
    if (refundTxns.length > 0) {
      const totalRefunded = refundTxns.reduce(
        (sum: number, t: Record<string, unknown>) => sum + Number(t.amount || 0), 0
      )
      const checkoutAmount = Number(p?.amount || 0)
      resolvedStatus = totalRefunded >= checkoutAmount ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
    }

    return {
      checkoutStatus: p?.status || '—',
      checkoutRef: p?.checkout_reference || p?.checkoutReference || '—',
      transactionCode: paymentTx?.transaction_code || paymentTx?.transactionCode || p?.transaction_code || '—',
      transactionUUID: paymentTx?.id || paymentTx?.transaction_id || p?.id || '—',
      paymentType: paymentTx?.payment_type || paymentTx?.paymentType || p?.payment_type || '—',
      authCode: paymentTx?.auth_code || paymentTx?.authCode || '—',
      entryMode: paymentTx?.entry_mode || paymentTx?.entryMode || '—',
      currency: paymentTx?.currency || p?.currency || 'BRL',
      txTimestamp: paymentTx?.timestamp || paymentTx?.created_at || null,
      internalId: paymentTx?.internal_id || paymentTx?.internalId || '—',
      txStatus: resolvedStatus,
    }
  } catch { return {} as Record<string, unknown> }
}

export const resolveEffectiveSumupStatus = (
  dbStatus: string | null | undefined,
  raw: { txStatus?: unknown; checkoutStatus?: unknown } | null | undefined,
): string => {
  const normalize = (value: unknown) => String(value ?? '').trim().toUpperCase()
  const row = normalize(dbStatus)
  const tx = normalize(raw?.txStatus)
  const checkout = normalize(raw?.checkoutStatus)

  // Dados do provedor (SumUp) SEMPRE têm prioridade sobre o que está na D1.
  // Status da transação > status do checkout > status do DB
  if (tx && tx !== 'UNKNOWN' && tx !== '') return tx
  if (checkout && checkout !== 'UNKNOWN' && checkout !== '') return checkout

  // Fallback para status do DB apenas quando o provedor não reporta nada
  return row || 'UNKNOWN'
}

export const parseMPPayload = (raw: string | null) => {
  if (!raw) return {} as Record<string, unknown>
  try {
    const p = JSON.parse(raw)
    const card = p.card || {}
    const td = p.transaction_details || {}
    const fees = p.fee_details || []
    const payer = p.payer || {}
    const ident = payer.identification || {}
    return {
      statusDetail: p.status_detail,
      paymentMethodId: p.payment_method_id,
      paymentTypeId: p.payment_type_id,
      installments: p.installments,
      lastFour: card.last_four_digits,
      firstSix: card.first_six_digits,
      cardholderName: card.cardholder?.name,
      netReceivedAmount: td.net_received_amount,
      totalPaidAmount: td.total_paid_amount,
      acquirerRef: td.acquirer_reference,
      feeAmount: fees[0]?.amount,
      dateApproved: p.date_approved,
      moneyReleaseDate: p.money_release_date,
      moneyReleaseStatus: p.money_release_status,
      authCode: p.authorization_code,
      externalRef: p.external_reference,
      processingMode: p.processing_mode,
      payerName: [payer.first_name, payer.last_name].filter(Boolean).join(' ') || null,
      payerDoc: ident.number ? `${ident.type}: ${ident.number}` : null,
    }
  } catch { return {} as Record<string, unknown> }
}

// ── Detecção de provedor pelo campo method ──

export const detectProvider = (log: FinancialLog): ProviderTab => {
  const m = (log.method || '').trim().toLowerCase()
  return m === 'sumup_card' ? 'sumup' : 'mercadopago'
}

// ── Resolução de status config ──

export const resolveStatusConfig = (log: FinancialLog): StatusConfig => {
  const provider = detectProvider(log)
  if (provider === 'mercadopago') {
    const p = parseMPPayload(log.raw_payload)
    return getMPStatusConfig(log.status, String(p.statusDetail ?? ''))
  }
  // O backend já resolve o status corretamente escaneando todas as transações.
  // O frontend re-analisa o raw_payload como fallback de segurança, usando
  // parseSumupPayload que agora também escaneia todo transactions[] para refunds.
  const info = parseSumupPayload(log.raw_payload)
  const effective = resolveEffectiveSumupStatus(log.status, info as { txStatus?: unknown; checkoutStatus?: unknown })
  return getSumupStatusConfig(String(effective))
}

// ── Classe CSS de tom financeiro ──

export const getFinancialToneClass = (value: string): string => {
  const n = String(value || '').trim().toUpperCase()
  if (!n) return 'fin-tone-neutral'
  if (['SUCCESSFUL', 'PAID', 'APPROVED', 'APROVADO'].includes(n)) return 'fin-tone-success'
  if (['PENDING', 'IN_PROCESS', 'PROCESSING', 'PENDENTE', 'EM ANÁLISE'].includes(n)) return 'fin-tone-pending'
  if (['FAILED', 'FAILURE', 'REJECTED', 'RECUSADO', 'SEM SALDO', 'LIGUE AO BANCO', 'DADOS INVÁLIDOS', 'DUPLICADO', 'LIMITE ATINGIDO', 'FALHA'].includes(n)) return 'fin-tone-error'
  if (['REFUNDED', 'PARTIALLY_REFUNDED', 'ESTORNADO', 'EST. PARCIAL'].includes(n)) return 'fin-tone-refund'
  if (['CANCELLED', 'CANCELED', 'EXPIRED', 'CANCELADO', 'EXPIRADO'].includes(n)) return 'fin-tone-cancel'
  if (n.includes('CHARGEBACK') || n.includes('CHARGE_BACK') || n.includes('CONTESTAÇÃO')) return 'fin-tone-error'
  return 'fin-tone-info'
}
