-- Estrutura da tabela no banco D1 (SQLite) da Cloudflare.
-- Armazena dados brutos e metadados essenciais dos relatórios TLS-RPT.
CREATE TABLE IF NOT EXISTS tlsrpt_relatorios_tls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id TEXT NOT NULL,
    org_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance de consulta
CREATE UNIQUE INDEX IF NOT EXISTS idx_tlsrpt_relatorios_report_id ON tlsrpt_relatorios_tls (report_id);
CREATE INDEX IF NOT EXISTS idx_tlsrpt_relatorios_org_name ON tlsrpt_relatorios_tls (org_name);
CREATE INDEX IF NOT EXISTS idx_tlsrpt_relatorios_start_date ON tlsrpt_relatorios_tls (start_date DESC);