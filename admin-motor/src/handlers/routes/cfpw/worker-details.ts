import { getCloudflareWorker, listCloudflareWorkerDeployments, resolveCloudflarePwAccount } from '../_lib/cfpw-api';
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

const toScriptName = (raw: string | null) => String(raw ?? '').trim();

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request);
  const url = new URL(context.request.url);
  const scriptName = toScriptName(url.searchParams.get('scriptName'));

  if (!scriptName) {
    return toError('Parâmetro scriptName é obrigatório.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount((context as any).data?.env || context.env);

    const [workerResult, deploymentsResult] = await Promise.allSettled([
      getCloudflareWorker((context as any).data?.env || context.env, accountInfo.accountId, scriptName),
      listCloudflareWorkerDeployments((context as any).data?.env || context.env, accountInfo.accountId, scriptName),
    ]);

    const warnings: PartialWarning[] = [];
    const worker = workerResult.status === 'fulfilled' ? workerResult.value : null;
    const deployments = deploymentsResult.status === 'fulfilled' ? deploymentsResult.value : [];

    if (workerResult.status === 'rejected') {
      const message =
        workerResult.reason instanceof Error ? workerResult.reason.message : 'Falha ao ler configurações do Worker.';
      warnings.push({ code: 'CFPW-WORKER-DETAILS-PARTIAL-WORKER', message });
    }

    if (deploymentsResult.status === 'rejected') {
      const message =
        deploymentsResult.reason instanceof Error
          ? deploymentsResult.reason.message
          : 'Falha ao listar deployments do Worker.';
      warnings.push({ code: 'CFPW-WORKER-DETAILS-PARTIAL-DEPLOYMENTS', message });
    }

    if (!worker && deployments.length === 0) {
      const fatal = warnings[0]?.message || `Falha ao carregar detalhes do Worker ${scriptName}.`;
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
            action: 'worker-details',
            provider: 'cloudflare-api',
            accountId: accountInfo.accountId,
            scriptName,
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
        scriptName,
        worker,
        deployments,
        warnings,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao carregar detalhes do Worker ${scriptName}.`;

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
          module: 'cfpw',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'worker-details',
            provider: 'cloudflare-api',
            scriptName,
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return toError(message, trace, 502);
  }
}
