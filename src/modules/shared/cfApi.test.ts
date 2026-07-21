import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ApiFailure } from '../../lib/apiClient';
import { cfApiErrorMessage, cfApiFetch } from './cfApi';

const buildFailure = (overrides: Partial<ApiFailure>): ApiFailure => ({
  ok: false,
  status: 500,
  statusText: 'Internal Server Error',
  contentType: null,
  error: 'Resposta não é JSON (Content-Type: <absent>)',
  bodyPreview: '',
  ...overrides,
});

describe('cfApiErrorMessage', () => {
  it('prefers the server error and request_id from a JSON body on 403', () => {
    const failure = buildFailure({
      status: 403,
      statusText: 'Forbidden',
      contentType: 'text/plain',
      bodyPreview: JSON.stringify({
        ok: false,
        error: 'Token Cloudflare sem permissão ou inválido para esta operação',
        request_id: 'req-abc-123',
      }),
    });

    const message = cfApiErrorMessage(failure, 'Falha ao consultar capacidades Cloudflare');

    expect(message).toContain('Falha ao consultar capacidades Cloudflare');
    expect(message).toContain('Token Cloudflare sem permissão ou inválido para esta operação');
    expect(message).toContain('sessão expirada ou sem permissão (HTTP 403)');
    expect(message).toContain('req req-abc-123');
    expect(message).not.toContain('erro desconhecido');
  });

  it('surfaces the raw preview and status meaning for a non-JSON HTML body', () => {
    const failure = buildFailure({
      status: 404,
      statusText: 'Not Found',
      contentType: 'text/html',
      error: 'Resposta não é JSON (Content-Type: text/html)',
      bodyPreview: '<!DOCTYPE html><html><body>error code: 1101</body></html>',
    });

    const message = cfApiErrorMessage(failure, 'Falha ao carregar overview');

    expect(message).toContain('Falha ao carregar overview');
    expect(message).toContain('rota inexistente no motor');
    expect(message).toContain('HTTP 404');
    expect(message).toContain('error code: 1101');
  });

  it('explains status 0 as a network/timeout failure before reaching the motor', () => {
    const failure = buildFailure({
      status: 0,
      statusText: 'AbortError',
      error: 'The operation was aborted.',
    });

    const message = cfApiErrorMessage(failure, 'Falha ao sondar capacidades');

    expect(message).toContain('Falha ao sondar capacidades');
    expect(message).toContain('falha de rede ou tempo limite');
    expect(message).toContain('The operation was aborted.');
  });
});

describe('cfApiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends method, JSON body and Content-Type, without X-Admin-Actor', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true, result: 42 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await cfApiFetch<{ ok: boolean; result: number }>('/api/cfpw/ops', {
      method: 'POST',
      body: { action: 'list-worker-secrets', scriptName: 'motor' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ ok: true, result: 42 });
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/cfpw/ops');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ action: 'list-worker-secrets', scriptName: 'motor' }));
    const headers = new Headers(init.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Admin-Actor')).toBeNull();
  });

  it('defaults to GET without body and returns the failure envelope on non-JSON responses', async () => {
    const fetchMock = vi.fn(
      async () => new Response('error code: 1101', { status: 530, headers: { 'Content-Type': 'text/plain' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await cfApiFetch<{ ok: boolean }>('/api/cfpw/capabilities');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(530);
      expect(result.bodyPreview).toContain('error code: 1101');
    }

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/cfpw/capabilities');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
  });
});
