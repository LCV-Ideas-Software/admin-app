-- admin-app / bigdata_db
-- Migration 005: telemetria operacional e rastreio de sync do shell admin-app

CREATE TABLE IF NOT EXISTS adminapp_module_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    module TEXT NOT NULL,
    source TEXT NOT NULL,
    fallback_used INTEGER NOT NULL DEFAULT 0,
    ok INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_adminapp_module_events_created_at
ON adminapp_module_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_adminapp_module_events_module
ON adminapp_module_events(module, created_at DESC);

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
);

CREATE INDEX IF NOT EXISTS idx_adminapp_sync_runs_module_started
ON adminapp_sync_runs(module, started_at DESC);
