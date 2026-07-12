#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';
import {
  ASTROLOGO_SCHEMA_PREFLIGHT_VERSION,
  inspectAstrologoSchema,
  planAstrologoSchemaReconciliation,
  reconcileAstrologoSchema,
} from './lib/astrologo-schema-reconciler.mjs';

const args = new Set(process.argv.slice(2));
const remote = args.has('--remote');
const local = args.has('--local');
const dryRun = args.has('--dry-run');

if (remote === local) {
  throw new Error('Informe exatamente um modo: --remote ou --local.');
}

const optionValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};

const target = optionValue('--database', process.env.D1_DATABASE_ID || 'bigdata_db');
const config = optionValue('--config', 'wrangler.json');
const mode = remote ? '--remote' : '--local';
const require = createRequire(import.meta.url);
const wranglerCli = require.resolve('wrangler');

const runD1 = (sql) => {
  const result = spawnSync(
    process.execPath,
    [wranglerCli, 'd1', 'execute', target, mode, '--config', config, '--command', sql, '--json'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, CI: process.env.CI || 'true' },
    },
  );

  if (result.status !== 0) {
    const detail = String(result.error?.message || result.stderr || result.stdout || 'falha sem saída').trim();
    throw new Error(`Wrangler D1 falhou (${result.status ?? 'sem status'}): ${detail}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error('Wrangler D1 retornou JSON inválido durante o preflight.');
  }
};

const readRows = (sql, failureMessage) => {
  const response = runD1(sql);
  const first = Array.isArray(response) ? response[0] : null;
  if (!first?.success || !Array.isArray(first.results)) {
    throw new Error(failureMessage);
  }
  return first.results;
};

const inspect = async () => {
  const tableInfoRows = readRows(
    'PRAGMA table_info(astrologo_mapas);',
    'Não foi possível ler PRAGMA table_info(astrologo_mapas).',
  );
  const tableRows = readRows(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'astrologo_mapas';",
    'Não foi possível ler o DDL de astrologo_mapas.',
  );
  const indexRows = readRows(
    "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'astrologo_mapas';",
    'Não foi possível ler os índices de astrologo_mapas.',
  );
  const policyRows = readRows(
    `SELECT route, enabled, max_requests, window_minutes
     FROM astrologo_rate_limit_policies
     WHERE route = 'astrologo/auth-read';`,
    'Não foi possível ler a policy astrologo/auth-read.',
  );
  return inspectAstrologoSchema({
    tableInfoRows,
    tableSql: tableRows[0]?.sql,
    indexRows,
    authReadPolicy: policyRows[0] ?? null,
  });
};

if (dryRun) {
  const planned = planAstrologoSchemaReconciliation(await inspect());
  console.log(
    JSON.stringify({ ok: true, preflightVersion: ASTROLOGO_SCHEMA_PREFLIGHT_VERSION, dryRun: true, planned }, null, 2),
  );
} else {
  const result = await reconcileAstrologoSchema({
    inspect,
    execute: async (statement) => {
      const response = runD1(`${statement};`);
      if (!Array.isArray(response) || !response[0]?.success) {
        throw new Error('D1 não confirmou a alteração planejada.');
      }
    },
  });
  console.log(JSON.stringify({ ok: true, preflightVersion: ASTROLOGO_SCHEMA_PREFLIGHT_VERSION, ...result }, null, 2));
}
