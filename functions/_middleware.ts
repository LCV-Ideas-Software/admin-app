

export async function onRequest(context: { request: Request; env: Record<string, unknown>; next: () => Promise<Response> }) {
  const url = new URL(context.request.url);

  // Bloqueio de exposição pública via URL interna .pages.dev
  if (url.hostname.endsWith('.pages.dev')) {
    url.hostname = 'admin.lcv.app.br';
    return Response.redirect(url.toString(), 301);
  }

  // ========== ENVIRONMENT KEYS FALLBACK ==========
  if (context.env) {
    const mappings: Record<string, string> = {
      'GEMINI_API_KEY': 'gemini-api-key',
      'PIX_KEY': 'pix-key',
      'PIX_NAME': 'pix-name',
      'PIX_CITY': 'pix-city',
      'CF_AI_GATEWAY': 'cf-ai-gateway',
      'CLOUDFLARE_PW': 'cloudflare-pw',
      'MP_ACCESS_TOKEN': 'mp-access-token',
      'MERCADO_PAGO_WEBHOOK_SECRET': 'mercado-pago-webhook-secret',
      'RESEND_API_KEY': 'resend-api-key',
      'RESEND_APPKEY': 'resend-appkey',
      'SUMUP_API_KEY_PRIVATE': 'sumup-api-key-private',
      'SUMUP_MERCHANT_CODE': 'sumup-merchant-code',
      'GCP_SA_KEY': 'gcp-sa-key'
    };

    const proxiedEnv = new Proxy(context.env, {
      get(target, prop, receiver) {
        if (typeof prop === 'string') {
          // 1. Tenta a chave exata solicitada (ex: GEMINI_API_KEY)
          let value = Reflect.get(target, prop, receiver);
          if (value !== undefined) return value;
          
          // 2. Tenta o mapeamento dash-case (ex: gemini-api-key)
          if (mappings[prop]) {
            value = Reflect.get(target, mappings[prop], receiver);
            if (value !== undefined) return value;
          }
        }
        return Reflect.get(target, prop, receiver);
      }
    });

    try {
      context.env = proxiedEnv;
    } catch {
      Object.defineProperty(context, 'env', {
        value: proxiedEnv,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  }

  return context.next();
};
