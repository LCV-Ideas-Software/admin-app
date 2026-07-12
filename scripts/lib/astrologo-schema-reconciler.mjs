export const ASTROLOGO_SCHEMA_PREFLIGHT_VERSION = '3.0.0';

const SAVE_CLAIM_HASH_DEFINITION =
  "TEXT CHECK (save_claim_hash IS NULL OR (length(save_claim_hash) = 64 AND save_claim_hash NOT GLOB '*[^0-9a-f]*'))";

export const ASTROLOGO_MAPAS_PREFLIGHT_COLUMNS = Object.freeze({
  email: "TEXT DEFAULT ''",
  save_claim_hash: SAVE_CLAIM_HASH_DEFINITION,
});

export const ASTROLOGO_SAVE_CLAIM_INDEX_NAME = 'idx_astrologo_mapas_unclaimed_save_claim';

export const ASTROLOGO_ANALYSIS_JOBS_TABLE_NAME = 'astrologo_ai_analysis_jobs';
export const ASTROLOGO_ANALYSIS_STEPS_TABLE_NAME = 'astrologo_ai_analysis_steps';

export const ASTROLOGO_ANALYSIS_JOBS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS ${ASTROLOGO_ANALYSIS_JOBS_TABLE_NAME} (
    id TEXT PRIMARY KEY,
    capability_hash TEXT NOT NULL CHECK (
        length(capability_hash) = 64 AND
        capability_hash NOT GLOB '*[^0-9a-f]*'
    ),
    mapa_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (
        status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
    ),
    phase TEXT NOT NULL DEFAULT 'planning' CHECK (
        phase IN ('planning', 'analyzing', 'reducing', 'synthesizing', 'completed', 'failed')
    ),
    lease_owner TEXT,
    lease_expires_at TEXT,
    completed_steps INTEGER NOT NULL DEFAULT 0 CHECK (completed_steps >= 0),
    total_steps INTEGER NOT NULL DEFAULT 0 CHECK (
        total_steps >= 0 AND completed_steps <= total_steps
    ),
    input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
    output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
    plan_json TEXT NOT NULL CHECK (json_valid(plan_json)),
    fixed_prompt_prefix TEXT NOT NULL,
    final_result_json TEXT CHECK (
        final_result_json IS NULL OR json_valid(final_result_json)
    ),
    error_code TEXT,
    error_detail TEXT,
    expires_at TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (mapa_id) REFERENCES astrologo_mapas(id) ON DELETE CASCADE
)`;

export const ASTROLOGO_ANALYSIS_STEPS_TABLE_SQL = `CREATE TABLE IF NOT EXISTS ${ASTROLOGO_ANALYSIS_STEPS_TABLE_NAME} (
    job_id TEXT NOT NULL,
    step_key TEXT NOT NULL CHECK (length(trim(step_key)) BETWEEN 1 AND 120),
    ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
    kind TEXT NOT NULL CHECK (
        kind IN ('direct', 'fragment', 'reduction', 'synthesis')
    ),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'running', 'completed', 'failed')
    ),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    lease_owner TEXT,
    lease_expires_at TEXT,
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
    result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json)),
    input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
    output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
    error_code TEXT,
    error_detail TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (job_id, step_key),
    FOREIGN KEY (job_id) REFERENCES ${ASTROLOGO_ANALYSIS_JOBS_TABLE_NAME}(id) ON DELETE CASCADE
)`;

export const ASTROLOGO_ANALYSIS_INDEXES = Object.freeze({
  idx_astrologo_ai_analysis_jobs_capability_hash:
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_astrologo_ai_analysis_jobs_capability_hash
ON ${ASTROLOGO_ANALYSIS_JOBS_TABLE_NAME}(capability_hash)`,
  idx_astrologo_ai_analysis_jobs_active_mapa:
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_astrologo_ai_analysis_jobs_active_mapa
ON ${ASTROLOGO_ANALYSIS_JOBS_TABLE_NAME}(mapa_id)
WHERE status IN ('queued', 'running')`,
  idx_astrologo_ai_analysis_jobs_mapa_status:
    `CREATE INDEX IF NOT EXISTS idx_astrologo_ai_analysis_jobs_mapa_status
ON ${ASTROLOGO_ANALYSIS_JOBS_TABLE_NAME}(mapa_id, status)`,
  idx_astrologo_ai_analysis_jobs_expires_at:
    `CREATE INDEX IF NOT EXISTS idx_astrologo_ai_analysis_jobs_expires_at
ON ${ASTROLOGO_ANALYSIS_JOBS_TABLE_NAME}(expires_at)`,
  idx_astrologo_ai_analysis_steps_job_ordinal:
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_astrologo_ai_analysis_steps_job_ordinal
ON ${ASTROLOGO_ANALYSIS_STEPS_TABLE_NAME}(job_id, ordinal)`,
  idx_astrologo_ai_analysis_steps_job_status_ordinal:
    `CREATE INDEX IF NOT EXISTS idx_astrologo_ai_analysis_steps_job_status_ordinal
ON ${ASTROLOGO_ANALYSIS_STEPS_TABLE_NAME}(job_id, status, ordinal)`,
});

export const ASTROLOGO_ANALYZE_STEP_POLICY_SQL = `INSERT OR IGNORE INTO astrologo_rate_limit_policies
    (route, enabled, max_requests, window_minutes)
VALUES ('astrologo/analisar-etapa', 1, 240, 60)`;

export const ASTROLOGO_SAVED_MAPS_BACKFILL_SQL = `WITH historical_ownership AS (
    SELECT
        json_extract(saved.value, '$.id') AS mapa_id,
        MIN(lower(trim(user_data.email))) AS owner_email,
        COUNT(DISTINCT lower(trim(user_data.email))) AS owner_count
    FROM astrologo_user_data AS user_data,
         json_each(
             CASE
                 WHEN json_valid(user_data.dados_json) THEN
                     CASE
                         WHEN json_type(user_data.dados_json, '$.mapasSalvos') = 'array'
                         THEN user_data.dados_json
                         ELSE '{"mapasSalvos":[]}'
                     END
                 ELSE '{"mapasSalvos":[]}'
             END,
             '$.mapasSalvos'
         ) AS saved
    WHERE CASE
              WHEN saved.type = 'object' THEN json_type(saved.value, '$.id') = 'text'
              ELSE 0
          END
      AND NULLIF(trim(user_data.email), '') IS NOT NULL
    GROUP BY json_extract(saved.value, '$.id')
)
UPDATE astrologo_mapas
SET email = (
    SELECT owner_email
    FROM historical_ownership
    WHERE historical_ownership.mapa_id = astrologo_mapas.id
      AND historical_ownership.owner_count = 1
)
WHERE NULLIF(trim(email), '') IS NULL
  AND id IN (
      SELECT mapa_id
      FROM historical_ownership
      WHERE owner_count = 1
  )`;

export const ASTROLOGO_AUTH_READ_POLICY_SQL = `INSERT OR IGNORE INTO astrologo_rate_limit_policies
    (route, enabled, max_requests, window_minutes)
VALUES ('astrologo/auth-read', 1, 60, 15)`;

export const ASTROLOGO_SAVE_CLAIM_INDEX_SQL = `CREATE INDEX IF NOT EXISTS ${ASTROLOGO_SAVE_CLAIM_INDEX_NAME}
ON astrologo_mapas(save_claim_hash)
WHERE save_claim_hash IS NOT NULL`;

const normalizeColumnNames = (rows) =>
  rows
    .map((row) => (typeof row?.name === 'string' ? row.name.trim().toLowerCase() : ''))
    .filter(Boolean);

const compactSql = (value) => (typeof value === 'string' ? value.replaceAll(/\s+/g, '').toLowerCase() : '');

const hasAllSqlFragments = (sql, fragments) => {
  const compact = compactSql(sql);
  return fragments.every((fragment) => compact.includes(compactSql(fragment)));
};

const hasCanonicalAnalysisJobsTable = (tableSql) =>
  hasAllSqlFragments(tableSql, [
    `CREATE TABLE ${ASTROLOGO_ANALYSIS_JOBS_TABLE_NAME}`,
    'id TEXT PRIMARY KEY',
    "capability_hash TEXT NOT NULL CHECK (length(capability_hash) = 64 AND capability_hash NOT GLOB '*[^0-9a-f]*')",
    'mapa_id TEXT NOT NULL',
    "status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled'))",
    "phase TEXT NOT NULL DEFAULT 'planning' CHECK (phase IN ('planning', 'analyzing', 'reducing', 'synthesizing', 'completed', 'failed'))",
    'lease_owner TEXT',
    'lease_expires_at TEXT',
    'completed_steps INTEGER NOT NULL DEFAULT 0 CHECK (completed_steps >= 0)',
    'total_steps INTEGER NOT NULL DEFAULT 0 CHECK (total_steps >= 0 AND completed_steps <= total_steps)',
    'input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0)',
    'output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0)',
    'plan_json TEXT NOT NULL CHECK (json_valid(plan_json))',
    'fixed_prompt_prefix TEXT NOT NULL',
    'final_result_json TEXT CHECK (final_result_json IS NULL OR json_valid(final_result_json))',
    'error_code TEXT',
    'error_detail TEXT',
    'expires_at TEXT NOT NULL',
    'completed_at TEXT',
    "created_at TEXT NOT NULL DEFAULT (datetime('now'))",
    "updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
    'FOREIGN KEY (mapa_id) REFERENCES astrologo_mapas(id) ON DELETE CASCADE',
  ]);

const hasCanonicalAnalysisStepsTable = (tableSql) =>
  hasAllSqlFragments(tableSql, [
    `CREATE TABLE ${ASTROLOGO_ANALYSIS_STEPS_TABLE_NAME}`,
    'job_id TEXT NOT NULL',
    'step_key TEXT NOT NULL CHECK (length(trim(step_key)) BETWEEN 1 AND 120)',
    'ordinal INTEGER NOT NULL CHECK (ordinal >= 0)',
    "kind TEXT NOT NULL CHECK (kind IN ('direct', 'fragment', 'reduction', 'synthesis'))",
    "status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed'))",
    'attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0)',
    'lease_owner TEXT',
    'lease_expires_at TEXT',
    'payload_json TEXT NOT NULL CHECK (json_valid(payload_json))',
    'result_json TEXT CHECK (result_json IS NULL OR json_valid(result_json))',
    'input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0)',
    'output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0)',
    'error_code TEXT',
    'error_detail TEXT',
    'started_at TEXT',
    'completed_at TEXT',
    "created_at TEXT NOT NULL DEFAULT (datetime('now'))",
    "updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
    'PRIMARY KEY (job_id, step_key)',
    `FOREIGN KEY (job_id) REFERENCES ${ASTROLOGO_ANALYSIS_JOBS_TABLE_NAME}(id) ON DELETE CASCADE`,
  ]);

const indexSqlMatches = (actualSql, expectedSql) => {
  const normalize = (sql) =>
    compactSql(sql)
      .replace('createuniqueindexifnotexists', 'createuniqueindex')
      .replace('createindexifnotexists', 'createindex');
  return normalize(actualSql) === normalize(expectedSql);
};

const planAnalysisIndexReconciliation = (indexRows) => {
  const rowsByName = new Map(indexRows.map((row) => [row?.name, row]));
  const planned = [];
  for (const [name, expectedSql] of Object.entries(ASTROLOGO_ANALYSIS_INDEXES)) {
    const current = rowsByName.get(name);
    if (!current) {
      planned.push(expectedSql);
      continue;
    }
    if (!indexSqlMatches(current.sql, expectedSql)) {
      throw new Error(`O índice ${name} existe com uma definição incompatível.`);
    }
  }
  return planned;
};

const hasCanonicalSaveClaimCheck = (tableSql) =>
  compactSql(tableSql).includes(
    "save_claim_hashtextcheck(save_claim_hashisnullor(length(save_claim_hash)=64andsave_claim_hashnotglob'*[^0-9a-f]*'))",
  );

const hasCanonicalSaveClaimIndex = (indexRows) => {
  const index = indexRows.find((row) => row?.name === ASTROLOGO_SAVE_CLAIM_INDEX_NAME);
  if (!index) return false;
  const sql = compactSql(index.sql);
  return (
    sql.startsWith('createindex') &&
    sql.includes(
      `${ASTROLOGO_SAVE_CLAIM_INDEX_NAME}onastrologo_mapas(save_claim_hash)wheresave_claim_hashisnotnull`,
    )
  );
};

export function inspectAstrologoSchema({
  tableInfoRows,
  tableSql,
  indexRows,
  authReadPolicy,
  analysisJobsTableSql = null,
  analysisStepsTableSql = null,
  analysisJobsIndexRows = [],
  analysisStepsIndexRows = [],
  analyzeStepPolicy = null,
  userDataTableExists = true,
}) {
  if (!Array.isArray(tableInfoRows) || tableInfoRows.length === 0) {
    throw new Error(
      'Tabela base astrologo_mapas não encontrada. Aplique a migration 001 antes do preflight do Astrólogo.',
    );
  }
  if (typeof tableSql !== 'string' || tableSql.trim().length === 0) {
    throw new Error('Não foi possível inspecionar o DDL canônico de astrologo_mapas.');
  }
  if (!Array.isArray(indexRows)) throw new TypeError('A inspeção dos índices de astrologo_mapas é obrigatória.');
  if (authReadPolicy !== null && (typeof authReadPolicy !== 'object' || authReadPolicy.route !== 'astrologo/auth-read')) {
    throw new TypeError('A policy inspecionada não corresponde a astrologo/auth-read.');
  }
  if (analysisJobsTableSql !== null && typeof analysisJobsTableSql !== 'string') {
    throw new TypeError(`O DDL de ${ASTROLOGO_ANALYSIS_JOBS_TABLE_NAME} deve ser texto ou null.`);
  }
  if (analysisStepsTableSql !== null && typeof analysisStepsTableSql !== 'string') {
    throw new TypeError(`O DDL de ${ASTROLOGO_ANALYSIS_STEPS_TABLE_NAME} deve ser texto ou null.`);
  }
  if (!Array.isArray(analysisJobsIndexRows) || !Array.isArray(analysisStepsIndexRows)) {
    throw new TypeError('A inspeção dos índices das análises reentrantes é obrigatória.');
  }
  if (
    analyzeStepPolicy !== null &&
    (typeof analyzeStepPolicy !== 'object' || analyzeStepPolicy.route !== 'astrologo/analisar-etapa')
  ) {
    throw new TypeError('A policy inspecionada não corresponde a astrologo/analisar-etapa.');
  }
  if (typeof userDataTableExists !== 'boolean') {
    throw new TypeError('A presença de astrologo_user_data deve ser informada como booleano.');
  }

  return {
    tableInfoRows,
    tableSql,
    indexRows,
    authReadPolicy,
    analysisJobsTableSql,
    analysisStepsTableSql,
    analysisJobsIndexRows,
    analysisStepsIndexRows,
    analyzeStepPolicy,
    userDataTableExists,
  };
}

export function planAstrologoMapasReconciliation(tableInfoRows) {
  if (!Array.isArray(tableInfoRows) || tableInfoRows.length === 0) {
    throw new Error(
      'Tabela base astrologo_mapas não encontrada. Aplique a migration 001 antes do preflight do Astrólogo.',
    );
  }

  const existing = new Set(normalizeColumnNames(tableInfoRows));
  return Object.entries(ASTROLOGO_MAPAS_PREFLIGHT_COLUMNS)
    .filter(([column]) => !existing.has(column))
    .map(([column, definition]) => `ALTER TABLE astrologo_mapas ADD COLUMN ${column} ${definition}`);
}

export function planAstrologoSchemaReconciliation(rawInspection) {
  const inspection = inspectAstrologoSchema(rawInspection);
  const columns = normalizeColumnNames(inspection.tableInfoRows);
  if (columns.includes('save_claim_hash') && !hasCanonicalSaveClaimCheck(inspection.tableSql)) {
    throw new Error('A coluna save_claim_hash existe sem o CHECK canônico de SHA-256 minúsculo.');
  }
  const namedIndex = inspection.indexRows.find((row) => row?.name === ASTROLOGO_SAVE_CLAIM_INDEX_NAME);
  if (namedIndex && !hasCanonicalSaveClaimIndex(inspection.indexRows)) {
    throw new Error(`O índice ${ASTROLOGO_SAVE_CLAIM_INDEX_NAME} existe com uma definição incompatível.`);
  }
  if (inspection.analysisJobsTableSql && !hasCanonicalAnalysisJobsTable(inspection.analysisJobsTableSql)) {
    throw new Error(`A tabela ${ASTROLOGO_ANALYSIS_JOBS_TABLE_NAME} existe com uma definição incompatível.`);
  }
  if (inspection.analysisStepsTableSql && !hasCanonicalAnalysisStepsTable(inspection.analysisStepsTableSql)) {
    throw new Error(`A tabela ${ASTROLOGO_ANALYSIS_STEPS_TABLE_NAME} existe com uma definição incompatível.`);
  }

  const analysisIndexRows = [...inspection.analysisJobsIndexRows, ...inspection.analysisStepsIndexRows];

  const statements = [...planAstrologoMapasReconciliation(inspection.tableInfoRows)];
  if (inspection.userDataTableExists) statements.push(ASTROLOGO_SAVED_MAPS_BACKFILL_SQL);
  if (!inspection.authReadPolicy) statements.push(ASTROLOGO_AUTH_READ_POLICY_SQL);
  if (!namedIndex) statements.push(ASTROLOGO_SAVE_CLAIM_INDEX_SQL);
  if (!inspection.analysisJobsTableSql) statements.push(ASTROLOGO_ANALYSIS_JOBS_TABLE_SQL);
  if (!inspection.analysisStepsTableSql) statements.push(ASTROLOGO_ANALYSIS_STEPS_TABLE_SQL);
  statements.push(...planAnalysisIndexReconciliation(analysisIndexRows));
  if (!inspection.analyzeStepPolicy) statements.push(ASTROLOGO_ANALYZE_STEP_POLICY_SQL);
  return statements;
}

const verifyAstrologoSchema = (rawInspection) => {
  const inspection = inspectAstrologoSchema(rawInspection);
  const columns = normalizeColumnNames(inspection.tableInfoRows);
  const missing = Object.keys(ASTROLOGO_MAPAS_PREFLIGHT_COLUMNS).filter((column) => !columns.includes(column));
  if (missing.length > 0) {
    throw new Error(`Reconciliação incompleta de astrologo_mapas; colunas ausentes: ${missing.join(', ')}`);
  }
  if (!hasCanonicalSaveClaimCheck(inspection.tableSql)) {
    throw new Error('Reconciliação incompleta: save_claim_hash não possui o CHECK canônico.');
  }
  if (!inspection.authReadPolicy) {
    throw new Error('Reconciliação incompleta: policy astrologo/auth-read ausente.');
  }
  if (!hasCanonicalSaveClaimIndex(inspection.indexRows)) {
    throw new Error(`Reconciliação incompleta: índice ${ASTROLOGO_SAVE_CLAIM_INDEX_NAME} ausente ou incompatível.`);
  }
  if (!hasCanonicalAnalysisJobsTable(inspection.analysisJobsTableSql)) {
    throw new Error(`Reconciliação incompleta: tabela ${ASTROLOGO_ANALYSIS_JOBS_TABLE_NAME} ausente ou incompatível.`);
  }
  if (!hasCanonicalAnalysisStepsTable(inspection.analysisStepsTableSql)) {
    throw new Error(`Reconciliação incompleta: tabela ${ASTROLOGO_ANALYSIS_STEPS_TABLE_NAME} ausente ou incompatível.`);
  }
  const analysisIndexRows = [...inspection.analysisJobsIndexRows, ...inspection.analysisStepsIndexRows];
  const missingAnalysisIndexes = planAnalysisIndexReconciliation(analysisIndexRows);
  if (missingAnalysisIndexes.length > 0) {
    throw new Error('Reconciliação incompleta: índices das análises reentrantes ausentes.');
  }
  if (!inspection.analyzeStepPolicy) {
    throw new Error('Reconciliação incompleta: policy astrologo/analisar-etapa ausente.');
  }
  return {
    columns,
    indexes: inspection.indexRows.map((row) => row.name).filter((name) => typeof name === 'string'),
    authReadPolicy: inspection.authReadPolicy,
    analysisTables: [ASTROLOGO_ANALYSIS_JOBS_TABLE_NAME, ASTROLOGO_ANALYSIS_STEPS_TABLE_NAME],
    analysisIndexes: analysisIndexRows.map((row) => row.name).filter((name) => typeof name === 'string'),
    analyzeStepPolicy: inspection.analyzeStepPolicy,
  };
};

export async function reconcileAstrologoSchema({ inspect, execute }) {
  if (typeof inspect !== 'function' || typeof execute !== 'function') {
    throw new TypeError('O reconciliador requer funções inspect e execute.');
  }

  const statements = planAstrologoSchemaReconciliation(await inspect());
  for (const statement of statements) {
    await execute(statement);
  }

  const verified = verifyAstrologoSchema(await inspect());
  return { applied: statements, ...verified };
}

export const reconcileAstrologoMapasSchema = reconcileAstrologoSchema;
