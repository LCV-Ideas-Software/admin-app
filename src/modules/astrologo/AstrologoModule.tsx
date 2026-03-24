import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Copy, Loader2, RefreshCw, Search, Send, Sparkles, Telescope, Trash2 } from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { generateAstrologicalReport } from '../../lib/astrological-report'
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

// Tipos para dados astrológicos parseados (paridade com astrologo-admin)
type AstroData = { astro: string; signo: string; simbolo: string }
type UmbandaData = { posicao: string; orixa: string; simbolo: string }
type DadosGlobais = { tatwa: { principal: string; sub: string }; numerologia: { expressao: number; caminhoVida: number; vibracaoHora: number } }
type DadosSistema = { astrologia: AstroData[]; umbanda: UmbandaData[] }
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


export function AstrologoModule() {
  const { showNotification } = useNotification()
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
  const [emailDestino, setEmailDestino] = useState('')
  const [nomeConsulente, setNomeConsulente] = useState('')
  const [relatorioHtml, setRelatorioHtml] = useState('')
  const [relatorioTexto, setRelatorioTexto] = useState('')
  const [copiedField, setCopiedField] = useState<'html' | 'texto' | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDelete | null>(null)

  // Dados parseados para o viewer estruturado
  const parsedData = useMemo(() => {
    if (!selectedMapa) return null
    try {
      const globais = selectedMapa.dados_globais ? JSON.parse(selectedMapa.dados_globais) as DadosGlobais : null
      const tropical = selectedMapa.dados_tropical ? JSON.parse(selectedMapa.dados_tropical) as DadosSistema : null
      const astronomica = selectedMapa.dados_astronomica ? JSON.parse(selectedMapa.dados_astronomica) as DadosSistema : null
      return { globais, tropical, astronomica }
    } catch {
      return null
    }
  }, [selectedMapa])

  const disabled = useMemo(() => loading, [loading])

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

      const payload = await response.json() as { ok: boolean; error?: string; mapa?: MapaDetalhado; request_id?: string }

      if (!response.ok || !payload.ok || !payload.mapa) {
        throw new Error(payload.error ?? 'Falha ao ler mapa do Astrólogo.')
      }

      setSelectedMapa(payload.mapa)
      
      // Auto-generate astrological reports
      try {
        const report = generateAstrologicalReport(payload.mapa, 'completo')
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

  const handleDeleteMapa = async (id: string, nome: string) => {
    setConfirmDelete({ show: true, id, nome })
  }

  const executeDeleteMapa = async (id: string) => {
    setConfirmDelete(null)
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

      const payload = await response.json() as { ok: boolean; error?: string; request_id?: string }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao excluir mapa do Astrólogo.')
      }

      setItems((current) => current.filter((item) => item.id !== id))
      setSelectedMapa((current) => (current?.id === id ? null : current))
      showNotification(withTrace('Mapa excluído com sucesso.', payload), 'success')
    } catch {
      showNotification('Não foi possível excluir o mapa selecionado.', 'error')
    } finally {
      setDeletingMapaId(null)
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

      const payload = await response.json() as { ok: boolean; error?: string; request_id?: string }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao enviar e-mail do Astrólogo.')
      }

      showNotification(withTrace('E-mail enviado com sucesso para o consulente.', payload), 'success')
    } catch {
      showNotification('Não foi possível enviar o e-mail do Astrólogo.', 'error')
    } finally {
      setSendingEmail(false)
    }
  }

  const copyReportToClipboard = async (field: 'html' | 'texto') => {
    const text = field === 'html' ? relatorioHtml : relatorioTexto
    if (!text.trim()) {
      showNotification(`Relatório em ${field} está vazio.`, 'error')
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      showNotification(`Relatório (${field}) copiado para clipboard.`, 'success')
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      showNotification('Falha ao copiar para clipboard.', 'error')
    }
  }

  const restoreDefaultReport = () => {
    if (!selectedMapa) {
      showNotification('Selecione um mapa antes de restaurar o padrão.', 'error')
      return
    }

    try {
      const report = generateAstrologicalReport(selectedMapa, 'completo')
      setRelatorioHtml(report.html)
      setRelatorioTexto(report.text)
      showNotification('Relatórios restaurados para padrão.', 'success')
    } catch {
      showNotification('Falha ao restaurar relatório padrão.', 'error')
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
    <section className="detail-panel module-shell module-shell-astrologo">
      <div className="detail-header">
        <div className="detail-icon"><Sparkles size={22} /></div>
        <div>
          <h3>Câmara do Mestre — Astrólogo</h3>
          <p>Arquivo Akáshico, leitura operacional e governança no shell unificado.</p>
        </div>
      </div>

      {/* Dialog de confirmação de exclusão */}
      {confirmDelete?.show && (
        <div className="confirm-overlay">
          <article className="confirm-dialog">
            <div className="confirm-dialog__icon"><Trash2 size={28} /></div>
            <h4>Atenção Crítica</h4>
            <p>Você está prestes a expurgar o registro de <strong>{confirmDelete.nome}</strong>. Esta ação não poderá ser desfeita.</p>
            <div className="confirm-dialog__actions">
              <button type="button" className="ghost-button" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button type="button" className="primary-button danger" onClick={() => void executeDeleteMapa(confirmDelete.id)}>
                <Trash2 size={16} /> Apagar
              </button>
            </div>
          </article>
        </div>
      )}

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
                    <button type="button" className="ghost-button" onClick={() => void handleReadMapa(item.id)} disabled={loadingMapaId === item.id || deletingMapaId === item.id}>
                      {loadingMapaId === item.id ? <Loader2 size={16} className="spin" /> : <Telescope size={16} />}
                      Ler detalhes
                    </button>
                    <button type="button" className="ghost-button" onClick={() => void handleDeleteMapa(item.id, item.nome)} disabled={deletingMapaId === item.id || loadingMapaId === item.id}>
                      {deletingMapaId === item.id ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                      Excluir
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </article>

      {/* Viewer estruturado do mapa (paridade com astrologo-admin) */}
      {selectedMapa && (
        <>
        <article className="result-card">
          <header className="result-header">
            <h4><Sparkles size={16} /> Ficha Oculta: {selectedMapa.nome}</h4>
            <span>{selectedMapa.data_nascimento ? formatarData(selectedMapa.data_nascimento) : ''} {selectedMapa.hora_nascimento ? `às ${selectedMapa.hora_nascimento}` : ''}</span>
          </header>

          {selectedMapa.local_nascimento && (
            <p className="field-hint astro-local-hint">{selectedMapa.local_nascimento}</p>
          )}

          {parsedData?.globais && (
            <div className="astro-section">
              <div className="form-grid">
                <div className="field-group">
                  <label>Forças Globais: Tatwas</label>
                  <div className="astro-kv-list">
                    <div className="astro-kv"><span className="astro-kv__label">Principal</span><strong>{String(parsedData.globais.tatwa.principal)}</strong></div>
                    <div className="astro-kv"><span className="astro-kv__label">Sub-tatwa</span><strong>{String(parsedData.globais.tatwa.sub)}</strong></div>
                  </div>
                </div>
                <div className="field-group">
                  <label>Forças Globais: Numerologia</label>
                  <div className="astro-kv-list">
                    <div className="astro-kv"><span className="astro-kv__label">Expressão</span><strong>{String(parsedData.globais.numerologia.expressao)}</strong></div>
                    <div className="astro-kv"><span className="astro-kv__label">Caminho</span><strong>{String(parsedData.globais.numerologia.caminhoVida)}</strong></div>
                    <div className="astro-kv"><span className="astro-kv__label">Hora</span><strong>{String(parsedData.globais.numerologia.vibracaoHora)}</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {parsedData?.tropical && (
            <div className="astro-section">
              <h5 className="astro-section__title astro-section__title--tropical">Módulo I: Astrológico Tropical</h5>
              {parsedData.tropical.astrologia?.length > 0 && (
                <>
                  <label>Astrologia ({parsedData.tropical.astrologia.length > 12 ? '13 Signos' : '12 Signos'})</label>
                  <div className="astro-grid astro-grid--4">
                    {parsedData.tropical.astrologia.map((a, i) => (
                      <div key={i} className="astro-card">
                        <span className="astro-card__label">{a.astro}</span>
                        <span className="astro-card__value">{a.simbolo} {a.signo}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {parsedData.tropical.umbanda?.length > 0 && (
                <>
                  <label>Umbanda</label>
                  <div className="astro-grid astro-grid--3">
                    {parsedData.tropical.umbanda.map((u, i) => (
                      <div key={i} className="astro-umbanda-card">
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

          {parsedData?.astronomica && (
            <div className="astro-section">
              <h5 className="astro-section__title astro-section__title--astronomica">Módulo II: Astronômico Constelacional</h5>
              {parsedData.astronomica.astrologia?.length > 0 && (
                <>
                  <label>Astrologia (13 Signos)</label>
                  <div className="astro-grid astro-grid--4">
                    {parsedData.astronomica.astrologia.map((a, i) => (
                      <div key={i} className="astro-card">
                        <span className="astro-card__label">{a.astro}</span>
                        <span className="astro-card__value">{a.simbolo} {a.signo}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {parsedData.astronomica.umbanda?.length > 0 && (
                <>
                  <label>Umbanda</label>
                  <div className="astro-grid astro-grid--3">
                    {parsedData.astronomica.umbanda.map((u, i) => (
                      <div key={i} className="astro-umbanda-card">
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

          {selectedMapa.analise_ia && (
            <div className="astro-section">
              <h5 className="astro-section__title">Síntese do Mestre (IA)</h5>
              <div className="astro-ia-content" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(selectedMapa.analise_ia) }} />
            </div>
          )}

          {/* Ação de compartilhamento (paridade com astrologo-admin — apenas e-mail) */}
          <div className="astro-sharing">
            <button type="button" className="ghost-button" onClick={() => {
              setShowEmailForm((prev) => !prev)
              if (!showEmailForm) {
                setEmailDestino('')
                setNomeConsulente(selectedMapa.nome)
              }
            }}>
              <Send size={16} /> {showEmailForm ? 'Ocultar E-mail' : 'Enviar por E-mail'}
            </button>
          </div>
        </article>

        {/* Envio de e-mail (versão avançada com textareas colapsáveis) — só visível com mapa selecionado e toggle ativo */}
          {showEmailForm && (
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
                  <input id="astrologo-email-destino" name="astrologoEmailDestino" type="email" autoComplete="email" placeholder="consulente@email.com" value={emailDestino} onChange={(event) => setEmailDestino(event.target.value)} disabled={sendingEmail} />
                </div>
                <div className="field-group">
                  <label htmlFor="astrologo-email-nome">Nome do consulente</label>
                  <input id="astrologo-email-nome" name="astrologoEmailNomeConsulente" type="text" autoComplete="name" placeholder="Nome para o assunto" value={nomeConsulente} onChange={(event) => setNomeConsulente(event.target.value)} disabled={sendingEmail} />
                </div>
              </div>

              <details className="astro-email-details">
                <summary>Editar relatório manualmente (avançado)</summary>
                <div className="field-group">
                  <label htmlFor="astrologo-email-html">Relatório (HTML)</label>
                  <textarea id="astrologo-email-html" name="astrologoEmailRelatorioHtml" className="json-textarea" value={relatorioHtml} onChange={(event) => setRelatorioHtml(event.target.value)} disabled={sendingEmail} />
                  <button type="button" className="ghost-button" onClick={() => void copyReportToClipboard('html')} disabled={sendingEmail || !relatorioHtml.trim()}>
                    {copiedField === 'html' ? '✓ Copiado' : <><Copy size={16} /> Copiar HTML</>}
                  </button>
                </div>
                <div className="field-group">
                  <label htmlFor="astrologo-email-texto">Relatório (texto puro)</label>
                  <textarea id="astrologo-email-texto" name="astrologoEmailRelatorioTexto" className="json-textarea" value={relatorioTexto} onChange={(event) => setRelatorioTexto(event.target.value)} disabled={sendingEmail} />
                  <button type="button" className="ghost-button" onClick={() => void copyReportToClipboard('texto')} disabled={sendingEmail || !relatorioTexto.trim()}>
                    {copiedField === 'texto' ? '✓ Copiado' : <><Copy size={16} /> Copiar Texto</>}
                  </button>
                </div>
              </details>

              <div className="form-actions">
                <button type="submit" className="primary-button" disabled={sendingEmail}>
                  {sendingEmail ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                  Enviar e-mail
                </button>
                <button type="button" className="ghost-button" onClick={() => restoreDefaultReport()} disabled={sendingEmail}>
                  <RefreshCw size={16} />
                  Restaurar padrão
                </button>
              </div>
            </form>
          )}
        </>
      )}

    </section>
  )
}
