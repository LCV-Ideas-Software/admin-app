import { cfApiRequest } from '../_lib/cf-api-core';
import {
  type CfpwPageDeployment,
  getCloudflarePagesProject,
  listCloudflarePagesDeployments,
  resolveCloudflarePwAccount,
} from '../_lib/cfpw-api';
import type { D1Database } from '../_lib/operational';
import { logModuleOperationalEvent } from '../_lib/operational';
import { createResponseTrace } from '../_lib/request-trace';

type Env = {
  BIGDATA_DB?: D1Database;
  CLOUDFLARE_PW?: string;
  CF_ACCOUNT_ID?: string;
};

type Context = {
  request: Request;
  env: Env;
  data?: {
    env?: Env;
  };
};

type PartialWarning = {
  code: string;
  message: string;
};

const toHeaders = () => ({
  'Content-Type': 'application/json',
});

const toError = (message: string, trace: { request_id: string; timestamp: string }, status = 500) =>
  new Response(
    JSON.stringify({
      ok: false,
      ...trace,
      error: message,
    }),
    {
      status,
      headers: toHeaders(),
    },
  );

const toProjectName = (raw: string | null) => String(raw ?? '').trim();

// PW-3: paginação/filtro opcionais da lista de deployments. Sem os params o
// comportamento legado (lista padrão da CF) permanece intacto.
type DeploymentsPaging = {
  page: number;
  perPage: number;
  env: 'production' | 'preview' | null;
};

const DEPLOYMENTS_PER_PAGE_DEFAULT = 25;
const DEPLOYMENTS_PER_PAGE_MAX = 25;

/** Lê page/perPage/env da URL; null quando nenhum foi enviado; string = erro pt-BR. */
const parseDeploymentsPaging = (url: URL): DeploymentsPaging | null | string => {
  const rawPage = url.searchParams.get('page');
  const rawPerPage = url.searchParams.get('perPage');
  const rawEnv = url.searchParams.get('env');

  if (rawPage === null && rawPerPage === null && rawEnv === null) {
    return null;
  }

  const page = rawPage === null ? 1 : Number(rawPage);
  if (!Number.isInteger(page) || page < 1) {
    return 'Parâmetro page inválido: use um inteiro maior ou igual a 1.';
  }

  const perPage = rawPerPage === null ? DEPLOYMENTS_PER_PAGE_DEFAULT : Number(rawPerPage);
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > DEPLOYMENTS_PER_PAGE_MAX) {
    return `Parâmetro perPage inválido: use um inteiro entre 1 e ${DEPLOYMENTS_PER_PAGE_MAX}.`;
  }

  let env: DeploymentsPaging['env'] = null;
  if (rawEnv !== null) {
    const normalized = rawEnv.trim();
    if (normalized !== 'production' && normalized !== 'preview') {
      return "Parâmetro env inválido: use 'production' ou 'preview'.";
    }
    env = normalized;
  }

  return { page, perPage, env };
};

const listDeploymentsPaged = async (env: Env, accountId: string, projectName: string, paging: DeploymentsPaging) => {
  const query = new URLSearchParams({ page: String(paging.page), per_page: String(paging.perPage) });
  if (paging.env) {
    query.set('env', paging.env);
  }

  const payload = await cfApiRequest<CfpwPageDeployment[]>(
    env,
    'pw',
    `/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/deployments?${query.toString()}`,
    `Falha ao listar deployments de Pages ${projectName}`,
  );

  const deployments = Array.isArray(payload.result) ? payload.result : [];
  const resultInfo = payload.resultInfo as { page?: number; total_pages?: number } | undefined;
  const hasMore =
    typeof resultInfo?.total_pages === 'number' && Number.isFinite(resultInfo.total_pages)
      ? paging.page < resultInfo.total_pages
      : deployments.length === paging.perPage;

  return { deployments, hasMore };
};

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request);
  const url = new URL(context.request.url);
  const projectName = toProjectName(url.searchParams.get('projectName'));

  if (!projectName) {
    return toError('Parâmetro projectName é obrigatório.', trace, 400);
  }

  const paging = parseDeploymentsPaging(url);
  if (typeof paging === 'string') {
    return toError(paging, trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(context.data?.env ?? context.env);

    let deploymentsHasMore = false;
    const [projectResult, deploymentsResult] = await Promise.allSettled([
      getCloudflarePagesProject(context.data?.env ?? context.env, accountInfo.accountId, projectName),
      paging
        ? listDeploymentsPaged(context.data?.env ?? context.env, accountInfo.accountId, projectName, paging).then(
            (paged) => {
              deploymentsHasMore = paged.hasMore;
              return paged.deployments;
            },
          )
        : listCloudflarePagesDeployments(context.data?.env ?? context.env, accountInfo.accountId, projectName),
    ]);

    const warnings: PartialWarning[] = [];
    const project = projectResult.status === 'fulfilled' ? projectResult.value : null;
    const deployments = deploymentsResult.status === 'fulfilled' ? deploymentsResult.value : [];

    if (projectResult.status === 'rejected') {
      const message =
        projectResult.reason instanceof Error
          ? projectResult.reason.message
          : 'Falha ao ler detalhes do projeto Pages.';
      warnings.push({ code: 'CFPW-PAGE-DETAILS-PARTIAL-PROJECT', message });
    }

    if (deploymentsResult.status === 'rejected') {
      const message =
        deploymentsResult.reason instanceof Error
          ? deploymentsResult.reason.message
          : 'Falha ao listar deployments do projeto Pages.';
      warnings.push({ code: 'CFPW-PAGE-DETAILS-PARTIAL-DEPLOYMENTS', message });
    }

    if (!project && deployments.length === 0) {
      const fatal = warnings[0]?.message || `Falha ao carregar detalhes do Pages ${projectName}.`;
      throw new Error(fatal);
    }

    const db = (context.data?.env ?? context.env).BIGDATA_DB;
    if (db) {
      try {
        await logModuleOperationalEvent(db, {
          module: 'cfpw',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'page-details',
            provider: 'cloudflare-api',
            accountId: accountInfo.accountId,
            projectName,
            deployments: deployments.length,
            partialWarnings: warnings.length,
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        accountId: accountInfo.accountId,
        projectName,
        project,
        deployments,
        ...(paging
          ? { deploymentsPagination: { page: paging.page, perPage: paging.perPage, hasMore: deploymentsHasMore } }
          : {}),
        warnings,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao carregar detalhes do Pages ${projectName}.`;

    const db = (context.data?.env ?? context.env).BIGDATA_DB;
    if (db) {
      try {
        await logModuleOperationalEvent(db, {
          module: 'cfpw',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'page-details',
            provider: 'cloudflare-api',
            projectName,
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return toError(message, trace, 502);
  }
}
