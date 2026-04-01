import { logModuleOperationalEvent } from '../_lib/operational'
import type { D1Database } from '../_lib/operational'
import { createResponseTrace } from '../_lib/request-trace'
import {
  addCloudflarePagesDomain,
  addCloudflareWorkerRoute,
  addCloudflareWorkerSecret,
  createCloudflarePagesProject,
  createCloudflareWorkerFromTemplate,
  deleteCloudflarePagesDomain,
  deleteCloudflareWorkerRoute,
  deleteCloudflareWorkerSecret,
  deployCloudflareWorkerVersion,
  getCloudflarePagesDeploymentLogs,
  getCloudflareWorkerSchedules,
  getCloudflareWorkerUsageModel,
  listCloudflarePagesDomains,
  listCloudflareWorkerRoutes,
  listCloudflareWorkerSecrets,
  listCloudflareWorkerVersions,
  resolveCloudflarePwAccount,
  retryCloudflarePagesDeployment,
  rollbackCloudflarePagesDeployment,
  runCloudflareRawRequest,
  updateCloudflarePagesProjectSettings,
  updateCloudflareWorkerSchedules,
  updateCloudflareWorkerUsageModel,
} from '../_lib/cfpw-api'

type Context = {
  request: Request
  env: {
    BIGDATA_DB?: D1Database
    CLOUDFLARE_PW?: string
    CF_ACCOUNT_ID?: string
  }
}

type OpsPayload = {
  action?: unknown
  scriptName?: unknown
  projectName?: unknown
  deploymentId?: unknown
  domainName?: unknown
  secretName?: unknown
  secretValue?: unknown
  usageModel?: unknown
  schedules?: unknown
  templateCode?: unknown
  projectBranch?: unknown
  pageSettingsJson?: unknown
  versionId?: unknown
  zoneId?: unknown
  routeId?: unknown
  routePattern?: unknown
  rawMethod?: unknown
  rawPath?: unknown
  rawBodyJson?: unknown
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

const normalizeSchedules = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as Array<{ cron: string }>
  }

  return value
    .map((item) => ({ cron: toText((item as { cron?: unknown })?.cron) }))
    .filter((item) => item.cron.length > 0)
}

export async function onRequestPost(context: Context) {
  const trace = createResponseTrace(context.request)

  let payload: OpsPayload
  try {
    payload = await context.request.json() as OpsPayload
  } catch {
    return toError('JSON inválido no corpo da requisição.', trace, 400)
  }

  const action = toText(payload.action)
  if (!action) {
    return toError('Campo action é obrigatório.', trace, 400)
  }

  const scriptName = toText(payload.scriptName)
  const projectName = toText(payload.projectName)
  const deploymentId = toText(payload.deploymentId)
  const domainName = toText(payload.domainName)
  const secretName = toText(payload.secretName)
  const secretValue = String(payload.secretValue ?? '')
  const usageModel = toText(payload.usageModel)
  const schedules = normalizeSchedules(payload.schedules)
  const templateCode = String(payload.templateCode ?? '')
  const projectBranch = toText(payload.projectBranch)
  const pageSettingsJson = String(payload.pageSettingsJson ?? '')
  const versionId = toText(payload.versionId)
  const zoneId = toText(payload.zoneId)
  const routeId = toText(payload.routeId)
  const routePattern = toText(payload.routePattern)
  const rawMethod = toText(payload.rawMethod)
  const rawPath = toText(payload.rawPath)
  const rawBodyJson = String(payload.rawBodyJson ?? '')

  try {
    const accountInfo = await resolveCloudflarePwAccount(context.env)

    let result: unknown = null

    switch (action) {
      case 'create-worker-from-template': {
        if (!scriptName) {
          return toError('scriptName é obrigatório para create-worker-from-template.', trace, 400)
        }
        result = await createCloudflareWorkerFromTemplate(context.env, accountInfo.accountId, scriptName, templateCode, usageModel)
        break
      }

      case 'get-worker-schedules': {
        if (!scriptName) {
          return toError('scriptName é obrigatório para get-worker-schedules.', trace, 400)
        }
        result = await getCloudflareWorkerSchedules(context.env, accountInfo.accountId, scriptName)
        break
      }

      case 'update-worker-schedules': {
        if (!scriptName) {
          return toError('scriptName é obrigatório para update-worker-schedules.', trace, 400)
        }
        result = await updateCloudflareWorkerSchedules(context.env, accountInfo.accountId, scriptName, schedules)
        break
      }

      case 'get-worker-usage-model': {
        if (!scriptName) {
          return toError('scriptName é obrigatório para get-worker-usage-model.', trace, 400)
        }
        result = await getCloudflareWorkerUsageModel(context.env, accountInfo.accountId, scriptName)
        break
      }

      case 'update-worker-usage-model': {
        if (!scriptName || !usageModel) {
          return toError('scriptName e usageModel são obrigatórios para update-worker-usage-model.', trace, 400)
        }
        result = await updateCloudflareWorkerUsageModel(context.env, accountInfo.accountId, scriptName, usageModel)
        break
      }

      case 'list-worker-secrets': {
        if (!scriptName) {
          return toError('scriptName é obrigatório para list-worker-secrets.', trace, 400)
        }
        result = await listCloudflareWorkerSecrets(context.env, accountInfo.accountId, scriptName)
        break
      }

      case 'add-worker-secret': {
        if (!scriptName || !secretName || !secretValue) {
          return toError('scriptName, secretName e secretValue são obrigatórios para add-worker-secret.', trace, 400)
        }
        result = await addCloudflareWorkerSecret(context.env, accountInfo.accountId, scriptName, secretName, secretValue)
        break
      }

      case 'delete-worker-secret': {
        if (!scriptName || !secretName) {
          return toError('scriptName e secretName são obrigatórios para delete-worker-secret.', trace, 400)
        }
        result = await deleteCloudflareWorkerSecret(context.env, accountInfo.accountId, scriptName, secretName)
        break
      }

      case 'create-page-project': {
        if (!projectName) {
          return toError('projectName é obrigatório para create-page-project.', trace, 400)
        }
        result = await createCloudflarePagesProject(context.env, accountInfo.accountId, projectName, projectBranch)
        break
      }

      case 'update-page-project-settings': {
        if (!projectName) {
          return toError('projectName é obrigatório para update-page-project-settings.', trace, 400)
        }

        let parsedSettings: Record<string, unknown> = {}
        if (pageSettingsJson.trim()) {
          try {
            parsedSettings = JSON.parse(pageSettingsJson) as Record<string, unknown>
          } catch {
            return toError('pageSettingsJson inválido: informe JSON válido para update-page-project-settings.', trace, 400)
          }
        }

        result = await updateCloudflarePagesProjectSettings(context.env, accountInfo.accountId, projectName, parsedSettings)
        break
      }

      case 'list-page-domains': {
        if (!projectName) {
          return toError('projectName é obrigatório para list-page-domains.', trace, 400)
        }
        result = await listCloudflarePagesDomains(context.env, accountInfo.accountId, projectName)
        break
      }

      case 'add-page-domain': {
        if (!projectName || !domainName) {
          return toError('projectName e domainName são obrigatórios para add-page-domain.', trace, 400)
        }
        result = await addCloudflarePagesDomain(context.env, accountInfo.accountId, projectName, domainName)
        break
      }

      case 'delete-page-domain': {
        if (!projectName || !domainName) {
          return toError('projectName e domainName são obrigatórios para delete-page-domain.', trace, 400)
        }
        result = await deleteCloudflarePagesDomain(context.env, accountInfo.accountId, projectName, domainName)
        break
      }

      case 'retry-page-deployment': {
        if (!projectName || !deploymentId) {
          return toError('projectName e deploymentId são obrigatórios para retry-page-deployment.', trace, 400)
        }
        result = await retryCloudflarePagesDeployment(context.env, accountInfo.accountId, projectName, deploymentId)
        break
      }

      case 'rollback-page-deployment': {
        if (!projectName || !deploymentId) {
          return toError('projectName e deploymentId são obrigatórios para rollback-page-deployment.', trace, 400)
        }
        result = await rollbackCloudflarePagesDeployment(context.env, accountInfo.accountId, projectName, deploymentId)
        break
      }

      case 'get-page-deployment-logs': {
        if (!projectName || !deploymentId) {
          return toError('projectName e deploymentId são obrigatórios para get-page-deployment-logs.', trace, 400)
        }
        result = await getCloudflarePagesDeploymentLogs(context.env, accountInfo.accountId, projectName, deploymentId)
        break
      }

      case 'list-worker-versions': {
        if (!scriptName) {
          return toError('scriptName é obrigatório para list-worker-versions.', trace, 400)
        }
        result = await listCloudflareWorkerVersions(context.env, accountInfo.accountId, scriptName)
        break
      }

      case 'deploy-worker-version': {
        if (!scriptName || !versionId) {
          return toError('scriptName e versionId são obrigatórios para deploy-worker-version.', trace, 400)
        }
        result = await deployCloudflareWorkerVersion(context.env, accountInfo.accountId, scriptName, versionId)
        break
      }

      case 'list-worker-routes': {
        if (!zoneId) {
          return toError('zoneId é obrigatório para list-worker-routes.', trace, 400)
        }
        result = await listCloudflareWorkerRoutes(context.env, zoneId)
        break
      }

      case 'add-worker-route': {
        if (!zoneId || !routePattern || !scriptName) {
          return toError('zoneId, routePattern e scriptName são obrigatórios para add-worker-route.', trace, 400)
        }
        result = await addCloudflareWorkerRoute(context.env, zoneId, routePattern, scriptName)
        break
      }

      case 'delete-worker-route': {
        if (!zoneId || !routeId) {
          return toError('zoneId e routeId são obrigatórios para delete-worker-route.', trace, 400)
        }
        result = await deleteCloudflareWorkerRoute(context.env, zoneId, routeId)
        break
      }

      case 'raw-cloudflare-request': {
        if (!rawMethod || !rawPath) {
          return toError('rawMethod e rawPath são obrigatórios para raw-cloudflare-request.', trace, 400)
        }
        result = await runCloudflareRawRequest(context.env, rawMethod, rawPath, rawBodyJson)
        break
      }

      default:
        return toError(`Ação não suportada: ${action}`, trace, 400)
    }

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'cfpw',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: `ops:${action}`,
            provider: 'cloudflare-api',
            accountId: accountInfo.accountId,
            scriptName: scriptName || null,
            projectName: projectName || null,
            deploymentId: deploymentId || null,
            domainName: domainName || null,
          },
        })
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      ...trace,
      action,
      accountId: accountInfo.accountId,
      result,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao executar ação ${action}.`

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'cfpw',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: `ops:${action}`,
            provider: 'cloudflare-api',
            scriptName: scriptName || null,
            projectName: projectName || null,
            deploymentId: deploymentId || null,
            domainName: domainName || null,
          },
        })
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return toError(message, trace, 502)
  }
}
