-- admin-app / bigdata_db
-- Migration 007: tabelas complementares do domínio  Calculadora
-- Objetivo: adicionar tabelas presentes em calculadora-calc-db que não constavam na migration 002.

-- ============================================================================
-- TABELAS ATIVAS (prefixo obrigatório: calc_)
-- Usadas pelo código atual do calculadora-calculadora após migração para BIGDATA_DB
-- ============================================================================

CREATE TABLE IF NOT EXISTS calc_parametros_customizados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT NOT NULL,
    valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calc_parametros_auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    admin_email TEXT NOT NULL,
    chave TEXT NOT NULL,
    valor_anterior TEXT,
    valor_novo TEXT NOT NULL,
    origem TEXT NOT NULL
);

-- ============================================================================
-- TABELAS LEGADO (prefixo obrigatório: calc_)
-- Existentes em calculadora-calc-db mas sem uso no código atual.
-- Preservadas nesta etapa histórica; a migration 019 só as remove se vazias.
-- ============================================================================

-- Legacy: rate-limit de e-mail gerenciado inline (antes do módulo rate-limit.mjs)
CREATE TABLE IF NOT EXISTS calc_email_rate_limit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

-- Legacy: parâmetros de cálculo armazenados separadamente (estrutura anterior)
CREATE TABLE IF NOT EXISTS calc_parametros_calculo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT NOT NULL,
    valor TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_calc_parametros_customizados_chave
    ON calc_parametros_customizados(chave);

CREATE INDEX IF NOT EXISTS idx_calc_parametros_auditoria_created_at
    ON calc_parametros_auditoria(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calc_email_rate_limit_ip_timestamp
    ON calc_email_rate_limit(ip, timestamp DESC);

-- ============================================================================
-- NOTAS
-- ============================================================================
-- Esta migration complementa a 002_bigdata_calc_prefixacao.sql.
-- As tabelas ativas (parametros_customizados e parametros_auditoria) são criadas
-- inline no código via "CREATE TABLE IF NOT EXISTS" — esta migration garante que
-- existam na bigdata_db antes do primeiro acesso.
-- As tabelas legado (email_rate_limit, parametros_calculo) não devem receber
-- novos dados. A migration 019 encerra o contrato após um guard fail-closed.
