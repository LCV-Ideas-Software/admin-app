import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, AlertTriangle, Database, Loader2, RefreshCw, Save, Search } from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { SyncStatusCard } from '../../components/SyncStatusCard'

type Resumo = {
  totalObservacoes: number
  observacoesJanela: number
  mapeJanelaPercent: number | null
  telemetriaTotal: number
  telemetriaErros: number
  telemetriaCacheHits: number
  telemetriaAvgDurationMs: number | null
  isPlantao: boolean | null
}

type Observacao = {
  createdAt: number
  moeda: string
  erroPercentual: number
}

type ApiResponse = {
  ok: boolean
  error?: string
  fonte: 'bigdata_db' | 'legacy-admin'
  filtros: {
    moeda: string
    dias: number
  }
  avisos: string[]
  resumo: Resumo
  ultimasObservacoes: Observacao[]
}

type ParametrosForm = {
  iof_cartao_percent: number
  iof_global_percent: number
  spread_cartao_percent: number
  spread_global_aberto_percent: number
  spread_global_fechado_percent: number
  fator_calibragem_global: number
  backtest_mape_boa_percent: number
  backtest_mape_atencao_percent: number
}

type RatePolicy = {
  route_key: 'oraculo_ia' | 'enviar_email'
  label: string
  enabled: boolean
  max_requests: number
  window_minutes: number
  updated_at: number
  updated_by: string | null
  defaults: {
    enabled: boolean
    max_requests: number
    window_minutes: number
  }
  stats: {
    total_requests_window: number
    distinct_ips_window: number
  }
}

const initialParametrosForm: ParametrosForm = {
  iof_cartao_percent: 3.5,
  iof_global_percent: 3.5,
  spread_cartao_percent: 5.5,
  spread_global_aberto_percent: 0.78,
  spread_global_fechado_percent: 1.18,
  fator_calibragem_global: 0.99934,
  backtest_mape_boa_percent: 1,
  backtest_mape_atencao_percent: 2,
}

const initialResumo: Resumo = {
  totalObservacoes: 0,
  observacoesJanela: 0,
  mapeJanelaPercent: null,
  telemetriaTotal: 0,
  telemetriaErros: 0,
  telemetriaCacheHits: 0,
  telemetriaAvgDurationMs: null,
  isPlantao: null,
}

export function CalculadoraModule() {
  const { showNotification } = useNotification()

  const [loading, setLoading] = useState(false)
  const [loadingParametros, setLoadingParametros] = useState(false)
  const [savingParametros, setSavingParametros] = useState(false)
  const [loadingRateLimit, setLoadingRateLimit] = useState(false)
  const [updatingRateRoute, setUpdatingRateRoute] = useState<string | null>(null)
  const [moeda, setMoeda] = useState('')
  const [dias, setDias] = useState('7')
  const [fonte, setFonte] = useState<'bigdata_db' | 'legacy-admin'>('bigdata_db')
  const [resumo, setResumo] = useState<Resumo>(initialResumo)
  const [ultimasObservacoes, setUltimasObservacoes] = useState<Observacao[]>([])
  const [parametrosForm, setParametrosForm] = useState<ParametrosForm>(initialParametrosForm)
  const [ratePolicies, setRatePolicies] = useState<RatePolicy[]>([])

  const disabled = useMemo(() => loading, [loading])

  const loadParametros = useCallback(async (shouldNotify = false) => {
    setLoadingParametros(true)
    try {
      const response = await fetch('/api/calculadora/parametros')
      const payload = await response.json() as { ok: boolean; error?: string; parametros_form?: ParametrosForm }

      if (!response.ok || !payload.ok || !payload.parametros_form) {
        throw new Error(payload.error ?? 'Falha ao carregar parâmetros da Calculadora.')
      }

      setParametrosForm(payload.parametros_form)
      if (shouldNotify) {
        showNotification('Parâmetros administrativos do Calculadora recarregados.', 'success')
      }
    } catch {
      showNotification('Não foi possível carregar os parâmetros da Calculadora.', 'error')
    } finally {
      setLoadingParametros(false)
    }
  }, [showNotification])

  const loadRateLimit = useCallback(async (shouldNotify = false) => {
    setLoadingRateLimit(true)
    try {
      const response = await fetch('/api/calculadora/rate-limit')
      const payload = await response.json() as { ok: boolean; error?: string; policies?: RatePolicy[] }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao carregar rate limit do Calculadora.')
      }

      setRatePolicies(Array.isArray(payload.policies) ? payload.policies : [])
      if (shouldNotify) {
        showNotification('Painel de rate limit do Calculadora atualizado.', 'success')
      }
    } catch {
      showNotification('Não foi possível carregar o painel de rate limit do Calculadora.', 'error')
    } finally {
      setLoadingRateLimit(false)
    }
  }, [showNotification])

  useEffect(() => {
    void loadParametros()
    void loadRateLimit()
  }, [loadParametros, loadRateLimit])

  const handleParametroChange = (field: keyof ParametrosForm, value: string) => {
    const parsed = Number(value)
    setParametrosForm((current) => ({
      ...current,
      [field]: Number.isFinite(parsed) ? parsed : 0,
    }))
  }

  const handleSaveParametros = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setSavingParametros(true)
    try {
      const response = await fetch('/api/calculadora/parametros', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parametrosForm),
      })

      const payload = await response.json() as { ok: boolean; error?: string }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao salvar parâmetros da Calculadora.')
      }

      await loadParametros()
      showNotification('Parâmetros administrativos do Calculadora salvos com sucesso.', 'success')
    } catch {
      showNotification('Não foi possível salvar os parâmetros da Calculadora.', 'error')
    } finally {
      setSavingParametros(false)
    }
  }

  const handleRatePolicyChange = (routeKey: RatePolicy['route_key'], field: 'enabled' | 'max_requests' | 'window_minutes', value: boolean | number) => {
    setRatePolicies((current) => current.map((policy) => {
      if (policy.route_key !== routeKey) {
        return policy
      }
      return {
        ...policy,
        [field]: value,
      }
    }))
  }

  const persistRatePolicy = async (routeKey: RatePolicy['route_key'], action: 'update' | 'restore_default') => {
    const policy = ratePolicies.find((item) => item.route_key === routeKey)
    if (!policy) {
      showNotification('Policy de rate limit não encontrada para atualização.', 'error')
      return
    }

    setUpdatingRateRoute(routeKey)
    try {
      const response = await fetch('/api/calculadora/rate-limit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          route_key: routeKey,
          enabled: policy.enabled,
          max_requests: policy.max_requests,
          window_minutes: policy.window_minutes,
        }),
      })

      const payload = await response.json() as { ok: boolean; error?: string; policies?: RatePolicy[] }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao salvar policy de rate limit do Calculadora.')
      }

      setRatePolicies(Array.isArray(payload.policies) ? payload.policies : [])
      showNotification(action === 'restore_default'
        ? `Policy ${routeKey} restaurada para padrão.`
        : `Policy ${routeKey} atualizada com sucesso.`, 'success')
    } catch {
      showNotification('Não foi possível salvar a policy de rate limit do Calculadora.', 'error')
    } finally {
      setUpdatingRateRoute(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const query = new URLSearchParams({
      moeda,
      dias,
    })

    setLoading(true)
    try {
      const response = await fetch(`/api/calculadora/overview?${query.toString()}`)
      const payload = await response.json() as ApiResponse

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao consultar o módulo Calculadora.')
      }

      setResumo(payload.resumo)
      setFonte(payload.fonte)
      setUltimasObservacoes(payload.ultimasObservacoes)

      showNotification(`Calculadora atualizado com ${payload.resumo.observacoesJanela} observação(ões) na janela.`, 'success')
      if (Array.isArray(payload.avisos) && payload.avisos.length > 0) {
        showNotification(payload.avisos[0], 'info')
      }
    } catch {
      showNotification('Não foi possível carregar o módulo Calculadora.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="detail-panel">
      <div className="detail-header">
        <div className="detail-icon"><Database size={22} /></div>
        <div>
          <h3>Calculadora — Observabilidade e Backtest</h3>
          <p>Leitura híbrida no shell unificado: prioriza `bigdata_db` com fallback seguro para legado.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="calculadora-filtro-moeda">Moeda (opcional)</label>
            <input
              id="calculadora-filtro-moeda"
              name="calculadoraFiltroMoeda"
              type="text"
              autoComplete="off"
              placeholder="Ex.: USD"
              value={moeda}
              onChange={(event) => setMoeda(event.target.value.toUpperCase())}
            />
          </div>

          <div className="field-group">
            <label htmlFor="calculadora-filtro-dias">Janela em dias</label>
            <input
              id="calculadora-filtro-dias"
              name="calculadoraFiltroDias"
              type="number"
              min={1}
              max={90}
              value={dias}
              onChange={(event) => setDias(event.target.value)}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={disabled}>
            {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
            Carregar overview
          </button>
        </div>
      </form>

      <section className="metrics-grid">
        <article className="metric-card">
          <div className="metric-icon"><Activity size={20} /></div>
          <strong>{resumo.totalObservacoes}</strong>
          <span>Total de observações em backtest.</span>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><Database size={20} /></div>
          <strong>{resumo.observacoesJanela}</strong>
          <span>Observações na janela selecionada.</span>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><AlertTriangle size={20} /></div>
          <strong>{resumo.mapeJanelaPercent == null ? '—' : `${resumo.mapeJanelaPercent}%`}</strong>
          <span>MAPE médio da janela.</span>
        </article>
      </section>

      <article className="result-card">
        <header className="result-header">
          <h4><Activity size={16} /> Telemetria e últimas observações</h4>
          <span>fonte: {fonte}</span>
        </header>

        <p className="result-empty">
          Telemetria: total {resumo.telemetriaTotal}, erros {resumo.telemetriaErros}, cache hits {resumo.telemetriaCacheHits},
          avg duration {resumo.telemetriaAvgDurationMs == null ? '—' : `${resumo.telemetriaAvgDurationMs}ms`},
          plantão {resumo.isPlantao == null ? 'indisponível' : (resumo.isPlantao ? 'sim' : 'não')}.
        </p>

        {ultimasObservacoes.length === 0 ? (
          <p className="result-empty">Sem observações recentes para os filtros atuais.</p>
        ) : (
          <ul className="result-list">
            {ultimasObservacoes.map((item, index) => (
              <li key={`${item.createdAt}-${item.moeda}-${index}`}>
                <strong>{item.moeda}</strong>
                <span>{new Date(item.createdAt).toLocaleString('pt-BR')}</span>
                <span className="badge badge-em-implantacao">erro: {Number((item.erroPercentual * 100).toFixed(4))}%</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <form className="form-card" onSubmit={handleSaveParametros}>
        <div className="result-toolbar">
          <div>
            <h4><Save size={16} /> Parâmetros administrativos</h4>
            <p className="field-hint">Ajuste de IOF, spreads, calibragem e limites de MAPE com persistência no `CALC_SOURCE_DB`.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadParametros(true)} disabled={loadingParametros || savingParametros}>
              {loadingParametros ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar parâmetros
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="calculadora-param-iof-cartao">IOF Cartão (%)</label>
            <input id="calculadora-param-iof-cartao" name="calculadoraParamIofCartao" type="number" step="0.0001" value={parametrosForm.iof_cartao_percent} onChange={(event) => handleParametroChange('iof_cartao_percent', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="calculadora-param-iof-global">IOF Global (%)</label>
            <input id="calculadora-param-iof-global" name="calculadoraParamIofGlobal" type="number" step="0.0001" value={parametrosForm.iof_global_percent} onChange={(event) => handleParametroChange('iof_global_percent', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="calculadora-param-spread-cartao">Spread Cartão (%)</label>
            <input id="calculadora-param-spread-cartao" name="calculadoraParamSpreadCartao" type="number" step="0.0001" value={parametrosForm.spread_cartao_percent} onChange={(event) => handleParametroChange('spread_cartao_percent', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="calculadora-param-spread-aberto">Spread Global Aberto (%)</label>
            <input id="calculadora-param-spread-aberto" name="calculadoraParamSpreadAberto" type="number" step="0.0001" value={parametrosForm.spread_global_aberto_percent} onChange={(event) => handleParametroChange('spread_global_aberto_percent', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="calculadora-param-spread-fechado">Spread Global Fechado (%)</label>
            <input id="calculadora-param-spread-fechado" name="calculadoraParamSpreadFechado" type="number" step="0.0001" value={parametrosForm.spread_global_fechado_percent} onChange={(event) => handleParametroChange('spread_global_fechado_percent', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="calculadora-param-calibragem">Fator de calibragem</label>
            <input id="calculadora-param-calibragem" name="calculadoraParamCalibragem" type="number" step="0.00001" value={parametrosForm.fator_calibragem_global} onChange={(event) => handleParametroChange('fator_calibragem_global', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="calculadora-param-mape-boa">MAPE Boa (%)</label>
            <input id="calculadora-param-mape-boa" name="calculadoraParamMapeBoa" type="number" step="0.0001" value={parametrosForm.backtest_mape_boa_percent} onChange={(event) => handleParametroChange('backtest_mape_boa_percent', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="calculadora-param-mape-atencao">MAPE Atenção (%)</label>
            <input id="calculadora-param-mape-atencao" name="calculadoraParamMapeAtencao" type="number" step="0.0001" value={parametrosForm.backtest_mape_atencao_percent} onChange={(event) => handleParametroChange('backtest_mape_atencao_percent', event.target.value)} disabled={savingParametros} />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={savingParametros || loadingParametros}>
            {savingParametros ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            Salvar parâmetros
          </button>
        </div>
      </form>

      <article className="result-card">
        <div className="result-toolbar">
          <div>
            <h4><Database size={16} /> Painel de rate limit</h4>
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
              const isBusy = updatingRateRoute === policy.route_key
              return (
                <li key={policy.route_key} className="post-row">
                  <div className="post-row-main">
                    <strong>{policy.label}</strong>
                    <div className="post-row-meta">
                      <span>rota: {policy.route_key}</span>
                      <span>janela atual: {policy.stats.total_requests_window} req / {policy.stats.distinct_ips_window} IPs</span>
                      <span>updated by: {policy.updated_by ?? '—'}</span>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="field-group">
                      <label htmlFor={`calculadora-rate-enabled-${policy.route_key}`}>Escudo habilitado</label>
                      <select
                        id={`calculadora-rate-enabled-${policy.route_key}`}
                        name={`calculadoraRateEnabled${policy.route_key}`}
                        value={policy.enabled ? '1' : '0'}
                        onChange={(event) => handleRatePolicyChange(policy.route_key, 'enabled', event.target.value === '1')}
                        disabled={isBusy}
                      >
                        <option value="1">Ativo</option>
                        <option value="0">Inativo</option>
                      </select>
                    </div>

                    <div className="field-group">
                      <label htmlFor={`calculadora-rate-max-${policy.route_key}`}>Máx. requisições/IP</label>
                      <input
                        id={`calculadora-rate-max-${policy.route_key}`}
                        name={`calculadoraRateMax${policy.route_key}`}
                        type="number"
                        min={1}
                        max={5000}
                        value={policy.max_requests}
                        onChange={(event) => handleRatePolicyChange(policy.route_key, 'max_requests', Number(event.target.value))}
                        disabled={isBusy}
                      />
                    </div>

                    <div className="field-group">
                      <label htmlFor={`calculadora-rate-window-${policy.route_key}`}>Janela (min)</label>
                      <input
                        id={`calculadora-rate-window-${policy.route_key}`}
                        name={`calculadoraRateWindow${policy.route_key}`}
                        type="number"
                        min={1}
                        max={1440}
                        value={policy.window_minutes}
                        onChange={(event) => handleRatePolicyChange(policy.route_key, 'window_minutes', Number(event.target.value))}
                        disabled={isBusy}
                      />
                    </div>
                  </div>

                  <div className="post-row-actions">
                    <button type="button" className="ghost-button" onClick={() => void persistRatePolicy(policy.route_key, 'update')} disabled={isBusy}>
                      {isBusy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                      Salvar policy
                    </button>
                    <button type="button" className="ghost-button" onClick={() => void persistRatePolicy(policy.route_key, 'restore_default')} disabled={isBusy}>
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
        module="calculadora"
        endpoint="/api/calculadora/sync"
        title="Sync manual do Calculadora"
        description="Sincroniza observabilidade e policies de rate limit do legado para o `bigdata_db`, com execução real ou dry run."
      />
    </section>
  )
}
