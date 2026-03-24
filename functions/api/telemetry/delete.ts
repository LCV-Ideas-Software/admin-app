/**
 * Exclusão de registros individuais de telemetria.
 * DELETE /api/telemetry/delete?table=<table>&id=<id>
 */
import type { D1Database } from '../_lib/operational'
import { createResponseTrace } from '../_lib/request-trace'

type Env = { BIGDATA_DB?: D1Database }
type Context = { request: Request; env: Env }

const ALLOWED_TABLES = [
  'mainsite_contact_logs',
  'mainsite_shares',
  'mainsite_chat_logs',
  'mainsite_chat_context_audit',
  'adminapp_module_events',
  'adminapp_sync_runs',
] as const

export async function onRequestDelete(context: Context) {
  const { env } = context
  const trace = createResponseTrace(context.request)
  const db = env.BIGDATA_DB

  if (!db) {
    return new Response(JSON.stringify({ ok: false, error: 'Binding BIGDATA_DB indisponível.', ...trace }), { status: 503, headers: { 'Content-Type': 'application/json' } })
  }

  const url = new URL(context.request.url)
  const table = url.searchParams.get('table')
  const id = url.searchParams.get('id')

  if (!table || !id) {
    return new Response(JSON.stringify({ ok: false, error: 'Parâmetros obrigatórios: table, id.', ...trace }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  if (!ALLOWED_TABLES.includes(table as typeof ALLOWED_TABLES[number])) {
    return new Response(JSON.stringify({ ok: false, error: `Tabela "${table}" não permitida.`, ...trace }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  }

  try {
    // Table name is validated against whitelist above — safe for interpolation
    await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(Number(id)).run()
    return new Response(JSON.stringify({ ok: true, ...trace, deleted: { table, id: Number(id) } }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao excluir registro.'
    return new Response(JSON.stringify({ ok: false, error: message, ...trace }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
