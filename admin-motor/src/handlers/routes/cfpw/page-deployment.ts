// GET /api/cfpw/page-deployment — detalhe de um deployment Pages (stages,
// deployment_trigger, aliases, url, environment) + logs em paralelo
// (allSettled com warnings parciais). Com logsOnly=true devolve apenas os
// logs — polling barato para acompanhar builds em andamento.
// DELETE /api/cfpw/page-deployment — remove um deployment específico
// (force=true para deployments com aliases ativos).

import {
  deleteCloudflarePagesDeployment,
  getCloudflarePagesDeployment,
  getCloudflarePagesDeploymentLogs,
  resolveCloudflarePwAccount,
} from '../_lib/cfpw-api';
import { createResponseTrace } from '../_lib/request-trace';
import {
  type CfpwRouteContext,
  getRouteEnv,
  logCfpwEvent,
  type PartialWarning,
  resolveCfpwErrorStatus,
  toErrorResponse,
  toJsonResponse,
} from './_respond';

export async function onRequestGet(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const projectName = String(url.searchParams.get('projectName') ?? '').trim();
  const deploymentId = String(url.searchParams.get('deploymentId') ?? '').trim();
  const logsOnly = url.searchParams.get('logsOnly') === 'true';

  if (!projectName || !deploymentId) {
    return toErrorResponse('Parâmetros projectName e deploymentId são obrigatórios.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    if (logsOnly) {
      const logs = await getCloudflarePagesDeploymentLogs(env, accountInfo.accountId, projectName, deploymentId);

      await logCfpwEvent(env, 'page-deployment-get', true, {
        accountId: accountInfo.accountId,
        projectName,
        deploymentId,
        logsOnly: true,
      });

      return toJsonResponse({ ok: true, ...trace, projectName, deploymentId, logs, warnings: [] });
    }

    const [deploymentResult, logsResult] = await Promise.allSettled([
      getCloudflarePagesDeployment(env, accountInfo.accountId, projectName, deploymentId),
      getCloudflarePagesDeploymentLogs(env, accountInfo.accountId, projectName, deploymentId),
    ]);

    const warnings: PartialWarning[] = [];
    const deployment = deploymentResult.status === 'fulfilled' ? deploymentResult.value : null;
    const logs = logsResult.status === 'fulfilled' ? logsResult.value : null;

    if (deploymentResult.status === 'rejected') {
      warnings.push({
        code: 'CFPW-PAGE-DEPLOYMENT-PARTIAL-DETAIL',
        message:
          deploymentResult.reason instanceof Error
            ? deploymentResult.reason.message
            : 'Falha ao ler o detalhe do deployment.',
      });
    }
    if (logsResult.status === 'rejected') {
      warnings.push({
        code: 'CFPW-PAGE-DEPLOYMENT-PARTIAL-LOGS',
        message: logsResult.reason instanceof Error ? logsResult.reason.message : 'Falha ao ler logs do deployment.',
      });
    }

    if (!deployment && !logs) {
      throw deploymentResult.status === 'rejected'
        ? deploymentResult.reason
        : new Error(`Falha ao carregar o deployment ${deploymentId} do projeto ${projectName}.`);
    }

    await logCfpwEvent(env, 'page-deployment-get', true, {
      accountId: accountInfo.accountId,
      projectName,
      deploymentId,
      logsOnly: false,
      partialWarnings: warnings.length,
    });

    return toJsonResponse({ ok: true, ...trace, projectName, deploymentId, deployment, logs, warnings });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `Falha ao carregar o deployment ${deploymentId} do projeto ${projectName}.`;
    await logCfpwEvent(env, 'page-deployment-get', false, { projectName, deploymentId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestDelete(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const projectName = String(url.searchParams.get('projectName') ?? '').trim();
  const deploymentId = String(url.searchParams.get('deploymentId') ?? '').trim();

  if (!projectName || !deploymentId) {
    return toErrorResponse('Parâmetros projectName e deploymentId são obrigatórios.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    // force=true: sem isso a CF recusa remover deployments com aliases ativos.
    await deleteCloudflarePagesDeployment(env, accountInfo.accountId, projectName, deploymentId, true);

    await logCfpwEvent(env, 'page-deployment-delete', true, {
      accountId: accountInfo.accountId,
      projectName,
      deploymentId,
    });

    return toJsonResponse({ ok: true, ...trace, projectName, deploymentId, deleted: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `Falha ao remover o deployment ${deploymentId} do projeto ${projectName}.`;
    await logCfpwEvent(env, 'page-deployment-delete', false, { projectName, deploymentId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}
