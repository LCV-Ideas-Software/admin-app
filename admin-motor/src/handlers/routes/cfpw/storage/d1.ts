// Handlers da onda ST-D1 (aba Armazenamento): gestão completa de D1 via
// /api/cfpw/storage/d1/*. Validação local devolve 400 diagnóstico em pt-BR;
// falhas da API Cloudflare passam pela tradução do cf-api-core e pelo
// mapeamento de status do _respond. Guards do bigdata_db (banco operacional
// IMUTÁVEL do próprio admin-app): delete/import 403 sempre; SQL de escrita
// exige confirmDangerous (409 sem ele) e, em banco protegido, confirmPhrase.
// Telemetria best-effort com ações d1-* — NUNCA loga o SQL completo (preview
// truncado em 200 caracteres).

import { resolveCloudflarePwAccount } from '../../_lib/cfpw-api';
import {
  createD1Database,
  type D1DatabaseInfo,
  deleteD1Database,
  exportD1Database,
  getD1Database,
  importD1Database,
  listD1Databases,
  queryD1Database,
} from '../../_lib/d1-api';
import { createResponseTrace } from '../../_lib/request-trace';
import {
  type CfpwRouteContext,
  getRouteEnv,
  logCfpwEvent,
  resolveCfpwErrorStatus,
  toErrorResponse,
  toJsonResponse,
} from '../_respond';
import { assertD1DestructionAllowed, assertD1WriteAllowed, isProtectedD1Name, ProtectedD1Error } from './_d1-guard';
import { classifyD1Statements } from './_d1-sql-guard';

const DATABASE_NAME_PATTERN = /^[a-z0-9][a-z0-9-_]{0,62}$/i;
const SQL_MAX_CHARS = 100_000;
const SQL_PREVIEW_MAX_CHARS = 200;
const LIST_MAX_PAGES = 10;
const TABLE_PER_PAGE_MIN = 10;
const TABLE_PER_PAGE_MAX = 200;
const TABLE_PER_PAGE_DEFAULT = 50;
const NAME_CACHE_TTL_MS = 5 * 60 * 1000;

// Query interna do schema (somente objetos do usuário, ordenados por tipo/nome).
const SCHEMA_SQL =
  "SELECT name, type, sql FROM sqlite_master WHERE type IN ('table','view','index') AND name NOT LIKE 'sqlite_%' ORDER BY type, name";

const IMPORT_ACTIONS = ['init', 'ingest', 'poll'] as const;
type ImportAction = (typeof IMPORT_ACTIONS)[number];

// Cache uuid→name (TTL 5min) para economizar o subrequest de GET database a
// cada query; isolates do Workers podem não retê-lo (best-effort).
const databaseNameCache = new Map<string, { name: string; expiresAt: number }>();

/** Limpa o cache uuid→name entre testes. @public */
export const __resetD1NameCacheForTests = (): void => {
  databaseNameCache.clear();
};

type D1RouteEnv = ReturnType<typeof getRouteEnv>;

const resolveD1DatabaseName = async (env: D1RouteEnv, accountId: string, databaseId: string): Promise<string> => {
  const cached = databaseNameCache.get(databaseId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.name;
  }
  const database = await getD1Database(env, accountId, databaseId);
  const name = String(database?.name ?? '');
  databaseNameCache.set(databaseId, { name, expiresAt: Date.now() + NAME_CACHE_TTL_MS });
  return name;
};

const resolveD1ErrorStatus = (error: unknown): number =>
  error instanceof ProtectedD1Error ? error.status : resolveCfpwErrorStatus(error);

const toSqlPreview = (sql: string): string =>
  sql.length > SQL_PREVIEW_MAX_CHARS ? `${sql.slice(0, SQL_PREVIEW_MAX_CHARS)}…` : sql;

const clampInt = (raw: string | null, fallback: number, min: number, max: number): number => {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
};

const readJsonBody = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

const toDatabaseSummary = (database: D1DatabaseInfo) => {
  const name = String(database?.name ?? '');
  return {
    uuid: String(database?.uuid ?? ''),
    name,
    ...(database?.version !== undefined ? { version: database.version } : {}),
    ...(database?.num_tables !== undefined ? { num_tables: database.num_tables } : {}),
    ...(database?.file_size !== undefined ? { file_size: database.file_size } : {}),
    ...(database?.created_at !== undefined ? { created_at: database.created_at } : {}),
    protected: isProtectedD1Name(name),
  };
};

// ── Bancos ──

export async function onRequestGetDatabases(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const search = String(url.searchParams.get('search') ?? '').trim();

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const databases = await listD1Databases(env, accountInfo.accountId, search, { maxPages: LIST_MAX_PAGES });
    await logCfpwEvent(env, 'd1-databases-list', true, {
      accountId: accountInfo.accountId,
      search: Boolean(search),
      count: databases.length,
    });
    return toJsonResponse({ ok: true, ...trace, databases: databases.map(toDatabaseSummary) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao listar bancos D1.';
    await logCfpwEvent(env, 'd1-databases-list', false, { search: Boolean(search) }, message);
    return toErrorResponse(message, trace, resolveD1ErrorStatus(error));
  }
}

export async function onRequestPostDatabases(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<{ name?: unknown }>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const name = String(payload.name ?? '').trim();
  if (!name) {
    return toErrorResponse('Campo name é obrigatório: informe o nome do banco D1.', trace, 400);
  }
  if (!DATABASE_NAME_PATTERN.test(name)) {
    return toErrorResponse(
      `Nome de banco D1 inválido: "${name}" — use 1 a 63 caracteres alfanuméricos, hífen ou underscore, começando por letra/número.`,
      trace,
      400,
    );
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const database = await createD1Database(env, accountInfo.accountId, name);
    await logCfpwEvent(env, 'd1-database-create', true, {
      accountId: accountInfo.accountId,
      databaseId: database?.uuid ?? null,
    });
    return toJsonResponse({ ok: true, ...trace, database: toDatabaseSummary(database) });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao criar o banco D1 "${name}".`;
    await logCfpwEvent(env, 'd1-database-create', false, {}, message);
    return toErrorResponse(message, trace, resolveD1ErrorStatus(error));
  }
}

export async function onRequestDeleteDatabases(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<{ databaseId?: unknown; confirmName?: unknown }>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const databaseId = String(payload.databaseId ?? '').trim();
  const confirmName = typeof payload.confirmName === 'string' ? payload.confirmName : '';
  if (!databaseId) {
    return toErrorResponse('Campo databaseId é obrigatório para excluir o banco D1.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const database = await getD1Database(env, accountInfo.accountId, databaseId);
    const realName = String(database?.name ?? '');
    // Banco protegido: 403 SEMPRE, sem override — antes de qualquer confirmação.
    assertD1DestructionAllowed(realName);
    if (confirmName !== realName) {
      const message = `Confirmação divergente: digite exatamente o nome "${realName}" para excluir o banco D1.`;
      await logCfpwEvent(env, 'd1-database-delete', false, { databaseId, confirmMismatch: true }, message);
      return toErrorResponse(message, trace, 400);
    }

    await deleteD1Database(env, accountInfo.accountId, databaseId);
    databaseNameCache.delete(databaseId);
    await logCfpwEvent(env, 'd1-database-delete', true, { accountId: accountInfo.accountId, databaseId });
    return toJsonResponse({ ok: true, ...trace, databaseId, deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao excluir o banco D1 ${databaseId}.`;
    await logCfpwEvent(env, 'd1-database-delete', false, { databaseId }, message);
    return toErrorResponse(message, trace, resolveD1ErrorStatus(error));
  }
}

// ── Console SQL ──

type QueryPayload = {
  databaseId?: unknown;
  sql?: unknown;
  params?: unknown;
  confirmDangerous?: unknown;
  confirmPhrase?: unknown;
};

export async function onRequestPostQuery(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<QueryPayload>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const databaseId = String(payload.databaseId ?? '').trim();
  if (!databaseId) {
    return toErrorResponse('Campo databaseId é obrigatório para executar SQL.', trace, 400);
  }
  if (typeof payload.sql !== 'string' || !payload.sql.trim()) {
    return toErrorResponse('Campo sql é obrigatório: informe o SQL a executar.', trace, 400);
  }
  if (payload.sql.length > SQL_MAX_CHARS) {
    return toErrorResponse(
      `SQL excede o limite de ${SQL_MAX_CHARS} caracteres (recebido: ${payload.sql.length}) — divida em execuções menores.`,
      trace,
      400,
    );
  }
  if (payload.params !== undefined && !Array.isArray(payload.params)) {
    return toErrorResponse('Campo params precisa ser um array de valores de bind.', trace, 400);
  }

  const statements = classifyD1Statements(payload.sql);
  if (statements.length === 0) {
    return toErrorResponse('Nenhum statement SQL encontrado — o corpo contém apenas ";" ou espaços.', trace, 400);
  }
  const writes = statements.filter((statement) => statement.kind === 'write').length;
  const sqlPreview = toSqlPreview(payload.sql);

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    if (writes > 0) {
      if (payload.confirmDangerous !== true) {
        // Handshake de confirmação: o frontend mostra o modal com a
        // classificação e reenvia com confirmDangerous: true (+confirmPhrase).
        return toJsonResponse({ ok: false, ...trace, requiresConfirmation: true, statements }, 409);
      }
      const databaseName = await resolveD1DatabaseName(env, accountInfo.accountId, databaseId);
      assertD1WriteAllowed(databaseName, payload.confirmPhrase);
    }

    const result = await queryD1Database(
      env,
      accountInfo.accountId,
      databaseId,
      payload.sql,
      payload.params !== undefined ? (payload.params as unknown[]) : undefined,
    );
    await logCfpwEvent(env, 'd1-query', true, {
      accountId: accountInfo.accountId,
      databaseId,
      statements: statements.length,
      writes,
      sqlPreview,
    });
    return toJsonResponse({ ok: true, ...trace, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao executar SQL no banco D1.';
    await logCfpwEvent(env, 'd1-query', false, { databaseId, statements: statements.length, sqlPreview }, message);
    return toErrorResponse(message, trace, resolveD1ErrorStatus(error));
  }
}

// ── Schema e navegação de tabelas ──

export async function onRequestGetSchema(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const databaseId = String(url.searchParams.get('databaseId') ?? '').trim();

  if (!databaseId) {
    return toErrorResponse('Parâmetro databaseId é obrigatório para ler o schema D1.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const result = await queryD1Database(env, accountInfo.accountId, databaseId, SCHEMA_SQL);
    const firstStatement = result[0];
    const objects = firstStatement && Array.isArray(firstStatement.results) ? firstStatement.results : [];
    await logCfpwEvent(env, 'd1-schema', true, {
      accountId: accountInfo.accountId,
      databaseId,
      objects: objects.length,
    });
    return toJsonResponse({ ok: true, ...trace, objects });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao ler o schema do banco D1.';
    await logCfpwEvent(env, 'd1-schema', false, { databaseId }, message);
    return toErrorResponse(message, trace, resolveD1ErrorStatus(error));
  }
}

export async function onRequestGetTable(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const databaseId = String(url.searchParams.get('databaseId') ?? '').trim();
  const table = String(url.searchParams.get('table') ?? '').trim();
  const page = clampInt(url.searchParams.get('page'), 1, 1, Number.MAX_SAFE_INTEGER);
  const perPage = clampInt(
    url.searchParams.get('perPage'),
    TABLE_PER_PAGE_DEFAULT,
    TABLE_PER_PAGE_MIN,
    TABLE_PER_PAGE_MAX,
  );

  if (!databaseId || !table) {
    return toErrorResponse('Parâmetros databaseId e table são obrigatórios para navegar a tabela D1.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    // Valida o nome contra sqlite_master (bind exato) — NUNCA interpola nome
    // livre vindo do cliente.
    const validation = await queryD1Database(
      env,
      accountInfo.accountId,
      databaseId,
      "SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name = ?1",
      [table],
    );
    const validationStatement = validation[0];
    const found = validationStatement && Array.isArray(validationStatement.results) ? validationStatement.results : [];
    if (found.length === 0) {
      const message = `Tabela ou view "${table}" não existe neste banco D1 — recarregue o schema.`;
      await logCfpwEvent(env, 'd1-table', false, { databaseId, unknownTable: true }, message);
      return toErrorResponse(message, trace, 400);
    }

    // Nome validado: interpola entre aspas duplas com escaping por duplicação.
    const escapedTable = table.replace(/"/g, '""');
    const [metaResult, rowsResult] = await Promise.all([
      queryD1Database(
        env,
        accountInfo.accountId,
        databaseId,
        `PRAGMA table_info("${escapedTable}"); SELECT COUNT(*) AS total FROM "${escapedTable}"`,
      ),
      queryD1Database(env, accountInfo.accountId, databaseId, `SELECT * FROM "${escapedTable}" LIMIT ?1 OFFSET ?2`, [
        perPage,
        (page - 1) * perPage,
      ]),
    ]);

    const pragmaStatement = metaResult[0];
    const pragmaRows = pragmaStatement && Array.isArray(pragmaStatement.results) ? pragmaStatement.results : [];
    const columns = pragmaRows.map((row) => {
      const record = (row ?? {}) as { name?: unknown; type?: unknown };
      return { name: String(record.name ?? ''), type: String(record.type ?? '') };
    });
    const countStatement = metaResult[1];
    const countRows = countStatement && Array.isArray(countStatement.results) ? countStatement.results : [];
    const countRow = (countRows[0] ?? null) as { total?: unknown } | null;
    const total = Number.isFinite(Number(countRow?.total)) ? Number(countRow?.total) : 0;
    const rowsStatement = rowsResult[0];
    const rows = rowsStatement && Array.isArray(rowsStatement.results) ? rowsStatement.results : [];

    await logCfpwEvent(env, 'd1-table', true, {
      accountId: accountInfo.accountId,
      databaseId,
      rows: rows.length,
    });
    return toJsonResponse({ ok: true, ...trace, columns, rows, total, page, perPage });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao navegar a tabela "${table}" no banco D1.`;
    await logCfpwEvent(env, 'd1-table', false, { databaseId }, message);
    return toErrorResponse(message, trace, resolveD1ErrorStatus(error));
  }
}

// ── Export / Import ──

type ExportPayload = {
  databaseId?: unknown;
  bookmark?: unknown;
  dumpOptions?: unknown;
};

export async function onRequestPostExport(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<ExportPayload>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const databaseId = String(payload.databaseId ?? '').trim();
  if (!databaseId) {
    return toErrorResponse('Campo databaseId é obrigatório para exportar o banco D1.', trace, 400);
  }
  const bookmark = typeof payload.bookmark === 'string' && payload.bookmark ? payload.bookmark : undefined;
  const rawDumpOptions = (payload.dumpOptions ?? {}) as { noData?: unknown; noSchema?: unknown; tables?: unknown };
  const dumpOptions = {
    ...(rawDumpOptions.noData === true ? { no_data: true } : {}),
    ...(rawDumpOptions.noSchema === true ? { no_schema: true } : {}),
    ...(Array.isArray(rawDumpOptions.tables) && rawDumpOptions.tables.length > 0
      ? { tables: rawDumpOptions.tables.map((tableName) => String(tableName)) }
      : {}),
  };

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    // Export é leitura: sem guard de banco protegido.
    const result = await exportD1Database(env, accountInfo.accountId, databaseId, {
      output_format: 'polling',
      ...(bookmark !== undefined ? { current_bookmark: bookmark } : {}),
      ...(Object.keys(dumpOptions).length > 0 ? { dump_options: dumpOptions } : {}),
    });
    await logCfpwEvent(env, 'd1-export', true, {
      accountId: accountInfo.accountId,
      databaseId,
      resumed: bookmark !== undefined,
    });
    return toJsonResponse({ ok: true, ...trace, result: result ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao exportar o banco D1.';
    await logCfpwEvent(env, 'd1-export', false, { databaseId }, message);
    return toErrorResponse(message, trace, resolveD1ErrorStatus(error));
  }
}

type ImportPayload = {
  databaseId?: unknown;
  action?: unknown;
  etag?: unknown;
  filename?: unknown;
  bookmark?: unknown;
};

export async function onRequestPostImport(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<ImportPayload>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const databaseId = String(payload.databaseId ?? '').trim();
  if (!databaseId) {
    return toErrorResponse('Campo databaseId é obrigatório para importar no banco D1.', trace, 400);
  }
  const action = String(payload.action ?? '').trim() as ImportAction;
  if (!IMPORT_ACTIONS.includes(action)) {
    return toErrorResponse(`Campo action inválido: "${action}" — use init, ingest ou poll.`, trace, 400);
  }
  const etag = typeof payload.etag === 'string' ? payload.etag.trim() : '';
  const filename = typeof payload.filename === 'string' ? payload.filename.trim() : '';
  const bookmark = typeof payload.bookmark === 'string' ? payload.bookmark.trim() : '';
  if ((action === 'init' || action === 'ingest') && !etag) {
    return toErrorResponse(`Campo etag (MD5 do arquivo) é obrigatório para action "${action}".`, trace, 400);
  }
  if (action === 'ingest' && !filename) {
    return toErrorResponse('Campo filename (devolvido pelo init) é obrigatório para action "ingest".', trace, 400);
  }
  if (action === 'poll' && !bookmark) {
    return toErrorResponse('Campo bookmark é obrigatório para action "poll".', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    // Import bloqueia/substitui dados: banco protegido é 403 SEMPRE.
    const databaseName = await resolveD1DatabaseName(env, accountInfo.accountId, databaseId);
    assertD1DestructionAllowed(databaseName);

    const cfBody =
      action === 'init'
        ? { action: 'init', etag }
        : action === 'ingest'
          ? { action: 'ingest', etag, filename }
          : { action: 'poll', current_bookmark: bookmark };
    const result = await importD1Database(env, accountInfo.accountId, databaseId, cfBody);
    await logCfpwEvent(env, 'd1-import', true, { accountId: accountInfo.accountId, databaseId, action });
    return toJsonResponse({ ok: true, ...trace, result: result ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha na operação de import do banco D1.';
    await logCfpwEvent(env, 'd1-import', false, { databaseId, action }, message);
    return toErrorResponse(message, trace, resolveD1ErrorStatus(error));
  }
}
