// GET /api/cfpw/page-env — variáveis e bindings de um ambiente (production ou
// preview) do projeto Pages, mapeados a partir de deployment_configs. Secrets
// chegam sem value (a CF nunca devolve o valor de secret_text) — passthrough.
// PATCH /api/cfpw/page-env — read-modify-write por ambiente: aplica somente as
// chaves alteradas (null remove a chave — semântica de merge per-key do PATCH
// de deployment_configs da CF, a mesma usada pelo update-page-project-settings
// legado). Valores NUNCA vão para a telemetria (apenas contagens).

import { cfApiRequest } from '../_lib/cf-api-core';
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

const ENVIRONMENTS = ['production', 'preview'] as const;

type PagesEnvironment = (typeof ENVIRONMENTS)[number];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Grupos de bindings Pages: chave da API deste handler ↔ chave CF em deployment_configs. */
const BINDING_GROUPS = [
  { api: 'kvNamespaces', cf: 'kv_namespaces' },
  { api: 'd1Databases', cf: 'd1_databases' },
  { api: 'r2Buckets', cf: 'r2_buckets' },
  { api: 'services', cf: 'services' },
  { api: 'durableObjectNamespaces', cf: 'durable_object_namespaces' },
  { api: 'queueProducers', cf: 'queue_producers' },
  { api: 'analyticsEngineDatasets', cf: 'analytics_engine_datasets' },
  { api: 'aiBindings', cf: 'ai_bindings' },
  { api: 'hyperdriveBindings', cf: 'hyperdrive_bindings' },
  { api: 'browsers', cf: 'browsers' },
  { api: 'vectorizeBindings', cf: 'vectorize_bindings' },
] as const;

const toEnvironment = (raw: string): PagesEnvironment | null =>
  (ENVIRONMENTS as readonly string[]).includes(raw) ? (raw as PagesEnvironment) : null;

/** Extrai deployment_configs[env] do projeto (objeto vazio quando ausente). */
const readDeploymentConfig = (project: Record<string, unknown>, environment: PagesEnvironment) => {
  const configs = isPlainObject(project.deployment_configs) ? project.deployment_configs : {};
  return isPlainObject(configs[environment]) ? (configs[environment] as Record<string, unknown>) : {};
};

/** Visão da API deste handler para um deployment_config CF (env vars + bindings + compat). */
const toEnvView = (config: Record<string, unknown>) => {
  const bindings: Record<string, Record<string, unknown>> = {};
  for (const group of BINDING_GROUPS) {
    bindings[group.api] = isPlainObject(config[group.cf]) ? (config[group.cf] as Record<string, unknown>) : {};
  }
  return {
    envVars: isPlainObject(config.env_vars) ? config.env_vars : {},
    bindings,
    compatibilityDate: typeof config.compatibility_date === 'string' ? config.compatibility_date : null,
    compatibilityFlags: Array.isArray(config.compatibility_flags) ? config.compatibility_flags : [],
  };
};

export async function onRequestGet(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const projectName = String(url.searchParams.get('projectName') ?? '').trim();
  const environment = toEnvironment(String(url.searchParams.get('environment') ?? '').trim());

  if (!projectName) {
    return toErrorResponse('Parâmetro projectName é obrigatório.', trace, 400);
  }
  if (!environment) {
    return toErrorResponse("Parâmetro environment é obrigatório: use 'production' ou 'preview'.", trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const project = (await getCloudflarePagesProject(env, accountInfo.accountId, projectName)) as Record<
      string,
      unknown
    >;
    const view = toEnvView(readDeploymentConfig(project, environment));

    await logCfpwEvent(env, 'page-env-get', true, {
      accountId: accountInfo.accountId,
      projectName,
      environment,
      envVarCount: Object.keys(view.envVars).length,
    });

    return toJsonResponse({ ok: true, ...trace, projectName, environment, ...view });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Falha ao ler variáveis do ambiente ${environment} de ${projectName}.`;
    await logCfpwEvent(env, 'page-env-get', false, { projectName, environment }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

type PatchEnvPayload = {
  projectName?: unknown;
  environment?: unknown;
  envVars?: unknown;
  bindings?: unknown;
};

/**
 * Valida e normaliza envVars do corpo. Devolve o objeto CF (null = remover a
 * chave) ou uma mensagem de erro pt-BR.
 */
const normalizeEnvVarsPatch = (
  raw: Record<string, unknown>,
): { patch?: Record<string, unknown | null>; error?: string } => {
  const patch: Record<string, unknown | null> = {};
  for (const [key, entry] of Object.entries(raw)) {
    const name = key.trim();
    if (!name) {
      return { error: 'Nome de variável vazio em envVars.' };
    }
    if (entry === null) {
      patch[name] = null;
      continue;
    }
    if (!isPlainObject(entry)) {
      return { error: `Valor inválido para a variável '${name}': use {type, value} ou null para remover.` };
    }
    const type = String(entry.type ?? '').trim();
    if (type !== 'plain_text' && type !== 'secret_text') {
      return { error: `Tipo inválido para a variável '${name}': use 'plain_text' ou 'secret_text'.` };
    }
    const value = typeof entry.value === 'string' ? entry.value : '';
    if (type === 'secret_text' && !value) {
      return { error: `A variável secreta '${name}' precisa de um valor não vazio (secrets não podem ser vazios).` };
    }
    patch[name] = { type, value };
  }
  return { patch };
};

export async function onRequestPatch(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let payload: PatchEnvPayload;
  try {
    payload = (await context.request.json()) as PatchEnvPayload;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const projectName = String(payload.projectName ?? '').trim();
  const environment = toEnvironment(String(payload.environment ?? '').trim());

  if (!projectName) {
    return toErrorResponse('Campo projectName é obrigatório.', trace, 400);
  }
  if (!environment) {
    return toErrorResponse("Campo environment é obrigatório: use 'production' ou 'preview'.", trace, 400);
  }

  const rawEnvVars = payload.envVars;
  const rawBindings = payload.bindings;
  if (rawEnvVars !== undefined && !isPlainObject(rawEnvVars)) {
    return toErrorResponse('Campo envVars inválido: envie um objeto {NOME: {type, value} | null}.', trace, 400);
  }
  if (rawBindings !== undefined && !isPlainObject(rawBindings)) {
    return toErrorResponse(
      'Campo bindings inválido: envie um objeto por grupo (kvNamespaces, d1Databases, …).',
      trace,
      400,
    );
  }

  const envVarsResult: { patch?: Record<string, unknown | null>; error?: string } =
    rawEnvVars !== undefined ? normalizeEnvVarsPatch(rawEnvVars) : {};
  if (envVarsResult.error) {
    return toErrorResponse(envVarsResult.error, trace, 400);
  }

  // Bindings: aceita apenas os grupos conhecidos; cada entrada é objeto CF
  // passthrough ({namespace_id}, {id}, {name}, {service, environment?}, …) ou
  // null para remover.
  const bindingPatches: Array<{ cf: string; api: string; entries: Record<string, unknown | null> }> = [];
  if (rawBindings !== undefined) {
    const knownGroups = new Set<string>(BINDING_GROUPS.map((group) => group.api));
    const unknown = Object.keys(rawBindings).filter((key) => !knownGroups.has(key));
    if (unknown.length > 0) {
      return toErrorResponse(
        `Grupos de bindings não suportados: ${unknown.join(', ')}. Permitidos: ${BINDING_GROUPS.map((group) => group.api).join(', ')}.`,
        trace,
        400,
      );
    }
    for (const group of BINDING_GROUPS) {
      const groupRaw = rawBindings[group.api];
      if (groupRaw === undefined) {
        continue;
      }
      if (!isPlainObject(groupRaw)) {
        return toErrorResponse(`Grupo ${group.api} inválido: envie {NOME: objeto | null}.`, trace, 400);
      }
      const entries: Record<string, unknown | null> = {};
      for (const [key, value] of Object.entries(groupRaw)) {
        const name = key.trim();
        if (!name) {
          return toErrorResponse(`Nome de binding vazio no grupo ${group.api}.`, trace, 400);
        }
        if (value !== null && !isPlainObject(value)) {
          return toErrorResponse(
            `Binding '${name}' inválido no grupo ${group.api}: use um objeto CF ou null para remover.`,
            trace,
            400,
          );
        }
        entries[name] = value;
      }
      if (Object.keys(entries).length > 0) {
        bindingPatches.push({ cf: group.cf, api: group.api, entries });
      }
    }
  }

  const hasEnvVarChanges = envVarsResult.patch !== undefined && Object.keys(envVarsResult.patch).length > 0;
  if (!hasEnvVarChanges && bindingPatches.length === 0) {
    return toErrorResponse('Nenhuma alteração enviada: informe envVars e/ou bindings.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    // Read-modify-write: lê o config atual para descartar remoções (null) de
    // chaves que não existem — o PATCH resultante contém SÓ chaves alteradas.
    const project = (await getCloudflarePagesProject(env, accountInfo.accountId, projectName)) as Record<
      string,
      unknown
    >;
    const currentConfig = readDeploymentConfig(project, environment);
    const currentEnvVars = isPlainObject(currentConfig.env_vars) ? currentConfig.env_vars : {};

    const configPatch: Record<string, unknown> = {};

    if (hasEnvVarChanges && envVarsResult.patch) {
      const envVarsPatch: Record<string, unknown | null> = {};
      for (const [key, value] of Object.entries(envVarsResult.patch)) {
        if (value === null && !(key in currentEnvVars)) {
          continue;
        }
        envVarsPatch[key] = value;
      }
      if (Object.keys(envVarsPatch).length > 0) {
        configPatch.env_vars = envVarsPatch;
      }
    }

    for (const group of bindingPatches) {
      const currentGroup = isPlainObject(currentConfig[group.cf])
        ? (currentConfig[group.cf] as Record<string, unknown>)
        : {};
      const groupPatch: Record<string, unknown | null> = {};
      for (const [key, value] of Object.entries(group.entries)) {
        if (value === null && !(key in currentGroup)) {
          continue;
        }
        groupPatch[key] = value;
      }
      if (Object.keys(groupPatch).length > 0) {
        configPatch[group.cf] = groupPatch;
      }
    }

    if (Object.keys(configPatch).length === 0) {
      await logCfpwEvent(env, 'page-env-patch', true, {
        accountId: accountInfo.accountId,
        projectName,
        environment,
        noOp: true,
      });
      return toJsonResponse({
        ok: true,
        ...trace,
        projectName,
        environment,
        noOp: true,
        ...toEnvView(currentConfig),
      });
    }

    const patchPayload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/pages/projects/${encodeURIComponent(projectName)}`,
      `Falha ao atualizar variáveis do ambiente ${environment} de ${projectName}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ deployment_configs: { [environment]: configPatch } }),
      },
    );

    // Telemetria só com contagens — nomes e valores nunca são registrados.
    await logCfpwEvent(env, 'page-env-patch', true, {
      accountId: accountInfo.accountId,
      projectName,
      environment,
      envVarsChanged: isPlainObject(configPatch.env_vars) ? Object.keys(configPatch.env_vars).length : 0,
      bindingGroupsChanged: bindingPatches.length,
    });

    const updatedProject = isPlainObject(patchPayload.result) ? patchPayload.result : {};
    return toJsonResponse({
      ok: true,
      ...trace,
      projectName,
      environment,
      ...toEnvView(readDeploymentConfig(updatedProject, environment)),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `Falha ao atualizar variáveis do ambiente ${environment} de ${projectName}.`;
    await logCfpwEvent(env, 'page-env-patch', false, { projectName, environment }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}
