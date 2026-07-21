// DNS-3: leitura e alteração das configurações DNS da zona
// (GET/PATCH /zones/{id}/dns_settings). O PATCH aceita somente uma whitelist
// de chaves validadas; o diff de campos alterados é responsabilidade do
// frontend — aqui apenas repassamos as chaves presentes (já validadas).

import { resolveAdminActorFromRequest } from '../_lib/admin-actor';
import { CfApiError, cfApiRequest } from '../_lib/cf-api-core';
import type { D1Database } from '../_lib/operational';
import { logModuleOperationalEvent } from '../_lib/operational';
import { createResponseTrace } from '../_lib/request-trace';

type Env = {
  BIGDATA_DB?: D1Database;
  CLOUDFLARE_DNS?: string;
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
    if (error.kind === 'api' && error.status >= 400 && error.status < 500) {
      return error.status;
    }
  }
  return 502;
};

const logDnsSettingsEvent = async (
  context: Context,
  action: 'dns-settings-get' | 'dns-settings-patch',
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

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request);
  const url = new URL(context.request.url);
  const zoneId = String(url.searchParams.get('zoneId') ?? '').trim();
  const env = getEnv(context);

  if (!zoneId) {
    return toError('Parâmetro zoneId é obrigatório.', trace, 400);
  }

  try {
    const { result } = await cfApiRequest<Record<string, unknown>>(
      env,
      'dns',
      `/zones/${encodeURIComponent(zoneId)}/dns_settings`,
      'Falha ao consultar as configurações DNS da zona na Cloudflare',
    );

    await logDnsSettingsEvent(context, 'dns-settings-get', { zoneId });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        zoneId,
        settings: result ?? {},
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar as configurações DNS da zona.';
    await logDnsSettingsEvent(context, 'dns-settings-get', { zoneId }, message);
    return toError(message, trace, resolveErrorStatus(error));
  }
}

// Erro de validação local de configurações: vira HTTP 400 no handler.
class DnsSettingsValidationError extends Error {}

const ALLOWED_SETTINGS_KEYS = [
  'flatten_all_cnames',
  'foundation_dns',
  'multi_provider',
  'ns_ttl',
  'secondary_overrides',
  'zone_mode',
  'nameservers',
  'soa',
];

const BOOLEAN_SETTINGS_KEYS = ['flatten_all_cnames', 'foundation_dns', 'multi_provider', 'secondary_overrides'];

const ZONE_MODE_VALUES = ['standard', 'cdn_only', 'dns_only'];

const NAMESERVERS_TYPE_VALUES = ['cloudflare.standard', 'custom.account', 'custom.tenant', 'custom.zone'];

const assertIntInRange = (label: string, value: unknown, min: number, max: number) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new DnsSettingsValidationError(`${label} inválido: informe um inteiro entre ${min} e ${max}.`);
  }
};

const assertNonEmptyString = (label: string, value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new DnsSettingsValidationError(`${label} é obrigatório: informe um texto não vazio.`);
  }
};

// A CF substitui o objeto soa inteiro no PATCH: todos os 7 campos são
// obrigatórios juntos, cada um dentro da faixa documentada.
const validateSoa = (soa: Record<string, unknown>) => {
  assertIntInRange('soa.expire', soa.expire, 86400, 2419200);
  assertIntInRange('soa.min_ttl', soa.min_ttl, 60, 86400);
  assertNonEmptyString('soa.mname', soa.mname);
  assertIntInRange('soa.refresh', soa.refresh, 600, 86400);
  assertIntInRange('soa.retry', soa.retry, 600, 86400);
  assertNonEmptyString('soa.rname', soa.rname);
  assertIntInRange('soa.ttl', soa.ttl, 300, 86400);
};

const validateNameservers = (nameservers: Record<string, unknown>) => {
  const type = String(nameservers.type ?? '');
  if (!NAMESERVERS_TYPE_VALUES.includes(type)) {
    throw new DnsSettingsValidationError(
      `nameservers.type inválido: "${type}". Valores aceitos: ${NAMESERVERS_TYPE_VALUES.join(', ')}.`,
    );
  }
  if (nameservers.ns_set != null) {
    assertIntInRange('nameservers.ns_set', nameservers.ns_set, 1, 5);
  }
};

/**
 * Valida a whitelist de configurações DNS e devolve o corpo a repassar à CF
 * (somente as chaves presentes). Chave desconhecida ou valor fora da faixa
 * lança DnsSettingsValidationError com mensagem diagnóstica.
 */
const buildSettingsPatchBody = (settings: Record<string, unknown>): Record<string, unknown> => {
  const unknownKeys = Object.keys(settings).filter((key) => !ALLOWED_SETTINGS_KEYS.includes(key));
  if (unknownKeys.length > 0) {
    throw new DnsSettingsValidationError(
      `Configuração DNS desconhecida: ${unknownKeys.join(', ')}. Chaves aceitas: ${ALLOWED_SETTINGS_KEYS.join(', ')}.`,
    );
  }

  const cfBody: Record<string, unknown> = {};

  for (const key of BOOLEAN_SETTINGS_KEYS) {
    if (!(key in settings)) {
      continue;
    }
    if (typeof settings[key] !== 'boolean') {
      throw new DnsSettingsValidationError(`${key} deve ser boolean (true/false).`);
    }
    cfBody[key] = settings[key];
  }

  if ('ns_ttl' in settings) {
    assertIntInRange('ns_ttl', settings.ns_ttl, 30, 86400);
    cfBody.ns_ttl = settings.ns_ttl;
  }

  if ('zone_mode' in settings) {
    const zoneMode = String(settings.zone_mode ?? '');
    if (!ZONE_MODE_VALUES.includes(zoneMode)) {
      throw new DnsSettingsValidationError(
        `zone_mode inválido: "${zoneMode}". Valores aceitos: ${ZONE_MODE_VALUES.join(', ')}.`,
      );
    }
    cfBody.zone_mode = zoneMode;
  }

  if ('nameservers' in settings) {
    const nameservers = settings.nameservers;
    if (!nameservers || typeof nameservers !== 'object') {
      throw new DnsSettingsValidationError('nameservers deve ser um objeto { type, ns_set? }.');
    }
    validateNameservers(nameservers as Record<string, unknown>);
    cfBody.nameservers = nameservers;
  }

  if ('soa' in settings) {
    const soa = settings.soa;
    if (!soa || typeof soa !== 'object') {
      throw new DnsSettingsValidationError(
        'soa deve ser um objeto completo { expire, min_ttl, mname, refresh, retry, rname, ttl }.',
      );
    }
    validateSoa(soa as Record<string, unknown>);
    cfBody.soa = soa;
  }

  if (Object.keys(cfBody).length === 0) {
    throw new DnsSettingsValidationError('Informe ao menos uma configuração DNS para alterar.');
  }

  return cfBody;
};

export async function onRequestPatch(context: Context) {
  const trace = createResponseTrace(context.request);
  const env = getEnv(context);

  let body: { zoneId?: unknown; settings?: unknown };
  try {
    body = (await context.request.json()) as { zoneId?: unknown; settings?: unknown };
  } catch {
    return toError('Corpo da requisição inválido: envie JSON com zoneId e settings.', trace, 400);
  }

  const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>);
  const zoneId = String(body.zoneId ?? '').trim();

  if (!zoneId) {
    return toError('zoneId é obrigatório.', trace, 400);
  }
  if (!body.settings || typeof body.settings !== 'object') {
    return toError('settings (objeto com as configurações a alterar) é obrigatório.', trace, 400);
  }

  let cfBody: Record<string, unknown>;
  try {
    cfBody = buildSettingsPatchBody(body.settings as Record<string, unknown>);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Configurações DNS inválidas.';
    return toError(message, trace, 400);
  }

  try {
    const { result } = await cfApiRequest<Record<string, unknown>>(
      env,
      'dns',
      `/zones/${encodeURIComponent(zoneId)}/dns_settings`,
      'Falha ao alterar as configurações DNS da zona na Cloudflare',
      {
        method: 'PATCH',
        body: JSON.stringify(cfBody),
      },
    );

    await logDnsSettingsEvent(context, 'dns-settings-patch', { adminActor, zoneId, fields: Object.keys(cfBody) });

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        zoneId,
        settings: result ?? {},
      }),
      { headers: toHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao alterar as configurações DNS da zona.';
    await logDnsSettingsEvent(
      context,
      'dns-settings-patch',
      { adminActor, zoneId, fields: Object.keys(cfBody) },
      message,
    );
    return toError(message, trace, resolveErrorStatus(error));
  }
}
