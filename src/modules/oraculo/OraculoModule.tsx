import { useState, useEffect } from 'react'
import { BrainCircuit, Loader2, Search, Trash2, X } from 'lucide-react'
import { useNotification } from '../../components/Notification'

type TabId = 'lci-lca' | 'tesouro-ipca'

type RegistroLciLca = {
  id: string
  criadoEm: string
  prazoDias: number
  taxaLciLca: number
  aporte: number
  aliquotaIr: number
  cdbEquivalente: number
}

type RegistroTesouroIpca = {
  id: string
  criadoEm: string
  dataCompra: string
  valorInvestido: number
  taxaContratada: number
}

export function OraculoModule() {
  const { showNotification } = useNotification()
  const [activeTab, setActiveTab] = useState<TabId>('lci-lca')
  const [loading, setLoading] = useState(false)
  const [adminActor] = useState('admin@app.lcv')
  const [lciRegistros, setLciRegistros] = useState<RegistroLciLca[]>([])
  const [tesouroRegistros, setTesouroRegistros] = useState<RegistroTesouroIpca[]>([])
  const [totalRegistros, setTotalRegistros] = useState(0)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean, id: string, label: string } | null>(null)

  const carregarRegistros = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/oraculo/listar?tipo=${activeTab}&limit=500`)
      const payload = await response.json() as { ok: boolean, total: number, items: any[] }
      
      if (!response.ok || !payload.ok) {
        throw new Error('Falha ao listar registros do Oráculo.')
      }
      
      if (activeTab === 'lci-lca') {
        setLciRegistros(payload.items as RegistroLciLca[])
      } else {
        setTesouroRegistros(payload.items as RegistroTesouroIpca[])
      }
      setTotalRegistros(payload.total)
    } catch (error) {
      showNotification('Não foi possível carregar os registros do Oráculo.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void carregarRegistros()
  }, [activeTab])

  const executeDelete = async (id: string) => {
    setConfirmDelete(null)
    setDeletingId(id)
    try {
      const response = await fetch('/api/oraculo/excluir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({ id, tipo: activeTab }),
      })

      const payload = await response.json() as { ok: boolean, error?: string }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao excluir registro.')
      }

      if (activeTab === 'lci-lca') {
        setLciRegistros((current) => current.filter((item) => item.id !== id))
      } else {
        setTesouroRegistros((current) => current.filter((item) => item.id !== id))
      }
      setTotalRegistros((prev) => Math.max(0, prev - 1))
      showNotification('Registro excluído com sucesso.', 'success')
    } catch {
      showNotification('Não foi possível excluir o registro selecionado.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const registrosFiltrados = (activeTab === 'lci-lca' ? lciRegistros : tesouroRegistros).filter((registro: any) => {
    const term = searchTerm.toLowerCase()
    if (!term) return true
    const dataHora = new Date(registro.criadoEm ?? '').toLocaleString('pt-BR').toLowerCase()
    if (activeTab === 'lci-lca') {
      return dataHora.includes(term) || String(registro.prazoDias).includes(term) || String(registro.aporte).includes(term) || String(registro.taxaLciLca).includes(term)
    } else {
      return dataHora.includes(term) || (registro.dataCompra ?? '').includes(term) || String(registro.valorInvestido).includes(term) || String(registro.taxaContratada).includes(term)
    }
  })

  return (
    <div className="module-shell">
      <header className="module-shell__header">
        <div className="module-shell__title">
          <BrainCircuit className="h-6 w-6 text-[var(--accent)]" />
          <div className="module-shell__title-text">
            <h2>Oráculo Financeiro</h2>
            <p className="text-sm text-[var(--fg-dim)]">Gestão de simulações e cálculos de oportunidades bancárias</p>
          </div>
        </div>
      </header>

      <div className="module-shell__content">
        <div className="card">
          <div className="tabs mb-4 flex gap-2 border-b border-[var(--border)] pb-2">
            <button
              type="button"
              className={activeTab === 'lci-lca' ? 'primary-button' : 'ghost'}
              onClick={() => setActiveTab('lci-lca')}
            >
              LCI/LCA
            </button>
            <button
              type="button"
              className={activeTab === 'tesouro-ipca' ? 'primary-button' : 'ghost'}
              onClick={() => setActiveTab('tesouro-ipca')}
            >
              Tesouro IPCA+
            </button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 text-lg font-bold">Registros — {activeTab === 'lci-lca' ? 'LCI/LCA' : 'Tesouro IPCA+'}</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-dim)]" />
                <input
                  type="text"
                  placeholder="Filtrar dados..."
                  className="pl-9 pr-4 py-2"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button type="button" className="ghost" onClick={() => carregarRegistros()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
              </button>
            </div>
          </div>

          <div className="table-container pt-4">
            {loading && registrosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--fg-dim)]">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>Carregando registros...</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Data da Análise</th>
                    {activeTab === 'lci-lca' ? (
                      <>
                        <th>Aporte</th>
                        <th>Prazo</th>
                        <th>Taxa (% CDI)</th>
                        <th>Equivalente CDB</th>
                      </>
                    ) : (
                      <>
                        <th>Data Compra</th>
                        <th>Valor Investido</th>
                        <th>Taxa Contratada</th>
                      </>
                    )}
                    <th className="text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'lci-lca' ? 6 : 5} className="text-center py-8 text-[var(--fg-dim)]">
                        Nenhum registro encontrado para o filtro atual.
                      </td>
                    </tr>
                  ) : (
                    registrosFiltrados.map((registro: any) => {
                      const dataFormatada = new Date(registro.criadoEm).toLocaleString('pt-BR')
                      const label = activeTab === 'lci-lca'
                        ? `${dataFormatada} — LCI ${registro.taxaLciLca}% CDI`
                        : `${dataFormatada} — Tesouro ${registro.taxaContratada}% a.a.`

                      return (
                        <tr key={registro.id}>
                          <td>{dataFormatada}</td>
                          {activeTab === 'lci-lca' ? (
                            <>
                              <td>R$ {registro.aporte.toLocaleString('pt-BR')}</td>
                              <td>{registro.prazoDias} dias</td>
                              <td>{registro.taxaLciLca.toFixed(2)}%</td>
                              <td className="font-medium text-[var(--fg)]">{registro.cdbEquivalente.toFixed(2)}%</td>
                            </>
                          ) : (
                            <>
                              <td>{registro.dataCompra.split('-').reverse().join('/')}</td>
                              <td>R$ {registro.valorInvestido.toLocaleString('pt-BR')}</td>
                              <td className="font-medium text-[var(--fg)]">{registro.taxaContratada.toFixed(2)}%</td>
                            </>
                          )}
                          <td className="text-right">
                            <button
                              type="button"
                              className="ghost p-2"
                              title="Excluir"
                              onClick={() => setConfirmDelete({ show: true, id: registro.id, label })}
                              disabled={deletingId === registro.id}
                            >
                              {deletingId === registro.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-[var(--danger)]" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                              )}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            )}
            <div className="mt-4 text-sm text-[var(--fg-dim)] text-right">
              Total na base: {totalRegistros} registro(s)
            </div>
          </div>
        </div>
      </div>

      {confirmDelete?.show && (
        <div className="modal-backdrop fade-in" role="presentation">
          <div className="modal slide-up" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <div className="modal-header">
              <h3 id="delete-title" className="text-lg font-bold">Excluir Registro?</h3>
              <button 
                type="button" 
                className="ghost p-2" 
                onClick={() => setConfirmDelete(null)}
                aria-label="Cancelar exclusão"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 border-b border-[var(--border)] bg-[var(--danger)] bg-opacity-10 text-[var(--danger)]">
              Você está prestes a excluir este registro da base <b>financeiro-db</b> do Oráculo Permanentemente.
              <p className="mt-2 text-sm font-semibold">{confirmDelete.label}</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button bg-[var(--danger)] border-[var(--danger)] hover:opacity-90 active:scale-95 text-white"
                onClick={() => void executeDelete(confirmDelete.id)}
              >
                Sim, excluir registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
