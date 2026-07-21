/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes do dirty-diff de worker-settings (PW-1): só chaves alteradas entram
 * no PATCH; objetos compostos vão completos; validações pt-BR.
 */

import { describe, expect, it } from 'vitest';
import type { WorkerSettingsData } from '../types';
import { buildWorkerSettingsPatch, toWorkerSettingsForm } from './workerSettingsHelpers';

const SNAPSHOT: WorkerSettingsData = {
  compatibility_date: '2026-01-01',
  compatibility_flags: ['nodejs_compat'],
  placement: null,
  logpush: false,
  tail_consumers: null,
  observability: { enabled: true, head_sampling_rate: 0.5 },
  limits: null,
  usage_model: 'standard',
};

describe('buildWorkerSettingsPatch', () => {
  it('returns an empty patch when nothing changed', () => {
    const form = toWorkerSettingsForm(SNAPSHOT);
    const { settings, issues } = buildWorkerSettingsPatch(SNAPSHOT, form);
    expect(settings).toEqual({});
    expect(issues).toEqual([]);
  });

  it('includes only the dirty top-level keys', () => {
    const form = { ...toWorkerSettingsForm(SNAPSHOT), logpush: true, placementSmart: true };
    const { settings, issues } = buildWorkerSettingsPatch(SNAPSHOT, form);
    expect(settings).toEqual({ logpush: true, placement: { mode: 'smart' } });
    expect(issues).toEqual([]);
  });

  it('sends the observability object complete when any part changes', () => {
    const form = { ...toWorkerSettingsForm(SNAPSHOT), headSamplingRate: '0.1' };
    const { settings } = buildWorkerSettingsPatch(SNAPSHOT, form);
    expect(settings.observability).toEqual({ enabled: true, head_sampling_rate: 0.1 });
  });

  it('validates head_sampling_rate range and cpu_ms integer bounds', () => {
    const form = { ...toWorkerSettingsForm(SNAPSHOT), headSamplingRate: '2', cpuMs: '0' };
    const { issues } = buildWorkerSettingsPatch(SNAPSHOT, form);
    expect(issues).toEqual([
      'Observability head_sampling_rate: use um número maior que 0 e no máximo 1.',
      'Limite de CPU (cpu_ms): use um inteiro entre 1 e 300000.',
    ]);
  });

  it('formats tail_consumers dropping empty environments', () => {
    const form = {
      ...toWorkerSettingsForm(SNAPSHOT),
      tailConsumers: [
        { service: 'tail-worker', environment: '' },
        { service: 'outro', environment: 'staging' },
      ],
    };
    const { settings, issues } = buildWorkerSettingsPatch(SNAPSHOT, form);
    expect(issues).toEqual([]);
    expect(settings.tail_consumers).toEqual([{ service: 'tail-worker' }, { service: 'outro', environment: 'staging' }]);
  });
});
