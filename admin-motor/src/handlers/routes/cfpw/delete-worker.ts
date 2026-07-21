import { deleteCloudflareWorker, resolveCloudflarePwAccount } from '../_lib/cfpw-api';
import type { D1Database } from '../_lib/operational';
import { logModuleOperationalEvent } from '../_lib/operational';
import { createResponseTrace } from '../_lib/request-trace';
import { assertWorkerMutationAllowed, ProtectedWorkerError } from './_protected';

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

type DeleteWorkerPayload = {
  scriptName?: unknown;
  confirmation?: unknown;
  confirmPhrase?: unknown;
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

const toText = (value: unknown) => String(value ?? '').trim();

export async function onRequestPost(context: Context) {
  const trace = createResponseTrace(context.request);

  let payload: DeleteWorkerPayload;
  try {
    payload = (await context.request.json()) as DeleteWorkerPayload;
  } catch {
    return toError('JSON inválido no corpo da requisição.', trace, 400);
  }

  const scriptName = toText(payload.scriptName);
  const confirmation = toText(payload.confirmation);

  if (!scriptName) {
    return toError('Campo scriptName é obrigatório.', trace, 400);
  }

  if (confirmation !== scriptName) {
    return toError(`Confirmação inválida. Digite exatamente o nome do Worker (${scriptName}).`, trace, 400);
  }

  // Guard anti-decapitação: worker protegido exige a frase de confirmação
  // explícita ANTES de qualquer chamada à API Cloudflare.
  try {
    assertWorkerMutationAllowed(scriptName, toText(payload.confirmPhrase) || undefined);
  } catch (error) {
    if (error instanceof ProtectedWorkerError) {
      return toError(error.message, trace, error.status);
    }
    throw error;
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(context.data?.env ?? context.env);
    await deleteCloudflareWorker(context.data?.env ?? context.env, accountInfo.accountId, scriptName);

    const db = (context.data?.env ?? context.env).BIGDATA_DB;
    if (db) {
      try {
        await logModuleOperationalEvent(db, {
          module: 'cfpw',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'delete-worker',
            provider: 'cloudflare-api',
            accountId: accountInfo.accountId,
            scriptName,
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
        message: `Worker ${scriptName} removido com sucesso.`,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao remover Worker ${scriptName}.`;

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
            action: 'delete-worker',
            provider: 'cloudflare-api',
            scriptName,
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    // Falha de upstream vira 500 — nunca 502: o edge da Cloudflare intercepta
    // 502 da origem e troca o body JSON de diagnóstico pela página HTML dele.
    return toError(message, trace, 500);
  }
}
