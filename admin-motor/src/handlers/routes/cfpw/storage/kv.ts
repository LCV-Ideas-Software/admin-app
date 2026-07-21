// Handlers da onda ST-KV (aba Armazenamento): gestão completa de Workers KV
// via /api/cfpw/storage/kv/*. Validação local devolve 400 diagnóstico em
// pt-BR; falhas da API Cloudflare passam pela tradução do cf-api-core e pelo
// mapeamento de status do _respond. Telemetria best-effort com ações kv-*.

import { CfApiError } from '../../_lib/cf-api-core';
import { resolveCloudflarePwAccount } from '../../_lib/cfpw-api';
import {
  createKvNamespace,
  deleteKvNamespace,
  deleteKvValue,
  fetchKvMetadata,
  fetchKvValueRaw,
  getKvNamespace,
  type KvBulkPair,
  listKvKeys,
  listKvNamespacesPage,
  postKvBulkDelete,
  putKvBulk,
  putKvValue,
  renameKvNamespace,
  searchKvNamespacesByTitle,
} from '../../_lib/kv-api';
import { createResponseTrace } from '../../_lib/request-trace';
import {
  type CfpwRouteContext,
  getRouteEnv,
  logCfpwEvent,
  resolveCfpwErrorStatus,
  toErrorResponse,
  toJsonResponse,
} from '../_respond';

const NAMESPACE_TITLE_MAX_CHARS = 512;
const KEY_MAX_BYTES = 512;
const METADATA_MAX_BYTES = 1024;
const EXPIRATION_TTL_MIN_SECONDS = 60;
const BULK_MAX_ITEMS = 1000;
const INSPECT_MAX_BYTES = 1_048_576;
const KEYS_LIMIT_MIN = 10;
const KEYS_LIMIT_MAX = 1000;
const KEYS_LIMIT_DEFAULT = 100;
const NAMESPACES_PER_PAGE_MIN = 5;
const NAMESPACES_PER_PAGE_MAX = 100;
const NAMESPACES_PER_PAGE_DEFAULT = 20;
const SEARCH_MAX_PAGES = 10;

// Código CF de título duplicado na criação de namespace KV.
const CF_CODE_DUPLICATE_NAMESPACE = 10014;

const utf8ByteLength = (value: string) => new TextEncoder().encode(value).length;

const clampInt = (raw: string | null, fallback: number, min: number, max: number): number => {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
};

const readJsonBody = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
};

const isDuplicateNamespaceError = (error: unknown): boolean =>
  error instanceof CfApiError &&
  (error.code === CF_CODE_DUPLICATE_NAMESPACE ||
    error.errors.some((detail) => detail.code === CF_CODE_DUPLICATE_NAMESPACE));

const validateNamespaceTitle = (title: string): string | null => {
  if (!title) {
    return 'Campo title é obrigatório: informe o título do namespace KV.';
  }
  if (title.length > NAMESPACE_TITLE_MAX_CHARS) {
    return `Título do namespace excede o limite de ${NAMESPACE_TITLE_MAX_CHARS} caracteres (recebido: ${title.length}).`;
  }
  return null;
};

const validateKeyName = (key: string): string | null => {
  if (!key) {
    return 'Campo key é obrigatório: informe o nome da chave KV.';
  }
  const bytes = utf8ByteLength(key);
  if (bytes > KEY_MAX_BYTES) {
    return `Nome da chave excede o limite de ${KEY_MAX_BYTES} bytes UTF-8 (recebido: ${bytes} bytes).`;
  }
  return null;
};

// ── Namespaces ──

export async function onRequestGetNamespaces(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const page = clampInt(url.searchParams.get('page'), 1, 1, Number.MAX_SAFE_INTEGER);
  const perPage = clampInt(
    url.searchParams.get('perPage'),
    NAMESPACES_PER_PAGE_DEFAULT,
    NAMESPACES_PER_PAGE_MIN,
    NAMESPACES_PER_PAGE_MAX,
  );
  const search = String(url.searchParams.get('search') ?? '').trim();

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    if (search) {
      const namespaces = await searchKvNamespacesByTitle(env, accountInfo.accountId, search, {
        maxPages: SEARCH_MAX_PAGES,
      });
      await logCfpwEvent(env, 'kv-namespaces-list', true, {
        accountId: accountInfo.accountId,
        search: true,
        matches: namespaces.length,
      });
      return toJsonResponse({
        ok: true,
        ...trace,
        namespaces,
        pagination: { page: 1, perPage: namespaces.length, totalCount: namespaces.length, totalPages: 1 },
        search,
      });
    }

    const { namespaces, pagination } = await listKvNamespacesPage(env, accountInfo.accountId, page, perPage);
    await logCfpwEvent(env, 'kv-namespaces-list', true, {
      accountId: accountInfo.accountId,
      search: false,
      count: namespaces.length,
    });
    return toJsonResponse({ ok: true, ...trace, namespaces, pagination });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao listar namespaces KV.';
    await logCfpwEvent(env, 'kv-namespaces-list', false, { search: Boolean(search) }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestPostNamespaces(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<{ title?: unknown }>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const title = String(payload.title ?? '').trim();
  const titleError = validateNamespaceTitle(title);
  if (titleError) {
    return toErrorResponse(titleError, trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const namespace = await createKvNamespace(env, accountInfo.accountId, title);
    await logCfpwEvent(env, 'kv-namespace-create', true, {
      accountId: accountInfo.accountId,
      namespaceId: namespace?.id ?? null,
    });
    return toJsonResponse({ ok: true, ...trace, namespace });
  } catch (error) {
    if (isDuplicateNamespaceError(error)) {
      const message = `Já existe um namespace KV com o título "${title}" — escolha outro título (código CF ${CF_CODE_DUPLICATE_NAMESPACE}).`;
      await logCfpwEvent(env, 'kv-namespace-create', false, { duplicate: true }, message);
      return toErrorResponse(message, trace, 409);
    }
    const message = error instanceof Error ? error.message : `Falha ao criar o namespace KV "${title}".`;
    await logCfpwEvent(env, 'kv-namespace-create', false, {}, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestPutNamespaceRename(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<{ namespaceId?: unknown; title?: unknown }>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const namespaceId = String(payload.namespaceId ?? '').trim();
  const title = String(payload.title ?? '').trim();
  if (!namespaceId) {
    return toErrorResponse('Campo namespaceId é obrigatório para renomear o namespace KV.', trace, 400);
  }
  const titleError = validateNamespaceTitle(title);
  if (titleError) {
    return toErrorResponse(titleError, trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    await renameKvNamespace(env, accountInfo.accountId, namespaceId, title);
    await logCfpwEvent(env, 'kv-namespace-rename', true, { accountId: accountInfo.accountId, namespaceId });
    return toJsonResponse({ ok: true, ...trace, namespaceId, title });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao renomear o namespace KV ${namespaceId}.`;
    await logCfpwEvent(env, 'kv-namespace-rename', false, { namespaceId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestDeleteNamespaces(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<{ namespaceId?: unknown; confirmTitle?: unknown }>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const namespaceId = String(payload.namespaceId ?? '').trim();
  const confirmTitle = typeof payload.confirmTitle === 'string' ? payload.confirmTitle : '';
  if (!namespaceId) {
    return toErrorResponse('Campo namespaceId é obrigatório para excluir o namespace KV.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const namespace = await getKvNamespace(env, accountInfo.accountId, namespaceId);
    const realTitle = String(namespace?.title ?? '');
    if (confirmTitle !== realTitle) {
      const message = `Confirmação divergente: digite exatamente o título "${realTitle}" para excluir o namespace KV.`;
      await logCfpwEvent(env, 'kv-namespace-delete', false, { namespaceId, confirmMismatch: true }, message);
      return toErrorResponse(message, trace, 400);
    }

    await deleteKvNamespace(env, accountInfo.accountId, namespaceId);
    await logCfpwEvent(env, 'kv-namespace-delete', true, { accountId: accountInfo.accountId, namespaceId });
    return toJsonResponse({ ok: true, ...trace, namespaceId, deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao excluir o namespace KV ${namespaceId}.`;
    await logCfpwEvent(env, 'kv-namespace-delete', false, { namespaceId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

// ── Chaves ──

export async function onRequestGetKeys(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const namespaceId = String(url.searchParams.get('namespaceId') ?? '').trim();
  const prefix = String(url.searchParams.get('prefix') ?? '');
  const cursor = String(url.searchParams.get('cursor') ?? '').trim();
  const limit = clampInt(url.searchParams.get('limit'), KEYS_LIMIT_DEFAULT, KEYS_LIMIT_MIN, KEYS_LIMIT_MAX);

  if (!namespaceId) {
    return toErrorResponse('Parâmetro namespaceId é obrigatório para listar chaves KV.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const {
      keys,
      cursor: nextCursor,
      listComplete,
    } = await listKvKeys(env, accountInfo.accountId, namespaceId, {
      ...(prefix ? { prefix } : {}),
      ...(cursor ? { cursor } : {}),
      limit,
    });
    await logCfpwEvent(env, 'kv-keys-list', true, {
      accountId: accountInfo.accountId,
      namespaceId,
      count: keys.length,
    });
    return toJsonResponse({ ok: true, ...trace, keys, cursor: nextCursor, listComplete });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao listar chaves do namespace KV.';
    await logCfpwEvent(env, 'kv-keys-list', false, { namespaceId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

// ── Valores ──

// Content-Disposition exige filename ASCII seguro; caracteres fora do conjunto
// viram '_' e o fallback cobre chaves terminadas em '/'.
const toDownloadFilename = (key: string): string => {
  const lastSegment = key.split('/').filter(Boolean).pop() ?? '';
  const sanitized = lastSegment.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100);
  return sanitized || 'kv-value.bin';
};

const parseOptionalInt = (raw: string | null): number | null => {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function onRequestGetValue(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const namespaceId = String(url.searchParams.get('namespaceId') ?? '').trim();
  const key = String(url.searchParams.get('key') ?? '');
  const mode = String(url.searchParams.get('mode') ?? 'inspect').trim();
  // A expiração vem da listagem de chaves (o endpoint de metadata não a
  // devolve); o frontend repassa como parâmetro opcional de passthrough.
  const expiration = parseOptionalInt(url.searchParams.get('expiration'));

  if (!namespaceId || !key) {
    return toErrorResponse('Parâmetros namespaceId e key são obrigatórios para ler um valor KV.', trace, 400);
  }
  if (mode !== 'inspect' && mode !== 'download') {
    return toErrorResponse(`Parâmetro mode inválido: "${mode}" — use inspect ou download.`, trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);

    if (mode === 'download') {
      const upstream = await fetchKvValueRaw(env, accountInfo.accountId, namespaceId, key);
      await logCfpwEvent(env, 'kv-value-download', true, { accountId: accountInfo.accountId, namespaceId });
      return new Response(upstream.body, {
        status: 200,
        headers: {
          'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${toDownloadFilename(key)}"`,
        },
      });
    }

    const [valueOutcome, metadataOutcome] = await Promise.allSettled([
      fetchKvValueRaw(env, accountInfo.accountId, namespaceId, key),
      fetchKvMetadata(env, accountInfo.accountId, namespaceId, key),
    ]);
    if (valueOutcome.status === 'rejected') {
      throw valueOutcome.reason;
    }
    // Metadata é enriquecimento: chave sem metadata devolve erro na CF e vira null.
    const metadata = metadataOutcome.status === 'fulfilled' ? (metadataOutcome.value ?? null) : null;

    const buffer = await valueOutcome.value.arrayBuffer();
    const size = buffer.byteLength;
    const base = {
      ok: true,
      ...trace,
      key,
      size,
      metadata,
      expiration,
    };

    if (size > INSPECT_MAX_BYTES) {
      await logCfpwEvent(env, 'kv-value-inspect', true, { namespaceId, type: 'too-large', size });
      return toJsonResponse({ ...base, type: 'too-large' });
    }

    let text: string | null = null;
    try {
      text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(buffer);
    } catch {
      text = null;
    }
    if (text === null) {
      await logCfpwEvent(env, 'kv-value-inspect', true, { namespaceId, type: 'binary', size });
      return toJsonResponse({ ...base, type: 'binary' });
    }

    let prettyJson = false;
    try {
      JSON.parse(text);
      prettyJson = true;
    } catch {
      prettyJson = false;
    }
    await logCfpwEvent(env, 'kv-value-inspect', true, { namespaceId, type: 'text', size, prettyJson });
    return toJsonResponse({ ...base, type: 'text', value: text, prettyJson });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao ler o valor da chave "${key}" no KV.`;
    await logCfpwEvent(
      env,
      mode === 'download' ? 'kv-value-download' : 'kv-value-inspect',
      false,
      { namespaceId },
      message,
    );
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

type PutValuePayload = {
  namespaceId?: unknown;
  key?: unknown;
  value?: unknown;
  metadata?: unknown;
  expirationTtl?: unknown;
  expiration?: unknown;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export async function onRequestPutValue(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<PutValuePayload>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }

  const namespaceId = String(payload.namespaceId ?? '').trim();
  const key = typeof payload.key === 'string' ? payload.key : '';
  if (!namespaceId) {
    return toErrorResponse('Campo namespaceId é obrigatório para gravar um valor KV.', trace, 400);
  }
  const keyError = validateKeyName(key);
  if (keyError) {
    return toErrorResponse(keyError, trace, 400);
  }
  if (typeof payload.value !== 'string') {
    return toErrorResponse('Campo value é obrigatório e precisa ser uma string.', trace, 400);
  }

  let metadata: Record<string, unknown> | undefined;
  if (payload.metadata !== undefined && payload.metadata !== null) {
    if (!isPlainObject(payload.metadata)) {
      return toErrorResponse('Campo metadata precisa ser um objeto JSON.', trace, 400);
    }
    const metadataBytes = utf8ByteLength(JSON.stringify(payload.metadata));
    if (metadataBytes > METADATA_MAX_BYTES) {
      return toErrorResponse(
        `Metadata excede o limite de ${METADATA_MAX_BYTES} bytes (recebido: ${metadataBytes} bytes).`,
        trace,
        400,
      );
    }
    metadata = payload.metadata;
  }

  if (payload.expirationTtl !== undefined && payload.expiration !== undefined) {
    return toErrorResponse('Informe apenas um entre expirationTtl e expiration.', trace, 400);
  }
  let expirationTtl: number | undefined;
  if (payload.expirationTtl !== undefined) {
    const ttl = Number(payload.expirationTtl);
    if (!Number.isInteger(ttl) || ttl < EXPIRATION_TTL_MIN_SECONDS) {
      return toErrorResponse(
        `Campo expirationTtl precisa ser um inteiro ≥ ${EXPIRATION_TTL_MIN_SECONDS} segundos (mínimo do Workers KV).`,
        trace,
        400,
      );
    }
    expirationTtl = ttl;
  }
  let expiration: number | undefined;
  if (payload.expiration !== undefined) {
    const unix = Number(payload.expiration);
    if (!Number.isInteger(unix) || unix <= 0) {
      return toErrorResponse('Campo expiration precisa ser um timestamp unix (inteiro positivo).', trace, 400);
    }
    expiration = unix;
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    await putKvValue(env, accountInfo.accountId, namespaceId, key, {
      value: payload.value,
      ...(metadata !== undefined ? { metadata } : {}),
      ...(expirationTtl !== undefined ? { expirationTtl } : {}),
      ...(expiration !== undefined ? { expiration } : {}),
    });
    await logCfpwEvent(env, 'kv-value-put', true, {
      accountId: accountInfo.accountId,
      namespaceId,
      withMetadata: metadata !== undefined,
    });
    return toJsonResponse({ ok: true, ...trace, key, saved: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao gravar a chave "${key}" no KV.`;
    await logCfpwEvent(env, 'kv-value-put', false, { namespaceId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestDeleteValue(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<{ namespaceId?: unknown; key?: unknown }>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const namespaceId = String(payload.namespaceId ?? '').trim();
  const key = typeof payload.key === 'string' ? payload.key : '';
  if (!namespaceId || !key) {
    return toErrorResponse('Campos namespaceId e key são obrigatórios para excluir um valor KV.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    await deleteKvValue(env, accountInfo.accountId, namespaceId, key);
    await logCfpwEvent(env, 'kv-value-delete', true, { accountId: accountInfo.accountId, namespaceId });
    return toJsonResponse({ ok: true, ...trace, key, deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao excluir a chave "${key}" no KV.`;
    await logCfpwEvent(env, 'kv-value-delete', false, { namespaceId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

// ── Operações em lote ──

type BulkPutPayload = {
  namespaceId?: unknown;
  pairs?: unknown;
};

export async function onRequestPutBulk(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<BulkPutPayload>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const namespaceId = String(payload.namespaceId ?? '').trim();
  if (!namespaceId) {
    return toErrorResponse('Campo namespaceId é obrigatório para a gravação em lote no KV.', trace, 400);
  }
  const rawPairs = Array.isArray(payload.pairs) ? payload.pairs : [];
  if (rawPairs.length === 0) {
    return toErrorResponse('Campo pairs é obrigatório: envie ao menos um par {key, value}.', trace, 400);
  }
  if (rawPairs.length > BULK_MAX_ITEMS) {
    return toErrorResponse(
      `Máximo de ${BULK_MAX_ITEMS} pares por operação em lote (recebido: ${rawPairs.length}) — divida em lotes menores.`,
      trace,
      400,
    );
  }

  const pairs: KvBulkPair[] = [];
  for (const [index, rawPair] of rawPairs.entries()) {
    const record = (rawPair ?? {}) as {
      key?: unknown;
      value?: unknown;
      metadata?: unknown;
      expiration_ttl?: unknown;
    };
    const pairKey = typeof record.key === 'string' ? record.key : '';
    const pairKeyError = pairKey ? validateKeyName(pairKey) : `Par #${index + 1} sem campo key (string não vazia).`;
    if (pairKeyError) {
      return toErrorResponse(pairKey ? `Par #${index + 1}: ${pairKeyError}` : pairKeyError, trace, 400);
    }
    if (typeof record.value !== 'string') {
      return toErrorResponse(`Par #${index + 1} ("${pairKey}") sem campo value (string).`, trace, 400);
    }
    if (record.metadata !== undefined && !isPlainObject(record.metadata)) {
      return toErrorResponse(`Par #${index + 1} ("${pairKey}"): metadata precisa ser um objeto JSON.`, trace, 400);
    }
    if (record.expiration_ttl !== undefined) {
      const ttl = Number(record.expiration_ttl);
      if (!Number.isInteger(ttl) || ttl < EXPIRATION_TTL_MIN_SECONDS) {
        return toErrorResponse(
          `Par #${index + 1} ("${pairKey}"): expiration_ttl precisa ser um inteiro ≥ ${EXPIRATION_TTL_MIN_SECONDS} segundos.`,
          trace,
          400,
        );
      }
    }
    pairs.push({
      key: pairKey,
      value: record.value,
      ...(record.metadata !== undefined ? { metadata: record.metadata as Record<string, unknown> } : {}),
      ...(record.expiration_ttl !== undefined ? { expiration_ttl: Number(record.expiration_ttl) } : {}),
    });
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const result = await putKvBulk(env, accountInfo.accountId, namespaceId, pairs);
    await logCfpwEvent(env, 'kv-bulk-put', true, {
      accountId: accountInfo.accountId,
      namespaceId,
      pairs: pairs.length,
    });
    return toJsonResponse({ ok: true, ...trace, namespaceId, pairs: pairs.length, result: result ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha na gravação em lote no KV.';
    await logCfpwEvent(env, 'kv-bulk-put', false, { namespaceId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestPostBulkDelete(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<{ namespaceId?: unknown; keys?: unknown }>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const namespaceId = String(payload.namespaceId ?? '').trim();
  if (!namespaceId) {
    return toErrorResponse('Campo namespaceId é obrigatório para a exclusão em lote no KV.', trace, 400);
  }
  const rawKeys = Array.isArray(payload.keys) ? payload.keys : [];
  if (rawKeys.length === 0) {
    return toErrorResponse('Campo keys é obrigatório: envie ao menos uma chave para excluir.', trace, 400);
  }
  if (rawKeys.length > BULK_MAX_ITEMS) {
    return toErrorResponse(
      `Máximo de ${BULK_MAX_ITEMS} chaves por exclusão em lote (recebido: ${rawKeys.length}) — divida em lotes menores.`,
      trace,
      400,
    );
  }
  const keys: string[] = [];
  for (const [index, rawKey] of rawKeys.entries()) {
    if (typeof rawKey !== 'string' || !rawKey) {
      return toErrorResponse(
        `Chave #${index + 1} inválida: cada item de keys precisa ser string não vazia.`,
        trace,
        400,
      );
    }
    keys.push(rawKey);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const result = await postKvBulkDelete(env, accountInfo.accountId, namespaceId, keys);
    await logCfpwEvent(env, 'kv-bulk-delete', true, {
      accountId: accountInfo.accountId,
      namespaceId,
      keys: keys.length,
    });
    return toJsonResponse({ ok: true, ...trace, namespaceId, keys: keys.length, result: result ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha na exclusão em lote no KV.';
    await logCfpwEvent(env, 'kv-bulk-delete', false, { namespaceId }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}
