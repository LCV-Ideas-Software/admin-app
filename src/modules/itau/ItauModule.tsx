import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, Database, Loader2, RefreshCw, Save, Search } from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { formatOperationalSourceLabel } from '../../lib/operationalSource'

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
  fonte: 'bigdata_db'
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

export function ItauModule() {
  const { showNotification } = useNotification()
  const withTrace = (message: string, payload?: { request_id?: string }) => (
    payload?.request_id ? `${message} (req ${payload.request_id})` : message
  )

  const [loading, setLoading] = useState(false)
  const [loadingParametros, setLoadingParametros] = useState(false)
  const [savingParametros, setSavingParametros] = useState(false)
  const [moeda, setMoeda] = useState('')
  const [dias, setDias] = useState('7')
  const [adminActor] = useState('admin@app.lcv')
  const [fonte, setFonte] = useState<'bigdata_db'>('bigdata_db')
  const [resumo, setResumo] = useState<Resumo>(initialResumo)
  const [ultimasObservacoes, setUltimasObservacoes] = useState<Observacao[]>([])
  const [parametrosForm, setParametrosForm] = useState<ParametrosForm>(initialParametrosForm)

  const disabled = useMemo(() => loading, [loading])

  const loadParametros = useCallback(async (shouldNotify = false) => {
    setLoadingParametros(true)
    try {
      const response = await fetch('/api/itau/parametros', {
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })
      const payload = await response.json() as { ok: boolean; error?: string; parametros_form?: ParametrosForm }

      if (!response.ok || !payload.ok || !payload.parametros_form) {
        throw new Error(payload.error ?? 'Falha ao carregar parâmetros do Itaú.')
      }

      setParametrosForm(payload.parametros_form)
      if (shouldNotify) {
        showNotification('Parâmetros administrativos do Itaú recarregados.', 'success')
      }
    } catch {
      showNotification('Não foi possível carregar os parâmetros do Itaú.', 'error')
    } finally {
      setLoadingParametros(false)
    }
  }, [adminActor, showNotification])

  useEffect(() => {
    void loadParametros()
  }, [loadParametros])

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
      const response = await fetch('/api/itau/parametros', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({
          ...parametrosForm,
          adminActor,
        }),
      })

      const payload = await response.json() as { ok: boolean; error?: string; request_id?: string }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao salvar parâmetros do Itaú.')
      }

      await loadParametros()
      showNotification(withTrace('Parâmetros administrativos do Itaú salvos com sucesso.', payload), 'success')
    } catch {
      showNotification('Não foi possível salvar os parâmetros do Itaú.', 'error')
    } finally {
      setSavingParametros(false)
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
      const response = await fetch(`/api/itau/overview?${query.toString()}`)
      const payload = await response.json() as ApiResponse

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao consultar o módulo Itaú.')
      }

      setResumo(payload.resumo)
      setFonte(payload.fonte)
      setUltimasObservacoes(payload.ultimasObservacoes)

      showNotification(`Itaú atualizado com ${payload.resumo.observacoesJanela} observação(ões) na janela.`, 'success')
      if (Array.isArray(payload.avisos) && payload.avisos.length > 0) {
        showNotification(payload.avisos[0], 'info')
      }
    } catch {
      showNotification('Não foi possível carregar o módulo Itaú.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="detail-panel module-shell module-shell-itau">
      <div className="detail-header">
        <div className="detail-icon"><Database size={22} /></div>
        <div>
          <h3>Itaú Calculadora — Admin</h3>
          <p>Leitura operacional interna no shell unificado via `bigdata_db`.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">

          <div className="field-group">
            <label htmlFor="itau-filtro-moeda">Moeda (opcional)</label>
            <input
              id="itau-filtro-moeda"
              name="itauFiltroMoeda"
              type="text"
              autoComplete="off"
              placeholder="Ex.: USD"
              value={moeda}
              onChange={(event) => setMoeda(event.target.value.toUpperCase())}
            />
          </div>

          <div className="field-group">
            <label htmlFor="itau-filtro-dias">Janela em dias</label>
            <input
              id="itau-filtro-dias"
              name="itauFiltroDias"
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


      <article className="result-card">
        <header className="result-header">
          <h4><Activity size={16} /> Telemetria e últimas observações do backtest</h4>
          <span>fonte: {formatOperationalSourceLabel(fonte)}</span>
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
            <h4><Save size={16} /> Parâmetros vigentes</h4>
            <p className="field-hint">Ajuste de IOF, spreads, calibragem e limites de MAPE com persistência no `BIGDATA_DB`.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadParametros(true)} disabled={loadingParametros || savingParametros}>
              {loadingParametros ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Atualizar
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="itau-param-iof-cartao">IOF Cartão (%)</label>
            <input id="itau-param-iof-cartao" name="itauParamIofCartao" type="number" step="0.0001" value={parametrosForm.iof_cartao_percent} onChange={(event) => handleParametroChange('iof_cartao_percent', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="itau-param-iof-global">IOF Global (%)</label>
            <input id="itau-param-iof-global" name="itauParamIofGlobal" type="number" step="0.0001" value={parametrosForm.iof_global_percent} onChange={(event) => handleParametroChange('iof_global_percent', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="itau-param-spread-cartao">Spread Cartão (%)</label>
            <input id="itau-param-spread-cartao" name="itauParamSpreadCartao" type="number" step="0.0001" value={parametrosForm.spread_cartao_percent} onChange={(event) => handleParametroChange('spread_cartao_percent', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="itau-param-spread-aberto">Spread Global Aberto (%)</label>
            <input id="itau-param-spread-aberto" name="itauParamSpreadAberto" type="number" step="0.0001" value={parametrosForm.spread_global_aberto_percent} onChange={(event) => handleParametroChange('spread_global_aberto_percent', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="itau-param-spread-fechado">Spread Global Fechado (%)</label>
            <input id="itau-param-spread-fechado" name="itauParamSpreadFechado" type="number" step="0.0001" value={parametrosForm.spread_global_fechado_percent} onChange={(event) => handleParametroChange('spread_global_fechado_percent', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="itau-param-calibragem">Fator de calibragem</label>
            <input id="itau-param-calibragem" name="itauParamCalibragem" type="number" step="0.00001" value={parametrosForm.fator_calibragem_global} onChange={(event) => handleParametroChange('fator_calibragem_global', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="itau-param-mape-boa">MAPE Boa (%)</label>
            <input id="itau-param-mape-boa" name="itauParamMapeBoa" type="number" step="0.0001" value={parametrosForm.backtest_mape_boa_percent} onChange={(event) => handleParametroChange('backtest_mape_boa_percent', event.target.value)} disabled={savingParametros} />
          </div>
          <div className="field-group">
            <label htmlFor="itau-param-mape-atencao">MAPE Atenção (%)</label>
            <input id="itau-param-mape-atencao" name="itauParamMapeAtencao" type="number" step="0.0001" value={parametrosForm.backtest_mape_atencao_percent} onChange={(event) => handleParametroChange('backtest_mape_atencao_percent', event.target.value)} disabled={savingParametros} />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={savingParametros || loadingParametros}>
            {savingParametros ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            Salvar parâmetros
          </button>
        </div>
      </form>

    </section>
  )
}
