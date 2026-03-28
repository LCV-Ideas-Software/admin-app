type CloudflareApiError = {
  message?: string
}

type CloudflareApiResponse<T> = {
  success?: boolean
  errors?: CloudflareApiError[]
  result?: T
}

export type CfpwAccount = {
  id: string
  name: string
}

export type CfpwWorkerScript = {
  id?: string
  tag?: string
  etag?: string
  handlers?: string[]
  modified_on?: string
  created_on?: string
}

export type CfpwWorkerDeployment = {
  id?: string
  source?: string
  strategy?: string
  author_email?: string
  created_on?: string
  annotations?: Record<string, unknown>
}

export type CfpwPageProject = {
  id?: string
  name?: string
  subdomain?: string
  domains?: string[]
  production_branch?: string
  created_on?: string
  latest_deployment?: {
    id?: string
    created_on?: string
    environment?: string
    url?: string
  }
}

export type CfpwPageDeployment = {
  id?: string
  short_id?: string
  created_on?: string
  environment?: string
  url?: string
  latest_stage?: {
    name?: string
    status?: string
  }
}

export type CfpwWorkerSchedule = {
  cron?: string
  created_on?: string
  modified_on?: string
}

export type CfpwWorkerSecret = {
  name?: string
  type?: string
}

export type CfpwPageDomain = {
  name?: string
  status?: string
  verification_data?: Record<string, unknown>
}

type EnvWithCloudflarePwToken = {
  CLOUDFLARE_PW?: string
  CLOUDFLARE_API_TOKEN?: string
  CF_API_TOKEN?: string
  CF_ACCOUNT_ID?: string
}

const resolveToken = (env: EnvWithCloudflarePwToken) => {
  const byPwToken = env.CLOUDFLARE_PW?.trim()
  if (byPwToken) {
    return byPwToken
  }

  const byApiToken = env.CLOUDFLARE_API_TOKEN?.trim()
  if (byApiToken) {
    return byApiToken
  }

  const byCfToken = env.CF_API_TOKEN?.trim()
  if (byCfToken) {
    return byCfToken
  }

  return ''
}

const parseJsonOrThrow = <T>(rawText: string, fallback: string, response: Response): T => {
  const trimmed = rawText.trim()
  if (!trimmed) {
    throw new Error(`${fallback}: corpo vazio inesperado (HTTP ${response.status}).`)
  }

  const looksLikeHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')
  if (looksLikeHtml) {
    throw new Error(`${fallback}: resposta HTML inesperada da API Cloudflare (HTTP ${response.status}).`)
  }

  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error(`${fallback}: resposta não-JSON da API Cloudflare (HTTP ${response.status}).`)
  }
}

const toFirstError = (payload: CloudflareApiResponse<unknown>) => {
  const firstError = Array.isArray(payload.errors) && payload.errors.length > 0
    ? payload.errors[0]
    : null
  return firstError?.message?.trim() || null
}

const cloudflareRequest = async <T>(
  env: EnvWithCloudflarePwToken,
  path: string,
  fallback: string,
  init?: RequestInit,
) => {
  const token = resolveToken(env)
  if (!token) {
    throw new Error('Token Cloudflare ausente no runtime (configure CLOUDFLARE_PW, CLOUDFLARE_API_TOKEN ou CF_API_TOKEN).')
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: init?.body,
  })

  const rawText = await response.text()
  const payload = parseJsonOrThrow<CloudflareApiResponse<T>>(rawText, fallback, response)

  if (!response.ok || payload.success !== true) {
    const message = toFirstError(payload)
    throw new Error(message ? `${fallback}: ${message}` : `${fallback}: HTTP ${response.status}`)
  }

  return payload.result as T
}

const normalizeAccount = (account: { id?: string; name?: string }) => ({
  id: String(account.id ?? '').trim(),
  name: String(account.name ?? '').trim(),
})

export const listCloudflareAccounts = async (env: EnvWithCloudflarePwToken) => {
  const accounts = await cloudflareRequest<Array<{ id?: string; name?: string }>>(
    env,
    '/accounts?page=1&per_page=50',
    'Falha ao carregar contas da Cloudflare',
  )

  return (Array.isArray(accounts) ? accounts : [])
    .map(normalizeAccount)
    .filter((account) => account.id)
}

export const resolveCloudflarePwAccount = async (env: EnvWithCloudflarePwToken) => {
  const byEnv = String(env.CF_ACCOUNT_ID ?? '').trim()
  if (byEnv) {
    return {
      accountId: byEnv,
      accountName: null,
      source: 'CF_ACCOUNT_ID' as const,
      accounts: [] as CfpwAccount[],
    }
  }

  const accounts = await listCloudflareAccounts(env)
  if (accounts.length === 0) {
    throw new Error('Nenhuma conta Cloudflare disponível para o token informado.')
  }

  return {
    accountId: accounts[0].id,
    accountName: accounts[0].name || null,
    source: 'auto-discovery' as const,
    accounts,
  }
}

export const listCloudflareWorkers = async (env: EnvWithCloudflarePwToken, accountId: string) => {
  const normalizedAccountId = accountId.trim()
  if (!normalizedAccountId) {
    throw new Error('Account ID é obrigatório para listar Workers.')
  }

  const workers = await cloudflareRequest<CfpwWorkerScript[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts`,
    'Falha ao listar Workers',
  )

  return Array.isArray(workers) ? workers : []
}

export const getCloudflareWorker = async (env: EnvWithCloudflarePwToken, accountId: string, scriptName: string) => {
  const normalizedAccountId = accountId.trim()
  const normalizedScript = scriptName.trim()
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para ler Worker.')
  }

  const worker = await cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/settings`,
    `Falha ao ler Worker ${normalizedScript}`,
  )

  return worker
}

export const listCloudflareWorkerDeployments = async (env: EnvWithCloudflarePwToken, accountId: string, scriptName: string) => {
  const normalizedAccountId = accountId.trim()
  const normalizedScript = scriptName.trim()
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para listar deployments de Worker.')
  }

  const deployments = await cloudflareRequest<CfpwWorkerDeployment[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/deployments`,
    `Falha ao listar deployments do Worker ${normalizedScript}`,
  )

  return Array.isArray(deployments) ? deployments : []
}

export const deleteCloudflareWorker = async (env: EnvWithCloudflarePwToken, accountId: string, scriptName: string) => {
  const normalizedAccountId = accountId.trim()
  const normalizedScript = scriptName.trim()
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para remover Worker.')
  }

  await cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}`,
    `Falha ao remover Worker ${normalizedScript}`,
    {
      method: 'DELETE',
    },
  )
}

export const listCloudflarePagesProjects = async (env: EnvWithCloudflarePwToken, accountId: string) => {
  const normalizedAccountId = accountId.trim()
  if (!normalizedAccountId) {
    throw new Error('Account ID é obrigatório para listar Pages.')
  }

  const projects = await cloudflareRequest<CfpwPageProject[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects`,
    'Falha ao listar projetos Pages',
  )

  return Array.isArray(projects) ? projects : []
}

export const getCloudflarePagesProject = async (env: EnvWithCloudflarePwToken, accountId: string, projectName: string) => {
  const normalizedAccountId = accountId.trim()
  const normalizedProject = projectName.trim()
  if (!normalizedAccountId || !normalizedProject) {
    throw new Error('Account ID e projectName são obrigatórios para ler projeto Pages.')
  }

  const project = await cloudflareRequest<CfpwPageProject>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}`,
    `Falha ao ler projeto Pages ${normalizedProject}`,
  )

  return project
}

export const listCloudflarePagesDeployments = async (env: EnvWithCloudflarePwToken, accountId: string, projectName: string) => {
  const normalizedAccountId = accountId.trim()
  const normalizedProject = projectName.trim()
  if (!normalizedAccountId || !normalizedProject) {
    throw new Error('Account ID e projectName são obrigatórios para listar deployments de Pages.')
  }

  const deployments = await cloudflareRequest<CfpwPageDeployment[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments`,
    `Falha ao listar deployments de Pages ${normalizedProject}`,
  )

  return Array.isArray(deployments) ? deployments : []
}

export const deleteCloudflarePagesProject = async (env: EnvWithCloudflarePwToken, accountId: string, projectName: string) => {
  const normalizedAccountId = accountId.trim()
  const normalizedProject = projectName.trim()
  if (!normalizedAccountId || !normalizedProject) {
    throw new Error('Account ID e projectName são obrigatórios para remover projeto Pages.')
  }

  await cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}`,
    `Falha ao remover projeto Pages ${normalizedProject}`,
    {
      method: 'DELETE',
    },
  )
}

export const getCloudflareWorkerSchedules = async (env: EnvWithCloudflarePwToken, accountId: string, scriptName: string) => {
  const normalizedAccountId = accountId.trim()
  const normalizedScript = scriptName.trim()
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para ler cron triggers do Worker.')
  }

  const schedules = await cloudflareRequest<CfpwWorkerSchedule[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/schedules`,
    `Falha ao ler cron triggers do Worker ${normalizedScript}`,
  )

  return Array.isArray(schedules) ? schedules : []
}

export const updateCloudflareWorkerSchedules = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
  schedules: Array<{ cron: string }>,
) => {
  const normalizedAccountId = accountId.trim()
  const normalizedScript = scriptName.trim()
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para atualizar cron triggers do Worker.')
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/schedules`,
    `Falha ao atualizar cron triggers do Worker ${normalizedScript}`,
    {
      method: 'PUT',
      body: JSON.stringify(schedules),
    },
  )
}

export const getCloudflareWorkerUsageModel = async (env: EnvWithCloudflarePwToken, accountId: string, scriptName: string) => {
  const normalizedAccountId = accountId.trim()
  const normalizedScript = scriptName.trim()
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para ler usage model do Worker.')
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/usage-model`,
    `Falha ao ler usage model do Worker ${normalizedScript}`,
  )
}

export const updateCloudflareWorkerUsageModel = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
  usageModel: string,
) => {
  const normalizedAccountId = accountId.trim()
  const normalizedScript = scriptName.trim()
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para atualizar usage model do Worker.')
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/usage-model`,
    `Falha ao atualizar usage model do Worker ${normalizedScript}`,
    {
      method: 'PUT',
      body: JSON.stringify({ usage_model: usageModel.trim() }),
    },
  )
}

export const listCloudflareWorkerSecrets = async (env: EnvWithCloudflarePwToken, accountId: string, scriptName: string) => {
  const normalizedAccountId = accountId.trim()
  const normalizedScript = scriptName.trim()
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para listar secrets do Worker.')
  }

  const secrets = await cloudflareRequest<CfpwWorkerSecret[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/secrets`,
    `Falha ao listar secrets do Worker ${normalizedScript}`,
  )

  return Array.isArray(secrets) ? secrets : []
}

export const addCloudflareWorkerSecret = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
  name: string,
  text: string,
) => {
  const normalizedAccountId = accountId.trim()
  const normalizedScript = scriptName.trim()
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para adicionar secret do Worker.')
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/secrets`,
    `Falha ao adicionar secret no Worker ${normalizedScript}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        name: name.trim(),
        text,
        type: 'secret_text',
      }),
    },
  )
}

export const deleteCloudflareWorkerSecret = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
  secretName: string,
) => {
  const normalizedAccountId = accountId.trim()
  const normalizedScript = scriptName.trim()
  const normalizedSecret = secretName.trim()
  if (!normalizedAccountId || !normalizedScript || !normalizedSecret) {
    throw new Error('Account ID, scriptName e secretName são obrigatórios para remover secret do Worker.')
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/secrets/${encodeURIComponent(normalizedSecret)}`,
    `Falha ao remover secret ${normalizedSecret} do Worker ${normalizedScript}`,
    {
      method: 'DELETE',
    },
  )
}

export const listCloudflarePagesDomains = async (env: EnvWithCloudflarePwToken, accountId: string, projectName: string) => {
  const normalizedAccountId = accountId.trim()
  const normalizedProject = projectName.trim()
  if (!normalizedAccountId || !normalizedProject) {
    throw new Error('Account ID e projectName são obrigatórios para listar domínios do Pages.')
  }

  const domains = await cloudflareRequest<CfpwPageDomain[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/domains`,
    `Falha ao listar domínios do projeto ${normalizedProject}`,
  )

  return Array.isArray(domains) ? domains : []
}

export const addCloudflarePagesDomain = async (env: EnvWithCloudflarePwToken, accountId: string, projectName: string, domainName: string) => {
  const normalizedAccountId = accountId.trim()
  const normalizedProject = projectName.trim()
  const normalizedDomain = domainName.trim()
  if (!normalizedAccountId || !normalizedProject || !normalizedDomain) {
    throw new Error('Account ID, projectName e domainName são obrigatórios para adicionar domínio no Pages.')
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/domains`,
    `Falha ao adicionar domínio no projeto ${normalizedProject}`,
    {
      method: 'POST',
      body: JSON.stringify({ name: normalizedDomain }),
    },
  )
}

export const deleteCloudflarePagesDomain = async (env: EnvWithCloudflarePwToken, accountId: string, projectName: string, domainName: string) => {
  const normalizedAccountId = accountId.trim()
  const normalizedProject = projectName.trim()
  const normalizedDomain = domainName.trim()
  if (!normalizedAccountId || !normalizedProject || !normalizedDomain) {
    throw new Error('Account ID, projectName e domainName são obrigatórios para remover domínio do Pages.')
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/domains/${encodeURIComponent(normalizedDomain)}`,
    `Falha ao remover domínio ${normalizedDomain} do projeto ${normalizedProject}`,
    {
      method: 'DELETE',
    },
  )
}

export const retryCloudflarePagesDeployment = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
  deploymentId: string,
) => {
  const normalizedAccountId = accountId.trim()
  const normalizedProject = projectName.trim()
  const normalizedDeploymentId = deploymentId.trim()
  if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
    throw new Error('Account ID, projectName e deploymentId são obrigatórios para retry de deployment.')
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}/retry`,
    `Falha ao executar retry do deployment ${normalizedDeploymentId}`,
    {
      method: 'POST',
    },
  )
}

export const rollbackCloudflarePagesDeployment = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
  deploymentId: string,
) => {
  const normalizedAccountId = accountId.trim()
  const normalizedProject = projectName.trim()
  const normalizedDeploymentId = deploymentId.trim()
  if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
    throw new Error('Account ID, projectName e deploymentId são obrigatórios para rollback de deployment.')
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}/rollback`,
    `Falha ao executar rollback do deployment ${normalizedDeploymentId}`,
    {
      method: 'POST',
    },
  )
}

export const getCloudflarePagesDeploymentLogs = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
  deploymentId: string,
) => {
  const normalizedAccountId = accountId.trim()
  const normalizedProject = projectName.trim()
  const normalizedDeploymentId = deploymentId.trim()
  if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
    throw new Error('Account ID, projectName e deploymentId são obrigatórios para leitura de logs do deployment.')
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}/history/logs`,
    `Falha ao ler logs do deployment ${normalizedDeploymentId}`,
  )
}
