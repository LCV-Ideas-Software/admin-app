import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Activity, FilePlus2, Globe, Loader2, Pencil, Pin, RefreshCw, Save, Search, Trash2, X } from 'lucide-react'
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

type ManagedPost = {
  id: number
  title: string
  content: string
  created_at: string
  is_pinned: number | boolean
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

export function MainsiteModule() {
  const { showNotification } = useNotification()
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [savingPost, setSavingPost] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [actionPostId, setActionPostId] = useState<number | null>(null)
  const [limit, setLimit] = useState('20')
  const [adminActor, setAdminActor] = useState('admin@app.lcv')
  const [payload, setPayload] = useState<OverviewPayload>(initialPayload)
  const [managedPosts, setManagedPosts] = useState<ManagedPost[]>([])
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState('')
  const [appearanceJson, setAppearanceJson] = useState('')
  const [rotationJson, setRotationJson] = useState('')
  const [disclaimersJson, setDisclaimersJson] = useState('')

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
  }, [loadManagedPosts, loadPublicSettings])

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

      const nextPayload = await response.json() as { ok: boolean; error?: string }

      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao salvar o post do MainSite.')
      }

      resetPostEditor()
      await Promise.all([loadManagedPosts(), loadOverview()])
      showNotification(isEditing ? 'Post do MainSite atualizado com sucesso.' : 'Post do MainSite criado com sucesso.', 'success')
    } catch {
      showNotification('Não foi possível salvar o post do MainSite.', 'error')
    } finally {
      setSavingPost(false)
    }
  }

  const handleDeletePost = async (id: number, title: string) => {
    if (!window.confirm(`Deseja excluir o post "${title}"?`)) {
      return
    }

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

      const nextPayload = await response.json() as { ok: boolean; error?: string }
      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao excluir o post do MainSite.')
      }

      if (editingPostId === id) {
        resetPostEditor()
      }

      await Promise.all([loadManagedPosts(), loadOverview()])
      showNotification('Post do MainSite excluído com sucesso.', 'success')
    } catch {
      showNotification('Não foi possível excluir o post do MainSite.', 'error')
    } finally {
      setActionPostId(null)
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

      const nextPayload = await response.json() as { ok: boolean; error?: string; isPinned?: boolean }
      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao alternar fixação do post do MainSite.')
      }

      await Promise.all([loadManagedPosts(), loadOverview()])
      showNotification(nextPayload.isPinned ? 'Post fixado com sucesso.' : 'Post desafixado com sucesso.', 'success')
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

      const nextPayload = await response.json() as { ok: boolean; error?: string }
      if (!response.ok || !nextPayload.ok) {
        throw new Error(nextPayload.error ?? 'Falha ao salvar os settings públicos do MainSite.')
      }

      await Promise.all([loadPublicSettings(), loadOverview()])
      showNotification('Settings públicos do MainSite salvos com sucesso.', 'success')
    } catch {
      showNotification('Não foi possível salvar os settings públicos do MainSite.', 'error')
    } finally {
      setSavingSettings(false)
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
            <label htmlFor="mainsite-admin-actor">Administrador responsável</label>
            <input
              id="mainsite-admin-actor"
              name="mainsiteAdminActor"
              type="text"
              autoComplete="email"
              placeholder="admin@lcv.app.br"
              value={adminActor}
              onChange={(event) => setAdminActor(event.target.value)}
            />
          </div>

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

      <form className="form-card" onSubmit={handleSavePost}>
        <div className="result-toolbar">
          <div>
            <h4>{editingPostId ? `Editar post #${editingPostId}` : 'Novo post do MainSite'}</h4>
            <p className="field-hint">Cria ou altera posts direto no worker legado, com reconciliação automática no `bigdata_db`.</p>
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
            <h4><Globe size={16} /> Posts operacionais</h4>
            <p className="field-hint">Lista viva do worker legado para edição, fixação e exclusão sem sair do cockpit.</p>
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
          <p className="result-empty">Nenhum post retornado pelo worker legado.</p>
        ) : (
          <ul className="result-list">
            {managedPosts.map((post) => {
              const isPinned = Number(post.is_pinned) === 1 || post.is_pinned === true
              const isBusy = actionPostId === post.id
              return (
                <li key={post.id} className="post-row">
                  <div className="post-row-main">
                    <strong>{post.title}</strong>
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
                    <button type="button" className="ghost-button" onClick={() => void handleEditPost(post.id)} disabled={isBusy || savingPost}>
                      {isBusy ? <Loader2 size={16} className="spin" /> : <Pencil size={16} />}
                      Editar
                    </button>
                    <button type="button" className="ghost-button" onClick={() => void handleTogglePin(post.id)} disabled={isBusy}>
                      {isBusy ? <Loader2 size={16} className="spin" /> : <Pin size={16} />}
                      {isPinned ? 'Desfixar' : 'Fixar'}
                    </button>
                    <button type="button" className="ghost-button" onClick={() => void handleDeletePost(post.id, post.title)} disabled={isBusy}>
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
            <h4><Save size={16} /> Settings públicos do MainSite</h4>
            <p className="field-hint">Appearance, rotation e disclaimers são editáveis aqui. `ratelimit` continua protegido para fase posterior.</p>
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

      <SyncStatusCard
        module="mainsite"
        endpoint="/api/mainsite/sync"
        title="Sync manual do MainSite"
        description="Sincroniza posts e settings públicos do worker legado para o `bigdata_db`; configs privadas permanecem protegidas até fase posterior."
      />
    </section>
  )
}
