import PostalMime from 'postal-mime';

/**
 * Módulo: tlsrpt-motor
 * Versão: v3.1.0
 * Função: Processamento de relatórios TLS-RPT via SMTP e API de consulta D1.
 *
 * Melhorias v3:
 *  - Validação de campos obrigatórios do TLS-RPT
 *  - Logs estruturados (JSON) para observability
 *  - Roteamento básico (GET /, GET /report/:id, 404)
 *  - CORS configurável via variável de ambiente ALLOWED_ORIGIN
 *  - Correção de null-safety no filename do anexo
 */

/**
 * Valida os campos obrigatórios de um relatório TLS-RPT (RFC 8460).
 * @param {object} data - Objeto JSON parseado do relatório
 * @throws {Error} Se campos obrigatórios estiverem ausentes
 */
function validateTlsRptData(data) {
	const required = ['report-id', 'organization-name', 'date-range', 'policies'];
	const missing = required.filter((key) => !(key in data));
	if (missing.length > 0) {
		throw new Error(`Campos obrigatórios ausentes: ${missing.join(', ')}`);
	}
	if (!data['date-range']['start-datetime'] || !data['date-range']['end-datetime']) {
		throw new Error('Campos start-datetime e end-datetime são obrigatórios em date-range.');
	}
	if (!Array.isArray(data.policies) || data.policies.length === 0) {
		throw new Error('O campo policies deve ser um array não-vazio.');
	}
}

/**
 * Retorna os headers CORS com base na variável de ambiente ALLOWED_ORIGIN.
 * Se não configurada, rejeita origens cross-origin (sem header).
 * @param {object} env - Cloudflare environment bindings
 * @returns {object} Headers CORS
 */
function getCorsHeaders(env) {
	const headers = {
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	};
	if (env.ALLOWED_ORIGIN) {
		headers['Access-Control-Allow-Origin'] = env.ALLOWED_ORIGIN;
	}
	return headers;
}

/**
 * Emite um log estruturado em JSON para facilitar análise no Cloudflare Dashboard.
 * @param {'info'|'warn'|'error'} level
 * @param {string} action
 * @param {object} details
 */
function structuredLog(level, action, details = {}) {
	const entry = { timestamp: new Date().toISOString(), level, action, ...details };
	if (level === 'error') {
		console.error(JSON.stringify(entry));
	} else if (level === 'warn') {
		console.warn(JSON.stringify(entry));
	} else {
		console.log(JSON.stringify(entry));
	}
}

export default {
	// ─── PROCESSADOR DE E-MAILS (SMTP Ingest) ───
	async email(message, env, _ctx) {
		if (!env.BIGDATA_DB) {
			structuredLog('error', 'email.binding_missing', { binding: 'BIGDATA_DB' });
			return;
		}

		try {
			structuredLog('info', 'email.received', {
				from: message.from,
				to: message.to,
				subject: message.headers?.get('subject') || '(sem assunto)',
			});

			const parser = new PostalMime();
			const emailParsed = await parser.parse(message.raw);

			const attachment = emailParsed.attachments.find(
				(a) => a.mimeType === 'application/gzip' || a.filename?.endsWith('.gz')
			);

			if (!attachment) {
				structuredLog('warn', 'email.no_attachment', { from: message.from });
				return;
			}

			const ds = new DecompressionStream('gzip');
			const blob = new Blob([attachment.content]);
			const decompressedStream = blob.stream().pipeThrough(ds);
			const decompressedResponse = new Response(decompressedStream);

			const jsonText = await decompressedResponse.text();
			const reportData = JSON.parse(jsonText);

			// Validação de campos obrigatórios
			validateTlsRptData(reportData);

			const reportId = reportData['report-id'];
			const orgName = reportData['organization-name'];
			const contactInfo = reportData['contact-info'] || null;
			const startDate = reportData['date-range']['start-datetime'];
			const endDate = reportData['date-range']['end-datetime'];
			const rawJson = JSON.stringify(reportData);

			await env.BIGDATA_DB.prepare(
				'INSERT OR IGNORE INTO tlsrpt_relatorios_tls (report_id, org_name, start_date, end_date, raw_json) VALUES (?, ?, ?, ?, ?)'
			)
				.bind(reportId, orgName, startDate, endDate, rawJson)
				.run();

			structuredLog('info', 'email.report_stored', { reportId, orgName, contactInfo });
		} catch (error) {
			structuredLog('error', 'email.processing_failed', {
				error: error.message,
				from: message.from,
			});
		}
	},

	// ─── API DE CONSULTA (HTTP Fetch) ───
	async fetch(request, env, _ctx) {
		const corsHeaders = getCorsHeaders(env);

		// Preflight CORS
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// Apenas GET é permitido
		if (request.method !== 'GET') {
			return new Response(JSON.stringify({ error: 'Método não permitido.' }), {
				status: 405,
				headers: { 'Content-Type': 'application/json', ...corsHeaders },
			});
		}

		try {
			if (!env.BIGDATA_DB) throw new Error('Recurso D1 indisponível.');

			const url = new URL(request.url);
			const path = url.pathname.replace(/\/+$/, '') || '/';

			// ── GET / → Lista de relatórios ──
			if (path === '/') {
				const { results } = await env.BIGDATA_DB.prepare(
					'SELECT id, report_id, org_name, start_date, end_date, created_at FROM tlsrpt_relatorios_tls ORDER BY start_date DESC LIMIT 50'
				).all();

				return new Response(JSON.stringify(results), {
					headers: { 'Content-Type': 'application/json', ...corsHeaders },
				});
			}

			// ── GET /report/:id → Relatório individual (por report_id) ──
			const reportMatch = path.match(/^\/report\/(.+)$/);
			if (reportMatch) {
				const reportId = decodeURIComponent(reportMatch[1]);
				const result = await env.BIGDATA_DB.prepare(
					'SELECT * FROM tlsrpt_relatorios_tls WHERE report_id = ?'
				)
					.bind(reportId)
					.first();

				if (!result) {
					return new Response(JSON.stringify({ error: 'Relatório não encontrado.' }), {
						status: 404,
						headers: { 'Content-Type': 'application/json', ...corsHeaders },
					});
				}

				return new Response(JSON.stringify(result), {
					headers: { 'Content-Type': 'application/json', ...corsHeaders },
				});
			}

			// ── 404 para rotas desconhecidas ──
			return new Response(JSON.stringify({ error: 'Rota não encontrada.' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json', ...corsHeaders },
			});
		} catch (error) {
			structuredLog('error', 'fetch.error', { error: error.message, url: request.url });
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json', ...corsHeaders },
			});
		}
	},
};