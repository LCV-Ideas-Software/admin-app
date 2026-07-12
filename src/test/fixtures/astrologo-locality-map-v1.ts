const PLANETS = [
  ['sun', 'Sol', '☉'],
  ['moon', 'Lua', '☽'],
  ['mercury', 'Mercúrio', '☿'],
  ['venus', 'Vênus', '♀'],
  ['mars', 'Marte', '♂'],
  ['jupiter', 'Júpiter', '♃'],
  ['saturn', 'Saturno', '♄'],
  ['uranus', 'Urano', '♅'],
  ['neptune', 'Netuno', '♆'],
  ['pluto', 'Plutão', '♇'],
] as const;

const ANGLES = [
  ['mc', 'Meio do Céu'],
  ['ic', 'Fundo do Céu'],
  ['ascendant', 'Ascendente'],
  ['descendant', 'Descendente'],
] as const;

const normalizeLongitude180 = (longitudeDeg: number): number => ((((longitudeDeg + 180) % 360) + 360) % 360) - 180;

export function createLocalityMapV1Fixture(calculationId = 'calc-v2-fixture-001') {
  const birthInstantUtc = '1993-05-21T00:12:00Z';
  const sampledLatitudes = Array.from({ length: 35 }, (_, index) => -85 + index * 5);
  const bodies = PLANETS.map(([bodyId, displayNamePtBr, symbol], index) => ({
    bodyId,
    displayNamePtBr,
    symbol,
    sourceEquatorialEqj: {
      frameId: 'geocentric-apparent-eqj-j2000' as const,
      rightAscensionHours: index * 1.5,
      declinationDeg: 0,
    },
    workingEquatorialEqd: {
      frameId: 'geocentric-apparent-true-equator-of-date-eqd' as const,
      rightAscensionHours: index * 1.5,
      declinationDeg: 0,
    },
  }));
  const lines = bodies.flatMap((body) => {
    const mcLongitude = normalizeLongitude180((body.workingEquatorialEqd.rightAscensionHours - 10) * 15);
    const longitudeByAngle = {
      mc: mcLongitude,
      ic: normalizeLongitude180(mcLongitude + 180),
      ascendant: normalizeLongitude180(mcLongitude - 90),
      descendant: normalizeLongitude180(mcLongitude + 90),
    } as const;
    return ANGLES.map(([angleId, angleDisplayNamePtBr]) => ({
      recordId: `${body.bodyId}:${angleId}`,
      bodyId: body.bodyId,
      bodyDisplayNamePtBr: body.displayNamePtBr,
      bodySymbol: body.symbol,
      angleId,
      angleDisplayNamePtBr,
      availability: {
        status: 'available' as const,
        sampledLatitudeCount: sampledLatitudes.length,
        solvedLatitudeCount: sampledLatitudes.length,
      },
      geometry: {
        type: 'MultiLineString' as const,
        coordinates: [sampledLatitudes.map((latitudeDeg) => [longitudeByAngle[angleId], latitudeDeg] as const)],
      },
    }));
  });

  return {
    schemaId: 'urn:astrologo:locality-map',
    schemaVersion: '1.0.0',
    source: {
      schemaId: 'urn:astrologo:dados-posicionais',
      schemaVersion: '2.0.0',
      calculationId,
      calculatedAtUtc: '2026-07-12T15:00:00Z',
      birthInstantUtc,
      sourceHashAlgorithm: 'sha256',
      sourceHashSha256: 'e'.repeat(64),
      sourceHashVerification: 'caller-supplied-format-validated',
    },
    targetSet: {
      id: 'hermetic-planets-10-angles-4-v1',
      version: '1.0.0',
      orderedBodyIds: PLANETS.map(([bodyId]) => bodyId),
      orderedAngleIds: ANGLES.map(([angleId]) => angleId),
    },
    presentationPolicy: {
      locale: 'pt-BR',
      timeZone: 'America/Sao_Paulo',
      timeZoneLabel: 'Hora oficial de Brasília',
      calendar: 'gregory',
      numberingSystem: 'latn',
      hourCycle: 'h23',
    },
    models: {
      sourceCoordinates: {
        sourceContract: 'DadosPosicionaisV2',
        sourceContractVersion: '2.0.0',
        sourceFrame: 'geocentric-apparent-eqj-j2000',
        sourceProducerMethod: 'astronomy-engine-GeoVector-aberration-true-plus-EquatorFromVector',
        engineId: 'astronomy-engine',
        engineVersion: '2.1.19',
        engineSourceSha256: 'f'.repeat(64),
        workingFrame: 'geocentric-apparent-true-equator-of-date-eqd',
        transformation: {
          methodId: 'astronomy-engine-Rotation_EQJ_EQD-v1',
          precessionApplied: true,
          nutationApplied: true,
          calculatedForInstantUtc: birthInstantUtc,
        },
      },
      siderealTime: {
        kind: 'greenwich-apparent-sidereal-time',
        hours: 10,
        provenance: {
          engineId: 'astronomy-engine',
          engineVersion: '2.1.19',
          methodId: 'astronomy-engine-SiderealTime-v1',
          engineSourceSha256: 'f'.repeat(64),
          calculatedForInstantUtc: birthInstantUtc,
        },
      },
      geometry: {
        modelId: 'astrocartography-geometric-horizon-v1',
        modelVersion: '1.0.0',
        altitudeReferenceDeg: 0,
        refractionModel: 'none',
        observerElevationModel: 'not-applied',
        longitudeConvention: 'east-positive-[-180,180]',
        coordinateOrder: 'longitude-latitude',
        ascendantHourAngleSign: 'negative',
        descendantHourAngleSign: 'positive',
        antimeridianPolicy: 'split-and-interpolate-boundary-v1',
      },
      sampling: {
        latitudeResolutionDeg: 5,
        latitudeDomain: '(-90,90)',
        equatorIncluded: true,
        sampledLatitudeCount: sampledLatitudes.length,
      },
    },
    bodies,
    lines,
    diagnostics: [
      { severity: 'info', code: 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED', latitudeDeg: -90 },
      { severity: 'info', code: 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED', latitudeDeg: 90 },
    ],
  };
}
