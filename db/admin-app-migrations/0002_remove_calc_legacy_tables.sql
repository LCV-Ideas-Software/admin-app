-- Retire two empty Calculadora legacy tables after the runtime-consumer inventory.
-- Wrangler applies D1 migrations transactionally: the CHECK guard aborts and
-- rolls back the whole migration if either candidate gained data or if the
-- active audit table is missing.

CREATE TABLE IF NOT EXISTS calc_email_rate_limit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS calc_parametros_calculo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT NOT NULL,
    valor TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE TABLE __admin_app_0002_calc_legacy_guard (
    legacy_row_count INTEGER NOT NULL CHECK (legacy_row_count = 0),
    active_audit_table_count INTEGER NOT NULL CHECK (active_audit_table_count = 1)
);

INSERT INTO __admin_app_0002_calc_legacy_guard (
    legacy_row_count,
    active_audit_table_count
)
SELECT
    (SELECT COUNT(*) FROM calc_email_rate_limit)
        + (SELECT COUNT(*) FROM calc_parametros_calculo),
    (SELECT COUNT(*)
     FROM sqlite_master
     WHERE type = 'table' AND name = 'calc_parametros_auditoria');

DROP TABLE calc_email_rate_limit;
DROP TABLE calc_parametros_calculo;
DROP TABLE __admin_app_0002_calc_legacy_guard;
