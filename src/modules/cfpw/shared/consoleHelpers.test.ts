/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos helpers puros do Console avançado (PW-2): pré-validação de path
 * contra os regex sources da allowlist do motor e validação do input completo.
 */

import { describe, expect, it } from 'vitest';
import { isRawPathAllowed, validateRawConsoleInput } from './consoleHelpers';

// Sources espelhando os patterns reais servidos por GET /api/cfpw/raw-allowlist.
const PATTERNS = [
  '^\\/accounts(\\?|$)',
  '^\\/accounts\\/[^/]+\\/workers\\/',
  '^\\/accounts\\/[^/]+\\/pages\\/',
  '^\\/zones(\\?|$)',
  '^\\/zones\\/[^/]+\\/workers\\/routes(\\/|$|\\?)',
  '^\\/zones\\/[^/]+\\/purge_cache(\\/|$|\\?)',
];

describe('isRawPathAllowed', () => {
  it('accepts paths covered by the allowlist patterns', () => {
    expect(isRawPathAllowed('/accounts/acct-1/workers/scripts', PATTERNS)).toBe(true);
    expect(isRawPathAllowed('/accounts/acct-1/pages/projects', PATTERNS)).toBe(true);
    expect(isRawPathAllowed('/zones?per_page=50', PATTERNS)).toBe(true);
  });

  it('rejects paths outside the allowlist, traversal and non-rooted paths', () => {
    expect(isRawPathAllowed('/user/tokens', PATTERNS)).toBe(false);
    expect(isRawPathAllowed('/accounts/acct-1/workers/../d1/database', PATTERNS)).toBe(false);
    expect(isRawPathAllowed('accounts/acct-1/workers/scripts', PATTERNS)).toBe(false);
  });

  it('ignores invalid regex sources without throwing', () => {
    expect(isRawPathAllowed('/accounts/acct-1/workers/scripts', ['[inválido', PATTERNS[1] ?? ''])).toBe(true);
    expect(isRawPathAllowed('/user/tokens', ['[inválido'])).toBe(false);
  });
});

describe('validateRawConsoleInput', () => {
  it('returns null for a valid GET within the allowlist', () => {
    expect(validateRawConsoleInput('GET', '/accounts/acct-1/workers/scripts', '', PATTERNS)).toBeNull();
  });

  it('requires a rooted, allowlisted path', () => {
    expect(validateRawConsoleInput('GET', '', '', PATTERNS)).toContain('Informe o path');
    expect(validateRawConsoleInput('GET', 'accounts/x', '', PATTERNS)).toContain('iniciar com "/"');
    expect(validateRawConsoleInput('GET', '/zones/z1/../purge_cache', '', PATTERNS)).toContain('".."');
    expect(validateRawConsoleInput('GET', '/user/tokens', '', PATTERNS)).toContain('fora do escopo permitido');
  });

  it('validates the JSON body only for mutations', () => {
    expect(validateRawConsoleInput('POST', '/accounts/a/workers/scripts', '{invalido', PATTERNS)).toContain(
      'JSON válido',
    );
    expect(validateRawConsoleInput('POST', '/accounts/a/workers/scripts', '{"ok":true}', PATTERNS)).toBeNull();
    expect(validateRawConsoleInput('GET', '/accounts/a/workers/scripts', '{invalido', PATTERNS)).toBeNull();
  });

  it('skips the allowlist pre-check while patterns are not loaded', () => {
    expect(validateRawConsoleInput('GET', '/user/tokens', '', [])).toBeNull();
  });
});
