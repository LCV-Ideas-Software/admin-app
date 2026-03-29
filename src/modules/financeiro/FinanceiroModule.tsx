// admin-app/src/modules/financeiro/FinanceiroModule.tsx
// Painel Financeiro — Arquitetura gêmea SumUp / Mercado Pago
// Compliance: SumUp SDK v0.1.2+ / Mercado Pago REST API v1
// Acessibilidade: WCAG 2.1 AA + eMAG

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DollarSign, Download, Loader2, RefreshCw, Trash2,
  AlertCircle, RotateCcw, Ban, Wallet,
} from 'lucide-react'
import { useNotification } from '../../components/Notification'
import {
  type FinancialLog, type StatusConfig, type ProviderTab, type AdvancedTx,
  type ModalAction, type ProviderFilters,
  FINANCIAL_CUTOFF_DATE, SUMUP_FILTERS_KEY, MP_FILTERS_KEY,
  WEBHOOK_POLL_MS, AUTO_REFRESH_MS, DATE_PRESETS,
  loadFilters, saveFilters, clampStartDate,
  formatDateTimeBR, formatDateBR, formatBRL,
  parseSumupPayload, parseMPPayload,
  detectProvider, resolveStatusConfig, getFinancialToneClass,
} from './financeiro-helpers'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

// ── Tipos internos ──

type Balance = { available_balance: number; unavailable_balance: number }
type InsightsState = {
  loading: boolean; error: string
  paymentMethods: string[]
  summary: AnyRecord | null
  advancedTx: AdvancedTx[]
  payouts: AnyRecord | null
  lastUpdated: string | null
}
type SumupPagination = {
  nextCursor: AnyRecord | null; prevCursor: AnyRecord | null
  page: number; lastMove: string
}
type MpPagination = {
  nextOffset: number | null; prevOffset: number | null
  offset: number; page: number; lastMove: string
}

const emptyInsights = (): InsightsState => ({
  loading: false, error: '', paymentMethods: [],
  summary: null, advancedTx: [], payouts: null, lastUpdated: null,
})

// ── Componente ──

export function FinanceiroModule() {
  const { showNotification } = useNotification()

  // Provider ativo
  const [provider, setProvider] = useState<ProviderTab>('mercadopago')
  const providerLabel = provider === 'sumup' ? 'SumUp' : 'Mercado Pago'

  // Logs (D1)
  const [allLogs, setAllLogs] = useState<FinancialLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  // Logs filtrados por provedor
  const logs = useMemo(() => allLogs.filter(l => detectProvider(l) === provider), [allLogs, provider])

  // Balance (D1)
  const [balance, setBalance] = useState<Balance>({ available_balance: 0, unavailable_balance: 0 })

  // Filtros por provedor (persistidos em localStorage)
  const [sumupFilters, setSumupFilters] = useState<ProviderFilters>(() => loadFilters(SUMUP_FILTERS_KEY))
  const [mpFilters, setMpFilters] = useState<ProviderFilters>(() => loadFilters(MP_FILTERS_KEY))
  const activeFilters = provider === 'sumup' ? sumupFilters : mpFilters
  const setActiveFilters = provider === 'sumup' ? setSumupFilters : setMpFilters

  // Dates por provedor
  const [sumupStartDate, setSumupStartDate] = useState(FINANCIAL_CUTOFF_DATE)
  const [mpStartDate, setMpStartDate] = useState(FINANCIAL_CUTOFF_DATE)
  const activeStartDate = provider === 'sumup' ? sumupStartDate : mpStartDate
  const setActiveStartDate = provider === 'sumup' ? setSumupStartDate : setMpStartDate

  // Insights (SDK)
  const [insights, setInsights] = useState<InsightsState>(emptyInsights())
  const [sumupPag, setSumupPag] = useState<SumupPagination>({ nextCursor: null, prevCursor: null, page: 1, lastMove: 'initial' })
  const [mpPag, setMpPag] = useState<MpPagination>({ nextOffset: null, prevOffset: null, offset: 0, page: 1, lastMove: 'initial' })

  // Sync/actions
  const [syncBusy, setSyncBusy] = useState(false)
  const [modal, setModal] = useState<ModalAction>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const logCountRef = useRef(0)

  // Persistência de filtros em localStorage
  useEffect(() => { saveFilters(SUMUP_FILTERS_KEY, sumupFilters) }, [sumupFilters])
  useEffect(() => { saveFilters(MP_FILTERS_KEY, mpFilters) }, [mpFilters])

  // ── Data fetching ──

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '500', start_date: activeStartDate })
      const res = await fetch(`/api/financeiro/financeiro?${params}`)
      const data = await res.json() as { ok: boolean; logs?: FinancialLog[]; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Erro')
      setAllLogs(data.logs ?? [])
      logCountRef.current = (data.logs ?? []).length
    } catch { showNotification('Não foi possível carregar os dados financeiros.', 'error') }
    finally { setLogsLoading(false) }
  }, [activeStartDate, showNotification])

  const fetchBalance = useCallback(async () => {
    try {
      const endpoint = provider === 'sumup' ? '/api/financeiro/sumup-balance' : '/api/financeiro/mp-balance'
      const res = await fetch(`${endpoint}?start_date=${activeStartDate}`)
      const data = await res.json() as Balance
      setBalance(data)
    } catch { /* melhor esforço */ }
  }, [provider, activeStartDate])

  const fetchInsights = useCallback(async (filters: ProviderFilters, cursor?: AnyRecord | null, offset?: number, move = 'initial') => {
    setInsights(prev => ({ ...prev, loading: true, error: '' }))
    try {
      const prov = provider === 'sumup' ? 'sumup' : 'mp'
      const qs = (type: string, extra: Record<string, string> = {}) => {
        const p = new URLSearchParams({ provider: prov, type, start_date: activeStartDate, ...extra })
        return p.toString()
      }

      // Parallel: methods + summary + advanced + payouts(SumUp only)
      const advQs = new URLSearchParams({
        provider: prov, type: 'transactions-advanced',
        limit: String(filters.limit || 50),
        start_date: activeStartDate,
      })
      if (filters.statuses.length) advQs.set('statuses', filters.statuses.join(','))
      if (filters.types.length) advQs.set('types', filters.types.join(','))

      if (provider === 'sumup') {
        advQs.set('changes_since', `${activeStartDate}T00:00:00-03:00`)
        if (cursor?.newest_time) advQs.set('newest_time', cursor.newest_time)
        if (cursor?.newest_ref) advQs.set('newest_ref', cursor.newest_ref)
        if (cursor?.oldest_time) advQs.set('oldest_time', cursor.oldest_time)
        if (cursor?.oldest_ref) advQs.set('oldest_ref', cursor.oldest_ref)
      } else {
        advQs.set('begin_date', `${activeStartDate}T00:00:00-03:00`)
        advQs.set('offset', String(offset ?? 0))
      }

      const fetches: Promise<Response>[] = [
        fetch(`/api/financeiro/insights?${qs('payment-methods')}`),
        fetch(`/api/financeiro/insights?${qs('transactions-summary')}`),
        fetch(`/api/financeiro/insights?${advQs}`),
      ]
      if (provider === 'sumup') {
        fetches.push(fetch(`/api/financeiro/insights?${qs('payouts-summary')}`))
      }

      const responses = await Promise.all(fetches)
      const [methodsData, summaryData, advData, payoutsData] = await Promise.all(
        responses.map(r => r.json() as Promise<AnyRecord>)
      )

      if (!responses[0].ok) throw new Error(String(methodsData.error || 'Falha nos métodos'))
      if (!responses[1].ok) throw new Error(String(summaryData.error || 'Falha no resumo'))
      if (!responses[2].ok) throw new Error(String(advData.error || 'Falha nas transações avançadas'))

      setInsights({
        loading: false, error: '',
        paymentMethods: methodsData.methods || [],
        summary: summaryData,
        advancedTx: (advData.items || []) as AdvancedTx[],
        payouts: payoutsData || null,
        lastUpdated: new Date().toISOString(),
      })

      // Atualizar paginação
      if (provider === 'sumup') {
        setSumupPag(prev => ({
          nextCursor: advData?.cursors?.next || null,
          prevCursor: advData?.cursors?.prev || null,
          lastMove: move,
          page: move === 'next' ? prev.page + 1 : move === 'prev' ? Math.max(1, prev.page - 1) : 1,
        }))
      } else {
        const paging = advData?.paging || {}
        const curOff = Number(paging.offset || 0)
        const curLim = Number(paging.limit || filters.limit || 50)
        setMpPag({
          nextOffset: paging.hasNext ? Number(paging.nextOffset) : null,
          prevOffset: paging.hasPrev ? Number(paging.prevOffset) : null,
          offset: curOff,
          page: Math.floor(curOff / Math.max(1, curLim)) + 1,
          lastMove: move,
        })
      }
    } catch (err) {
      setInsights(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : 'Erro nos insights.' }))
    }
  }, [provider, activeStartDate])

  // ── Sync ──

  const syncProvider = useCallback(async () => {
    setSyncBusy(true)
    try {
      if (provider === 'sumup') {
        // Reindex + sync (como referência)
        const reindexRes = await fetch('/api/financeiro/reindex-gateways', { method: 'POST' })
        const reindexData = await reindexRes.json() as AnyRecord
        const syncRes = await fetch('/api/financeiro/sumup-sync', { method: 'POST' })
        const syncData = await syncRes.json() as AnyRecord
        if (!syncRes.ok) throw new Error(syncData.error || 'Falha na sincronização SumUp.')
        showNotification(
          `Reindexado: ${reindexData.updated ?? 0}/${reindexData.scanned ?? 0}. Sincronizado: ${syncData.inserted ?? 0} novo(s), ${syncData.updated ?? 0} atualizado(s).`,
          'success'
        )
      } else {
        const res = await fetch('/api/financeiro/mp-sync', { method: 'POST' })
        const data = await res.json() as AnyRecord
        if (!res.ok) throw new Error(data.error || 'Falha na sincronização Mercado Pago.')
        showNotification(
          `Sincronizado: ${data.inserted ?? 0} novo(s), ${data.updated ?? 0} atualizado(s), ${data.scanned ?? 0} verificada(s).`,
          'success'
        )
      }
      void fetchLogs()
      void fetchBalance()
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro na sincronização.', 'error')
    } finally { setSyncBusy(false) }
  }, [provider, fetchLogs, fetchBalance, showNotification])

  // ── Auto-sync no mount e ao trocar aba ──

  useEffect(() => {
    void syncProvider()
    void fetchInsights(activeFilters, null, 0, 'initial')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider])

  useEffect(() => { void fetchLogs(); void fetchBalance() }, [fetchLogs, fetchBalance])
  useEffect(() => {
    const id = setInterval(() => { void fetchLogs(); void fetchBalance() }, AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchLogs, fetchBalance])

  // ── Webhook polling (15s) ──

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const params = new URLSearchParams({ limit: '500', start_date: activeStartDate })
        const res = await fetch(`/api/financeiro/financeiro?${params}`)
        const data = await res.json() as { ok: boolean; logs?: FinancialLog[] }
        if (data.ok && data.logs) {
          const newCount = data.logs.length
          if (logCountRef.current > 0 && newCount > logCountRef.current) {
            showNotification(`Novo registro processado via ${providerLabel}! Atualizando...`, 'success')
            setAllLogs(data.logs)
            logCountRef.current = newCount
            void fetchBalance()
          } else {
            logCountRef.current = newCount
          }
        }
      } catch { /* polling silencioso */ }
    }, WEBHOOK_POLL_MS)
    return () => clearInterval(id)
  }, [activeStartDate, providerLabel, fetchBalance, showNotification])

  // ── Actions ──

  const executeAction = async () => {
    if (!modal) return
    setActionBusy(true)
    const { type, log } = modal
    const txId = log.payment_id || String(log.id)
    try {
      if (type === 'delete') {
        const res = await fetch(`/api/financeiro/delete?id=${log.id}`, { method: 'DELETE' })
        const data = await res.json() as { ok: boolean; error?: string }
        if (!data.ok) throw new Error(data.error)
        showNotification(`Registro #${log.id} excluído.`, 'success')
      } else if (type === 'refund') {
        // Converter valor BRL (vírgula) para número. Vazio = estorno total.
        const parsedAmount = refundAmount ? Number(refundAmount.replace(',', '.')) : null
        const body = (parsedAmount && parsedAmount > 0) ? JSON.stringify({ amount: parsedAmount }) : '{}'
        const endpoint = provider === 'sumup'
          ? `/api/financeiro/sumup-refund?id=${txId}`
          : `/api/financeiro/mp-refund?id=${txId}`
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
        const data = await res.json() as { success?: boolean; error?: string }
        if (!data.success) throw new Error(data.error)
        showNotification(`Estorno processado para ${txId}.`, 'success')
      } else if (type === 'cancel') {
        const endpoint = provider === 'sumup'
          ? `/api/financeiro/sumup-cancel?id=${txId}`
          : `/api/financeiro/mp-cancel?id=${txId}`
        const res = await fetch(endpoint, { method: 'POST' })
        const data = await res.json() as { success?: boolean; error?: string }
        if (!data.success) throw new Error(data.error)
        showNotification(`Pagamento ${txId} cancelado.`, 'success')
      }
      setModal(null); setRefundAmount(''); setExpandedRow(null)
      void fetchLogs(); void fetchBalance()
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro na operação.', 'error')
    } finally { setActionBusy(false) }
  }

  // ── CSV Export (por provedor ativo) ──

  const exportCsv = useCallback(() => {
    if (logs.length === 0) { showNotification('Nenhum registro para exportar.', 'error'); return }
    const esc = (v: string) => { const t = String(v ?? ''); return (t.includes('"') || t.includes(',') || t.includes('\n')) ? `"${t.replace(/"/g, '""')}"` : t }
    const h = ['id', 'payment_id', 'status', 'amount', 'method', 'payer_email', 'created_at']
    const lines = [h.join(','), ...logs.map(l => [l.id, esc(l.payment_id ?? ''), esc(l.status), l.amount, esc(l.method ?? ''), esc(l.payer_email ?? ''), esc(l.created_at)].join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${provider}-transacoes-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    showNotification('CSV exportado.', 'success')
  }, [logs, provider, showNotification])

  const exportAdvancedCsv = useCallback(() => {
    const rows = insights.advancedTx
    if (!rows.length) { showNotification('Nenhuma transação avançada para exportar.', 'error'); return }
    const esc = (v: string) => { const t = String(v ?? ''); return (t.includes('"') || t.includes(',') || t.includes('\n')) ? `"${t.replace(/"/g, '""')}"` : t }
    const h = ['id', 'transactionCode', 'amount', 'currency', 'status', 'type', 'paymentType', 'cardType', 'timestamp', 'user', 'refundedAmount']
    const lines = [h.join(','), ...rows.map(tx => h.map(k => esc(String((tx as AnyRecord)[k] ?? ''))).join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${provider}-avancadas-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    showNotification('CSV exportado.', 'success')
  }, [insights.advancedTx, provider, showNotification])

  // ── Legenda de status (badges com contagem + soma por status) ──

  const statusLegend = useMemo(() => {
    const counts: Record<string, { cfg: StatusConfig; n: number; sum: number }> = {}
    logs.forEach(log => {
      const cfg = resolveStatusConfig(log)
      if (!counts[cfg.label]) counts[cfg.label] = { cfg, n: 0, sum: 0 }
      counts[cfg.label].n++
      counts[cfg.label].sum += Number(log.amount || 0)
    })
    return Object.entries(counts)
  }, [logs])

  // ── Detalhes expandidos ──

  const renderExpandedDetails = (log: FinancialLog) => {
    const prov = detectProvider(log)
    const txId = log.payment_id ?? String(log.id)
    const cfg = resolveStatusConfig(log)

    if (prov === 'sumup') {
      const p = parseSumupPayload(log.raw_payload) as AnyRecord
      const items = [
        ['Checkout UUID', txId], ['Transação UUID', p.transactionUUID],
        ['Código TX', p.transactionCode], ['Auth Code', p.authCode],
        ['Tipo de Pagamento', p.paymentType], ['Entry Mode', p.entryMode],
        ['Status Checkout', p.checkoutStatus], ['Status Transação', p.txStatus],
        ['Moeda', p.currency], ['ID Interno', p.internalId],
        ['Checkout Ref', p.checkoutRef],
        ['Data TX (Brasília)', p.txTimestamp ? formatDateTimeBR(String(p.txTimestamp)) : '—'],
      ].filter(([, v]) => v != null && v !== '' && v !== '—')
      return (
        <>
          <div className="fin-expanded-stack">
            {items.map(([label, value], i) => (
              <div key={i} className="fin-detail-group">
                <span className="fin-detail-label">{label}</span>
                <span className="fin-detail-value">{String(value ?? '—')}</span>
              </div>
            ))}
          </div>
          {cfg.canRefund && (
            <div className="fin-expanded-note fin-expanded-note--sumup">
              <AlertCircle size={13} /> Estornos SumUp só ficam disponíveis após a liquidação da transação (geralmente em até 24h).
            </div>
          )}
        </>
      )
    }

    // Mercado Pago
    const p = parseMPPayload(log.raw_payload) as AnyRecord
    const items = [
      ['Payment ID', txId], ['Ref. Externa', p.externalRef],
      ['Método de Pgto.', p.paymentMethodId], ['Tipo de Pgto.', p.paymentTypeId],
      ['Detalhe do Status', p.statusDetail],
      ['Parcelas', p.installments ? String(p.installments) : null],
      ['Cartão (Primeiros 6)', p.firstSix], ['Cartão (Últimos 4)', p.lastFour],
      ['Titular do Cartão', p.cardholderName],
      ['Pagador', p.payerName], ['Doc. Pagador', p.payerDoc],
      ['Cód. Autorização', p.authCode],
      ['Valor Total Pago', p.totalPaidAmount != null ? formatBRL(Number(p.totalPaidAmount)) : null],
      ['Valor Líquido Recebido', p.netReceivedAmount != null ? formatBRL(Number(p.netReceivedAmount)) : null],
      ['Taxa', p.feeAmount != null ? formatBRL(Number(p.feeAmount)) : null],
      ['Data de Aprovação', p.dateApproved ? formatDateTimeBR(String(p.dateApproved)) : null],
      ['Previsão de Liberação', p.moneyReleaseDate ? formatDateBR(String(p.moneyReleaseDate)) : null],
      ['Status de Liberação', p.moneyReleaseStatus],
      ['Modo de Processamento', p.processingMode],
      ['Ref. Adquirente', p.acquirerRef],
    ].filter(([, v]) => v != null && v !== '')
    return (
      <>
        <div className="fin-expanded-stack">
          {items.map(([label, value], i) => (
            <div key={i} className="fin-detail-group">
              <span className="fin-detail-label">{label}</span>
              <span className="fin-detail-value">{String(value ?? '—')}</span>
            </div>
          ))}
        </div>
        {cfg.canRefund && (
          <div className="fin-expanded-note fin-expanded-note--mp">
            <AlertCircle size={13} /> O valor líquido recebido já desconta as taxas do Mercado Pago.
          </div>
        )}
      </>
    )
  }

  // Paginação unificada
  const activePag = provider === 'sumup' ? sumupPag : mpPag
  const canPrev = provider === 'sumup' ? !!sumupPag.prevCursor : mpPag.prevOffset !== null
  const canNext = provider === 'sumup' ? !!sumupPag.nextCursor : mpPag.nextOffset !== null

  const goPage = (dir: 'prev' | 'next' | 'first') => {
    if (provider === 'sumup') {
      const cursor = dir === 'next' ? sumupPag.nextCursor : dir === 'prev' ? sumupPag.prevCursor : null
      void fetchInsights(activeFilters, cursor, undefined, dir === 'first' ? 'initial' : dir)
    } else {
      const off = dir === 'next' ? (mpPag.nextOffset ?? 0) : dir === 'prev' ? (mpPag.prevOffset ?? 0) : 0
      void fetchInsights(activeFilters, null, off, dir === 'first' ? 'initial' : dir)
    }
  }

  // ── Render ──

  return (
    <section className="module-section" aria-label="Módulo Financeiro">
      <h2><DollarSign size={20} /> Financeiro</h2>

      {/* ── Abas de provedor (gêmeas) ── */}
      <div className="fin-provider-tabs" role="tablist" aria-label="Seleção de provedor de pagamento">
        <button type="button" role="tab" aria-selected={provider === 'mercadopago'}
          className={`fin-provider-tab fin-provider-tab--mp ${provider === 'mercadopago' ? 'fin-provider-tab--active' : ''}`}
          onClick={() => setProvider('mercadopago')}>
          Mercado Pago
        </button>
        <button type="button" role="tab" aria-selected={provider === 'sumup'}
          className={`fin-provider-tab fin-provider-tab--sumup ${provider === 'sumup' ? 'fin-provider-tab--active' : ''}`}
          onClick={() => setProvider('sumup')}>
          SumUp
        </button>
      </div>

      {/* ── Balance (provedor ativo) ── */}
      <div className="fin-balance-row" role="region" aria-label={`Saldo ${providerLabel}`}>
        <article className="result-card fin-balance-card">
          <h4><Wallet size={16} /> Saldo Disponível ({providerLabel})</h4>
          <div className="fin-balance-amount">{formatBRL(balance.available_balance)}</div>
        </article>
        <article className="result-card fin-balance-card">
          <h4><RefreshCw size={16} /> Saldo a Liberar ({providerLabel})</h4>
          <div className="fin-balance-pending">{formatBRL(balance.unavailable_balance)}</div>
        </article>
      </div>

      {/* ── Insights SDK (gêmeo) ── */}
      <article className={`result-card fin-insights-panel fin-insights-panel--${provider}`}
        role="region" aria-label={`Insights ${providerLabel}`}>
        <div className="fin-insights-header">
          <h3>Insights {providerLabel} (SDK Oficial)</h3>
          <button type="button" className="ghost-button" disabled={insights.loading}
            onClick={() => void fetchInsights(activeFilters, null, 0, 'initial')} aria-label="Atualizar insights">
            <RefreshCw size={14} className={insights.loading ? 'spin' : ''} />
            {insights.loading ? 'Atualizando...' : 'Atualizar Insights'}
          </button>
        </div>
        <div className={`fin-insights-period fin-insights-period--${provider}`}>
          Período operacional ativo: desde {formatDateBR(`${activeStartDate}T00:00:00-03:00`)} (Brasília, UTC-3)
        </div>

        {/* Filtros de insights */}
        <div className="fin-insight-filters">
          <select aria-label="Filtrar por status" value={activeFilters.statuses[0] || ''}
            onChange={e => setActiveFilters(prev => ({ ...prev, statuses: e.target.value ? [e.target.value] : [] }))}>
            <option value="">Todos os status</option>
            {provider === 'sumup' ? (
              <>
                <option value="pending">PENDENTE</option><option value="failed">FALHA</option>
                <option value="cancelled">CANCELADO</option><option value="refunded">ESTORNADO</option>
                <option value="charge_back">CONTESTAÇÃO</option>
              </>
            ) : (
              <>
                <option value="approved">APROVADO</option><option value="pending">PENDENTE</option>
                <option value="in_process">EM ANÁLISE</option><option value="rejected">RECUSADO</option>
                <option value="refunded">ESTORNADO</option><option value="cancelled">CANCELADO</option>
                <option value="charged_back">CONTESTAÇÃO</option>
              </>
            )}
          </select>
          <select aria-label="Filtrar por tipo" value={activeFilters.types[0] || ''}
            onChange={e => setActiveFilters(prev => ({ ...prev, types: e.target.value ? [e.target.value] : [] }))}>
            <option value="">Todos os tipos</option>
            {provider === 'sumup' ? (
              <><option value="refund">ESTORNO</option><option value="charge_back">CONTESTAÇÃO</option></>
            ) : (
              <><option value="credit_card">CRÉDITO</option><option value="debit_card">DÉBITO</option>
              <option value="pix">PIX</option><option value="ticket">BOLETO</option>
              <option value="account_money">SALDO MP</option></>
            )}
          </select>
          <select aria-label="Limite de resultados" value={activeFilters.limit}
            onChange={e => setActiveFilters(prev => ({ ...prev, limit: Number(e.target.value) || 50 }))}>
            <option value={25}>25</option><option value={50}>50</option>
            <option value={75}>75</option><option value={100}>100</option>
          </select>
          <input type="date" aria-label="Data inicial" value={activeStartDate}
            min={FINANCIAL_CUTOFF_DATE} max={new Date().toISOString().slice(0, 10)}
            onChange={e => setActiveStartDate(clampStartDate(e.target.value || FINANCIAL_CUTOFF_DATE))} />
          <div className="fin-date-presets">
            {DATE_PRESETS.map(p => (
              <button key={p.key} type="button" className={`fin-preset-btn fin-preset-btn--${provider} ${activeStartDate === p.value ? 'fin-preset-active' : ''}`}
                onClick={() => setActiveStartDate(p.value)}>{p.label}</button>
            ))}
          </div>
        </div>

        <div className="fin-insight-actions">
          <button type="button" className="ghost-button" disabled={insights.loading}
            onClick={() => void fetchInsights(activeFilters, null, 0, 'initial')}>Aplicar Filtros</button>
          <button type="button" className="ghost-button" disabled={insights.loading || !canPrev}
            onClick={() => goPage('prev')}>Página Anterior</button>
          <button type="button" className="ghost-button" disabled={insights.loading || !canNext}
            onClick={() => goPage('next')}>Próxima Página</button>
          <button type="button" className="ghost-button" disabled={insights.loading || activePag.page === 1}
            onClick={() => goPage('first')}>Voltar ao Início</button>
          <button type="button" className="ghost-button" disabled={insights.loading || !insights.advancedTx.length}
            onClick={exportAdvancedCsv}><Download size={14} /> Exportar CSV</button>
        </div>

        {insights.error ? (
          <div className="fin-insight-error" role="alert">{insights.error}</div>
        ) : (
          <>
            {/* Métricas em grid (gêmeo) */}
            <div className="fin-insight-metrics">
              <div className="fin-insight-metric-card">
                <span className="fin-insight-metric-label">Métodos disponíveis</span>
                <strong className="fin-insight-metric-value">{insights.paymentMethods.length || '—'}</strong>
                <span className="fin-insight-metric-detail">{insights.paymentMethods.join(', ') || '—'}</span>
              </div>
              <div className="fin-insight-metric-card">
                <span className="fin-insight-metric-label">Registros analisados</span>
                <strong className="fin-insight-metric-value">{insights.summary?.scanned ?? '—'}</strong>
              </div>
              <div className="fin-insight-metric-card">
                <span className="fin-insight-metric-label">Volume bruto</span>
                <strong className="fin-insight-metric-value">{formatBRL(Number(insights.summary?.totalAmount || 0))}</strong>
              </div>
              <div className="fin-insight-metric-card">
                <span className="fin-insight-metric-label">Volume líquido operacional</span>
                <strong className="fin-insight-metric-value">
                  {provider === 'sumup'
                    ? formatBRL(Number(insights.payouts?.totalAmount || 0) - Number(insights.payouts?.totalFee || 0))
                    : formatBRL(Number(insights.summary?.totalNetAmount || 0))}
                </strong>
                <span className="fin-insight-metric-detail">
                  {provider === 'sumup' ? 'Base: payouts líquidos' : 'Base: transações líquidas'}
                </span>
              </div>
            </div>

            {/* Badges de status */}
            <div className="fin-insight-badges" aria-label="Contagem por status">
              {Object.entries((insights.summary?.byStatus || {}) as Record<string, number>).map(([status, count]) => (
                <span key={`st-${status}`} className={`fin-insight-count-badge ${getFinancialToneClass(status)}`}>
                  {status.toUpperCase()} <strong>{count}</strong>
                </span>
              ))}
              {provider === 'sumup' && Object.entries((insights.payouts?.byStatus || {}) as Record<string, number>).map(([status, count]) => (
                <span key={`po-${status}`} className="fin-insight-count-badge fin-tone-success">
                  PAYOUT {status} <strong>{count}</strong>
                </span>
              ))}
              {provider === 'mercadopago' && Object.entries((insights.summary?.byType || {}) as Record<string, number>).map(([type, count]) => (
                <span key={`ty-${type}`} className="fin-insight-count-badge fin-tone-info">
                  TIPO {type} <strong>{count}</strong>
                </span>
              ))}
            </div>

            <div className="fin-insight-meta">
              <span>Última atualização: {formatDateTimeBR(insights.lastUpdated)}</span>
              <span>Página: {activePag.page}</span>
            </div>

            {/* Tabela de transações avançadas (gêmeo) */}
            <div className="fin-advanced-table-wrap" role="region" aria-label="Transações avançadas">
              <div className="fin-advanced-title">Transações Avançadas (filtro SDK)</div>
              <div className="fin-advanced-scroll">
                <table className="fin-table" aria-label="Tabela de transações avançadas">
                  <thead>
                    <tr>
                      <th scope="col">Código</th><th scope="col">Valor</th>
                      <th scope="col">Tipo</th><th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.advancedTx.slice(0, 25).map((tx, i) => (
                      <tr key={`${tx.id || 'tx'}-${i}`}>
                        <td className="fin-table-mono">{tx.transactionCode || tx.id || '—'}</td>
                        <td className="fin-table-bold">{formatBRL(tx.amount)}</td>
                        <td>{tx.type || '—'}</td>
                        <td><span className={`fin-status-badge ${getFinancialToneClass(tx.status)}`}>{tx.status?.toUpperCase() || '—'}</span></td>
                      </tr>
                    ))}
                    {insights.advancedTx.length === 0 && (
                      <tr><td colSpan={4} className="fin-table-empty">Nenhuma transação encontrada com os filtros atuais.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </article>

      {/* ── Histórico de Transações (gêmeo) ── */}
      <article className="result-card" role="region" aria-label={`Histórico ${providerLabel}`}>
        <div className="fin-history-header">
          <h3><DollarSign size={18} /> Histórico de Transações e Logs ({providerLabel})</h3>
          <div className="fin-history-actions">
            <button type="button" className="ghost-button" onClick={() => void syncProvider()} disabled={syncBusy}
              aria-label={`Sincronizar dados ${providerLabel}`}>
              <RefreshCw size={14} className={syncBusy ? 'spin' : ''} />
              {syncBusy ? 'Sincronizando...' : `Sync ${providerLabel}`}
            </button>
            <button type="button" className="ghost-button" onClick={() => void fetchLogs()} disabled={logsLoading}>
              <RefreshCw size={14} className={logsLoading ? 'spin' : ''} /> Atualizar
            </button>
            <button type="button" className="ghost-button" onClick={exportCsv} disabled={logsLoading || logs.length === 0}>
              <Download size={14} /> CSV
            </button>
          </div>
        </div>
        <div className="fin-history-period">
          Registros desde {formatDateBR(`${activeStartDate}T00:00:00-03:00`)} (Brasília, UTC-3)
        </div>

        {/* Legenda de status */}
        {logs.length > 0 && (
          <div className="fin-legend-row" role="list" aria-label="Legenda de status">
            {statusLegend.map(([label, { n, sum }]) => (
              <span key={label} role="listitem" className={`fin-legend-badge ${getFinancialToneClass(label)}`}>
                {label} <span className="fin-legend-count">× {n}</span>
                <span className="fin-legend-sum">{formatBRL(sum)}</span>
              </span>
            ))}
          </div>
        )}

        {/* Tabela de logs */}
        {logsLoading && logs.length === 0 ? (
          <p className="result-empty"><Loader2 size={16} className="spin" /> Carregando...</p>
        ) : logs.length === 0 ? (
          <p className="result-empty">Nenhum log financeiro registrado.</p>
        ) : (
          <div className="fin-table-wrap">
            <table className="fin-table" aria-label={`Tabela de transações ${providerLabel}`}>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">ID</th>
                  {provider === 'sumup' && <th scope="col">Código TX</th>}
                  {provider === 'sumup' && <th scope="col">Tipo</th>}
                  {provider === 'mercadopago' && <th scope="col">Método</th>}
                  {provider === 'mercadopago' && <th scope="col">Parcelas</th>}
                  <th scope="col">Status</th>
                  <th scope="col">Valor (R$)</th>
                  <th scope="col">E-mail / Ações</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const txId = log.payment_id || String(log.id)
                  const amount = Number(log.amount || 0)
                  const isExp = expandedRow === log.id
                  const cfg = resolveStatusConfig(log)
                  const sumupInfo = provider === 'sumup' ? parseSumupPayload(log.raw_payload) as AnyRecord : null
                  const mpInfo = provider === 'mercadopago' ? parseMPPayload(log.raw_payload) as AnyRecord : null

                  return (
                    <tr key={log.id} className={isExp ? 'fin-row-expanded' : ''}>
                      <td colSpan={provider === 'sumup' ? 9 : 9}>
                        <button type="button" className="fin-row-toggle-btn"
                          onClick={() => setExpandedRow(isExp ? null : log.id)}
                          aria-expanded={isExp} aria-controls={`fin-detail-${log.id}`}
                          aria-label={isExp ? `Ocultar detalhes da transação ${txId}` : `Mostrar detalhes da transação ${txId}`}>
                          <div className="fin-row-columns">
                            <span className="fin-col-date">{formatDateTimeBR(log.created_at ? `${log.created_at.replace(' ', 'T')}Z` : null)}</span>
                            <span className="fin-col-id" title={txId}>{txId}</span>
                            {provider === 'sumup' && <span className="fin-col-code">{String(sumupInfo?.transactionCode ?? '—')}</span>}
                            {provider === 'sumup' && <span className="fin-col-type">{String(sumupInfo?.paymentType ?? '—')}</span>}
                            {provider === 'mercadopago' && <span className="fin-col-method">{String(mpInfo?.paymentMethodId ?? '—')}</span>}
                            {provider === 'mercadopago' && <span className="fin-col-installments">{mpInfo?.installments ? `${mpInfo.installments}×` : '—'}</span>}
                            <span className="fin-col-status">
                              <span className={`fin-status-badge ${getFinancialToneClass(cfg.label)}`}>{cfg.label}</span>
                            </span>
                            <span className="fin-col-amount">{amount.toFixed(2)}</span>
                            <span className="fin-col-email">{log.payer_email !== 'N/A' ? (log.payer_email || '—') : '—'}</span>
                          </div>
                        </button>

                        {isExp && (
                          <div id={`fin-detail-${log.id}`} className={`fin-expanded-section ${provider === 'sumup' ? 'fin-expanded-section--sumup' : 'fin-expanded-section--mp'}`}>
                            {renderExpandedDetails(log)}
                            <div className="fin-expanded-actions">
                              {cfg.canRefund && (
                                <button type="button" className="ghost-button fin-action-refund"
                                  onClick={e => { e.stopPropagation(); setModal({ type: 'refund', log }) }}
                                  title={provider === 'sumup' ? 'Pode levar até 24h para estar disponível após a liquidação' : ''}>
                                  <RotateCcw size={14} /> Estornar
                                </button>
                              )}
                              {cfg.canCancel && (
                                <button type="button" className="ghost-button fin-action-cancel"
                                  onClick={e => { e.stopPropagation(); setModal({ type: 'cancel', log }) }}>
                                  <Ban size={14} /> Cancelar
                                </button>
                              )}
                              <button type="button" className="ghost-button fin-delete-btn"
                                onClick={e => { e.stopPropagation(); setModal({ type: 'delete', log }) }}>
                                <Trash2 size={14} /> Excluir
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="fin-table-hint">Clique em uma linha para ver os detalhes completos da transação.</p>
          </div>
        )}
      </article>

      {/* ── Modal de confirmação ── */}
      {modal && (
        <div className="fin-modal-overlay" role="dialog" aria-modal="true"
          aria-labelledby="fin-modal-title" aria-describedby="fin-modal-desc"
          onClick={() => { if (!actionBusy) { setModal(null); setRefundAmount('') } }}>
          <div className="fin-modal-content" onClick={e => e.stopPropagation()}>
            <AlertCircle size={40} color={modal.type === 'delete' ? 'var(--semantic-error, #ef4444)' : modal.type === 'cancel' ? '#f59e0b' : '#8b5cf6'} />
            <h3 id="fin-modal-title" className="fin-modal-title">
              {modal.type === 'delete' ? 'Excluir registro' : modal.type === 'cancel' ? 'Cancelar pagamento' : 'Estornar pagamento'}
            </h3>
            <p id="fin-modal-desc" className="fin-modal-text">
              {modal.type === 'delete'
                ? `Tem certeza de que deseja EXCLUIR permanentemente o registro #${modal.log.id}?`
                : modal.type === 'cancel'
                  ? `Tem certeza de que deseja CANCELAR o pagamento ${modal.log.payment_id} no ${providerLabel}?`
                  : `Estorno do pagamento ${modal.log.payment_id} (${formatBRL(modal.log.amount)}) no ${providerLabel}.`}
            </p>
            {modal.type === 'refund' && (
              <div className="field-group field-group--mt">
                <label htmlFor="fin-refund-amount">Valor do estorno (deixe vazio para estorno total)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-secondary, #6b7280)', fontWeight: 600, fontSize: 14, pointerEvents: 'none',
                  }}>R$</span>
                  <input
                    id="fin-refund-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder={`Máximo: ${modal.log.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    value={refundAmount}
                    onChange={e => {
                      // Permite apenas dígitos, vírgula e ponto
                      let raw = e.target.value.replace(/[^\d.,]/g, '')
                      // Normaliza: aceita vírgula como decimal
                      // Remove pontos extras (separadores de milhar)
                      const parts = raw.replace(/\./g, ',').split(',')
                      if (parts.length > 2) {
                        raw = parts.slice(0, -1).join('') + ',' + parts[parts.length - 1]
                      } else {
                        raw = parts.join(',')
                      }
                      // Limita casas decimais a 2
                      const decSplit = raw.split(',')
                      if (decSplit.length === 2 && decSplit[1].length > 2) {
                        raw = decSplit[0] + ',' + decSplit[1].slice(0, 2)
                      }
                      setRefundAmount(raw)
                    }}
                    autoComplete="off"
                    style={{ paddingLeft: 38 }}
                  />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary, #6b7280)', marginTop: 4, display: 'block' }}>
                  {refundAmount
                    ? `Estorno parcial: R$ ${refundAmount}`
                    : `Estorno total: ${formatBRL(modal.log.amount)}`
                  }
                </span>
              </div>
            )}
            <div className="fin-modal-actions">
              <button type="button" className="ghost-button" onClick={() => { setModal(null); setRefundAmount('') }} disabled={actionBusy}>Voltar</button>
              <button type="button" className="ghost-button fin-modal-confirm" onClick={() => void executeAction()} disabled={actionBusy}>
                {actionBusy ? <Loader2 size={14} className="spin" /> : null}
                {modal.type === 'delete' ? 'Excluir Registro' : modal.type === 'cancel' ? 'Confirmar Cancelamento' : 'Confirmar Estorno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
