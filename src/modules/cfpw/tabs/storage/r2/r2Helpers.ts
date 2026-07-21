/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros da sub-aba R2 (ST-R2): breadcrumbs por prefixo, último
 * segmento de chave, formatação de tamanho, plano de chunks do bulk-delete
 * (40 por chamada do motor), detecção de overwrite no upload e validação do
 * limite de 90 MiB. A pilha de cursores reusa cursorStackReducer de kvHelpers.
 */

/** 90 MiB — espelho do limite de upload validado no motor (413 acima). */
export const R2_MAX_UPLOAD_BYTES = 94_371_840;
/** Máximo de chaves por chamada de DELETE do motor; o painel encadeia lotes. */
const R2_DELETE_CHUNK_SIZE = 40;
/** Acima deste número de objetos, o bulk-delete exige digitar o total exato. */
export const R2_BULK_DELETE_TYPE_THRESHOLD = 25;

export type R2Breadcrumb = {
  label: string;
  prefix: string;
};

/** Breadcrumbs de um prefixo: raiz + um crumb por pasta ('docs/fotos/' → 3). */
export function buildR2Breadcrumbs(prefix: string): R2Breadcrumb[] {
  const crumbs: R2Breadcrumb[] = [{ label: 'raiz', prefix: '' }];
  const segments = prefix.split('/').filter(Boolean);
  let accumulated = '';
  for (const segment of segments) {
    accumulated += `${segment}/`;
    crumbs.push({ label: segment, prefix: accumulated });
  }
  return crumbs;
}

/** Último segmento não vazio da chave/prefixo (nome exibido); fallback = chave. */
export function r2LastSegment(key: string): string {
  return key.split('/').filter(Boolean).pop() ?? key;
}

/** Tamanho em unidade legível pt-BR (ex.: 2,5 MB); null sem valor numérico. */
export function formatR2Size(bytes: number | undefined | null): string | null {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    return null;
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
}

/** Divide as chaves em lotes de 40 (limite por chamada do motor). */
export function planR2DeleteChunks(keys: string[]): string[][] {
  const chunks: string[][] = [];
  for (let offset = 0; offset < keys.length; offset += R2_DELETE_CHUNK_SIZE) {
    chunks.push(keys.slice(offset, offset + R2_DELETE_CHUNK_SIZE));
  }
  return chunks;
}

/** true quando o upload sobrescreveria um objeto já listado na página atual. */
export function isR2OverwriteRisk(listedKeys: string[], targetKey: string): boolean {
  return listedKeys.includes(targetKey);
}

/** null = tamanho válido; string = erro diagnóstico em pt-BR (> 90 MiB). */
export function validateR2UploadSize(bytes: number): string | null {
  if (bytes > R2_MAX_UPLOAD_BYTES) {
    const formatted = formatR2Size(bytes) ?? `${bytes} B`;
    return `Arquivo de ${formatted} excede o limite de 90 MiB do painel — arquivos maiores: use wrangler ou o dashboard.`;
  }
  return null;
}

/** Até 25 objetos basta confirmar; acima disso é preciso digitar o número exato. */
export function canConfirmR2BulkDelete(count: number, typed: string): boolean {
  if (count <= R2_BULK_DELETE_TYPE_THRESHOLD) {
    return count > 0;
  }
  return typed.trim() === String(count);
}

/** Etag curto para exibição (8 caracteres); null sem etag. */
export function shortR2Etag(etag: string | undefined | null): string | null {
  const trimmed = String(etag ?? '')
    .replace(/"/g, '')
    .trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > 8 ? trimmed.slice(0, 8) : trimmed;
}
