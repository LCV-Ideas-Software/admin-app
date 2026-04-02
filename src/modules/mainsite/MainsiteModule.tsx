/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useCallback, useEffect, useState } from 'react'
import { Suspense, lazy } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle, DollarSign,
  FilePlus2, Globe, GripVertical,
  Loader2, Pencil, Pin, RefreshCw,
  Save, Sparkles, Trash2, X,
  CheckCircle, XCircle,
} from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { PopupPortal } from '../../components/PopupPortal'
import { useModuleConfig } from '../../lib/useModuleConfig'

// Lazy-loaded PostEditor — TipTap chunk only loads when editor is opened
const PostEditor = lazy(() => import('./PostEditor'))



type ManagedPost = {
  id: number
  title: string
  content: string
  author?: string
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

// ── Configuração local do modelo IA (paridade com Calculadora/Oráculo/Astrólogo) ──
interface MainsiteConfig {
  modeloIA?: string
  summaryModeloIA?: string
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

// ── Resumos IA para compartilhamento social ──
type AiSummary = {
  id: number
  post_id: number
  summary_og: string
  summary_ld: string | null
  content_hash: string
  model: string
  is_manual: number
  created_at: string
  updated_at: string
  post_title?: string
}

type BulkDetail = { postId: number; title: string; status: string }

const DEFAULT_MS_CONFIG: MainsiteConfig = { modeloIA: '', summaryModeloIA: '' }

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

  // ── Modelo IA state (D1-persisted) ──
  const [msConfig, saveMsConfig] = useModuleConfig<MainsiteConfig>('mainsite-config', DEFAULT_MS_CONFIG, {
    onSaveSuccess: () => showNotification('Configuração IA salva.', 'success'),
    onSaveError: (err) => showNotification(`Erro ao salvar configuração: ${err}`, 'error'),
  })
  const [geminiModels, setGeminiModels] = useState<GeminiModelItem[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)

  // ── Taxas state ──
  const [fees, setFees] = useState<FeeConfig>(DEFAULT_FEES)
  const [feesLoading, setFeesLoading] = useState(false)
  const [feesSaving, setFeesSaving] = useState(false)

  // ── Resumos IA state ──
  const [summaries, setSummaries] = useState<AiSummary[]>([])
  const [summariesLoading, setSummariesLoading] = useState(false)
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ generated: number; skipped: number; failed: number; total: number; details: BulkDetail[] } | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null)
  const [editingSummaryId, setEditingSummaryId] = useState<number | null>(null)
  const [editOg, setEditOg] = useState('')
  const [editLd, setEditLd] = useState('')
  const [savingSummary, setSavingSummary] = useState(false)
  const [postsWithoutSummary, setPostsWithoutSummary] = useState<Array<{ id: number; title: string }>>([])

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

  // ── Resumos IA handlers ──
  const loadSummaries = useCallback(async (shouldNotify = false) => {
    setSummariesLoading(true)
    try {
      const res = await fetch('/api/mainsite/post-summaries')
      const data = await res.json() as { ok: boolean; summaries?: AiSummary[]; postsWithoutSummary?: Array<{ id: number; title: string }>; error?: string }
      if (!data.ok) throw new Error(data.error ?? 'Falha ao listar resumos.')
      setSummaries(data.summaries || [])
      setPostsWithoutSummary(data.postsWithoutSummary || [])
      if (shouldNotify) showNotification('Resumos IA atualizados.', 'success')
    } catch {
      showNotification('Erro ao carregar resumos IA.', 'error')
    } finally {
      setSummariesLoading(false)
    }
  }, [showNotification])

  const handleBulkGenerate = async (mode: 'missing' | 'all') => {
    setBulkGenerating(true)
    setBulkProgress(null)
    showNotification(`Gerando resumos IA (${mode === 'missing' ? 'apenas ausentes' : 'todos'})... Isso pode levar alguns segundos.`, 'info')
    try {
      const res = await fetch('/api/mainsite/post-summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-all', mode, model: msConfig.summaryModeloIA || undefined }),
      })
      const data = await res.json() as { ok: boolean; generated?: number; skipped?: number; failed?: number; total?: number; details?: BulkDetail[]; error?: string }
      if (!data.ok) throw new Error(data.error ?? 'Falha na geração em massa.')
      setBulkProgress({
        generated: data.generated ?? 0,
        skipped: data.skipped ?? 0,
        failed: data.failed ?? 0,
        total: data.total ?? 0,
        details: data.details ?? [],
      })
      showNotification(`Geração concluída: ${data.generated} gerados, ${data.skipped} pulados, ${data.failed} falhas.`, data.failed ? 'error' : 'success')
      await loadSummaries()
    } catch (err) {
      showNotification(`Erro na geração em massa: ${err instanceof Error ? err.message : 'Erro desconhecido.'}`, 'error')
    } finally {
      setBulkGenerating(false)
    }
  }

  const handleRegenerate = async (postId: number) => {
    setRegeneratingId(postId)
    showNotification('Regenerando resumo IA...', 'info')
    try {
      const res = await fetch('/api/mainsite/post-summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate', postId, model: msConfig.summaryModeloIA || undefined }),
      })
      const data = await res.json() as { ok: boolean; summary_og?: string; error?: string }
      if (!data.ok) throw new Error(data.error ?? 'Falha na regeneração.')
      showNotification('Resumo regenerado com sucesso.', 'success')
      await loadSummaries()
    } catch (err) {
      showNotification(`Erro ao regenerar: ${err instanceof Error ? err.message : 'Erro'}`, 'error')
    } finally {
      setRegeneratingId(null)
    }
  }

  const handleSaveSummaryEdit = async (postId: number) => {
    if (!editOg.trim()) {
      showNotification('O resumo OG é obrigatório.', 'error')
      return
    }
    setSavingSummary(true)
    try {
      const res = await fetch('/api/mainsite/post-summaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', postId, summary_og: editOg, summary_ld: editLd }),
      })
      const data = await res.json() as { ok: boolean; error?: string }
      if (!data.ok) throw new Error(data.error ?? 'Falha ao salvar edição.')
      showNotification('Resumo editado e marcado como override manual.', 'success')
      setEditingSummaryId(null)
      await loadSummaries()
    } catch (err) {
      showNotification(`Erro ao salvar: ${err instanceof Error ? err.message : 'Erro'}`, 'error')
    } finally {
      setSavingSummary(false)
    }
  }

  const startEdit = (s: AiSummary) => {
    setEditingSummaryId(s.post_id)
    setEditOg(s.summary_og)
    setEditLd(s.summary_ld || '')
  }

  useEffect(() => {
    void loadManagedPosts()
    void loadPublicSettings()
    void carregarModelos()
    void carregarTaxas()
    void loadSummaries()
  }, [loadManagedPosts, loadPublicSettings, loadSummaries])

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
  const handleSavePost = async (title: string, author: string, htmlContent: string): Promise<boolean> => {
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
          author,
          content: htmlContent,
          adminActor,
        }),
      })

      const nextPayload = await response.json() as { ok: boolean; error?: string; request_id?: string; post?: { id: number } }

      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao salvar o post do MainSite.')
      }

      await loadManagedPosts()
      showNotification(withTrace(isEditing ? 'Post do MainSite atualizado com sucesso.' : 'Post do MainSite criado com sucesso.', nextPayload), 'success')
      
      // Auto-trigger SEO summary generation using Fire and Forget
      const targetPostId = isEditing ? editingPostId : nextPayload.post?.id
      if (targetPostId) {
        fetch('/api/mainsite/post-summaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'regenerate', postId: targetPostId, model: msConfig.summaryModeloIA || undefined }),
        }).then(() => loadSummaries()).catch(console.error)
      }

      return true
    } catch {
      showNotification('Não foi possível salvar o post do MainSite.', 'error')
      return false
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
      {confirmDelete.show && createPortal(
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-label="Confirmar exclusão">
          <div className="admin-modal-content">
            <button type="button" title="Fechar diálogo" className="admin-modal-close" onClick={() => setConfirmDelete({ show: false, id: null, title: '' })}>
              <X size={24} />
            </button>
            <div className="admin-modal-header">
              <div className="admin-modal-icon admin-modal-icon--danger">
                <AlertTriangle size={24} />
              </div>
              <h2 className="admin-modal-title">Excluir post</h2>
              <p className="admin-modal-subtitle">Deseja apagar permanentemente o post &ldquo;{confirmDelete.title}&rdquo;?</p>
            </div>
            <div className="admin-modal-form">
              <div className="admin-modal-actions">
                <button type="button" className="admin-modal-btn admin-modal-btn--ghost" onClick={() => setConfirmDelete({ show: false, id: null, title: '' })}>
                  Cancelar
                </button>
                <button type="button" className="admin-modal-btn admin-modal-btn--danger" onClick={() => void executeDeletePost()}>
                  Apagar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
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
            initialAuthor={editingPostId ? managedPosts.find(p => p.id === editingPostId)?.author ?? '' : ''}
            initialContent={editingPostContent}
            savingPost={savingPost}
            showNotification={showNotification}
            onSave={(title, author, html) => handleSavePost(title, author, html)}
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

      {/* ── Resumos IA para Compartilhamento Social ── */}
      <div className="form-card" style={{ marginTop: '24px' }}>
        <div className="result-toolbar">
          <div>
            <h4><Sparkles size={16} /> Resumos IA — Compartilhamento Social</h4>
            <p className="field-hint">
              Resumos gerados automaticamente por IA para previews de links em redes sociais (WhatsApp, Facebook, Twitter, etc.).
              {summaries.length > 0 && <> · {summaries.length} resumos gerados</>}
              {postsWithoutSummary.length > 0 && <> · <strong style={{ color: 'var(--color-warning, #f59e0b)' }}>{postsWithoutSummary.length} posts sem resumo</strong></>}
            </p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadSummaries(true)} disabled={summariesLoading}>
              {summariesLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar
            </button>
          </div>
        </div>

        {/* Ações de geração em massa */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
          <button
            type="button"
            className="primary-button"
            disabled={bulkGenerating}
            onClick={() => void handleBulkGenerate('missing')}
          >
            {bulkGenerating ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
            Gerar Ausentes
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={bulkGenerating}
            onClick={() => void handleBulkGenerate('all')}
          >
            {bulkGenerating ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            Regenerar Todos
          </button>
        </div>

        {/* Modelo IA para geração de resumos */}
        <div className="form-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)', marginBottom: '16px' }}>
          <div className="field-group">
            <label htmlFor="summary-modelo-ia">Modelo de Geração de Resumos</label>
            <div className="select-wrapper">
              <select
                id="summary-modelo-ia"
                name="summaryModeloIa"
                value={msConfig.summaryModeloIA || ''}
                onChange={e => saveMsConfig({ summaryModeloIA: e.target.value })}
                disabled={bulkGenerating}
              >
                {modelsLoading ? (
                  <option value={msConfig.summaryModeloIA || ''}>Carregando modelos...</option>
                ) : (
                  <>
                    <option value="">Automático (Padrão)</option>
                    {geminiModels.length === 0 && msConfig.summaryModeloIA && <option value={msConfig.summaryModeloIA}>{msConfig.summaryModeloIA}</option>}
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
              Motor Gemini utilizado para gerar os resumos de compartilhamento social (OG e LD).
            </p>
          </div>
        </div>

        {/* Progresso da geração em massa */}
        {bulkGenerating && (
          <div className="result-card" style={{ padding: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={20} className="spin" style={{ color: 'var(--color-primary, #4285f4)' }} />
            <span style={{ fontSize: '14px', opacity: 0.85 }}>Gerando resumos via Gemini... Isso pode levar alguns segundos por post.</span>
          </div>
        )}

        {/* Resultado da última geração em massa */}
        {bulkProgress && !bulkGenerating && (
          <div className="result-card" style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              {bulkProgress.failed === 0
                ? <CheckCircle size={18} style={{ color: 'var(--color-success, #34a853)' }} />
                : <XCircle size={18} style={{ color: 'var(--color-error, #ea4335)' }} />
              }
              <strong style={{ fontSize: '14px' }}>
                Geração concluída — {bulkProgress.generated} gerados, {bulkProgress.skipped} pulados{bulkProgress.failed > 0 && `, ${bulkProgress.failed} falhas`}
              </strong>
            </div>
            {bulkProgress.details.length > 0 && (
              <details style={{ fontSize: '13px' }}>
                <summary style={{ cursor: 'pointer', opacity: 0.7, marginBottom: '8px' }}>Ver detalhes ({bulkProgress.details.length} posts)</summary>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
                  {bulkProgress.details.map(d => (
                    <li key={d.postId} style={{ padding: '4px 0', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(128,128,128,0.1)' }}>
                      {d.status === 'generated'
                        ? <CheckCircle size={14} style={{ color: 'var(--color-success, #34a853)', flexShrink: 0 }} />
                        : d.status.startsWith('skipped')
                          ? <span style={{ color: 'var(--color-text-muted, #999)', flexShrink: 0 }}>⏭️</span>
                          : <XCircle size={14} style={{ color: 'var(--color-error, #ea4335)', flexShrink: 0 }} />
                      }
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{d.postId} {d.title}</span>
                      <span className={`badge ${d.status === 'generated' ? 'badge-em-implantacao' : 'badge-planejado'}`} style={{ fontSize: '11px', flexShrink: 0 }}>
                        {d.status.replace('skipped_', '').replace('_', ' ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Lista de resumos existentes */}
        {summariesLoading ? (
          <div className="module-loading" style={{ padding: '24px' }}><Loader2 size={24} className="spin" /></div>
        ) : summaries.length === 0 ? (
          <p className="result-empty">Nenhum resumo gerado ainda. Use o botão &ldquo;Gerar Ausentes&rdquo; para gerar resumos para todos os posts existentes.</p>
        ) : (
          <ul className="result-list astro-akashico-scroll" style={{ maxHeight: '500px' }}>
            {summaries.map(s => {
              const isEditing = editingSummaryId === s.post_id
              const isRegenerating = regeneratingId === s.post_id
              return (
                <li key={s.post_id} className="post-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        #{s.post_id} {s.post_title || '(sem título)'}
                      </strong>
                      <span style={{ fontSize: '12px', opacity: 0.6 }}>
                        {s.is_manual ? '✋ Manual' : '🤖 IA'} · {s.model} · Atualizado {new Date(s.updated_at + (s.updated_at.includes('Z') ? '' : 'Z')).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                      </span>
                    </div>
                    <div className="post-row-actions" style={{ flexShrink: 0, display: 'flex', gap: '4px' }}>
                      <button type="button" className="ghost-button" onClick={() => void handleRegenerate(s.post_id)} disabled={isRegenerating || bulkGenerating} title="Regenerar via IA">
                        {isRegenerating ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                      </button>
                      <button type="button" className="ghost-button" onClick={() => startEdit(s)} disabled={isRegenerating || bulkGenerating} title="Editar manualmente">
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', background: 'rgba(128,128,128,0.05)', borderRadius: '8px' }}>
                      <div className="field-group">
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>Resumo OG (máx. 200 chars — preview social)</label>
                        <textarea
                          rows={2}
                          maxLength={200}
                          value={editOg}
                          onChange={e => setEditOg(e.target.value)}
                          style={{ fontSize: '13px' }}
                        />
                        <span style={{ fontSize: '11px', opacity: 0.5, textAlign: 'right' }}>{editOg.length}/200</span>
                      </div>
                      <div className="field-group">
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>Resumo LD (máx. 300 chars — Schema.org/SEO)</label>
                        <textarea
                          rows={3}
                          maxLength={300}
                          value={editLd}
                          onChange={e => setEditLd(e.target.value)}
                          style={{ fontSize: '13px' }}
                        />
                        <span style={{ fontSize: '11px', opacity: 0.5, textAlign: 'right' }}>{editLd.length}/300</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" className="primary-button" style={{ fontSize: '13px', padding: '6px 14px' }} disabled={savingSummary} onClick={() => void handleSaveSummaryEdit(s.post_id)}>
                          {savingSummary ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                          Salvar
                        </button>
                        <button type="button" className="ghost-button" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={() => setEditingSummaryId(null)}>
                          <X size={14} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>OG</span>{' '}
                        <span style={{ opacity: 0.85 }}>{s.summary_og}</span>
                      </div>
                      {s.summary_ld && s.summary_ld !== s.summary_og && (
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>LD</span>{' '}
                          <span style={{ opacity: 0.7 }}>{s.summary_ld}</span>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <p className="field-hint" style={{ marginTop: '12px', fontStyle: 'italic', opacity: 0.7 }}>
          Esses resumos são usados automaticamente nos previews de links compartilhados (og:description, twitter:description, Schema.org). Edições manuais não serão sobrescritas pela IA.
        </p>
      </div>

    </section>
  )
}
