import { logModuleOperationalEvent } from '../_lib/operational'
import type { D1Database } from '../_lib/operational'
import { createResponseTrace } from '../_lib/request-trace'
import {
  getCloudflareWorker,
  listCloudflareWorkerDeployments,
  resolveCloudflarePwAccount,
} from '../_lib/cfpw-api'

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

const toScriptName = (raw: string | null) => String(raw ?? '').trim()

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request)
  const url = new URL(context.request.url)
  const scriptName = toScriptName(url.searchParams.get('scriptName'))

  if (!scriptName) {
    return toError('Parâmetro scriptName é obrigatório.', trace, 400)
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(context.env)

    const [worker, deployments] = await Promise.all([
      getCloudflareWorker(context.env, accountInfo.accountId, scriptName),
      listCloudflareWorkerDeployments(context.env, accountInfo.accountId, scriptName),
    ])

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'cfpw',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'worker-details',
            provider: 'cloudflare-api',
            accountId: accountInfo.accountId,
            scriptName,
            deployments: deployments.length,
          },
        })
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      ...trace,
      accountId: accountInfo.accountId,
      scriptName,
      worker,
      deployments,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao carregar detalhes do Worker ${scriptName}.`

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'cfpw',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'worker-details',
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
