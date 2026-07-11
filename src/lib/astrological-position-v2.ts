/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export const POSITIONAL_SCHEMA_ID = 'urn:astrologo:dados-posicionais' as const;
export const POSITIONAL_SCHEMA_VERSION = '2.0.0' as const;
export const POSITIONAL_TARGET_SET_ID = 'hermetic-planets-10-v1' as const;
export const BRASILIA_TIME_ZONE = 'America/Sao_Paulo' as const;
export const BRAZIL_LOCALE = 'pt-BR' as const;
export const LEGACY_TIME_WARNING =
  'Mapa legado: horário de nascimento sem fuso verificável; nenhuma conversão de instante foi inventada.' as const;

export const PLANET_BODY_IDS = [
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

export type PlanetBodyId = (typeof PLANET_BODY_IDS)[number];

export interface TropicalProjectionV2 {
  readonly status: 'available';
  readonly sign: {
    readonly id: string;
    readonly index0: number;
    readonly namePtBr: string;
    readonly startLongitudeDeg: number;
    readonly endLongitudeDegExclusive: number;
  };
  readonly degreeWithinSignDeg: number;
  readonly decan: {
    readonly index1: number;
    readonly startDegreeWithinSign: number;
    readonly endDegreeWithinSignExclusive: number;
  };
}

export interface AngelicQuinaryProjectionV2 {
  readonly status: 'available';
  readonly basisSystem: 'tropical';
  readonly basisLongitudeDeg: number;
  readonly quinary: {
    readonly index1: number;
    readonly globalStartLongitudeDeg: number;
    readonly globalEndLongitudeDegExclusive: number;
  };
  readonly angel: {
    readonly id: number;
    readonly canonicalName: string;
    readonly aliases: readonly string[];
    readonly hebrewTriplet: string;
    readonly choir: string;
    readonly prince: string;
    readonly qualitySummaryPtBr: string;
    readonly sourcePermalink: string;
  };
}

export interface PlanetPositionV2 {
  readonly bodyId: PlanetBodyId;
  readonly kind: 'planet';
  readonly displayNamePtBr: string;
  readonly symbol: string;
  readonly coordinates: {
    readonly eclipticLongitudeDeg: number;
    readonly eclipticLatitudeDeg: number;
    readonly rightAscensionHours: number;
    readonly declinationDeg: number;
  };
  readonly tropical: TropicalProjectionV2;
  readonly astronomicalReal:
    | {
        readonly status: 'available';
        readonly constellation: { readonly iauCode: string; readonly latinName: string; readonly namePtBr: string };
        readonly degreeWithinConstellation: {
          readonly status: 'not-defined';
          readonly reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS';
        };
      }
    | {
        readonly status: 'unavailable';
        readonly reasonCode: 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN' | 'SWISS_REFERENCE_UNAVAILABLE';
        readonly degreeWithinConstellation: {
          readonly status: 'not-defined';
          readonly reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS';
        };
      };
  readonly housePlacement:
    | { readonly status: 'available'; readonly houseIndex1: number; readonly basis: 'swiss-swe-house-pos' }
    | {
        readonly status: 'unavailable';
        readonly basis: 'swiss-swe-house-pos';
        readonly reasonCode: 'PLACIDUS_UNAVAILABLE' | 'HOUSE_POSITION_UNAVAILABLE';
      };
  readonly angelicQuinary: AngelicQuinaryProjectionV2;
}

export interface DadosPosicionaisV2 {
  readonly schemaId: typeof POSITIONAL_SCHEMA_ID;
  readonly schemaVersion: typeof POSITIONAL_SCHEMA_VERSION;
  readonly calculationId: string;
  readonly calculatedAtUtc: string;
  readonly targetSet: {
    readonly id: typeof POSITIONAL_TARGET_SET_ID;
    readonly version: '1.0.0';
    readonly orderedIds: readonly PlanetBodyId[];
  };
  readonly birthContext: {
    readonly civilInput: {
      readonly calendar: 'gregory';
      readonly date: string;
      readonly time: string;
      readonly semantics: 'wall-time-at-birthplace';
    };
    readonly place: {
      readonly sourceLabel: string;
      readonly latitudeDeg: number;
      readonly longitudeDeg: number;
      readonly elevationMeters: number | null;
      readonly geocoder: { readonly provider: 'open-meteo'; readonly providerResultId: number };
    };
    readonly timeResolution: {
      readonly status: 'resolved';
      readonly timeZoneIana: string;
      readonly instantUtc: string;
      readonly offsetAtBirth: string;
      readonly disambiguation: 'exact' | 'earlier' | 'later';
      readonly historicalConfidence: 'certified-1970-plus' | 'best-effort-1900-1969';
    };
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
    readonly ephemeris: {
      readonly engineId: 'astronomy-engine';
      readonly engineVersion: '2.1.19';
      readonly sourceSha256: string;
      readonly observerOrigin: 'geocentric';
      readonly apparentOrAstrometric: 'apparent';
      readonly eclipticReference: 'true-ecliptic-of-date';
    };
    readonly houses: {
      readonly engineId: 'swiss-ephemeris-wasm';
      readonly engineVersion: string;
      readonly runtimeWasmSha256: string;
      readonly systemId: 'placidus';
    };
    readonly astronomicalReal: {
      readonly methodId: 'iau-roman-1987-b1875-consensus-v1';
      readonly boundaryDatasetVersion: 'astronomy-engine-2.1.19';
      readonly boundaryDatasetSha256: string;
      readonly classificationEpoch: 'B1875';
      readonly translationPolicy: 'curated-pt-br-editorial-v1';
    };
  };
  readonly catalogs: {
    readonly angelic72: {
      readonly catalogId: 'mayhem-shem-hamephorash-tropical-72x5';
      readonly catalogVersion: string;
      readonly catalogSha256: string;
      readonly intervalConvention: '[start,end)';
      readonly identityKey: 'numeric-id-1-to-72';
    };
  };
  readonly houses:
    | {
        readonly systemId: 'placidus';
        readonly status: 'available';
        readonly cusps: readonly {
          readonly houseIndex1: number;
          readonly eclipticLongitudeDeg: number;
          readonly tropical: {
            readonly signId: string;
            readonly signNamePtBr: string;
            readonly degreeWithinSignDeg: number;
          };
        }[];
      }
    | { readonly systemId: 'placidus'; readonly status: 'unavailable'; readonly reasonCode: 'PLACIDUS_UNAVAILABLE' };
  readonly angles: readonly {
    readonly angleId: 'ascendant' | 'midheaven';
    readonly displayNamePtBr: string;
    readonly eclipticLongitudeDeg: number;
    readonly tropical: {
      readonly signId: string;
      readonly signNamePtBr: string;
      readonly degreeWithinSignDeg: number;
    };
  }[];
  readonly positions: readonly PlanetPositionV2[];
  readonly aggregates: {
    readonly angelicFalange: readonly {
      readonly angelId: number;
      readonly memberBodyIds: readonly PlanetBodyId[];
      readonly occurrenceCount: number;
    }[];
  };
  readonly diagnostics: readonly {
    readonly severity: 'warning';
    readonly code: 'HISTORICAL_TIMEZONE_BEST_EFFORT' | 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN' | 'PLACIDUS_UNAVAILABLE';
    readonly bodyId?: PlanetBodyId;
  }[];
}

export type DadosPosicionaisV2ParseResult =
  | { readonly status: 'available'; readonly data: DadosPosicionaisV2 }
  | { readonly status: 'legacy' }
  | { readonly status: 'invalid'; readonly reason: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isIntegerInRange = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
const nearlyEqual = (left: number, right: number): boolean => Math.abs(left - right) <= 1e-8;
const isIsoInstant = (value: unknown): value is string =>
  isString(value) && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const isSha256 = (value: unknown): value is string => isString(value) && /^[a-f0-9]{64}$/i.test(value);
const isPlanetBodyId = (value: unknown): value is PlanetBodyId =>
  isString(value) && (PLANET_BODY_IDS as readonly string[]).includes(value);

const isNotDefinedConstellationDegree = (value: unknown): boolean =>
  isRecord(value) && value.status === 'not-defined' && value.reasonCode === 'IAU_CONSTELLATIONS_ARE_2D_AREAS';

const isTropicalProjection = (value: unknown): value is TropicalProjectionV2 => {
  if (!isRecord(value) || value.status !== 'available' || !isRecord(value.sign) || !isRecord(value.decan)) return false;
  return (
    isString(value.sign.id) &&
    isIntegerInRange(value.sign.index0, 0, 11) &&
    isString(value.sign.namePtBr) &&
    isFiniteNumber(value.sign.startLongitudeDeg) &&
    isFiniteNumber(value.sign.endLongitudeDegExclusive) &&
    isFiniteNumber(value.degreeWithinSignDeg) &&
    value.degreeWithinSignDeg >= 0 &&
    value.degreeWithinSignDeg < 30 &&
    isIntegerInRange(value.decan.index1, 1, 3) &&
    isFiniteNumber(value.decan.startDegreeWithinSign) &&
    isFiniteNumber(value.decan.endDegreeWithinSignExclusive)
  );
};

const isAngelicQuinary = (value: unknown): value is AngelicQuinaryProjectionV2 => {
  if (!isRecord(value) || !isRecord(value.quinary) || !isRecord(value.angel)) return false;
  return (
    value.status === 'available' &&
    value.basisSystem === 'tropical' &&
    isFiniteNumber(value.basisLongitudeDeg) &&
    isIntegerInRange(value.quinary.index1, 1, 72) &&
    isFiniteNumber(value.quinary.globalStartLongitudeDeg) &&
    isFiniteNumber(value.quinary.globalEndLongitudeDegExclusive) &&
    isIntegerInRange(value.angel.id, 1, 72) &&
    isString(value.angel.canonicalName) &&
    Array.isArray(value.angel.aliases) &&
    value.angel.aliases.every(isString) &&
    isString(value.angel.hebrewTriplet) &&
    isString(value.angel.choir) &&
    isString(value.angel.prince) &&
    isString(value.angel.qualitySummaryPtBr) &&
    isString(value.angel.sourcePermalink)
  );
};

const isPlanetPosition = (value: unknown): value is PlanetPositionV2 => {
  if (!isRecord(value) || !isRecord(value.coordinates) || !isRecord(value.astronomicalReal)) return false;
  if (!isRecord(value.housePlacement)) return false;

  const coordinates = value.coordinates;
  const tropicalCandidate = value.tropical;
  const angelicCandidate = value.angelicQuinary;

  const astronomicalReal =
    value.astronomicalReal.status === 'available'
      ? isRecord(value.astronomicalReal.constellation) &&
        isString(value.astronomicalReal.constellation.iauCode) &&
        isString(value.astronomicalReal.constellation.latinName) &&
        isString(value.astronomicalReal.constellation.namePtBr) &&
        isNotDefinedConstellationDegree(value.astronomicalReal.degreeWithinConstellation)
      : value.astronomicalReal.status === 'unavailable' &&
        (value.astronomicalReal.reasonCode === 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN' ||
          value.astronomicalReal.reasonCode === 'SWISS_REFERENCE_UNAVAILABLE') &&
        isNotDefinedConstellationDegree(value.astronomicalReal.degreeWithinConstellation);

  const housePlacement =
    value.housePlacement.status === 'available'
      ? value.housePlacement.basis === 'swiss-swe-house-pos' &&
        isIntegerInRange(value.housePlacement.houseIndex1, 1, 12)
      : value.housePlacement.status === 'unavailable' &&
        value.housePlacement.basis === 'swiss-swe-house-pos' &&
        (value.housePlacement.reasonCode === 'PLACIDUS_UNAVAILABLE' ||
          value.housePlacement.reasonCode === 'HOUSE_POSITION_UNAVAILABLE');

  if (
    !isPlanetBodyId(value.bodyId) ||
    value.kind !== 'planet' ||
    !isString(value.displayNamePtBr) ||
    !isString(value.symbol) ||
    !isFiniteNumber(coordinates.eclipticLongitudeDeg) ||
    !isFiniteNumber(coordinates.eclipticLatitudeDeg) ||
    !isFiniteNumber(coordinates.rightAscensionHours) ||
    !isFiniteNumber(coordinates.declinationDeg) ||
    !isTropicalProjection(tropicalCandidate) ||
    !astronomicalReal ||
    !housePlacement ||
    !isAngelicQuinary(angelicCandidate)
  ) {
    return false;
  }

  const longitudeDeg = coordinates.eclipticLongitudeDeg;
  const tropical = tropicalCandidate;
  const angelic = angelicCandidate;
  const expectedSignStart = tropical.sign.index0 * 30;
  const expectedDecanIndex = Math.floor(tropical.degreeWithinSignDeg / 10) + 1;
  const expectedQuinaryIndex = Math.floor(longitudeDeg / 5) + 1;

  return (
    longitudeDeg >= 0 &&
    longitudeDeg < 360 &&
    nearlyEqual(tropical.sign.startLongitudeDeg, expectedSignStart) &&
    nearlyEqual(tropical.sign.endLongitudeDegExclusive, expectedSignStart + 30) &&
    nearlyEqual(tropical.degreeWithinSignDeg, longitudeDeg - expectedSignStart) &&
    tropical.decan.index1 === expectedDecanIndex &&
    nearlyEqual(tropical.decan.startDegreeWithinSign, (expectedDecanIndex - 1) * 10) &&
    nearlyEqual(tropical.decan.endDegreeWithinSignExclusive, expectedDecanIndex * 10) &&
    nearlyEqual(angelic.basisLongitudeDeg, longitudeDeg) &&
    angelic.quinary.index1 === expectedQuinaryIndex &&
    angelic.angel.id === expectedQuinaryIndex &&
    nearlyEqual(angelic.quinary.globalStartLongitudeDeg, (expectedQuinaryIndex - 1) * 5) &&
    nearlyEqual(angelic.quinary.globalEndLongitudeDegExclusive, expectedQuinaryIndex * 5)
  );
};

type FalangeGroup = DadosPosicionaisV2['aggregates']['angelicFalange'][number];

const isFalangeGroup = (value: unknown): value is FalangeGroup =>
  isRecord(value) &&
  isIntegerInRange(value.angelId, 1, 72) &&
  Array.isArray(value.memberBodyIds) &&
  value.memberBodyIds.every(isPlanetBodyId) &&
  isIntegerInRange(value.occurrenceCount, 1, 10) &&
  value.occurrenceCount === value.memberBodyIds.length;

const isDadosPosicionaisV2 = (value: unknown): value is DadosPosicionaisV2 => {
  if (!isRecord(value)) return false;
  if (!isRecord(value.targetSet) || !isRecord(value.birthContext) || !isRecord(value.presentationPolicy)) return false;
  if (!isRecord(value.models) || !isRecord(value.catalogs) || !isRecord(value.aggregates)) return false;
  if (!isRecord(value.birthContext.civilInput) || !isRecord(value.birthContext.place)) return false;
  if (!isRecord(value.birthContext.timeResolution)) return false;
  if (!isRecord(value.models.ephemeris) || !isRecord(value.models.houses) || !isRecord(value.models.astronomicalReal))
    return false;
  if (!isRecord(value.catalogs.angelic72)) return false;

  const orderedIds = value.targetSet.orderedIds;
  if (
    !Array.isArray(orderedIds) ||
    orderedIds.length !== PLANET_BODY_IDS.length ||
    !orderedIds.every((bodyId, index) => bodyId === PLANET_BODY_IDS[index])
  ) {
    return false;
  }

  if (!Array.isArray(value.positions) || value.positions.length !== PLANET_BODY_IDS.length) return false;
  if (!value.positions.every(isPlanetPosition)) return false;
  if (!value.positions.every((position, index) => position.bodyId === PLANET_BODY_IDS[index])) return false;

  const timeResolution = value.birthContext.timeResolution;
  const place = value.birthContext.place;
  const geocoder = place.geocoder;
  if (!isRecord(geocoder)) return false;
  const ephemeris = value.models.ephemeris;
  const houseModel = value.models.houses;
  const astronomicalModel = value.models.astronomicalReal;
  const catalog = value.catalogs.angelic72;

  if (
    value.schemaId !== POSITIONAL_SCHEMA_ID ||
    value.schemaVersion !== POSITIONAL_SCHEMA_VERSION ||
    !isString(value.calculationId) ||
    !isIsoInstant(value.calculatedAtUtc) ||
    value.targetSet.id !== POSITIONAL_TARGET_SET_ID ||
    value.targetSet.version !== '1.0.0' ||
    value.birthContext.civilInput.calendar !== 'gregory' ||
    !isString(value.birthContext.civilInput.date) ||
    !isString(value.birthContext.civilInput.time) ||
    value.birthContext.civilInput.semantics !== 'wall-time-at-birthplace' ||
    !isString(place.sourceLabel) ||
    !isFiniteNumber(place.latitudeDeg) ||
    !isFiniteNumber(place.longitudeDeg) ||
    !(place.elevationMeters === null || isFiniteNumber(place.elevationMeters)) ||
    geocoder.provider !== 'open-meteo' ||
    !Number.isInteger(geocoder.providerResultId) ||
    timeResolution.status !== 'resolved' ||
    !isString(timeResolution.timeZoneIana) ||
    !isIsoInstant(timeResolution.instantUtc) ||
    !isString(timeResolution.offsetAtBirth) ||
    !['exact', 'earlier', 'later'].includes(String(timeResolution.disambiguation)) ||
    !['certified-1970-plus', 'best-effort-1900-1969'].includes(String(timeResolution.historicalConfidence)) ||
    value.presentationPolicy.locale !== 'pt-BR' ||
    value.presentationPolicy.timeZone !== BRASILIA_TIME_ZONE ||
    value.presentationPolicy.timeZoneLabel !== 'Hora oficial de Brasília' ||
    value.presentationPolicy.calendar !== 'gregory' ||
    value.presentationPolicy.numberingSystem !== 'latn' ||
    value.presentationPolicy.hourCycle !== 'h23' ||
    ephemeris.engineId !== 'astronomy-engine' ||
    ephemeris.engineVersion !== '2.1.19' ||
    !isSha256(ephemeris.sourceSha256) ||
    ephemeris.observerOrigin !== 'geocentric' ||
    ephemeris.apparentOrAstrometric !== 'apparent' ||
    ephemeris.eclipticReference !== 'true-ecliptic-of-date' ||
    houseModel.engineId !== 'swiss-ephemeris-wasm' ||
    !isString(houseModel.engineVersion) ||
    !isSha256(houseModel.runtimeWasmSha256) ||
    houseModel.systemId !== 'placidus' ||
    astronomicalModel.methodId !== 'iau-roman-1987-b1875-consensus-v1' ||
    astronomicalModel.boundaryDatasetVersion !== 'astronomy-engine-2.1.19' ||
    !isSha256(astronomicalModel.boundaryDatasetSha256) ||
    astronomicalModel.classificationEpoch !== 'B1875' ||
    astronomicalModel.translationPolicy !== 'curated-pt-br-editorial-v1' ||
    catalog.catalogId !== 'mayhem-shem-hamephorash-tropical-72x5' ||
    !isString(catalog.catalogVersion) ||
    !isSha256(catalog.catalogSha256) ||
    catalog.intervalConvention !== '[start,end)' ||
    catalog.identityKey !== 'numeric-id-1-to-72'
  ) {
    return false;
  }

  if (!isRecord(value.houses) || value.houses.systemId !== 'placidus') return false;
  if (value.houses.status === 'available') {
    if (!Array.isArray(value.houses.cusps)) return false;
  } else if (value.houses.status !== 'unavailable' || value.houses.reasonCode !== 'PLACIDUS_UNAVAILABLE') {
    return false;
  }

  if (
    !Array.isArray(value.angles) ||
    !Array.isArray(value.aggregates.angelicFalange) ||
    !Array.isArray(value.diagnostics)
  ) {
    return false;
  }
  if (!value.aggregates.angelicFalange.every(isFalangeGroup)) return false;

  const positionByBodyId = new Map(value.positions.map((position) => [position.bodyId, position]));
  const seenBodies = new Set<PlanetBodyId>();
  const seenAngels = new Set<number>();
  for (const group of value.aggregates.angelicFalange) {
    if (seenAngels.has(group.angelId)) return false;
    seenAngels.add(group.angelId);
    for (const bodyId of group.memberBodyIds) {
      if (seenBodies.has(bodyId) || positionByBodyId.get(bodyId)?.angelicQuinary.angel.id !== group.angelId)
        return false;
      seenBodies.add(bodyId);
    }
  }
  return seenBodies.size === PLANET_BODY_IDS.length;
};

export function parseDadosPosicionaisV2(value: unknown, expectedCalculationId?: string): DadosPosicionaisV2ParseResult {
  if (value === null || value === undefined || value === '') return { status: 'legacy' };

  let candidate: unknown = value;
  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value) as unknown;
    } catch {
      return { status: 'invalid', reason: 'JSON inválido' };
    }
  }

  if (!isDadosPosicionaisV2(candidate)) {
    return { status: 'invalid', reason: 'contrato v2 inválido ou incompleto' };
  }
  if (expectedCalculationId && candidate.calculationId !== expectedCalculationId) {
    return { status: 'invalid', reason: 'cálculo v2 não corresponde ao mapa solicitado' };
  }
  return { status: 'available', data: candidate };
}

const brasiliaDateTimeFormatter = new Intl.DateTimeFormat(BRAZIL_LOCALE, {
  timeZone: BRASILIA_TIME_ZONE,
  calendar: 'gregory',
  numberingSystem: 'latn',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function formatInstantInBrasilia(instant: string): string {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return 'Instante indisponível';
  const parts = brasiliaDateTimeFormatter.formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get('day')}/${byType.get('month')}/${byType.get('year')} às ${byType.get('hour')}:${byType.get('minute')}:${byType.get('second')}`;
}

export function formatBrazilianCivilDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatDegreeDmsTruncated(value: number): string {
  if (!Number.isFinite(value)) return 'Indisponível';
  const totalSeconds = Math.floor(Math.max(0, value) * 3600);
  const degrees = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${degrees}°${String(minutes).padStart(2, '0')}'${String(seconds).padStart(2, '0')}"`;
}

export const formatTropicalPosition = (position: PlanetPositionV2): string =>
  `${formatDegreeDmsTruncated(position.tropical.degreeWithinSignDeg)} de ${position.tropical.sign.namePtBr}`;

export const formatIauConstellation = (position: PlanetPositionV2): string =>
  position.astronomicalReal.status === 'available'
    ? `${position.astronomicalReal.constellation.namePtBr} (${position.astronomicalReal.constellation.iauCode})`
    : position.astronomicalReal.reasonCode === 'IAU_BOUNDARY_CLASSIFICATION_UNCERTAIN'
      ? 'Indisponível — classificação limítrofe não confirmada'
      : 'Indisponível — referência de validação não disponível';

export const formatPlacidusHouse = (position: PlanetPositionV2): string =>
  position.housePlacement.status === 'available'
    ? `Casa Placidus ${position.housePlacement.houseIndex1}`
    : 'Casa Placidus indisponível';

export const PLANET_LABEL_BY_ID: Readonly<Record<PlanetBodyId, string>> = Object.freeze({
  sun: 'Sol',
  moon: 'Lua',
  mercury: 'Mercúrio',
  venus: 'Vênus',
  mars: 'Marte',
  jupiter: 'Júpiter',
  saturn: 'Saturno',
  uranus: 'Urano',
  neptune: 'Netuno',
  pluto: 'Plutão',
});
