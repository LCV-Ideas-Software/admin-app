// Módulo: admin-app/functions/api/ai-status/gcp-monitoring.ts
// Descrição: Tier C — Consulta Cloud Monitoring API para dados live de uso/quota do Gemini.
// Requer GCP_SA_KEY (JSON da service account) e GCP_PROJECT_ID como secrets no Cloudflare.

interface Env {
  GCP_SA_KEY?: string    // JSON completo da service account key (Cloudflare Secret)
  GCP_PROJECT_ID?: string
}
interface Ctx { env: Env }

interface ServiceAccountKey {
  type?: string
  project_id?: string
  private_key_id?: string
  private_key: string
  client_email: string
  client_id?: string
  token_uri?: string
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function toBase64UrlFromBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function toBase64UrlFromString(value: string): string {
  return toBase64UrlFromBytes(new TextEncoder().encode(value))
}

function tryDecodeBase64Utf8(value: string): string | null {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  try {
    const binary = atob(padded)
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
  } catch {
    return null
  }
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim()
}

export function parseServiceAccount(saKey: string): ServiceAccountKey {
  const rawValue = saKey.trim()
  const candidates = [rawValue]

  const base64Decoded = tryDecodeBase64Utf8(rawValue)
  if (base64Decoded) candidates.push(base64Decoded)

  let parsed: unknown = null
  let parseError: Error | null = null

  for (const candidate of candidates) {
    try {
      parsed = JSON.parse(candidate)
      break
    } catch (error) {
      parseError = error instanceof Error ? error : new Error('Falha ao interpretar JSON da service account.')
    }
  }

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch (error) {
      parseError = error instanceof Error ? error : new Error('Falha ao interpretar JSON da service account.')
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    const preview = rawValue.substring(0, 60)
    const suffix = parseError ? ` Motivo: ${parseError.message}` : ''
    throw new Error(
      `GCP_SA_KEY não é um JSON de service account válido. Preview: "${preview}...".` +
      ' Cole o conteúdo completo do arquivo .json da Service Account ou o JSON em Base64 no secret do Cloudflare.' +
      suffix,
    )
  }

  const serviceAccount = parsed as Partial<ServiceAccountKey>
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('GCP_SA_KEY não contém client_email ou private_key. Verifique se o secret contém o JSON completo da service account.')
  }

  return {
    ...serviceAccount,
    client_email: serviceAccount.client_email,
    private_key: normalizePrivateKey(serviceAccount.private_key),
  }
}

// Helper: gerar JWT para OAuth2 com service account
export async function getAccessToken(saKey: string): Promise<string> {
  const sa = parseServiceAccount(saKey)

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/monitoring.read https://www.googleapis.com/auth/cloud-platform.read-only https://www.googleapis.com/auth/logging.read',
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  // Encode header e payload em base64url
  const signingInput = `${toBase64UrlFromString(JSON.stringify(header))}.${toBase64UrlFromString(JSON.stringify(payload))}`

  // Importar chave privada RSA (PKCS#8)
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')

  let keyBuffer: Uint8Array
  try {
    keyBuffer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  } catch {
    throw new Error('A private_key do GCP_SA_KEY está malformada. Recrie a chave JSON da service account e atualize o secret no Cloudflare.')
  }

  let cryptoKey: CryptoKey
  try {
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    )
  } catch {
    throw new Error('Falha ao importar a private_key da service account. Verifique se o secret contém uma chave PKCS#8 válida e atualizada.')
  }

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const b64Sig = toBase64UrlFromBytes(new Uint8Array(signature))

  const jwt = `${signingInput}.${b64Sig}`

  // Trocar JWT por access token
  const tokenRes = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    const tokenError = await tokenRes.text()
    if (tokenError.includes('invalid_grant') || tokenError.includes('Invalid JWT Signature')) {
      throw new Error(
        `Token exchange failed: ${tokenRes.status} ${tokenError}. ` +
        `A assinatura JWT foi rejeitada pelo Google. Revise o secret GCP_SA_KEY após a rotação: ` +
        `use o JSON completo da service account ativa, confirme que a chave privada atual corresponde ao private_key_id ` +
        `${sa.private_key_id ? `(${sa.private_key_id.slice(0, 12)}...)` : 'esperado'} e redeploye o admin-app.`
      )
    }

    throw new Error(`Token exchange failed: ${tokenRes.status} ${tokenError}`)
  }

  const tokenData = await tokenRes.json() as { access_token: string }
  return tokenData.access_token
}

interface TimeSeriesPoint {
  interval: { startTime: string; endTime: string }
  value: { int64Value?: string; doubleValue?: number }
}

interface TimeSeries {
  metric: { type: string; labels?: Record<string, string> }
  resource: { type: string; labels?: Record<string, string> }
  points: TimeSeriesPoint[]
}

interface MonitoringResponse {
  timeSeries?: TimeSeries[]
  error?: { code: number; message: string }
}

export const onRequestGet = async (context: any) => {
  const env = context.data?.env || context.env;
  const saKey = env?.GCP_SA_KEY
  const projectId = env?.GCP_PROJECT_ID

  console.debug('[ai-status/gcp-monitoring] request:start', {
    hasSaKey: Boolean(saKey),
    hasProjectId: Boolean(projectId),
  })

  if (!saKey || !projectId) {
    console.warn('[ai-status/gcp-monitoring] config:missing', {
      hasSaKey: Boolean(saKey),
      hasProjectId: Boolean(projectId),
    })
    return json({
      ok: false,
      configured: false,
      error: 'GCP_SA_KEY e GCP_PROJECT_ID não configurados.',
      setupGuide: {
        title: 'Como configurar o GCP Monitoring (Tier C)',
        steps: [
          '1. Acesse https://console.cloud.google.com/iam-admin/serviceaccounts',
          '2. No projeto que contém a API Key do Gemini, clique "Criar conta de serviço"',
          '3. Nome: "admin-app-monitoring" (ou similar)',
          '4. Conceda o papel (role): "Monitoring Viewer" (roles/monitoring.viewer)',
          '5. Opcional: adicione "Service Usage Consumer" (roles/serviceusage.serviceUsageConsumer) para dados de quota',
          '6. Na aba "Chaves", clique "Adicionar chave" → "Criar nova chave" → JSON',
          '7. Baixe o arquivo JSON — este é o GCP_SA_KEY',
          '8. No Cloudflare Dashboard → seu Pages project → Settings → Environment Variables:',
          '   - GCP_SA_KEY = (cole o conteúdo completo do JSON)',
          '   - GCP_PROJECT_ID = (o ID do projeto GCP, visível no topo do Console)',
          '9. Redeploy o admin-app para ativar',
        ],
        requiredRoles: ['roles/monitoring.viewer'],
        optionalRoles: ['roles/serviceusage.serviceUsageConsumer', 'roles/billing.viewer'],
        securityNote: 'A service account terá acesso SOMENTE LEITURA a métricas. Não tem acesso a dados, billing ou escrita.',
      },
    }, 200) // 200 para o frontend poder exibir o guia
  }

  try {
    const accessToken = await getAccessToken(saKey)
    console.info('[ai-status/gcp-monitoring] token:ok', {
      projectId,
      tokenLength: accessToken.length,
    })

    // Período: últimas 24h para dados granulares
    const endTime = new Date().toISOString()
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Métricas relevantes para generativelanguage.googleapis.com
    // request_count e request_latencies usam resource.type="consumed_api"
    // quota/allocation/usage e quota/limit usam resource.type="consumer_quota"
    const metricDefs = [
      { metric: 'serviceruntime.googleapis.com/api/request_count', resourceType: 'consumed_api' },
      { metric: 'serviceruntime.googleapis.com/api/request_latencies', resourceType: 'consumed_api' },
      { metric: 'serviceruntime.googleapis.com/quota/allocation/usage', resourceType: 'consumer_quota' },
      { metric: 'serviceruntime.googleapis.com/quota/limit', resourceType: 'consumer_quota' },
    ]

    const results: Record<string, TimeSeries[]> = {}

    // Buscar cada métrica em paralelo
    const fetches = metricDefs.map(async ({ metric, resourceType }) => {
      const filter = encodeURIComponent(
        `metric.type="${metric}" AND resource.type="${resourceType}" AND resource.labels.service="generativelanguage.googleapis.com"`
      )
      const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?filter=${filter}&interval.startTime=${startTime}&interval.endTime=${endTime}&aggregation.alignmentPeriod=3600s&aggregation.perSeriesAligner=ALIGN_SUM`

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        return { metric, error: `${res.status}: ${errText.slice(0, 300)}` }
      }

      const data = await res.json() as MonitoringResponse
      if (data.error) return { metric, error: data.error.message }

      results[metric] = data.timeSeries || []
      return { metric, ok: true, seriesCount: (data.timeSeries || []).length }
    })

    const metricResults = await Promise.all(fetches)

    const failedMetrics = metricResults.filter((result) => 'error' in result)
    if (failedMetrics.length > 0) {
      console.warn('[ai-status/gcp-monitoring] metrics:partial-failure', {
        projectId,
        failed: failedMetrics,
      })
    }

    console.info('[ai-status/gcp-monitoring] request:ok', {
      projectId,
      totalMetrics: metricResults.length,
      failedMetrics: failedMetrics.length,
    })

    return json({
      ok: true,
      configured: true,
      projectId,
      period: { start: startTime, end: endTime },
      metricResults,
      timeSeries: results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar Cloud Monitoring.'
    console.error('[ai-status/gcp-monitoring] request:error', {
      projectId,
      error: message,
    })
    return json({
      ok: false,
      configured: true,
      error: message,
    }, 500)
  }
}
