import {
  addCloudflarePagesDomain,
  addCloudflareWorkerRoute,
  addCloudflareWorkerSecret,
  createCloudflarePagesProject,
  deleteCloudflarePagesDomain,
  deleteCloudflareWorkerRoute,
  deleteCloudflareWorkerSecret,
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
} from '../_lib/cfpw-api';
import type { D1Database } from '../_lib/operational';
import { logModuleOperationalEvent } from '../_lib/operational';
import { createResponseTrace } from '../_lib/request-trace';

type Context = {
  request: Request;
  env: {
    BIGDATA_DB?: D1Database;
    CLOUDFLARE_PW?: string;
    CF_ACCOUNT_ID?: string;
  };
};

type OpsPayload = {
  action?: unknown;
  scriptName?: unknown;
  projectName?: unknown;
  deploymentId?: unknown;
  domainName?: unknown;
  secretName?: unknown;
  secretValue?: unknown;
  usageModel?: unknown;
  schedules?: unknown;
  projectBranch?: unknown;
  pageSettingsJson?: unknown;
  zoneId?: unknown;
  routeId?: unknown;
  routePattern?: unknown;
  rawMethod?: unknown;
  rawPath?: unknown;
  rawBodyJson?: unknown;
};

const toHeaders = () => ({
  'Content-Type': 'application/json',
});

const toError = (message: string, trace: { request_id: string; timestamp: string }, status = 500) =>
  new Response(
    JSON.stringify({
      ok: false,
      ...trace,
      error: message,
    }),
    {
      status,
      headers: toHeaders(),
    },
  );

const toText = (value: unknown) => String(value ?? '').trim();

const normalizeSchedules = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as Array<{ cron: string }>;
  }

  return value
    .map((item) => ({ cron: toText((item as { cron?: unknown })?.cron) }))
    .filter((item) => item.cron.length > 0);
};

const resolveOpsErrorStatus = (message: string) => {
  const normalized = message.toLowerCase();

  if (normalized.includes('token cloudflare ausente')) {
    return 503;
  }

  if (normalized.includes('invalid access token') || normalized.includes('authentication error')) {
    return 401;
  }

  if (
    normalized.includes('retry indisponível para deployment') ||
    normalized.includes('cannot retry a direct upload deployment')
  ) {
    return 409;
  }

  if (normalized.includes('rollback') && normalized.includes('only') && normalized.includes('production')) {
    return 409;
  }

  return 502;
};

export async function onRequestPost(context: Context) {
  const trace = createResponseTrace(context.request);

  let payload: OpsPayload;
  try {
    payload = (await context.request.json()) as OpsPayload;
  } catch {
    return toError('JSON inválido no corpo da requisição.', trace, 400);
  }

  const action = toText(payload.action);
  if (!action) {
    return toError('Campo action é obrigatório.', trace, 400);
  }

  const scriptName = toText(payload.scriptName);
  const projectName = toText(payload.projectName);
  const deploymentId = toText(payload.deploymentId);
  const domainName = toText(payload.domainName);
  const secretName = toText(payload.secretName);
  const secretValue = String(payload.secretValue ?? '');
  const usageModel = toText(payload.usageModel);
  const schedules = normalizeSchedules(payload.schedules);
  const projectBranch = toText(payload.projectBranch);
  const pageSettingsJson = String(payload.pageSettingsJson ?? '');
  const zoneId = toText(payload.zoneId);
  const routeId = toText(payload.routeId);
  const routePattern = toText(payload.routePattern);
  const rawMethod = toText(payload.rawMethod);
  const rawPath = toText(payload.rawPath);
  const rawBodyJson = String(payload.rawBodyJson ?? '');

  try {
    const accountInfo = await resolveCloudflarePwAccount((context as any).data?.env || context.env);

    let result: unknown = null;

    switch (action) {
      case 'get-worker-schedules': {
        if (!scriptName) {
          return toError('scriptName é obrigatório para get-worker-schedules.', trace, 400);
        }
        result = await getCloudflareWorkerSchedules(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          scriptName,
        );
        break;
      }

      case 'update-worker-schedules': {
        if (!scriptName) {
          return toError('scriptName é obrigatório para update-worker-schedules.', trace, 400);
        }
        result = await updateCloudflareWorkerSchedules(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          scriptName,
          schedules,
        );
        break;
      }

      case 'get-worker-usage-model': {
        if (!scriptName) {
          return toError('scriptName é obrigatório para get-worker-usage-model.', trace, 400);
        }
        result = await getCloudflareWorkerUsageModel(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          scriptName,
        );
        break;
      }

      case 'update-worker-usage-model': {
        if (!scriptName || !usageModel) {
          return toError('scriptName e usageModel são obrigatórios para update-worker-usage-model.', trace, 400);
        }
        result = await updateCloudflareWorkerUsageModel(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          scriptName,
          usageModel,
        );
        break;
      }

      case 'list-worker-secrets': {
        if (!scriptName) {
          return toError('scriptName é obrigatório para list-worker-secrets.', trace, 400);
        }
        result = await listCloudflareWorkerSecrets(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          scriptName,
        );
        break;
      }

      case 'add-worker-secret': {
        if (!scriptName || !secretName || !secretValue) {
          return toError('scriptName, secretName e secretValue são obrigatórios para add-worker-secret.', trace, 400);
        }
        result = await addCloudflareWorkerSecret(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          scriptName,
          secretName,
          secretValue,
        );
        break;
      }

      case 'delete-worker-secret': {
        if (!scriptName || !secretName) {
          return toError('scriptName e secretName são obrigatórios para delete-worker-secret.', trace, 400);
        }
        result = await deleteCloudflareWorkerSecret(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          scriptName,
          secretName,
        );
        break;
      }

      case 'create-page-project': {
        if (!projectName) {
          return toError('projectName é obrigatório para create-page-project.', trace, 400);
        }
        result = await createCloudflarePagesProject(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          projectName,
          projectBranch,
        );
        break;
      }

      case 'update-page-project-settings': {
        if (!projectName) {
          return toError('projectName é obrigatório para update-page-project-settings.', trace, 400);
        }

        let parsedSettings: Record<string, unknown> = {};
        if (pageSettingsJson.trim()) {
          try {
            parsedSettings = JSON.parse(pageSettingsJson) as Record<string, unknown>;
          } catch {
            return toError(
              'pageSettingsJson inválido: informe JSON válido para update-page-project-settings.',
              trace,
              400,
            );
          }
        }

        result = await updateCloudflarePagesProjectSettings(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          projectName,
          parsedSettings,
        );
        break;
      }

      case 'list-page-domains': {
        if (!projectName) {
          return toError('projectName é obrigatório para list-page-domains.', trace, 400);
        }
        result = await listCloudflarePagesDomains(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          projectName,
        );
        break;
      }

      case 'add-page-domain': {
        if (!projectName || !domainName) {
          return toError('projectName e domainName são obrigatórios para add-page-domain.', trace, 400);
        }
        result = await addCloudflarePagesDomain(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          projectName,
          domainName,
        );
        break;
      }

      case 'delete-page-domain': {
        if (!projectName || !domainName) {
          return toError('projectName e domainName são obrigatórios para delete-page-domain.', trace, 400);
        }
        result = await deleteCloudflarePagesDomain(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          projectName,
          domainName,
        );
        break;
      }

      case 'retry-page-deployment': {
        if (!projectName || !deploymentId) {
          return toError('projectName e deploymentId são obrigatórios para retry-page-deployment.', trace, 400);
        }
        result = await retryCloudflarePagesDeployment(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          projectName,
          deploymentId,
        );
        break;
      }

      case 'rollback-page-deployment': {
        if (!projectName || !deploymentId) {
          return toError('projectName e deploymentId são obrigatórios para rollback-page-deployment.', trace, 400);
        }
        result = await rollbackCloudflarePagesDeployment(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          projectName,
          deploymentId,
        );
        break;
      }

      case 'get-page-deployment-logs': {
        if (!projectName || !deploymentId) {
          return toError('projectName e deploymentId são obrigatórios para get-page-deployment-logs.', trace, 400);
        }
        result = await getCloudflarePagesDeploymentLogs(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          projectName,
          deploymentId,
        );
        break;
      }

      case 'list-worker-versions': {
        if (!scriptName) {
          return toError('scriptName é obrigatório para list-worker-versions.', trace, 400);
        }
        result = await listCloudflareWorkerVersions(
          (context as any).data?.env || context.env,
          accountInfo.accountId,
          scriptName,
        );
        break;
      }

      case 'list-worker-routes': {
        if (!zoneId) {
          return toError('zoneId é obrigatório para list-worker-routes.', trace, 400);
        }
        result = await listCloudflareWorkerRoutes((context as any).data?.env || context.env, zoneId);
        break;
      }

      case 'add-worker-route': {
        if (!zoneId || !routePattern || !scriptName) {
          return toError('zoneId, routePattern e scriptName são obrigatórios para add-worker-route.', trace, 400);
        }
        result = await addCloudflareWorkerRoute(
          (context as any).data?.env || context.env,
          zoneId,
          routePattern,
          scriptName,
        );
        break;
      }

      case 'delete-worker-route': {
        if (!zoneId || !routeId) {
          return toError('zoneId e routeId são obrigatórios para delete-worker-route.', trace, 400);
        }
        result = await deleteCloudflareWorkerRoute((context as any).data?.env || context.env, zoneId, routeId);
        break;
      }

      case 'raw-cloudflare-request': {
        if (!rawMethod || !rawPath) {
          return toError('rawMethod e rawPath são obrigatórios para raw-cloudflare-request.', trace, 400);
        }
        result = await runCloudflareRawRequest(
          (context as any).data?.env || context.env,
          rawMethod,
          rawPath,
          rawBodyJson,
        );
        break;
      }

      default:
        return toError(`Ação não suportada: ${action}`, trace, 400);
    }

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
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
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        action,
        accountId: accountInfo.accountId,
        result,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao executar ação ${action}.`;

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
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
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return toError(message, trace, resolveOpsErrorStatus(message));
  }
}
