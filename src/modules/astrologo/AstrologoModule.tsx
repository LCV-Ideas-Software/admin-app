import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, Loader2, RefreshCw, Save, Search, Send, Sparkles, Telescope, Trash2 } from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { SyncStatusCard } from '../../components/SyncStatusCard'

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

type RatePolicy = {
  route: 'calcular' | 'analisar' | 'enviar-email'
  label: string
  enabled: boolean
  max_requests: number
  window_minutes: number
  updated_at: string | null
  defaults: {
    enabled: boolean
    max_requests: number
    window_minutes: number
  }
  stats: {
    total_requests_window: number
    distinct_keys_window: number
  }
}

export function AstrologoModule() {
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(false)
  const [loadingRateLimit, setLoadingRateLimit] = useState(false)
  const [updatingRateRoute, setUpdatingRateRoute] = useState<string | null>(null)
  const [loadingMapaId, setLoadingMapaId] = useState<string | null>(null)
  const [deletingMapaId, setDeletingMapaId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')
  const [email, setEmail] = useState('')
  const [adminActor, setAdminActor] = useState('admin@app.lcv')
  const [items, setItems] = useState<MapaResumo[]>([])
  const [selectedMapa, setSelectedMapa] = useState<MapaDetalhado | null>(null)
  const [ratePolicies, setRatePolicies] = useState<RatePolicy[]>([])
  const [emailDestino, setEmailDestino] = useState('')
  const [nomeConsulente, setNomeConsulente] = useState('')
  const [relatorioHtml, setRelatorioHtml] = useState('')
  const [relatorioTexto, setRelatorioTexto] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  const disabled = useMemo(() => loading, [loading])

  const loadRateLimit = useCallback(async (shouldNotify = false) => {
    setLoadingRateLimit(true)
    try {
      const response = await fetch('/api/astrologo/rate-limit', {
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })
      const payload = await response.json() as { ok: boolean; error?: string; policies?: RatePolicy[] }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao carregar rate limit do Astrólogo.')
      }

      setRatePolicies(Array.isArray(payload.policies) ? payload.policies : [])
      if (shouldNotify) {
        showNotification('Painel de rate limit do Astrólogo atualizado.', 'success')
      }
    } catch {
      showNotification('Não foi possível carregar o painel de rate limit do Astrólogo.', 'error')
    } finally {
      setLoadingRateLimit(false)
    }
  }, [adminActor, showNotification])

  useEffect(() => {
    void loadRateLimit()
  }, [loadRateLimit])

  useEffect(() => {
    if (!selectedMapa) {
      return
    }

    if (!nomeConsulente.trim()) {
      setNomeConsulente(selectedMapa.nome)
    }

    if (!relatorioTexto.trim()) {
      const textoBase = `Olá ${selectedMapa.nome},\n\nSeu relatório astrológico foi preparado pela equipe administrativa.`
      setRelatorioTexto(textoBase)
    }

    if (!relatorioHtml.trim()) {
      const htmlBase = `<p>Olá <strong>${selectedMapa.nome}</strong>,</p><p>Seu relatório astrológico foi preparado pela equipe administrativa.</p>`
      setRelatorioHtml(htmlBase)
    }
  }, [selectedMapa, nomeConsulente, relatorioTexto, relatorioHtml])

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

      const payload = await response.json() as { ok: boolean; error?: string; mapa?: MapaDetalhado }

      if (!response.ok || !payload.ok || !payload.mapa) {
        throw new Error(payload.error ?? 'Falha ao ler mapa do Astrólogo.')
      }

      setSelectedMapa(payload.mapa)
      showNotification('Mapa carregado com detalhes completos.', 'success')
    } catch {
      showNotification('Não foi possível carregar os detalhes do mapa.', 'error')
    } finally {
      setLoadingMapaId(null)
    }
  }

  const handleDeleteMapa = async (id: string) => {
    const confirmed = globalThis.confirm('Deseja realmente excluir este mapa do Astrólogo?')
    if (!confirmed) {
      return
    }

    setDeletingMapaId(id)
    try {
      const response = await fetch('/api/astrologo/excluir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({ id, adminActor }),
      })

      const payload = await response.json() as { ok: boolean; error?: string }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao excluir mapa do Astrólogo.')
      }

      setItems((current) => current.filter((item) => item.id !== id))
      setSelectedMapa((current) => (current?.id === id ? null : current))
      showNotification('Mapa excluído com sucesso.', 'success')
    } catch {
      showNotification('Não foi possível excluir o mapa selecionado.', 'error')
    } finally {
      setDeletingMapaId(null)
    }
  }

  const handleRatePolicyChange = (
    route: RatePolicy['route'],
    field: 'enabled' | 'max_requests' | 'window_minutes',
    value: boolean | number,
  ) => {
    setRatePolicies((current) => current.map((policy) => {
      if (policy.route !== route) {
        return policy
      }

      return {
        ...policy,
        [field]: value,
      }
    }))
  }

  const persistRatePolicy = async (route: RatePolicy['route'], action: 'update' | 'restore_default') => {
    const policy = ratePolicies.find((item) => item.route === route)
    if (!policy) {
      showNotification('Policy de rate limit não encontrada para atualização.', 'error')
      return
    }

    setUpdatingRateRoute(route)
    try {
      const response = await fetch('/api/astrologo/rate-limit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({
          action,
          route,
          enabled: policy.enabled,
          max_requests: policy.max_requests,
          window_minutes: policy.window_minutes,
          adminActor,
        }),
      })

      const payload = await response.json() as { ok: boolean; error?: string; policies?: RatePolicy[] }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao salvar policy de rate limit do Astrólogo.')
      }

      setRatePolicies(Array.isArray(payload.policies) ? payload.policies : [])
      showNotification(action === 'restore_default'
        ? `Policy ${route} restaurada para padrão.`
        : `Policy ${route} atualizada com sucesso.`, 'success')
    } catch {
      showNotification('Não foi possível salvar a policy de rate limit do Astrólogo.', 'error')
    } finally {
      setUpdatingRateRoute(null)
    }
  }

  const handleSendEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!emailDestino.trim()) {
      showNotification('Informe o e-mail de destino antes de enviar.', 'error')
      return
    }

    if (!relatorioHtml.trim() && !relatorioTexto.trim()) {
      showNotification('Preencha o relatório em HTML ou texto.', 'error')
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
          emailDestino,
          nomeConsulente,
          relatorioHtml,
          relatorioTexto,
          adminActor,
        }),
      })

      const payload = await response.json() as { ok: boolean; error?: string }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao enviar e-mail do Astrólogo.')
      }

      showNotification('E-mail enviado com sucesso para o consulente.', 'success')
    } catch {
      showNotification('Não foi possível enviar o e-mail do Astrólogo.', 'error')
    } finally {
      setSendingEmail(false)
    }
  }

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

  return (
    <section className="detail-panel">
      <div className="detail-header">
        <div className="detail-icon"><Sparkles size={22} /></div>
        <div>
          <h3>Astrólogo — Operação Inicial</h3>
          <p>Primeira integração funcional do shell unificado, mantendo o admin legado ativo.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="astrologo-admin-actor">Administrador responsável</label>
            <input
              id="astrologo-admin-actor"
              name="astrologoAdminActor"
              type="text"
              autoComplete="email"
              placeholder="admin@lcv.app.br"
              value={adminActor}
              onChange={(event) => setAdminActor(event.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="astrologo-filtro-nome">Nome do consulente</label>
            <input
              id="astrologo-filtro-nome"
              name="astrologoFiltroNome"
              type="text"
              autoComplete="name"
              placeholder="Ex.: Maria de Oxum"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="astrologo-filtro-email">E-mail vinculado</label>
            <input
              id="astrologo-filtro-email"
              name="astrologoFiltroEmail"
              type="email"
              autoComplete="email"
              placeholder="consulente@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="astrologo-filtro-data-inicial">Data inicial</label>
            <input
              id="astrologo-filtro-data-inicial"
              name="astrologoFiltroDataInicial"
              type="date"
              value={dataInicial}
              onChange={(event) => setDataInicial(event.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="astrologo-filtro-data-final">Data final</label>
            <input
              id="astrologo-filtro-data-final"
              name="astrologoFiltroDataFinal"
              type="date"
              value={dataFinal}
              onChange={(event) => setDataFinal(event.target.value)}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={disabled}>
            {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
            Buscar registros
          </button>
        </div>
      </form>

      <article className="result-card">
        <header className="result-header">
          <h4><Telescope size={16} /> Resultado da consulta</h4>
          <span>{items.length} item(ns)</span>
        </header>

        {items.length === 0 ? (
          <p className="result-empty">
            Sem resultados no momento. Use os filtros e execute uma busca para validar o fluxo inicial.
          </p>
        ) : (
          <ul className="result-list">
            {items.map((item) => (
              <li key={item.id} className="post-row">
                <div className="post-row-main">
                  <strong>{item.nome}</strong>
                  <div className="post-row-meta">
                    <span>ID: {item.id}</span>
                    <span>Nascimento: {item.dataNascimento}</span>
                    <span className={`badge badge-${item.status === 'analisado' ? 'em-implantacao' : item.status === 'novo' ? 'planejado' : 'planejado'}`}>
                      {item.status === 'indisponivel' ? 'status indisponível' : item.status}
                    </span>
                  </div>
                </div>

                <div className="post-row-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => void handleReadMapa(item.id)}
                    disabled={loadingMapaId === item.id || deletingMapaId === item.id}
                  >
                    {loadingMapaId === item.id ? <Loader2 size={16} className="spin" /> : <Eye size={16} />}
                    Ler detalhes
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => void handleDeleteMapa(item.id)}
                    disabled={deletingMapaId === item.id || loadingMapaId === item.id}
                  >
                    {deletingMapaId === item.id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                    Excluir mapa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="result-card">
        <header className="result-header">
          <h4><Eye size={16} /> Detalhes do mapa selecionado</h4>
          <span>{selectedMapa ? selectedMapa.id : 'nenhum mapa selecionado'}</span>
        </header>

        {!selectedMapa ? (
          <p className="result-empty">Use o botão "Ler detalhes" em um item da lista para abrir o payload completo.</p>
        ) : (
          <div className="field-group">
            <label htmlFor="astrologo-mapa-json">Payload completo</label>
            <textarea
              id="astrologo-mapa-json"
              name="astrologoMapaJson"
              className="json-textarea"
              value={JSON.stringify(selectedMapa, null, 2)}
              readOnly
            />
          </div>
        )}
      </article>

      <form className="form-card" onSubmit={handleSendEmail}>
        <div className="result-toolbar">
          <div>
            <h4><Send size={16} /> Envio administrativo de e-mail</h4>
            <p className="field-hint">Fluxo server-side via Resend, sem expor chave no frontend.</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="astrologo-email-destino">E-mail de destino</label>
            <input
              id="astrologo-email-destino"
              name="astrologoEmailDestino"
              type="email"
              autoComplete="email"
              placeholder="consulente@email.com"
              value={emailDestino}
              onChange={(event) => setEmailDestino(event.target.value)}
              disabled={sendingEmail}
            />
          </div>

          <div className="field-group">
            <label htmlFor="astrologo-email-nome">Nome do consulente</label>
            <input
              id="astrologo-email-nome"
              name="astrologoEmailNomeConsulente"
              type="text"
              autoComplete="name"
              placeholder="Nome para o assunto"
              value={nomeConsulente}
              onChange={(event) => setNomeConsulente(event.target.value)}
              disabled={sendingEmail}
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="astrologo-email-html">Relatório (HTML)</label>
          <textarea
            id="astrologo-email-html"
            name="astrologoEmailRelatorioHtml"
            className="json-textarea"
            value={relatorioHtml}
            onChange={(event) => setRelatorioHtml(event.target.value)}
            disabled={sendingEmail}
          />
        </div>

        <div className="field-group">
          <label htmlFor="astrologo-email-texto">Relatório (texto puro)</label>
          <textarea
            id="astrologo-email-texto"
            name="astrologoEmailRelatorioTexto"
            className="json-textarea"
            value={relatorioTexto}
            onChange={(event) => setRelatorioTexto(event.target.value)}
            disabled={sendingEmail}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={sendingEmail}>
            {sendingEmail ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            Enviar e-mail
          </button>
        </div>
      </form>

      <article className="result-card">
        <div className="result-toolbar">
          <div>
            <h4><Save size={16} /> Painel de rate limit</h4>
            <p className="field-hint">Políticas por rota com atualização em tempo real e opção de restaurar padrão.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadRateLimit(true)} disabled={loadingRateLimit || updatingRateRoute !== null}>
              {loadingRateLimit ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar rate limit
            </button>
          </div>
        </div>

        {ratePolicies.length === 0 ? (
          <p className="result-empty">Sem policies de rate limit carregadas.</p>
        ) : (
          <ul className="result-list">
            {ratePolicies.map((policy) => {
              const isBusy = updatingRateRoute === policy.route
              return (
                <li key={policy.route} className="post-row">
                  <div className="post-row-main">
                    <strong>{policy.label}</strong>
                    <div className="post-row-meta">
                      <span>rota: {policy.route}</span>
                      <span>janela atual: {policy.stats.total_requests_window} req / {policy.stats.distinct_keys_window} chaves</span>
                      <span>updated at: {policy.updated_at ?? '—'}</span>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="field-group">
                      <label htmlFor={`astrologo-rate-enabled-${policy.route}`}>Escudo habilitado</label>
                      <select
                        id={`astrologo-rate-enabled-${policy.route}`}
                        name={`astrologoRateEnabled${policy.route}`}
                        value={policy.enabled ? '1' : '0'}
                        onChange={(event) => handleRatePolicyChange(policy.route, 'enabled', event.target.value === '1')}
                        disabled={isBusy}
                      >
                        <option value="1">Ativo</option>
                        <option value="0">Inativo</option>
                      </select>
                    </div>

                    <div className="field-group">
                      <label htmlFor={`astrologo-rate-max-${policy.route}`}>Máx. requisições/IP</label>
                      <input
                        id={`astrologo-rate-max-${policy.route}`}
                        name={`astrologoRateMax${policy.route}`}
                        type="number"
                        min={1}
                        max={500}
                        value={policy.max_requests}
                        onChange={(event) => handleRatePolicyChange(policy.route, 'max_requests', Number(event.target.value))}
                        disabled={isBusy}
                      />
                    </div>

                    <div className="field-group">
                      <label htmlFor={`astrologo-rate-window-${policy.route}`}>Janela (min)</label>
                      <input
                        id={`astrologo-rate-window-${policy.route}`}
                        name={`astrologoRateWindow${policy.route}`}
                        type="number"
                        min={1}
                        max={1440}
                        value={policy.window_minutes}
                        onChange={(event) => handleRatePolicyChange(policy.route, 'window_minutes', Number(event.target.value))}
                        disabled={isBusy}
                      />
                    </div>
                  </div>

                  <div className="post-row-actions">
                    <button type="button" className="ghost-button" onClick={() => void persistRatePolicy(policy.route, 'update')} disabled={isBusy}>
                      {isBusy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                      Salvar policy
                    </button>
                    <button type="button" className="ghost-button" onClick={() => void persistRatePolicy(policy.route, 'restore_default')} disabled={isBusy}>
                      {isBusy ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                      Restaurar padrão
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </article>

      <SyncStatusCard
        module="astrologo"
        endpoint="/api/astrologo/sync"
        title="Sync manual do Astrólogo"
        description="Replica mapas do legado para o `bigdata_db`, com dry run opcional para conferência antes da escrita."
      />
    </section>
  )
}