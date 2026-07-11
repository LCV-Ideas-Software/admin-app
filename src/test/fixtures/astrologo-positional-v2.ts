/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const BODY_FIXTURES = [
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

const SIGN_FIXTURES = [
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
] as const;

export const createDadosPosicionaisV2Fixture = () => ({
  schemaId: 'urn:astrologo:dados-posicionais',
  schemaVersion: '2.0.0',
  calculationId: 'mapa-v2-001',
  calculatedAtUtc: '2026-07-11T15:30:45Z',
  targetSet: {
    id: 'hermetic-planets-10-v1',
    version: '1.0.0',
    orderedIds: BODY_FIXTURES.map(([bodyId]) => bodyId),
  },
  birthContext: {
    civilInput: {
      calendar: 'gregory',
      date: '2000-07-15',
      time: '10:00',
      semantics: 'wall-time-at-birthplace',
    },
    place: {
      sourceLabel: 'São Paulo, São Paulo, Brasil',
      latitudeDeg: -23.5505,
      longitudeDeg: -46.6333,
      elevationMeters: 760,
      geocoder: { provider: 'open-meteo', providerResultId: 3448439 },
    },
    timeResolution: {
      status: 'resolved',
      timeZoneIana: 'America/Sao_Paulo',
      instantUtc: '2000-07-15T13:00:00Z',
      offsetAtBirth: '-03:00',
      disambiguation: 'exact',
      historicalConfidence: 'certified-1970-plus',
    },
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
    ephemeris: {
      engineId: 'astronomy-engine',
      engineVersion: '2.1.19',
      sourceSha256: 'a'.repeat(64),
      observerOrigin: 'geocentric',
      apparentOrAstrometric: 'apparent',
      eclipticReference: 'true-ecliptic-of-date',
    },
    houses: {
      engineId: 'swiss-ephemeris-wasm',
      engineVersion: '2.10.03',
      runtimeWasmSha256: 'b'.repeat(64),
      systemId: 'placidus',
    },
    astronomicalReal: {
      methodId: 'iau-roman-1987-b1875-consensus-v1',
      boundaryDatasetVersion: 'astronomy-engine-2.1.19',
      boundaryDatasetSha256: 'c'.repeat(64),
      classificationEpoch: 'B1875',
      translationPolicy: 'curated-pt-br-editorial-v1',
    },
  },
  catalogs: {
    angelic72: {
      catalogId: 'mayhem-shem-hamephorash-tropical-72x5',
      catalogVersion: '1.0.0',
      catalogSha256: 'd'.repeat(64),
      intervalConvention: '[start,end)',
      identityKey: 'numeric-id-1-to-72',
    },
  },
  houses: {
    systemId: 'placidus',
    status: 'available',
    cusps: Array.from({ length: 12 }, (_, index) => ({
      houseIndex1: index + 1,
      eclipticLongitudeDeg: index * 30,
      tropical: {
        signId: 'aries',
        signNamePtBr: 'Áries',
        degreeWithinSignDeg: 0,
      },
    })),
  },
  angles: [
    {
      angleId: 'ascendant',
      displayNamePtBr: 'Ascendente',
      eclipticLongitudeDeg: 15.5,
      tropical: { signId: 'aries', signNamePtBr: 'Áries', degreeWithinSignDeg: 15.5 },
    },
    {
      angleId: 'midheaven',
      displayNamePtBr: 'Meio do Céu',
      eclipticLongitudeDeg: 105.25,
      tropical: { signId: 'cancer', signNamePtBr: 'Câncer', degreeWithinSignDeg: 15.25 },
    },
  ],
  positions: BODY_FIXTURES.map(([bodyId, displayNamePtBr, symbol], index) => {
    const longitudeDeg = index * 30 + 12.3456;
    const angelId = index * 6 + 3;
    const sign = SIGN_FIXTURES[index];
    if (!sign) throw new Error(`Signo de teste ausente para o índice ${index}.`);
    const [signId, signNamePtBr] = sign;
    return {
      bodyId,
      kind: 'planet',
      displayNamePtBr,
      symbol,
      coordinates: {
        eclipticLongitudeDeg: longitudeDeg,
        eclipticLatitudeDeg: 0.1,
        rightAscensionHours: index + 1,
        declinationDeg: index - 4,
      },
      tropical: {
        status: 'available',
        sign: {
          id: signId,
          index0: index,
          namePtBr: signNamePtBr,
          startLongitudeDeg: index * 30,
          endLongitudeDegExclusive: (index + 1) * 30,
        },
        degreeWithinSignDeg: 12.3456,
        decan: { index1: 2, startDegreeWithinSign: 10, endDegreeWithinSignExclusive: 20 },
      },
      astronomicalReal: {
        status: 'available',
        constellation: { iauCode: 'Ari', latinName: 'Aries', namePtBr: 'Áries' },
        degreeWithinConstellation: {
          status: 'not-defined',
          reasonCode: 'IAU_CONSTELLATIONS_ARE_2D_AREAS',
        },
      },
      housePlacement: { status: 'available', houseIndex1: (index % 12) + 1, basis: 'swiss-swe-house-pos' },
      angelicQuinary: {
        status: 'available',
        basisSystem: 'tropical',
        basisLongitudeDeg: longitudeDeg,
        quinary: {
          index1: angelId,
          globalStartLongitudeDeg: index * 30 + 10,
          globalEndLongitudeDegExclusive: index * 30 + 15,
        },
        angel: {
          id: angelId,
          canonicalName: index === 0 ? 'Sitael' : `Anjo de teste ${angelId}`,
          aliases: [],
          hebrewTriplet: 'והו',
          choir: 'Serafins',
          prince: 'Metatron',
          qualitySummaryPtBr: 'Qualidade editorial de teste.',
          sourcePermalink: 'https://wiki.deldebbio.com.br/index.php/Anjos_Cabal%C3%ADsticos',
        },
      },
    };
  }),
  aggregates: {
    angelicFalange: BODY_FIXTURES.map(([bodyId], index) => ({
      angelId: index * 6 + 3,
      memberBodyIds: [bodyId],
      occurrenceCount: 1,
    })),
  },
  diagnostics: [],
});
