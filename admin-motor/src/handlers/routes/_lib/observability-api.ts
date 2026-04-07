/**
 * Cloudflare Workers Observability API helpers.
 * Reutiliza o padrão cloudflareRequest de cfpw-api.ts para autenticação e parsing.
 */

type CloudflareApiError = {
  message?: string
}

type CloudflareApiResponse<T> = {
  success?: boolean
  errors?: CloudflareApiError[]
  result?: T
}

type EnvWithCloudflarePwToken = {
  CLOUDFLARE_PW?: string
  CF_ACCOUNT_ID?: string
}

// ── Internal request helper (mirrors cfpw-api pattern) ──

const resolveToken = (env: EnvWithCloudflarePwToken) => {
  const token = env.CLOUDFLARE_PW?.trim()
  return token || ''
}

const parseJsonOrThrow = <T>(rawText: string, fallback: string, response: Response): T => {
  const trimmed = rawText.trim()
  if (!trimmed) {
    throw new Error(`${fallback}: corpo vazio inesperado (HTTP ${response.status}).`)
  }
  const looksLikeHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')
  if (looksLikeHtml) {
    throw new Error(`${fallback}: resposta HTML inesperada da API Cloudflare (HTTP ${response.status}).`)
  }
  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error(`${fallback}: resposta não-JSON da API Cloudflare (HTTP ${response.status}).`)
  }
}

const cloudflareObsRequest = async <T>(
  env: EnvWithCloudflarePwToken,
  path: string,
  fallback: string,
  init?: RequestInit,
): Promise<T> => {
  const token = resolveToken(env)
  if (!token) {
    throw new Error('Token Cloudflare ausente (CLOUDFLARE_PW) para Observability.')
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: init?.body,
  })

  const rawText = await response.text()
  const payload = parseJsonOrThrow<CloudflareApiResponse<T>>(rawText, fallback, response)

  if (!response.ok || payload.success !== true) {
    const allErrors = Array.isArray(payload.errors) ? payload.errors : []
    const firstError = allErrors.length > 0 ? allErrors[0]?.message?.trim() : null
    // Log detalhado para diagnóstico de erros da API CF
    console.error(`[observability-api] ${fallback}`, {
      status: response.status,
      path,
      method: init?.method ?? 'GET',
      body: init?.body ? String(init.body).substring(0, 500) : null,
      errors: allErrors,
      rawResponse: rawText.substring(0, 500),
    })
    throw new Error(firstError ? `${fallback}: ${firstError}` : `${fallback}: HTTP ${response.status}`)
  }

  return payload.result as T
}

// ── Exported helpers ──

/**
 * POST /accounts/{id}/workers/observability/telemetry/query
 * Executa uma query de telemetria (events, calculations, invocations, traces, requests, agents).
 */
export const queryObservabilityTelemetry = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  return cloudflareObsRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(accountId)}/workers/observability/telemetry/query`,
    'Falha na query de observability',
    { method: 'POST', body: JSON.stringify(body) },
  )
}

/**
 * POST /accounts/{id}/workers/observability/telemetry/keys
 * Lista chaves de telemetria disponíveis.
 */
export const listObservabilityKeys = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  body: Record<string, unknown>,
): Promise<Array<Record<string, unknown>>> => {
  return cloudflareObsRequest<Array<Record<string, unknown>>>(
    env,
    `/accounts/${encodeURIComponent(accountId)}/workers/observability/telemetry/keys`,
    'Falha ao listar chaves de observability',
    { method: 'POST', body: JSON.stringify(body) },
  )
}

/**
 * POST /accounts/{id}/workers/observability/telemetry/values
 * Lista valores disponíveis para uma chave específica.
 */
export const listObservabilityValues = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  body: Record<string, unknown>,
): Promise<Array<Record<string, unknown>>> => {
  return cloudflareObsRequest<Array<Record<string, unknown>>>(
    env,
    `/accounts/${encodeURIComponent(accountId)}/workers/observability/telemetry/values`,
    'Falha ao listar valores de observability',
    { method: 'POST', body: JSON.stringify(body) },
  )
}

/**
 * GET /accounts/{id}/workers/observability/destinations
 * Lista destinos OTel configurados.
 */
export const listObservabilityDestinations = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
): Promise<Array<Record<string, unknown>>> => {
  const result = await cloudflareObsRequest<Array<Record<string, unknown>>>(
    env,
    `/accounts/${encodeURIComponent(accountId)}/workers/observability/destinations`,
    'Falha ao listar destinos de observability',
  )
  return Array.isArray(result) ? result : []
}

/**
 * POST /accounts/{id}/workers/observability/destinations
 * Cria um novo destino OTel.
 */
export const createObservabilityDestination = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  return cloudflareObsRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(accountId)}/workers/observability/destinations`,
    'Falha ao criar destino de observability',
    { method: 'POST', body: JSON.stringify(body) },
  )
}

/**
 * DELETE /accounts/{id}/workers/observability/destinations/{slug}
 * Remove um destino OTel.
 */
export const deleteObservabilityDestination = async (
  env: EnvWithCloudflarePwToken,
  accountId: string,
  slug: string,
): Promise<Record<string, unknown>> => {
  return cloudflareObsRequest<Record<string, unknown>>(
    env,
    `/accounts/${encodeURIComponent(accountId)}/workers/observability/destinations/${encodeURIComponent(slug)}`,
    `Falha ao remover destino ${slug}`,
    { method: 'DELETE' },
  )
}
