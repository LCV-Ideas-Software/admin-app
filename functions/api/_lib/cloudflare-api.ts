type CloudflareApiError = {
  message?: string
}

type CloudflareApiResponse<T> = {
  success?: boolean
  errors?: CloudflareApiError[]
  result?: T
  result_info?: {
    page?: number
    per_page?: number
    total_pages?: number
    count?: number
    total_count?: number
  }
}

export type CloudflareZone = {
  id?: string
  name?: string
}

type CloudflareDnsRecord = {
  id?: string
  type?: string
  content?: string
  name?: string
  ttl?: number
  proxied?: boolean
  priority?: number
  comment?: string
  tags?: string[]
  created_on?: string
  modified_on?: string
  data?: Record<string, unknown>
}

type CloudflareDnsRecordListResult = {
  records: CloudflareDnsRecord[]
  pagination: {
    page: number
    perPage: number
    totalPages: number
    totalCount: number
    count: number
  }
}

export type CloudflareDnsRecordInput = {
  type: string
  name: string
  content?: string | null
  ttl?: number | null
  proxied?: boolean | null
  priority?: number | null
  comment?: string | null
  tags?: string[] | null
  data?: Record<string, unknown> | null
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
  const payload = await cloudflareRequestPayload<T>(env, path, fallback, init)
  return payload.result as T
}

const cloudflareRequestPayload = async <T>(
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

  return payload
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

const normalizeZoneId = (zoneId: string) => {
  const normalized = zoneId.trim()
  if (!normalized) {
    throw new Error('Zone ID é obrigatório.')
  }
  return normalized
}

const normalizeRecordId = (recordId: string) => {
  const normalized = recordId.trim()
  if (!normalized) {
    throw new Error('Record ID é obrigatório.')
  }
  return normalized
}

const normalizeRecordType = (recordType: string) => {
  const normalized = recordType.trim().toUpperCase()
  if (!normalized) {
    throw new Error('Tipo de registro DNS é obrigatório.')
  }
  return normalized
}

const normalizeRecordName = (recordName: string) => {
  const normalized = recordName.trim().toLowerCase()
  if (!normalized) {
    throw new Error('Nome do registro DNS é obrigatório.')
  }
  return normalized
}

const normalizeRecordInput = (input: CloudflareDnsRecordInput) => {
  const type = normalizeRecordType(input.type)
  const name = normalizeRecordName(input.name)
  const content = String(input.content ?? '').trim()
  const ttl = Number(input.ttl ?? 1)
  const proxied = input.proxied == null ? null : Boolean(input.proxied)
  const priority = input.priority == null || Number.isNaN(Number(input.priority))
    ? null
    : Number(input.priority)
  const comment = String(input.comment ?? '').trim()
  const tags = Array.isArray(input.tags)
    ? input.tags
      .map((tag) => String(tag).trim())
      .filter(Boolean)
    : []
  const data = input.data && typeof input.data === 'object' ? input.data : null

  if (!content && !data) {
    throw new Error('Informe content ou data para o registro DNS.')
  }

  if (!Number.isFinite(ttl) || (ttl !== 1 && (ttl < 60 || ttl > 86400))) {
    throw new Error('TTL inválido. Use 1 (auto) ou um valor entre 60 e 86400 segundos.')
  }

  if (priority != null && (!Number.isInteger(priority) || priority < 0 || priority > 65535)) {
    throw new Error('Priority inválido. Use um inteiro entre 0 e 65535.')
  }

  return {
    type,
    name,
    content,
    ttl,
    proxied,
    priority,
    comment,
    tags,
    data,
  }
}

const buildDnsRecordPayload = (input: CloudflareDnsRecordInput) => {
  const normalized = normalizeRecordInput(input)

  const payload: Record<string, unknown> = {
    type: normalized.type,
    name: normalized.name,
    ttl: normalized.ttl,
  }

  if (normalized.content) {
    payload.content = normalized.content
  }
  if (normalized.proxied != null) {
    payload.proxied = normalized.proxied
  }
  if (normalized.priority != null) {
    payload.priority = normalized.priority
  }
  if (normalized.comment) {
    payload.comment = normalized.comment
  }
  if (normalized.tags.length > 0) {
    payload.tags = normalized.tags
  }
  if (normalized.data) {
    payload.data = normalized.data
  }

  return payload
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

export const listCloudflareDnsRecords = async (
  env: EnvWithCloudflareToken,
  zoneId: string,
  options?: {
    page?: number
    perPage?: number
    type?: string
    search?: string
  },
): Promise<CloudflareDnsRecordListResult> => {
  const normalizedZoneId = normalizeZoneId(zoneId)
  const page = Number.isFinite(Number(options?.page)) && Number(options?.page) > 0
    ? Math.trunc(Number(options?.page))
    : 1
  const perPage = Number.isFinite(Number(options?.perPage)) && Number(options?.perPage) > 0
    ? Math.min(Math.trunc(Number(options?.perPage)), 500)
    : 100
  const type = String(options?.type ?? '').trim().toUpperCase()
  const search = String(options?.search ?? '').trim().toLowerCase()

  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    order: 'type',
    direction: 'asc',
  })

  if (type) {
    query.set('type', type)
  }

  if (search) {
    query.set('name', search)
  }

  const payload = await cloudflareRequestPayload<CloudflareDnsRecord[]>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?${query.toString()}`,
    'Falha ao listar registros DNS da zona',
  )

  const records = Array.isArray(payload.result) ? payload.result : []
  const info = payload.result_info ?? {}

  return {
    records,
    pagination: {
      page: Number(info.page ?? page),
      perPage: Number(info.per_page ?? perPage),
      totalPages: Number(info.total_pages ?? 1),
      totalCount: Number(info.total_count ?? records.length),
      count: Number(info.count ?? records.length),
    },
  }
}

export const createCloudflareDnsRecord = async (
  env: EnvWithCloudflareToken,
  zoneId: string,
  input: CloudflareDnsRecordInput,
) => {
  const normalizedZoneId = normalizeZoneId(zoneId)
  const payload = buildDnsRecordPayload(input)
  const created = await cloudflareRequest<CloudflareDnsRecord>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records`,
    `Falha ao criar registro DNS ${String(payload.type ?? '').toUpperCase()} ${String(payload.name ?? '')}`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )

  return created
}

export const updateCloudflareDnsRecord = async (
  env: EnvWithCloudflareToken,
  zoneId: string,
  recordId: string,
  input: CloudflareDnsRecordInput,
) => {
  const normalizedZoneId = normalizeZoneId(zoneId)
  const normalizedRecordId = normalizeRecordId(recordId)
  const payload = buildDnsRecordPayload(input)

  const updated = await cloudflareRequest<CloudflareDnsRecord>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records/${encodeURIComponent(normalizedRecordId)}`,
    `Falha ao atualizar registro DNS ${String(payload.type ?? '').toUpperCase()} ${String(payload.name ?? '')}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )

  return updated
}

export const deleteCloudflareDnsRecord = async (
  env: EnvWithCloudflareToken,
  zoneId: string,
  recordId: string,
) => {
  const normalizedZoneId = normalizeZoneId(zoneId)
  const normalizedRecordId = normalizeRecordId(recordId)

  await cloudflareRequest<CloudflareDnsRecord>(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records/${encodeURIComponent(normalizedRecordId)}`,
    'Falha ao remover registro DNS',
    {
      method: 'DELETE',
    },
  )
}