// Handlers da onda ST-R2 (aba Armazenamento): gestão completa de R2 via
// /api/cfpw/storage/r2/*. Validação local devolve 400 diagnóstico em pt-BR;
// falhas da API Cloudflare passam pela tradução do cf-api-core e pelo
// mapeamento de status do _respond. Guard do mainsite-media (bucket de mídia
// de PRODUÇÃO do mainsite, binding MEDIA_BUCKET): exclusão 403 SEMPRE.
// Telemetria best-effort com ações r2-*.

import { CfApiError } from '../../_lib/cf-api-core';
import { resolveCloudflarePwAccount } from '../../_lib/cfpw-api';
import {
  createR2Bucket,
  deleteR2Bucket,
  deleteR2Object,
  fetchR2ObjectRaw,
  getR2Cors,
  getR2Lifecycle,
  getR2ManagedDomain,
  listR2Buckets,
  listR2CustomDomains,
  listR2Objects,
  putR2Object,
  type R2BucketInfo,
  type R2ObjectInfo,
} from '../../_lib/r2-api';
import { createResponseTrace } from '../../_lib/request-trace';
import {
  type CfpwRouteContext,
  getRouteEnv,
  logCfpwEvent,
  type PartialWarning,
  resolveCfpwErrorStatus,
  toErrorResponse,
  toJsonResponse,
} from '../_respond';

/** Bucket de mídia de PRODUÇÃO do mainsite (binding MEDIA_BUCKET): imutável aqui. */
const PROTECTED_R2_BUCKET = 'mainsite-media';

const PROTECTED_BUCKET_MESSAGE =
  'mainsite-media é o bucket de mídia de produção do mainsite (binding MEDIA_BUCKET) — exclusão bloqueada';

const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const LOCATION_HINTS = ['apac', 'eeur', 'enam', 'weur', 'wnam', 'oc'] as const;
const STORAGE_CLASSES = ['Standard', 'InfrequentAccess'] as const;
const OBJECTS_PER_PAGE_MIN = 10;
const OBJECTS_PER_PAGE_MAX = 100;
const OBJECTS_PER_PAGE_DEFAULT = 50;
/** 90 MiB — uploads maiores devem usar wrangler ou o dashboard. */
const UPLOAD_MAX_BYTES = 94_371_840;
const BULK_DELETE_MAX_KEYS = 40;

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

const isBucketNotEmptyError = (error: unknown): boolean =>
  error instanceof CfApiError &&
  (/not empty/i.test(error.apiMessage ?? '') || error.errors.some((detail) => /not empty/i.test(detail.message)));

const toBucketSummary = (bucket: R2BucketInfo) => {
  const name = String(bucket?.name ?? '');
  return {
    name,
    creation_date: bucket?.creation_date ?? null,
    location: bucket?.location ?? null,
    storage_class: bucket?.storage_class ?? null,
    protected: name === PROTECTED_R2_BUCKET,
  };
};

const toObjectSummary = (object: R2ObjectInfo) => ({
  key: String(object?.key ?? ''),
  size: Number.isFinite(Number(object?.size)) ? Number(object?.size) : null,
  etag: object?.etag ?? null,
  uploaded: object?.uploaded ?? object?.last_modified ?? null,
  storage_class: object?.storage_class ?? null,
  ...(object?.http_metadata !== undefined ? { http_metadata: object.http_metadata } : {}),
});

// ── Buckets ──

export async function onRequestGetBuckets(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const buckets = await listR2Buckets(env, accountInfo.accountId);
    await logCfpwEvent(env, 'r2-buckets-list', true, {
      accountId: accountInfo.accountId,
      count: buckets.length,
    });
    return toJsonResponse({ ok: true, ...trace, buckets: buckets.map(toBucketSummary) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao listar buckets R2.';
    await logCfpwEvent(env, 'r2-buckets-list', false, {}, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

type CreateBucketPayload = {
  name?: unknown;
  locationHint?: unknown;
  storageClass?: unknown;
};

export async function onRequestPostBuckets(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<CreateBucketPayload>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const name = String(payload.name ?? '').trim();
  if (!name) {
    return toErrorResponse('Campo name é obrigatório: informe o nome do bucket R2.', trace, 400);
  }
  if (!BUCKET_NAME_PATTERN.test(name)) {
    return toErrorResponse(
      `Nome de bucket R2 inválido: "${name}" — use 3 a 63 caracteres com letras minúsculas, números e hífen, começando e terminando por letra/número.`,
      trace,
      400,
    );
  }
  let locationHint: string | undefined;
  if (payload.locationHint !== undefined) {
    const hint = String(payload.locationHint ?? '').trim();
    if (!LOCATION_HINTS.includes(hint as (typeof LOCATION_HINTS)[number])) {
      return toErrorResponse(
        `Campo locationHint inválido: "${hint}" — use um de ${LOCATION_HINTS.join(', ')}.`,
        trace,
        400,
      );
    }
    locationHint = hint;
  }
  let storageClass: string | undefined;
  if (payload.storageClass !== undefined) {
    const klass = String(payload.storageClass ?? '').trim();
    if (!STORAGE_CLASSES.includes(klass as (typeof STORAGE_CLASSES)[number])) {
      return toErrorResponse(`Campo storageClass inválido: "${klass}" — use Standard ou InfrequentAccess.`, trace, 400);
    }
    storageClass = klass;
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const bucket = await createR2Bucket(env, accountInfo.accountId, {
      name,
      ...(locationHint !== undefined ? { locationHint } : {}),
      ...(storageClass !== undefined ? { storageClass } : {}),
    });
    await logCfpwEvent(env, 'r2-bucket-create', true, { accountId: accountInfo.accountId, bucket: name });
    return toJsonResponse({ ok: true, ...trace, bucket: toBucketSummary(bucket ?? { name }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao criar o bucket R2 "${name}".`;
    await logCfpwEvent(env, 'r2-bucket-create', false, {}, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestDeleteBuckets(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<{ bucket?: unknown; confirmName?: unknown }>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const bucket = String(payload.bucket ?? '').trim();
  const confirmName = typeof payload.confirmName === 'string' ? payload.confirmName : '';
  if (!bucket) {
    return toErrorResponse('Campo bucket é obrigatório para excluir o bucket R2.', trace, 400);
  }
  // Bucket protegido: 403 SEMPRE, sem override — antes de qualquer confirmação.
  if (bucket === PROTECTED_R2_BUCKET) {
    await logCfpwEvent(env, 'r2-bucket-delete', false, { bucket, protected: true }, PROTECTED_BUCKET_MESSAGE);
    return toErrorResponse(PROTECTED_BUCKET_MESSAGE, trace, 403);
  }
  if (confirmName !== bucket) {
    return toErrorResponse(
      `Confirmação divergente: digite exatamente o nome "${bucket}" para excluir o bucket R2.`,
      trace,
      400,
    );
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    await deleteR2Bucket(env, accountInfo.accountId, bucket);
    await logCfpwEvent(env, 'r2-bucket-delete', true, { accountId: accountInfo.accountId, bucket });
    return toJsonResponse({ ok: true, ...trace, bucket, deleted: true });
  } catch (error) {
    if (isBucketNotEmptyError(error)) {
      const message = `O bucket "${bucket}" ainda contém objetos — esvazie o bucket antes de excluí-lo.`;
      await logCfpwEvent(env, 'r2-bucket-delete', false, { bucket, notEmpty: true }, message);
      return toErrorResponse(message, trace, 409);
    }
    const message = error instanceof Error ? error.message : `Falha ao excluir o bucket R2 "${bucket}".`;
    await logCfpwEvent(env, 'r2-bucket-delete', false, { bucket }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

// ── Objetos ──

export async function onRequestGetObjects(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const bucket = String(url.searchParams.get('bucket') ?? '').trim();
  const prefix = String(url.searchParams.get('prefix') ?? '');
  const cursor = String(url.searchParams.get('cursor') ?? '').trim();
  const perPage = clampInt(
    url.searchParams.get('perPage'),
    OBJECTS_PER_PAGE_DEFAULT,
    OBJECTS_PER_PAGE_MIN,
    OBJECTS_PER_PAGE_MAX,
  );

  if (!bucket) {
    return toErrorResponse('Parâmetro bucket é obrigatório para listar objetos R2.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const page = await listR2Objects(env, accountInfo.accountId, bucket, {
      ...(prefix ? { prefix } : {}),
      ...(cursor ? { cursor } : {}),
      perPage,
    });
    await logCfpwEvent(env, 'r2-objects-list', true, {
      accountId: accountInfo.accountId,
      bucket,
      count: page.objects.length,
      folders: page.delimitedPrefixes.length,
    });
    return toJsonResponse({
      ok: true,
      ...trace,
      objects: page.objects.map(toObjectSummary),
      folders: page.delimitedPrefixes,
      cursor: page.cursor,
      isTruncated: page.isTruncated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao listar objetos do bucket R2 "${bucket}".`;
    await logCfpwEvent(env, 'r2-objects-list', false, { bucket }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

// Content-Disposition exige filename ASCII seguro; caracteres fora do conjunto
// viram '_' e o fallback cobre chaves terminadas em '/'.
const toDownloadFilename = (key: string): string => {
  const lastSegment = key.split('/').filter(Boolean).pop() ?? '';
  const sanitized = lastSegment.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100);
  return sanitized || 'r2-object.bin';
};

export async function onRequestGetObject(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const bucket = String(url.searchParams.get('bucket') ?? '').trim();
  const key = String(url.searchParams.get('key') ?? '');

  if (!bucket || !key) {
    return toErrorResponse('Parâmetros bucket e key são obrigatórios para baixar um objeto R2.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const upstream = await fetchR2ObjectRaw(env, accountInfo.accountId, bucket, key);
    await logCfpwEvent(env, 'r2-object-download', true, { accountId: accountInfo.accountId, bucket });
    const contentLength = upstream.headers.get('Content-Length');
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
        ...(contentLength !== null ? { 'Content-Length': contentLength } : {}),
        'Content-Disposition': `attachment; filename="${toDownloadFilename(key)}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao baixar o objeto "${key}" do R2.`;
    await logCfpwEvent(env, 'r2-object-download', false, { bucket }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestPutObject(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const bucket = String(url.searchParams.get('bucket') ?? '').trim();
  const key = String(url.searchParams.get('key') ?? '');
  const storageClass = String(url.searchParams.get('storageClass') ?? '').trim();

  if (!bucket || !key) {
    return toErrorResponse('Parâmetros bucket e key são obrigatórios para enviar um objeto R2.', trace, 400);
  }
  if (storageClass && !STORAGE_CLASSES.includes(storageClass as (typeof STORAGE_CLASSES)[number])) {
    return toErrorResponse(
      `Parâmetro storageClass inválido: "${storageClass}" — use Standard ou InfrequentAccess.`,
      trace,
      400,
    );
  }
  const contentLengthHeader = context.request.headers.get('Content-Length');
  const contentLength = Number(contentLengthHeader);
  if (contentLengthHeader === null || !Number.isFinite(contentLength) || contentLength < 0) {
    return toErrorResponse(
      'Header Content-Length é obrigatório para enviar um objeto R2 (o motor repassa o tamanho exato à Cloudflare).',
      trace,
      411,
    );
  }
  if (contentLength > UPLOAD_MAX_BYTES) {
    return toErrorResponse(
      `Objeto de ${contentLength} bytes excede o limite de ${UPLOAD_MAX_BYTES} bytes (90 MiB) do painel — arquivos maiores: use wrangler ou o dashboard.`,
      trace,
      413,
    );
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    await putR2Object(env, accountInfo.accountId, bucket, key, context.request.body as BodyInit, {
      'Content-Type': context.request.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Length': String(contentLength),
      ...(storageClass ? { 'cf-r2-storage-class': storageClass } : {}),
    });
    await logCfpwEvent(env, 'r2-object-put', true, {
      accountId: accountInfo.accountId,
      bucket,
      size: contentLength,
      withStorageClass: Boolean(storageClass),
    });
    return toJsonResponse({ ok: true, ...trace, key, saved: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao enviar o objeto "${key}" ao R2.`;
    await logCfpwEvent(env, 'r2-object-put', false, { bucket }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

export async function onRequestDeleteObjects(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);

  const payload = await readJsonBody<{ bucket?: unknown; keys?: unknown }>(context.request);
  if (!payload) {
    return toErrorResponse('JSON inválido no corpo da requisição.', trace, 400);
  }
  const bucket = String(payload.bucket ?? '').trim();
  if (!bucket) {
    return toErrorResponse('Campo bucket é obrigatório para excluir objetos R2.', trace, 400);
  }
  const rawKeys = Array.isArray(payload.keys) ? payload.keys : [];
  if (rawKeys.length === 0) {
    return toErrorResponse('Campo keys é obrigatório: envie ao menos uma chave para excluir.', trace, 400);
  }
  if (rawKeys.length > BULK_DELETE_MAX_KEYS) {
    return toErrorResponse(
      `Máximo de ${BULK_DELETE_MAX_KEYS} chaves por chamada (recebido: ${rawKeys.length}) — o painel encadeia lotes automaticamente.`,
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
    // Loop sequencial: continua nos erros e reporta falhas por chave.
    const failures: Array<{ key: string; error: string }> = [];
    for (const key of keys) {
      try {
        await deleteR2Object(env, accountInfo.accountId, bucket, key);
      } catch (error) {
        failures.push({
          key,
          error: error instanceof Error ? error.message : `Falha ao excluir o objeto "${key}" do R2.`,
        });
      }
    }
    const deleted = keys.length - failures.length;
    await logCfpwEvent(env, 'r2-objects-delete', failures.length === 0, {
      accountId: accountInfo.accountId,
      bucket,
      deleted,
      failures: failures.length,
    });
    return toJsonResponse({ ok: true, ...trace, bucket, deleted, failures });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha na exclusão de objetos R2.';
    await logCfpwEvent(env, 'r2-objects-delete', false, { bucket }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}

// ── Configurações do bucket (read-only) ──

type SettingsProbe = { value: unknown; warning: PartialWarning | null };

// 404 = recurso não configurado (null sem warning); outras falhas viram warning.
const settleSettingsProbe = (outcome: PromiseSettledResult<unknown>, code: string): SettingsProbe => {
  if (outcome.status === 'fulfilled') {
    return { value: outcome.value ?? null, warning: null };
  }
  const reason = outcome.reason;
  if (reason instanceof CfApiError && reason.status === 404) {
    return { value: null, warning: null };
  }
  return {
    value: null,
    warning: { code, message: reason instanceof Error ? reason.message : String(reason) },
  };
};

export async function onRequestGetBucketSettings(context: CfpwRouteContext) {
  const trace = createResponseTrace(context.request);
  const env = getRouteEnv(context);
  const url = new URL(context.request.url);
  const bucket = String(url.searchParams.get('bucket') ?? '').trim();

  if (!bucket) {
    return toErrorResponse('Parâmetro bucket é obrigatório para ler as configurações do bucket R2.', trace, 400);
  }

  try {
    const accountInfo = await resolveCloudflarePwAccount(env);
    const [managedOutcome, customOutcome, corsOutcome, lifecycleOutcome] = await Promise.allSettled([
      getR2ManagedDomain(env, accountInfo.accountId, bucket),
      listR2CustomDomains(env, accountInfo.accountId, bucket),
      getR2Cors(env, accountInfo.accountId, bucket),
      getR2Lifecycle(env, accountInfo.accountId, bucket),
    ]);

    const managed = settleSettingsProbe(managedOutcome, 'r2-managed-domain');
    const custom = settleSettingsProbe(customOutcome, 'r2-custom-domains');
    const cors = settleSettingsProbe(corsOutcome, 'r2-cors');
    const lifecycle = settleSettingsProbe(lifecycleOutcome, 'r2-lifecycle');
    const warnings = [managed.warning, custom.warning, cors.warning, lifecycle.warning].filter(
      (warning): warning is PartialWarning => warning !== null,
    );

    await logCfpwEvent(env, 'r2-bucket-settings', true, {
      accountId: accountInfo.accountId,
      bucket,
      warnings: warnings.length,
    });
    return toJsonResponse({
      ok: true,
      ...trace,
      bucket,
      managedDomain: managed.value,
      customDomains: custom.value,
      cors: cors.value,
      lifecycle: lifecycle.value,
      warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : `Falha ao ler as configurações do bucket R2 "${bucket}".`;
    await logCfpwEvent(env, 'r2-bucket-settings', false, { bucket }, message);
    return toErrorResponse(message, trace, resolveCfpwErrorStatus(error));
  }
}
