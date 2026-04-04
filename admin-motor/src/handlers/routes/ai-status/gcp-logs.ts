import { getAccessToken, json } from './gcp-monitoring';

export const onRequestGet = async (context: any) => {
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
      projectIds: [projectId],
      filter: 'resource.type="audited_resource" AND serviceName="generativelanguage.googleapis.com"',
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

    const data = await res.json()

    return json({
      ok: true,
      projectId,
      logs: data.entries || []
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar Cloud Logging.'
    console.error('[ai-status/gcp-logs] request:error', { projectId, error: message })
    return json({ ok: false, error: message }, 500)
  }
}
