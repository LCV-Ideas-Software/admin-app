-- admin-app / bigdata_db
-- Migration 004: domínio MTA-STS com prefixação por contexto
-- Objetivo: criar estrutura base do módulo MTA-STS no banco unificado sem colisão nominal.

-- ============================================================================
-- TABELAS (prefixo obrigatório: mtasts_)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mtasts_mta_sts_policies (
    domain TEXT PRIMARY KEY,
    policy_text TEXT NOT NULL,
    tlsrpt_email TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mtasts_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gerado_em TEXT UNIQUE NOT NULL,
    domain TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ÍNDICES (prefixo obrigatório: idx_mtasts_...)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mtasts_history_domain_rowid
ON mtasts_history(domain, id DESC);

CREATE INDEX IF NOT EXISTS idx_mtasts_history_gerado_em_desc
ON mtasts_history(gerado_em DESC);

CREATE INDEX IF NOT EXISTS idx_mtasts_policies_updated_at
ON mtasts_mta_sts_policies(updated_at DESC);

-- ============================================================================
-- NOTAS DE CUTOVER
-- ============================================================================
-- 1) Aplicar esta migration no banco unificado bigdata_db.
-- 2) Adaptar queries do módulo MTA-STS para tabelas mtasts_*.
-- 3) Preservar contrato operacional atual:
--    - histórico por domínio via mtasts_history(domain, gerado_em)
--    - política atual por domínio em mtasts_mta_sts_policies.
-- 4) Homologar no admin-app mantendo app legado ativo.
-- 5) Só depois executar corte definitivo do legado.
