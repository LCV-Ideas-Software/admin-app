/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes da validação de nome de Worker e do guard de workers protegidos
 * (PW-1) — espelham as regras do motor.
 */

import { describe, expect, it } from 'vitest';
import { isProtectedWorker, validateWorkerName, WORKER_NAME_HINT } from './workerValidation';

describe('validateWorkerName', () => {
  it('accepts valid names', () => {
    expect(validateWorkerName('meu-worker-01')).toBeNull();
    expect(validateWorkerName('a')).toBeNull();
  });

  it('rejects empty names', () => {
    expect(validateWorkerName('  ')).toBe('Informe o nome do Worker.');
  });

  it('rejects uppercase, underscores and edge hyphens', () => {
    expect(validateWorkerName('MeuWorker')).toBe(WORKER_NAME_HINT);
    expect(validateWorkerName('meu_worker')).toBe(WORKER_NAME_HINT);
    expect(validateWorkerName('-worker')).toBe(WORKER_NAME_HINT);
    expect(validateWorkerName('worker-')).toBe(WORKER_NAME_HINT);
  });

  it('rejects names longer than 63 characters', () => {
    expect(validateWorkerName('a'.repeat(64))).toBe('Nome muito longo: máximo de 63 caracteres.');
    expect(validateWorkerName('a'.repeat(63))).toBeNull();
  });
});

describe('isProtectedWorker', () => {
  it('flags the production workers of the admin-app itself', () => {
    expect(isProtectedWorker('admin-motor')).toBe(true);
    expect(isProtectedWorker('tlsrpt-motor')).toBe(true);
    expect(isProtectedWorker('outro-worker')).toBe(false);
  });
});
