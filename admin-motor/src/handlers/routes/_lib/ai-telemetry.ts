/**
 * Shared AI usage telemetry helper.
 * Fire-and-forget (caller wraps in `void` or `waitUntil`); never throws.
 * Auto-creates `ai_usage_logs` table on first call (idempotent DDL).
 *
 * Replaces 3 near-identical local copies that lived in
 *   - mainsite/gemini-import.ts
 *   - mainsite/ai/transform.ts
 *   - mainsite/post-summaries.ts
 */

export interface AiUsageLog {
  module: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  status: string;
  error_detail?: string;
}

export async function logAiUsage(db: D1Database | undefined, entry: AiUsageLog): Promise<void> {
  if (!db) return;
  try {
    await db
      .prepare(`
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
    `)
      .run();
    await db
      .prepare(
        'INSERT INTO ai_usage_logs (module, model, input_tokens, output_tokens, latency_ms, status, error_detail) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        entry.module,
        entry.model,
        entry.input_tokens,
        entry.output_tokens,
        entry.latency_ms,
        entry.status,
        entry.error_detail ?? null,
      )
      .run();
  } catch {
    // Telemetry is fire-and-forget; never propagate errors to handler.
  }
}
