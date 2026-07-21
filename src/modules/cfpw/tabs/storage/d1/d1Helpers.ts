/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros da sub-aba D1 (ST-D1): histórico de SQL (cap 50, dedupe no
 * topo), espelho client-side do classificador de statements (pré-aviso na UI —
 * a AUTORIDADE é o classificador do motor), truncamento do grid de resultados,
 * reducer do polling de export e MD5 incremental (spark-md5) do import.
 */

import SparkMD5 from 'spark-md5';
import type { D1ExportResult, D1StatementClassification } from '../../../types';

export const D1_SQL_HISTORY_MAX = 50;
export const D1_GRID_MAX_ROWS = 200;
const D1_GRID_MAX_COLUMNS = 200;
/** Acima disso o aviso de truncamento destaca o volume total do resultado. */
const D1_GRID_LARGE_RESULT_ROWS = 5000;
const D1_IMPORT_CHUNK_BYTES = 2 * 1024 * 1024;
export const D1_DATABASE_NAME_PATTERN = /^[a-z0-9][a-z0-9-_]{0,62}$/i;

// ── Histórico de SQL ──

/** Insere o SQL no topo do histórico, deduplicando e limitando a 50 itens. */
export function pushSqlHistory(history: string[], sql: string): string[] {
  const trimmed = sql.trim();
  if (!trimmed) {
    return history;
  }
  const deduped = history.filter((item) => item !== trimmed);
  return [trimmed, ...deduped].slice(0, D1_SQL_HISTORY_MAX);
}

// ── Espelho client-side do classificador (autoridade = motor) ──

/** Divide o SQL por ';' fora de aspas simples/duplas (espelho do motor). */
function splitSqlStatementsClient(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (const char of sql) {
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      statements.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  statements.push(current);

  return statements.map((statement) => statement.trim()).filter((statement) => statement.length > 0);
}

const stripQuotedContent = (statement: string): string => {
  let out = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (const char of statement) {
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (!inSingleQuote && !inDoubleQuote) {
      out += char;
    }
  }
  return out;
};

const READ_KEYWORDS = ['SELECT', 'EXPLAIN', 'PRAGMA'];
const WRITE_KEYWORD_PATTERN = /\b(insert|update|delete|replace|create|alter|drop|truncate|vacuum|attach)\b/i;

const classifyOneStatement = (statement: string): D1StatementClassification => {
  const keywordMatch = /^[\s(]*([a-zA-Z]+)/.exec(statement);
  const keyword = (keywordMatch?.[1] ?? '').toUpperCase();
  const unquoted = stripQuotedContent(statement);

  if (READ_KEYWORDS.includes(keyword)) {
    return { sql: statement, kind: 'read', dangerous: false };
  }

  let effectiveKeyword = keyword;
  if (keyword === 'WITH') {
    const writeMatch = WRITE_KEYWORD_PATTERN.exec(unquoted);
    if (!writeMatch) {
      return { sql: statement, kind: 'read', dangerous: false };
    }
    effectiveKeyword = String(writeMatch[1]).toUpperCase();
  }

  if ((effectiveKeyword === 'UPDATE' || effectiveKeyword === 'DELETE') && !/\bwhere\b/i.test(unquoted)) {
    return { sql: statement, kind: 'write', dangerous: true, reason: `${effectiveKeyword} sem WHERE` };
  }
  if (effectiveKeyword === 'DROP') {
    return { sql: statement, kind: 'write', dangerous: true, reason: 'DROP' };
  }
  return { sql: statement, kind: 'write', dangerous: false };
};

/** Pré-aviso client-side: espelha o classificador do motor (que é a autoridade). */
export function classifyD1StatementsClient(sql: string): D1StatementClassification[] {
  return splitSqlStatementsClient(sql).map(classifyOneStatement);
}

// ── Grid de resultados ──

export type D1GridView = {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  totalRows: number;
  totalColumns: number;
  truncatedRows: boolean;
  truncatedColumns: boolean;
  largeResult: boolean;
};

/**
 * Prepara o grid de um statement: primeiras 200 linhas × 200 colunas, com
 * flags de truncamento e de resultado grande (> 5000 linhas).
 */
export function toGridView(results: unknown[] | undefined): D1GridView {
  const rawRows = Array.isArray(results) ? results : [];
  const totalRows = rawRows.length;
  const visibleRows = rawRows
    .slice(0, D1_GRID_MAX_ROWS)
    .map((row) =>
      row !== null && typeof row === 'object' && !Array.isArray(row)
        ? (row as Record<string, unknown>)
        : { valor: row },
    );

  const seenColumns = new Set<string>();
  for (const row of visibleRows) {
    for (const key of Object.keys(row)) {
      seenColumns.add(key);
    }
  }
  const totalColumns = seenColumns.size;

  return {
    columns: [...seenColumns].slice(0, D1_GRID_MAX_COLUMNS),
    rows: visibleRows,
    totalRows,
    totalColumns,
    truncatedRows: totalRows > D1_GRID_MAX_ROWS,
    truncatedColumns: totalColumns > D1_GRID_MAX_COLUMNS,
    largeResult: totalRows > D1_GRID_LARGE_RESULT_ROWS,
  };
}

// ── Polling de export ──

export type ExportPollState = {
  phase: 'idle' | 'polling' | 'paused' | 'done' | 'error';
  bookmark: string | null;
  signedUrl: string | null;
  status: string | null;
  error: string | null;
};

export type ExportPollAction =
  | { type: 'start' }
  | { type: 'result'; result: D1ExportResult | null }
  | { type: 'fail'; error: string }
  | { type: 'pause' }
  | { type: 'reset' };

export const INITIAL_EXPORT_POLL: ExportPollState = {
  phase: 'idle',
  bookmark: null,
  signedUrl: null,
  status: null,
  error: null,
};

/** Transições do polling de export (bookmark preservado para "Retomar"). */
export function exportPollReducer(state: ExportPollState, action: ExportPollAction): ExportPollState {
  switch (action.type) {
    case 'start':
      return { ...state, phase: 'polling', signedUrl: null, error: null };
    case 'result': {
      const bookmark =
        typeof action.result?.at_bookmark === 'string' && action.result.at_bookmark
          ? action.result.at_bookmark
          : state.bookmark;
      const status = typeof action.result?.status === 'string' ? action.result.status : state.status;
      if (typeof action.result?.error === 'string' && action.result.error) {
        return { ...state, phase: 'error', bookmark, status, error: action.result.error };
      }
      const signedUrl =
        typeof action.result?.signed_url === 'string' && action.result.signed_url ? action.result.signed_url : null;
      if (signedUrl) {
        return { phase: 'done', bookmark, signedUrl, status: status ?? 'complete', error: null };
      }
      return { ...state, phase: 'polling', bookmark, status };
    }
    case 'fail':
      return { ...state, phase: 'error', error: action.error };
    case 'pause':
      return state.phase === 'polling' ? { ...state, phase: 'paused' } : state;
    case 'reset':
      return INITIAL_EXPORT_POLL;
  }
}

// ── MD5 do import (incremental, injeção de chunks p/ teste) ──

/** MD5 hex incremental a partir de chunks (arquivos grandes nunca inteiros na memória). */
export async function computeMd5FromChunks(chunks: AsyncIterable<ArrayBuffer>): Promise<string> {
  const spark = new SparkMD5.ArrayBuffer();
  for await (const chunk of chunks) {
    spark.append(chunk);
  }
  return spark.end();
}

/** Fatia um Blob/File em chunks de 2 MiB para o MD5 incremental. */
export async function* sliceBlobIntoChunks(
  blob: Blob,
  chunkBytes: number = D1_IMPORT_CHUNK_BYTES,
): AsyncGenerator<ArrayBuffer> {
  for (let offset = 0; offset < blob.size; offset += chunkBytes) {
    yield await blob.slice(offset, offset + chunkBytes).arrayBuffer();
  }
}

// ── Formatação ──

/** Tamanho de arquivo em unidade legível pt-BR (ex.: 2,5 MB); null sem valor. */
export function formatD1FileSize(bytes: number | undefined | null): string | null {
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
