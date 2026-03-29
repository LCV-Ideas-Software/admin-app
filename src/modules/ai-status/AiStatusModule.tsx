// Módulo: admin-app/src/modules/ai-status/AiStatusModule.tsx
// Descrição: Dashboard AI Status — Tier A (Catálogo + Rate Limits) + Tier B (Usage) + Tier C (GCP Monitoring)

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Activity, AlertTriangle, BarChart3, BookOpen, Brain, CheckCircle,
  ChevronDown, ChevronRight, Clock, Cloud, CloudOff, Copy, CpuIcon,
  ExternalLink, HelpCircle, Info, Layers, Loader2, RefreshCw,
  Server, Settings, Sparkles, TrendingUp, Zap
} from 'lucide-react'

/* ────────────────────────────────────────────────────────────────
   TYPES
   ──────────────────────────────────────────────────────────────── */

interface GeminiModel {
  id: string
  displayName: string
  description: string
  api: string
  inputTokenLimit: number
  outputTokenLimit: number
  thinking: boolean
  temperature: number | null
  maxTemperature: number | null
  methods: string[]
  family: string
  tier: string
}

interface HealthData {
  ok: boolean
  keyConfigured: boolean
  apiReachable: boolean
  latencyMs: number | null
  httpStatus: number | null
  checkedAt: string
  error?: string
  errorDetail?: string
}

interface UsageSummary {
  total_requests: number
  total_input_tokens: number
  total_output_tokens: number
  total_errors: number
  avg_latency_ms: number
}

interface DailyUsage {
  day: string
  requests: number
  input_tokens: number
  output_tokens: number
  errors: number
}

interface ModuleUsage {
  module: string
  requests: number
  input_tokens: number
  output_tokens: number
}

interface ModelUsage {
  model: string
  requests: number
  input_tokens: number
  output_tokens: number
}

interface UsageData {
  ok: boolean
  period: { since: string; until: string }
  summary: UsageSummary
  daily: DailyUsage[]
  byModule: ModuleUsage[]
  byModel: ModelUsage[]
}

interface GcpSetupGuide {
  title: string
  steps: string[]
  requiredRoles: string[]
  optionalRoles: string[]
  securityNote: string
}

interface GcpMonitoringData {
  ok: boolean
  configured: boolean
  projectId?: string
  error?: string
  setupGuide?: GcpSetupGuide
  metricResults?: Array<{ metric: string; ok?: boolean; error?: string; seriesCount?: number }>
  timeSeries?: Record<string, unknown[]>
}

type TabId = 'models' | 'usage' | 'gcp'

/* ────────────────────────────────────────────────────────────────
   HELPERS
   ──────────────────────────────────────────────────────────────── */

// Formata números grandes com separadores (BR)
function fmtNum(n: number): string {
  return n.toLocaleString('pt-BR')
}

// Formata tokens compactos: 1.048.576 → 1M
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`
  return String(n)
}

// Família → cor
function familyColor(family: string): string {
  switch (family) {
    case 'pro': return '#7c3aed'       // violeta
    case 'flash': return '#1a73e8'     // azul
    case 'flash-lite': return '#0ea5e9' // cyan
    default: return '#6b7280'
  }
}

// Tier badge → cor
function tierBadge(tier: string): { bg: string; color: string; label: string } {
  switch (tier) {
    case 'stable': return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669', label: 'Stable' }
    case 'preview': return { bg: 'rgba(245, 158, 11, 0.12)', color: '#b45309', label: 'Preview' }
    case 'experimental': return { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', label: 'Experimental' }
    default: return { bg: 'rgba(107, 114, 128, 0.12)', color: '#6b7280', label: tier }
  }
}

/* Tabela de Rate Limits — referência estática (fonte: ai.google.dev/gemini-api/docs/rate-limits + pricing)
   Atualizada manualmente conforme documentação oficial */
const RATE_LIMITS_FREE: Array<{
  model: string; rpm: number; rpd: number; tpm: number; tier: string
}> = [
  { model: 'Gemini 2.5 Pro',         rpm: 5,    rpd: 25,    tpm: 250_000,     tier: 'Free' },
  { model: 'Gemini 2.5 Flash',       rpm: 10,   rpd: 500,   tpm: 250_000,     tier: 'Free' },
  { model: 'Gemini 2.5 Flash-Lite',  rpm: 30,   rpd: 1500,  tpm: 1_000_000,   tier: 'Free' },
  { model: 'Gemini 2.0 Flash',       rpm: 15,   rpd: 1500,  tpm: 1_000_000,   tier: 'Free' },
  { model: 'Gemini 2.0 Flash-Lite',  rpm: 30,   rpd: 1500,  tpm: 1_000_000,   tier: 'Free' },
]

const RATE_LIMITS_PAID: Array<{
  model: string; rpm: number; rpd: number; tpm: number; tier: string
}> = [
  { model: 'Gemini 2.5 Pro',         rpm: 150,   rpd: 2000,  tpm: 2_000_000,   tier: 'Tier 1' },
  { model: 'Gemini 2.5 Flash',       rpm: 2000,  rpd: 10000, tpm: 4_000_000,   tier: 'Tier 1' },
  { model: 'Gemini 2.5 Flash-Lite',  rpm: 4000,  rpd: 14400, tpm: 4_000_000,   tier: 'Tier 1' },
  { model: 'Gemini 2.0 Flash',       rpm: 2000,  rpd: 10000, tpm: 4_000_000,   tier: 'Tier 1' },
  { model: 'Gemini 2.0 Flash-Lite',  rpm: 4000,  rpd: 14400, tpm: 4_000_000,   tier: 'Tier 1' },
]

/* ────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────────────────────────── */

export function AiStatusModule() {
  const [activeTab, setActiveTab] = useState<TabId>('models')

  // Health (runs on mount)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/ai-status/health')
      const data = await res.json() as HealthData
      setHealth(data)
    } catch {
      setHealth({ ok: false, keyConfigured: false, apiReachable: false, latencyMs: null, httpStatus: null, checkedAt: new Date().toISOString() })
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => { void fetchHealth() }, [fetchHealth])

  return (
    <section className="module-shell module-shell-ai-status">
      {/* ── Header ── */}
      <div className="detail-header">
        <div className="detail-icon">
          <Brain size={20} />
        </div>
        <div>
          <p className="eyebrow">Inteligência Artificial</p>
          <strong style={{ fontSize: '1.1rem' }}>AI Status</strong>
        </div>
        {/* Health pill */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {healthLoading ? (
            <span className="status-pill"><Loader2 size={14} className="spin" /> Verificando…</span>
          ) : health?.ok ? (
            <span className="status-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <CheckCircle size={14} /> Online — {health.latencyMs}ms
            </span>
          ) : (
            <span className="status-pill" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertTriangle size={14} /> {health?.apiReachable === false ? 'API inacessível' : `HTTP ${health?.httpStatus}`}
            </span>
          )}
          <button type="button" className="ghost-button" onClick={fetchHealth} disabled={healthLoading}
            style={{ padding: '8px 12px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="ai-status-tabs" style={{ display: 'flex', gap: 6, marginTop: 20 }}>
        {([
          { id: 'models' as TabId, label: 'Modelos & Rate Limits', icon: Layers },
          { id: 'usage' as TabId, label: 'Uso & Telemetria', icon: BarChart3 },
          { id: 'gcp' as TabId, label: 'GCP Monitoring', icon: Cloud },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`ghost-button${activeTab === id ? ' ai-tab-active' : ''}`}
            onClick={() => setActiveTab(id)}
            style={{
              padding: '10px 18px',
              fontWeight: activeTab === id ? 700 : 500,
              background: activeTab === id ? 'var(--module-accent-soft)' : undefined,
              color: activeTab === id ? 'var(--module-accent)' : undefined,
              borderColor: activeTab === id ? 'var(--module-accent-border)' : undefined,
            }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div style={{ marginTop: 18 }}>
        {activeTab === 'models' && <ModelsTab />}
        {activeTab === 'usage' && <UsageTab />}
        {activeTab === 'gcp' && <GcpTab />}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 1: MODELS CATALOG + RATE LIMITS
   ═══════════════════════════════════════════════════════════════ */

function ModelsTab() {
  const [models, setModels] = useState<GeminiModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [latencyMs, setLatencyMs] = useState(0)
  const [searchFilter, setSearchFilter] = useState('')
  const [familyFilter, setFamilyFilter] = useState<string>('all')
  const [expandedModel, setExpandedModel] = useState<string | null>(null)
  const [showRateLimits, setShowRateLimits] = useState(false)

  const fetchModels = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai-status/models')
      const data = await res.json() as { ok: boolean; models: GeminiModel[]; latencyMs: number; error?: string }
      if (data.ok) {
        setModels(data.models || [])
        setLatencyMs(data.latencyMs || 0)
      } else {
        setError(data.error || 'Erro desconhecido')
      }
    } catch {
      setError('Falha de conexão com o backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchModels() }, [fetchModels])

  // Filtros
  const filteredModels = useMemo(() => {
    return models.filter(m => {
      if (familyFilter !== 'all' && m.family !== familyFilter) return false
      if (searchFilter) {
        const q = searchFilter.toLowerCase()
        return m.id.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q)
      }
      return true
    })
  }, [models, familyFilter, searchFilter])

  // Stats
  const stats = useMemo(() => {
    const families: Record<string, number> = {}
    for (const m of models) families[m.family] = (families[m.family] || 0) + 1
    return {
      total: models.length,
      families,
      stable: models.filter(m => m.tier === 'stable').length,
      preview: models.filter(m => m.tier === 'preview').length,
      experimental: models.filter(m => m.tier === 'experimental').length,
      thinking: models.filter(m => m.thinking).length,
    }
  }, [models])

  if (loading) {
    return <div className="module-loading"><Loader2 size={24} className="spin" /></div>
  }

  if (error) {
    return (
      <div className="form-card" style={{ textAlign: 'center', padding: 32 }}>
        <AlertTriangle size={32} style={{ color: '#dc2626', marginBottom: 10 }} />
        <p style={{ color: '#dc2626' }}>{error}</p>
        <button type="button" className="ghost-button" onClick={fetchModels} style={{ marginTop: 12 }}>
          <RefreshCw size={14} /> Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="ai-models-tab">
      {/* ── Summary Cards ── */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 0 }}>
        <div className="metric-card">
          <div className="detail-header" style={{ gap: 10, padding: 0, border: 'none' }}>
            <div className="metric-icon"><Layers size={18} /></div>
            <div>
              <span className="eyebrow">Total de Modelos</span>
              <strong style={{ display: 'block', fontSize: '1.3rem' }}>{stats.total}</strong>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="detail-header" style={{ gap: 10, padding: 0, border: 'none' }}>
            <div className="metric-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}><Sparkles size={18} /></div>
            <div>
              <span className="eyebrow">Com Thinking</span>
              <strong style={{ display: 'block', fontSize: '1.3rem' }}>{stats.thinking}</strong>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="detail-header" style={{ gap: 10, padding: 0, border: 'none' }}>
            <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}><CheckCircle size={18} /></div>
            <div>
              <span className="eyebrow">Estáveis</span>
              <strong style={{ display: 'block', fontSize: '1.3rem' }}>{stats.stable}</strong>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="detail-header" style={{ gap: 10, padding: 0, border: 'none' }}>
            <div className="metric-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}><Clock size={18} /></div>
            <div>
              <span className="eyebrow">Latência API</span>
              <strong style={{ display: 'block', fontSize: '1.3rem' }}>{latencyMs}ms</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="form-card" style={{ marginTop: 18, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', padding: '14px 20px' }}>
        <div className="field-group" style={{ flex: 1, minWidth: 200, gap: 0 }}>
          <input
            type="text"
            placeholder="Buscar modelo…"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            style={{ fontSize: '0.88rem' }}
          />
        </div>
        <select
          value={familyFilter}
          onChange={e => setFamilyFilter(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.88rem' }}
        >
          <option value="all">Todas as famílias</option>
          <option value="pro">Pro ({stats.families['pro'] || 0})</option>
          <option value="flash">Flash ({stats.families['flash'] || 0})</option>
          <option value="flash-lite">Flash-Lite ({stats.families['flash-lite'] || 0})</option>
        </select>
        <button type="button" className="ghost-button" onClick={() => setShowRateLimits(!showRateLimits)} style={{ padding: '10px 16px' }}>
          <Zap size={14} /> {showRateLimits ? 'Ocultar Rate Limits' : 'Rate Limits'}
        </button>
        <button type="button" className="ghost-button" onClick={fetchModels} style={{ padding: '10px 14px' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── Rate Limits Reference Table ── */}
      {showRateLimits && (
        <div className="form-card" style={{ marginTop: 14, animation: 'fadeSlideIn 0.25s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Zap size={16} style={{ color: 'var(--module-accent)' }} />
            <strong style={{ fontSize: '0.95rem' }}>Rate Limits de Referência</strong>
            <a href="https://aistudio.google.com/rate-limit" target="_blank" rel="noopener noreferrer"
              style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--module-accent)', textDecoration: 'none' }}>
              Ver limites ativos no AI Studio <ExternalLink size={12} />
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Free Tier */}
            <div>
              <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>🆓 FREE TIER</p>
              <table className="ai-rate-table">
                <thead>
                  <tr><th>Modelo</th><th>RPM</th><th>RPD</th><th>TPM</th></tr>
                </thead>
                <tbody>
                  {RATE_LIMITS_FREE.map(r => (
                    <tr key={r.model}>
                      <td style={{ fontWeight: 600 }}>{r.model}</td>
                      <td>{fmtNum(r.rpm)}</td>
                      <td>{fmtNum(r.rpd)}</td>
                      <td>{fmtTokens(r.tpm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paid Tier 1 */}
            <div>
              <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#059669', marginBottom: 8 }}>💳 PAID TIER 1</p>
              <table className="ai-rate-table">
                <thead>
                  <tr><th>Modelo</th><th>RPM</th><th>RPD</th><th>TPM</th></tr>
                </thead>
                <tbody>
                  {RATE_LIMITS_PAID.map(r => (
                    <tr key={r.model}>
                      <td style={{ fontWeight: 600 }}>{r.model}</td>
                      <td>{fmtNum(r.rpm)}</td>
                      <td>{fmtNum(r.rpd)}</td>
                      <td>{fmtTokens(r.tpm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 10 }}>
            RPM = Requests/min · RPD = Requests/day · TPM = Tokens/min (input).
            Limites reais variam — consulte o AI Studio para seus limites ativos.
          </p>
        </div>
      )}

      {/* ── Models Grid ── */}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 4 }}>
          Exibindo {filteredModels.length} de {models.length} modelos
        </p>
        {filteredModels.map(m => {
          const expanded = expandedModel === m.id
          const badge = tierBadge(m.tier)
          const fc = familyColor(m.family)
          return (
            <div key={m.id} className="form-card ai-model-card" style={{ padding: '14px 18px', cursor: 'pointer', transition: 'all 0.15s ease' }}
              onClick={() => setExpandedModel(expanded ? null : m.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: fc, flexShrink: 0,
                  boxShadow: `0 0 6px ${fc}44`
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: '0.92rem' }}>{m.displayName}</strong>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                      background: badge.bg, color: badge.color, textTransform: 'uppercase',
                    }}>
                      {badge.label}
                    </span>
                    {m.thinking && (
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                        background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed'
                      }}>💭 Thinking</span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>{m.family}</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#6b7280', fontFamily: 'monospace' }}>{m.id}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block' }}>Input</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{fmtTokens(m.inputTokenLimit)}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block' }}>Output</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{fmtTokens(m.outputTokenLimit)}</span>
                  </div>
                  {expanded ? <ChevronDown size={16} style={{ color: '#9ca3af' }} /> : <ChevronRight size={16} style={{ color: '#9ca3af' }} />}
                </div>
              </div>

              {/* Expanded details */}
              {expanded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)', animation: 'fadeSlideIn 0.2s ease' }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 10 }}>
                    <div>
                      <span className="eyebrow">API Version</span>
                      <p style={{ margin: '4px 0 0', fontWeight: 600, fontFamily: 'monospace' }}>{m.api}</p>
                    </div>
                    <div>
                      <span className="eyebrow">Temperature</span>
                      <p style={{ margin: '4px 0 0', fontWeight: 600 }}>
                        {m.temperature != null ? m.temperature : '—'}
                        {m.maxTemperature != null && <span style={{ color: '#9ca3af', fontWeight: 400 }}> (max: {m.maxTemperature})</span>}
                      </p>
                    </div>
                    <div>
                      <span className="eyebrow">Methods</span>
                      <p style={{ margin: '4px 0 0', fontWeight: 500, fontSize: '0.82rem' }}>
                        {m.methods.join(', ')}
                      </p>
                    </div>
                  </div>
                  {m.description && (
                    <p style={{ fontSize: '0.82rem', color: '#514b48', lineHeight: 1.5, margin: 0 }}>
                      {m.description.slice(0, 250)}{m.description.length > 250 ? '…' : ''}
                    </p>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <button type="button" className="ghost-button" style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      onClick={() => { void navigator.clipboard.writeText(m.id) }}>
                      <Copy size={12} /> Copiar ID
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 2: USAGE & TELEMETRIA (Tier B)
   ═══════════════════════════════════════════════════════════════ */

function UsageTab() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchUsage = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai-status/usage')
      const data = await res.json() as UsageData & { error?: string }
      if (data.ok) {
        setUsage(data)
      } else {
        setError(data.error || 'Erro ao carregar dados de uso.')
      }
    } catch {
      setError('Falha ao conectar ao backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchUsage() }, [fetchUsage])

  if (loading) return <div className="module-loading"><Loader2 size={24} className="spin" /></div>

  if (error) {
    return (
      <div className="form-card" style={{ textAlign: 'center', padding: 32 }}>
        <AlertTriangle size={32} style={{ color: '#dc2626', marginBottom: 10 }} />
        <p style={{ color: '#dc2626' }}>{error}</p>
        <button type="button" className="ghost-button" onClick={fetchUsage} style={{ marginTop: 12 }}>
          <RefreshCw size={14} /> Tentar novamente
        </button>
      </div>
    )
  }

  if (!usage) return null

  const s = usage.summary
  const hasData = s.total_requests > 0

  return (
    <div className="ai-usage-tab">
      {/* ── Period ── */}
      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: 14 }}>
        Período: {new Date(usage.period.since).toLocaleDateString('pt-BR')} — {new Date(usage.period.until).toLocaleDateString('pt-BR')} (últimos 30 dias)
        <button type="button" className="ghost-button" onClick={fetchUsage} style={{ marginLeft: 12, padding: '4px 10px', fontSize: '0.75rem' }}>
          <RefreshCw size={12} />
        </button>
      </div>

      {!hasData ? (
        <div className="form-card" style={{ textAlign: 'center', padding: 40 }}>
          <Info size={40} style={{ color: '#9ca3af', marginBottom: 12 }} />
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#514b48' }}>Nenhum dado de uso registrado ainda</p>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af', maxWidth: 500, margin: '8px auto 0' }}>
            Os endpoints de AI do admin-app precisam ser instrumentados para registrar logs no <code>ai_usage_logs</code>.
            Uma vez instrumentados, este dashboard exibirá consumo em tempo real.
          </p>
          <div style={{ marginTop: 20, padding: 16, borderRadius: 16, background: 'rgba(26, 115, 232, 0.05)', border: '1px solid rgba(26, 115, 232, 0.15)' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a73e8', margin: '0 0 8px' }}>
              <Settings size={14} style={{ verticalAlign: 'middle' }} /> Como instrumentar
            </p>
            <p style={{ fontSize: '0.78rem', color: '#514b48', margin: 0, lineHeight: 1.6 }}>
              Em cada endpoint que chama a Gemini API (ex: Oráculo, Astrólogo, Calculadora), adicione um <code>POST /api/ai-status/usage</code> após a chamada:
            </p>
            <pre style={{
              margin: '10px 0 0', padding: 12, borderRadius: 10, background: '#1a1a2e', color: '#e2e8f0',
              fontSize: '0.75rem', overflow: 'auto', lineHeight: 1.5
            }}>{`// Após a chamada Gemini:
await fetch('/api/ai-status/usage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    module: 'oraculo',      // módulo
    model: 'gemini-2.5-flash',
    input_tokens: usage.promptTokenCount,
    output_tokens: usage.candidatesTokenCount,
    latency_ms: Date.now() - start,
    status: 'ok'
  })
})`}</pre>
          </div>
        </div>
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginTop: 0 }}>
            <div className="metric-card">
              <span className="eyebrow">Requisições</span>
              <strong style={{ fontSize: '1.3rem' }}>{fmtNum(s.total_requests)}</strong>
            </div>
            <div className="metric-card">
              <span className="eyebrow">Tokens de Entrada</span>
              <strong style={{ fontSize: '1.3rem', color: '#1a73e8' }}>{fmtTokens(s.total_input_tokens)}</strong>
            </div>
            <div className="metric-card">
              <span className="eyebrow">Tokens de Saída</span>
              <strong style={{ fontSize: '1.3rem', color: '#7c3aed' }}>{fmtTokens(s.total_output_tokens)}</strong>
            </div>
            <div className="metric-card">
              <span className="eyebrow">Erros</span>
              <strong style={{ fontSize: '1.3rem', color: s.total_errors > 0 ? '#dc2626' : '#059669' }}>
                {fmtNum(s.total_errors)}
              </strong>
            </div>
            <div className="metric-card">
              <span className="eyebrow">Latência Média</span>
              <strong style={{ fontSize: '1.3rem' }}>{Math.round(s.avg_latency_ms)}ms</strong>
            </div>
          </div>

          {/* ── Daily Chart (bar chart via CSS) ── */}
          {usage.daily.length > 0 && (
            <div className="form-card" style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <TrendingUp size={16} style={{ color: 'var(--module-accent)' }} />
                <strong style={{ fontSize: '0.95rem' }}>Uso Diário</strong>
              </div>
              <div className="ai-daily-chart">
                {(() => {
                  const maxReq = Math.max(...usage.daily.map(d => d.requests), 1)
                  return usage.daily.map(d => (
                    <div key={d.day} className="ai-daily-bar-group" title={`${d.day}: ${d.requests} req, ${fmtNum(d.input_tokens + d.output_tokens)} tokens`}>
                      <div className="ai-daily-bar" style={{ height: `${Math.max((d.requests / maxReq) * 120, 4)}px` }} />
                      <span className="ai-daily-label">{d.day.slice(5)}</span>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}

          {/* ── Breakdown por módulo e modelo ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
            {usage.byModule.length > 0 && (
              <div className="form-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <CpuIcon size={16} style={{ color: 'var(--module-accent)' }} />
                  <strong style={{ fontSize: '0.92rem' }}>Por Módulo</strong>
                </div>
                <table className="ai-rate-table">
                  <thead>
                    <tr><th>Módulo</th><th>Requests</th><th>In Tokens</th><th>Out Tokens</th></tr>
                  </thead>
                  <tbody>
                    {usage.byModule.map(m => (
                      <tr key={m.module}>
                        <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{m.module}</td>
                        <td>{fmtNum(m.requests)}</td>
                        <td>{fmtTokens(m.input_tokens)}</td>
                        <td>{fmtTokens(m.output_tokens)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {usage.byModel.length > 0 && (
              <div className="form-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Server size={16} style={{ color: 'var(--module-accent)' }} />
                  <strong style={{ fontSize: '0.92rem' }}>Por Modelo</strong>
                </div>
                <table className="ai-rate-table">
                  <thead>
                    <tr><th>Modelo</th><th>Requests</th><th>In Tokens</th><th>Out Tokens</th></tr>
                  </thead>
                  <tbody>
                    {usage.byModel.map(m => (
                      <tr key={m.model}>
                        <td style={{ fontWeight: 600, fontSize: '0.82rem', fontFamily: 'monospace' }}>{m.model}</td>
                        <td>{fmtNum(m.requests)}</td>
                        <td>{fmtTokens(m.input_tokens)}</td>
                        <td>{fmtTokens(m.output_tokens)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 3: GCP MONITORING (Tier C)
   ═══════════════════════════════════════════════════════════════ */

function GcpTab() {
  const [data, setData] = useState<GcpMonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedGuide, setExpandedGuide] = useState(false)

  const fetchGcp = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai-status/gcp-monitoring')
      const result = await res.json() as GcpMonitoringData
      setData(result)
    } catch {
      setError('Falha ao conectar ao backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchGcp() }, [fetchGcp])

  if (loading) return <div className="module-loading"><Loader2 size={24} className="spin" /></div>

  if (error) {
    return (
      <div className="form-card" style={{ textAlign: 'center', padding: 32 }}>
        <AlertTriangle size={32} style={{ color: '#dc2626', marginBottom: 10 }} />
        <p style={{ color: '#dc2626' }}>{error}</p>
        <button type="button" className="ghost-button" onClick={fetchGcp} style={{ marginTop: 12 }}>
          <RefreshCw size={14} /> Tentar novamente
        </button>
      </div>
    )
  }

  // Não configurado — mostrar guia de setup detalhado
  if (data && !data.configured) {
    const guide = data.setupGuide
    return (
      <div className="ai-gcp-setup">
        <div className="form-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#b45309' }}>
              <HelpCircle size={20} />
            </div>
            <div>
              <strong style={{ fontSize: '1.05rem' }}>GCP Monitoring não configurado</strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                Configure uma Service Account para acessar métricas live do GCP Cloud Monitoring.
              </p>
            </div>
          </div>

          {guide && (
            <>
              {/* Guia de setup detalhado */}
              <div style={{
                padding: 20, borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(26, 115, 232, 0.04), rgba(124, 58, 237, 0.04))',
                border: '1px solid rgba(26, 115, 232, 0.15)',
              }}>
                <button type="button" onClick={() => setExpandedGuide(!expandedGuide)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', width: '100%',
                    display: 'flex', alignItems: 'center', gap: 8, padding: 0
                  }}>
                  <BookOpen size={16} style={{ color: '#1a73e8' }} />
                  <strong style={{ fontSize: '0.95rem', color: '#1a73e8' }}>{guide.title}</strong>
                  {expandedGuide ? <ChevronDown size={14} style={{ marginLeft: 'auto', color: '#1a73e8' }} />
                    : <ChevronRight size={14} style={{ marginLeft: 'auto', color: '#1a73e8' }} />}
                </button>

                {expandedGuide && (
                  <div style={{ marginTop: 16, animation: 'fadeSlideIn 0.2s ease' }}>
                    <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 1.9, fontSize: '0.88rem', color: '#334155' }}>
                      {guide.steps.map((step, i) => (
                        <li key={i} style={{ marginBottom: 6 }}>{step.replace(/^\d+\.\s*/, '')}</li>
                      ))}
                    </ol>

                    <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                        <span className="eyebrow" style={{ fontSize: '0.72rem' }}>Roles obrigatórias</span>
                        <div style={{ marginTop: 6 }}>
                          {guide.requiredRoles.map(r => (
                            <span key={r} style={{
                              display: 'inline-block', fontSize: '0.78rem', fontFamily: 'monospace',
                              padding: '3px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)',
                              color: '#059669', margin: '2px 4px 2px 0'
                            }}>{r}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                        <span className="eyebrow" style={{ fontSize: '0.72rem' }}>Roles opcionais</span>
                        <div style={{ marginTop: 6 }}>
                          {guide.optionalRoles.map(r => (
                            <span key={r} style={{
                              display: 'inline-block', fontSize: '0.78rem', fontFamily: 'monospace',
                              padding: '3px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.1)',
                              color: '#b45309', margin: '2px 4px 2px 0'
                            }}>{r}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      marginTop: 14, padding: 12, borderRadius: 12,
                      background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)',
                      display: 'flex', alignItems: 'flex-start', gap: 8
                    }}>
                      <CheckCircle size={16} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} />
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#065f46', lineHeight: 1.5 }}>
                        <strong>Segurança:</strong> {guide.securityNote}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Links rápidos */}
              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer"
                  className="ghost-button" style={{ textDecoration: 'none', padding: '10px 16px', fontSize: '0.85rem' }}>
                  <ExternalLink size={14} /> Criar Service Account
                </a>
                <a href="https://console.cloud.google.com/monitoring" target="_blank" rel="noopener noreferrer"
                  className="ghost-button" style={{ textDecoration: 'none', padding: '10px 16px', fontSize: '0.85rem' }}>
                  <Activity size={14} /> Cloud Monitoring
                </a>
                <a href="https://aistudio.google.com/spend" target="_blank" rel="noopener noreferrer"
                  className="ghost-button" style={{ textDecoration: 'none', padding: '10px 16px', fontSize: '0.85rem' }}>
                  <TrendingUp size={14} /> AI Studio Spend
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Configurado — exibir métricas
  return (
    <div className="ai-gcp-live">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span className="status-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <CheckCircle size={14} /> Projeto: {data?.projectId}
        </span>
        <button type="button" className="ghost-button" onClick={fetchGcp} style={{ padding: '8px 12px' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {data?.ok ? (
        <>
          {/* Metric results */}
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginTop: 0 }}>
            {data.metricResults?.map(mr => (
              <div key={mr.metric} className="metric-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {mr.ok ? <CheckCircle size={14} style={{ color: '#059669' }} /> : <AlertTriangle size={14} style={{ color: '#dc2626' }} />}
                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#514b48', wordBreak: 'break-all' }}>
                    {mr.metric.split('/').pop()}
                  </span>
                </div>
                {mr.ok
                  ? <span style={{ fontSize: '0.85rem', color: '#059669' }}>{mr.seriesCount} time series</span>
                  : <span style={{ fontSize: '0.78rem', color: '#dc2626' }}>{mr.error?.slice(0, 150)}</span>
                }
              </div>
            ))}
          </div>

          {/* Raw data visualization */}
          {data.timeSeries && Object.keys(data.timeSeries).length > 0 && (
            <details style={{ marginTop: 14 }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--module-accent)' }}>
                📊 Dados brutos (Time Series)
              </summary>
              <pre style={{
                marginTop: 8, padding: 16, borderRadius: 12, background: '#1a1a2e', color: '#e2e8f0',
                fontSize: '0.72rem', overflow: 'auto', maxHeight: 400, lineHeight: 1.5
              }}>
                {JSON.stringify(data.timeSeries, null, 2)}
              </pre>
            </details>
          )}
        </>
      ) : (
        <div className="form-card" style={{ padding: 24 }}>
          <CloudOff size={32} style={{ color: '#dc2626', marginBottom: 8 }} />
          <p style={{ color: '#dc2626', fontWeight: 600 }}>Erro ao consultar Cloud Monitoring</p>
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>{data?.error}</p>
        </div>
      )}
    </div>
  )
}
