import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { useNotification } from '../../components/Notification'

type AccountSummary = {
  accountId: string
  accountName: string
  source: string
}

type WorkerSummary = {
  scriptName: string
  handlers: string[]
  createdAt: string | null
  updatedAt: string | null
  tag: string | null
}

type PageSummary = {
  projectName: string
  id: string | null
  subdomain: string | null
  productionBranch: string | null
  createdAt: string | null
  domains: string[]
  latestDeployment: {
    id: string | null
    environment: string | null
    createdAt: string | null
    url: string | null
  } | null
}

type OverviewPayload = {
  ok: boolean
  error?: string
  request_id?: string
  account?: AccountSummary
  summary?: {
    totalWorkers: number
    totalPages: number
  }
  workers?: WorkerSummary[]
  pages?: PageSummary[]
}

type WorkerDetailsPayload = {
  ok: boolean
  error?: string
  request_id?: string
  scriptName?: string
  worker?: Record<string, unknown>
  deployments?: Array<Record<string, unknown>>
}

type PageDetailsPayload = {
  ok: boolean
  error?: string
  request_id?: string
  projectName?: string
  project?: Record<string, unknown>
  deployments?: Array<Record<string, unknown>>
}

type DeletePayload = {
  ok: boolean
  error?: string
  request_id?: string
  message?: string
}

type DetailType = 'worker' | 'page'

type DetailState = {
  type: DetailType
  id: string
  payload: WorkerDetailsPayload | PageDetailsPayload
}

const parseApiPayload = async <T,>(response: Response, fallback: string): Promise<T> => {
  const rawText = await response.text()
  const trimmed = rawText.trim()

  if (!trimmed) {
    throw new Error(`${fallback} (HTTP ${response.status}, corpo vazio).`)
  }

  const looksLikeHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')
  if (looksLikeHtml) {
    throw new Error(`${fallback} (HTTP ${response.status}, resposta HTML inesperada).`)
  }

  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error(`${fallback} (HTTP ${response.status}, resposta não-JSON).`)
  }
}

const withReq = (message: string, payload?: { request_id?: string }) => {
  if (payload?.request_id) {
    return `${message} (req ${payload.request_id})`
  }
  return message
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('pt-BR')
}

export function CfPwModule() {
  const { showNotification } = useNotification()
  const [adminActor] = useState('admin@app.lcv')

  const [loadingOverview, setLoadingOverview] = useState(false)
  const [account, setAccount] = useState<AccountSummary | null>(null)
  const [workers, setWorkers] = useState<WorkerSummary[]>([])
  const [pages, setPages] = useState<PageSummary[]>([])

  const [detailsLoading, setDetailsLoading] = useState(false)
  const [details, setDetails] = useState<DetailState | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<{ type: DetailType; id: string } | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)

  const statusTone = useMemo(() => {
    if (loadingOverview || detailsLoading || deleting) {
      return 'warning'
    }
    if (!account) {
      return 'idle'
    }
    return 'ok'
  }, [account, deleting, detailsLoading, loadingOverview])

  const statusLabel = useMemo(() => {
    if (loadingOverview || detailsLoading || deleting) {
      return 'Processando...'
    }
    if (!account) {
      return 'Aguardando sincronização'
    }
    return 'Sincronizado'
  }, [account, deleting, detailsLoading, loadingOverview])

  const loadOverview = useCallback(async (notify = false) => {
    setLoadingOverview(true)
    try {
      const response = await fetch('/api/cfpw/overview', {
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })
      const payload = await parseApiPayload<OverviewPayload>(response, 'Falha ao carregar Cloudflare Pages & Workers')

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao carregar Cloudflare Pages & Workers.')
      }

      setAccount(payload.account ?? null)
      setWorkers(Array.isArray(payload.workers) ? payload.workers : [])
      setPages(Array.isArray(payload.pages) ? payload.pages : [])

      if (notify) {
        showNotification(withReq('Cloudflare Pages & Workers sincronizado.', payload), 'success')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar Cloudflare Pages & Workers.'
      showNotification(message, 'error')
    } finally {
      setLoadingOverview(false)
    }
  }, [adminActor, showNotification])

  const openWorkerDetails = useCallback(async (scriptName: string) => {
    setDetailsLoading(true)
    try {
      const query = new URLSearchParams({ scriptName })
      const response = await fetch(`/api/cfpw/worker-details?${query.toString()}`, {
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })
      const payload = await parseApiPayload<WorkerDetailsPayload>(response, `Falha ao carregar detalhes do Worker ${scriptName}`)

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Falha ao carregar detalhes do Worker ${scriptName}.`)
      }

      setDetails({
        type: 'worker',
        id: scriptName,
        payload,
      })
      showNotification(withReq(`Detalhes do Worker ${scriptName} carregados.`, payload), 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : `Não foi possível carregar detalhes do Worker ${scriptName}.`
      showNotification(message, 'error')
    } finally {
      setDetailsLoading(false)
    }
  }, [adminActor, showNotification])

  const openPageDetails = useCallback(async (projectName: string) => {
    setDetailsLoading(true)
    try {
      const query = new URLSearchParams({ projectName })
      const response = await fetch(`/api/cfpw/page-details?${query.toString()}`, {
        headers: {
          'X-Admin-Actor': adminActor,
        },
      })
      const payload = await parseApiPayload<PageDetailsPayload>(response, `Falha ao carregar detalhes do projeto ${projectName}`)

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Falha ao carregar detalhes do projeto ${projectName}.`)
      }

      setDetails({
        type: 'page',
        id: projectName,
        payload,
      })
      showNotification(withReq(`Detalhes do projeto ${projectName} carregados.`, payload), 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : `Não foi possível carregar detalhes do projeto ${projectName}.`
      showNotification(message, 'error')
    } finally {
      setDetailsLoading(false)
    }
  }, [adminActor, showNotification])

  const runDelete = useCallback(async () => {
    if (!deleteTarget) {
      return
    }

    const expected = deleteTarget.id
    const typed = deleteConfirmation.trim()

    if (typed !== expected) {
      showNotification(`Confirmação inválida. Digite exatamente: ${expected}`, 'error')
      return
    }

    setDeleting(true)
    try {
      const endpoint = deleteTarget.type === 'worker' ? '/api/cfpw/delete-worker' : '/api/cfpw/delete-page'
      const body = deleteTarget.type === 'worker'
        ? { scriptName: expected, confirmation: typed }
        : { projectName: expected, confirmation: typed }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify(body),
      })

      const payload = await parseApiPayload<DeletePayload>(response, 'Falha ao executar remoção no Cloudflare')
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Falha ao executar remoção no Cloudflare.')
      }

      showNotification(withReq(payload.message ?? 'Remoção concluída com sucesso.', payload), 'success')
      setDeleteTarget(null)
      setDeleteConfirmation('')

      if (details && details.id === expected && details.type === deleteTarget.type) {
        setDetails(null)
      }

      await loadOverview()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível concluir a remoção.'
      showNotification(message, 'error')
    } finally {
      setDeleting(false)
    }
  }, [adminActor, deleteConfirmation, deleteTarget, details, loadOverview, showNotification])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const detailDeployments = useMemo(() => {
    if (!details) {
      return [] as Array<Record<string, unknown>>
    }

    const list = details.payload.deployments
    return Array.isArray(list) ? list : []
  }, [details])

  return (
    <section className="module-shell module-shell-cfpw" aria-label="Cloudflare Pages & Workers">
      <div className="detail-panel">
        <article className="detail-header">
          <div className="detail-icon" aria-hidden="true"><ShieldCheck size={20} /></div>
          <div>
            <p className="eyebrow">Cloudflare nativo</p>
            <h3>CF P&W</h3>
            <p className="field-hint">Gerencie Workers e Pages com leitura de deployments, detalhes e remoções críticas com confirmação explícita.</p>
          </div>
          <span className={`ops-status-chip ops-status-chip--${statusTone}`}>
            <span className="ops-status-chip__dot" aria-hidden="true" />
            {statusLabel}
          </span>
        </article>

        <article className="integrity-banner integrity-banner--warning" role="status" aria-live="polite">
          <h4 className="integrity-banner__header"><AlertTriangle size={16} /> Zona de risco operacional</h4>
          <ul className="integrity-banner__list">
            <li>Exclusões de Worker e Pages são permanentes e exigem redigitação do identificador.</li>
            <li>Use token dedicado em CLOUDFLARE_PW para manter separação de privilégios.</li>
            <li>Preferencialmente execute manutenção fora de janela de pico.</li>
          </ul>
        </article>

        <article className="form-card">
          <div className="result-toolbar">
            <h4>Contexto da conta</h4>
            <div className="inline-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => void loadOverview(true)}
                disabled={loadingOverview || deleting || detailsLoading}
              >
                {loadingOverview ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                Atualizar
              </button>
            </div>
          </div>

          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="cfpw-account-name">Conta ativa</label>
              <input id="cfpw-account-name" name="cfpw-account-name" value={account?.accountName ?? '—'} readOnly />
            </div>
            <div className="field-group">
              <label htmlFor="cfpw-account-id">Account ID</label>
              <input id="cfpw-account-id" name="cfpw-account-id" value={account?.accountId ?? '—'} readOnly />
            </div>
            <div className="field-group">
              <label htmlFor="cfpw-workers-count">Workers detectados</label>
              <input id="cfpw-workers-count" name="cfpw-workers-count" value={String(workers.length)} readOnly />
            </div>
            <div className="field-group">
              <label htmlFor="cfpw-pages-count">Pages detectados</label>
              <input id="cfpw-pages-count" name="cfpw-pages-count" value={String(pages.length)} readOnly />
            </div>
          </div>
        </article>

        <div className="detail-grid">
          <article className="result-card">
            <div className="result-toolbar">
              <h4>Workers</h4>
            </div>
            <div className="cfpw-table-wrap">
              <table className="cfpw-table" aria-label="Tabela de Workers">
                <thead>
                  <tr>
                    <th>Script</th>
                    <th>Handlers</th>
                    <th>Atualizado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="result-empty">Nenhum Worker encontrado nesta conta.</td>
                    </tr>
                  ) : workers.map((worker) => (
                    <tr key={worker.scriptName}>
                      <td>{worker.scriptName}</td>
                      <td>{worker.handlers.length > 0 ? worker.handlers.join(', ') : '—'}</td>
                      <td>{formatDateTime(worker.updatedAt)}</td>
                      <td>
                        <div className="cfdns-row-actions">
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => void openWorkerDetails(worker.scriptName)}
                            disabled={detailsLoading || loadingOverview || deleting}
                          >
                            Detalhes
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => {
                              setDeleteTarget({ type: 'worker', id: worker.scriptName })
                              setDeleteConfirmation('')
                            }}
                            disabled={detailsLoading || loadingOverview || deleting}
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="result-card">
            <div className="result-toolbar">
              <h4>Pages</h4>
            </div>
            <div className="cfpw-table-wrap">
              <table className="cfpw-table" aria-label="Tabela de Pages">
                <thead>
                  <tr>
                    <th>Projeto</th>
                    <th>Subdomínio</th>
                    <th>Branch produção</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="result-empty">Nenhum projeto Pages encontrado nesta conta.</td>
                    </tr>
                  ) : pages.map((page) => (
                    <tr key={page.projectName}>
                      <td>{page.projectName}</td>
                      <td>{page.subdomain ?? '—'}</td>
                      <td>{page.productionBranch ?? '—'}</td>
                      <td>
                        <div className="cfdns-row-actions">
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => void openPageDetails(page.projectName)}
                            disabled={detailsLoading || loadingOverview || deleting}
                          >
                            Detalhes
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => {
                              setDeleteTarget({ type: 'page', id: page.projectName })
                              setDeleteConfirmation('')
                            }}
                            disabled={detailsLoading || loadingOverview || deleting}
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="result-card cfpw-detail-card cfpw-detail-card-full">
            <div className="result-toolbar">
              <h4>Detalhes e deploys</h4>
            </div>
            {!details ? (
              <p className="result-empty">Selecione um Worker ou projeto Pages para inspecionar detalhes e histórico de deploy.</p>
            ) : (
              <>
                <p className="field-hint">
                  <strong>Tipo:</strong> {details.type === 'worker' ? 'Worker' : 'Pages'}{' '}
                  <strong>ID:</strong> {details.id}
                </p>
                <div className="cfpw-json-preview">
                  <pre>{JSON.stringify(details.payload, null, 2)}</pre>
                </div>
                <p className="field-hint">
                  Deployments encontrados: <strong>{detailDeployments.length}</strong>
                </p>
              </>
            )}
          </article>
        </div>

        {deleteTarget ? (
          <article className="form-card">
            <div className="result-toolbar">
              <h4>Confirmação obrigatória de exclusão</h4>
            </div>
            <p className="field-hint">
              Para confirmar a exclusão de <strong>{deleteTarget.id}</strong>, digite o identificador exato no campo abaixo.
            </p>
            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="cfpw-delete-confirmation">Confirmação por digitação</label>
                <input
                  id="cfpw-delete-confirmation"
                  name="cfpw-delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  placeholder={deleteTarget.id}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="inline-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteConfirmation('')
                }}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void runDelete()}
                disabled={deleting}
              >
                {deleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                Confirmar exclusão
              </button>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  )
}
