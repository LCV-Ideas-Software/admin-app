type CloudflareApiError = {
  message?: string
}

type CloudflareApiResponse<T> = {
  success?: boolean
  errors?: CloudflareApiError[]
  result?: T
}

export type CloudflareZone = {
  id?: string
  name?: string
}

type CloudflareDnsRecord = {
  id?: string
  content?: string
  name?: string
}

type EnvWithCloudflareToken = {
  CF_API_TOKEN?: string
  CLOUDFLARE_DNS?: string
  CLOUDFLARE_API_TOKEN?: string
}

const resolveToken = (env: EnvWithCloudflareToken) => {
  const byDnsToken = env.CLOUDFLARE_DNS?.trim()
  if (byDnsToken) {
    return byDnsToken
  }

  const byApiToken = env.CLOUDFLARE_API_TOKEN?.trim()
  if (byApiToken) {
    return byApiToken
  }

  const byCfToken = env.CF_API_TOKEN?.trim()
  if (byCfToken) {
    return byCfToken
  }

  return ''
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

const toFirstError = (payload: CloudflareApiResponse<unknown>) => {
  const firstError = Array.isArray(payload.errors) && payload.errors.length > 0
    ? payload.errors[0]
    : null
  return firstError?.message?.trim() || null
}

const cloudflareRequest = async <T>(
  env: EnvWithCloudflareToken,
  path: string,
  fallback: string,
  init?: RequestInit,
) => {
  const token = resolveToken(env)
  if (!token) {
    throw new Error('Token Cloudflare ausente no runtime (configure CF_API_TOKEN, CLOUDFLARE_DNS ou CLOUDFLARE_API_TOKEN).')
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
    const message = toFirstError(payload)
    throw new Error(message ? `${fallback}: ${message}` : `${fallback}: HTTP ${response.status}`)
  }

  return payload.result as T
}

export const listCloudflareZones = async (env: EnvWithCloudflareToken) => {
  const zones = await cloudflareRequest<CloudflareZone[]>(
    env,
    '/zones?status=active&per_page=500',
    'Falha ao carregar zonas da Cloudflare',
  )

  return (Array.isArray(zones) ? zones : [])
    .map((zone) => ({
      id: String(zone.id ?? '').trim(),
      name: String(zone.name ?? '').trim().toLowerCase(),
    }))
    .filter((zone) => zone.id && zone.name)
    .sort((a, b) => a.name.localeCompare(b.name))
}

const extractDnsResult = async (env: EnvWithCloudflareToken, path: string, fallback: string) => {
  const result = await cloudflareRequest<CloudflareDnsRecord[]>(env, path, fallback)
  return Array.isArray(result) ? result : []
}

const quoteTxtContent = (content: string) => {
  const normalized = content.trim().replace(/^"|"$/g, '')
  return `"${normalized}"`
}

export const upsertCloudflareTxtRecord = async (
  env: EnvWithCloudflareToken,
  zoneId: string,
  name: string,
  content: string,
) => {
  const normalizedZoneId = zoneId.trim()
  const normalizedName = name.trim().toLowerCase()
  const normalizedContent = content.trim()

  if (!normalizedZoneId || !normalizedName || !normalizedContent) {
    throw new Error('ZoneId, name e content são obrigatórios para upsert TXT na Cloudflare.')
  }

  const existing = await extractDnsResult(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=TXT&name=${encodeURIComponent(normalizedName)}`,
    `Falha ao consultar TXT ${normalizedName}`,
  )

  const existingRecordId = String(existing[0]?.id ?? '').trim()

  if (existingRecordId) {
    await cloudflareRequest<CloudflareDnsRecord>(
      env,
      `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records/${encodeURIComponent(existingRecordId)}`,
      `Falha ao atualizar TXT ${normalizedName}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          content: quoteTxtContent(normalizedContent),
        }),
      },
    )

    return {
      mode: 'update' as const,
      recordId: existingRecordId,
    }
  }

  const created = await cloudflareRequest<CloudflareDnsRecord>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records`,
    `Falha ao criar TXT ${normalizedName}`,
    {
      method: 'POST',
      body: JSON.stringify({
        type: 'TXT',
        name: normalizedName,
        content: quoteTxtContent(normalizedContent),
        ttl: 1,
      }),
    },
  )

  return {
    mode: 'create' as const,
    recordId: String(created?.id ?? '').trim(),
  }
}

export const getCloudflareDnsSnapshot = async (
  env: EnvWithCloudflareToken,
  domain: string,
  zoneId: string,
) => {
  const normalizedDomain = domain.trim().toLowerCase()
  const normalizedZoneId = zoneId.trim()

  if (!normalizedDomain || !normalizedZoneId) {
    throw new Error('Domain e zoneId são obrigatórios para auditar DNS na Cloudflare.')
  }

  const [mxRecordsRaw, tlsRptRaw, mtastsRaw] = await Promise.all([
    extractDnsResult(
      env,
      `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=MX`,
      `Falha ao consultar MX de ${normalizedDomain}`,
    ),
    extractDnsResult(
      env,
      `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=TXT&name=${encodeURIComponent(`_smtp._tls.${normalizedDomain}`)}`,
      `Falha ao consultar TLS-RPT de ${normalizedDomain}`,
    ),
    extractDnsResult(
      env,
      `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=TXT&name=${encodeURIComponent(`_mta-sts.${normalizedDomain}`)}`,
      `Falha ao consultar MTA-STS TXT de ${normalizedDomain}`,
    ),
  ])

  const mxRecords = mxRecordsRaw
    .map((record) => String(record.content ?? '').trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))

  const tlsRptContent = String(tlsRptRaw[0]?.content ?? '').replace(/["\s]/g, '')
  const tlsRptMatch = tlsRptContent.match(/mailto:([^;]+)/i)
  const dnsTlsRptEmail = tlsRptMatch?.[1]?.trim().toLowerCase() || null

  const mtastsContent = String(mtastsRaw[0]?.content ?? '').replace(/["\s]/g, '')
  const mtastsMatch = mtastsContent.match(/id=([a-zA-Z0-9_-]+)/)
  const dnsMtaStsId = mtastsMatch?.[1]?.trim() || null

  return {
    mxRecords,
    dnsTlsRptEmail,
    dnsMtaStsId,
  }
}