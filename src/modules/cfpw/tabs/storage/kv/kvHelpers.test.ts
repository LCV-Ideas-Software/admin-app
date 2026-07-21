/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos helpers puros da sub-aba KV (ST-KV): pilha de cursores,
 * validadores de bytes UTF-8/metadata/TTL, classificador de tipo de valor e
 * predicado de confirmação do bulk-delete.
 */

import { describe, expect, it } from 'vitest';
import {
  canConfirmBulkDelete,
  classifyValueType,
  cursorStackReducer,
  formatKvExpiration,
  INITIAL_CURSOR_STACK,
  utf8ByteLength,
  validateKvKeyName,
  validateMetadataJson,
  validateTtl,
} from './kvHelpers';

describe('cursorStackReducer', () => {
  it('pushes the current cursor and advances on next', () => {
    const first = cursorStackReducer(INITIAL_CURSOR_STACK, { type: 'next', cursor: 'c1' });
    expect(first).toEqual({ previous: [null], current: 'c1' });

    const second = cursorStackReducer(first, { type: 'next', cursor: 'c2' });
    expect(second).toEqual({ previous: [null, 'c1'], current: 'c2' });
  });

  it('pops back to the previous cursor on prev, down to the first page (null)', () => {
    const state = { previous: [null, 'c1'], current: 'c2' };

    const back = cursorStackReducer(state, { type: 'prev' });
    expect(back).toEqual({ previous: [null], current: 'c1' });

    const root = cursorStackReducer(back, { type: 'prev' });
    expect(root).toEqual({ previous: [], current: null });
  });

  it('is a no-op on prev at the first page and returns the initial state on reset', () => {
    expect(cursorStackReducer(INITIAL_CURSOR_STACK, { type: 'prev' })).toBe(INITIAL_CURSOR_STACK);

    const deep = { previous: [null, 'c1'], current: 'c2' };
    expect(cursorStackReducer(deep, { type: 'reset' })).toEqual({ previous: [], current: null });
  });
});

describe('utf8ByteLength / validateKvKeyName', () => {
  it('counts multibyte characters in bytes, not chars', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('π')).toBe(2);
    expect(utf8ByteLength('♥')).toBe(3);
    expect(utf8ByteLength('chave/π/♥')).toBe(12);
  });

  it('rejects a 257-char multibyte key (514 bytes) and accepts up to 512 bytes', () => {
    const multibyte = 'π'.repeat(257);
    expect(multibyte.length).toBe(257);
    expect(validateKvKeyName(multibyte)).toContain('514 bytes');

    expect(validateKvKeyName('a'.repeat(512))).toBeNull();
    expect(validateKvKeyName('')).toContain('Informe o nome');
  });
});

describe('validateMetadataJson', () => {
  it('treats empty input as "no metadata" and accepts a small JSON object', () => {
    expect(validateMetadataJson('   ')).toEqual({ ok: true, metadata: undefined });
    expect(validateMetadataJson('{"origem":"painel"}')).toEqual({ ok: true, metadata: { origem: 'painel' } });
  });

  it('rejects invalid JSON, non-object JSON and objects above 1024 bytes', () => {
    expect(validateMetadataJson('{oops')).toEqual({
      ok: false,
      error: 'Metadata inválido: o conteúdo precisa ser JSON válido.',
    });

    const arrayResult = validateMetadataJson('[1,2]');
    expect(arrayResult.ok).toBe(false);

    const bigResult = validateMetadataJson(JSON.stringify({ blob: 'a'.repeat(1100) }));
    expect(bigResult.ok).toBe(false);
    if (!bigResult.ok) {
      expect(bigResult.error).toContain('1024');
    }
  });
});

describe('validateTtl', () => {
  it('treats empty input as "no expiration" and accepts integers >= 60', () => {
    expect(validateTtl('')).toEqual({ ok: true, ttl: undefined });
    expect(validateTtl('60')).toEqual({ ok: true, ttl: 60 });
    expect(validateTtl('3600')).toEqual({ ok: true, ttl: 3600 });
  });

  it('rejects 59, non-numbers and fractions with a diagnostic message', () => {
    for (const raw of ['59', 'abc', '60.5', '-1']) {
      const result = validateTtl(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('60');
      }
    }
  });
});

describe('classifyValueType', () => {
  it('marks text as editable and binary/too-large as download-only with a warning', () => {
    expect(classifyValueType('text')).toEqual({ editable: true, label: 'Texto', warning: null });

    const binary = classifyValueType('binary');
    expect(binary.editable).toBe(false);
    expect(binary.warning).toContain('Baixar');

    const tooLarge = classifyValueType('too-large');
    expect(tooLarge.editable).toBe(false);
    expect(tooLarge.label).toContain('1 MiB');
  });
});

describe('canConfirmBulkDelete', () => {
  it('allows up to 25 keys without typing and requires the exact count above 25', () => {
    expect(canConfirmBulkDelete(0, '')).toBe(false);
    expect(canConfirmBulkDelete(25, '')).toBe(true);
    expect(canConfirmBulkDelete(26, '')).toBe(false);
    expect(canConfirmBulkDelete(26, '25')).toBe(false);
    expect(canConfirmBulkDelete(26, '26')).toBe(true);
    expect(canConfirmBulkDelete(26, ' 26 ')).toBe(true);
  });
});

describe('formatKvExpiration', () => {
  it('returns null without expiration and a pt-BR date string for unix seconds', () => {
    expect(formatKvExpiration(undefined)).toBeNull();
    expect(formatKvExpiration(null)).toBeNull();
    const formatted = formatKvExpiration(1893456000);
    expect(formatted).toBe(new Date(1893456000 * 1000).toLocaleString('pt-BR'));
  });
});
