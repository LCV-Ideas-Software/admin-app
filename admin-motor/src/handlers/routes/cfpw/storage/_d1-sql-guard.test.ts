import { describe, expect, it } from 'vitest';

import { classifyD1Statements, splitSqlStatements } from './_d1-sql-guard';

describe('splitSqlStatements', () => {
  it('splits by semicolon and drops empty/trailing statements', () => {
    expect(splitSqlStatements('SELECT 1; SELECT 2;;  ;')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('does not split on semicolons inside single or double quotes', () => {
    const sql = `INSERT INTO t (a) VALUES ('x;y'); SELECT "col;name" FROM t`;
    expect(splitSqlStatements(sql)).toEqual([`INSERT INTO t (a) VALUES ('x;y')`, `SELECT "col;name" FROM t`]);
  });

  it('handles SQL-escaped quotes (doubled) without losing the statement boundary', () => {
    const sql = `UPDATE t SET a = 'it''s;fine' WHERE id = 1; DELETE FROM t WHERE id = 2`;
    expect(splitSqlStatements(sql)).toEqual([
      `UPDATE t SET a = 'it''s;fine' WHERE id = 1`,
      'DELETE FROM t WHERE id = 2',
    ]);
  });
});

describe('classifyD1Statements', () => {
  it('classifies SELECT, EXPLAIN and PRAGMA as read (never dangerous)', () => {
    const classified = classifyD1Statements('SELECT * FROM t; EXPLAIN QUERY PLAN SELECT 1; PRAGMA table_info("t")');
    expect(classified.map((statement) => statement.kind)).toEqual(['read', 'read', 'read']);
    expect(classified.every((statement) => !statement.dangerous)).toBe(true);
  });

  it('flags UPDATE and DELETE without WHERE as dangerous with the specific reason', () => {
    const classified = classifyD1Statements('UPDATE t SET a = 1; DELETE FROM t');
    expect(classified).toEqual([
      { sql: 'UPDATE t SET a = 1', kind: 'write', dangerous: true, reason: 'UPDATE sem WHERE' },
      { sql: 'DELETE FROM t', kind: 'write', dangerous: true, reason: 'DELETE sem WHERE' },
    ]);
  });

  it('treats UPDATE/DELETE with WHERE as write but not dangerous', () => {
    const classified = classifyD1Statements('UPDATE t SET a = 1 WHERE id = 2; DELETE FROM t WHERE id = 3');
    expect(classified.map((statement) => [statement.kind, statement.dangerous])).toEqual([
      ['write', false],
      ['write', false],
    ]);
  });

  it('flags DROP as dangerous with reason DROP', () => {
    expect(classifyD1Statements('DROP TABLE t')).toEqual([
      { sql: 'DROP TABLE t', kind: 'write', dangerous: true, reason: 'DROP' },
    ]);
  });

  it('classifies WITH...SELECT as read and WITH...INSERT as write', () => {
    const readOnly = classifyD1Statements('WITH cte AS (SELECT 1 AS v) SELECT v FROM cte');
    expect(readOnly).toEqual([
      { sql: 'WITH cte AS (SELECT 1 AS v) SELECT v FROM cte', kind: 'read', dangerous: false },
    ]);

    const write = classifyD1Statements('WITH cte AS (SELECT 1 AS v) INSERT INTO t SELECT v FROM cte');
    expect(write[0]?.kind).toBe('write');
    expect(write[0]?.dangerous).toBe(false);
  });

  it('ignores write keywords inside string literals when classifying WITH', () => {
    const classified = classifyD1Statements(`WITH cte AS (SELECT 'please insert here' AS v) SELECT v FROM cte`);
    expect(classified[0]?.kind).toBe('read');
  });

  it('does not treat a WHERE inside a string literal as a real WHERE clause', () => {
    const classified = classifyD1Statements(`DELETE FROM t`);
    expect(classified[0]?.dangerous).toBe(true);
    const disguised = classifyD1Statements(`UPDATE t SET a = 'where'`);
    expect(disguised[0]).toEqual({
      sql: `UPDATE t SET a = 'where'`,
      kind: 'write',
      dangerous: true,
      reason: 'UPDATE sem WHERE',
    });
  });

  it('classifies unknown leading keywords (CREATE, ALTER, VACUUM) as write', () => {
    const classified = classifyD1Statements('CREATE TABLE x (id INTEGER); ALTER TABLE x ADD COLUMN b TEXT; VACUUM');
    expect(classified.map((statement) => statement.kind)).toEqual(['write', 'write', 'write']);
  });
});
