/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos helpers de cron (PW-1): validação via croner, próximas execuções
 * determinísticas em UTC (data de referência fixa) e humanização pt-BR via
 * cronstrue.
 */

import { describe, expect, it } from 'vitest';
import { cronNextRunsUtc, describeCronPtBr, formatUtcInstant, validateCronExpression } from './cronHelpers';

const REF = new Date('2026-01-01T00:00:00Z');

describe('validateCronExpression', () => {
  it('accepts a standard 5-field expression', () => {
    expect(validateCronExpression('0 5 * * *')).toBeNull();
  });

  it('rejects an empty expression with a pt-BR message', () => {
    expect(validateCronExpression('   ')).toBe('Informe a expressão cron.');
  });

  it('rejects a malformed expression', () => {
    expect(validateCronExpression('99 99 * * *')).toMatch(/^Expressão cron inválida:/);
  });
});

describe('cronNextRunsUtc', () => {
  it('computes the next runs in UTC from a fixed reference date', () => {
    const runs = cronNextRunsUtc('0 5 * * *', 3, REF);
    expect(runs.map((run) => run.toISOString())).toEqual([
      '2026-01-01T05:00:00.000Z',
      '2026-01-02T05:00:00.000Z',
      '2026-01-03T05:00:00.000Z',
    ]);
  });

  it('returns an empty list for invalid expressions', () => {
    expect(cronNextRunsUtc('not-a-cron', 3, REF)).toEqual([]);
  });
});

describe('formatUtcInstant', () => {
  it('formats as "YYYY-MM-DD HH:mm UTC"', () => {
    expect(formatUtcInstant(new Date('2026-01-02T05:00:00Z'))).toBe('2026-01-02 05:00 UTC');
  });
});

describe('describeCronPtBr', () => {
  it('humanizes a valid expression in pt-BR', () => {
    const text = describeCronPtBr('0 5 * * *');
    expect(text).toContain('05:00');
  });

  it('returns an empty string for invalid expressions', () => {
    expect(describeCronPtBr('99 99 99 99 99')).toBe('');
  });
});
