/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useCallback, useEffect, useState } from 'react'
import {
  BrainCircuit, Clock, Database, Download, ExternalLink,
  Globe, Loader2, Mail, RefreshCw, Save, Search, Settings, Trash2, X,
} from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { useModuleConfig } from '../../lib/useModuleConfig'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type TabId = 'lci-lca' | 'tesouro-ipca' | 'usuarios' | 'configuracoes'

interface RegistroLciLca {
  id: string; criadoEm: string; prazoDias: number
  taxaLciLca: number; aporte: number; aliquotaIr: number; cdbEquivalente: number
}

interface RegistroTesouroIpca {
  id: string; criadoEm: string; dataCompra: string
  valorInvestido: number; taxaContratada: number
}

interface TituloNTNB {
  tipo: string; vencimento: string; dataBase: string
  taxaCompra: number; taxaVenda: number; pu: number
}

interface TaxaCacheResponse {
  ok: boolean; fonte?: string; dataReferencia?: string
  taxaMediaIndicativa?: number; atualizadoEm?: string
  titulos?: TituloNTNB[]; error?: string
}

interface GeminiModelItem {
  id: string; displayName: string; api: string; vision: boolean
}

// ─── CONFIG (D1-persisted via useModuleConfig) ───────────────────────────────────────────────────────────────

interface OracleConfig {
  csvUrl: string
  modeloVision: string
  modeloAnalise: string
}

const DEFAULT_CONFIG: OracleConfig = {
  csvUrl: 'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv',
  modeloVision: 'gemini-2.5-pro-preview-05-06',
  modeloAnalise: 'gemini-2.5-pro-preview-05-06',
}

/** Converte hora BRT para UTC (BRT = UTC-3) */
function brtToUtc(hour: number): number {
  return (hour + 3) % 24
}

/** Converte hora UTC para BRT (BRT = UTC-3) */
function utcToBrt(hour: number): number {
  return (hour - 3 + 24) % 24
}

function cronExpression(hour: number, minute: number): string {
  return `${minute} ${brtToUtc(hour)} * * *`
}

const pad = (n: number) => String(n).padStart(2, '0')

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function OraculoModule() {
  const { showNotification } = useNotification()
  const [activeTab, setActiveTab] = useState<TabId>('tesouro-ipca')
  const [loading, setLoading] = useState(false)
  const [adminActor] = useState('admin@app.lcv')

  // Registros
  const [lciRegistros, setLciRegistros] = useState<RegistroLciLca[]>([])
  const [tesouroRegistros, setTesouroRegistros] = useState<RegistroTesouroIpca[]>([])
  const [totalRegistros, setTotalRegistros] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; id: string; label: string } | null>(null)

  // Config (D1-persisted)
  const [config, saveConfig] = useModuleConfig<OracleConfig>('oraculo-config', DEFAULT_CONFIG, {
    onSaveSuccess: () => showNotification('Configuração salva.', 'success'),
    onSaveError: (err) => showNotification(`Erro ao salvar configuração: ${err}`, 'error'),
  })

  // Cache
  const [taxaCache, setTaxaCache] = useState<TaxaCacheResponse | null>(null)
  const [taxaCacheLoading, setTaxaCacheLoading] = useState(false)

  // CSV trigger
  const [csvTriggerLoading, setCsvTriggerLoading] = useState(false)
  const [csvTriggerResult, setCsvTriggerResult] = useState<{ ok: boolean; msg: string; ms?: number } | null>(null)

  // Gemini models
  const [geminiModels, setGeminiModels] = useState<GeminiModelItem[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  // Cron
  const [cronHour, setCronHour] = useState(2)
  const [cronMinute, setCronMinute] = useState(0)
  const [cronSaving, setCronSaving] = useState(false)
  const [cronLoading, setCronLoading] = useState(false)
  const [cronDirty, setCronDirty] = useState(false)

  // Dados de usuários
  interface UserDataRow {
    id: string; email: string; dadosJson: string
    criadoEm: string; atualizadoEm: string
  }
  const [userData, setUserData] = useState<UserDataRow[]>([])
  const [userDataLoading, setUserDataLoading] = useState(false)
  const [userDataTotal, setUserDataTotal] = useState(0)
  const [selectedUser, setSelectedUser] = useState<UserDataRow | null>(null)

  // ── Data Fetching ─────────────────────────────────────────────────────────

  const carregarRegistros = useCallback(async (notify = false) => {
    if (activeTab === 'configuracoes') return
    setLoading(true)
    try {
      const res = await fetch(`/api/oraculo/listar?tipo=${activeTab}&limit=500`)
      const data = await res.json() as { ok: boolean; total: number; items: RegistroLciLca[] | RegistroTesouroIpca[] }
      if (!res.ok || !data.ok) throw new Error()
      if (activeTab === 'lci-lca') setLciRegistros(data.items as RegistroLciLca[])
      else setTesouroRegistros(data.items as RegistroTesouroIpca[])
      setTotalRegistros(data.total)
      if (notify) showNotification('Registros atualizados.', 'success')
    } catch {
      showNotification('Falha ao carregar registros.', 'error')
    } finally { setLoading(false) }
  }, [activeTab, showNotification])

  const carregarStatusCache = useCallback(async () => {
    setTaxaCacheLoading(true)
    try {
      const res = await fetch('/api/oraculo/taxacache')
      setTaxaCache(await res.json() as TaxaCacheResponse)
    } catch {
      setTaxaCache({ ok: false, error: 'Falha na conexão.' })
    } finally { setTaxaCacheLoading(false) }
  }, [])

  const carregarModelos = useCallback(async () => {
    setModelsLoading(true)
    try {
      const res = await fetch('/api/oraculo/modelos')
      const data = await res.json() as { ok: boolean; models?: GeminiModelItem[] }
      if (data.ok && data.models) setGeminiModels(data.models)
    } catch { /* silencioso — manterá inputs manuais */ }
    finally { setModelsLoading(false) }
  }, [])

  /** Carrega o cron schedule atual do worker via Cloudflare API */
  const carregarCron = useCallback(async () => {
    setCronLoading(true)
    try {
      const res = await fetch('/api/oraculo/cron')
      const data = await res.json() as { ok: boolean; schedules?: { cron: string }[]; error?: string }
      if (data.ok && data.schedules && data.schedules.length > 0) {
        const parts = data.schedules[0].cron.split(/\s+/)
        if (parts.length >= 2) {
          const utcMinute = parseInt(parts[0], 10)
          const utcHour = parseInt(parts[1], 10)
          setCronMinute(isNaN(utcMinute) ? 0 : utcMinute)
          setCronHour(isNaN(utcHour) ? 2 : utcToBrt(utcHour))
          setCronDirty(false)
        }
      }
    } catch { /* silencioso */ }
    finally { setCronLoading(false) }
  }, [])

  /** Salva o cron schedule no worker via Cloudflare API */
  const salvarCron = async () => {
    setCronSaving(true)
    try {
      const expr = cronExpression(cronHour, cronMinute)
      const res = await fetch('/api/oraculo/cron', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cron: expr }),
      })
      const data = await res.json() as { ok: boolean; message?: string; error?: string }
      if (data.ok) {
        showNotification(data.message ?? 'Cron atualizado com sucesso.', 'success')
        setCronDirty(false)
      } else {
        showNotification(`Falha: ${data.error ?? 'Erro desconhecido.'}`, 'error')
      }
    } catch {
      showNotification('Falha na conexão com o servidor.', 'error')
    } finally { setCronSaving(false) }
  }

  const dispararCSV = async () => {
    setCsvTriggerLoading(true)
    setCsvTriggerResult(null)
    const t0 = performance.now()
    try {
      const res = await fetch('/api/oraculo/taxacache?force=true')
      const data = await res.json() as TaxaCacheResponse
      const ms = Math.round(performance.now() - t0)
      if (data.ok) {
        setCsvTriggerResult({ ok: true, msg: `${data.titulos?.length ?? 0} títulos extraídos · Taxa média: ${data.taxaMediaIndicativa}% · Ref: ${data.dataReferencia}`, ms })
        setTaxaCache(data)
        showNotification('CSV processado com sucesso.', 'success')
      } else {
        setCsvTriggerResult({ ok: false, msg: data.error ?? 'Erro desconhecido.', ms })
        showNotification(`Falha: ${data.error}`, 'error')
      }
    } catch {
      setCsvTriggerResult({ ok: false, msg: 'Falha na conexão com o servidor.' })
    } finally { setCsvTriggerLoading(false) }
  }

  const carregarUserData = useCallback(async (notify = false) => {
    setUserDataLoading(true)
    try {
      const res = await fetch('/api/oraculo/userdata?limit=200')
      const data = await res.json() as { ok: boolean; data: UserDataRow[]; total: number }
      if (data.ok) {
        setUserData(data.data)
        setUserDataTotal(data.total)
        if (notify) showNotification('Dados de usuários atualizados.', 'success')
      }
    } catch {
      showNotification('Falha ao carregar dados de usuários.', 'error')
    } finally { setUserDataLoading(false) }
  }, [showNotification])

  useEffect(() => {
    if (activeTab === 'configuracoes') {
      void carregarStatusCache()
      void carregarModelos()
      void carregarCron()
    } else if (activeTab === 'usuarios') {
      void carregarUserData()
    } else {
      void carregarRegistros()
    }
  }, [activeTab, carregarRegistros, carregarStatusCache, carregarModelos, carregarUserData, carregarCron])

  const handleSaveConfig = (patch: Partial<OracleConfig>) => {
    saveConfig(patch)
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const executeDelete = async (id: string) => {
    setConfirmDelete(null)
    setDeletingId(id)
    try {
      let res: Response
      if (activeTab === 'usuarios') {
        // Dados de usuários usam endpoint dedicado (DELETE) com cascata
        res = await fetch(`/api/oraculo/userdata?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      } else {
        res = await fetch('/api/oraculo/excluir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor },
          body: JSON.stringify({ id, tipo: activeTab }),
        })
      }
      const data = await res.json() as { ok: boolean; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error)
      if (activeTab === 'usuarios') {
        setUserData(p => p.filter(r => r.id !== id))
        setUserDataTotal(n => Math.max(0, n - 1))
        // Cascata: backend removeu lotes/registros individuais — recarregar abas
        setLciRegistros([])
        setTesouroRegistros([])
        setTotalRegistros(0)
        void carregarRegistros(true)
      } else if (activeTab === 'lci-lca') {
        setLciRegistros(p => p.filter(r => r.id !== id))
        setTotalRegistros(n => Math.max(0, n - 1))
      } else {
        setTesouroRegistros(p => p.filter(r => r.id !== id))
        setTotalRegistros(n => Math.max(0, n - 1))
      }
      showNotification('Registro excluído.', 'success')
    } catch {
      showNotification('Falha ao excluir registro.', 'error')
    } finally { setDeletingId(null) }
  }

  // ── Filtro ────────────────────────────────────────────────────────────────

  const registrosFiltrados = (activeTab === 'lci-lca' ? lciRegistros : tesouroRegistros).filter((r) => {
    if (!searchTerm) return true
    const t = searchTerm.toLowerCase()
    const dt = new Date((r as RegistroLciLca).criadoEm ?? '').toLocaleString('pt-BR').toLowerCase()
    if (activeTab === 'lci-lca') {
      const lci = r as RegistroLciLca
      return dt.includes(t) || String(lci.prazoDias).includes(t) || String(lci.aporte).includes(t)
    }
    const tp = r as RegistroTesouroIpca
    return dt.includes(t) || tp.dataCompra?.includes(t) || String(tp.valorInvestido).includes(t)
  })

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'lci-lca', label: 'LCI / LCA', icon: <Database size={14} /> },
    { id: 'tesouro-ipca', label: 'Tesouro IPCA+', icon: <Globe size={14} /> },
    { id: 'usuarios', label: 'Dados de Usuários', icon: <Mail size={14} /> },
    { id: 'configuracoes', label: 'Configurações', icon: <Settings size={14} /> },
  ]



  // ── Model select or fallback input ────────────────────────────────────────

  const renderModelSelect = (label: string, id: string, value: string, onChange: (v: string) => void) => (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      {geminiModels.length > 0 ? (
        <select id={id} value={value} onChange={e => onChange(e.target.value)}>
          {!geminiModels.find(m => m.id === value) && <option value={value}>{value} (manual)</option>}
          {geminiModels.map(m => (
            <option key={m.id} value={m.id}>
              {m.displayName}{m.api === 'v1beta' ? ' (preview)' : ' (stable)'}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={() => saveConfig({ [id === 'model-vision' ? 'modeloVision' : 'modeloAnalise']: value })}
          autoComplete="off"
        />
      )}
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="detail-panel module-shell">
      <div className="detail-header">
        <div className="detail-icon"><BrainCircuit size={22} /></div>
        <div>
          <h3>Oráculo Financeiro</h3>
          <p className="field-hint">Simulações de renda fixa, dados de mercado e integrações Tesouro Transparente</p>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="inline-actions" style={{ marginBottom: '1rem' }}>
        {tabs.map(({ id, label, icon }) => (
          <button key={id} type="button" className={activeTab === id ? 'primary-button' : 'ghost-button'} onClick={() => setActiveTab(id)}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════ TAB: Registros ═══════════════════════ */}
      {activeTab !== 'configuracoes' && activeTab !== 'usuarios' && (
        <article className="result-card">
          <div className="result-toolbar">
            <div>
              <h4>{activeTab === 'lci-lca' ? <><Database size={16} /> Registros LCI/LCA</> : <><Globe size={16} /> Registros Tesouro IPCA+</>}</h4>
              <p className="field-hint">
                {activeTab === 'lci-lca'
                  ? 'Simulações de equivalência CDB para investimentos isentos de IR.'
                  : 'Registros de compra de Tesouro IPCA+ via extrato ou entrada manual.'}
              </p>
            </div>
            <div className="inline-actions">
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.6rem', color: 'var(--fg-dim, #888)' }} />
                <input type="text" placeholder="Filtrar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '2rem', minWidth: '160px' }} />
              </div>
              <button type="button" className="ghost-button" onClick={() => void carregarRegistros(true)} disabled={loading}>
                {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                Recarregar
              </button>
            </div>
          </div>

          {loading && registrosFiltrados.length === 0 ? (
            <div className="result-empty" style={{ textAlign: 'center', padding: '3rem 0' }}>
              <Loader2 size={28} className="spin" style={{ marginBottom: '0.5rem' }} />
              <p>Carregando registros…</p>
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <p className="result-empty">Nenhum registro encontrado.</p>
          ) : (
            <ul className="result-list astro-akashico-scroll">
              {registrosFiltrados.map((registro) => {
                const r = registro as RegistroLciLca & RegistroTesouroIpca
                const dt = new Date(r.criadoEm).toLocaleString('pt-BR')
                const label = activeTab === 'lci-lca'
                  ? `${dt} — LCI ${r.taxaLciLca}% CDI`
                  : `${dt} — IPCA+ ${r.taxaContratada}% a.a.`
                return (
                  <li key={r.id} className="post-row">
                    <div className="post-row-main">
                      <div className="flex-row-center">
                        <strong>{activeTab === 'lci-lca' ? `R$ ${r.aporte?.toLocaleString('pt-BR')}` : `R$ ${r.valorInvestido?.toLocaleString('pt-BR')}`}</strong>
                      </div>
                      <div className="post-row-meta">
                        <span>{dt}</span>
                        {activeTab === 'lci-lca' ? (
                          <>
                            <span>{r.prazoDias} dias</span>
                            <span className="badge badge-em-implantacao">{r.taxaLciLca?.toFixed(2)}% CDI</span>
                            <span className="badge badge-planejado">≈ CDB {r.cdbEquivalente?.toFixed(2)}%</span>
                          </>
                        ) : (
                          <>
                            <span>{r.dataCompra?.split('-').reverse().join('/')}</span>
                            <span className="badge badge-em-implantacao">{r.taxaContratada?.toFixed(2)}% a.a.</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="post-row-actions">
                      <button type="button" className="ghost-button danger" onClick={() => setConfirmDelete({ show: true, id: r.id, label })} disabled={deletingId === r.id}>
                        {deletingId === r.id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                        Excluir
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="field-hint" style={{ textAlign: 'right', paddingTop: '0.5rem' }}>
            Total: {totalRegistros} registro(s)
          </p>
        </article>
      )}

      {/* ═══════════════════════ TAB: Dados de Usuários ═══════════════════════ */}
      {activeTab === 'usuarios' && (
        <article className="result-card">
          <div className="result-toolbar">
            <div>
              <h4><Mail size={16} /> Dados Salvos por Usuários</h4>
              <p className="field-hint">Análises salvas via autenticação por e-mail no frontend do Oráculo.</p>
            </div>
            <div className="inline-actions">
              <button type="button" className="ghost-button" onClick={() => void carregarUserData(true)} disabled={userDataLoading}>
                {userDataLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                Recarregar
              </button>
            </div>
          </div>

          {selectedUser ? (() => {
            let parsed: Record<string, unknown> = {}
            try { parsed = JSON.parse(selectedUser.dadosJson) } catch { /* */ }
            const tRegs = (parsed.tesouroRegistros ?? []) as Array<Record<string, unknown>>
            const lRegs = (parsed.lciRegistros ?? []) as Array<Record<string, unknown>>
            const paramCdi = Number(parsed.cdiAtual ?? 0)
            const paramIpca = Number(parsed.ipcaProjetado ?? 0)
            const paramDuration = Number(parsed.durationAnos ?? 0)
            const paramTaxaAtual = Number(parsed.taxaAtualTesouro ?? 0)
            const paramPrazoDias = Number(parsed.prazoDias ?? 0)
            const paramTaxaLci = Number(parsed.taxaLciLca ?? 0)
            const paramAporte = Number(parsed.aporte ?? 0)
            const hasParams = paramCdi > 0 || paramIpca > 0 || paramDuration > 0

            return (
              <div style={{ padding: '1rem 0' }}>
                <div className="inline-actions" style={{ marginBottom: '1rem' }}>
                  <button type="button" className="ghost-button" onClick={() => setSelectedUser(null)}>← Voltar à lista</button>
                  <span className="badge badge-em-implantacao">{selectedUser.email}</span>
                  <span className="field-hint">Atualizado em {new Date(selectedUser.atualizadoEm).toLocaleString('pt-BR')}</span>
                </div>

                {/* ── Parâmetros de Simulação ── */}
                {hasParams && (
                  <div style={{ background: '#f9f9f8', borderRadius: 14, padding: '16px 20px', marginBottom: '1rem', border: '1px solid rgba(0,0,0,0.04)' }}>
                    <h5 style={{ margin: '0 0 12px', fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Parâmetros de Simulação</h5>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {paramCdi > 0 && <span className="badge badge-em-implantacao">CDI: {paramCdi}% a.a.</span>}
                      {paramIpca > 0 && <span className="badge badge-em-implantacao">IPCA: {paramIpca}% a.a.</span>}
                      {paramDuration > 0 && <span className="badge badge-planejado">Duration: {paramDuration} anos</span>}
                      {paramTaxaAtual > 0 && <span className="badge badge-em-implantacao">Taxa IPCA+ atual: {paramTaxaAtual.toFixed(2)}%</span>}
                      {paramPrazoDias > 0 && <span className="badge badge-planejado">Prazo LCI: {paramPrazoDias}d</span>}
                      {paramTaxaLci > 0 && <span className="badge badge-em-implantacao">LCI/LCA: {paramTaxaLci.toFixed(2)}% CDI</span>}
                      {paramAporte > 0 && <span className="badge badge-em-implantacao">Aporte: R$ {paramAporte.toLocaleString('pt-BR')}</span>}
                    </div>
                  </div>
                )}

                {/* ── Tesouro IPCA+ ── */}
                {tRegs.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h5 style={{ margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Globe size={14} /> Tesouro IPCA+ ({tRegs.length} lotes)
                    </h5>
                    <ul className="result-list" style={{ maxHeight: '400px', overflow: 'auto' }}>
                      {tRegs.map((r, i) => {
                        const sinal = String(r.sinal ?? '').toLowerCase()
                        const isSell = sinal === 'vender'
                        return (
                          <li key={i} className="post-row" style={{ borderLeft: `3px solid ${isSell ? '#dc2626' : '#16a34a'}` }}>
                            <div className="post-row-main">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <strong>R$ {Number(r.valorInvestido ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                                <span className={`badge ${isSell ? 'badge-danger' : 'badge-em-implantacao'}`} style={{ fontWeight: 700 }}>{sinal.toUpperCase()}</span>
                              </div>
                              <div className="post-row-meta">
                                <span>Compra: {String(r.dataCompra ?? '').split('-').reverse().join('/')}</span>
                                <span className="badge badge-em-implantacao">{Number(r.taxaContratada ?? 0).toFixed(2)}% a.a.</span>
                                {r.vencimento ? <span className="badge badge-planejado">Venc: {String(r.vencimento)}</span> : null}
                              </div>
                              {String(r.analise ?? '') && (
                                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#888', fontStyle: 'italic' }}>{String(r.analise)}</p>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                    {tRegs.length > 1 && (() => {
                      const totalInvestido = tRegs.reduce((s, r) => s + Number(r.valorInvestido ?? 0), 0)
                      const taxaMedia = totalInvestido > 0
                        ? tRegs.reduce((s, r) => s + Number(r.taxaContratada ?? 0) * Number(r.valorInvestido ?? 0), 0) / totalInvestido
                        : 0
                      return (
                        <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <span className="badge badge-em-implantacao">Total: R$ {totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span className="badge badge-planejado">Taxa média: {taxaMedia.toFixed(2)}% a.a.</span>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* ── LCI/LCA ── */}
                {lRegs.length > 0 && (
                  <div>
                    <h5 style={{ margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Database size={14} /> LCI/LCA ({lRegs.length} registros)
                    </h5>
                    <ul className="result-list" style={{ maxHeight: '300px', overflow: 'auto' }}>
                      {lRegs.map((r, i) => (
                        <li key={i} className="post-row">
                          <div className="post-row-main">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <strong>R$ {Number(r.aporte ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            </div>
                            <div className="post-row-meta">
                              <span>{Number(r.prazoDias ?? 0)} dias</span>
                              <span className="badge badge-em-implantacao">{Number(r.taxaLciLca ?? 0).toFixed(2)}% CDI</span>
                              <span className="badge badge-planejado">≈ CDB {Number(r.cdbEquivalente ?? 0).toFixed(2)}%</span>
                              <span className="badge badge-em-implantacao">IR: {Number(r.aliquotaIr ?? 0).toFixed(1)}%</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tRegs.length === 0 && lRegs.length === 0 && (
                  <p className="result-empty">Nenhum dado de análise salvo neste registro.</p>
                )}
              </div>
            )
          })() : (
            <>
              {userDataLoading && userData.length === 0 ? (
                <div className="result-empty" style={{ textAlign: 'center', padding: '3rem 0' }}>
                  <Loader2 size={28} className="spin" style={{ marginBottom: '0.5rem' }} />
                  <p>Carregando…</p>
                </div>
              ) : userData.length === 0 ? (
                <p className="result-empty">Nenhum usuário salvou dados ainda.</p>
              ) : (
                <ul className="result-list astro-akashico-scroll">
                  {userData.map((row) => {
                    const dt = new Date(row.atualizadoEm).toLocaleString('pt-BR')
                    let preview = ''
                    try {
                      const d = JSON.parse(row.dadosJson)
                      const tCount = (d.tesouroRegistros ?? []).length
                      const lCount = (d.lciRegistros ?? []).length
                      preview = `${tCount} lotes IPCA+ · ${lCount} registros LCI`
                    } catch { preview = 'Dados inválidos' }
                    return (
                      <li key={row.id} className="post-row">
                        <div className="post-row-main" style={{ cursor: 'pointer' }} onClick={() => setSelectedUser(row)}>
                          <div className="flex-row-center">
                            <Mail size={14} style={{ marginRight: '0.4rem', color: 'var(--fg-dim, #888)' }} />
                            <strong>{row.email}</strong>
                          </div>
                          <div className="post-row-meta">
                            <span>{dt}</span>
                            <span className="badge badge-em-implantacao">{preview}</span>
                          </div>
                        </div>
                        <div className="post-row-actions">
                          <button type="button" className="ghost-button danger" onClick={() => setConfirmDelete({ show: true, id: row.id, label: row.email })} disabled={deletingId === row.id}>
                            {deletingId === row.id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                            Excluir
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              <p className="field-hint" style={{ textAlign: 'right', paddingTop: '0.5rem' }}>
                Total: {userDataTotal} usuário(s)
              </p>
            </>
          )}
        </article>
      )}

      {/* ═══════════════════════ TAB: Configurações ═══════════════════════ */}
      {activeTab === 'configuracoes' && (
        <>
          {/* ── Status do Cache ── */}
          <article className="result-card">
            <div className="result-toolbar">
              <div>
                <h4><Database size={16} /> Status do Cache — Taxas IPCA+</h4>
                <p className="field-hint">Dados extraídos do CSV público do Tesouro Transparente, armazenados no D1.</p>
              </div>
              <div className="inline-actions">
                <button type="button" className="ghost-button" onClick={() => void carregarStatusCache()} disabled={taxaCacheLoading}>
                  {taxaCacheLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                  Verificar
                </button>
              </div>
            </div>

            {taxaCache ? (
              <div className="form-grid" style={{ paddingTop: '0.5rem' }}>
                <div className="field-group">
                  <label>Status</label>
                  <p style={{ fontWeight: 700, color: taxaCache.ok ? 'var(--success, #34a853)' : 'var(--danger, #ea4335)', margin: 0 }}>
                    {taxaCache.ok ? '● Operacional' : `● ${taxaCache.error ?? 'Erro'}`}
                  </p>
                </div>
                {taxaCache.ok && (
                  <>
                    <div className="field-group">
                      <label>Fonte</label>
                      <p style={{ margin: 0 }}>{taxaCache.fonte === 'cache' ? 'Cache D1' : taxaCache.fonte === 'cache-stale' ? 'Cache D1 (desatualizado)' : 'Tesouro Transparente (CSV)'}</p>
                    </div>
                    <div className="field-group">
                      <label>Data de Referência</label>
                      <p style={{ margin: 0 }}>{taxaCache.dataReferencia ?? '—'}</p>
                    </div>
                    <div className="field-group">
                      <label>Taxa Média Indicativa</label>
                      <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent, #1a73e8)', margin: 0 }}>
                        {taxaCache.taxaMediaIndicativa?.toFixed(2)}% a.a.
                      </p>
                    </div>
                    <div className="field-group">
                      <label>Última Atualização</label>
                      <p style={{ margin: 0 }}>{taxaCache.atualizadoEm ? new Date(taxaCache.atualizadoEm).toLocaleString('pt-BR') : '—'}</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="result-empty">Clique em "Verificar" para consultar o cache.</p>
            )}

            {taxaCache?.ok && taxaCache.titulos && taxaCache.titulos.length > 0 && (
              <details style={{ marginTop: '0.75rem' }}>
                <summary className="ghost-button" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                  Exibir {taxaCache.titulos.length} vencimentos disponíveis
                </summary>
                <ul className="result-list astro-akashico-scroll" style={{ marginTop: '0.5rem', maxHeight: '220px' }}>
                  {taxaCache.titulos.map((t, i) => (
                    <li key={i} className="post-row">
                      <div className="post-row-main">
                        <strong>{t.tipo}</strong>
                        <div className="post-row-meta">
                          <span>Vcto: {t.vencimento}</span>
                          <span className="badge badge-em-implantacao">Compra {t.taxaCompra.toFixed(2)}%</span>
                          <span className="badge badge-planejado">Venda {t.taxaVenda.toFixed(2)}%</span>
                          <span>PU R$ {t.pu.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </article>

          {/* ── Disparo Manual ── */}
          <article className="result-card">
            <div className="result-toolbar">
              <div>
                <h4><Download size={16} /> Processamento Manual do CSV</h4>
                <p className="field-hint">Re-download imediato do CSV (~13 MB) e atualização do cache, independente do cron.</p>
              </div>
              <div className="inline-actions">
                <button type="button" className="primary-button" onClick={() => void dispararCSV()} disabled={csvTriggerLoading}>
                  {csvTriggerLoading ? <><Loader2 size={16} className="spin" /> Processando…</> : <><Download size={16} /> Disparar Agora</>}
                </button>
              </div>
            </div>
            {csvTriggerResult && (
              <div style={{
                marginTop: '0.75rem', padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-input, 10px)',
                border: `1px solid ${csvTriggerResult.ok ? 'var(--success, #34a853)' : 'var(--danger, #ea4335)'}`,
                backgroundColor: csvTriggerResult.ok ? 'rgba(52,168,83,0.06)' : 'rgba(234,67,53,0.06)',
                fontSize: '0.9rem',
              }}>
                <strong style={{ color: csvTriggerResult.ok ? 'var(--success, #34a853)' : 'var(--danger, #ea4335)' }}>
                  {csvTriggerResult.ok ? '✓ Sucesso' : '✕ Erro'}
                </strong>
                {csvTriggerResult.ms != null && <span style={{ marginLeft: '0.5rem', opacity: 0.6 }}>({csvTriggerResult.ms}ms)</span>}
                <p style={{ margin: '0.3rem 0 0', color: 'var(--fg)' }}>{csvTriggerResult.msg}</p>
              </div>
            )}
          </article>

          {/* ── Fonte de Dados + Cron ── */}
          <form className="form-card" onSubmit={e => e.preventDefault()}>
            <div className="result-toolbar">
              <div>
                <h4><Globe size={16} /> Fonte de Dados e Automação</h4>
                <p className="field-hint">Pipeline de dados do Tesouro Transparente e agendamento automático.</p>
              </div>
            </div>

            <fieldset className="settings-fieldset">
              <legend>URL do CSV (Tesouro Transparente)</legend>
              <div className="field-group">
                <label htmlFor="oraculo-csv-url">Endereço do arquivo CSV</label>
                <input
                  id="oraculo-csv-url" name="oraculoCsvUrl" type="url" autoComplete="off"
                  value={config.csvUrl}
                  onChange={e => handleSaveConfig({ csvUrl: e.target.value })}
                  onBlur={() => {}}
                />
                <p className="field-hint">
                  Fonte oficial de dados abertos (licença ODbL). Atualizado diariamente (~13 MB).{' '}
                  <a href="https://www.tesourotransparente.gov.br/ckan/dataset/taxas-dos-titulos-ofertados-pelo-tesouro-direto" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent, #1a73e8)' }}>
                    <ExternalLink size={12} style={{ verticalAlign: 'middle' }} /> Ver dataset
                  </a>
                </p>
              </div>
            </fieldset>

            <fieldset className="settings-fieldset">
              <legend><Clock size={14} style={{ verticalAlign: 'middle' }} /> Atualização Automática (Cron)</legend>
              <p className="field-hint" style={{ marginBottom: '0.75rem' }}>
                O worker <code>cron-taxa-ipca</code> atualiza o cache automaticamente.
                {cronLoading && <> <Loader2 size={12} className="spin" style={{ verticalAlign: 'middle' }} /> Carregando…</>}
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div className="field-group" style={{ flex: '0 0 auto' }}>
                  <label htmlFor="cron-hour">Hora (BRT)</label>
                  <select
                    id="cron-hour"
                    value={cronHour}
                    style={{ width: '80px' }}
                    onChange={e => { setCronHour(Number(e.target.value)); setCronDirty(true) }}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{pad(i)}h</option>
                    ))}
                  </select>
                </div>
                <div className="field-group" style={{ flex: '0 0 auto' }}>
                  <label htmlFor="cron-minute">Minuto</label>
                  <select
                    id="cron-minute"
                    value={cronMinute}
                    style={{ width: '80px' }}
                    onChange={e => { setCronMinute(Number(e.target.value)); setCronDirty(true) }}
                  >
                    {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                      <option key={m} value={m}>:{pad(m)}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={cronSaving || !cronDirty}
                  onClick={() => void salvarCron()}
                  style={{ marginBottom: '0.35rem' }}
                >
                  {cronSaving ? <><Loader2 size={16} className="spin" /> Salvando…</> : <><Save size={16} /> Salvar</>}
                </button>
              </div>
              <p className="field-hint" style={{ marginTop: '0.5rem' }}>
                Expressão: <code style={{ fontFamily: 'monospace' }}>{cronExpression(cronHour, cronMinute)}</code>
                {' · '}Execução diária às <strong>{pad(cronHour)}:{pad(cronMinute)} BRT</strong> ({pad(brtToUtc(cronHour))}:{pad(cronMinute)} UTC)
              </p>
            </fieldset>
          </form>

          {/* ── Modelos de IA ── */}
          <form className="form-card" onSubmit={e => e.preventDefault()}>
            <div className="result-toolbar">
              <div>
                <h4><BrainCircuit size={16} /> Modelos de IA (Gemini)</h4>
                <p className="field-hint">
                  Modelos utilizados para OCR de extratos e análise financeira.
                  {modelsLoading && <> <Loader2 size={12} className="spin" style={{ verticalAlign: 'middle' }} /> Carregando modelos…</>}
                  {!modelsLoading && geminiModels.length > 0 && <> · {geminiModels.length} modelos disponíveis</>}
                </p>
              </div>
              <div className="inline-actions">
                <button type="button" className="ghost-button" onClick={() => void carregarModelos()} disabled={modelsLoading}>
                  {modelsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                  Atualizar Lista
                </button>
              </div>
            </div>

            <fieldset className="settings-fieldset">
              <legend>Seleção de Modelos</legend>
              <div className="form-grid">
                {renderModelSelect(
                  'Modelo Vision (OCR de extratos)',
                  'model-vision',
                  config.modeloVision,
                  v => handleSaveConfig({ modeloVision: v })
                )}
                {renderModelSelect(
                  'Modelo Análise (Fiduciário)',
                  'model-analise',
                  config.modeloAnalise,
                  v => handleSaveConfig({ modeloAnalise: v })
                )}
              </div>
            </fieldset>
          </form>
        </>
      )}

      {/* ── Modal de Exclusão ─────────────────────────────────────── */}
      {confirmDelete?.show && (
        <div className="itau-modal-overlay" role="dialog" aria-modal="true" aria-label="Confirmar exclusão">
          <div className="itau-modal-content">
            <button type="button" title="Fechar" className="itau-modal-close" onClick={() => setConfirmDelete(null)}>
              <X size={24} />
            </button>
            <div className="itau-modal-header">
              <div className="itau-modal-icon itau-modal-icon--danger"><Trash2 size={24} /></div>
              <h2 className="itau-modal-title">Excluir registro</h2>
              <p className="itau-modal-subtitle">{confirmDelete.label}</p>
            </div>
            <div className="itau-modal-form">
              <div className="itau-modal-actions">
                <button type="button" className="itau-modal-btn itau-modal-btn--ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                <button type="button" className="itau-modal-btn itau-modal-btn--danger" onClick={() => void executeDelete(confirmDelete.id)}>Apagar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
