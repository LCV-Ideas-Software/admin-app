/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes do mapper puro do picker de Armazenamento (ST-R2): payload → opções
 * {value, label, detail} por tipo, com defensividade e busca client-side.
 */

import { describe, expect, it } from 'vitest';
import { filterStoragePickerOptions, toStoragePickerOptions } from './storagePickerHelpers';

describe('toStoragePickerOptions', () => {
  it('maps KV namespaces to {value: id, label: title, detail: id}', () => {
    const options = toStoragePickerOptions('kv', {
      ok: true,
      namespaces: [
        { id: 'ns-1', title: 'cache' },
        { id: 'ns-2', title: '' },
      ],
    });
    expect(options).toEqual([
      { value: 'ns-1', label: 'cache', detail: 'ns-1' },
      { value: 'ns-2', label: 'ns-2', detail: 'ns-2' },
    ]);
  });

  it('maps D1 databases to {value: uuid, label: name, detail: uuid}', () => {
    const options = toStoragePickerOptions('d1', {
      ok: true,
      databases: [{ uuid: 'uuid-1', name: 'bigdata_db', protected: true }],
    });
    expect(options).toEqual([{ value: 'uuid-1', label: 'bigdata_db', detail: 'uuid-1' }]);
  });

  it('maps R2 buckets to {value: name, label: name} with location/class detail', () => {
    const options = toStoragePickerOptions('r2', {
      ok: true,
      buckets: [
        { name: 'mainsite-media', location: 'ENAM', storage_class: 'Standard', protected: true },
        { name: 'simples', protected: false },
      ],
    });
    expect(options).toEqual([
      { value: 'mainsite-media', label: 'mainsite-media', detail: 'ENAM · Standard' },
      { value: 'simples', label: 'simples' },
    ]);
  });

  it('returns [] when the payload has no list (defensive)', () => {
    expect(toStoragePickerOptions('kv', { ok: true })).toEqual([]);
    expect(toStoragePickerOptions('d1', { ok: true })).toEqual([]);
    expect(toStoragePickerOptions('r2', { ok: true })).toEqual([]);
  });
});

describe('filterStoragePickerOptions', () => {
  const options = [
    { value: 'ns-1', label: 'Cache Blog' },
    { value: 'ns-2', label: 'sessions' },
  ];

  it('filters by label or value, case-insensitive, and keeps all when empty', () => {
    expect(filterStoragePickerOptions(options, 'blog')).toEqual([options[0]]);
    expect(filterStoragePickerOptions(options, 'NS-2')).toEqual([options[1]]);
    expect(filterStoragePickerOptions(options, '  ')).toEqual(options);
    expect(filterStoragePickerOptions(options, 'nada')).toEqual([]);
  });
});
