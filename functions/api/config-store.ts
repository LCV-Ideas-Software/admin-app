/**
 * config-store.ts — Endpoint centralizado de persistência de configurações de módulo.
 * Substitui toda persistência em localStorage por D1 (BIGDATA_DB).
 *
 * GET  /api/config-store?module=<key>  → lê config do módulo
 * POST /api/config-store               → upsert config do módulo
 *   body: { module: string, config: Record<string, unknown> }
 */

// ── Tipos D1 (padrão admin-app — sem import externo) ──

interface D1PreparedStatement {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement
  first: <T>() => Promise<T | null>
  all: <T>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

interface D1Database {
  prepare: (query: string) => D1PreparedStatement
}

interface Env {
  BIGDATA_DB?: D1Database
}

interface RequestContext {
  request: Request
  env: Env
}

const TABLE = 'admin_module_configs'

async function ensureTable(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      module_key TEXT PRIMARY KEY,
      config_json TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run()
}

export async function onRequestGet(ctx: RequestContext): Promise<Response> {
  const db = ctx.env.BIGDATA_DB
  if (!db) return Response.json({ ok: false, error: 'BIGDATA_DB não configurada.' }, { status: 500 })

  await ensureTable(db)

  const url = new URL(ctx.request.url)
  const moduleKey = url.searchParams.get('module')
  if (!moduleKey) {
    return Response.json({ ok: false, error: 'Parâmetro "module" é obrigatório.' }, { status: 400 })
  }

  try {
    const row = await db.prepare(`SELECT config_json FROM ${TABLE} WHERE module_key = ?`).bind(moduleKey).first<{ config_json: string }>()
    const config = row ? JSON.parse(row.config_json) : null
    return Response.json({ ok: true, config })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const db = ctx.env.BIGDATA_DB
  if (!db) return Response.json({ ok: false, error: 'BIGDATA_DB não configurada.' }, { status: 500 })

  await ensureTable(db)

  let body: { module?: string; config?: Record<string, unknown> }
  try {
    body = await ctx.request.json() as { module?: string; config?: Record<string, unknown> }
  } catch {
    return Response.json({ ok: false, error: 'Body JSON inválido.' }, { status: 400 })
  }

  const { module: moduleKey, config } = body
  if (!moduleKey || !config) {
    return Response.json({ ok: false, error: 'Campos "module" e "config" são obrigatórios.' }, { status: 400 })
  }

  try {
    const json = JSON.stringify(config)
    await db.prepare(`
      INSERT INTO ${TABLE} (module_key, config_json, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(module_key) DO UPDATE SET
        config_json = excluded.config_json,
        updated_at = excluded.updated_at
    `).bind(moduleKey, json).run()

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
