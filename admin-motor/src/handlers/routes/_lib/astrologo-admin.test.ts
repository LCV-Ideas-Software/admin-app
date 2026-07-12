import { describe, expect, it } from 'vitest';

import { ensureDefaultPolicies } from './astrologo-admin.ts';

describe('Astrologo rate-limit schema contract', () => {
  it('seeds policies without creating migrated tables at request time', async () => {
    const queries: string[] = [];
    const statement = {
      bind() {
        return statement;
      },
      async run() {
        return { meta: { changes: 0 } };
      },
      async first() {
        return null;
      },
      async all() {
        return { results: [] };
      },
    };
    const db = {
      prepare(query: string) {
        queries.push(query);
        return statement;
      },
    };

    await ensureDefaultPolicies(db as never);

    expect(queries.filter((query) => /CREATE\s+TABLE/i.test(query))).toEqual([]);
    expect(queries.filter((query) => /INSERT\s+OR\s+IGNORE/i.test(query))).toHaveLength(4);
  });
});
