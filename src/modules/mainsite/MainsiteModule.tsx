import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Activity, AlertTriangle, AlignCenter, AlignJustify, AlignLeft, AlignRight,
  Bold, CheckSquare, Code, FilePlus2, Globe, GripVertical,
  Heading1, Heading2, Highlighter, Italic, List, ListOrdered,
  Loader2, Minus, Palette, Pencil, Pin, Quote, RefreshCw,
  Save, Search, Strikethrough, Trash2, Type,
  Underline as UnderlineIcon, WrapText, X,
  Link as LinkIcon, Unlink,
  Subscript as SubIcon, Superscript as SuperIcon,
  Table as TableIcon,
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Highlight } from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import LinkExtension from '@tiptap/extension-link'
import { Placeholder } from '@tiptap/extension-placeholder'
import { CharacterCount } from '@tiptap/extension-character-count'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontFamily } from '@tiptap/extension-font-family'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Typography } from '@tiptap/extension-typography'
import { Dropcursor } from '@tiptap/extension-dropcursor'
import { Markdown } from 'tiptap-markdown'
import { useNotification } from '../../components/Notification'
import { SyncStatusCard } from '../../components/SyncStatusCard'
import type { RateLimitPolicy } from '../../lib/rate-limit-common'

// ── TipTap extensions ─────────────────────────────────────────
const TIPTAP_EXTENSIONS = [
  StarterKit.configure({ dropcursor: false, link: false }),
  Markdown,
  Underline,
  Highlight,
  Subscript,
  Superscript,
  TextStyle,
  Color,
  FontFamily,
  Typography,
  TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'justify' }),
  Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
  TaskList, TaskItem.configure({ nested: true }),
  Dropcursor.configure({ color: '#3b82f6', width: 2 }),
  CharacterCount,
  Placeholder.configure({ placeholder: 'Comece a escrever o conteúdo do post...' }),
  LinkExtension.configure({ openOnClick: false, autolink: true, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
]

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

type MainsiteSettingsPayload = {
  appearance: Record<string, unknown>
  rotation: Record<string, unknown>
  disclaimers: Record<string, unknown>
}

// ── Structured settings types ─────────────────────────────────
type AppearanceSettings = {
  allowAutoMode: boolean
  light: { bgColor: string; bgImage: string; fontColor: string; titleColor: string }
  dark: { bgColor: string; bgImage: string; fontColor: string; titleColor: string }
  shared: { fontSize: string; titleFontSize: string; fontFamily: string }
}

type RotationSettings = {
  enabled: boolean
  interval: number
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

const DEFAULT_APPEARANCE: AppearanceSettings = {
  allowAutoMode: true,
  light: { bgColor: '#f8f9fa', bgImage: '', fontColor: '#202124', titleColor: '#1a73e8' },
  dark: { bgColor: '#131314', bgImage: '', fontColor: '#e3e3e3', titleColor: '#8ab4f8' },
  shared: { fontSize: '1rem', titleFontSize: '1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' },
}

const DEFAULT_ROTATION: RotationSettings = { enabled: false, interval: 60 }
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

const normalizePoliciesForCompare = (items: RateLimitPolicy[]) => [...items]
  .sort((a, b) => a.route.localeCompare(b.route))
  .map((policy) => ({
    route: policy.route,
    enabled: Boolean(policy.enabled),
    max_requests: Number(policy.max_requests),
    window_minutes: Number(policy.window_minutes),
  }))

export function MainsiteModule() {
  const { showNotification } = useNotification()
  const withTrace = (message: string, payload?: { request_id?: string }) => (
    payload?.request_id ? `${message} (req ${payload.request_id})` : message
  )
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [loadingRateLimit, setLoadingRateLimit] = useState(false)
  const [updatingRateRoute, setUpdatingRateRoute] = useState<string | null>(null)
  const [savingPost, setSavingPost] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [actionPostId, setActionPostId] = useState<number | null>(null)
  const [limit, setLimit] = useState('20')
  const [adminActor] = useState('admin@app.lcv')
  const [payload, setPayload] = useState<OverviewPayload>(initialPayload)
  const [managedPosts, setManagedPosts] = useState<ManagedPost[]>([])
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const [postTitle, setPostTitle] = useState('')
  // Structured settings state
  const [appearance, setAppearance] = useState<AppearanceSettings>(DEFAULT_APPEARANCE)
  const [rotation, setRotation] = useState<RotationSettings>(DEFAULT_ROTATION)
  const [disclaimers, setDisclaimers] = useState<DisclaimersSettings>(DEFAULT_DISCLAIMERS)
  const [ratePolicies, setRatePolicies] = useState<RateLimitPolicy[]>([])
  const [baselineRatePolicies, setBaselineRatePolicies] = useState<RateLimitPolicy[]>([])
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({ show: false, id: null, title: '' })
  const [draggedPostIndex, setDraggedPostIndex] = useState<number | null>(null)
  const [linkPrompt, setLinkPrompt] = useState<{ show: boolean; url: string; text: string }>({ show: false, url: '', text: '' })

  // TipTap editor instance
  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    content: '',
  })

  const hasUnsavedRatePolicies = useMemo(() => (
    JSON.stringify(normalizePoliciesForCompare(ratePolicies)) !== JSON.stringify(normalizePoliciesForCompare(baselineRatePolicies))
  ), [baselineRatePolicies, ratePolicies])

  const disabled = useMemo(() => overviewLoading, [overviewLoading])

  const loadRateLimit = useCallback(async (shouldNotify = false) => {
    setLoadingRateLimit(true)
    try {
      const response = await fetch('/api/mainsite/rate-limit', {
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })
      const payload = await response.json() as { ok: boolean; error?: string; policies?: RateLimitPolicy[] }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao carregar rate limit do MainSite.')
      }

      const nextPolicies = Array.isArray(payload.policies) ? payload.policies : []
      setRatePolicies(nextPolicies)
      setBaselineRatePolicies(nextPolicies)
      if (shouldNotify) {
        showNotification('Rate limit do MainSite recarregado.', 'success')
      }
    } catch {
      showNotification('Não foi possível carregar rate limit do MainSite.', 'error')
    } finally {
      setLoadingRateLimit(false)
    }
  }, [adminActor, showNotification])

  useEffect(() => {
    if (!hasUnsavedRatePolicies) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedRatePolicies])

  const handleRatePolicyChange = (
    route: RateLimitPolicy['route'],
    field: 'enabled' | 'max_requests' | 'window_minutes',
    value: boolean | number,
  ) => {
    setRatePolicies((current) => current.map((policy) => {
      if (policy.route !== route) {
        return policy
      }

      return {
        ...policy,
        [field]: value,
      }
    }))
  }

  const persistRatePolicy = async (route: RateLimitPolicy['route'], action: 'update' | 'restore_default') => {
    const policy = ratePolicies.find((item) => item.route === route)
    if (!policy) {
      showNotification('Policy de rate limit não encontrada para atualização.', 'error')
      return
    }

    setUpdatingRateRoute(route)
    try {
      const response = await fetch('/api/mainsite/rate-limit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({
          action,
          route,
          enabled: policy.enabled,
          max_requests: policy.max_requests,
          window_minutes: policy.window_minutes,
          adminActor,
        }),
      })

      const payload = await response.json() as { ok: boolean; error?: string; policies?: RateLimitPolicy[]; request_id?: string }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao salvar policy de rate limit do MainSite.')
      }

      const nextPolicies = Array.isArray(payload.policies) ? payload.policies : []
      setRatePolicies(nextPolicies)
      setBaselineRatePolicies(nextPolicies)
      showNotification(action === 'restore_default'
        ? `Policy ${route} restaurada para padrão.`
        : `Policy ${route} atualizada com sucesso.`, 'success')
    } catch {
      showNotification('Não foi possível salvar a policy de rate limit do MainSite.', 'error')
    } finally {
      setUpdatingRateRoute(null)
    }
  }

  const restoreRatePolicyLocal = (route: RateLimitPolicy['route']) => {
    setRatePolicies((current) => current.map((policy) => {
      if (policy.route !== route) {
        return policy
      }

      return {
        ...policy,
        enabled: policy.defaults.enabled,
        max_requests: policy.defaults.max_requests,
        window_minutes: policy.defaults.window_minutes,
      }
    }))
  }

  const restoreAllRatePoliciesLocal = () => {
    setRatePolicies((current) => current.map((policy) => ({
      ...policy,
      enabled: policy.defaults.enabled,
      max_requests: policy.defaults.max_requests,
      window_minutes: policy.defaults.window_minutes,
    })))
    showNotification('Padrões de rate limit restaurados localmente.', 'info')
  }

  const saveAllRatePolicies = async () => {
    if (!hasUnsavedRatePolicies) {
      showNotification('Nenhuma alteração pendente no rate limit.', 'info')
      return
    }

    setUpdatingRateRoute('__all__')
    try {
      const baselineMap = new Map(baselineRatePolicies.map((policy) => [policy.route, policy]))
      const dirtyPolicies = ratePolicies.filter((policy) => {
        const baseline = baselineMap.get(policy.route)
        if (!baseline) {
          return true
        }

        return baseline.enabled !== policy.enabled
          || baseline.max_requests !== policy.max_requests
          || baseline.window_minutes !== policy.window_minutes
      })

      for (const policy of dirtyPolicies) {
        const response = await fetch('/api/mainsite/rate-limit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Actor': adminActor,
          },
          body: JSON.stringify({
            action: 'update',
            route: policy.route,
            enabled: policy.enabled,
            max_requests: policy.max_requests,
            window_minutes: policy.window_minutes,
            adminActor,
          }),
        })

        const payload = await response.json() as { ok: boolean; error?: string }
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? `Falha ao salvar policy ${policy.route} do MainSite.`)
        }
      }

      await loadRateLimit()
      showNotification('Painel de rate limit do MainSite salvo com sucesso.', 'success')
    } catch {
      showNotification('Não foi possível salvar todas as policies de rate limit do MainSite.', 'error')
    } finally {
      setUpdatingRateRoute(null)
    }
  }

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
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })
      const nextPayload = await response.json() as { ok: boolean; error?: string; settings?: MainsiteSettingsPayload }

      if (!response.ok || !nextPayload.ok || !nextPayload.settings) {
        throw new Error(nextPayload.error ?? 'Falha ao carregar os settings públicos do MainSite.')
      }

      setAppearance(nextPayload.settings.appearance as AppearanceSettings ?? DEFAULT_APPEARANCE)
      setRotation(nextPayload.settings.rotation as RotationSettings ?? DEFAULT_ROTATION)
      setDisclaimers(nextPayload.settings.disclaimers as DisclaimersSettings ?? DEFAULT_DISCLAIMERS)

      if (shouldNotify) {
        showNotification('Settings públicos do MainSite recarregados.', 'success')
      }
    } catch {
      showNotification('Não foi possível carregar os settings públicos do MainSite.', 'error')
    } finally {
      setSettingsLoading(false)
    }
  }, [adminActor, showNotification])

  useEffect(() => {
    void loadManagedPosts()
    void loadPublicSettings()
    void loadRateLimit()
  }, [loadManagedPosts, loadPublicSettings, loadRateLimit])

  const resetPostEditor = () => {
    setEditingPostId(null)
    setPostTitle('')
    editor?.commands.clearContent()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    await loadOverview(true)
  }

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
      setPostTitle(nextPayload.post.title)
      editor?.commands.setContent(nextPayload.post.content)
      showNotification(`Post #${nextPayload.post.id} carregado para edição.`, 'info')
    } catch {
      showNotification('Não foi possível carregar o post selecionado.', 'error')
    } finally {
      setActionPostId(null)
    }
  }

  const handleSavePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const title = postTitle.trim()
    const content = editor?.getHTML()?.trim() ?? ''

    if (!title || !content || content === '<p></p>') {
      showNotification('Título e conteúdo são obrigatórios para salvar o post.', 'error')
      return
    }

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
          content,
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

  const handleSaveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    let nextSettings: MainsiteSettingsPayload
    try {
      nextSettings = {
        appearance: appearance as unknown as Record<string, unknown>,
        rotation: rotation as unknown as Record<string, unknown>,
        disclaimers: disclaimers as unknown as Record<string, unknown>,
      }
    } catch {
      showNotification('Dados de settings inválidos.', 'error')
      return
    }

    setSavingSettings(true)
    try {
      const response = await fetch('/api/mainsite/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({
          ...nextSettings,
          adminActor,
        }),
      })

      const nextPayload = await response.json() as { ok: boolean; error?: string; request_id?: string }
      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao salvar os settings públicos do MainSite.')
      }

      await Promise.all([loadPublicSettings(), loadOverview()])
      showNotification(withTrace('Settings públicos do MainSite salvos com sucesso.', nextPayload), 'success')
    } catch {
      showNotification('Não foi possível salvar os settings públicos do MainSite.', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <section className="detail-panel module-shell module-shell-mainsite">
      <div className="detail-header">
        <div className="detail-icon"><Globe size={22} /></div>
        <div>
          <h3>MainSite Admin — Sistema, Auditoria e Financeiro</h3>
          <p>Operação interna no shell unificado: leitura e escrita diretas em `bigdata_db`.</p>
        </div>
      </div>

      {/* ── Diálogo de confirmação ────────────────────── */}
      {confirmDelete.show && (
        <div className="confirm-overlay">
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

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="overview-inline-form">
          <div className="field-group" style={{ flex: '0 0 120px' }}>
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
          <button type="submit" className="primary-button" disabled={disabled} style={{ alignSelf: 'flex-end' }}>
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

      <form className="form-card" onSubmit={handleSavePost}>
        <div className="result-toolbar">
          <div>
            <h4>{editingPostId ? `Editar post #${editingPostId}` : 'Novo post (NOVO)'}</h4>
            <p className="field-hint">Cria e altera posts diretamente no `bigdata_db` com persistência imediata.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={resetPostEditor} disabled={savingPost}>
              <X size={16} />
              Limpar
            </button>
          </div>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="mainsite-post-title">Título do post</label>
            <input
              id="mainsite-post-title"
              name="mainsitePostTitle"
              value={postTitle}
              onChange={(event) => setPostTitle(event.target.value)}
              disabled={savingPost}
            />
          </div>
          <div className="field-group">
            <label htmlFor="mainsite-post-mode">Modo atual</label>
            <input
              id="mainsite-post-mode"
              name="mainsitePostMode"
              value={editingPostId ? `Editando #${editingPostId}` : 'Criando novo post'}
              readOnly
            />
          </div>
        </div>

        {/* ── TipTap Editor ────────────────────────────────────────────── */}
        <div className="tiptap-container">
          {editor && (
            <div className="tiptap-toolbar">
              {/* Link insert modal */}
              {linkPrompt.show && (
                <div className="confirm-overlay">
                  <div className="confirm-dialog">
                    <h4>Inserir Link</h4>
                    <div className="field-group">
                      <label htmlFor="tiptap-link-url">URL</label>
                      <input id="tiptap-link-url" name="tiptapLinkUrl" value={linkPrompt.url} onChange={(e) => setLinkPrompt({ ...linkPrompt, url: e.target.value })} placeholder="https://..." />
                    </div>
                    {editor.state.selection.empty && (
                      <div className="field-group">
                        <label htmlFor="tiptap-link-text">Texto</label>
                        <input id="tiptap-link-text" name="tiptapLinkText" value={linkPrompt.text} onChange={(e) => setLinkPrompt({ ...linkPrompt, text: e.target.value })} placeholder="Texto de exibição" />
                      </div>
                    )}
                    <div className="confirm-dialog__actions">
                      <button type="button" className="ghost-button" onClick={() => setLinkPrompt({ show: false, url: '', text: '' })}>Cancelar</button>
                      <button type="button" className="primary-button" onClick={() => {
                        const url = linkPrompt.url.trim()
                        if (!url) { editor.chain().focus().extendMarkRange('link').unsetLink().run() }
                        else if (editor.state.selection.empty && linkPrompt.text) {
                          editor.chain().focus().insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${linkPrompt.text}</a>`).run()
                        } else {
                          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
                        }
                        setLinkPrompt({ show: false, url: '', text: '' })
                      }}>Inserir</button>
                    </div>
                  </div>
                </div>
              )}

              <button type="button" title="Negrito" className={editor.isActive('bold') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></button>
              <button type="button" title="Itálico" className={editor.isActive('italic') ? 'active' : ''} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></button>
              <button type="button" title="Sublinhado" className={editor.isActive('underline') ? 'active' : ''} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></button>
              <button type="button" title="Tachado" className={editor.isActive('strike') ? 'active' : ''} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></button>
              <button type="button" title="Marca-texto" className={editor.isActive('highlight') ? 'active' : ''} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter size={15} /></button>
              <span className="tiptap-divider" />
              <button type="button" title="Subscrito" className={editor.isActive('subscript') ? 'active' : ''} onClick={() => editor.chain().focus().toggleSubscript().run()}><SubIcon size={15} /></button>
              <button type="button" title="Sobrescrito" className={editor.isActive('superscript') ? 'active' : ''} onClick={() => editor.chain().focus().toggleSuperscript().run()}><SuperIcon size={15} /></button>
              <button type="button" title="Bloco de código" className={editor.isActive('codeBlock') ? 'active' : ''} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code size={15} /></button>
              <button type="button" title="Citação" className={editor.isActive('blockquote') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></button>
              <span className="tiptap-divider" />
              <button type="button" title="Esquerda" className={editor.isActive({ textAlign: 'left' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={15} /></button>
              <button type="button" title="Centro" className={editor.isActive({ textAlign: 'center' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={15} /></button>
              <button type="button" title="Direita" className={editor.isActive({ textAlign: 'right' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={15} /></button>
              <button type="button" title="Justificar" className={editor.isActive({ textAlign: 'justify' }) ? 'active' : ''} onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify size={15} /></button>
              <span className="tiptap-divider" />
              <button type="button" title="Título 1" className={editor.isActive('heading', { level: 1 }) ? 'active' : ''} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={15} /></button>
              <button type="button" title="Título 2" className={editor.isActive('heading', { level: 2 }) ? 'active' : ''} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></button>
              <button type="button" title="Marcadores" className={editor.isActive('bulletList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></button>
              <button type="button" title="Numeração" className={editor.isActive('orderedList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></button>
              <button type="button" title="Tarefas" className={editor.isActive('taskList') ? 'active' : ''} onClick={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare size={15} /></button>
              <button type="button" title="Linha" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={15} /></button>
              <button type="button" title="Tabela" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon size={15} /></button>
              <button type="button" title="Quebra" onClick={() => editor.chain().focus().setHardBreak().run()}><WrapText size={15} /></button>
              <span className="tiptap-divider" />
              <button type="button" title="Link" className={editor.isActive('link') ? 'active' : ''} onClick={() => {
                const prev = editor.getAttributes('link').href || ''
                setLinkPrompt({ show: true, url: prev as string, text: '' })
              }}><LinkIcon size={15} /></button>
              <button type="button" title="Remover Link" onClick={() => editor.chain().focus().unsetLink().run()} disabled={!editor.isActive('link')} className={!editor.isActive('link') ? 'disabled' : ''}><Unlink size={15} /></button>
              <span className="tiptap-divider" />
              <div className="tiptap-color-group">
                <Palette size={14} />
                <input id="tiptap-text-color" name="tiptapTextColor" type="color" title="Cor do texto" onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()} value={(editor.getAttributes('textStyle').color as string) || '#000000'} />
              </div>
              <div className="tiptap-select-group">
                <Type size={14} />
                <select id="tiptap-font-family" name="tiptapFontFamily" title="Família da fonte" onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()} value={(editor.getAttributes('textStyle').fontFamily as string) || 'inherit'}>
                  <option value="inherit">Padrão</option>
                  <option value="monospace">Monospace</option>
                  <option value="Arial">Arial</option>
                  <option value="'Times New Roman', Times, serif">Times</option>
                </select>
              </div>
            </div>
          )}
          <EditorContent editor={editor} className="tiptap-editor" />
          {editor && (
            <div className="tiptap-status-bar">
              {editor.storage.characterCount.characters()} caracteres &middot; {editor.storage.characterCount.words()} palavras
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={savingPost}>
            {savingPost ? <Loader2 size={18} className="spin" /> : editingPostId ? <Save size={18} /> : <FilePlus2 size={18} />}
            {editingPostId ? 'Salvar alterações' : 'Criar post'}
          </button>
        </div>
      </form>

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
          <ul className="result-list">
            {managedPosts.map((post, index) => {
              const isPinned = Number(post.is_pinned) === 1 || post.is_pinned === true
              const isBusy = actionPostId === post.id
              const isSelected = selectedPostId === post.id
              return (
                <li
                  key={post.id}
                  className={`post-row${isSelected ? ' post-row--selected' : ''}`}
                  draggable
                  onDragStart={() => handlePostDragStart(index)}
                  onDragEnd={handlePostDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => void handlePostDrop(index)}
                  style={{ opacity: draggedPostIndex === index ? 0.4 : 1, cursor: 'grab' }}
                >
                  <div className="post-row-main">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <GripVertical size={14} style={{ color: '#64748b', flexShrink: 0 }} />
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
            <h4><Save size={16} /> Sistema — settings públicos do MainSite</h4>
            <p className="field-hint">Configurações visuais, rotação e disclaimers. `ratelimit` permanece no painel dedicado.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadPublicSettings(true)} disabled={settingsLoading || savingSettings}>
              {settingsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar
            </button>
          </div>
        </div>

        {/* ── Rotação Autônoma ────────────────────────────────── */}
        <fieldset className="settings-fieldset">
          <legend>Engenharia de Automação</legend>
          <label className="toggle-row">
            <input id="rotation-enabled" name="rotationEnabled" type="checkbox" checked={rotation.enabled} onChange={(e) => setRotation({ ...rotation, enabled: e.target.checked })} />
            Habilitar Rotação Autônoma da Fila de Textos
          </label>
          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="rotation-interval">Intervalo (minutos)</label>
              <input id="rotation-interval" name="rotationInterval" type="number" min={1} value={rotation.interval} onChange={(e) => setRotation({ ...rotation, interval: parseInt(e.target.value) || 60 })} disabled={!rotation.enabled} />
            </div>
          </div>
        </fieldset>

        {/* ── Modo Automático ────────────────────────────────── */}
        <fieldset className="settings-fieldset">
          <legend>Customização Visual: Multi-Tema</legend>
          <label className="toggle-row">
            <input id="allow-auto-mode" name="allowAutoMode" type="checkbox" checked={appearance.allowAutoMode} onChange={(e) => setAppearance({ ...appearance, allowAutoMode: e.target.checked })} />
            Habilitar Modo Automático (Sincroniza com o SO do Leitor)
          </label>
        </fieldset>

        {/* ── Configurações Globais ──────────────────────────── */}
        <fieldset className="settings-fieldset">
          <legend>Configurações Globais (Ambos os Temas)</legend>
          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="shared-font-size">Tamanho da Fonte Base</label>
              <input id="shared-font-size" name="sharedFontSize" value={appearance.shared.fontSize} onChange={(e) => setAppearance({ ...appearance, shared: { ...appearance.shared, fontSize: e.target.value } })} placeholder="1rem" />
            </div>
            <div className="field-group">
              <label htmlFor="shared-title-font-size">Tamanho Títulos (H1)</label>
              <input id="shared-title-font-size" name="sharedTitleFontSize" value={appearance.shared.titleFontSize} onChange={(e) => setAppearance({ ...appearance, shared: { ...appearance.shared, titleFontSize: e.target.value } })} placeholder="1.5rem" />
            </div>
            <div className="field-group">
              <label htmlFor="shared-font-family">Família da Fonte</label>
              <select id="shared-font-family" name="sharedFontFamily" value={appearance.shared.fontFamily} onChange={(e) => setAppearance({ ...appearance, shared: { ...appearance.shared, fontFamily: e.target.value } })}>
                <option value="system-ui, -apple-system, sans-serif">System UI</option>
                <option value="sans-serif">Sans-Serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* ── Paleta Dark ──────────────────────────────────── */}
        <fieldset className="settings-fieldset">
          <legend>Paleta Tema Escuro</legend>
          <div className="theme-color-grid">
            <label className="color-label">Cor de Fundo <input id="dark-bg-color" name="darkBgColor" type="color" value={appearance.dark.bgColor} onChange={(e) => setAppearance({ ...appearance, dark: { ...appearance.dark, bgColor: e.target.value } })} /></label>
            <label className="color-label">Cor do Texto <input id="dark-font-color" name="darkFontColor" type="color" value={appearance.dark.fontColor} onChange={(e) => setAppearance({ ...appearance, dark: { ...appearance.dark, fontColor: e.target.value } })} /></label>
            <label className="color-label">Cor dos Títulos <input id="dark-title-color" name="darkTitleColor" type="color" value={appearance.dark.titleColor} onChange={(e) => setAppearance({ ...appearance, dark: { ...appearance.dark, titleColor: e.target.value } })} /></label>
          </div>
          <div className="field-group">
            <label htmlFor="dark-bg-image">Imagem de Fundo (URL)</label>
            <input id="dark-bg-image" name="darkBgImage" value={appearance.dark.bgImage} onChange={(e) => setAppearance({ ...appearance, dark: { ...appearance.dark, bgImage: e.target.value } })} placeholder="https://..." />
          </div>
        </fieldset>

        {/* ── Paleta Light ─────────────────────────────────── */}
        <fieldset className="settings-fieldset">
          <legend>Paleta Tema Claro</legend>
          <div className="theme-color-grid">
            <label className="color-label">Cor de Fundo <input id="light-bg-color" name="lightBgColor" type="color" value={appearance.light.bgColor} onChange={(e) => setAppearance({ ...appearance, light: { ...appearance.light, bgColor: e.target.value } })} /></label>
            <label className="color-label">Cor do Texto <input id="light-font-color" name="lightFontColor" type="color" value={appearance.light.fontColor} onChange={(e) => setAppearance({ ...appearance, light: { ...appearance.light, fontColor: e.target.value } })} /></label>
            <label className="color-label">Cor dos Títulos <input id="light-title-color" name="lightTitleColor" type="color" value={appearance.light.titleColor} onChange={(e) => setAppearance({ ...appearance, light: { ...appearance.light, titleColor: e.target.value } })} /></label>
          </div>
          <div className="field-group">
            <label htmlFor="light-bg-image">Imagem de Fundo (URL)</label>
            <input id="light-bg-image" name="lightBgImage" value={appearance.light.bgImage} onChange={(e) => setAppearance({ ...appearance, light: { ...appearance.light, bgImage: e.target.value } })} placeholder="https://..." />
          </div>
        </fieldset>

        {/* ── Disclaimers ─────────────────────────────────── */}
        <fieldset className="settings-fieldset">
          <legend>Janelas de Aviso (Disclaimers)</legend>
          <label className="toggle-row">
            <input id="disclaimers-enabled" name="disclaimersEnabled" type="checkbox" checked={disclaimers.enabled} onChange={(e) => setDisclaimers({ ...disclaimers, enabled: e.target.checked })} />
            Exibir Janelas de Aviso antes da leitura dos fragmentos
          </label>

          {disclaimers.enabled && (
            <div className="disclaimers-list">
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
                    Gatilho de Doação (Mercado Pago)
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
            Salvar settings públicos
          </button>
        </div>
      </form>

      <article className="result-card">
        <div className="result-toolbar">
          <div>
            <h4><Save size={16} /> Painel de controle de rate limit</h4>
            <p className="field-hint">Políticas por rota com atualização em tempo real e opção de restaurar padrão.</p>
            {hasUnsavedRatePolicies && (
              <span className="badge badge-planejado">Alterações não salvas</span>
            )}
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadRateLimit(true)} disabled={loadingRateLimit || updatingRateRoute !== null}>
              {loadingRateLimit ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Atualizar painel
            </button>
            <button type="button" className="ghost-button" onClick={restoreAllRatePoliciesLocal} disabled={loadingRateLimit || updatingRateRoute !== null || ratePolicies.length === 0}>
              <RefreshCw size={16} />
              Restaurar padrão (todas)
            </button>
            <button type="button" className="primary-button" onClick={() => void saveAllRatePolicies()} disabled={loadingRateLimit || updatingRateRoute !== null || !hasUnsavedRatePolicies}>
              {updatingRateRoute === '__all__' ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              Salvar painel
            </button>
          </div>
        </div>

        {ratePolicies.length === 0 ? (
          <p className="result-empty">Sem policies de rate limit carregadas.</p>
        ) : (
          <ul className="result-list">
            {ratePolicies.map((policy) => {
              const isBusy = updatingRateRoute === policy.route
              return (
                <li key={policy.route} className="post-row">
                  <div className="post-row-main">
                    <strong>{policy.label}</strong>
                    <div className="post-row-meta">
                      <span>rota: {policy.route}</span>
                      <span>janela atual: {policy.stats.total_requests_window} req / {policy.stats.distinct_keys_window} chaves</span>
                      <span>updated at: {policy.updated_at ?? '—'}</span>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="field-group">
                      <label htmlFor={`mainsite-rate-enabled-${policy.route}`}>Escudo habilitado</label>
                      <select
                        id={`mainsite-rate-enabled-${policy.route}`}
                        name={`mainsiteRateEnabled${policy.route}`}
                        value={policy.enabled ? '1' : '0'}
                        onChange={(event) => handleRatePolicyChange(policy.route, 'enabled', event.target.value === '1')}
                        disabled={isBusy}
                      >
                        <option value="1">Ativo</option>
                        <option value="0">Inativo</option>
                      </select>
                    </div>

                    <div className="field-group">
                      <label htmlFor={`mainsite-rate-max-${policy.route}`}>Máx. requisições/IP</label>
                      <input
                        id={`mainsite-rate-max-${policy.route}`}
                        name={`mainsiteRateMax${policy.route}`}
                        type="number"
                        min={1}
                        max={500}
                        value={policy.max_requests}
                        onChange={(event) => handleRatePolicyChange(policy.route, 'max_requests', Number(event.target.value))}
                        disabled={isBusy}
                      />
                    </div>

                    <div className="field-group">
                      <label htmlFor={`mainsite-rate-window-${policy.route}`}>Janela (min)</label>
                      <input
                        id={`mainsite-rate-window-${policy.route}`}
                        name={`mainsiteRateWindow${policy.route}`}
                        type="number"
                        min={1}
                        max={1440}
                        value={policy.window_minutes}
                        onChange={(event) => handleRatePolicyChange(policy.route, 'window_minutes', Number(event.target.value))}
                        disabled={isBusy}
                      />
                    </div>
                  </div>

                  <div className="post-row-actions">
                    <button type="button" className="ghost-button" onClick={() => void persistRatePolicy(policy.route, 'update')} disabled={isBusy}>
                      {isBusy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                      Salvar policy
                    </button>
                    <button type="button" className="ghost-button" onClick={() => restoreRatePolicyLocal(policy.route)} disabled={isBusy}>
                      <RefreshCw size={16} />
                      Restaurar local
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </article>

      <SyncStatusCard
        module="mainsite"
        endpoint="/api/mainsite/sync"
        title="Sync manual do MainSite"
        description="Executa validação e saneamento interno de posts/settings no `bigdata_db` com suporte a dry run."
      />
    </section>
  )
}
