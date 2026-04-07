-- admin-app / bigdata_db
-- Migration 010: Sistema de Comentários Públicos, Ratings e Moderação IA
-- Objetivo: suporte a comentários com threading, ratings com reações,
--           e moderação automatizada via Google Cloud Natural Language API.
-- Prefixo obrigatório: mainsite_

-- ============================================================================
-- TABELAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS mainsite_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    parent_id INTEGER DEFAULT NULL,
    author_name TEXT NOT NULL DEFAULT 'Anônimo',
    author_email TEXT,
    author_ip_hash TEXT,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    -- status: 'pending' | 'approved' | 'rejected_auto' | 'rejected_manual'
    moderation_scores TEXT,
    -- JSON com scores do GCP NL API moderateText v2
    moderation_decision TEXT,
    -- JSON: { action, max_score, trigger_category }
    admin_notes TEXT,
    is_author_reply INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    reviewed_by TEXT
);

CREATE TABLE IF NOT EXISTS mainsite_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    voter_hash TEXT NOT NULL,
    reaction_type TEXT,
    -- 'love' | 'insightful' | 'thought-provoking' | 'inspiring' | 'beautiful'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, voter_hash)
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mainsite_comments_post_status
    ON mainsite_comments(post_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mainsite_comments_status
    ON mainsite_comments(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mainsite_comments_parent
    ON mainsite_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_mainsite_ratings_post
    ON mainsite_ratings(post_id);

-- ============================================================================
-- SEED: Configurações de Moderação
-- ============================================================================

INSERT OR IGNORE INTO mainsite_settings (id, payload)
VALUES ('mainsite/moderation', '{"autoApproveThreshold":0.3,"autoRejectThreshold":0.8,"criticalCategories":["Toxic","Insult","Profanity","Sexual","Violent","Derogatory"],"requireApproval":false,"commentsEnabled":true,"ratingsEnabled":true,"allowAnonymous":true,"maxCommentLength":2000,"maxNestingDepth":2}');
