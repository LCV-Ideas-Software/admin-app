import { describe, expect, it } from 'vitest';

import { onRequestPost } from './excluir.ts';

const createDb = () => ({
  prepare(query: string) {
    return {
      bind(..._values: unknown[]) {
        return {
          async run() {
            if (query.includes('DELETE FROM')) {
              return { meta: { changes: 1 } };
            }

            if (query.includes('UPDATE oraculo_user_data')) {
              return { meta: { changes: 1 } };
            }

            return { meta: { changes: 0 } };
          },
        };
      },
      async all() {
        if (query.includes('SELECT id, dados_json FROM oraculo_user_data')) {
          return {
            results: [
              {
                id: 'user-1',
                dados_json: JSON.stringify({
                  lciRegistros: [{ id: 'registro-1' }],
                }),
              },
            ],
          };
        }

        return { results: [] };
      },
    };
  },
});

describe('oraculo/excluir', () => {
  it('uses the authenticated Cloudflare Access identity instead of requiring X-Admin-Actor', async () => {
    const response = await onRequestPost({
      request: new Request('https://admin.lcv.app.br/api/oraculo/excluir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Access-Authenticated-User-Email': 'real-admin@lcv.app.br',
        },
        body: JSON.stringify({ id: 'registro-1', tipo: 'lci-lca', adminActor: 'spoofed@app.lcv' }),
      }),
      env: {
        BIGDATA_DB: createDb(),
      },
    });

    const payload = (await response.json()) as { ok: boolean; admin_actor?: string };

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.admin_actor).toBe('real-admin@lcv.app.br');
  });

  it('rejects the request when no admin actor can be resolved', async () => {
    const response = await onRequestPost({
      request: new Request('https://admin.lcv.app.br/api/oraculo/excluir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: 'registro-1', tipo: 'lci-lca' }),
      }),
      env: {
        BIGDATA_DB: createDb(),
      },
    });

    const payload = (await response.json()) as { ok: boolean; error?: string };

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe('Admin actor não resolvido.');
  });
});
