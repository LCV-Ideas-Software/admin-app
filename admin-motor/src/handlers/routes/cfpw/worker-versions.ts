// GET /api/cfpw/worker-versions — lista versões do Worker (passthrough CF)
// enriquecidas com o deployment ativo (active/percentage por versão).
// GET /api/cfpw/worker-version — detalhe de uma versão (passthrough CF).

import { cfApiRequest } from '../_lib/cf-api-core';
import { resolveCloudflarePwAccount } from '../_lib/cfpw-api';
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

const DEFAULT_PER_PAGE = 25;

const toPositiveInt = (raw: string | null, fallback: number): number | null => {
  if (raw === null || raw.trim() === '') {
    return fallback;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : null;
};

// A API CF devolve as listas ora como array direto, ora embrulhadas em um
// objeto ({items}/{deployments}); normaliza os dois formatos.
const toItemsArray = (result: unknown, wrapperKey: string): Array<Record<string, unknown>> => {
  if (Array.isArray(result)) {
    return result as Array<Record<string, unknown>>;
  }
  const wrapped = (result as Record<string, unknown> | null)?.[wrapperKey];
  return Array.isArray(wrapped) ? (wrapped as Array<Record<string, unknown>>) : [];
};

export async function onRequestGetList(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const scriptName = String(url.searchParams.get('scriptName') ?? '').trim();

  if (!scriptName) {
    return toErrorResponse('Parâmetro scriptName é obrigatório.', trace, 400);
  }

  const page = toPositiveInt(url.searchParams.get('page'), 1);
  const perPage = toPositiveInt(url.searchParams.get('perPage'), DEFAULT_PER_PAGE);
  if (page === null || perPage === null) {
    return toErrorResponse('Parâmetros page e perPage precisam ser inteiros positivos.', trace, 400);
  }

  const deployable = url.searchParams.get('deployable') === 'true';

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const encodedAccountId = encodeURIComponent(accountInfo.accountId);
    const encodedScript = encodeURIComponent(scriptName);

    const search = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (deployable) {
      search.set('deployable', 'true');
    }

    const versionsPayload = await cfApiRequest<unknown>(
      env,
      'pw',
      `/accounts/${encodedAccountId}/workers/scripts/${encodedScript}/versions?${search.toString()}`,
      `Falha ao listar versões do Worker ${scriptName}`,
    );
    const rawVersions = toItemsArray(versionsPayload.result, 'items');

    // Enriquecimento: o primeiro deployment listado é o ativo; mapeia
    // versionId → percentage. Falha aqui não derruba a listagem.
    const warnings: PartialWarning[] = [];
    const percentageByVersionId = new Map<string, number>();
    let activeDeployment: Record<string, unknown> | null = null;
    try {
      const deploymentsPayload = await cfApiRequest<unknown>(
        env,
        'pw',
        `/accounts/${encodedAccountId}/workers/scripts/${encodedScript}/deployments`,
        `Falha ao listar deployments do Worker ${scriptName}`,
      );
      const deployments = toItemsArray(deploymentsPayload.result, 'deployments');
      activeDeployment = deployments[0] ?? null;
      const activeVersions = Array.isArray(activeDeployment?.versions) ? activeDeployment.versions : [];
      for (const entry of activeVersions) {
        const record = (entry ?? {}) as { version_id?: unknown; percentage?: unknown };
        const versionId = String(record.version_id ?? '').trim();
        const percentage = Number(record.percentage);
        if (versionId && Number.isFinite(percentage)) {
          percentageByVersionId.set(versionId, percentage);
        }
      }
    } catch (error) {
      warnings.push({
        code: 'CFPW-WORKER-VERSIONS-PARTIAL-DEPLOYMENTS',
        message: error instanceof Error ? error.message : String(error),
      });
    }

    const versions = rawVersions.map((version) => {
      const versionId = String(version.id ?? '').trim();
      const percentage = percentageByVersionId.get(versionId);
      return {
        ...version,
        active: percentageByVersionId.has(versionId),
        ...(percentage !== undefined ? { percentage } : {}),
      };
    });

    await logCfpwEvent(env, 'worker-versions', true, {
      accountId: accountInfo.accountId,
      scriptName,
      page,
      perPage,
      versions: versions.length,
      partialWarnings: warnings.length,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      scriptName,
      versions,
      pagination: versionsPayload.resultInfo ?? null,
      activeDeployment,
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao listar versões do Worker ${scriptName}.`;
    await logCfpwEvent(env, 'worker-versions', false, { scriptName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestGetDetail(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const scriptName = String(url.searchParams.get('scriptName') ?? '').trim();
  const versionId = String(url.searchParams.get('versionId') ?? '').trim();

  if (!scriptName || !versionId) {
    return toErrorResponse('Parâmetros scriptName e versionId são obrigatórios.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    const versionPayload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/workers/scripts/${encodeURIComponent(scriptName)}/versions/${encodeURIComponent(versionId)}`,
      `Falha ao ler a versão ${versionId} do Worker ${scriptName}`,
    );

    await logCfpwEvent(env, 'worker-version-detail', true, {
      accountId: accountInfo.accountId,
      scriptName,
      versionId,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      scriptName,
      versionId,
      version: versionPayload.result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Falha ao ler a versão ${versionId} do Worker ${scriptName}.`;
    await logCfpwEvent(env, 'worker-version-detail', false, { scriptName, versionId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}
