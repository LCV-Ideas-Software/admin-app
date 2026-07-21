/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes de buildRecordsQuery (DNS-1): montagem da query-string de
 * GET /api/cfdns/records — conjunto completo de filtros avançados emite
 * exatamente os parâmetros esperados e vazios são omitidos.
 */

import { describe, expect, it } from 'vitest';
import { buildRecordsQuery } from './api';

describe('buildRecordsQuery', () => {
  it('emits exactly the expected params for a full advanced-filter set', () => {
    const query = buildRecordsQuery({
      zoneId: 'zone-1',
      page: 2,
      perPage: 50,
      type: 'A',
      search: '  API ',
      order: 'name',
      direction: 'desc',
      nameContains: 'www',
      contentContains: '192.0',
      commentContains: 'migrado',
      commentPresent: 'true',
      tagExact: 'team:infra',
      tagPresent: 'team',
      proxied: 'false',
      match: 'any',
    });

    expect(Object.fromEntries(query.entries())).toEqual({
      zoneId: 'zone-1',
      page: '2',
      perPage: '50',
      type: 'A',
      search: 'api',
      order: 'name',
      direction: 'desc',
      nameContains: 'www',
      contentContains: '192.0',
      commentContains: 'migrado',
      commentPresent: 'true',
      tagExact: 'team:infra',
      tagPresent: 'team',
      proxied: 'false',
      match: 'any',
    });
  });

  it('omits empty params entirely', () => {
    const query = buildRecordsQuery({
      zoneId: 'zone-1',
      page: 1,
      perPage: 100,
      type: '',
      search: '   ',
      order: '',
      direction: 'asc',
      nameContains: '',
      contentContains: '  ',
      commentContains: '',
      commentPresent: '',
      tagExact: '',
      tagPresent: '',
      proxied: '',
      match: '',
    });

    expect([...query.keys()].sort()).toEqual(['page', 'perPage', 'zoneId']);
  });

  it('only sends direction when order is set', () => {
    const withoutOrder = buildRecordsQuery({ zoneId: 'z', page: 1, perPage: 20, direction: 'desc' });
    expect(withoutOrder.get('order')).toBeNull();
    expect(withoutOrder.get('direction')).toBeNull();

    const withOrder = buildRecordsQuery({ zoneId: 'z', page: 1, perPage: 20, order: 'ttl', direction: 'desc' });
    expect(withOrder.get('order')).toBe('ttl');
    expect(withOrder.get('direction')).toBe('desc');
  });
});
