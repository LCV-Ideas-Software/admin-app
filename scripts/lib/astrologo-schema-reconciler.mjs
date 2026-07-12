export const ASTROLOGO_SCHEMA_PREFLIGHT_VERSION = '1.0.0';

export const ASTROLOGO_MAPAS_PREFLIGHT_COLUMNS = Object.freeze({
  email: "TEXT DEFAULT ''",
});

const normalizeColumnNames = (rows) =>
  rows
    .map((row) => (typeof row?.name === 'string' ? row.name.trim().toLowerCase() : ''))
    .filter(Boolean);

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

export async function reconcileAstrologoMapasSchema({ inspect, execute }) {
  if (typeof inspect !== 'function' || typeof execute !== 'function') {
    throw new TypeError('O reconciliador requer funções inspect e execute.');
  }

  const before = await inspect();
  const statements = planAstrologoMapasReconciliation(before);
  for (const statement of statements) {
    await execute(statement);
  }

  const after = await inspect();
  const columns = normalizeColumnNames(after);
  const missing = Object.keys(ASTROLOGO_MAPAS_PREFLIGHT_COLUMNS).filter((column) => !columns.includes(column));
  if (missing.length > 0) {
    throw new Error(`Reconciliação incompleta de astrologo_mapas; colunas ausentes: ${missing.join(', ')}`);
  }

  return { applied: statements, columns };
}
