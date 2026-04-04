type ServiceFetcher = {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
};

type ProxyContext = {
  request: Request;
  env: Record<string, unknown> & { ADMIN_MOTOR?: ServiceFetcher };
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const proxyToAdminMotor = async (context: ProxyContext): Promise<Response> => {
  const service = context.env?.ADMIN_MOTOR;

  if (!service || typeof service.fetch !== 'function') {
    return json(503, {
      ok: false,
      error: 'ADMIN_MOTOR binding não configurado no runtime.',
    });
  }

  const originalUrl = new URL(context.request.url);
  const targetUrl = new URL(originalUrl.pathname + originalUrl.search, 'https://admin-motor.internal');
  const requestToService = new Request(targetUrl.toString(), context.request);

  try {
    const response = await service.fetch(requestToService);
    if (response.status >= 500) {
      console.error('[admin-motor-proxy] upstream:5xx', {
        path: originalUrl.pathname,
        status: response.status,
      });
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao encaminhar requisição para o admin-motor.';
    console.error('[admin-motor-proxy] request:error', {
      path: originalUrl.pathname,
      error: message,
    });
    return json(502, {
      ok: false,
      error: message,
      path: originalUrl.pathname,
    });
  }
};
