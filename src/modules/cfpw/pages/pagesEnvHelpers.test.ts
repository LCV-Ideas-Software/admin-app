/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes do buildPageEnvPatch (PW-3): delta mínimo, null-delete, secret novo
 * exige valor e deltas de bindings por grupo.
 */

import { describe, expect, it } from 'vitest';
import { buildPageEnvPatch, type PageEnvOriginal } from './pagesEnvHelpers';

const original = (): PageEnvOriginal => ({
  envVars: {
    MODO: { type: 'plain_text', value: 'producao' },
    API_KEY: { type: 'secret_text' },
  },
  bindings: {
    kvNamespaces: { CACHE_KV: { namespace_id: 'kv-1' } },
    d1Databases: { BIGDATA_DB: { id: 'd1-1' } },
  },
});

describe('buildPageEnvPatch', () => {
  it('returns a null patch when there are no edits', () => {
    const { patch, error } = buildPageEnvPatch(original(), {});
    expect(error).toBeUndefined();
    expect(patch).toBeNull();
  });

  it('discards edits identical to the original (minimal delta)', () => {
    const { patch } = buildPageEnvPatch(original(), {
      envVars: { MODO: { type: 'plain_text', value: 'producao' } },
      bindings: { kvNamespaces: { CACHE_KV: { namespace_id: 'kv-1' } } },
    });
    expect(patch).toBeNull();
  });

  it('emits null to delete an existing var and drops deletes of unknown vars', () => {
    const { patch } = buildPageEnvPatch(original(), {
      envVars: { MODO: null, NUNCA_EXISTIU: null },
    });
    expect(patch).toEqual({ envVars: { MODO: null } });
  });

  it('rejects a new secret without a value', () => {
    const { patch, error } = buildPageEnvPatch(original(), {
      envVars: { NOVO_SEGREDO: { type: 'secret_text', value: '' } },
    });
    expect(patch).toBeNull();
    expect(error).toContain('NOVO_SEGREDO');
  });

  it('treats a secret edit with a value as a replacement (always included)', () => {
    const { patch } = buildPageEnvPatch(original(), {
      envVars: { API_KEY: { type: 'secret_text', value: 'novo-valor' } },
    });
    expect(patch).toEqual({ envVars: { API_KEY: { type: 'secret_text', value: 'novo-valor' } } });
  });

  it('includes only changed vars alongside untouched ones', () => {
    const { patch } = buildPageEnvPatch(original(), {
      envVars: {
        MODO: { type: 'plain_text', value: 'homologacao' },
        NOVA_VAR: { type: 'plain_text', value: 'x' },
      },
    });
    expect(patch).toEqual({
      envVars: {
        MODO: { type: 'plain_text', value: 'homologacao' },
        NOVA_VAR: { type: 'plain_text', value: 'x' },
      },
    });
  });

  it('builds binding deltas per group: add, edit and null-delete', () => {
    const { patch } = buildPageEnvPatch(original(), {
      bindings: {
        kvNamespaces: { CACHE_KV: null },
        d1Databases: { BIGDATA_DB: { id: 'd1-2' } },
        r2Buckets: { MEDIA: { name: 'media-bucket' } },
      },
    });
    expect(patch).toEqual({
      bindings: {
        kvNamespaces: { CACHE_KV: null },
        d1Databases: { BIGDATA_DB: { id: 'd1-2' } },
        r2Buckets: { MEDIA: { name: 'media-bucket' } },
      },
    });
  });

  it('drops null-deletes of bindings that do not exist in the group', () => {
    const { patch } = buildPageEnvPatch(original(), {
      bindings: { r2Buckets: { NUNCA_EXISTIU: null } },
    });
    expect(patch).toBeNull();
  });
});
