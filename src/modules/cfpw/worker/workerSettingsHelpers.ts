/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros do painel de configurações do Worker (PW-1): snapshot da API →
 * estado de formulário e dirty-diff do PATCH (somente chaves top-level
 * alteradas; bindings NÃO passam por aqui — o painel envia sempre inherit).
 */

import type { WorkerSettingsData } from '../types';

export type TailConsumerForm = {
  service: string;
  environment: string;
};

export type WorkerSettingsFormState = {
  compatibilityDate: string;
  compatibilityFlags: string[];
  placementSmart: boolean;
  logpush: boolean;
  tailConsumers: TailConsumerForm[];
  observabilityEnabled: boolean;
  /** String de input; vazia = manter default do serviço. */
  headSamplingRate: string;
  /** String de input; vazia = sem limite explícito. */
  cpuMs: string;
  usageModel: string;
};

const toTailConsumersForm = (settings: WorkerSettingsData): TailConsumerForm[] => {
  if (!Array.isArray(settings.tail_consumers)) return [];
  return settings.tail_consumers.map((consumer) => ({
    service: String(consumer?.service ?? '').trim(),
    environment: String(consumer?.environment ?? '').trim(),
  }));
};

/** Snapshot da API → estado do formulário (números viram strings de input). */
export const toWorkerSettingsForm = (settings: WorkerSettingsData): WorkerSettingsFormState => ({
  compatibilityDate: String(settings.compatibility_date ?? '').trim(),
  compatibilityFlags: Array.isArray(settings.compatibility_flags)
    ? settings.compatibility_flags.filter((flag): flag is string => typeof flag === 'string' && flag.trim() !== '')
    : [],
  placementSmart: settings.placement?.mode === 'smart',
  logpush: settings.logpush === true,
  tailConsumers: toTailConsumersForm(settings),
  observabilityEnabled: settings.observability?.enabled === true,
  headSamplingRate:
    settings.observability?.head_sampling_rate != null ? String(settings.observability.head_sampling_rate) : '',
  cpuMs: settings.limits?.cpu_ms != null ? String(settings.limits.cpu_ms) : '',
  usageModel: String(settings.usage_model ?? '').trim(),
});

export type WorkerSettingsPatchResult = {
  /** Somente as chaves top-level alteradas em relação ao snapshot. */
  settings: Record<string, unknown>;
  /** Problemas de validação em pt-BR; quando não vazio, não envie o PATCH. */
  issues: string[];
};

const sameStringArray = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/**
 * Dirty-diff do formulário contra o snapshot: só chaves alteradas entram no
 * PATCH. Objetos compostos (observability, limits, tail_consumers) vão
 * completos quando qualquer parte deles mudou.
 */
export const buildWorkerSettingsPatch = (
  snapshot: WorkerSettingsData,
  form: WorkerSettingsFormState,
): WorkerSettingsPatchResult => {
  const settings: Record<string, unknown> = {};
  const issues: string[] = [];
  const base = toWorkerSettingsForm(snapshot);

  if (form.compatibilityDate !== base.compatibilityDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.compatibilityDate)) {
      issues.push('Compatibility date: use o formato YYYY-MM-DD.');
    } else {
      settings.compatibility_date = form.compatibilityDate;
    }
  }

  if (!sameStringArray(form.compatibilityFlags, base.compatibilityFlags)) {
    settings.compatibility_flags = form.compatibilityFlags;
  }

  if (form.placementSmart !== base.placementSmart) {
    settings.placement = form.placementSmart ? { mode: 'smart' } : null;
  }

  if (form.logpush !== base.logpush) {
    settings.logpush = form.logpush;
  }

  const tailDirty =
    form.tailConsumers.length !== base.tailConsumers.length ||
    form.tailConsumers.some(
      (consumer, index) =>
        consumer.service !== base.tailConsumers[index]?.service ||
        consumer.environment !== base.tailConsumers[index]?.environment,
    );
  if (tailDirty) {
    if (form.tailConsumers.some((consumer) => !consumer.service.trim())) {
      issues.push('Tail consumers: informe o service de cada consumidor.');
    } else {
      settings.tail_consumers = form.tailConsumers.map((consumer) => ({
        service: consumer.service.trim(),
        ...(consumer.environment.trim() ? { environment: consumer.environment.trim() } : {}),
      }));
    }
  }

  const observabilityDirty =
    form.observabilityEnabled !== base.observabilityEnabled || form.headSamplingRate.trim() !== base.headSamplingRate;
  if (observabilityDirty) {
    const observability: Record<string, unknown> = { enabled: form.observabilityEnabled };
    const rateRaw = form.headSamplingRate.trim();
    if (rateRaw) {
      const rate = Number(rateRaw);
      if (!Number.isFinite(rate) || !(rate > 0) || rate > 1) {
        issues.push('Observability head_sampling_rate: use um número maior que 0 e no máximo 1.');
      } else {
        observability.head_sampling_rate = rate;
      }
    }
    settings.observability = observability;
  }

  if (form.cpuMs.trim() !== base.cpuMs) {
    const cpuRaw = form.cpuMs.trim();
    if (!cpuRaw) {
      issues.push('Limite de CPU: não é possível remover o limite por aqui — informe um valor em ms.');
    } else {
      const cpuMs = Number(cpuRaw);
      if (!Number.isInteger(cpuMs) || cpuMs < 1 || cpuMs > 300000) {
        issues.push('Limite de CPU (cpu_ms): use um inteiro entre 1 e 300000.');
      } else {
        settings.limits = { cpu_ms: cpuMs };
      }
    }
  }

  if (form.usageModel !== base.usageModel && form.usageModel.trim()) {
    settings.usage_model = form.usageModel.trim();
  }

  return { settings, issues };
};
