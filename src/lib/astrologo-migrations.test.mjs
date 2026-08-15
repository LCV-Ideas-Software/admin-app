import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migration = (name) => readFileSync(`${root}/db/migrations/${name}`, 'utf8');
const adminMigration = (name) => readFileSync(`${root}/db/admin-app-migrations/${name}`, 'utf8');
const tableColumns = (db, table) =>
  db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => row.name);
const tableIndexes = (db, table) =>
  db
    .prepare(`PRAGMA index_list(${table})`)
    .all()
    .map((row) => row.name);
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const prepareVersionedBaseline = () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(migration('001_bigdata_astrologo_prefixacao.sql'));
  db.exec(migration('014_bigdata_astrologo_positional_v2.sql'));
  db.exec(migration('014a_bigdata_astrologo_email.sql'));
  return db;
};
const prepareRuntimeDriftBaseline = () => {
  const db = prepareVersionedBaseline();
  db.exec(`
    CREATE TABLE admin_module_configs (
      module_key TEXT PRIMARY KEY,
      config_json TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE astrologo_user_data (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, dados_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE astrologo_auth_tokens (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, token TEXT NOT NULL, action TEXT NOT NULL,
      dados_json TEXT, expires_at TEXT NOT NULL, used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE ai_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      module TEXT NOT NULL, model TEXT NOT NULL, input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0, latency_ms INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ok', error_detail TEXT
    );
  `);
  db.exec(migration('015_bigdata_astrologo_schema_regularization.sql'));
  db.exec(migration('016_bigdata_astrologo_advanced_charts.sql'));
  return db;
};
const applyAdminMigration = (db, name) => {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(adminMigration(name));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

describe('canonical Astrologo BIGDATA_DB migrations', () => {
  it('creates durable reentrant AI jobs and ordered leased steps with cascading ownership', () => {
    const db = prepareVersionedBaseline();
    db.exec(migration('015_bigdata_astrologo_schema_regularization.sql'));
    db.exec(migration('016_bigdata_astrologo_advanced_charts.sql'));
    db.exec(migration('017_astrologo_saved_map_claims.sql'));
    const migration018 = migration('018_astrologo_reentrant_ai_analysis.sql');
    db.exec(migration018);
    expect(() => db.exec(migration018)).not.toThrow();

    db.prepare('INSERT INTO astrologo_mapas (id, nome) VALUES (?, ?)').run('map-analysis', 'Pessoa');
    expect(() =>
      db
        .prepare(
          `INSERT INTO astrologo_ai_analysis_jobs
           (id, capability_hash, mapa_id, plan_json, fixed_prompt_prefix, expires_at)
           VALUES (?, ?, ?, '{}', 'prefixo fixo', '2026-07-13T00:00:00Z')`,
        )
        .run('job-invalid', 'not-a-sha', 'map-analysis'),
    ).toThrow();
    db.prepare(
      `INSERT INTO astrologo_ai_analysis_jobs
       (id, capability_hash, mapa_id, plan_json, fixed_prompt_prefix, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      'job-valid',
      HASH_A,
      'map-analysis',
      JSON.stringify({ model: 'gemini', limits: {}, plan: [], mode: 'fragmented' }),
      'prefixo fixo',
      '2026-07-13T00:00:00Z',
    );
    expect(() =>
      db
        .prepare(
          `INSERT INTO astrologo_ai_analysis_jobs
           (id, capability_hash, mapa_id, plan_json, fixed_prompt_prefix, expires_at)
           VALUES ('job-concurrent', ?, ?, '{}', 'prefixo fixo', '2026-07-13T00:00:00Z')`,
        )
        .run(HASH_B, 'map-analysis'),
    ).toThrow();
    db.prepare(
      `INSERT INTO astrologo_ai_analysis_steps
       (job_id, step_key, ordinal, kind, payload_json)
       VALUES (?, 'natal', 0, 'fragment', '{}')`,
    ).run('job-valid');

    expect(() =>
      db
        .prepare(
          `INSERT INTO astrologo_ai_analysis_steps
           (job_id, step_key, ordinal, kind, payload_json)
           VALUES (?, 'duplicada', 0, 'fragment', '{}')`,
        )
        .run('job-valid'),
    ).toThrow();
    expect(tableIndexes(db, 'astrologo_ai_analysis_jobs')).toEqual(
      expect.arrayContaining([
        'idx_astrologo_ai_analysis_jobs_capability_hash',
        'idx_astrologo_ai_analysis_jobs_active_mapa',
        'idx_astrologo_ai_analysis_jobs_mapa_status',
        'idx_astrologo_ai_analysis_jobs_expires_at',
      ]),
    );
    expect(tableIndexes(db, 'astrologo_ai_analysis_steps')).toEqual(
      expect.arrayContaining([
        'idx_astrologo_ai_analysis_steps_job_ordinal',
        'idx_astrologo_ai_analysis_steps_job_status_ordinal',
      ]),
    );
    expect([
      ...tableIndexes(db, 'astrologo_ai_analysis_jobs'),
      ...tableIndexes(db, 'astrologo_ai_analysis_steps'),
    ]).toEqual(
      expect.arrayContaining([
        'idx_astrologo_ai_analysis_jobs_capability_hash',
        'idx_astrologo_ai_analysis_jobs_active_mapa',
        'idx_astrologo_ai_analysis_jobs_mapa_status',
        'idx_astrologo_ai_analysis_jobs_expires_at',
        'idx_astrologo_ai_analysis_steps_job_ordinal',
        'idx_astrologo_ai_analysis_steps_job_status_ordinal',
      ]),
    );
    expect(
      db
        .prepare('SELECT max_requests, window_minutes FROM astrologo_rate_limit_policies WHERE route = ?')
        .get('astrologo/analisar-etapa'),
    ).toEqual({ max_requests: 240, window_minutes: 60 });

    db.prepare("UPDATE astrologo_ai_analysis_jobs SET status = 'completed', phase = 'completed' WHERE id = ?").run(
      'job-valid',
    );
    expect(() =>
      db
        .prepare(
          `INSERT INTO astrologo_ai_analysis_jobs
           (id, capability_hash, mapa_id, plan_json, fixed_prompt_prefix, expires_at)
           VALUES ('job-next', ?, ?, '{}', 'prefixo fixo', '2026-07-13T00:00:00Z')`,
        )
        .run(HASH_B, 'map-analysis'),
    ).not.toThrow();

    db.prepare('DELETE FROM astrologo_mapas WHERE id = ?').run('map-analysis');
    expect(db.prepare('SELECT id FROM astrologo_ai_analysis_jobs WHERE id = ?').get('job-valid')).toBeUndefined();
    expect(db.prepare('SELECT id FROM astrologo_ai_analysis_jobs WHERE id = ?').get('job-next')).toBeUndefined();
    expect(
      db.prepare('SELECT step_key FROM astrologo_ai_analysis_steps WHERE job_id = ?').get('job-valid'),
    ).toBeUndefined();
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('adds save claims, backfills only unambiguous historical ownership, and separates authenticated reads', () => {
    const db = prepareVersionedBaseline();
    db.exec(migration('015_bigdata_astrologo_schema_regularization.sql'));
    db.exec(migration('016_bigdata_astrologo_advanced_charts.sql'));
    db.prepare('INSERT INTO astrologo_mapas (id, nome, email) VALUES (?, ?, NULL)').run('map-historical', 'Pessoa');
    db.prepare('INSERT INTO astrologo_mapas (id, nome, email) VALUES (?, ?, NULL)').run('map-conflict', 'Conflito');
    db.prepare('INSERT INTO astrologo_mapas (id, nome, email) VALUES (?, ?, ?)').run(
      'map-owned',
      'Proprietário existente',
      'owner@example.com',
    );
    db.prepare('INSERT INTO astrologo_user_data (id, email, dados_json) VALUES (?, ?, ?)').run(
      'user-a',
      'Pessoa@Example.com',
      JSON.stringify({
        mapasSalvos: [{ id: 'map-historical' }, { id: 'map-conflict' }, { id: 'map-owned' }, 'entrada-legada-inválida'],
      }),
    );
    db.prepare('INSERT INTO astrologo_user_data (id, email, dados_json) VALUES (?, ?, ?)').run(
      'user-b',
      'outra@example.com',
      JSON.stringify({ mapasSalvos: [{ id: 'map-conflict' }] }),
    );

    const migration017 = migration('017_astrologo_saved_map_claims.sql');
    db.exec(migration017);

    expect(tableColumns(db, 'astrologo_mapas')).toContain('save_claim_hash');
    expect(db.prepare('SELECT email FROM astrologo_mapas WHERE id = ?').get('map-historical').email).toBe(
      'pessoa@example.com',
    );
    expect(db.prepare('SELECT email FROM astrologo_mapas WHERE id = ?').get('map-conflict').email).toBeNull();
    expect(db.prepare('SELECT email FROM astrologo_mapas WHERE id = ?').get('map-owned').email).toBe(
      'owner@example.com',
    );
    expect(
      db
        .prepare('SELECT max_requests, window_minutes FROM astrologo_rate_limit_policies WHERE route = ?')
        .get('astrologo/auth-read'),
    ).toEqual({ max_requests: 60, window_minutes: 15 });
    expect(() =>
      db.prepare('UPDATE astrologo_mapas SET save_claim_hash = ? WHERE id = ?').run('not-a-hash', 'map-historical'),
    ).toThrow();
    expect(() =>
      db.prepare('UPDATE astrologo_mapas SET save_claim_hash = ? WHERE id = ?').run('A'.repeat(64), 'map-historical'),
    ).toThrow();
    expect(() =>
      db.prepare('UPDATE astrologo_mapas SET save_claim_hash = ? WHERE id = ?').run(HASH_A, 'map-historical'),
    ).not.toThrow();
    expect(tableIndexes(db, 'astrologo_mapas')).toContain('idx_astrologo_mapas_unclaimed_save_claim');
  });

  it('regularizes the runtime-created schema and canonical module config', () => {
    const db = prepareVersionedBaseline();
    db.exec(migration('015_bigdata_astrologo_schema_regularization.sql'));

    expect(tableColumns(db, 'astrologo_mapas')).toEqual(
      expect.arrayContaining(['email', 'dados_posicionais_v2', 'data_analise']),
    );
    expect(tableColumns(db, 'astrologo_user_data')).toEqual(
      expect.arrayContaining(['id', 'email', 'dados_json', 'created_at', 'updated_at']),
    );
    expect(tableColumns(db, 'astrologo_auth_tokens')).toEqual(
      expect.arrayContaining(['id', 'email', 'token', 'action', 'dados_json', 'expires_at', 'used']),
    );
    expect(tableColumns(db, 'admin_module_configs')).toEqual(
      expect.arrayContaining(['module_key', 'config_json', 'updated_at']),
    );

    const config = db
      .prepare("SELECT config_json FROM admin_module_configs WHERE module_key = 'astrologo-config'")
      .get();
    expect(JSON.parse(config.config_json)).toEqual({ modeloSintese: '' });
    expect(tableIndexes(db, 'astrologo_user_data')).toContain('idx_astrologo_user_data_email_normalized');
    expect(tableIndexes(db, 'astrologo_auth_tokens')).toContain('idx_astrologo_auth_tokens_email_action_used_expires');
  });

  it('upgrades the observed runtime-created baseline without overwriting the selected model', () => {
    const db = prepareVersionedBaseline();
    db.exec(`
      CREATE TABLE admin_module_configs (
        module_key TEXT PRIMARY KEY,
        config_json TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE astrologo_user_data (
        id TEXT PRIMARY KEY, email TEXT NOT NULL, dados_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE astrologo_auth_tokens (
        id TEXT PRIMARY KEY, email TEXT NOT NULL, token TEXT NOT NULL, action TEXT NOT NULL,
        dados_json TEXT, expires_at TEXT NOT NULL, used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE ai_usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        module TEXT NOT NULL, model TEXT NOT NULL, input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0, latency_ms INTEGER DEFAULT 0,
        status TEXT DEFAULT 'ok', error_detail TEXT
      );
      INSERT INTO admin_module_configs (module_key, config_json)
      VALUES ('astrologo-config', '{"modeloSintese":"gemini-selected"}');
    `);

    expect(() => db.exec(migration('015_bigdata_astrologo_schema_regularization.sql'))).not.toThrow();
    const config = db
      .prepare("SELECT config_json FROM admin_module_configs WHERE module_key = 'astrologo-config'")
      .get();
    expect(JSON.parse(config.config_json)).toEqual({ modeloSintese: 'gemini-selected' });
    expect(tableColumns(db, 'astrologo_mapas')).toContain('data_analise');
  });

  it('atomically regularizes live tables while preserving saved children, indexes, and sequence', () => {
    const db = prepareRuntimeDriftBaseline();
    db.prepare('INSERT INTO astrologo_mapas (id, nome) VALUES (?, ?)').run('map-migrated', 'Pessoa');
    db.prepare('INSERT INTO astrologo_user_data (id, email, dados_json) VALUES (?, ?, ?)').run(
      'user-migrated',
      'owner@example.com',
      JSON.stringify({ mapasSalvos: [{ id: 'map-migrated' }] }),
    );
    db.prepare(
      `INSERT INTO astrologo_auth_tokens
       (id, email, token, action, dados_json, expires_at, used)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'token-migrated',
      'owner@example.com',
      'token-value',
      'read',
      JSON.stringify({ mapaId: 'map-migrated' }),
      '2026-08-16T00:00:00Z',
      0,
    );
    db.prepare('UPDATE admin_module_configs SET config_json = ? WHERE module_key = ?').run(
      JSON.stringify({ modeloSintese: 'gemini-selected' }),
      'astrologo-config',
    );
    db.prepare(
      `INSERT INTO ai_usage_logs
       (id, module, model, input_tokens, output_tokens, latency_ms, status)
       VALUES (420, 'astrologo', 'gemini-selected', 10, 20, 30, 'ok')`,
    ).run();
    db.prepare("UPDATE sqlite_sequence SET seq = 999 WHERE name = 'ai_usage_logs'").run();
    db.prepare(
      `INSERT INTO astrologo_user_saved_items
       (id, user_data_id, mapa_id, label)
       VALUES (?, ?, ?, ?)`,
    ).run('saved-item-1', 'user-migrated', 'map-migrated', 'Mapa preservado');

    applyAdminMigration(db, '0001_regularize_astrologo_runtime_tables.sql');

    expect(db.prepare('SELECT COUNT(*) AS total FROM astrologo_user_data').get()).toEqual({ total: 1 });
    expect(db.prepare('SELECT COUNT(*) AS total FROM astrologo_auth_tokens').get()).toEqual({ total: 1 });
    expect(db.prepare('SELECT COUNT(*) AS total FROM astrologo_user_saved_items').get()).toEqual({ total: 1 });
    expect(db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'ai_usage_logs'").get()).toEqual({ seq: 999 });
    expect(
      [
        ...tableIndexes(db, 'astrologo_user_data'),
        ...tableIndexes(db, 'astrologo_auth_tokens'),
        ...tableIndexes(db, 'admin_module_configs'),
        ...tableIndexes(db, 'ai_usage_logs'),
        ...tableIndexes(db, 'astrologo_user_saved_items'),
      ].filter((name) => !name.startsWith('sqlite_autoindex_')),
    ).toHaveLength(13);
    expect(() =>
      db
        .prepare('INSERT INTO astrologo_user_data (id, email, dados_json) VALUES (?, ?, ?)')
        .run('user-invalid', 'invalid@example.com', 'not-json'),
    ).toThrow();
    expect(() =>
      db
        .prepare('INSERT INTO astrologo_user_data (id, email, dados_json) VALUES (?, ?, ?)')
        .run('user-duplicate', ' OWNER@example.com ', '{}'),
    ).toThrow();
    expect(() =>
      db
        .prepare(
          'INSERT INTO astrologo_auth_tokens (id, email, token, action, expires_at, used) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run('token-invalid', 'invalid@example.com', 'token', 'read', '2026-08-16T00:00:00Z', 2),
    ).toThrow();
    expect(() =>
      db
        .prepare('INSERT INTO admin_module_configs (module_key, config_json) VALUES (?, ?)')
        .run('invalid-config', 'not-json'),
    ).toThrow();
    expect(() =>
      db
        .prepare(
          `INSERT INTO ai_usage_logs
           (module, model, input_tokens, output_tokens, latency_ms, status)
           VALUES ('astrologo', 'gemini', -1, 0, 0, 'error')`,
        )
        .run(),
    ).toThrow();
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('rolls back the official migration when legacy data violates the canonical constraints', () => {
    const db = prepareRuntimeDriftBaseline();
    db.prepare('INSERT INTO astrologo_mapas (id, nome) VALUES (?, ?)').run('map-rollback', 'Pessoa');
    db.prepare('INSERT INTO astrologo_user_data (id, email, dados_json) VALUES (?, ?, ?)').run(
      'user-rollback',
      'rollback@example.com',
      'not-json',
    );
    db.prepare('INSERT INTO astrologo_user_saved_items (id, user_data_id, mapa_id) VALUES (?, ?, ?)').run(
      'saved-rollback',
      'user-rollback',
      'map-rollback',
    );

    expect(() => applyAdminMigration(db, '0001_regularize_astrologo_runtime_tables.sql')).toThrow();

    expect(db.prepare('SELECT dados_json FROM astrologo_user_data WHERE id = ?').get('user-rollback')).toEqual({
      dados_json: 'not-json',
    });
    expect(db.prepare('SELECT id FROM astrologo_user_saved_items WHERE id = ?').get('saved-rollback')).toEqual({
      id: 'saved-rollback',
    });
    expect(
      db.prepare("SELECT COUNT(*) AS total FROM sqlite_master WHERE name LIKE '__admin_app_0001_%'").get(),
    ).toEqual({ total: 0 });
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('creates the seven advanced entities with enforced foreign keys', () => {
    const db = prepareVersionedBaseline();
    db.exec(migration('015_bigdata_astrologo_schema_regularization.sql'));
    db.exec(migration('016_bigdata_astrologo_advanced_charts.sql'));
    expect(() => db.exec(migration('016_bigdata_astrologo_advanced_charts.sql'))).not.toThrow();

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'astrologo_%'")
      .all()
      .map((row) => row.name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'astrologo_artifacts',
        'astrologo_transit_runs',
        'astrologo_synastry_runs',
        'astrologo_locality_runs',
        'astrologo_ai_analyses',
        'astrologo_render_assets',
        'astrologo_user_saved_items',
      ]),
    );

    for (const table of tables.filter((name) => name.match(/artifacts|_runs|analyses|assets|saved_items/))) {
      expect(db.prepare(`PRAGMA foreign_key_list(${table})`).all().length, `${table} foreign keys`).toBeGreaterThan(0);
      expect(tableColumns(db, table), `${table} updated_at`).toContain('updated_at');
    }

    expect(tableIndexes(db, 'astrologo_ai_analyses')).toEqual(
      expect.arrayContaining([
        'idx_astrologo_ai_analyses_source_artifact',
        'idx_astrologo_ai_analyses_transit_run',
        'idx_astrologo_ai_analyses_synastry_run',
        'idx_astrologo_ai_analyses_locality_run',
        'idx_astrologo_ai_analyses_status_updated',
      ]),
    );
  });

  it('enforces hashes, ready payloads, canonical synastry subjects, and cascades', () => {
    const db = prepareVersionedBaseline();
    db.exec(migration('015_bigdata_astrologo_schema_regularization.sql'));
    db.exec(migration('016_bigdata_astrologo_advanced_charts.sql'));
    db.prepare('INSERT INTO astrologo_mapas (id, nome) VALUES (?, ?)').run('map-primary', 'Pessoa A');
    db.prepare('INSERT INTO astrologo_mapas (id, nome) VALUES (?, ?)').run('map-second', 'Pessoa B');

    expect(() =>
      db
        .prepare(
          `INSERT INTO astrologo_artifacts
           (id, mapa_id, artifact_type, schema_id, schema_version, source_hash, status)
           VALUES (?, ?, 'natal_chart_analysis', ?, '1.0.0', ?, 'ready')`,
        )
        .run('artifact-invalid', 'map-primary', 'urn:astrologo:natal', HASH_A),
    ).toThrow();
    expect(() =>
      db
        .prepare(
          `INSERT INTO astrologo_artifacts
           (id, mapa_id, artifact_type, schema_id, schema_version, source_hash, status)
           VALUES (?, ?, 'natal_chart_analysis', ?, '1.0.0', 'not-a-sha', 'pending')`,
        )
        .run('artifact-badhash', 'map-primary', 'urn:astrologo:natal'),
    ).toThrow();

    db.prepare(
      `INSERT INTO astrologo_synastry_runs
       (id, primary_mapa_id, secondary_mapa_id, subject_a_hash, subject_b_hash,
        consent_recorded_at, orb_profile_id, source_hash, status)
       VALUES (?, ?, ?, ?, ?, '2026-07-12T12:00:00Z', 'western-synastry-standard-v1', ?, 'processing')`,
    ).run('synastry-valid', 'map-primary', 'map-second', HASH_A, HASH_B, HASH_A);

    expect(() =>
      db
        .prepare(
          `INSERT INTO astrologo_synastry_runs
           (id, primary_mapa_id, secondary_mapa_id, subject_a_hash, subject_b_hash,
            consent_recorded_at, orb_profile_id, source_hash, status)
           VALUES (?, ?, NULL, ?, ?, '2026-07-12T12:00:00Z', 'western-synastry-standard-v1', ?, 'processing')`,
        )
        .run('synastry-invalid', 'map-primary', HASH_A, HASH_B, HASH_B),
    ).toThrow();

    db.prepare(
      `INSERT INTO astrologo_artifacts
       (id, mapa_id, synastry_run_id, artifact_type, schema_id, schema_version, source_hash, payload_json, status)
       VALUES (?, ?, ?, 'synastry_result', ?, '1.0.0', ?, '{}', 'ready')`,
    ).run('artifact-synastry', 'map-primary', 'synastry-valid', 'urn:astrologo:synastry', HASH_A);
    db.prepare(
      `UPDATE astrologo_synastry_runs
       SET status = 'ready', result_artifact_id = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run('artifact-synastry', 'synastry-valid');

    db.prepare('DELETE FROM astrologo_mapas WHERE id = ?').run('map-second');
    expect(db.prepare('SELECT id FROM astrologo_synastry_runs WHERE id = ?').get('synastry-valid')).toBeUndefined();
    expect(db.prepare('SELECT id FROM astrologo_artifacts WHERE id = ?').get('artifact-synastry')).toBeUndefined();
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('removes dedicated secondary synastry maps without deleting an independently owned map', () => {
    const db = prepareVersionedBaseline();
    db.exec(migration('015_bigdata_astrologo_schema_regularization.sql'));
    db.exec(migration('016_bigdata_astrologo_advanced_charts.sql'));
    db.prepare('INSERT INTO astrologo_mapas (id, nome, email) VALUES (?, ?, ?)').run(
      'map-primary-privacy',
      'Pessoa principal',
      'principal@example.com',
    );
    db.prepare('INSERT INTO astrologo_mapas (id, nome, email) VALUES (?, ?, NULL)').run(
      'map-secondary-private',
      'Pessoa secundária',
    );
    db.prepare('INSERT INTO astrologo_mapas (id, nome, email) VALUES (?, ?, ?)').run(
      'map-secondary-blank',
      'Pessoa secundária sem e-mail',
      '',
    );
    db.prepare('INSERT INTO astrologo_mapas (id, nome, email) VALUES (?, ?, ?)').run(
      'map-secondary-owned',
      'Pessoa secundária proprietária',
      'secondary@example.com',
    );
    db.prepare(
      `INSERT INTO astrologo_synastry_runs
       (id, primary_mapa_id, secondary_mapa_id, subject_a_hash, subject_b_hash,
        consent_recorded_at, orb_profile_id, source_hash, status)
       VALUES (?, ?, ?, ?, ?, '2026-07-12T12:00:00Z', 'western-synastry-standard-v1', ?, 'processing')`,
    ).run('synastry-privacy', 'map-primary-privacy', 'map-secondary-private', HASH_A, HASH_B, HASH_A);
    for (const [runId, secondaryId, sourceHash] of [
      ['synastry-privacy-blank', 'map-secondary-blank', HASH_B],
      ['synastry-privacy-owned', 'map-secondary-owned', 'c'.repeat(64)],
    ]) {
      db.prepare(
        `INSERT INTO astrologo_synastry_runs
         (id, primary_mapa_id, secondary_mapa_id, subject_a_hash, subject_b_hash,
          consent_recorded_at, orb_profile_id, source_hash, status)
         VALUES (?, 'map-primary-privacy', ?, ?, ?, '2026-07-12T12:00:00Z',
                 'western-synastry-standard-v1', ?, 'processing')`,
      ).run(runId, secondaryId, HASH_A, HASH_B, sourceHash);
    }

    db.prepare('DELETE FROM astrologo_mapas WHERE id = ?').run('map-primary-privacy');

    expect(db.prepare('SELECT id FROM astrologo_mapas WHERE id = ?').get('map-secondary-private')).toBeUndefined();
    expect(db.prepare('SELECT id FROM astrologo_mapas WHERE id = ?').get('map-secondary-blank')).toBeUndefined();
    expect(db.prepare('SELECT id FROM astrologo_mapas WHERE id = ?').get('map-secondary-owned')).toEqual({
      id: 'map-secondary-owned',
    });
    expect(db.prepare('SELECT id FROM astrologo_synastry_runs WHERE id = ?').get('synastry-privacy')).toBeUndefined();
    expect(db.prepare('SELECT COUNT(*) AS total FROM astrologo_synastry_runs').get()).toEqual({ total: 0 });
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });

  it('preserves a technical map that is shared or acts as the primary subject of another run', () => {
    const db = prepareVersionedBaseline();
    db.exec(migration('015_bigdata_astrologo_schema_regularization.sql'));
    db.exec(migration('016_bigdata_astrologo_advanced_charts.sql'));
    for (const [id, nome, email] of [
      ['map-primary-delete', 'Pessoa a excluir', 'delete@example.com'],
      ['map-primary-retain', 'Pessoa preservada', 'retain@example.com'],
      ['map-shared-tech', 'Pessoa técnica compartilhada', null],
      ['map-primary-tech', 'Pessoa técnica também primária', null],
      ['map-tertiary-owned', 'Pessoa terciária proprietária', 'tertiary@example.com'],
    ]) {
      db.prepare('INSERT INTO astrologo_mapas (id, nome, email) VALUES (?, ?, ?)').run(id, nome, email);
    }
    const insertRun = db.prepare(
      `INSERT INTO astrologo_synastry_runs
       (id, primary_mapa_id, secondary_mapa_id, subject_a_hash, subject_b_hash,
        consent_recorded_at, orb_profile_id, source_hash, status)
       VALUES (?, ?, ?, ?, ?, '2026-07-12T12:00:00Z',
               'western-synastry-standard-v1', ?, 'processing')`,
    );
    insertRun.run('run-delete-shared', 'map-primary-delete', 'map-shared-tech', HASH_A, HASH_B, HASH_A);
    insertRun.run('run-retain-shared', 'map-primary-retain', 'map-shared-tech', HASH_A, HASH_B, HASH_B);
    insertRun.run('run-delete-primary-tech', 'map-primary-delete', 'map-primary-tech', HASH_A, HASH_B, 'c'.repeat(64));
    insertRun.run(
      'run-primary-tech-tertiary',
      'map-primary-tech',
      'map-tertiary-owned',
      HASH_A,
      HASH_B,
      'd'.repeat(64),
    );

    db.prepare('DELETE FROM astrologo_mapas WHERE id = ?').run('map-primary-delete');

    expect(db.prepare('SELECT id FROM astrologo_mapas WHERE id = ?').get('map-shared-tech')).toEqual({
      id: 'map-shared-tech',
    });
    expect(db.prepare('SELECT id FROM astrologo_mapas WHERE id = ?').get('map-primary-tech')).toEqual({
      id: 'map-primary-tech',
    });
    expect(db.prepare('SELECT id FROM astrologo_synastry_runs WHERE id = ?').get('run-retain-shared')).toEqual({
      id: 'run-retain-shared',
    });
    expect(db.prepare('SELECT id FROM astrologo_synastry_runs WHERE id = ?').get('run-primary-tech-tertiary')).toEqual({
      id: 'run-primary-tech-tertiary',
    });
    expect(db.prepare('SELECT id FROM astrologo_synastry_runs WHERE id = ?').get('run-delete-shared')).toBeUndefined();
    expect(
      db.prepare('SELECT id FROM astrologo_synastry_runs WHERE id = ?').get('run-delete-primary-tech'),
    ).toBeUndefined();
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
});
