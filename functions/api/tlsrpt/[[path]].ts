interface Env {
  TLSRPT_MOTOR: Fetcher;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  
  // O request chega no admin-app em `/api/tlsrpt/...`
  // O motor espera `/` ou `/report/:id`.
  const backendPath = url.pathname.replace('/api/tlsrpt', '') || '/';
  
  // worker.localhost é um hostname fictício padrão usado internamente no hook do Service Binding
  const backendUrl = new URL(backendPath + url.search, 'http://worker.localhost');
  
  // Recriamos o request repassando headers e body originais
  const serviceRequest = new Request(backendUrl.toString(), context.request);
  
  try {
    const ctxData = (context as unknown as { data?: { env?: Env } }).data;
    const env: Env = ctxData?.env || context.env;
    const response = await env.TLSRPT_MOTOR.fetch(serviceRequest);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: 'Erro no proxy interno: ' + message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
