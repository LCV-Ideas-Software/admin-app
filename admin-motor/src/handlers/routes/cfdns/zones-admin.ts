// DNS-3: ciclo de vida de zonas (listar, criar, excluir, pausar, checar
// ativação) com guarda reforçada para a zona crítica — a zona que hospeda o
// admin-app e os demais apps. Ações destrutivas na zona crítica exigem
// confirmação por nome digitado + flag explícita de ciência.

import { ADMIN_ORIGIN } from '../../../../../functions/api/_lib/http-common';
import { resolveAdminActorFromRequest } from '../_lib/admin-actor';
import { CfApiError, cfApiRequest, cfPagePaginate } from '../_lib/cf-api-core';
import { resolveCloudflareAccount } from '../_lib/cloudflare-api';
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

type CloudflareZoneRaw = {
  id?: string;
  name?: string;
  status?: string;
  paused?: boolean;
  type?: string;
  plan?: {
    legacy_id?: string;
    name?: string;
  };
  name_servers?: string[];
  original_name_servers?: string[] | null;
};

// Host do admin-app, derivado da constante canônica ADMIN_ORIGIN
// ('https://admin.lcv.app.br'). Uma zona é crítica quando esse host pertence a
// ela: derrubá-la derruba o próprio admin-app e todos os apps hospedados.
const ADMIN_HOST = new URL(ADMIN_ORIGIN).hostname;

/** Zona crítica: hospeda o host do admin-app (igual ou sufixo do domínio). */
export const isCriticalZoneName = (zoneName: string): boolean => {
  const normalized = zoneName.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return ADMIN_HOST === normalized || ADMIN_HOST.endsWith(`.${normalized}`);
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

const toZoneSummary = (zone: CloudflareZoneRaw) => {
  const name = String(zone.name ?? '')
    .trim()
    .toLowerCase();

  return {
    id: String(zone.id ?? '').trim(),
    name,
    status: String(zone.status ?? '').trim(),
    paused: Boolean(zone.paused),
    type: String(zone.type ?? '').trim(),
    planLegacyId: zone.plan?.legacy_id ?? null,
    planLabel: zone.plan?.name ?? null,
    nameServers: Array.isArray(zone.name_servers) ? zone.name_servers : [],
    originalNameServers: zone.original_name_servers ?? null,
    critical: isCriticalZoneName(name),
  };
};

// Zona inexistente (ou invisível ao token) responde 404 ou código CF 7003.
const isZoneNotFound = (error: unknown) =>
  error instanceof CfApiError &&
  (error.status === 404 || error.code === 7003 || error.errors.some((detail) => detail.code === 7003));

const resolveErrorStatus = (error: unknown) => {
  if (isZoneNotFound(error)) {
    return 404;
  }
  if (error instanceof CfApiError) {
    if (error.kind === 'missing-token') {
      return 500;
    }
    // Rejeições 4xx da CF voltam com o próprio status e a mensagem traduzida
    // (o edge da Cloudflare substitui corpos 5xx por página HTML de erro).
    if (error.kind === 'api' && error.status >= 400 && error.status < 500) {
      return error.status;
    }
  }
  return 502;
};

const logZonesAdminEvent = async (
  context: Context,
  action: string,
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
        action,
        provider: 'cloudflare-api',
        ...metadata,
      },
    });
  } catch {
    // Telemetria não bloqueia resposta.
  }
};

const readJsonBody = async (request: Request): Promise<Record<string, unknown> | null> => {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const fetchZoneOrThrow = async (env: Env, zoneId: string) => {
  const { result } = await cfApiRequest<CloudflareZoneRaw>(
    env,
    'dns',
    `/zones/${encodeURIComponent(zoneId)}`,
    'Falha ao consultar a zona na Cloudflare — verifique se o zoneId existe e se o token tem acesso à zona',
  );
  return toZoneSummary(result ?? {});
};

// Hostname plausível de domínio: labels [a-z0-9-] sem hífen nas pontas,
// ao menos um ponto e TLD alfabético com 2+ caracteres.
const ZONE_NAME_PATTERN = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

// O per_page máximo do endpoint /zones é 50 (não 500 como em dns_records);
// valores maiores são rejeitados pela API, por isso paginamos todas as páginas.
const ZONES_PER_PAGE = 50;

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request);
  const env = getEnv(context);

  try {
    const rawZones = await cfPagePaginate<CloudflareZoneRaw>(async (page) => {
      const { result, resultInfo } = await cfApiRequest<CloudflareZoneRaw[]>(
        env,
        'dns',
        `/zones?per_page=${ZONES_PER_PAGE}&page=${page}`,
        'Falha ao listar zonas da conta Cloudflare',
      );
      const info = (resultInfo ?? {}) as { total_pages?: number };
      return {
        items: Array.isArray(result) ? result : [],
        totalPages: Number(info.total_pages ?? 1),
      };
    });

    const zones = rawZones
      .map(toZoneSummary)
      .filter((zone) => zone.id && zone.name)
      .sort((a, b) => a.name.localeCompare(b.name));

    await logZonesAdminEvent(context, 'zones-admin-list', { count: zones.length });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        zones,
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao listar zonas da conta Cloudflare.';
    await logZonesAdminEvent(context, 'zones-admin-list', {}, message);
    return toError(message, trace, resolveErrorStatus(error));
  }
}

export async function onRequestPost(context: Context) {
  const trace = createResponseTrace(context.request);
  const env = getEnv(context);

  const body = await readJsonBody(context.request);
  if (!body) {
    return toError('Corpo da requisição inválido: envie JSON com o campo name (domínio da zona).', trace, 400);
  }

  const adminActor = resolveAdminActorFromRequest(context.request, body);
  const name = String(body.name ?? '')
    .trim()
    .toLowerCase();

  if (!name || !ZONE_NAME_PATTERN.test(name)) {
    return toError(
      `Nome de zona inválido: "${name}". Informe um domínio plausível (ex.: exemplo.com.br), sem protocolo nem caminho.`,
      trace,
      400,
    );
  }

  try {
    const account = await resolveCloudflareAccount(env);
    const { result } = await cfApiRequest<CloudflareZoneRaw>(
      env,
      'dns',
      '/zones',
      `Falha ao criar a zona ${name} na Cloudflare`,
      {
        method: 'POST',
        body: JSON.stringify({
          account: { id: account.accountId },
          name,
          type: 'full',
        }),
      },
    );

    const zone = toZoneSummary(result ?? {});
    await logZonesAdminEvent(context, 'zone-create', { adminActor, zoneId: zone.id, zoneName: zone.name });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        zone,
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao criar a zona ${name} na Cloudflare.`;
    await logZonesAdminEvent(context, 'zone-create', { adminActor, zoneName: name }, message);
    return toError(message, trace, resolveErrorStatus(error));
  }
}

const CONFIRM_NAME_MISMATCH = 'Confirmação divergente: digite exatamente o nome da zona';

export async function onRequestDelete(context: Context) {
  const trace = createResponseTrace(context.request);
  const env = getEnv(context);

  const body = await readJsonBody(context.request);
  if (!body) {
    return toError('Corpo da requisição inválido: envie JSON com zoneId e confirmName.', trace, 400);
  }

  const adminActor = resolveAdminActorFromRequest(context.request, body);
  const zoneId = String(body.zoneId ?? '').trim();
  const confirmName = String(body.confirmName ?? '').trim();

  if (!zoneId) {
    return toError('zoneId é obrigatório.', trace, 400);
  }

  try {
    // Re-fetch autoritativo: nome e criticidade vêm da Cloudflare, nunca do
    // cliente — impede que um payload adulterado pule a confirmação reforçada.
    const zone = await fetchZoneOrThrow(env, zoneId);

    if (confirmName !== zone.name) {
      return toError(`${CONFIRM_NAME_MISMATCH} (${zone.name}) para excluí-la.`, trace, 400);
    }

    if (zone.critical && body.confirmCritical !== true) {
      return toError(
        `A zona ${zone.name} é CRÍTICA: excluí-la derruba o admin-app e todos os apps hospedados nela. Marque a confirmação de ciência (confirmCritical) para prosseguir.`,
        trace,
        400,
      );
    }

    await cfApiRequest<{ id?: string }>(
      env,
      'dns',
      `/zones/${encodeURIComponent(zoneId)}`,
      `Falha ao excluir a zona ${zone.name} na Cloudflare`,
      { method: 'DELETE' },
    );

    await logZonesAdminEvent(context, 'zone-delete', {
      adminActor,
      zoneId,
      zoneName: zone.name,
      critical: zone.critical,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        zoneId,
        zoneName: zone.name,
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao excluir a zona na Cloudflare.';
    await logZonesAdminEvent(context, 'zone-delete', { adminActor, zoneId }, message);
    return toError(message, trace, resolveErrorStatus(error));
  }
}

export async function onRequestPatch(context: Context) {
  const trace = createResponseTrace(context.request);
  const env = getEnv(context);

  const body = await readJsonBody(context.request);
  if (!body) {
    return toError('Corpo da requisição inválido: envie JSON com zoneId e paused (boolean).', trace, 400);
  }

  const adminActor = resolveAdminActorFromRequest(context.request, body);
  const zoneId = String(body.zoneId ?? '').trim();
  const paused = body.paused;

  if (!zoneId) {
    return toError('zoneId é obrigatório.', trace, 400);
  }
  if (typeof paused !== 'boolean') {
    return toError('paused (boolean) é obrigatório: true para pausar, false para despausar.', trace, 400);
  }

  const action = paused ? 'zone-pause' : 'zone-unpause';

  try {
    // Re-fetch autoritativo (nome + criticidade) antes de pausar; despausar
    // não exige confirmação — restaura o serviço, não o degrada.
    const zone = await fetchZoneOrThrow(env, zoneId);

    if (paused && zone.critical) {
      const confirmName = String(body.confirmName ?? '').trim();
      if (confirmName !== zone.name) {
        return toError(`${CONFIRM_NAME_MISMATCH} (${zone.name}) para pausá-la.`, trace, 400);
      }
      if (body.confirmCritical !== true) {
        return toError(
          `A zona ${zone.name} é CRÍTICA: pausá-la derruba o admin-app e todos os apps hospedados nela. Marque a confirmação de ciência (confirmCritical) para prosseguir.`,
          trace,
          400,
        );
      }
    }

    // A API de PATCH /zones/{id} aceita SOMENTE 1 propriedade por chamada;
    // o corpo enviado à CF é exclusivamente { paused }.
    const { result } = await cfApiRequest<CloudflareZoneRaw>(
      env,
      'dns',
      `/zones/${encodeURIComponent(zoneId)}`,
      `Falha ao ${paused ? 'pausar' : 'despausar'} a zona ${zone.name} na Cloudflare`,
      {
        method: 'PATCH',
        body: JSON.stringify({ paused }),
      },
    );

    await logZonesAdminEvent(context, action, { adminActor, zoneId, zoneName: zone.name, critical: zone.critical });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        zone: toZoneSummary(result ?? {}),
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao atualizar o estado de pausa da zona.';
    await logZonesAdminEvent(context, action, { adminActor, zoneId }, message);
    return toError(message, trace, resolveErrorStatus(error));
  }
}

// A checagem de ativação é rate-limitada pela própria Cloudflare por zona.
const ACTIVATION_CHECK_RATE_LIMIT_MESSAGE =
  'Verificação de ativação limitada pela Cloudflare: a cada hora no plano Free, a cada 5 minutos nos pagos — aguarde e tente novamente';

const isActivationCheckRateLimited = (error: unknown) =>
  error instanceof CfApiError && (error.status === 429 || error.code === 1224);

export async function onRequestPostActivationCheck(context: Context) {
  const trace = createResponseTrace(context.request);
  const env = getEnv(context);

  const body = await readJsonBody(context.request);
  if (!body) {
    return toError('Corpo da requisição inválido: envie JSON com zoneId.', trace, 400);
  }

  const adminActor = resolveAdminActorFromRequest(context.request, body);
  const zoneId = String(body.zoneId ?? '').trim();

  if (!zoneId) {
    return toError('zoneId é obrigatório.', trace, 400);
  }

  try {
    const { result } = await cfApiRequest<{ id?: string }>(
      env,
      'dns',
      `/zones/${encodeURIComponent(zoneId)}/activation_check`,
      'Falha ao disparar a verificação de ativação da zona na Cloudflare',
      { method: 'PUT' },
    );

    await logZonesAdminEvent(context, 'zone-activation-check', { adminActor, zoneId });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        zoneId: String(result?.id ?? zoneId),
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const rateLimited = isActivationCheckRateLimited(error);
    const message = rateLimited
      ? ACTIVATION_CHECK_RATE_LIMIT_MESSAGE
      : error instanceof Error
        ? error.message
        : 'Falha ao disparar a verificação de ativação da zona.';

    await logZonesAdminEvent(context, 'zone-activation-check', { adminActor, zoneId }, message);
    return toError(message, trace, rateLimited ? 429 : resolveErrorStatus(error));
  }
}
