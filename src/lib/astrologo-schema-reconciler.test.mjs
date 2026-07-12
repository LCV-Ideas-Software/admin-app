import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

import {
  ASTROLOGO_AUTH_READ_POLICY_SQL,
  ASTROLOGO_MAPAS_PREFLIGHT_COLUMNS,
  ASTROLOGO_SAVE_CLAIM_INDEX_NAME,
  ASTROLOGO_SAVE_CLAIM_INDEX_SQL,
  ASTROLOGO_SAVED_MAPS_BACKFILL_SQL,
  ASTROLOGO_SCHEMA_PREFLIGHT_VERSION,
  inspectAstrologoSchema,
  planAstrologoSchemaReconciliation,
  reconcileAstrologoSchema,
} from '../../scripts/lib/astrologo-schema-reconciler.mjs';

const createBaseline = () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE astrologo_mapas (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL
    );
    CREATE TABLE astrologo_user_data (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      dados_json TEXT NOT NULL
    );
    CREATE TABLE astrologo_rate_limit_policies (
      route TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL,
      max_requests INTEGER NOT NULL,
      window_minutes INTEGER NOT NULL
    );
  `);
  return db;
};

const inspect = (db) =>
  inspectAstrologoSchema({
    tableInfoRows: db.prepare('PRAGMA table_info(astrologo_mapas)').all(),
    tableSql: db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'astrologo_mapas'").get()?.sql,
    indexRows: db
      .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'astrologo_mapas'")
      .all(),
    authReadPolicy:
      db
        .prepare(
          `SELECT route, enabled, max_requests, window_minutes
           FROM astrologo_rate_limit_policies
           WHERE route = 'astrologo/auth-read'`,
        )
        .get() ?? null,
  });

describe('Astrologo schema preflight', () => {
  it('plans every migration 017 guarantee when the schema is still at the baseline', () => {
    const db = createBaseline();
    const planned = planAstrologoSchemaReconciliation(inspect(db));

    expect(ASTROLOGO_SCHEMA_PREFLIGHT_VERSION).toBe('2.0.0');
    expect(ASTROLOGO_MAPAS_PREFLIGHT_COLUMNS).toEqual({
      email: "TEXT DEFAULT ''",
      save_claim_hash:
        "TEXT CHECK (save_claim_hash IS NULL OR (length(save_claim_hash) = 64 AND save_claim_hash NOT GLOB '*[^0-9a-f]*'))",
    });
    expect(planned).toEqual([
      "ALTER TABLE astrologo_mapas ADD COLUMN email TEXT DEFAULT ''",
      `ALTER TABLE astrologo_mapas ADD COLUMN save_claim_hash ${ASTROLOGO_MAPAS_PREFLIGHT_COLUMNS.save_claim_hash}`,
      ASTROLOGO_SAVED_MAPS_BACKFILL_SQL,
      ASTROLOGO_AUTH_READ_POLICY_SQL,
      ASTROLOGO_SAVE_CLAIM_INDEX_SQL,
    ]);
  });

  it('fails closed for an absent base table or an existing claim column without the canonical CHECK', () => {
    expect(() =>
      inspectAstrologoSchema({ tableInfoRows: [], tableSql: null, indexRows: [], authReadPolicy: null }),
    ).toThrow(/astrologo_mapas/);

    const db = createBaseline();
    db.exec(
      "ALTER TABLE astrologo_mapas ADD COLUMN email TEXT DEFAULT ''; ALTER TABLE astrologo_mapas ADD COLUMN save_claim_hash TEXT",
    );
    expect(() => planAstrologoSchemaReconciliation(inspect(db))).toThrow(/save_claim_hash.*CHECK/i);
  });

  it('reconciles migration 017 idempotently, tolerates malformed legacy JSON and preserves configured limits', async () => {
    const db = createBaseline();
    db.prepare('INSERT INTO astrologo_mapas (id, nome) VALUES (?, ?)').run('map-historical', 'Pessoa');
    db.prepare('INSERT INTO astrologo_user_data (id, email, dados_json) VALUES (?, ?, ?)').run(
      'legacy-invalid',
      'invalid@example.com',
      '{invalid-json',
    );
    db.prepare('INSERT INTO astrologo_user_data (id, email, dados_json) VALUES (?, ?, ?)').run(
      'legacy-valid',
      'Pessoa@Example.com',
      JSON.stringify({ mapasSalvos: [{ id: 'map-historical' }, 'entrada-antiga-inválida'] }),
    );
    db.prepare(
      `INSERT INTO astrologo_rate_limit_policies (route, enabled, max_requests, window_minutes)
       VALUES ('astrologo/auth-read', 1, 77, 19)`,
    ).run();

    const reconcile = () =>
      reconcileAstrologoSchema({
        inspect: async () => inspect(db),
        execute: async (statement) => db.exec(statement),
      });

    const first = await reconcile();
    expect(first.applied).toEqual([
      "ALTER TABLE astrologo_mapas ADD COLUMN email TEXT DEFAULT ''",
      `ALTER TABLE astrologo_mapas ADD COLUMN save_claim_hash ${ASTROLOGO_MAPAS_PREFLIGHT_COLUMNS.save_claim_hash}`,
      ASTROLOGO_SAVED_MAPS_BACKFILL_SQL,
      ASTROLOGO_SAVE_CLAIM_INDEX_SQL,
    ]);
    expect(db.prepare('SELECT email FROM astrologo_mapas WHERE id = ?').get('map-historical')).toEqual({
      email: 'pessoa@example.com',
    });
    expect(
      db
        .prepare('SELECT max_requests, window_minutes FROM astrologo_rate_limit_policies WHERE route = ?')
        .get('astrologo/auth-read'),
    ).toEqual({ max_requests: 77, window_minutes: 19 });
    expect(() =>
      db.prepare('UPDATE astrologo_mapas SET save_claim_hash = ? WHERE id = ?').run('not-a-hash', 'map-historical'),
    ).toThrow();
    expect(first.indexes).toContain(ASTROLOGO_SAVE_CLAIM_INDEX_NAME);

    const second = await reconcile();
    expect(second.applied).toEqual([ASTROLOGO_SAVED_MAPS_BACKFILL_SQL]);
  });
});
