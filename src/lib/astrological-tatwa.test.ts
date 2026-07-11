/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest';
import { normalizeTatwa } from './astrological-tatwa';

describe('normalizeTatwa', () => {
  it('identifica o modo atual explicitamente marcado como fixed', () => {
    expect(
      normalizeTatwa({
        tatwa: {
          schemaVersion: '2.0.0',
          principal: 'Akasha (Éter)',
          sub: 'Vayu (Ar)',
          calculationMode: 'fixed',
          nearMainBoundary: true,
          mainBoundaryMarginSec: 44,
          adjacentMain: {
            principal: 'Prithvi (Terra)',
            sub: 'Prithvi (Terra)',
            relation: 'previous',
            secondsToBoundary: 44,
          },
          anchor: {
            birthInstantUtc: '1993-05-21T00:12:00Z',
            sunriseInstantUtc: '1993-05-20T09:20:43.155Z',
            timeZoneIana: 'America/Sao_Paulo',
            latitudeDeg: -22.90642,
            longitudeDeg: -43.18223,
          },
        },
      }),
    ).toEqual({
      principal: 'Akasha (Éter)',
      sub: 'Vayu (Ar)',
      calculationMode: 'fixed',
      calculationModeSource: 'explicit',
      nearMainBoundary: true,
      mainBoundaryMarginSec: 44,
      subIsIndicative: true,
      adjacent: { principal: 'Prithvi (Terra)', sub: 'Prithvi (Terra)' },
      provenanceAvailable: true,
    });
  });

  it('preserva o modo legado explicitamente marcado', () => {
    expect(
      normalizeTatwa({
        tatwa: {
          principal: 'Vayu (Ar)',
          sub: 'Vayu (Ar)',
          calculationMode: 'legacy-rulingFirst',
        },
      }),
    ).toEqual({
      principal: 'Vayu (Ar)',
      sub: 'Vayu (Ar)',
      calculationMode: 'legacy-rulingFirst',
      calculationModeSource: 'explicit',
      nearMainBoundary: false,
      mainBoundaryMarginSec: null,
      subIsIndicative: true,
      adjacent: null,
      provenanceAvailable: false,
    });
  });

  it('infere o modo legado quando a identificação não existe', () => {
    expect(
      normalizeTatwa(
        JSON.stringify({
          tatwa: {
            principal: 'Tejas (Fogo)',
            sub: 'Apas (Água)',
          },
        }),
      ),
    ).toEqual({
      principal: 'Tejas (Fogo)',
      sub: 'Apas (Água)',
      calculationMode: 'legacy-rulingFirst',
      calculationModeSource: 'inferred-from-absence',
      nearMainBoundary: false,
      mainBoundaryMarginSec: null,
      subIsIndicative: true,
      adjacent: null,
      provenanceAvailable: false,
    });
  });

  it('mantém desconhecido um valor explícito não reconhecido', () => {
    expect(
      normalizeTatwa({
        tatwa: {
          principal: 'Apas (Água)',
          sub: 'Prithvi (Terra)',
          calculationMode: 'future-mode',
        },
      }),
    ).toEqual({
      principal: 'Apas (Água)',
      sub: 'Prithvi (Terra)',
      calculationMode: 'unknown',
      calculationModeSource: 'explicit-unknown',
      nearMainBoundary: false,
      mainBoundaryMarginSec: null,
      subIsIndicative: false,
      adjacent: null,
      provenanceAvailable: false,
    });
  });

  it('não infere legado quando há schema sem marcador de método', () => {
    expect(
      normalizeTatwa({
        tatwa: {
          schemaVersion: '2.0.0',
          principal: 'Tejas (Fogo)',
          sub: 'Akasha (Éter)',
        },
      }),
    ).toMatchObject({
      calculationMode: 'unknown',
      calculationModeSource: 'explicit-unknown',
      provenanceAvailable: false,
    });
  });

  it('descarta margem absurda, hipótese incoerente e âncora inválida', () => {
    expect(
      normalizeTatwa({
        tatwa: {
          schemaVersion: '2.0.0',
          calculationMode: 'fixed',
          principal: 'Tejas (Fogo)',
          sub: 'Akasha (Éter)',
          nearMainBoundary: true,
          mainBoundaryMarginSec: 9_999_999,
          adjacentMain: {
            principal: 'Vayu (Ar)',
            sub: 'Prithvi (Terra)',
            relation: 'previous',
            secondsToBoundary: 1,
          },
          anchor: {
            birthInstantUtc: 'não-é-instante',
            sunriseInstantUtc: 'também-não',
            timeZoneIana: 'not/a-zone',
            latitudeDeg: 999,
            longitudeDeg: 999,
          },
        },
      }),
    ).toMatchObject({
      calculationMode: 'fixed',
      nearMainBoundary: false,
      mainBoundaryMarginSec: null,
      adjacent: null,
      provenanceAvailable: false,
    });
  });

  it.each([
    null,
    '',
    '{json inválido',
    {},
    { tatwa: null },
    { tatwa: { principal: '', sub: 'Vayu (Ar)' } },
    { tatwa: { principal: 'inexistente', sub: 'Vayu (Ar)' } },
    { tatwa: { principal: 'Akasha (Éter)' } },
  ])('rejeita uma estrutura malformada sem lançar exceção: %j', (value) => {
    expect(normalizeTatwa(value)).toBeNull();
  });
});
