/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useMemo, useState, useEffect, useCallback } from 'react'
import type { FormEvent } from 'react'
import { BrainCircuit, Loader2, Mail, Search, Send, Sparkles, Telescope, Trash2, X, RefreshCw } from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { generateAstrologicalReport } from '../../lib/astrological-report'
import { useModuleConfig } from '../../lib/useModuleConfig'
import DOMPurify from 'dompurify'

type MapaResumo = {
  id: string
  nome: string
  dataNascimento: string
  status: 'novo' | 'analisado' | 'indisponivel'
}

type ApiResponse = {
  ok: boolean
  total: number
  avisos?: string[]
  error?: string
  filtros: {
    nome: string
    dataInicial: string
    dataFinal: string
    email: string
  }
  items: MapaResumo[]
}

type MapaDetalhado = {
  id: string
  nome: string
  data_nascimento: string | null
  hora_nascimento: string | null
  local_nascimento: string | null
  dados_astronomica: string | null
  dados_tropical: string | null
  dados_globais: string | null
  analise_ia: string | null
  created_at: string | null
}

type ConfirmDelete = { show: boolean; id: string; nome: string }

const sanitizeRichHtml = (html: string): string => DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'strong', 'ul', 'li', 'em', 'b', 'i', 'h1', 'h2', 'h3', 'br'],
  ALLOWED_ATTR: []
})

const formatarData = (dataStr: string): string => {
  if (!dataStr) return ''
  const p = dataStr.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dataStr
}



// Configs (D1-persisted via useModuleConfig)
export interface AstroConfig {
  modeloSintese?: string
}
const DEFAULT_CONFIG: AstroConfig = { modeloSintese: '' }
export interface GeminiModelItem { id: string; displayName: string; api: string; vision: boolean }

export function AstrologoModule() {
  const { showNotification } = useNotification()
  const [activeTab, setActiveTab] = useState<'registros' | 'usuarios' | 'configuracoes'>('registros')
  const [config, saveConfig] = useModuleConfig<AstroConfig>('astrologo-config', DEFAULT_CONFIG, {
    onSaveSuccess: () => showNotification('Configuração salva.', 'success'),
    onSaveError: (err) => showNotification(`Erro ao salvar configuração: ${err}`, 'error'),
  })
  const [geminiModels, setGeminiModels] = useState<GeminiModelItem[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  
  interface UserDataRow {
    id: string; email: string; dadosJson: string
    criadoEm: string; atualizadoEm: string
  }
  const [userData, setUserData] = useState<UserDataRow[]>([])
  const [userDataLoading, setUserDataLoading] = useState(false)
  const [userDataTotal, setUserDataTotal] = useState(0)
  const [selectedUser, setSelectedUser] = useState<UserDataRow | null>(null)

  const withTrace = (message: string, payload?: { request_id?: string }) => (
    payload?.request_id ? `${message} (req ${payload.request_id})` : message
  )
  const [loading, setLoading] = useState(false)
  const [loadingMapaId, setLoadingMapaId] = useState<string | null>(null)
  const [deletingMapaId, setDeletingMapaId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')
  const [email, setEmail] = useState('')
  const [adminActor] = useState('admin@app.lcv')
  const [items, setItems] = useState<MapaResumo[]>([])
  const [selectedMapa, setSelectedMapa] = useState<MapaDetalhado | null>(null)
  const [nomeConsulente, setNomeConsulente] = useState('')
  const [relatorioHtml, setRelatorioHtml] = useState('')
  const [relatorioTexto, setRelatorioTexto] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete | null>(null)
  const [emailModalMapaId, setEmailModalMapaId] = useState<string | null>(null)
  const [emailModalInput, setEmailModalInput] = useState('')



  const disabled = useMemo(() => loading, [loading])



  const handleReadMapa = async (id: string) => {
    setLoadingMapaId(id)
    try {
      const response = await fetch('/api/astrologo/ler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({ id, adminActor }),
      })

      const payload = await response.json() as { ok: boolean; error?: string; mapa?: MapaDetalhado; request_id?: string }

      if (!response.ok || !payload.ok || !payload.mapa) {
        throw new Error(payload.error ?? 'Falha ao ler mapa do Astrólogo.')
      }

      // Limpar estado dependente do mapa anterior antes de definir o novo
      setEmailModalMapaId(null)
      setNomeConsulente(payload.mapa.nome)

      setSelectedMapa(payload.mapa)
      
      // Auto-generate astrological reports
      try {
        const report = generateAstrologicalReport(payload.mapa)
        setRelatorioHtml(report.html)
        setRelatorioTexto(report.text)
      } catch {
        showNotification('Aviso: falha ao gerar relatório automático, preencha manualmente.', 'info')
      }
      
      showNotification(withTrace('Mapa carregado com detalhes completos.', payload), 'success')
    } catch {
      showNotification('Não foi possível carregar os detalhes do mapa.', 'error')
    } finally {
      setLoadingMapaId(null)
    }
  }

  const carregarUserData = async (notify = false) => {
    setUserDataLoading(true)
    try {
      const res = await fetch('/api/astrologo/userdata?limit=200')
      const data = await res.json() as { ok: boolean; data: UserDataRow[]; total: number }
      if (data.ok) {
        setUserData(data.data)
        setUserDataTotal(data.total)
        if (notify) showNotification('Dados de usuários atualizados.', 'success')
      }
    } catch {
      showNotification('Falha ao carregar dados de usuários.', 'error')
    } finally { setUserDataLoading(false) }
  }

  /** Open email modal for a specific mapa (loads its data first if not already selected) */
  const handleOpenEmailModal = async (id: string, nome: string) => {
    // If this record isn't already loaded, load it first
    if (!selectedMapa || selectedMapa.id !== id) {
      await handleReadMapa(id)
    }
    setNomeConsulente(nome)
    setEmailModalInput('')
    setEmailModalMapaId(id)
  }

  /** Send email using the simple modal (only asks for email address) */
  const handleSendEmailFromModal = async () => {
    const email = emailModalInput.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showNotification('Informe um e-mail válido.', 'error')
      return
    }

    setSendingEmail(true)
    try {
      const response = await fetch('/api/astrologo/enviar-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({
          emailDestino: email,
          nomeConsulente,
          relatorioHtml,
          relatorioTexto,
          adminActor,
        }),
      })

      const payload = await response.json() as { ok: boolean; error?: string; request_id?: string }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao enviar e-mail do Astrólogo.')
      }

      setEmailModalMapaId(null)
      showNotification(withTrace('E-mail enviado com sucesso para o consulente.', payload), 'success')
    } catch {
      showNotification('Não foi possível enviar o e-mail do Astrólogo.', 'error')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleDeleteMapa = async (id: string, nome: string) => {
    setConfirmDelete({ show: true, id, nome })
  }

  const executeDeleteMapa = async (id: string) => {
    setConfirmDelete(null)
    setDeletingMapaId(id)
    try {

      if (activeTab === 'usuarios') {
        const res = await fetch(`/api/astrologo/userdata?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
        const data = await res.json() as { ok: boolean; error?: string }
        if (!res.ok || !data.ok) throw new Error(data.error)
        
        setUserData(p => p.filter(r => r.id !== id))
        setUserDataTotal(n => Math.max(0, n - 1))
        setItems([])
        setSelectedUser(null)
      } else {
        const response = await fetch('/api/astrologo/excluir', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Actor': adminActor,
          },
          body: JSON.stringify({ id, adminActor }),
        })

        const payload = await response.json() as { ok: boolean; error?: string; request_id?: string }
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? 'Falha ao excluir mapa do Astrólogo.')
        }

        setItems((current) => current.filter((item) => item.id !== id))
        setSelectedMapa((current) => (current?.id === id ? null : current))
      }
      
      showNotification('Excluído com sucesso.', 'success')
    } catch {
      showNotification('Não foi possível excluir.', 'error')
    } finally {
      setDeletingMapaId(null)
    }
  }

  const carregarModelos = useCallback(async () => {
    setModelsLoading(true)
    try {
      const res = await fetch('/api/astrologo/modelos')
      const data = await res.json() as { ok: boolean; models?: GeminiModelItem[] }
      if (data.ok && data.models) setGeminiModels(data.models)
    } catch { /* ignorar */ }
    finally { setModelsLoading(false) }
  }, [])

  useEffect(() => {
    if (activeTab === 'configuracoes') {
      void carregarModelos()
    }
  }, [activeTab, carregarModelos])

  const handleSaveConfig = (patch: Partial<AstroConfig>) => {
    saveConfig(patch)
  }

  const renderModelSelect = (label: string, id: string, value: string | undefined, onChange: (v: string) => void) => (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value || ''} onChange={e => onChange(e.target.value)}>
        {!value && <option value="">(Padrão do Sistema)</option>}
        {geminiModels.map(m => (
          <option key={m.id} value={m.id}>{m.displayName} ({m.api}) {m.vision ? '👁️' : ''}</option>
        ))}
        {geminiModels.length === 0 && value && <option value={value}>{value}</option>}
      </select>
    </div>
  )

  const [sendingEmail, setSendingEmail] = useState(false)
  
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const query = new URLSearchParams({
      nome,
      dataInicial,
      dataFinal,
      email,
    })

    setLoading(true)
    try {
      const response = await fetch(`/api/astrologo/listar?${query.toString()}`)
      const payload = await response.json() as ApiResponse

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao consultar o módulo Astrólogo.')
      }

      setItems(payload.items)
      showNotification(`Consulta concluída: ${payload.total} registro(s) localizado(s).`, 'success')

      if (Array.isArray(payload.avisos) && payload.avisos.length > 0) {
        showNotification(payload.avisos[0], 'info')
      }
    } catch {
      showNotification('Não foi possível carregar os registros do Astrólogo.', 'error')
    } finally {
      setLoading(false)
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderMapaCard = (mapa: any, index?: number) => {
    let globais = null
    let tropical = null
    let astronomica = null
    try {
      globais = mapa.dados_globais ? (typeof mapa.dados_globais === 'string' ? JSON.parse(mapa.dados_globais) : mapa.dados_globais) : (mapa.dadosGlobais || null)
      tropical = mapa.dados_tropical ? (typeof mapa.dados_tropical === 'string' ? JSON.parse(mapa.dados_tropical) : mapa.dados_tropical) : (mapa.dadosTropical || null)
      astronomica = mapa.dados_astronomica ? (typeof mapa.dados_astronomica === 'string' ? JSON.parse(mapa.dados_astronomica) : mapa.dados_astronomica) : (mapa.dadosAstronomica || null)
    } catch { /* ignorar parsing errors */ }

    const nome = mapa.nome || mapa.query?.nome || 'Consulente'
    const dataNascimento = mapa.data_nascimento || mapa.query?.dataNascimento || ''
    const horaNascimento = mapa.hora_nascimento || mapa.query?.horaNascimento || ''
    const localNascimento = mapa.local_nascimento || mapa.query?.localNascimento || ''
    const analiseIa = mapa.analise_ia || mapa.analiseIa || ''

    return (
      <article className="result-card" key={index ?? mapa.id ?? Math.random()} style={{ marginBottom: index !== undefined ? '1rem' : 0 }}>
        <header className="result-header">
          <h4><Sparkles size={16} /> Ficha Oculta: {nome}</h4>
          <span>{dataNascimento ? formatarData(dataNascimento) : ''} {horaNascimento ? `às ${horaNascimento}` : ''}</span>
        </header>

        {localNascimento && (
          <p className="field-hint astro-local-hint">{localNascimento}</p>
        )}

        {globais && (
          <div className="astro-section">
            <div className="form-grid">
              <div className="field-group">
                <label>Forças Globais: Tatwas</label>
                <div className="astro-kv-list">
                  <div className="astro-kv"><span className="astro-kv__label">Principal</span><strong>{String(globais.tatwa?.principal || '')}</strong></div>
                  <div className="astro-kv"><span className="astro-kv__label">Sub-tatwa</span><strong>{String(globais.tatwa?.sub || '')}</strong></div>
                </div>
              </div>
              <div className="field-group">
                <label>Forças Globais: Numerologia</label>
                <div className="astro-kv-list">
                  <div className="astro-kv"><span className="astro-kv__label">Expressão</span><strong>{String(globais.numerologia?.expressao || '')}</strong></div>
                  <div className="astro-kv"><span className="astro-kv__label">Caminho</span><strong>{String(globais.numerologia?.caminhoVida || '')}</strong></div>
                  <div className="astro-kv"><span className="astro-kv__label">Hora</span><strong>{String(globais.numerologia?.vibracaoHora || '')}</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tropical && (
          <div className="astro-section">
            <h5 className="astro-section__title astro-section__title--tropical">Módulo I: Astrológico Tropical</h5>
            {tropical.astrologia?.length > 0 && (
              <>
                <label>Astrologia ({tropical.astrologia.length > 12 ? '13 Signos' : '12 Signos'})</label>
                <div className="astro-grid astro-grid--4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {tropical.astrologia.map((a: any, i: number) => (
                    <div key={`trop-astro-${i}`} className="astro-card">
                      <span className="astro-card__label">{a.astro}</span>
                      <span className="astro-card__value">{a.simbolo} {a.signo}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {tropical.umbanda?.length > 0 && (
              <>
                <label>Umbanda</label>
                <div className="astro-grid astro-grid--3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {tropical.umbanda.map((u: any, i: number) => (
                    <div key={`trop-umb-${i}`} className="astro-umbanda-card">
                      <span className="astro-umbanda-card__simbolo">{u.simbolo}</span>
                      <span className="astro-umbanda-card__posicao">{u.posicao}</span>
                      <span className="astro-umbanda-card__orixa astro-umbanda-card__orixa--tropical">{u.orixa}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {astronomica && (
          <div className="astro-section">
            <h5 className="astro-section__title astro-section__title--astronomica">Módulo II: Astronômico Constelacional</h5>
            {astronomica.astrologia?.length > 0 && (
              <>
                <label>Astrologia ({astronomica.astrologia.length > 12 ? '13 Signos' : '12 Signos'})</label>
                <div className="astro-grid astro-grid--4">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {astronomica.astrologia.map((a: any, i: number) => (
                    <div key={`ast-astro-${i}`} className="astro-card">
                      <span className="astro-card__label">{a.astro}</span>
                      <span className="astro-card__value">{a.simbolo} {a.signo}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {astronomica.umbanda?.length > 0 && (
              <>
                <label>Umbanda</label>
                <div className="astro-grid astro-grid--3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {astronomica.umbanda.map((u: any, i: number) => (
                    <div key={`ast-umb-${i}`} className="astro-umbanda-card">
                      <span className="astro-umbanda-card__simbolo">{u.simbolo}</span>
                      <span className="astro-umbanda-card__posicao">{u.posicao}</span>
                      <span className="astro-umbanda-card__orixa astro-umbanda-card__orixa--astronomica">{u.orixa}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {analiseIa && (
          <div className="astro-section">
            <h5 className="astro-section__title">Síntese do Mestre (IA)</h5>
            <div className="astro-ia-content" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(analiseIa) }} />
          </div>
        )}
      </article>
    )
  }

  return (
    <section className="detail-panel module-shell module-shell-astrologo">
      <div className="detail-header">
        <div className="detail-icon"><Sparkles size={22} /></div>
        <div>
          <h3>Câmara do Mestre — Astrólogo</h3>
        </div>
      </div>

      {/* Dialog de confirmação de exclusão */}
      {confirmDelete?.show && (
        <div className="itau-modal-overlay" role="dialog" aria-modal="true" aria-label="Confirmar exclusão">
          <div className="itau-modal-content">
            <button type="button" title="Fechar diálogo" className="itau-modal-close" onClick={() => setConfirmDelete(null)}>
              <X size={24} />
            </button>
            <div className="itau-modal-header">
              <div className="itau-modal-icon itau-modal-icon--danger">
                <Trash2 size={24} />
              </div>
              <h2 className="itau-modal-title">Atenção Crítica</h2>
              <p className="itau-modal-subtitle">Você está prestes a expurgar o registro de <strong>{confirmDelete.nome}</strong>. Esta ação não poderá ser desfeita.</p>
            </div>
            <div className="itau-modal-form">
              <div className="itau-modal-actions">
                <button type="button" className="itau-modal-btn itau-modal-btn--ghost" onClick={() => setConfirmDelete(null)}>
                  Cancelar
                </button>
                <button type="button" className="itau-modal-btn itau-modal-btn--danger" onClick={() => void executeDeleteMapa(confirmDelete.id)}>
                  Apagar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="inline-actions" style={{ marginBottom: '1rem' }}>
        <button type="button" className={activeTab === 'registros' ? 'primary-button' : 'ghost-button'} onClick={() => setActiveTab('registros')}>
          <Search size={14} /> Consultas Registradas
        </button>
        <button type="button" className={activeTab === 'usuarios' ? 'primary-button' : 'ghost-button'} onClick={() => { setActiveTab('usuarios'); void carregarUserData(); }}>
          <Mail size={14} /> Dados de Usuários
        </button>
        <button type="button" className={activeTab === 'configuracoes' ? 'primary-button' : 'ghost-button'} onClick={() => setActiveTab('configuracoes')}>
          <BrainCircuit size={14} /> Configurações
        </button>
      </div>

      {activeTab === 'registros' && (
        <>
          <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="astrologo-filtro-nome">Nome do consulente</label>
            <input id="astrologo-filtro-nome" name="astrologoFiltroNome" type="text" autoComplete="name" placeholder="Ex.: Maria de Oxum" value={nome} onChange={(event) => setNome(event.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="astrologo-filtro-email">E-mail vinculado</label>
            <input id="astrologo-filtro-email" name="astrologoFiltroEmail" type="email" autoComplete="email" placeholder="consulente@email.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="astrologo-filtro-data-inicial">Data inicial</label>
            <input id="astrologo-filtro-data-inicial" name="astrologoFiltroDataInicial" type="date" value={dataInicial} onChange={(event) => setDataInicial(event.target.value)} />
          </div>
          <div className="field-group">
            <label htmlFor="astrologo-filtro-data-final">Data final</label>
            <input id="astrologo-filtro-data-final" name="astrologoFiltroDataFinal" type="date" value={dataFinal} onChange={(event) => setDataFinal(event.target.value)} />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={disabled}>
            {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
            Atualizar arquivo
          </button>
        </div>
      </form>

      <article className="result-card">
        <header className="result-header">
          <h4><Telescope size={16} /> Arquivo Akáshico</h4>
          <span>{items.length} item(ns)</span>
        </header>

        {items.length === 0 ? (
          <p className="result-empty">
            Sem resultados no momento. Use os filtros e execute uma busca para validar o fluxo inicial.
          </p>
        ) : (
          <ul className="result-list astro-akashico-scroll">
            {items.map((item) => {
              const isSelected = selectedMapa?.id === item.id
              return (
                <li key={item.id} className={`post-row ${isSelected ? 'post-row--selected' : ''}`}>
                  <div className="post-row-main">
                    <strong>{item.nome}</strong>
                    <div className="post-row-meta">
                      <span>Nascimento: {item.dataNascimento}</span>
                      <span className={`badge badge-${item.status === 'analisado' ? 'em-implantacao' : 'planejado'}`}>
                        {item.status === 'indisponivel' ? 'status indisponível' : item.status}
                      </span>
                    </div>
                  </div>

                  <div className="post-row-actions">
                    <button type="button" className="ghost-button" onClick={() => void handleOpenEmailModal(item.id, item.nome)} disabled={loadingMapaId === item.id || deletingMapaId === item.id || sendingEmail}>
                      <Mail size={16} />
                      E-mail
                    </button>
                    <button type="button" className="ghost-button" onClick={() => void handleReadMapa(item.id)} disabled={loadingMapaId === item.id || deletingMapaId === item.id}>
                      {loadingMapaId === item.id ? <Loader2 size={16} className="spin" /> : <Telescope size={16} />}
                      Ler detalhes
                    </button>
                    <button type="button" className="ghost-button" onClick={() => void handleDeleteMapa(item.id, item.nome)} disabled={deletingMapaId === item.id || loadingMapaId === item.id}>
                      {deletingMapaId === item.id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                      Excluir
                    </button>
                  </div>

                  {/* Inline email form — appears right below the row */}
                  {emailModalMapaId === item.id && (
                    <form className="astro-email-inline" autoComplete="on" onSubmit={(e) => { e.preventDefault(); void handleSendEmailFromModal() }}>
                      <div className="astro-email-inline__header">
                        <Mail size={14} />
                        <strong>Enviar Dossiê Celestial</strong>
                      </div>
                      <p className="astro-email-inline__hint">Insira o endereço de e-mail para receber o relatório astrológico completo.</p>
                      <div className="astro-email-inline__row">
                        <input
                          id={`astrologo-email-inline-${item.id}`}
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="consulente@email.com"
                          value={emailModalInput}
                          onChange={(e) => setEmailModalInput(e.target.value)}
                          disabled={sendingEmail}
                          className="astro-email-inline__input"
                        />
                        <button
                          type="submit"
                          className="primary-button"
                          disabled={sendingEmail || !emailModalInput.trim()}
                        >
                          {sendingEmail ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                          Enviar
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => setEmailModalMapaId(null)}
                          disabled={sendingEmail}
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </article>

      {/* Viewer estruturado do mapa (paridade com astrologo-admin) */}
      {selectedMapa && (
        <>
        {renderMapaCard(selectedMapa)}
        </>
      )}

      </>
      )}

      {/* ═══════════════════════ TAB: Dados de Usuários ═══════════════════════ */}
      {activeTab === 'usuarios' && (
        <article className="result-card">
          <div className="result-toolbar">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} /> 
                <h4 style={{ margin: 0 }}>Dados Salvos por Usuários</h4>
              </div>
              <p className="field-hint" style={{ margin: '4px 0 0' }}>Mapas salvos via autenticação por e-mail no frontend do Astrólogo.</p>
            </div>
            <div className="inline-actions">
              <button type="button" className="ghost-button" onClick={() => void carregarUserData(true)} disabled={userDataLoading}>
                {userDataLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                Recarregar
              </button>
            </div>
          </div>

          {selectedUser ? (() => {
            let parsed: unknown = []
            try { 
              const d = JSON.parse(selectedUser.dadosJson) 
              if (Array.isArray(d)) parsed = d
              else if (d.mapasSalvos && Array.isArray(d.mapasSalvos)) parsed = d.mapasSalvos
              else parsed = d
            } catch { /* */ }

            return (
              <div style={{ padding: '1rem 0' }}>
                <div className="inline-actions" style={{ marginBottom: '1rem' }}>
                  <button type="button" className="ghost-button" onClick={() => setSelectedUser(null)}>← Voltar à lista</button>
                  <span className="badge badge-em-implantacao">{selectedUser.email}</span>
                  <span className="field-hint">Atualizado em {new Date(selectedUser.atualizadoEm).toLocaleString('pt-BR')}</span>
                  <button type="button" className="ghost-button danger" onClick={() => void executeDeleteMapa(selectedUser.id)} disabled={deletingMapaId === selectedUser.id} style={{ marginLeft: 'auto', color: 'var(--danger)' }}>
                    {deletingMapaId === selectedUser.id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} Excluir Dados
                  </button>
                </div>

                <div className="astro-users-render" style={{ marginTop: '2rem' }}>
                  {Array.isArray(parsed) ? parsed.map((m, i) => renderMapaCard(m, i)) : renderMapaCard(parsed, 0)}
                </div>
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
                      if (Array.isArray(d)) preview = `${d.length} mapa(s) salvo(s)`
                      else if (d.mapasSalvos && Array.isArray(d.mapasSalvos)) preview = `${d.mapasSalvos.length} mapa(s) salvo(s)`
                      else preview = 'Dados de perfil salvos'
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
                          <button type="button" className="ghost-button danger" onClick={() => void executeDeleteMapa(row.id)} disabled={deletingMapaId === row.id}>
                            {deletingMapaId === row.id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                            Excluir
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
          
          <p className="field-hint" style={{ textAlign: 'right', paddingTop: '0.5rem' }}>
            Total: {userDataTotal} usuário(s)
          </p>
        </article>
      )}

      {/* ═══════════════════════ TAB: Configurações ═══════════════════════ */}
      {activeTab === 'configuracoes' && (
        <form className="form-card" onSubmit={e => e.preventDefault()}>
          <div className="result-toolbar">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BrainCircuit size={16} />
                <h4 style={{ margin: 0 }}>Modelos de IA (Gemini)</h4>
              </div>
              <p className="field-hint" style={{ margin: '4px 0 0' }}>Modelo de rede neural ativo na síntese astrológica.</p>
            </div>
            <div className="inline-actions">
              <button type="button" className="ghost-button" onClick={() => void carregarModelos()} disabled={modelsLoading}>
                {modelsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} 
                Recarregar Modelos
              </button>
            </div>
          </div>
          <fieldset className="settings-fieldset" style={{ marginTop: '1rem' }}>
            <legend>Seleção de Parâmetros</legend>
            <div className="form-grid">
              {renderModelSelect(
                'Modelo de Síntese Astrológica',
                'model-sintese',
                config.modeloSintese,
                v => handleSaveConfig({ modeloSintese: v })
              )}
            </div>
          </fieldset>
        </form>
      )}

    </section>
  )
}
