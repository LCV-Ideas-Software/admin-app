/*
 * ObservabilityBlock — Workers Observability dashboard block
 * Renders at the bottom of the CF P&W module dashboard.
 * Phases: Dashboard, Events, Errors, Latency, Destinations
 *
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, BarChart3, Clock, Download, ExternalLink,
  Loader2, Play, Radio, RefreshCw, Search, Server, Square, Trash2, Wifi, XCircle,
} from 'lucide-react'
import { useNotification } from '../../components/Notification'

// ── Types ──

type ObsQueryResponse = {
  ok: boolean
  error?: string
  result?: Record<string, unknown>
}

type ObsDestination = {
  name: string
  slug?: string
  enabled: boolean
  configuration?: {
    type?: string
    logpushDataset?: string
    url?: string
    headers?: Record<string, string>
  }
}

type ObsDestinationsResponse = {
  ok: boolean
  error?: string
  destinations?: ObsDestination[]
}

type CalcAggregate = {
  value: number
  count: number
  groups?: Array<{ key: string; value: string | number | boolean }>
}

type CalcResult = {
  calculation: string
  alias?: string
  aggregates: CalcAggregate[]
}

type EventRow = Record<string, unknown>

// ── Constants ──

const TIME_RANGES = [
  { label: '15m', ms: 900_000 },
  { label: '1h', ms: 3_600_000 },
  { label: '24h', ms: 86_400_000 },
  { label: '3d', ms: 259_200_000 },
  { label: '7d', ms: 604_800_000 },
] as const

const OBS_TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'live', label: 'Live', icon: Radio },
  { key: 'events', label: 'Eventos', icon: Search },
  { key: 'errors', label: 'Erros', icon: XCircle },
  { key: 'latency', label: 'Latência', icon: Clock },
  { key: 'destinations', label: 'Destinos', icon: Download },
] as const

type ObsTabKey = typeof OBS_TABS[number]['key']

// ── Helpers ──

const formatMs = (ms: number): string => {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`
  if (ms < 1000) return `${ms.toFixed(1)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const formatDate = (ts: number | string): string => {
  try {
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts)
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  } catch {
    return String(ts)
  }
}

const generateQueryId = () => `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

// ── API calls ──

async function safeJson<T>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) {
    throw new Error(`Observability API retornou HTTP ${res.status} (não-JSON).`)
  }
  return res.json() as Promise<T>
}

const obsPost = async (action: string, body?: Record<string, unknown>, slug?: string): Promise<ObsQueryResponse> => {
  const res = await fetch('/api/cfpw/observability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, body, slug }),
  })
  return safeJson<ObsQueryResponse>(res)
}

const obsGet = async (): Promise<ObsDestinationsResponse> => {
  const res = await fetch('/api/cfpw/observability')
  return safeJson<ObsDestinationsResponse>(res)
}

// ── Component ──

export function ObservabilityBlock() {
  const { showNotification } = useNotification()
  const [tab, setTab] = useState<ObsTabKey>('dashboard')
  const [timeRange, setTimeRange] = useState(2) // index into TIME_RANGES (24h)
  const [loading, setLoading] = useState(false)
  const [liveActive, setLiveActive] = useState(false)
  const [searchNeedle, setSearchNeedle] = useState('')

  // Dashboard state
  const [dashCalcs, setDashCalcs] = useState<CalcResult[]>([])
  const [dashErrorCount, setDashErrorCount] = useState<number>(0)
  const [dashTotalCount, setDashTotalCount] = useState<number>(0)

  // Events state
  const [events, setEvents] = useState<EventRow[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)

  // Live state
  const [liveEvents, setLiveEvents] = useState<EventRow[]>([])
  const [liveLoading, setLiveLoading] = useState(false)

  // Errors state
  const [errors, setErrors] = useState<EventRow[]>([])
  const [errorsLoading, setErrorsLoading] = useState(false)

  // Latency state
  const [latencyCalcs, setLatencyCalcs] = useState<CalcResult[]>([])
  const [latencyLoading, setLatencyLoading] = useState(false)

  // Destinations state
  const [destinations, setDestinations] = useState<ObsDestination[]>([])
  const [destsLoading, setDestsLoading] = useState(false)

  // Destination form
  const [newDestName, setNewDestName] = useState('')
  const [newDestUrl, setNewDestUrl] = useState('')
  const [newDestDataset, setNewDestDataset] = useState<'opentelemetry-traces' | 'opentelemetry-logs'>('opentelemetry-traces')
  const [newDestHeaderKey, setNewDestHeaderKey] = useState('')
  const [newDestHeaderValue, setNewDestHeaderValue] = useState('')

  const timeframe = useMemo(() => {
    const now = Date.now()
    return { from: now - TIME_RANGES[timeRange].ms, to: now }
  }, [timeRange])

  // ── Dashboard queries ──

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      // Query 1: COUNT grouped by $workers.scriptName
      const countRes = await obsPost('query', {
        queryId: generateQueryId(),
        timeframe,
        view: 'calculations',
        parameters: {
          calculations: [{ operator: 'COUNT', alias: 'total' }],
          groupBys: [{ type: 'string', value: '$workers.scriptName' }],
          orderBy: { value: 'total', order: 'desc' },
          limit: 50,
        },
      })

      if (countRes.ok && countRes.result) {
        const rawCalcs = (countRes.result as { calculations?: CalcResult[] }).calculations
        const calcs = Array.isArray(rawCalcs) ? rawCalcs : []
        setDashCalcs(calcs)
        // Compute total from aggregates
        const totalCalc = calcs.find(c => c.alias === 'total' || c.calculation === 'COUNT')
        const aggs = Array.isArray(totalCalc?.aggregates) ? totalCalc.aggregates : []
        const total = aggs.reduce((sum, a) => sum + (a.count || 0), 0)
        setDashTotalCount(total)
      }

      // Query 2: Error count
      const errRes = await obsPost('query', {
        queryId: generateQueryId(),
        timeframe,
        view: 'calculations',
        parameters: {
          calculations: [{ operator: 'COUNT', alias: 'errors' }],
          filters: [{
            kind: 'filter',
            key: '$metadata.error',
            operation: 'EXISTS',
            type: 'string',
          }],
        },
      })

      if (errRes.ok && errRes.result) {
        const rawErrCalcs = (errRes.result as { calculations?: CalcResult[] }).calculations
        const errCalcs = Array.isArray(rawErrCalcs) ? rawErrCalcs : []
        const errCalc = errCalcs.find(c => c.alias === 'errors' || c.calculation === 'COUNT')
        const errAggs = Array.isArray(errCalc?.aggregates) ? errCalc.aggregates : []
        const errTotal = errAggs.reduce((sum, a) => sum + (a.count || 0), 0)
        setDashErrorCount(errTotal)
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro ao carregar dashboard.', 'error')
    } finally {
      setLoading(false)
    }
  }, [timeframe, showNotification])

  // ── Events query ──

  const loadEvents = useCallback(async () => {
    setEventsLoading(true)
    try {
      const needle = searchNeedle.trim()
      const res = await obsPost('query', {
        queryId: generateQueryId(),
        timeframe,
        view: 'events',
        limit: 50,
        parameters: {
          ...(needle ? { needle: { value: needle, matchCase: false } } : {}),
        },
      })

      if (res.ok && res.result) {
        const rawEvts = (res.result as { events?: EventRow[] }).events
        setEvents(Array.isArray(rawEvts) ? rawEvts : [])
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro ao carregar eventos.', 'error')
    } finally {
      setEventsLoading(false)
    }
  }, [timeframe, searchNeedle, showNotification])

  // ── Errors query ──

  const loadErrors = useCallback(async () => {
    setErrorsLoading(true)
    try {
      const res = await obsPost('query', {
        queryId: generateQueryId(),
        timeframe,
        view: 'events',
        limit: 50,
        parameters: {
          filters: [{
            kind: 'filter',
            key: '$metadata.error',
            operation: 'EXISTS',
            type: 'string',
          }],
        },
      })

      if (res.ok && res.result) {
        const rawEvts = (res.result as { events?: EventRow[] }).events
        setErrors(Array.isArray(rawEvts) ? rawEvts : [])
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro ao carregar erros.', 'error')
    } finally {
      setErrorsLoading(false)
    }
  }, [timeframe, showNotification])

  // ── Latency query ──

  const loadLatency = useCallback(async () => {
    setLatencyLoading(true)
    try {
      const res = await obsPost('query', {
        queryId: generateQueryId(),
        timeframe,
        view: 'calculations',
        parameters: {
          calculations: [
            { operator: 'P50', key: '$workers.wallTimeMs', keyType: 'number', alias: 'p50' },
            { operator: 'P95', key: '$workers.wallTimeMs', keyType: 'number', alias: 'p95' },
            { operator: 'P99', key: '$workers.wallTimeMs', keyType: 'number', alias: 'p99' },
            { operator: 'AVG', key: '$workers.wallTimeMs', keyType: 'number', alias: 'avg' },
          ],
          groupBys: [{ type: 'string', value: '$workers.scriptName' }],
          orderBy: { value: 'p99', order: 'desc' },
          limit: 50,
        },
      })

      if (res.ok && res.result) {
        const rawCalcs = (res.result as { calculations?: CalcResult[] }).calculations
        setLatencyCalcs(Array.isArray(rawCalcs) ? rawCalcs : [])
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro ao carregar latência.', 'error')
    } finally {
      setLatencyLoading(false)
    }
  }, [timeframe, showNotification])

  // ── Destinations actions ──

  const loadDestinations = useCallback(async () => {
    setDestsLoading(true)
    try {
      const res = await obsGet()
      if (res.ok) {
        const rawDests = res.destinations
        setDestinations(Array.isArray(rawDests) ? rawDests : [])
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro ao carregar destinos.', 'error')
    } finally {
      setDestsLoading(false)
    }
  }, [showNotification])

  const handleCreateDestination = useCallback(async () => {
    const name = newDestName.trim()
    const url = newDestUrl.trim()
    if (!name || !url) {
      showNotification('Nome e URL são obrigatórios.', 'error')
      return
    }

    setDestsLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (newDestHeaderKey.trim() && newDestHeaderValue.trim()) {
        headers[newDestHeaderKey.trim()] = newDestHeaderValue.trim()
      }

      const res = await obsPost('create-destination', {
        name,
        enabled: true,
        configuration: {
          type: 'logpush',
          logpushDataset: newDestDataset,
          url,
          headers,
        },
      })

      if (!res.ok) throw new Error(res.error || 'Falha ao criar destino.')
      showNotification('Destino criado com sucesso.', 'success')
      setNewDestName('')
      setNewDestUrl('')
      setNewDestHeaderKey('')
      setNewDestHeaderValue('')
      await loadDestinations()
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro ao criar destino.', 'error')
    } finally {
      setDestsLoading(false)
    }
  }, [newDestName, newDestUrl, newDestDataset, newDestHeaderKey, newDestHeaderValue, showNotification, loadDestinations])

  const handleDeleteDestination = useCallback(async (slug: string) => {
    setDestsLoading(true)
    try {
      const res = await obsPost('delete-destination', undefined, slug)
      if (!res.ok) throw new Error(res.error || 'Falha ao remover destino.')
      showNotification('Destino removido.', 'success')
      await loadDestinations()
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Erro ao remover destino.', 'error')
    } finally {
      setDestsLoading(false)
    }
  }, [showNotification, loadDestinations])

  // ── Live tail query ──

  const loadLiveEvents = useCallback(async () => {
    setLiveLoading(true)
    try {
      const now = Date.now()
      const res = await obsPost('query', {
        queryId: generateQueryId(),
        timeframe: { from: now - 30_000, to: now }, // last 30s window
        view: 'events',
        limit: 100,
        parameters: {},
      })

      if (res.ok && res.result) {
        const rawEvts = (res.result as { events?: EventRow[] }).events
        const newEvts = Array.isArray(rawEvts) ? rawEvts : []
        setLiveEvents(prev => {
          const safePrev = Array.isArray(prev) ? prev : []
          // Merge: prepend new events, deduplicate by $metadata.id, cap at 200
          const existing = new Set(safePrev.map(e => String(e['$metadata.id'] ?? '')))
          const fresh = newEvts.filter(e => !existing.has(String(e['$metadata.id'] ?? '')))
          return [...fresh, ...safePrev].slice(0, 200)
        })
      }
    } catch {
      // Silent fail during live tail to avoid notification spam
    } finally {
      setLiveLoading(false)
    }
  }, []) // No deps — always polls latest 30s

  // ── Effects ──

  useEffect(() => {
    if (tab === 'dashboard') void loadDashboard()
  }, [tab, loadDashboard])

  useEffect(() => {
    if (tab === 'events') void loadEvents()
  }, [tab, loadEvents])

  useEffect(() => {
    if (tab === 'errors') void loadErrors()
  }, [tab, loadErrors])

  useEffect(() => {
    if (tab === 'latency') void loadLatency()
  }, [tab, loadLatency])

  useEffect(() => {
    if (tab === 'destinations') void loadDestinations()
  }, [tab, loadDestinations])

  // Auto-activate live mode when switching to Live tab
  useEffect(() => {
    if (tab === 'live') {
      setLiveActive(true)
      setLiveEvents([])
      void loadLiveEvents()
    } else {
      setLiveActive(false)
    }
  }, [tab, loadLiveEvents])

  // Live polling interval (3s)
  useEffect(() => {
    if (!liveActive) return
    const interval = setInterval(() => void loadLiveEvents(), 3_000)
    return () => clearInterval(interval)
  }, [liveActive, loadLiveEvents])

  // Auto-refresh every 60s for non-live tabs
  useEffect(() => {
    const interval = setInterval(() => {
      if (tab === 'dashboard') void loadDashboard()
      else if (tab === 'events') void loadEvents()
      else if (tab === 'errors') void loadErrors()
      else if (tab === 'latency') void loadLatency()
    }, 60_000)
    return () => clearInterval(interval)
  }, [tab, loadDashboard, loadEvents, loadErrors, loadLatency])

  // ── Extract per-worker data from calculations ──

  const perWorkerData = useMemo(() => {
    if (!Array.isArray(dashCalcs)) return []
    const totalCalc = dashCalcs.find(c => c.alias === 'total' || c.calculation === 'COUNT')
    const aggs = Array.isArray(totalCalc?.aggregates) ? totalCalc.aggregates : []
    if (aggs.length === 0) return []

    return aggs
      .filter(a => a.groups && Array.isArray(a.groups) && a.groups.length > 0)
      .map(a => ({
        scriptName: String(a.groups?.[0]?.value ?? '(unknown)'),
        count: a.count || 0,
        value: a.value || 0,
      }))
      .sort((a, b) => b.count - a.count)
  }, [dashCalcs])

  // ── Extract per-worker latency data ──

  const perWorkerLatency = useMemo(() => {
    if (!Array.isArray(latencyCalcs) || latencyCalcs.length === 0) return []

    const p50Calc = latencyCalcs.find(c => c.alias === 'p50')
    const p95Calc = latencyCalcs.find(c => c.alias === 'p95')
    const p99Calc = latencyCalcs.find(c => c.alias === 'p99')
    const avgCalc = latencyCalcs.find(c => c.alias === 'avg')

    // Build map of scriptName -> metrics
    const map = new Map<string, { p50: number; p95: number; p99: number; avg: number }>()

    const processCalc = (calc: CalcResult | undefined, metric: 'p50' | 'p95' | 'p99' | 'avg') => {
      if (!calc?.aggregates || !Array.isArray(calc.aggregates)) return
      for (const agg of calc.aggregates) {
        const name = String(agg.groups?.[0]?.value ?? '(unknown)')
        if (!map.has(name)) map.set(name, { p50: 0, p95: 0, p99: 0, avg: 0 })
        const entry = map.get(name)!
        entry[metric] = agg.value || 0
      }
    }

    processCalc(p50Calc, 'p50')
    processCalc(p95Calc, 'p95')
    processCalc(p99Calc, 'p99')
    processCalc(avgCalc, 'avg')

    return [...map.entries()]
      .map(([name, metrics]) => ({ scriptName: name, ...metrics }))
      .sort((a, b) => b.p99 - a.p99)
  }, [latencyCalcs])

  // Error rate
  const errorRate = dashTotalCount > 0 ? ((dashErrorCount / dashTotalCount) * 100).toFixed(2) : '0.00'

  // ── Renderers ──

  const renderTimeRangeSelector = () => (
    <div className="cfpw-obs-time-range">
      {TIME_RANGES.map((range, i) => (
        <button
          key={range.label}
          type="button"
          className={`cfpw-obs-time-btn ${i === timeRange ? 'active' : ''}`}
          onClick={() => setTimeRange(i)}
        >
          {range.label}
        </button>
      ))}
    </div>
  )

  const renderDashboard = () => (
    <div className="cfpw-obs-content">
      {/* KPIs */}
      <div className="cfpw-obs-kpis">
        <div className="cfpw-obs-kpi-card">
          <div className="cfpw-obs-kpi-icon" style={{ background: 'rgba(26,115,232,0.1)', color: '#1a73e8' }}>
            <Activity size={20} />
          </div>
          <div className="cfpw-obs-kpi-data">
            <span>Total de Eventos</span>
            <strong>{loading ? '—' : dashTotalCount.toLocaleString('pt-BR')}</strong>
          </div>
        </div>
        <div className="cfpw-obs-kpi-card">
          <div className="cfpw-obs-kpi-icon" style={{ background: 'rgba(234,67,53,0.1)', color: '#ea4335' }}>
            <XCircle size={20} />
          </div>
          <div className="cfpw-obs-kpi-data">
            <span>Erros</span>
            <strong>{loading ? '—' : dashErrorCount.toLocaleString('pt-BR')}</strong>
          </div>
        </div>
        <div className="cfpw-obs-kpi-card">
          <div className="cfpw-obs-kpi-icon" style={{ background: 'rgba(52,168,83,0.1)', color: '#34a853' }}>
            <BarChart3 size={20} />
          </div>
          <div className="cfpw-obs-kpi-data">
            <span>Taxa de Erro</span>
            <strong>{loading ? '—' : `${errorRate}%`}</strong>
          </div>
        </div>
        <div className="cfpw-obs-kpi-card">
          <div className="cfpw-obs-kpi-icon" style={{ background: 'rgba(251,188,4,0.1)', color: '#fbbc04' }}>
            <Server size={20} />
          </div>
          <div className="cfpw-obs-kpi-data">
            <span>Workers Ativos</span>
            <strong>{loading ? '—' : perWorkerData.length}</strong>
          </div>
        </div>
      </div>

      {/* Per-worker breakdown */}
      <div className="cfpw-obs-section">
        <h4><Server size={16} /> Eventos por Worker</h4>
        {loading ? (
          <div className="cfpw-obs-loading"><Loader2 size={20} className="spin" /> Carregando...</div>
        ) : perWorkerData.length === 0 ? (
          <div className="cfpw-obs-empty">Nenhum dado de telemetria neste período.</div>
        ) : (
          <div className="cfpw-obs-table-wrap">
            <table className="cfpw-obs-table">
              <thead>
                <tr>
                  <th>Worker</th>
                  <th style={{ textAlign: 'right' }}>Invocações</th>
                  <th style={{ textAlign: 'right' }}>% do Total</th>
                </tr>
              </thead>
              <tbody>
                {perWorkerData.map(w => (
                  <tr key={w.scriptName}>
                    <td><code>{w.scriptName}</code></td>
                    <td style={{ textAlign: 'right' }}>{w.count.toLocaleString('pt-BR')}</td>
                    <td style={{ textAlign: 'right' }}>
                      {dashTotalCount > 0 ? ((w.count / dashTotalCount) * 100).toFixed(1) : '0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )

  const renderEventRow = (evt: EventRow, idx: number) => {
    const ts = evt['$metadata.startTime'] as number | undefined
    const service = String(evt['$workers.scriptName'] ?? evt['$metadata.service'] ?? '—')
    const level = String(evt['$metadata.level'] ?? evt['level'] ?? 'log')
    const message = String(evt['$metadata.message'] ?? evt['message'] ?? '—')
    const error = evt['$metadata.error'] as string | undefined
    const outcome = String(evt['$workers.outcome'] ?? '—')
    const method = String(evt['$workers.event.request.method'] ?? evt['method'] ?? '')
    const path = String(evt['$workers.event.request.path'] ?? evt['pathname'] ?? '')

    return (
      <tr key={`${ts}-${idx}`} className={error ? 'cfpw-obs-row-error' : ''}>
        <td className="cfpw-obs-cell-ts">{ts ? formatDate(ts) : '—'}</td>
        <td><code>{service}</code></td>
        <td>
          <span className={`cfpw-obs-level cfpw-obs-level-${level}`}>{level}</span>
        </td>
        <td className="cfpw-obs-cell-msg">
          {method && path ? <span className="cfpw-obs-req-tag">{method} {path}</span> : null}
          {error ? <span className="cfpw-obs-error-text">{error}</span> : message !== '—' ? message : `outcome: ${outcome}`}
        </td>
      </tr>
    )
  }

  const renderEvents = () => (
    <div className="cfpw-obs-content">
      <div className="cfpw-obs-search-bar">
        <Search size={16} />
        <input
          type="text"
          placeholder="Buscar nos eventos (full-text)..."
          value={searchNeedle}
          onChange={e => setSearchNeedle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void loadEvents() }}
        />
        <button type="button" className="cfpw-obs-search-btn" onClick={() => void loadEvents()} disabled={eventsLoading}>
          {eventsLoading ? <Loader2 size={14} className="spin" /> : 'Buscar'}
        </button>
      </div>

      {eventsLoading && events.length === 0 ? (
        <div className="cfpw-obs-loading"><Loader2 size={20} className="spin" /> Carregando eventos...</div>
      ) : events.length === 0 ? (
        <div className="cfpw-obs-empty">Nenhum evento encontrado neste período.</div>
      ) : (
        <div className="cfpw-obs-table-wrap">
          <table className="cfpw-obs-table cfpw-obs-events-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Worker</th>
                <th>Level</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt, i) => renderEventRow(evt, i))}
            </tbody>
          </table>
          <div className="cfpw-obs-table-footer">{events.length} evento(s) exibidos</div>
        </div>
      )}
    </div>
  )

  const renderErrors = () => (
    <div className="cfpw-obs-content">
      <div className="cfpw-obs-section">
        <h4><AlertTriangle size={16} /> Eventos com Erro ({errors.length})</h4>
      </div>

      {errorsLoading && errors.length === 0 ? (
        <div className="cfpw-obs-loading"><Loader2 size={20} className="spin" /> Carregando erros...</div>
      ) : errors.length === 0 ? (
        <div className="cfpw-obs-empty" style={{ color: '#34a853' }}>
          ✓ Nenhum erro detectado neste período.
        </div>
      ) : (
        <div className="cfpw-obs-table-wrap">
          <table className="cfpw-obs-table cfpw-obs-events-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Worker</th>
                <th>Level</th>
                <th>Detalhes do Erro</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((evt, i) => renderEventRow(evt, i))}
            </tbody>
          </table>
          <div className="cfpw-obs-table-footer">{errors.length} erro(s) exibidos</div>
        </div>
      )}
    </div>
  )

  const renderLatency = () => (
    <div className="cfpw-obs-content">
      <div className="cfpw-obs-section">
        <h4><Clock size={16} /> Percentis de Latência por Worker</h4>
      </div>

      {latencyLoading ? (
        <div className="cfpw-obs-loading"><Loader2 size={20} className="spin" /> Calculando latência...</div>
      ) : perWorkerLatency.length === 0 ? (
        <div className="cfpw-obs-empty">Nenhum dado de latência disponível neste período.</div>
      ) : (
        <div className="cfpw-obs-table-wrap">
          <table className="cfpw-obs-table">
            <thead>
              <tr>
                <th>Worker</th>
                <th style={{ textAlign: 'right' }}>Avg</th>
                <th style={{ textAlign: 'right' }}>p50</th>
                <th style={{ textAlign: 'right' }}>p95</th>
                <th style={{ textAlign: 'right' }}>p99</th>
              </tr>
            </thead>
            <tbody>
              {perWorkerLatency.map(w => (
                <tr key={w.scriptName}>
                  <td><code>{w.scriptName}</code></td>
                  <td style={{ textAlign: 'right' }}>{formatMs(w.avg)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMs(w.p50)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={w.p95 > 1000 ? 'cfpw-obs-latency-warn' : ''}>{formatMs(w.p95)}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={w.p99 > 3000 ? 'cfpw-obs-latency-critical' : w.p99 > 1000 ? 'cfpw-obs-latency-warn' : ''}>{formatMs(w.p99)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderDestinations = () => (
    <div className="cfpw-obs-content">
      {/* Active destinations */}
      <div className="cfpw-obs-section">
        <h4><Wifi size={16} /> Destinos OTel Configurados ({destinations.length})</h4>

        {destsLoading && destinations.length === 0 ? (
          <div className="cfpw-obs-loading"><Loader2 size={20} className="spin" /> Carregando destinos...</div>
        ) : destinations.length === 0 ? (
          <div className="cfpw-obs-empty">Nenhum destino de export configurado.</div>
        ) : (
          <div className="cfpw-obs-dest-list">
            {destinations.map(dest => (
              <div className="cfpw-obs-dest-card" key={dest.slug || dest.name}>
                <div className="cfpw-obs-dest-info">
                  <strong>{dest.name}</strong>
                  <span className={`cfpw-obs-dest-status ${dest.enabled ? 'active' : 'disabled'}`}>
                    {dest.enabled ? '● Ativo' : '○ Desativado'}
                  </span>
                  <span className="cfpw-obs-dest-dataset">{dest.configuration?.logpushDataset || '—'}</span>
                  <code className="cfpw-obs-dest-url">{dest.configuration?.url || '—'}</code>
                </div>
                <button
                  type="button"
                  className="cfpw-obs-dest-delete"
                  onClick={() => void handleDeleteDestination(dest.slug || dest.name)}
                  disabled={destsLoading}
                  title="Remover destino"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create destination form */}
      <div className="cfpw-obs-section">
        <h4><Download size={16} /> Criar Novo Destino</h4>
        <div className="cfpw-obs-dest-form">
          <div className="cfpw-obs-dest-form-row">
            <div className="cfpw-obs-field">
              <label>Nome (slug)</label>
              <input
                placeholder="meu-destino-grafana"
                value={newDestName}
                onChange={e => setNewDestName(e.target.value)}
                disabled={destsLoading}
                pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$"
              />
            </div>
            <div className="cfpw-obs-field">
              <label>Dataset</label>
              <select value={newDestDataset} onChange={e => setNewDestDataset(e.target.value as typeof newDestDataset)} disabled={destsLoading}>
                <option value="opentelemetry-traces">OpenTelemetry Traces</option>
                <option value="opentelemetry-logs">OpenTelemetry Logs</option>
              </select>
            </div>
          </div>
          <div className="cfpw-obs-field">
            <label>Endpoint URL (OTLP)</label>
            <input
              placeholder="https://otel-collector.example.com/v1/traces"
              value={newDestUrl}
              onChange={e => setNewDestUrl(e.target.value)}
              disabled={destsLoading}
            />
          </div>
          <div className="cfpw-obs-dest-form-row">
            <div className="cfpw-obs-field">
              <label>Header Key (opcional)</label>
              <input
                placeholder="Authorization"
                value={newDestHeaderKey}
                onChange={e => setNewDestHeaderKey(e.target.value)}
                disabled={destsLoading}
              />
            </div>
            <div className="cfpw-obs-field">
              <label>Header Value</label>
              <input
                type="password"
                placeholder="Bearer token..."
                value={newDestHeaderValue}
                onChange={e => setNewDestHeaderValue(e.target.value)}
                disabled={destsLoading}
              />
            </div>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={() => void handleCreateDestination()}
            disabled={destsLoading || !newDestName.trim() || !newDestUrl.trim()}
            style={{ alignSelf: 'flex-start', marginTop: '8px' }}
          >
            {destsLoading ? <Loader2 size={16} className="spin" /> : 'Criar Destino'}
          </button>
        </div>
      </div>

      {/* Tutorial */}
      <div className="cfpw-obs-tutorial">
        <h4><ExternalLink size={16} /> Guia: Configuração via Cloudflare Dashboard</h4>
        <ol>
          <li>
            Acesse <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer">dash.cloudflare.com</a>
            {' '}→ <strong>Workers &amp; Pages</strong> → <strong>Observability</strong> (menu lateral).
          </li>
          <li>
            Em <strong>"Export telemetry"</strong>, clique em <strong>"Add destination"</strong>.
          </li>
          <li>
            Selecione o tipo de dataset (<code>traces</code> ou <code>logs</code>) e configure o endpoint OTLP do seu provider:
            <ul>
              <li><strong>Grafana Cloud</strong>: Use o endpoint OTLP do Grafana + header <code>Authorization: Basic base64(user:token)</code></li>
              <li><strong>Honeycomb</strong>: <code>https://api.honeycomb.io/v1/traces</code> + header <code>x-honeycomb-team: &lt;API_KEY&gt;</code></li>
              <li><strong>Axiom</strong>: <code>https://api.axiom.co/v1/traces</code> + header <code>Authorization: Bearer &lt;TOKEN&gt;</code></li>
              <li><strong>New Relic</strong>: <code>https://otlp.nr-data.net/v1/traces</code> + header <code>api-key: &lt;INGEST_KEY&gt;</code></li>
            </ul>
          </li>
          <li>
            Habilite o destino e salve. Os dados aparecerão no seu provider em poucos minutos.
          </li>
          <li>
            <strong>Não é necessário alterar <code>wrangler.json</code></strong> — a configuração de observability no Dashboard é global para a conta e se aplica a todos os Workers automaticamente.
          </li>
        </ol>
      </div>
    </div>
  )

  const renderLive = () => (
    <div className="cfpw-obs-content">
      <div className="cfpw-obs-live-header">
        <div className="cfpw-obs-live-indicator">
          <span className={`cfpw-obs-live-dot ${liveActive ? 'pulsing' : ''}`} />
          <span>{liveActive ? 'Transmitindo ao vivo' : 'Pausado'}</span>
        </div>
        <div className="cfpw-obs-live-stats">
          <span>{liveEvents.length} eventos capturados</span>
          {liveLoading && <Loader2 size={14} className="spin" />}
          <button
            type="button"
            className="ghost-button"
            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
            onClick={() => setLiveEvents([])}
          >
            Limpar
          </button>
        </div>
      </div>

      {liveEvents.length === 0 ? (
        <div className="cfpw-obs-empty">
          {liveActive ? 'Aguardando eventos...' : 'Live desativado.'}
        </div>
      ) : (
        <div className="cfpw-obs-table-wrap" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table className="cfpw-obs-table cfpw-obs-events-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Worker</th>
                <th>Level</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {liveEvents.map((evt, i) => renderEventRow(evt, i))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const tabRenderers: Record<ObsTabKey, () => React.ReactNode> = {
    dashboard: renderDashboard,
    live: renderLive,
    events: renderEvents,
    errors: renderErrors,
    latency: renderLatency,
    destinations: renderDestinations,
  }

  return (
    <div className="cfpw-obs-block">
      {/* Header */}
      <div className="cfpw-obs-header">
        <div className="cfpw-obs-header-title">
          <Activity size={20} />
          <h3>Observability</h3>
          <span className="cfpw-obs-beta-badge">Workers Paid</span>
        </div>
        <div className="cfpw-obs-header-controls">
          {/* Live toggle button — mirrors CF Dashboard */}
          <button
            type="button"
            className={`cfpw-obs-live-btn ${liveActive ? 'active' : ''}`}
            onClick={() => {
              if (liveActive) {
                setLiveActive(false)
                if (tab === 'live') setTab('dashboard')
              } else {
                setLiveActive(true)
                setTab('live')
              }
            }}
          >
            {liveActive ? <Square size={12} /> : <Play size={12} />}
            Live
          </button>
          {renderTimeRangeSelector()}
          <button
            type="button"
            className="ghost-button cfpw-obs-refresh"
            onClick={() => {
              if (tab === 'dashboard') void loadDashboard()
              else if (tab === 'live') void loadLiveEvents()
              else if (tab === 'events') void loadEvents()
              else if (tab === 'errors') void loadErrors()
              else if (tab === 'latency') void loadLatency()
              else if (tab === 'destinations') void loadDestinations()
            }}
            disabled={loading || eventsLoading || errorsLoading || latencyLoading || destsLoading || liveLoading}
            title="Atualizar"
          >
            <RefreshCw size={16} className={(loading || eventsLoading || errorsLoading || latencyLoading || destsLoading || liveLoading) ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <nav className="cfpw-obs-tabs">
        {OBS_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`cfpw-obs-tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      {tabRenderers[tab]()}
    </div>
  )
}
