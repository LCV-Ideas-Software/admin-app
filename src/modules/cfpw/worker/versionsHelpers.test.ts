/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos helpers de versões (PW-1): validação do split gradual (soma 100,
 * versões distintas, inteiros 1-100) e parsing defensivo da versão crua.
 */

import { describe, expect, it } from 'vitest';
import { parseWorkerVersion, shortVersionId, validateSplit } from './versionsHelpers';

describe('validateSplit', () => {
  it('accepts a single version at 100%', () => {
    expect(validateSplit([{ versionId: 'v1', percentage: 100 }])).toBeNull();
  });

  it('accepts two distinct versions summing 100', () => {
    expect(
      validateSplit([
        { versionId: 'v1', percentage: 90 },
        { versionId: 'v2', percentage: 10 },
      ]),
    ).toBeNull();
  });

  it('rejects sums different from 100', () => {
    expect(
      validateSplit([
        { versionId: 'v1', percentage: 60 },
        { versionId: 'v2', percentage: 30 },
      ]),
    ).toBe('As porcentagens precisam somar exatamente 100 (soma atual: 90).');
  });

  it('rejects the same version on both slices', () => {
    expect(
      validateSplit([
        { versionId: 'v1', percentage: 50 },
        { versionId: 'v1', percentage: 50 },
      ]),
    ).toBe('Selecione duas versões diferentes para o split.');
  });

  it('rejects non-integer or out-of-range percentages', () => {
    expect(validateSplit([{ versionId: 'v1', percentage: 99.5 }])).toBe(
      'Cada porcentagem precisa ser um inteiro entre 1 e 100.',
    );
    expect(
      validateSplit([
        { versionId: 'v1', percentage: 0 },
        { versionId: 'v2', percentage: 100 },
      ]),
    ).toBe('Cada porcentagem precisa ser um inteiro entre 1 e 100.');
  });

  it('rejects empty selections and more than two slices', () => {
    expect(validateSplit([])).toBe('Informe 1 ou 2 versões para o deploy.');
    expect(validateSplit([{ versionId: '  ', percentage: 100 }])).toBe('Selecione a versão de cada fatia do split.');
  });
});

describe('parseWorkerVersion', () => {
  it('extracts id, number, metadata, annotations and active percentage', () => {
    const parsed = parseWorkerVersion({
      id: '3f2a1b9c-0000-4000-8000-123456789abc',
      number: 7,
      metadata: { created_on: '2026-07-01T10:00:00Z', author_email: 'dev@lcv.app.br', source: 'api' },
      annotations: { 'workers/message': 'hotfix', 'workers/triggered_by': 'upload' },
      active: true,
      percentage: 100,
    });
    expect(parsed).toEqual({
      id: '3f2a1b9c-0000-4000-8000-123456789abc',
      number: 7,
      createdOn: '2026-07-01T10:00:00Z',
      author: 'dev@lcv.app.br',
      source: 'api',
      message: 'hotfix',
      active: true,
      percentage: 100,
    });
  });

  it('tolerates missing fields', () => {
    const parsed = parseWorkerVersion({ id: 'abc' });
    expect(parsed.number).toBeNull();
    expect(parsed.active).toBe(false);
    expect(parsed.percentage).toBeNull();
    expect(parsed.message).toBeNull();
  });
});

describe('shortVersionId', () => {
  it('returns the first UUID block capped at 8 chars', () => {
    expect(shortVersionId('3f2a1b9c-0000-4000-8000-123456789abc')).toBe('3f2a1b9c');
    expect(shortVersionId('abcdef1234567890')).toBe('abcdef12');
  });
});
