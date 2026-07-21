// GET /api/cfpw/worker-settings — passthrough dos settings do script CF.
// PATCH /api/cfpw/worker-settings — atualiza settings com whitelist de chaves
// e preservação de secrets: bindings 'inherit' e 'secret_text' sem text
// passam como estão (a CF preserva os valores); secret_text COM text é
// rejeitado — secrets são gerenciados pelo fluxo de secrets, não aqui.

import { cfApiRequest } from '../_lib/cf-api-core';
import { resolveCloudflarePwAccount } from '../_lib/cfpw-api';
import { createResponseTrace } from '../_lib/request-trace';
import { assertWorkerMutationAllowed } from './_protected';
import {
  type CfpwRouteContext,
  getRouteEnv,
  logCfpwEvent,
  resolveCfpwErrorStatus,
  toErrorResponse,
  toJsonResponse,
} from './_respond';

const ALLOWED_SETTINGS_KEYS = [
  'bindings',
  'compatibility_date',
  'compatibility_flags',
  'placement',
  'logpush',
  'tail_consumers',
  'observability',
  'limits',
  'usage_model',
] as const;

const CPU_MS_MAX = 300000;

type PatchSettingsPayload = {
  scriptName?: unknown;
  confirmPhrase?: unknown;
  settings?: unknown;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Devolve mensagem de erro pt-BR ou null quando válido.
const validateBindings = (value: unknown): string | null => {
  if (!Array.isArray(value)) {
    return 'settings.bindings precisa ser um array.';
  }
  for (const entry of value) {
    if (!isPlainObject(entry)) {
      return 'Cada binding precisa ser um objeto com type e name.';
    }
    const type = String(entry.type ?? '').trim();
    const name = String(entry.name ?? '').trim();
    if (!type || !name) {
      return 'Cada binding precisa de type e name não vazios.';
    }
    if (type === 'secret_text' && 'text' in entry) {
      return `Binding secret_text ('${name}') não pode trazer o campo text: secrets são gerenciados pelo fluxo de secrets do Worker, não por settings. Envie apenas {type: 'secret_text', name} para preservar o valor atual.`;
    }
  }
  return null;
};

const validateCompatibilityDate = (value: unknown): string | null => {
  const raw = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) {
    return 'settings.compatibility_date inválida: use o formato YYYY-MM-DD.';
  }
  const todayUtc = new Date().toISOString().slice(0, 10);
  if (raw > todayUtc) {
    return `settings.compatibility_date não pode estar no futuro (hoje UTC: ${todayUtc}).`;
  }
  return null;
};

const validateSettings = (settings: Record<string, unknown>): string | null => {
  const unknownKeys = Object.keys(settings).filter(
    (key) => !ALLOWED_SETTINGS_KEYS.includes(key as (typeof ALLOWED_SETTINGS_KEYS)[number]),
  );
  if (unknownKeys.length > 0) {
    return `Chaves não suportadas em settings: ${unknownKeys.join(', ')}. Permitidas: ${ALLOWED_SETTINGS_KEYS.join(', ')}.`;
  }

  if ('bindings' in settings) {
    const error = validateBindings(settings.bindings);
    if (error) {
      return error;
    }
  }

  if ('compatibility_date' in settings) {
    const error = validateCompatibilityDate(settings.compatibility_date);
    if (error) {
      return error;
    }
  }

  if ('compatibility_flags' in settings) {
    const flags = settings.compatibility_flags;
    if (!Array.isArray(flags) || flags.some((flag) => typeof flag !== 'string' || !flag.trim())) {
      return 'settings.compatibility_flags precisa ser um array de strings não vazias.';
    }
  }

  if ('placement' in settings && settings.placement !== null) {
    if (!isPlainObject(settings.placement) || settings.placement.mode !== 'smart') {
      return "settings.placement precisa ser null ou {mode: 'smart'}.";
    }
  }

  if ('logpush' in settings && typeof settings.logpush !== 'boolean') {
    return 'settings.logpush precisa ser booleano.';
  }

  if ('tail_consumers' in settings && settings.tail_consumers !== null) {
    const consumers = settings.tail_consumers;
    const isValid =
      Array.isArray(consumers) &&
      consumers.every(
        (consumer) =>
          isPlainObject(consumer) &&
          typeof consumer.service === 'string' &&
          consumer.service.trim() !== '' &&
          (consumer.environment === undefined || typeof consumer.environment === 'string'),
      );
    if (!isValid) {
      return 'settings.tail_consumers precisa ser null ou um array de {service, environment?}.';
    }
  }

  if ('observability' in settings) {
    const observability = settings.observability;
    if (!isPlainObject(observability) || typeof observability.enabled !== 'boolean') {
      return 'settings.observability precisa ser um objeto com enabled booleano.';
    }
    if ('head_sampling_rate' in observability) {
      const rate = observability.head_sampling_rate;
      if (typeof rate !== 'number' || !(rate > 0) || rate > 1) {
        return 'settings.observability.head_sampling_rate precisa ser um número maior que 0 e no máximo 1.';
      }
    }
  }

  if ('limits' in settings && settings.limits !== null) {
    const limits = settings.limits;
    const cpuMs = isPlainObject(limits) ? limits.cpu_ms : undefined;
    if (!isPlainObject(limits) || !Number.isInteger(cpuMs) || Number(cpuMs) < 1 || Number(cpuMs) > CPU_MS_MAX) {
      return `settings.limits precisa ser null ou {cpu_ms} com inteiro entre 1 e ${CPU_MS_MAX}.`;
    }
  }

  if ('usage_model' in settings && (typeof settings.usage_model !== 'string' || !settings.usage_model.trim())) {
    return 'settings.usage_model precisa ser uma string não vazia.';
  }

  return null;
};

export async function onRequestGet(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const scriptName = String(new URL(context.request.url).searchParams.get('scriptName') ?? '').trim();

  if (!scriptName) {
    return toErrorResponse('Parâmetro scriptName é obrigatório.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    const settingsPayload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/workers/scripts/${encodeURIComponent(scriptName)}/settings`,
      `Falha ao ler settings do Worker ${scriptName}`,
    );

    await logCfpwEvent(env, 'worker-settings-get', true, {
      accountId: accountInfo.accountId,
      scriptName,
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      scriptName,
      settings: settingsPayload.result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao ler settings do Worker ${scriptName}.`;
    await logCfpwEvent(env, 'worker-settings-get', false, { scriptName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestPatch(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  let payload: PatchSettingsPayload;
  try {
    payload = (await context.request.json()) as PatchSettingsPayload;
  } catch {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const scriptName = String(payload.scriptName ?? '').trim();
  const confirmPhrase = typeof payload.confirmPhrase === 'string' ? payload.confirmPhrase : undefined;

  if (!scriptName) {
    return toErrorResponse('Campo scriptName é obrigatório.', trace, 400);
  }

  if (!isPlainObject(payload.settings) || Object.keys(payload.settings).length === 0) {
    return toErrorResponse('Campo settings é obrigatório: envie um objeto com as chaves a atualizar.', trace, 400);
  }

  const validationError = validateSettings(payload.settings);
  if (validationError) {
    return toErrorResponse(validationError, trace, 400);
  }

  try {
    assertWorkerMutationAllowed(scriptName, confirmPhrase);

    const accountInfo = await resolveCloudflarePwAccount(env);

    const form = new FormData();
    form.append('settings', new Blob([JSON.stringify(payload.settings)], { type: 'application/json' }));

    const patchPayload = await cfApiRequest<Record<string, unknown>>(
      env,
      'pw',
      `/accounts/${encodeURIComponent(accountInfo.accountId)}/workers/scripts/${encodeURIComponent(scriptName)}/settings`,
      `Falha ao atualizar settings do Worker ${scriptName}`,
      {
        method: 'PATCH',
        body: form,
      },
    );

    await logCfpwEvent(env, 'worker-settings-patch', true, {
      accountId: accountInfo.accountId,
      scriptName,
      keys: Object.keys(payload.settings),
    });

    return toJsonResponse({
      ok: true,
      ...trace,
      scriptName,
      settings: patchPayload.result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao atualizar settings do Worker ${scriptName}.`;
    await logCfpwEvent(env, 'worker-settings-patch', false, { scriptName }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}
