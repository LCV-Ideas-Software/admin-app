import { resolveAdminActorFromRequest } from '../../../../../functions/api/_lib/admin-actor';
import { bumpMainsiteContentVersion, type Context, toHeaders } from '../../../../../functions/api/_lib/mainsite-admin';
import { logModuleOperationalEvent } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace, type ResponseTrace } from '../../../../../functions/api/_lib/request-trace';
import { sanitizePlainText, sanitizePostHtml } from './_lib/sanitize-post-html';

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results?: T[] }>;
  run: () => Promise<unknown>;
};

type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
};

type MainsiteEnv = Context['env'] & {
  BIGDATA_DB?: D1Database;
};

type MainsiteContext = {
  request: Request;
  env: MainsiteEnv;
};

type AboutRow = {
  id?: number;
  title?: string;
  content?: string;
  author?: string;
  source_post_id?: number | null;
  created_at?: string;
  updated_at?: string;
};

type EngagementCounts = {
  comments: number;
  ratings: number;
};

const DEFAULT_AUTHOR = 'Leonardo Cardozo Vargas';

const parseId = (rawValue: unknown) => {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const isMissingTableError = (error: unknown) =>
  error instanceof Error && /no such table/i.test(error.message);

const buildErrorResponse = (message: string, trace: ResponseTrace, status = 500, extra?: Record<string, unknown>) =>
  new Response(
    JSON.stringify({
      ok: false,
      error: message,
      ...extra,
      ...trace,
    }),
    {
      status,
      headers: toHeaders(),
    },
  );

const requireDb = (env: MainsiteEnv) => {
  if (!env.BIGDATA_DB) {
    throw new Error('BIGDATA_DB não configurado no runtime do admin-app.');
  }
  return env.BIGDATA_DB;
};

const ensureAboutTable = async (db: D1Database) => {
  await db
    .prepare(`
      CREATE TABLE IF NOT EXISTS mainsite_about (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '${DEFAULT_AUTHOR}',
        source_post_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    .run();
};

const mapAboutRow = (row: AboutRow | null) => {
  if (!row) return null;

  return {
    id: 1,
    title: String(row.title ?? '').trim(),
    content: String(row.content ?? '').trim(),
    author: String(row.author ?? '').trim() || DEFAULT_AUTHOR,
    source_post_id: row.source_post_id ?? null,
    created_at: String(row.created_at ?? '').trim(),
    updated_at: row.updated_at ? String(row.updated_at).trim() : null,
  };
};

const countRows = async (db: D1Database, table: 'mainsite_comments' | 'mainsite_ratings', postId: number) => {
  try {
    const row = await db
      .prepare(`SELECT COUNT(*) AS total FROM ${table} WHERE post_id = ?`)
      .bind(postId)
      .first<{ total?: number }>();
    return Number(row?.total ?? 0);
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
};

const countEngagement = async (db: D1Database, postId: number): Promise<EngagementCounts> => ({
  comments: await countRows(db, 'mainsite_comments', postId),
  ratings: await countRows(db, 'mainsite_ratings', postId),
});

const deleteDerivedSummary = async (db: D1Database, postId: number) => {
  try {
    await db.prepare('DELETE FROM mainsite_post_ai_summaries WHERE post_id = ?').bind(postId).run();
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }
};

const readAbout = async (db: D1Database) =>
  mapAboutRow(
    await db
      .prepare(
        `SELECT id, title, content, author, source_post_id, created_at, updated_at
         FROM mainsite_about
         WHERE id = 1
         LIMIT 1`,
      )
      .first<AboutRow>(),
  );

const upsertAbout = async (db: D1Database, input: { title: string; content: string; author: string; sourcePostId: number | null }) => {
  await db
    .prepare(`
      INSERT INTO mainsite_about (id, title, content, author, source_post_id, created_at, updated_at)
      VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        author = excluded.author,
        source_post_id = excluded.source_post_id,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(input.title, input.content, input.author, input.sourcePostId)
    .run();
};

export async function onRequestGet(context: MainsiteContext) {
  const trace = createResponseTrace(context.request);

  try {
    const db = requireDb((context as any).data?.env || context.env);
    await ensureAboutTable(db);
    const about = await readAbout(db);

    return new Response(JSON.stringify({ ok: true, about, ...trace }), {
      headers: toHeaders(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar Sobre Este Site';
    return buildErrorResponse(message, trace, 500);
  }
}

export async function onRequestPut(context: MainsiteContext) {
  const trace = createResponseTrace(context.request);

  try {
    const db = requireDb((context as any).data?.env || context.env);
    await ensureAboutTable(db);
    const body = (await context.request.json()) as {
      title?: unknown;
      content?: unknown;
      author?: unknown;
      source_post_id?: unknown;
      convert_source_post?: unknown;
    };
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>);
    const title = sanitizePlainText(body.title, 300);
    const content = sanitizePostHtml(String(body.content ?? ''));
    const author = sanitizePlainText(body.author, 200) || DEFAULT_AUTHOR;
    const sourcePostId = parseId(body.source_post_id);
    const shouldConvertSource = body.convert_source_post === true || body.convert_source_post === 1 || body.convert_source_post === '1';

    if (!title || !content) {
      return buildErrorResponse('Título e conteúdo são obrigatórios para salvar Sobre Este Site.', trace, 400);
    }

    if (shouldConvertSource) {
      if (!sourcePostId) {
        return buildErrorResponse('source_post_id válido é obrigatório para converter post em Sobre Este Site.', trace, 400);
      }

      const sourcePost = await db
        .prepare('SELECT id FROM mainsite_posts WHERE id = ? LIMIT 1')
        .bind(sourcePostId)
        .first<{ id: number }>();

      if (!sourcePost) {
        return buildErrorResponse('Post de origem não encontrado para conversão.', trace, 404);
      }

      const engagement = await countEngagement(db, sourcePostId);
      if (engagement.comments > 0 || engagement.ratings > 0) {
        return buildErrorResponse(
          'Este post possui comentários ou avaliações e não pode ser convertido automaticamente em Sobre Este Site.',
          trace,
          409,
          { engagement },
        );
      }
    }

    const existing = await readAbout(db);
    await upsertAbout(db, {
      title,
      content,
      author,
      sourcePostId: shouldConvertSource ? sourcePostId : null,
    });

    if (shouldConvertSource && sourcePostId) {
      await deleteDerivedSummary(db, sourcePostId);
      await db.prepare('DELETE FROM mainsite_posts WHERE id = ?').bind(sourcePostId).run();
    }

    await bumpMainsiteContentVersion(db as unknown as D1Database);

    const about = await readAbout(db);

    try {
      await logModuleOperationalEvent(db, {
        module: 'mainsite',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: shouldConvertSource ? 'convert-post-to-about' : existing ? 'update-about' : 'create-about',
          adminActor,
          sourcePostId: shouldConvertSource ? sourcePostId : null,
        },
      });
    } catch {
      // Telemetria não deve bloquear a resposta.
    }

    return new Response(
      JSON.stringify({
        ok: true,
        about,
        convertedSourcePostId: shouldConvertSource ? sourcePostId : null,
        admin_actor: adminActor,
        ...trace,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar Sobre Este Site';

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'upsert-about',
          },
        });
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, trace, 500);
  }
}
