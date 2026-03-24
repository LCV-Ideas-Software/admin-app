import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, AlertTriangle, FilePlus2, Globe, GripVertical, Loader2, Pencil, Pin, RefreshCw, Save, Search, Trash2, X } from 'lucide-react'
import { useNotification } from '../../components/Notification'
import { SyncStatusCard } from '../../components/SyncStatusCard'
import type { RateLimitPolicy } from '../../lib/rate-limit-common'

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
  const [postContent, setPostContent] = useState('')
  const [appearanceJson, setAppearanceJson] = useState('')
  const [rotationJson, setRotationJson] = useState('')
  const [disclaimersJson, setDisclaimersJson] = useState('')
  const [ratePolicies, setRatePolicies] = useState<RateLimitPolicy[]>([])
  const [baselineRatePolicies, setBaselineRatePolicies] = useState<RateLimitPolicy[]>([])
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({ show: false, id: null, title: '' })
  const [draggedPostIndex, setDraggedPostIndex] = useState<number | null>(null)

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

      setAppearanceJson(JSON.stringify(nextPayload.settings.appearance, null, 2))
      setRotationJson(JSON.stringify(nextPayload.settings.rotation, null, 2))
      setDisclaimersJson(JSON.stringify(nextPayload.settings.disclaimers, null, 2))

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
    setPostContent('')
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
      setPostContent(nextPayload.post.content)
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
    const content = postContent.trim()

    if (!title || !content) {
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
        appearance: JSON.parse(appearanceJson) as Record<string, unknown>,
        rotation: JSON.parse(rotationJson) as Record<string, unknown>,
        disclaimers: JSON.parse(disclaimersJson) as Record<string, unknown>,
      }
    } catch {
      showNotification('Os JSONs de settings públicos precisam estar válidos antes de salvar.', 'error')
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
            {overviewLoading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
            Carregar overview
          </button>
        </div>
      </form>


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

        <div className="field-group">
          <label htmlFor="mainsite-post-content">Conteúdo</label>
          <textarea
            id="mainsite-post-content"
            name="mainsitePostContent"
            value={postContent}
            onChange={(event) => setPostContent(event.target.value)}
            disabled={savingPost}
            rows={10}
          />
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
            <p className="field-hint">Appearance, rotation e disclaimers são editáveis diretamente no `bigdata_db`. `ratelimit` permanece no painel dedicado.</p>
          </div>
          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => void loadPublicSettings(true)} disabled={settingsLoading || savingSettings}>
              {settingsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              Recarregar settings
            </button>
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="mainsite-settings-appearance">Appearance (JSON)</label>
          <textarea
            id="mainsite-settings-appearance"
            name="mainsiteSettingsAppearance"
            className="json-textarea"
            value={appearanceJson}
            onChange={(event) => setAppearanceJson(event.target.value)}
            disabled={savingSettings}
            rows={10}
          />
        </div>

        <div className="field-group">
          <label htmlFor="mainsite-settings-rotation">Rotation (JSON)</label>
          <textarea
            id="mainsite-settings-rotation"
            name="mainsiteSettingsRotation"
            className="json-textarea"
            value={rotationJson}
            onChange={(event) => setRotationJson(event.target.value)}
            disabled={savingSettings}
            rows={8}
          />
        </div>

        <div className="field-group">
          <label htmlFor="mainsite-settings-disclaimers">Disclaimers (JSON)</label>
          <textarea
            id="mainsite-settings-disclaimers"
            name="mainsiteSettingsDisclaimers"
            className="json-textarea"
            value={disclaimersJson}
            onChange={(event) => setDisclaimersJson(event.target.value)}
            disabled={savingSettings}
            rows={10}
          />
        </div>

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
