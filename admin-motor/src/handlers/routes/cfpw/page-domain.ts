// GET /api/cfpw/page-domain — detalhe de um domínio custom do projeto Pages
// (status de verificação/validação, certificate_authority, zone_tag —
// passthrough do objeto CF).
// POST /api/cfpw/page-domain-recheck — reexecuta a validação do domínio (PATCH
// CF no domínio SEM corpo — semântica de retry de validação da API Pages).

import { cfApiRequest } from '../_lib/cf-api-core';
import { resolveCloudflarePwAccount } from '../_lib/cfpw-api';
import { createResponseTrace } from '../_lib/request-trace';
import {
  type CfpwRouteContext,
  getRouteEnv,
  logCfpwEvent,
  resolveCfpwErrorStatus,
  toErrorResponse,
  toJsonResponse,
} from './_respond';

const toDomainPath = (accountId: string, projectName: string, domainName: string) =>
  `/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/domains/${encodeURIComponent(domainName)}`;

export async function onRequestGet(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const projectName = String(url.searchParams.get('projectName') ?? '').trim();
  const domainName = String(url.searchParams.get('domainName') ?? '').trim();

  if (!projectName || !domainName) {
    return toErrorResponse('Parâmetros projectName e domainName são obrigatórios.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    const domainPayload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      toDomainPath(accountInfo.accountId, projectName, domainName),
      `Falha ao ler o domínio ${domainName} do projeto ${projectName}`,
    );

    await logCfpwEvent(env, 'page-domain-get', true, {
      accountId: accountInfo.accountId,
      projectName,
      domainName,
    });

    return toJsonResponse({ ok: true, ...trace, projectName, domainName, domain: domainPayload.result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Falha ao ler o domínio ${domainName} do projeto ${projectName}.`;
    await logCfpwEvent(env, 'page-domain-get', false, { projectName, domainName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

type RecheckPayload = {
  projectName?: unknown;
  domainName?: unknown;
};

export async function onRequestPostRecheck(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let payload: RecheckPayload;
  try {
    payload = (await context.request.json()) as RecheckPayload;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const projectName = String(payload.projectName ?? '').trim();
  const domainName = String(payload.domainName ?? '').trim();

  if (!projectName || !domainName) {
    return toErrorResponse('Campos projectName e domainName são obrigatórios.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    // PATCH sem corpo: a API Pages reprocessa a validação/verificação do
    // domínio (retry) sem alterar nenhum atributo.
    const recheckPayload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      toDomainPath(accountInfo.accountId, projectName, domainName),
      `Falha ao reverificar o domínio ${domainName} do projeto ${projectName}`,
      {
        method: 'PATCH',
      },
    );

    await logCfpwEvent(env, 'page-domain-recheck', true, {
      accountId: accountInfo.accountId,
      projectName,
      domainName,
    });

    return toJsonResponse({ ok: true, ...trace, projectName, domainName, domain: recheckPayload.result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `Falha ao reverificar o domínio ${domainName} do projeto ${projectName}.`;
    await logCfpwEvent(env, 'page-domain-recheck', false, { projectName, domainName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}
