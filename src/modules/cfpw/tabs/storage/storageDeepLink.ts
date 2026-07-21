/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Deep-link da aba Armazenamento via window.location.hash (ST-R2):
 * `#cfpw-storage/<kv|d1|r2>` abre a sub-aba; `#cfpw-storage/<kind>/<id>`
 * também seleciona o alvo (namespace KV, banco D1 ou bucket R2). Parser e
 * builder puros — o router hand-rolled de pathname NÃO é tocado; a navegação
 * interna atualiza o hash com history.replaceState.
 */

type StorageDeepLinkKind = 'kv' | 'd1' | 'r2';

export type StorageDeepLink = {
  kind: StorageDeepLinkKind;
  /** Vazio quando o hash aponta só para a sub-aba, sem alvo selecionado. */
  id: string;
};

const HASH_ROOT = 'cfpw-storage';
const KINDS: StorageDeepLinkKind[] = ['kv', 'd1', 'r2'];

/** Interpreta o hash; null quando não é um deep-link de Armazenamento válido. */
export function parseStorageHash(hash: string): StorageDeepLink | null {
  const withoutPound = hash.startsWith('#') ? hash.slice(1) : hash;
  const segments = withoutPound.split('/');
  if (segments[0] !== HASH_ROOT) {
    return null;
  }
  const kind = segments[1] as StorageDeepLinkKind | undefined;
  if (!kind || !KINDS.includes(kind)) {
    return null;
  }
  const rawId = segments[2] ?? '';
  let id = rawId;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    // Percent-encoding malformado: usa o segmento cru.
  }
  return { kind, id };
}

/** Monta o hash do deep-link (id vazio = só a sub-aba). */
export function buildStorageHash(target: StorageDeepLink): string {
  const base = `#${HASH_ROOT}/${target.kind}`;
  return target.id ? `${base}/${encodeURIComponent(target.id)}` : base;
}
