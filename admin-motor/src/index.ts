import {
  handleCleanupDeploymentsGet,
  handleCleanupDeploymentsPost,
} from './handlers/cfpwCleanup';
import { handleFinanceiroInsightsGet } from './handlers/financeiroInsights';
import { handleAiStatusModelsGet } from './handlers/aiStatusModels';
import { handleOraculoModelosGet } from './handlers/oraculoModelos';
import { handleOraculoCronGet, handleOraculoCronPut } from './handlers/oraculoCron';
import { handleAstrologoEnviarEmailPost } from './handlers/astrologoEmail';
import { handleCfdnsZonesGet } from './handlers/cfdnsZones';
import {
  handleSumupRefundPost,
  handleSumupCancelPost,
} from './handlers/financeiroActions';
import { onRequestGet as handleAiStatusGcpMonitoringGet } from './handlers/routes/ai-status/gcp-monitoring';
import { onRequestGet as handleAiStatusGcpLogsGet } from './handlers/routes/ai-status/gcp-logs';
import { onRequestGet as handleCfdnsRecordsGet } from './handlers/routes/cfdns/records';
import { onRequestGet as handleCfpwOverviewGet } from './handlers/routes/cfpw/overview';
import { onRequestPost as handleCfpwOpsPost } from './handlers/routes/cfpw/ops';
import { onRequestGet as handleCfpwPageDetailsGet } from './handlers/routes/cfpw/page-details';
import { onRequestGet as handleCfpwWorkerDetailsGet } from './handlers/routes/cfpw/worker-details';
import { onRequestPost as handleCfpwDeletePagePost } from './handlers/routes/cfpw/delete-page';
import { onRequestPost as handleCfpwDeleteWorkerPost } from './handlers/routes/cfpw/delete-worker';
import { onRequestPost as handleCfpwCleanupCacheProjectPost } from './handlers/routes/cfpw/cleanup-cache-project';
import { onRequestGet as handleCfpwObservabilityGet, onRequestPost as handleCfpwObservabilityPost } from './handlers/routes/cfpw/observability';
import { onRequestGet as handleSumupBalanceGet } from './handlers/routes/financeiro/sumup-balance';
import {
  onRequestGet as handlePostSummariesGet,
  onRequestPost as handlePostSummariesPost,
} from './handlers/routes/mainsite/post-summaries';
import {
  onRequestPost as handleGeminiImportPost,
  onRequestOptions as handleGeminiImportOptions,
} from './handlers/routes/mainsite/gemini-import';
import { onRequestPost as handleMainsiteAiTransformPost } from './handlers/routes/mainsite/ai/transform';
import { onRequestGet as handleMtastsZonesGet } from './handlers/routes/mtasts/zones';
import { onRequestGet as handleMtastsPolicyGet } from './handlers/routes/mtasts/policy';
import { onRequestPost as handleMtastsOrchestratePost } from './handlers/routes/mtasts/orchestrate';
import { onRequestGet as handleNewsDiscoverGet } from './handlers/routes/news/discover';
import {
  onRequestGet as handleAdminhubConfigGet,
  onRequestPut as handleAdminhubConfigPut,
} from './handlers/routes/adminhub/config';
import {
  onRequestGet as handleApphubConfigGet,
  onRequestPut as handleApphubConfigPut,
} from './handlers/routes/apphub/config';
import { toHeaders } from '../../functions/api/_lib/mainsite-admin';
import { GoogleGenAI } from '@google/genai';
import { validatePutAuth } from './handlers/routes/_lib/auth';
import { Hono } from 'hono';
import type { Context } from 'hono';
// ── Novos handlers migrados de Pages Functions ──
import { onRequestGet as handleAiStatusUsageGet, onRequestPost as handleAiStatusUsagePost } from './handlers/routes/ai-status/usage';
import { onRequestPost as handleAstrologoExcluirPost } from './handlers/routes/astrologo/excluir';
import { onRequestPost as handleAstrologoLerPost } from './handlers/routes/astrologo/ler';
import { onRequestGet as handleAstrologoListarGet } from './handlers/routes/astrologo/listar';
import { onRequestPost as handleAstrologoSyncPost } from './handlers/routes/astrologo/sync';
import { onRequestGet as handleAstrologoUserdataGet, onRequestDelete as handleAstrologoUserdataDelete } from './handlers/routes/astrologo/userdata';
import { onRequestDelete as handleCfdnsDeleteDelete } from './handlers/routes/cfdns/delete';
import { onRequestPost as handleCfdnsUpsertPost } from './handlers/routes/cfdns/upsert';
import { onRequest as handleConfigRequest } from './handlers/routes/config/config';
import { onRequestGet as handleConfigStoreGet, onRequestPost as handleConfigStorePost } from './handlers/routes/config/config-store';
import { onRequestGet as handleCalculadoraOverviewGet } from './handlers/routes/calculadora/overview';
import { onRequestGet as handleCalculadoraParametrosGet, onRequestPost as handleCalculadoraParametrosPost } from './handlers/routes/calculadora/parametros';
import { onRequestPost as handleCalculadoraSyncPost } from './handlers/routes/calculadora/sync';
import { onRequestGet as handleMainsiteFeesGet, onRequestPost as handleMainsiteFeesPost } from './handlers/routes/mainsite/fees';
import { onRequestGet as handleMainsiteOverviewGet } from './handlers/routes/mainsite/overview';
import { onRequestGet as handleMainsitePostsGet, onRequestPost as handleMainsitePostsPost, onRequestPut as handleMainsitePostsPut, onRequestDelete as handleMainsitePostsDelete } from './handlers/routes/mainsite/posts';
import { onRequestPost as handleMainsitePostsPinPost } from './handlers/routes/mainsite/posts-pin';
import { onRequestPost as handleMainsitePostsReorderPost } from './handlers/routes/mainsite/posts-reorder';
import { onRequestGet as handleMainsiteSettingsGet, onRequestPut as handleMainsiteSettingsPut } from './handlers/routes/mainsite/settings';
import { onRequestPost as handleMainsiteSyncPost } from './handlers/routes/mainsite/sync';
import { onRequestPost as handleMainsiteMigrateMediaPost } from './handlers/routes/mainsite/migrate-media-urls';
import { onRequestPost as handleMainsiteUploadPost } from './handlers/routes/mainsite/upload';
import { onRequestGet as handleMainsiteMediaGet } from './handlers/routes/mainsite/media/[filename]';
import { onRequestPost as handleWorkersAiSentimentPost } from './handlers/routes/mainsite/workers-ai/sentiment';
import { onRequestPost as handleWorkersAiTagsPost } from './handlers/routes/mainsite/workers-ai/tags';
import { onRequestPost as handleWorkersAiTranslatePost } from './handlers/routes/mainsite/workers-ai/translate';
import {
  handleCommentsAdminAll,
  handleCommentsAdminModerate,
  handleCommentsAdminDelete,
  handleCommentsAdminReply,
  handleCommentsAdminBulk,
  handleCommentsAdminGetSettings,
  handleCommentsAdminPutSettings,
} from './handlers/routes/mainsite/comments-admin';
import {
  handleRatingsAdminAll,
  handleRatingsAdminStats,
  handleRatingsAdminUpdate,
  handleRatingsAdminDelete,
  handleRatingsAdminBulk,
} from './handlers/routes/mainsite/ratings-admin';
import { onRequestGet as handleMtastsOverviewGet } from './handlers/routes/mtasts/overview';
import { onRequestPost as handleMtastsSyncPost } from './handlers/routes/mtasts/sync';
import { onRequestGet as handleNewsFeedGet } from './handlers/routes/news/feed';
import { onRequestPost as handleOraculoExcluirPost } from './handlers/routes/oraculo/excluir';
import { onRequestGet as handleOraculoListarGet } from './handlers/routes/oraculo/listar';
import { onRequestGet as handleOraculoTaxacacheGet } from './handlers/routes/oraculo/taxacache';
import { onRequestGet as handleOraculoUserdataGet, onRequestDelete as handleOraculoUserdataDelete } from './handlers/routes/oraculo/userdata';
import { onRequestGet as handleOverviewOperationalGet } from './handlers/routes/overview/operational';
import { onRequestDelete as handleTelemetryDeleteDelete } from './handlers/routes/telemetry/delete';
import { onRequestGet as handleTelemetryGet } from './handlers/routes/telemetry/telemetry';


type AdminMotorEnv = {
  BIGDATA_DB?: D1Like;
  MEDIA_BUCKET?: unknown;
  AI?: unknown;
  GEMINI_API_KEY?: unknown;
  CLOUDFLARE_PW?: unknown;
  CF_ACCOUNT_ID?: unknown;
  SUMUP_API_KEY_PRIVATE?: unknown;
  SUMUP_MERCHANT_CODE?: unknown;
  RESEND_API_KEY?: unknown;
  CLOUDFLARE_DNS?: unknown;
  CLOUDFLARE_CACHE?: unknown;
  GCP_SA_KEY?: unknown;
  GCP_PROJECT_ID?: unknown;
  JINA_API_KEY?: unknown;
  CF_ACCESS_TEAM_DOMAIN?: unknown;
  ENFORCE_JWT_VALIDATION?: unknown;
};

type ResolvedAdminMotorEnv = {
  BIGDATA_DB?: D1Like;
  MEDIA_BUCKET?: unknown;
  AI?: unknown;
  GEMINI_API_KEY?: string;
  CLOUDFLARE_PW?: string;
  CF_ACCOUNT_ID?: string;
  SUMUP_API_KEY_PRIVATE?: string;
  SUMUP_MERCHANT_CODE?: string;
  RESEND_API_KEY?: string;
  CLOUDFLARE_DNS?: string;
  CLOUDFLARE_CACHE?: string;
  GCP_SA_KEY?: string;
  GCP_PROJECT_ID?: string;
  JINA_API_KEY?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  ENFORCE_JWT_VALIDATION?: string;
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
  BIGDATA_DB: env.BIGDATA_DB,
  MEDIA_BUCKET: env.MEDIA_BUCKET,
  AI: env.AI,
  GEMINI_API_KEY: await readSecretString(env.GEMINI_API_KEY),
  CLOUDFLARE_PW: await readSecretString(env.CLOUDFLARE_PW),
  CF_ACCOUNT_ID: await readSecretString(env.CF_ACCOUNT_ID),
  SUMUP_API_KEY_PRIVATE: await readSecretString(env.SUMUP_API_KEY_PRIVATE),
  SUMUP_MERCHANT_CODE: await readSecretString(env.SUMUP_MERCHANT_CODE),
  RESEND_API_KEY: await readSecretString(env.RESEND_API_KEY),
  CLOUDFLARE_DNS: await readSecretString(env.CLOUDFLARE_DNS),
  CLOUDFLARE_CACHE: await readSecretString(env.CLOUDFLARE_CACHE),
  GCP_SA_KEY: await readSecretString(env.GCP_SA_KEY),
  GCP_PROJECT_ID: await readSecretString(env.GCP_PROJECT_ID),
  JINA_API_KEY: await readSecretString(env.JINA_API_KEY),
  CF_ACCESS_TEAM_DOMAIN: await readSecretString(env.CF_ACCESS_TEAM_DOMAIN),
  ENFORCE_JWT_VALIDATION: await readSecretString(env.ENFORCE_JWT_VALIDATION),
});

const handleAiStatusHealth = async (request: Request, env: ResolvedAdminMotorEnv, _unparsedEnv: AdminMotorEnv): Promise<Response> => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({
      ok: false,
      error: 'AI service not configured.',
      keyConfigured: false,
    }, 503);
  }
  const ai = new GoogleGenAI({ apiKey });

  try {
    const start = Date.now();
    const pager = await ai.models.list({ config: { pageSize: 1 } });
    // Consume at least one model to verify API reachability
    let firstModel = '';
    for await (const m of pager) {
      firstModel = m.name || '';
      break;
    }
    const latencyMs = Date.now() - start;

    console.info('[ai-status/health] request:ok', {
      endpoint: 'models:list',
      latencyMs,
      sdk: true,
    });
    return json({
      ok: true,
      keyConfigured: true,
      apiReachable: true,
      model: firstModel || 'sdk-verified',
      latencyMs,
      httpStatus: 200,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const errorBody = err instanceof Error ? err.message : String(err);
    console.error('[ai-status/health] request:error', {
      endpoint: 'models:list',
      sdk: true,
      error: errorBody,
    });
    return json(
      {
        ok: false,
        keyConfigured: true,
        apiReachable: false,
        latencyMs: null,
        httpStatus: null,
        error: 'AI service unreachable.',
        checkedAt: new Date().toISOString(),
      },
      500,
    );
  }
};

const fetchMainsiteGeminiModels = async (
  request: Request,
  env: ResolvedAdminMotorEnv,
): Promise<ModelOption[]> => {
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

    console.info('[ai-status/models] request:ok', {
      total: models.length,
      gatewayEnabled: false,
    });
    return json({ ok: true, models, total: models.length });
  } catch (err) {
    console.error('[ai-status/models] request:error', {
      gatewayEnabled: false,
      error: err instanceof Error ? err.message : String(err),
    });
    return json({ ok: false, error: err instanceof Error ? err.message : 'Erro ao listar modelos.' }, 500);
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
    logInfo('request:end', { method, pathname, latencyMs: Date.now() - startedAt });
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
  const authCtx = await validatePutAuth(c.req.raw, env.CLOUDFLARE_PW, {
    teamDomain: env.CF_ACCESS_TEAM_DOMAIN,
    enforcement: env.ENFORCE_JWT_VALIDATION,
  });
  if (!authCtx.isAuthenticated) {
    return c.json({ ok: false, error: 'Unauthorized.' }, 401);
  }
  return next();
});

// ── Route context helper ──
// Casts the Hono context into the shape expected by all handler functions.
const rc = <T>(c: Context<HonoEnv>) =>
  ({ request: c.req.raw, env: c.get('runtimeEnv'), waitUntil: (p: Promise<unknown>) => c.executionCtx.waitUntil(p) } as unknown as T);
const re = (c: Context<HonoEnv>) => ({ request: c.req.raw, env: c.get('runtimeEnv') });

// ── ai-status ──
app.get('/api/ai-status/health', (c) => handleAiStatusHealth(c.req.raw, c.get('runtimeEnv'), c.env));
app.get('/api/ai-status/models', (c) => handleAiStatusModelsGet(re(c)));
app.get('/api/ai-status/gcp-monitoring', (c) => handleAiStatusGcpMonitoringGet(rc(c)));
app.get('/api/ai-status/gcp-logs', (c) => handleAiStatusGcpLogsGet(rc(c)));
app.get('/api/ai-status/usage', (c) => handleAiStatusUsageGet(rc(c)));
app.post('/api/ai-status/usage', (c) => handleAiStatusUsagePost(rc(c)));

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
app.delete('/api/cfdns/delete', (c) => handleCfdnsDeleteDelete(rc(c)));
app.post('/api/cfdns/upsert', (c) => handleCfdnsUpsertPost(rc(c)));

// ── cfpw ──
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

// ── config ──
app.all('/api/config', (c) => handleConfigRequest(rc(c)));
app.get('/api/config-store', (c) => handleConfigStoreGet(rc(c)));
app.post('/api/config-store', (c) => handleConfigStorePost(rc(c)));

// ── adminhub / apphub ──
app.get('/api/adminhub/config', (c) => handleAdminhubConfigGet(rc(c)));
app.put('/api/adminhub/config', (c) => handleAdminhubConfigPut(rc(c)));
app.get('/api/apphub/config', (c) => handleApphubConfigGet(rc(c)));
app.put('/api/apphub/config', (c) => handleApphubConfigPut(rc(c)));

// ── financeiro ──
app.get('/api/financeiro/insights', (c) => handleFinanceiroInsightsGet(re(c)));
app.get('/api/financeiro/sumup-balance', (c) => handleSumupBalanceGet(rc(c)));
app.post('/api/financeiro/sumup-refund', (c) => handleSumupRefundPost(re(c)));
app.post('/api/financeiro/sumup-cancel', (c) => handleSumupCancelPost(re(c)));

// ── calculadora ──
app.get('/api/calculadora/overview', (c) => handleCalculadoraOverviewGet(rc(c)));
app.get('/api/calculadora/parametros', (c) => handleCalculadoraParametrosGet(rc(c)));
app.post('/api/calculadora/parametros', (c) => handleCalculadoraParametrosPost(rc(c)));
app.post('/api/calculadora/sync', (c) => handleCalculadoraSyncPost(rc(c)));

// ── mainsite ──
app.get('/api/mainsite/fees', (c) => handleMainsiteFeesGet(rc(c)));
app.post('/api/mainsite/fees', (c) => handleMainsiteFeesPost(rc(c)));
app.get('/api/mainsite/overview', (c) => handleMainsiteOverviewGet(rc(c)));
app.get('/api/mainsite/posts', (c) => handleMainsitePostsGet(rc(c)));
app.post('/api/mainsite/posts', (c) => handleMainsitePostsPost(rc(c)));
app.put('/api/mainsite/posts', (c) => handleMainsitePostsPut(rc(c)));
app.delete('/api/mainsite/posts', (c) => handleMainsitePostsDelete(rc(c)));
app.post('/api/mainsite/posts-pin', (c) => handleMainsitePostsPinPost(rc(c)));
app.post('/api/mainsite/posts-reorder', (c) => handleMainsitePostsReorderPost(rc(c)));
app.get('/api/mainsite/settings', (c) => handleMainsiteSettingsGet(rc(c)));
app.put('/api/mainsite/settings', (c) => handleMainsiteSettingsPut(rc(c)));
app.post('/api/mainsite/sync', (c) => handleMainsiteSyncPost(rc(c)));
app.post('/api/mainsite/migrate-media-urls', (c) => handleMainsiteMigrateMediaPost(rc(c)));
app.post('/api/mainsite/upload', (c) => handleMainsiteUploadPost(rc(c)));
app.get('/api/mainsite/media/:filename', (c) => {
  const filename = decodeURIComponent(c.req.param('filename'));
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
    return new Response('Invalid filename.', { status: 400 });
  }
  return handleMainsiteMediaGet({ ...re(c), params: { filename } } as Parameters<typeof handleMainsiteMediaGet>[0]);
});
app.get('/api/mainsite/post-summaries', (c) => handlePostSummariesGet(rc(c)));
app.post('/api/mainsite/post-summaries', (c) => handlePostSummariesPost(rc(c)));
app.post('/api/mainsite/gemini-import', (c) => handleGeminiImportPost(rc(c)));
app.options('/api/mainsite/gemini-import', (c) => handleGeminiImportOptions(rc(c)));
app.post('/api/mainsite/ai/transform', (c) => handleMainsiteAiTransformPost(rc(c)));

// ── mainsite workers-ai ──
app.post('/api/mainsite/workers-ai/sentiment', (c) => handleWorkersAiSentimentPost(rc(c)));
app.post('/api/mainsite/workers-ai/tags', (c) => handleWorkersAiTagsPost(rc(c)));
app.post('/api/mainsite/workers-ai/translate', (c) => handleWorkersAiTranslatePost(rc(c)));

// ── mainsite comments admin ──
app.get('/api/mainsite/comments/admin/all', (c) => handleCommentsAdminAll(re(c)));
app.post('/api/mainsite/comments/admin/bulk', (c) => handleCommentsAdminBulk(re(c)));
app.get('/api/mainsite/comments/admin/settings', (c) => handleCommentsAdminGetSettings(re(c)));
app.put('/api/mainsite/comments/admin/settings', (c) => handleCommentsAdminPutSettings(re(c)));
app.patch('/api/mainsite/comments/admin/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ ok: false, error: 'Invalid comment ID.' }, 400);
  return handleCommentsAdminModerate(re(c), id);
});
app.delete('/api/mainsite/comments/admin/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ ok: false, error: 'Invalid comment ID.' }, 400);
  return handleCommentsAdminDelete(re(c), id);
});
app.post('/api/mainsite/comments/admin/:id/reply', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ ok: false, error: 'Invalid comment ID.' }, 400);
  return handleCommentsAdminReply(re(c), id);
});

// ── mainsite ratings admin ──
app.get('/api/mainsite/ratings/admin/all', (c) => handleRatingsAdminAll(re(c)));
app.get('/api/mainsite/ratings/admin/stats', (c) => handleRatingsAdminStats(re(c)));
app.post('/api/mainsite/ratings/admin/bulk', (c) => handleRatingsAdminBulk(re(c)));
app.patch('/api/mainsite/ratings/admin/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ ok: false, error: 'Invalid rating ID.' }, 400);
  return handleRatingsAdminUpdate(re(c), id);
});
app.delete('/api/mainsite/ratings/admin/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json({ ok: false, error: 'Invalid rating ID.' }, 400);
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
  logWarn('request:not-found', { method: c.req.method, pathname: new URL(c.req.url).pathname });
  return c.json({ ok: false, error: 'Rota não encontrada no admin-motor.' }, 404);
});

app.onError((error, c) => {
  const method = c.req.method.toUpperCase();
  const pathname = new URL(c.req.url).pathname;
  logError('request:unhandled-exception', { method, pathname, error: sanitizeErrorMessage(error) });
  return c.json({ ok: false, error: 'Erro interno no admin-motor.' }, 500);
});

export default app;
