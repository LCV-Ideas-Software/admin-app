/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Tipos compartilhados do módulo Cloudflare Pages & Workers (payloads de API,
 * estado de detalhe e definições de ações operacionais). Prop types locais de
 * componentes permanecem nos próprios componentes.
 */

export type AccountSummary = {
  accountId: string;
  accountName: string;
  source: string;
};

export type WorkerSummary = {
  scriptName: string;
  handlers: string[];
  createdAt: string | null;
  updatedAt: string | null;
  tag: string | null;
};

export type PageSummary = {
  projectName: string;
  id: string | null;
  subdomain: string | null;
  productionBranch: string | null;
  createdAt: string | null;
  domains: string[];
  latestDeployment: {
    id: string | null;
    environment: string | null;
    createdAt: string | null;
    url: string | null;
  } | null;
};

export type WorkersPagination = {
  page: number;
  perPage: number;
  totalCount?: number;
  hasMore: boolean;
};

export type OverviewPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  account?: AccountSummary;
  summary?: {
    totalWorkers: number;
    totalPages: number;
  };
  workers?: WorkerSummary[];
  pages?: PageSummary[];
  workersPagination?: WorkersPagination;
  searchFallback?: boolean;
};

export type WorkerDetailsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  scriptName?: string;
  worker?: Record<string, unknown>;
  deployments?: Array<Record<string, unknown>>;
  warnings?: Array<{ code?: string; message?: string }>;
};

export type PageDetailsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  projectName?: string;
  project?: Record<string, unknown>;
  deployments?: Array<Record<string, unknown>>;
  deploymentsPagination?: { page: number; perPage: number; hasMore: boolean };
  warnings?: Array<{ code?: string; message?: string }>;
};

export type DeletePayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  message?: string;
};

export type OpsResponsePayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  action?: string;
  accountId?: string;
  result?: unknown;
};

export type DetailType = 'worker' | 'page';

export type DetailState = {
  type: DetailType;
  id: string;
  payload: WorkerDetailsPayload | PageDetailsPayload;
};

export type OperationalAlert = {
  code: string;
  cause: string;
  action: string;
};

/** Campos exibíveis no modal de ações operacionais do CfPwModule. @public */
export type OpsActionField =
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
  | 'routePattern';

export type OpsActionDefinition = {
  value: string;
  label: string;
  description: string;
  fields: OpsActionField[];
  outcomeLabel: string;
};

/** Warning parcial devolvido pelos endpoints agregadores do motor. */
export type PartialWarning = {
  code?: string;
  message?: string;
};

/** Resposta de POST /api/cfpw/worker (criação a partir do template). */
export type CreateWorkerPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  scriptName?: string;
  accountSubdomain?: string | null;
  subdomainPending?: boolean;
  warnings?: PartialWarning[];
};

/** Módulo de código do Worker devolvido por GET /api/cfpw/worker-code. */
export type WorkerCodeModule = {
  name: string;
  content: string;
  contentType: string;
  binary: boolean;
};

export type WorkerCodePayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  scriptName?: string;
  modules?: WorkerCodeModule[];
  mainModule?: string | null;
  compatibilityDate?: string | null;
  etag?: string;
  warnings?: PartialWarning[];
};

export type WorkerCodePutPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  deployed?: boolean;
};

/** Resposta de GET /api/cfpw/worker-versions (versões cruas da CF + active/percentage). */
export type WorkerVersionsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  scriptName?: string;
  versions?: Array<Record<string, unknown>>;
  pagination?: unknown;
  activeDeployment?: Record<string, unknown> | null;
  warnings?: PartialWarning[];
};

export type WorkerDeploymentsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  deployment?: unknown;
};

/** Binding de Worker como devolvido/aceito pelos settings da CF. */
export type WorkerBinding = {
  type: string;
  name: string;
} & Record<string, unknown>;

/** Settings do script devolvidos por GET /api/cfpw/worker-settings (passthrough CF). */
export type WorkerSettingsData = {
  bindings?: Array<Record<string, unknown>>;
  compatibility_date?: string | null;
  compatibility_flags?: string[] | null;
  placement?: { mode?: string } | null;
  logpush?: boolean | null;
  tail_consumers?: Array<{ service?: string; environment?: string }> | null;
  observability?: { enabled?: boolean; head_sampling_rate?: number } | null;
  limits?: { cpu_ms?: number } | null;
  usage_model?: string | null;
};

export type WorkerSettingsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  scriptName?: string;
  settings?: WorkerSettingsData;
};

export type WorkerDomainsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  scriptName?: string;
  domains?: Array<Record<string, unknown>>;
  scriptSubdomain?: { enabled: boolean; previews_enabled: boolean } | null;
  accountSubdomain?: string | null;
  warnings?: PartialWarning[];
};

export type WorkerSubdomainPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
};

/** Subconjunto de GET /api/cfdns/zones usado no dropdown de domínios custom. */
export type DnsZonesPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  zones?: Array<{ id?: string | null; name?: string | null }>;
};

/** Motivo pelo qual uma capacidade Cloudflare está desabilitada no motor. @public */
export type CfpwCapabilityReason = 'sem-permissao' | 'indisponivel' | 'erro';

/** Resultado de uma sonda individual de GET /api/cfpw/capabilities. @public */
export type CfpwCapabilityProbe = { enabled: true } | { enabled: false; reason: CfpwCapabilityReason; detail: string };

/** Mapa de capacidades Cloudflare sondadas pelo motor. @public */
export type CfpwCapabilities = {
  kv: CfpwCapabilityProbe;
  d1: CfpwCapabilityProbe;
  r2: CfpwCapabilityProbe;
  observability: CfpwCapabilityProbe;
  builds: CfpwCapabilityProbe;
  analytics: CfpwCapabilityProbe;
};

/** Resposta completa de GET /api/cfpw/capabilities. @public */
export type CfpwCapabilitiesPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  capabilities?: CfpwCapabilities;
  account?: { id: string; source: string };
  probedAt?: string;
};

/** Resposta de GET /api/cfpw/builds (builds crus da CF, passthrough). */
export type BuildsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  scriptName?: string;
  builds?: Array<Record<string, unknown>>;
  pagination?: unknown;
};

/** Resposta de GET /api/cfpw/build-config (404 CF → connected: false). */
export type BuildConfigPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  scriptName?: string;
  connected?: boolean;
  config?: Record<string, unknown>;
};

/** Resposta de GET /api/cfpw/build-logs (linhas + cursor de paginação). */
export type BuildLogsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  buildId?: string;
  lines?: unknown[];
  cursor?: string | null;
  truncated?: boolean;
};

/** Resposta de POST /api/cfpw/build-retry e /api/cfpw/build-cancel. */
export type BuildActionPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  build?: Record<string, unknown>;
};

/** Ponto normalizado das séries GraphQL Analytics (worker/account metrics). */
export type WorkerMetricsPoint = {
  t: string;
  requests: number;
  errors: number;
  subrequests: number;
  cpuP50: number;
  cpuP99: number;
  durP50: number;
  durP99: number;
  scriptName?: string;
};

/** Resposta de GET /api/cfpw/worker-metrics e /api/cfpw/account-metrics. */
export type WorkerMetricsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  scope?: string;
  hours?: number;
  series?: WorkerMetricsPoint[];
  totals?: { requests: number; errors: number; subrequests: number };
};

/** Resposta de GET /api/cfpw/raw-allowlist (console avançado). */
export type RawAllowlistPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  allowlist?: string[];
  patterns?: string[];
  methods?: string[];
};

/** Resposta de POST /api/cfpw/page-project (criação de projeto Pages, PW-3). */
export type PageProjectCreatePayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  projectName?: string;
  project?: Record<string, unknown>;
};

/** Resposta de PATCH /api/cfpw/page-build-config. */
export type PageBuildConfigPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  projectName?: string;
  project?: Record<string, unknown>;
  buildConfig?: Record<string, unknown>;
};

/** Resposta de POST /api/cfpw/page-purge-build-cache. */
export type PagePurgeCachePayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  purged?: boolean;
};

/** Entrada de env var de Pages como devolvida pela CF (secret chega sem value). */
export type PageEnvVarEntry = {
  type: 'plain_text' | 'secret_text';
  value?: string;
};

/** Resposta de GET/PATCH /api/cfpw/page-env (vars + bindings por ambiente). */
export type PageEnvPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  projectName?: string;
  environment?: string;
  envVars?: Record<string, PageEnvVarEntry>;
  bindings?: Record<string, Record<string, Record<string, unknown>>>;
  compatibilityDate?: string | null;
  compatibilityFlags?: string[];
  noOp?: boolean;
};

/** Resposta de POST /api/cfpw/page-deploy. */
export type PageDeployPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  branch?: string | null;
  deployment?: Record<string, unknown>;
};

/** Resposta de GET /api/cfpw/page-domain e POST /api/cfpw/page-domain-recheck. */
export type PageDomainDetailPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  domainName?: string;
  domain?: Record<string, unknown>;
};

/** Resposta de GET /api/cfpw/page-deployment (detalhe + logs, ou só logs). */
export type PageDeploymentPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  deploymentId?: string;
  deployment?: Record<string, unknown> | null;
  logs?: Record<string, unknown> | null;
  warnings?: PartialWarning[];
};

/** Resposta de DELETE /api/cfpw/page-deployment. */
export type PageDeploymentDeletePayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  deleted?: boolean;
};

/** Resposta de POST /api/cfpw/page-web-analytics (RUM). */
export type PageWebAnalyticsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  host?: string;
  siteTag?: string;
  snippet?: string | null;
  dashboardUrl?: string;
};

// ── ST-KV: aba Armazenamento / Workers KV ──

/** Namespace KV devolvido por GET /api/cfpw/storage/kv/namespaces. */
export type KvNamespaceSummary = {
  id: string;
  title: string;
  supports_url_encoding?: boolean;
};

export type KvNamespacesPagination = {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
};

export type KvNamespacesPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  namespaces?: KvNamespaceSummary[];
  pagination?: KvNamespacesPagination;
  search?: string;
};

/** Resposta das mutações de namespace (create/rename/delete). */
export type KvNamespaceMutationPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  namespace?: KvNamespaceSummary;
  namespaceId?: string;
  deleted?: boolean;
};

/** Entrada da listagem de chaves (expiration em unix seconds). */
export type KvKeyEntry = {
  name: string;
  expiration?: number;
  metadata?: unknown;
};

export type KvKeysPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  keys?: KvKeyEntry[];
  cursor?: string | null;
  listComplete?: boolean;
};

/** Classificação do valor feita pelo motor no modo inspect. */
export type KvValueType = 'text' | 'binary' | 'too-large';

export type KvValueInspectPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  key?: string;
  type?: KvValueType;
  size?: number;
  value?: string;
  prettyJson?: boolean;
  metadata?: unknown;
  expiration?: number | null;
};

/** Resposta das mutações de valor (PUT/DELETE) e bulk-delete. */
export type KvValueMutationPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  key?: string;
  keys?: number;
  saved?: boolean;
  deleted?: boolean;
};

// ── ST-D1: aba Armazenamento / Cloudflare D1 ──

/** Banco D1 devolvido por GET /api/cfpw/storage/d1/databases. */
export type D1DatabaseSummary = {
  uuid: string;
  name: string;
  version?: string;
  num_tables?: number;
  file_size?: number;
  created_at?: string;
  /** bigdata_db: banco operacional IMUTÁVEL do próprio admin-app. */
  protected: boolean;
};

export type D1DatabasesPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  databases?: D1DatabaseSummary[];
};

/** Resposta das mutações de banco (create/delete). */
export type D1DatabaseMutationPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  database?: D1DatabaseSummary;
  databaseId?: string;
  deleted?: boolean;
};

/** Classificação de um statement SQL (a autoridade é o motor). */
export type D1StatementClassification = {
  sql: string;
  kind: 'read' | 'write';
  dangerous: boolean;
  reason?: string;
};

/** Resultado por statement do endpoint CF de query (passthrough do motor). */
export type D1StatementResult = {
  results?: unknown[];
  success?: boolean;
  meta?: {
    duration?: number;
    rows_read?: number;
    rows_written?: number;
    changes?: number;
    last_row_id?: number;
    served_by?: string;
    error?: string;
  } & Record<string, unknown>;
  error?: string;
};

/** Resposta de POST /api/cfpw/storage/d1/query (409 = requiresConfirmation). */
export type D1QueryPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  requiresConfirmation?: boolean;
  statements?: D1StatementClassification[];
  result?: D1StatementResult[];
};

export type D1SchemaObject = {
  name: string;
  type: string;
  sql: string | null;
};

export type D1SchemaPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  objects?: D1SchemaObject[];
};

export type D1TablePayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  columns?: Array<{ name: string; type: string }>;
  rows?: Array<Record<string, unknown>>;
  total?: number;
  page?: number;
  perPage?: number;
};

// ── ST-R2: aba Armazenamento / Cloudflare R2 ──

/** Bucket R2 devolvido por GET /api/cfpw/storage/r2/buckets. */
export type R2BucketSummary = {
  name: string;
  creation_date?: string | null;
  location?: string | null;
  storage_class?: string | null;
  /** mainsite-media: bucket de mídia de PRODUÇÃO do mainsite (MEDIA_BUCKET). */
  protected: boolean;
};

export type R2BucketsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  buckets?: R2BucketSummary[];
};

/** Resposta das mutações de bucket (create/delete). */
export type R2BucketMutationPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  bucket?: R2BucketSummary | string;
  deleted?: boolean;
};

/** Objeto R2 normalizado pela listagem do motor. */
export type R2ObjectEntry = {
  key: string;
  size?: number | null;
  etag?: string | null;
  uploaded?: string | null;
  storage_class?: string | null;
  http_metadata?: Record<string, unknown>;
};

export type R2ObjectsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  objects?: R2ObjectEntry[];
  folders?: string[];
  cursor?: string | null;
  isTruncated?: boolean;
};

/** Resposta de PUT /api/cfpw/storage/r2/object (upload). */
export type R2ObjectPutPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  key?: string;
  saved?: boolean;
};

/** Resposta de DELETE /api/cfpw/storage/r2/object (lote de até 40 chaves). */
export type R2ObjectsDeletePayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  deleted?: number;
  failures?: Array<{ key: string; error: string }>;
};

/** Resposta de GET /api/cfpw/storage/r2/bucket-settings (read-only). */
export type R2BucketSettingsPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  bucket?: string;
  managedDomain?: unknown;
  customDomains?: unknown;
  cors?: unknown;
  lifecycle?: unknown;
  warnings?: PartialWarning[];
};

/** Estado do polling de export como devolvido pela CF (passthrough defensivo). */
export type D1ExportResult = {
  at_bookmark?: string;
  status?: string;
  signed_url?: string | null;
  error?: string;
} & Record<string, unknown>;

export type D1ExportPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  result?: D1ExportResult | null;
};

/** Estado das fases do import como devolvido pela CF (passthrough defensivo). */
export type D1ImportResult = {
  upload_url?: string;
  filename?: string;
  at_bookmark?: string;
  status?: string;
  success?: boolean;
  error?: string;
  messages?: string[];
} & Record<string, unknown>;

export type D1ImportPayload = {
  ok: boolean;
  error?: string;
  request_id?: string;
  result?: D1ImportResult | null;
};
