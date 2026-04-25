import type { D1Database } from './operational'

export type Env = {
  BIGDATA_DB?: D1Database
  MTASTS_ADMIN_API_BASE_URL?: string
}

export type Context = {
  request: Request
  env: Env
}

export type LegacyZone = {
  name?: string
  id?: string
}

export type LegacyPolicyPayload = {
  savedPolicy?: string | null
  savedEmail?: string | null
  dnsTlsRptEmail?: string | null
  dnsMtaStsId?: string | null
  lastGeneratedId?: string | null
  mxRecords?: string[]
}

const DEFAULT_MTASTS_ADMIN_URL = 'https://mtasts-admin.lcv.app.br'

export const toHeaders = () => ({
  'Content-Type': 'application/json',
})

const normalizeBaseUrl = (value: string) => value.endsWith('/') ? value.slice(0, -1) : value

export const resolveBaseUrl = (env: Env) => normalizeBaseUrl(env.MTASTS_ADMIN_API_BASE_URL ?? DEFAULT_MTASTS_ADMIN_URL)

const withDefaultHeaders = (headers?: HeadersInit) => {
  const nextHeaders = new Headers(headers)
  if (!nextHeaders.has('Accept')) {
    nextHeaders.set('Accept', 'application/json')
  }
  return nextHeaders
}

const buildErrorMessage = async (response: Response, fallback: string) => {
  const rawText = (await response.text()).trim()
  if (!rawText) {
    return `${fallback}: HTTP ${response.status}`
  }

  const looksLikeHtml = rawText.startsWith('<!DOCTYPE') || rawText.startsWith('<html')
  if (looksLikeHtml) {
    return `${fallback}: resposta HTML inesperada do legado (HTTP ${response.status}). Verifique Cloudflare Access/challenge.`
  }

  try {
    const payload = JSON.parse(rawText) as { error?: string }
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return `${fallback}: ${payload.error.trim()}`
    }
  } catch {
    // Ignora payload não-JSON.
  }

  return `${fallback}: ${rawText}`
}

const parseJsonOrThrow = <T>(rawText: string, fallback: string, response: Response): T => {
  const trimmed = rawText.trim()
  if (!trimmed) {
    throw new Error(`${fallback}: corpo vazio inesperado (HTTP ${response.status}).`)
  }

  const looksLikeHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')
  if (looksLikeHtml) {
    throw new Error(`${fallback}: resposta HTML inesperada do legado (HTTP ${response.status}). Verifique Cloudflare Access/challenge.`)
  }

  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error(`${fallback}: resposta não-JSON do legado (HTTP ${response.status}).`)
  }
}

export const fetchLegacyJson = async <T>(env: Env, path: string, fallback: string, init?: RequestInit) => {
  const response = await fetch(`${resolveBaseUrl(env)}${path}`, {
    ...init,
    headers: withDefaultHeaders(init?.headers),
  })

  if (!response.ok) {
    throw new Error(await buildErrorMessage(response, fallback))
  }

  const rawText = await response.text()
  return parseJsonOrThrow<T>(rawText, fallback, response)
}

export const postLegacyJson = async <T>(env: Env, path: string, fallback: string, body: unknown, adminActor?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (typeof adminActor === 'string' && adminActor.trim()) {
    headers['X-Admin-Actor'] = adminActor.trim()
  }

  return await fetchLegacyJson<T>(env, path, fallback, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

export const normalizeDomain = (value: unknown) => String(value ?? '').trim().toLowerCase()

export const generateMtastsId = () => {
  const now = new Date()
  const prefix = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`
  const random = crypto.getRandomValues(new Uint32Array(4))
  const suffix = Array.from(random).map((chunk) => String(chunk).padStart(10, '0').slice(-4)).join('')
  return `${prefix}${suffix}`
}
