import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../functions/api/_lib/operational', () => ({
  logModuleOperationalEvent: vi.fn(async () => undefined),
}));

import { onRequestPost } from './ler.ts';

describe('astrologo ler', () => {
  it('seleciona e devolve o JSON posicional v2 sem transformá-lo', async () => {
    const dadosPosicionaisV2 = JSON.stringify({
      schemaId: 'urn:astrologo:dados-posicionais',
      schemaVersion: '2.0.0',
      calculationId: 'mapa-v2-001',
    });
    let selectedQuery = '';

    const db = {
      prepare(query: string) {
        selectedQuery = query;
        return {
          bind(id: string) {
            expect(id).toBe('mapa-v2-001');
            return {
              async first() {
                return {
                  id,
                  nome: 'Consulente V2',
                  dados_posicionais_v2: dadosPosicionaisV2,
                };
              },
            };
          },
        };
      },
    };

    const response = await onRequestPost({
      request: new Request('https://admin.lcv.app.br/api/astrologo/ler', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-admin-actor': 'admin@app.lcv' },
        body: JSON.stringify({ id: 'mapa-v2-001' }),
      }),
      env: { BIGDATA_DB: db },
    } as never);
    const payload = (await response.json()) as {
      ok: boolean;
      mapa: { dados_posicionais_v2: string };
    };

    expect(response.status).toBe(200);
    expect(selectedQuery).toContain('dados_posicionais_v2');
    expect(payload.ok).toBe(true);
    expect(payload.mapa.dados_posicionais_v2).toBe(dadosPosicionaisV2);
  });
});
