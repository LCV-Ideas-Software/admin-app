import { resolveAdminActorFromRequest } from '../../../../../functions/api/_lib/admin-actor';
import { bumpMainsiteContentVersion, type Context, toHeaders } from '../../../../../functions/api/_lib/mainsite-admin';
import { logModuleOperationalEvent } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace, type ResponseTrace } from '../../../../../functions/api/_lib/request-trace';

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
  data?: {
    env?: MainsiteEnv;
  };
};

type VisibilityRow = {
  is_published?: number;
};

const parseId = (rawValue: unknown) => {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const parseFlag = (rawValue: unknown): 0 | 1 | null => {
  if (rawValue === true || rawValue === 1 || rawValue === '1') return 1;
  if (rawValue === false || rawValue === 0 || rawValue === '0') return 0;
  return null;
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

const ensureIsPublishedColumn = async (db: D1Database) => {
  try {
    const info = await db.prepare('PRAGMA table_info(mainsite_posts)').all<{ name: string }>();
    const cols = (info.results ?? []).map((r) => r.name);
    if (!cols.includes('is_published')) {
      await db.prepare('ALTER TABLE mainsite_posts ADD COLUMN is_published INTEGER NOT NULL DEFAULT 1').run();
    }
  } catch {
    /* tabela pode não existir ainda — ignorar */
  }
};

// Toggle ou set explícito de is_published. Body aceita:
//   { id, is_published?: boolean|0|1 }  — se is_published ausente, alterna estado atual.
export async function onRequestPost(context: MainsiteContext) {
  const trace = createResponseTrace(context.request);

  try {
    const db = requireDb(context.data?.env ?? context.env);
    await ensureIsPublishedColumn(db);

    const body = (await context.request.json()) as { id?: unknown; is_published?: unknown };
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>);
    const id = parseId(body.id);

    if (!id) {
      return buildErrorResponse('ID válido é obrigatório para alternar visibilidade do post.', trace, 400);
    }

    const current = await db
      .prepare('SELECT is_published FROM mainsite_posts WHERE id = ? LIMIT 1')
      .bind(id)
      .first<VisibilityRow>();

    if (!current) {
      return buildErrorResponse('Post não encontrado para alternar visibilidade.', trace, 404);
    }

    const explicit = parseFlag(body.is_published);
    const currentPublished = Number(current.is_published ?? 1) === 0 ? 0 : 1;
    const nextPublished: 0 | 1 = explicit !== null ? explicit : currentPublished === 1 ? 0 : 1;

    await db.prepare('UPDATE mainsite_posts SET is_published = ? WHERE id = ?').bind(nextPublished, id).run();
    await bumpMainsiteContentVersion(db as unknown as D1Database);

    try {
      await logModuleOperationalEvent(db, {
        module: 'mainsite',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: 'visibility-post',
          adminActor,
          id,
          isPublished: nextPublished === 1,
        },
      });
    } catch {
      // Telemetria não deve bloquear a resposta.
    }

    return new Response(
      JSON.stringify({
        ok: true,
        id,
        isPublished: nextPublished === 1,
        admin_actor: adminActor,
        ...trace,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao alternar visibilidade do post do MainSite';

    const telemetryDb = (context.data?.env ?? context.env).BIGDATA_DB;
    if (telemetryDb) {
      try {
        await logModuleOperationalEvent(telemetryDb, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'visibility-post',
          },
        });
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, trace);
  }
}
