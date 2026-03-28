import { logModuleOperationalEvent } from '../_lib/operational'
import type { D1Database } from '../_lib/operational'
import { createResponseTrace } from '../_lib/request-trace'
import { deleteCloudflareWorker, resolveCloudflarePwAccount } from '../_lib/cfpw-api'

type Context = {
  request: Request
  env: {
    BIGDATA_DB?: D1Database
    CLOUDFLARE_PW?: string
    CLOUDFLARE_API_TOKEN?: string
    CF_API_TOKEN?: string
    CF_ACCOUNT_ID?: string
  }
}

type DeleteWorkerPayload = {
  scriptName?: unknown
  confirmation?: unknown
}

const toHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

const toError = (message: string, trace: { request_id: string; timestamp: string }, status = 500) => new Response(JSON.stringify({
  ok: false,
  ...trace,
  error: message,
}), {
  status,
  headers: toHeaders(),
})

const toText = (value: unknown) => String(value ?? '').trim()

export async function onRequestPost(context: Context) {
  const trace = createResponseTrace(context.request)

  let payload: DeleteWorkerPayload
  try {
    payload = await context.request.json() as DeleteWorkerPayload
  } catch {
    return toError('JSON inválido no corpo da requisição.', trace, 400)
  }

  const scriptName = toText(payload.scriptName)
  const confirmation = toText(payload.confirmation)

  if (!scriptName) {
    return toError('Campo scriptName é obrigatório.', trace, 400)
  }

  if (confirmation !== scriptName) {
    return toError(`Confirmação inválida. Digite exatamente o nome do Worker (${scriptName}).`, trace, 400)
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(context.env)
    await deleteCloudflareWorker(context.env, accountInfo.accountId, scriptName)

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'cfpw',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'delete-worker',
            provider: 'cloudflare-api',
            accountId: accountInfo.accountId,
            scriptName,
          },
        })
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      ...trace,
      message: `Worker ${scriptName} removido com sucesso.`,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao remover Worker ${scriptName}.`

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'cfpw',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'delete-worker',
            provider: 'cloudflare-api',
            scriptName,
          },
        })
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return toError(message, trace, 502)
  }
}
