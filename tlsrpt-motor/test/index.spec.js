import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('tlsrpt-motor fetch handler', () => {
	it('GET / retorna JSON com status 200 e headers CORS', async () => {
		const request = new Request('http://example.com/');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/json');
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();

		const body = await response.json();
		expect(Array.isArray(body)).toBe(true);
	});

	it('GET /rota-inexistente retorna 404', async () => {
		const request = new Request('http://example.com/rota-inexistente');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body.error).toBe('Rota não encontrada.');
	});

	it('POST / retorna 405 Method Not Allowed', async () => {
		const request = new Request('http://example.com/', { method: 'POST' });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(405);
		const body = await response.json();
		expect(body.error).toBe('Método não permitido.');
	});

	it('OPTIONS retorna preflight CORS sem corpo', async () => {
		const request = new Request('http://example.com/', { method: 'OPTIONS' });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
	});

	it('GET /report/inexistente retorna 404', async () => {
		const request = new Request('http://example.com/report/id-que-nao-existe');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body.error).toBe('Relatório não encontrado.');
	});
});
