import {
  handleCleanupDeploymentsGet,
  handleCleanupDeploymentsPost,
} from './handlers/cfpwCleanup';
import { handleFinanceiroInsightsGet } from './handlers/financeiroInsights';
import { handleAiStatusModelsGet } from './handlers/aiStatusModels';
import { handleOraculoModelosGet } from './handlers/oraculoModelos';
import { handleOraculoCronGet, handleOraculoCronPut } from './handlers/oraculoCron';
import { handleAstrologoEnviarEmailPost } from './handlers/astrologoEmail';
import {
  handleSumupRefundPost,
  handleSumupCancelPost,
  handleMpRefundPost,
  handleMpCancelPost,
} from './handlers/financeiroActions';
import { toHeaders } from '../../functions/api/_lib/mainsite-admin';

type AdminMotorEnv = {
  BIGDATA_DB?: D1Like;
  GEMINI_API_KEY?: string;
  CF_AI_GATEWAY?: string;
  CLOUDFLARE_PW?: string;
  CF_ACCOUNT_ID?: string;
  SUMUP_API_KEY_PRIVATE?: string;
  SUMUP_MERCHANT_CODE?: string;
  MP_ACCESS_TOKEN?: string;
};

type D1Like = {
  prepare(query: string): { bind(...values: unknown[]): { first<T>(): Promise<T | null> } };
};

const DEFAULT_MODEL = '';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: toHeaders(),
  });

const resolveModel = async (db: D1Like | undefined): Promise<string> => {
  if (!db) return DEFAULT_MODEL;
  try {
    const row = await db
      .prepare('SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1')
      .bind('mainsite/ai_models')
      .first<{ payload?: string }>();

    if (row?.payload) {
      const parsed = JSON.parse(row.payload) as Record<string, unknown>;
      if (typeof parsed.chat === 'string' && parsed.chat) {
        return parsed.chat;
      }
    }
  } catch {
    // noop
  }
  return DEFAULT_MODEL;
};

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

const handleAiStatusHealth = async (request: Request, env: AdminMotorEnv): Promise<Response> => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ ok: false, error: 'GEMINI_API_KEY não configurada.', keyConfigured: false }, 503);
  }

  const activeModel = await resolveModel(env.BIGDATA_DB as D1Like | undefined);
  const gatewayUrl =
    'https://gateway.ai.cloudflare.com/v1/d65b76a0e64c3791e932edd9163b1c71/workspace-gateway/google-ai-studio';
  const baseUrl = env.CF_AI_GATEWAY ? gatewayUrl : 'https://generativelanguage.googleapis.com';

  const requestHeaders = toHeaders() as Record<string, string>;
  if (env.CF_AI_GATEWAY) {
    requestHeaders['cf-aig-authorization'] = `Bearer ${env.CF_AI_GATEWAY}`;
  }

  try {
    const start = Date.now();
    const res = await fetch(`${baseUrl}/v1beta/models/${activeModel}?key=${apiKey}`, {
      method: 'GET',
      headers: requestHeaders,
      signal: request.signal,
    });
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return json({
        ok: true,
        keyConfigured: true,
        apiReachable: true,
        model: activeModel,
        latencyMs,
        httpStatus: 200,
        checkedAt: new Date().toISOString(),
      });
    }

    return json({
      ok: false,
      keyConfigured: true,
      apiReachable: true,
      model: activeModel,
      latencyMs,
      httpStatus: res.status,
      errorDetail: `Modelo ${activeModel} não encontrado pela API`,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const errorBody = err instanceof Error ? err.message : String(err);
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

const handleMainsiteModelos = async (request: Request, env: AdminMotorEnv): Promise<Response> => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ ok: false, error: 'GEMINI_API_KEY não configurada.' }, 500);
  }

  try {
    const allModels = new Map<string, { id: string; displayName: string; api: string; vision: boolean }>();
    const gatewayUrl =
      'https://gateway.ai.cloudflare.com/v1/d65b76a0e64c3791e932edd9163b1c71/workspace-gateway/google-ai-studio';
    const baseUrl = env.CF_AI_GATEWAY ? gatewayUrl : 'https://generativelanguage.googleapis.com';

    const requestHeaders: Record<string, string> = {};
    if (env.CF_AI_GATEWAY) {
      requestHeaders['cf-aig-authorization'] = `Bearer ${env.CF_AI_GATEWAY}`;
    }

    const res = await fetch(`${baseUrl}/v1beta/models?key=${apiKey}`, {
      method: 'GET',
      headers: requestHeaders,
      signal: request.signal,
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);

    interface ModelOutput {
      name: string;
      displayName: string;
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

    const models = [...allModels.values()].sort((a, b) => {
      const aPreview = a.id.includes('preview') || a.id.includes('exp') ? 1 : 0;
      const bPreview = b.id.includes('preview') || b.id.includes('exp') ? 1 : 0;
      if (aPreview !== bPreview) return aPreview - bPreview;
      const aPro = a.id.includes('pro') ? 0 : 1;
      const bPro = b.id.includes('pro') ? 0 : 1;
      return aPro - bPro || a.id.localeCompare(b.id);
    });

    return json({ ok: true, models, total: models.length });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'Erro ao listar modelos.' }, 500);
  }
};

const notFound = () =>
  new Response(JSON.stringify({ ok: false, error: 'Rota não encontrada no admin-motor.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

export default {
  async fetch(request: Request, env: AdminMotorEnv): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();
    if (method === 'GET' && pathname === '/api/ai-status/health') {
      return handleAiStatusHealth(request, env);
    }

    if (method === 'GET' && pathname === '/api/ai-status/models') {
      return handleAiStatusModelsGet({ request, env });
    }

    if (method === 'GET' && pathname === '/api/mainsite/modelos') {
      return handleMainsiteModelos(request, env);
    }

    if (method === 'GET' && pathname === '/api/oraculo/modelos') {
      return handleOraculoModelosGet({ request, env });
    }

    if (pathname === '/api/oraculo/cron') {
      if (method === 'GET') return handleOraculoCronGet({ request, env });
      if (method === 'PUT') return handleOraculoCronPut({ request, env });
    }

    if (method === 'POST' && pathname === '/api/astrologo/enviar-email') {
      return handleAstrologoEnviarEmailPost({ request, env });
    }

    if (pathname === '/api/cfpw/cleanup-deployments') {
      if (method === 'GET') return handleCleanupDeploymentsGet({ request, env });
      if (method === 'POST') return handleCleanupDeploymentsPost({ request, env });
    }

    if (method === 'GET' && pathname === '/api/financeiro/insights') {
      return handleFinanceiroInsightsGet({ request, env });
    }

    if (method === 'POST' && pathname === '/api/financeiro/sumup-refund') {
      return handleSumupRefundPost({ request, env });
    }

    if (method === 'POST' && pathname === '/api/financeiro/sumup-cancel') {
      return handleSumupCancelPost({ request, env });
    }

    if (method === 'POST' && pathname === '/api/financeiro/mp-refund') {
      return handleMpRefundPost({ request, env });
    }

    if (method === 'POST' && pathname === '/api/financeiro/mp-cancel') {
      return handleMpCancelPost({ request, env });
    }

    return notFound();
  },
};
