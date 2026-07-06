import { resolveAdminActorFromRequest } from '../../../../../functions/api/_lib/admin-actor';
import { type Context, toHeaders } from '../../../../../functions/api/_lib/mainsite-admin';
import { logModuleOperationalEvent } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace, type ResponseTrace } from '../../../../../functions/api/_lib/request-trace';

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement;
  first: <T>() => Promise<T | null>;
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

type PinRow = {
  is_pinned?: number;
};

const parseId = (rawValue: unknown) => {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
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

export async function onRequestPost(context: MainsiteContext) {
  const trace = createResponseTrace(context.request);

  try {
    const db = requireDb(context.data?.env ?? context.env);
    const body = (await context.request.json()) as { id?: unknown };
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>);
    const id = parseId(body.id);

    if (!id) {
      return buildErrorResponse('ID válido é obrigatório para alternar fixação do post.', trace, 400);
    }

    const current = await db
      .prepare('SELECT is_pinned FROM mainsite_posts WHERE id = ? LIMIT 1')
      .bind(id)
      .first<PinRow>();

    if (!current) {
      return buildErrorResponse('Post não encontrado para alternar fixação.', trace, 404);
    }

    const nextPinned = Number(current.is_pinned ?? 0) === 1 ? 0 : 1;

    await db.prepare('UPDATE mainsite_posts SET is_pinned = ? WHERE id = ?').bind(nextPinned, id).run();

    try {
      await logModuleOperationalEvent(db, {
        module: 'mainsite',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: 'pin-post',
          adminActor,
          id,
          isPinned: nextPinned === 1,
        },
      });
    } catch {
      // Telemetria não deve bloquear a resposta.
    }

    return new Response(
      JSON.stringify({
        ok: true,
        id,
        isPinned: nextPinned === 1,
        admin_actor: adminActor,
        ...trace,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao alternar fixação do post do MainSite';

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
            action: 'pin-post',
          },
        });
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, trace);
  }
}
