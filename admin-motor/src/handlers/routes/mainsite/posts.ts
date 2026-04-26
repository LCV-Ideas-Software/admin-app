import { resolveAdminActorFromRequest } from '../../../../../functions/api/_lib/admin-actor';
import { bumpMainsiteContentVersion, type Context, toHeaders } from '../../../../../functions/api/_lib/mainsite-admin';
import { logModuleOperationalEvent } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace, type ResponseTrace } from '../../../../../functions/api/_lib/request-trace';
import { sanitizePostHtml } from './_lib/sanitize-post-html';

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results?: T[] }>;
  run: () => Promise<unknown>;
};

type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
  batch?: (statements: D1PreparedStatement[]) => Promise<unknown[]>;
};

type MainsiteEnv = Context['env'] & {
  BIGDATA_DB?: D1Database;
};

type MainsiteContext = {
  request: Request;
  env: MainsiteEnv;
};

type PostRow = {
  id?: number;
  title?: string;
  content?: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
  is_pinned?: number;
  is_published?: number;
};

type OptionalId = {
  provided: boolean;
  value: number | null;
};

const parseFlag = (rawValue: unknown, fallback: 0 | 1): 0 | 1 => {
  if (rawValue === undefined || rawValue === null) return fallback;
  if (rawValue === true || rawValue === 1 || rawValue === '1') return 1;
  if (rawValue === false || rawValue === 0 || rawValue === '0') return 0;
  return fallback;
};

const parseId = (rawValue: unknown) => {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const parseOptionalId = (rawValue: unknown): OptionalId => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return { provided: false, value: null };
  }

  return { provided: true, value: parseId(rawValue) };
};

const parseText = (rawValue: unknown) => String(rawValue ?? '').trim();

const DEFAULT_AUTHOR = 'Leonardo Cardozo Vargas';

const mapPostRow = (row: PostRow) => {
  const id = Number(row.id);
  const title = String(row.title ?? '').trim();
  const content = String(row.content ?? '').trim();
  const author = String(row.author ?? '').trim() || DEFAULT_AUTHOR;
  const createdAt = String(row.created_at ?? '').trim();
  const updatedAt = row.updated_at ? String(row.updated_at).trim() : null;

  if (!Number.isFinite(id) || !title || !content || !createdAt) {
    return null;
  }

  return {
    id,
    title,
    content,
    author,
    created_at: createdAt,
    updated_at: updatedAt,
    is_pinned: Number(row.is_pinned ?? 0) === 1 ? 1 : 0,
    is_published: Number(row.is_published ?? 1) === 0 ? 0 : 1,
  };
};

const buildErrorResponse = (message: string, trace: ResponseTrace, status = 500) =>
  new Response(
    JSON.stringify({
      ok: false,
      error: message,
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

const idExists = async (db: D1Database, id: number) => {
  const row = await db.prepare('SELECT id FROM mainsite_posts WHERE id = ? LIMIT 1').bind(id).first<{ id?: number }>();
  return Boolean(row?.id);
};

const postReferenceTargets = [
  { table: 'mainsite_comments', column: 'post_id' },
  { table: 'mainsite_ratings', column: 'post_id' },
  { table: 'mainsite_post_ai_summaries', column: 'post_id' },
  { table: 'mainsite_shares', column: 'post_id' },
  { table: 'mainsite_about', column: 'source_post_id' },
] as const;

const tableHasColumn = async (db: D1Database, table: (typeof postReferenceTargets)[number]['table'], column: string) => {
  try {
    const info = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
    return (info.results ?? []).some((row) => row.name === column);
  } catch {
    return false;
  }
};

const updatePostIdAndReferences = async (
  db: D1Database,
  currentId: number,
  nextId: number,
  fields: { title: string; content: string; author: string; isPublished?: 0 | 1; hasVisibilityFlag: boolean },
) => {
  const statements: D1PreparedStatement[] = [];

  if (fields.hasVisibilityFlag) {
    statements.push(
      db
        .prepare(`
          INSERT INTO mainsite_posts (id, title, content, author, is_pinned, display_order, is_published, created_at, updated_at)
          SELECT ?, ?, ?, ?, is_pinned, display_order, ?, created_at, CURRENT_TIMESTAMP
          FROM mainsite_posts
          WHERE id = ?
        `)
        .bind(nextId, fields.title, fields.content, fields.author, fields.isPublished ?? 1, currentId),
    );
  } else {
    statements.push(
      db
        .prepare(`
          INSERT INTO mainsite_posts (id, title, content, author, is_pinned, display_order, is_published, created_at, updated_at)
          SELECT ?, ?, ?, ?, is_pinned, display_order, is_published, created_at, CURRENT_TIMESTAMP
          FROM mainsite_posts
          WHERE id = ?
        `)
        .bind(nextId, fields.title, fields.content, fields.author, currentId),
    );
  }

  for (const target of postReferenceTargets) {
    if (await tableHasColumn(db, target.table, target.column)) {
      statements.push(db.prepare(`UPDATE ${target.table} SET ${target.column} = ? WHERE ${target.column} = ?`).bind(nextId, currentId));
    }
  }

  statements.push(db.prepare('DELETE FROM mainsite_posts WHERE id = ?').bind(currentId));

  if (typeof db.batch === 'function') {
    await db.batch(statements);
    return;
  }

  for (const statement of statements) {
    await statement.run();
  }
};

/** Auto-migração idempotente: garante colunas `author` e `is_published` em mainsite_posts */
const ensurePostColumns = async (db: D1Database) => {
  try {
    const info = await db.prepare('PRAGMA table_info(mainsite_posts)').all<{ name: string }>();
    const cols = (info.results ?? []).map((r) => r.name);
    if (!cols.includes('author')) {
      await db.prepare("ALTER TABLE mainsite_posts ADD COLUMN author TEXT DEFAULT ''").run();
    }
    if (!cols.includes('is_published')) {
      await db.prepare('ALTER TABLE mainsite_posts ADD COLUMN is_published INTEGER NOT NULL DEFAULT 1').run();
    }
  } catch {
    /* tabela pode não existir ainda — ignorar */
  }
};

export async function onRequestGet(context: MainsiteContext) {
  const { request } = context;
  const trace = createResponseTrace(request);
  const url = new URL(request.url);
  const id = parseId(url.searchParams.get('id'));

  try {
    const db = requireDb((context as any).data?.env || context.env);

    if (id) {
      await ensurePostColumns(db);
      const row = await db
        .prepare(`
        SELECT id, title, content, author, created_at, updated_at, is_pinned, is_published
        FROM mainsite_posts
        WHERE id = ?
        LIMIT 1
      `)
        .bind(id)
        .first<PostRow>();

      const post = row ? mapPostRow(row) : null;
      if (!post) {
        return buildErrorResponse('Post não encontrado para o ID informado.', trace, 404);
      }

      return new Response(JSON.stringify({ ok: true, post, ...trace }), {
        headers: toHeaders(),
      });
    }

    await ensurePostColumns(db);
    const rows = await db
      .prepare(`
      SELECT id, title, content, author, created_at, updated_at, is_pinned, is_published
      FROM mainsite_posts
      ORDER BY is_pinned DESC, display_order ASC, created_at DESC
    `)
      .all<PostRow>();

    const posts = (rows.results ?? [])
      .map((row) => mapPostRow(row))
      .filter((item): item is NonNullable<ReturnType<typeof mapPostRow>> => item !== null);

    return new Response(JSON.stringify({ ok: true, posts, ...trace }), {
      headers: toHeaders(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar posts do MainSite';

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: id ? 'post-detail' : 'posts-list',
          },
        });
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, trace, 500);
  }
}

export async function onRequestPost(context: MainsiteContext) {
  const trace = createResponseTrace(context.request);

  try {
    const db = requireDb((context as any).data?.env || context.env);
    await ensurePostColumns(db);
    const body = (await context.request.json()) as {
      title?: unknown;
      content?: unknown;
      author?: unknown;
      is_published?: unknown;
      requested_id?: unknown;
    };
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>);
    const title = parseText(body.title);
    const content = sanitizePostHtml(parseText(body.content));
    const author = parseText(body.author) || DEFAULT_AUTHOR;
    const isPublished = parseFlag(body.is_published, 1);
    const requestedId = parseOptionalId(body.requested_id);

    if (!title || !content) {
      return buildErrorResponse('Título e conteúdo são obrigatórios para criar um post.', trace, 400);
    }

    if (requestedId.provided && !requestedId.value) {
      return buildErrorResponse('ID informado deve ser um número inteiro positivo.', trace, 400);
    }

    if (requestedId.value && (await idExists(db, requestedId.value))) {
      return buildErrorResponse(`Já existe um post com o ID #${requestedId.value}.`, trace, 409);
    }

    if (requestedId.value) {
      await db
        .prepare(`
        INSERT INTO mainsite_posts (id, title, content, author, is_pinned, display_order, is_published, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
        .bind(requestedId.value, title, content, author, isPublished)
        .run();
    } else {
      await db
        .prepare(`
        INSERT INTO mainsite_posts (title, content, author, is_pinned, display_order, is_published, created_at, updated_at)
        VALUES (?, ?, ?, 0, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
        .bind(title, content, author, isPublished)
        .run();
    }

    const created = requestedId.value
      ? await db
          .prepare(`
          SELECT id, title, content, author, created_at, is_pinned, is_published
          FROM mainsite_posts
          WHERE id = ?
          LIMIT 1
        `)
          .bind(requestedId.value)
          .first<PostRow>()
      : await db
          .prepare(`
          SELECT id, title, content, author, created_at, is_pinned, is_published
          FROM mainsite_posts
          ORDER BY id DESC
          LIMIT 1
        `)
          .first<PostRow>();

    const createdPost = created ? mapPostRow(created) : null;

    try {
      await logModuleOperationalEvent(db, {
        module: 'mainsite',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: 'create-post',
          adminActor,
          createdId: createdPost?.id ?? null,
          requestedId: requestedId.value ?? null,
          titleLength: title.length,
        },
      });
    } catch {
      // Telemetria não deve bloquear a resposta.
    }

    return new Response(
      JSON.stringify({
        ok: true,
        post: createdPost,
        admin_actor: adminActor,
        ...trace,
      }),
      {
        status: 201,
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao criar post do MainSite';

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'create-post',
          },
        });
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, trace);
  }
}

export async function onRequestPut(context: MainsiteContext) {
  const trace = createResponseTrace(context.request);

  try {
    const db = requireDb((context as any).data?.env || context.env);
    await ensurePostColumns(db);
    const body = (await context.request.json()) as {
      id?: unknown;
      title?: unknown;
      content?: unknown;
      author?: unknown;
      is_published?: unknown;
      requested_id?: unknown;
    };
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>);
    const id = parseId(body.id);
    const title = parseText(body.title);
    const content = sanitizePostHtml(parseText(body.content));
    const author = parseText(body.author) || DEFAULT_AUTHOR;
    const hasVisibilityFlag = body.is_published !== undefined;
    const isPublished = parseFlag(body.is_published, 1);
    const requestedId = parseOptionalId(body.requested_id);

    if (!id || !title || !content) {
      return buildErrorResponse('ID, título e conteúdo são obrigatórios para atualizar um post.', trace, 400);
    }

    if (requestedId.provided && !requestedId.value) {
      return buildErrorResponse('ID informado deve ser um número inteiro positivo.', trace, 400);
    }

    const existingPost = await db.prepare('SELECT id FROM mainsite_posts WHERE id = ? LIMIT 1').bind(id).first<{ id?: number }>();
    if (!existingPost) {
      return buildErrorResponse('Post não encontrado para atualização.', trace, 404);
    }

    const resolvedId = requestedId.value && requestedId.value !== id ? requestedId.value : id;
    const idChanged = resolvedId !== id;

    if (idChanged && (await idExists(db, resolvedId))) {
      return buildErrorResponse(`Já existe um post com o ID #${resolvedId}.`, trace, 409);
    }

    if (idChanged) {
      await updatePostIdAndReferences(db, id, resolvedId, {
        title,
        content,
        author,
        hasVisibilityFlag,
        isPublished,
      });
      await bumpMainsiteContentVersion(db as unknown as D1Database);
    } else if (hasVisibilityFlag) {
      await db
        .prepare(
          'UPDATE mainsite_posts SET title = ?, content = ?, author = ?, is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        )
        .bind(title, content, author, isPublished, id)
        .run();
      // Visibilidade pode ter mudado via editor — sinaliza o frontend via fingerprint.
      await bumpMainsiteContentVersion(db as unknown as D1Database);
    } else {
      await db
        .prepare(
          'UPDATE mainsite_posts SET title = ?, content = ?, author = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        )
        .bind(title, content, author, id)
        .run();
    }

    const row = await db
      .prepare(`
      SELECT id, title, content, author, created_at, is_pinned, is_published
      FROM mainsite_posts
      WHERE id = ?
      LIMIT 1
    `)
      .bind(resolvedId)
      .first<PostRow>();

    const updatedPost = row ? mapPostRow(row) : null;
    if (!updatedPost) {
      return buildErrorResponse('Post não encontrado para atualização.', trace, 404);
    }

    try {
      await logModuleOperationalEvent(db, {
        module: 'mainsite',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: 'update-post',
          adminActor,
          id: resolvedId,
          previousId: idChanged ? id : null,
        },
      });
    } catch {
      // Telemetria não deve bloquear a resposta.
    }

    return new Response(
      JSON.stringify({
        ok: true,
        post: updatedPost,
        admin_actor: adminActor,
        ...trace,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao atualizar post do MainSite';

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'update-post',
          },
        });
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, trace);
  }
}

export async function onRequestDelete(context: MainsiteContext) {
  const trace = createResponseTrace(context.request);

  try {
    const db = requireDb((context as any).data?.env || context.env);
    const body = (await context.request.json()) as { id?: unknown };
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>);
    const id = parseId(body.id);

    if (!id) {
      return buildErrorResponse('ID válido é obrigatório para excluir um post.', trace, 400);
    }

    await db.prepare('DELETE FROM mainsite_posts WHERE id = ?').bind(id).run();

    try {
      await logModuleOperationalEvent(db, {
        module: 'mainsite',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: 'delete-post',
          adminActor,
          id,
        },
      });
    } catch {
      // Telemetria não deve bloquear a resposta.
    }

    return new Response(
      JSON.stringify({
        ok: true,
        deletedId: id,
        admin_actor: adminActor,
        ...trace,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao excluir post do MainSite';

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'delete-post',
          },
        });
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, trace);
  }
}
