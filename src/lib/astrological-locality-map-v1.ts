import { PLANET_BODY_IDS, PLANET_LABEL_BY_ID, type PlanetBodyId } from './astrological-position-v2';

export const LOCALITY_MAP_SCHEMA_ID = 'urn:astrologo:locality-map' as const;
export const LOCALITY_MAP_SCHEMA_VERSION = '1.0.0' as const;

export type LocalityAngleId = 'mc' | 'ic' | 'ascendant' | 'descendant';
export type LocalityCoordinate = readonly [longitudeDeg: number, latitudeDeg: number];

export type LocalityLineAvailability =
  | { readonly status: 'available'; readonly sampledLatitudeCount: number; readonly solvedLatitudeCount: number }
  | { readonly status: 'partial'; readonly sampledLatitudeCount: number; readonly solvedLatitudeCount: number }
  | {
      readonly status: 'unavailable';
      readonly sampledLatitudeCount: number;
      readonly solvedLatitudeCount: 0;
      readonly reasonCode: 'NO_GEOMETRIC_HORIZON_CROSSING_ON_SAMPLING_GRID';
    };

export interface LocalityLineV1 {
  readonly recordId: string;
  readonly bodyId: PlanetBodyId;
  readonly bodyDisplayNamePtBr: string;
  readonly bodySymbol: string;
  readonly angleId: LocalityAngleId;
  readonly angleDisplayNamePtBr: string;
  readonly availability: LocalityLineAvailability;
  readonly geometry: {
    readonly type: 'MultiLineString';
    readonly coordinates: readonly (readonly LocalityCoordinate[])[];
  };
}

export interface LocalityMapV1 {
  readonly schemaId: typeof LOCALITY_MAP_SCHEMA_ID;
  readonly schemaVersion: typeof LOCALITY_MAP_SCHEMA_VERSION;
  readonly source: {
    readonly schemaId: 'urn:astrologo:dados-posicionais';
    readonly schemaVersion: '2.0.0';
    readonly calculationId: string;
    readonly calculatedAtUtc: string;
    readonly birthInstantUtc: string;
    readonly sourceHashAlgorithm: 'sha256';
    readonly sourceHashSha256: string;
    readonly sourceHashVerification: 'caller-supplied-format-validated';
  };
  readonly targetSet: {
    readonly id: 'hermetic-planets-10-angles-4-v1';
    readonly version: '1.0.0';
    readonly orderedBodyIds: readonly PlanetBodyId[];
    readonly orderedAngleIds: readonly LocalityAngleId[];
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
    readonly sourceCoordinates: {
      readonly sourceContract: 'DadosPosicionaisV2';
      readonly sourceContractVersion: '2.0.0';
      readonly sourceFrame: 'geocentric-apparent-eqj-j2000';
      readonly sourceProducerMethod: 'astronomy-engine-GeoVector-aberration-true-plus-EquatorFromVector';
      readonly engineId: 'astronomy-engine';
      readonly engineVersion: '2.1.19';
      readonly engineSourceSha256: string;
      readonly workingFrame: 'geocentric-apparent-true-equator-of-date-eqd';
      readonly transformation: {
        readonly methodId: 'astronomy-engine-Rotation_EQJ_EQD-v1';
        readonly precessionApplied: true;
        readonly nutationApplied: true;
        readonly calculatedForInstantUtc: string;
      };
    };
    readonly siderealTime: {
      readonly kind: 'greenwich-apparent-sidereal-time';
      readonly hours: number;
      readonly provenance: {
        readonly engineId: string;
        readonly engineVersion: string;
        readonly methodId: string;
        readonly engineSourceSha256: string;
        readonly calculatedForInstantUtc: string;
      };
    };
    readonly geometry: {
      readonly modelId: 'astrocartography-geometric-horizon-v1';
      readonly modelVersion: '1.0.0';
      readonly altitudeReferenceDeg: 0;
      readonly refractionModel: 'none';
      readonly observerElevationModel: 'not-applied';
      readonly longitudeConvention: 'east-positive-[-180,180]';
      readonly coordinateOrder: 'longitude-latitude';
      readonly ascendantHourAngleSign: 'negative';
      readonly descendantHourAngleSign: 'positive';
      readonly antimeridianPolicy: 'split-and-interpolate-boundary-v1';
    };
    readonly sampling: {
      readonly latitudeResolutionDeg: number;
      readonly latitudeDomain: '(-90,90)';
      readonly equatorIncluded: true;
      readonly sampledLatitudeCount: number;
    };
  };
  readonly bodies: readonly {
    readonly bodyId: PlanetBodyId;
    readonly displayNamePtBr: string;
    readonly symbol: string;
    readonly sourceEquatorialEqj: {
      readonly frameId: 'geocentric-apparent-eqj-j2000';
      readonly rightAscensionHours: number;
      readonly declinationDeg: number;
    };
    readonly workingEquatorialEqd: {
      readonly frameId: 'geocentric-apparent-true-equator-of-date-eqd';
      readonly rightAscensionHours: number;
      readonly declinationDeg: number;
    };
  }[];
  readonly lines: readonly LocalityLineV1[];
  readonly diagnostics: readonly (
    | {
        readonly severity: 'info';
        readonly code: 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED';
        readonly latitudeDeg: -90 | 90;
      }
    | {
        readonly severity: 'info';
        readonly code:
          | 'CIRCUMPOLAR_NO_GEOMETRIC_HORIZON_CROSSING'
          | 'TANGENT_HORIZON_NO_CROSSING'
          | 'CELESTIAL_POLE_NO_UNIQUE_HORIZON_CROSSING';
        readonly bodyId: PlanetBodyId;
        readonly sampledLatitudeRange: {
          readonly startLatitudeDeg: number;
          readonly endLatitudeDeg: number;
        };
      }
  )[];
}

export type LocalityMapV1ParseResult =
  | { readonly status: 'available'; readonly data: LocalityMapV1 }
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

const ANGLES = [
  ['mc', 'Meio do Céu'],
  ['ic', 'Fundo do Céu'],
  ['ascendant', 'Ascendente'],
  ['descendant', 'Descendente'],
] as const;

const ROOT_KEYS = [
  'schemaId',
  'schemaVersion',
  'source',
  'targetSet',
  'presentationPolicy',
  'models',
  'bodies',
  'lines',
  'diagnostics',
] as const;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isUtc = (value: unknown): value is string =>
  typeof value === 'string' && UTC_PATTERN.test(value) && Number.isFinite(Date.parse(value));
const isPlanetId = (value: unknown): value is PlanetBodyId =>
  typeof value === 'string' && (PLANET_BODY_IDS as readonly string[]).includes(value);
const finiteInRange = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;

const canonicalPresentation = (value: unknown): boolean =>
  isRecord(value) &&
  exactKeys(value, ['locale', 'timeZone', 'timeZoneLabel', 'calendar', 'numberingSystem', 'hourCycle']) &&
  value.locale === 'pt-BR' &&
  value.timeZone === 'America/Sao_Paulo' &&
  value.timeZoneLabel === 'Hora oficial de Brasília' &&
  value.calendar === 'gregory' &&
  value.numberingSystem === 'latn' &&
  value.hourCycle === 'h23';

const canonicalSource = (value: unknown): value is LocalityMapV1['source'] =>
  isRecord(value) &&
  exactKeys(value, [
    'schemaId',
    'schemaVersion',
    'calculationId',
    'calculatedAtUtc',
    'birthInstantUtc',
    'sourceHashAlgorithm',
    'sourceHashSha256',
    'sourceHashVerification',
  ]) &&
  value.schemaId === 'urn:astrologo:dados-posicionais' &&
  value.schemaVersion === '2.0.0' &&
  isNonEmptyString(value.calculationId) &&
  isUtc(value.calculatedAtUtc) &&
  isUtc(value.birthInstantUtc) &&
  value.sourceHashAlgorithm === 'sha256' &&
  SHA256_PATTERN.test(String(value.sourceHashSha256)) &&
  value.sourceHashVerification === 'caller-supplied-format-validated';

const canonicalTargetSet = (value: unknown): boolean =>
  isRecord(value) &&
  exactKeys(value, ['id', 'version', 'orderedBodyIds', 'orderedAngleIds']) &&
  value.id === 'hermetic-planets-10-angles-4-v1' &&
  value.version === '1.0.0' &&
  Array.isArray(value.orderedBodyIds) &&
  value.orderedBodyIds.length === PLANET_BODY_IDS.length &&
  value.orderedBodyIds.every((bodyId, index) => bodyId === PLANET_BODY_IDS[index]) &&
  Array.isArray(value.orderedAngleIds) &&
  value.orderedAngleIds.length === ANGLES.length &&
  value.orderedAngleIds.every((angleId, index) => angleId === ANGLES[index]?.[0]);

const expectedSamplingCount = (resolutionDeg: number): number => {
  const positiveCount = Array.from({ length: Math.ceil(90 / resolutionDeg) - 1 }, (_, index) =>
    Number(((index + 1) * resolutionDeg).toPrecision(15)),
  ).filter((latitude) => latitude < 90).length;
  return positiveCount * 2 + 1;
};

const canonicalModels = (value: unknown, birthInstantUtc: string): value is LocalityMapV1['models'] => {
  if (!isRecord(value) || !exactKeys(value, ['sourceCoordinates', 'siderealTime', 'geometry', 'sampling']))
    return false;
  const source = value.sourceCoordinates;
  const sidereal = value.siderealTime;
  const geometry = value.geometry;
  const sampling = value.sampling;
  if (!isRecord(source) || !isRecord(sidereal) || !isRecord(geometry) || !isRecord(sampling)) return false;
  if (
    !exactKeys(source, [
      'sourceContract',
      'sourceContractVersion',
      'sourceFrame',
      'sourceProducerMethod',
      'engineId',
      'engineVersion',
      'engineSourceSha256',
      'workingFrame',
      'transformation',
    ]) ||
    source.sourceContract !== 'DadosPosicionaisV2' ||
    source.sourceContractVersion !== '2.0.0' ||
    source.sourceFrame !== 'geocentric-apparent-eqj-j2000' ||
    source.sourceProducerMethod !== 'astronomy-engine-GeoVector-aberration-true-plus-EquatorFromVector' ||
    source.engineId !== 'astronomy-engine' ||
    source.engineVersion !== '2.1.19' ||
    !SHA256_PATTERN.test(String(source.engineSourceSha256)) ||
    source.workingFrame !== 'geocentric-apparent-true-equator-of-date-eqd' ||
    !isRecord(source.transformation) ||
    !exactKeys(source.transformation, [
      'methodId',
      'precessionApplied',
      'nutationApplied',
      'calculatedForInstantUtc',
    ]) ||
    source.transformation.methodId !== 'astronomy-engine-Rotation_EQJ_EQD-v1' ||
    source.transformation.precessionApplied !== true ||
    source.transformation.nutationApplied !== true ||
    source.transformation.calculatedForInstantUtc !== birthInstantUtc
  )
    return false;
  if (
    !exactKeys(sidereal, ['kind', 'hours', 'provenance']) ||
    sidereal.kind !== 'greenwich-apparent-sidereal-time' ||
    typeof sidereal.hours !== 'number' ||
    !Number.isFinite(sidereal.hours) ||
    sidereal.hours < 0 ||
    sidereal.hours >= 24 ||
    !isRecord(sidereal.provenance)
  )
    return false;
  const siderealProvenance = sidereal.provenance;
  if (
    !exactKeys(siderealProvenance, [
      'engineId',
      'engineVersion',
      'methodId',
      'engineSourceSha256',
      'calculatedForInstantUtc',
    ]) ||
    !['engineId', 'engineVersion', 'methodId'].every((key) => isNonEmptyString(siderealProvenance[key])) ||
    !SHA256_PATTERN.test(String(siderealProvenance.engineSourceSha256)) ||
    siderealProvenance.calculatedForInstantUtc !== birthInstantUtc
  )
    return false;
  if (
    !exactKeys(geometry, [
      'modelId',
      'modelVersion',
      'altitudeReferenceDeg',
      'refractionModel',
      'observerElevationModel',
      'longitudeConvention',
      'coordinateOrder',
      'ascendantHourAngleSign',
      'descendantHourAngleSign',
      'antimeridianPolicy',
    ]) ||
    geometry.modelId !== 'astrocartography-geometric-horizon-v1' ||
    geometry.modelVersion !== '1.0.0' ||
    geometry.altitudeReferenceDeg !== 0 ||
    geometry.refractionModel !== 'none' ||
    geometry.observerElevationModel !== 'not-applied' ||
    geometry.longitudeConvention !== 'east-positive-[-180,180]' ||
    geometry.coordinateOrder !== 'longitude-latitude' ||
    geometry.ascendantHourAngleSign !== 'negative' ||
    geometry.descendantHourAngleSign !== 'positive' ||
    geometry.antimeridianPolicy !== 'split-and-interpolate-boundary-v1'
  )
    return false;
  return (
    exactKeys(sampling, ['latitudeResolutionDeg', 'latitudeDomain', 'equatorIncluded', 'sampledLatitudeCount']) &&
    typeof sampling.latitudeResolutionDeg === 'number' &&
    Number.isFinite(sampling.latitudeResolutionDeg) &&
    sampling.latitudeResolutionDeg >= 0.25 &&
    sampling.latitudeResolutionDeg <= 5 &&
    sampling.latitudeDomain === '(-90,90)' &&
    sampling.equatorIncluded === true &&
    Number.isInteger(sampling.sampledLatitudeCount) &&
    sampling.sampledLatitudeCount === expectedSamplingCount(sampling.latitudeResolutionDeg)
  );
};

const parseBodies = (value: unknown): LocalityMapV1['bodies'] | null => {
  if (!Array.isArray(value) || value.length !== PLANET_BODY_IDS.length) return null;
  for (const [index, candidate] of value.entries()) {
    const bodyId = PLANET_BODY_IDS[index];
    if (
      !bodyId ||
      !isRecord(candidate) ||
      !exactKeys(candidate, ['bodyId', 'displayNamePtBr', 'symbol', 'sourceEquatorialEqj', 'workingEquatorialEqd']) ||
      candidate.bodyId !== bodyId ||
      candidate.displayNamePtBr !== PLANET_LABEL_BY_ID[bodyId] ||
      candidate.symbol !== PLANET_SYMBOLS[bodyId] ||
      !isRecord(candidate.sourceEquatorialEqj) ||
      !exactKeys(candidate.sourceEquatorialEqj, ['frameId', 'rightAscensionHours', 'declinationDeg']) ||
      candidate.sourceEquatorialEqj.frameId !== 'geocentric-apparent-eqj-j2000' ||
      !finiteInRange(candidate.sourceEquatorialEqj.rightAscensionHours, 0, 24) ||
      candidate.sourceEquatorialEqj.rightAscensionHours === 24 ||
      !finiteInRange(candidate.sourceEquatorialEqj.declinationDeg, -90, 90) ||
      !isRecord(candidate.workingEquatorialEqd) ||
      !exactKeys(candidate.workingEquatorialEqd, ['frameId', 'rightAscensionHours', 'declinationDeg']) ||
      candidate.workingEquatorialEqd.frameId !== 'geocentric-apparent-true-equator-of-date-eqd' ||
      !finiteInRange(candidate.workingEquatorialEqd.rightAscensionHours, 0, 24) ||
      candidate.workingEquatorialEqd.rightAscensionHours === 24 ||
      !finiteInRange(candidate.workingEquatorialEqd.declinationDeg, -90, 90)
    )
      return null;
  }
  return value as unknown as LocalityMapV1['bodies'];
};

const canonicalAvailability = (value: unknown, sampledCount: number): value is LocalityLineAvailability => {
  if (!isRecord(value)) return false;
  if (value.status === 'available') {
    return (
      exactKeys(value, ['status', 'sampledLatitudeCount', 'solvedLatitudeCount']) &&
      value.sampledLatitudeCount === sampledCount &&
      value.solvedLatitudeCount === sampledCount
    );
  }
  if (value.status === 'partial') {
    return (
      exactKeys(value, ['status', 'sampledLatitudeCount', 'solvedLatitudeCount']) &&
      value.sampledLatitudeCount === sampledCount &&
      Number.isInteger(value.solvedLatitudeCount) &&
      Number(value.solvedLatitudeCount) > 0 &&
      Number(value.solvedLatitudeCount) < sampledCount
    );
  }
  return (
    value.status === 'unavailable' &&
    exactKeys(value, ['status', 'sampledLatitudeCount', 'solvedLatitudeCount', 'reasonCode']) &&
    value.sampledLatitudeCount === sampledCount &&
    value.solvedLatitudeCount === 0 &&
    value.reasonCode === 'NO_GEOMETRIC_HORIZON_CROSSING_ON_SAMPLING_GRID'
  );
};

const canonicalGeometry = (value: unknown, availability: LocalityLineAvailability): boolean => {
  if (!isRecord(value) || !exactKeys(value, ['type', 'coordinates']) || value.type !== 'MultiLineString') return false;
  if (!Array.isArray(value.coordinates)) return false;
  if (availability.status === 'unavailable') return value.coordinates.length === 0;
  if (value.coordinates.length === 0) return false;
  return value.coordinates.every((segment) => {
    if (!Array.isArray(segment) || segment.length === 0) return false;
    let previousLongitude: number | null = null;
    for (const coordinate of segment) {
      if (
        !Array.isArray(coordinate) ||
        coordinate.length !== 2 ||
        !finiteInRange(coordinate[0], -180, 180) ||
        !finiteInRange(coordinate[1], -90, 90) ||
        Math.abs(coordinate[1]) === 90 ||
        (previousLongitude !== null && Math.abs(coordinate[0] - previousLongitude) > 180 + 1e-8)
      )
        return false;
      previousLongitude = coordinate[0];
    }
    return true;
  });
};

const parseLines = (
  value: unknown,
  bodies: LocalityMapV1['bodies'],
  sampledCount: number,
): LocalityMapV1['lines'] | null => {
  if (!Array.isArray(value) || value.length !== PLANET_BODY_IDS.length * ANGLES.length) return null;
  for (const [index, candidate] of value.entries()) {
    const body = bodies[Math.floor(index / ANGLES.length)];
    const angle = ANGLES[index % ANGLES.length];
    if (
      !body ||
      !angle ||
      !isRecord(candidate) ||
      !exactKeys(candidate, [
        'recordId',
        'bodyId',
        'bodyDisplayNamePtBr',
        'bodySymbol',
        'angleId',
        'angleDisplayNamePtBr',
        'availability',
        'geometry',
      ]) ||
      candidate.recordId !== `${body.bodyId}:${angle[0]}` ||
      candidate.bodyId !== body.bodyId ||
      candidate.bodyDisplayNamePtBr !== body.displayNamePtBr ||
      candidate.bodySymbol !== body.symbol ||
      candidate.angleId !== angle[0] ||
      candidate.angleDisplayNamePtBr !== angle[1] ||
      !canonicalAvailability(candidate.availability, sampledCount) ||
      ((angle[0] === 'mc' || angle[0] === 'ic') && candidate.availability.status !== 'available') ||
      !canonicalGeometry(candidate.geometry, candidate.availability)
    )
      return null;
  }
  return value as unknown as LocalityMapV1['lines'];
};

const canonicalDiagnostics = (value: unknown): value is LocalityMapV1['diagnostics'] => {
  if (!Array.isArray(value) || value.length < 2) return false;
  if (
    !isRecord(value[0]) ||
    !exactKeys(value[0], ['severity', 'code', 'latitudeDeg']) ||
    value[0].severity !== 'info' ||
    value[0].code !== 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED' ||
    value[0].latitudeDeg !== -90 ||
    !isRecord(value[1]) ||
    !exactKeys(value[1], ['severity', 'code', 'latitudeDeg']) ||
    value[1].severity !== 'info' ||
    value[1].code !== 'GEOGRAPHIC_POLE_LONGITUDE_UNDEFINED' ||
    value[1].latitudeDeg !== 90
  )
    return false;
  return value
    .slice(2)
    .every(
      (candidate) =>
        isRecord(candidate) &&
        exactKeys(candidate, ['severity', 'code', 'bodyId', 'sampledLatitudeRange']) &&
        candidate.severity === 'info' &&
        [
          'CIRCUMPOLAR_NO_GEOMETRIC_HORIZON_CROSSING',
          'TANGENT_HORIZON_NO_CROSSING',
          'CELESTIAL_POLE_NO_UNIQUE_HORIZON_CROSSING',
        ].includes(String(candidate.code)) &&
        isPlanetId(candidate.bodyId) &&
        isRecord(candidate.sampledLatitudeRange) &&
        exactKeys(candidate.sampledLatitudeRange, ['startLatitudeDeg', 'endLatitudeDeg']) &&
        finiteInRange(candidate.sampledLatitudeRange.startLatitudeDeg, -90, 90) &&
        finiteInRange(candidate.sampledLatitudeRange.endLatitudeDeg, -90, 90) &&
        candidate.sampledLatitudeRange.startLatitudeDeg <= candidate.sampledLatitudeRange.endLatitudeDeg,
    );
};

const validLocalityMapV1 = (value: unknown): value is LocalityMapV1 => {
  if (
    !isRecord(value) ||
    !exactKeys(value, ROOT_KEYS) ||
    value.schemaId !== LOCALITY_MAP_SCHEMA_ID ||
    value.schemaVersion !== LOCALITY_MAP_SCHEMA_VERSION ||
    !canonicalSource(value.source) ||
    !canonicalTargetSet(value.targetSet) ||
    !canonicalPresentation(value.presentationPolicy) ||
    !canonicalModels(value.models, value.source.birthInstantUtc)
  )
    return false;
  const bodies = parseBodies(value.bodies);
  if (!bodies) return false;
  return (
    parseLines(value.lines, bodies, value.models.sampling.sampledLatitudeCount) !== null &&
    canonicalDiagnostics(value.diagnostics)
  );
};

export function parseLocalityMapV1(value: unknown, expectedCalculationId?: string): LocalityMapV1ParseResult {
  if (value === null || value === undefined || value === '') return { status: 'legacy' };
  if (typeof value === 'string' && value.length > 4 * 1024 * 1024) {
    return { status: 'invalid', reason: 'artefato de localidade excede o limite seguro' };
  }
  let candidate: unknown = value;
  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value) as unknown;
    } catch {
      return { status: 'invalid', reason: 'JSON do mapa de localidade inválido' };
    }
  }
  if (!validLocalityMapV1(candidate)) {
    return { status: 'invalid', reason: 'contrato de localidade v1 inválido ou incompleto' };
  }
  if (expectedCalculationId && candidate.source.calculationId !== expectedCalculationId) {
    return { status: 'invalid', reason: 'o mapa de localidade não corresponde ao mapa solicitado' };
  }
  return { status: 'available', data: candidate };
}

export const localityAvailabilityPtBr = (line: LocalityLineV1): string => {
  if (line.availability.status === 'available') return 'Disponível em toda a grade amostrada';
  if (line.availability.status === 'partial') {
    return `Parcial: ${line.availability.solvedLatitudeCount} de ${line.availability.sampledLatitudeCount} latitudes`;
  }
  return 'Indisponível na grade amostrada';
};
