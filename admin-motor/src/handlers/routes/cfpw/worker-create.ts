// POST /api/cfpw/worker — cria um Worker a partir do template padrão (com
// observability habilitada), opcionalmente habilita o subdomínio workers.dev
// do script e informa se o subdomínio da conta ainda precisa ser criado.

import { CfApiError, cfApiRequest } from '../_lib/cf-api-core';
import { createCloudflareWorkerFromTemplate, resolveCloudflarePwAccount } from '../_lib/cfpw-api';
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

const SCRIPT_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

// GET settings: 200 = script existe; 404/10007 = não existe. Necessário porque
// o PUT /workers/scripts da CF é upsert — sem checagem prévia, "criar" um nome
// existente SOBRESCREVERIA o worker (inclusive os de produção do admin).
const workerScriptExists = async (
  env: Parameters<typeof cfApiRequest>[0],
  accountId: string,
  scriptName: string,
): Promise<boolean> => {
  try {
    await cfApiRequest(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(scriptName)}/settings`,
      `Falha ao verificar se o Worker ${scriptName} já existe`,
    );
    return true;
  } catch (error) {
    if (error instanceof CfApiError && (error.status === 404 || error.code === 10007)) {
      return false;
    }
    throw error;
  }
};

type CreateWorkerPayload = {
  scriptName?: unknown;
  enableSubdomain?: unknown;
  previewsEnabled?: unknown;
};

const isNameConflict = (error: unknown): error is CfApiError =>
  error instanceof CfApiError &&
  (error.status === 409 || error.code === 10021 || error.errors.some((detail) => detail.code === 10021));

export async function onRequestPost(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let payload: CreateWorkerPayload;
  try {
    payload = (await context.request.json()) as CreateWorkerPayload;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const scriptName = String(payload.scriptName ?? '').trim();
  const enableSubdomain = payload.enableSubdomain !== false;
  const previewsEnabled = payload.previewsEnabled !== false;

  if (!SCRIPT_NAME_PATTERN.test(scriptName)) {
    return toErrorResponse(
      'scriptName inválido: use apenas letras minúsculas, dígitos e hífens (sem hífen no início/fim), com no máximo 63 caracteres.',
      trace,
      400,
    );
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const encodedAccountId = encodeURIComponent(accountInfo.accountId);
    const encodedScript = encodeURIComponent(scriptName);

    if (await workerScriptExists(env, accountInfo.accountId, scriptName)) {
      return toErrorResponse(
        `Já existe um worker com esse nome ('${scriptName}') na conta Cloudflare — escolha outro nome ou remova o worker existente.`,
        trace,
        409,
      );
    }

    const worker = await createCloudflareWorkerFromTemplate(env, accountInfo.accountId, scriptName, '');

    const warnings: PartialWarning[] = [];

    let scriptSubdomain: unknown = null;
    if (enableSubdomain) {
      try {
        const subdomainPayload = await cfApiRequest<Record<string, unknown>>(
          env,
          'pw',
          `/accounts/${encodedAccountId}/workers/scripts/${encodedScript}/subdomain`,
          `Falha ao habilitar o subdomínio workers.dev do Worker ${scriptName}`,
          {
            method: 'POST',
            body: JSON.stringify({ enabled: true, previews_enabled: previewsEnabled }),
          },
        );
        scriptSubdomain = subdomainPayload.result;
      } catch (error) {
        warnings.push({
          code: 'CFPW-WORKER-CREATE-PARTIAL-SUBDOMAIN',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Sem subdomínio de conta, a URL workers.dev não resolve: sinaliza à UI
    // para oferecer a criação (POST /api/cfpw/worker-subdomain).
    let subdomainPending = false;
    let accountSubdomain: string | null = null;
    try {
      const accountSubdomainPayload = await cfApiRequest<{ subdomain?: string }>(
        env,
        'pw',
        `/accounts/${encodedAccountId}/workers/subdomain`,
        'Falha ao consultar o subdomínio workers.dev da conta',
      );
      accountSubdomain = String(accountSubdomainPayload.result?.subdomain ?? '').trim() || null;
      subdomainPending = !accountSubdomain;
    } catch (error) {
      if (error instanceof CfApiError && error.status === 404) {
        subdomainPending = true;
      } else {
        warnings.push({
          code: 'CFPW-WORKER-CREATE-PARTIAL-ACCOUNT-SUBDOMAIN',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await logCfpwEvent(env, 'worker-create', true, {
      accountId: accountInfo.accountId,
      scriptName,
      enableSubdomain,
      subdomainPending,
      partialWarnings: warnings.length,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      accountId: accountInfo.accountId,
      scriptName,
      worker,
      scriptSubdomain,
      accountSubdomain,
      ...(subdomainPending ? { subdomainPending: true } : {}),
      warnings,
    });
  } catch (error) {
    let message: string;
    let status: number;
    if (isNameConflict(error)) {
      const detail = error.apiMessage ? `código CF ${error.code}: ${error.apiMessage}` : `HTTP ${error.status}`;
      message = `Já existe um worker com esse nome ('${scriptName}') na conta Cloudflare — escolha outro nome ou remova o worker existente (${detail}).`;
      status = 409;
    } else {
      message = error instanceof Error ? error.message : `Falha ao criar Worker ${scriptName}.`;
      status = resolveCfpwErrorStatus(error);
    }

    await logCfpwEvent(env, 'worker-create', false, { scriptName }, message);
    return toErrorResponse(message, trace, status);
  }
}
