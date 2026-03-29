// Módulo: admin-app/functions/api/ai-status/gcp-monitoring.ts
// Descrição: Tier C — Consulta Cloud Monitoring API para dados live de uso/quota do Gemini.
// Requer GCP_SA_KEY (JSON da service account) e GCP_PROJECT_ID como secrets no Cloudflare.

interface Env {
  GCP_SA_KEY?: string    // JSON completo da service account key
  GCP_PROJECT_ID?: string
}
interface Ctx { env: Env }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Helper: gerar JWT para OAuth2 com service account
async function parseSaKey(raw: string): Promise<{ client_email: string; private_key: string; token_uri: string }> {
  // Tentativa 1: parse direto (formato mais comum — JSON colado como string plana)
  try {
    const parsed = JSON.parse(raw)
    if (parsed.client_email && parsed.private_key) return parsed
  } catch { /* fallthrough */ }

  // Tentativa 2: base64-encoded (alguns dashboards codificam secrets assim)
  try {
    const decoded = atob(raw)
    const parsed = JSON.parse(decoded)
    if (parsed.client_email && parsed.private_key) return parsed
  } catch { /* fallthrough */ }

  // Tentativa 3: double-escaped JSON (ex.: "{\\"client_email\\"...}")
  try {
    const unescaped = raw.replace(/\\"/g, '"').replace(/^\"|\"$/g, '')
    const parsed = JSON.parse(unescaped)
    if (parsed.client_email && parsed.private_key) return parsed
  } catch { /* fallthrough */ }

  // Diagnóstico: preview seguro (sem expor chave privada)
  const preview = raw.substring(0, 40)
  throw new Error(
    `GCP_SA_KEY não é um JSON válido de Service Account. ` +
    `Preview: "${preview}...". ` +
    `Verifique se o conteúdo completo do arquivo JSON foi colado no secret do Cloudflare.`
  )
}

async function getAccessToken(saKey: string): Promise<string> {
  const sa = await parseSaKey(saKey)

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/monitoring.read https://www.googleapis.com/auth/cloud-platform.read-only',
    aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  // Encode header e payload em base64url
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const signingInput = `${b64url(header)}.${b64url(payload)}`

  // Importar chave privada RSA (PKCS#8)
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '')
  const keyBuffer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const b64Sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const jwt = `${signingInput}.${b64Sig}`

  // Trocar JWT por access token
  const tokenRes = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`)
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

export const onRequestGet = async ({ env }: Ctx) => {
  const saKey = env?.GCP_SA_KEY
  const projectId = env?.GCP_PROJECT_ID

  if (!saKey || !projectId) {
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

    // Período: últimas 24h para dados granulares
    const endTime = new Date().toISOString()
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Métricas relevantes para generativelanguage.googleapis.com
    const metrics = [
      'serviceruntime.googleapis.com/api/request_count',
      'serviceruntime.googleapis.com/api/request_latencies',
      'serviceruntime.googleapis.com/quota/allocation/usage',
      'serviceruntime.googleapis.com/quota/limit',
    ]

    const results: Record<string, TimeSeries[]> = {}

    // Buscar cada métrica em paralelo
    const fetches = metrics.map(async (metric) => {
      const filter = encodeURIComponent(
        `metric.type="${metric}" AND resource.type="consumed_api" AND resource.labels.service="generativelanguage.googleapis.com"`
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

    return json({
      ok: true,
      configured: true,
      projectId,
      period: { start: startTime, end: endTime },
      metricResults,
      timeSeries: results,
    })
  } catch (err) {
    return json({
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : 'Erro ao consultar Cloud Monitoring.',
    }, 500)
  }
}
