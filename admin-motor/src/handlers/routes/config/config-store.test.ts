import { describe, expect, it } from 'vitest';

import { onRequestPost } from './config-store.ts';

describe('config-store canonical persistence', () => {
  it('persists astrologo-config/modeloSintese without runtime DDL', async () => {
    const preparedQueries: string[] = [];
    const boundValues: unknown[][] = [];
    const db = {
      prepare(query: string) {
        preparedQueries.push(query);
        return {
          bind(...values: unknown[]) {
            boundValues.push(values);
            return {
              async run() {
                return { meta: { changes: 1 } };
              },
            };
          },
          async run() {
            return { meta: { changes: 0 } };
          },
        };
      },
    };

    const response = await onRequestPost({
      request: new Request('https://admin.lcv.app.br/api/config-store', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          module: 'astrologo-config',
          config: { modeloSintese: 'gemini-2.5-flash' },
        }),
      }),
      env: { BIGDATA_DB: db },
    } as never);

    expect(response.status).toBe(200);
    expect(preparedQueries).toHaveLength(1);
    expect(preparedQueries[0]).toContain('INSERT INTO admin_module_configs');
    expect(preparedQueries[0]).not.toMatch(/CREATE\s+TABLE/i);
    expect(boundValues).toEqual([['astrologo-config', JSON.stringify({ modeloSintese: 'gemini-2.5-flash' })]]);
  });
});
