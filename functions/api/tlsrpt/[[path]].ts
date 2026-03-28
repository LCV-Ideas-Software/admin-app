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
    const response = await context.env.TLSRPT_MOTOR.fetch(serviceRequest);
    return response;
  } catch (error: any) {
    return new Response(JSON.stringify({ error: 'Erro no proxy interno: ' + error.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
