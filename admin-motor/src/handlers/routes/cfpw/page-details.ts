import {
  getCloudflarePagesProject,
  listCloudflarePagesDeployments,
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

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request);
  const url = new URL(context.request.url);
  const projectName = toProjectName(url.searchParams.get('projectName'));

  if (!projectName) {
    return toError('Parâmetro projectName é obrigatório.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount((context as any).data?.env || context.env);

    const [projectResult, deploymentsResult] = await Promise.allSettled([
      getCloudflarePagesProject((context as any).data?.env || context.env, accountInfo.accountId, projectName),
      listCloudflarePagesDeployments((context as any).data?.env || context.env, accountInfo.accountId, projectName),
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

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
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
        warnings,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao carregar detalhes do Pages ${projectName}.`;

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
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
