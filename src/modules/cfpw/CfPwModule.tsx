/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle, Eye, EyeOff, Loader2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
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

type OpsResponsePayload = {
  ok: boolean
  error?: string
  request_id?: string
  action?: string
  accountId?: string
  result?: unknown
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

type OpsActionField =
  | 'scriptName'
  | 'projectName'
  | 'deploymentId'
  | 'domainName'
  | 'secretName'
  | 'secretValue'
  | 'usageModel'
  | 'schedules'
  | 'projectBranch'
  | 'pageSettingsJson'
  | 'zoneId'
  | 'routeId'
  | 'routePattern'
  | 'rawMethod'
  | 'rawPath'
  | 'rawBodyJson'

type OpsActionDefinition = {
  value: string
  label: string
  description: string
  fields: OpsActionField[]
  outcomeLabel: string
}

const WORKER_OPS: OpsActionDefinition[] = [
  {
    value: 'get-worker-schedules',
    label: 'Ler cron triggers do Worker',
    description: 'Consulta os schedules configurados para execucao automatica do Worker.',
    fields: ['scriptName'],
    outcomeLabel: 'Schedules retornados pela Cloudflare',
  },
  {
    value: 'update-worker-schedules',
    label: 'Atualizar cron triggers do Worker',
    description: 'Substitui a lista atual de schedules do Worker. Informe um cron por linha.',
    fields: ['scriptName', 'schedules'],
    outcomeLabel: 'Resultado da atualizacao de schedules',
  },
  {
    value: 'get-worker-usage-model',
    label: 'Ler usage model do Worker',
    description: 'Mostra o modelo de cobranca atualmente aplicado ao Worker.',
    fields: ['scriptName'],
    outcomeLabel: 'Usage model atual',
  },
  {
    value: 'update-worker-usage-model',
    label: 'Atualizar usage model do Worker',
    description: 'Altera o usage model do Worker sem precisar editar a publicacao manualmente.',
    fields: ['scriptName', 'usageModel'],
    outcomeLabel: 'Resultado da troca de usage model',
  },
  {
    value: 'list-worker-secrets',
    label: 'Listar secrets do Worker',
    description: 'Retorna os nomes dos secrets configurados para o Worker selecionado.',
    fields: ['scriptName'],
    outcomeLabel: 'Secrets encontrados',
  },
  {
    value: 'add-worker-secret',
    label: 'Adicionar secret ao Worker',
    description: 'Grava um novo secret_text no Worker. O valor e enviado apenas na execucao.',
    fields: ['scriptName', 'secretName', 'secretValue'],
    outcomeLabel: 'Resultado da gravacao do secret',
  },
  {
    value: 'delete-worker-secret',
    label: 'Remover secret do Worker',
    description: 'Exclui um secret existente pelo nome.',
    fields: ['scriptName', 'secretName'],
    outcomeLabel: 'Resultado da remocao do secret',
  },
  {
    value: 'list-worker-versions',
    label: 'Listar versoes do Worker',
    description: 'Consulta as versoes publicadas para apoiar rollback e promote controlado.',
    fields: ['scriptName'],
    outcomeLabel: 'Versoes retornadas',
  },
  {
    value: 'list-worker-routes',
    label: 'Listar rotas do Worker por zona',
    description: 'Consulta as rotas vinculadas a uma zona Cloudflare especifica.',
    fields: ['zoneId'],
    outcomeLabel: 'Rotas encontradas na zona',
  },
  {
    value: 'add-worker-route',
    label: 'Adicionar rota do Worker',
    description: 'Vincula um Worker existente a um pattern de rota dentro da zona.',
    fields: ['zoneId', 'routePattern', 'scriptName'],
    outcomeLabel: 'Resultado da criacao da rota',
  },
  {
    value: 'delete-worker-route',
    label: 'Remover rota do Worker',
    description: 'Exclui uma rota especifica usando zoneId e routeId.',
    fields: ['zoneId', 'routeId'],
    outcomeLabel: 'Resultado da remocao da rota',
  },
]

const PAGE_OPS: OpsActionDefinition[] = [
  {
    value: 'create-page-project',
    label: 'Criar projeto Pages',
    description: 'Cria um projeto Pages informando o nome e a branch principal de deploy.',
    fields: ['projectName', 'projectBranch'],
    outcomeLabel: 'Resumo do projeto criado',
  },
  {
    value: 'update-page-project-settings',
    label: 'Atualizar settings do Pages',
    description: 'Aplica um PATCH no projeto Pages usando JSON valido no formato da API Cloudflare.',
    fields: ['projectName', 'pageSettingsJson'],
    outcomeLabel: 'Resultado do PATCH no projeto',
  },
  {
    value: 'list-page-domains',
    label: 'Listar dominios do Pages',
    description: 'Consulta os dominios ja vinculados ao projeto Pages.',
    fields: ['projectName'],
    outcomeLabel: 'Dominios configurados no projeto',
  },
  {
    value: 'add-page-domain',
    label: 'Adicionar dominio ao Pages',
    description: 'Solicita o vinculo de um dominio customizado ao projeto Pages.',
    fields: ['projectName', 'domainName'],
    outcomeLabel: 'Resultado da adicao do dominio',
  },
  {
    value: 'delete-page-domain',
    label: 'Remover dominio do Pages',
    description: 'Remove um dominio customizado do projeto Pages informado.',
    fields: ['projectName', 'domainName'],
    outcomeLabel: 'Resultado da remocao do dominio',
  },
  {
    value: 'retry-page-deployment',
    label: 'Refazer deployment do Pages',
    description: 'Dispara novo processamento para um deployment especifico do projeto.',
    fields: ['projectName', 'deploymentId'],
    outcomeLabel: 'Resultado do retry de deployment',
  },
  {
    value: 'rollback-page-deployment',
    label: 'Executar rollback de deployment',
    description: 'Solicita rollback para um deployment especifico do projeto Pages.',
    fields: ['projectName', 'deploymentId'],
    outcomeLabel: 'Resultado do rollback',
  },
  {
    value: 'get-page-deployment-logs',
    label: 'Ler logs de deployment do Pages',
    description: 'Traz o historico de logs do deployment para auditoria operacional.',
    fields: ['projectName', 'deploymentId'],
    outcomeLabel: 'Logs retornados pela Cloudflare',
  },
]

const RAW_OPS: OpsActionDefinition[] = [
  {
    value: 'raw-cloudflare-request',
    label: 'Executar chamada raw controlada',
    description: 'Use apenas quando a operacao ainda nao estiver modelada acima. O path precisa iniciar com /accounts/... ou /zones/... .',
    fields: ['rawMethod', 'rawPath', 'rawBodyJson'],
    outcomeLabel: 'Retorno bruto da API Cloudflare',
  },
]

const findOpsAction = (value: string) => {
  return [...WORKER_OPS, ...PAGE_OPS, ...RAW_OPS].find((item) => item.value === value) ?? WORKER_OPS[1]
}

const parseApiPayload = async <T,>(response: Response, fallback: string): Promise<T> => {
  const rawText = await response.text()
  const trimmed = rawText.trim()
  const cfRay = response.headers.get('cf-ray')
  const statusInfo = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
  const traceInfo = cfRay ? `${statusInfo}, cf-ray ${cfRay}` : statusInfo

  if (!trimmed) {
    throw new Error(`${fallback} (${traceInfo}, corpo vazio).`)
  }

  const looksLikeHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')
  if (looksLikeHtml) {
    throw new Error(`${fallback} (${traceInfo}, resposta HTML inesperada).`)
  }

  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error(`${fallback} (${traceInfo}, resposta não-JSON).`)
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
  const [opsLoading, setOpsLoading] = useState(false)
  const [opsAction, setOpsAction] = useState('get-worker-schedules')
  const [opsScriptName, setOpsScriptName] = useState('')
  const [opsProjectName, setOpsProjectName] = useState('')
  const [opsDeploymentId, setOpsDeploymentId] = useState('')
  const [opsDomainName, setOpsDomainName] = useState('')
  const [opsSecretName, setOpsSecretName] = useState('')
  const [opsSecretValue, setOpsSecretValue] = useState('')
  const [opsUsageModel, setOpsUsageModel] = useState('standard')
  const [opsSchedulesRaw, setOpsSchedulesRaw] = useState('0 5 * * *')
  const [opsProjectBranch, setOpsProjectBranch] = useState('main')
  const [opsPageSettingsJson, setOpsPageSettingsJson] = useState('')
  const [opsZoneId, setOpsZoneId] = useState('')
  const [opsRouteId, setOpsRouteId] = useState('')
  const [opsRoutePattern, setOpsRoutePattern] = useState('')
  const [opsRawMethod, setOpsRawMethod] = useState('GET')
  const [opsRawPath, setOpsRawPath] = useState('')
  const [opsRawBodyJson, setOpsRawBodyJson] = useState('')
  const [opsResult, setOpsResult] = useState<unknown>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [showDestructiveModal, setShowDestructiveModal] = useState(false)

  const currentOpsAction = useMemo(() => findOpsAction(opsAction), [opsAction])
  const visibleOpsFields = useMemo(() => new Set(currentOpsAction.fields), [currentOpsAction])

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
      setOpsScriptName(scriptName)
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
      setOpsProjectName(projectName)
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

  const isDestructiveOp = useMemo(() => {
    const destructiveActions = ['delete-worker-secret', 'delete-worker-route', 'raw-cloudflare-request']
    if (destructiveActions.includes(opsAction)) {
      if (opsAction === 'raw-cloudflare-request' && opsRawMethod !== 'DELETE') return false
      return true
    }
    return false
  }, [opsAction, opsRawMethod])

  const executeAdvancedOp = useCallback(async () => {
    setShowDestructiveModal(false)

    setOpsLoading(true)
    try {
      const schedules = opsSchedulesRaw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((cron) => ({ cron }))

      const response = await fetch('/api/cfpw/ops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Actor': adminActor,
        },
        body: JSON.stringify({
          action: opsAction,
          scriptName: opsScriptName,
          projectName: opsProjectName,
          deploymentId: opsDeploymentId,
          domainName: opsDomainName,
          secretName: opsSecretName,
          secretValue: opsSecretValue,
          usageModel: opsUsageModel,
          schedules,
          projectBranch: opsProjectBranch,
          pageSettingsJson: opsPageSettingsJson,
          zoneId: opsZoneId,
          routeId: opsRouteId,
          routePattern: opsRoutePattern,
          rawMethod: opsRawMethod,
          rawPath: opsRawPath,
          rawBodyJson: opsRawBodyJson,
        }),
      })

      const payload = await parseApiPayload<OpsResponsePayload>(response, `Falha ao executar operação avançada (${opsAction})`)
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `Falha ao executar operação avançada (${opsAction}).`)
      }

      setOpsResult(payload.result ?? null)
      showNotification(withReq(`Operação avançada concluída (${opsAction}).`, payload), 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao executar operação avançada no CF P&W.'
      showNotification(message, 'error')
    } finally {
      setOpsLoading(false)
    }
  }, [
    adminActor,
    opsAction,
    opsDeploymentId,
    opsDomainName,
    opsPageSettingsJson,
    opsProjectBranch,
    opsProjectName,
    opsRawBodyJson,
    opsRawMethod,
    opsRawPath,
    opsRouteId,
    opsRoutePattern,
    opsSchedulesRaw,
    opsScriptName,
    opsSecretName,
    opsSecretValue,
    opsUsageModel,
    opsZoneId,
    showNotification,
  ])

  const runAdvancedOp = useCallback(() => {
    if (isDestructiveOp) {
      setShowDestructiveModal(true)
      return
    }
    void executeAdvancedOp()
  }, [isDestructiveOp, executeAdvancedOp])

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
                      <p key={warning.code}><strong>{warning.message}</strong> <span>({warning.code})</span></p>
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

          <article className="result-card cfpw-detail-card cfpw-detail-card-full">
            <div className="result-toolbar">
              <h4>Operações avançadas (Paridade Cloudflare)</h4>
            </div>

            <div className="cfpw-ops-guide" role="status" aria-live="polite">
              <strong>{currentOpsAction.label}</strong>
              <p>{currentOpsAction.description}</p>
              {details ? (
                <p>
                  Contexto rapido carregado do painel: <strong>{details.type === 'worker' ? 'Worker' : 'Pages'}</strong> <strong>{details.id}</strong>.
                </p>
              ) : null}
            </div>

            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="cfpw-ops-action">Ação</label>
                <select
                  id="cfpw-ops-action"
                  name="cfpw-ops-action"
                  value={opsAction}
                  onChange={(event) => {
                    setOpsAction(event.target.value)
                    setOpsResult(null)
                  }}
                  disabled={opsLoading}
                >
                  <optgroup label="Workers">
                    {WORKER_OPS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Pages">
                    {PAGE_OPS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Cloudflare API">
                    {RAW_OPS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="form-grid cfpw-ops-grid">
              {visibleOpsFields.has('scriptName') ? (
                <div className="field-group cfpw-field-animated">
                  <label htmlFor="cfpw-ops-script">Worker</label>
                  <input id="cfpw-ops-script" name="cfpw-ops-script" list="cfpw-workers-list" value={opsScriptName} onChange={(event) => setOpsScriptName(event.target.value)} placeholder="Selecione ou digite o scriptName" disabled={opsLoading} />
                  <datalist id="cfpw-workers-list">
                    {workers.map((worker) => (
                      <option key={worker.scriptName} value={worker.scriptName} />
                    ))}
                  </datalist>
                </div>
              ) : null}

              {visibleOpsFields.has('projectName') ? (
                <div className="field-group cfpw-field-animated">
                  <label htmlFor="cfpw-ops-project">Projeto Pages</label>
                  <input id="cfpw-ops-project" name="cfpw-ops-project" list="cfpw-pages-list" value={opsProjectName} onChange={(event) => setOpsProjectName(event.target.value)} placeholder="Selecione ou digite o projectName" disabled={opsLoading} />
                  <datalist id="cfpw-pages-list">
                    {pages.map((page) => (
                      <option key={page.projectName} value={page.projectName} />
                    ))}
                  </datalist>
                </div>
              ) : null}

              {visibleOpsFields.has('deploymentId') ? (
                <div className="field-group cfpw-field-animated">
                  <label htmlFor="cfpw-ops-deployment">Deployment ID</label>
                  <input id="cfpw-ops-deployment" name="cfpw-ops-deployment" value={opsDeploymentId} onChange={(event) => setOpsDeploymentId(event.target.value)} placeholder="Cole o ID do deployment" disabled={opsLoading} />
                </div>
              ) : null}

              {visibleOpsFields.has('domainName') ? (
                <div className="field-group cfpw-field-animated">
                  <label htmlFor="cfpw-ops-domain">Dominio</label>
                  <input id="cfpw-ops-domain" name="cfpw-ops-domain" value={opsDomainName} onChange={(event) => setOpsDomainName(event.target.value)} placeholder="ex.: app.exemplo.com" disabled={opsLoading} />
                </div>
              ) : null}

              {visibleOpsFields.has('secretName') ? (
                <div className="field-group cfpw-field-animated">
                  <label htmlFor="cfpw-ops-secret-name">Nome do secret</label>
                  <input id="cfpw-ops-secret-name" name="cfpw-ops-secret-name" value={opsSecretName} onChange={(event) => setOpsSecretName(event.target.value)} placeholder="ex.: API_KEY" disabled={opsLoading} />
                </div>
              ) : null}

              {visibleOpsFields.has('secretValue') ? (
                <div className="field-group cfpw-field-animated">
                  <label htmlFor="cfpw-ops-secret-value">Valor do secret</label>
                  <div className="cfpw-secret-wrap">
                    <input id="cfpw-ops-secret-value" name="cfpw-ops-secret-value" type={showSecret ? 'text' : 'password'} value={opsSecretValue} onChange={(event) => setOpsSecretValue(event.target.value)} placeholder="Digite o valor apenas na hora de gravar" disabled={opsLoading} />
                    <button type="button" className="cfpw-secret-toggle" onClick={() => setShowSecret((v) => !v)} title={showSecret ? 'Ocultar valor' : 'Mostrar valor'}>
                      {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ) : null}

              {visibleOpsFields.has('usageModel') ? (
                <div className="field-group">
                  <label htmlFor="cfpw-ops-usage-model">Usage model</label>
                  <select id="cfpw-ops-usage-model" name="cfpw-ops-usage-model" value={opsUsageModel} onChange={(event) => setOpsUsageModel(event.target.value)} disabled={opsLoading}>
                    <option value="standard">standard</option>
                    <option value="bundled">bundled</option>
                    <option value="unbound">unbound</option>
                  </select>
                </div>
              ) : null}

              {visibleOpsFields.has('projectBranch') ? (
                <div className="field-group">
                  <label htmlFor="cfpw-ops-project-branch">Branch principal</label>
                  <input id="cfpw-ops-project-branch" name="cfpw-ops-project-branch" value={opsProjectBranch} onChange={(event) => setOpsProjectBranch(event.target.value)} placeholder="main" disabled={opsLoading} />
                </div>
              ) : null}

              {visibleOpsFields.has('zoneId') ? (
                <div className="field-group">
                  <label htmlFor="cfpw-ops-zone-id">Zone ID</label>
                  <input id="cfpw-ops-zone-id" name="cfpw-ops-zone-id" value={opsZoneId} onChange={(event) => setOpsZoneId(event.target.value)} placeholder="Informe a zona usada nas rotas" disabled={opsLoading} />
                </div>
              ) : null}

              {visibleOpsFields.has('routeId') ? (
                <div className="field-group">
                  <label htmlFor="cfpw-ops-route-id">Route ID</label>
                  <input id="cfpw-ops-route-id" name="cfpw-ops-route-id" value={opsRouteId} onChange={(event) => setOpsRouteId(event.target.value)} placeholder="ID da rota retornado pela Cloudflare" disabled={opsLoading} />
                </div>
              ) : null}

              {visibleOpsFields.has('routePattern') ? (
                <div className="field-group cfpw-ops-grid-full">
                  <label htmlFor="cfpw-ops-route-pattern">Pattern da rota</label>
                  <input id="cfpw-ops-route-pattern" name="cfpw-ops-route-pattern" value={opsRoutePattern} onChange={(event) => setOpsRoutePattern(event.target.value)} placeholder="ex.: exemplo.com/api/*" disabled={opsLoading} />
                </div>
              ) : null}
            </div>

            {visibleOpsFields.has('schedules') ? (
              <div className="field-group">
                <label htmlFor="cfpw-ops-schedules">Cron triggers (um por linha)</label>
                <textarea
                  id="cfpw-ops-schedules"
                  name="cfpw-ops-schedules"
                  className="json-textarea"
                  rows={4}
                  value={opsSchedulesRaw}
                  onChange={(event) => setOpsSchedulesRaw(event.target.value)}
                  disabled={opsLoading}
                />
                <p className="field-hint">Exemplo: 0 5 * * * para executar diariamente as 05:00 UTC.</p>
              </div>
            ) : null}

            {visibleOpsFields.has('pageSettingsJson') ? (
              <div className="field-group">
                <label htmlFor="cfpw-ops-page-settings">JSON de settings do Pages</label>
                <textarea
                  id="cfpw-ops-page-settings"
                  name="cfpw-ops-page-settings"
                  className="json-textarea"
                  rows={6}
                  value={opsPageSettingsJson}
                  onChange={(event) => setOpsPageSettingsJson(event.target.value)}
                  disabled={opsLoading}
                />
                <p className="field-hint">Cole apenas JSON valido. Exemplo: {`{"production_branch":"main"}`}</p>
              </div>
            ) : null}

            {visibleOpsFields.has('rawMethod') || visibleOpsFields.has('rawPath') || visibleOpsFields.has('rawBodyJson') ? (
              <div className="cfpw-ops-guide cfpw-ops-guide-warning">
                <strong>Modo raw controlado</strong>
                <p>Use somente quando a operacao ainda nao estiver modelada no painel. O retorno sera exibido como veio da API Cloudflare.</p>
              </div>
            ) : null}

            {visibleOpsFields.has('rawMethod') || visibleOpsFields.has('rawPath') ? (
              <div className="form-grid cfpw-ops-grid">
                {visibleOpsFields.has('rawMethod') ? (
                  <div className="field-group">
                    <label htmlFor="cfpw-ops-raw-method">Metodo HTTP</label>
                    <select
                      id="cfpw-ops-raw-method"
                      name="cfpw-ops-raw-method"
                      value={opsRawMethod}
                      onChange={(event) => setOpsRawMethod(event.target.value)}
                      disabled={opsLoading}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                ) : null}

                {visibleOpsFields.has('rawPath') ? (
                  <div className="field-group cfpw-ops-grid-full">
                    <label htmlFor="cfpw-ops-raw-path">Path da API Cloudflare</label>
                    <input id="cfpw-ops-raw-path" name="cfpw-ops-raw-path" value={opsRawPath} onChange={(event) => setOpsRawPath(event.target.value)} placeholder="/accounts/... ou /zones/..." disabled={opsLoading} />
                  </div>
                ) : null}
              </div>
            ) : null}

            {visibleOpsFields.has('rawBodyJson') && opsRawMethod !== 'GET' ? (
              <div className="field-group">
                <label htmlFor="cfpw-ops-raw-body">JSON do corpo</label>
                <textarea
                  id="cfpw-ops-raw-body"
                  name="cfpw-ops-raw-body"
                  className="json-textarea"
                  rows={6}
                  value={opsRawBodyJson}
                  onChange={(event) => setOpsRawBodyJson(event.target.value)}
                  disabled={opsLoading}
                />
              </div>
            ) : null}

            <div className="inline-actions">
              <button type="button" className="primary-button" onClick={() => void runAdvancedOp()} disabled={opsLoading}>
                {opsLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                Executar: {currentOpsAction.label}
              </button>
            </div>

            {opsResult != null ? (() => {
              const resultObj = typeof opsResult === 'object' && opsResult !== null && !Array.isArray(opsResult) ? (opsResult as Record<string, unknown>) : null
              const kvEntries = resultObj
                ? Object.entries(resultObj).filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null)
                : []
              const hasComplexValues = resultObj
                ? Object.values(resultObj).some((v) => typeof v === 'object' && v !== null)
                : true
              const fullJson = JSON.stringify(opsResult, null, 2)

              return (
                <div className="cfpw-result-container">
                  <div className="cfpw-result-header">
                    <span className="cfpw-result-header__badge cfpw-result-header__badge--ok">
                      <CheckCircle size={12} /> Concluído
                    </span>
                    <span className="cfpw-result-header__label">{currentOpsAction.outcomeLabel}</span>
                  </div>

                  {kvEntries.length > 0 ? (
                    <div className="cfpw-result-kv">
                      {kvEntries.map(([key, value]) => (
                        <div key={key} className="cfpw-result-kv__row">
                          <div className="cfpw-result-kv__key">{key}</div>
                          <div className="cfpw-result-kv__value">{String(value ?? '—')}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {(hasComplexValues || kvEntries.length === 0) ? (
                    <details className="cfpw-result-details">
                      <summary>{kvEntries.length > 0 ? 'Ver JSON completo' : 'Dados retornados'}</summary>
                      <pre>{fullJson}</pre>
                    </details>
                  ) : null}
                </div>
              )
            })() : null}
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

      {/* ── Confirm Modal para operações destrutivas (substitui window.confirm) ── */}
      {showDestructiveModal && createPortal(
        <div className="cleanup-confirm-overlay" onClick={() => setShowDestructiveModal(false)}>
          <div className="cleanup-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <AlertTriangle size={32} className="cleanup-confirm-icon" />
            <h3>Operação destrutiva</h3>
            <p>Confirma a execução de <strong>{currentOpsAction.label}</strong>?<br/>Esta ação pode ser irreversível.</p>
            <div className="cleanup-confirm-actions">
              <button
                type="button"
                className="cleanup-confirm-cancel"
                onClick={() => setShowDestructiveModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="cleanup-confirm-proceed"
                onClick={() => void executeAdvancedOp()}
              >
                Confirmar execução
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}
