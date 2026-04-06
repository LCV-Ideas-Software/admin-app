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
  handleMpRefundPost,
  handleMpCancelPost,
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
import { onRequestGet as handleMpBalanceGet } from './handlers/routes/financeiro/mp-balance';
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

// ========== MERCADO PAGO SDK POLYFILL ==========
// O SDK do Mercado Pago usa node-fetch internamente, o que exige
// que objetos Headers tenham a função .raw()
if (typeof Headers !== 'undefined' && !('raw' in Headers.prototype)) {
  Object.defineProperty(Headers.prototype, 'raw', {
    value: function (this: Headers) {
      const raw: Record<string, string[]> = {};
      this.forEach((value, key) => {
        raw[key] = [value];
      });
      return raw;
    },
    configurable: true,
  });
}

type AdminMotorEnv = {
  BIGDATA_DB?: D1Like;
  MEDIA_BUCKET?: unknown;
  AI?: unknown;
  GEMINI_API_KEY?: unknown;
  CLOUDFLARE_PW?: unknown;
  CF_ACCOUNT_ID?: unknown;
  SUMUP_API_KEY_PRIVATE?: unknown;
  SUMUP_MERCHANT_CODE?: unknown;
  MP_ACCESS_TOKEN?: unknown;
  RESEND_API_KEY?: unknown;
  CLOUDFLARE_DNS?: unknown;
  CLOUDFLARE_CACHE?: unknown;
  GCP_SA_KEY?: unknown;
  GCP_PROJECT_ID?: unknown;
  JINA_API_KEY?: unknown;
  ADMINHUB_BEARER_TOKEN?: unknown;
  APPHUB_BEARER_TOKEN?: unknown;
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
  MP_ACCESS_TOKEN?: string;
  RESEND_API_KEY?: string;
  CLOUDFLARE_DNS?: string;
  CLOUDFLARE_CACHE?: string;
  GCP_SA_KEY?: string;
  GCP_PROJECT_ID?: string;
  JINA_API_KEY?: string;
  ADMINHUB_BEARER_TOKEN?: string;
  APPHUB_BEARER_TOKEN?: string;
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
  MP_ACCESS_TOKEN: await readSecretString(env.MP_ACCESS_TOKEN),
  RESEND_API_KEY: await readSecretString(env.RESEND_API_KEY),
  CLOUDFLARE_DNS: await readSecretString(env.CLOUDFLARE_DNS),
  CLOUDFLARE_CACHE: await readSecretString(env.CLOUDFLARE_CACHE),
  GCP_SA_KEY: await readSecretString(env.GCP_SA_KEY),
  GCP_PROJECT_ID: await readSecretString(env.GCP_PROJECT_ID),
  JINA_API_KEY: await readSecretString(env.JINA_API_KEY),
  ADMINHUB_BEARER_TOKEN: await readSecretString(env.ADMINHUB_BEARER_TOKEN),
  APPHUB_BEARER_TOKEN: await readSecretString(env.APPHUB_BEARER_TOKEN),
});

const handleAiStatusHealth = async (request: Request, env: ResolvedAdminMotorEnv, unparsedEnv: AdminMotorEnv): Promise<Response> => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    const rawKeys = Object.keys(unparsedEnv);
    const resolvedMap = Object.entries(env).map(([k, v]) => `${k}:${v ? 'EXISTE' : 'FALTA'}`);
    return json({ 
      ok: false, 
      error: 'GEMINI_API_KEY não configurada no runtime do admin-motor.', 
      keyConfigured: false,
      debugRawEnvKeys: rawKeys,
      debugResolved: resolvedMap
    }, 503);
  }
  const baseUrl = 'https://generativelanguage.googleapis.com';
  const requestHeaders = toHeaders() as Record<string, string>;

  try {
    const start = Date.now();
    const res = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`, {
      method: 'GET',
      headers: requestHeaders,
      signal: request.signal,
    });
    const latencyMs = Date.now() - start;

    if (res.ok) {
      console.info('[ai-status/health] request:ok', {
        endpoint: 'models:list',
        latencyMs,
        directGoogle: true,
      });
      return json({
        ok: true,
        keyConfigured: true,
        apiReachable: true,
        model: 'google-direct',
        latencyMs,
        httpStatus: 200,
        checkedAt: new Date().toISOString(),
      });
    }

    const upstreamBody = await res.text().catch(() => '');
    console.error('[ai-status/health] upstream:error', {
      endpoint: 'models:list',
      status: res.status,
      directGoogle: true,
      bodyPreview: upstreamBody.slice(0, 300),
    });

    return json({
      ok: false,
      keyConfigured: true,
      apiReachable: true,
      model: 'google-direct',
      latencyMs,
      httpStatus: res.status,
      errorDetail: 'Falha ao consultar a API do Google Gemini diretamente.',
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const errorBody = err instanceof Error ? err.message : String(err);
    console.error('[ai-status/health] request:error', {
      endpoint: 'models:list',
      directGoogle: true,
      error: errorBody,
    });
    return json(
      {
        ok: false,
        keyConfigured: true,
        apiReachable: false,
        latencyMs: null,
        httpStatus: null,
        error: errorBody.slice(0, 500),
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

  const allModels = new Map<string, ModelOption>();
  const baseUrl = 'https://generativelanguage.googleapis.com';

  const requestHeaders: Record<string, string> = {};

  interface ModelOutput {
    name: string;
    displayName: string;
  }

  const res = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`, {
    method: 'GET',
    headers: requestHeaders,
    signal: request.signal,
  });

  if (!res.ok) {
    const upstreamBody = await res.text().catch(() => '');
    console.error('[mainsite/modelos] upstream:error', {
      status: res.status,
      bodyPreview: upstreamBody.slice(0, 300),
    });
    throw new Error(`API Error: ${res.status}`);
  }

  const data = (await res.json()) as { models: ModelOutput[] };

  for (const m of data.models || []) {
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

const notFound = () =>
  new Response(JSON.stringify({ ok: false, error: 'Rota não encontrada no admin-motor.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

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

export default {
  async fetch(request: Request, env: AdminMotorEnv, ctx: ExecutionContext): Promise<Response> {
    const startedAt = Date.now();
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    logDebug('request:start', { method, pathname });

    try {
      const runtimeEnv = await resolveRuntimeEnv(env);
      const routeContext = <T>() => ({ request, env: runtimeEnv, waitUntil: (p: Promise<unknown>) => ctx.waitUntil(p) } as unknown as T);
      if (method === 'GET' && pathname === '/api/ai-status/health') {
        return handleAiStatusHealth(request, runtimeEnv, env);
      }

    if (method === 'GET' && pathname === '/api/ai-status/models') {
      return handleAiStatusModelsGet({ request, env: runtimeEnv });
    }

    if (method === 'GET' && pathname === '/api/ai-status/gcp-monitoring') {
      return handleAiStatusGcpMonitoringGet(routeContext<Parameters<typeof handleAiStatusGcpMonitoringGet>[0]>());
    }

    if (method === 'GET' && pathname === '/api/ai-status/gcp-logs') {
      return handleAiStatusGcpLogsGet(routeContext<Parameters<typeof handleAiStatusGcpLogsGet>[0]>());
    }

    if (method === 'GET' && pathname === '/api/mainsite/modelos') {
      return handleMainsiteModelos(request, runtimeEnv);
    }

    if (method === 'GET' && pathname === '/api/calculadora/modelos') {
      return handleMainsiteModelos(request, runtimeEnv);
    }

    if (method === 'GET' && pathname === '/api/oraculo/modelos') {
      return handleOraculoModelosGet({ request, env: runtimeEnv });
    }

    if (method === 'GET' && pathname === '/api/astrologo/modelos') {
      return handleOraculoModelosGet({ request, env: runtimeEnv });
    }

    if (pathname === '/api/oraculo/cron') {
      if (method === 'GET') return handleOraculoCronGet({ request, env: runtimeEnv });
      if (method === 'PUT') return handleOraculoCronPut({ request, env: runtimeEnv });
    }

    if (method === 'POST' && pathname === '/api/astrologo/enviar-email') {
      return handleAstrologoEnviarEmailPost({ request, env: runtimeEnv });
    }

    if (method === 'GET' && pathname === '/api/cfdns/zones') {
      return handleCfdnsZonesGet({ request, env: runtimeEnv });
    }

    if (method === 'GET' && pathname === '/api/cfdns/records') {
      return handleCfdnsRecordsGet(routeContext<Parameters<typeof handleCfdnsRecordsGet>[0]>());
    }

    if (method === 'GET' && pathname === '/api/cfpw/overview') {
      return handleCfpwOverviewGet(routeContext<Parameters<typeof handleCfpwOverviewGet>[0]>());
    }

    if (method === 'POST' && pathname === '/api/cfpw/ops') {
      return handleCfpwOpsPost(routeContext<Parameters<typeof handleCfpwOpsPost>[0]>());
    }

    if (method === 'GET' && pathname === '/api/cfpw/page-details') {
      return handleCfpwPageDetailsGet(routeContext<Parameters<typeof handleCfpwPageDetailsGet>[0]>());
    }

    if (method === 'GET' && pathname === '/api/cfpw/worker-details') {
      return handleCfpwWorkerDetailsGet(routeContext<Parameters<typeof handleCfpwWorkerDetailsGet>[0]>());
    }

    if (method === 'POST' && pathname === '/api/cfpw/delete-page') {
      return handleCfpwDeletePagePost(routeContext<Parameters<typeof handleCfpwDeletePagePost>[0]>());
    }

    if (method === 'POST' && pathname === '/api/cfpw/delete-worker') {
      return handleCfpwDeleteWorkerPost(routeContext<Parameters<typeof handleCfpwDeleteWorkerPost>[0]>());
    }

    if (method === 'POST' && pathname === '/api/cfpw/cleanup-cache-project') {
      return handleCfpwCleanupCacheProjectPost(routeContext<Parameters<typeof handleCfpwCleanupCacheProjectPost>[0]>());
    }

    if (pathname === '/api/cfpw/cleanup-deployments') {
      if (method === 'GET') return handleCleanupDeploymentsGet({ request, env: runtimeEnv });
      if (method === 'POST') return handleCleanupDeploymentsPost({ request, env: runtimeEnv });
    }

    if (method === 'GET' && pathname === '/api/financeiro/insights') {
      return handleFinanceiroInsightsGet({ request, env: runtimeEnv });
    }

    if (method === 'GET' && pathname === '/api/financeiro/mp-balance') {
      return handleMpBalanceGet(routeContext<Parameters<typeof handleMpBalanceGet>[0]>());
    }

    if (method === 'GET' && pathname === '/api/financeiro/sumup-balance') {
      return handleSumupBalanceGet(routeContext<Parameters<typeof handleSumupBalanceGet>[0]>());
    }

    if (method === 'POST' && pathname === '/api/financeiro/sumup-refund') {
      return handleSumupRefundPost({ request, env: runtimeEnv });
    }

    if (method === 'POST' && pathname === '/api/financeiro/sumup-cancel') {
      return handleSumupCancelPost({ request, env: runtimeEnv });
    }

    if (method === 'POST' && pathname === '/api/financeiro/mp-refund') {
      return handleMpRefundPost({ request, env: runtimeEnv });
    }

    if (method === 'POST' && pathname === '/api/financeiro/mp-cancel') {
      return handleMpCancelPost({ request, env: runtimeEnv });
    }

    if (pathname === '/api/mainsite/post-summaries') {
      if (method === 'GET') return handlePostSummariesGet(routeContext<Parameters<typeof handlePostSummariesGet>[0]>());
      if (method === 'POST') return handlePostSummariesPost(routeContext<Parameters<typeof handlePostSummariesPost>[0]>());
    }

    if (pathname === '/api/mainsite/gemini-import') {
      if (method === 'POST') return handleGeminiImportPost(routeContext<Parameters<typeof handleGeminiImportPost>[0]>());
      if (method === 'OPTIONS') return handleGeminiImportOptions(routeContext<Parameters<typeof handleGeminiImportOptions>[0]>());
    }

    if (method === 'POST' && pathname === '/api/mainsite/ai/transform') {
      return handleMainsiteAiTransformPost(routeContext<Parameters<typeof handleMainsiteAiTransformPost>[0]>());
    }

    if (method === 'GET' && pathname === '/api/mtasts/zones') {
      return handleMtastsZonesGet(routeContext<Parameters<typeof handleMtastsZonesGet>[0]>());
    }

    if (method === 'GET' && pathname === '/api/mtasts/policy') {
      return handleMtastsPolicyGet(routeContext<Parameters<typeof handleMtastsPolicyGet>[0]>());
    }

    if (method === 'POST' && pathname === '/api/mtasts/orchestrate') {
      return handleMtastsOrchestratePost(routeContext<Parameters<typeof handleMtastsOrchestratePost>[0]>());
    }

    if (method === 'GET' && pathname === '/api/news/discover') {
      return handleNewsDiscoverGet(routeContext<Parameters<typeof handleNewsDiscoverGet>[0]>());
    }

    if (pathname === '/api/adminhub/config') {
      if (method === 'GET') return handleAdminhubConfigGet(routeContext<Parameters<typeof handleAdminhubConfigGet>[0]>());
      if (method === 'PUT') return handleAdminhubConfigPut(routeContext<Parameters<typeof handleAdminhubConfigPut>[0]>());
    }

      if (pathname === '/api/apphub/config') {
        if (method === 'GET') return handleApphubConfigGet(routeContext<Parameters<typeof handleApphubConfigGet>[0]>());
        if (method === 'PUT') return handleApphubConfigPut(routeContext<Parameters<typeof handleApphubConfigPut>[0]>());
      }

    // ── Rotas migradas de Pages Functions ──

    // ai-status
    if (pathname === '/api/ai-status/usage') {
      if (method === 'GET') return handleAiStatusUsageGet(routeContext<Parameters<typeof handleAiStatusUsageGet>[0]>());
      if (method === 'POST') return handleAiStatusUsagePost(routeContext<Parameters<typeof handleAiStatusUsagePost>[0]>());
    }

    // astrologo
    if (method === 'POST' && pathname === '/api/astrologo/excluir') {
      return handleAstrologoExcluirPost(routeContext<Parameters<typeof handleAstrologoExcluirPost>[0]>());
    }
    if (method === 'POST' && pathname === '/api/astrologo/ler') {
      return handleAstrologoLerPost(routeContext<Parameters<typeof handleAstrologoLerPost>[0]>());
    }
    if (method === 'GET' && pathname === '/api/astrologo/listar') {
      return handleAstrologoListarGet(routeContext<Parameters<typeof handleAstrologoListarGet>[0]>());
    }
    if (method === 'POST' && pathname === '/api/astrologo/sync') {
      return handleAstrologoSyncPost(routeContext<Parameters<typeof handleAstrologoSyncPost>[0]>());
    }
    if (pathname === '/api/astrologo/userdata') {
      if (method === 'GET') return handleAstrologoUserdataGet(routeContext<Parameters<typeof handleAstrologoUserdataGet>[0]>());
      if (method === 'DELETE') return handleAstrologoUserdataDelete(routeContext<Parameters<typeof handleAstrologoUserdataDelete>[0]>());
    }

    // cfdns
    if (method === 'DELETE' && pathname === '/api/cfdns/delete') {
      return handleCfdnsDeleteDelete(routeContext<Parameters<typeof handleCfdnsDeleteDelete>[0]>());
    }
    if (method === 'POST' && pathname === '/api/cfdns/upsert') {
      return handleCfdnsUpsertPost(routeContext<Parameters<typeof handleCfdnsUpsertPost>[0]>());
    }

    // config
    if (pathname === '/api/config') {
      return handleConfigRequest(routeContext<Parameters<typeof handleConfigRequest>[0]>());
    }
    if (pathname === '/api/config-store') {
      if (method === 'GET') return handleConfigStoreGet(routeContext<Parameters<typeof handleConfigStoreGet>[0]>());
      if (method === 'POST') return handleConfigStorePost(routeContext<Parameters<typeof handleConfigStorePost>[0]>());
    }

    // calculadora
    if (method === 'GET' && pathname === '/api/calculadora/overview') {
      return handleCalculadoraOverviewGet(routeContext<Parameters<typeof handleCalculadoraOverviewGet>[0]>());
    }
    if (pathname === '/api/calculadora/parametros') {
      if (method === 'GET') return handleCalculadoraParametrosGet(routeContext<Parameters<typeof handleCalculadoraParametrosGet>[0]>());
      if (method === 'POST') return handleCalculadoraParametrosPost(routeContext<Parameters<typeof handleCalculadoraParametrosPost>[0]>());
    }
    if (method === 'POST' && pathname === '/api/calculadora/sync') {
      return handleCalculadoraSyncPost(routeContext<Parameters<typeof handleCalculadoraSyncPost>[0]>());
    }

    // mainsite
    if (pathname === '/api/mainsite/fees') {
      if (method === 'GET') return handleMainsiteFeesGet(routeContext<Parameters<typeof handleMainsiteFeesGet>[0]>());
      if (method === 'POST') return handleMainsiteFeesPost(routeContext<Parameters<typeof handleMainsiteFeesPost>[0]>());
    }
    if (method === 'GET' && pathname === '/api/mainsite/overview') {
      return handleMainsiteOverviewGet(routeContext<Parameters<typeof handleMainsiteOverviewGet>[0]>());
    }
    if (pathname === '/api/mainsite/posts') {
      if (method === 'GET') return handleMainsitePostsGet(routeContext<Parameters<typeof handleMainsitePostsGet>[0]>());
      if (method === 'POST') return handleMainsitePostsPost(routeContext<Parameters<typeof handleMainsitePostsPost>[0]>());
      if (method === 'PUT') return handleMainsitePostsPut(routeContext<Parameters<typeof handleMainsitePostsPut>[0]>());
      if (method === 'DELETE') return handleMainsitePostsDelete(routeContext<Parameters<typeof handleMainsitePostsDelete>[0]>());
    }
    if (method === 'POST' && pathname === '/api/mainsite/posts-pin') {
      return handleMainsitePostsPinPost(routeContext<Parameters<typeof handleMainsitePostsPinPost>[0]>());
    }
    if (method === 'POST' && pathname === '/api/mainsite/posts-reorder') {
      return handleMainsitePostsReorderPost(routeContext<Parameters<typeof handleMainsitePostsReorderPost>[0]>());
    }
    if (pathname === '/api/mainsite/settings') {
      if (method === 'GET') return handleMainsiteSettingsGet(routeContext<Parameters<typeof handleMainsiteSettingsGet>[0]>());
      if (method === 'PUT') return handleMainsiteSettingsPut(routeContext<Parameters<typeof handleMainsiteSettingsPut>[0]>());
    }
    if (method === 'POST' && pathname === '/api/mainsite/sync') {
      return handleMainsiteSyncPost(routeContext<Parameters<typeof handleMainsiteSyncPost>[0]>());
    }
    if (method === 'POST' && pathname === '/api/mainsite/migrate-media-urls') {
      return handleMainsiteMigrateMediaPost(routeContext<Parameters<typeof handleMainsiteMigrateMediaPost>[0]>());
    }
    if (method === 'POST' && pathname === '/api/mainsite/upload') {
      return handleMainsiteUploadPost(routeContext<Parameters<typeof handleMainsiteUploadPost>[0]>());
    }
    if (method === 'GET' && pathname.startsWith('/api/mainsite/media/')) {
      const filename = pathname.replace('/api/mainsite/media/', '');
      const mediaCtx = { request, env: runtimeEnv, params: { filename } };
      return handleMainsiteMediaGet(mediaCtx as Parameters<typeof handleMainsiteMediaGet>[0]);
    }

    // mainsite workers-ai
    if (method === 'POST' && pathname === '/api/mainsite/workers-ai/sentiment') {
      return handleWorkersAiSentimentPost(routeContext<Parameters<typeof handleWorkersAiSentimentPost>[0]>());
    }
    if (method === 'POST' && pathname === '/api/mainsite/workers-ai/tags') {
      return handleWorkersAiTagsPost(routeContext<Parameters<typeof handleWorkersAiTagsPost>[0]>());
    }
    if (method === 'POST' && pathname === '/api/mainsite/workers-ai/translate') {
      return handleWorkersAiTranslatePost(routeContext<Parameters<typeof handleWorkersAiTranslatePost>[0]>());
    }

    // mtasts
    if (method === 'GET' && pathname === '/api/mtasts/overview') {
      return handleMtastsOverviewGet(routeContext<Parameters<typeof handleMtastsOverviewGet>[0]>());
    }
    if (method === 'POST' && pathname === '/api/mtasts/sync') {
      return handleMtastsSyncPost(routeContext<Parameters<typeof handleMtastsSyncPost>[0]>());
    }

    // news
    if (method === 'GET' && pathname === '/api/news/feed') {
      return handleNewsFeedGet(routeContext<Parameters<typeof handleNewsFeedGet>[0]>());
    }

    // oraculo
    if (method === 'POST' && pathname === '/api/oraculo/excluir') {
      return handleOraculoExcluirPost(routeContext<Parameters<typeof handleOraculoExcluirPost>[0]>());
    }
    if (method === 'GET' && pathname === '/api/oraculo/listar') {
      return handleOraculoListarGet(routeContext<Parameters<typeof handleOraculoListarGet>[0]>());
    }
    if (method === 'GET' && pathname === '/api/oraculo/taxacache') {
      return handleOraculoTaxacacheGet(routeContext<Parameters<typeof handleOraculoTaxacacheGet>[0]>());
    }
    if (pathname === '/api/oraculo/userdata') {
      if (method === 'GET') return handleOraculoUserdataGet(routeContext<Parameters<typeof handleOraculoUserdataGet>[0]>());
      if (method === 'DELETE') return handleOraculoUserdataDelete(routeContext<Parameters<typeof handleOraculoUserdataDelete>[0]>());
    }

    // overview
    if (method === 'GET' && pathname === '/api/overview/operational') {
      return handleOverviewOperationalGet(routeContext<Parameters<typeof handleOverviewOperationalGet>[0]>());
    }

    // telemetry
    if (method === 'DELETE' && pathname === '/api/telemetry/delete') {
      return handleTelemetryDeleteDelete(routeContext<Parameters<typeof handleTelemetryDeleteDelete>[0]>());
    }
    if (method === 'GET' && pathname === '/api/telemetry/telemetry') {
      return handleTelemetryGet(routeContext<Parameters<typeof handleTelemetryGet>[0]>());
    }

      logWarn('request:not-found', { method, pathname });
      return notFound();
    } catch (error) {
      const message = sanitizeErrorMessage(error);
      logError('request:unhandled-exception', { method, pathname, error: message });
      return new Response(
        JSON.stringify({ ok: false, error: 'Erro interno no admin-motor.', detail: message.slice(0, 500) }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } finally {
      logInfo('request:end', { method, pathname, latencyMs: Date.now() - startedAt });
    }
  },
};
