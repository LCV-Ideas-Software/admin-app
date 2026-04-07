/**
 * Route handler for Cloudflare Workers Observability.
 * GET  /api/cfpw/observability -> list destinations
 * POST /api/cfpw/observability -> multiplexed actions (query, keys, values, create-destination, delete-destination)
 */
import { createResponseTrace } from '../_lib/request-trace'
import { resolveCloudflarePwAccount } from '../_lib/cfpw-api'
import {
  createObservabilityDestination,
  deleteObservabilityDestination,
  listObservabilityDestinations,
  listObservabilityKeys,
  listObservabilityValues,
  queryObservabilityTelemetry,
} from '../_lib/observability-api'

type Context = {
  request: Request
  env: {
    CLOUDFLARE_PW?: string
    CF_ACCOUNT_ID?: string
  }
}

const toHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

const toError = (message: string, trace: { request_id: string; timestamp: string }, status = 500) =>
  new Response(JSON.stringify({ ok: false, ...trace, error: message }), {
    status,
    headers: toHeaders(),
  })

/**
 * GET /api/cfpw/observability — list OTel destinations
 */
export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request)
  try {
    const env = (context as unknown as { data?: { env?: Context['env'] } }).data?.env || context.env
    const accountInfo = await resolveCloudflarePwAccount(env)
    const destinations = await listObservabilityDestinations(env, accountInfo.accountId)

    return new Response(JSON.stringify({
      ok: true,
      ...trace,
      destinations,
    }), { headers: toHeaders() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao listar destinos de observability.'
    return toError(message, trace, 502)
  }
}

/**
 * POST /api/cfpw/observability — multiplexed actions
 * Body JSON: { action: string, body?: object, slug?: string }
 */
export async function onRequestPost(context: Context) {
  const trace = createResponseTrace(context.request)

  let payload: { action?: string; body?: Record<string, unknown>; slug?: string }
  try {
    payload = await context.request.json() as typeof payload
  } catch {
    return toError('JSON inválido no corpo da requisição.', trace, 400)
  }

  const action = String(payload.action ?? '').trim()
  if (!action) {
    return toError('Campo "action" é obrigatório.', trace, 400)
  }

  try {
    const env = (context as unknown as { data?: { env?: Context['env'] } }).data?.env || context.env
    const accountInfo = await resolveCloudflarePwAccount(env)
    const accountId = accountInfo.accountId
    let result: unknown = null

    switch (action) {
      case 'query': {
        if (!payload.body) return toError('Campo "body" é obrigatório para action "query".', trace, 400)
        result = await queryObservabilityTelemetry(env, accountId, payload.body)
        break
      }

      case 'keys': {
        if (!payload.body) return toError('Campo "body" é obrigatório para action "keys".', trace, 400)
        result = await listObservabilityKeys(env, accountId, payload.body)
        break
      }

      case 'values': {
        if (!payload.body) return toError('Campo "body" é obrigatório para action "values".', trace, 400)
        result = await listObservabilityValues(env, accountId, payload.body)
        break
      }

      case 'create-destination': {
        if (!payload.body) return toError('Campo "body" é obrigatório para action "create-destination".', trace, 400)
        result = await createObservabilityDestination(env, accountId, payload.body)
        break
      }

      case 'delete-destination': {
        const slug = String(payload.slug ?? '').trim()
        if (!slug) return toError('Campo "slug" é obrigatório para action "delete-destination".', trace, 400)
        result = await deleteObservabilityDestination(env, accountId, slug)
        break
      }

      default:
        return toError(`Ação de observability não suportada: ${action}`, trace, 400)
    }

    return new Response(JSON.stringify({
      ok: true,
      ...trace,
      result,
    }), { headers: toHeaders() })
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao executar ação de observability: ${action}.`
    return toError(message, trace, 502)
  }
}
