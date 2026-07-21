/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros da sub-aba KV (ST-KV): pilha de cursores para paginação com
 * "Anterior", validadores client-side (bytes UTF-8, metadata, TTL),
 * classificação do tipo de valor e predicado de confirmação do bulk-delete.
 * Espelham os limites reais do Workers KV validados também no motor.
 */

import type { KvValueType } from '../../../types';

export const KV_KEY_MAX_BYTES = 512;
const KV_METADATA_MAX_BYTES = 1024;
const KV_TTL_MIN_SECONDS = 60;
/** Acima deste número de chaves, o bulk-delete exige digitar o total exato. */
export const KV_BULK_DELETE_TYPE_THRESHOLD = 25;

// ── Pilha de cursores ──
// `current` é o cursor usado para buscar a página atual (null = primeira);
// `previous` guarda os cursores das páginas anteriores para o botão "Anterior".

export type CursorStackState = {
  previous: Array<string | null>;
  current: string | null;
};

export type CursorStackAction = { type: 'next'; cursor: string } | { type: 'prev' } | { type: 'reset' };

export const INITIAL_CURSOR_STACK: CursorStackState = { previous: [], current: null };

export function cursorStackReducer(state: CursorStackState, action: CursorStackAction): CursorStackState {
  switch (action.type) {
    case 'next':
      return { previous: [...state.previous, state.current], current: action.cursor };
    case 'prev': {
      if (state.previous.length === 0) {
        return state;
      }
      return {
        previous: state.previous.slice(0, -1),
        current: state.previous[state.previous.length - 1] ?? null,
      };
    }
    case 'reset':
      return INITIAL_CURSOR_STACK;
  }
}

// ── Validadores ──

export const utf8ByteLength = (value: string): number => new TextEncoder().encode(value).length;

/** null = válido; string = erro diagnóstico em pt-BR. */
export function validateKvKeyName(key: string): string | null {
  if (!key) {
    return 'Informe o nome da chave.';
  }
  const bytes = utf8ByteLength(key);
  if (bytes > KV_KEY_MAX_BYTES) {
    return `Nome da chave excede o limite de ${KV_KEY_MAX_BYTES} bytes UTF-8 (atual: ${bytes} bytes).`;
  }
  return null;
}

export type MetadataValidation =
  | { ok: true; metadata: Record<string, unknown> | undefined }
  | { ok: false; error: string };

/** Campo de metadata do drawer: vazio = sem metadata; senão JSON de objeto ≤ 1024 bytes. */
export function validateMetadataJson(raw: string): MetadataValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, metadata: undefined };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'Metadata inválido: o conteúdo precisa ser JSON válido.' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'Metadata inválido: o JSON precisa ser um objeto (ex.: {"origem":"painel"}).' };
  }

  const bytes = utf8ByteLength(JSON.stringify(parsed));
  if (bytes > KV_METADATA_MAX_BYTES) {
    return {
      ok: false,
      error: `Metadata excede o limite de ${KV_METADATA_MAX_BYTES} bytes (atual: ${bytes} bytes).`,
    };
  }
  return { ok: true, metadata: parsed as Record<string, unknown> };
}

export type TtlValidation = { ok: true; ttl: number | undefined } | { ok: false; error: string };

/** Campo de TTL do drawer: vazio = sem expiração; senão inteiro ≥ 60 segundos. */
export function validateTtl(raw: string): TtlValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, ttl: undefined };
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < KV_TTL_MIN_SECONDS) {
    return {
      ok: false,
      error: `TTL inválido: informe um inteiro ≥ ${KV_TTL_MIN_SECONDS} segundos (mínimo do Workers KV) ou deixe vazio.`,
    };
  }
  return { ok: true, ttl: parsed };
}

// ── Classificação do valor ──

export type ValueTypeInfo = {
  editable: boolean;
  label: string;
  warning: string | null;
};

export function classifyValueType(type: KvValueType | undefined): ValueTypeInfo {
  switch (type) {
    case 'text':
      return { editable: true, label: 'Texto', warning: null };
    case 'binary':
      return {
        editable: false,
        label: 'Binário',
        warning: 'Valor binário (não é UTF-8 válido) — edição indisponível; use "Baixar" para obter o conteúdo.',
      };
    case 'too-large':
      return {
        editable: false,
        label: 'Grande (>1 MiB)',
        warning: 'Valor acima de 1 MiB — edição indisponível; use "Baixar" para obter o conteúdo.',
      };
    default:
      return { editable: false, label: 'Desconhecido', warning: null };
  }
}

// ── Bulk delete ──

/** Até 25 chaves basta confirmar; acima disso é preciso digitar o número exato. */
export function canConfirmBulkDelete(count: number, typed: string): boolean {
  if (count <= KV_BULK_DELETE_TYPE_THRESHOLD) {
    return count > 0;
  }
  return typed.trim() === String(count);
}

/** Data de expiração (unix seconds) formatada em pt-BR; null sem expiração. */
export function formatKvExpiration(expiration: number | undefined | null): string | null {
  if (typeof expiration !== 'number' || !Number.isFinite(expiration)) {
    return null;
  }
  return new Date(expiration * 1000).toLocaleString('pt-BR');
}
