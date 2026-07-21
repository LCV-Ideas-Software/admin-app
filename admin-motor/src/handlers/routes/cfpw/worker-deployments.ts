// POST /api/cfpw/worker-deployments — cria um deployment gradual (1-2 versões
// com porcentagens somando 100) via helper deployCloudflareWorkerVersion, com
// guard de worker protegido.

import { deployCloudflareWorkerVersion, resolveCloudflarePwAccount } from '../_lib/cfpw-api';
import { createResponseTrace } from '../_lib/request-trace';
import { assertWorkerMutationAllowed } from './_protected';
import {
  type CfpwRouteContext,
  getRouteEnv,
  logCfpwEvent,
  resolveCfpwErrorStatus,
  toErrorResponse,
  toJsonResponse,
} from './_respond';

type DeploymentsPayload = {
  scriptName?: unknown;
  versions?: unknown;
  message?: unknown;
  force?: unknown;
  confirmPhrase?: unknown;
};

export async function onRequestPost(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let payload: DeploymentsPayload;
  try {
    payload = (await context.request.json()) as DeploymentsPayload;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const scriptName = String(payload.scriptName ?? '').trim();
  const confirmPhrase = typeof payload.confirmPhrase === 'string' ? payload.confirmPhrase : undefined;
  const message = typeof payload.message === 'string' ? payload.message : undefined;
  const force = payload.force === true;

  if (!scriptName) {
    return toErrorResponse('Campo scriptName é obrigatório.', trace, 400);
  }

  const rawVersions = Array.isArray(payload.versions) ? payload.versions : [];
  if (rawVersions.length < 1 || rawVersions.length > 2) {
    return toErrorResponse('Informe 1 ou 2 versões em versions para o deploy gradual.', trace, 400);
  }

  const versions: Array<{ versionId: string; percentage: number }> = [];
  for (const rawVersion of rawVersions) {
    const record = (rawVersion ?? {}) as { versionId?: unknown; percentage?: unknown };
    const versionId = String(record.versionId ?? '').trim();
    const percentage = Number(record.percentage);
    if (!versionId) {
      return toErrorResponse('Cada versão precisa de versionId (string não vazia).', trace, 400);
    }
    if (!Number.isInteger(percentage) || percentage < 1 || percentage > 100) {
      return toErrorResponse(
        `Percentage inválido para a versão ${versionId}: use um inteiro entre 1 e 100.`,
        trace,
        400,
      );
    }
    versions.push({ versionId, percentage });
  }

  const totalPercentage = versions.reduce((sum, version) => sum + version.percentage, 0);
  if (totalPercentage !== 100) {
    return toErrorResponse(`As porcentagens precisam somar exatamente 100 (recebido: ${totalPercentage}).`, trace, 400);
  }

  try {
    assertWorkerMutationAllowed(scriptName, confirmPhrase);

    const accountInfo = await resolveCloudflarePwAccount(env);
    const deployment = await deployCloudflareWorkerVersion(env, accountInfo.accountId, scriptName, versions, {
      ...(message !== undefined ? { message } : {}),
      force,
    });

    await logCfpwEvent(env, 'worker-deployments', true, {
      accountId: accountInfo.accountId,
      scriptName,
      versions: versions.length,
      force,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      scriptName,
      deployment,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `Falha ao criar deployment do Worker ${scriptName}.`;
    await logCfpwEvent(env, 'worker-deployments', false, { scriptName }, errorMessage);
    return toErrorResponse(errorMessage, trace, resolveCfpwErrorStatus(error));
  }
}
