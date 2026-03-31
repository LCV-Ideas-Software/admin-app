/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Database, Loader2, RefreshCw, Save, BrainCircuit } from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { useModuleConfig } from '../../lib/useModuleConfig'

export interface ItauConfig {
  modeloIA?: string
}

const DEFAULT_CONFIG: ItauConfig = { modeloIA: '' }

export interface GeminiModelItem { id: string; displayName: string; api: string; vision: boolean }

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

export function ItauModule() {
  const { showNotification } = useNotification()
  const withTrace = (message: string, payload?: { request_id?: string }) => (
    payload?.request_id ? `${message} (req ${payload.request_id})` : message
  )

  const [loadingParametros, setLoadingParametros] = useState(false)
  const [savingParametros, setSavingParametros] = useState(false)
  const [adminActor] = useState('admin@app.lcv')
  const [parametrosForm, setParametrosForm] = useState<ParametrosForm>(initialParametrosForm)

  const [config, saveConfig] = useModuleConfig<ItauConfig>('itau-config', DEFAULT_CONFIG, {
    onSaveSuccess: () => showNotification('Configuração salva.', 'success'),
    onSaveError: (err) => showNotification(`Erro ao salvar configuração: ${err}`, 'error'),
  })
  const [geminiModels, setGeminiModels] = useState<GeminiModelItem[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  const carregarModelos = async () => {
    setModelsLoading(true)
    try {
      const res = await fetch('/api/itau/modelos')
      const data = await res.json() as { ok: boolean; models?: GeminiModelItem[] }
      if (data.ok && data.models) setGeminiModels(data.models)
    } catch {
      // ignora erro
    } finally {
      setModelsLoading(false)
    }
  }

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
    void carregarModelos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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





  return (
    <section className="detail-panel module-shell module-shell-itau">
      <div className="detail-header">
        <div className="detail-icon"><Database size={22} /></div>
        <div>
          <h3>Itaú — Calculadora Administrativa</h3>
        </div>
      </div>



      <form className="form-card" onSubmit={handleSaveParametros}>
        <div className="result-toolbar">
          <div>
            <h4><Save size={16} /> Parâmetros vigentes</h4>
            <p className="field-hint">Ajuste de IOF, spreads, calibragem e limites de MAPE.</p>
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

      <div className="form-card" style={{ marginTop: '24px' }}>
        <div className="result-toolbar">
          <div>
            <h4><BrainCircuit size={16} /> Modelos de IA (Gemini)</h4>
            <p className="field-hint">
              Selecione o motor utilizado pelas heurísticas e backtests deste módulo.{' '}
              {!modelsLoading && geminiModels.length > 0 && <>· {geminiModels.length} modelos disponíveis</>}
            </p>
          </div>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <div className="field-group">
            <label htmlFor="itau-modelo-ia">Modelo de Processamento</label>
            <div className="select-wrapper">
              <select 
                id="itau-modelo-ia" 
                value={config.modeloIA || ''} 
                onChange={e => saveConfig({ modeloIA: e.target.value })}
              >
                {modelsLoading ? (
                  <option value={config.modeloIA || ''}>Carregando modelos do Cloudflare...</option>
                ) : (
                  <>
                    <option value="">Automático (Padrão)</option>
                    {geminiModels.length === 0 && config.modeloIA && <option value={config.modeloIA}>{config.modeloIA}</option>}
                    {geminiModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.displayName} {m.vision ? '👁️' : ''} ({m.api})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <p className="field-hint" style={{ marginTop: '8px' }}>
              Esta alteração é persistida no banco de dados e sincronizada entre dispositivos.
            </p>
          </div>
        </div>
      </div>

    </section>
  )
}
