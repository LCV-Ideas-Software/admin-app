import { resolveAdminActorFromRequest } from '../_lib/admin-actor';
import { unauthorizedResponse, validatePutAuth } from '../_lib/auth';
import {
  type HubCard,
  logHubEvent,
  parseCardsFromBody,
  resolveHubConfig,
  saveCardsToDb,
  toHubHeaders,
} from '../_lib/hub-config';
import { createResponseTrace, type ResponseTrace } from '../_lib/request-trace';

type Env = {
  BIGDATA_DB?: D1Database;
  ADMINHUB_BEARER_TOKEN?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ENFORCE_JWT_VALIDATION?: string;
};

type Context = {
  request: Request;
  env: Env;
  data?: {
    env?: Env;
  };
};

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results?: T[] }>;
  run: () => Promise<unknown>;
};

type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
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
      headers: toHubHeaders(),
    },
  );

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request);

  try {
    const resolved = await resolveHubConfig(context.data?.env ?? context.env, 'adminhub');

    await logHubEvent((context.data?.env ?? context.env).BIGDATA_DB, {
      module: 'adminhub',
      action: 'config-read',
      source: resolved.source,
      ok: true,
      fallbackUsed: resolved.source !== 'bigdata_db',
      metadata: {
        totalCards: resolved.cards.length,
        warnings: resolved.warnings.length,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        fonte: resolved.source,
        avisos: resolved.warnings,
        total: resolved.cards.length,
        cards: resolved.cards,
        ...trace,
      }),
      {
        headers: toHubHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar configuração do adminhub';

    await logHubEvent((context.data?.env ?? context.env).BIGDATA_DB, {
      module: 'adminhub',
      action: 'config-read',
      source: 'bigdata_db',
      ok: false,
      fallbackUsed: true,
      errorMessage: message,
    });

    return buildErrorResponse(message, trace, 500);
  }
}

export async function onRequestPut(context: Context) {
  const trace = createResponseTrace(context.request);

  // Validate authentication for PUT operations
  const env = context.data?.env ?? context.env;
  const authContext = await validatePutAuth(context.request, env.ADMINHUB_BEARER_TOKEN, {
    ...(env.CF_ACCESS_TEAM_DOMAIN !== undefined ? { teamDomain: env.CF_ACCESS_TEAM_DOMAIN } : {}),
    ...(env.CF_ACCESS_AUD !== undefined ? { audience: env.CF_ACCESS_AUD } : {}),
    ...(env.ENFORCE_JWT_VALIDATION !== undefined ? { enforcement: env.ENFORCE_JWT_VALIDATION } : {}),
  });
  if (!authContext.isAuthenticated) {
    return unauthorizedResponse(authContext.error || 'No authentication provided');
  }

  const db = env.BIGDATA_DB;
  if (!db) {
    return buildErrorResponse('BIGDATA_DB não configurado no runtime.', trace, 503);
  }

  try {
    const body = (await context.request.json()) as { cards?: HubCard[] };
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>);
    const cards = parseCardsFromBody(body);
    const updated = await saveCardsToDb(db, 'adminhub', cards, adminActor);

    await logHubEvent(db, {
      module: 'adminhub',
      action: 'config-save',
      source: 'bigdata_db',
      ok: true,
      fallbackUsed: false,
      metadata: {
        totalCards: updated,
        adminActor,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        total: updated,
        admin_actor: adminActor,
        ...trace,
      }),
      {
        headers: toHubHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar configuração do adminhub';

    await logHubEvent(db, {
      module: 'adminhub',
      action: 'config-save',
      source: 'bigdata_db',
      ok: false,
      fallbackUsed: false,
      errorMessage: message,
    });

    return buildErrorResponse(message, trace, 400);
  }
}
