import { describe, expect, it } from 'vitest';
import { createNatalChartAnalysisV1Fixture } from '../test/fixtures/astrologo-natal-analysis-v1';
import { parseNatalChartAnalysisV1 } from './astrological-natal-analysis-v1';

describe('NatalChartAnalysisV1 parser', () => {
  it('accepts the canonical artifact and preserves explicit mundane degree', () => {
    const fixture = createNatalChartAnalysisV1Fixture();
    const result = parseNatalChartAnalysisV1(JSON.stringify(fixture), fixture.source.calculationId);

    expect(result).toMatchObject({ status: 'available' });
    if (result.status !== 'available') throw new Error('Fixture natal deveria ser válida.');
    expect(result.data.houseOccupancies[0]?.mundaneDegreeWithinHouse).toMatchObject({
      status: 'available',
      degreeWithinHouseDeg: 12,
    });
  });

  it('treats absence as a legacy map without fabricating data', () => {
    expect(parseNatalChartAnalysisV1(null)).toEqual({ status: 'legacy' });
    expect(parseNatalChartAnalysisV1('')).toEqual({ status: 'legacy' });
  });

  it('rejects extra properties, mismatched map identity, and adulterated geometry', () => {
    const extra = { ...createNatalChartAnalysisV1Fixture(), propriedadeExtra: true };
    expect(parseNatalChartAnalysisV1(extra)).toMatchObject({ status: 'invalid' });

    const mismatch = createNatalChartAnalysisV1Fixture();
    expect(parseNatalChartAnalysisV1(mismatch, 'outro-mapa')).toMatchObject({ status: 'invalid' });

    const geometry = createNatalChartAnalysisV1Fixture();
    const firstAspect = geometry.aspects[0];
    if (!firstAspect) throw new Error('A fixture deveria conter ao menos um aspecto natal.');
    firstAspect.orbDeg = 2;
    expect(parseNatalChartAnalysisV1(geometry)).toMatchObject({ status: 'invalid' });
  });

  it('accepts explicitly unavailable mundane degree without estimating it', () => {
    const fixture = createNatalChartAnalysisV1Fixture();
    const firstHouseOccupancy = fixture.houseOccupancies[0];
    if (!firstHouseOccupancy) {
      throw new Error('A fixture deveria conter ao menos uma ocupação de casa.');
    }
    firstHouseOccupancy.mundaneDegreeWithinHouse = {
      status: 'unavailable',
      reasonCode: 'POSITION_V2_0_DOES_NOT_EXPOSE_MUNDANE_DEGREE',
      basis: 'explicit-swiss-swe-house-pos',
    };

    const result = parseNatalChartAnalysisV1(fixture);
    expect(result).toMatchObject({ status: 'available' });
  });
});
