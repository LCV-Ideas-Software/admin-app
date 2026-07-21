// POST /api/cfpw/page-deploy — dispara um novo deployment de projeto Pages
// conectado ao Git (multipart com campo branch opcional; sem branch a CF usa a
// production branch). Projetos de upload direto não são suportados pela API de
// criação de deployments — o erro CF é traduzido para 409 diagnóstico.

import { CfApiError, cfApiRequest } from '../_lib/cf-api-core';
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

type DeployPayload = {
  projectName?: unknown;
  branch?: unknown;
};

// Mensagens CF que indicam projeto sem source Git (upload direto): a API só
// cria deployments para projetos conectados ao Git; upload direto exige
// manifest de arquivos (wrangler/CI).
const NON_GIT_MESSAGE_PATTERN = /source|git|repositor|connected|upload|manifest/i;

const isNonGitProjectError = (error: unknown): error is CfApiError =>
  error instanceof CfApiError &&
  error.status >= 400 &&
  error.status <= 499 &&
  error.errors.some((detail) => NON_GIT_MESSAGE_PATTERN.test(detail.message));

export async function onRequestPost(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let payload: DeployPayload;
  try {
    payload = (await context.request.json()) as DeployPayload;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const projectName = String(payload.projectName ?? '').trim();
  const branch = String(payload.branch ?? '').trim();

  if (!projectName) {
    return toErrorResponse('Campo projectName é obrigatório.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    const form = new FormData();
    if (branch) {
      form.append('branch', branch);
    }

    const deployPayload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/pages/projects/${encodeURIComponent(projectName)}/deployments`,
      `Falha ao criar deployment do projeto ${projectName}`,
      {
        method: 'POST',
        // fetch define o boundary automaticamente para multipart/form-data.
        body: form,
      },
    );

    await logCfpwEvent(env, 'page-deploy', true, {
      accountId: accountInfo.accountId,
      projectName,
      branch: branch || null,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      projectName,
      branch: branch || null,
      deployment: deployPayload.result,
    });
  } catch (error) {
    let message: string;
    let status: number;
    if (isNonGitProjectError(error)) {
      const detail = error.apiMessage ? `código CF ${error.code}: ${error.apiMessage}` : `HTTP ${error.status}`;
      message = `Projeto de upload direto: publicação manual é feita via wrangler/CI — a API da Cloudflare só cria deployments para projetos conectados ao Git (${detail}).`;
      status = 409;
    } else {
      message = error instanceof Error ? error.message : `Falha ao criar deployment do projeto ${projectName}.`;
      status = resolveCfpwErrorStatus(error);
    }

    await logCfpwEvent(env, 'page-deploy', false, { projectName, branch: branch || null }, message);
    return toErrorResponse(message, trace, status);
  }
}
