export const ASTROLOGO_SCHEMA_PREFLIGHT_VERSION = '2.0.0';

const SAVE_CLAIM_HASH_DEFINITION =
  "TEXT CHECK (save_claim_hash IS NULL OR (length(save_claim_hash) = 64 AND save_claim_hash NOT GLOB '*[^0-9a-f]*'))";

export const ASTROLOGO_MAPAS_PREFLIGHT_COLUMNS = Object.freeze({
  email: "TEXT DEFAULT ''",
  save_claim_hash: SAVE_CLAIM_HASH_DEFINITION,
});

export const ASTROLOGO_SAVE_CLAIM_INDEX_NAME = 'idx_astrologo_mapas_unclaimed_save_claim';

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

export function inspectAstrologoSchema({ tableInfoRows, tableSql, indexRows, authReadPolicy }) {
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

  return {
    tableInfoRows,
    tableSql,
    indexRows,
    authReadPolicy,
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

  const statements = [
    ...planAstrologoMapasReconciliation(inspection.tableInfoRows),
    ASTROLOGO_SAVED_MAPS_BACKFILL_SQL,
  ];
  if (!inspection.authReadPolicy) statements.push(ASTROLOGO_AUTH_READ_POLICY_SQL);
  if (!namedIndex) statements.push(ASTROLOGO_SAVE_CLAIM_INDEX_SQL);
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
  return {
    columns,
    indexes: inspection.indexRows.map((row) => row.name).filter((name) => typeof name === 'string'),
    authReadPolicy: inspection.authReadPolicy,
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
