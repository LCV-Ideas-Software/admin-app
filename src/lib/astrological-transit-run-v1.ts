import { PLANET_BODY_IDS, PLANET_LABEL_BY_ID, type PlanetBodyId } from './astrological-position-v2';

export const TRANSIT_RUN_SCHEMA_ID = 'urn:astrologo:transit-run' as const;
export const TRANSIT_RUN_SCHEMA_VERSION = '1.0.0' as const;

export type TransitNatalPointId = PlanetBodyId | 'ascendant' | 'midheaven';
export type TransitAspectId = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';

export type TransitAstronomicalRealProjectionV1 =
  | {
      readonly status: 'available';
      readonly coordinates: {
        readonly rightAscensionHours: number;
        readonly declinationDeg: number;
        readonly referenceFrame: 'equatorial-j2000';
      };
      readonly constellation: {
        readonly iauCode: string;
        readonly latinName: string;
        readonly namePtBr: string;
      };
      readonly degreeWithinConstellation: {
        readonly status: 'not-defined';
        readonly reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS';
      };
    }
  | {
      readonly status: 'unavailable';
      readonly reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN';
      readonly coordinates: {
        readonly rightAscensionHours: number;
        readonly declinationDeg: number;
        readonly referenceFrame: 'equatorial-j2000';
      };
      readonly degreeWithinConstellation: {
        readonly status: 'not-defined';
        readonly reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS';
      };
    };

export type TransitPhaseV1 =
  | {
      readonly status: 'available';
      readonly phase: 'applying' | 'exact' | 'separating';
      readonly probeInstantUtc: string;
      readonly referenceOrbDeg: number;
      readonly probeOrbDeg: number;
      readonly basis: 'explicit-later-snapshot-orb-comparison';
    }
  | {
      readonly status: 'unavailable';
      readonly reasonCode: 'PHASE_UNDETERMINED_FROM_PROBE';
      readonly probeInstantUtc: string;
    };

export type TransitExactitudeV1 =
  | {
      readonly status: 'available';
      readonly exactAtUtc: string;
      readonly proof: {
        readonly method: 'reference-snapshot-verification' | 'provider-search-and-snapshot-verification';
        readonly verifiedSeparationDeg: number;
        readonly toleranceDeg: number;
      };
    }
  | {
      readonly status: 'unavailable';
      readonly reasonCode:
        | 'HORIZON_ZERO_NO_SEARCH'
        | 'EXACT_SEARCH_UNAVAILABLE'
        | 'NO_EXACTITUDE_WITHIN_HORIZON'
        | 'PROVIDER_RESULT_INVALID_INSTANT'
        | 'PROVIDER_RESULT_OUTSIDE_HORIZON'
        | 'PROVIDER_RESULT_NOT_EXACT';
    };

export interface TransitRunV1 {
  readonly schemaId: typeof TRANSIT_RUN_SCHEMA_ID;
  readonly schemaVersion: typeof TRANSIT_RUN_SCHEMA_VERSION;
  readonly source: {
    readonly natal: {
      readonly schemaId: 'urn:astrologo:dados-posicionais';
      readonly schemaVersion: '2.0.0';
      readonly calculationId: string;
      readonly calculatedAtUtc: string;
      readonly sourceRef: string;
      readonly payloadSha256: string;
    };
  };
  readonly request: {
    readonly referenceInstantUtc: string;
    readonly phaseProbeInstantUtc: string;
    readonly horizonDays: number;
    readonly horizonEndInstantUtc: string;
  };
  readonly targetSet: {
    readonly id: 'hermetic-planets-10-to-natal-planets-10-plus-asc-mc-v1';
    readonly version: '1.0.0';
    readonly orderedTransitBodyIds: readonly PlanetBodyId[];
    readonly orderedNatalPointIds: readonly TransitNatalPointId[];
    readonly transitBodyCount: 10;
    readonly natalPointCount: 12;
  };
  readonly presentationPolicy: {
    readonly locale: 'pt-BR';
    readonly timeZone: 'America/Sao_Paulo';
    readonly timeZoneLabel: 'Hora oficial de Brasília';
    readonly calendar: 'gregory';
    readonly numberingSystem: 'latn';
    readonly hourCycle: 'h23';
  };
  readonly models: {
    readonly aspects: {
      readonly profileId: 'astrologo-transit-major-v1';
      readonly profileVersion: '1.0.0';
      readonly orbPolicy: 'fixed-2deg-no-body-modifiers';
      readonly orbBoundaryConvention: 'inclusive';
      readonly separationMethod: 'smallest-angular-distance-0-to-180';
      readonly pairPolicy: 'transiting-planets-10-to-natal-planets-10-plus-asc-mc';
      readonly phaseMethod: 'explicit-later-snapshot-orb-comparison-v1';
      readonly exactSearchPolicy: 'provider-result-requires-snapshot-verification-within-horizon';
      readonly exactToleranceDeg: 1e-7;
      readonly aspectDefinitions: readonly {
        readonly aspectId: TransitAspectId;
        readonly displayNamePtBr: string;
        readonly exactAngleDeg: number;
        readonly allowedOrbDeg: 2;
      }[];
    };
    readonly transitProvider: {
      readonly providerId: string;
      readonly providerVersion: string;
      readonly engineId: string;
      readonly engineVersion: string;
      readonly sourceRef: string;
      readonly sourceSha256: string;
      readonly observerOrigin: 'geocentric';
      readonly apparentOrAstrometric: 'apparent';
      readonly eclipticReference: 'true-ecliptic-of-date';
      readonly equatorialReference: 'equator-j2000';
    };
    readonly astronomicalReal: {
      readonly methodId: 'iau-roman-1987-b1875-consensus-v1';
      readonly boundaryDatasetVersion: 'astronomy-engine-2.1.19';
      readonly boundaryDatasetSha256: string;
      readonly classificationEpoch: 'B1875';
      readonly boundaryGuardArcminutes: 20;
      readonly coordinateInput: 'geocentric-apparent-equatorial-j2000';
      readonly translationPolicy: 'curated-pt-br-editorial-v1';
      readonly degreeWithinConstellationPolicy: 'not-defined-iau-2d-areas';
    };
    readonly houses: {
      readonly systemId: 'placidus';
      readonly boundarySource: 'natal-dados-posicionais-v2-cusps';
      readonly intervalConvention: '[cusp,next-cusp)';
    };
  };
  readonly positionsAtReference: readonly {
    readonly bodyId: PlanetBodyId;
    readonly displayNamePtBr: string;
    readonly symbol: string;
    readonly eclipticLongitudeDeg: number;
    readonly tropical: {
      readonly signId: string;
      readonly signNamePtBr: string;
      readonly degreeWithinSignDeg: number;
    };
    readonly astronomicalReal: TransitAstronomicalRealProjectionV1;
    readonly natalHousePlacement:
      | {
          readonly status: 'available';
          readonly houseIndex1: number;
          readonly basis: 'natal-placidus-cusps-ecliptic-longitude';
          readonly intervalConvention: '[cusp,next-cusp)';
        }
      | {
          readonly status: 'unavailable';
          readonly reasonCode: 'NATAL_PLACIDUS_UNAVAILABLE';
          readonly basis: 'natal-placidus-cusps-ecliptic-longitude';
        };
  }[];
  readonly natalTargets: readonly (
    | {
        readonly status: 'available';
        readonly kind: 'planet' | 'angle';
        readonly pointId: TransitNatalPointId;
        readonly displayNamePtBr: string;
        readonly eclipticLongitudeDeg: number;
      }
    | {
        readonly status: 'unavailable';
        readonly kind: 'angle';
        readonly pointId: 'ascendant' | 'midheaven';
        readonly displayNamePtBr: string;
        readonly reasonCode: 'NATAL_ANGLE_UNAVAILABLE';
      }
  )[];
  readonly aspects: readonly {
    readonly recordId: string;
    readonly transitPoint: { readonly bodyId: PlanetBodyId; readonly eclipticLongitudeDeg: number };
    readonly natalPoint: {
      readonly kind: 'planet' | 'angle';
      readonly pointId: TransitNatalPointId;
      readonly eclipticLongitudeDeg: number;
    };
    readonly aspectId: TransitAspectId;
    readonly displayNamePtBr: string;
    readonly separationDeg: number;
    readonly exactAngleDeg: number;
    readonly allowedOrbDeg: 2;
    readonly orbDeg: number;
    readonly phase: TransitPhaseV1;
    readonly exactitude: TransitExactitudeV1;
  }[];
  readonly diagnostics: readonly {
    readonly severity: 'info' | 'warning';
    readonly code:
      | 'NATAL_PLACIDUS_UNAVAILABLE'
      | 'NATAL_ANGLES_UNAVAILABLE'
      | 'PHASE_UNDETERMINED_FROM_PROBE'
      | 'HORIZON_ZERO_NO_SEARCH'
      | 'EXACT_SEARCH_UNAVAILABLE'
      | 'EXACT_SEARCH_RESULT_REJECTED'
      | 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN';
  }[];
}

export type TransitRunV1ParseResult =
  | { readonly status: 'available'; readonly data: TransitRunV1 }
  | { readonly status: 'legacy' }
  | { readonly status: 'invalid'; readonly reason: string };

const PLANET_SYMBOLS: Readonly<Record<PlanetBodyId, string>> = Object.freeze({
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
});

const TROPICAL_SIGNS = [
  ['aries', 'Áries'],
  ['taurus', 'Touro'],
  ['gemini', 'Gêmeos'],
  ['cancer', 'Câncer'],
  ['leo', 'Leão'],
  ['virgo', 'Virgem'],
  ['libra', 'Libra'],
  ['scorpio', 'Escorpião'],
  ['sagittarius', 'Sagitário'],
  ['capricorn', 'Capricórnio'],
  ['aquarius', 'Aquário'],
  ['pisces', 'Peixes'],
] as const;

const ASPECT_DEFINITIONS = [
  ['conjunction', 'Conjunção', 0],
  ['sextile', 'Sextil', 60],
  ['square', 'Quadratura', 90],
  ['trine', 'Trígono', 120],
  ['opposition', 'Oposição', 180],
] as const;

const ROOT_KEYS = [
  'schemaId',
  'schemaVersion',
  'source',
  'request',
  'targetSet',
  'presentationPolicy',
  'models',
  'positionsAtReference',
  'natalTargets',
  'aspects',
  'diagnostics',
] as const;

const NATAL_POINT_IDS = [...PLANET_BODY_IDS, 'ascendant', 'midheaven'] as const;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};
const finiteInRange = (value: unknown, minimum: number, maximumExclusive: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= minimum && value < maximumExclusive;
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const utcMilliseconds = (value: unknown): number | null => {
  if (typeof value !== 'string' || !UTC_PATTERN.test(value)) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
};
const closeEnough = (left: number, right: number, tolerance = 1e-8): boolean => Math.abs(left - right) <= tolerance;
const angularSeparation = (left: number, right: number): number => {
  const difference = Math.abs(left - right);
  return Math.min(difference, 360 - difference);
};
const isPlanetId = (value: unknown): value is PlanetBodyId =>
  typeof value === 'string' && (PLANET_BODY_IDS as readonly string[]).includes(value);

const canonicalPresentation = (value: unknown): boolean =>
  isRecord(value) &&
  exactKeys(value, ['locale', 'timeZone', 'timeZoneLabel', 'calendar', 'numberingSystem', 'hourCycle']) &&
  value.locale === 'pt-BR' &&
  value.timeZone === 'America/Sao_Paulo' &&
  value.timeZoneLabel === 'Hora oficial de Brasília' &&
  value.calendar === 'gregory' &&
  value.numberingSystem === 'latn' &&
  value.hourCycle === 'h23';

const canonicalSource = (value: unknown): value is TransitRunV1['source'] => {
  if (!isRecord(value) || !exactKeys(value, ['natal']) || !isRecord(value.natal)) return false;
  const natal = value.natal;
  return (
    exactKeys(natal, ['schemaId', 'schemaVersion', 'calculationId', 'calculatedAtUtc', 'sourceRef', 'payloadSha256']) &&
    natal.schemaId === 'urn:astrologo:dados-posicionais' &&
    natal.schemaVersion === '2.0.0' &&
    isNonEmptyString(natal.calculationId) &&
    utcMilliseconds(natal.calculatedAtUtc) !== null &&
    isNonEmptyString(natal.sourceRef) &&
    natal.sourceRef.length <= 512 &&
    SHA256_PATTERN.test(String(natal.payloadSha256))
  );
};

const canonicalRequest = (value: unknown): value is TransitRunV1['request'] => {
  if (
    !isRecord(value) ||
    !exactKeys(value, ['referenceInstantUtc', 'phaseProbeInstantUtc', 'horizonDays', 'horizonEndInstantUtc']) ||
    !Number.isInteger(value.horizonDays) ||
    Number(value.horizonDays) < 0 ||
    Number(value.horizonDays) > 30
  )
    return false;
  const reference = utcMilliseconds(value.referenceInstantUtc);
  const probe = utcMilliseconds(value.phaseProbeInstantUtc);
  const end = utcMilliseconds(value.horizonEndInstantUtc);
  return (
    reference !== null &&
    probe !== null &&
    end !== null &&
    probe > reference &&
    end === reference + Number(value.horizonDays) * 86_400_000
  );
};

const canonicalTargetSet = (value: unknown): boolean =>
  isRecord(value) &&
  exactKeys(value, [
    'id',
    'version',
    'orderedTransitBodyIds',
    'orderedNatalPointIds',
    'transitBodyCount',
    'natalPointCount',
  ]) &&
  value.id === 'hermetic-planets-10-to-natal-planets-10-plus-asc-mc-v1' &&
  value.version === '1.0.0' &&
  value.transitBodyCount === 10 &&
  value.natalPointCount === 12 &&
  Array.isArray(value.orderedTransitBodyIds) &&
  value.orderedTransitBodyIds.length === PLANET_BODY_IDS.length &&
  value.orderedTransitBodyIds.every((bodyId, index) => bodyId === PLANET_BODY_IDS[index]) &&
  Array.isArray(value.orderedNatalPointIds) &&
  value.orderedNatalPointIds.length === NATAL_POINT_IDS.length &&
  value.orderedNatalPointIds.every((pointId, index) => pointId === NATAL_POINT_IDS[index]);

const canonicalModels = (value: unknown): value is TransitRunV1['models'] => {
  if (!isRecord(value) || !exactKeys(value, ['aspects', 'transitProvider', 'astronomicalReal', 'houses'])) return false;
  const aspects = value.aspects;
  const provider = value.transitProvider;
  const astronomicalReal = value.astronomicalReal;
  const houses = value.houses;
  if (!isRecord(aspects) || !isRecord(provider) || !isRecord(astronomicalReal) || !isRecord(houses)) return false;
  if (
    !exactKeys(aspects, [
      'profileId',
      'profileVersion',
      'orbPolicy',
      'orbBoundaryConvention',
      'separationMethod',
      'pairPolicy',
      'phaseMethod',
      'exactSearchPolicy',
      'exactToleranceDeg',
      'aspectDefinitions',
    ]) ||
    aspects.profileId !== 'astrologo-transit-major-v1' ||
    aspects.profileVersion !== '1.0.0' ||
    aspects.orbPolicy !== 'fixed-2deg-no-body-modifiers' ||
    aspects.orbBoundaryConvention !== 'inclusive' ||
    aspects.separationMethod !== 'smallest-angular-distance-0-to-180' ||
    aspects.pairPolicy !== 'transiting-planets-10-to-natal-planets-10-plus-asc-mc' ||
    aspects.phaseMethod !== 'explicit-later-snapshot-orb-comparison-v1' ||
    aspects.exactSearchPolicy !== 'provider-result-requires-snapshot-verification-within-horizon' ||
    aspects.exactToleranceDeg !== 1e-7 ||
    !Array.isArray(aspects.aspectDefinitions) ||
    aspects.aspectDefinitions.length !== ASPECT_DEFINITIONS.length ||
    !aspects.aspectDefinitions.every((candidate, index) => {
      const expected = ASPECT_DEFINITIONS[index];
      return (
        expected !== undefined &&
        isRecord(candidate) &&
        exactKeys(candidate, ['aspectId', 'displayNamePtBr', 'exactAngleDeg', 'allowedOrbDeg']) &&
        candidate.aspectId === expected[0] &&
        candidate.displayNamePtBr === expected[1] &&
        candidate.exactAngleDeg === expected[2] &&
        candidate.allowedOrbDeg === 2
      );
    })
  )
    return false;
  return (
    exactKeys(provider, [
      'providerId',
      'providerVersion',
      'engineId',
      'engineVersion',
      'sourceRef',
      'sourceSha256',
      'observerOrigin',
      'apparentOrAstrometric',
      'eclipticReference',
      'equatorialReference',
    ]) &&
    ['providerId', 'providerVersion', 'engineId', 'engineVersion', 'sourceRef'].every((key) =>
      isNonEmptyString(provider[key]),
    ) &&
    SHA256_PATTERN.test(String(provider.sourceSha256)) &&
    provider.observerOrigin === 'geocentric' &&
    provider.apparentOrAstrometric === 'apparent' &&
    provider.eclipticReference === 'true-ecliptic-of-date' &&
    provider.equatorialReference === 'equator-j2000' &&
    exactKeys(astronomicalReal, [
      'methodId',
      'boundaryDatasetVersion',
      'boundaryDatasetSha256',
      'classificationEpoch',
      'boundaryGuardArcminutes',
      'coordinateInput',
      'translationPolicy',
      'degreeWithinConstellationPolicy',
    ]) &&
    astronomicalReal.methodId === 'iau-roman-1987-b1875-consensus-v1' &&
    astronomicalReal.boundaryDatasetVersion === 'astronomy-engine-2.1.19' &&
    astronomicalReal.boundaryDatasetSha256 === '068f1445ed0c636c94818fe6d20d7d125120e605e0bab9fc4675c3d531be5ad7' &&
    astronomicalReal.classificationEpoch === 'B1875' &&
    astronomicalReal.boundaryGuardArcminutes === 20 &&
    astronomicalReal.coordinateInput === 'geocentric-apparent-equatorial-j2000' &&
    astronomicalReal.translationPolicy === 'curated-pt-br-editorial-v1' &&
    astronomicalReal.degreeWithinConstellationPolicy === 'not-defined-iau-2d-areas' &&
    exactKeys(houses, ['systemId', 'boundarySource', 'intervalConvention']) &&
    houses.systemId === 'placidus' &&
    houses.boundarySource === 'natal-dados-posicionais-v2-cusps' &&
    houses.intervalConvention === '[cusp,next-cusp)'
  );
};

const canonicalAstronomicalReal = (value: unknown): value is TransitAstronomicalRealProjectionV1 => {
  if (!isRecord(value) || !isRecord(value.coordinates) || !isRecord(value.degreeWithinConstellation)) return false;
  const coordinatesValid =
    exactKeys(value.coordinates, ['rightAscensionHours', 'declinationDeg', 'referenceFrame']) &&
    finiteInRange(value.coordinates.rightAscensionHours, 0, 24) &&
    typeof value.coordinates.declinationDeg === 'number' &&
    Number.isFinite(value.coordinates.declinationDeg) &&
    value.coordinates.declinationDeg >= -90 &&
    value.coordinates.declinationDeg <= 90 &&
    value.coordinates.referenceFrame === 'equatorial-j2000';
  const degreePolicyValid =
    exactKeys(value.degreeWithinConstellation, ['status', 'reasonCode']) &&
    value.degreeWithinConstellation.status === 'not-defined' &&
    value.degreeWithinConstellation.reasonCode === 'IAU_CONSTELLATIONS_ARE_2D_AREAS';
  if (!coordinatesValid || !degreePolicyValid) return false;
  if (value.status === 'available') {
    return (
      exactKeys(value, ['status', 'coordinates', 'constellation', 'degreeWithinConstellation']) &&
      isRecord(value.constellation) &&
      exactKeys(value.constellation, ['iauCode', 'latinName', 'namePtBr']) &&
      typeof value.constellation.iauCode === 'string' &&
      /^[A-Z][A-Za-z]{2}$/.test(value.constellation.iauCode) &&
      isNonEmptyString(value.constellation.latinName) &&
      isNonEmptyString(value.constellation.namePtBr)
    );
  }
  return (
    value.status === 'unavailable' &&
    exactKeys(value, ['status', 'reasonCode', 'coordinates', 'degreeWithinConstellation']) &&
    value.reasonCode === 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN'
  );
};

const parsePositions = (value: unknown): TransitRunV1['positionsAtReference'] | null => {
  if (!Array.isArray(value) || value.length !== PLANET_BODY_IDS.length) return null;
  for (const [index, candidate] of value.entries()) {
    const bodyId = PLANET_BODY_IDS[index];
    if (
      !bodyId ||
      !isRecord(candidate) ||
      !exactKeys(candidate, [
        'bodyId',
        'displayNamePtBr',
        'symbol',
        'eclipticLongitudeDeg',
        'tropical',
        'astronomicalReal',
        'natalHousePlacement',
      ]) ||
      candidate.bodyId !== bodyId ||
      candidate.displayNamePtBr !== PLANET_LABEL_BY_ID[bodyId] ||
      candidate.symbol !== PLANET_SYMBOLS[bodyId] ||
      !finiteInRange(candidate.eclipticLongitudeDeg, 0, 360) ||
      !canonicalAstronomicalReal(candidate.astronomicalReal) ||
      !isRecord(candidate.tropical) ||
      !exactKeys(candidate.tropical, ['signId', 'signNamePtBr', 'degreeWithinSignDeg'])
    )
      return null;
    const signIndex = Math.floor(candidate.eclipticLongitudeDeg / 30);
    const sign = TROPICAL_SIGNS[signIndex];
    if (
      !sign ||
      candidate.tropical.signId !== sign[0] ||
      candidate.tropical.signNamePtBr !== sign[1] ||
      !finiteInRange(candidate.tropical.degreeWithinSignDeg, 0, 30) ||
      !closeEnough(candidate.tropical.degreeWithinSignDeg, candidate.eclipticLongitudeDeg - signIndex * 30)
    )
      return null;
    const placement = candidate.natalHousePlacement;
    if (!isRecord(placement)) return null;
    if (placement.status === 'available') {
      if (
        !exactKeys(placement, ['status', 'houseIndex1', 'basis', 'intervalConvention']) ||
        !Number.isInteger(placement.houseIndex1) ||
        Number(placement.houseIndex1) < 1 ||
        Number(placement.houseIndex1) > 12 ||
        placement.basis !== 'natal-placidus-cusps-ecliptic-longitude' ||
        placement.intervalConvention !== '[cusp,next-cusp)'
      )
        return null;
    } else if (
      placement.status !== 'unavailable' ||
      !exactKeys(placement, ['status', 'reasonCode', 'basis']) ||
      placement.reasonCode !== 'NATAL_PLACIDUS_UNAVAILABLE' ||
      placement.basis !== 'natal-placidus-cusps-ecliptic-longitude'
    )
      return null;
  }
  return value as unknown as TransitRunV1['positionsAtReference'];
};

const parseNatalTargets = (value: unknown): TransitRunV1['natalTargets'] | null => {
  if (!Array.isArray(value) || value.length !== NATAL_POINT_IDS.length) return null;
  for (const [index, candidate] of value.entries()) {
    if (!isRecord(candidate) || candidate.pointId !== NATAL_POINT_IDS[index]) return null;
    const pointId = NATAL_POINT_IDS[index];
    const expectedLabel = isPlanetId(pointId)
      ? PLANET_LABEL_BY_ID[pointId]
      : pointId === 'ascendant'
        ? 'Ascendente'
        : 'Meio do Céu';
    if (candidate.displayNamePtBr !== expectedLabel) return null;
    if (candidate.status === 'available') {
      if (
        !exactKeys(candidate, ['status', 'kind', 'pointId', 'displayNamePtBr', 'eclipticLongitudeDeg']) ||
        candidate.kind !== (isPlanetId(pointId) ? 'planet' : 'angle') ||
        !finiteInRange(candidate.eclipticLongitudeDeg, 0, 360)
      )
        return null;
    } else if (
      candidate.status !== 'unavailable' ||
      !exactKeys(candidate, ['status', 'kind', 'pointId', 'displayNamePtBr', 'reasonCode']) ||
      isPlanetId(pointId) ||
      candidate.kind !== 'angle' ||
      candidate.reasonCode !== 'NATAL_ANGLE_UNAVAILABLE'
    )
      return null;
  }
  return value as unknown as TransitRunV1['natalTargets'];
};

const validPhase = (value: unknown, orbDeg: number, request: TransitRunV1['request']): value is TransitPhaseV1 => {
  if (!isRecord(value) || value.probeInstantUtc !== request.phaseProbeInstantUtc) return false;
  if (value.status === 'available') {
    if (
      !exactKeys(value, ['status', 'phase', 'probeInstantUtc', 'referenceOrbDeg', 'probeOrbDeg', 'basis']) ||
      !['applying', 'exact', 'separating'].includes(String(value.phase)) ||
      !finiteInRange(value.referenceOrbDeg, 0, 181) ||
      !finiteInRange(value.probeOrbDeg, 0, 181) ||
      !closeEnough(value.referenceOrbDeg, orbDeg) ||
      value.basis !== 'explicit-later-snapshot-orb-comparison'
    )
      return false;
    if (orbDeg <= 1e-7) return value.phase === 'exact';
    if (Math.abs(value.probeOrbDeg - orbDeg) <= 1e-7) return false;
    return value.phase === (value.probeOrbDeg < orbDeg ? 'applying' : 'separating');
  }
  return (
    value.status === 'unavailable' &&
    exactKeys(value, ['status', 'reasonCode', 'probeInstantUtc']) &&
    value.reasonCode === 'PHASE_UNDETERMINED_FROM_PROBE'
  );
};

const validExactitude = (
  value: unknown,
  separationDeg: number,
  exactAngleDeg: number,
  request: TransitRunV1['request'],
): value is TransitExactitudeV1 => {
  if (!isRecord(value)) return false;
  if (value.status === 'available') {
    if (
      !exactKeys(value, ['status', 'exactAtUtc', 'proof']) ||
      !isRecord(value.proof) ||
      !exactKeys(value.proof, ['method', 'verifiedSeparationDeg', 'toleranceDeg']) ||
      !['reference-snapshot-verification', 'provider-search-and-snapshot-verification'].includes(
        String(value.proof.method),
      ) ||
      !finiteInRange(value.proof.verifiedSeparationDeg, 0, 181) ||
      value.proof.toleranceDeg !== 1e-7 ||
      Math.abs(value.proof.verifiedSeparationDeg - exactAngleDeg) > 1e-7
    )
      return false;
    const exactAt = utcMilliseconds(value.exactAtUtc);
    const reference = utcMilliseconds(request.referenceInstantUtc);
    const end = utcMilliseconds(request.horizonEndInstantUtc);
    if (exactAt === null || reference === null || end === null || exactAt < reference || exactAt > end) return false;
    return (
      value.proof.method !== 'reference-snapshot-verification' ||
      (value.exactAtUtc === request.referenceInstantUtc && Math.abs(separationDeg - exactAngleDeg) <= 1e-7)
    );
  }
  return (
    value.status === 'unavailable' &&
    exactKeys(value, ['status', 'reasonCode']) &&
    [
      'HORIZON_ZERO_NO_SEARCH',
      'EXACT_SEARCH_UNAVAILABLE',
      'NO_EXACTITUDE_WITHIN_HORIZON',
      'PROVIDER_RESULT_INVALID_INSTANT',
      'PROVIDER_RESULT_OUTSIDE_HORIZON',
      'PROVIDER_RESULT_NOT_EXACT',
    ].includes(String(value.reasonCode)) &&
    (value.reasonCode !== 'HORIZON_ZERO_NO_SEARCH' || request.horizonDays === 0)
  );
};

const parseAspects = (
  value: unknown,
  positions: TransitRunV1['positionsAtReference'],
  natalTargets: TransitRunV1['natalTargets'],
  request: TransitRunV1['request'],
): TransitRunV1['aspects'] | null => {
  if (!Array.isArray(value) || value.length > 120) return null;
  const positionsById = new Map(positions.map((position) => [position.bodyId, position]));
  const targetsById = new Map(natalTargets.map((target) => [target.pointId, target]));
  const seen = new Set<string>();
  let previousPairRank = -1;
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !exactKeys(candidate, [
        'recordId',
        'transitPoint',
        'natalPoint',
        'aspectId',
        'displayNamePtBr',
        'separationDeg',
        'exactAngleDeg',
        'allowedOrbDeg',
        'orbDeg',
        'phase',
        'exactitude',
      ]) ||
      !isRecord(candidate.transitPoint) ||
      !exactKeys(candidate.transitPoint, ['bodyId', 'eclipticLongitudeDeg']) ||
      !isPlanetId(candidate.transitPoint.bodyId) ||
      !isRecord(candidate.natalPoint) ||
      !exactKeys(candidate.natalPoint, ['kind', 'pointId', 'eclipticLongitudeDeg'])
    )
      return null;
    const transit = positionsById.get(candidate.transitPoint.bodyId);
    const target = targetsById.get(candidate.natalPoint.pointId as TransitNatalPointId);
    const definition = ASPECT_DEFINITIONS.find(([aspectId]) => aspectId === candidate.aspectId);
    if (!transit || !target || target.status !== 'available' || !definition) return null;
    const recordId = `transit:${transit.bodyId}|natal:${target.pointId}|${definition[0]}`;
    const pairRank =
      PLANET_BODY_IDS.indexOf(transit.bodyId) * NATAL_POINT_IDS.length + NATAL_POINT_IDS.indexOf(target.pointId);
    const separationDeg = angularSeparation(transit.eclipticLongitudeDeg, target.eclipticLongitudeDeg);
    const orbDeg = Math.abs(separationDeg - definition[2]);
    if (
      candidate.recordId !== recordId ||
      seen.has(recordId) ||
      pairRank <= previousPairRank ||
      candidate.transitPoint.eclipticLongitudeDeg !== transit.eclipticLongitudeDeg ||
      candidate.natalPoint.kind !== target.kind ||
      candidate.natalPoint.pointId !== target.pointId ||
      candidate.natalPoint.eclipticLongitudeDeg !== target.eclipticLongitudeDeg ||
      candidate.displayNamePtBr !== definition[1] ||
      candidate.allowedOrbDeg !== 2 ||
      orbDeg > 2 + Number.EPSILON ||
      typeof candidate.separationDeg !== 'number' ||
      typeof candidate.exactAngleDeg !== 'number' ||
      typeof candidate.orbDeg !== 'number' ||
      !closeEnough(candidate.separationDeg, separationDeg) ||
      !closeEnough(candidate.exactAngleDeg, definition[2]) ||
      !closeEnough(candidate.orbDeg, orbDeg) ||
      !validPhase(candidate.phase, orbDeg, request) ||
      !validExactitude(candidate.exactitude, separationDeg, definition[2], request)
    )
      return null;
    seen.add(recordId);
    previousPairRank = pairRank;
  }
  const expected = new Set<string>();
  for (const transit of positions) {
    for (const target of natalTargets) {
      if (target.status !== 'available') continue;
      const separationDeg = angularSeparation(transit.eclipticLongitudeDeg, target.eclipticLongitudeDeg);
      const definition = ASPECT_DEFINITIONS.find(
        ([, , angle]) => Math.abs(separationDeg - angle) <= 2 + Number.EPSILON,
      );
      if (definition) expected.add(`transit:${transit.bodyId}|natal:${target.pointId}|${definition[0]}`);
    }
  }
  if (seen.size !== expected.size || [...expected].some((recordId) => !seen.has(recordId))) return null;
  return value as unknown as TransitRunV1['aspects'];
};

const expectedDiagnostics = (
  positions: TransitRunV1['positionsAtReference'],
  targets: TransitRunV1['natalTargets'],
  aspects: TransitRunV1['aspects'],
  request: TransitRunV1['request'],
): TransitRunV1['diagnostics'] => {
  const expected: TransitRunV1['diagnostics'][number][] = [];
  if (positions.some(({ natalHousePlacement }) => natalHousePlacement.status === 'unavailable')) {
    expected.push({ severity: 'warning', code: 'NATAL_PLACIDUS_UNAVAILABLE' });
  }
  if (targets.some(({ status }) => status === 'unavailable')) {
    expected.push({ severity: 'warning', code: 'NATAL_ANGLES_UNAVAILABLE' });
  }
  if (positions.some(({ astronomicalReal }) => astronomicalReal.status === 'unavailable')) {
    expected.push({ severity: 'warning', code: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN' });
  }
  if (aspects.some(({ phase }) => phase.status === 'unavailable')) {
    expected.push({ severity: 'warning', code: 'PHASE_UNDETERMINED_FROM_PROBE' });
  }
  const exactitudeReasons = new Set(
    aspects.flatMap(({ exactitude }) => (exactitude.status === 'unavailable' ? [exactitude.reasonCode] : [])),
  );
  if (request.horizonDays === 0 && exactitudeReasons.has('HORIZON_ZERO_NO_SEARCH')) {
    expected.push({ severity: 'info', code: 'HORIZON_ZERO_NO_SEARCH' });
  }
  if (exactitudeReasons.has('EXACT_SEARCH_UNAVAILABLE')) {
    expected.push({ severity: 'info', code: 'EXACT_SEARCH_UNAVAILABLE' });
  }
  const rejectedReasons = [
    'PROVIDER_RESULT_INVALID_INSTANT',
    'PROVIDER_RESULT_OUTSIDE_HORIZON',
    'PROVIDER_RESULT_NOT_EXACT',
  ] as const;
  if (rejectedReasons.some((reason) => exactitudeReasons.has(reason))) {
    expected.push({ severity: 'warning', code: 'EXACT_SEARCH_RESULT_REJECTED' });
  }
  return expected;
};

const canonicalDiagnostics = (
  value: unknown,
  expected: TransitRunV1['diagnostics'],
): value is TransitRunV1['diagnostics'] =>
  Array.isArray(value) &&
  value.length === expected.length &&
  value.every(
    (candidate, index) =>
      isRecord(candidate) &&
      exactKeys(candidate, ['severity', 'code']) &&
      candidate.severity === expected[index]?.severity &&
      candidate.code === expected[index]?.code,
  );

const validTransitRunV1 = (value: unknown): value is TransitRunV1 => {
  if (
    !isRecord(value) ||
    !exactKeys(value, ROOT_KEYS) ||
    value.schemaId !== TRANSIT_RUN_SCHEMA_ID ||
    value.schemaVersion !== TRANSIT_RUN_SCHEMA_VERSION ||
    !canonicalSource(value.source) ||
    !canonicalRequest(value.request) ||
    !canonicalTargetSet(value.targetSet) ||
    !canonicalPresentation(value.presentationPolicy) ||
    !canonicalModels(value.models)
  )
    return false;
  const positions = parsePositions(value.positionsAtReference);
  const targets = parseNatalTargets(value.natalTargets);
  if (positions === null || targets === null) return false;
  const aspects = parseAspects(value.aspects, positions, targets, value.request);
  return (
    aspects !== null &&
    canonicalDiagnostics(value.diagnostics, expectedDiagnostics(positions, targets, aspects, value.request))
  );
};

export function parseTransitRunV1(value: unknown, expectedCalculationId?: string): TransitRunV1ParseResult {
  if (value === null || value === undefined || value === '') return { status: 'legacy' };
  if (typeof value === 'string' && value.length > 1024 * 1024) {
    return { status: 'invalid', reason: 'artefato de trânsitos excede o limite seguro' };
  }
  let candidate: unknown = value;
  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value) as unknown;
    } catch {
      return { status: 'invalid', reason: 'JSON do céu atual inválido' };
    }
  }
  if (!validTransitRunV1(candidate)) {
    return { status: 'invalid', reason: 'contrato de trânsitos v1 inválido ou incompleto' };
  }
  if (expectedCalculationId && candidate.source.natal.calculationId !== expectedCalculationId) {
    return { status: 'invalid', reason: 'o céu atual não corresponde ao mapa solicitado' };
  }
  return { status: 'available', data: candidate };
}

export const transitPhasePtBr = (phase: TransitPhaseV1): string => {
  if (phase.status === 'unavailable') return 'Indeterminada';
  if (phase.phase === 'applying') return 'Aplicativa';
  if (phase.phase === 'separating') return 'Separativa';
  return 'Exata';
};
