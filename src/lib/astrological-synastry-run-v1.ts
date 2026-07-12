import { PLANET_BODY_IDS, PLANET_LABEL_BY_ID, type PlanetBodyId } from './astrological-position-v2';

export const SYNASTRY_RUN_SCHEMA_ID = 'urn:astrologo:synastry-run' as const;
export const SYNASTRY_RUN_SCHEMA_VERSION = '1.0.0' as const;

export type SynastryAspectId = 'conjunction' | 'sextile' | 'square' | 'trine' | 'quincunx' | 'opposition';

export type SynastryHouseOverlayV1 = {
  readonly direction: 'A-to-B' | 'B-to-A';
  readonly sourceChartRef: 'A' | 'B';
  readonly sourceBodyId: PlanetBodyId;
  readonly targetChartRef: 'A' | 'B';
  readonly placement:
    | {
        readonly status: 'available';
        readonly houseIndex1: number;
        readonly basis: 'recipient-placidus-cusps-ecliptic-longitude';
        readonly intervalConvention: '[cusp,next-cusp)';
      }
    | {
        readonly status: 'unavailable';
        readonly reasonCode: 'PLACIDUS_UNAVAILABLE';
        readonly basis: 'recipient-placidus-cusps-ecliptic-longitude';
      };
};

export interface SynastryRunV1 {
  readonly schemaId: typeof SYNASTRY_RUN_SCHEMA_ID;
  readonly schemaVersion: typeof SYNASTRY_RUN_SCHEMA_VERSION;
  readonly charts: {
    readonly A: {
      readonly schemaId: 'urn:astrologo:dados-posicionais';
      readonly schemaVersion: '2.0.0';
      readonly calculationId: string;
      readonly calculatedAtUtc: string;
      readonly birthInstantUtc: string;
    };
    readonly B: {
      readonly schemaId: 'urn:astrologo:dados-posicionais';
      readonly schemaVersion: '2.0.0';
      readonly calculationId: string;
      readonly calculatedAtUtc: string;
      readonly birthInstantUtc: string;
    };
  };
  readonly targetSet: {
    readonly id: 'hermetic-planets-10-cross-chart-v1';
    readonly version: '1.0.0';
    readonly orderedBodyIds: readonly PlanetBodyId[];
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
      readonly profileId: 'astrologo-synastry-major-v1';
      readonly profileVersion: '1.0.0';
      readonly orbPolicy: 'fixed-by-aspect-no-body-modifiers';
      readonly orbBoundaryConvention: 'inclusive';
      readonly separationMethod: 'smallest-angular-distance-0-to-180';
      readonly pairPolicy: 'all-chart-a-planets-to-all-chart-b-planets';
      readonly applyingSeparatingPolicy: 'not-calculated-without-longitudinal-velocities';
      readonly exactToleranceDeg: 1e-9;
      readonly aspectDefinitions: readonly {
        readonly aspectId: SynastryAspectId;
        readonly displayNamePtBr: string;
        readonly exactAngleDeg: number;
        readonly allowedOrbDeg: number;
      }[];
    };
    readonly houseOverlays: {
      readonly systemId: 'placidus';
      readonly sourceCoordinate: 'geocentric-true-ecliptic-longitude-of-date';
      readonly recipientBoundarySource: 'dados-posicionais-v2-cusps';
      readonly intervalConvention: '[cusp,next-cusp)';
    };
  };
  readonly aspects: readonly {
    readonly recordId: string;
    readonly pointA: { readonly chartRef: 'A'; readonly bodyId: PlanetBodyId };
    readonly pointB: { readonly chartRef: 'B'; readonly bodyId: PlanetBodyId };
    readonly aspectId: SynastryAspectId;
    readonly displayNamePtBr: string;
    readonly separationDeg: number;
    readonly exactAngleDeg: number;
    readonly allowedOrbDeg: number;
    readonly orbDeg: number;
  }[];
  readonly houseOverlays: {
    readonly aToB: readonly SynastryHouseOverlayV1[];
    readonly bToA: readonly SynastryHouseOverlayV1[];
  };
  readonly diagnostics: readonly {
    readonly severity: 'warning';
    readonly code: 'CHART_A_PLACIDUS_UNAVAILABLE' | 'CHART_B_PLACIDUS_UNAVAILABLE';
  }[];
}

export interface SynastrySubjectNames {
  readonly A: string;
  readonly B: string;
  readonly primaryCalculationId?: string;
  readonly secondaryCalculationId?: string;
}

export type SynastryRunV1ParseResult =
  | { readonly status: 'available'; readonly data: SynastryRunV1 }
  | { readonly status: 'legacy' }
  | { readonly status: 'invalid'; readonly reason: string };

const ASPECT_DEFINITIONS = [
  ['conjunction', 'Conjunção', 0, 8],
  ['sextile', 'Sextil', 60, 4],
  ['square', 'Quadratura', 90, 8],
  ['trine', 'Trígono', 120, 8],
  ['quincunx', 'Quincúncio', 150, 4],
  ['opposition', 'Oposição', 180, 8],
] as const;

const ROOT_KEYS = [
  'schemaId',
  'schemaVersion',
  'charts',
  'targetSet',
  'presentationPolicy',
  'models',
  'aspects',
  'houseOverlays',
  'diagnostics',
] as const;

const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isUtc = (value: unknown): value is string =>
  typeof value === 'string' && UTC_PATTERN.test(value) && Number.isFinite(Date.parse(value));
const isFiniteInRange = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
const closeEnough = (left: number, right: number): boolean => Math.abs(left - right) <= 1e-8;
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

const canonicalChart = (value: unknown): value is SynastryRunV1['charts']['A'] =>
  isRecord(value) &&
  exactKeys(value, ['schemaId', 'schemaVersion', 'calculationId', 'calculatedAtUtc', 'birthInstantUtc']) &&
  value.schemaId === 'urn:astrologo:dados-posicionais' &&
  value.schemaVersion === '2.0.0' &&
  isNonEmptyString(value.calculationId) &&
  isUtc(value.calculatedAtUtc) &&
  isUtc(value.birthInstantUtc);

const canonicalCharts = (value: unknown): value is SynastryRunV1['charts'] =>
  isRecord(value) &&
  exactKeys(value, ['A', 'B']) &&
  canonicalChart(value.A) &&
  canonicalChart(value.B) &&
  value.A.calculationId !== value.B.calculationId;

const canonicalTargetSet = (value: unknown): boolean =>
  isRecord(value) &&
  exactKeys(value, ['id', 'version', 'orderedBodyIds']) &&
  value.id === 'hermetic-planets-10-cross-chart-v1' &&
  value.version === '1.0.0' &&
  Array.isArray(value.orderedBodyIds) &&
  value.orderedBodyIds.length === PLANET_BODY_IDS.length &&
  value.orderedBodyIds.every((bodyId, index) => bodyId === PLANET_BODY_IDS[index]);

const canonicalModels = (value: unknown): value is SynastryRunV1['models'] => {
  if (!isRecord(value) || !exactKeys(value, ['aspects', 'houseOverlays'])) return false;
  const aspects = value.aspects;
  const houses = value.houseOverlays;
  if (!isRecord(aspects) || !isRecord(houses)) return false;
  return (
    exactKeys(aspects, [
      'profileId',
      'profileVersion',
      'orbPolicy',
      'orbBoundaryConvention',
      'separationMethod',
      'pairPolicy',
      'applyingSeparatingPolicy',
      'exactToleranceDeg',
      'aspectDefinitions',
    ]) &&
    aspects.profileId === 'astrologo-synastry-major-v1' &&
    aspects.profileVersion === '1.0.0' &&
    aspects.orbPolicy === 'fixed-by-aspect-no-body-modifiers' &&
    aspects.orbBoundaryConvention === 'inclusive' &&
    aspects.separationMethod === 'smallest-angular-distance-0-to-180' &&
    aspects.pairPolicy === 'all-chart-a-planets-to-all-chart-b-planets' &&
    aspects.applyingSeparatingPolicy === 'not-calculated-without-longitudinal-velocities' &&
    aspects.exactToleranceDeg === 1e-9 &&
    Array.isArray(aspects.aspectDefinitions) &&
    aspects.aspectDefinitions.length === ASPECT_DEFINITIONS.length &&
    aspects.aspectDefinitions.every((candidate, index) => {
      const expected = ASPECT_DEFINITIONS[index];
      return (
        expected !== undefined &&
        isRecord(candidate) &&
        exactKeys(candidate, ['aspectId', 'displayNamePtBr', 'exactAngleDeg', 'allowedOrbDeg']) &&
        candidate.aspectId === expected[0] &&
        candidate.displayNamePtBr === expected[1] &&
        candidate.exactAngleDeg === expected[2] &&
        candidate.allowedOrbDeg === expected[3]
      );
    }) &&
    exactKeys(houses, ['systemId', 'sourceCoordinate', 'recipientBoundarySource', 'intervalConvention']) &&
    houses.systemId === 'placidus' &&
    houses.sourceCoordinate === 'geocentric-true-ecliptic-longitude-of-date' &&
    houses.recipientBoundarySource === 'dados-posicionais-v2-cusps' &&
    houses.intervalConvention === '[cusp,next-cusp)'
  );
};

const canonicalAspects = (value: unknown): value is SynastryRunV1['aspects'] => {
  if (!Array.isArray(value) || value.length > 100) return false;
  const seen = new Set<string>();
  let previousOrder = -1;
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !exactKeys(candidate, [
        'recordId',
        'pointA',
        'pointB',
        'aspectId',
        'displayNamePtBr',
        'separationDeg',
        'exactAngleDeg',
        'allowedOrbDeg',
        'orbDeg',
      ]) ||
      !isRecord(candidate.pointA) ||
      !exactKeys(candidate.pointA, ['chartRef', 'bodyId']) ||
      candidate.pointA.chartRef !== 'A' ||
      !isPlanetId(candidate.pointA.bodyId) ||
      !isRecord(candidate.pointB) ||
      !exactKeys(candidate.pointB, ['chartRef', 'bodyId']) ||
      candidate.pointB.chartRef !== 'B' ||
      !isPlanetId(candidate.pointB.bodyId)
    )
      return false;
    const definition = ASPECT_DEFINITIONS.find(([aspectId]) => aspectId === candidate.aspectId);
    if (!definition) return false;
    const recordId = `A:${candidate.pointA.bodyId}|B:${candidate.pointB.bodyId}|${definition[0]}`;
    const order =
      PLANET_BODY_IDS.indexOf(candidate.pointA.bodyId) * 10 + PLANET_BODY_IDS.indexOf(candidate.pointB.bodyId);
    if (
      candidate.recordId !== recordId ||
      seen.has(recordId) ||
      order <= previousOrder ||
      candidate.displayNamePtBr !== definition[1] ||
      !isFiniteInRange(candidate.separationDeg, 0, 180) ||
      candidate.exactAngleDeg !== definition[2] ||
      candidate.allowedOrbDeg !== definition[3] ||
      typeof candidate.orbDeg !== 'number' ||
      !Number.isFinite(candidate.orbDeg) ||
      !closeEnough(candidate.orbDeg, Math.abs(candidate.separationDeg - definition[2])) ||
      candidate.orbDeg > definition[3] + Number.EPSILON
    )
      return false;
    seen.add(recordId);
    previousOrder = order;
  }
  return true;
};

const canonicalOverlayList = (
  value: unknown,
  direction: 'A-to-B' | 'B-to-A',
): value is readonly SynastryHouseOverlayV1[] => {
  if (!Array.isArray(value) || value.length !== PLANET_BODY_IDS.length) return false;
  const source = direction === 'A-to-B' ? 'A' : 'B';
  const target = source === 'A' ? 'B' : 'A';
  let availability: 'available' | 'unavailable' | null = null;
  return value.every((candidate, index) => {
    if (
      !isRecord(candidate) ||
      !exactKeys(candidate, ['direction', 'sourceChartRef', 'sourceBodyId', 'targetChartRef', 'placement']) ||
      candidate.direction !== direction ||
      candidate.sourceChartRef !== source ||
      candidate.targetChartRef !== target ||
      candidate.sourceBodyId !== PLANET_BODY_IDS[index] ||
      !isRecord(candidate.placement)
    )
      return false;
    const placement = candidate.placement;
    if (availability !== null && placement.status !== availability) return false;
    if (placement.status === 'available') {
      availability = 'available';
      return (
        exactKeys(placement, ['status', 'houseIndex1', 'basis', 'intervalConvention']) &&
        Number.isInteger(placement.houseIndex1) &&
        Number(placement.houseIndex1) >= 1 &&
        Number(placement.houseIndex1) <= 12 &&
        placement.basis === 'recipient-placidus-cusps-ecliptic-longitude' &&
        placement.intervalConvention === '[cusp,next-cusp)'
      );
    }
    availability = 'unavailable';
    return (
      placement.status === 'unavailable' &&
      exactKeys(placement, ['status', 'reasonCode', 'basis']) &&
      placement.reasonCode === 'PLACIDUS_UNAVAILABLE' &&
      placement.basis === 'recipient-placidus-cusps-ecliptic-longitude'
    );
  });
};

const canonicalHouseOverlays = (value: unknown): value is SynastryRunV1['houseOverlays'] =>
  isRecord(value) &&
  exactKeys(value, ['aToB', 'bToA']) &&
  canonicalOverlayList(value.aToB, 'A-to-B') &&
  canonicalOverlayList(value.bToA, 'B-to-A');

const canonicalDiagnostics = (
  value: unknown,
  overlays: SynastryRunV1['houseOverlays'],
): value is SynastryRunV1['diagnostics'] => {
  if (!Array.isArray(value) || value.length > 2) return false;
  const expected: string[] = [];
  if (overlays.bToA[0]?.placement.status === 'unavailable') expected.push('CHART_A_PLACIDUS_UNAVAILABLE');
  if (overlays.aToB[0]?.placement.status === 'unavailable') expected.push('CHART_B_PLACIDUS_UNAVAILABLE');
  return (
    value.length === expected.length &&
    value.every(
      (candidate, index) =>
        isRecord(candidate) &&
        exactKeys(candidate, ['severity', 'code']) &&
        candidate.severity === 'warning' &&
        candidate.code === expected[index],
    )
  );
};

const validSynastryRunV1 = (value: unknown): value is SynastryRunV1 => {
  if (
    !isRecord(value) ||
    !exactKeys(value, ROOT_KEYS) ||
    value.schemaId !== SYNASTRY_RUN_SCHEMA_ID ||
    value.schemaVersion !== SYNASTRY_RUN_SCHEMA_VERSION ||
    !canonicalCharts(value.charts) ||
    !canonicalTargetSet(value.targetSet) ||
    !canonicalPresentation(value.presentationPolicy) ||
    !canonicalModels(value.models) ||
    !canonicalAspects(value.aspects) ||
    !canonicalHouseOverlays(value.houseOverlays)
  )
    return false;
  return canonicalDiagnostics(value.diagnostics, value.houseOverlays);
};

export function parseSynastryRunV1(value: unknown, expectedPrimaryCalculationId?: string): SynastryRunV1ParseResult {
  if (value === null || value === undefined || value === '') return { status: 'legacy' };
  if (typeof value === 'string' && value.length > 1024 * 1024) {
    return { status: 'invalid', reason: 'artefato de sinastria excede o limite seguro' };
  }
  let candidate: unknown = value;
  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value) as unknown;
    } catch {
      return { status: 'invalid', reason: 'JSON da sinastria inválido' };
    }
  }
  if (!validSynastryRunV1(candidate)) {
    return { status: 'invalid', reason: 'contrato de sinastria v1 inválido ou incompleto' };
  }
  if (expectedPrimaryCalculationId && candidate.charts.A.calculationId !== expectedPrimaryCalculationId) {
    return { status: 'invalid', reason: 'a sinastria não corresponde ao mapa primário persistido' };
  }
  return { status: 'available', data: candidate };
}

export const synastryPlanetNamePtBr = (bodyId: PlanetBodyId): string => PLANET_LABEL_BY_ID[bodyId];

export const normalizeSynastrySubjectNames = (
  value: unknown,
  fallbackA = 'Pessoa A',
  fallbackB = 'Pessoa B',
): SynastrySubjectNames => {
  if (!isRecord(value)) return { A: fallbackA, B: fallbackB };
  return {
    A: isNonEmptyString(value.A) ? value.A : fallbackA,
    B: isNonEmptyString(value.B) ? value.B : fallbackB,
    ...(isNonEmptyString(value.primaryCalculationId) ? { primaryCalculationId: value.primaryCalculationId } : {}),
    ...(isNonEmptyString(value.secondaryCalculationId) ? { secondaryCalculationId: value.secondaryCalculationId } : {}),
  };
};
