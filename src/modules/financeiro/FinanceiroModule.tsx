// admin-app/src/modules/financeiro/FinanceiroModule.tsx
// Painel Financeiro — Dados LIVE dos provedores (SumUp SDK + MP REST API)
// Sem dependência D1 — source of truth é sempre o provedor externo
// Compliance: SumUp SDK v0.1.2+ / Mercado Pago REST API v1
// Acessibilidade: WCAG 2.1 AA + eMAG

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DollarSign, Download, Loader2, RefreshCw,
  AlertCircle, RotateCcw, Ban, Wallet,
} from 'lucide-react'
import { useNotification } from '../../components/Notification'
import {
  type AdvancedTx, type StatusConfig, type ProviderTab,
  type ModalAction, type ProviderFilters,
  FINANCIAL_CUTOFF_DATE, SUMUP_FILTERS_KEY, MP_FILTERS_KEY,
  AUTO_REFRESH_MS, DATE_PRESETS,
  defaultFilters, loadFilters, saveFilters, clampStartDate,
  formatDateTimeBR, formatDateBR, formatBRL,
  getSumupStatusConfig, getMPStatusConfig, getFinancialToneClass,
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

// ── Status config para AdvancedTx ──

const resolveAdvancedStatusConfig = (tx: AdvancedTx, provider: ProviderTab): StatusConfig => {
  if (provider === 'mercadopago') {
    return getMPStatusConfig(tx.status, tx.statusDetail ?? '')
  }
  return getSumupStatusConfig(tx.status)
}

// ── Componente ──

export function FinanceiroModule() {
  const { showNotification } = useNotification()

  // Provider ativo
  const [provider, setProvider] = useState<ProviderTab>('mercadopago')
  const providerLabel = provider === 'sumup' ? 'SumUp' : 'Mercado Pago'

  // Filtros por provedor (D1-persisted)
  const [sumupFilters, setSumupFilters] = useState<ProviderFilters>(defaultFilters)
  const [mpFilters, setMpFilters] = useState<ProviderFilters>(defaultFilters)
  const activeFilters = provider === 'sumup' ? sumupFilters : mpFilters
  const setActiveFilters = provider === 'sumup' ? setSumupFilters : setMpFilters

  // Carregar filtros do D1 no mount
  useEffect(() => {
    void loadFilters(SUMUP_FILTERS_KEY).then(setSumupFilters)
    void loadFilters(MP_FILTERS_KEY).then(setMpFilters)
  }, [])

  // Persistência de filtros no D1
  const sumupFiltersRef = useRef(sumupFilters)
  const mpFiltersRef = useRef(mpFilters)
  useEffect(() => {
    if (JSON.stringify(sumupFiltersRef.current) !== JSON.stringify(sumupFilters)) {
      sumupFiltersRef.current = sumupFilters
      void saveFilters(SUMUP_FILTERS_KEY, sumupFilters)
    }
  }, [sumupFilters])
  useEffect(() => {
    if (JSON.stringify(mpFiltersRef.current) !== JSON.stringify(mpFilters)) {
      mpFiltersRef.current = mpFilters
      void saveFilters(MP_FILTERS_KEY, mpFilters)
    }
  }, [mpFilters])

  // Dates por provedor
  const [sumupStartDate, setSumupStartDate] = useState(FINANCIAL_CUTOFF_DATE)
  const [mpStartDate, setMpStartDate] = useState(FINANCIAL_CUTOFF_DATE)
  const activeStartDate = provider === 'sumup' ? sumupStartDate : mpStartDate
  const setActiveStartDate = provider === 'sumup' ? setSumupStartDate : setMpStartDate

  // Balance (SDK)
  const [balance, setBalance] = useState<Balance>({ available_balance: 0, unavailable_balance: 0 })

  // Insights (SDK live data — fonte única de dados)
  const [insights, setInsights] = useState<InsightsState>(emptyInsights())
  const [sumupPag, setSumupPag] = useState<SumupPagination>({ nextCursor: null, prevCursor: null, page: 1, lastMove: 'initial' })
  const [mpPag, setMpPag] = useState<MpPagination>({ nextOffset: null, prevOffset: null, offset: 0, page: 1, lastMove: 'initial' })

  // Expanded row + actions
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalAction>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')

  // ── Data fetching ──

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

      // Build advanced query
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

      // Parallel: methods + summary + advanced + payouts(SumUp only)
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
      if (!responses[2].ok) throw new Error(String(advData.error || 'Falha nas transações'))

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
      setInsights(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : 'Erro ao carregar dados.' }))
    }
  }, [provider, activeStartDate])

  // ── Auto-fetch no mount e ao trocar aba ──

  useEffect(() => {
    void fetchInsights(activeFilters, null, 0, 'initial')
    void fetchBalance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider])

  // Auto-refresh periódico
  useEffect(() => {
    const id = setInterval(() => {
      void fetchInsights(activeFilters, null, 0, 'initial')
      void fetchBalance()
    }, AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchInsights, fetchBalance, activeFilters])

  // ── Actions ──

  const executeAction = async () => {
    if (!modal) return
    setActionBusy(true)
    const { type, tx } = modal
    const txId = tx.transactionCode || tx.id || ''
    try {
      if (type === 'refund') {
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
      void fetchInsights(activeFilters, null, 0, 'initial')
      void fetchBalance()
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro na operação.', 'error')
    } finally { setActionBusy(false) }
  }

  // ── CSV Export ──

  const exportCsv = useCallback(() => {
    const rows = insights.advancedTx
    if (!rows.length) { showNotification('Nenhuma transação para exportar.', 'error'); return }
    const esc = (v: string) => { const t = String(v ?? ''); return (t.includes('"') || t.includes(',') || t.includes('\n')) ? `"${t.replace(/"/g, '""')}"` : t }
    const h = ['id', 'transactionCode', 'amount', 'currency', 'status', 'type', 'paymentType', 'cardType', 'timestamp', 'user', 'refundedAmount']
    const lines = [h.join(','), ...rows.map(tx => h.map(k => esc(String((tx as AnyRecord)[k] ?? ''))).join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${provider}-transacoes-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    showNotification('CSV exportado.', 'success')
  }, [insights.advancedTx, provider, showNotification])

  // ── Status legend (badges com contagem + soma) ──

  const statusLegend = useMemo(() => {
    const counts: Record<string, { cfg: StatusConfig; n: number; sum: number }> = {}
    insights.advancedTx.forEach(tx => {
      const cfg = resolveAdvancedStatusConfig(tx, provider)
      if (!counts[cfg.label]) counts[cfg.label] = { cfg, n: 0, sum: 0 }
      counts[cfg.label].n++
      counts[cfg.label].sum += tx.amount
    })
    return Object.entries(counts)
  }, [insights.advancedTx, provider])

  // ── Expanded details render ──

  const renderExpandedDetails = (tx: AdvancedTx) => {
    const cfg = resolveAdvancedStatusConfig(tx, provider)

    if (provider === 'sumup') {
      const items = [
        ['Transaction ID', tx.id], ['Código TX', tx.transactionCode],
        ['Tipo de Pagamento', tx.paymentType], ['Entry Mode', tx.entryMode],
        ['Status', tx.status?.toUpperCase()], ['Auth Code', tx.authCode],
        ['Moeda', tx.currency], ['ID Interno', tx.internalId],
        ['Valor Estornado', tx.refundedAmount > 0 ? formatBRL(tx.refundedAmount) : null],
        ['Data (Brasília)', tx.timestamp ? formatDateTimeBR(tx.timestamp) : null],
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
    const items = [
      ['Payment ID', tx.id], ['Código TX', tx.transactionCode],
      ['Método de Pgto.', tx.paymentType], ['Tipo de Pgto.', tx.type],
      ['Detalhe do Status', tx.statusDetail],
      ['Parcelas', tx.installments ? String(tx.installments) : null],
      ['Cartão', tx.cardType],
      ['E-mail Pagador', tx.payerEmail],
      ['Cód. Autorização', tx.authCode],
      ['Ref. Externa', tx.externalRef],
      ['Valor Líquido Recebido', tx.netReceivedAmount != null && tx.netReceivedAmount > 0 ? formatBRL(tx.netReceivedAmount) : null],
      ['Taxa', tx.feeAmount != null ? formatBRL(tx.feeAmount) : null],
      ['Valor Estornado', tx.refundedAmount > 0 ? formatBRL(tx.refundedAmount) : null],
      ['Data de Aprovação', tx.dateApproved ? formatDateTimeBR(tx.dateApproved) : null],
    ].filter(([, v]) => v != null && v !== '' && v !== '—' && v !== 'null')
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

      {/* ── Abas de provedor ── */}
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

      {/* ── Balance ── */}
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

      {/* ── Painel de dados live (SDK) ── */}
      <article className={`result-card fin-insights-panel fin-insights-panel--${provider}`}
        role="region" aria-label={`Dados ${providerLabel}`}>
        <div className="fin-insights-header">
          <h3>Transações {providerLabel} (Dados Live)</h3>
          <button type="button" className="ghost-button" disabled={insights.loading}
            onClick={() => void fetchInsights(activeFilters, null, 0, 'initial')} aria-label="Atualizar dados">
            <RefreshCw size={14} className={insights.loading ? 'spin' : ''} />
            {insights.loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
        <div className={`fin-insights-period fin-insights-period--${provider}`}>
          Dados ao vivo das APIs {providerLabel} — desde {formatDateBR(`${activeStartDate}T00:00:00-03:00`)} (Brasília, UTC-3)
        </div>

        {/* Filtros */}
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
            onClick={exportCsv}><Download size={14} /> Exportar CSV</button>
        </div>

        {insights.error ? (
          <div className="fin-insight-error" role="alert">{insights.error}</div>
        ) : (
          <>
            {/* Métricas em grid */}
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
              {insights.summary?.totalNetAmount != null && (
                <div className="fin-insight-metric-card">
                  <span className="fin-insight-metric-label">Volume líquido</span>
                  <strong className="fin-insight-metric-value">{formatBRL(Number(insights.summary.totalNetAmount))}</strong>
                </div>
              )}
            </div>

            {/* Badges breakdown */}
            <div className="fin-insight-badges">
              {Object.entries((insights.summary?.byStatus || {}) as Record<string, number>).map(([status, count]) => (
                <span key={`st-${status}`} className="fin-insight-count-badge fin-tone-info">
                  {status} <strong>{count}</strong>
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
          </>
        )}
      </article>

      {/* ── Tabela de Transações Live ── */}
      <article className="result-card" role="region" aria-label={`Transações ${providerLabel}`}>
        <div className="fin-history-header">
          <h3><DollarSign size={18} /> Transações ({providerLabel} — Live)</h3>
          <div className="fin-history-actions">
            <button type="button" className="ghost-button" disabled={insights.loading}
              onClick={() => void fetchInsights(activeFilters, null, 0, 'initial')} aria-label="Atualizar dados">
              <RefreshCw size={14} className={insights.loading ? 'spin' : ''} /> Atualizar
            </button>
            <button type="button" className="ghost-button" onClick={exportCsv} disabled={insights.loading || insights.advancedTx.length === 0}>
              <Download size={14} /> CSV
            </button>
          </div>
        </div>
        <div className="fin-history-period">
          Dados ao vivo desde {formatDateBR(`${activeStartDate}T00:00:00-03:00`)} (Brasília, UTC-3)
        </div>

        {/* Legenda de status */}
        {statusLegend.length > 0 && (
          <div className="fin-legend-row" role="list" aria-label="Legenda de status">
            {statusLegend.map(([label, { n, sum }]) => (
              <span key={label} role="listitem" className={`fin-legend-badge ${getFinancialToneClass(label)}`}>
                {label} <span className="fin-legend-count">× {n}</span>
                <span className="fin-legend-sum">{formatBRL(sum)}</span>
              </span>
            ))}
          </div>
        )}

        {/* Tabela */}
        {insights.loading && insights.advancedTx.length === 0 ? (
          <p className="result-empty"><Loader2 size={16} className="spin" /> Carregando...</p>
        ) : insights.advancedTx.length === 0 ? (
          <p className="result-empty">Nenhuma transação encontrada com os filtros atuais.</p>
        ) : (
          <div className="fin-table-wrap">
            <table className={`fin-table fin-table--${provider}`} aria-label={`Tabela de transações ${providerLabel}`}>
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
                {insights.advancedTx.map((tx, idx) => {
                  const txKey = tx.id || tx.transactionCode || `tx-${idx}`
                  const isExp = expandedRow === txKey
                  const cfg = resolveAdvancedStatusConfig(tx, provider)

                  return (
                    <tr key={txKey} className={isExp ? 'fin-row-expanded' : ''}>
                      <td colSpan={7}>
                        <button type="button" className="fin-row-toggle-btn"
                          onClick={() => setExpandedRow(isExp ? null : txKey)}
                          aria-expanded={isExp} aria-controls={`fin-detail-${txKey}`}
                          aria-label={isExp ? `Ocultar detalhes da transação ${txKey}` : `Mostrar detalhes da transação ${txKey}`}>
                          <div className="fin-row-columns">
                            <span className="fin-col-date">{formatDateTimeBR(tx.timestamp)}</span>
                            <span className="fin-col-id" title={tx.id || '—'}>{tx.id ? String(tx.id).slice(0, 20) + (String(tx.id).length > 20 ? '…' : '') : '—'}</span>
                            {provider === 'sumup' && <span className="fin-col-code">{tx.transactionCode || '—'}</span>}
                            {provider === 'sumup' && <span className="fin-col-type">{tx.paymentType || '—'}</span>}
                            {provider === 'mercadopago' && <span className="fin-col-method">{tx.paymentType || '—'}</span>}
                            {provider === 'mercadopago' && <span className="fin-col-installments">{tx.installments ? `${tx.installments}×` : '—'}</span>}
                            <span className="fin-col-status">
                              <span className={`fin-status-badge ${getFinancialToneClass(cfg.label)}`}>{cfg.label}</span>
                            </span>
                            <span className="fin-col-amount">{tx.amount.toFixed(2)}</span>
                            <span className="fin-col-email">{tx.payerEmail || tx.user || '—'}</span>
                          </div>
                        </button>

                        {isExp && (
                          <div id={`fin-detail-${txKey}`} className={`fin-expanded-section ${provider === 'sumup' ? 'fin-expanded-section--sumup' : 'fin-expanded-section--mp'}`}>
                            {renderExpandedDetails(tx)}
                            <div className="fin-expanded-actions">
                              {cfg.canRefund && (
                                <button type="button" className="ghost-button fin-action-refund"
                                  onClick={e => { e.stopPropagation(); setModal({ type: 'refund', tx }) }}
                                  title={provider === 'sumup' ? 'Pode levar até 24h para estar disponível após a liquidação' : ''}>
                                  <RotateCcw size={14} /> Estornar
                                </button>
                              )}
                              {cfg.canCancel && (
                                <button type="button" className="ghost-button fin-action-cancel"
                                  onClick={e => { e.stopPropagation(); setModal({ type: 'cancel', tx }) }}>
                                  <Ban size={14} /> Cancelar
                                </button>
                              )}
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
            <AlertCircle size={40} color={modal.type === 'cancel' ? '#f59e0b' : '#8b5cf6'} />
            <h3 id="fin-modal-title" className="fin-modal-title">
              {modal.type === 'cancel' ? 'Cancelar pagamento' : 'Estornar pagamento'}
            </h3>
            <p id="fin-modal-desc" className="fin-modal-text">
              {modal.type === 'cancel'
                ? `Tem certeza de que deseja CANCELAR o pagamento ${modal.tx.id} no ${providerLabel}?`
                : `Estorno do pagamento ${modal.tx.id} (${formatBRL(modal.tx.amount)}) no ${providerLabel}.`}
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
                    placeholder={`Máximo: ${modal.tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    value={refundAmount}
                    onChange={e => {
                      let raw = e.target.value.replace(/[^\d.,]/g, '')
                      const parts = raw.replace(/\./g, ',').split(',')
                      if (parts.length > 2) {
                        raw = parts.slice(0, -1).join('') + ',' + parts[parts.length - 1]
                      } else {
                        raw = parts.join(',')
                      }
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
                    : `Estorno total: ${formatBRL(modal.tx.amount)}`
                  }
                </span>
              </div>
            )}
            <div className="fin-modal-actions">
              <button type="button" className="ghost-button" onClick={() => { setModal(null); setRefundAmount('') }} disabled={actionBusy}>Voltar</button>
              <button type="button" className="ghost-button fin-modal-confirm" onClick={() => void executeAction()} disabled={actionBusy}>
                {actionBusy ? <Loader2 size={14} className="spin" /> : null}
                {modal.type === 'cancel' ? 'Confirmar Cancelamento' : 'Confirmar Estorno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
