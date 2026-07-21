/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros do editor de variáveis & bindings de Pages (PW-3): montagem do
 * PATCH /api/cfpw/page-env com SOMENTE os deltas — null remove a chave,
 * entradas idênticas ao original são descartadas e secret novo/substituído
 * exige valor não vazio. Secrets existentes chegam sem value da CF, então
 * qualquer edição de secret com valor conta como substituição.
 */

type PageEnvVarDraft = {
  type: 'plain_text' | 'secret_text';
  value?: string;
};

export type PageEnvOriginal = {
  envVars: Record<string, PageEnvVarDraft>;
  bindings: Record<string, Record<string, Record<string, unknown>>>;
};

export type PageEnvEdits = {
  /** null = remover a variável; objeto = criar/substituir. */
  envVars?: Record<string, PageEnvVarDraft | null>;
  /** Por grupo (kvNamespaces, d1Databases, …): null = remover o binding. */
  bindings?: Record<string, Record<string, Record<string, unknown> | null>>;
};

export type PageEnvPatch = {
  envVars?: Record<string, PageEnvVarDraft | null>;
  bindings?: Record<string, Record<string, Record<string, unknown> | null>>;
};

const sameEnvVar = (original: PageEnvVarDraft | undefined, edit: PageEnvVarDraft): boolean => {
  if (!original) {
    return false;
  }
  if (original.type !== edit.type) {
    return false;
  }
  // Secret original nunca tem value visível: edição com valor = substituição.
  if (edit.type === 'secret_text') {
    return false;
  }
  return (original.value ?? '') === (edit.value ?? '');
};

const sameBinding = (original: Record<string, unknown> | undefined, edit: Record<string, unknown>): boolean =>
  original !== undefined && JSON.stringify(original) === JSON.stringify(edit);

/**
 * Monta o corpo do PATCH com o delta mínimo entre original e edits.
 * Devolve { patch: null } quando nada mudou e { error } quando inválido.
 */
export const buildPageEnvPatch = (
  original: PageEnvOriginal,
  edits: PageEnvEdits,
): { patch: PageEnvPatch | null; error?: string } => {
  const envVarsPatch: Record<string, PageEnvVarDraft | null> = {};
  for (const [name, edit] of Object.entries(edits.envVars ?? {})) {
    const key = name.trim();
    if (!key) {
      return { patch: null, error: 'Nome de variável vazio.' };
    }
    const current = original.envVars[key];
    if (edit === null) {
      // Remoção só faz sentido para chave existente (delta mínimo).
      if (current !== undefined) {
        envVarsPatch[key] = null;
      }
      continue;
    }
    if (edit.type === 'secret_text' && !(edit.value ?? '').trim()) {
      return { patch: null, error: `A variável secreta '${key}' precisa de um valor não vazio.` };
    }
    if (sameEnvVar(current, edit)) {
      continue;
    }
    envVarsPatch[key] = { type: edit.type, value: edit.value ?? '' };
  }

  const bindingsPatch: Record<string, Record<string, Record<string, unknown> | null>> = {};
  for (const [group, entries] of Object.entries(edits.bindings ?? {})) {
    const originalGroup = original.bindings[group] ?? {};
    const groupPatch: Record<string, Record<string, unknown> | null> = {};
    for (const [name, edit] of Object.entries(entries)) {
      const key = name.trim();
      if (!key) {
        return { patch: null, error: `Nome de binding vazio no grupo ${group}.` };
      }
      if (edit === null) {
        if (originalGroup[key] !== undefined) {
          groupPatch[key] = null;
        }
        continue;
      }
      if (sameBinding(originalGroup[key], edit)) {
        continue;
      }
      groupPatch[key] = edit;
    }
    if (Object.keys(groupPatch).length > 0) {
      bindingsPatch[group] = groupPatch;
    }
  }

  const hasEnvVars = Object.keys(envVarsPatch).length > 0;
  const hasBindings = Object.keys(bindingsPatch).length > 0;
  if (!hasEnvVars && !hasBindings) {
    return { patch: null };
  }

  return {
    patch: {
      ...(hasEnvVars ? { envVars: envVarsPatch } : {}),
      ...(hasBindings ? { bindings: bindingsPatch } : {}),
    },
  };
};
