-- admin-app / bigdata_db
-- Migration 003: domínio MainSite com prefixação por contexto
-- Objetivo: criar estrutura base do módulo MainSite no banco unificado sem colisão nominal.

-- ============================================================================
-- TABELAS (prefixo obrigatório: mainsite_)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mainsite_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mainsite_settings (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mainsite_chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    context_title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mainsite_chat_context_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    context_title TEXT,
    total_posts_scanned INTEGER NOT NULL,
    context_posts_used INTEGER NOT NULL,
    selected_posts_json TEXT NOT NULL,
    terms_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mainsite_contact_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mainsite_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    post_title TEXT,
    platform TEXT NOT NULL,
    target TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mainsite_financial_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id TEXT,
    status TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    method TEXT,
    payer_email TEXT,
    raw_payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SEEDS INICIAIS DE SETTINGS (chave com contexto explícito)
-- ============================================================================

INSERT OR IGNORE INTO mainsite_settings (id, payload)
VALUES ('mainsite/appearance', '{"allowAutoMode":true,"light":{"bgColor":"#ffffff","bgImage":"","fontColor":"#333333","titleColor":"#111111"},"dark":{"bgColor":"#131314","bgImage":"","fontColor":"#E3E3E3","titleColor":"#8AB4F8"},"shared":{"fontSize":"1.15rem","titleFontSize":"1.8rem","fontFamily":"sans-serif"}}');

INSERT OR IGNORE INTO mainsite_settings (id, payload)
VALUES ('mainsite/rotation', '{"enabled":false,"interval":60,"last_rotated_at":0}');

INSERT OR IGNORE INTO mainsite_settings (id, payload)
VALUES ('mainsite/ratelimit', '{"chatbot":{"enabled":false,"maxRequests":5,"windowMinutes":1},"email":{"enabled":false,"maxRequests":3,"windowMinutes":15}}');

INSERT OR IGNORE INTO mainsite_settings (id, payload)
VALUES ('mainsite/disclaimers', '{"enabled":true,"items":[{"id":"default","title":"Aviso","text":"Texto de exemplo.","buttonText":"Concordo"}]}');

-- ============================================================================
-- ÍNDICES (prefixo obrigatório: idx_mainsite_...)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mainsite_posts_order_created
ON mainsite_posts(is_pinned DESC, display_order ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mainsite_chat_logs_created_at
ON mainsite_chat_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mainsite_chat_context_audit_created_at
ON mainsite_chat_context_audit(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mainsite_contact_logs_created_at
ON mainsite_contact_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mainsite_shares_created_at
ON mainsite_shares(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mainsite_financial_logs_payment_id
ON mainsite_financial_logs(payment_id);

CREATE INDEX IF NOT EXISTS idx_mainsite_financial_logs_created_method_status
ON mainsite_financial_logs(created_at DESC, method, status);

-- ============================================================================
-- NOTAS DE CUTOVER
-- ============================================================================
-- 1) Aplicar esta migration no banco unificado bigdata_db.
-- 2) Adaptar queries do mainsite-worker para tabelas mainsite_*.
-- 3) Para settings, migrar IDs para o padrão contextual (ex.: mainsite/appearance).
-- 4) Homologar no admin-app mantendo admin legado ativo.
-- 5) Só depois executar corte definitivo do legado.
