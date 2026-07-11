/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest';
import { createDadosPosicionaisV2Fixture } from '../test/fixtures/astrologo-positional-v2';
import { formatDegreeDmsTruncated, formatInstantInBrasilia, parseDadosPosicionaisV2 } from './astrological-position-v2';

describe('astrological-position-v2', () => {
  it('valida o contrato completo e rejeita um grau IAU inventado', () => {
    const fixture = createDadosPosicionaisV2Fixture();
    expect(parseDadosPosicionaisV2(JSON.stringify(fixture))).toMatchObject({ status: 'available' });

    const adulterated = structuredClone(fixture) as Record<string, unknown> & {
      positions: Array<Record<string, unknown> & { astronomicalReal: Record<string, unknown> }>;
    };
    adulterated.positions[0].astronomicalReal.degreeWithinConstellation = { status: 'available', degree: 2 };

    expect(parseDadosPosicionaisV2(adulterated)).toEqual({
      status: 'invalid',
      reason: 'contrato v2 inválido ou incompleto',
    });

    expect(parseDadosPosicionaisV2(fixture, 'outro-mapa')).toEqual({
      status: 'invalid',
      reason: 'cálculo v2 não corresponde ao mapa solicitado',
    });
  });

  it('formata instantes sempre em Brasília, independentemente do fuso do processo', () => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = 'Pacific/Honolulu';
    try {
      expect(formatInstantInBrasilia('2026-07-11T15:30:45Z')).toBe('11/07/2026 às 12:30:45');
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    }
  });

  it('trunca a exibição sem atravessar uma fronteira de grau', () => {
    expect(formatDegreeDmsTruncated(4.999999999)).toBe('4°59\'59"');
    expect(formatDegreeDmsTruncated(5)).toBe('5°00\'00"');
  });
});
