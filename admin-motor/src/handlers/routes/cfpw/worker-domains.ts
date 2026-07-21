// GET /api/cfpw/worker-domains — agrega domínios custom do Worker, subdomínio
// workers.dev do script e subdomínio da conta (Promise.allSettled + warnings).
// POST — anexa domínio custom ao Worker (PUT CF, sem campo environment).
// DELETE — remove um attachment de domínio custom.
// POST /api/cfpw/worker-subdomain — cria/renomeia o subdomínio da conta e/ou
// habilita o subdomínio workers.dev de um script.

import { CfApiError, cfApiRequest } from '../_lib/cf-api-core';
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

type AttachDomainPayload = {
  scriptName?: unknown;
  hostname?: unknown;
  zoneId?: unknown;
};

type SubdomainPayload = {
  scriptName?: unknown;
  enabled?: unknown;
  previewsEnabled?: unknown;
  accountSubdomain?: unknown;
};

const AUTH_ERROR_CODES = [9109, 10000, 10001];

const isPermissionError = (error: unknown): error is CfApiError =>
  error instanceof CfApiError &&
  (error.status === 401 ||
    error.status === 403 ||
    error.errors.some((detail) => AUTH_ERROR_CODES.includes(detail.code)));

const toWarningMessage = (reason: unknown) => (reason instanceof Error ? reason.message : String(reason));

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

    const [domainsResult, scriptSubdomainResult, accountSubdomainResult] = await Promise.allSettled([
      cfApiRequest<Array<Record<string, unknown>>>(
        env,
        'pw',
        `/accounts/${encodedAccountId}/workers/domains?service=${encodedScript}`,
        `Falha ao listar domínios custom do Worker ${scriptName}`,
      ),
      cfApiRequest<{ enabled?: boolean; previews_enabled?: boolean }>(
        env,
        'pw',
        `/accounts/${encodedAccountId}/workers/scripts/${encodedScript}/subdomain`,
        `Falha ao ler o subdomínio workers.dev do Worker ${scriptName}`,
      ),
      cfApiRequest<{ subdomain?: string }>(
        env,
        'pw',
        `/accounts/${encodedAccountId}/workers/subdomain`,
        'Falha ao ler o subdomínio workers.dev da conta',
      ),
    ]);

    if (
      domainsResult.status === 'rejected' &&
      scriptSubdomainResult.status === 'rejected' &&
      accountSubdomainResult.status === 'rejected'
    ) {
      throw domainsResult.reason;
    }

    const warnings: PartialWarning[] = [];

    let domains: Array<Record<string, unknown>> = [];
    if (domainsResult.status === 'fulfilled') {
      domains = Array.isArray(domainsResult.value.result) ? domainsResult.value.result : [];
    } else {
      warnings.push({ code: 'CFPW-WORKER-DOMAINS-PARTIAL-DOMAINS', message: toWarningMessage(domainsResult.reason) });
    }

    let scriptSubdomain: { enabled: boolean; previews_enabled: boolean } | null = null;
    if (scriptSubdomainResult.status === 'fulfilled') {
      scriptSubdomain = {
        enabled: scriptSubdomainResult.value.result?.enabled === true,
        previews_enabled: scriptSubdomainResult.value.result?.previews_enabled === true,
      };
    } else {
      warnings.push({
        code: 'CFPW-WORKER-DOMAINS-PARTIAL-SCRIPT-SUBDOMAIN',
        message: toWarningMessage(scriptSubdomainResult.reason),
      });
    }

    let accountSubdomain: string | null = null;
    if (accountSubdomainResult.status === 'fulfilled') {
      accountSubdomain = String(accountSubdomainResult.value.result?.subdomain ?? '').trim() || null;
    } else {
      warnings.push({
        code: 'CFPW-WORKER-DOMAINS-PARTIAL-ACCOUNT-SUBDOMAIN',
        message: toWarningMessage(accountSubdomainResult.reason),
      });
    }

    await logCfpwEvent(env, 'worker-domains-get', true, {
      accountId: accountInfo.accountId,
      scriptName,
      domains: domains.length,
      partialWarnings: warnings.length,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      scriptName,
      domains,
      scriptSubdomain,
      accountSubdomain,
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao listar domínios do Worker ${scriptName}.`;
    await logCfpwEvent(env, 'worker-domains-get', false, { scriptName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestPost(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let payload: AttachDomainPayload;
  try {
    payload = (await context.request.json()) as AttachDomainPayload;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const scriptName = String(payload.scriptName ?? '').trim();
  const hostname = String(payload.hostname ?? '').trim();
  const zoneId = String(payload.zoneId ?? '').trim();

  if (!scriptName || !hostname || !zoneId) {
    return toErrorResponse('Campos scriptName, hostname e zoneId são obrigatórios.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    // Sem campo environment: está deprecado no endpoint de custom domains.
    const attachPayload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/workers/domains`,
      `Falha ao anexar o domínio ${hostname} ao Worker ${scriptName}`,
      {
        method: 'PUT',
        body: JSON.stringify({ zone_id: zoneId, hostname, service: scriptName }),
      },
    );

    await logCfpwEvent(env, 'worker-domains-attach', true, {
      accountId: accountInfo.accountId,
      scriptName,
      hostname,
      zoneId,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      scriptName,
      hostname,
      domain: attachPayload.result,
    });
  } catch (error) {
    let message: string;
    let status: number;
    if (isPermissionError(error)) {
      const detail = error.apiMessage ? `código CF ${error.code}: ${error.apiMessage}` : `HTTP ${error.status}`;
      message = `Sem permissão para anexar o domínio ${hostname}: o token CLOUDFLARE_PW precisa também das permissões de zona "DNS Edit" e "SSL and Certificates Edit" na zona ${zoneId} — ajuste o token no dashboard da Cloudflare (${detail}).`;
      status = error.status;
    } else {
      message = error instanceof Error ? error.message : `Falha ao anexar o domínio ${hostname}.`;
      status = resolveCfpwErrorStatus(error);
    }

    await logCfpwEvent(env, 'worker-domains-attach', false, { scriptName, hostname, zoneId }, message);
    return toErrorResponse(message, trace, status);
  }
}

export async function onRequestDelete(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const domainId = String(new URL(context.request.url).searchParams.get('domainId') ?? '').trim();

  if (!domainId) {
    return toErrorResponse('Parâmetro domainId é obrigatório.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    await cfApiRequest<Record<string, unknown> | null>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/workers/domains/${encodeURIComponent(domainId)}`,
      `Falha ao remover o domínio custom ${domainId}`,
      {
        method: 'DELETE',
      },
    );

    await logCfpwEvent(env, 'worker-domains-delete', true, {
      accountId: accountInfo.accountId,
      domainId,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      domainId,
      deleted: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao remover o domínio custom ${domainId}.`;
    await logCfpwEvent(env, 'worker-domains-delete', false, { domainId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestPostSubdomain(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let payload: SubdomainPayload;
  try {
    payload = (await context.request.json()) as SubdomainPayload;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const scriptName = String(payload.scriptName ?? '').trim();
  const accountSubdomain = typeof payload.accountSubdomain === 'string' ? payload.accountSubdomain.trim() : '';

  if (!scriptName && !accountSubdomain) {
    return toErrorResponse(
      'Informe accountSubdomain (criar/renomear o subdomínio da conta) e/ou scriptName (habilitar o subdomínio do script).',
      trace,
      400,
    );
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const encodedAccountId = encodeURIComponent(accountInfo.accountId);

    let accountResult: unknown = null;
    if (accountSubdomain) {
      const accountPayload = await cfApiRequest<Record<string, unknown>>(
        env,
        'pw',
        `/accounts/${encodedAccountId}/workers/subdomain`,
        `Falha ao definir o subdomínio workers.dev da conta como ${accountSubdomain}`,
        {
          method: 'PUT',
          body: JSON.stringify({ subdomain: accountSubdomain }),
        },
      );
      accountResult = accountPayload.result;
    }

    let scriptResult: unknown = null;
    if (scriptName) {
      const scriptPayload = await cfApiRequest<Record<string, unknown>>(
        env,
        'pw',
        `/accounts/${encodedAccountId}/workers/scripts/${encodeURIComponent(scriptName)}/subdomain`,
        `Falha ao configurar o subdomínio workers.dev do Worker ${scriptName}`,
        {
          method: 'POST',
          body: JSON.stringify({
            enabled: payload.enabled !== false,
            previews_enabled: payload.previewsEnabled !== false,
          }),
        },
      );
      scriptResult = scriptPayload.result;
    }

    await logCfpwEvent(env, 'worker-subdomain', true, {
      accountId: accountInfo.accountId,
      scriptName: scriptName || null,
      accountSubdomain: accountSubdomain || null,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      ...(accountSubdomain ? { accountSubdomain: accountResult } : {}),
      ...(scriptName ? { scriptName, scriptSubdomain: scriptResult } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao configurar o subdomínio workers.dev.';
    await logCfpwEvent(
      env,
      'worker-subdomain',
      false,
      { scriptName: scriptName || null, accountSubdomain: accountSubdomain || null },
      message,
    );
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}
