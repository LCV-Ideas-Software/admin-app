import { getAccessToken, json } from './gcp-monitoring';

export const onRequestGet = async (context: { env: Record<string, string>; data?: { env?: Record<string, string> } }) => {
  const env = context.data?.env || context.env;
  const saKey = env?.GCP_SA_KEY
  const projectId = env?.GCP_PROJECT_ID

  if (!saKey || !projectId) {
    return json({
      ok: false,
      error: 'GCP_SA_KEY e GCP_PROJECT_ID não configurados.',
    }, 400)
  }

  try {
    const accessToken = await getAccessToken(saKey)

    const url = `https://logging.googleapis.com/v2/entries:list`
    const body = {
      resourceNames: [`projects/${projectId}`],
      filter: 'logName:"cloudaudit.googleapis.com%2Fdata_access" OR protoPayload.serviceName="generativelanguage.googleapis.com" OR resource.type="aiplatform.googleapis.com/Endpoint"',
      pageSize: 50,
      orderBy: "timestamp desc"
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[ai-status/gcp-logs] Erro no Cloud Logging:', res.status, errText)
      return json({ ok: false, error: `${res.status}: ${errText.slice(0, 300)}` }, res.status)
    }

    const data = await res.json() as Record<string, unknown>
    
    // Fallback debug: se não vier entries (mesmo 200 OK), expõe o payload original e alerta
    if (!data.entries) {
      return new Response(JSON.stringify({ 
        entries: [], 
        debug_payload: data,
        message: "O Google Cloud Logging respondeu com sucesso, mas a chave 'entries' não estava presente ou o array é vazio. Validar payload de debug." 
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ entries: data.entries }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err: unknown) {
    const isError = err instanceof Error
    return new Response(JSON.stringify({ 
      error: isError ? err.message : String(err),
      stack: isError ? err.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

