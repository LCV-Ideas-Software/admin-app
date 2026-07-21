import { GoogleGenAI } from '@google/genai';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { toHeaders } from '../../functions/api/_lib/mainsite-admin';
import { handleAstrologoEnviarEmailPost } from './handlers/astrologoEmail';
import { handleCfdnsZonesGet } from './handlers/cfdnsZones';
import { handleCleanupDeploymentsGet, handleCleanupDeploymentsPost } from './handlers/cfpwCleanup';
import { handleOraculoCronGet, handleOraculoCronPut } from './handlers/oraculoCron';
import { handleOraculoModelosGet } from './handlers/oraculoModelos';
import { resolveAdminBearerToken, validatePutAuth } from './handlers/routes/_lib/auth';
import {
  onRequestGet as handleAdminhubConfigGet,
  onRequestPut as handleAdminhubConfigPut,
} from './handlers/routes/adminhub/config';
// ── Novos handlers migrados de Pages Functions ──
import {
  onRequestGet as handleApphubConfigGet,
  onRequestPut as handleApphubConfigPut,
} from './handlers/routes/apphub/config';
import { onRequestPost as handleAstrologoExcluirPost } from './handlers/routes/astrologo/excluir';
import { onRequestPost as handleAstrologoLerPost } from './handlers/routes/astrologo/ler';
import { onRequestGet as handleAstrologoListarGet } from './handlers/routes/astrologo/listar';
import { onRequestPost as handleAstrologoSyncPost } from './handlers/routes/astrologo/sync';
import {
  onRequestDelete as handleAstrologoUserdataDelete,
  onRequestGet as handleAstrologoUserdataGet,
} from './handlers/routes/astrologo/userdata';
import { onRequestGet as handleCalculadoraOverviewGet } from './handlers/routes/calculadora/overview';
import {
  onRequestGet as handleCalculadoraParametrosGet,
  onRequestPost as handleCalculadoraParametrosPost,
} from './handlers/routes/calculadora/parametros';
import { onRequestPost as handleCalculadoraSyncPost } from './handlers/routes/calculadora/sync';
import {
  onRequestGetBytime as handleCfdnsAnalyticsBytimeGet,
  onRequestGetTop as handleCfdnsAnalyticsTopGet,
} from './handlers/routes/cfdns/analytics';
import { onRequestPost as handleCfdnsBatchPost } from './handlers/routes/cfdns/batch';
import { onRequestDelete as handleCfdnsDeleteDelete } from './handlers/routes/cfdns/delete';
import {
  onRequestGet as handleCfdnsDnsSettingsGet,
  onRequestPatch as handleCfdnsDnsSettingsPatch,
} from './handlers/routes/cfdns/dns-settings';
import {
  onRequestGet as handleCfdnsDnssecGet,
  onRequestPatch as handleCfdnsDnssecPatch,
} from './handlers/routes/cfdns/dnssec';
import {
  onRequestGetExport as handleCfdnsExportGet,
  onRequestPostImport as handleCfdnsImportPost,
} from './handlers/routes/cfdns/import-export';
import { onRequestGet as handleCfdnsRecordsGet } from './handlers/routes/cfdns/records';
import {
  onRequestPostCheck as handleCfdnsRegistrarCheckPost,
  onRequestPutDomain as handleCfdnsRegistrarDomainPut,
  onRequestGetRegistration as handleCfdnsRegistrarRegistrationGet,
  onRequestPatchRegistration as handleCfdnsRegistrarRegistrationPatch,
  onRequestPostRegistration as handleCfdnsRegistrarRegistrationPost,
  onRequestGetRegistrationStatus as handleCfdnsRegistrarRegistrationStatusGet,
  onRequestGetRegistrations as handleCfdnsRegistrarRegistrationsGet,
  onRequestGetSearch as handleCfdnsRegistrarSearchGet,
  onRequestGetUpdateStatus as handleCfdnsRegistrarUpdateStatusGet,
} from './handlers/routes/cfdns/registrar';
import { onRequestPost as handleCfdnsUpsertPost } from './handlers/routes/cfdns/upsert';
import { onRequestGet as handleCfdnsZoneCapabilitiesGet } from './handlers/routes/cfdns/zone-capabilities';
import {
  onRequestPostActivationCheck as handleCfdnsZonesAdminActivationCheckPost,
  onRequestDelete as handleCfdnsZonesAdminDelete,
  onRequestGet as handleCfdnsZonesAdminGet,
  onRequestPatch as handleCfdnsZonesAdminPatch,
  onRequestPost as handleCfdnsZonesAdminPost,
} from './handlers/routes/cfdns/zones-admin';
import {
  onRequestPostBuildCancel as handleCfpwBuildCancelPost,
  onRequestGetBuildConfig as handleCfpwBuildConfigGet,
  onRequestGetBuild as handleCfpwBuildGet,
  onRequestGetBuildLogs as handleCfpwBuildLogsGet,
  onRequestPostBuildRetry as handleCfpwBuildRetryPost,
  onRequestGetBuilds as handleCfpwBuildsGet,
} from './handlers/routes/cfpw/builds';
import { onRequestGet as handleCfpwCapabilitiesGet } from './handlers/routes/cfpw/capabilities';
import { onRequestPost as handleCfpwCleanupCacheProjectPost } from './handlers/routes/cfpw/cleanup-cache-project';
import { onRequestPost as handleCfpwDeletePagePost } from './handlers/routes/cfpw/delete-page';
import { onRequestPost as handleCfpwDeleteWorkerPost } from './handlers/routes/cfpw/delete-worker';
import {
  onRequestGetAccountMetrics as handleCfpwAccountMetricsGet,
  onRequestGetWorkerMetrics as handleCfpwWorkerMetricsGet,
} from './handlers/routes/cfpw/metrics';
import {
  onRequestGet as handleCfpwObservabilityGet,
  onRequestPost as handleCfpwObservabilityPost,
} from './handlers/routes/cfpw/observability';
import { onRequestPost as handleCfpwOpsPost } from './handlers/routes/cfpw/ops';
import { onRequestGet as handleCfpwOverviewGet } from './handlers/routes/cfpw/overview';
import { onRequestPost as handleCfpwPageDeployPost } from './handlers/routes/cfpw/page-deploy';
import {
  onRequestDelete as handleCfpwPageDeploymentDelete,
  onRequestGet as handleCfpwPageDeploymentGet,
} from './handlers/routes/cfpw/page-deployment';
import { onRequestGet as handleCfpwPageDetailsGet } from './handlers/routes/cfpw/page-details';
import {
  onRequestGet as handleCfpwPageDomainGet,
  onRequestPostRecheck as handleCfpwPageDomainRecheckPost,
} from './handlers/routes/cfpw/page-domain';
import {
  onRequestGet as handleCfpwPageEnvGet,
  onRequestPatch as handleCfpwPageEnvPatch,
} from './handlers/routes/cfpw/page-env';
import {
  onRequestPatchBuildConfig as handleCfpwPageBuildConfigPatch,
  onRequestPost as handleCfpwPageProjectPost,
  onRequestPostPurgeBuildCache as handleCfpwPagePurgeBuildCachePost,
} from './handlers/routes/cfpw/page-project';
import { onRequestGetRawAllowlist as handleCfpwRawAllowlistGet } from './handlers/routes/cfpw/raw-console';
import { onRequestPost as handleCfpwPageWebAnalyticsPost } from './handlers/routes/cfpw/rum';
import {
  onRequestDeleteDatabases as handleCfpwD1DatabasesDelete,
  onRequestGetDatabases as handleCfpwD1DatabasesGet,
  onRequestPostDatabases as handleCfpwD1DatabasesPost,
  onRequestPostExport as handleCfpwD1ExportPost,
  onRequestPostImport as handleCfpwD1ImportPost,
  onRequestPostQuery as handleCfpwD1QueryPost,
  onRequestGetSchema as handleCfpwD1SchemaGet,
  onRequestGetTable as handleCfpwD1TableGet,
} from './handlers/routes/cfpw/storage/d1';
import {
  onRequestPostBulkDelete as handleCfpwKvBulkDeletePost,
  onRequestPutBulk as handleCfpwKvBulkPut,
  onRequestGetKeys as handleCfpwKvKeysGet,
  onRequestPutNamespaceRename as handleCfpwKvNamespaceRenamePut,
  onRequestDeleteNamespaces as handleCfpwKvNamespacesDelete,
  onRequestGetNamespaces as handleCfpwKvNamespacesGet,
  onRequestPostNamespaces as handleCfpwKvNamespacesPost,
  onRequestDeleteValue as handleCfpwKvValueDelete,
  onRequestGetValue as handleCfpwKvValueGet,
  onRequestPutValue as handleCfpwKvValuePut,
} from './handlers/routes/cfpw/storage/kv';
import {
  onRequestGetBucketSettings as handleCfpwR2BucketSettingsGet,
  onRequestDeleteBuckets as handleCfpwR2BucketsDelete,
  onRequestGetBuckets as handleCfpwR2BucketsGet,
  onRequestPostBuckets as handleCfpwR2BucketsPost,
  onRequestGetObject as handleCfpwR2ObjectGet,
  onRequestPutObject as handleCfpwR2ObjectPut,
  onRequestDeleteObjects as handleCfpwR2ObjectsDelete,
  onRequestGetObjects as handleCfpwR2ObjectsGet,
} from './handlers/routes/cfpw/storage/r2';
import {
  onRequestGet as handleCfpwWorkerCodeGet,
  onRequestPut as handleCfpwWorkerCodePut,
} from './handlers/routes/cfpw/worker-code';
import { onRequestPost as handleCfpwWorkerCreatePost } from './handlers/routes/cfpw/worker-create';
import { onRequestPost as handleCfpwWorkerDeploymentsPost } from './handlers/routes/cfpw/worker-deployments';
import { onRequestGet as handleCfpwWorkerDetailsGet } from './handlers/routes/cfpw/worker-details';
import {
  onRequestDelete as handleCfpwWorkerDomainsDelete,
  onRequestGet as handleCfpwWorkerDomainsGet,
  onRequestPost as handleCfpwWorkerDomainsPost,
  onRequestPostSubdomain as handleCfpwWorkerSubdomainPost,
} from './handlers/routes/cfpw/worker-domains';
import {
  onRequestGet as handleCfpwWorkerSettingsGet,
  onRequestPatch as handleCfpwWorkerSettingsPatch,
} from './handlers/routes/cfpw/worker-settings';
import {
  onRequestGetDetail as handleCfpwWorkerVersionGet,
  onRequestGetList as handleCfpwWorkerVersionsGet,
} from './handlers/routes/cfpw/worker-versions';
import {
  onRequestGet as handleConfigStoreGet,
  onRequestPost as handleConfigStorePost,
} from './handlers/routes/config/config-store';
import {
  handleMaestroAiArtifactsGet,
  handleMaestroAiSessionCancelPost,
  handleMaestroAiSessionContentPut,
  handleMaestroAiSessionResumePost,
  handleMaestroAiSessionsGet,
  handleMaestroAiSessionsPost,
  handleMaestroAiSettingsGet,
  handleMaestroAiSettingsPut,
  handleMaestroAiSettingsTestPost,
  runMaestroSweep,
} from './handlers/routes/maestro-ai/sessions';
import {
  onRequestGet as handleMainsiteAboutGet,
  onRequestPut as handleMainsiteAboutPut,
} from './handlers/routes/mainsite/about';
import { onRequestPost as handleMainsiteAiTransformPost } from './handlers/routes/mainsite/ai/transform';
import {
  handleCommentsAdminAll,
  handleCommentsAdminBulk,
  handleCommentsAdminDelete,
  handleCommentsAdminGetSettings,
  handleCommentsAdminModerate,
  handleCommentsAdminPutSettings,
  handleCommentsAdminReply,
} from './handlers/routes/mainsite/comments-admin';
import {
  onRequestOptions as handleGeminiImportOptions,
  onRequestPost as handleGeminiImportPost,
} from './handlers/routes/mainsite/gemini-import';
import { onRequestGet as handleMainsiteMediaGet } from './handlers/routes/mainsite/media/[filename]';
import { onRequestPost as handleMainsiteMigrateMediaPost } from './handlers/routes/mainsite/migrate-media-urls';
import { onRequestGet as handleMainsiteOverviewGet } from './handlers/routes/mainsite/overview';
import {
  onRequestGet as handlePostSummariesGet,
  onRequestPost as handlePostSummariesPost,
} from './handlers/routes/mainsite/post-summaries';
import {
  onRequestDelete as handleMainsitePostsDelete,
  onRequestGet as handleMainsitePostsGet,
  onRequestPost as handleMainsitePostsPost,
  onRequestPut as handleMainsitePostsPut,
} from './handlers/routes/mainsite/posts';
import { onRequestPost as handleMainsitePostsPinPost } from './handlers/routes/mainsite/posts-pin';
import { onRequestPost as handleMainsitePostsReorderPost } from './handlers/routes/mainsite/posts-reorder';
import { onRequestPost as handleMainsitePostsVisibilityPost } from './handlers/routes/mainsite/posts-visibility';
import {
  handleRatingsAdminAll,
  handleRatingsAdminBulk,
  handleRatingsAdminDelete,
  handleRatingsAdminStats,
  handleRatingsAdminUpdate,
} from './handlers/routes/mainsite/ratings-admin';
import {
  onRequestGet as handleMainsiteSettingsGet,
  onRequestPut as handleMainsiteSettingsPut,
} from './handlers/routes/mainsite/settings';
import { onRequestPost as handleMainsiteSyncPost } from './handlers/routes/mainsite/sync';
import { onRequestPost as handleMainsiteUploadPost } from './handlers/routes/mainsite/upload';
import { onRequestPost as handleMtastsOrchestratePost } from './handlers/routes/mtasts/orchestrate';
import { onRequestGet as handleMtastsOverviewGet } from './handlers/routes/mtasts/overview';
import { onRequestGet as handleMtastsPolicyGet } from './handlers/routes/mtasts/policy';
import { onRequestPost as handleMtastsSyncPost } from './handlers/routes/mtasts/sync';
import { onRequestGet as handleMtastsZonesGet } from './handlers/routes/mtasts/zones';
import { onRequestGet as handleNewsDiscoverGet } from './handlers/routes/news/discover';
import { onRequestGet as handleNewsFeedGet } from './handlers/routes/news/feed';
import { onRequestPost as handleOraculoExcluirPost } from './handlers/routes/oraculo/excluir';
import { onRequestGet as handleOraculoListarGet } from './handlers/routes/oraculo/listar';
import { onRequestGet as handleOraculoTaxacacheGet } from './handlers/routes/oraculo/taxacache';
import {
  onRequestDelete as handleOraculoUserdataDelete,
  onRequestGet as handleOraculoUserdataGet,
} from './handlers/routes/oraculo/userdata';
import { onRequestGet as handleOverviewOperationalGet } from './handlers/routes/overview/operational';
import { onRequestDelete as handleTelemetryDeleteDelete } from './handlers/routes/telemetry/delete';
import { onRequestGet as handleTelemetryGet } from './handlers/routes/telemetry/telemetry';

type AdminMotorEnv = {
  BIGDATA_DB?: D1Like;
  MEDIA_BUCKET?: unknown;
  AI?: unknown;
  MAESTRO_OPENAI_API_KEY?: unknown;
  MAESTRO_SECRET_STORE_ID?: unknown;
  MAESTRO_ANTHROPIC_API_KEY?: unknown;
  MAESTRO_GEMINI_API_KEY?: unknown;
  MAESTRO_DEEPSEEK_API_KEY?: unknown;
  MAESTRO_GROK_API_KEY?: unknown;
  MAESTRO_PERPLEXITY_API_KEY?: unknown;
  GEMINI_API_KEY?: unknown;
  CLOUDFLARE_PW?: unknown;
  CF_ACCOUNT_ID?: unknown;
  RESEND_API_KEY?: unknown;
  CLOUDFLARE_DNS?: unknown;
  CLOUDFLARE_CACHE?: unknown;
  CLOUDFLARE_STORAGE?: unknown;
  GCP_SA_KEY?: unknown;
  GCP_PROJECT_ID?: unknown;
  JINA_API_KEY?: unknown;
  CF_ACCESS_TEAM_DOMAIN?: unknown;
  CF_ACCESS_AUD?: unknown;
  ENFORCE_JWT_VALIDATION?: unknown;
  ADMIN_BEARER_TOKEN?: unknown;
};

type ResolvedAdminMotorEnv = {
  BIGDATA_DB?: D1Like;
  MEDIA_BUCKET?: unknown;
  AI?: unknown;
  MAESTRO_OPENAI_API_KEY?: string;
  MAESTRO_SECRET_STORE_ID?: string;
  MAESTRO_ANTHROPIC_API_KEY?: string;
  MAESTRO_GEMINI_API_KEY?: string;
  MAESTRO_DEEPSEEK_API_KEY?: string;
  MAESTRO_GROK_API_KEY?: string;
  MAESTRO_PERPLEXITY_API_KEY?: string;
  GEMINI_API_KEY?: string;
  CLOUDFLARE_PW?: string;
  CF_ACCOUNT_ID?: string;
  RESEND_API_KEY?: string;
  CLOUDFLARE_DNS?: string;
  CLOUDFLARE_CACHE?: string;
  CLOUDFLARE_STORAGE?: string;
  GCP_SA_KEY?: string;
  GCP_PROJECT_ID?: string;
  JINA_API_KEY?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ENFORCE_JWT_VALIDATION?: string;
  ADMIN_BEARER_TOKEN?: string;
};

type D1Like = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
    };
  };
};

type ModelOption = {
  id: string;
  displayName: string;
  api: string;
  vision: boolean;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: toHeaders(),
  });

const formatModelName = (id: string): string => {
  if (!id) return '';
  return id
    .replace(/^gemini-/i, 'Gemini ')
    .replace(/-pro/i, ' Pro')
    .replace(/-flash/i, ' Flash')
    .replace(/-lite/i, ' Lite')
    .replace(/-exp(.*)/i, ' (Experimental$1)')
    .replace(/-preview(.*)/i, ' (Preview$1)')
    .trim();
};

const readSecretString = async (value: unknown): Promise<string> => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (!value || typeof value !== 'object') {
    return '';
  }

  const maybe = value as {
    get?: (() => Promise<unknown>) | (() => unknown);
    value?: unknown;
    secret?: unknown;
  };

  if (typeof maybe.get === 'function') {
    const result = await maybe.get();
    if (typeof result === 'string') {
      return result.trim();
    }
  }

  if (typeof maybe.value === 'string') {
    return maybe.value.trim();
  }

  if (typeof maybe.secret === 'string') {
    return maybe.secret.trim();
  }

  return '';
};

const resolveRuntimeEnv = async (env: AdminMotorEnv): Promise<ResolvedAdminMotorEnv> => ({
  ...(env.BIGDATA_DB !== undefined ? { BIGDATA_DB: env.BIGDATA_DB } : {}),
  MEDIA_BUCKET: env.MEDIA_BUCKET,
  AI: env.AI,
  MAESTRO_OPENAI_API_KEY: await readSecretString(env.MAESTRO_OPENAI_API_KEY),
  MAESTRO_SECRET_STORE_ID: await readSecretString(env.MAESTRO_SECRET_STORE_ID),
  MAESTRO_ANTHROPIC_API_KEY: await readSecretString(env.MAESTRO_ANTHROPIC_API_KEY),
  MAESTRO_GEMINI_API_KEY: await readSecretString(env.MAESTRO_GEMINI_API_KEY),
  MAESTRO_DEEPSEEK_API_KEY: await readSecretString(env.MAESTRO_DEEPSEEK_API_KEY),
  MAESTRO_GROK_API_KEY: await readSecretString(env.MAESTRO_GROK_API_KEY),
  MAESTRO_PERPLEXITY_API_KEY: await readSecretString(env.MAESTRO_PERPLEXITY_API_KEY),
  GEMINI_API_KEY: await readSecretString(env.GEMINI_API_KEY),
  CLOUDFLARE_PW: await readSecretString(env.CLOUDFLARE_PW),
  CF_ACCOUNT_ID: await readSecretString(env.CF_ACCOUNT_ID),
  RESEND_API_KEY: await readSecretString(env.RESEND_API_KEY),
  CLOUDFLARE_DNS: await readSecretString(env.CLOUDFLARE_DNS),
  CLOUDFLARE_CACHE: await readSecretString(env.CLOUDFLARE_CACHE),
  CLOUDFLARE_STORAGE: await readSecretString(env.CLOUDFLARE_STORAGE),
  GCP_SA_KEY: await readSecretString(env.GCP_SA_KEY),
  GCP_PROJECT_ID: await readSecretString(env.GCP_PROJECT_ID),
  JINA_API_KEY: await readSecretString(env.JINA_API_KEY),
  CF_ACCESS_TEAM_DOMAIN: await readSecretString(env.CF_ACCESS_TEAM_DOMAIN),
  CF_ACCESS_AUD: await readSecretString(env.CF_ACCESS_AUD),
  ENFORCE_JWT_VALIDATION: await readSecretString(env.ENFORCE_JWT_VALIDATION),
  ADMIN_BEARER_TOKEN: await readSecretString(env.ADMIN_BEARER_TOKEN),
});

const fetchMainsiteGeminiModels = async (_request: Request, env: ResolvedAdminMotorEnv): Promise<ModelOption[]> => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const allModels = new Map<string, ModelOption>();

  const pager = await ai.models.list({ config: { pageSize: 1000 } });
  for await (const m of pager) {
    if (!m.name) continue;

    const id = m.name.replace('models/', '');
    const lower = id.toLowerCase();
    const isFlashOrPro = lower.includes('flash') || lower.includes('pro');
    const isGemini = lower.startsWith('gemini');
    if (!isGemini || !isFlashOrPro) continue;

    const hasVision = lower.includes('vision') || lower.includes('pro') || lower.includes('flash');

    if (!allModels.has(id)) {
      allModels.set(id, {
        id,
        displayName: m.displayName || formatModelName(id),
        api: 'sdk',
        vision: hasVision,
      });
    }
  }

  return [...allModels.values()].sort((a, b) => {
    const aPreview = a.id.includes('preview') || a.id.includes('exp') ? 1 : 0;
    const bPreview = b.id.includes('preview') || b.id.includes('exp') ? 1 : 0;
    if (aPreview !== bPreview) return aPreview - bPreview;
    const aPro = a.id.includes('pro') ? 0 : 1;
    const bPro = b.id.includes('pro') ? 0 : 1;
    return aPro - bPro || a.id.localeCompare(b.id);
  });
};

const handleMainsiteModelos = async (request: Request, env: ResolvedAdminMotorEnv): Promise<Response> => {
  try {
    const models = await fetchMainsiteGeminiModels(request, env);

    console.info('[gemini-modelos] request:ok', {
      total: models.length,
      gatewayEnabled: false,
    });
    return json({ ok: true, models, total: models.length });
  } catch (err) {
    console.error('[gemini-modelos] request:error', {
      gatewayEnabled: false,
      error: err instanceof Error ? err.message : String(err),
    });
    return json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro ao listar modelos.',
      },
      500,
    );
  }
};

const sanitizeErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const logDebug = (message: string, context: Record<string, unknown> = {}) => {
  console.debug(`[admin-motor] ${message}`, context);
};

const logInfo = (message: string, context: Record<string, unknown> = {}) => {
  console.info(`[admin-motor] ${message}`, context);
};

const logWarn = (message: string, context: Record<string, unknown> = {}) => {
  console.warn(`[admin-motor] ${message}`, context);
};

const logError = (message: string, context: Record<string, unknown> = {}) => {
  console.error(`[admin-motor] ${message}`, context);
};

// ========== HONO APP ==========

type HonoEnv = {
  Bindings: AdminMotorEnv;
  Variables: { runtimeEnv: ResolvedAdminMotorEnv };
};

const app = new Hono<HonoEnv>();

// ── Timing + logging ──
app.use('*', async (c, next) => {
  const startedAt = Date.now();
  const method = c.req.method.toUpperCase();
  const pathname = new URL(c.req.url).pathname;
  logDebug('request:start', { method, pathname });
  try {
    await next();
  } finally {
    logInfo('request:end', {
      method,
      pathname,
      latencyMs: Date.now() - startedAt,
    });
  }
});

// ── Resolve runtime secrets ──
app.use('*', async (c, next) => {
  c.set('runtimeEnv', await resolveRuntimeEnv(c.env));
  await next();
});

// ── Global auth guard ──
app.use('*', async (c, next) => {
  if (c.req.method.toUpperCase() === 'OPTIONS') return next();
  const env = c.get('runtimeEnv');
  const authCtx = await validatePutAuth(c.req.raw, resolveAdminBearerToken(env), {
    ...(env.CF_ACCESS_TEAM_DOMAIN !== undefined ? { teamDomain: env.CF_ACCESS_TEAM_DOMAIN } : {}),
    ...(env.CF_ACCESS_AUD !== undefined ? { audience: env.CF_ACCESS_AUD } : {}),
    ...(env.ENFORCE_JWT_VALIDATION !== undefined ? { enforcement: env.ENFORCE_JWT_VALIDATION } : {}),
  });
  if (!authCtx.isAuthenticated) {
    return c.json({ ok: false, error: 'Unauthorized.' }, 401);
  }
  return next();
});

// ── Route context helper ──
// Casts the Hono context into the shape expected by all handler functions.
const rc = <T>(c: Context<HonoEnv>) =>
  ({
    request: c.req.raw,
    env: c.get('runtimeEnv'),
    waitUntil: (p: Promise<unknown>) => c.executionCtx.waitUntil(p),
  }) as unknown as T;
const re = (c: Context<HonoEnv>) => ({
  request: c.req.raw,
  env: c.get('runtimeEnv'),
});

// ── health (auth-gated via global middleware; replaces standalone Pages Function) ──
app.get('/api/health', (c) => c.json({ ok: true, app: 'admin-motor' }));

// ── modelos ──
app.get('/api/mainsite/modelos', (c) => handleMainsiteModelos(c.req.raw, c.get('runtimeEnv')));
app.get('/api/calculadora/modelos', (c) => handleMainsiteModelos(c.req.raw, c.get('runtimeEnv')));
app.get('/api/oraculo/modelos', (c) => handleOraculoModelosGet(re(c)));
app.get('/api/astrologo/modelos', (c) => handleOraculoModelosGet(re(c)));

// ── oraculo ──
app.get('/api/oraculo/cron', (c) => handleOraculoCronGet(re(c)));
app.put('/api/oraculo/cron', (c) => handleOraculoCronPut(re(c)));
app.post('/api/oraculo/excluir', (c) => handleOraculoExcluirPost(rc(c)));
app.get('/api/oraculo/listar', (c) => handleOraculoListarGet(rc(c)));
app.get('/api/oraculo/taxacache', (c) => handleOraculoTaxacacheGet(rc(c)));
app.get('/api/oraculo/userdata', (c) => handleOraculoUserdataGet(rc(c)));
app.delete('/api/oraculo/userdata', (c) => handleOraculoUserdataDelete(rc(c)));

// ── astrologo ──
app.post('/api/astrologo/enviar-email', (c) => handleAstrologoEnviarEmailPost(re(c)));
app.post('/api/astrologo/excluir', (c) => handleAstrologoExcluirPost(rc(c)));
app.post('/api/astrologo/ler', (c) => handleAstrologoLerPost(rc(c)));
app.get('/api/astrologo/listar', (c) => handleAstrologoListarGet(rc(c)));
app.post('/api/astrologo/sync', (c) => handleAstrologoSyncPost(rc(c)));
app.get('/api/astrologo/userdata', (c) => handleAstrologoUserdataGet(rc(c)));
app.delete('/api/astrologo/userdata', (c) => handleAstrologoUserdataDelete(rc(c)));

// ── cfdns ──
app.get('/api/cfdns/zones', (c) => handleCfdnsZonesGet(re(c)));
app.get('/api/cfdns/records', (c) => handleCfdnsRecordsGet(rc(c)));
app.get('/api/cfdns/zone-capabilities', (c) => handleCfdnsZoneCapabilitiesGet(rc(c)));
app.get('/api/cfdns/analytics/bytime', (c) => handleCfdnsAnalyticsBytimeGet(rc(c)));
app.get('/api/cfdns/analytics/top', (c) => handleCfdnsAnalyticsTopGet(rc(c)));
app.get('/api/cfdns/registrar/search', (c) => handleCfdnsRegistrarSearchGet(rc(c)));
app.post('/api/cfdns/registrar/check', (c) => handleCfdnsRegistrarCheckPost(rc(c)));
app.get('/api/cfdns/registrar/registrations', (c) => handleCfdnsRegistrarRegistrationsGet(rc(c)));
app.post('/api/cfdns/registrar/registrations', (c) => handleCfdnsRegistrarRegistrationPost(rc(c)));
app.get('/api/cfdns/registrar/registration', (c) => handleCfdnsRegistrarRegistrationGet(rc(c)));
app.patch('/api/cfdns/registrar/registration', (c) => handleCfdnsRegistrarRegistrationPatch(rc(c)));
app.put('/api/cfdns/registrar/domain', (c) => handleCfdnsRegistrarDomainPut(rc(c)));
app.get('/api/cfdns/registrar/registration-status', (c) => handleCfdnsRegistrarRegistrationStatusGet(rc(c)));
app.get('/api/cfdns/registrar/update-status', (c) => handleCfdnsRegistrarUpdateStatusGet(rc(c)));
app.get('/api/cfdns/zones-admin', (c) => handleCfdnsZonesAdminGet(rc(c)));
app.post('/api/cfdns/zones-admin', (c) => handleCfdnsZonesAdminPost(rc(c)));
app.delete('/api/cfdns/zones-admin', (c) => handleCfdnsZonesAdminDelete(rc(c)));
app.patch('/api/cfdns/zones-admin', (c) => handleCfdnsZonesAdminPatch(rc(c)));
app.post('/api/cfdns/zones-admin/activation-check', (c) => handleCfdnsZonesAdminActivationCheckPost(rc(c)));
app.get('/api/cfdns/dnssec', (c) => handleCfdnsDnssecGet(rc(c)));
app.patch('/api/cfdns/dnssec', (c) => handleCfdnsDnssecPatch(rc(c)));
app.get('/api/cfdns/dns-settings', (c) => handleCfdnsDnsSettingsGet(rc(c)));
app.patch('/api/cfdns/dns-settings', (c) => handleCfdnsDnsSettingsPatch(rc(c)));
app.delete('/api/cfdns/delete', (c) => handleCfdnsDeleteDelete(rc(c)));
app.post('/api/cfdns/upsert', (c) => handleCfdnsUpsertPost(rc(c)));
app.post('/api/cfdns/batch', (c) => handleCfdnsBatchPost(rc(c)));
app.get('/api/cfdns/export', (c) => handleCfdnsExportGet(rc(c)));
app.post('/api/cfdns/import', (c) => handleCfdnsImportPost(rc(c)));

// ── cfpw ──
app.get('/api/cfpw/capabilities', (c) => handleCfpwCapabilitiesGet(rc(c)));
app.get('/api/cfpw/overview', (c) => handleCfpwOverviewGet(rc(c)));
app.post('/api/cfpw/ops', (c) => handleCfpwOpsPost(rc(c)));
app.get('/api/cfpw/page-details', (c) => handleCfpwPageDetailsGet(rc(c)));
app.get('/api/cfpw/worker-details', (c) => handleCfpwWorkerDetailsGet(rc(c)));
app.post('/api/cfpw/delete-page', (c) => handleCfpwDeletePagePost(rc(c)));
app.post('/api/cfpw/delete-worker', (c) => handleCfpwDeleteWorkerPost(rc(c)));
app.post('/api/cfpw/cleanup-cache-project', (c) => handleCfpwCleanupCacheProjectPost(rc(c)));
app.get('/api/cfpw/observability', (c) => handleCfpwObservabilityGet(rc(c)));
app.post('/api/cfpw/observability', (c) => handleCfpwObservabilityPost(rc(c)));
app.get('/api/cfpw/cleanup-deployments', (c) => handleCleanupDeploymentsGet(re(c)));
app.post('/api/cfpw/cleanup-deployments', (c) => handleCleanupDeploymentsPost(re(c)));
app.post('/api/cfpw/worker', (c) => handleCfpwWorkerCreatePost(rc(c)));
app.get('/api/cfpw/worker-code', (c) => handleCfpwWorkerCodeGet(rc(c)));
app.put('/api/cfpw/worker-code', (c) => handleCfpwWorkerCodePut(rc(c)));
app.get('/api/cfpw/worker-versions', (c) => handleCfpwWorkerVersionsGet(rc(c)));
app.get('/api/cfpw/worker-version', (c) => handleCfpwWorkerVersionGet(rc(c)));
app.post('/api/cfpw/worker-deployments', (c) => handleCfpwWorkerDeploymentsPost(rc(c)));
app.get('/api/cfpw/worker-settings', (c) => handleCfpwWorkerSettingsGet(rc(c)));
app.patch('/api/cfpw/worker-settings', (c) => handleCfpwWorkerSettingsPatch(rc(c)));
app.get('/api/cfpw/worker-domains', (c) => handleCfpwWorkerDomainsGet(rc(c)));
app.post('/api/cfpw/worker-domains', (c) => handleCfpwWorkerDomainsPost(rc(c)));
app.delete('/api/cfpw/worker-domains', (c) => handleCfpwWorkerDomainsDelete(rc(c)));
app.post('/api/cfpw/worker-subdomain', (c) => handleCfpwWorkerSubdomainPost(rc(c)));
app.get('/api/cfpw/builds', (c) => handleCfpwBuildsGet(rc(c)));
app.get('/api/cfpw/build', (c) => handleCfpwBuildGet(rc(c)));
app.get('/api/cfpw/build-logs', (c) => handleCfpwBuildLogsGet(rc(c)));
app.post('/api/cfpw/build-retry', (c) => handleCfpwBuildRetryPost(rc(c)));
app.post('/api/cfpw/build-cancel', (c) => handleCfpwBuildCancelPost(rc(c)));
app.get('/api/cfpw/build-config', (c) => handleCfpwBuildConfigGet(rc(c)));
app.get('/api/cfpw/worker-metrics', (c) => handleCfpwWorkerMetricsGet(rc(c)));
app.get('/api/cfpw/account-metrics', (c) => handleCfpwAccountMetricsGet(rc(c)));
app.get('/api/cfpw/raw-allowlist', (c) => handleCfpwRawAllowlistGet(rc(c)));
app.post('/api/cfpw/page-project', (c) => handleCfpwPageProjectPost(rc(c)));
app.patch('/api/cfpw/page-build-config', (c) => handleCfpwPageBuildConfigPatch(rc(c)));
app.post('/api/cfpw/page-purge-build-cache', (c) => handleCfpwPagePurgeBuildCachePost(rc(c)));
app.get('/api/cfpw/page-env', (c) => handleCfpwPageEnvGet(rc(c)));
app.patch('/api/cfpw/page-env', (c) => handleCfpwPageEnvPatch(rc(c)));
app.post('/api/cfpw/page-deploy', (c) => handleCfpwPageDeployPost(rc(c)));
app.get('/api/cfpw/page-domain', (c) => handleCfpwPageDomainGet(rc(c)));
app.post('/api/cfpw/page-domain-recheck', (c) => handleCfpwPageDomainRecheckPost(rc(c)));
app.get('/api/cfpw/page-deployment', (c) => handleCfpwPageDeploymentGet(rc(c)));
app.delete('/api/cfpw/page-deployment', (c) => handleCfpwPageDeploymentDelete(rc(c)));
app.post('/api/cfpw/page-web-analytics', (c) => handleCfpwPageWebAnalyticsPost(rc(c)));

// ── cfpw/storage ──
app.get('/api/cfpw/storage/kv/namespaces', (c) => handleCfpwKvNamespacesGet(rc(c)));
app.post('/api/cfpw/storage/kv/namespaces', (c) => handleCfpwKvNamespacesPost(rc(c)));
app.put('/api/cfpw/storage/kv/namespaces/rename', (c) => handleCfpwKvNamespaceRenamePut(rc(c)));
app.delete('/api/cfpw/storage/kv/namespaces', (c) => handleCfpwKvNamespacesDelete(rc(c)));
app.get('/api/cfpw/storage/kv/keys', (c) => handleCfpwKvKeysGet(rc(c)));
app.get('/api/cfpw/storage/kv/value', (c) => handleCfpwKvValueGet(rc(c)));
app.put('/api/cfpw/storage/kv/value', (c) => handleCfpwKvValuePut(rc(c)));
app.delete('/api/cfpw/storage/kv/value', (c) => handleCfpwKvValueDelete(rc(c)));
app.put('/api/cfpw/storage/kv/bulk', (c) => handleCfpwKvBulkPut(rc(c)));
app.post('/api/cfpw/storage/kv/bulk-delete', (c) => handleCfpwKvBulkDeletePost(rc(c)));
app.get('/api/cfpw/storage/d1/databases', (c) => handleCfpwD1DatabasesGet(rc(c)));
app.post('/api/cfpw/storage/d1/databases', (c) => handleCfpwD1DatabasesPost(rc(c)));
app.delete('/api/cfpw/storage/d1/databases', (c) => handleCfpwD1DatabasesDelete(rc(c)));
app.post('/api/cfpw/storage/d1/query', (c) => handleCfpwD1QueryPost(rc(c)));
app.get('/api/cfpw/storage/d1/schema', (c) => handleCfpwD1SchemaGet(rc(c)));
app.get('/api/cfpw/storage/d1/table', (c) => handleCfpwD1TableGet(rc(c)));
app.post('/api/cfpw/storage/d1/export', (c) => handleCfpwD1ExportPost(rc(c)));
app.post('/api/cfpw/storage/d1/import', (c) => handleCfpwD1ImportPost(rc(c)));
app.get('/api/cfpw/storage/r2/buckets', (c) => handleCfpwR2BucketsGet(rc(c)));
app.post('/api/cfpw/storage/r2/buckets', (c) => handleCfpwR2BucketsPost(rc(c)));
app.delete('/api/cfpw/storage/r2/buckets', (c) => handleCfpwR2BucketsDelete(rc(c)));
app.get('/api/cfpw/storage/r2/objects', (c) => handleCfpwR2ObjectsGet(rc(c)));
app.get('/api/cfpw/storage/r2/object', (c) => handleCfpwR2ObjectGet(rc(c)));
app.put('/api/cfpw/storage/r2/object', (c) => handleCfpwR2ObjectPut(rc(c)));
app.delete('/api/cfpw/storage/r2/object', (c) => handleCfpwR2ObjectsDelete(rc(c)));
app.get('/api/cfpw/storage/r2/bucket-settings', (c) => handleCfpwR2BucketSettingsGet(rc(c)));

// ── config ──
app.get('/api/config-store', (c) => handleConfigStoreGet(rc(c)));
app.post('/api/config-store', (c) => handleConfigStorePost(rc(c)));

// ── adminhub / apphub ──
app.get('/api/adminhub/config', (c) => handleAdminhubConfigGet(rc(c)));
app.put('/api/adminhub/config', (c) => handleAdminhubConfigPut(rc(c)));
app.get('/api/apphub/config', (c) => handleApphubConfigGet(rc(c)));
app.put('/api/apphub/config', (c) => handleApphubConfigPut(rc(c)));

// ── calculadora ──
app.get('/api/calculadora/overview', (c) => handleCalculadoraOverviewGet(rc(c)));
app.get('/api/calculadora/parametros', (c) => handleCalculadoraParametrosGet(rc(c)));
app.post('/api/calculadora/parametros', (c) => handleCalculadoraParametrosPost(rc(c)));
app.post('/api/calculadora/sync', (c) => handleCalculadoraSyncPost(rc(c)));

// ── mainsite ──
app.get('/api/mainsite/about', (c) => handleMainsiteAboutGet(rc(c)));
app.put('/api/mainsite/about', (c) => handleMainsiteAboutPut(rc(c)));
app.get('/api/mainsite/overview', (c) => handleMainsiteOverviewGet(rc(c)));
app.get('/api/mainsite/posts', (c) => handleMainsitePostsGet(rc(c)));
app.post('/api/mainsite/posts', (c) => handleMainsitePostsPost(rc(c)));
app.put('/api/mainsite/posts', (c) => handleMainsitePostsPut(rc(c)));
app.delete('/api/mainsite/posts', (c) => handleMainsitePostsDelete(rc(c)));
app.post('/api/mainsite/posts-pin', (c) => handleMainsitePostsPinPost(rc(c)));
app.post('/api/mainsite/posts-reorder', (c) => handleMainsitePostsReorderPost(rc(c)));
app.post('/api/mainsite/posts-visibility', (c) => handleMainsitePostsVisibilityPost(rc(c)));
app.get('/api/mainsite/settings', (c) => handleMainsiteSettingsGet(rc(c)));
app.put('/api/mainsite/settings', (c) => handleMainsiteSettingsPut(rc(c)));
app.post('/api/mainsite/sync', (c) => handleMainsiteSyncPost(rc(c)));
app.post('/api/mainsite/migrate-media-urls', (c) => handleMainsiteMigrateMediaPost(rc(c)));
app.post('/api/mainsite/upload', (c) => handleMainsiteUploadPost(rc(c)));
app.get('/api/mainsite/media/:filename', (c) => {
  const filename = decodeURIComponent(c.req.param('filename'));
  if (
    !filename ||
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('\0')
  ) {
    return new Response('Invalid filename.', { status: 400 });
  }
  return handleMainsiteMediaGet({
    ...re(c),
    params: { filename },
  } as Parameters<typeof handleMainsiteMediaGet>[0]);
});
app.get('/api/mainsite/post-summaries', (c) => handlePostSummariesGet(rc(c)));
app.post('/api/mainsite/post-summaries', (c) => handlePostSummariesPost(rc(c)));
app.post('/api/mainsite/gemini-import', (c) => handleGeminiImportPost(rc(c)));
app.options('/api/mainsite/gemini-import', (c) => handleGeminiImportOptions(rc(c)));
app.post('/api/mainsite/ai/transform', (c) => handleMainsiteAiTransformPost(rc(c)));

// ── maestro ai ──
app.get('/api/maestro-ai/settings', (c) => handleMaestroAiSettingsGet(rc(c)));
app.put('/api/maestro-ai/settings', (c) => handleMaestroAiSettingsPut(rc(c)));
app.post('/api/maestro-ai/settings/test', (c) => handleMaestroAiSettingsTestPost(rc(c)));
app.get('/api/maestro-ai/sessions', (c) => handleMaestroAiSessionsGet(rc(c)));
app.post('/api/maestro-ai/sessions', (c) => handleMaestroAiSessionsPost(rc(c)));
app.get('/api/maestro-ai/sessions/:id', (c) => handleMaestroAiSessionsGet(rc(c), c.req.param('id')));
app.get('/api/maestro-ai/sessions/:id/artifacts', (c) => handleMaestroAiArtifactsGet(rc(c), c.req.param('id')));
app.get('/api/maestro-ai/sessions/:id/artifacts/:artifactId', (c) =>
  handleMaestroAiArtifactsGet(rc(c), c.req.param('id'), c.req.param('artifactId')),
);
app.put('/api/maestro-ai/sessions/:id/content', (c) => handleMaestroAiSessionContentPut(rc(c), c.req.param('id')));
app.post('/api/maestro-ai/sessions/:id/cancel', (c) => handleMaestroAiSessionCancelPost(rc(c), c.req.param('id')));
app.post('/api/maestro-ai/sessions/:id/resume', (c) => handleMaestroAiSessionResumePost(rc(c), c.req.param('id')));

// ── mainsite comments admin ──
app.get('/api/mainsite/comments/admin/all', (c) => handleCommentsAdminAll(re(c)));
app.post('/api/mainsite/comments/admin/bulk', (c) => handleCommentsAdminBulk(re(c)));
app.get('/api/mainsite/comments/admin/settings', (c) => handleCommentsAdminGetSettings(re(c)));
app.put('/api/mainsite/comments/admin/settings', (c) => handleCommentsAdminPutSettings(re(c)));
app.patch('/api/mainsite/comments/admin/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(id)) return c.json({ ok: false, error: 'Invalid comment ID.' }, 400);
  return handleCommentsAdminModerate(re(c), id);
});
app.delete('/api/mainsite/comments/admin/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(id)) return c.json({ ok: false, error: 'Invalid comment ID.' }, 400);
  return handleCommentsAdminDelete(re(c), id);
});
app.post('/api/mainsite/comments/admin/:id/reply', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(id)) return c.json({ ok: false, error: 'Invalid comment ID.' }, 400);
  return handleCommentsAdminReply(re(c), id);
});

// ── mainsite ratings admin ──
app.get('/api/mainsite/ratings/admin/all', (c) => handleRatingsAdminAll(re(c)));
app.get('/api/mainsite/ratings/admin/stats', (c) => handleRatingsAdminStats(re(c)));
app.post('/api/mainsite/ratings/admin/bulk', (c) => handleRatingsAdminBulk(re(c)));
app.patch('/api/mainsite/ratings/admin/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(id)) return c.json({ ok: false, error: 'Invalid rating ID.' }, 400);
  return handleRatingsAdminUpdate(re(c), id);
});
app.delete('/api/mainsite/ratings/admin/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(id)) return c.json({ ok: false, error: 'Invalid rating ID.' }, 400);
  return handleRatingsAdminDelete(re(c), id);
});

// ── mtasts ──
app.get('/api/mtasts/zones', (c) => handleMtastsZonesGet(rc(c)));
app.get('/api/mtasts/policy', (c) => handleMtastsPolicyGet(rc(c)));
app.post('/api/mtasts/orchestrate', (c) => handleMtastsOrchestratePost(rc(c)));
app.get('/api/mtasts/overview', (c) => handleMtastsOverviewGet(rc(c)));
app.post('/api/mtasts/sync', (c) => handleMtastsSyncPost(rc(c)));

// ── news ──
app.get('/api/news/discover', (c) => handleNewsDiscoverGet(rc(c)));
app.get('/api/news/feed', (c) => handleNewsFeedGet(rc(c)));

// ── overview ──
app.get('/api/overview/operational', (c) => handleOverviewOperationalGet(rc(c)));

// ── telemetry ──
app.delete('/api/telemetry/delete', (c) => handleTelemetryDeleteDelete(rc(c)));
app.get('/api/telemetry/telemetry', (c) => handleTelemetryGet(rc(c)));

// ── 404 + error handler ──
app.notFound((c) => {
  logWarn('request:not-found', {
    method: c.req.method,
    pathname: new URL(c.req.url).pathname,
  });
  return c.json({ ok: false, error: 'Rota não encontrada no admin-motor.' }, 404);
});

app.onError((error, c) => {
  const method = c.req.method.toUpperCase();
  const pathname = new URL(c.req.url).pathname;
  logError('request:unhandled-exception', {
    method,
    pathname,
    error: sanitizeErrorMessage(error),
  });
  return c.json({ ok: false, error: 'Erro interno no admin-motor.' }, 500);
});

// Cron entry point: reap orphaned Maestro AI sessions whose background runner
// was evicted/redeployed mid-run (see runMaestroSweep). Scheduled via the
// triggers.crons entry in wrangler.json.
async function scheduled(
  _controller: unknown,
  env: AdminMotorEnv,
  ctx: { waitUntil(p: Promise<unknown>): void },
): Promise<void> {
  const runtimeEnv = await resolveRuntimeEnv(env);
  ctx.waitUntil(
    runMaestroSweep(runtimeEnv as Parameters<typeof runMaestroSweep>[0]).then(
      (reaped) => {
        if (reaped > 0) logWarn('maestro:sweep', { reaped });
      },
      (error) => logError('maestro:sweep:error', { error: sanitizeErrorMessage(error) }),
    ),
  );
}

export default {
  fetch: (request: Request, env: AdminMotorEnv, ctx: ExecutionContext) => app.fetch(request, env, ctx),
  scheduled,
};
