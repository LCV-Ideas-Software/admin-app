/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers de fetch tipados dos endpoints do módulo CF P&W. Mantém a semântica
 * de fetch crua de CfPwModule.tsx (incl. header X-Admin-Actor) — cada helper
 * retorna { response, payload } para o chamador aplicar as mesmas checagens
 * de `response.ok`/`payload.ok` de antes. Inclui também os formatadores puros
 * compartilhados entre dashboard e telas de detalhe.
 */

import type {
  BuildActionPayload,
  BuildConfigPayload,
  BuildLogsPayload,
  BuildsPayload,
  CreateWorkerPayload,
  D1DatabaseMutationPayload,
  D1ExportPayload,
  D1ImportPayload,
  D1QueryPayload,
  DeletePayload,
  DetailType,
  DnsZonesPayload,
  KvNamespaceMutationPayload,
  KvValueMutationPayload,
  OpsResponsePayload,
  OverviewPayload,
  PageBuildConfigPayload,
  PageDeploymentDeletePayload,
  PageDeploymentPayload,
  PageDeployPayload,
  PageDetailsPayload,
  PageDomainDetailPayload,
  PageEnvPayload,
  PageProjectCreatePayload,
  PagePurgeCachePayload,
  PageWebAnalyticsPayload,
  R2BucketMutationPayload,
  R2ObjectPutPayload,
  R2ObjectsDeletePayload,
  RawAllowlistPayload,
  WorkerBinding,
  WorkerCodePayload,
  WorkerCodePutPayload,
  WorkerDeploymentsPayload,
  WorkerDetailsPayload,
  WorkerDomainsPayload,
  WorkerMetricsPayload,
  WorkerSettingsPayload,
  WorkerSubdomainPayload,
  WorkerVersionsPayload,
} from './types';

const parseApiPayload = async <T>(response: Response, fallback: string): Promise<T> => {
  const rawText = await response.text();
  const trimmed = rawText.trim();
  const cfRay = response.headers.get('cf-ray');
  const statusInfo = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
  const traceInfo = cfRay ? `${statusInfo}, cf-ray ${cfRay}` : statusInfo;

  if (!trimmed) {
    throw new Error(`${fallback} (${traceInfo}, corpo vazio).`);
  }

  const looksLikeHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html');
  if (looksLikeHtml) {
    throw new Error(`${fallback} (${traceInfo}, resposta HTML inesperada).`);
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`${fallback} (${traceInfo}, resposta não-JSON).`);
  }
};

export const withReq = (message: string, payload?: { request_id?: string }) => {
  if (payload?.request_id) {
    return `${message} (req ${payload.request_id})`;
  }
  return message;
};

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('pt-BR');
};

export const valueToText = (value: unknown) => {
  if (value == null) return '—';
  if (typeof value === 'string') return value.trim() || '—';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '—';
};

export type OverviewParams = {
  q?: string;
  workersPage?: number;
  workersPerPage?: number;
};

export const fetchOverview = async (adminActor: string, params?: OverviewParams) => {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.workersPage !== undefined) query.set('workersPage', String(params.workersPage));
  if (params?.workersPerPage !== undefined) query.set('workersPerPage', String(params.workersPerPage));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  const response = await fetch(`/api/cfpw/overview${suffix}`, { headers: { 'X-Admin-Actor': adminActor } });
  const payload = await parseApiPayload<OverviewPayload>(response, 'Falha ao carregar CF P&W');
  return { response, payload };
};

const jsonHeaders = (adminActor: string) => ({ 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor });

export const createWorker = async (
  adminActor: string,
  body: { scriptName: string; enableSubdomain?: boolean; previewsEnabled?: boolean },
) => {
  const response = await fetch('/api/cfpw/worker', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<CreateWorkerPayload>(response, 'Falha ao criar Worker');
  return { response, payload };
};

export const fetchWorkerCode = async (adminActor: string, scriptName: string) => {
  const query = new URLSearchParams({ scriptName });
  const response = await fetch(`/api/cfpw/worker-code?${query.toString()}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<WorkerCodePayload>(response, `Falha ao ler o código de ${scriptName}`);
  return { response, payload };
};

export const putWorkerCode = async (
  adminActor: string,
  body: {
    scriptName: string;
    modules: Array<{ name: string; content: string; contentType: string }>;
    mainModule: string;
    confirmPhrase?: string;
    expectedEtag?: string;
  },
) => {
  const response = await fetch('/api/cfpw/worker-code', {
    method: 'PUT',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<WorkerCodePutPayload>(response, 'Falha ao salvar o código do Worker');
  return { response, payload };
};

export const fetchWorkerVersions = async (
  adminActor: string,
  params: { scriptName: string; page?: number; perPage?: number; deployable?: boolean },
) => {
  const query = new URLSearchParams({ scriptName: params.scriptName });
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.perPage !== undefined) query.set('perPage', String(params.perPage));
  if (params.deployable) query.set('deployable', 'true');
  const response = await fetch(`/api/cfpw/worker-versions?${query.toString()}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<WorkerVersionsPayload>(
    response,
    `Falha ao listar versões de ${params.scriptName}`,
  );
  return { response, payload };
};

export const postWorkerDeployments = async (
  adminActor: string,
  body: {
    scriptName: string;
    versions: Array<{ versionId: string; percentage: number }>;
    message?: string;
    confirmPhrase?: string;
  },
) => {
  const response = await fetch('/api/cfpw/worker-deployments', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<WorkerDeploymentsPayload>(response, 'Falha ao criar deployment');
  return { response, payload };
};

export const fetchWorkerSettings = async (adminActor: string, scriptName: string) => {
  const query = new URLSearchParams({ scriptName });
  const response = await fetch(`/api/cfpw/worker-settings?${query.toString()}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<WorkerSettingsPayload>(response, `Falha ao ler settings de ${scriptName}`);
  return { response, payload };
};

export const patchWorkerSettings = async (
  adminActor: string,
  body: {
    scriptName: string;
    confirmPhrase?: string;
    settings: Record<string, unknown> & { bindings: WorkerBinding[] };
  },
) => {
  const response = await fetch('/api/cfpw/worker-settings', {
    method: 'PATCH',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<WorkerSettingsPayload>(response, 'Falha ao atualizar settings do Worker');
  return { response, payload };
};

export const fetchWorkerDomains = async (adminActor: string, scriptName: string) => {
  const query = new URLSearchParams({ scriptName });
  const response = await fetch(`/api/cfpw/worker-domains?${query.toString()}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<WorkerDomainsPayload>(response, `Falha ao listar domínios de ${scriptName}`);
  return { response, payload };
};

export const attachWorkerDomain = async (
  adminActor: string,
  body: { scriptName: string; hostname: string; zoneId: string },
) => {
  const response = await fetch('/api/cfpw/worker-domains', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<WorkerSubdomainPayload>(response, `Falha ao anexar ${body.hostname}`);
  return { response, payload };
};

export const deleteWorkerDomain = async (adminActor: string, domainId: string) => {
  const query = new URLSearchParams({ domainId });
  const response = await fetch(`/api/cfpw/worker-domains?${query.toString()}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<WorkerSubdomainPayload>(response, 'Falha ao remover domínio custom');
  return { response, payload };
};

export const postWorkerSubdomain = async (
  adminActor: string,
  body: { scriptName?: string; enabled?: boolean; previewsEnabled?: boolean; accountSubdomain?: string },
) => {
  const response = await fetch('/api/cfpw/worker-subdomain', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<WorkerSubdomainPayload>(response, 'Falha ao configurar workers.dev');
  return { response, payload };
};

export const fetchDnsZones = async (adminActor: string) => {
  const response = await fetch('/api/cfdns/zones', { headers: { 'X-Admin-Actor': adminActor } });
  const payload = await parseApiPayload<DnsZonesPayload>(response, 'Falha ao carregar zonas para o dropdown');
  return { response, payload };
};

export const fetchWorkerDetails = async (adminActor: string, scriptName: string) => {
  const query = new URLSearchParams({ scriptName });
  const response = await fetch(`/api/cfpw/worker-details?${query.toString()}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<WorkerDetailsPayload>(response, `Falha ${scriptName}`);
  return { response, payload };
};

export type PageDetailsParams = {
  page?: number;
  perPage?: number;
  env?: 'production' | 'preview';
};

export const fetchPageDetails = async (adminActor: string, projectName: string, params?: PageDetailsParams) => {
  const query = new URLSearchParams({ projectName });
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.perPage !== undefined) query.set('perPage', String(params.perPage));
  if (params?.env !== undefined) query.set('env', params.env);
  const response = await fetch(`/api/cfpw/page-details?${query.toString()}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<PageDetailsPayload>(response, `Falha ${projectName}`);
  return { response, payload };
};

export const deleteResource = async (adminActor: string, type: DetailType, id: string, confirmPhrase?: string) => {
  const endpoint = type === 'worker' ? '/api/cfpw/delete-worker' : '/api/cfpw/delete-page';
  // confirmPhrase: exigida pelo motor para alvos protegidos (recursos que
  // servem a própria admin-app); omitida para os demais.
  const base = type === 'worker' ? { scriptName: id, confirmation: id } : { projectName: id, confirmation: id };
  const body = confirmPhrase !== undefined ? { ...base, confirmPhrase } : base;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor },
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<DeletePayload>(response, 'Falha exclusão');
  return { response, payload };
};

export const postOps = async (adminActor: string, body: Record<string, unknown>) => {
  const response = await fetch('/api/cfpw/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': adminActor },
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<OpsResponsePayload>(response, 'Falha na operação');
  return { response, payload };
};

export const fetchBuildConfig = async (adminActor: string, scriptName: string) => {
  const query = new URLSearchParams({ scriptName });
  const response = await fetch(`/api/cfpw/build-config?${query.toString()}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<BuildConfigPayload>(response, `Falha ao ler config de builds de ${scriptName}`);
  return { response, payload };
};

export const fetchBuilds = async (
  adminActor: string,
  params: { scriptName: string; page?: number; perPage?: number },
) => {
  const query = new URLSearchParams({ scriptName: params.scriptName });
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.perPage !== undefined) query.set('perPage', String(params.perPage));
  const response = await fetch(`/api/cfpw/builds?${query.toString()}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<BuildsPayload>(response, `Falha ao listar builds de ${params.scriptName}`);
  return { response, payload };
};

export const fetchBuildLogs = async (adminActor: string, params: { buildId: string; cursor?: string }) => {
  const query = new URLSearchParams({ buildId: params.buildId });
  if (params.cursor) query.set('cursor', params.cursor);
  const response = await fetch(`/api/cfpw/build-logs?${query.toString()}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<BuildLogsPayload>(response, `Falha ao ler logs do build ${params.buildId}`);
  return { response, payload };
};

export const postBuildRetry = async (
  adminActor: string,
  body: { scriptName: string; branch?: string; commitHash?: string },
) => {
  const response = await fetch('/api/cfpw/build-retry', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<BuildActionPayload>(response, 'Falha ao reexecutar build');
  return { response, payload };
};

export const postBuildCancel = async (adminActor: string, body: { buildId: string }) => {
  const response = await fetch('/api/cfpw/build-cancel', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<BuildActionPayload>(response, 'Falha ao cancelar build');
  return { response, payload };
};

export const fetchWorkerMetrics = async (adminActor: string, params: { scriptName: string; hours: number }) => {
  const query = new URLSearchParams({ scriptName: params.scriptName, hours: String(params.hours) });
  const response = await fetch(`/api/cfpw/worker-metrics?${query.toString()}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<WorkerMetricsPayload>(
    response,
    `Falha ao consultar métricas de ${params.scriptName}`,
  );
  return { response, payload };
};

export const fetchRawAllowlist = async (adminActor: string) => {
  const response = await fetch('/api/cfpw/raw-allowlist', { headers: { 'X-Admin-Actor': adminActor } });
  const payload = await parseApiPayload<RawAllowlistPayload>(response, 'Falha ao carregar allowlist do console');
  return { response, payload };
};

// ── PW-3: Pages parity ──

export const createPagesProject = async (
  adminActor: string,
  body: {
    name: string;
    productionBranch?: string;
    buildConfig?: { buildCommand?: string; destinationDir?: string; rootDir?: string };
    source?: { owner: string; repoName: string };
  },
) => {
  const response = await fetch('/api/cfpw/page-project', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<PageProjectCreatePayload>(response, 'Falha ao criar projeto Pages');
  return { response, payload };
};

export const patchPageBuildConfig = async (
  adminActor: string,
  body: {
    projectName: string;
    buildCommand?: string;
    destinationDir?: string;
    rootDir?: string;
    buildCaching?: boolean;
  },
) => {
  const response = await fetch('/api/cfpw/page-build-config', {
    method: 'PATCH',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<PageBuildConfigPayload>(response, 'Falha ao atualizar build config');
  return { response, payload };
};

export const postPagePurgeBuildCache = async (adminActor: string, body: { projectName: string }) => {
  const response = await fetch('/api/cfpw/page-purge-build-cache', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<PagePurgeCachePayload>(response, 'Falha ao expurgar o cache de build');
  return { response, payload };
};

export const fetchPageEnv = async (
  adminActor: string,
  params: { projectName: string; environment: 'production' | 'preview' },
) => {
  const query = new URLSearchParams({ projectName: params.projectName, environment: params.environment });
  const response = await fetch(`/api/cfpw/page-env?${query.toString()}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<PageEnvPayload>(
    response,
    `Falha ao ler variáveis do ambiente ${params.environment}`,
  );
  return { response, payload };
};

export const patchPageEnv = async (
  adminActor: string,
  body: {
    projectName: string;
    environment: 'production' | 'preview';
    envVars?: Record<string, { type: 'plain_text' | 'secret_text'; value?: string } | null>;
    bindings?: Record<string, Record<string, Record<string, unknown> | null>>;
  },
) => {
  const response = await fetch('/api/cfpw/page-env', {
    method: 'PATCH',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<PageEnvPayload>(response, 'Falha ao atualizar variáveis do ambiente');
  return { response, payload };
};

export const postPageDeploy = async (adminActor: string, body: { projectName: string; branch?: string }) => {
  const response = await fetch('/api/cfpw/page-deploy', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<PageDeployPayload>(response, 'Falha ao criar deployment');
  return { response, payload };
};

export const fetchPageDomainDetail = async (
  adminActor: string,
  params: { projectName: string; domainName: string },
) => {
  const query = new URLSearchParams({ projectName: params.projectName, domainName: params.domainName });
  const response = await fetch(`/api/cfpw/page-domain?${query.toString()}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<PageDomainDetailPayload>(
    response,
    `Falha ao ler o domínio ${params.domainName}`,
  );
  return { response, payload };
};

export const postPageDomainRecheck = async (adminActor: string, body: { projectName: string; domainName: string }) => {
  const response = await fetch('/api/cfpw/page-domain-recheck', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<PageDomainDetailPayload>(
    response,
    `Falha ao reverificar o domínio ${body.domainName}`,
  );
  return { response, payload };
};

export const fetchPageDeployment = async (
  adminActor: string,
  params: { projectName: string; deploymentId: string; logsOnly?: boolean },
) => {
  const query = new URLSearchParams({ projectName: params.projectName, deploymentId: params.deploymentId });
  if (params.logsOnly) query.set('logsOnly', 'true');
  const response = await fetch(`/api/cfpw/page-deployment?${query.toString()}`, {
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<PageDeploymentPayload>(
    response,
    `Falha ao carregar o deployment ${params.deploymentId}`,
  );
  return { response, payload };
};

export const deletePageDeployment = async (
  adminActor: string,
  params: { projectName: string; deploymentId: string },
) => {
  const query = new URLSearchParams({ projectName: params.projectName, deploymentId: params.deploymentId });
  const response = await fetch(`/api/cfpw/page-deployment?${query.toString()}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Actor': adminActor },
  });
  const payload = await parseApiPayload<PageDeploymentDeletePayload>(
    response,
    `Falha ao remover o deployment ${params.deploymentId}`,
  );
  return { response, payload };
};

export const postPageWebAnalytics = async (adminActor: string, body: { projectName: string }) => {
  const response = await fetch('/api/cfpw/page-web-analytics', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<PageWebAnalyticsPayload>(response, 'Falha ao ativar Web Analytics');
  return { response, payload };
};

// ── ST-KV: Armazenamento / Workers KV (mutações; leituras usam cfApiFetch nos componentes) ──

export const createKvNamespace = async (adminActor: string, body: { title: string }) => {
  const response = await fetch('/api/cfpw/storage/kv/namespaces', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<KvNamespaceMutationPayload>(response, 'Falha ao criar namespace KV');
  return { response, payload };
};

export const renameKvNamespace = async (adminActor: string, body: { namespaceId: string; title: string }) => {
  const response = await fetch('/api/cfpw/storage/kv/namespaces/rename', {
    method: 'PUT',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<KvNamespaceMutationPayload>(response, 'Falha ao renomear namespace KV');
  return { response, payload };
};

export const deleteKvNamespace = async (adminActor: string, body: { namespaceId: string; confirmTitle: string }) => {
  const response = await fetch('/api/cfpw/storage/kv/namespaces', {
    method: 'DELETE',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<KvNamespaceMutationPayload>(response, 'Falha ao excluir namespace KV');
  return { response, payload };
};

export const putKvValue = async (
  adminActor: string,
  body: {
    namespaceId: string;
    key: string;
    value: string;
    metadata?: Record<string, unknown>;
    expirationTtl?: number;
  },
) => {
  const response = await fetch('/api/cfpw/storage/kv/value', {
    method: 'PUT',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<KvValueMutationPayload>(response, `Falha ao gravar a chave ${body.key}`);
  return { response, payload };
};

export const deleteKvValue = async (adminActor: string, body: { namespaceId: string; key: string }) => {
  const response = await fetch('/api/cfpw/storage/kv/value', {
    method: 'DELETE',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<KvValueMutationPayload>(response, `Falha ao excluir a chave ${body.key}`);
  return { response, payload };
};

export const postKvBulkDelete = async (adminActor: string, body: { namespaceId: string; keys: string[] }) => {
  const response = await fetch('/api/cfpw/storage/kv/bulk-delete', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<KvValueMutationPayload>(response, 'Falha na exclusão em lote de chaves KV');
  return { response, payload };
};

// ── ST-R2: Armazenamento / R2 (mutações; leituras usam cfApiFetch nos componentes) ──

export const createR2Bucket = async (
  adminActor: string,
  body: { name: string; locationHint?: string; storageClass?: string },
) => {
  const response = await fetch('/api/cfpw/storage/r2/buckets', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<R2BucketMutationPayload>(response, 'Falha ao criar bucket R2');
  return { response, payload };
};

export const deleteR2Bucket = async (adminActor: string, body: { bucket: string; confirmName: string }) => {
  const response = await fetch('/api/cfpw/storage/r2/buckets', {
    method: 'DELETE',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<R2BucketMutationPayload>(response, 'Falha ao excluir bucket R2');
  return { response, payload };
};

/** Exclui um lote de até 40 chaves; o chamador encadeia os lotes. */
export const deleteR2Objects = async (adminActor: string, body: { bucket: string; keys: string[] }) => {
  const response = await fetch('/api/cfpw/storage/r2/object', {
    method: 'DELETE',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<R2ObjectsDeletePayload>(response, 'Falha na exclusão de objetos R2');
  return { response, payload };
};

/** Upload com o corpo cru do File (o navegador define o Content-Length). */
export const putR2Object = async (
  adminActor: string,
  params: { bucket: string; key: string; storageClass?: string; file: File },
) => {
  const query = new URLSearchParams({ bucket: params.bucket, key: params.key });
  if (params.storageClass) query.set('storageClass', params.storageClass);
  const response = await fetch(`/api/cfpw/storage/r2/object?${query.toString()}`, {
    method: 'PUT',
    headers: {
      'X-Admin-Actor': adminActor,
      'Content-Type': params.file.type || 'application/octet-stream',
    },
    body: params.file,
  });
  const payload = await parseApiPayload<R2ObjectPutPayload>(response, `Falha ao enviar o arquivo ${params.file.name}`);
  return { response, payload };
};

// ── ST-D1: Armazenamento / D1 (mutações; leituras usam cfApiFetch nos componentes) ──

export const createD1Database = async (adminActor: string, body: { name: string }) => {
  const response = await fetch('/api/cfpw/storage/d1/databases', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<D1DatabaseMutationPayload>(response, 'Falha ao criar banco D1');
  return { response, payload };
};

export const deleteD1Database = async (adminActor: string, body: { databaseId: string; confirmName: string }) => {
  const response = await fetch('/api/cfpw/storage/d1/databases', {
    method: 'DELETE',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<D1DatabaseMutationPayload>(response, 'Falha ao excluir banco D1');
  return { response, payload };
};

export const postD1Query = async (
  adminActor: string,
  body: {
    databaseId: string;
    sql: string;
    params?: unknown[];
    confirmDangerous?: boolean;
    confirmPhrase?: string;
  },
) => {
  const response = await fetch('/api/cfpw/storage/d1/query', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<D1QueryPayload>(response, 'Falha ao executar SQL no banco D1');
  return { response, payload };
};

export const postD1Export = async (
  adminActor: string,
  body: {
    databaseId: string;
    bookmark?: string;
    dumpOptions?: { noData?: boolean; noSchema?: boolean; tables?: string[] };
  },
) => {
  const response = await fetch('/api/cfpw/storage/d1/export', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<D1ExportPayload>(response, 'Falha ao exportar banco D1');
  return { response, payload };
};

export const postD1Import = async (
  adminActor: string,
  body: {
    databaseId: string;
    action: 'init' | 'ingest' | 'poll';
    etag?: string;
    filename?: string;
    bookmark?: string;
  },
) => {
  const response = await fetch('/api/cfpw/storage/d1/import', {
    method: 'POST',
    headers: jsonHeaders(adminActor),
    body: JSON.stringify(body),
  });
  const payload = await parseApiPayload<D1ImportPayload>(response, 'Falha na operação de import do banco D1');
  return { response, payload };
};
