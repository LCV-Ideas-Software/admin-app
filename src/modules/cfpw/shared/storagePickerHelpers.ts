/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros do picker de recursos de Armazenamento (ST-R2): mapeiam os
 * payloads de GET /api/cfpw/storage/{kv/namespaces|d1/databases|r2/buckets}
 * em opções {value, label, detail} para os campos de ID dos editores de
 * bindings (Worker e Pages), com busca client-side.
 */

import type { D1DatabasesPayload, KvNamespacesPayload, R2BucketsPayload } from '../types';

export type StoragePickerKind = 'kv' | 'd1' | 'r2';

export type StoragePickerOption = {
  /** Valor gravado no campo do binding (id do namespace, uuid do banco, nome do bucket). */
  value: string;
  label: string;
  detail?: string;
};

export const STORAGE_PICKER_CONFIG: Record<StoragePickerKind, { title: string; endpoint: string }> = {
  kv: { title: 'Escolher namespace KV', endpoint: '/api/cfpw/storage/kv/namespaces?perPage=100' },
  d1: { title: 'Escolher banco D1', endpoint: '/api/cfpw/storage/d1/databases' },
  r2: { title: 'Escolher bucket R2', endpoint: '/api/cfpw/storage/r2/buckets' },
};

type StoragePickerPayload = KvNamespacesPayload & D1DatabasesPayload & R2BucketsPayload;

/** Mapeia o payload da listagem em opções do picker (defensivo: [] sem dados). */
export function toStoragePickerOptions(kind: StoragePickerKind, payload: StoragePickerPayload): StoragePickerOption[] {
  if (kind === 'kv') {
    return (payload.namespaces ?? [])
      .filter((namespace) => namespace.id)
      .map((namespace) => ({ value: namespace.id, label: namespace.title || namespace.id, detail: namespace.id }));
  }
  if (kind === 'd1') {
    return (payload.databases ?? [])
      .filter((database) => database.uuid)
      .map((database) => ({ value: database.uuid, label: database.name || database.uuid, detail: database.uuid }));
  }
  return (payload.buckets ?? [])
    .filter((bucket) => bucket.name)
    .map((bucket) => ({
      value: bucket.name,
      label: bucket.name,
      ...(bucket.location || bucket.storage_class
        ? { detail: [bucket.location, bucket.storage_class].filter(Boolean).join(' · ') }
        : {}),
    }));
}

/** Busca client-side (contains, case-insensitive) por label/value. */
export function filterStoragePickerOptions(options: StoragePickerOption[], search: string): StoragePickerOption[] {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return options;
  }
  return options.filter(
    (option) => option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle),
  );
}
