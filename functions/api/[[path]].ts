// Catch-all: roteia TODAS as requisições /api/* para o admin-motor via Service Binding nativo.
// Rotas mais específicas (health.ts, tlsrpt/[[path]].ts) têm prioridade no Cloudflare Pages.

type ServiceFetcher = {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
};

type CatchAllContext = {
  request: Request;
  env: Record<string, unknown> & { ADMIN_MOTOR?: ServiceFetcher };
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export async function onRequest(context: CatchAllContext): Promise<Response> {
  const service = context.env?.ADMIN_MOTOR;

  if (!service || typeof service.fetch !== 'function') {
    return json(503, {
      ok: false,
      error: 'ADMIN_MOTOR binding não disponível.',
    });
  }

  const originalUrl = new URL(context.request.url);
  const targetUrl = new URL(
    originalUrl.pathname + originalUrl.search,
    'https://admin-motor.internal',
  );

  try {
    const response = await service.fetch(
      new Request(targetUrl.toString(), context.request),
    );

    if (response.status >= 500) {
      console.error('[catch-all] upstream:5xx', {
        path: originalUrl.pathname,
        status: response.status,
      });
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Falha ao encaminhar requisição para o admin-motor.';
    console.error('[catch-all] request:error', {
      path: originalUrl.pathname,
      error: message,
    });
    return json(502, {
      ok: false,
      error: 'Erro ao encaminhar requisição.',
    });
  }
}
