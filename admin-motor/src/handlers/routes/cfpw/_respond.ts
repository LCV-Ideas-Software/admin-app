// Helpers compartilhados pelos handlers cfpw da onda PW-1 (worker-create,
// worker-code, worker-versions, worker-deployments, worker-settings,
// worker-domains): contexto/env, resposta JSON com trace, mapeamento de
// status HTTP e telemetria best-effort.

import { CfApiError } from '../_lib/cf-api-core';
import type { D1Database } from '../_lib/operational';
import { logModuleOperationalEvent } from '../_lib/operational';
import type { ResponseTrace } from '../_lib/request-trace';
import { ProtectedWorkerError } from './_protected';

export type CfpwRouteEnv = {
  BIGDATA_DB?: D1Database;
  CLOUDFLARE_PW?: string;
  CLOUDFLARE_STORAGE?: string;
  CF_ACCOUNT_ID?: string;
};

export type CfpwRouteContext = {
  request: Request;
  env: CfpwRouteEnv;
  data?: {
    env?: CfpwRouteEnv;
  };
};

export type PartialWarning = {
  code: string;
  message: string;
};

export const getRouteEnv = (context: CfpwRouteContext): CfpwRouteEnv => context.data?.env ?? context.env;

const toHeaders = () => ({
  'Content-Type': 'application/json',
});

export const toJsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: toHeaders(),
  });

export const toErrorResponse = (message: string, trace: ResponseTrace, status = 500) =>
  toJsonResponse({ ok: false, ...trace, error: message }, status);

// Mapeamento de status: 400 é validação local (decidida no call site); guard de
// worker protegido devolve 403; token ausente é erro de configuração (500);
// 4xx da API Cloudflare passa adiante com a mensagem traduzida (o edge da
// Cloudflare troca o corpo de respostas 5xx por página HTML); o restante das
// falhas de upstream vira 502 (bad gateway).
export const resolveCfpwErrorStatus = (error: unknown): number => {
  if (error instanceof ProtectedWorkerError) {
    return error.status;
  }

  if (error instanceof CfApiError) {
    if (error.kind === 'missing-token') {
      return 500;
    }
    if (error.status >= 400 && error.status <= 499) {
      return error.status;
    }
    return 502;
  }

  // Helpers legados (cfpw-api) convertem missing-token em Error simples.
  if (error instanceof Error && /Token Cloudflare ausente/.test(error.message)) {
    return 500;
  }

  return 502;
};

/** Telemetria best-effort: nunca bloqueia nem derruba a resposta. */
export const logCfpwEvent = async (
  env: CfpwRouteEnv,
  action: string,
  ok: boolean,
  metadata: Record<string, unknown>,
  errorMessage?: string,
): Promise<void> => {
  const db = env.BIGDATA_DB;
  if (!db) {
    return;
  }

  try {
    await logModuleOperationalEvent(db, {
      module: 'cfpw',
      source: 'bigdata_db',
      fallbackUsed: false,
      ok,
      ...(errorMessage !== undefined ? { errorMessage } : {}),
      metadata: {
        action,
        provider: 'cloudflare-api',
        ...metadata,
      },
    });
  } catch {
    // Telemetria não bloqueia resposta.
  }
};
