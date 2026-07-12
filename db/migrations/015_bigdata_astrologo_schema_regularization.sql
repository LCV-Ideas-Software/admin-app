-- admin-app / bigdata_db
-- Migration 015: regularização declarativa do schema operacional do Astrólogo.
--
-- Pré-condições:
--   1. migrations 001 e 014 aplicadas;
--   2. scripts/reconcile-astrologo-schema.mjs executado para adicionar
--      astrologo_mapas.email somente quando a coluna estiver ausente.
--
-- Esta migration deve ser aplicada uma única vez. Ela substitui CREATE/ALTER
-- executados durante requisições por um contrato versionado e auditável.

ALTER TABLE astrologo_mapas ADD COLUMN data_analise TEXT;

CREATE TABLE IF NOT EXISTS astrologo_user_data (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    dados_json TEXT NOT NULL CHECK (json_valid(dados_json)),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS astrologo_auth_tokens (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    action TEXT NOT NULL,
    dados_json TEXT CHECK (dados_json IS NULL OR json_valid(dados_json)),
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_module_configs (
    module_key TEXT PRIMARY KEY,
    config_json TEXT NOT NULL CHECK (json_valid(config_json)),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
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

INSERT OR IGNORE INTO admin_module_configs (module_key, config_json)
VALUES ('astrologo-config', '{"modeloSintese":""}');

INSERT OR IGNORE INTO astrologo_rate_limit_policies (route, enabled, max_requests, window_minutes)
VALUES
    ('astrologo/calcular', 1, 10, 10),
    ('astrologo/analisar', 1, 6, 15),
    ('astrologo/enviar-email', 1, 4, 60),
    ('astrologo/contato', 1, 5, 30),
    ('astrologo/auth', 1, 8, 15),
    ('astrologo/transitos', 1, 6, 15),
    ('astrologo/sinastria', 1, 4, 15),
    ('astrologo/localidade', 1, 4, 30);

CREATE UNIQUE INDEX IF NOT EXISTS idx_astrologo_user_data_email_normalized
ON astrologo_user_data(lower(trim(email)));

CREATE INDEX IF NOT EXISTS idx_astrologo_user_data_updated_at
ON astrologo_user_data(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_astrologo_auth_tokens_email_action_used_expires
ON astrologo_auth_tokens(email, action, used, expires_at);

CREATE INDEX IF NOT EXISTS idx_astrologo_auth_tokens_expires_at
ON astrologo_auth_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_astrologo_mapas_email_created_at
ON astrologo_mapas(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_astrologo_mapas_data_analise
ON astrologo_mapas(data_analise DESC);

CREATE INDEX IF NOT EXISTS idx_admin_module_configs_updated_at
ON admin_module_configs(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_module_timestamp
ON ai_usage_logs(module, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_status_timestamp
ON ai_usage_logs(status, timestamp DESC);
