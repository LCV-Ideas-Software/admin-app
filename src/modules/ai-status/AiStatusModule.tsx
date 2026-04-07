/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
// Módulo: admin-app/src/modules/ai-status/AiStatusModule.tsx
// Descrição: Dashboard AI Status — Tier A (Catálogo + Rate Limits) + Tier B (Usage) + Tier C (GCP Monitoring)

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Activity, AlertTriangle, BarChart3, BookOpen, Brain, CheckCircle,
  ChevronDown, ChevronRight, Clock, Cloud, CloudOff, Copy, CpuIcon,
  Download, ExternalLink, Filter, HelpCircle, Layers, Loader2, RefreshCw,
  Search, Server, Settings, Sparkles, TrendingUp, X, Zap
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

type TabId = 'models' | 'usage' | 'gcp' | 'gcp-logs'

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
    case 'pro': return '#1a73e8'       // violeta
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

/* Mapa de nomes amigáveis para métricas de quota GCP (Generative Language API) */
const QUOTA_HUMAN_NAMES: Record<string, string> = {
  generate_content_requests: 'Generate Content',
  api_requests: 'API Requests',
  model_requests: 'Chamadas ao Modelo',
  tokens_per_minute: 'Tokens / min',
  images_per_minute: 'Imagens / min',
  embedding_requests: 'Embeddings',
  batch_requests: 'Batch Requests',
}
/* int64 MAX (~9.22e18) indica quota ilimitada no GCP */
const INT64_MAX_THRESHOLD = 9e18

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
          { id: 'gcp-logs' as TabId, label: 'GCP Audit Logs', icon: BookOpen }
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
        {activeTab === 'gcp-logs' && <GcpLogsTab />}
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
            <div className="metric-icon" style={{ background: 'rgba(26, 115, 232, 0.1)', color: '#1a73e8' }}><Sparkles size={18} /></div>
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
                        background: 'rgba(26, 115, 232, 0.1)', color: '#1a73e8'
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
                    <p style={{ fontSize: '0.82rem', color: '#5f6368', lineHeight: 1.5, margin: 0 }}>
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
          <div style={{
            width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(14,165,233,0.08))',
            margin: '0 auto 16px',
          }}>
            <BarChart3 size={32} style={{ color: '#059669' }} />
          </div>
          <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>Aguardando primeiros dados</p>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Os endpoints de IA estão instrumentados. Assim que a primeira chamada à Gemini API
            for processada, este painel exibirá consumo, tokens e latência em tempo real.
          </p>
          <div style={{
            marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 100,
            background: 'rgba(16,185,129,0.08)', color: '#059669',
            fontSize: '0.82rem', fontWeight: 600,
          }}>
            <CheckCircle size={14} /> Instrumentação ativa
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
              <strong style={{ fontSize: '1.3rem', color: '#1a73e8' }}>{fmtTokens(s.total_output_tokens)}</strong>
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

  /* ── Tipagem para timeSeries do GCP ── */
  type TsPoint = {
    interval: { startTime: string; endTime: string }
    value: { int64Value?: string; doubleValue?: number; distributionValue?: { mean: number; count: string } }
  }
  type TsSeries = {
    metric: { type: string; labels?: Record<string, string> }
    resource: { type: string; labels?: Record<string, string> }
    points: TsPoint[]
  }
  const ts = useMemo(() => (data?.timeSeries || {}) as Record<string, TsSeries[]>, [data?.timeSeries])

  /* ── ALL useMemo hooks BEFORE any early return (React rules of hooks) ── */

  // Request Count — agrupar por hora
  const hourlyRequests = useMemo(() => {
    const series = ts['serviceruntime.googleapis.com/api/request_count'] || []
    const hourMap: Record<string, number> = {}
    for (const s of series) {
      for (const pt of s.points || []) {
        const hour = pt.interval.startTime?.slice(0, 13) || 'unknown'
        const val = parseInt(pt.value.int64Value || '0', 10) || pt.value.doubleValue || 0
        hourMap[hour] = (hourMap[hour] || 0) + val
      }
    }
    return Object.entries(hourMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, count }))
  }, [ts])

  const totalRequests24h = useMemo(() => hourlyRequests.reduce((s, h) => s + h.count, 0), [hourlyRequests])

  // Latencies — extrair métodos e médias
  const latencyByMethod = useMemo(() => {
    const series = ts['serviceruntime.googleapis.com/api/request_latencies'] || []
    return series.map(s => {
      const method = s.resource?.labels?.method || s.metric?.labels?.method || 'unknown'
      let totalLatency = 0; let totalCount = 0
      for (const pt of s.points || []) {
        if (pt.value.distributionValue) {
          const c = parseInt(pt.value.distributionValue.count || '1', 10)
          totalLatency += pt.value.distributionValue.mean * c
          totalCount += c
        }
      }
      const avgMs = totalCount > 0 ? totalLatency / totalCount : 0
      return { method: method.split('.').pop() || method, avgMs: Math.round(avgMs), count: totalCount }
    }).filter(l => l.count > 0).sort((a, b) => b.count - a.count)
  }, [ts])


  const quotaLimits = useMemo(() => {
    const series = ts['serviceruntime.googleapis.com/quota/limit'] || []
    return series.map(s => {
      const quotaMetric = s.metric?.labels?.quota_metric || 'unknown'
      const shortName = quotaMetric.split('/').pop() || quotaMetric
      const limitName = s.metric?.labels?.limit_name || ''
      const pt = s.points?.[0]
      const rawLimit = parseInt(pt?.value?.int64Value || '0', 10) || pt?.value?.doubleValue || 0
      const isUnlimited = rawLimit >= INT64_MAX_THRESHOLD
      const humanName = QUOTA_HUMAN_NAMES[shortName] || shortName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      return { quotaMetric: shortName, humanName, limitName, limit: rawLimit, isUnlimited }
    }).filter(q => q.limit > 0)
  }, [ts])

  /* ── Early returns (after hooks) ── */

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

  // Não configurado — mostrar guia de setup
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
              <div style={{
                padding: 20, borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(26, 115, 232, 0.04), rgba(26, 115, 232, 0.04))',
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

  /* ═══════════════════════════════════════════════════════════════
     CONFIGURADO — DASHBOARD HUMANIZADO PREMIUM
     ═══════════════════════════════════════════════════════════════ */

  // Helpers locais para nomes de métricas amigáveis
  const metricLabel: Record<string, string> = {
    request_count: 'Requests',
    request_latencies: 'Latência',
    usage: 'Uso de Quota',
    limit: 'Limites',
  }
  const metricIcon: Record<string, typeof Activity> = {
    request_count: Activity,
    request_latencies: Clock,
    usage: BarChart3,
    limit: Zap,
  }
  const metricColor: Record<string, string> = {
    request_count: '#1a73e8',
    request_latencies: '#1a73e8',
    usage: '#0ea5e9',
    limit: '#059669',
  }

  return (
    <div className="ai-gcp-live">
      {/* ── Project header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderRadius: 16, marginBottom: 16,
        background: 'linear-gradient(135deg, rgba(26, 115, 232, 0.06), rgba(26, 115, 232, 0.04))',
        border: '1px solid rgba(26, 115, 232, 0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a73e8, #1a73e8)', color: '#fff',
          }}>
            <Cloud size={20} />
          </div>
          <div>
            <span className="eyebrow" style={{ fontSize: '0.7rem' }}>GCP Cloud Monitoring</span>
            <strong style={{ display: 'block', fontSize: '1rem' }}>{data?.projectId}</strong>
          </div>
        </div>
        <button type="button" className="ghost-button" onClick={fetchGcp}
          style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {data?.ok ? (
        <>
          {/* ── Metric Health Pills ── */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {data.metricResults?.map(mr => {
              const shortName = mr.metric.split('/').pop() || mr.metric
              const label = metricLabel[shortName] || shortName
              const Icon = metricIcon[shortName] || Server
              const color = mr.ok ? (metricColor[shortName] || '#059669') : '#dc2626'
              return (
                <div key={mr.metric} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px', borderRadius: 100,
                  background: mr.ok ? `${color}0a` : 'rgba(239, 68, 68, 0.06)',
                  border: `1px solid ${mr.ok ? `${color}25` : 'rgba(239, 68, 68, 0.2)'}`,
                  transition: 'all 0.2s ease',
                }}>
                  <Icon size={14} style={{ color }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color }}>{label}</span>
                  {mr.ok ? (
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                      background: `${color}15`, color,
                    }}>{mr.seriesCount} séries</span>
                  ) : (
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600, color: '#dc2626',
                    }}>⚠ erro</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Summary KPI Cards ── */}
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
            {/* Requests 24h */}
            <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(26, 115, 232, 0.06)',
              }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(26, 115, 232, 0.15), rgba(26, 115, 232, 0.05))',
                  color: '#1a73e8',
                }}>
                  <Activity size={22} />
                </div>
                <div>
                  <span className="eyebrow" style={{ fontSize: '0.68rem', letterSpacing: '0.08em' }}>REQUESTS (24H)</span>
                  <strong style={{ display: 'block', fontSize: '1.6rem', lineHeight: 1.1, color: '#1a1a1a' }}>
                    {fmtNum(totalRequests24h)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Endpoints Ativos */}
            <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(26, 115, 232, 0.06)',
              }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(26, 115, 232, 0.15), rgba(26, 115, 232, 0.05))',
                  color: '#1a73e8',
                }}>
                  <Server size={22} />
                </div>
                <div>
                  <span className="eyebrow" style={{ fontSize: '0.68rem', letterSpacing: '0.08em' }}>ENDPOINTS ATIVOS</span>
                  <strong style={{ display: 'block', fontSize: '1.6rem', lineHeight: 1.1, color: '#1a1a1a' }}>
                    {latencyByMethod.length}
                  </strong>
                </div>
              </div>
            </div>

            {/* Quotas */}
            <div className="metric-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.06)',
              }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
                  color: '#059669',
                }}>
                  <Zap size={22} />
                </div>
                <div>
                  <span className="eyebrow" style={{ fontSize: '0.68rem', letterSpacing: '0.08em' }}>QUOTAS MONITORADAS</span>
                  <strong style={{ display: 'block', fontSize: '1.6rem', lineHeight: 1.1, color: '#1a1a1a' }}>
                    {quotaLimits.length}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* ── Requests por Hora — Bar Chart ── */}
          {hourlyRequests.length > 0 && (
            <div className="form-card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(26, 115, 232, 0.1)', color: '#1a73e8',
                }}>
                  <BarChart3 size={16} />
                </div>
                <strong style={{ fontSize: '0.95rem' }}>Requests por Hora</strong>
                <span style={{
                  marginLeft: 'auto', fontSize: '0.75rem', padding: '4px 10px', borderRadius: 100,
                  background: 'rgba(26, 115, 232, 0.08)', color: '#1a73e8', fontWeight: 600,
                }}>
                  Total: {fmtNum(totalRequests24h)}
                </span>
              </div>
              <div className="ai-daily-chart">
                {(() => {
                  const maxVal = Math.max(...hourlyRequests.map(h => h.count), 1)
                  return hourlyRequests.map(h => {
                    const pct = h.count / maxVal
                    // Gradiente de cor baseado na intensidade
                    const barColor = pct > 0.8 ? 'linear-gradient(to top, #1a73e8, #5b9cf6)'
                      : pct > 0.4 ? 'linear-gradient(to top, #4285f4, #93bbfd)'
                      : 'linear-gradient(to top, #93bbfd, #bfdbfe)'
                    return (
                      <div key={h.hour} className="ai-daily-bar-group" title={`${h.hour.slice(11)}h — ${fmtNum(h.count)} requests`}>
                        <div className="ai-daily-bar"
                          style={{ height: `${Math.max(pct * 120, 4)}px`, background: barColor, borderRadius: '4px 4px 0 0' }} />
                        <span className="ai-daily-label">{h.hour.slice(11)}h</span>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}

          {/* ── Latência e Quotas — Grid lado a lado ── */}
          <div style={{ display: 'grid', gridTemplateColumns: latencyByMethod.length > 0 && quotaLimits.length > 0 ? '1fr 1fr' : '1fr', gap: 14, marginBottom: 16 }}>
            {/* Latência por Endpoint */}
            {latencyByMethod.length > 0 && (
              <div className="form-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(26, 115, 232, 0.1)', color: '#1a73e8',
                  }}>
                    <Clock size={16} />
                  </div>
                  <strong style={{ fontSize: '0.92rem' }}>Latência por Endpoint</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {latencyByMethod.map(l => {
                    const latencyColor = l.avgMs < 500 ? '#059669' : l.avgMs < 2000 ? '#b45309' : '#dc2626'
                    const latencyBg = l.avgMs < 500 ? 'rgba(16,185,129,0.08)' : l.avgMs < 2000 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)'
                    return (
                      <div key={l.method} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 12,
                        background: 'rgba(0,0,0,0.015)', border: '1px solid rgba(0,0,0,0.04)',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)', color: '#334155' }}>
                            {l.method}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{fmtNum(l.count)} requests</span>
                        </div>
                        <span style={{
                          fontSize: '0.85rem', fontWeight: 700, padding: '4px 12px', borderRadius: 100,
                          background: latencyBg, color: latencyColor,
                        }}>
                          {fmtNum(l.avgMs)}ms
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quotas com barras visuais */}
            {quotaLimits.length > 0 && (
              <div className="form-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(16, 185, 129, 0.1)', color: '#059669',
                  }}>
                    <Zap size={16} />
                  </div>
                  <strong style={{ fontSize: '0.92rem' }}>Limites de Quota</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {quotaLimits.map(q => (
                    <div key={`${q.quotaMetric}-${q.limitName}`} style={{
                      padding: '10px 14px', borderRadius: 12,
                      background: 'rgba(0,0,0,0.015)', border: '1px solid rgba(0,0,0,0.04)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                          {q.humanName}
                        </span>
                        {q.isUnlimited ? (
                          <span style={{
                            fontSize: '0.78rem', fontWeight: 700, padding: '2px 12px', borderRadius: 100,
                            background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(124,58,237,0.08))',
                            color: '#1a73e8',
                          }}>
                            Ilimitado ∞
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.78rem', fontWeight: 700, padding: '2px 10px', borderRadius: 100,
                            background: 'rgba(16, 185, 129, 0.08)', color: '#059669',
                          }}>
                            {fmtNum(q.limit)} / min
                          </span>
                        )}
                      </div>
                      {/* Barra de progresso visual */}
                      <div style={{
                        height: 6, borderRadius: 100, background: 'rgba(0,0,0,0.04)', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 100, width: q.isUnlimited ? '100%' : '30%',
                          background: q.isUnlimited
                            ? 'linear-gradient(90deg, #1a73e8, #8ab4f8)'
                            : 'linear-gradient(90deg, #059669, #10b981)',
                          opacity: q.isUnlimited ? 0.2 : 0.4,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Raw JSON (colapsado, low priority) ── */}
          {Object.keys(ts).length > 0 && (
            <details style={{ marginTop: 4 }}>
              <summary style={{
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, color: '#b0aaa6',
                padding: '8px 0', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Settings size={12} /> Dados brutos (debug)
              </summary>
              <pre style={{
                marginTop: 8, padding: 16, borderRadius: 12, background: '#1a1a2e', color: '#dadce0',
                fontSize: '0.68rem', overflow: 'auto', maxHeight: 350, lineHeight: 1.5,
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                {JSON.stringify(ts, null, 2)}
              </pre>
            </details>
          )}
        </>
      ) : (
        <div className="form-card" style={{ textAlign: 'center', padding: 32 }}>
          <CloudOff size={36} style={{ color: '#dc2626', marginBottom: 12 }} />
          <p style={{ color: '#dc2626', fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>Erro ao consultar Cloud Monitoring</p>
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>{data?.error}</p>
          <button type="button" className="ghost-button" onClick={fetchGcp} style={{ marginTop: 16, padding: '10px 20px' }}>
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 4: GCP AUDIT LOGS (fully visual, human-readable)
   ═══════════════════════════════════════════════════════════════ */

interface GcpLogEntry {
  insertId: string
  timestamp: string
  severity?: string
  logName?: string
  resource?: { type?: string; labels?: Record<string, string> }
  protoPayload?: {
    '@type'?: string
    serviceName?: string
    methodName?: string
    resourceName?: string
    status?: { code?: number; message?: string }
    authenticationInfo?: {
      principalEmail?: string
      serviceAccountKeyName?: string
      principalSubject?: string
    }
    requestMetadata?: {
      callerIp?: string
      callerSuppliedUserAgent?: string
      requestAttributes?: { time?: string; auth?: Record<string, unknown> }
    }
    request?: Record<string, unknown>
    response?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }
}

/* ── Helper: Human-readable method names ── */
const METHOD_LABELS: Record<string, { label: string; emoji: string; category: 'generate' | 'config' | 'model' | 'other' }> = {
  GenerateContent: { label: 'Geração de Conteúdo', emoji: '✨', category: 'generate' },
  StreamGenerateContent: { label: 'Streaming de Conteúdo', emoji: '🌊', category: 'generate' },
  QueryEffectiveSetting: { label: 'Consulta de Configuração', emoji: '⚙️', category: 'config' },
  GetModel: { label: 'Consulta de Modelo', emoji: '🤖', category: 'model' },
  ListModels: { label: 'Listagem de Modelos', emoji: '📋', category: 'model' },
  CountTokens: { label: 'Contagem de Tokens', emoji: '🔢', category: 'other' },
  EmbedContent: { label: 'Embedding de Conteúdo', emoji: '📐', category: 'other' },
  BatchEmbedContents: { label: 'Batch Embeddings', emoji: '📐', category: 'other' },
  GetOperation: { label: 'Status de Operação', emoji: '🔄', category: 'other' },
  CreateTunedModel: { label: 'Criação de Modelo Tuned', emoji: '🎯', category: 'model' },
  GenerateAnswer: { label: 'Geração de Resposta', emoji: '💬', category: 'generate' },
}

/* ── Helper: Severity badge styling ── */
function severityStyle(sev?: string): { bg: string; color: string; label: string } {
  switch (sev?.toUpperCase()) {
    case 'ERROR': return { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'Erro' }
    case 'WARNING': return { bg: 'rgba(245,158,11,0.1)', color: '#b45309', label: 'Aviso' }
    case 'INFO': return { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'OK' }
    case 'DEBUG': return { bg: 'rgba(107,114,128,0.08)', color: '#6b7280', label: 'Debug' }
    default: return { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: sev || 'OK' }
  }
}

/* ── Helper: Status code badge ── */
function statusCodeStyle(code?: number): { bg: string; color: string } {
  if (!code || code === 0) return { bg: 'rgba(16,185,129,0.1)', color: '#059669' } // success
  if (code >= 400 && code < 500) return { bg: 'rgba(245,158,11,0.1)', color: '#b45309' }
  return { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' }
}

/* ── Helper: Mask sensitive strings (partial reveal) ── */
function maskSensitive(val: string, showChars = 12): string {
  if (val.length <= showChars + 4) return val
  return val.slice(0, showChars) + '•••' + val.slice(-4)
}

/* ── Helper: user-agent → clean name ── */
function cleanUserAgent(ua?: string): string {
  if (!ua) return 'Desconhecido'
  if (ua.includes('stubby')) return 'Google Stubby (Internal)'
  if (ua.includes('grpc')) return 'gRPC Client'
  if (ua.includes('google-api-nodejs')) return 'Node.js SDK'
  if (ua.includes('google-api-python')) return 'Python SDK'
  if (ua.includes('gax')) return 'Google API Extension'
  if (ua.length > 50) return ua.slice(0, 47) + '…'
  return ua
}

/* ── Sub-component: Property row for key-value display ── */
function PropRow({ icon, label, value, mono }: { icon: string; label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      borderRadius: 8, background: 'rgba(0,0,0,0.02)',
    }}>
      <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: 500, flexShrink: 0, minWidth: 90 }}>{label}</span>
      <span style={{
        fontSize: '0.82rem', color: '#1e293b', fontWeight: 500,
        fontFamily: mono ? "'JetBrains Mono', 'Fira Code', monospace" : 'inherit',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</span>
    </div>
  )
}

/* ── Export helpers ── */
function exportLogsCSV(logs: GcpLogEntry[]) {
  const header = 'Timestamp,Method,Status,Model,Email,IP,PromptTokens,ResponseTokens,TotalTokens,FinishReason'
  const rows = logs.map(log => {
    const p = log.protoPayload || {}
    const method = p.methodName?.split('.').pop() || ''
    const status = p.status?.code || 0
    const req = (p.request || {}) as Record<string, unknown>
    const res = (p.response || {}) as Record<string, unknown>
    const model = String(req.model || '').split('/').pop() || ''
    const email = p.authenticationInfo?.principalEmail || ''
    const ip = String(p.requestMetadata?.callerIp || '')
    const usage = (res.usageMetadata || {}) as Record<string, number>
    const candidates = (res.candidates || []) as { finishReason?: string }[]
    const finish = candidates[0]?.finishReason || ''
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
    return [log.timestamp, esc(method), status, esc(model), esc(email), esc(ip), usage.promptTokenCount ?? '', usage.candidatesTokenCount ?? '', usage.totalTokenCount ?? '', finish].join(',')
  })
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `gcp-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function exportLogsJSONL(logs: GcpLogEntry[]) {
  const lines = logs.map(log => JSON.stringify({
    insertId: log.insertId,
    timestamp: log.timestamp,
    severity: log.severity,
    method: log.protoPayload?.methodName,
    status: log.protoPayload?.status,
    auth: log.protoPayload?.authenticationInfo,
    requestMetadata: log.protoPayload?.requestMetadata,
    request: log.protoPayload?.request,
    response: log.protoPayload?.response,
  }))
  const blob = new Blob([lines.join('\n')], { type: 'application/x-ndjson' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = `gcp-audit-logs-${new Date().toISOString().slice(0, 10)}.jsonl`; a.click()
  URL.revokeObjectURL(url)
}

function GcpLogsTab() {
  const [logs, setLogs] = useState<GcpLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [filterMethod, setFilterMethod] = useState('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'ok' | 'error'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortNewest, setSortNewest] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai-status/gcp-logs')
      const data = await res.json() as { ok: boolean; entries?: GcpLogEntry[]; error?: string }
      if (data.ok) {
        setLogs(data.entries || [])
      } else {
        setError(data.error || 'Erro desconhecido')
      }
    } catch {
      setError('Falha de conexão com o backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchLogs() }, [fetchLogs])

  /* ── Stats summary (hook must be before early returns) ── */
  const stats = useMemo(() => {
    const methods: Record<string, number> = {}
    let errors = 0
    for (const log of logs) {
      const m = log.protoPayload?.methodName?.split('.').pop() || 'Unknown'
      methods[m] = (methods[m] || 0) + 1
      if (log.severity === 'ERROR' || (log.protoPayload?.status?.code && log.protoPayload.status.code > 0)) errors++
    }
    const topMethod = Object.entries(methods).sort((a, b) => b[1] - a[1])[0]
    return { total: logs.length, errors, methods, topMethod }
  }, [logs])

  /* ── Filtered & sorted logs ── */
  const filteredLogs = useMemo(() => {
    let result = [...logs]
    if (filterMethod !== 'all') {
      result = result.filter(l => (l.protoPayload?.methodName?.split('.').pop() || 'Unknown') === filterMethod)
    }
    if (filterStatus === 'error') {
      result = result.filter(l => l.severity === 'ERROR' || (l.protoPayload?.status?.code && l.protoPayload.status.code > 0))
    } else if (filterStatus === 'ok') {
      result = result.filter(l => l.severity !== 'ERROR' && (!l.protoPayload?.status?.code || l.protoPayload.status.code === 0))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(l => {
        const p = l.protoPayload || {}
        const searchable = [
          p.methodName, p.authenticationInfo?.principalEmail,
          String(p.requestMetadata?.callerIp || ''),
          String((p.request as Record<string, unknown>)?.model || ''),
        ].filter(Boolean).join(' ').toLowerCase()
        return searchable.includes(q)
      })
    }
    result.sort((a, b) => {
      const d = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      return sortNewest ? -d : d
    })
    return result
  }, [logs, filterMethod, filterStatus, searchQuery, sortNewest])

  const uniqueMethods = useMemo(() => {
    const set = new Set<string>()
    for (const l of logs) set.add(l.protoPayload?.methodName?.split('.').pop() || 'Unknown')
    return Array.from(set).sort()
  }, [logs])

  if (loading) {
    return <div className="module-loading"><Loader2 size={24} className="spin" /></div>
  }

  if (error) {
    return (
      <div className="form-card" style={{ textAlign: 'center', padding: 32 }}>
        <AlertTriangle size={32} style={{ color: '#dc2626', marginBottom: 10 }} />
        <p style={{ color: '#dc2626' }}>{error}</p>
        <button type="button" className="ghost-button" onClick={fetchLogs} style={{ marginTop: 12 }}>
          <RefreshCw size={14} /> Tentar novamente
        </button>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="form-card" style={{ textAlign: 'center', padding: 32 }}>
        <CloudOff size={36} style={{ color: '#6b7280', opacity: 0.5, marginBottom: 12 }} />
        <p style={{ color: '#6b7280', fontWeight: 500 }}>Nenhum log encontrado ou retornado pela API.</p>
        
        <div style={{ marginTop: 24, textAlign: 'left', padding: '16px 20px', borderRadius: 8, background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#b45309', fontWeight: 600, fontSize: '0.85rem' }}>
            <AlertTriangle size={16} /> Por que aistudio.google.com está cheio e aqui está vazio?
          </div>
          <p style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: 1.5, margin: 0 }}>
            Seus logs só aparecerão aqui se a <strong>Chave de API do Gemini</strong> (GEMINI_API_KEY) e a conta de serviço (<strong>GCP_SA_KEY</strong>) pertencerem ao <strong>mesmo Google Cloud Project</strong>. 
            <br/><br/>
            Frequentemente, o AI Studio cria um projeto &quot;oculto&quot; (shadow project) para gerar chaves de API pela interface rápida. Se os disparos aconteceram nele, a API Logging não conseguirá extraí-los pesquisando o projeto da sua GCP_SA_KEY.
            Certifique-se de que a API Key em uso nos APPs foi originada explicitamente dentro do seu <code>GCP_PROJECT_ID</code> atual.
          </p>
        </div>

        <button type="button" className="ghost-button" onClick={fetchLogs} style={{ marginTop: 20, padding: '10px 20px' }}>
          <RefreshCw size={14} /> Atualizar Agora
        </button>
      </div>
    )
  }

  return (
    <div className="ai-gcp-logs-live">
      {/* ── Banner ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderRadius: 16, marginBottom: 16,
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(139, 92, 246, 0.04))',
        border: '1px solid rgba(99, 102, 241, 0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
          }}>
            <BookOpen size={20} />
          </div>
          <div>
            <span className="eyebrow" style={{ fontSize: '0.7rem' }}>Google Cloud Audit Logs</span>
            <strong style={{ display: 'block', fontSize: '1rem' }}>Generative Language API</strong>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{
              fontSize: '0.75rem', padding: '4px 10px', borderRadius: 99, fontWeight: 600,
              background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1',
            }}>
              {stats.total} eventos
            </span>
            {stats.errors > 0 && (
              <span style={{
                fontSize: '0.75rem', padding: '4px 10px', borderRadius: 99, fontWeight: 600,
                background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626',
              }}>
                {stats.errors} erro{stats.errors > 1 ? 's' : ''}
              </span>
            )}
            {stats.topMethod && (
              <span style={{
                fontSize: '0.75rem', padding: '4px 10px', borderRadius: 99, fontWeight: 600,
                background: 'rgba(16, 185, 129, 0.08)', color: '#059669',
              }}>
                Top: {stats.topMethod[0]} ({stats.topMethod[1]}×)
              </span>
            )}
          </div>
          <button type="button" className="ghost-button" onClick={fetchLogs}
            style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </div>

      {/* ── Filter & Export Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '12px 16px', borderRadius: 12, marginBottom: 14,
        background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)',
      }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 200px', minWidth: 160,
          padding: '6px 12px', borderRadius: 8, background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
        }}>
          <Search size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por método, email, modelo, IP..."
            style={{
              border: 'none', outline: 'none', fontSize: '0.82rem', width: '100%', background: 'transparent', color: '#1e293b',
            }}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
              <X size={14} style={{ color: '#9ca3af' }} />
            </button>
          )}
        </div>

        {/* Method filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Filter size={13} style={{ color: '#6b7280' }} />
          <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}
            style={{
              fontSize: '0.8rem', padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)',
              background: '#fff', color: '#374151', cursor: 'pointer',
            }}>
            <option value="all">Todos os métodos</option>
            {uniqueMethods.map(m => <option key={m} value={m}>{METHOD_LABELS[m]?.label || m}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'ok', 'error'] as const).map(s => (
            <button key={s} type="button" onClick={() => setFilterStatus(s)}
              style={{
                fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6, fontWeight: 600, cursor: 'pointer',
                border: filterStatus === s ? '1px solid' : '1px solid rgba(0,0,0,0.08)',
                background: filterStatus === s
                  ? (s === 'error' ? 'rgba(239,68,68,0.1)' : s === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)')
                  : '#fff',
                color: filterStatus === s
                  ? (s === 'error' ? '#dc2626' : s === 'ok' ? '#059669' : '#6366f1')
                  : '#6b7280',
                borderColor: filterStatus === s
                  ? (s === 'error' ? '#dc2626' : s === 'ok' ? '#059669' : '#6366f1')
                  : 'rgba(0,0,0,0.08)',
              }}>
              {s === 'all' ? 'Todos' : s === 'ok' ? '✓ OK' : '✗ Erros'}
            </button>
          ))}
        </div>

        {/* Sort toggle */}
        <button type="button" onClick={() => setSortNewest(!sortNewest)}
          className="ghost-button" style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={13} /> {sortNewest ? '↓ Recentes' : '↑ Antigos'}
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Export buttons */}
        <button type="button" onClick={() => exportLogsCSV(filteredLogs)}
          className="ghost-button" style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Download size={13} /> CSV
        </button>
        <button type="button" onClick={() => exportLogsJSONL(filteredLogs)}
          className="ghost-button" style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Download size={13} /> JSONL
        </button>
      </div>

      {/* Filter status indicator */}
      {filteredLogs.length !== logs.length && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 8, marginBottom: 10,
          background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.1)',
          fontSize: '0.78rem', color: '#6366f1', fontWeight: 500,
        }}>
          <Filter size={13} />
          Mostrando {filteredLogs.length} de {logs.length} eventos
          <button type="button" onClick={() => { setFilterMethod('all'); setFilterStatus('all'); setSearchQuery('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontWeight: 600, textDecoration: 'underline', fontSize: '0.78rem' }}>
            Limpar filtros
          </button>
        </div>
      )}

      {/* ── Log entries ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredLogs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
            <Search size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p style={{ fontWeight: 500 }}>Nenhum log corresponde aos filtros aplicados.</p>
          </div>
        )}
        {filteredLogs.map((log) => {
          const proto = log.protoPayload || {}
          const rawMethod = proto.methodName?.split('.').pop() || 'Unknown'
          const methodInfo = METHOD_LABELS[rawMethod] || { label: rawMethod, emoji: '📄', category: 'other' as const }
          const date = new Date(log.timestamp)
          const isExpanded = expandedLog === log.insertId

          // Auth info
          const auth = proto.authenticationInfo || {}
          const email = auth.principalEmail || ''
          const saKeyName = auth.serviceAccountKeyName || ''

          // Request metadata
          const reqMeta = proto.requestMetadata || {}
          const callerIp = String(reqMeta.callerIp || '')
          const userAgent = cleanUserAgent(reqMeta.callerSuppliedUserAgent)

          // Status
          const statusCode = proto.status?.code
          const statusMsg = proto.status?.message
          const hasError = statusCode !== undefined && statusCode > 0
          const sevStyle = hasError
            ? severityStyle('ERROR')
            : severityStyle(log.severity || 'INFO')
          const scStyle = statusCodeStyle(statusCode)

          // Category color scheme
          const catColors: Record<string, { accent: string; bg: string }> = {
            generate: { accent: '#6366f1', bg: 'rgba(99, 102, 241, 0.06)' },
            config: { accent: '#0891b2', bg: 'rgba(8, 145, 178, 0.06)' },
            model: { accent: '#059669', bg: 'rgba(16, 185, 129, 0.06)' },
            other: { accent: '#6b7280', bg: 'rgba(107, 114, 128, 0.06)' },
          }
          const cat = catColors[methodInfo.category] || catColors.other

          return (
            <div key={log.insertId} className="form-card" style={{ padding: 0, overflow: 'hidden', transition: 'box-shadow 0.2s ease' }}>
              {/* ── Collapsed header ── */}
              <button type="button" onClick={() => setExpandedLog(isExpanded ? null : log.insertId)}
                style={{
                  width: '100%', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left'
                }}>
                {/* Category icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: cat.bg, color: cat.accent, flexShrink: 0, fontSize: '1rem',
                  border: `1px solid ${cat.accent}18`,
                }}>
                  {methodInfo.emoji}
                </div>

                {/* Text info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#111827' }}>{methodInfo.label}</strong>
                    {/* Status badge */}
                    <span style={{
                      fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                      background: sevStyle.bg, color: sevStyle.color,
                    }}>
                      {sevStyle.label}
                    </span>
                    {/* Method category pill */}
                    <span style={{
                      fontSize: '0.68rem', padding: '2px 8px', borderRadius: 99, fontWeight: 500,
                      background: 'rgba(0,0,0,0.04)', color: '#6b7280',
                    }}>
                      {rawMethod}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem', color: '#6b7280' }}>
                    <span>📅 {date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR')}</span>
                    {email && <span>👤 {email.split('@')[0]}</span>}
                    {callerIp && callerIp !== 'private' && <span>🌐 {callerIp.includes('::1') ? 'localhost' : callerIp}</span>}
                  </div>
                </div>

                {isExpanded ? <ChevronDown size={18} style={{ color: '#9ca3af' }} /> : <ChevronRight size={18} style={{ color: '#9ca3af' }} />}
              </button>

              {/* ── Expanded Content ── */}
              {isExpanded && (
                <div style={{ padding: '0 20px 20px', animation: 'fadeSlideIn 0.2s ease' }}>

                  {/* ── 1. Identity & Metadata Card ── */}
                  <div style={{
                    borderRadius: 12, padding: '14px 16px', marginBottom: 16,
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.03), rgba(139, 92, 246, 0.02))',
                    border: '1px solid rgba(99, 102, 241, 0.08)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <HelpCircle size={14} style={{ color: '#6366f1' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Identidade & Contexto</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {email && <PropRow icon="👤" label="Conta" value={email} />}
                      {saKeyName && <PropRow icon="🔑" label="SA Key" value={maskSensitive(saKeyName)} mono />}
                      {callerIp && <PropRow icon="🌐" label="IP" value={callerIp === 'private' ? 'Privado (interno Google)' : callerIp} mono />}
                      {userAgent && <PropRow icon="📱" label="Cliente" value={userAgent} />}
                      {proto.serviceName && <PropRow icon="☁️" label="Serviço" value={proto.serviceName} mono />}
                      {proto.resourceName && <PropRow icon="📂" label="Recurso" value={proto.resourceName.length > 60 ? '…' + proto.resourceName.slice(-55) : proto.resourceName} mono />}
                    </div>
                  </div>

                  {/* ── 2. Status Card (if error) ── */}
                  {hasError && (
                    <div style={{
                      borderRadius: 12, padding: '14px 16px', marginBottom: 16,
                      background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <AlertTriangle size={14} style={{ color: '#dc2626' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>Erro na Requisição</span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.8rem', padding: '4px 12px', borderRadius: 8, fontWeight: 700,
                          background: scStyle.bg, color: scStyle.color, fontFamily: 'monospace',
                        }}>
                          Code {statusCode}
                        </span>
                        {statusMsg && <span style={{ fontSize: '0.82rem', color: '#991b1b' }}>{statusMsg}</span>}
                      </div>
                    </div>
                  )}

                  {/* ── 3. Content-Aware Rendering ── */}
                  {(() => {
                    interface LogPart { text?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: Record<string, unknown> } }
                    interface LogContent { role?: string; parts?: LogPart[] }

                    const isGenerate = methodInfo.category === 'generate'

                    if (isGenerate) {
                      // ── Generate Content: show prompts, tool calls, and response ──
                      const req = (proto.request || {}) as {
                        model?: string
                        systemInstruction?: { parts?: LogPart[] }
                        contents?: LogContent[]
                        tools?: { functionDeclarations?: { name: string; description?: string; parameters?: Record<string, unknown> }[] }[]
                        generationConfig?: { temperature?: number; maxOutputTokens?: number; topP?: number; topK?: number }
                      }
                      const res = (proto.response || {}) as {
                        candidates?: { content?: LogContent; finishReason?: string }[]
                        usageMetadata?: { totalTokenCount?: number; promptTokenCount?: number; candidatesTokenCount?: number }
                      }

                      const reqModel = req.model?.split('/').pop() || 'Desconhecido'
                      const systemInstructions = req.systemInstruction?.parts?.map(p => p.text).filter(Boolean).join('\n') || ''
                      const userContents = req.contents?.map(c => ({
                        role: c.role || 'user',
                        text: c.parts?.map(p => p.text).filter(Boolean).join('\n') || '',
                        functionCalls: c.parts?.filter(p => p.functionCall).map(p => p.functionCall!) || [],
                        functionResponses: c.parts?.filter(p => p.functionResponse).map(p => p.functionResponse!) || [],
                      })) || []
                      const candidate = res.candidates?.[0]
                      const responseText = candidate?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || ''
                      const responseFunctionCalls = candidate?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall!) || []
                      const finishReason = candidate?.finishReason || ''
                      const tokens = res.usageMetadata || {}
                      const genConfig = req.generationConfig
                      // Tool declarations
                      const toolDeclarations = req.tools?.flatMap(t => t.functionDeclarations || []) || []
                      const hasToolUsage = toolDeclarations.length > 0 || responseFunctionCalls.length > 0 || userContents.some(c => c.functionCalls.length > 0 || c.functionResponses.length > 0)

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {/* Meta badges */}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 8, background: 'rgba(26, 115, 232, 0.08)', color: '#1a73e8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              🤖 {reqModel}
                            </span>
                            {tokens.promptTokenCount != null && (
                              <span style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 8, background: 'rgba(14, 165, 233, 0.08)', color: '#0284c7', fontWeight: 600 }}>
                                📥 {fmtNum(tokens.promptTokenCount)} prompt
                              </span>
                            )}
                            {tokens.candidatesTokenCount != null && (
                              <span style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 8, background: 'rgba(139, 92, 246, 0.08)', color: '#7c3aed', fontWeight: 600 }}>
                                📤 {fmtNum(tokens.candidatesTokenCount)} resposta
                              </span>
                            )}
                            {tokens.totalTokenCount != null && (
                              <span style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 8, background: 'rgba(16, 185, 129, 0.08)', color: '#059669', fontWeight: 600 }}>
                                🎫 {fmtNum(tokens.totalTokenCount)} total
                              </span>
                            )}
                            {finishReason && (
                              <span style={{
                                fontSize: '0.75rem', padding: '5px 12px', borderRadius: 8, fontWeight: 600,
                                background: finishReason === 'STOP' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                color: finishReason === 'STOP' ? '#059669' : '#b45309',
                              }}>
                                🏁 {finishReason === 'STOP' ? 'Completo' : finishReason}
                              </span>
                            )}
                            {genConfig?.temperature != null && (
                              <span style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 8, background: 'rgba(251, 146, 60, 0.08)', color: '#c2410c', fontWeight: 600 }}>
                                🌡️ temp: {genConfig.temperature}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                            {/* Left: Request */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Entrada (Prompts)</span>

                              {systemInstructions && (
                                <div style={{ padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}>
                                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#b45309', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>⚙️ System Instruction</div>
                                  <div style={{ fontSize: '0.82rem', color: '#451a03', whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: 200, overflow: 'auto' }}>{systemInstructions}</div>
                                </div>
                              )}

                              {userContents.map((c, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <div style={{ padding: 14, borderRadius: 10, background: c.role === 'model' ? 'rgba(139,92,246,0.03)' : 'rgba(26,115,232,0.03)', border: `1px solid ${c.role === 'model' ? 'rgba(139,92,246,0.1)' : 'rgba(26,115,232,0.1)'}` }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: c.role === 'model' ? '#7c3aed' : '#1a73e8', marginBottom: 6, textTransform: 'uppercase' }}>
                                      {c.role === 'model' ? '🤖 Model' : c.role === 'function' ? '🔧 Function' : '👤 User'}
                                    </div>
                                    {c.text && (
                                      <div style={{ fontSize: '0.82rem', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: 300, overflow: 'auto' }}>
                                        {c.text}
                                      </div>
                                    )}
                                    {!c.text && c.functionCalls.length === 0 && c.functionResponses.length === 0 && (
                                      <em style={{ fontSize: '0.82rem', opacity: 0.5 }}>(Sem texto / Mídia)</em>
                                    )}
                                  </div>
                                  {/* Function calls within this turn */}
                                  {c.functionCalls.map((fc, fi) => (
                                    <div key={`fc-${fi}`} style={{
                                      padding: 12, borderRadius: 10,
                                      background: 'rgba(234, 88, 12, 0.04)', border: '1px solid rgba(234, 88, 12, 0.12)',
                                    }}>
                                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#c2410c', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        🔧 Tool Call: <code style={{ background: 'rgba(234,88,12,0.08)', padding: '1px 6px', borderRadius: 4 }}>{fc.name}</code>
                                      </div>
                                      <pre style={{ fontSize: '0.72rem', color: '#7c2d12', background: 'rgba(234,88,12,0.03)', padding: 10, borderRadius: 8, overflow: 'auto', maxHeight: 150, margin: 0, border: '1px solid rgba(234,88,12,0.06)' }}>
                                        {JSON.stringify(fc.args, null, 2)}
                                      </pre>
                                    </div>
                                  ))}
                                  {/* Function responses within this turn */}
                                  {c.functionResponses.map((fr, fri) => (
                                    <div key={`fr-${fri}`} style={{
                                      padding: 12, borderRadius: 10,
                                      background: 'rgba(5, 150, 105, 0.04)', border: '1px solid rgba(5, 150, 105, 0.12)',
                                    }}>
                                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#059669', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        📦 Tool Result: <code style={{ background: 'rgba(5,150,105,0.08)', padding: '1px 6px', borderRadius: 4 }}>{fr.name}</code>
                                      </div>
                                      <pre style={{ fontSize: '0.72rem', color: '#064e3b', background: 'rgba(5,150,105,0.03)', padding: 10, borderRadius: 8, overflow: 'auto', maxHeight: 150, margin: 0, border: '1px solid rgba(5,150,105,0.06)' }}>
                                        {JSON.stringify(fr.response, null, 2)}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              ))}

                              {!systemInstructions && userContents.length === 0 && (
                                <div style={{ padding: 14, borderRadius: 10, background: 'rgba(0,0,0,0.02)', textAlign: 'center' }}>
                                  <em style={{ fontSize: '0.82rem', color: '#9ca3af' }}>Sem conteúdo de prompt extraído</em>
                                </div>
                              )}

                              {/* Tool Declarations */}
                              {hasToolUsage && toolDeclarations.length > 0 && (
                                <details style={{ borderRadius: 10, border: '1px solid rgba(234, 88, 12, 0.1)', overflow: 'hidden' }}>
                                  <summary style={{
                                    cursor: 'pointer', padding: '10px 14px', fontSize: '0.75rem', fontWeight: 600,
                                    color: '#c2410c', background: 'rgba(234, 88, 12, 0.03)',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                  }}>
                                    🛠️ {toolDeclarations.length} Tool{toolDeclarations.length > 1 ? 's' : ''} Declarado{toolDeclarations.length > 1 ? 's' : ''}
                                  </summary>
                                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {toolDeclarations.map((td, tdi) => (
                                      <div key={tdi} style={{ padding: 10, borderRadius: 8, background: 'rgba(234,88,12,0.02)', border: '1px solid rgba(234,88,12,0.06)' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#9a3412' }}>{td.name}</div>
                                        {td.description && <div style={{ fontSize: '0.72rem', color: '#78350f', marginTop: 2 }}>{td.description}</div>}
                                        {td.parameters && (
                                          <pre style={{ fontSize: '0.68rem', color: '#7c2d12', marginTop: 6, padding: 8, borderRadius: 6, background: 'rgba(0,0,0,0.02)', overflow: 'auto', maxHeight: 100, margin: '6px 0 0' }}>
                                            {JSON.stringify(td.parameters, null, 2)}
                                          </pre>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>

                            {/* Right: Response */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saída (Resposta)</span>
                              <div style={{
                                padding: 14, borderRadius: 10,
                                background: responseText ? 'linear-gradient(135deg, #1e1b4b, #312e81)' : 'rgba(0,0,0,0.03)',
                                border: responseText ? '1px solid #4338ca' : '1px solid rgba(0,0,0,0.06)',
                                color: responseText ? '#e0e7ff' : '#6b7280',
                              }}>
                                {responseText ? (
                                  <div style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 400, overflow: 'auto' }}>{responseText}</div>
                                ) : (
                                  <div style={{ textAlign: 'center', padding: 20 }}>
                                    <p style={{ fontSize: '0.82rem', fontStyle: 'italic' }}>Resposta não disponível no audit log</p>
                                    <p style={{ fontSize: '0.72rem', marginTop: 4, opacity: 0.6 }}>Audit logs podem omitir o corpo da resposta por compliance</p>
                                  </div>
                                )}
                              </div>

                              {/* Model-initiated function calls in response */}
                              {responseFunctionCalls.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#c2410c', textTransform: 'uppercase' }}>🔧 Tool Calls (Model)</span>
                                  {responseFunctionCalls.map((fc, fi) => (
                                    <div key={fi} style={{
                                      padding: 12, borderRadius: 10,
                                      background: 'rgba(234, 88, 12, 0.04)', border: '1px solid rgba(234, 88, 12, 0.12)',
                                    }}>
                                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#c2410c', marginBottom: 6 }}>
                                        <code style={{ background: 'rgba(234,88,12,0.08)', padding: '2px 8px', borderRadius: 4 }}>{fc.name}</code>
                                      </div>
                                      <pre style={{ fontSize: '0.72rem', color: '#7c2d12', background: 'rgba(234,88,12,0.03)', padding: 10, borderRadius: 8, overflow: 'auto', maxHeight: 150, margin: 0, border: '1px solid rgba(234,88,12,0.06)' }}>
                                        {JSON.stringify(fc.args, null, 2)}
                                      </pre>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // ── Non-generate methods: structured property view ──
                    const req = proto.request as Record<string, unknown> | undefined
                    const res = proto.response as Record<string, unknown> | undefined
                    const hasReq = req && Object.keys(req).filter(k => k !== '@type').length > 0
                    const hasRes = res && Object.keys(res).filter(k => k !== '@type').length > 0

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Request Properties Card */}
                        {hasReq && (
                          <div style={{
                            borderRadius: 12, padding: '14px 16px',
                            background: 'rgba(14, 165, 233, 0.03)', border: '1px solid rgba(14, 165, 233, 0.08)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                              <ChevronRight size={14} style={{ color: '#0284c7' }} />
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284c7', textTransform: 'uppercase' }}>Dados da Requisição</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {Object.entries(req!).filter(([k]) => k !== '@type').map(([key, val]) => (
                                <PropRow
                                  key={key}
                                  icon="📌"
                                  label={key}
                                  value={typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
                                  mono={typeof val !== 'string'}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Response Properties Card */}
                        {hasRes && (
                          <div style={{
                            borderRadius: 12, padding: '14px 16px',
                            background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.08)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                              <CheckCircle size={14} style={{ color: '#059669' }} />
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669', textTransform: 'uppercase' }}>Dados da Resposta</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {Object.entries(res!).filter(([k]) => k !== '@type').map(([key, val]) => {
                                // Render nested objects as collapsible JSON
                                if (typeof val === 'object' && val !== null && Object.keys(val as object).length > 2) {
                                  return (
                                    <details key={key} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.02)' }}>
                                      <summary style={{ cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span>📦</span>
                                        <span style={{ color: '#6b7280', minWidth: 90 }}>{key}</span>
                                        <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>({Object.keys(val as object).length} campos)</span>
                                      </summary>
                                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {Object.entries(val as Record<string, unknown>).map(([subKey, subVal]) => (
                                          <PropRow key={subKey} icon="  ∟" label={subKey} value={typeof subVal === 'object' ? JSON.stringify(subVal) : String(subVal ?? '—')} mono />
                                        ))}
                                      </div>
                                    </details>
                                  )
                                }
                                return (
                                  <PropRow
                                    key={key}
                                    icon="📌"
                                    label={key}
                                    value={typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
                                    mono={typeof val !== 'string'}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Empty payload note */}
                        {!hasReq && !hasRes && (
                          <div style={{
                            borderRadius: 12, padding: '20px 16px', textAlign: 'center',
                            background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)',
                          }}>
                            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                              ℹ️ Evento de auditoria sem payload de dados — apenas registro de acesso.
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* ── Raw JSON toggle ── */}
                  <details style={{ marginTop: 14 }}>
                    <summary style={{
                      cursor: 'pointer', fontSize: '0.75rem', color: '#64748b', fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <Settings size={12} /> Ver payload JSON bruto
                    </summary>
                    <pre style={{
                      margin: '8px 0 0', padding: 14, borderRadius: 10,
                      background: '#0f172a', color: '#94a3b8', fontSize: '0.7rem',
                      overflow: 'auto', maxHeight: 350, border: '1px solid rgba(255,255,255,0.06)',
                      lineHeight: 1.5,
                    }}>
                      {JSON.stringify(log.protoPayload, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

