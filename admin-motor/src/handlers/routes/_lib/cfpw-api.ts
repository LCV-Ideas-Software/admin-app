import { CfApiError, cfApiRequest } from './cf-api-core';

type CfpwAccount = {
  id: string;
  name: string;
};

export type CfpwWorkerScript = {
  id?: string;
  tag?: string;
  etag?: string;
  handlers?: string[];
  modified_on?: string;
  created_on?: string;
};

export type CfpwWorkerDeployment = {
  id?: string;
  source?: string;
  strategy?: string;
  author_email?: string;
  created_on?: string;
  annotations?: Record<string, unknown>;
};

export type CfpwPageProject = {
  id?: string;
  name?: string;
  subdomain?: string;
  domains?: string[];
  production_branch?: string;
  created_on?: string;
  canonical_deployment?: {
    id?: string;
    created_on?: string;
    environment?: string;
    url?: string;
  };
  latest_deployment?: {
    id?: string;
    created_on?: string;
    environment?: string;
    url?: string;
  };
};

export type CfpwPageDeployment = {
  id?: string;
  short_id?: string;
  created_on?: string;
  environment?: string;
  url?: string;
  deployment_trigger?: {
    type?: string;
    metadata?: {
      branch?: string;
      commit_ref?: string;
      commit_hash?: string;
      commit_message?: string;
      commit_dirty?: boolean;
    };
  };
  latest_stage?: {
    name?: string;
    status?: string;
  };
};

export type CfpwWorkerSchedule = {
  cron?: string;
  created_on?: string;
  modified_on?: string;
};

export type CfpwWorkerSecret = {
  name?: string;
  type?: string;
};

export type CfpwPageDomain = {
  name?: string;
  status?: string;
  verification_data?: Record<string, unknown>;
};

type EnvWithCloudflarePwToken = {
  CLOUDFLARE_PW?: string;
  CF_ACCOUNT_ID?: string;
  CLOUDFLARE_DNS?: string;
  CLOUDFLARE_CACHE?: string;
};

const LEGACY_MISSING_TOKEN_MESSAGE =
  'Token Cloudflare ausente no runtime (configure CLOUDFLARE_PW ou use token override).';

// Converte o erro do núcleo compartilhado (cf-api-core) para o contrato de
// erro legado deste módulo: sempre Error simples, com as mesmas mensagens.
const toLegacyCfpwError = (error: unknown, fallback: string): Error => {
  if (!(error instanceof CfApiError)) {
    return error instanceof Error ? error : new Error(String(error));
  }

  switch (error.kind) {
    case 'missing-token':
      return new Error(LEGACY_MISSING_TOKEN_MESSAGE);
    case 'empty-body':
      return new Error(`${fallback}: corpo vazio inesperado (HTTP ${error.status}).`);
    case 'html-body':
      return new Error(`${fallback}: resposta HTML inesperada da API Cloudflare (HTTP ${error.status}).`);
    case 'non-json':
      return new Error(`${fallback}: resposta não-JSON da API Cloudflare (HTTP ${error.status}).`);
    default:
      return new Error(error.apiMessage ? `${fallback}: ${error.apiMessage}` : `${fallback}: HTTP ${error.status}`);
  }
};

const cloudflareRequest = async <T>(
  env: EnvWithCloudflarePwToken,
  path: string,
  fallback: string,
  init?: RequestInit,
  overrideToken?: string,
) => {
  // O overrideToken é usado pelos fluxos de zona/purge com o CLOUDFLARE_CACHE
  // já validado no call site; o env sintético entrega esse token ao core sem
  // criar fallback novo para o produto 'pw'.
  const requestEnv = overrideToken ? { CLOUDFLARE_PW: overrideToken } : env;

  try {
    const payload = await cfApiRequest<T>(requestEnv, 'pw', path, fallback, init);
    return payload.result;
  } catch (error) {
    throw toLegacyCfpwError(error, fallback);
  }
};

/**
 * Paths permitidos para o raw request de CF API (fonte única: também alimenta
 * GET /api/cfpw/raw-allowlist com pattern + descrição humana).
 * Restringe ao subconjunto de endpoints legitimamente necessários para operações de Workers e Pages.
 * @public
 */
export const CF_RAW_PATH_ALLOWLIST: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^\/accounts(\?|$)/, label: '/accounts — listar contas' },
  {
    pattern: /^\/accounts\/[^/]+\/workers\//,
    label: '/accounts/{accountId}/workers/… — scripts, settings, deployments, schedules, secrets',
  },
  {
    pattern: /^\/accounts\/[^/]+\/pages\//,
    label: '/accounts/{accountId}/pages/… — projetos, deployments, domínios',
  },
  { pattern: /^\/zones(\?|$)/, label: '/zones — listar zonas' },
  { pattern: /^\/zones\/[^/]+\/workers\/routes(\/|$|\?)/, label: '/zones/{zoneId}/workers/routes — rotas de Workers' },
  { pattern: /^\/zones\/[^/]+\/purge_cache(\/|$|\?)/, label: '/zones/{zoneId}/purge_cache — purge de cache' },
];

const ALLOWED_CF_PATH_PATTERNS: RegExp[] = CF_RAW_PATH_ALLOWLIST.map((entry) => entry.pattern);

/** Métodos HTTP aceitos pelo raw request (mesma fonte do runCloudflareRawRequest). @public */
export const CF_RAW_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

const validateCloudflareApiPath = (path: string) => {
  const normalized = path.trim();
  if (!normalized.startsWith('/')) {
    throw new Error('O path precisa iniciar com "/" para acessar a API Cloudflare.');
  }

  if (normalized.includes('..')) {
    throw new Error('Path inválido para operação avançada: uso de ".." não é permitido.');
  }

  const isAllowed = ALLOWED_CF_PATH_PATTERNS.some((re) => re.test(normalized));
  if (!isAllowed) {
    throw new Error('Path fora do escopo permitido para operações da API Cloudflare.');
  }

  return normalized;
};

const parseJsonSafe = (value: string, fieldName: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`JSON inválido no campo ${fieldName}.`);
  }
};

const normalizeAccount = (account: { id?: string; name?: string }) => ({
  id: String(account.id ?? '').trim(),
  name: String(account.name ?? '').trim(),
});

const listCloudflareAccounts = async (env: EnvWithCloudflarePwToken) => {
  const accounts = await cloudflareRequest<Array<{ id?: string; name?: string }>>(
    env,
    '/accounts?page=1&per_page=50',
    'Falha ao carregar contas da Cloudflare',
  );

  return (Array.isArray(accounts) ? accounts : []).map(normalizeAccount).filter((account) => account.id);
};

export const resolveCloudflarePwAccount = async (env: EnvWithCloudflarePwToken) => {
  const byEnv = String(env.CF_ACCOUNT_ID ?? '').trim();
  if (byEnv) {
    return {
      accountId: byEnv,
      accountName: null,
      source: 'CF_ACCOUNT_ID' as const,
      accounts: [] as CfpwAccount[],
    };
  }

  const accounts = await listCloudflareAccounts(env);
  const firstAccount = accounts[0];
  if (!firstAccount) {
    throw new Error('Nenhuma conta Cloudflare disponível para o token informado.');
  }

  return {
    accountId: firstAccount.id,
    accountName: firstAccount.name || null,
    source: 'auto-discovery' as const,
    accounts,
  };
};

export const listCloudflareWorkers = async (env: EnvWithCloudflarePwToken, accountId: string) => {
  const normalizedAccountId = accountId.trim();
  if (!normalizedAccountId) {
    throw new Error('Account ID é obrigatório para listar Workers.');
  }

  const workers = await cloudflareRequest<CfpwWorkerScript[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts`,
    'Falha ao listar Workers',
  );

  return Array.isArray(workers) ? workers : [];
};

export const getCloudflareWorker = async (env: EnvWithCloudflarePwToken, accountId: string, scriptName: string) => {
  const normalizedAccountId = accountId.trim();
  const normalizedScript = scriptName.trim();
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para ler Worker.');
  }

  const worker = await cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/settings`,
    `Falha ao ler Worker ${normalizedScript}`,
  );

  return worker;
};

export const listCloudflareWorkerDeployments = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedScript = scriptName.trim();
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para listar deployments de Worker.');
  }

  const deployments = await cloudflareRequest<CfpwWorkerDeployment[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/deployments`,
    `Falha ao listar deployments do Worker ${normalizedScript}`,
  );

  return Array.isArray(deployments) ? deployments : [];
};

export const deleteCloudflareWorker = async (env: EnvWithCloudflarePwToken, accountId: string, scriptName: string) => {
  const normalizedAccountId = accountId.trim();
  const normalizedScript = scriptName.trim();
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para remover Worker.');
  }

  await cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}`,
    `Falha ao remover Worker ${normalizedScript}`,
    {
      method: 'DELETE',
    },
  );
};

export const listCloudflarePagesProjects = async (env: EnvWithCloudflarePwToken, accountId: string) => {
  const normalizedAccountId = accountId.trim();
  if (!normalizedAccountId) {
    throw new Error('Account ID é obrigatório para listar Pages.');
  }

  const projects = await cloudflareRequest<CfpwPageProject[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects`,
    'Falha ao listar projetos Pages',
  );

  return Array.isArray(projects) ? projects : [];
};

export const getCloudflarePagesProject = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedProject = projectName.trim();
  if (!normalizedAccountId || !normalizedProject) {
    throw new Error('Account ID e projectName são obrigatórios para ler projeto Pages.');
  }

  const project = await cloudflareRequest<CfpwPageProject>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}`,
    `Falha ao ler projeto Pages ${normalizedProject}`,
  );

  return project;
};

export const listCloudflarePagesDeployments = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedProject = projectName.trim();
  if (!normalizedAccountId || !normalizedProject) {
    throw new Error('Account ID e projectName são obrigatórios para listar deployments de Pages.');
  }

  const deployments = await cloudflareRequest<CfpwPageDeployment[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments`,
    `Falha ao listar deployments de Pages ${normalizedProject}`,
  );

  return Array.isArray(deployments) ? deployments : [];
};

export const deleteCloudflarePagesProject = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedProject = projectName.trim();
  if (!normalizedAccountId || !normalizedProject) {
    throw new Error('Account ID e projectName são obrigatórios para remover projeto Pages.');
  }

  await cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}`,
    `Falha ao remover projeto Pages ${normalizedProject}`,
    {
      method: 'DELETE',
    },
  );
};

export const deleteCloudflarePagesDeployment = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
  deploymentId: string,
  force = false,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedProject = projectName.trim();
  const normalizedDeploymentId = deploymentId.trim();
  if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
    throw new Error('Account ID, projectName e deploymentId são obrigatórios para remover deployment de Pages.');
  }

  const queryString = force ? '?force=true' : '';

  await cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}${queryString}`,
    `Falha ao remover deployment ${normalizedDeploymentId} do projeto ${normalizedProject}`,
    {
      method: 'DELETE',
    },
  );
};

export const getCloudflareWorkerSchedules = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedScript = scriptName.trim();
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para ler cron triggers do Worker.');
  }

  // A API da CF devolve result como { schedules: [...] } neste endpoint; formas em array
  // são aceitas defensivamente para compatibilidade.
  const result = await cloudflareRequest<{ schedules?: CfpwWorkerSchedule[] } | CfpwWorkerSchedule[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/schedules`,
    `Falha ao ler cron triggers do Worker ${normalizedScript}`,
  );

  if (Array.isArray(result)) {
    return result;
  }
  return Array.isArray(result?.schedules) ? result.schedules : [];
};

export const updateCloudflareWorkerSchedules = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
  schedules: Array<{ cron: string }>,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedScript = scriptName.trim();
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para atualizar cron triggers do Worker.');
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/schedules`,
    `Falha ao atualizar cron triggers do Worker ${normalizedScript}`,
    {
      method: 'PUT',
      body: JSON.stringify(schedules),
    },
  );
};

export const getCloudflareWorkerUsageModel = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedScript = scriptName.trim();
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para ler usage model do Worker.');
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/usage-model`,
    `Falha ao ler usage model do Worker ${normalizedScript}`,
  );
};

export const updateCloudflareWorkerUsageModel = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
  usageModel: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedScript = scriptName.trim();
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para atualizar usage model do Worker.');
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/usage-model`,
    `Falha ao atualizar usage model do Worker ${normalizedScript}`,
    {
      method: 'PUT',
      body: JSON.stringify({ usage_model: usageModel.trim() }),
    },
  );
};

export const listCloudflareWorkerSecrets = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedScript = scriptName.trim();
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para listar secrets do Worker.');
  }

  const secrets = await cloudflareRequest<CfpwWorkerSecret[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/secrets`,
    `Falha ao listar secrets do Worker ${normalizedScript}`,
  );

  return Array.isArray(secrets) ? secrets : [];
};

export const addCloudflareWorkerSecret = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
  name: string,
  text: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedScript = scriptName.trim();
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para adicionar secret do Worker.');
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
  );
};

export const deleteCloudflareWorkerSecret = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
  secretName: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedScript = scriptName.trim();
  const normalizedSecret = secretName.trim();
  if (!normalizedAccountId || !normalizedScript || !normalizedSecret) {
    throw new Error('Account ID, scriptName e secretName são obrigatórios para remover secret do Worker.');
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/secrets/${encodeURIComponent(normalizedSecret)}`,
    `Falha ao remover secret ${normalizedSecret} do Worker ${normalizedScript}`,
    {
      method: 'DELETE',
    },
  );
};

export const listCloudflarePagesDomains = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedProject = projectName.trim();
  if (!normalizedAccountId || !normalizedProject) {
    throw new Error('Account ID e projectName são obrigatórios para listar domínios do Pages.');
  }

  const domains = await cloudflareRequest<CfpwPageDomain[]>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/domains`,
    `Falha ao listar domínios do projeto ${normalizedProject}`,
  );

  return Array.isArray(domains) ? domains : [];
};

export const addCloudflarePagesDomain = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
  domainName: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedProject = projectName.trim();
  const normalizedDomain = domainName.trim();
  if (!normalizedAccountId || !normalizedProject || !normalizedDomain) {
    throw new Error('Account ID, projectName e domainName são obrigatórios para adicionar domínio no Pages.');
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/domains`,
    `Falha ao adicionar domínio no projeto ${normalizedProject}`,
    {
      method: 'POST',
      body: JSON.stringify({ name: normalizedDomain }),
    },
  );
};

export const deleteCloudflarePagesDomain = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
  domainName: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedProject = projectName.trim();
  const normalizedDomain = domainName.trim();
  if (!normalizedAccountId || !normalizedProject || !normalizedDomain) {
    throw new Error('Account ID, projectName e domainName são obrigatórios para remover domínio do Pages.');
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/domains/${encodeURIComponent(normalizedDomain)}`,
    `Falha ao remover domínio ${normalizedDomain} do projeto ${normalizedProject}`,
    {
      method: 'DELETE',
    },
  );
};

export const getCloudflarePagesDeployment = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
  deploymentId: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedProject = projectName.trim();
  const normalizedDeploymentId = deploymentId.trim();
  if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
    throw new Error('Account ID, projectName e deploymentId são obrigatórios para ler deployment de Pages.');
  }

  return cloudflareRequest<CfpwPageDeployment>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}`,
    `Falha ao ler deployment ${normalizedDeploymentId}`,
  );
};

const isDirectUploadLikeTrigger = (triggerType: string) => {
  const normalized = triggerType.trim().toLowerCase();
  return normalized === 'ad_hoc' || normalized === 'direct_upload';
};

export const retryCloudflarePagesDeployment = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
  deploymentId: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedProject = projectName.trim();
  const normalizedDeploymentId = deploymentId.trim();
  if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
    throw new Error('Account ID, projectName e deploymentId são obrigatórios para retry de deployment.');
  }

  const deployment = await getCloudflarePagesDeployment(
    env,
    normalizedAccountId,
    normalizedProject,
    normalizedDeploymentId,
  );
  const triggerType = String(deployment.deployment_trigger?.type ?? '').trim();
  if (isDirectUploadLikeTrigger(triggerType)) {
    throw new Error(
      `Retry indisponível para deployment ${normalizedDeploymentId}: deployment do tipo ${triggerType || 'direct_upload'} não suporta retry (somente builds).`,
    );
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}/retry`,
    `Falha ao executar retry do deployment ${normalizedDeploymentId}`,
    {
      method: 'POST',
    },
  );
};

export const rollbackCloudflarePagesDeployment = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
  deploymentId: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedProject = projectName.trim();
  const normalizedDeploymentId = deploymentId.trim();
  if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
    throw new Error('Account ID, projectName e deploymentId são obrigatórios para rollback de deployment.');
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}/rollback`,
    `Falha ao executar rollback do deployment ${normalizedDeploymentId}`,
    {
      method: 'POST',
    },
  );
};

export const getCloudflarePagesDeploymentLogs = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
  deploymentId: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedProject = projectName.trim();
  const normalizedDeploymentId = deploymentId.trim();
  if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
    throw new Error('Account ID, projectName e deploymentId são obrigatórios para leitura de logs do deployment.');
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}/history/logs`,
    `Falha ao ler logs do deployment ${normalizedDeploymentId}`,
  );
};

// Lança CfApiError (não o Error legado): o handler worker-create precisa do
// status/código CF para mapear conflito de nome (10021/409) em 409 pt-BR.
export const createCloudflareWorkerFromTemplate = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
  templateCode: string,
  usageModel?: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedScript = scriptName.trim();
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para criar Worker.');
  }

  const compatibilityDate = new Date().toISOString().slice(0, 10);
  const metadata = {
    main_module: 'index.js',
    compatibility_date: compatibilityDate,
    usage_model: usageModel?.trim() || 'standard',
    observability: { enabled: true },
  };

  const content =
    templateCode.trim() ||
    `export default {\n  async fetch(request) {\n    return new Response('Worker ${normalizedScript} ativo', {\n      status: 200,\n      headers: { 'content-type': 'text/plain; charset=utf-8' },\n    })\n  },\n}\n`;

  const form = new FormData();
  form.append('metadata', JSON.stringify(metadata));
  // O template é um ES module (export default): a parte precisa do content
  // type application/javascript+module para a Cloudflare tratá-la como ESM.
  form.append('index.js', new Blob([content], { type: 'application/javascript+module' }), 'index.js');

  const payload = await cfApiRequest<Record<string, unknown>>(
    env,
    'pw',
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}`,
    `Falha ao criar Worker ${normalizedScript}`,
    {
      method: 'PUT',
      // fetch define boundary automaticamente para multipart/form-data
      body: form,
    },
  );

  return payload.result;
};

export const createCloudflarePagesProject = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
  productionBranch?: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedProject = projectName.trim();
  if (!normalizedAccountId || !normalizedProject) {
    throw new Error('Account ID e projectName são obrigatórios para criar projeto Pages.');
  }

  const branch = productionBranch?.trim() || 'main';

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects`,
    `Falha ao criar projeto Pages ${normalizedProject}`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: normalizedProject,
        production_branch: branch,
      }),
    },
  );
};

export const updateCloudflarePagesProjectSettings = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  projectName: string,
  settings: Record<string, unknown>,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedProject = projectName.trim();
  if (!normalizedAccountId || !normalizedProject) {
    throw new Error('Account ID e projectName são obrigatórios para atualizar settings do Pages.');
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}`,
    `Falha ao atualizar settings do projeto ${normalizedProject}`,
    {
      method: 'PATCH',
      body: JSON.stringify(settings),
    },
  );
};

export const listCloudflareWorkerVersions = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedScript = scriptName.trim();
  if (!normalizedAccountId || !normalizedScript) {
    throw new Error('Account ID e scriptName são obrigatórios para listar versões do Worker.');
  }

  const versions = await cloudflareRequest<Array<Record<string, unknown>>>(
    env,
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/versions`,
    `Falha ao listar versões do Worker ${normalizedScript}`,
  );

  return Array.isArray(versions) ? versions : [];
};

// Lança CfApiError (não o Error legado): o handler worker-deployments precisa
// do status CF para o mapeamento 4xx-passthrough.
export const deployCloudflareWorkerVersion = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  scriptName: string,
  versions: Array<{ versionId: string; percentage: number }>,
  options?: { message?: string; force?: boolean },
) => {
  const normalizedAccountId = accountId.trim();
  const normalizedScript = scriptName.trim();
  if (!normalizedAccountId || !normalizedScript || versions.length === 0) {
    throw new Error('Account ID, scriptName e versions são obrigatórios para promover versão do Worker.');
  }

  const queryString = options?.force ? '?force=true' : '';

  const payload = await cfApiRequest<Record<string, unknown>>(
    env,
    'pw',
    `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/deployments${queryString}`,
    `Falha ao promover versão do Worker ${normalizedScript}`,
    {
      method: 'POST',
      body: JSON.stringify({
        strategy: 'percentage',
        versions: versions.map((version) => ({
          version_id: version.versionId,
          percentage: version.percentage,
        })),
        annotations: {
          'workers/message': options?.message?.trim() || 'Deploy via admin-app',
        },
      }),
    },
  );

  return payload.result;
};

export const listCloudflareWorkerRoutes = async (env: EnvWithCloudflarePwToken, zoneId: string) => {
  const normalizedZoneId = zoneId.trim();
  if (!normalizedZoneId) {
    throw new Error('zoneId é obrigatório para listar rotas de Worker.');
  }

  const routes = await cloudflareRequest<Array<Record<string, unknown>>>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/workers/routes`,
    `Falha ao listar rotas de Worker da zona ${normalizedZoneId}`,
  );

  return Array.isArray(routes) ? routes : [];
};

export const addCloudflareWorkerRoute = async (
  env: EnvWithCloudflarePwToken,
  zoneId: string,
  pattern: string,
  scriptName: string,
) => {
  const normalizedZoneId = zoneId.trim();
  const normalizedPattern = pattern.trim();
  const normalizedScript = scriptName.trim();
  if (!normalizedZoneId || !normalizedPattern || !normalizedScript) {
    throw new Error('zoneId, pattern e scriptName são obrigatórios para adicionar rota de Worker.');
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/workers/routes`,
    `Falha ao adicionar rota ${normalizedPattern}`,
    {
      method: 'POST',
      body: JSON.stringify({
        pattern: normalizedPattern,
        script: normalizedScript,
      }),
    },
  );
};

export const deleteCloudflareWorkerRoute = async (env: EnvWithCloudflarePwToken, zoneId: string, routeId: string) => {
  const normalizedZoneId = zoneId.trim();
  const normalizedRouteId = routeId.trim();
  if (!normalizedZoneId || !normalizedRouteId) {
    throw new Error('zoneId e routeId são obrigatórios para remover rota de Worker.');
  }

  return cloudflareRequest<Record<string, unknown>>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/workers/routes/${encodeURIComponent(normalizedRouteId)}`,
    `Falha ao remover rota ${normalizedRouteId}`,
    {
      method: 'DELETE',
    },
  );
};

export const runCloudflareRawRequest = async (
  env: EnvWithCloudflarePwToken,
  method: string,
  path: string,
  bodyJson?: string,
) => {
  const normalizedPath = validateCloudflareApiPath(path);
  const normalizedMethod = method.trim().toUpperCase();

  if (!(CF_RAW_ALLOWED_METHODS as readonly string[]).includes(normalizedMethod)) {
    throw new Error(`Método não suportado para operação raw: ${normalizedMethod}`);
  }

  const parsedBody = parseJsonSafe(bodyJson ?? '', 'rawBodyJson');
  const requestInit: RequestInit = {
    method: normalizedMethod,
  };

  if (parsedBody != null && normalizedMethod !== 'GET') {
    requestInit.body = JSON.stringify(parsedBody);
  }

  return cloudflareRequest<Record<string, unknown> | Array<Record<string, unknown>>>(
    env,
    normalizedPath,
    `Falha na operação raw ${normalizedMethod} ${normalizedPath}`,
    requestInit,
  );
};

export type CfpwZone = {
  id?: string;
  name?: string;
  status?: string;
};

export const listCloudflareZones = async (env: EnvWithCloudflarePwToken) => {
  const token = env.CLOUDFLARE_CACHE?.trim();

  if (!token) {
    throw new Error('Nenhum token Cloudflare configurado no ambiente para ler zonas.');
  }

  const zones = await cloudflareRequest<CfpwZone[]>(
    env,
    '/zones?per_page=500',
    'Falha ao carregar zonas da Cloudflare',
    undefined,
    token,
  );

  return Array.isArray(zones) ? zones : [];
};

export const purgeCloudflareZoneCache = async (
  env: EnvWithCloudflarePwToken,
  zoneId: string,
  options: { hosts?: string[]; purge_everything?: boolean },
) => {
  const normalizedZoneId = zoneId.trim();
  if (!normalizedZoneId) {
    throw new Error('zoneId é obrigatório para realizar purge de cache.');
  }

  const hasHosts = Array.isArray(options.hosts) && options.hosts.length > 0;
  const isEverything = Boolean(options.purge_everything);

  if (!hasHosts && !isEverything) {
    throw new Error('Forneça `hosts` ou `purge_everything: true` para o purge_cache.');
  }

  const payload: Record<string, unknown> = {};
  if (hasHosts) {
    payload.hosts = options.hosts;
  }
  if (isEverything) {
    payload.purge_everything = true;
  }

  const token = env.CLOUDFLARE_CACHE?.trim();

  if (!token) {
    throw new Error('Token global ausente no runtime para Zone.CachePurge (configure CLOUDFLARE_CACHE).');
  }

  const result = await cloudflareRequest<Record<string, unknown>>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/purge_cache`,
    `Falha ao executar purge_cache na zona ${normalizedZoneId}`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );

  return result;
};
