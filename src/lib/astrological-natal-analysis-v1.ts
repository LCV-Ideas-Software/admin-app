export const NATAL_CHART_ANALYSIS_SCHEMA_ID = 'urn:astrologo:natal-chart-analysis' as const;
export const NATAL_CHART_ANALYSIS_SCHEMA_VERSION = '1.0.0' as const;

export const NATAL_PLANET_IDS = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const;

export type NatalPlanetId = (typeof NATAL_PLANET_IDS)[number];
export type NatalAngleId = 'ascendant' | 'midheaven';
export type NatalPointId = NatalPlanetId | NatalAngleId;
export type NatalAspectId = 'conjunction' | 'sextile' | 'square' | 'trine' | 'quincunx' | 'opposition';

export interface NatalPointV1 {
  readonly kind: 'planet' | 'angle';
  readonly id: NatalPointId;
  readonly displayNamePtBr: string;
  readonly symbol: string;
  readonly eclipticLongitudeDeg: number;
}

export interface NatalPointReferenceV1 {
  readonly kind: 'planet' | 'angle';
  readonly id: NatalPointId;
}

export type NatalMovementV1 =
  | {
      readonly bodyId: NatalPlanetId;
      readonly status: 'available';
      readonly velocityDegPerDay: number;
      readonly direction: 'direct' | 'retrograde' | 'stationary';
      readonly basis: 'explicit-ecliptic-longitude-velocity';
    }
  | {
      readonly bodyId: NatalPlanetId;
      readonly status: 'unavailable';
      readonly reasonCode: 'LONGITUDINAL_VELOCITY_NOT_PROVIDED';
      readonly basis: 'explicit-ecliptic-longitude-velocity';
    };

export type NatalAspectPhaseV1 =
  | {
      readonly status: 'available';
      readonly phase: 'applying' | 'exact' | 'separating';
      readonly basis: 'exact-angle-tolerance' | 'explicit-longitudinal-velocities';
    }
  | {
      readonly status: 'unavailable';
      readonly reasonCode:
        | 'LONGITUDINAL_VELOCITY_NOT_PROVIDED'
        | 'ANGLE_VELOCITY_NOT_PROVIDED'
        | 'RELATIVE_LONGITUDINAL_VELOCITY_ZERO';
      readonly basis: 'not-calculated';
    };

export interface NatalAspectV1 {
  readonly recordId: string;
  readonly pointA: NatalPointReferenceV1;
  readonly pointB: NatalPointReferenceV1;
  readonly aspectId: NatalAspectId;
  readonly displayNamePtBr: string;
  readonly separationDeg: number;
  readonly exactAngleDeg: number;
  readonly allowedOrbDeg: number;
  readonly orbDeg: number;
  readonly intensityPercent: number;
  readonly phase: NatalAspectPhaseV1;
}

export type NatalHouseOccupancyV1 = {
  readonly bodyId: NatalPlanetId;
  readonly occupancy:
    | {
        readonly status: 'available';
        readonly houseIndex1: number;
        readonly basis: 'dados-posicionais-v2-house-placement';
      }
    | {
        readonly status: 'unavailable';
        readonly reasonCode: 'PLACIDUS_UNAVAILABLE' | 'HOUSE_POSITION_UNAVAILABLE';
        readonly basis: 'dados-posicionais-v2-house-placement';
      };
  readonly mundaneDegreeWithinHouse:
    | {
        readonly status: 'available';
        readonly rawSwissHousePosition: number;
        readonly degreeWithinHouseDeg: number;
        readonly mundaneLongitudeDeg: number;
        readonly coordinateSystem: 'placidus-house-horoscope';
        readonly degreeSemantics: 'normalized-semiarc-house-degree';
        readonly basis: 'explicit-swiss-swe-house-pos';
      }
    | {
        readonly status: 'unavailable';
        readonly reasonCode:
          | 'POSITION_V2_0_DOES_NOT_EXPOSE_MUNDANE_DEGREE'
          | 'PLACIDUS_UNAVAILABLE'
          | 'HOUSE_POSITION_UNAVAILABLE';
        readonly basis: 'explicit-swiss-swe-house-pos';
      };
};

export interface NatalChartAnalysisV1 {
  readonly schemaId: typeof NATAL_CHART_ANALYSIS_SCHEMA_ID;
  readonly schemaVersion: typeof NATAL_CHART_ANALYSIS_SCHEMA_VERSION;
  readonly source: {
    readonly schemaId: 'urn:astrologo:dados-posicionais';
    readonly schemaVersion: '2.0.0';
    readonly calculationId: string;
    readonly calculatedAtUtc: string;
  };
  readonly targetSet: { readonly id: 'hermetic-planets-10-plus-asc-mc-v1'; readonly version: '1.0.0' };
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
      readonly profileId: 'astrologo-natal-major-v1';
      readonly profileVersion: '1.0.0';
      readonly orbPolicy: 'fixed-by-aspect-no-body-modifiers';
      readonly orbBoundaryConvention: 'inclusive';
      readonly separationMethod: 'smallest-angular-distance-0-to-180';
      readonly pairPolicy: 'planet-to-planet-and-planet-to-asc-mc';
      readonly intensityModel: 'linear-from-exact-to-orb-boundary-v1';
      readonly applyingSeparatingMethod: 'explicit-longitudinal-velocity-derivative-v1';
      readonly exactToleranceDeg: 1e-9;
      readonly aspectDefinitions: readonly {
        readonly aspectId: NatalAspectId;
        readonly displayNamePtBr: string;
        readonly exactAngleDeg: number;
        readonly allowedOrbDeg: number;
      }[];
    };
    readonly houses: {
      readonly systemId: 'placidus';
      readonly occupancyBasis: 'dados-posicionais-v2-house-placement';
      readonly mundaneDegreeBasis: 'swiss-swe-house-pos-fraction-times-30';
    };
  };
  readonly points: readonly NatalPointV1[];
  readonly movements: readonly NatalMovementV1[];
  readonly aspects: readonly NatalAspectV1[];
  readonly houseOccupancies: readonly NatalHouseOccupancyV1[];
  readonly diagnostics: readonly {
    readonly severity: 'info' | 'warning';
    readonly code:
      | 'LONGITUDINAL_VELOCITIES_NOT_PROVIDED'
      | 'LONGITUDINAL_VELOCITIES_PARTIAL'
      | 'RAW_SWISS_HOUSE_POSITIONS_NOT_PROVIDED'
      | 'RAW_SWISS_HOUSE_POSITIONS_PARTIAL'
      | 'PLACIDUS_UNAVAILABLE';
  }[];
}

export type NatalChartAnalysisV1ParseResult =
  | { readonly status: 'available'; readonly data: NatalChartAnalysisV1 }
  | { readonly status: 'legacy' }
  | { readonly status: 'invalid'; readonly reason: string };

const ASPECT_DEFINITIONS = [
  { aspectId: 'conjunction', displayNamePtBr: 'Conjunção', exactAngleDeg: 0, allowedOrbDeg: 8 },
  { aspectId: 'sextile', displayNamePtBr: 'Sextil', exactAngleDeg: 60, allowedOrbDeg: 4 },
  { aspectId: 'square', displayNamePtBr: 'Quadratura', exactAngleDeg: 90, allowedOrbDeg: 8 },
  { aspectId: 'trine', displayNamePtBr: 'Trígono', exactAngleDeg: 120, allowedOrbDeg: 8 },
  { aspectId: 'quincunx', displayNamePtBr: 'Quincúncio', exactAngleDeg: 150, allowedOrbDeg: 4 },
  { aspectId: 'opposition', displayNamePtBr: 'Oposição', exactAngleDeg: 180, allowedOrbDeg: 8 },
] as const;

const ANGLE_IDS = ['ascendant', 'midheaven'] as const;
const ROOT_KEYS = [
  'schemaId',
  'schemaVersion',
  'source',
  'targetSet',
  'presentationPolicy',
  'models',
  'points',
  'movements',
  'aspects',
  'houseOccupancies',
  'diagnostics',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isIsoInstant = (value: unknown): value is string =>
  isNonEmptyString(value) && Number.isFinite(Date.parse(value)) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
const closeEnough = (left: number, right: number): boolean => Math.abs(left - right) <= 1e-8;
const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};
const isPlanetId = (value: unknown): value is NatalPlanetId =>
  typeof value === 'string' && (NATAL_PLANET_IDS as readonly string[]).includes(value);
const isAngleId = (value: unknown): value is NatalAngleId =>
  typeof value === 'string' && (ANGLE_IDS as readonly string[]).includes(value);
const pointKey = (point: NatalPointReferenceV1): string => `${point.kind}:${point.id}`;
const angularSeparation = (left: number, right: number): number => {
  const directed = (((right - left) % 360) + 360) % 360;
  return Math.min(directed, 360 - directed);
};

const isCanonicalSource = (value: unknown): value is NatalChartAnalysisV1['source'] =>
  isRecord(value) &&
  hasExactKeys(value, ['schemaId', 'schemaVersion', 'calculationId', 'calculatedAtUtc']) &&
  value.schemaId === 'urn:astrologo:dados-posicionais' &&
  value.schemaVersion === '2.0.0' &&
  isNonEmptyString(value.calculationId) &&
  isIsoInstant(value.calculatedAtUtc);

const isCanonicalPresentation = (value: unknown): value is NatalChartAnalysisV1['presentationPolicy'] =>
  isRecord(value) &&
  hasExactKeys(value, ['locale', 'timeZone', 'timeZoneLabel', 'calendar', 'numberingSystem', 'hourCycle']) &&
  value.locale === 'pt-BR' &&
  value.timeZone === 'America/Sao_Paulo' &&
  value.timeZoneLabel === 'Hora oficial de Brasília' &&
  value.calendar === 'gregory' &&
  value.numberingSystem === 'latn' &&
  value.hourCycle === 'h23';

const isCanonicalModels = (value: unknown): value is NatalChartAnalysisV1['models'] => {
  if (!isRecord(value) || !hasExactKeys(value, ['aspects', 'houses'])) return false;
  const aspects = value.aspects;
  const houses = value.houses;
  if (!isRecord(aspects) || !isRecord(houses)) return false;
  if (
    !hasExactKeys(aspects, [
      'profileId',
      'profileVersion',
      'orbPolicy',
      'orbBoundaryConvention',
      'separationMethod',
      'pairPolicy',
      'intensityModel',
      'applyingSeparatingMethod',
      'exactToleranceDeg',
      'aspectDefinitions',
    ]) ||
    aspects.profileId !== 'astrologo-natal-major-v1' ||
    aspects.profileVersion !== '1.0.0' ||
    aspects.orbPolicy !== 'fixed-by-aspect-no-body-modifiers' ||
    aspects.orbBoundaryConvention !== 'inclusive' ||
    aspects.separationMethod !== 'smallest-angular-distance-0-to-180' ||
    aspects.pairPolicy !== 'planet-to-planet-and-planet-to-asc-mc' ||
    aspects.intensityModel !== 'linear-from-exact-to-orb-boundary-v1' ||
    aspects.applyingSeparatingMethod !== 'explicit-longitudinal-velocity-derivative-v1' ||
    aspects.exactToleranceDeg !== 1e-9 ||
    !Array.isArray(aspects.aspectDefinitions) ||
    aspects.aspectDefinitions.length !== ASPECT_DEFINITIONS.length
  ) {
    return false;
  }
  const definitionsValid = aspects.aspectDefinitions.every((candidate, index) => {
    const expected = ASPECT_DEFINITIONS[index];
    return (
      expected !== undefined &&
      isRecord(candidate) &&
      hasExactKeys(candidate, ['aspectId', 'displayNamePtBr', 'exactAngleDeg', 'allowedOrbDeg']) &&
      candidate.aspectId === expected.aspectId &&
      candidate.displayNamePtBr === expected.displayNamePtBr &&
      candidate.exactAngleDeg === expected.exactAngleDeg &&
      candidate.allowedOrbDeg === expected.allowedOrbDeg
    );
  });
  return (
    definitionsValid &&
    hasExactKeys(houses, ['systemId', 'occupancyBasis', 'mundaneDegreeBasis']) &&
    houses.systemId === 'placidus' &&
    houses.occupancyBasis === 'dados-posicionais-v2-house-placement' &&
    houses.mundaneDegreeBasis === 'swiss-swe-house-pos-fraction-times-30'
  );
};

const parsePoints = (value: unknown): NatalPointV1[] | null => {
  if (!Array.isArray(value) || value.length < 10 || value.length > 12) return null;
  const points: NatalPointV1[] = [];
  for (const [index, candidate] of value.entries()) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ['kind', 'id', 'displayNamePtBr', 'symbol', 'eclipticLongitudeDeg']) ||
      !isNonEmptyString(candidate.displayNamePtBr) ||
      !isNonEmptyString(candidate.symbol) ||
      !isFiniteNumber(candidate.eclipticLongitudeDeg) ||
      candidate.eclipticLongitudeDeg < 0 ||
      candidate.eclipticLongitudeDeg >= 360
    ) {
      return null;
    }
    if (index < NATAL_PLANET_IDS.length) {
      if (candidate.kind !== 'planet' || candidate.id !== NATAL_PLANET_IDS[index]) return null;
    } else {
      const expectedAngle = ANGLE_IDS[index - NATAL_PLANET_IDS.length];
      if (candidate.kind !== 'angle' || candidate.id !== expectedAngle) return null;
      if (
        (candidate.id === 'ascendant' && candidate.symbol !== 'ASC') ||
        (candidate.id === 'midheaven' && candidate.symbol !== 'MC')
      ) {
        return null;
      }
    }
    points.push(candidate as unknown as NatalPointV1);
  }
  return points;
};

const parseMovements = (value: unknown): NatalMovementV1[] | null => {
  if (!Array.isArray(value) || value.length !== NATAL_PLANET_IDS.length) return null;
  const output: NatalMovementV1[] = [];
  for (const [index, candidate] of value.entries()) {
    if (!isRecord(candidate) || candidate.bodyId !== NATAL_PLANET_IDS[index]) return null;
    if (candidate.status === 'available') {
      if (
        !hasExactKeys(candidate, ['bodyId', 'status', 'velocityDegPerDay', 'direction', 'basis']) ||
        !isFiniteNumber(candidate.velocityDegPerDay) ||
        candidate.basis !== 'explicit-ecliptic-longitude-velocity'
      ) {
        return null;
      }
      const direction =
        candidate.velocityDegPerDay > 0 ? 'direct' : candidate.velocityDegPerDay < 0 ? 'retrograde' : 'stationary';
      if (candidate.direction !== direction) return null;
    } else if (
      candidate.status !== 'unavailable' ||
      !hasExactKeys(candidate, ['bodyId', 'status', 'reasonCode', 'basis']) ||
      candidate.reasonCode !== 'LONGITUDINAL_VELOCITY_NOT_PROVIDED' ||
      candidate.basis !== 'explicit-ecliptic-longitude-velocity'
    ) {
      return null;
    }
    output.push(candidate as unknown as NatalMovementV1);
  }
  return output;
};

const isPointReference = (value: unknown): value is NatalPointReferenceV1 => {
  if (!isRecord(value) || !hasExactKeys(value, ['kind', 'id'])) return false;
  return (value.kind === 'planet' && isPlanetId(value.id)) || (value.kind === 'angle' && isAngleId(value.id));
};

const isPhase = (value: unknown): value is NatalAspectPhaseV1 => {
  if (!isRecord(value)) return false;
  if (value.status === 'available') {
    return (
      hasExactKeys(value, ['status', 'phase', 'basis']) &&
      ['applying', 'exact', 'separating'].includes(String(value.phase)) &&
      ['exact-angle-tolerance', 'explicit-longitudinal-velocities'].includes(String(value.basis))
    );
  }
  return (
    value.status === 'unavailable' &&
    hasExactKeys(value, ['status', 'reasonCode', 'basis']) &&
    [
      'LONGITUDINAL_VELOCITY_NOT_PROVIDED',
      'ANGLE_VELOCITY_NOT_PROVIDED',
      'RELATIVE_LONGITUDINAL_VELOCITY_ZERO',
    ].includes(String(value.reasonCode)) &&
    value.basis === 'not-calculated'
  );
};

const parseAspects = (
  value: unknown,
  points: readonly NatalPointV1[],
  movements: readonly NatalMovementV1[],
): NatalAspectV1[] | null => {
  if (!Array.isArray(value) || value.length > 65) return null;
  const pointByKey = new Map(points.map((point) => [pointKey(point), point]));
  const movementByBody = new Map(movements.map((movement) => [movement.bodyId, movement]));
  const seen = new Set<string>();
  const output: NatalAspectV1[] = [];
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, [
        'recordId',
        'pointA',
        'pointB',
        'aspectId',
        'displayNamePtBr',
        'separationDeg',
        'exactAngleDeg',
        'allowedOrbDeg',
        'orbDeg',
        'intensityPercent',
        'phase',
      ]) ||
      !isNonEmptyString(candidate.recordId) ||
      !isPointReference(candidate.pointA) ||
      !isPointReference(candidate.pointB) ||
      !isPhase(candidate.phase)
    ) {
      return null;
    }
    const pointA = pointByKey.get(pointKey(candidate.pointA));
    const pointB = pointByKey.get(pointKey(candidate.pointB));
    const definition = ASPECT_DEFINITIONS.find(({ aspectId }) => aspectId === candidate.aspectId);
    if (!pointA || !pointB || !definition || (pointA.kind === 'angle' && pointB.kind === 'angle')) return null;
    const expectedRecordId = `${pointKey(pointA)}--${pointKey(pointB)}`;
    const separationDeg = angularSeparation(pointA.eclipticLongitudeDeg, pointB.eclipticLongitudeDeg);
    const orbDeg = Math.abs(separationDeg - definition.exactAngleDeg);
    const intensityPercent = Math.max(
      0,
      Math.min(100, ((definition.allowedOrbDeg - orbDeg) / definition.allowedOrbDeg) * 100),
    );
    if (
      candidate.recordId !== expectedRecordId ||
      seen.has(candidate.recordId) ||
      candidate.displayNamePtBr !== definition.displayNamePtBr ||
      !isFiniteNumber(candidate.separationDeg) ||
      !isFiniteNumber(candidate.exactAngleDeg) ||
      !isFiniteNumber(candidate.allowedOrbDeg) ||
      !isFiniteNumber(candidate.orbDeg) ||
      !isFiniteNumber(candidate.intensityPercent) ||
      orbDeg > definition.allowedOrbDeg ||
      !closeEnough(candidate.separationDeg, separationDeg) ||
      !closeEnough(candidate.exactAngleDeg, definition.exactAngleDeg) ||
      !closeEnough(candidate.allowedOrbDeg, definition.allowedOrbDeg) ||
      !closeEnough(candidate.orbDeg, orbDeg) ||
      !closeEnough(candidate.intensityPercent, intensityPercent)
    ) {
      return null;
    }
    if (orbDeg <= 1e-9) {
      if (
        candidate.phase.status !== 'available' ||
        candidate.phase.phase !== 'exact' ||
        candidate.phase.basis !== 'exact-angle-tolerance'
      )
        return null;
    } else if (pointA.kind === 'angle' || pointB.kind === 'angle') {
      if (candidate.phase.status !== 'unavailable' || candidate.phase.reasonCode !== 'ANGLE_VELOCITY_NOT_PROVIDED')
        return null;
    } else if (
      movementByBody.get(pointA.id as NatalPlanetId)?.status !== 'available' ||
      movementByBody.get(pointB.id as NatalPlanetId)?.status !== 'available'
    ) {
      if (
        candidate.phase.status !== 'unavailable' ||
        candidate.phase.reasonCode !== 'LONGITUDINAL_VELOCITY_NOT_PROVIDED'
      )
        return null;
    }
    seen.add(candidate.recordId);
    output.push(candidate as unknown as NatalAspectV1);
  }
  return output;
};

const parseHouseOccupancies = (value: unknown): NatalHouseOccupancyV1[] | null => {
  if (!Array.isArray(value) || value.length !== NATAL_PLANET_IDS.length) return null;
  const output: NatalHouseOccupancyV1[] = [];
  for (const [index, candidate] of value.entries()) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ['bodyId', 'occupancy', 'mundaneDegreeWithinHouse']) ||
      candidate.bodyId !== NATAL_PLANET_IDS[index]
    )
      return null;
    const occupancy = candidate.occupancy;
    const mundane = candidate.mundaneDegreeWithinHouse;
    if (!isRecord(occupancy) || !isRecord(mundane)) return null;
    if (occupancy.status === 'available') {
      if (
        !hasExactKeys(occupancy, ['status', 'houseIndex1', 'basis']) ||
        !Number.isInteger(occupancy.houseIndex1) ||
        Number(occupancy.houseIndex1) < 1 ||
        Number(occupancy.houseIndex1) > 12 ||
        occupancy.basis !== 'dados-posicionais-v2-house-placement'
      )
        return null;
    } else if (
      occupancy.status !== 'unavailable' ||
      !hasExactKeys(occupancy, ['status', 'reasonCode', 'basis']) ||
      !['PLACIDUS_UNAVAILABLE', 'HOUSE_POSITION_UNAVAILABLE'].includes(String(occupancy.reasonCode)) ||
      occupancy.basis !== 'dados-posicionais-v2-house-placement'
    )
      return null;

    if (mundane.status === 'available') {
      if (
        !hasExactKeys(mundane, [
          'status',
          'rawSwissHousePosition',
          'degreeWithinHouseDeg',
          'mundaneLongitudeDeg',
          'coordinateSystem',
          'degreeSemantics',
          'basis',
        ]) ||
        !isFiniteNumber(mundane.rawSwissHousePosition) ||
        mundane.rawSwissHousePosition < 1 ||
        mundane.rawSwissHousePosition >= 13 ||
        !isFiniteNumber(mundane.degreeWithinHouseDeg) ||
        !isFiniteNumber(mundane.mundaneLongitudeDeg) ||
        mundane.coordinateSystem !== 'placidus-house-horoscope' ||
        mundane.degreeSemantics !== 'normalized-semiarc-house-degree' ||
        mundane.basis !== 'explicit-swiss-swe-house-pos' ||
        occupancy.status !== 'available' ||
        Math.floor(mundane.rawSwissHousePosition) !== occupancy.houseIndex1 ||
        !closeEnough(
          mundane.degreeWithinHouseDeg,
          (mundane.rawSwissHousePosition - Math.floor(mundane.rawSwissHousePosition)) * 30,
        ) ||
        !closeEnough(mundane.mundaneLongitudeDeg, (mundane.rawSwissHousePosition - 1) * 30)
      )
        return null;
    } else if (
      mundane.status !== 'unavailable' ||
      !hasExactKeys(mundane, ['status', 'reasonCode', 'basis']) ||
      !['POSITION_V2_0_DOES_NOT_EXPOSE_MUNDANE_DEGREE', 'PLACIDUS_UNAVAILABLE', 'HOUSE_POSITION_UNAVAILABLE'].includes(
        String(mundane.reasonCode),
      ) ||
      mundane.basis !== 'explicit-swiss-swe-house-pos' ||
      (occupancy.status === 'available'
        ? mundane.reasonCode !== 'POSITION_V2_0_DOES_NOT_EXPOSE_MUNDANE_DEGREE'
        : mundane.reasonCode !== occupancy.reasonCode)
    )
      return null;
    output.push(candidate as unknown as NatalHouseOccupancyV1);
  }
  return output;
};

const isDiagnostics = (value: unknown): value is NatalChartAnalysisV1['diagnostics'] => {
  if (!Array.isArray(value) || value.length > 3) return false;
  const seen = new Set<string>();
  return value.every((candidate) => {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ['severity', 'code'])) return false;
    const valid =
      ['info', 'warning'].includes(String(candidate.severity)) &&
      [
        'LONGITUDINAL_VELOCITIES_NOT_PROVIDED',
        'LONGITUDINAL_VELOCITIES_PARTIAL',
        'RAW_SWISS_HOUSE_POSITIONS_NOT_PROVIDED',
        'RAW_SWISS_HOUSE_POSITIONS_PARTIAL',
        'PLACIDUS_UNAVAILABLE',
      ].includes(String(candidate.code));
    const key = `${candidate.severity}:${candidate.code}`;
    if (!valid || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const validateNatalChartAnalysisV1 = (value: unknown): value is NatalChartAnalysisV1 => {
  if (!isRecord(value) || !hasExactKeys(value, ROOT_KEYS)) return false;
  if (
    value.schemaId !== NATAL_CHART_ANALYSIS_SCHEMA_ID ||
    value.schemaVersion !== NATAL_CHART_ANALYSIS_SCHEMA_VERSION ||
    !isCanonicalSource(value.source) ||
    !isRecord(value.targetSet) ||
    !hasExactKeys(value.targetSet, ['id', 'version']) ||
    value.targetSet.id !== 'hermetic-planets-10-plus-asc-mc-v1' ||
    value.targetSet.version !== '1.0.0' ||
    !isCanonicalPresentation(value.presentationPolicy) ||
    !isCanonicalModels(value.models)
  )
    return false;
  const points = parsePoints(value.points);
  const movements = parseMovements(value.movements);
  if (!points || !movements) return false;
  return (
    parseAspects(value.aspects, points, movements) !== null &&
    parseHouseOccupancies(value.houseOccupancies) !== null &&
    isDiagnostics(value.diagnostics)
  );
};

export function parseNatalChartAnalysisV1(
  value: unknown,
  expectedCalculationId?: string,
): NatalChartAnalysisV1ParseResult {
  if (value === null || value === undefined || value === '') return { status: 'legacy' };
  let candidate: unknown = value;
  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value) as unknown;
    } catch {
      return { status: 'invalid', reason: 'JSON do artefato natal inválido' };
    }
  }
  if (!validateNatalChartAnalysisV1(candidate)) {
    return { status: 'invalid', reason: 'contrato natal v1 inválido ou incompleto' };
  }
  if (expectedCalculationId && candidate.source.calculationId !== expectedCalculationId) {
    return { status: 'invalid', reason: 'artefato natal não corresponde ao mapa solicitado' };
  }
  return { status: 'available', data: candidate };
}

export const formatNatalAspectPhasePtBr = (phase: NatalAspectPhaseV1): string => {
  if (phase.status === 'unavailable') return 'Fase indisponível';
  if (phase.phase === 'applying') return 'Aplicativo';
  if (phase.phase === 'separating') return 'Separativo';
  return 'Exato';
};

export const mundaneDegreeUnavailablePtBr = (house: NatalHouseOccupancyV1): string => {
  if (house.occupancy.status === 'unavailable') return 'Casa Placidus indisponível para este planeta.';
  return 'Grau mundano indisponível; ele não foi estimado pelas cúspides.';
};
