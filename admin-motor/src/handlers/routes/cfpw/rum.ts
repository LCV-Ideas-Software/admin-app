// POST /api/cfpw/page-web-analytics — ativa Web Analytics (RUM) para um
// projeto Pages: (a) lê o projeto para descobrir o host (subdomínio
// *.pages.dev), (b) cria o site RUM com auto_install, (c) grava
// web_analytics_tag/web_analytics_token no build_config do projeto
// (read-modify-write). 403 vira dica de permissão RUM no token.

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

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type WebAnalyticsPayload = {
  projectName?: unknown;
};

/** Host do site RUM: o subdomínio do projeto (name.pages.dev), com fallback defensivo. */
const resolveProjectHost = (project: Record<string, unknown>, projectName: string): string => {
  const subdomain = String(project.subdomain ?? '').trim();
  if (!subdomain) {
    return `${projectName}.pages.dev`;
  }
  return subdomain.includes('.') ? subdomain : `${subdomain}.pages.dev`;
};

export async function onRequestPost(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let payload: WebAnalyticsPayload;
  try {
    payload = (await context.request.json()) as WebAnalyticsPayload;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const projectName = String(payload.projectName ?? '').trim();
  if (!projectName) {
    return toErrorResponse('Campo projectName é obrigatório.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const encodedAccountId = encodeURIComponent(accountInfo.accountId);

    // (a) Projeto: host do site RUM + build_config atual para o merge final.
    const project = (await getCloudflarePagesProject(env, accountInfo.accountId, projectName)) as Record<
      string,
      unknown
    >;
    const host = resolveProjectHost(project, projectName);

    // (b) Cria o site RUM com auto-instalação do snippet.
    let siteInfo: Record<string, unknown>;
    try {
      const sitePayload = await cfApiRequest<Record<string, unknown>>(
        env,
        'pw',
        `/accounts/${encodedAccountId}/rum/site_info`,
        `Falha ao criar o site Web Analytics para ${host}`,
        {
          method: 'POST',
          body: JSON.stringify({ host, auto_install: true }),
        },
      );
      siteInfo = isPlainObject(sitePayload.result) ? sitePayload.result : {};
    } catch (error) {
      if (error instanceof CfApiError && (error.status === 401 || error.status === 403)) {
        const detail = error.apiMessage ? `código CF ${error.code}: ${error.apiMessage}` : `HTTP ${error.status}`;
        throw new CfApiError(
          `Token Cloudflare sem permissão para Web Analytics (RUM) — adicione a permissão 'Account · Account Rum · Read+Edit' ao token CLOUDFLARE_PW no dashboard e tente novamente (${detail}).`,
          { kind: 'api', status: 403, code: error.code, apiMessage: error.apiMessage, errors: error.errors },
        );
      }
      throw error;
    }

    // Formato defensivo: a API RUM devolve site_tag/site_token (e opcionalmente
    // snippet/auto_install/rules) — sem esses campos não há como ligar o
    // projeto ao site, então 500 diagnóstico (nunca 502: o edge da Cloudflare
    // intercepta 502 e troca o body JSON pela página HTML de erro dele).
    const siteTag = String(siteInfo.site_tag ?? '').trim();
    const siteToken = String(siteInfo.site_token ?? '').trim();
    if (!siteTag || !siteToken) {
      const received = Object.keys(siteInfo).join(', ') || 'nenhum campo';
      const message = `A API RUM da Cloudflare não devolveu site_tag/site_token para ${host} — resposta inesperada (campos recebidos: ${received}). O site pode ter sido criado; verifique em Web Analytics no dashboard.`;
      await logCfpwEvent(env, 'page-web-analytics', false, { projectName, host }, message);
      return toErrorResponse(message, trace, 500);
    }

    // (c) Read-modify-write do build_config com a tag/token do Web Analytics.
    const existingBuildConfig = isPlainObject(project.build_config) ? project.build_config : {};
    await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      `/accounts/${encodedAccountId}/pages/projects/${encodeURIComponent(projectName)}`,
      `Falha ao vincular o Web Analytics ao projeto ${projectName}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          build_config: {
            ...existingBuildConfig,
            web_analytics_tag: siteTag,
            web_analytics_token: siteToken,
          },
        }),
      },
    );

    await logCfpwEvent(env, 'page-web-analytics', true, {
      accountId: accountInfo.accountId,
      projectName,
      host,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      projectName,
      host,
      siteTag,
      autoInstall: siteInfo.auto_install !== false,
      snippet: typeof siteInfo.snippet === 'string' ? siteInfo.snippet : null,
      dashboardUrl: `https://dash.cloudflare.com/${accountInfo.accountId}/web-analytics`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao ativar Web Analytics para ${projectName}.`;
    await logCfpwEvent(env, 'page-web-analytics', false, { projectName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}
