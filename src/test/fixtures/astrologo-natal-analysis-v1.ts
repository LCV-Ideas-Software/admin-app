const PLANETS = [
  ['sun', 'Sol', '☉', 10],
  ['moon', 'Lua', '☽', 70],
  ['mercury', 'Mercúrio', '☿', 21],
  ['venus', 'Vênus', '♀', 37],
  ['mars', 'Marte', '♂', 49],
  ['jupiter', 'Júpiter', '♃', 83],
  ['saturn', 'Saturno', '♄', 102],
  ['uranus', 'Urano', '♅', 137],
  ['neptune', 'Netuno', '♆', 166],
  ['pluto', 'Plutão', '♇', 203],
] as const;

export function createNatalChartAnalysisV1Fixture(calculationId = 'calc-v2-fixture-001') {
  return {
    schemaId: 'urn:astrologo:natal-chart-analysis',
    schemaVersion: '1.0.0',
    source: {
      schemaId: 'urn:astrologo:dados-posicionais',
      schemaVersion: '2.0.0',
      calculationId,
      calculatedAtUtc: '2026-07-12T15:00:00Z',
    },
    targetSet: { id: 'hermetic-planets-10-plus-asc-mc-v1', version: '1.0.0' },
    presentationPolicy: {
      locale: 'pt-BR',
      timeZone: 'America/Sao_Paulo',
      timeZoneLabel: 'Hora oficial de Brasília',
      calendar: 'gregory',
      numberingSystem: 'latn',
      hourCycle: 'h23',
    },
    models: {
      aspects: {
        profileId: 'astrologo-natal-major-v1',
        profileVersion: '1.0.0',
        orbPolicy: 'fixed-by-aspect-no-body-modifiers',
        orbBoundaryConvention: 'inclusive',
        separationMethod: 'smallest-angular-distance-0-to-180',
        pairPolicy: 'planet-to-planet-and-planet-to-asc-mc',
        intensityModel: 'linear-from-exact-to-orb-boundary-v1',
        applyingSeparatingMethod: 'explicit-longitudinal-velocity-derivative-v1',
        exactToleranceDeg: 1e-9,
        aspectDefinitions: [
          { aspectId: 'conjunction', displayNamePtBr: 'Conjunção', exactAngleDeg: 0, allowedOrbDeg: 8 },
          { aspectId: 'sextile', displayNamePtBr: 'Sextil', exactAngleDeg: 60, allowedOrbDeg: 4 },
          { aspectId: 'square', displayNamePtBr: 'Quadratura', exactAngleDeg: 90, allowedOrbDeg: 8 },
          { aspectId: 'trine', displayNamePtBr: 'Trígono', exactAngleDeg: 120, allowedOrbDeg: 8 },
          { aspectId: 'quincunx', displayNamePtBr: 'Quincúncio', exactAngleDeg: 150, allowedOrbDeg: 4 },
          { aspectId: 'opposition', displayNamePtBr: 'Oposição', exactAngleDeg: 180, allowedOrbDeg: 8 },
        ],
      },
      houses: {
        systemId: 'placidus',
        occupancyBasis: 'dados-posicionais-v2-house-placement',
        mundaneDegreeBasis: 'swiss-swe-house-pos-fraction-times-30',
      },
    },
    points: [
      ...PLANETS.map(([id, displayNamePtBr, symbol, eclipticLongitudeDeg]) => ({
        kind: 'planet',
        id,
        displayNamePtBr,
        symbol,
        eclipticLongitudeDeg,
      })),
      { kind: 'angle', id: 'ascendant', displayNamePtBr: 'Ascendente', symbol: 'ASC', eclipticLongitudeDeg: 15 },
      { kind: 'angle', id: 'midheaven', displayNamePtBr: 'Meio do Céu', symbol: 'MC', eclipticLongitudeDeg: 105 },
    ],
    movements: PLANETS.map(([bodyId]) => ({
      bodyId,
      status: 'unavailable',
      reasonCode: 'LONGITUDINAL_VELOCITY_NOT_PROVIDED',
      basis: 'explicit-ecliptic-longitude-velocity',
    })),
    aspects: [
      {
        recordId: 'planet:sun--planet:moon',
        pointA: { kind: 'planet', id: 'sun' },
        pointB: { kind: 'planet', id: 'moon' },
        aspectId: 'sextile',
        displayNamePtBr: 'Sextil',
        separationDeg: 60,
        exactAngleDeg: 60,
        allowedOrbDeg: 4,
        orbDeg: 0,
        intensityPercent: 100,
        phase: { status: 'available', phase: 'exact', basis: 'exact-angle-tolerance' },
      },
    ],
    houseOccupancies: PLANETS.map(([bodyId], index) => ({
      bodyId,
      occupancy: {
        status: 'available',
        houseIndex1: index + 1,
        basis: 'dados-posicionais-v2-house-placement',
      },
      mundaneDegreeWithinHouse:
        bodyId === 'sun'
          ? {
              status: 'available',
              rawSwissHousePosition: 1.4,
              degreeWithinHouseDeg: 12,
              mundaneLongitudeDeg: 12,
              coordinateSystem: 'placidus-house-horoscope',
              degreeSemantics: 'normalized-semiarc-house-degree',
              basis: 'explicit-swiss-swe-house-pos',
            }
          : {
              status: 'unavailable',
              reasonCode: 'POSITION_V2_0_DOES_NOT_EXPOSE_MUNDANE_DEGREE',
              basis: 'explicit-swiss-swe-house-pos',
            },
    })),
    diagnostics: [{ severity: 'warning', code: 'RAW_SWISS_HOUSE_POSITIONS_PARTIAL' }],
  };
}
