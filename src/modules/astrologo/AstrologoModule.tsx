import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, Search, Sparkles, Telescope } from 'lucide-react'
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

export function AstrologoModule() {
  const { showNotification } = useNotification()
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState('')
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')
  const [email, setEmail] = useState('')
  const [items, setItems] = useState<MapaResumo[]>([])

  const disabled = useMemo(() => loading, [loading])

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
              <li key={item.id}>
                <strong>{item.nome}</strong>
                <span>{item.dataNascimento}</span>
                <span className={`badge badge-${item.status === 'analisado' ? 'em-implantacao' : item.status === 'novo' ? 'planejado' : 'planejado'}`}>
                  {item.status === 'indisponivel' ? 'status indisponível' : item.status}
                </span>
              </li>
            ))}
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