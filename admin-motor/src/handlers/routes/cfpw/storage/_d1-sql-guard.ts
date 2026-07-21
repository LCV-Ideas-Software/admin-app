// Classificador de statements SQL do console D1 (ST-D1): divide o SQL em
// statements por ';' respeitando aspas simples/duplas e classifica cada um
// como leitura ou escrita, sinalizando padrões perigosos (UPDATE/DELETE sem
// WHERE, DROP). A autoridade é sempre este classificador do motor — o espelho
// client-side existe só para pré-aviso na UI.

export type D1StatementClassification = {
  sql: string;
  kind: 'read' | 'write';
  dangerous: boolean;
  reason?: string;
};

/**
 * Divide o SQL em statements por ';' fora de aspas simples/duplas (tokenizer
 * simples; escape SQL por duplicação de aspas alterna o estado duas vezes e
 * funciona naturalmente). Statements vazios/trailing são descartados.
 * @public
 */
export const splitSqlStatements = (sql: string): string[] => {
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
};

/** Remove o conteúdo entre aspas simples/duplas para varrer keywords com segurança. */
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

const firstKeywordOf = (statement: string): string => {
  const match = /^[\s(]*([a-zA-Z]+)/.exec(statement);
  return (match?.[1] ?? '').toUpperCase();
};

const classifyOneStatement = (statement: string): D1StatementClassification => {
  const keyword = firstKeywordOf(statement);
  const unquoted = stripQuotedContent(statement);

  if (READ_KEYWORDS.includes(keyword)) {
    return { sql: statement, kind: 'read', dangerous: false };
  }

  // WITH pode prefixar tanto SELECT (leitura) quanto INSERT/UPDATE/DELETE
  // (escrita): a decisão vem da presença de keyword de escrita fora de aspas.
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

/**
 * Classifica cada statement do SQL: leitura (SELECT/EXPLAIN/PRAGMA/WITH sem
 * escrita) ou escrita (todo o resto), com flag `dangerous` para UPDATE/DELETE
 * sem WHERE e DROP.
 * @public
 */
export const classifyD1Statements = (sql: string): D1StatementClassification[] =>
  splitSqlStatements(sql).map(classifyOneStatement);
