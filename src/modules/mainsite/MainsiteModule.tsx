import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, Globe, Loader2, Search } from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { SyncStatusCard } from '../../components/SyncStatusCard'

type OverviewPayload = {
  ok: boolean
  error?: string
  fonte: 'bigdata_db' | 'legacy-worker'
  filtros: {
    limit: number
  }
  avisos: string[]
  resumo: {
    totalPosts: number
    totalPinned: number
    totalFinancialLogs: number | null
    totalApprovedFinancialLogs: number | null
  }
  ultimosPosts: Array<{
    id: number
    title: string
    createdAt: string
    isPinned: boolean
  }>
}

const initialPayload: OverviewPayload = {
  ok: true,
  fonte: 'bigdata_db',
  filtros: { limit: 20 },
  avisos: [],
  resumo: {
    totalPosts: 0,
    totalPinned: 0,
    totalFinancialLogs: null,
    totalApprovedFinancialLogs: null,
  },
  ultimosPosts: [],
}

export function MainsiteModule() {
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(false)
  const [limit, setLimit] = useState('20')
  const [payload, setPayload] = useState<OverviewPayload>(initialPayload)

  const disabled = useMemo(() => loading, [loading])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const query = new URLSearchParams({ limit })

    setLoading(true)
    try {
      const response = await fetch(`/api/mainsite/overview?${query.toString()}`)
      const nextPayload = await response.json() as OverviewPayload

      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao consultar o módulo MainSite.')
      }

      setPayload(nextPayload)
      showNotification(`MainSite atualizado: ${nextPayload.resumo.totalPosts} post(s) no recorte.`, 'success')

      if (Array.isArray(nextPayload.avisos) && nextPayload.avisos.length > 0) {
        showNotification(nextPayload.avisos[0], 'info')
      }
    } catch {
      showNotification('Não foi possível carregar o módulo MainSite.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="detail-panel">
      <div className="detail-header">
        <div className="detail-icon"><Globe size={22} /></div>
        <div>
          <h3>MainSite — Conteúdo e Financeiro</h3>
          <p>Consulta híbrida no shell: prioriza `bigdata_db` e recua para worker legado quando necessário.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="mainsite-filtro-limit">Quantidade de posts</label>
            <input
              id="mainsite-filtro-limit"
              name="mainsiteFiltroLimit"
              type="number"
              min={1}
              max={50}
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
          <div className="metric-icon"><Activity size={20} /></div>
          <strong>{payload.resumo.totalPosts}</strong>
          <span>Total de posts no recorte.</span>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><Globe size={20} /></div>
          <strong>{payload.resumo.totalPinned}</strong>
          <span>Posts fixados.</span>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><Activity size={20} /></div>
          <strong>{payload.resumo.totalApprovedFinancialLogs ?? '—'}</strong>
          <span>Pagamentos aprovados (telemetria financeira).</span>
        </article>
      </section>

      <article className="result-card">
        <header className="result-header">
          <h4><Activity size={16} /> Últimos posts</h4>
          <span>fonte: {payload.fonte}</span>
        </header>

        {payload.ultimosPosts.length === 0 ? (
          <p className="result-empty">Sem posts para os filtros atuais.</p>
        ) : (
          <ul className="result-list">
            {payload.ultimosPosts.map((post) => (
              <li key={post.id}>
                <strong>{post.title}</strong>
                <span>{new Date(post.createdAt).toLocaleString('pt-BR')}</span>
                <span className={`badge ${post.isPinned ? 'badge-em-implantacao' : 'badge-planejado'}`}>
                  {post.isPinned ? 'fixado' : 'normal'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <SyncStatusCard
        module="mainsite"
        endpoint="/api/mainsite/sync"
        title="Sync manual do MainSite"
        description="Sincroniza posts e settings públicos do worker legado para o `bigdata_db`; configs privadas permanecem protegidas até fase posterior."
      />
    </section>
  )
}
