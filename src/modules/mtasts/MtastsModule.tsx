import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, Search, ShieldCheck } from 'lucide-react'
import { useNotification } from '../../components/Notification'

type MtastsPayload = {
  ok: boolean
  error?: string
  fonte: 'bigdata_db' | 'legacy-admin'
  filtros: {
    domain: string
    limit: number
  }
  avisos: string[]
  resumo: {
    totalHistorico: number
    totalPolicies: number
  }
  historico: Array<{
    geradoEm: string
    domain: string | null
  }>
  policies: Array<{
    domain: string
    policyText: string
    tlsrptEmail: string | null
    updatedAt: string | null
  }>
}

const initialPayload: MtastsPayload = {
  ok: true,
  fonte: 'bigdata_db',
  filtros: {
    domain: '',
    limit: 30,
  },
  avisos: [],
  resumo: {
    totalHistorico: 0,
    totalPolicies: 0,
  },
  historico: [],
  policies: [],
}

export function MtastsModule() {
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(false)
  const [domain, setDomain] = useState('')
  const [limit, setLimit] = useState('30')
  const [payload, setPayload] = useState<MtastsPayload>(initialPayload)

  const disabled = useMemo(() => loading, [loading])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const query = new URLSearchParams({
      domain,
      limit,
    })

    setLoading(true)
    try {
      const response = await fetch(`/api/mtasts/overview?${query.toString()}`)
      const nextPayload = await response.json() as MtastsPayload

      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao consultar o módulo MTA-STS.')
      }

      setPayload(nextPayload)
      showNotification(`MTA-STS atualizado: ${nextPayload.resumo.totalHistorico} item(ns) de histórico.`, 'success')
      if (Array.isArray(nextPayload.avisos) && nextPayload.avisos.length > 0) {
        showNotification(nextPayload.avisos[0], 'info')
      }
    } catch {
      showNotification('Não foi possível carregar o módulo MTA-STS.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="detail-panel">
      <div className="detail-header">
        <div className="detail-icon"><ShieldCheck size={22} /></div>
        <div>
          <h3>MTA-STS — Histórico e Policies</h3>
          <p>Consulta híbrida no shell: prioriza `bigdata_db` e recua para legado quando necessário.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="mtasts-filtro-domain">Domínio (opcional)</label>
            <input
              id="mtasts-filtro-domain"
              name="mtastsFiltroDomain"
              type="text"
              autoComplete="url"
              placeholder="ex.: lcv.app.br"
              value={domain}
              onChange={(event) => setDomain(event.target.value.toLowerCase())}
            />
          </div>

          <div className="field-group">
            <label htmlFor="mtasts-filtro-limit">Limite</label>
            <input
              id="mtasts-filtro-limit"
              name="mtastsFiltroLimit"
              type="number"
              min={1}
              max={100}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
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
          <div className="metric-icon"><ShieldCheck size={20} /></div>
          <strong>{payload.resumo.totalHistorico}</strong>
          <span>Total de itens de histórico.</span>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><ShieldCheck size={20} /></div>
          <strong>{payload.resumo.totalPolicies}</strong>
          <span>Total de policies carregadas.</span>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><ShieldCheck size={20} /></div>
          <strong>{payload.fonte}</strong>
          <span>Fonte atual de dados.</span>
        </article>
      </section>

      <article className="result-card">
        <header className="result-header">
          <h4><ShieldCheck size={16} /> Histórico recente</h4>
          <span>{payload.historico.length} item(ns)</span>
        </header>

        {payload.historico.length === 0 ? (
          <p className="result-empty">Sem histórico para os filtros atuais.</p>
        ) : (
          <ul className="result-list">
            {payload.historico.map((item, index) => (
              <li key={`${item.geradoEm}-${item.domain ?? 'sem-dominio'}-${index}`}>
                <strong>{item.domain ?? 'sem domínio'}</strong>
                <span>{item.geradoEm}</span>
                <span className="badge badge-em-implantacao">id gerado</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}
