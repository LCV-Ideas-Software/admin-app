-- admin-app / bigdata_db
-- Migration 007: tabelas complementares do domínio Itaú Calculadora
-- Objetivo: adicionar tabelas presentes em itau-calc-db que não constavam na migration 002.

-- ============================================================================
-- TABELAS ATIVAS (prefixo obrigatório: itau_)
-- Usadas pelo código atual do itau-calculadora após migração para BIGDATA_DB
-- ============================================================================

CREATE TABLE IF NOT EXISTS itau_parametros_customizados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT NOT NULL,
    valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS itau_parametros_auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    admin_email TEXT NOT NULL,
    chave TEXT NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT NOT NULL,
    origem TEXT NOT NULL
);

-- ============================================================================
-- TABELAS LEGADO (prefixo obrigatório: itau_)
-- Existentes em itau-calc-db mas sem uso no código atual.
-- Mantidas para preservar histórico de dados antes do cutover.
-- ============================================================================

-- Legacy: rate-limit de e-mail gerenciado inline (antes do módulo rate-limit.mjs)
CREATE TABLE IF NOT EXISTS itau_email_rate_limit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Legacy: parâmetros de cálculo armazenados separadamente (estrutura anterior)
CREATE TABLE IF NOT EXISTS itau_parametros_calculo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT NOT NULL,
    valor TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_itau_parametros_customizados_chave
    ON itau_parametros_customizados(chave);

CREATE INDEX IF NOT EXISTS idx_itau_parametros_auditoria_created_at
    ON itau_parametros_auditoria(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_itau_email_rate_limit_ip_timestamp
    ON itau_email_rate_limit(ip, timestamp DESC);

-- ============================================================================
-- NOTAS
-- ============================================================================
-- Esta migration complementa a 002_bigdata_itau_prefixacao.sql.
-- As tabelas ativas (parametros_customizados e parametros_auditoria) são criadas
-- inline no código via "CREATE TABLE IF NOT EXISTS" — esta migration garante que
-- existam na bigdata_db antes do primeiro acesso.
-- As tabelas legado (email_rate_limit, parametros_calculo) devem ser populadas
-- via sync manual antes do cutover definitivo do itau-calc-db.
