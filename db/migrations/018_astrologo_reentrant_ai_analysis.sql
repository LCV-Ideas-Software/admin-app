-- admin-app / bigdata_db
-- Migration 018: execucao reentrante e duravel da analise extensa do Astrologo.
-- Deve ser aplicada depois das migrations 015, 016 e 017, antes do
-- astrologo-app que distribui uma analise entre varias requisicoes HTTP.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS astrologo_ai_analysis_jobs (
    id TEXT PRIMARY KEY,
    capability_hash TEXT NOT NULL CHECK (
        length(capability_hash) = 64 AND
        capability_hash NOT GLOB '*[^0-9a-f]*'
    ),
    mapa_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (
        status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
    ),
    phase TEXT NOT NULL DEFAULT 'planning' CHECK (
        phase IN ('planning', 'analyzing', 'reducing', 'synthesizing', 'completed', 'failed')
    ),
    lease_owner TEXT,
    lease_expires_at TEXT,
    completed_steps INTEGER NOT NULL DEFAULT 0 CHECK (completed_steps >= 0),
    total_steps INTEGER NOT NULL DEFAULT 0 CHECK (
        total_steps >= 0 AND completed_steps <= total_steps
    ),
    input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
    output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
    plan_json TEXT NOT NULL CHECK (json_valid(plan_json)),
    fixed_prompt_prefix TEXT NOT NULL,
    final_result_json TEXT CHECK (
        final_result_json IS NULL OR json_valid(final_result_json)
    ),
    error_code TEXT,
    error_detail TEXT,
    expires_at TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (mapa_id) REFERENCES astrologo_mapas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS astrologo_ai_analysis_steps (
    job_id TEXT NOT NULL,
    step_key TEXT NOT NULL CHECK (length(trim(step_key)) BETWEEN 1 AND 120),
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    kind TEXT NOT NULL CHECK (
        kind IN ('direct', 'fragment', 'reduction', 'synthesis')
    ),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'running', 'completed', 'failed')
    ),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    lease_owner TEXT,
    lease_expires_at TEXT,
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
    result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
    input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
    output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
    error_code TEXT,
    error_detail TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (job_id, step_key),
    FOREIGN KEY (job_id) REFERENCES astrologo_ai_analysis_jobs(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_astrologo_ai_analysis_jobs_capability_hash
ON astrologo_ai_analysis_jobs(capability_hash);

CREATE UNIQUE INDEX IF NOT EXISTS idx_astrologo_ai_analysis_jobs_active_mapa
ON astrologo_ai_analysis_jobs(mapa_id)
WHERE status IN ('queued', 'running');

CREATE INDEX IF NOT EXISTS idx_astrologo_ai_analysis_jobs_mapa_status
ON astrologo_ai_analysis_jobs(mapa_id, status);

CREATE INDEX IF NOT EXISTS idx_astrologo_ai_analysis_jobs_expires_at
ON astrologo_ai_analysis_jobs(expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_astrologo_ai_analysis_steps_job_ordinal
ON astrologo_ai_analysis_steps(job_id, ordinal);

CREATE INDEX IF NOT EXISTS idx_astrologo_ai_analysis_steps_job_status_ordinal
ON astrologo_ai_analysis_steps(job_id, status, ordinal);

INSERT OR IGNORE INTO astrologo_rate_limit_policies
    (route, enabled, max_requests, window_minutes)
VALUES ('astrologo/analisar-etapa', 1, 240, 60);
