import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migrationPaths = [
  'db/migrations/019_bigdata_calc_remove_legacy_tables.sql',
  'db/admin-app-migrations/0002_remove_calc_legacy_tables.sql',
];

const readMigration = (path) => readFileSync(`${root}/${path}`, 'utf8');
const tableExists = (db, table) =>
  db.prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)?.present === 1;

const prepareDatabase = ({ includeAudit = true } = {}) => {
  const db = new DatabaseSync(':memory:');
  if (includeAudit) {
    db.exec(`
      CREATE TABLE calc_parametros_auditoria (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER NOT NULL,
        admin_email TEXT NOT NULL,
        chave TEXT NOT NULL,
        valor_anterior TEXT,
        valor_novo TEXT NOT NULL,
        origem TEXT NOT NULL
      );
    `);
    db.prepare(
      `INSERT INTO calc_parametros_auditoria
       (created_at, admin_email, chave, valor_anterior, valor_novo, origem)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(1, 'operator@example.com', 'taxa', '1', '2', 'teste');
  }
  db.exec(`
    CREATE TABLE calc_email_rate_limit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE TABLE calc_parametros_calculo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chave TEXT NOT NULL,
      valor TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  return db;
};

const applyMigration = (db, sql) => {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(sql);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

describe.each(migrationPaths)('%s', (path) => {
  it('removes only empty legacy tables and preserves the active audit table', () => {
    const db = prepareDatabase();

    applyMigration(db, readMigration(path));

    expect(tableExists(db, 'calc_email_rate_limit')).toBe(false);
    expect(tableExists(db, 'calc_parametros_calculo')).toBe(false);
    expect(tableExists(db, 'calc_parametros_auditoria')).toBe(true);
    expect(db.prepare('SELECT COUNT(*) AS count FROM calc_parametros_auditoria').get().count).toBe(1);
  });

  it('is idempotent after the legacy tables are absent', () => {
    const db = prepareDatabase();
    const sql = readMigration(path);

    applyMigration(db, sql);
    applyMigration(db, sql);

    expect(tableExists(db, 'calc_email_rate_limit')).toBe(false);
    expect(tableExists(db, 'calc_parametros_calculo')).toBe(false);
    expect(tableExists(db, 'calc_parametros_auditoria')).toBe(true);
  });

  it.each(['calc_email_rate_limit', 'calc_parametros_calculo'])(
    'rolls back without dropping either table when %s contains data',
    (table) => {
      const db = prepareDatabase();
      if (table === 'calc_email_rate_limit') {
        db.prepare('INSERT INTO calc_email_rate_limit (ip, timestamp) VALUES (?, ?)').run('192.0.2.1', 1);
      } else {
        db.prepare('INSERT INTO calc_parametros_calculo (chave, valor, created_at) VALUES (?, ?, ?)').run(
          'taxa',
          '1',
          1,
        );
      }

      expect(() => applyMigration(db, readMigration(path))).toThrow(/CHECK constraint failed/);
      expect(tableExists(db, 'calc_email_rate_limit')).toBe(true);
      expect(tableExists(db, 'calc_parametros_calculo')).toBe(true);
      expect(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count).toBe(1);
      expect(db.prepare('SELECT COUNT(*) AS count FROM calc_parametros_auditoria').get().count).toBe(1);
    },
  );

  it('rolls back when the active audit table is missing', () => {
    const db = prepareDatabase({ includeAudit: false });

    expect(() => applyMigration(db, readMigration(path))).toThrow(/CHECK constraint failed/);
    expect(tableExists(db, 'calc_email_rate_limit')).toBe(true);
    expect(tableExists(db, 'calc_parametros_calculo')).toBe(true);
    expect(tableExists(db, 'calc_parametros_auditoria')).toBe(false);
  });
});
