import {
  getCloudflareRegistrarRegistration,
  getCloudflareRegistrarRegistrationStatus,
  getCloudflareRegistrarUpdateStatus,
  listCloudflareRegistrarRegistrations,
} from '../_lib/cloudflare-api';
import type { D1Database } from '../_lib/operational';
import { logModuleOperationalEvent } from '../_lib/operational';
import { createResponseTrace } from '../_lib/request-trace';

type Env = {
  BIGDATA_DB?: D1Database;
  CLOUDFLARE_DNS?: string;
  CLOUDFLARE_PW?: string;
  CLOUDFLARE_CACHE?: string;
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

const getEnv = (context: Context) => context.data?.env ?? context.env;

const logRegistrarEvent = async (
  context: Context,
  trace: { request_id: string; timestamp: string },
  metadata: Record<string, unknown>,
  errorMessage?: string,
) => {
  const env = getEnv(context);
  if (!env.BIGDATA_DB) {
    return;
  }

  try {
    await logModuleOperationalEvent(env.BIGDATA_DB, {
      module: 'cfdns',
      source: 'bigdata_db',
      fallbackUsed: false,
      ok: !errorMessage,
      errorMessage,
      metadata: {
        provider: 'cloudflare-registrar-api',
        request_id: trace.request_id,
        ...metadata,
      },
    });
  } catch {
    // Telemetria não bloqueia resposta.
  }
};

const getRequiredDomain = (request: Request) => {
  const url = new URL(request.url);
  return String(url.searchParams.get('domain') ?? '').trim();
};

export async function onRequestGetRegistrations(context: Context) {
  const trace = createResponseTrace(context.request);

  try {
    const payload = await listCloudflareRegistrarRegistrations(getEnv(context));
    await logRegistrarEvent(context, trace, {
      action: 'registrar-registrations-list',
      accountSource: payload.account.source,
      count: payload.pagination.count,
      totalCount: payload.pagination.totalCount,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        ...payload,
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao listar domínios registrados na Cloudflare.';
    await logRegistrarEvent(context, trace, { action: 'registrar-registrations-list' }, message);
    return toError(message, trace, 502);
  }
}

export async function onRequestGetRegistration(context: Context) {
  const trace = createResponseTrace(context.request);
  const domain = getRequiredDomain(context.request);
  if (!domain) {
    return toError('Parâmetro domain é obrigatório.', trace, 400);
  }

  try {
    const payload = await getCloudflareRegistrarRegistration(getEnv(context), domain);
    await logRegistrarEvent(context, trace, {
      action: 'registrar-registration-get',
      accountSource: payload.account.source,
      domain: payload.registration.domain_name,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        ...payload,
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar registro Registrar.';
    await logRegistrarEvent(context, trace, { action: 'registrar-registration-get', domain }, message);
    return toError(message, trace, 502);
  }
}

export async function onRequestGetRegistrationStatus(context: Context) {
  const trace = createResponseTrace(context.request);
  const domain = getRequiredDomain(context.request);
  if (!domain) {
    return toError('Parâmetro domain é obrigatório.', trace, 400);
  }

  try {
    const payload = await getCloudflareRegistrarRegistrationStatus(getEnv(context), domain);
    await logRegistrarEvent(context, trace, {
      action: 'registrar-registration-status-get',
      accountSource: payload.account.source,
      domain,
      state: payload.status?.state ?? null,
      completed: payload.status?.completed ?? null,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        ...payload,
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar status de registro Registrar.';
    await logRegistrarEvent(context, trace, { action: 'registrar-registration-status-get', domain }, message);
    return toError(message, trace, 502);
  }
}

export async function onRequestGetUpdateStatus(context: Context) {
  const trace = createResponseTrace(context.request);
  const domain = getRequiredDomain(context.request);
  if (!domain) {
    return toError('Parâmetro domain é obrigatório.', trace, 400);
  }

  try {
    const payload = await getCloudflareRegistrarUpdateStatus(getEnv(context), domain);
    await logRegistrarEvent(context, trace, {
      action: 'registrar-update-status-get',
      accountSource: payload.account.source,
      domain,
      state: payload.status?.state ?? null,
      completed: payload.status?.completed ?? null,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        ...payload,
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar status de atualização Registrar.';
    await logRegistrarEvent(context, trace, { action: 'registrar-update-status-get', domain }, message);
    return toError(message, trace, 502);
  }
}
