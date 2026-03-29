import { useCallback, useEffect, useState } from 'react'
import { Suspense, lazy } from 'react'
import {
  AlertTriangle, BrainCircuit, DollarSign,
  FilePlus2, Globe, GripVertical,
  Loader2, Pencil, Pin, RefreshCw,
  Save, Trash2, X,
} from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { PopupPortal } from '../../components/PopupPortal'

// Lazy-loaded PostEditor — TipTap chunk only loads when editor is opened
const PostEditor = lazy(() => import('./PostEditor'))



type ManagedPost = {
  id: number
  title: string
  content: string
  created_at: string
  updated_at?: string
  is_pinned: number | boolean
  display_order?: number
}

type ConfirmDeleteState = {
  show: boolean
  id: number | null
  title: string
}

type DisclaimerItem = {
  id: string
  title: string
  text: string
  buttonText: string
  isDonationTrigger: boolean
}

type DisclaimersSettings = {
  enabled: boolean
  items: DisclaimerItem[]
}

const DEFAULT_DISCLAIMERS: DisclaimersSettings = { enabled: true, items: [] }

// ── Configuração local do modelo IA (paridade com Itaú/Oráculo/Astrólogo) ──
interface MainsiteConfig {
  modeloIA?: string
}

// ── Configuração de taxas dos gateways de pagamento ──
interface FeeConfig {
  sumupRate: number
  sumupFixed: number
  mpRate: number
  mpFixed: number
}

const DEFAULT_FEES: FeeConfig = {
  sumupRate: 0.0267,
  sumupFixed: 0,
  mpRate: 0.0499,
  mpFixed: 0.40,
}

interface GeminiModelItem { id: string; displayName: string; api: string; vision: boolean }

const DEFAULT_MS_CONFIG: MainsiteConfig = { modeloIA: '' }

function loadMsConfig(): MainsiteConfig {
  try {
    const s = localStorage.getItem('mainsite-config')
    return s ? { ...DEFAULT_MS_CONFIG, ...JSON.parse(s) } : DEFAULT_MS_CONFIG
  } catch { return DEFAULT_MS_CONFIG }
}

export function MainsiteModule() {
  const { showNotification } = useNotification()
  const withTrace = (message: string, payload?: { request_id?: string }) => (
    payload?.request_id ? `${message} (req ${payload.request_id})` : message
  )
  const [postsLoading, setPostsLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [savingPost, setSavingPost] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [actionPostId, setActionPostId] = useState<number | null>(null)
  const [adminActor] = useState('admin@app.lcv')
  const [managedPosts, setManagedPosts] = useState<ManagedPost[]>([])
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [showPostEditor, setShowPostEditor] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const [editingPostContent, setEditingPostContent] = useState('')
  // Structured settings state — only disclaimers (appearance+rotation moved to ConfigModule)
  const [disclaimers, setDisclaimers] = useState<DisclaimersSettings>(DEFAULT_DISCLAIMERS)
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({ show: false, id: null, title: '' })
  const [draggedPostIndex, setDraggedPostIndex] = useState<number | null>(null)

  // ── Modelo IA state ──
  const [msConfig, setMsConfig] = useState<MainsiteConfig>(loadMsConfig)
  const [geminiModels, setGeminiModels] = useState<GeminiModelItem[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  // ── Taxas state ──
  const [fees, setFees] = useState<FeeConfig>(DEFAULT_FEES)
  const [feesLoading, setFeesLoading] = useState(false)
  const [feesSaving, setFeesSaving] = useState(false)

  const saveMsConfig = (newValues: Partial<MainsiteConfig>) => {
    setMsConfig(prev => {
      const next = { ...prev, ...newValues }
      localStorage.setItem('mainsite-config', JSON.stringify(next))
      return next
    })
  }

  const carregarModelos = async () => {
    setModelsLoading(true)
    try {
      const res = await fetch('/api/mainsite/modelos')
      const data = await res.json() as { ok: boolean; models?: GeminiModelItem[] }
      if (data.ok && data.models) setGeminiModels(data.models)
    } catch {
      // ignora erro — dropdown mostra fallback
    } finally {
      setModelsLoading(false)
    }
  }


  const loadManagedPosts = useCallback(async (shouldNotify = false) => {
    setPostsLoading(true)
    try {
      const response = await fetch('/api/mainsite/posts', {
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })
      const nextPayload = await response.json() as { ok: boolean; error?: string; posts?: ManagedPost[] }

      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao listar posts do MainSite.')
      }

      setManagedPosts(Array.isArray(nextPayload.posts) ? nextPayload.posts : [])

      if (shouldNotify) {
        showNotification('Lista de posts do MainSite atualizada.', 'success')
      }
    } catch {
      showNotification('Não foi possível listar os posts do MainSite.', 'error')
    } finally {
      setPostsLoading(false)
    }
  }, [adminActor, showNotification])

  const loadPublicSettings = useCallback(async (shouldNotify = false) => {
    setSettingsLoading(true)
    try {
      const response = await fetch('/api/mainsite/settings', {
        headers: { 'X-Admin-Actor': adminActor },
      })
      const nextPayload = await response.json() as { ok: boolean; error?: string; settings?: Record<string, unknown> }

      if (!response.ok || !nextPayload.ok || !nextPayload.settings) {
        throw new Error(nextPayload.error ?? 'Falha ao carregar disclaimers do MainSite.')
      }

      setDisclaimers(nextPayload.settings.disclaimers as DisclaimersSettings ?? DEFAULT_DISCLAIMERS)

      if (shouldNotify) {
        showNotification('Disclaimers do MainSite recarregados.', 'success')
      }
    } catch {
      showNotification('Não foi possível carregar disclaimers do MainSite.', 'error')
    } finally {
      setSettingsLoading(false)
    }
  }, [adminActor, showNotification])

  const carregarTaxas = async () => {
    setFeesLoading(true)
    try {
      const res = await fetch('/api/mainsite/fees')
      const data = await res.json() as { ok: boolean; fees?: FeeConfig }
      if (data.ok && data.fees) setFees(data.fees)
    } catch {
      // usa defaults
    } finally {
      setFeesLoading(false)
    }
  }

  const salvarTaxas = async () => {
    setFeesSaving(true)
    try {
      const res = await fetch('/api/mainsite/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fees),
      })
      const data = await res.json() as { ok: boolean; fees?: FeeConfig; error?: string }
      if (!data.ok) throw new Error(data.error ?? 'Erro desconhecido.')
      if (data.fees) setFees(data.fees)
      showNotification('Taxas salvas com sucesso. O worker usará os novos valores no próximo checkout.', 'success')
    } catch (err) {
      showNotification(`Falha ao salvar taxas: ${err instanceof Error ? err.message : 'Erro desconhecido.'}`, 'error')
    } finally {
      setFeesSaving(false)
    }
  }

  useEffect(() => {
    void loadManagedPosts()
    void loadPublicSettings()
    void carregarModelos()
    void carregarTaxas()
  }, [loadManagedPosts, loadPublicSettings])

  const resetPostEditor = () => {
    setEditingPostId(null)
    setEditingPostContent('')
    setShowPostEditor(false)
  }


  /** Load post content for editing and open the editor */
  const handleEditPost = async (id: number) => {
    setActionPostId(id)
    try {
      const response = await fetch(`/api/mainsite/posts?id=${id}`, {
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })
      const nextPayload = await response.json() as { ok: boolean; error?: string; post?: ManagedPost }

      if (!response.ok || !nextPayload.ok || !nextPayload.post) {
        throw new Error(nextPayload.error ?? 'Falha ao carregar o post para edição.')
      }

      setEditingPostId(nextPayload.post.id)
      setEditingPostContent(nextPayload.post.content)
      setShowPostEditor(true)
      showNotification(`Post #${nextPayload.post.id} carregado para edição.`, 'info')
    } catch {
      showNotification('Não foi possível carregar o post selecionado.', 'error')
    } finally {
      setActionPostId(null)
    }
  }

  /** Called by PostEditor when user submits */
  const handleSavePost = async (title: string, htmlContent: string) => {
    setSavingPost(true)
    try {
      const isEditing = editingPostId !== null
      const response = await fetch('/api/mainsite/posts', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({
          id: editingPostId,
          title,
          content: htmlContent,
          adminActor,
        }),
      })

      const nextPayload = await response.json() as { ok: boolean; error?: string; request_id?: string }

      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao salvar o post do MainSite.')
      }

      await loadManagedPosts()
      showNotification(withTrace(isEditing ? 'Post do MainSite atualizado com sucesso.' : 'Post do MainSite criado com sucesso.', nextPayload), 'success')
    } catch {
      showNotification('Não foi possível salvar o post do MainSite.', 'error')
    } finally {
      setSavingPost(false)
    }
  }

  const requestDeletePost = (id: number, title: string) => {
    setConfirmDelete({ show: true, id, title })
  }

  const executeDeletePost = async () => {
    const { id } = confirmDelete
    setConfirmDelete({ show: false, id: null, title: '' })
    if (!id) return

    setActionPostId(id)
    try {
      const response = await fetch('/api/mainsite/posts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({ id, adminActor }),
      })

      const nextPayload = await response.json() as { ok: boolean; error?: string; request_id?: string }
      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao excluir o post do MainSite.')
      }

      if (editingPostId === id) {
        resetPostEditor()
      }
      if (selectedPostId === id) {
        setSelectedPostId(null)
      }

      await loadManagedPosts()
      showNotification(withTrace('Post do MainSite excluído com sucesso.', nextPayload), 'success')
    } catch {
      showNotification('Não foi possível excluir o post do MainSite.', 'error')
    } finally {
      setActionPostId(null)
    }
  }

  // ── DnD reorder ─────────────────────────────────────────────
  const handlePostDragStart = (index: number) => setDraggedPostIndex(index)
  const handlePostDragEnd = () => setDraggedPostIndex(null)

  const handlePostDrop = async (dropIndex: number) => {
    if (draggedPostIndex === null || draggedPostIndex === dropIndex) return
    const next = [...managedPosts]
    const [dragged] = next.splice(draggedPostIndex, 1)
    next.splice(dropIndex, 0, dragged)
    setManagedPosts(next)
    setDraggedPostIndex(null)

    try {
      const items = next.map((post, idx) => ({ id: post.id, display_order: idx }))
      const response = await fetch('/api/mainsite/posts-reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor },
        body: JSON.stringify({ items, adminActor }),
      })
      const result = await response.json() as { ok: boolean; error?: string }
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'Falha ao reordenar posts.')
      showNotification('Ordem dos posts sincronizada.', 'success')
    } catch {
      showNotification('Erro ao reordenar posts.', 'error')
      void loadManagedPosts()
    }
  }

  const handleTogglePin = async (id: number) => {
    setActionPostId(id)
    try {
      const response = await fetch('/api/mainsite/posts-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({ id, adminActor }),
      })

      const nextPayload = await response.json() as { ok: boolean; error?: string; isPinned?: boolean; request_id?: string }
      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao alternar fixação do post do MainSite.')
      }

      await loadManagedPosts()
      showNotification(withTrace(nextPayload.isPinned ? 'Post fixado com sucesso.' : 'Post desafixado com sucesso.', nextPayload), 'success')
    } catch {
      showNotification('Não foi possível alternar a fixação do post.', 'error')
    } finally {
      setActionPostId(null)
    }
  }

  // Merge-save: fetch current settings to preserve appearance+rotation (managed by ConfigModule)
  const handleSaveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingSettings(true)
    try {
      // 1. Fetch current full settings to preserve appearance + rotation
      const currentRes = await fetch('/api/mainsite/settings', {
        headers: { 'X-Admin-Actor': adminActor },
      })
      const currentPayload = await currentRes.json() as { ok: boolean; settings?: Record<string, unknown> }
      const currentAppearance = currentPayload.settings?.appearance ?? {}
      const currentRotation = currentPayload.settings?.rotation ?? {}

      // 2. Merge: preserve appearance + rotation, update disclaimers
      const response = await fetch('/api/mainsite/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor },
        body: JSON.stringify({
          appearance: currentAppearance,
          rotation: currentRotation,
          disclaimers,
          adminActor,
        }),
      })

      const nextPayload = await response.json() as { ok: boolean; error?: string; request_id?: string }
      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao salvar disclaimers do MainSite.')
      }

      await loadPublicSettings()
      showNotification(withTrace('Disclaimers do MainSite salvos com sucesso.', nextPayload), 'success')
    } catch {
      showNotification('Não foi possível salvar disclaimers do MainSite.', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <section className="detail-panel module-shell module-shell-mainsite">
      <div className="detail-header">
        <div className="detail-icon"><Globe size={22} /></div>
        <div>
          <h3>MainSite — Posts e Conteúdo</h3>
        </div>
      </div>

      {/* ── Diálogo de confirmação ────────────────────── */}
      {confirmDelete.show && (
        <div className="itau-modal-overlay" role="dialog" aria-modal="true" aria-label="Confirmar exclusão">
          <div className="itau-modal-content">
            <button type="button" title="Fechar diálogo" className="itau-modal-close" onClick={() => setConfirmDelete({ show: false, id: null, title: '' })}>
              <X size={24} />
            </button>
            <div className="itau-modal-header">
              <div className="itau-modal-icon itau-modal-icon--danger">
                <AlertTriangle size={24} />
              </div>
              <h2 className="itau-modal-title">Excluir post</h2>
              <p className="itau-modal-subtitle">Deseja apagar permanentemente o post &ldquo;{confirmDelete.title}&rdquo;?</p>
            </div>
            <div className="itau-modal-form">
              <div className="itau-modal-actions">
                <button type="button" className="itau-modal-btn itau-modal-btn--ghost" onClick={() => setConfirmDelete({ show: false, id: null, title: '' })}>
                  Cancelar
                </button>
                <button type="button" className="itau-modal-btn itau-modal-btn--danger" onClick={() => void executeDeletePost()}>
                  Apagar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      <PopupPortal
        isOpen={showPostEditor || editingPostId !== null}
        onClose={resetPostEditor}
        title={editingPostId ? `Editar post #${editingPostId} — LCV Admin` : 'Novo Post — LCV Admin'}
      >
        <Suspense fallback={<div className="module-loading"><Loader2 size={24} className="spin" /></div>}>
          <PostEditor
            editingPostId={editingPostId}
            initialTitle={editingPostId ? managedPosts.find(p => p.id === editingPostId)?.title ?? '' : ''}
            initialContent={editingPostContent}
            savingPost={savingPost}
            adminActor={adminActor}
            showNotification={showNotification}
            onSave={(title, html) => void handleSavePost(title, html)}
            onClose={resetPostEditor}
          />
        </Suspense>
      </PopupPortal>

      <button type="button" className="primary-button" onClick={() => setShowPostEditor(true)}>
        <FilePlus2 size={18} />
        Novo Post
      </button>

      <article className="result-card">
        <div className="result-toolbar">
          <div>
            <h4><Globe size={16} /> Arquivo de posts operacionais</h4>
            <p className="field-hint">Gerencie, edite, fixe e exclua posts diretamente por aqui.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadManagedPosts(true)} disabled={postsLoading}>
              {postsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar lista
            </button>
          </div>
        </div>

        {managedPosts.length === 0 ? (
          <p className="result-empty">Nenhum post encontrado.</p>
        ) : (
          <ul className="result-list astro-akashico-scroll">
            {managedPosts.map((post, index) => {
              const isPinned = Number(post.is_pinned) === 1 || post.is_pinned === true
              const isBusy = actionPostId === post.id
              const isSelected = selectedPostId === post.id
              return (
                <li
                  key={post.id}
                  className={`post-row post-draggable${draggedPostIndex === index ? ' post-draggable--dragging' : ''}${isSelected ? ' post-row--selected' : ''}`}
                  draggable
                  onDragStart={() => handlePostDragStart(index)}
                  onDragEnd={handlePostDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => void handlePostDrop(index)}
                >
                  <div className="post-row-main">
                    <div className="flex-row-center">
                      <GripVertical size={14} className="grip-icon" />
                      <strong>{post.title}</strong>
                    </div>

                    <div className="post-row-meta">
                      <span>ID #{post.id}</span>
                      <span>
                        {(() => {
                          const fmtDate = (raw?: string) => {
                            if (!raw) return null
                            const d = new Date(raw.replace(' ', 'T') + (raw.includes('Z') || raw.includes('+') ? '' : 'Z'))
                            if (isNaN(d.getTime())) return null
                            return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          }
                          const criado = fmtDate(post.created_at)
                          const atualizado = fmtDate(post.updated_at)
                          const showUpdated = atualizado && atualizado !== criado
                          return (
                            <>
                              Publicado em {criado || '—'}
                              {showUpdated && <> | Atualizado em {atualizado}</>}
                            </>
                          )
                        })()}
                      </span>
                      <span className={`badge ${isPinned ? 'badge-em-implantacao' : 'badge-planejado'}`}>
                        {isPinned ? 'fixado' : 'normal'}
                      </span>
                    </div>
                  </div>

                  <div className="post-row-actions">
                    <button type="button" className="ghost-button" onClick={() => { setSelectedPostId(post.id); void handleEditPost(post.id) }} disabled={isBusy || savingPost}>
                      {isBusy ? <Loader2 size={16} className="spin" /> : <Pencil size={16} />}
                      Editar
                    </button>
                    <button type="button" className="ghost-button" onClick={() => void handleTogglePin(post.id)} disabled={isBusy}>
                      {isBusy ? <Loader2 size={16} className="spin" /> : <Pin size={16} />}
                      {isPinned ? 'Desfixar' : 'Fixar'}
                    </button>
                    <button type="button" className="ghost-button" onClick={() => requestDeletePost(post.id, post.title)} disabled={isBusy}>
                      {isBusy ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                      Excluir
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </article>

      <form className="form-card" onSubmit={handleSaveSettings}>
        <div className="result-toolbar">
          <div>
            <h4><Save size={16} /> Janelas de Aviso (Disclaimers)</h4>
            <p className="field-hint">Gerencie os avisos legais exibidos no site principal.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadPublicSettings(true)} disabled={settingsLoading || savingSettings}>
              {settingsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar
            </button>
          </div>
        </div>

        {/* ── Disclaimers ─────────────────────────────────── */}
        <fieldset className="settings-fieldset">
          <legend>Janelas de Aviso (Disclaimers)</legend>
          <label className="toggle-row">
            <input id="disclaimers-enabled" name="disclaimersEnabled" type="checkbox" checked={disclaimers.enabled} onChange={(e) => setDisclaimers({ ...disclaimers, enabled: e.target.checked })} />
            Exibir Janelas de Aviso antes da leitura dos fragmentos
          </label>

          {disclaimers.enabled && (
            <div className="disclaimers-list astro-akashico-scroll">
              {disclaimers.items.map((item, idx) => (
                <div key={item.id} className="disclaimer-card">
                  <div className="disclaimer-card__header">
                    <span className="disclaimer-card__index">AVISO {idx + 1}</span>
                    <button type="button" className="ghost-button danger" onClick={() => {
                      const next = [...disclaimers.items]
                      next.splice(idx, 1)
                      setDisclaimers({ ...disclaimers, items: next })
                    }}><Trash2 size={14} /> Remover</button>
                  </div>
                  <div className="form-grid">
                    <div className="field-group">
                      <label htmlFor={`disc-title-${idx}`}>Título</label>
                      <input id={`disc-title-${idx}`} name={`discTitle_${idx}`} placeholder="Ex: Termos de Leitura" value={item.title} onChange={(e) => {
                        const next = [...disclaimers.items]; next[idx] = { ...next[idx], title: e.target.value }; setDisclaimers({ ...disclaimers, items: next })
                      }} />
                    </div>
                    <div className="field-group">
                      <label htmlFor={`disc-btn-${idx}`}>Texto do Botão</label>
                      <input id={`disc-btn-${idx}`} name={`discBtn_${idx}`} placeholder="Concordo" value={item.buttonText} onChange={(e) => {
                        const next = [...disclaimers.items]; next[idx] = { ...next[idx], buttonText: e.target.value }; setDisclaimers({ ...disclaimers, items: next })
                      }} />
                    </div>
                  </div>
                  <div className="field-group">
                    <label htmlFor={`disc-text-${idx}`}>Texto do aviso</label>
                    <textarea id={`disc-text-${idx}`} name={`discText_${idx}`} rows={3} value={item.text} onChange={(e) => {
                      const next = [...disclaimers.items]; next[idx] = { ...next[idx], text: e.target.value }; setDisclaimers({ ...disclaimers, items: next })
                    }} />
                  </div>
                  <label className="toggle-row donation-trigger">
                    <input id={`disc-trigger-${idx}`} name={`discTrigger_${idx}`} type="checkbox" checked={item.isDonationTrigger} onChange={(e) => {
                      const next = [...disclaimers.items]; next[idx] = { ...next[idx], isDonationTrigger: e.target.checked }; setDisclaimers({ ...disclaimers, items: next })
                    }} />
                    Gatilho de Doação
                  </label>
                </div>
              ))}
              <button type="button" className="ghost-button" onClick={() => setDisclaimers({
                ...disclaimers,
                items: [...disclaimers.items, { id: crypto.randomUUID(), title: '', text: '', buttonText: 'Concordo', isDonationTrigger: false }],
              })}>
                <FilePlus2 size={16} /> Adicionar Novo Aviso
              </button>
            </div>
          )}
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={savingSettings}>
            {savingSettings ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            Salvar disclaimers
          </button>
        </div>
      </form>

      {/* ── Modelos de IA (Gemini) — paridade com Itaú/Oráculo/Astrólogo ── */}
      <div className="form-card" style={{ marginTop: '24px' }}>
        <div className="result-toolbar">
          <div>
            <h4><BrainCircuit size={16} /> Modelos de IA (Gemini)</h4>
            <p className="field-hint">
              Selecione o motor utilizado pelo chatbot e funcionalidades de IA deste módulo.{' '}
              {!modelsLoading && geminiModels.length > 0 && <>· {geminiModels.length} modelos disponíveis</>}
            </p>
          </div>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <div className="field-group">
            <label htmlFor="mainsite-modelo-ia">Modelo de Processamento</label>
            <div className="select-wrapper">
              <select
                id="mainsite-modelo-ia"
                name="mainsiteModeloIa"
                value={msConfig.modeloIA || ''}
                onChange={e => saveMsConfig({ modeloIA: e.target.value })}
              >
                {modelsLoading ? (
                  <option value={msConfig.modeloIA || ''}>Carregando modelos do Cloudflare...</option>
                ) : (
                  <>
                    <option value="">Automático (Padrão)</option>
                    {geminiModels.length === 0 && msConfig.modeloIA && <option value={msConfig.modeloIA}>{msConfig.modeloIA}</option>}
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
              Esta alteração é persistida localmente (no seu navegador) e aplicada instantaneamente sem recarregar a página.
            </p>
          </div>
        </div>
      </div>

      {/* ── Taxas dos Gateways de Pagamento ── */}
      <div className="form-card" style={{ marginTop: '24px' }}>
        <div className="result-toolbar">
          <div>
            <h4><DollarSign size={16} /> Taxas dos Gateways de Pagamento</h4>
            <p className="field-hint">
              Configure as taxas cobradas pela SumUp e Mercado Pago para cálculo automático de repasse ao valor da doação.
            </p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void carregarTaxas()} disabled={feesLoading}>
              {feesLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar
            </button>
          </div>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* SumUp */}
          <fieldset className="settings-fieldset">
            <legend>SumUp</legend>
            <div className="field-group">
              <label htmlFor="sumup-fee-rate">Taxa Percentual (%)</label>
              <input
                id="sumup-fee-rate"
                name="sumupFeeRate"
                type="number"
                step="0.01"
                min="0"
                max="99.99"
                value={parseFloat((fees.sumupRate * 100).toFixed(4))}
                onChange={e => setFees(prev => ({ ...prev, sumupRate: Math.max(0, Math.min(0.9999, parseFloat(e.target.value) / 100 || 0)) }))}
              />
              <p className="field-hint">Ex: 2.67 = 2,67% por transação</p>
            </div>
            <div className="field-group">
              <label htmlFor="sumup-fee-fixed">Taxa Fixa (R$)</label>
              <input
                id="sumup-fee-fixed"
                name="sumupFeeFixed"
                type="number"
                step="0.01"
                min="0"
                value={fees.sumupFixed}
                onChange={e => setFees(prev => ({ ...prev, sumupFixed: Math.max(0, parseFloat(e.target.value) || 0) }))}
              />
              <p className="field-hint">Valor fixo cobrado por transação (0 = desabilitado)</p>
            </div>
          </fieldset>

          {/* Mercado Pago */}
          <fieldset className="settings-fieldset">
            <legend>Mercado Pago</legend>
            <div className="field-group">
              <label htmlFor="mp-fee-rate">Taxa Percentual (%)</label>
              <input
                id="mp-fee-rate"
                name="mpFeeRate"
                type="number"
                step="0.01"
                min="0"
                max="99.99"
                value={parseFloat((fees.mpRate * 100).toFixed(4))}
                onChange={e => setFees(prev => ({ ...prev, mpRate: Math.max(0, Math.min(0.9999, parseFloat(e.target.value) / 100 || 0)) }))}
              />
              <p className="field-hint">Ex: 4.99 = 4,99% por transação</p>
            </div>
            <div className="field-group">
              <label htmlFor="mp-fee-fixed">Taxa Fixa (R$)</label>
              <input
                id="mp-fee-fixed"
                name="mpFeeFixed"
                type="number"
                step="0.01"
                min="0"
                value={fees.mpFixed}
                onChange={e => setFees(prev => ({ ...prev, mpFixed: Math.max(0, parseFloat(e.target.value) || 0) }))}
              />
              <p className="field-hint">Valor fixo cobrado por transação (ex: R$ 0,40)</p>
            </div>
          </fieldset>
        </div>

        <div className="form-actions" style={{ marginTop: '16px' }}>
          <button type="button" className="primary-button" onClick={() => void salvarTaxas()} disabled={feesSaving}>
            {feesSaving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            Salvar Taxas
          </button>
          <button type="button" className="ghost-button" onClick={() => { setFees(DEFAULT_FEES); showNotification('Taxas restauradas para os valores padrão. Salve para confirmar.', 'info') }}>
            Restaurar Padrão
          </button>
        </div>

        <p className="field-hint" style={{ marginTop: '12px', fontStyle: 'italic', opacity: 0.7 }}>
          Estas taxas são lidas pelo worker em cada checkout para calcular o valor final com repasse. Alterações refletem imediatamente após salvar.
        </p>
      </div>

    </section>
  )
}
