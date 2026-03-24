import { resolveAdminActorFromRequest } from '../_lib/admin-actor'
import {
  logHubEvent,
  parseCardsFromBody,
  resolveHubConfig,
  saveCardsToDb,
  toHubHeaders,
  type HubCard,
} from '../_lib/hub-config'
import { createResponseTrace, type ResponseTrace } from '../_lib/request-trace'
import { validatePutAuth, unauthorizedResponse } from '../_lib/auth'

type Context = {
  request: Request
  env: {
    BIGDATA_DB?: D1Database
    APPHUB_BEARER_TOKEN?: string
  }
}

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement
  first: <T>() => Promise<T | null>
  all: <T>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

type D1Database = {
  prepare: (query: string) => D1PreparedStatement
}

const buildErrorResponse = (message: string, trace: ResponseTrace, status = 500) => new Response(JSON.stringify({
  ok: false,
  error: message,
  ...trace,
}), {
  status,
  headers: toHubHeaders(),
})

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request)

  try {
    const resolved = await resolveHubConfig(context.env, 'apphub')

    await logHubEvent(context.env.BIGDATA_DB, {
      module: 'apphub',
      action: 'config-read',
      source: resolved.source,
      ok: true,
      fallbackUsed: resolved.source !== 'bigdata_db',
      metadata: {
        totalCards: resolved.cards.length,
        warnings: resolved.warnings.length,
      },
    })

    return new Response(JSON.stringify({
      ok: true,
      fonte: resolved.source,
      avisos: resolved.warnings,
      total: resolved.cards.length,
      cards: resolved.cards,
      ...trace,
    }), {
      headers: toHubHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar configuração do apphub'

    await logHubEvent(context.env.BIGDATA_DB, {
      module: 'apphub',
      action: 'config-read',
      source: 'bigdata_db',
      ok: false,
      fallbackUsed: true,
      errorMessage: message,
    })

    return buildErrorResponse(message, trace, 500)
  }
}

export async function onRequestPut(context: Context) {
  const trace = createResponseTrace(context.request)

  // Validate authentication for PUT operations
  const authContext = validatePutAuth(context.request, context.env.APPHUB_BEARER_TOKEN)
  if (!authContext.isAuthenticated) {
    return unauthorizedResponse(authContext.error || 'No authentication provided')
  }

  if (!context.env.BIGDATA_DB) {
    return buildErrorResponse('BIGDATA_DB não configurado no runtime.', trace, 503)
  }

  try {
    const body = await context.request.json() as { cards?: HubCard[] }
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>)
    const cards = parseCardsFromBody(body)
    const updated = await saveCardsToDb(context.env.BIGDATA_DB, 'apphub', cards, adminActor)

    await logHubEvent(context.env.BIGDATA_DB, {
      module: 'apphub',
      action: 'config-save',
      source: 'bigdata_db',
      ok: true,
      fallbackUsed: false,
      metadata: {
        totalCards: updated,
        adminActor,
      },
    })

    return new Response(JSON.stringify({
      ok: true,
      total: updated,
      admin_actor: adminActor,
      ...trace,
    }), {
      headers: toHubHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar configuração do apphub'

    await logHubEvent(context.env.BIGDATA_DB, {
      module: 'apphub',
      action: 'config-save',
      source: 'bigdata_db',
      ok: false,
      fallbackUsed: false,
      errorMessage: message,
    })

    return buildErrorResponse(message, trace, 400)
  }
}