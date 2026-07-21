/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros do DNS-2 (operações em lote + import/export BIND): seleção de
 * registros, montagem dos patches do bulk-edit, preview textual, guarda de
 * tamanho do arquivo de import, contagem de linhas BIND e nome do arquivo de
 * export. Sem dependência de React — testáveis isoladamente.
 */

/** Alterna a seleção de um id, devolvendo um novo Set (imutável para o React). */
export const toggleIdSelection = (current: ReadonlySet<string>, id: string): Set<string> => {
  const next = new Set(current);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

/**
 * Seleciona/desseleciona todos os ids da página atual, preservando seleções de
 * outras páginas da mesma zona (requisito do plano: seleção sobrevive à
 * navegação de páginas).
 */
export const togglePageSelection = (
  current: ReadonlySet<string>,
  pageIds: string[],
  selectAll: boolean,
): Set<string> => {
  const next = new Set(current);
  for (const id of pageIds) {
    if (selectAll) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }
  return next;
};

export type BulkEditFormState = {
  /** 'keep' mantém o TTL atual; '1' = Auto; demais valores em segundos; 'custom' usa ttlCustom. */
  ttlChoice: 'keep' | '1' | '60' | '300' | '3600' | '86400' | 'custom';
  ttlCustom: string;
  proxyMode: 'keep' | 'on' | 'off';
  commentMode: 'keep' | 'set' | 'clear';
  commentValue: string;
  tagsMode: 'keep' | 'set';
  tags: string[];
};

export const DEFAULT_BULK_EDIT_FORM: BulkEditFormState = {
  ttlChoice: 'keep',
  ttlCustom: '',
  proxyMode: 'keep',
  commentMode: 'keep',
  commentValue: '',
  tagsMode: 'keep',
  tags: [],
};

const resolveBulkTtl = (form: BulkEditFormState): number | null => {
  if (form.ttlChoice === 'keep') {
    return null;
  }
  if (form.ttlChoice === 'custom') {
    return Number(form.ttlCustom.trim());
  }
  return Number(form.ttlChoice);
};

/** True quando ao menos um campo do bulk-edit deixa o modo "manter". */
export const hasBulkEditChanges = (form: BulkEditFormState): boolean =>
  form.ttlChoice !== 'keep' || form.proxyMode !== 'keep' || form.commentMode !== 'keep' || form.tagsMode !== 'keep';

/** Problemas de validação local do formulário de bulk-edit (mensagens pt-BR). */
export const bulkEditIssues = (form: BulkEditFormState): string[] => {
  const issues: string[] = [];
  if (form.ttlChoice === 'custom') {
    const ttl = resolveBulkTtl(form);
    if (ttl == null || !Number.isFinite(ttl) || (ttl !== 1 && (ttl < 60 || ttl > 86400))) {
      issues.push('TTL personalizado inválido: use 1 (auto) ou um valor entre 60 e 86400 segundos.');
    }
  }
  if (form.commentMode === 'set' && !form.commentValue.trim()) {
    issues.push('Comentário vazio: preencha o texto ou use "Limpar comentário".');
  }
  return issues;
};

/**
 * Monta o array `patches` do POST /api/cfdns/batch a partir do formulário:
 * um patch por id contendo SOMENTE os campos alterados (comment '' limpa o
 * comentário na Cloudflare; tags [] limpa as tags).
 */
export const buildBulkEditPatches = (
  ids: string[],
  form: BulkEditFormState,
): Array<{ id: string } & Record<string, unknown>> => {
  const changes: Record<string, unknown> = {};

  const ttl = resolveBulkTtl(form);
  if (ttl != null) {
    changes.ttl = ttl;
  }
  if (form.proxyMode !== 'keep') {
    changes.proxied = form.proxyMode === 'on';
  }
  if (form.commentMode === 'set') {
    changes.comment = form.commentValue.trim();
  }
  if (form.commentMode === 'clear') {
    changes.comment = '';
  }
  if (form.tagsMode === 'set') {
    changes.tags = [...form.tags];
  }

  return ids.map((id) => ({ id, ...changes }));
};

/** Preview textual do bulk-edit, ex.: "Aplicar a 3 registro(s): TTL→Auto, Proxy→ativado". */
export const buildBulkEditPreview = (count: number, form: BulkEditFormState): string => {
  const parts: string[] = [];

  if (form.ttlChoice !== 'keep') {
    const ttl = resolveBulkTtl(form);
    parts.push(
      `TTL→${ttl === 1 ? 'Auto' : `${form.ttlChoice === 'custom' ? form.ttlCustom.trim() : form.ttlChoice}s`}`,
    );
  }
  if (form.proxyMode !== 'keep') {
    parts.push(`Proxy→${form.proxyMode === 'on' ? 'ativado' : 'desativado'}`);
  }
  if (form.commentMode === 'set') {
    parts.push('Comentário→definido');
  }
  if (form.commentMode === 'clear') {
    parts.push('Comentário→limpo');
  }
  if (form.tagsMode === 'set') {
    parts.push(`Tags→${form.tags.length} tag(s)`);
  }

  if (parts.length === 0) {
    return 'Nenhuma alteração selecionada — todos os campos estão em "manter".';
  }
  return `Aplicar a ${count} registro(s): ${parts.join(', ')}`;
};

/** Teto local do arquivo de import BIND (o motor aplica o mesmo limite). */
export const IMPORT_MAX_FILE_BYTES = 2_000_000;

/** Valida o tamanho do arquivo de import; devolve mensagem pt-BR ou null quando ok. */
export const validateImportFileSize = (sizeBytes: number): string | null => {
  if (sizeBytes > IMPORT_MAX_FILE_BYTES) {
    return 'Arquivo excede 2 MB — divida o arquivo de zona em partes menores antes de importar.';
  }
  return null;
};

/** Conta as linhas relevantes de um arquivo de zona BIND (não vazias e não-comentário `;`). */
export const countImportableLines = (text: string): number =>
  text.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith(';');
  }).length;

// Mesma sanitização do motor: só [A-Za-z0-9._-] no nome do arquivo baixado.
const sanitizeFilenamePart = (value: string) =>
  value
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

/** Nome do arquivo de export: zoneName sanitizado, com fallback para o zoneId. */
export const buildExportFilename = (zoneName: string, zoneId: string): string =>
  `${sanitizeFilenamePart(zoneName) || sanitizeFilenamePart(zoneId) || 'zona'}.txt`;
