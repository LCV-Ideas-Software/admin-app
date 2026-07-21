// POST /api/cfpw/page-project — cria um projeto Pages (nome + production
// branch, build config opcional e conexão GitHub opcional; o GitHub App da
// Cloudflare precisa já estar autorizado na conta).
// PATCH /api/cfpw/page-build-config — atualiza o build_config do projeto com
// read-modify-write (GET do projeto + merge apenas dos campos enviados).
// POST /api/cfpw/page-purge-build-cache — expurga o cache de build do projeto.

import { CfApiError, cfApiRequest } from '../_lib/cf-api-core';
import { getCloudflarePagesProject, resolveCloudflarePwAccount } from '../_lib/cfpw-api';
import { createResponseTrace } from '../_lib/request-trace';
import {
  type CfpwRouteContext,
  getRouteEnv,
  logCfpwEvent,
  resolveCfpwErrorStatus,
  toErrorResponse,
  toJsonResponse,
} from './_respond';

const PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,57}$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type CreateProjectPayload = {
  name?: unknown;
  productionBranch?: unknown;
  buildConfig?: unknown;
  source?: unknown;
};

const isNameConflict = (error: unknown): error is CfApiError =>
  error instanceof CfApiError &&
  (error.status === 409 ||
    error.errors.some((detail) => /already exists|already in use|duplicate/i.test(detail.message)));

/** Monta o build_config CF apenas com os campos enviados (undefined = intocado). */
const toCfBuildConfigPatch = (fields: {
  buildCommand?: unknown;
  destinationDir?: unknown;
  rootDir?: unknown;
  buildCaching?: unknown;
}): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  if (fields.buildCommand !== undefined) {
    patch.build_command = fields.buildCommand === null ? null : String(fields.buildCommand);
  }
  if (fields.destinationDir !== undefined) {
    patch.destination_dir = fields.destinationDir === null ? null : String(fields.destinationDir);
  }
  if (fields.rootDir !== undefined) {
    patch.root_dir = fields.rootDir === null ? null : String(fields.rootDir);
  }
  if (fields.buildCaching !== undefined) {
    patch.build_caching = Boolean(fields.buildCaching);
  }
  return patch;
};

export async function onRequestPost(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let payload: CreateProjectPayload;
  try {
    payload = (await context.request.json()) as CreateProjectPayload;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const name = String(payload.name ?? '').trim();
  const productionBranch = String(payload.productionBranch ?? '').trim() || 'main';

  if (!PROJECT_NAME_PATTERN.test(name)) {
    return toErrorResponse(
      'Nome de projeto Pages inválido: use apenas letras minúsculas, dígitos e hífens, iniciando com letra ou dígito, com no máximo 58 caracteres.',
      trace,
      400,
    );
  }

  let source: { owner: string; repoName: string } | null = null;
  if (payload.source !== undefined && payload.source !== null) {
    if (!isPlainObject(payload.source)) {
      return toErrorResponse('Campo source inválido: envie um objeto {owner, repoName}.', trace, 400);
    }
    const owner = String(payload.source.owner ?? '').trim();
    const repoName = String(payload.source.repoName ?? '').trim();
    if (!owner || !repoName) {
      return toErrorResponse(
        'Campos source.owner e source.repoName são obrigatórios para conectar o repositório.',
        trace,
        400,
      );
    }
    source = { owner, repoName };
  }

  let buildConfig: Record<string, unknown> | null = null;
  if (payload.buildConfig !== undefined && payload.buildConfig !== null) {
    if (!isPlainObject(payload.buildConfig)) {
      return toErrorResponse(
        'Campo buildConfig inválido: envie um objeto {buildCommand?, destinationDir?, rootDir?}.',
        trace,
        400,
      );
    }
    const patch = toCfBuildConfigPatch(payload.buildConfig);
    buildConfig = Object.keys(patch).length > 0 ? patch : null;
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    const body: Record<string, unknown> = {
      name,
      production_branch: productionBranch,
      ...(buildConfig ? { build_config: buildConfig } : {}),
      ...(source
        ? {
            source: {
              type: 'github',
              config: {
                owner: source.owner,
                repo_name: source.repoName,
                production_branch: productionBranch,
                deployments_enabled: true,
              },
            },
          }
        : {}),
    };

    const createPayload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/pages/projects`,
      `Falha ao criar projeto Pages ${name}`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );

    await logCfpwEvent(env, 'page-project-create', true, {
      accountId: accountInfo.accountId,
      projectName: name,
      productionBranch,
      withSource: source !== null,
      withBuildConfig: buildConfig !== null,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      accountId: accountInfo.accountId,
      projectName: name,
      project: createPayload.result,
    });
  } catch (error) {
    let message: string;
    let status: number;
    if (isNameConflict(error)) {
      const detail = error.apiMessage ? `código CF ${error.code}: ${error.apiMessage}` : `HTTP ${error.status}`;
      message = `Já existe um projeto Pages com esse nome ('${name}') na conta Cloudflare — escolha outro nome ou remova o projeto existente (${detail}).`;
      status = 409;
    } else if (source && error instanceof CfApiError && error.status >= 400 && error.status <= 499) {
      // Conexão Git rejeitada: o caso típico é o GitHub App da Cloudflare Pages
      // ainda não autorizado na conta — a API não tem endpoint para autorizar.
      const detail = error.apiMessage ? `código CF ${error.code}: ${error.apiMessage}` : `HTTP ${error.status}`;
      message = `A Cloudflare rejeitou a conexão com o repositório ${source.owner}/${source.repoName} — o GitHub precisa já estar autorizado na conta: instale o GitHub App da Cloudflare Pages no dashboard (Workers & Pages → Create → Pages → Connect to Git) e tente novamente (${detail}).`;
      status = error.status;
    } else {
      message = error instanceof Error ? error.message : `Falha ao criar projeto Pages ${name}.`;
      status = resolveCfpwErrorStatus(error);
    }

    await logCfpwEvent(env, 'page-project-create', false, { projectName: name }, message);
    return toErrorResponse(message, trace, status);
  }
}

type PatchBuildConfigPayload = {
  projectName?: unknown;
  buildCommand?: unknown;
  destinationDir?: unknown;
  rootDir?: unknown;
  buildCaching?: unknown;
};

export async function onRequestPatchBuildConfig(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let payload: PatchBuildConfigPayload;
  try {
    payload = (await context.request.json()) as PatchBuildConfigPayload;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const projectName = String(payload.projectName ?? '').trim();
  if (!projectName) {
    return toErrorResponse('Campo projectName é obrigatório.', trace, 400);
  }

  const patch = toCfBuildConfigPatch(payload);
  if (Object.keys(patch).length === 0) {
    return toErrorResponse(
      'Nenhum campo de build config enviado: informe buildCommand, destinationDir, rootDir e/ou buildCaching.',
      trace,
      400,
    );
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    // Read-modify-write: preserva os campos do build_config que não vieram no
    // corpo (o PATCH da CF substitui o objeto build_config por inteiro).
    const project = (await getCloudflarePagesProject(env, accountInfo.accountId, projectName)) as Record<
      string,
      unknown
    >;
    const existing = isPlainObject(project?.build_config) ? project.build_config : {};
    const merged = { ...existing, ...patch };

    const patchPayload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/pages/projects/${encodeURIComponent(projectName)}`,
      `Falha ao atualizar build config do projeto ${projectName}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ build_config: merged }),
      },
    );

    await logCfpwEvent(env, 'page-build-config-patch', true, {
      accountId: accountInfo.accountId,
      projectName,
      keys: Object.keys(patch),
    });

    const result = patchPayload.result;
    return toJsonResponse({
      ok: true,
      ...trace,
      projectName,
      project: result,
      buildConfig: isPlainObject(result?.build_config) ? result.build_config : merged,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Falha ao atualizar build config do projeto ${projectName}.`;
    await logCfpwEvent(env, 'page-build-config-patch', false, { projectName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

type PurgeBuildCachePayload = {
  projectName?: unknown;
};

export async function onRequestPostPurgeBuildCache(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let payload: PurgeBuildCachePayload;
  try {
    payload = (await context.request.json()) as PurgeBuildCachePayload;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const projectName = String(payload.projectName ?? '').trim();
  if (!projectName) {
    return toErrorResponse('Campo projectName é obrigatório.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    await cfApiRequest<unknown>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/pages/projects/${encodeURIComponent(projectName)}/purge_build_cache`,
      `Falha ao expurgar o cache de build do projeto ${projectName}`,
      {
        method: 'POST',
      },
    );

    await logCfpwEvent(env, 'page-purge-build-cache', true, {
      accountId: accountInfo.accountId,
      projectName,
    });

    return toJsonResponse({ ok: true, ...trace, projectName, purged: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Falha ao expurgar o cache de build do projeto ${projectName}.`;
    await logCfpwEvent(env, 'page-purge-build-cache', false, { projectName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}
