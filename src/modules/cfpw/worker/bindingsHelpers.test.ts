/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes do buildBindingsPatch (PW-1): secrets preservados como inherit,
 * editado vira definição completa, removido fica ausente, novo é acrescentado
 * e intocados viram inherit.
 */

import { describe, expect, it } from 'vitest';
import type { WorkerBinding } from '../types';
import { buildBindingsPatch, buildInheritBindings, describeBindingTarget, toBindingList } from './bindingsHelpers';

const ORIGINAL: WorkerBinding[] = [
  { type: 'plain_text', name: 'MODE', text: 'production' },
  { type: 'secret_text', name: 'API_KEY' },
  { type: 'kv_namespace', name: 'CACHE', namespace_id: 'kv-123' },
  { type: 'd1', name: 'DB', id: 'd1-456' },
];

describe('buildBindingsPatch', () => {
  it('turns untouched bindings into {type: inherit, name} preserving order', () => {
    const patch = buildBindingsPatch(ORIGINAL, {});
    expect(patch).toEqual([
      { type: 'inherit', name: 'MODE' },
      { type: 'inherit', name: 'API_KEY' },
      { type: 'inherit', name: 'CACHE' },
      { type: 'inherit', name: 'DB' },
    ]);
  });

  it('keeps secrets as inherit even when listed as edited or removed', () => {
    const patch = buildBindingsPatch(ORIGINAL, {
      upserts: [{ type: 'secret_text', name: 'API_KEY', text: 'vazou' }],
      removedNames: ['API_KEY'],
    });
    const secret = patch.find((binding) => binding.name === 'API_KEY');
    expect(secret).toEqual({ type: 'inherit', name: 'API_KEY' });
    expect(patch.filter((binding) => binding.name === 'API_KEY')).toHaveLength(1);
  });

  it('sends the full definition for an edited binding', () => {
    const patch = buildBindingsPatch(ORIGINAL, {
      upserts: [{ type: 'kv_namespace', name: 'CACHE', namespace_id: 'kv-999' }],
    });
    expect(patch).toContainEqual({ type: 'kv_namespace', name: 'CACHE', namespace_id: 'kv-999' });
    expect(patch.filter((binding) => binding.name === 'CACHE')).toHaveLength(1);
  });

  it('omits removed bindings from the patch entirely', () => {
    const patch = buildBindingsPatch(ORIGINAL, { removedNames: ['DB'] });
    expect(patch.some((binding) => binding.name === 'DB')).toBe(false);
    expect(patch).toHaveLength(3);
  });

  it('appends brand-new bindings after the originals', () => {
    const patch = buildBindingsPatch(ORIGINAL, {
      upserts: [{ type: 'r2_bucket', name: 'ASSETS', bucket_name: 'assets-prod' }],
    });
    expect(patch.at(-1)).toEqual({ type: 'r2_bucket', name: 'ASSETS', bucket_name: 'assets-prod' });
    expect(patch).toHaveLength(5);
  });

  it('never emits secret_text with a text field', () => {
    const patch = buildBindingsPatch(ORIGINAL, {
      upserts: [{ type: 'secret_text', name: 'API_KEY', text: 'x' }],
    });
    expect(patch.some((binding) => binding.type === 'secret_text' && 'text' in binding)).toBe(false);
  });
});

describe('buildInheritBindings', () => {
  it('maps every original binding (secrets included) to inherit', () => {
    expect(buildInheritBindings(ORIGINAL)).toEqual([
      { type: 'inherit', name: 'MODE' },
      { type: 'inherit', name: 'API_KEY' },
      { type: 'inherit', name: 'CACHE' },
      { type: 'inherit', name: 'DB' },
    ]);
  });
});

describe('toBindingList', () => {
  it('drops entries without type or name and keeps the rest untouched', () => {
    const list = toBindingList([
      { type: 'ai', name: 'AI' },
      { type: '', name: 'SEM_TIPO' },
      { name: 'SEM_TIPO_2' },
      null as unknown as Record<string, unknown>,
    ]);
    expect(list).toEqual([{ type: 'ai', name: 'AI' }]);
  });
});

describe('describeBindingTarget', () => {
  it('describes common binding targets', () => {
    expect(describeBindingTarget({ type: 'kv_namespace', name: 'K', namespace_id: 'kv-1' })).toBe('kv-1');
    expect(describeBindingTarget({ type: 'service', name: 'S', service: 'motor', environment: 'production' })).toBe(
      'motor (production)',
    );
    expect(describeBindingTarget({ type: 'secret_text', name: 'X' })).toBe('(valor oculto)');
    expect(describeBindingTarget({ type: 'version_metadata', name: 'V' })).toBe('—');
  });
});
