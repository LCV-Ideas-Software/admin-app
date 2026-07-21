/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros da aba Versões (PW-1): parsing defensivo das versões cruas da
 * CF (id/number/metadata/annotations + active/percentage adicionados pelo
 * motor), id curto para exibição e validação do split gradual (1-2 versões
 * distintas com porcentagens inteiras somando 100).
 */

export type ParsedWorkerVersion = {
  id: string;
  number: number | null;
  createdOn: string | null;
  author: string | null;
  source: string | null;
  message: string | null;
  active: boolean;
  percentage: number | null;
};

const textOrNull = (value: unknown): string | null => {
  const text = String(value ?? '').trim();
  return text || null;
};

export const parseWorkerVersion = (raw: Record<string, unknown>): ParsedWorkerVersion => {
  const metadata = (raw.metadata ?? {}) as Record<string, unknown>;
  const annotations = (raw.annotations ?? {}) as Record<string, unknown>;
  const numberValue = Number(raw.number);
  const percentageValue = Number(raw.percentage);

  return {
    id: String(raw.id ?? '').trim(),
    number: Number.isFinite(numberValue) ? numberValue : null,
    createdOn: textOrNull(metadata.created_on),
    author: textOrNull(metadata.author_email) ?? textOrNull(metadata.author_id),
    source: textOrNull(metadata.source) ?? textOrNull(annotations['workers/triggered_by']),
    message: textOrNull(annotations['workers/message']),
    active: raw.active === true,
    percentage: raw.percentage !== undefined && Number.isFinite(percentageValue) ? percentageValue : null,
  };
};

/** Id curto (primeiro bloco do UUID ou 8 primeiros caracteres). */
export const shortVersionId = (id: string): string => {
  const trimmed = id.trim();
  const firstBlock = trimmed.split('-')[0] ?? trimmed;
  return firstBlock.slice(0, 8);
};

export type SplitEntry = {
  versionId: string;
  percentage: number;
};

/** Valida o deploy gradual; devolve mensagem pt-BR ou null quando válido. */
export const validateSplit = (entries: SplitEntry[]): string | null => {
  if (entries.length < 1 || entries.length > 2) {
    return 'Informe 1 ou 2 versões para o deploy.';
  }
  for (const entry of entries) {
    if (!entry.versionId.trim()) {
      return 'Selecione a versão de cada fatia do split.';
    }
    if (!Number.isInteger(entry.percentage) || entry.percentage < 1 || entry.percentage > 100) {
      return 'Cada porcentagem precisa ser um inteiro entre 1 e 100.';
    }
  }
  if (entries.length === 2 && entries[0]?.versionId === entries[1]?.versionId) {
    return 'Selecione duas versões diferentes para o split.';
  }
  const total = entries.reduce((sum, entry) => sum + entry.percentage, 0);
  if (total !== 100) {
    return `As porcentagens precisam somar exatamente 100 (soma atual: ${total}).`;
  }
  return null;
};
