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
  AI?: unknown;
  GEMINI_API_KEY?: unknown;
  CF_AI_GATEWAY?: unknown;
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
  AI?: unknown;
  GEMINI_API_KEY?: string;
  CF_AI_GATEWAY?: string;
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

const SEO_READER_SCOPE = 'seo-reader';
const MODEL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

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
  AI: env.AI,
  GEMINI_API_KEY: await readSecretString(env.GEMINI_API_KEY),
  CF_AI_GATEWAY: await readSecretString(env.CF_AI_GATEWAY),
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

const parseSqliteTimestamp = (value: string | null): number => {
  if (!value) return 0;
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const ts = Date.parse(iso);
  return Number.isFinite(ts) ? ts : 0;
};

const shouldAutoSync = (lastSyncedAt: string | null): boolean => {
  const lastSyncTs = parseSqliteTimestamp(lastSyncedAt);
  if (!lastSyncTs) return true;
  return Date.now() - lastSyncTs >= MODEL_SYNC_INTERVAL_MS;
};

const ensureMainsiteIaModelsTable = async (db: D1Like): Promise<void> => {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS mainsite_ia_models (
      model_id TEXT NOT NULL,
      module_scope TEXT NOT NULL,
      display_name TEXT NOT NULL,
      api TEXT NOT NULL DEFAULT 'sdk',
      vision INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (model_id, module_scope)
    )
  `).bind().run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_mainsite_ia_models_scope_active
    ON mainsite_ia_models (module_scope, active, model_id)
  `).bind().run();
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
  const gatewayUrl =
    'https://gateway.ai.cloudflare.com/v1/d65b76a0e64c3791e932edd9163b1c71/workspace-gateway/google-ai-studio';
  const baseUrl = env.CF_AI_GATEWAY ? gatewayUrl : 'https://generativelanguage.googleapis.com';

  const requestHeaders: Record<string, string> = {};
  if (env.CF_AI_GATEWAY) {
    requestHeaders['cf-aig-authorization'] = `Bearer ${env.CF_AI_GATEWAY}`;
  }

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
      gatewayEnabled: Boolean(env.CF_AI_GATEWAY),
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

const readCachedScopeModels = async (db: D1Like, scope: string): Promise<ModelOption[]> => {
  const rows = await db.prepare(`
    SELECT model_id AS id, display_name AS displayName, api, vision
    FROM mainsite_ia_models
    WHERE module_scope = ? AND active = 1
    ORDER BY model_id ASC
  `).bind(scope).all<{ id: string; displayName: string; api: string; vision: number }>();

  return (rows.results || []).map((row) => ({
    id: row.id,
    displayName: row.displayName,
    api: row.api,
    vision: Boolean(row.vision),
  }));
};

const readScopeLastSync = async (db: D1Like, scope: string): Promise<string | null> => {
  const row = await db.prepare(`
    SELECT MAX(synced_at) AS lastSyncedAt
    FROM mainsite_ia_models
    WHERE module_scope = ?
  `).bind(scope).first<{ lastSyncedAt: string | null }>();

  return row?.lastSyncedAt ?? null;
};

const syncScopeModels = async (
  request: Request,
  env: ResolvedAdminMotorEnv,
  scope: string,
): Promise<{ models: ModelOption[]; syncedAt: string }> => {
  const db = env.BIGDATA_DB;
  if (!db) {
    throw new Error('BIGDATA_DB não configurado no runtime.');
  }

  await ensureMainsiteIaModelsTable(db);
  const models = await fetchMainsiteGeminiModels(request, env);

  await db.prepare('DELETE FROM mainsite_ia_models WHERE module_scope = ?').bind(scope).run();

  for (const model of models) {
    await db.prepare(`
      INSERT INTO mainsite_ia_models (
        model_id,
        module_scope,
        display_name,
        api,
        vision,
        active,
        synced_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
      .bind(
        model.id,
        scope,
        model.displayName,
        model.api,
        model.vision ? 1 : 0,
      )
      .run();
  }

  const syncedAt = new Date().toISOString();
  return { models, syncedAt };
};

const handleMainsiteModelos = async (request: Request, env: ResolvedAdminMotorEnv): Promise<Response> => {
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope');

  if (scope === SEO_READER_SCOPE) {
    const db = env.BIGDATA_DB;
    if (!db) {
      return json({ ok: false, error: 'BIGDATA_DB não configurado no runtime.' }, 503);
    }

    try {
      await ensureMainsiteIaModelsTable(db);
      let cachedModels = await readCachedScopeModels(db, scope);
      let lastSyncedAt = await readScopeLastSync(db, scope);

      if (cachedModels.length === 0 || shouldAutoSync(lastSyncedAt)) {
        const synced = await syncScopeModels(request, env, scope);
        cachedModels = synced.models;
        lastSyncedAt = synced.syncedAt;
      }

      return json({
        ok: true,
        scope,
        source: 'd1-cache',
        syncedAt: lastSyncedAt,
        models: cachedModels,
        total: cachedModels.length,
      });
    } catch (err) {
      console.error('[mainsite/modelos] cache:read-or-sync:error', {
        scope,
        error: err instanceof Error ? err.message : String(err),
      });
      return json({ ok: false, error: err instanceof Error ? err.message : 'Erro ao listar modelos cacheados.' }, 500);
    }
  }

  try {
    const models = await fetchMainsiteGeminiModels(request, env);

    console.info('[ai-status/models] request:ok', {
      total: models.length,
      gatewayEnabled: Boolean(env.CF_AI_GATEWAY),
    });
    return json({ ok: true, models, total: models.length });
  } catch (err) {
    console.error('[ai-status/models] request:error', {
      gatewayEnabled: Boolean(env.CF_AI_GATEWAY),
      error: err instanceof Error ? err.message : String(err),
    });
    return json({ ok: false, error: err instanceof Error ? err.message : 'Erro ao listar modelos.' }, 500);
  }
};

const handleMainsiteModelosSync = async (request: Request, env: ResolvedAdminMotorEnv): Promise<Response> => {
  if (!env.BIGDATA_DB) {
    return json({ ok: false, error: 'BIGDATA_DB não configurado no runtime.' }, 503);
  }

  let scope = SEO_READER_SCOPE;
  try {
    const body = (await request.json().catch(() => ({}))) as { scope?: string };
    if (body.scope) {
      scope = body.scope;
    }
  } catch {
    scope = SEO_READER_SCOPE;
  }

  if (scope !== SEO_READER_SCOPE) {
    return json({ ok: false, error: 'Escopo de sync inválido para esta rota.' }, 400);
  }

  try {
    const synced = await syncScopeModels(request, env, scope);
    return json({
      ok: true,
      scope,
      syncedAt: synced.syncedAt,
      total: synced.models.length,
      models: synced.models,
    });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'Falha no sync manual de modelos.' }, 500);
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
  async fetch(request: Request, env: AdminMotorEnv): Promise<Response> {
    const startedAt = Date.now();
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    logDebug('request:start', { method, pathname });

    try {
      const runtimeEnv = await resolveRuntimeEnv(env);
      const routeContext = <T>() => ({ request, env: runtimeEnv } as unknown as T);
      if (method === 'GET' && pathname === '/api/ai-status/health') {
        return handleAiStatusHealth(request, runtimeEnv, env);
      }

    if (method === 'GET' && pathname === '/api/ai-status/models') {
      return handleAiStatusModelsGet({ request, env: runtimeEnv });
    }

    if (method === 'GET' && pathname === '/api/ai-status/gcp-monitoring') {
      return handleAiStatusGcpMonitoringGet(routeContext<Parameters<typeof handleAiStatusGcpMonitoringGet>[0]>());
    }

    if (method === 'GET' && pathname === '/api/mainsite/modelos') {
      return handleMainsiteModelos(request, runtimeEnv);
    }

    if (method === 'POST' && pathname === '/api/mainsite/modelos/sync') {
      return handleMainsiteModelosSync(request, runtimeEnv);
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
