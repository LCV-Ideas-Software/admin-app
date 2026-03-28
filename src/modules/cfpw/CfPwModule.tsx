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
  warnings?: Array<{ code?: string; message?: string }>
}

type PageDetailsPayload = {
  ok: boolean
  error?: string
  request_id?: string
  projectName?: string
  project?: Record<string, unknown>
  deployments?: Array<Record<string, unknown>>
  warnings?: Array<{ code?: string; message?: string }>
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

type OperationalAlert = {
  code: string
  cause: string
  action: string
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

const valueToText = (value: unknown) => {
  if (value == null) {
    return '—'
  }
  if (typeof value === 'string') {
    return value.trim() || '—'
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return '—'
}

const keyValueRows = (record: Record<string, unknown>, keys: Array<{ key: string; label: string; isDate?: boolean }>) => {
  return keys.map(({ key, label, isDate }) => {
    const raw = record[key]
    const value = isDate ? formatDateTime(typeof raw === 'string' ? raw : null) : valueToText(raw)
    return { label, value }
  })
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

  const operationalAlerts = useMemo<OperationalAlert[]>(() => {
    const next: OperationalAlert[] = []

    if (!account && !loadingOverview) {
      next.push({
        code: 'CFPW-ACCOUNT-UNAVAILABLE',
        cause: 'A conta ativa não foi carregada nesta sessão.',
        action: 'Execute "Atualizar" para sincronizar o contexto da conta.',
      })
    }

    if (loadingOverview) {
      next.push({
        code: 'CFPW-SYNC-RUNNING',
        cause: 'A sincronização de Workers e Pages está em execução.',
        action: 'Aguarde a conclusão da leitura antes de tomar ações críticas.',
      })
    }

    if (detailsLoading) {
      next.push({
        code: 'CFPW-DETAILS-RUNNING',
        cause: 'A consulta de detalhes/deployments ainda está em processamento.',
        action: 'Aguarde a resposta para validar estado real do recurso.',
      })
    }

    if (deleteTarget && !deleting) {
      next.push({
        code: 'CFPW-DELETE-ARMED',
        cause: `Existe uma exclusão armada para ${deleteTarget.type === 'worker' ? 'Worker' : 'Page'} (${deleteTarget.id}).`,
        action: 'Revise o identificador e confirme apenas se a remoção for intencional.',
      })
    }

    if (deleting) {
      next.push({
        code: 'CFPW-DELETE-RUNNING',
        cause: 'Uma exclusão está em execução e a operação é irreversível.',
        action: 'Aguarde a conclusão e valide o inventário após o término.',
      })
    }

    if (!loadingOverview && account && workers.length === 0 && pages.length === 0) {
      next.push({
        code: 'CFPW-EMPTY-INVENTORY',
        cause: 'Nenhum Worker ou projeto Pages foi detectado na conta ativa.',
        action: 'Verifique o account/token e confirme se os recursos existem neste escopo.',
      })
    }

    return next
  }, [account, deleteTarget, deleting, detailsLoading, loadingOverview, pages.length, workers.length])

  const statusTone = useMemo(() => {
    if (loadingOverview || detailsLoading || deleting) {
      return 'warning'
    }
    if (!account) {
      return 'idle'
    }
    if (operationalAlerts.length > 0) {
      return 'warning'
    }
    return 'ok'
  }, [account, deleting, detailsLoading, loadingOverview, operationalAlerts.length])

  const statusLabel = useMemo(() => {
    if (loadingOverview || detailsLoading || deleting) {
      return 'Processando...'
    }
    if (!account) {
      return 'Aguardando sincronização'
    }
    if (operationalAlerts.length > 0) {
      return `${operationalAlerts.length} alerta(s)`
    }
    return 'Sincronizado'
  }, [account, deleting, detailsLoading, loadingOverview, operationalAlerts.length])

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

  const detailWarnings = useMemo(() => {
    if (!details) {
      return [] as Array<{ code: string; message: string }>
    }

    const warnings = Array.isArray(details.payload.warnings) ? details.payload.warnings : []
    return warnings
      .map((warning, index) => ({
        code: String(warning?.code ?? `CFPW-DETAIL-WARN-${index + 1}`).trim() || `CFPW-DETAIL-WARN-${index + 1}`,
        message: String(warning?.message ?? 'Falha parcial ao carregar detalhes.').trim() || 'Falha parcial ao carregar detalhes.',
      }))
  }, [details])

  const detailSummaryRows = useMemo(() => {
    if (!details) {
      return [] as Array<{ label: string; value: string }>
    }

    if (details.type === 'worker') {
      const workerPayload = details.payload as WorkerDetailsPayload
      const worker = (workerPayload.worker && typeof workerPayload.worker === 'object'
        ? workerPayload.worker
        : {}) as Record<string, unknown>

      return keyValueRows(worker, [
        { key: 'id', label: 'ID técnico' },
        { key: 'usage_model', label: 'Usage model' },
        { key: 'compatibility_date', label: 'Compatibility date' },
        { key: 'main_module', label: 'Módulo principal' },
        { key: 'tail_consumers', label: 'Tail consumers' },
        { key: 'logpush', label: 'Logpush' },
      ])
    }

    const pagePayload = details.payload as PageDetailsPayload
    const project = (pagePayload.project && typeof pagePayload.project === 'object'
      ? pagePayload.project
      : {}) as Record<string, unknown>

    const domainsRaw = Array.isArray(project.domains)
      ? project.domains.filter((domain) => typeof domain === 'string' && domain.trim().length > 0)
      : []

    return [
      ...keyValueRows(project, [
        { key: 'id', label: 'Project ID' },
        { key: 'name', label: 'Nome do projeto' },
        { key: 'subdomain', label: 'Subdomínio Pages' },
        { key: 'production_branch', label: 'Branch de produção' },
        { key: 'created_on', label: 'Criado em', isDate: true },
      ]),
      {
        label: 'Domínios customizados',
        value: domainsRaw.length > 0 ? domainsRaw.join(', ') : '—',
      },
    ]
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

        {operationalAlerts.length > 0 ? (
          <article className="integrity-banner integrity-banner--warning" role="status" aria-live="polite">
            <h4 className="integrity-banner__header"><AlertTriangle size={16} /> Alertas operacionais do Pages &amp; Workers</h4>
            <ul className="integrity-banner__list">
              {operationalAlerts.map((alert) => (
                <li key={alert.code}>
                  <strong>{alert.code}</strong> · {alert.cause} Ação recomendada: {alert.action}
                </li>
              ))}
            </ul>
          </article>
        ) : null}

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

        <div className="detail-grid cfpw-stack">
          <article className="result-card cfpw-section-card">
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
                            className="ghost-button cfrow-action-btn"
                            onClick={() => void openWorkerDetails(worker.scriptName)}
                            disabled={detailsLoading || loadingOverview || deleting}
                          >
                            Detalhes
                          </button>
                          <button
                            type="button"
                            className="ghost-button cfrow-action-btn"
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

          <article className="result-card cfpw-section-card">
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
                            className="ghost-button cfrow-action-btn"
                            onClick={() => void openPageDetails(page.projectName)}
                            disabled={detailsLoading || loadingOverview || deleting}
                          >
                            Detalhes
                          </button>
                          <button
                            type="button"
                            className="ghost-button cfrow-action-btn"
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

                {detailWarnings.length > 0 ? (
                  <div className="cfpw-inline-warning" role="status" aria-live="polite">
                    {detailWarnings.map((warning) => (
                      <p key={warning.code}><strong>{warning.code}</strong> - {warning.message}</p>
                    ))}
                  </div>
                ) : null}

                <div className="cfpw-detail-grid">
                  {detailSummaryRows.map((row) => (
                    <div key={row.label} className="cfpw-detail-item">
                      <span>{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>

                <p className="field-hint">
                  Deployments encontrados: <strong>{detailDeployments.length}</strong>
                </p>

                {detailDeployments.length > 0 ? (
                  <div className="cfpw-table-wrap">
                    <table className="cfpw-table" aria-label="Tabela de deployments">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Ambiente</th>
                          <th>Status/Strategy</th>
                          <th>Criado em</th>
                          <th>URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailDeployments.slice(0, 15).map((deployment, index) => {
                          const id = valueToText(deployment.id ?? deployment.short_id)
                          const environment = valueToText(deployment.environment)
                          const statusOrStrategy = valueToText((deployment.latest_stage as Record<string, unknown> | undefined)?.status ?? deployment.strategy)
                          const createdAt = formatDateTime(typeof deployment.created_on === 'string' ? deployment.created_on : null)
                          const url = valueToText(deployment.url)

                          return (
                            <tr key={`${id}-${index}`}>
                              <td>{id}</td>
                              <td>{environment}</td>
                              <td>{statusOrStrategy}</td>
                              <td>{createdAt}</td>
                              <td>{url}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
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
