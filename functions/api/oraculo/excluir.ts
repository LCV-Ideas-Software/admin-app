interface Env {
  BIGDATA_DB: any
}

interface Context {
  env: Env
  request: Request
}

export const onRequestPost = async ({ env, request }: Context) => {
  const adminActor = request.headers.get('X-Admin-Actor')
  if (!adminActor) {
    return new Response(JSON.stringify({ ok: false, error: 'Requer cabeçalho X-Admin-Actor.' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Payload JSON inválido.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const { id, tipo } = body
  if (!id || !tipo || !['lci-lca', 'tesouro-ipca'].includes(tipo)) {
    return new Response(JSON.stringify({ ok: false, error: 'ID e tipo válidos são obrigatórios.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }

  const db = env?.BIGDATA_DB
  if (!db || typeof db.prepare !== 'function') {
    return new Response(JSON.stringify({ ok: false, error: 'Database indisponível.' }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const table = tipo === 'lci-lca' ? 'oraculo_lci_cdb' : 'oraculo_tesouro_ipca_lotes'
    const result = await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run()

    if (result.meta?.changes === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Registro não encontrado.' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ ok: true, request_id: crypto.randomUUID() }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: 'Falha ao excluir registro.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
