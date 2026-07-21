import { CfApiError, cfApiRequest } from '../_lib/cf-api-core';
import {
  type CfpwPageProject,
  type CfpwWorkerScript,
  listCloudflarePagesProjects,
  listCloudflareWorkers,
  resolveCloudflarePwAccount,
} from '../_lib/cfpw-api';
import type { D1Database } from '../_lib/operational';
import { logModuleOperationalEvent } from '../_lib/operational';
import { createResponseTrace } from '../_lib/request-trace';
import { resolveCfpwErrorStatus } from './_respond';

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

const mapWorker = (worker: CfpwWorkerScript) => {
  const scriptName = String(worker.id ?? '').trim();
  return {
    scriptName,
    handlers: Array.isArray(worker.handlers) ? worker.handlers : [],
    createdAt: String(worker.created_on ?? '').trim() || null,
    updatedAt: String(worker.modified_on ?? '').trim() || null,
    tag: String(worker.tag ?? '').trim() || null,
  };
};

const mapProject = (project: CfpwPageProject) => {
  const projectName = String(project.name ?? '').trim();
  return {
    projectName,
    id: String(project.id ?? '').trim() || null,
    subdomain: String(project.subdomain ?? '').trim() || null,
    productionBranch: String(project.production_branch ?? '').trim() || null,
    createdAt: String(project.created_on ?? '').trim() || null,
    domains: Array.isArray(project.domains) ? project.domains : [],
    latestDeployment: project.latest_deployment
      ? {
          id: String(project.latest_deployment.id ?? '').trim() || null,
          environment: String(project.latest_deployment.environment ?? '').trim() || null,
          createdAt: String(project.latest_deployment.created_on ?? '').trim() || null,
          url: String(project.latest_deployment.url ?? '').trim() || null,
        }
      : null,
  };
};

type WorkersPagination = {
  page: number;
  perPage: number;
  totalCount?: number;
  hasMore: boolean;
};

const toPositiveIntParam = (raw: string | null, fallback: number, max: number): number | null => {
  if (raw === null || raw.trim() === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    return null;
  }
  return Math.min(value, max);
};

// Busca paginada de Workers: tenta o endpoint beta scripts-search; se a conta
// não o tiver (404/403), cai para a listagem completa com filtro/slice local
// (sinalizado via searchFallback).
const loadPagedWorkers = async (env: Env, accountId: string, q: string, page: number, perPage: number) => {
  try {
    const search = new URLSearchParams();
    if (q) {
      search.set('name', q);
    }
    search.set('page', String(page));
    search.set('per_page', String(perPage));

    const payload = await cfApiRequest<CfpwWorkerScript[]>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountId)}/workers/scripts-search?${search.toString()}`,
      'Falha ao buscar Workers',
    );
    const items = Array.isArray(payload.result) ? payload.result : [];
    const workers = items.map(mapWorker);
    const info = (payload.resultInfo ?? null) as { total_count?: unknown } | null;
    const totalCount = typeof info?.total_count === 'number' ? info.total_count : undefined;

    return {
      workers,
      searchFallback: false,
      workersPagination: {
        page,
        perPage,
        ...(totalCount !== undefined ? { totalCount } : {}),
        hasMore: totalCount !== undefined ? page * perPage < totalCount : workers.length === perPage,
      } satisfies WorkersPagination,
    };
  } catch (error) {
    if (!(error instanceof CfApiError) || (error.status !== 404 && error.status !== 403)) {
      throw error;
    }

    const all = await listCloudflareWorkers(env, accountId);
    const needle = q.toLowerCase();
    const filtered = needle
      ? all.filter((worker) =>
          String(worker.id ?? '')
            .toLowerCase()
            .includes(needle),
        )
      : all;

    return {
      workers: filtered.slice((page - 1) * perPage, page * perPage).map(mapWorker),
      searchFallback: true,
      workersPagination: {
        page,
        perPage,
        totalCount: filtered.length,
        hasMore: page * perPage < filtered.length,
      } satisfies WorkersPagination,
    };
  }
};

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request);
  const url = new URL(context.request.url);
  const q = String(url.searchParams.get('q') ?? '').trim();
  const workersPageParam = url.searchParams.get('workersPage');
  const pagingActive = q !== '' || workersPageParam !== null;

  const page = toPositiveIntParam(workersPageParam, 1, 100000);
  const perPage = toPositiveIntParam(url.searchParams.get('workersPerPage'), 20, 100);
  if (pagingActive && (page === null || perPage === null)) {
    return toError('Parâmetros workersPage e workersPerPage precisam ser inteiros positivos.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(context.data?.env ?? context.env);

    let workers: ReturnType<typeof mapWorker>[];
    let pages: ReturnType<typeof mapProject>[];
    let workersPagination: WorkersPagination | null = null;
    let searchFallback = false;

    if (pagingActive && page !== null && perPage !== null) {
      const paged = await loadPagedWorkers(context.data?.env ?? context.env, accountInfo.accountId, q, page, perPage);
      workers = paged.workers;
      workersPagination = paged.workersPagination;
      searchFallback = paged.searchFallback;
      pages = (await listCloudflarePagesProjects(context.data?.env ?? context.env, accountInfo.accountId)).map(
        mapProject,
      );
    } else {
      const [workersRaw, pagesRaw] = await Promise.all([
        listCloudflareWorkers(context.data?.env ?? context.env, accountInfo.accountId),
        listCloudflarePagesProjects(context.data?.env ?? context.env, accountInfo.accountId),
      ]);

      workers = workersRaw.map(mapWorker);
      pages = pagesRaw.map(mapProject);
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
            action: 'overview',
            provider: 'cloudflare-api',
            accountId: accountInfo.accountId,
            workers: workers.length,
            pages: pages.length,
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
        account: {
          accountId: accountInfo.accountId,
          accountName: accountInfo.accountName,
          source: accountInfo.source,
        },
        accounts: accountInfo.accounts,
        summary: {
          totalWorkers: workersPagination?.totalCount ?? workers.length,
          totalPages: pages.length,
        },
        workers,
        pages,
        ...(workersPagination ? { workersPagination } : {}),
        ...(searchFallback ? { searchFallback: true } : {}),
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Falha ao carregar overview de Cloudflare Pages & Workers.';

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
            action: 'overview',
            provider: 'cloudflare-api',
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    // CF 4xx (ex.: parâmetro de busca rejeitado) passa adiante com a mensagem
    // traduzida; token ausente vira 500; demais falhas de upstream também 500
    // — nunca 502: o edge da Cloudflare intercepta 502 da origem e troca o
    // body JSON de diagnóstico pela página HTML de erro dele.
    return toError(message, trace, resolveCfpwErrorStatus(error));
  }
}
