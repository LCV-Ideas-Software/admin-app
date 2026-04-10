
const SECRET_ALIASES = {
  CLOUDFLARE_PW: ['cloudflare-pw'],
  GEMINI_API_KEY: ['gemini-api-key'],
  CF_AI_GATEWAY: ['cf-ai-gateway'],
  RESEND_API_KEY: ['resend-api-key'],
  RESEND_APPKEY: ['resend-appkey', 'resend-app-key'],
  SUMUP_API_KEY_PRIVATE: ['sumup-api-key-private', 'sumup_api_key_private'],
  SUMUP_MERCHANT_CODE: ['sumup-merchant-code', 'sumup-merchant', 'merchant-code', 'MERCHANT_CODE'],
  MP_ACCESS_TOKEN: ['mp-access-token'],
  MERCADO_PAGO_WEBHOOK_SECRET: ['mercado-pago-webhook-secret'],
  PIX_KEY: ['pix-key'],
  PIX_NAME: ['pix-name'],
  PIX_CITY: ['pix-city'],
  GCP_SA_KEY: ['gcp-sa-key'],
  JINA_API_KEY: ['jina-api-key'],
  CLOUDFLARE_DNS: ['cloudflare-dns'],
  CLOUDFLARE_CACHE: ['cloudflare-cache', 'cloudflare-cache-token'],
  CF_ACCOUNT_ID: ['cf-account-id'],
  MAINSITE_WORKER_API_SECRET: ['mainsite-worker-api-secret'],
  MAINSITE_WORKER_API_BASE_URL: ['mainsite-worker-api-base-url'],
  MTASTS_ADMIN_API_BASE_URL: ['mtasts-admin-api-base-url'],
  APPHUB_BEARER_TOKEN: ['apphub-bearer-token'],
  ADMINHUB_BEARER_TOKEN: ['adminhub-bearer-token'],
} as const;

const CRITICAL_KEYS = [
  'CLOUDFLARE_PW',
  'GEMINI_API_KEY',
  'CF_AI_GATEWAY',
  'SUMUP_API_KEY_PRIVATE',
  'SUMUP_MERCHANT_CODE',
  'MP_ACCESS_TOKEN',
] as const;

const toOptionalString = async (raw: unknown): Promise<string | undefined> => {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed ? trimmed : undefined;
  }

  if (raw && typeof raw === 'object') {
    const maybeGetter = raw as { get?: unknown; value?: unknown };
    if (typeof maybeGetter.get === 'function') {
      try {
        const value = await (maybeGetter.get as () => Promise<unknown>)();
        return typeof value === 'string' && value.trim() ? value.trim() : undefined;
      } catch {
        return undefined;
      }
    }

    if (typeof maybeGetter.value === 'string' && maybeGetter.value.trim()) {
      return maybeGetter.value.trim();
    }
  }

  return undefined;
};

const resolveFromAliases = async (
  envSource: Record<string, unknown>,
  key: keyof typeof SECRET_ALIASES,
): Promise<string | undefined> => {
  const primaryValue = await toOptionalString(envSource[key]);
  if (primaryValue) {
    return primaryValue;
  }

  for (const alias of SECRET_ALIASES[key]) {
    const aliasedValue = await toOptionalString(envSource[alias]);
    if (aliasedValue) {
      return aliasedValue;
    }
  }

  return undefined;
};

export async function onRequest(context: { request: Request; env: Record<string, unknown>; next: () => Promise<Response> }) {
  const url = new URL(context.request.url);

  // Bloqueio de exposição pública via URL interna .pages.dev
  if (url.hostname.endsWith('.pages.dev')) {
    url.hostname = 'admin.lcv.app.br';
    return Response.redirect(url.toString(), 301);
  }

  // ========== SECRET/ENV RESOLVER MIDDLEWARE ==========
  // Normaliza aliases e bindings para variáveis canônicas em UPPER_SNAKE_CASE.
  const envClone = { ...context.env };

  for (const key of Object.keys(SECRET_ALIASES) as Array<keyof typeof SECRET_ALIASES>) {
    const resolved = await resolveFromAliases(envClone, key);
    if (resolved) {
      envClone[key] = resolved;
    }
  }

  const missingCritical = CRITICAL_KEYS.filter((key) => {
    const value = envClone[key];
    return typeof value !== 'string' || !value.trim();
  });

  if (missingCritical.length > 0) {
    console.warn(`[Env Resolver] Secrets críticos ausentes no runtime: ${missingCritical.join(', ')}`);
  }

  // Se TODOS os secrets críticos estão ausentes, o ambiente está totalmente mal configurado.
  // Bloqueia requisições de API para evitar erros confusos no cliente.
  if (missingCritical.length >= CRITICAL_KEYS.length) {
    const url = new URL(context.request.url);
    if (url.pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Serviço temporariamente indisponível.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  // Inject clone directly to context.data, which is propagated correctly across handlers.
  const mutableContext = context as unknown as Record<string, unknown>;
  const mutableData = (mutableContext.data || {}) as Record<string, unknown>;
  mutableData.env = envClone;
  mutableContext.data = mutableData;

  return context.next();
}
