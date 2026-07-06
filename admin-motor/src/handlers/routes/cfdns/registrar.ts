import {
  CloudflareRequestError,
  checkCloudflareRegistrarDomains,
  createCloudflareRegistrarRegistration,
  getCloudflareRegistrarRegistration,
  getCloudflareRegistrarRegistrationStatus,
  getCloudflareRegistrarUpdateStatus,
  listCloudflareRegistrarRegistrations,
  searchCloudflareRegistrarDomains,
  updateCloudflareRegistrarDomain,
  updateCloudflareRegistrarRegistration,
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

// Mapeia uma falha para o status HTTP que o admin deve ver. Uma rejeição da API
// Cloudflare (4xx, incluindo 429) não é falha de gateway: devolve o próprio 4xx
// para que o corpo JSON com a mensagem real chegue ao browser — o edge da
// Cloudflare substitui o corpo de respostas 5xx por uma página HTML de erro.
// Token ausente é erro de configuração (500); demais falhas de upstream
// permanecem como 502 (bad gateway).
const resolveUpstreamStatus = (error: unknown): number => {
  if (error instanceof CloudflareRequestError && error.status >= 400 && error.status <= 499) {
    return error.status;
  }
  if (error instanceof Error && /Token Cloudflare ausente/.test(error.message)) {
    return 500;
  }
  return 502;
};

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
      ...(errorMessage !== undefined ? { errorMessage } : {}),
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

const readJsonBody = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error('Body JSON inválido.');
  }
};

const getSearchOptions = (request: Request) => {
  const url = new URL(request.url);
  const q = String(url.searchParams.get('q') ?? '').trim();
  const limitRaw = url.searchParams.get('limit');
  const extensionsRaw = String(url.searchParams.get('extensions') ?? '').trim();
  const extensions = extensionsRaw
    ? extensionsRaw
        .split(',')
        .map((extension) => extension.trim())
        .filter(Boolean)
    : [];

  return {
    q,
    ...(limitRaw == null || limitRaw === '' ? {} : { limit: Number(limitRaw) }),
    extensions,
  };
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
    return toError(message, trace, resolveUpstreamStatus(error));
  }
}

export async function onRequestGetSearch(context: Context) {
  const trace = createResponseTrace(context.request);
  const options = getSearchOptions(context.request);
  if (!options.q) {
    return toError('Parâmetro q é obrigatório.', trace, 400);
  }

  try {
    const payload = await searchCloudflareRegistrarDomains(getEnv(context), options);
    await logRegistrarEvent(context, trace, {
      action: 'registrar-domain-search',
      accountSource: payload.account.source,
      q: options.q,
      count: payload.domains.length,
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
    const message = error instanceof Error ? error.message : 'Falha ao buscar domínios no Registrar.';
    await logRegistrarEvent(context, trace, { action: 'registrar-domain-search', q: options.q }, message);
    return toError(message, trace, resolveUpstreamStatus(error));
  }
}

export async function onRequestPostCheck(context: Context) {
  const trace = createResponseTrace(context.request);

  try {
    const body = await readJsonBody<{ domains?: string[] }>(context.request);
    const domains = Array.isArray(body.domains) ? body.domains : [];
    const payload = await checkCloudflareRegistrarDomains(getEnv(context), domains);
    await logRegistrarEvent(context, trace, {
      action: 'registrar-domain-check',
      accountSource: payload.account.source,
      domains: payload.domains.map((domain) => domain.name),
      count: payload.domains.length,
      skippedCount: payload.skipped.length,
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
    const message = error instanceof Error ? error.message : 'Falha ao checar disponibilidade no Registrar.';
    await logRegistrarEvent(context, trace, { action: 'registrar-domain-check' }, message);
    return toError(
      message,
      trace,
      message.includes('JSON') || message.includes('domínio') ? 400 : resolveUpstreamStatus(error),
    );
  }
}

export async function onRequestPostRegistration(context: Context) {
  const trace = createResponseTrace(context.request);

  try {
    const body = await readJsonBody<{
      domain_name?: string;
      auto_renew?: boolean;
      privacy_mode?: 'off' | 'redaction';
      years?: number;
      contacts?: Record<string, unknown>;
    }>(context.request);
    const payload = await createCloudflareRegistrarRegistration(getEnv(context), {
      domain_name: String(body.domain_name ?? ''),
      ...(body.auto_renew !== undefined ? { auto_renew: body.auto_renew } : {}),
      ...(body.privacy_mode !== undefined ? { privacy_mode: body.privacy_mode } : {}),
      ...(body.years !== undefined ? { years: body.years } : {}),
      ...(body.contacts !== undefined ? { contacts: body.contacts } : {}),
    });
    await logRegistrarEvent(context, trace, {
      action: 'registrar-registration-create',
      accountSource: payload.account.source,
      domain: body.domain_name ?? null,
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
    const message = error instanceof Error ? error.message : 'Falha ao registrar domínio no Registrar.';
    await logRegistrarEvent(context, trace, { action: 'registrar-registration-create' }, message);
    return toError(
      message,
      trace,
      message.includes('obrigatório') || message.includes('years') ? 400 : resolveUpstreamStatus(error),
    );
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
    return toError(message, trace, resolveUpstreamStatus(error));
  }
}

export async function onRequestPatchRegistration(context: Context) {
  const trace = createResponseTrace(context.request);
  const domain = getRequiredDomain(context.request);
  if (!domain) {
    return toError('Parâmetro domain é obrigatório.', trace, 400);
  }

  try {
    const body = await readJsonBody<{ auto_renew?: boolean }>(context.request);
    if (typeof body.auto_renew !== 'boolean') {
      return toError('auto_renew booleano é obrigatório.', trace, 400);
    }
    const payload = await updateCloudflareRegistrarRegistration(getEnv(context), domain, {
      auto_renew: body.auto_renew,
    });
    await logRegistrarEvent(context, trace, {
      action: 'registrar-registration-update',
      accountSource: payload.account.source,
      domain,
      auto_renew: body.auto_renew,
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
    const message = error instanceof Error ? error.message : 'Falha ao atualizar registro Registrar.';
    await logRegistrarEvent(context, trace, { action: 'registrar-registration-update', domain }, message);
    return toError(
      message,
      trace,
      message.includes('JSON') || message.includes('auto_renew') ? 400 : resolveUpstreamStatus(error),
    );
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
      workflowMissing: payload.workflow_missing ?? false,
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
    return toError(message, trace, resolveUpstreamStatus(error));
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
      workflowMissing: payload.workflow_missing ?? false,
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
    return toError(message, trace, resolveUpstreamStatus(error));
  }
}

export async function onRequestPutDomain(context: Context) {
  const trace = createResponseTrace(context.request);
  const domain = getRequiredDomain(context.request);
  if (!domain) {
    return toError('Parâmetro domain é obrigatório.', trace, 400);
  }

  try {
    const body = await readJsonBody<{ locked?: boolean; privacy?: boolean }>(context.request);
    const patch: { locked?: boolean; privacy?: boolean } = {};
    if (typeof body.locked === 'boolean') {
      patch.locked = body.locked;
    }
    if (typeof body.privacy === 'boolean') {
      patch.privacy = body.privacy;
    }
    if (patch.locked === undefined && patch.privacy === undefined) {
      return toError('Informe locked e/ou privacy (booleano) para atualizar o domínio.', trace, 400);
    }

    const payload = await updateCloudflareRegistrarDomain(getEnv(context), domain, patch);
    await logRegistrarEvent(context, trace, {
      action: 'registrar-domain-update',
      accountSource: payload.account.source,
      domain,
      locked: patch.locked ?? null,
      privacy: patch.privacy ?? null,
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
    const message = error instanceof Error ? error.message : 'Falha ao atualizar domínio Registrar.';
    await logRegistrarEvent(context, trace, { action: 'registrar-domain-update', domain }, message);
    return toError(
      message,
      trace,
      message.includes('JSON') || message.includes('locked') || message.includes('privacy')
        ? 400
        : resolveUpstreamStatus(error),
    );
  }
}
