export type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement
  first: <T>() => Promise<T | null>
  all: <T>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

export type D1Database = {
  prepare: (query: string) => D1PreparedStatement
}

type ModuleEventInput = {
  module: 'astrologo' | 'cfdns' | 'cfpw' | 'calculadora' | 'mainsite' | 'mtasts' | 'oraculo' | 'apphub' | 'adminhub'
  source: 'bigdata_db' | 'bootstrap-default'
  fallbackUsed: boolean
  ok: boolean
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}

type SyncRunStart = {
  module: 'astrologo' | 'cfdns' | 'cfpw' | 'calculadora' | 'mainsite' | 'mtasts' | 'oraculo' | 'apphub' | 'adminhub'
  status: 'running'
  startedAt: number
  metadata?: Record<string, unknown>
}

type SyncRunFinish = {
  id: number
  status: 'success' | 'error'
  finishedAt: number
  recordsRead: number
  recordsUpserted: number
  errorMessage?: string | null
}

export async function ensureOperationalTables(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS adminapp_module_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      module TEXT NOT NULL,
      source TEXT NOT NULL,
      fallback_used INTEGER NOT NULL DEFAULT 0,
      ok INTEGER NOT NULL DEFAULT 1,
      error_message TEXT,
      metadata_json TEXT
    )
  `).run()

  await db.prepare('CREATE INDEX IF NOT EXISTS idx_adminapp_module_events_created_at ON adminapp_module_events(created_at DESC)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_adminapp_module_events_module ON adminapp_module_events(module, created_at DESC)').run()

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS adminapp_sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      records_read INTEGER NOT NULL DEFAULT 0,
      records_upserted INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      metadata_json TEXT
    )
  `).run()

  await db.prepare('CREATE INDEX IF NOT EXISTS idx_adminapp_sync_runs_module_started ON adminapp_sync_runs(module, started_at DESC)').run()
}

export async function logModuleOperationalEvent(db: D1Database, input: ModuleEventInput) {
  await ensureOperationalTables(db)

  await db.prepare(`
    INSERT INTO adminapp_module_events
    (created_at, module, source, fallback_used, ok, error_message, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      Date.now(),
      input.module,
      input.source,
      input.fallbackUsed ? 1 : 0,
      input.ok ? 1 : 0,
      input.errorMessage ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    )
    .run()
}

export async function startSyncRun(db: D1Database, run: SyncRunStart) {
  await ensureOperationalTables(db)

  await db.prepare(`
    INSERT INTO adminapp_sync_runs
    (module, status, started_at, metadata_json)
    VALUES (?, ?, ?, ?)
  `)
    .bind(run.module, run.status, run.startedAt, run.metadata ? JSON.stringify(run.metadata) : null)
    .run()

  const row = await db.prepare('SELECT id FROM adminapp_sync_runs WHERE module = ? ORDER BY id DESC LIMIT 1')
    .bind(run.module)
    .first<{ id?: number }>()

  return Number(row?.id ?? 0)
}

export async function finishSyncRun(db: D1Database, run: SyncRunFinish) {
  await ensureOperationalTables(db)

  await db.prepare(`
    UPDATE adminapp_sync_runs
    SET
      status = ?,
      finished_at = ?,
      records_read = ?,
      records_upserted = ?,
      error_message = ?
    WHERE id = ?
  `)
    .bind(
      run.status,
      run.finishedAt,
      run.recordsRead,
      run.recordsUpserted,
      run.errorMessage ?? null,
      run.id,
    )
    .run()
}
