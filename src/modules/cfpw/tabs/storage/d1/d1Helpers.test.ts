/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos helpers puros da sub-aba D1 (ST-D1): histórico de SQL, espelho
 * client-side do classificador, truncamento do grid, reducer do polling de
 * export, MD5 incremental por chunks e formatação de tamanho.
 */

import { describe, expect, it } from 'vitest';
import {
  classifyD1StatementsClient,
  computeMd5FromChunks,
  D1_GRID_MAX_ROWS,
  D1_SQL_HISTORY_MAX,
  exportPollReducer,
  formatD1FileSize,
  INITIAL_EXPORT_POLL,
  pushSqlHistory,
  toGridView,
} from './d1Helpers';

describe('pushSqlHistory', () => {
  it('inserts at the top and dedupes an existing entry to the top', () => {
    const history = pushSqlHistory(['SELECT 2', 'SELECT 1'], 'SELECT 1');
    expect(history).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('caps the history at 50 entries and ignores blank SQL', () => {
    const full = Array.from({ length: D1_SQL_HISTORY_MAX }, (_, index) => `SELECT ${index}`);
    const pushed = pushSqlHistory(full, 'SELECT novo');
    expect(pushed).toHaveLength(D1_SQL_HISTORY_MAX);
    expect(pushed[0]).toBe('SELECT novo');
    expect(pushed).not.toContain(`SELECT ${D1_SQL_HISTORY_MAX - 1}`);

    expect(pushSqlHistory(full, '   ')).toBe(full);
  });
});

describe('classifyD1StatementsClient (espelho — autoridade é o motor)', () => {
  it('classifies SELECT/PRAGMA as read and UPDATE without WHERE as dangerous write', () => {
    const classified = classifyD1StatementsClient('SELECT 1; PRAGMA table_info("t"); UPDATE t SET a = 1');
    expect(classified.map((statement) => statement.kind)).toEqual(['read', 'read', 'write']);
    expect(classified[2]).toEqual({
      sql: 'UPDATE t SET a = 1',
      kind: 'write',
      dangerous: true,
      reason: 'UPDATE sem WHERE',
    });
  });

  it('classifies WITH...INSERT as write, flags DROP and keeps ";" inside strings intact', () => {
    const classified = classifyD1StatementsClient(
      `WITH cte AS (SELECT 1) INSERT INTO t SELECT * FROM cte; DROP TABLE velha; SELECT 'a;b' AS v`,
    );
    expect(classified.map((statement) => statement.kind)).toEqual(['write', 'write', 'read']);
    expect(classified[1]?.reason).toBe('DROP');
    expect(classified[2]?.sql).toBe(`SELECT 'a;b' AS v`);
  });
});

describe('toGridView', () => {
  it('truncates rows at 200 keeping totals and flags large results above 5000 rows', () => {
    const rows = Array.from({ length: 5001 }, (_, index) => ({ id: index }));
    const grid = toGridView(rows);
    expect(grid.rows).toHaveLength(D1_GRID_MAX_ROWS);
    expect(grid.totalRows).toBe(5001);
    expect(grid.truncatedRows).toBe(true);
    expect(grid.largeResult).toBe(true);

    const small = toGridView([{ id: 1 }]);
    expect(small.truncatedRows).toBe(false);
    expect(small.largeResult).toBe(false);
  });

  it('collects columns across visible rows, truncates at 200 and wraps scalar rows', () => {
    const wide = toGridView([Object.fromEntries(Array.from({ length: 250 }, (_, index) => [`c${index}`, index]))]);
    expect(wide.columns).toHaveLength(200);
    expect(wide.totalColumns).toBe(250);
    expect(wide.truncatedColumns).toBe(true);

    const mixed = toGridView([{ a: 1 }, { b: 2 }]);
    expect(mixed.columns).toEqual(['a', 'b']);

    const scalar = toGridView([42]);
    expect(scalar.rows).toEqual([{ valor: 42 }]);
    expect(scalar.columns).toEqual(['valor']);
  });
});

describe('exportPollReducer', () => {
  it('keeps polling while only the bookmark advances and finishes on signed_url', () => {
    const started = exportPollReducer(INITIAL_EXPORT_POLL, { type: 'start' });
    expect(started.phase).toBe('polling');

    const inFlight = exportPollReducer(started, {
      type: 'result',
      result: { at_bookmark: 'bm-1', status: 'active', signed_url: null },
    });
    expect(inFlight).toMatchObject({ phase: 'polling', bookmark: 'bm-1', status: 'active', signedUrl: null });

    const done = exportPollReducer(inFlight, {
      type: 'result',
      result: { at_bookmark: 'bm-2', status: 'complete', signed_url: 'https://r2/dump.sql' },
    });
    expect(done).toEqual({
      phase: 'done',
      bookmark: 'bm-2',
      signedUrl: 'https://r2/dump.sql',
      status: 'complete',
      error: null,
    });
  });

  it('pauses preserving the bookmark for resume and records failures', () => {
    const polling = exportPollReducer(exportPollReducer(INITIAL_EXPORT_POLL, { type: 'start' }), {
      type: 'result',
      result: { at_bookmark: 'bm-1', status: 'active' },
    });

    const paused = exportPollReducer(polling, { type: 'pause' });
    expect(paused.phase).toBe('paused');
    expect(paused.bookmark).toBe('bm-1');

    const failed = exportPollReducer(polling, { type: 'fail', error: 'HTTP 502' });
    expect(failed.phase).toBe('error');
    expect(failed.error).toBe('HTTP 502');
    expect(failed.bookmark).toBe('bm-1');

    expect(exportPollReducer(paused, { type: 'pause' })).toBe(paused);
  });
});

describe('computeMd5FromChunks', () => {
  it('computes the incremental MD5 across chunks equal to the whole-content hash', async () => {
    const encoder = new TextEncoder();
    async function* chunks(parts: string[]): AsyncGenerator<ArrayBuffer> {
      for (const part of parts) {
        yield encoder.encode(part).buffer as ArrayBuffer;
      }
    }

    // MD5("hello") — referência conhecida.
    expect(await computeMd5FromChunks(chunks(['he', 'llo']))).toBe('5d41402abc4b2a76b9719d911017c592');
    expect(await computeMd5FromChunks(chunks(['hello']))).toBe('5d41402abc4b2a76b9719d911017c592');
  });
});

describe('formatD1FileSize', () => {
  it('formats bytes into pt-BR readable units and returns null without a value', () => {
    expect(formatD1FileSize(512)).toBe('512 B');
    expect(formatD1FileSize(2048)).toBe('2 KB');
    expect(formatD1FileSize(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatD1FileSize(undefined)).toBeNull();
    expect(formatD1FileSize(-1)).toBeNull();
  });
});
