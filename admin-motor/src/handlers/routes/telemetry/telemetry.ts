/**
 * Endpoint unificado de telemetria — lê todas as tabelas de telemetria do bigdata_db.
 * GET  /api/telemetry — retorna dados agregados + registros brutos de todas as fontes.
 */

import type { D1Database } from '../../../../../functions/api/_lib/operational';
import { ensureOperationalTables } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace } from '../../../../../functions/api/_lib/request-trace';

type Env = { BIGDATA_DB?: D1Database };
type Context = { request: Request; env: Env };

const headers = () => ({ 'Content-Type': 'application/json' });

export async function onRequestGet(context: Context) {
  const env = context.env;
  const trace = createResponseTrace(context.request);
  const db = env.BIGDATA_DB;

  if (!db) {
    return new Response(JSON.stringify({ ok: false, error: 'Binding BIGDATA_DB indisponível.', ...trace }), {
      status: 503,
      headers: headers(),
    });
  }

  try {
    await ensureOperationalTables(db);
    const since24h = Date.now() - 24 * 60 * 60 * 1000;

    // ── Operational events (24h aggregate) ──
    const eventsAgg = await db
      .prepare(`
      SELECT module,
        COUNT(1) AS total_events,
        SUM(CASE WHEN fallback_used = 1 THEN 1 ELSE 0 END) AS fallback_events,
        SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END) AS error_events,
        (SELECT source FROM adminapp_module_events e2 WHERE e2.module = e1.module ORDER BY e2.created_at DESC LIMIT 1) AS last_source,
        (SELECT ok FROM adminapp_module_events e3 WHERE e3.module = e1.module ORDER BY e3.created_at DESC LIMIT 1) AS last_ok
      FROM adminapp_module_events e1
      WHERE created_at >= ?
      GROUP BY module ORDER BY module ASC
    `)
      .bind(since24h)
      .all();

    // ── Raw event log (last 100) ──
    const eventLog = await db
      .prepare(`
      SELECT id, created_at, module, source, fallback_used, ok, error_message, metadata_json
      FROM adminapp_module_events ORDER BY created_at DESC LIMIT 100
    `)
      .all();

    // ── Sync runs aggregate ──
    const syncAgg = await db
      .prepare(`
      SELECT module,
        COUNT(1) AS total_runs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_runs,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_runs,
        (SELECT status FROM adminapp_sync_runs s2 WHERE s2.module = s1.module ORDER BY s2.started_at DESC LIMIT 1) AS last_status,
        (SELECT finished_at FROM adminapp_sync_runs s3 WHERE s3.module = s1.module ORDER BY s3.started_at DESC LIMIT 1) AS last_finished_at
      FROM adminapp_sync_runs s1
      GROUP BY module ORDER BY module ASC
    `)
      .all();

    // ── Mainsite telemetry tables (best-effort: tables may not exist yet) ──
    const safeQuery = async (query: string) => {
      try {
        return (await db.prepare(query).all()).results ?? [];
      } catch {
        return [];
      }
    };

    const contacts = await safeQuery('SELECT * FROM mainsite_contact_logs ORDER BY created_at DESC LIMIT 200');
    const shares = await safeQuery('SELECT * FROM mainsite_shares ORDER BY created_at DESC LIMIT 200');
    const chatLogs = await safeQuery('SELECT * FROM mainsite_chat_logs ORDER BY created_at DESC LIMIT 200');
    const chatAudit = await safeQuery('SELECT * FROM mainsite_chat_context_audit ORDER BY created_at DESC LIMIT 200');

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        source: 'bigdata_db',
        generatedAt: Date.now(),
        modules: eventsAgg.results ?? [],
        eventLog: eventLog.results ?? [],
        sync: syncAgg.results ?? [],
        contacts,
        shares,
        chatLogs,
        chatAudit,
      }),
      { headers: headers() },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro de telemetria desconhecido.';
    return new Response(JSON.stringify({ ok: false, error: message, ...trace }), { status: 500, headers: headers() });
  }
}
