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
    const selectedQueries: string[] = [];

    const db = {
      prepare(query: string) {
        selectedQueries.push(query);
        return {
          bind(id: string) {
            expect(id).toBe('mapa-v2-001');
            return {
              async first() {
                if (query.includes('FROM astrologo_artifacts')) return null;
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
    expect(selectedQueries.some((query) => query.includes('dados_posicionais_v2'))).toBe(true);
    expect(payload.ok).toBe(true);
    expect(payload.mapa.dados_posicionais_v2).toBe(dadosPosicionaisV2);
  });

  it('rehydrates the most recent ready natal artifact without parsing it in the route', async () => {
    const payloadJson = JSON.stringify({ schemaId: 'urn:astrologo:natal-chart-analysis', schemaVersion: '1.0.0' });
    const queries: string[] = [];
    const db = {
      prepare(query: string) {
        queries.push(query);
        return {
          bind(id: string) {
            expect(id).toBe('mapa-natal-001');
            return {
              async first() {
                if (query.includes('FROM astrologo_artifacts')) {
                  return {
                    id: 'artifact-natal-001',
                    schema_id: 'urn:astrologo:natal-chart-analysis',
                    schema_version: '1.0.0',
                    source_hash: 'a'.repeat(64),
                    payload_json: payloadJson,
                    diagnostic_json: '[]',
                    created_at: '2026-07-12 12:00:00',
                    updated_at: '2026-07-12 13:00:00',
                  };
                }
                return { id, nome: 'Consulente Natal' };
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
        body: JSON.stringify({ id: 'mapa-natal-001' }),
      }),
      env: { BIGDATA_DB: db },
    } as never);
    const body = (await response.json()) as {
      mapa: { natal_chart_analysis_v1: string; natal_chart_analysis_artifact: { id: string } };
    };

    expect(response.status).toBe(200);
    const artifactQuery = queries.find((query) => query.includes('FROM astrologo_artifacts'));
    expect(artifactQuery).toMatch(/artifact_type\s*=\s*'natal_chart_analysis'/);
    expect(artifactQuery).toMatch(/schema_id\s*=\s*'urn:astrologo:natal-chart-analysis'/);
    expect(artifactQuery).toMatch(/schema_version\s*=\s*'1\.0\.0'/);
    expect(artifactQuery).toMatch(/status\s*=\s*'ready'/);
    expect(artifactQuery).toMatch(/ORDER BY[\s\S]*updated_at[\s\S]*DESC/);
    expect(body.mapa.natal_chart_analysis_v1).toBe(payloadJson);
    expect(body.mapa.natal_chart_analysis_artifact.id).toBe('artifact-natal-001');
  });

  it('keeps legacy map reading available when the artifacts table is absent', async () => {
    const db = {
      prepare(query: string) {
        return {
          bind() {
            return {
              async first() {
                if (query.includes('FROM astrologo_artifacts')) throw new Error('no such table: astrologo_artifacts');
                return { id: 'mapa-legado-001', nome: 'Consulente legado' };
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
        body: JSON.stringify({ id: 'mapa-legado-001' }),
      }),
      env: { BIGDATA_DB: db },
    } as never);
    const body = (await response.json()) as { ok: boolean; mapa: { natal_chart_analysis_v1: null } };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.mapa.natal_chart_analysis_v1).toBeNull();
  });

  it('rehydrates the latest ready transit and synastry artifacts with reciprocal subject names', async () => {
    const transitPayload = JSON.stringify({ schemaId: 'urn:astrologo:transit-run', schemaVersion: '1.0.0' });
    const synastryPayload = JSON.stringify({ schemaId: 'urn:astrologo:synastry-run', schemaVersion: '1.0.0' });
    const artifactTypes: string[] = [];
    const queries: string[] = [];
    const db = {
      prepare(query: string) {
        queries.push(query);
        return {
          bind(id: string, artifactType?: string) {
            expect(id).toBe('mapa-avancado-001');
            if (artifactType) artifactTypes.push(artifactType);
            return {
              async first() {
                if (!query.includes('FROM astrologo_artifacts')) {
                  return { id, nome: 'João Antônio' };
                }
                if (artifactType === 'transit_result') {
                  return {
                    id: 'artifact-transit-001',
                    schema_id: 'urn:astrologo:transit-run',
                    schema_version: '1.0.0',
                    source_hash: 'c'.repeat(64),
                    payload_json: transitPayload,
                    diagnostic_json: '[]',
                    created_at: '2026-07-12 13:00:00',
                    updated_at: '2026-07-12 14:00:00',
                    primary_subject_name: null,
                    secondary_subject_name: null,
                  };
                }
                if (artifactType === 'synastry_result') {
                  return {
                    id: 'artifact-synastry-001',
                    schema_id: 'urn:astrologo:synastry-run',
                    schema_version: '1.0.0',
                    source_hash: 'd'.repeat(64),
                    payload_json: synastryPayload,
                    diagnostic_json: '[]',
                    created_at: '2026-07-12 13:30:00',
                    updated_at: '2026-07-12 14:30:00',
                    primary_subject_name: 'João Antônio',
                    secondary_subject_name: 'Leonardo Cardozo',
                    primary_calculation_id: 'mapa-avancado-001',
                    secondary_calculation_id: 'mapa-avancado-002',
                  };
                }
                return null;
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
        body: JSON.stringify({ id: 'mapa-avancado-001' }),
      }),
      env: { BIGDATA_DB: db },
    } as never);
    const body = (await response.json()) as {
      mapa: {
        transit_run_v1: string;
        synastry_run_v1: string;
        synastry_subjects: {
          A: string;
          B: string;
          primaryCalculationId: string;
          secondaryCalculationId: string;
        };
      };
    };

    expect(response.status).toBe(200);
    expect(artifactTypes).toEqual(expect.arrayContaining(['transit_result', 'synastry_result']));
    const transitQuery = queries.find((query) => query.includes('astrologo_transit_runs'));
    expect(transitQuery).toMatch(/transit_run\.status\s*=\s*'ready'/);
    expect(transitQuery).toMatch(/transit_run\.result_artifact_id\s*=\s*artifact\.id/);
    expect(transitQuery).toMatch(/artifact\.schema_id\s*=\s*'urn:astrologo:transit-run'/);
    expect(transitQuery).toMatch(/artifact\.schema_version\s*=\s*'1\.0\.0'/);
    const synastryQuery = queries.find((query) => query.includes('astrologo_synastry_runs'));
    expect(synastryQuery).toMatch(/\?\s+IN\s+\(synastry_run\.primary_mapa_id,\s*synastry_run\.secondary_mapa_id\)/);
    expect(synastryQuery).toMatch(/synastry_run\.status\s*=\s*'ready'/);
    expect(synastryQuery).toMatch(/synastry_run\.result_artifact_id\s*=\s*artifact\.id/);
    expect(synastryQuery).toMatch(/artifact\.schema_id\s*=\s*'urn:astrologo:synastry-run'/);
    expect(synastryQuery).toMatch(/artifact\.schema_version\s*=\s*'1\.0\.0'/);
    expect(body.mapa.transit_run_v1).toBe(transitPayload);
    expect(body.mapa.synastry_run_v1).toBe(synastryPayload);
    expect(body.mapa.synastry_subjects).toEqual({
      A: 'João Antônio',
      B: 'Leonardo Cardozo',
      primaryCalculationId: 'mapa-avancado-001',
      secondaryCalculationId: 'mapa-avancado-002',
    });
  });

  it('rehydrates locality only through a ready run linked back to the ready artifact', async () => {
    const localityPayload = JSON.stringify({ schemaId: 'urn:astrologo:locality-map', schemaVersion: '1.0.0' });
    const queries: string[] = [];
    const db = {
      prepare(query: string) {
        queries.push(query);
        return {
          bind(id: string, artifactType?: string) {
            expect(id).toBe('mapa-localidade-001');
            return {
              async first() {
                if (!query.includes('FROM astrologo_artifacts')) return { id, nome: 'Consulente Localidade' };
                if (artifactType !== 'locality_map') return null;
                return {
                  id: 'artifact-locality-001',
                  schema_id: 'urn:astrologo:locality-map',
                  schema_version: '1.0.0',
                  source_hash: 'e'.repeat(64),
                  payload_json: localityPayload,
                  diagnostic_json: '[]',
                  created_at: '2026-07-12 15:00:00',
                  updated_at: '2026-07-12 15:10:00',
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
        body: JSON.stringify({ id: 'mapa-localidade-001' }),
      }),
      env: { BIGDATA_DB: db },
    } as never);
    const body = (await response.json()) as { mapa: { locality_map_v1: string } };

    expect(response.status).toBe(200);
    const localityQuery = queries.find((query) => query.includes('astrologo_locality_runs'));
    expect(localityQuery).toMatch(/locality_run\.status\s*=\s*'ready'/);
    expect(localityQuery).toMatch(/locality_run\.result_artifact_id\s*=\s*artifact\.id/);
    expect(localityQuery).toMatch(/artifact\.status\s*=\s*'ready'/);
    expect(localityQuery).toMatch(/artifact\.schema_id\s*=\s*'urn:astrologo:locality-map'/);
    expect(localityQuery).toMatch(/artifact\.schema_version\s*=\s*'1\.0\.0'/);
    expect(body.mapa.locality_map_v1).toBe(localityPayload);
  });
});
