import { vi } from 'vitest';

type CloudflareFetchRoute = {
  method?: string;
  url: string | RegExp;
  reply: {
    status?: number;
    json?: unknown;
    body?: BodyInit;
    headers?: Record<string, string>;
  };
};

/**
 * Instala um stub global de `fetch` (via `vi.stubGlobal`) que responde apenas
 * às rotas mapeadas; requisição sem rota correspondente lança erro com a URL
 * (falha barulhenta). Devolve as chamadas capturadas para asserts.
 *
 * O chamador é responsável por `vi.unstubAllGlobals()` no `afterEach`.
 */
export function stubCloudflareFetch(routes: CloudflareFetchRoute[]): {
  calls: Array<{ url: string; init?: RequestInit }>;
} {
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input);
    const method = String(init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    calls.push({ url, ...(init !== undefined ? { init } : {}) });

    const route = routes.find(
      (candidate) =>
        (!candidate.method || candidate.method.toUpperCase() === method) &&
        (typeof candidate.url === 'string' ? candidate.url === url : candidate.url.test(url)),
    );

    if (!route) {
      throw new Error(`stubCloudflareFetch: requisição sem rota mapeada — ${method} ${url}`);
    }

    const { status = 200, json, body, headers } = route.reply;
    const responseBody = json !== undefined ? JSON.stringify(json) : (body ?? null);

    return new Response(responseBody, {
      status,
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(headers ?? {}),
      },
    });
  });

  return { calls };
}

/** Envelope de sucesso da API Cloudflare (client/v4). */
export function cfEnvelope(result: unknown, extra?: object) {
  return { success: true, errors: [], messages: [], result, ...extra };
}

/**
 * Envelope de erro da API Cloudflare já no formato de `reply` do
 * `stubCloudflareFetch` (`{ status, json }`).
 */
export function cfErrorEnvelope(code: number, message: string, status = 400) {
  return {
    status,
    json: { success: false, errors: [{ code, message }], messages: [], result: null },
  };
}
