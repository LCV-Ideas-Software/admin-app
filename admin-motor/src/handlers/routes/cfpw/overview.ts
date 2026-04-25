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

type Context = {
  request: Request;
  env: {
    BIGDATA_DB?: D1Database;
    CLOUDFLARE_PW?: string;
    CF_ACCOUNT_ID?: string;
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

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request);

  try {
    const accountInfo = await resolveCloudflarePwAccount((context as any).data?.env || context.env);

    const [workersRaw, pagesRaw] = await Promise.all([
      listCloudflareWorkers((context as any).data?.env || context.env, accountInfo.accountId),
      listCloudflarePagesProjects((context as any).data?.env || context.env, accountInfo.accountId),
    ]);

    const workers = workersRaw.map(mapWorker);
    const pages = pagesRaw.map(mapProject);

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
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
          totalWorkers: workers.length,
          totalPages: pages.length,
        },
        workers,
        pages,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Falha ao carregar overview de Cloudflare Pages & Workers.';

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
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

    return toError(message, trace, 502);
  }
}
