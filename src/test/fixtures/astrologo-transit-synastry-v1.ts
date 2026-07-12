const PLANETS = [
  ['sun', 'Sol', '☉', 10, 'aries', 'Áries', 10],
  ['moon', 'Lua', '☽', 30, 'taurus', 'Touro', 0],
  ['mercury', 'Mercúrio', '☿', 50, 'taurus', 'Touro', 20],
  ['venus', 'Vênus', '♀', 70, 'gemini', 'Gêmeos', 10],
  ['mars', 'Marte', '♂', 90, 'cancer', 'Câncer', 0],
  ['jupiter', 'Júpiter', '♃', 110, 'cancer', 'Câncer', 20],
  ['saturn', 'Saturno', '♄', 130, 'leo', 'Leão', 10],
  ['uranus', 'Urano', '♅', 150, 'virgo', 'Virgem', 0],
  ['neptune', 'Netuno', '♆', 170, 'virgo', 'Virgem', 20],
  ['pluto', 'Plutão', '♇', 190, 'libra', 'Libra', 10],
] as const;

const ASPECT_DEFINITIONS = [
  { aspectId: 'conjunction', displayNamePtBr: 'Conjunção', exactAngleDeg: 0, allowedOrbDeg: 2 },
  { aspectId: 'sextile', displayNamePtBr: 'Sextil', exactAngleDeg: 60, allowedOrbDeg: 2 },
  { aspectId: 'square', displayNamePtBr: 'Quadratura', exactAngleDeg: 90, allowedOrbDeg: 2 },
  { aspectId: 'trine', displayNamePtBr: 'Trígono', exactAngleDeg: 120, allowedOrbDeg: 2 },
  { aspectId: 'opposition', displayNamePtBr: 'Oposição', exactAngleDeg: 180, allowedOrbDeg: 2 },
] as const;

const SYNASTRY_ASPECT_DEFINITIONS = [
  { aspectId: 'conjunction', displayNamePtBr: 'Conjunção', exactAngleDeg: 0, allowedOrbDeg: 8 },
  { aspectId: 'sextile', displayNamePtBr: 'Sextil', exactAngleDeg: 60, allowedOrbDeg: 4 },
  { aspectId: 'square', displayNamePtBr: 'Quadratura', exactAngleDeg: 90, allowedOrbDeg: 8 },
  { aspectId: 'trine', displayNamePtBr: 'Trígono', exactAngleDeg: 120, allowedOrbDeg: 8 },
  { aspectId: 'quincunx', displayNamePtBr: 'Quincúncio', exactAngleDeg: 150, allowedOrbDeg: 4 },
  { aspectId: 'opposition', displayNamePtBr: 'Oposição', exactAngleDeg: 180, allowedOrbDeg: 8 },
] as const;

const PRESENTATION = {
  locale: 'pt-BR',
  timeZone: 'America/Sao_Paulo',
  timeZoneLabel: 'Hora oficial de Brasília',
  calendar: 'gregory',
  numberingSystem: 'latn',
  hourCycle: 'h23',
} as const;

const IAU_CONSTELLATIONS = [
  ['Ari', 'Aries', 'Áries'],
  ['Tau', 'Taurus', 'Touro'],
  ['Tau', 'Taurus', 'Touro'],
  ['Gem', 'Gemini', 'Gêmeos'],
  ['Cnc', 'Cancer', 'Câncer'],
  ['Cnc', 'Cancer', 'Câncer'],
  ['Leo', 'Leo', 'Leão'],
  ['Vir', 'Virgo', 'Virgem'],
  ['Vir', 'Virgo', 'Virgem'],
  ['Lib', 'Libra', 'Libra'],
] as const;

export function createTransitRunV1Fixture(calculationId = 'calc-v2-fixture-001') {
  const positionsAtReference = PLANETS.map(
    ([bodyId, displayNamePtBr, symbol, eclipticLongitudeDeg, signId, signNamePtBr, degreeWithinSignDeg], index) => ({
      bodyId,
      displayNamePtBr,
      symbol,
      eclipticLongitudeDeg,
      tropical: { signId, signNamePtBr, degreeWithinSignDeg },
      astronomicalReal: {
        status: 'available' as const,
        coordinates: {
          rightAscensionHours: index * 2,
          declinationDeg: 5 - index,
          referenceFrame: 'equatorial-j2000' as const,
        },
        constellation: {
          iauCode: IAU_CONSTELLATIONS[index]?.[0] ?? 'Ari',
          latinName: IAU_CONSTELLATIONS[index]?.[1] ?? 'Aries',
          namePtBr: IAU_CONSTELLATIONS[index]?.[2] ?? 'Áries',
        },
        degreeWithinConstellation: {
          status: 'not-defined' as const,
          reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS' as const,
        },
      },
      natalHousePlacement: {
        status: 'available' as const,
        houseIndex1: (index % 12) + 1,
        basis: 'natal-placidus-cusps-ecliptic-longitude' as const,
        intervalConvention: '[cusp,next-cusp)' as const,
      },
    }),
  );
  const natalTargets = [
    ...PLANETS.map(([pointId, displayNamePtBr], index) => ({
      status: 'available' as const,
      kind: 'planet' as const,
      pointId,
      displayNamePtBr,
      eclipticLongitudeDeg: pointId === 'moon' ? 70 : 211 + index * 7,
    })),
    {
      status: 'available' as const,
      kind: 'angle' as const,
      pointId: 'ascendant' as const,
      displayNamePtBr: 'Ascendente',
      eclipticLongitudeDeg: 215,
    },
    {
      status: 'available' as const,
      kind: 'angle' as const,
      pointId: 'midheaven' as const,
      displayNamePtBr: 'Meio do Céu',
      eclipticLongitudeDeg: 305,
    },
  ];
  const aspects = positionsAtReference.flatMap((transitPosition) =>
    natalTargets.flatMap((natalPoint) => {
      const difference = Math.abs(transitPosition.eclipticLongitudeDeg - natalPoint.eclipticLongitudeDeg);
      const separationDeg = Math.min(difference, 360 - difference);
      const definition = ASPECT_DEFINITIONS.find(
        (candidate) => Math.abs(separationDeg - candidate.exactAngleDeg) <= candidate.allowedOrbDeg,
      );
      if (!definition) return [];
      const orbDeg = Math.abs(separationDeg - definition.exactAngleDeg);
      return [
        {
          recordId: `transit:${transitPosition.bodyId}|natal:${natalPoint.pointId}|${definition.aspectId}`,
          transitPoint: {
            bodyId: transitPosition.bodyId,
            eclipticLongitudeDeg: transitPosition.eclipticLongitudeDeg,
          },
          natalPoint: {
            kind: natalPoint.kind,
            pointId: natalPoint.pointId,
            eclipticLongitudeDeg: natalPoint.eclipticLongitudeDeg,
          },
          aspectId: definition.aspectId,
          displayNamePtBr: definition.displayNamePtBr,
          separationDeg,
          exactAngleDeg: definition.exactAngleDeg,
          allowedOrbDeg: 2 as const,
          orbDeg,
          phase:
            orbDeg <= 1e-7
              ? {
                  status: 'available' as const,
                  phase: 'exact' as const,
                  probeInstantUtc: '2026-07-12T15:10:00Z',
                  referenceOrbDeg: orbDeg,
                  probeOrbDeg: 0.1,
                  basis: 'explicit-later-snapshot-orb-comparison' as const,
                }
              : {
                  status: 'available' as const,
                  phase: 'applying' as const,
                  probeInstantUtc: '2026-07-12T15:10:00Z',
                  referenceOrbDeg: orbDeg,
                  probeOrbDeg: orbDeg / 2,
                  basis: 'explicit-later-snapshot-orb-comparison' as const,
                },
          exactitude:
            orbDeg <= 1e-7
              ? {
                  status: 'available' as const,
                  exactAtUtc: '2026-07-12T15:00:00Z',
                  proof: {
                    method: 'reference-snapshot-verification' as const,
                    verifiedSeparationDeg: separationDeg,
                    toleranceDeg: 1e-7,
                  },
                }
              : {
                  status: 'unavailable' as const,
                  reasonCode: 'EXACT_SEARCH_UNAVAILABLE' as const,
                },
        },
      ];
    }),
  );
  return {
    schemaId: 'urn:astrologo:transit-run',
    schemaVersion: '1.0.0',
    source: {
      natal: {
        schemaId: 'urn:astrologo:dados-posicionais',
        schemaVersion: '2.0.0',
        calculationId,
        calculatedAtUtc: '2026-07-11T15:00:00Z',
        sourceRef: `d1://astrologo_mapas/${calculationId}`,
        payloadSha256: 'a'.repeat(64),
      },
    },
    request: {
      referenceInstantUtc: '2026-07-12T15:00:00Z',
      phaseProbeInstantUtc: '2026-07-12T15:10:00Z',
      horizonDays: 30,
      horizonEndInstantUtc: '2026-08-11T15:00:00.000Z',
    },
    targetSet: {
      id: 'hermetic-planets-10-to-natal-planets-10-plus-asc-mc-v1',
      version: '1.0.0',
      orderedTransitBodyIds: PLANETS.map(([bodyId]) => bodyId),
      orderedNatalPointIds: [...PLANETS.map(([bodyId]) => bodyId), 'ascendant', 'midheaven'],
      transitBodyCount: 10,
      natalPointCount: 12,
    },
    presentationPolicy: { ...PRESENTATION },
    models: {
      aspects: {
        profileId: 'astrologo-transit-major-v1',
        profileVersion: '1.0.0',
        orbPolicy: 'fixed-2deg-no-body-modifiers',
        orbBoundaryConvention: 'inclusive',
        separationMethod: 'smallest-angular-distance-0-to-180',
        pairPolicy: 'transiting-planets-10-to-natal-planets-10-plus-asc-mc',
        phaseMethod: 'explicit-later-snapshot-orb-comparison-v1',
        exactSearchPolicy: 'provider-result-requires-snapshot-verification-within-horizon',
        exactToleranceDeg: 1e-7,
        aspectDefinitions: ASPECT_DEFINITIONS.map((definition) => ({ ...definition })),
      },
      transitProvider: {
        providerId: 'fixture-provider',
        providerVersion: '1.0.0',
        engineId: 'fixture-engine',
        engineVersion: '1.0.0',
        sourceRef: 'https://example.test/ephemeris',
        sourceSha256: 'b'.repeat(64),
        observerOrigin: 'geocentric',
        apparentOrAstrometric: 'apparent',
        eclipticReference: 'true-ecliptic-of-date',
        equatorialReference: 'equator-j2000',
      },
      astronomicalReal: {
        methodId: 'iau-roman-1987-b1875-consensus-v1',
        boundaryDatasetVersion: 'astronomy-engine-2.1.19',
        boundaryDatasetSha256: '068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7',
        classificationEpoch: 'B1875',
        boundaryGuardArcminutes: 20,
        coordinateInput: 'geocentric-apparent-equatorial-j2000',
        translationPolicy: 'curated-pt-br-editorial-v1',
        degreeWithinConstellationPolicy: 'not-defined-iau-2d-areas',
      },
      houses: {
        systemId: 'placidus',
        boundarySource: 'natal-dados-posicionais-v2-cusps',
        intervalConvention: '[cusp,next-cusp)',
      },
    },
    positionsAtReference,
    natalTargets,
    aspects,
    diagnostics: aspects.some(({ exactitude }) => exactitude.status === 'unavailable')
      ? [{ severity: 'info', code: 'EXACT_SEARCH_UNAVAILABLE' }]
      : [],
  };
}

export function createSynastryRunV1Fixture(primaryCalculationId = 'calc-v2-fixture-001') {
  const secondaryCalculationId = 'calc-v2-fixture-secondary-001';
  return {
    schemaId: 'urn:astrologo:synastry-run',
    schemaVersion: '1.0.0',
    charts: {
      A: {
        schemaId: 'urn:astrologo:dados-posicionais',
        schemaVersion: '2.0.0',
        calculationId: primaryCalculationId,
        calculatedAtUtc: '2026-07-11T15:00:00Z',
        birthInstantUtc: '1993-05-21T00:12:00Z',
      },
      B: {
        schemaId: 'urn:astrologo:dados-posicionais',
        schemaVersion: '2.0.0',
        calculationId: secondaryCalculationId,
        calculatedAtUtc: '2026-07-12T14:00:00Z',
        birthInstantUtc: '1979-03-26T19:45:00Z',
      },
    },
    targetSet: {
      id: 'hermetic-planets-10-cross-chart-v1',
      version: '1.0.0',
      orderedBodyIds: PLANETS.map(([bodyId]) => bodyId),
    },
    presentationPolicy: { ...PRESENTATION },
    models: {
      aspects: {
        profileId: 'astrologo-synastry-major-v1',
        profileVersion: '1.0.0',
        orbPolicy: 'fixed-by-aspect-no-body-modifiers',
        orbBoundaryConvention: 'inclusive',
        separationMethod: 'smallest-angular-distance-0-to-180',
        pairPolicy: 'all-chart-a-planets-to-all-chart-b-planets',
        applyingSeparatingPolicy: 'not-calculated-without-longitudinal-velocities',
        exactToleranceDeg: 1e-9,
        aspectDefinitions: SYNASTRY_ASPECT_DEFINITIONS.map((definition) => ({ ...definition })),
      },
      houseOverlays: {
        systemId: 'placidus',
        sourceCoordinate: 'geocentric-true-ecliptic-longitude-of-date',
        recipientBoundarySource: 'dados-posicionais-v2-cusps',
        intervalConvention: '[cusp,next-cusp)',
      },
    },
    aspects: [
      {
        recordId: 'A:sun|B:moon|sextile',
        pointA: { chartRef: 'A', bodyId: 'sun' },
        pointB: { chartRef: 'B', bodyId: 'moon' },
        aspectId: 'sextile',
        displayNamePtBr: 'Sextil',
        separationDeg: 60,
        exactAngleDeg: 60,
        allowedOrbDeg: 4,
        orbDeg: 0,
      },
    ],
    houseOverlays: {
      aToB: PLANETS.map(([sourceBodyId], index) => ({
        direction: 'A-to-B',
        sourceChartRef: 'A',
        sourceBodyId,
        targetChartRef: 'B',
        placement: {
          status: 'available',
          houseIndex1: (index % 12) + 1,
          basis: 'recipient-placidus-cusps-ecliptic-longitude',
          intervalConvention: '[cusp,next-cusp)',
        },
      })),
      bToA: PLANETS.map(([sourceBodyId], index) => ({
        direction: 'B-to-A',
        sourceChartRef: 'B',
        sourceBodyId,
        targetChartRef: 'A',
        placement: {
          status: 'available',
          houseIndex1: ((index + 5) % 12) + 1,
          basis: 'recipient-placidus-cusps-ecliptic-longitude',
          intervalConvention: '[cusp,next-cusp)',
        },
      })),
    },
    diagnostics: [],
  };
}
