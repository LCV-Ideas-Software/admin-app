/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes do parser/builder puro do deep-link de Armazenamento
 * (#cfpw-storage/<kind>/<id>) usado pelo CfPwModule e pelo StorageTab.
 */

import { describe, expect, it } from 'vitest';
import { buildStorageHash, parseStorageHash } from './storageDeepLink';

describe('parseStorageHash', () => {
  it('parses kv, d1 and r2 deep-links with their ids', () => {
    expect(parseStorageHash('#cfpw-storage/kv/ns-123')).toEqual({ kind: 'kv', id: 'ns-123' });
    expect(parseStorageHash('#cfpw-storage/d1/0b1c-uuid')).toEqual({ kind: 'd1', id: '0b1c-uuid' });
    expect(parseStorageHash('#cfpw-storage/r2/mainsite-media')).toEqual({ kind: 'r2', id: 'mainsite-media' });
  });

  it('parses a kind-only hash with empty id', () => {
    expect(parseStorageHash('#cfpw-storage/r2')).toEqual({ kind: 'r2', id: '' });
  });

  it('returns null for foreign hashes, unknown kinds and empty hash', () => {
    expect(parseStorageHash('')).toBeNull();
    expect(parseStorageHash('#outra-coisa/kv/1')).toBeNull();
    expect(parseStorageHash('#cfpw-storage/queue/1')).toBeNull();
    expect(parseStorageHash('#cfpw-storage')).toBeNull();
  });

  it('decodes percent-encoded ids', () => {
    expect(parseStorageHash('#cfpw-storage/kv/ns%20com%20espa%C3%A7o')).toEqual({
      kind: 'kv',
      id: 'ns com espaço',
    });
  });
});

describe('buildStorageHash', () => {
  it('builds kind-only and kind+id hashes, encoding the id', () => {
    expect(buildStorageHash({ kind: 'd1', id: '' })).toBe('#cfpw-storage/d1');
    expect(buildStorageHash({ kind: 'r2', id: 'meu-bucket' })).toBe('#cfpw-storage/r2/meu-bucket');
    expect(buildStorageHash({ kind: 'kv', id: 'ns com espaço' })).toBe('#cfpw-storage/kv/ns%20com%20espa%C3%A7o');
  });

  it('round-trips through parseStorageHash', () => {
    const target = { kind: 'kv' as const, id: 'ns/π' };
    expect(parseStorageHash(buildStorageHash(target))).toEqual(target);
  });
});
