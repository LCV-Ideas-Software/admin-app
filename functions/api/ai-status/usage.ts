// Módulo: admin-app/functions/api/ai-status/usage.ts
// Descrição: Lê logs de uso de AI do BIGDATA_DB para dashboard self-managed.
// Também cria a tabela se não existir (auto-migration).

import type { D1Database } from '../_lib/operational'

interface Env { BIGDATA_DB: D1Database }
interface Ctx { env: Env; request: Request }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Auto-create da tabela de usage logs
async function ensureTable(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      module TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ok',
      error_detail TEXT
    )
  `).run()
}

interface UsageRow {
  total_requests: number
  total_input_tokens: number
  total_output_tokens: number
  total_errors: number
  avg_latency_ms: number
}

interface DailyRow {
  day: string
  requests: number
  input_tokens: number
  output_tokens: number
  errors: number
}

interface ModuleRow {
  module: string
  requests: number
  input_tokens: number
  output_tokens: number
}

interface ModelRow {
  model: string
  requests: number
  input_tokens: number
  output_tokens: number
}

export const onRequestGet = async ({ env }: Ctx) => {
  const db = env?.BIGDATA_DB
  if (!db) return json({ ok: false, error: 'BIGDATA_DB não configurado.' }, 503)

  try {
    await ensureTable(db)

    // Período: últimos 30 dias
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Query paralela para performance
    const [summaryRes, dailyRes, byModuleRes, byModelRes] = await Promise.all([
      // Resumo total
      db.prepare(`
        SELECT 
          COUNT(*) as total_requests,
          COALESCE(SUM(input_tokens), 0) as total_input_tokens,
          COALESCE(SUM(output_tokens), 0) as total_output_tokens,
          COALESCE(SUM(CASE WHEN status != 'ok' THEN 1 ELSE 0 END), 0) as total_errors,
          COALESCE(AVG(latency_ms), 0) as avg_latency_ms
        FROM ai_usage_logs WHERE timestamp >= ?
      `).bind(since).first<UsageRow>(),

      // Uso diário
      db.prepare(`
        SELECT 
          DATE(timestamp) as day,
          COUNT(*) as requests,
          COALESCE(SUM(input_tokens), 0) as input_tokens,
          COALESCE(SUM(output_tokens), 0) as output_tokens,
          COALESCE(SUM(CASE WHEN status != 'ok' THEN 1 ELSE 0 END), 0) as errors
        FROM ai_usage_logs WHERE timestamp >= ?
        GROUP BY DATE(timestamp) ORDER BY day ASC
      `).bind(since).all<DailyRow>(),

      // Breakdown por módulo
      db.prepare(`
        SELECT 
          module,
          COUNT(*) as requests,
          COALESCE(SUM(input_tokens), 0) as input_tokens,
          COALESCE(SUM(output_tokens), 0) as output_tokens
        FROM ai_usage_logs WHERE timestamp >= ?
        GROUP BY module ORDER BY requests DESC
      `).bind(since).all<ModuleRow>(),

      // Breakdown por modelo
      db.prepare(`
        SELECT 
          model,
          COUNT(*) as requests,
          COALESCE(SUM(input_tokens), 0) as input_tokens,
          COALESCE(SUM(output_tokens), 0) as output_tokens
        FROM ai_usage_logs WHERE timestamp >= ?
        GROUP BY model ORDER BY requests DESC
      `).bind(since).all<ModelRow>(),
    ])

    return json({
      ok: true,
      period: { since, until: new Date().toISOString() },
      summary: summaryRes || {
        total_requests: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_errors: 0,
        avg_latency_ms: 0,
      },
      daily: dailyRes?.results || [],
      byModule: byModuleRes?.results || [],
      byModel: byModelRes?.results || [],
    })
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'Erro ao ler usage logs.' }, 500)
  }
}

// POST: Registrar um novo log de uso (chamado internamente pelos endpoints de AI)
export const onRequestPost = async ({ env, request }: Ctx) => {
  const db = env?.BIGDATA_DB
  if (!db) return json({ ok: false, error: 'BIGDATA_DB não configurado.' }, 503)

  try {
    await ensureTable(db)

    const body = await request.json() as {
      module: string
      model: string
      input_tokens?: number
      output_tokens?: number
      latency_ms?: number
      status?: string
      error_detail?: string
    }

    if (!body.module || !body.model) {
      return json({ ok: false, error: 'module e model são obrigatórios.' }, 400)
    }

    await db.prepare(`
      INSERT INTO ai_usage_logs (module, model, input_tokens, output_tokens, latency_ms, status, error_detail)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.module,
      body.model,
      body.input_tokens || 0,
      body.output_tokens || 0,
      body.latency_ms || 0,
      body.status || 'ok',
      body.error_detail || null,
    ).run()

    return json({ ok: true })
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'Erro ao registrar log.' }, 500)
  }
}
