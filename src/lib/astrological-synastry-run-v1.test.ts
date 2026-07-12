import { describe, expect, it } from 'vitest';
import { createSynastryRunV1Fixture } from '../test/fixtures/astrologo-transit-synastry-v1';
import { parseSynastryRunV1 } from './astrological-synastry-run-v1';

describe('SynastryRunV1 parser', () => {
  it('aceita o contrato recíproco A→B e B→A', () => {
    const fixture = createSynastryRunV1Fixture();
    const result = parseSynastryRunV1(JSON.stringify(fixture), fixture.charts.A.calculationId);

    expect(result).toMatchObject({ status: 'available' });
    if (result.status !== 'available') throw new Error('A fixture de sinastria deveria ser válida.');
    expect(result.data.houseOverlays.aToB).toHaveLength(10);
    expect(result.data.houseOverlays.bToA).toHaveLength(10);
  });

  it('trata ausência como mapa legado sem fabricar reciprocidade', () => {
    expect(parseSynastryRunV1(null)).toEqual({ status: 'legacy' });
    expect(parseSynastryRunV1('')).toEqual({ status: 'legacy' });
  });

  it('rejeita propriedade extra, mapa A divergente e direção recíproca inválida', () => {
    const extra = createSynastryRunV1Fixture();
    Object.assign(extra, { propriedadeExtra: true });
    expect(parseSynastryRunV1(extra)).toMatchObject({ status: 'invalid' });

    const mismatch = createSynastryRunV1Fixture();
    expect(parseSynastryRunV1(mismatch, 'outro-mapa')).toMatchObject({ status: 'invalid' });

    const direction = createSynastryRunV1Fixture();
    const firstOverlay = direction.houseOverlays.aToB[0];
    if (!firstOverlay) throw new Error('A fixture deveria conter sobreposição A→B.');
    Object.assign(firstOverlay, { direction: 'B-to-A' });
    expect(parseSynastryRunV1(direction)).toMatchObject({ status: 'invalid' });
  });
});
