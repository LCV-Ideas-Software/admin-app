import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Suspense, lazy } from 'react'
import {
  Activity, AlertTriangle,
  FilePlus2, Globe, GripVertical,
  Loader2, Pencil, Pin, RefreshCw,
  Save, Search, Trash2,
} from 'lucide-react'
import { useNotification } from '../../components/Notification'

// Lazy-loaded PostEditor — TipTap chunk only loads when editor is opened
const PostEditor = lazy(() => import('./PostEditor'))



type OverviewPayload = {
  ok: boolean
  error?: string
  fonte: 'bigdata_db'
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

type ManagedPost = {
  id: number
  title: string
  content: string
  created_at: string
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
  const withTrace = (message: string, payload?: { request_id?: string }) => (
    payload?.request_id ? `${message} (req ${payload.request_id})` : message
  )
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [savingPost, setSavingPost] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [actionPostId, setActionPostId] = useState<number | null>(null)
  const [limit, setLimit] = useState('20')
  const [adminActor] = useState('admin@app.lcv')
  const [payload, setPayload] = useState<OverviewPayload>(initialPayload)
  const [managedPosts, setManagedPosts] = useState<ManagedPost[]>([])
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [showPostEditor, setShowPostEditor] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const [editingPostContent, setEditingPostContent] = useState('')
  // Structured settings state — only disclaimers (appearance+rotation moved to ConfigModule)
  const [disclaimers, setDisclaimers] = useState<DisclaimersSettings>(DEFAULT_DISCLAIMERS)
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({ show: false, id: null, title: '' })
  const [draggedPostIndex, setDraggedPostIndex] = useState<number | null>(null)

  const disabled = useMemo(() => overviewLoading, [overviewLoading])

  const loadOverview = useCallback(async (shouldNotify = false) => {
    const query = new URLSearchParams({ limit })

    setOverviewLoading(true)
    try {
      const response = await fetch(`/api/mainsite/overview?${query.toString()}`)
      const nextPayload = await response.json() as OverviewPayload

      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao consultar o módulo MainSite.')
      }

      setPayload(nextPayload)

      if (shouldNotify) {
        showNotification(`MainSite atualizado: ${nextPayload.resumo.totalPosts} post(s) no recorte.`, 'success')
      }

      if (Array.isArray(nextPayload.avisos) && nextPayload.avisos.length > 0) {
        showNotification(nextPayload.avisos[0], 'info')
      }
    } catch {
      showNotification('Não foi possível carregar o módulo MainSite.', 'error')
    } finally {
      setOverviewLoading(false)
    }
  }, [limit, showNotification])

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

  useEffect(() => {
    void loadManagedPosts()
    void loadPublicSettings()
  }, [loadManagedPosts, loadPublicSettings])

  const resetPostEditor = () => {
    setEditingPostId(null)
    setEditingPostContent('')
    setShowPostEditor(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    await loadOverview(true)
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

      resetPostEditor()
      await Promise.all([loadManagedPosts(), loadOverview()])
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

      await Promise.all([loadManagedPosts(), loadOverview()])
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

      await Promise.all([loadManagedPosts(), loadOverview()])
      showNotification(withTrace(nextPayload.isPinned ? 'Post fixado com sucesso.' : 'Post desafixado com sucesso.', nextPayload), 'success')
    } catch {
      showNotification('Não foi possível alternar a fixação do post.', 'error')
    } finally {
      setActionPostId(null)
    }
  }

  // Merge-save: fetch current settings to preserve appearance+rotation (managed by ConfigModule)
  const handleSaveSettings = async (event: FormEvent<HTMLFormElement>) => {
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
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label="Confirmar exclusão">
          <div className="confirm-dialog">
            <div className="confirm-dialog__icon">
              <AlertTriangle size={28} />
            </div>
            <h4>Excluir post</h4>
            <p>Deseja apagar permanentemente o post &ldquo;{confirmDelete.title}&rdquo;?</p>
            <div className="confirm-dialog__actions">
              <button type="button" className="ghost-button" onClick={() => setConfirmDelete({ show: false, id: null, title: '' })}>Cancelar</button>
              <button type="button" className="primary-button danger" onClick={() => void executeDeletePost()}>Apagar</button>
            </div>
          </div>
        </div>
      )}

      <form className="form-card form-card--compact" onSubmit={handleSubmit}>
        <div className="overview-inline-form">
          <div className="field-group field-group--fixed-120">
            <label htmlFor="mainsite-filtro-limit">Qtd. posts</label>
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
          <button type="submit" className="primary-button button--align-end" disabled={disabled}>
            {overviewLoading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
            Carregar overview
          </button>
        </div>
      </form>


      <article className="result-card">
        <header className="result-header">
          <h4><Activity size={16} /> Últimos posts</h4>
          <span className="source-badge">{payload.fonte}</span>
        </header>

        {payload.ultimosPosts.length === 0 ? (
          <p className="result-empty">Sem posts para os filtros atuais.</p>
        ) : (
          <ul className="result-list astro-akashico-scroll">
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

      {showPostEditor || editingPostId ? (
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
      ) : (
        <button type="button" className="primary-button" onClick={() => setShowPostEditor(true)}>
          <FilePlus2 size={18} />
          Novo Post
        </button>
      )}

      <article className="result-card">
        <div className="result-toolbar">
          <div>
            <h4><Globe size={16} /> Arquivo de posts operacionais</h4>
            <p className="field-hint">Lista operacional do `bigdata_db` para edição, fixação e exclusão sem sair do cockpit.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadManagedPosts(true)} disabled={postsLoading}>
              {postsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar lista
            </button>
            <button type="button" className="ghost-button" onClick={resetPostEditor} disabled={savingPost}>
              <Pencil size={16} />
              Novo rascunho
            </button>
          </div>
        </div>

        {managedPosts.length === 0 ? (
          <p className="result-empty">Nenhum post encontrado no `bigdata_db`.</p>
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
                    <p className="field-hint">{post.content.length > 220 ? `${post.content.slice(0, 220)}…` : post.content}</p>
                    <div className="post-row-meta">
                      <span>ID #{post.id}</span>
                      <span>{new Date(post.created_at).toLocaleString('pt-BR')}</span>
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
            <p className="field-hint">Gerenciamento de disclaimers do MainSite. Leitura e escrita no `bigdata_db`.</p>
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

    </section>
  )
}
