// Workers Builds (CI/CD) — PW-2.
// GET  /api/cfpw/builds        — lista builds do Worker (resolve o script tag primeiro).
// GET  /api/cfpw/build         — detalhe de um build (passthrough CF).
// GET  /api/cfpw/build-logs    — logs do build com paginação por cursor.
// POST /api/cfpw/build-retry   — dispara novo build pelo primeiro trigger conectado.
// POST /api/cfpw/build-cancel  — cancela build em execução (PUT /cancel na CF).
// GET  /api/cfpw/build-config  — config de CI do Worker (404 CF → connected: false).
//
// A API de Builds é endereçada pelo script TAG (não pelo nome): o tag vem da
// listagem de scripts (campo `tag`), resolvida a cada chamada.

import { CfApiError, cfApiRequest } from '../_lib/cf-api-core';
import { listCloudflareWorkers, resolveCloudflarePwAccount } from '../_lib/cfpw-api';
import { createResponseTrace } from '../_lib/request-trace';
import {
  type CfpwRouteContext,
  getRouteEnv,
  logCfpwEvent,
  resolveCfpwErrorStatus,
  toErrorResponse,
  toJsonResponse,
} from './_respond';

const DEFAULT_PER_PAGE = 20;

const toPositiveInt = (raw: string | null, fallback: number): number | null => {
  if (raw === null || raw.trim() === '') {
    return fallback;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : null;
};

const workerNotFoundMessage = (scriptName: string) =>
  `Worker '${scriptName}' não encontrado na conta Cloudflare — verifique o nome ou atualize a listagem de Workers.`;

const NO_TRIGGER_MESSAGE =
  'Worker sem CI conectado (Workers Builds) — conecte o repositório no dashboard da Cloudflare para habilitar builds.';

/** Resolve o script tag do Worker via listagem de scripts; null quando não achado. */
const resolveWorkerBuildTag = async (
  env: Parameters<typeof listCloudflareWorkers>[0],
  accountId: string,
  scriptName: string,
): Promise<string | null> => {
  const workers = await listCloudflareWorkers(env, accountId);
  const worker = workers.find((item) => String(item.id ?? '').trim() === scriptName);
  const tag = String(worker?.tag ?? '').trim();
  return tag || null;
};

export async function onRequestGetBuilds(context: CfpwRouteContext) {
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

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const tag = await resolveWorkerBuildTag(env, accountInfo.accountId, scriptName);
    if (!tag) {
      await logCfpwEvent(env, 'builds-list', false, { scriptName }, workerNotFoundMessage(scriptName));
      return toErrorResponse(workerNotFoundMessage(scriptName), trace, 404);
    }

    const search = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    const payload = await cfApiRequest<unknown>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/builds/workers/${encodeURIComponent(tag)}/builds?${search.toString()}`,
      `Falha ao listar builds do Worker ${scriptName}`,
    );
    const builds = Array.isArray(payload.result) ? payload.result : [];

    await logCfpwEvent(env, 'builds-list', true, {
      accountId: accountInfo.accountId,
      scriptName,
      page,
      perPage,
      builds: builds.length,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      scriptName,
      builds,
      pagination: payload.resultInfo ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao listar builds do Worker ${scriptName}.`;
    await logCfpwEvent(env, 'builds-list', false, { scriptName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestGetBuild(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const buildId = String(url.searchParams.get('buildId') ?? '').trim();

  if (!buildId) {
    return toErrorResponse('Parâmetro buildId é obrigatório.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const payload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/builds/builds/${encodeURIComponent(buildId)}`,
      `Falha ao ler o build ${buildId}`,
    );

    await logCfpwEvent(env, 'build-detail', true, { accountId: accountInfo.accountId, buildId });

    return toJsonResponse({ ok: true, ...trace, buildId, build: payload.result });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao ler o build ${buildId}.`;
    await logCfpwEvent(env, 'build-detail', false, { buildId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestGetBuildLogs(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const buildId = String(url.searchParams.get('buildId') ?? '').trim();
  const cursor = String(url.searchParams.get('cursor') ?? '').trim();

  if (!buildId) {
    return toErrorResponse('Parâmetro buildId é obrigatório.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const payload = await cfApiRequest<{ lines?: unknown; cursor?: unknown; truncated?: unknown }>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/builds/builds/${encodeURIComponent(buildId)}/logs${suffix}`,
      `Falha ao ler logs do build ${buildId}`,
    );

    const result = payload.result ?? {};
    const lines = Array.isArray(result.lines) ? result.lines : [];
    const nextCursor = typeof result.cursor === 'string' && result.cursor.trim() ? result.cursor : null;

    await logCfpwEvent(env, 'build-logs', true, {
      accountId: accountInfo.accountId,
      buildId,
      lines: lines.length,
      hasCursor: Boolean(nextCursor),
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      buildId,
      lines,
      cursor: nextCursor,
      truncated: result.truncated === true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao ler logs do build ${buildId}.`;
    await logCfpwEvent(env, 'build-logs', false, { buildId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestPostBuildRetry(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let body: { scriptName?: unknown; branch?: unknown; commitHash?: unknown };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const scriptName = String(body.scriptName ?? '').trim();
  const branch = String(body.branch ?? '').trim();
  const commitHash = String(body.commitHash ?? '').trim();

  if (!scriptName) {
    return toErrorResponse('Campo scriptName é obrigatório.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const tag = await resolveWorkerBuildTag(env, accountInfo.accountId, scriptName);
    if (!tag) {
      await logCfpwEvent(env, 'build-retry', false, { scriptName }, workerNotFoundMessage(scriptName));
      return toErrorResponse(workerNotFoundMessage(scriptName), trace, 404);
    }

    let triggers: Array<Record<string, unknown>> = [];
    try {
      const triggersPayload = await cfApiRequest<unknown>(
        env,
        'pw',
        `/accounts/${encodeURIComponent(accountInfo.accountId)}/builds/workers/${encodeURIComponent(tag)}/triggers`,
        `Falha ao listar triggers de build do Worker ${scriptName}`,
      );
      triggers = Array.isArray(triggersPayload.result)
        ? (triggersPayload.result as Array<Record<string, unknown>>)
        : [];
    } catch (error) {
      // CF devolve 404 quando o Worker nunca teve repositório conectado.
      if (error instanceof CfApiError && error.status === 404) {
        await logCfpwEvent(env, 'build-retry', false, { scriptName }, NO_TRIGGER_MESSAGE);
        return toErrorResponse(NO_TRIGGER_MESSAGE, trace, 404);
      }
      throw error;
    }

    const firstTrigger = triggers[0];
    const triggerUuid = String(firstTrigger?.trigger_uuid ?? firstTrigger?.uuid ?? firstTrigger?.id ?? '').trim();
    if (!triggerUuid) {
      await logCfpwEvent(env, 'build-retry', false, { scriptName }, NO_TRIGGER_MESSAGE);
      return toErrorResponse(NO_TRIGGER_MESSAGE, trace, 404);
    }

    const buildBody: Record<string, string> = {};
    if (branch) {
      buildBody.branch = branch;
    }
    if (commitHash) {
      buildBody.commit_hash = commitHash;
    }

    const payload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/builds/triggers/${encodeURIComponent(triggerUuid)}/builds`,
      `Falha ao disparar novo build do Worker ${scriptName}`,
      {
        method: 'POST',
        body: JSON.stringify(buildBody),
      },
    );

    await logCfpwEvent(env, 'build-retry', true, {
      accountId: accountInfo.accountId,
      scriptName,
      triggerUuid,
      branch: branch || null,
    });

    return toJsonResponse({ ok: true, ...trace, scriptName, build: payload.result });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao disparar novo build do Worker ${scriptName}.`;
    await logCfpwEvent(env, 'build-retry', false, { scriptName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestPostBuildCancel(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let body: { buildId?: unknown };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const buildId = String(body.buildId ?? '').trim();
  if (!buildId) {
    return toErrorResponse('Campo buildId é obrigatório.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const payload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/builds/builds/${encodeURIComponent(buildId)}/cancel`,
      `Falha ao cancelar o build ${buildId}`,
      {
        method: 'PUT',
      },
    );

    await logCfpwEvent(env, 'build-cancel', true, { accountId: accountInfo.accountId, buildId });

    return toJsonResponse({ ok: true, ...trace, buildId, build: payload.result });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao cancelar o build ${buildId}.`;
    await logCfpwEvent(env, 'build-cancel', false, { buildId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestGetBuildConfig(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const scriptName = String(url.searchParams.get('scriptName') ?? '').trim();

  if (!scriptName) {
    return toErrorResponse('Parâmetro scriptName é obrigatório.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const tag = await resolveWorkerBuildTag(env, accountInfo.accountId, scriptName);
    if (!tag) {
      await logCfpwEvent(env, 'build-config', false, { scriptName }, workerNotFoundMessage(scriptName));
      return toErrorResponse(workerNotFoundMessage(scriptName), trace, 404);
    }

    try {
      const payload = await cfApiRequest<Record<string, unknown>>(
        env,
        'pw',
        `/accounts/${encodeURIComponent(accountInfo.accountId)}/builds/workers/${encodeURIComponent(tag)}`,
        `Falha ao ler configuração de builds do Worker ${scriptName}`,
      );

      await logCfpwEvent(env, 'build-config', true, {
        accountId: accountInfo.accountId,
        scriptName,
        connected: true,
      });

      return toJsonResponse({ ok: true, ...trace, scriptName, connected: true, config: payload.result });
    } catch (error) {
      // 404 na API de Builds = Worker sem repositório conectado (estado normal).
      if (error instanceof CfApiError && error.status === 404) {
        await logCfpwEvent(env, 'build-config', true, {
          accountId: accountInfo.accountId,
          scriptName,
          connected: false,
        });
        return toJsonResponse({ ok: true, ...trace, scriptName, connected: false });
      }
      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Falha ao ler configuração de builds do Worker ${scriptName}.`;
    await logCfpwEvent(env, 'build-config', false, { scriptName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}
