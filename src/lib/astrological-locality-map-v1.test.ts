import { describe, expect, it } from 'vitest';
import { createLocalityMapV1Fixture } from '../test/fixtures/astrologo-locality-map-v1';
import { parseLocalityMapV1 } from './astrological-locality-map-v1';

describe('LocalityMapV1 parser', () => {
  it('aceita o contrato canônico com dez corpos e quarenta linhas ordenadas', () => {
    const fixture = createLocalityMapV1Fixture();
    const result = parseLocalityMapV1(JSON.stringify(fixture), fixture.source.calculationId);

    expect(result).toMatchObject({ status: 'available' });
    if (result.status !== 'available') throw new Error('A fixture de localidade deveria ser válida.');
    expect(result.data.bodies).toHaveLength(10);
    expect(result.data.lines).toHaveLength(40);
    expect(result.data.models.sourceCoordinates.transformation).toMatchObject({
      precessionApplied: true,
      nutationApplied: true,
    });
  });

  it('trata ausência como mapa legado sem gerar linhas', () => {
    expect(parseLocalityMapV1(null)).toEqual({ status: 'legacy' });
    expect(parseLocalityMapV1('')).toEqual({ status: 'legacy' });
  });

  it('rejeita extras, identidade divergente e coordenada fora do globo', () => {
    const extra = createLocalityMapV1Fixture();
    Object.assign(extra, { raioInfluenciaKm: 500 });
    expect(parseLocalityMapV1(extra)).toMatchObject({ status: 'invalid' });

    const mismatch = createLocalityMapV1Fixture();
    expect(parseLocalityMapV1(mismatch, 'outro-mapa')).toMatchObject({ status: 'invalid' });

    const geometry = createLocalityMapV1Fixture();
    const firstCoordinate = geometry.lines[0]?.geometry.coordinates[0]?.[0];
    if (!firstCoordinate) throw new Error('A fixture deveria conter uma coordenada geográfica.');
    Object.assign(firstCoordinate, { 0: 181 });
    expect(parseLocalityMapV1(geometry)).toMatchObject({ status: 'invalid' });
  });
});
