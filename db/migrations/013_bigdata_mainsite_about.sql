-- admin-app / bigdata_db
-- Migration 013: conteúdo institucional "Sobre Este Site" do MainSite
-- Objetivo: manter a página pública /sobre-este-site fora da superfície editorial
--           de posts, feed, arquivo, chatbot e summaries.

CREATE TABLE IF NOT EXISTS mainsite_about (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT 'Leonardo Cardozo Vargas',
    source_post_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
