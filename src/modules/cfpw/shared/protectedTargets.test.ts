/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes do predicado de alvos protegidos (recursos que servem a própria
 * admin-app em produção) usado pelo DeleteConfirmModal.
 */

import { describe, expect, it } from 'vitest';
import { isProtectedTarget, PROTECTED_CONFIRM_PHRASE } from './protectedTargets';

describe('isProtectedTarget', () => {
  it('protects the production workers that serve the admin-app', () => {
    expect(isProtectedTarget('worker', 'admin-motor')).toBe(true);
    expect(isProtectedTarget('worker', 'tlsrpt-motor')).toBe(true);
  });

  it('protects the Pages project that serves the admin-app frontend', () => {
    expect(isProtectedTarget('page', 'admin-app')).toBe(true);
  });

  it('does not protect other workers or Pages projects', () => {
    expect(isProtectedTarget('worker', 'worker-qualquer')).toBe(false);
    expect(isProtectedTarget('page', 'projeto-qualquer')).toBe(false);
  });

  it('does not cross-protect names between types', () => {
    expect(isProtectedTarget('page', 'admin-motor')).toBe(false);
    expect(isProtectedTarget('worker', 'admin-app')).toBe(false);
  });

  it('mirrors the exact confirm phrase expected by the motor guard', () => {
    expect(PROTECTED_CONFIRM_PHRASE).toBe('EU ENTENDO O RISCO');
  });
});
