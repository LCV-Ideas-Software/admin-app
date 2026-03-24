// admin-app/src/modules/financeiro/FinanceiroModule.tsx
// Painel Financeiro Completo — D1 logs + SumUp SDK + Mercado Pago SDK
// SDK compliance: status configs, payload parsers, insights, balance, sync, refund/cancel
// Portado 1:1 do FinancialPanel.jsx (mainsite-admin)

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DollarSign, Download, Loader2, RefreshCw, Search, Trash2, X, ChevronDown, ChevronUp,
  BarChart2, CreditCard, ArrowDownUp, AlertCircle,
} from 'lucide-react'
import { useNotification } from '../../components/Notification'

// ── Tipagem ──

type FinancialLog = {
  id: number
  payment_id: string | null
  status: string
  amount: number
  method: string | null
  payer_email: string | null
  raw_payload: string | null
  created_at: string
}

type Totals = { count: number; approved: number; totalAmount: number }
type FilterOptions = { statuses: string[]; methods: string[] }
type FinanceiroPayload = { ok: boolean; error?: string; logs?: FinancialLog[]; totals?: Totals; filters?: FilterOptions }
type Balance = { available_balance: number; unavailable_balance: number }
type InsightsData = { success?: boolean; error?: string; [key: string]: unknown }
type ModalAction = { type: 'refund' | 'cancel' | 'delete'; log: FinancialLog } | null
type ProviderTab = 'sumup' | 'mercadopago'
type InsightTab = 'transactions-summary' | 'payment-methods' | 'payouts-summary'

// ── Constantes ──

const FINANCIAL_CUTOFF_DATE = '2026-03-01'
const AUTO_REFRESH_MS = 60_000

// ── Status configs — portados 1:1 do FinancialPanel.jsx ──

type StatusConfig = { color: string; bg: string; label: string; canRefund?: boolean; canCancel?: boolean }

const getSumupStatusConfig = (status: string): StatusConfig => {
  const s = (status || '').toUpperCase()
  if (['PAID', 'SUCCESSFUL', 'APPROVED'].includes(s))
    return { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'SUCCESSFUL', canRefund: false, canCancel: false }
  if (['PENDING', 'IN_PROCESS', 'PROCESSING'].includes(s))
    return { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'PENDING', canRefund: false, canCancel: false }
  if (['FAILED', 'FAILURE'].includes(s))
    return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'FAILED', canRefund: false, canCancel: false }
  if (s === 'EXPIRED')
    return { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', label: 'EXPIRADO', canRefund: false, canCancel: false }
  if (s === 'REFUNDED')
    return { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', label: 'REFUNDED', canRefund: false, canCancel: false }
  if (s === 'PARTIALLY_REFUNDED')
    return { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', label: 'PARTIALLY_REFUNDED', canRefund: false, canCancel: false }
  if (['CANCELLED', 'CANCEL', 'CANCELED'].includes(s))
    return { color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: 'CANCELLED', canRefund: false, canCancel: false }
  if (s.includes('CHARGEBACK') || s.includes('CHARGE_BACK'))
    return { color: '#dc2626', bg: 'rgba(220,38,38,0.15)', label: 'CHARGE_BACK', canRefund: false, canCancel: false }
  return { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', label: s || '?', canRefund: false, canCancel: false }
}

const getMPStatusConfig = (status: string, statusDetail?: string): StatusConfig => {
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
    return { color: '#dc2626', bg: 'rgba(220,38,38,0.15)', label: 'CHARGEBACK', canRefund: false, canCancel: false }
  return { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', label: (status || '?').toUpperCase(), canRefund: false, canCancel: false }
}

// ── Payload parsers — compliance SumUp SDK v0.1.2+ e MP REST API v1 ──

const parseSumupPayload = (raw: string | null) => {
  if (!raw) return {}
  try {
    const p = JSON.parse(raw)
    const tx = p?.transactions?.[0] || p?.transaction || {}
    return {
      checkoutStatus: p?.status || '—', checkoutRef: p?.checkout_reference || p?.checkoutReference || '—',
      transactionCode: tx?.transaction_code || tx?.transactionCode || p?.transaction_code || '—',
      transactionUUID: tx?.id || tx?.transaction_id || p?.id || '—',
      paymentType: tx?.payment_type || tx?.paymentType || p?.payment_type || '—',
      authCode: tx?.auth_code || tx?.authCode || '—',
      entryMode: tx?.entry_mode || tx?.entryMode || '—',
      currency: tx?.currency || p?.currency || 'BRL',
      txTimestamp: tx?.timestamp || tx?.created_at || null,
      internalId: tx?.internal_id || tx?.internalId || '—',
      txStatus: tx?.status || p?.status || '—',
    }
  } catch { return {} }
}

const parseMPPayload = (raw: string | null) => {
  if (!raw) return {}
  try {
    const p = JSON.parse(raw)
    const card = p.card || {}, td = p.transaction_details || {}, fees = p.fee_details || [], payer = p.payer || {}, ident = payer.identification || {}
    return {
      statusDetail: p.status_detail, paymentMethodId: p.payment_method_id, paymentTypeId: p.payment_type_id,
      installments: p.installments, lastFour: card.last_four_digits, firstSix: card.first_six_digits,
      cardholderName: card.cardholder?.name,
      netReceivedAmount: td.net_received_amount, totalPaidAmount: td.total_paid_amount,
      acquirerRef: td.acquirer_reference, feeAmount: fees[0]?.amount,
      dateApproved: p.date_approved, moneyReleaseDate: p.money_release_date, moneyReleaseStatus: p.money_release_status,
      authCode: p.authorization_code, externalRef: p.external_reference,
      processingMode: p.processing_mode, netAmount: p.net_amount,
      payerName: [payer.first_name, payer.last_name].filter(Boolean).join(' ') || null,
      payerDoc: ident.number ? `${ident.type}: ${ident.number}` : null,
    }
  } catch { return {} }
}

// ── Utilidades ──

const formatBRL = (v: number) => `R$ ${Number(v || 0).toFixed(2)}`
const formatDateBR = (v: string | null) => {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
}

const detectProvider = (raw: string | null): 'sumup' | 'mercadopago' | 'unknown' => {
  if (!raw) return 'unknown'
  try {
    const p = JSON.parse(raw)
    if (p?.checkout_reference || p?.checkoutReference || Array.isArray(p?.transactions)) return 'sumup'
    if (p?.payment_method_id || p?.payer || p?.transaction_details) return 'mercadopago'
    return 'unknown'
  } catch { return 'unknown' }
}

// ── Componente ──

export function FinanceiroModule() {
  const { showNotification } = useNotification()
  const [adminActor] = useState('admin@app.lcv')

  // Core state
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<FinancialLog[]>([])
  const [totals, setTotals] = useState<Totals>({ count: 0, approved: 0, totalAmount: 0 })
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ statuses: [], methods: [] })
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [modal, setModal] = useState<ModalAction>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMethod, setFilterMethod] = useState('')
  const [startDate, setStartDate] = useState(FINANCIAL_CUTOFF_DATE)
  const [limit, setLimit] = useState('100')

  // Balance
  const [sumupBalance, setSumupBalance] = useState<Balance | null>(null)
  const [mpBalance, setMpBalance] = useState<Balance | null>(null)

  // Insights
  const [insightProvider, setInsightProvider] = useState<ProviderTab>('sumup')
  const [insightTab, setInsightTab] = useState<InsightTab>('transactions-summary')
  const [insightData, setInsightData] = useState<InsightsData | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  // Sync
  const [syncBusy, setSyncBusy] = useState<string | null>(null)

  const headers = useMemo(() => ({ 'X-Admin-Actor': adminActor }), [adminActor])

  // ── Data fetching ──

  const fetchLogs = useCallback(async (notify = false) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterMethod) params.set('method', filterMethod)
      if (startDate) params.set('start_date', startDate)
      params.set('limit', limit)
      const res = await fetch(`/api/financeiro/financeiro?${params}`, { headers })
      const data = await res.json() as FinanceiroPayload
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Erro')
      setLogs(data.logs ?? [])
      setTotals(data.totals ?? { count: 0, approved: 0, totalAmount: 0 })
      setFilterOptions(data.filters ?? { statuses: [], methods: [] })
      if (notify) showNotification('Dados financeiros atualizados.', 'success')
    } catch { showNotification('Não foi possível carregar os dados financeiros.', 'error') }
    finally { setLoading(false) }
  }, [filterStatus, filterMethod, startDate, limit, headers, showNotification])

  const fetchBalances = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([
        fetch(`/api/financeiro/sumup-balance?start_date=${startDate}`, { headers }).then(r => r.json() as Promise<Balance>),
        fetch(`/api/financeiro/mp-balance?start_date=${startDate}`, { headers }).then(r => r.json() as Promise<Balance>),
      ])
      setSumupBalance(s)
      setMpBalance(m)
    } catch { /* silent — balances are best-effort */ }
  }, [startDate, headers])

  const fetchInsights = useCallback(async () => {
    setInsightLoading(true)
    setInsightData(null)
    try {
      const params = new URLSearchParams({ provider: insightProvider === 'mercadopago' ? 'mp' : 'sumup', type: insightTab, start_date: startDate })
      const res = await fetch(`/api/financeiro/insights?${params}`, { headers })
      const data = await res.json() as InsightsData
      setInsightData(data)
    } catch { setInsightData({ error: 'Falha ao carregar insights.' }) }
    finally { setInsightLoading(false) }
  }, [insightProvider, insightTab, startDate, headers])

  useEffect(() => { void fetchLogs(); void fetchBalances() }, [fetchLogs, fetchBalances])
  useEffect(() => { const id = setInterval(() => { void fetchLogs(); void fetchBalances() }, AUTO_REFRESH_MS); return () => clearInterval(id) }, [fetchLogs, fetchBalances])
  useEffect(() => { void fetchInsights() }, [fetchInsights])

  // ── Actions ──

  const handleSync = async (provider: 'sumup' | 'mp') => {
    setSyncBusy(provider)
    try {
      const endpoint = provider === 'sumup' ? '/api/financeiro/sumup-sync' : '/api/financeiro/mp-sync'
      const res = await fetch(endpoint, { method: 'POST', headers })
      const data = await res.json() as { success?: boolean; error?: string; inserted?: number; updated?: number }
      if (data.success) {
        showNotification(`Sincronização ${provider === 'sumup' ? 'SumUp' : 'MP'} concluída: ${data.inserted ?? 0} inseridos, ${data.updated ?? 0} atualizados.`, 'success')
        void fetchLogs(false)
        void fetchBalances()
      } else throw new Error(data.error)
    } catch { showNotification(`Falha na sincronização ${provider}.`, 'error') }
    finally { setSyncBusy(null) }
  }

  const handleReindex = async () => {
    setSyncBusy('reindex')
    try {
      const res = await fetch('/api/financeiro/reindex-gateways', { method: 'POST', headers })
      const data = await res.json() as { success?: boolean; scanned?: number; updated?: number; error?: string }
      if (data.success) {
        showNotification(`Reindex SumUp/MP: ${data.scanned} verificados, ${data.updated} atualizados.`, 'success')
        void fetchLogs(false)
      } else throw new Error(data.error)
    } catch { showNotification('Falha no reindex de gateways.', 'error') }
    finally { setSyncBusy(null) }
  }

  const executeModalAction = async () => {
    if (!modal) return
    setActionBusy(true)
    try {
      if (modal.type === 'delete') {
        const res = await fetch(`/api/financeiro/delete?id=${modal.log.id}`, { method: 'DELETE', headers })
        const data = await res.json() as { ok: boolean; error?: string }
        if (!data.ok) throw new Error(data.error)
        showNotification(`Registro #${modal.log.id} excluído.`, 'success')
      } else if (modal.type === 'refund') {
        const body = refundAmount ? JSON.stringify({ amount: Number(refundAmount) }) : '{}'
        const res = await fetch(`/api/financeiro/mp-refund?id=${modal.log.payment_id}`, {
          method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body,
        })
        const data = await res.json() as { success?: boolean; error?: string }
        if (!data.success) throw new Error(data.error)
        showNotification(`Estorno processado para ${modal.log.payment_id}.`, 'success')
      } else if (modal.type === 'cancel') {
        const res = await fetch(`/api/financeiro/mp-cancel?id=${modal.log.payment_id}`, { method: 'POST', headers })
        const data = await res.json() as { success?: boolean; error?: string }
        if (!data.success) throw new Error(data.error)
        showNotification(`Pagamento ${modal.log.payment_id} cancelado.`, 'success')
      }
      setModal(null)
      setRefundAmount('')
      setExpandedRow(null)
      void fetchLogs(false)
      void fetchBalances()
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro na operação.', 'error')
    } finally { setActionBusy(false) }
  }

  const exportCsv = useCallback(() => {
    if (logs.length === 0) { showNotification('Nenhum registro para exportar.', 'error'); return }
    const esc = (v: string) => { const t = String(v ?? ''); return t.includes('"') || t.includes(',') || t.includes('\n') ? `"${t.replace(/"/g, '""')}"` : t }
    const h = ['id', 'payment_id', 'status', 'amount', 'method', 'payer_email', 'created_at']
    const lines = [h.join(','), ...logs.map(l => [l.id, esc(l.payment_id ?? ''), esc(l.status), l.amount, esc(l.method ?? ''), esc(l.payer_email ?? ''), esc(l.created_at)].join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `financeiro-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    showNotification('CSV exportado.', 'success')
  }, [logs, showNotification])

  const resolveStatusConfig = (log: FinancialLog): StatusConfig => {
    const provider = detectProvider(log.raw_payload)
    if (provider === 'mercadopago') { const p = parseMPPayload(log.raw_payload); return getMPStatusConfig(log.status, p.statusDetail?.toString()) }
    return getSumupStatusConfig(log.status)
  }

  // ── Render helpers ──

  const renderExpandedDetails = (log: FinancialLog) => {
    const provider = detectProvider(log.raw_payload)
    const items: { label: string; value: string }[] = []

    if (provider === 'sumup') {
      const p = parseSumupPayload(log.raw_payload)
      items.push(
        { label: 'Provider', value: 'SumUp' }, { label: 'Checkout Status', value: p.checkoutStatus ?? '—' },
        { label: 'Checkout Ref', value: p.checkoutRef ?? '—' }, { label: 'TX Code', value: p.transactionCode ?? '—' },
        { label: 'TX UUID', value: p.transactionUUID ?? '—' }, { label: 'Payment Type', value: p.paymentType ?? '—' },
        { label: 'Auth Code', value: p.authCode ?? '—' }, { label: 'Entry Mode', value: p.entryMode ?? '—' },
        { label: 'Currency', value: p.currency ?? '—' }, { label: 'TX Timestamp', value: p.txTimestamp ? formatDateBR(p.txTimestamp) : '—' },
        { label: 'Internal ID', value: p.internalId ?? '—' }, { label: 'TX Status', value: p.txStatus ?? '—' },
      )
    } else if (provider === 'mercadopago') {
      const p = parseMPPayload(log.raw_payload)
      items.push(
        { label: 'Provider', value: 'Mercado Pago' }, { label: 'Status Detail', value: p.statusDetail ?? '—' },
        { label: 'Payment Method', value: p.paymentMethodId ?? '—' }, { label: 'Payment Type', value: p.paymentTypeId ?? '—' },
        { label: 'Installments', value: String(p.installments ?? '—') },
      )
      if (p.firstSix || p.lastFour) items.push({ label: 'Card', value: `${p.firstSix ?? '••••••'}...${p.lastFour ?? '••••'}` })
      if (p.cardholderName) items.push({ label: 'Cardholder', value: p.cardholderName })
      items.push(
        { label: 'Net Received', value: p.netReceivedAmount != null ? formatBRL(p.netReceivedAmount) : '—' },
        { label: 'Total Paid', value: p.totalPaidAmount != null ? formatBRL(p.totalPaidAmount) : '—' },
        { label: 'Fee', value: p.feeAmount != null ? formatBRL(p.feeAmount) : '—' },
        { label: 'Auth Code', value: p.authCode ?? '—' }, { label: 'External Ref', value: p.externalRef ?? '—' },
      )
      if (p.dateApproved) items.push({ label: 'Approved At', value: formatDateBR(p.dateApproved) })
      if (p.moneyReleaseDate) items.push({ label: 'Release Date', value: formatDateBR(p.moneyReleaseDate) })
      if (p.payerName) items.push({ label: 'Payer', value: p.payerName })
      if (p.payerDoc) items.push({ label: 'Document', value: p.payerDoc })
    } else {
      try { items.push({ label: 'Raw', value: JSON.stringify(JSON.parse(log.raw_payload ?? '{}'), null, 2) }) } catch { items.push({ label: 'Raw', value: log.raw_payload ?? '—' }) }
    }

    return (
      <div className="fin-expanded-grid">
        {items.map((item, i) => (
          <div key={i} className="fin-detail-group">
            <span className="fin-detail-label">{item.label}</span>
            <span className="fin-detail-value">{item.value}</span>
          </div>
        ))}
      </div>
    )
  }

  const renderInsightData = () => {
    if (insightLoading) return <p className="result-empty"><Loader2 size={16} className="spin" /> Carregando insights...</p>
    if (!insightData) return null
    if (insightData.error) return <p className="result-empty">{String(insightData.error)}</p>

    // Status color mapping for insight badges
    const statusColor = (s: string): { color: string; bg: string } => {
      const u = s.toUpperCase()
      if (['SUCCESSFUL', 'PAID', 'APPROVED'].includes(u)) return { color: '#10b981', bg: 'rgba(16,185,129,0.15)' }
      if (['PENDING', 'IN_PROCESS', 'PROCESSING'].includes(u)) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' }
      if (['FAILED', 'FAILURE', 'REJECTED'].includes(u)) return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
      if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(u)) return { color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' }
      if (['CANCELLED', 'CANCELED', 'EXPIRED'].includes(u)) return { color: '#f97316', bg: 'rgba(249,115,22,0.15)' }
      return { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' }
    }

    // Scalar metrics to render as cards
    const scalarKeys = ['scanned', 'limit', 'totalAmount', 'totalNetAmount', 'totalFee', 'count', 'totalFiltered', 'startDate', 'endDate']
    const scalars = scalarKeys.filter(k => insightData[k] !== undefined)
    // Object metrics (byStatus, byType, etc.)
    const objectKeys = ['byStatus', 'byType', 'methods', 'types', 'paging']
    const objects = objectKeys.filter(k => insightData[k] !== undefined)
    // Boolean/extra
    const boolKeys = ['hasMore']
    const bools = boolKeys.filter(k => insightData[k] !== undefined)

    const isAmount = (k: string) => ['totalAmount', 'totalNetAmount', 'totalFee'].includes(k)
    const labelMap: Record<string, string> = {
      scanned: 'Transações analisadas', limit: 'Limite', totalAmount: 'Valor total',
      totalNetAmount: 'Valor líquido', totalFee: 'Total de taxas', count: 'Contagem',
      totalFiltered: 'Filtrados', startDate: 'Início', endDate: 'Fim',
      byStatus: 'Por Status', byType: 'Por Tipo', methods: 'Métodos', types: 'Tipos',
      paging: 'Paginação', hasMore: 'Mais dados',
    }

    return (
      <div className="fin-insight-result">
        {/* Scalar metrics as cards */}
        {scalars.length > 0 && (
          <div className="fin-insight-metrics">
            {scalars.map(k => (
              <div key={k} className="fin-insight-metric-card">
                <span className="fin-insight-metric-label">{labelMap[k] || k}</span>
                <strong className="fin-insight-metric-value">
                  {isAmount(k) ? formatBRL(Number(insightData[k])) : String(insightData[k])}
                </strong>
              </div>
            ))}
          </div>
        )}

        {/* Object metrics as badge groups */}
        {objects.map(k => {
          const val = insightData[k]
          if (!val || typeof val !== 'object') return null

          // Arrays (methods, types)
          if (Array.isArray(val)) {
            return (
              <div key={k} className="fin-insight-badge-group">
                <span className="fin-insight-group-label">{labelMap[k] || k}</span>
                <div className="fin-insight-badges">
                  {(val as string[]).map((item, i) => {
                    const c = statusColor(String(item))
                    return <span key={i} className="fin-status-badge" style={{ color: c.color, background: c.bg }}>{String(item).toUpperCase()}</span>
                  })}
                  {(val as string[]).length === 0 && <span className="field-hint">Nenhum</span>}
                </div>
              </div>
            )
          }

          // Paging object
          if (k === 'paging') {
            const p = val as Record<string, unknown>
            return (
              <div key={k} className="fin-insight-badge-group">
                <span className="fin-insight-group-label">{labelMap[k]}</span>
                <div className="fin-insight-badges">
                  <span className="fin-insight-paging-pill">Total: {String(p.total ?? '—')}</span>
                  <span className="fin-insight-paging-pill">Limite: {String(p.limit ?? '—')}</span>
                  <span className="fin-insight-paging-pill">Offset: {String(p.offset ?? '—')}</span>
                </div>
              </div>
            )
          }

          // Key-value objects (byStatus, byType) → colored badges with counts
          const entries = Object.entries(val as Record<string, number>)
          return (
            <div key={k} className="fin-insight-badge-group">
              <span className="fin-insight-group-label">{labelMap[k] || k}</span>
              <div className="fin-insight-badges">
                {entries.map(([label, count]) => {
                  const c = statusColor(label)
                  return (
                    <span key={label} className="fin-insight-count-badge" style={{ color: c.color, background: c.bg }}>
                      {label.toUpperCase()} <strong>{count}</strong>
                    </span>
                  )
                })}
                {entries.length === 0 && <span className="field-hint">Nenhum</span>}
              </div>
            </div>
          )
        })}

        {/* Booleans */}
        {bools.map(k => (
          <div key={k} className="fin-insight-badge-group">
            <span className="fin-insight-group-label">{labelMap[k] || k}</span>
            <span className={`fin-insight-bool-pill ${insightData[k] ? 'fin-bool-yes' : 'fin-bool-no'}`}>
              {insightData[k] ? 'Sim' : 'Não'}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const datePresets = useMemo(() => {
    const d = (days: number | null) => {
      if (days == null) return FINANCIAL_CUTOFF_DATE
      const dt = new Date(); dt.setHours(0, 0, 0, 0); dt.setDate(dt.getDate() - days)
      const s = dt.toISOString().slice(0, 10)
      return s < FINANCIAL_CUTOFF_DATE ? FINANCIAL_CUTOFF_DATE : s
    }
    return [{ key: 'today', label: 'Hoje', value: d(0) }, { key: '7d', label: '7 dias', value: d(7) },
      { key: '30d', label: '30 dias', value: d(30) }, { key: 'cutoff', label: 'Desde 01/03/2026', value: FINANCIAL_CUTOFF_DATE }]
  }, [])

  return (
    <section className="module-section">
      <h2><DollarSign size={20} /> Financeiro</h2>
      <p className="section-intro">Painel financeiro consolidado com suporte a <strong>SumUp</strong> e <strong>Mercado Pago</strong>. Leitura de logs via <code>bigdata_db</code> + operações via SDKs oficiais.</p>

      {/* ── Balance Cards ── */}
      <div className="fin-balance-row">
        <article className="result-card fin-balance-card">
          <h4><CreditCard size={16} /> SumUp</h4>
          <div className="fin-balance-values">
            <div><span className="fin-balance-label">Disponível</span><strong className="fin-balance-amount">{sumupBalance ? formatBRL(sumupBalance.available_balance) : '—'}</strong></div>
            <div><span className="fin-balance-label">Pendente</span><span className="fin-balance-pending">{sumupBalance ? formatBRL(sumupBalance.unavailable_balance) : '—'}</span></div>
          </div>
        </article>
        <article className="result-card fin-balance-card">
          <h4><CreditCard size={16} /> Mercado Pago</h4>
          <div className="fin-balance-values">
            <div><span className="fin-balance-label">Disponível</span><strong className="fin-balance-amount">{mpBalance ? formatBRL(mpBalance.available_balance) : '—'}</strong></div>
            <div><span className="fin-balance-label">Pendente</span><span className="fin-balance-pending">{mpBalance ? formatBRL(mpBalance.unavailable_balance) : '—'}</span></div>
          </div>
        </article>
      </div>

      {/* ── Totais ── */}
      <div className="fin-summary-bar">
        <div className="fin-summary-item"><span className="fin-summary-label">Total de registros</span><span className="fin-summary-value">{totals.count}</span></div>
        <div className="fin-summary-item fin-summary-approved"><span className="fin-summary-label">Aprovados</span><span className="fin-summary-value">{totals.approved}</span></div>
        <div className="fin-summary-item"><span className="fin-summary-label">Valor acumulado</span><span className="fin-summary-value">{formatBRL(totals.totalAmount)}</span></div>
      </div>

      {/* ── Sync / Reindex ── */}
      <article className="result-card">
        <div className="result-toolbar">
          <h4><ArrowDownUp size={16} /> Sincronização & Manutenção</h4>
        </div>
        <div className="fin-sync-row">
          <button type="button" className="ghost-button" onClick={() => void handleSync('sumup')} disabled={!!syncBusy}>
            {syncBusy === 'sumup' ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Sync SumUp
          </button>
          <button type="button" className="ghost-button" onClick={() => void handleSync('mp')} disabled={!!syncBusy}>
            {syncBusy === 'mp' ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Sync Mercado Pago
          </button>
          <button type="button" className="ghost-button" onClick={() => void handleReindex()} disabled={!!syncBusy}>
            {syncBusy === 'reindex' ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Reindex SumUp/Mercado Pago
          </button>
        </div>
      </article>

      {/* ── Insights ── */}
      <article className="result-card">
        <div className="result-toolbar"><h4><BarChart2 size={16} /> Insights</h4></div>
        <div className="fin-insight-controls">
          <div className="field-group">
            <label htmlFor="fin-insight-provider">Provider</label>
            <select id="fin-insight-provider" name="finInsightProvider" value={insightProvider} onChange={(e) => setInsightProvider(e.target.value as ProviderTab)}>
              <option value="sumup">SumUp</option>
              <option value="mercadopago">Mercado Pago</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="fin-insight-tab">Tipo</label>
            <select id="fin-insight-tab" name="finInsightTab" value={insightTab} onChange={(e) => setInsightTab(e.target.value as InsightTab)}>
              <option value="transactions-summary">Resumo de Transações</option>
              <option value="payment-methods">Métodos de Pagamento</option>
              {insightProvider === 'sumup' && <option value="payouts-summary">Resumo de Payouts</option>}
            </select>
          </div>
        </div>
        {renderInsightData()}
      </article>

      {/* ── Filtros ── */}
      <article className="result-card">
        <div className="result-toolbar">
          <h4><Search size={16} /> Filtros de Log</h4>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void fetchLogs(true)} disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} Atualizar
            </button>
            <button type="button" className="ghost-button" onClick={exportCsv} disabled={loading || logs.length === 0}>
              <Download size={16} /> CSV
            </button>
          </div>
        </div>
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="fin-filter-status">Status</label>
            <select id="fin-filter-status" name="finFilterStatus" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Todos</option>
              {filterOptions.statuses.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="fin-filter-method">Método</label>
            <select id="fin-filter-method" name="finFilterMethod" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
              <option value="">Todos</option>
              {filterOptions.methods.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="fin-filter-start-date">Data inicial</label>
            <input id="fin-filter-start-date" name="finFilterStartDate" type="date" value={startDate} min={FINANCIAL_CUTOFF_DATE} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="fin-filter-limit">Limite</label>
            <select id="fin-filter-limit" name="finFilterLimit" value={limit} onChange={(e) => setLimit(e.target.value)}>
              <option value="50">50</option><option value="100">100</option><option value="200">200</option><option value="500">500</option>
            </select>
          </div>
        </div>
        <div className="fin-date-presets">
          {datePresets.map(p => (
            <button key={p.key} type="button" className={`fin-preset-btn ${startDate === p.value ? 'fin-preset-active' : ''}`} onClick={() => setStartDate(p.value)}>{p.label}</button>
          ))}
        </div>
      </article>

      {/* ── Tabela ── */}
      <article className="result-card">
        <div className="result-toolbar"><h4><DollarSign size={16} /> Transações ({logs.length} de {totals.count})</h4></div>
        {loading && logs.length === 0 ? <p className="result-empty"><Loader2 size={16} className="spin" /> Carregando...</p>
          : logs.length === 0 ? <p className="result-empty">Nenhum registro financeiro encontrado.</p>
          : (
            <ul className="result-list">
              {logs.map(log => {
                const cfg = resolveStatusConfig(log)
                const isExp = expandedRow === log.id
                const provider = detectProvider(log.raw_payload)
                return (
                  <li key={log.id} className="post-row">
                    <div className="post-row-main fin-row-clickable" onClick={() => setExpandedRow(isExp ? null : log.id)}>
                      <div className="fin-row-header">
                        <span className="fin-status-badge" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                        <strong className="fin-amount">{formatBRL(log.amount)}</strong>
                        <span className="fin-method">{log.method ?? '—'}</span>
                        <span className="fin-date">{formatDateBR(log.created_at)}</span>
                        {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                      <div className="post-row-meta">
                        <span>ID: {log.id}</span>
                        {log.payment_id && <span>Payment: {log.payment_id}</span>}
                        {log.payer_email && <span>Payer: {log.payer_email}</span>}
                      </div>
                    </div>
                    {isExp && (
                      <div className="fin-expanded-section">
                        {renderExpandedDetails(log)}
                        <div className="fin-expanded-actions">
                          {provider === 'mercadopago' && cfg.canRefund && (
                            <button type="button" className="ghost-button fin-action-refund" onClick={() => setModal({ type: 'refund', log })}>
                              <DollarSign size={14} /> Estornar
                            </button>
                          )}
                          {provider === 'mercadopago' && cfg.canCancel && (
                            <button type="button" className="ghost-button fin-action-cancel" onClick={() => setModal({ type: 'cancel', log })}>
                              <X size={14} /> Cancelar
                            </button>
                          )}
                          <button type="button" className="ghost-button fin-delete-btn" onClick={() => setModal({ type: 'delete', log })}>
                            <Trash2 size={14} /> Excluir do banco
                          </button>
                          <button type="button" className="ghost-button" onClick={() => setExpandedRow(null)}>
                            <X size={14} /> Fechar
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
      </article>

      {/* ── Modal de confirmação ── */}
      {modal && (
        <div className="fin-modal-overlay" onClick={() => { if (!actionBusy) setModal(null) }}>
          <div className="fin-modal-content" onClick={e => e.stopPropagation()}>
            <AlertCircle size={40} color={modal.type === 'delete' ? 'var(--semantic-error)' : modal.type === 'cancel' ? 'var(--semantic-warning, #f59e0b)' : '#8b5cf6'} />
            <h3 className="fin-modal-title">
              {modal.type === 'delete' ? 'Excluir registro' : modal.type === 'cancel' ? 'Cancelar pagamento' : 'Estornar pagamento'}
            </h3>
            <p className="fin-modal-text">
              {modal.type === 'delete' ? `Tem certeza de que deseja EXCLUIR permanentemente o registro #${modal.log.id}?`
                : modal.type === 'cancel' ? `Tem certeza de que deseja CANCELAR o pagamento ${modal.log.payment_id} no Mercado Pago?`
                : `Estorno do pagamento ${modal.log.payment_id} (${formatBRL(modal.log.amount)}) no Mercado Pago.`}
            </p>
            {modal.type === 'refund' && (
              <div className="field-group" style={{ marginTop: '12px' }}>
                <label htmlFor="fin-refund-amount">Valor do estorno (vazio = total)</label>
                <input id="fin-refund-amount" name="finRefundAmount" type="number" step="0.01" min="0.01" max={modal.log.amount}
                  placeholder={`Máximo: ${modal.log.amount}`} value={refundAmount} onChange={e => setRefundAmount(e.target.value)} />
              </div>
            )}
            <div className="fin-modal-actions">
              <button type="button" className="ghost-button" onClick={() => { setModal(null); setRefundAmount('') }} disabled={actionBusy}>Cancelar</button>
              <button type="button" className="ghost-button fin-modal-confirm" onClick={() => void executeModalAction()} disabled={actionBusy}>
                {actionBusy ? <Loader2 size={14} className="spin" /> : null} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
