/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros do editor de bindings (PW-1): normalização da lista devolvida
 * pelo GET worker-settings, descrição legível do alvo de cada binding e a
 * montagem do array de bindings do PATCH — inherit para tudo que a UI não
 * alterou, definição completa para novos/alterados, ausência para removidos e
 * secrets SEMPRE preservados como inherit (nunca enviados com text).
 */

import type { WorkerBinding } from '../types';

/** Normaliza a lista crua do GET: só entradas com type e name não vazios. */
export const toBindingList = (raw: Array<Record<string, unknown>> | undefined | null): WorkerBinding[] => {
  if (!Array.isArray(raw)) return [];
  const bindings: WorkerBinding[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const type = String(entry.type ?? '').trim();
    const name = String(entry.name ?? '').trim();
    if (!type || !name) continue;
    bindings.push({ ...entry, type, name });
  }
  return bindings;
};

const targetText = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  return text || null;
};

/** Descrição curta do alvo do binding para exibição em tabela. */
export const describeBindingTarget = (binding: WorkerBinding): string => {
  switch (binding.type) {
    case 'kv_namespace':
      return targetText(binding.namespace_id) ?? '—';
    case 'r2_bucket':
      return targetText(binding.bucket_name) ?? '—';
    case 'd1':
      return targetText(binding.id) ?? '—';
    case 'hyperdrive':
      return targetText(binding.id) ?? '—';
    case 'service': {
      const service = targetText(binding.service) ?? '—';
      const environment = targetText(binding.environment);
      return environment ? `${service} (${environment})` : service;
    }
    case 'durable_object_namespace': {
      const className = targetText(binding.class_name) ?? '—';
      const scriptName = targetText(binding.script_name);
      return scriptName ? `${className} @ ${scriptName}` : className;
    }
    case 'queue':
      return targetText(binding.queue_name) ?? '—';
    case 'analytics_engine':
      return targetText(binding.dataset) ?? '—';
    case 'vectorize':
      return targetText(binding.index_name) ?? '—';
    case 'plain_text':
      return targetText(binding.text) ?? '—';
    case 'json':
      return 'JSON';
    case 'secret_text':
      return '(valor oculto)';
    default:
      return '—';
  }
};

export type BindingsEdits = {
  /** Definições completas de bindings novos ou alterados (chave = name). */
  upserts?: WorkerBinding[];
  /** Nomes de bindings originais a remover (ausentes do PATCH). */
  removedNames?: string[];
};

/**
 * Monta o array `settings.bindings` do PATCH:
 * - originais intocados → `{type: 'inherit', name}`;
 * - `secret_text` originais → SEMPRE inherit, mesmo se marcados como editados
 *   ou removidos (secrets são geridos pelo fluxo de secrets, nunca aqui);
 * - upserts (novos/alterados) → definição completa;
 * - removidos → simplesmente ausentes.
 */
export const buildBindingsPatch = (original: WorkerBinding[], edits: BindingsEdits): WorkerBinding[] => {
  const upserts = edits.upserts ?? [];
  const removed = new Set(edits.removedNames ?? []);
  const upsertByName = new Map(upserts.map((binding) => [binding.name, binding]));

  const patch: WorkerBinding[] = [];
  const seen = new Set<string>();

  for (const binding of original) {
    seen.add(binding.name);
    if (binding.type === 'secret_text') {
      patch.push({ type: 'inherit', name: binding.name });
      continue;
    }
    if (removed.has(binding.name)) {
      continue;
    }
    const upsert = upsertByName.get(binding.name);
    if (upsert) {
      patch.push(upsert);
      continue;
    }
    patch.push({ type: 'inherit', name: binding.name });
  }

  for (const upsert of upserts) {
    if (!seen.has(upsert.name)) {
      patch.push(upsert);
    }
  }

  return patch;
};

/** Bindings todos como inherit (painel de settings que não edita bindings). */
export const buildInheritBindings = (original: WorkerBinding[]): WorkerBinding[] =>
  original.map((binding) => ({ type: 'inherit', name: binding.name }));
