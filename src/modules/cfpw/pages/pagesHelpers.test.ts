/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos helpers puros de Pages (PW-3): validação de nome de projeto,
 * duração de stages, predicado de polling e extração de branches.
 */

import { describe, expect, it } from 'vitest';
import {
  extractBranchOptions,
  formatStageDuration,
  isActiveDeploymentStatus,
  validatePagesProjectName,
} from './pagesHelpers';

describe('validatePagesProjectName', () => {
  it('accepts valid names', () => {
    expect(validatePagesProjectName('meu-projeto')).toBeNull();
    expect(validatePagesProjectName('a1')).toBeNull();
  });

  it('rejects empty, uppercase, leading hyphen and overlong names', () => {
    expect(validatePagesProjectName('')).toContain('Informe');
    expect(validatePagesProjectName('Meu_Projeto')).not.toBeNull();
    expect(validatePagesProjectName('-projeto')).not.toBeNull();
    expect(validatePagesProjectName(`a${'b'.repeat(60)}`)).toContain('máximo');
  });
});

describe('formatStageDuration', () => {
  it('formats seconds and minutes', () => {
    expect(formatStageDuration('2026-07-20T10:00:00Z', '2026-07-20T10:00:42Z')).toBe('42s');
    expect(formatStageDuration('2026-07-20T10:00:00Z', '2026-07-20T10:01:05Z')).toBe('1m 5s');
  });

  it('returns — for missing or invalid boundaries', () => {
    expect(formatStageDuration('2026-07-20T10:00:00Z', undefined)).toBe('—');
    expect(formatStageDuration(null, '2026-07-20T10:00:00Z')).toBe('—');
    expect(formatStageDuration('nao-e-data', '2026-07-20T10:00:00Z')).toBe('—');
    expect(formatStageDuration('2026-07-20T10:01:00Z', '2026-07-20T10:00:00Z')).toBe('—');
  });
});

describe('isActiveDeploymentStatus', () => {
  it('is inclusive for in-progress statuses (case-insensitive)', () => {
    for (const status of ['active', 'pending', 'running', 'queued', 'initializing', 'building', 'deploying']) {
      expect(isActiveDeploymentStatus(status)).toBe(true);
    }
    expect(isActiveDeploymentStatus('Active')).toBe(true);
  });

  it('is false for terminal or unknown statuses', () => {
    expect(isActiveDeploymentStatus('success')).toBe(false);
    expect(isActiveDeploymentStatus('failure')).toBe(false);
    expect(isActiveDeploymentStatus('canceled')).toBe(false);
    expect(isActiveDeploymentStatus('')).toBe(false);
    expect(isActiveDeploymentStatus(undefined)).toBe(false);
  });
});

describe('extractBranchOptions', () => {
  it('puts the production branch first and dedupes branches from deployments', () => {
    const deployments = [
      { deployment_trigger: { metadata: { branch: 'develop' } } },
      { deployment_trigger: { metadata: { branch: 'main' } } },
      { deployment_trigger: { metadata: { branch: 'develop' } } },
      { deployment_trigger: { metadata: { branch: 'feature/x' } } },
      { deployment_trigger: { metadata: {} } },
    ];
    expect(extractBranchOptions(deployments, 'main')).toEqual(['main', 'develop', 'feature/x']);
  });

  it('handles missing production branch and empty deployments', () => {
    expect(extractBranchOptions([], null)).toEqual([]);
    expect(extractBranchOptions([], 'main')).toEqual(['main']);
  });
});
