import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, AlertTriangle, Database, Loader2, Search } from 'lucide-react'
import { useNotification } from '../../components/Notification'

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
  const [moeda, setMoeda] = useState('')
  const [dias, setDias] = useState('7')
  const [fonte, setFonte] = useState<'bigdata_db' | 'legacy-admin'>('bigdata_db')
  const [resumo, setResumo] = useState<Resumo>(initialResumo)
  const [ultimasObservacoes, setUltimasObservacoes] = useState<Observacao[]>([])

  const disabled = useMemo(() => loading, [loading])

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
    </section>
  )
}
