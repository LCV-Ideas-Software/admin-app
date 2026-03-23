-- admin-app / bigdata_db
-- Migration 002: domínio Calculadora Calculadora com prefixação por contexto
-- Objetivo: criar estrutura base do módulo Calculadora no banco unificado sem colisão nominal.

-- ============================================================================
-- TABELAS (prefixo obrigatório: calculadora_)
-- ============================================================================

CREATE TABLE IF NOT EXISTS calc_ptax_cache (
    data_cotacao TEXT,
    moeda TEXT,
    valor_ptax REAL NOT NULL,
    PRIMARY KEY (data_cotacao, moeda)
);

CREATE TABLE IF NOT EXISTS calc_backtest_spot_vs_ptax (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    moeda TEXT NOT NULL,
    data_compra TEXT NOT NULL,
    taxa_prevista REAL NOT NULL,
    taxa_observada REAL NOT NULL,
    erro_percentual REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS calc_oraculo_observabilidade (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL,
    from_cache INTEGER NOT NULL,
    force_refresh INTEGER NOT NULL,
    duration_ms INTEGER,
    moeda TEXT,
    valor_original REAL,
    preview TEXT,
    error_message TEXT,
    app_version TEXT
);

CREATE TABLE IF NOT EXISTS calc_rate_limit_policies (
    route_key TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL,
    max_requests INTEGER NOT NULL,
    window_minutes INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by TEXT
);

CREATE TABLE IF NOT EXISTS calc_rate_limit_hits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_key TEXT NOT NULL,
    ip TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- ============================================================================
-- ÍNDICES (prefixo obrigatório: idx_calculadora_...)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_calc_backtest_created_at
ON calc_backtest_spot_vs_ptax(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calc_observabilidade_created_at
ON calc_oraculo_observabilidade(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calc_rate_limit_hits_route_ip_created_at
ON calc_rate_limit_hits(route_key, ip, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calc_rate_limit_policies_updated_at
ON calc_rate_limit_policies(updated_at DESC);

-- ============================================================================
-- NOTAS DE CUTOVER
-- ============================================================================
-- 1) Aplicar esta migration no banco unificado bigdata_db.
-- 2) Adaptar backend do domínio Calculadora para ler/escrever nas tabelas prefixadas.
-- 3) Revisar/normalizar valores de route_key com contexto explícito (ex.: calculadora/cotacao).
-- 4) Homologar no admin-app mantendo admin legado ativo.
-- 5) Só depois executar corte definitivo do legado.
