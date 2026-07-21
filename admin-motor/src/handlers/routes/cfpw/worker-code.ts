// GET /api/cfpw/worker-code — lê os módulos do Worker (multipart ou corpo
// único) com settings e etag para edição segura.
// PUT /api/cfpw/worker-code — regrava o código (multipart metadata+módulos),
// com guard de worker protegido e checagem opcional de etag (409 em conflito).

import { cfApiRequest, cfApiRequestRaw } from '../_lib/cf-api-core';
import { listCloudflareWorkers, resolveCloudflarePwAccount } from '../_lib/cfpw-api';
import { createResponseTrace } from '../_lib/request-trace';
import { assertWorkerMutationAllowed } from './_protected';
import {
  type CfpwRouteContext,
  getRouteEnv,
  logCfpwEvent,
  type PartialWarning,
  resolveCfpwErrorStatus,
  toErrorResponse,
  toJsonResponse,
} from './_respond';

type CodeModule = {
  name: string;
  content: string;
  contentType: string;
  binary: boolean;
};

type PutCodePayload = {
  scriptName?: unknown;
  modules?: unknown;
  mainModule?: unknown;
  confirmPhrase?: unknown;
  expectedEtag?: unknown;
};

const isTextLikeContentType = (contentType: string) => {
  if (/wasm|octet-stream/i.test(contentType)) {
    return false;
  }
  return /javascript|json|xml|text/i.test(contentType);
};

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const readModulesFromMultipart = async (response: Response): Promise<CodeModule[]> => {
  const form = await response.formData();
  const modules: CodeModule[] = [];

  for (const [name, value] of form.entries()) {
    if (typeof value === 'string') {
      modules.push({ name, content: value, contentType: 'text/plain', binary: false });
      continue;
    }

    const contentType = value.type || 'application/octet-stream';
    if (isTextLikeContentType(contentType)) {
      modules.push({ name, content: await value.text(), contentType, binary: false });
    } else {
      modules.push({
        name,
        content: toBase64(new Uint8Array(await value.arrayBuffer())),
        contentType,
        binary: true,
      });
    }
  }

  return modules;
};

const fetchCurrentEtag = async (
  env: Parameters<typeof listCloudflareWorkers>[0],
  accountId: string,
  scriptName: string,
): Promise<string | null> => {
  const workers = await listCloudflareWorkers(env, accountId);
  const worker = workers.find((candidate) => String(candidate.id ?? '').trim() === scriptName);
  return String(worker?.etag ?? '').trim() || null;
};

export async function onRequestGet(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const scriptName = String(new URL(context.request.url).searchParams.get('scriptName') ?? '').trim();

  if (!scriptName) {
    return toErrorResponse('Parâmetro scriptName é obrigatório.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const encodedAccountId = encodeURIComponent(accountInfo.accountId);
    const encodedScript = encodeURIComponent(scriptName);

    const contentResponse = await cfApiRequestRaw(
      env,
      'pw',
      `/accounts/${encodedAccountId}/workers/scripts/${encodedScript}/content/v2`,
      `Falha ao ler o código do Worker ${scriptName}`,
    );

    const contentType = contentResponse.headers.get('Content-Type') ?? '';
    const headerMainModule = contentResponse.headers.get('CF-worker-main-module')?.trim() || null;

    let modules: CodeModule[];
    if (contentType.includes('multipart/form-data')) {
      modules = await readModulesFromMultipart(contentResponse);
    } else {
      modules = [
        {
          name: headerMainModule || 'worker.js',
          content: await contentResponse.text(),
          contentType: contentType || 'application/javascript',
          binary: false,
        },
      ];
    }

    // Settings e etag são enriquecimento: falha vira warning parcial. O etag
    // do script só é exposto na listagem de scripts (uma chamada extra), não
    // no GET de content/settings.
    const warnings: PartialWarning[] = [];
    const [settingsResult, etagResult] = await Promise.allSettled([
      cfApiRequest<Record<string, unknown>>(
        env,
        'pw',
        `/accounts/${encodedAccountId}/workers/scripts/${encodedScript}/settings`,
        `Falha ao ler settings do Worker ${scriptName}`,
      ),
      fetchCurrentEtag(env, accountInfo.accountId, scriptName),
    ]);

    let settingsMainModule: string | null = null;
    let compatibilityDate: string | null = null;
    if (settingsResult.status === 'fulfilled') {
      settingsMainModule = String(settingsResult.value.result?.main_module ?? '').trim() || null;
      compatibilityDate = String(settingsResult.value.result?.compatibility_date ?? '').trim() || null;
    } else {
      warnings.push({
        code: 'CFPW-WORKER-CODE-PARTIAL-SETTINGS',
        message: settingsResult.reason instanceof Error ? settingsResult.reason.message : String(settingsResult.reason),
      });
    }

    let etag: string | null = null;
    if (etagResult.status === 'fulfilled') {
      etag = etagResult.value;
    } else {
      warnings.push({
        code: 'CFPW-WORKER-CODE-PARTIAL-ETAG',
        message: etagResult.reason instanceof Error ? etagResult.reason.message : String(etagResult.reason),
      });
    }

    const mainModule = headerMainModule || settingsMainModule || modules[0]?.name || null;

    await logCfpwEvent(env, 'worker-code-get', true, {
      accountId: accountInfo.accountId,
      scriptName,
      modules: modules.length,
      partialWarnings: warnings.length,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      scriptName,
      modules,
      mainModule,
      compatibilityDate,
      ...(etag ? { etag } : {}),
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao ler o código do Worker ${scriptName}.`;
    await logCfpwEvent(env, 'worker-code-get', false, { scriptName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestPut(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let payload: PutCodePayload;
  try {
    payload = (await context.request.json()) as PutCodePayload;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const scriptName = String(payload.scriptName ?? '').trim();
  const mainModule = String(payload.mainModule ?? '').trim();
  const confirmPhrase = typeof payload.confirmPhrase === 'string' ? payload.confirmPhrase : undefined;
  const expectedEtag = String(payload.expectedEtag ?? '').trim();

  if (!scriptName) {
    return toErrorResponse('Campo scriptName é obrigatório.', trace, 400);
  }

  const rawModules = Array.isArray(payload.modules) ? payload.modules : [];
  if (rawModules.length === 0) {
    return toErrorResponse('Campo modules é obrigatório: envie ao menos um módulo {name, content}.', trace, 400);
  }

  const modules: Array<{ name: string; content: string }> = [];
  for (const rawModule of rawModules) {
    const record = (rawModule ?? {}) as { name?: unknown; content?: unknown; binary?: unknown };
    const name = String(record.name ?? '').trim();
    if (!name || typeof record.content !== 'string') {
      return toErrorResponse('Cada módulo precisa de name (string não vazia) e content (string).', trace, 400);
    }
    if (record.binary === true) {
      return toErrorResponse(
        `Módulo binário ('${name}') não é editável pela admin-app — envie apenas módulos de texto.`,
        trace,
        400,
      );
    }
    modules.push({ name, content: record.content });
  }

  if (!mainModule || !modules.some((module) => module.name === mainModule)) {
    return toErrorResponse('Campo mainModule é obrigatório e precisa referenciar um dos módulos enviados.', trace, 400);
  }

  try {
    assertWorkerMutationAllowed(scriptName, confirmPhrase);

    const accountInfo = await resolveCloudflarePwAccount(env);
    const encodedAccountId = encodeURIComponent(accountInfo.accountId);
    const encodedScript = encodeURIComponent(scriptName);

    if (expectedEtag) {
      const currentEtag = await fetchCurrentEtag(env, accountInfo.accountId, scriptName);
      if (currentEtag && currentEtag !== expectedEtag) {
        return toErrorResponse(
          'O worker foi modificado por outra via desde o carregamento — recarregue o código antes de salvar.',
          trace,
          409,
        );
      }
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ main_module: mainModule })], { type: 'application/json' }));
    for (const module of modules) {
      form.append(module.name, new Blob([module.content], { type: 'application/javascript+module' }), module.name);
    }

    const putPayload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      `/accounts/${encodedAccountId}/workers/scripts/${encodedScript}/content`,
      `Falha ao atualizar o código do Worker ${scriptName}`,
      {
        method: 'PUT',
        body: form,
      },
    );

    await logCfpwEvent(env, 'worker-code-put', true, {
      accountId: accountInfo.accountId,
      scriptName,
      modules: modules.length,
      mainModule,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      scriptName,
      deployed: true,
      result: putPayload.result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao atualizar o código do Worker ${scriptName}.`;
    await logCfpwEvent(env, 'worker-code-put', false, { scriptName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}
