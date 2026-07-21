/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos helpers puros da sub-aba R2 (ST-R2): breadcrumbs por prefixo,
 * último segmento, formatação de tamanho, chunk planner do bulk-delete,
 * detector de overwrite, validador de 90 MiB e etag curto.
 */

import { describe, expect, it } from 'vitest';
import {
  buildR2Breadcrumbs,
  canConfirmR2BulkDelete,
  formatR2Size,
  isR2OverwriteRisk,
  planR2DeleteChunks,
  R2_MAX_UPLOAD_BYTES,
  r2LastSegment,
  shortR2Etag,
  validateR2UploadSize,
} from './r2Helpers';

describe('buildR2Breadcrumbs', () => {
  it('returns only the root crumb for the empty prefix', () => {
    expect(buildR2Breadcrumbs('')).toEqual([{ label: 'raiz', prefix: '' }]);
  });

  it('builds one crumb per folder with accumulated prefixes', () => {
    expect(buildR2Breadcrumbs('docs/fotos/')).toEqual([
      { label: 'raiz', prefix: '' },
      { label: 'docs', prefix: 'docs/' },
      { label: 'fotos', prefix: 'docs/fotos/' },
    ]);
  });
});

describe('r2LastSegment', () => {
  it('returns the last segment of keys and of trailing-slash folder prefixes', () => {
    expect(r2LastSegment('docs/manual.pdf')).toBe('manual.pdf');
    expect(r2LastSegment('docs/fotos/')).toBe('fotos');
    expect(r2LastSegment('raiz.txt')).toBe('raiz.txt');
  });
});

describe('formatR2Size', () => {
  it('formats bytes into pt-BR readable units and rejects non-numeric input', () => {
    expect(formatR2Size(512)).toBe('512 B');
    expect(formatR2Size(2048)).toBe('2 KB');
    expect(formatR2Size(94_371_840)).toBe('90 MB');
    expect(formatR2Size(undefined)).toBeNull();
    expect(formatR2Size(-1)).toBeNull();
  });
});

describe('planR2DeleteChunks', () => {
  it('splits 41 keys into a chunk of 40 plus a chunk of 1', () => {
    const keys = Array.from({ length: 41 }, (_, index) => `k-${index}`);
    const chunks = planR2DeleteChunks(keys);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(40);
    expect(chunks[1]).toEqual(['k-40']);
  });

  it('keeps up to 40 keys in a single chunk and handles the empty list', () => {
    expect(planR2DeleteChunks(['a', 'b'])).toEqual([['a', 'b']]);
    expect(planR2DeleteChunks([])).toEqual([]);
  });
});

describe('isR2OverwriteRisk', () => {
  it('detects when the target key already exists in the listed page', () => {
    expect(isR2OverwriteRisk(['docs/a.txt', 'docs/b.txt'], 'docs/b.txt')).toBe(true);
    expect(isR2OverwriteRisk(['docs/a.txt'], 'docs/c.txt')).toBe(false);
  });
});

describe('validateR2UploadSize', () => {
  it('accepts up to 90 MiB and rejects above with a wrangler/dashboard hint', () => {
    expect(validateR2UploadSize(R2_MAX_UPLOAD_BYTES)).toBeNull();
    const error = validateR2UploadSize(R2_MAX_UPLOAD_BYTES + 1);
    expect(error).toContain('90 MiB');
    expect(error).toContain('wrangler');
  });
});

describe('canConfirmR2BulkDelete', () => {
  it('requires typing the exact count only above 25 objects', () => {
    expect(canConfirmR2BulkDelete(0, '')).toBe(false);
    expect(canConfirmR2BulkDelete(25, '')).toBe(true);
    expect(canConfirmR2BulkDelete(26, '')).toBe(false);
    expect(canConfirmR2BulkDelete(26, ' 26 ')).toBe(true);
    expect(canConfirmR2BulkDelete(26, '25')).toBe(false);
  });
});

describe('shortR2Etag', () => {
  it('strips quotes, truncates to 8 chars and returns null when empty', () => {
    expect(shortR2Etag('"0123456789abcdef"')).toBe('01234567');
    expect(shortR2Etag('abc')).toBe('abc');
    expect(shortR2Etag('')).toBeNull();
    expect(shortR2Etag(undefined)).toBeNull();
  });
});
