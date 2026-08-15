-- Canonicalize the four drifted migration-015 tables without replaying legacy migrations.
-- astrologo_user_saved_items is staged and rebuilt too because its ON DELETE CASCADE
-- would otherwise erase children when astrologo_user_data is dropped.
PRAGMA defer_foreign_keys = on;

CREATE TABLE __admin_app_0001_astrologo_user_data AS
SELECT id, email, dados_json, created_at, updated_at
FROM astrologo_user_data;

CREATE TABLE __admin_app_0001_astrologo_auth_tokens AS
SELECT id, email, token, action, dados_json, expires_at, used, created_at
FROM astrologo_auth_tokens;

CREATE TABLE __admin_app_0001_admin_module_configs AS
SELECT module_key, config_json, updated_at
FROM admin_module_configs;

CREATE TABLE __admin_app_0001_ai_usage_logs AS
SELECT id, timestamp, module, model, input_tokens, output_tokens,
       latency_ms, status, error_detail
FROM ai_usage_logs;

CREATE TABLE __admin_app_0001_astrologo_user_saved_items AS
SELECT id, user_data_id, mapa_id, artifact_id, transit_run_id,
       synastry_run_id, locality_run_id, label, created_at, updated_at
FROM astrologo_user_saved_items;

CREATE TABLE __admin_app_0001_ai_usage_logs_sequence (
    name TEXT PRIMARY KEY CHECK (name = 'ai_usage_logs'),
    seq INTEGER NOT NULL CHECK (seq >= 0)
);
INSERT INTO __admin_app_0001_ai_usage_logs_sequence (name, seq)
SELECT name, seq
FROM sqlite_sequence
WHERE name = 'ai_usage_logs';

DROP TABLE astrologo_user_saved_items;
DROP TABLE astrologo_user_data;
DROP TABLE astrologo_auth_tokens;
DROP TABLE admin_module_configs;
DROP TABLE ai_usage_logs;

CREATE TABLE astrologo_user_data (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    dados_json TEXT NOT NULL CHECK (json_valid(dados_json)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE astrologo_auth_tokens (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    action TEXT NOT NULL,
    dados_json TEXT CHECK (dados_json IS NULL OR json_valid(dados_json)),
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admin_module_configs (
    module_key TEXT PRIMARY KEY,
    config_json TEXT NOT NULL CHECK (json_valid(config_json)),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ai_usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    module TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
    output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
    latency_ms INTEGER NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
    status TEXT NOT NULL DEFAULT 'ok',
    error_detail TEXT
);

INSERT INTO astrologo_user_data
    (id, email, dados_json, created_at, updated_at)
SELECT id, email, dados_json, created_at, updated_at
FROM __admin_app_0001_astrologo_user_data;

INSERT INTO astrologo_auth_tokens
    (id, email, token, action, dados_json, expires_at, used, created_at)
SELECT id, email, token, action, dados_json, expires_at, used, created_at
FROM __admin_app_0001_astrologo_auth_tokens;

INSERT INTO admin_module_configs
    (module_key, config_json, updated_at)
SELECT module_key, config_json, updated_at
FROM __admin_app_0001_admin_module_configs;

INSERT INTO ai_usage_logs
    (id, timestamp, module, model, input_tokens, output_tokens,
     latency_ms, status, error_detail)
SELECT id, timestamp, module, model, input_tokens, output_tokens,
       latency_ms, status, error_detail
FROM __admin_app_0001_ai_usage_logs;

CREATE TABLE astrologo_user_saved_items (
    id TEXT PRIMARY KEY CHECK (
        length(id) BETWEEN 8 AND 128
        AND id = trim(id)
        AND id NOT GLOB '*[^0-9A-Za-z:._-]*'
    ),
    user_data_id TEXT NOT NULL,
    mapa_id TEXT,
    artifact_id TEXT,
    transit_run_id TEXT,
    synastry_run_id TEXT,
    locality_run_id TEXT,
    label TEXT CHECK (label IS NULL OR length(label) <= 160),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (
        (mapa_id IS NOT NULL) +
        (artifact_id IS NOT NULL) +
        (transit_run_id IS NOT NULL) +
        (synastry_run_id IS NOT NULL) +
        (locality_run_id IS NOT NULL) = 1
    ),
    FOREIGN KEY (user_data_id) REFERENCES astrologo_user_data(id) ON DELETE CASCADE,
    FOREIGN KEY (mapa_id) REFERENCES astrologo_mapas(id) ON DELETE CASCADE,
    FOREIGN KEY (artifact_id) REFERENCES astrologo_artifacts(id) ON DELETE CASCADE,
    FOREIGN KEY (transit_run_id) REFERENCES astrologo_transit_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (synastry_run_id) REFERENCES astrologo_synastry_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (locality_run_id) REFERENCES astrologo_locality_runs(id) ON DELETE CASCADE
);

INSERT INTO astrologo_user_saved_items
    (id, user_data_id, mapa_id, artifact_id, transit_run_id,
     synastry_run_id, locality_run_id, label, created_at, updated_at)
SELECT id, user_data_id, mapa_id, artifact_id, transit_run_id,
       synastry_run_id, locality_run_id, label, created_at, updated_at
FROM __admin_app_0001_astrologo_user_saved_items;

-- Explicit-id copy restores MAX(id). Preserve a historically higher AUTOINCREMENT
-- watermark as well, so a delete before deployment cannot cause id reuse.
INSERT INTO sqlite_sequence (name, seq)
SELECT name, seq
FROM __admin_app_0001_ai_usage_logs_sequence
WHERE NOT EXISTS (
    SELECT 1 FROM sqlite_sequence WHERE name = 'ai_usage_logs'
);

UPDATE sqlite_sequence
SET seq = max(
    seq,
    (SELECT seq
     FROM __admin_app_0001_ai_usage_logs_sequence
     WHERE name = 'ai_usage_logs')
)
WHERE name = 'ai_usage_logs'
  AND EXISTS (
      SELECT 1
      FROM __admin_app_0001_ai_usage_logs_sequence
      WHERE name = 'ai_usage_logs'
  );

DROP TABLE __admin_app_0001_astrologo_user_data;
DROP TABLE __admin_app_0001_astrologo_auth_tokens;
DROP TABLE __admin_app_0001_admin_module_configs;
DROP TABLE __admin_app_0001_ai_usage_logs;
DROP TABLE __admin_app_0001_astrologo_user_saved_items;
DROP TABLE __admin_app_0001_ai_usage_logs_sequence;

CREATE UNIQUE INDEX idx_astrologo_user_data_email_normalized
ON astrologo_user_data(lower(trim(email)));
CREATE INDEX idx_astrologo_user_data_updated_at
ON astrologo_user_data(updated_at DESC);
CREATE INDEX idx_astrologo_auth_tokens_email_action_used_expires
ON astrologo_auth_tokens(email, action, used, expires_at);
CREATE INDEX idx_astrologo_auth_tokens_expires_at
ON astrologo_auth_tokens(expires_at);
CREATE INDEX idx_admin_module_configs_updated_at
ON admin_module_configs(updated_at DESC);
CREATE INDEX idx_ai_usage_logs_module_timestamp
ON ai_usage_logs(module, timestamp DESC);
CREATE INDEX idx_ai_usage_logs_status_timestamp
ON ai_usage_logs(status, timestamp DESC);
CREATE INDEX idx_astrologo_user_saved_items_user_created
ON astrologo_user_saved_items(user_data_id, created_at DESC);
CREATE UNIQUE INDEX idx_astrologo_saved_user_mapa
ON astrologo_user_saved_items(user_data_id, mapa_id)
WHERE mapa_id IS NOT NULL;
CREATE UNIQUE INDEX idx_astrologo_saved_user_artifact
ON astrologo_user_saved_items(user_data_id, artifact_id)
WHERE artifact_id IS NOT NULL;
CREATE UNIQUE INDEX idx_astrologo_saved_user_transit
ON astrologo_user_saved_items(user_data_id, transit_run_id)
WHERE transit_run_id IS NOT NULL;
CREATE UNIQUE INDEX idx_astrologo_saved_user_synastry
ON astrologo_user_saved_items(user_data_id, synastry_run_id)
WHERE synastry_run_id IS NOT NULL;
CREATE UNIQUE INDEX idx_astrologo_saved_user_locality
ON astrologo_user_saved_items(user_data_id, locality_run_id)
WHERE locality_run_id IS NOT NULL;

PRAGMA defer_foreign_keys = off;
