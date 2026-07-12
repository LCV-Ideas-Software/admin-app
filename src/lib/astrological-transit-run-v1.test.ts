import { describe, expect, it } from 'vitest';
import { createTransitRunV1Fixture } from '../test/fixtures/astrologo-transit-synastry-v1';
import { parseTransitRunV1 } from './astrological-transit-run-v1';

describe('TransitRunV1 parser', () => {
  it('aceita o contrato canônico e preserva fase e exatidão explicitamente persistidas', () => {
    const fixture = createTransitRunV1Fixture();
    const result = parseTransitRunV1(JSON.stringify(fixture), fixture.source.natal.calculationId);

    expect(result).toMatchObject({ status: 'available' });
    if (result.status !== 'available') throw new Error('A fixture de trânsitos deveria ser válida.');
    expect(result.data.aspects[0]).toMatchObject({
      phase: { status: 'available', phase: 'exact' },
      exactitude: { status: 'available', exactAtUtc: '2026-07-12T15:00:00Z' },
    });
    expect(result.data.models.astronomicalReal).toMatchObject({ boundaryGuardArcminutes: 20 });
    expect(result.data.positionsAtReference[0]?.astronomicalReal).toMatchObject({
      status: 'available',
      constellation: { namePtBr: 'Áries' },
      degreeWithinConstellation: { status: 'not-defined' },
    });
  });

  it('trata ausência como mapa legado sem criar um céu atual', () => {
    expect(parseTransitRunV1(null)).toEqual({ status: 'legacy' });
    expect(parseTransitRunV1('')).toEqual({ status: 'legacy' });
  });

  it('rejeita propriedades extras, identidade divergente e geometria adulterada', () => {
    const extra = createTransitRunV1Fixture();
    Object.assign(extra, { propriedadeExtra: true });
    expect(parseTransitRunV1(extra)).toMatchObject({ status: 'invalid' });

    const mismatch = createTransitRunV1Fixture();
    expect(parseTransitRunV1(mismatch, 'outro-mapa')).toMatchObject({ status: 'invalid' });

    const geometry = createTransitRunV1Fixture();
    const firstAspect = geometry.aspects[0];
    if (!firstAspect) throw new Error('A fixture deveria conter um aspecto de trânsito.');
    firstAspect.orbDeg = 1;
    expect(parseTransitRunV1(geometry)).toMatchObject({ status: 'invalid' });

    const iauModel = createTransitRunV1Fixture();
    iauModel.models.astronomicalReal.boundaryGuardArcminutes = 10;
    expect(parseTransitRunV1(iauModel)).toMatchObject({ status: 'invalid' });
  });

  it('rejeita diagnóstico ausente quando a classificação IAU está indisponível', () => {
    const fixture = createTransitRunV1Fixture();
    const firstPosition = fixture.positionsAtReference[0];
    if (!firstPosition) throw new Error('A fixture deveria conter a posição do Sol.');
    Object.assign(firstPosition, {
      astronomicalReal: {
        status: 'unavailable',
        reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN',
        coordinates: firstPosition.astronomicalReal.coordinates,
        degreeWithinConstellation: {
          status: 'not-defined',
          reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS',
        },
      },
    });

    expect(parseTransitRunV1(fixture)).toMatchObject({ status: 'invalid' });
  });
});
