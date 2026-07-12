import { describe, expect, it, vi } from 'vitest';

import {
  ASTROLOGO_MAPAS_PREFLIGHT_COLUMNS,
  ASTROLOGO_SCHEMA_PREFLIGHT_VERSION,
  planAstrologoMapasReconciliation,
  reconcileAstrologoMapasSchema,
} from '../../scripts/lib/astrologo-schema-reconciler.mjs';

const baseColumns = [{ name: 'id' }, { name: 'nome' }];

describe('Astrologo schema preflight', () => {
  it('plans the email ALTER only when the column is absent', () => {
    expect(ASTROLOGO_SCHEMA_PREFLIGHT_VERSION).toBe('1.0.0');
    expect(ASTROLOGO_MAPAS_PREFLIGHT_COLUMNS).toEqual({
      email: "TEXT DEFAULT ''",
    });
    expect(planAstrologoMapasReconciliation(baseColumns)).toEqual([
      "ALTER TABLE astrologo_mapas ADD COLUMN email TEXT DEFAULT ''",
    ]);
    expect(planAstrologoMapasReconciliation([...baseColumns, { name: 'email' }])).toEqual([]);
  });

  it('fails closed when the base table does not exist', () => {
    expect(() => planAstrologoMapasReconciliation([])).toThrow(/astrologo_mapas/);
  });

  it('executes and verifies every planned reconciliation statement', async () => {
    let columns = [...baseColumns];
    const inspect = vi.fn(async () => columns);
    const execute = vi.fn(async (statement) => {
      expect(statement).toBe("ALTER TABLE astrologo_mapas ADD COLUMN email TEXT DEFAULT ''");
      columns = [...columns, { name: 'email' }];
    });

    await expect(reconcileAstrologoMapasSchema({ inspect, execute })).resolves.toEqual({
      applied: ["ALTER TABLE astrologo_mapas ADD COLUMN email TEXT DEFAULT ''"],
      columns: ['id', 'nome', 'email'],
    });
    expect(inspect).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
