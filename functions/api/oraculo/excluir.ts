interface Env {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  let body: { id?: string; tipo?: string }
  try {
    body = await request.json() as { id?: string; tipo?: string }
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
    // 1. Deletar o registro da tabela individual
    const table = tipo === 'lci-lca' ? 'oraculo_lci_cdb_registros' : 'oraculo_tesouro_ipca_lotes'
    const result = await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run()

    if (result.meta?.changes === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Registro não encontrado.' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      })
    }

    // 2. Cascata: remover o ID do dados_json em oraculo_user_data (se existir)
    //    Assim, se o usuário resgatar pelos dados salvos, o registro deletado não reaparece.
    const jsonField = tipo === 'lci-lca' ? 'lciRegistros' : 'tesouroRegistros'
    try {
      const { results } = await db.prepare(
        'SELECT id, dados_json FROM oraculo_user_data'
      ).all()

      for (const row of (results ?? []) as Array<{ id: string; dados_json: string }>) {
        try {
          const dados = JSON.parse(row.dados_json)
          const arr = dados[jsonField] as Array<{ id?: string }> | undefined
          if (!arr || !Array.isArray(arr)) continue

          const filtered = arr.filter((r: { id?: string }) => r.id !== id)
          if (filtered.length < arr.length) {
            dados[jsonField] = filtered
            await db.prepare(
              'UPDATE oraculo_user_data SET dados_json = ?, updated_at = datetime(\'now\') WHERE id = ?'
            ).bind(JSON.stringify(dados), row.id).run()
          }
        } catch {
          // JSON inválido neste registro — pular
        }
      }
    } catch {
      // Falha na cascata não deve bloquear a exclusão principal (já feita)
      console.warn('[oraculo/excluir] Cascata para oraculo_user_data falhou silenciosamente')
    }

    return new Response(JSON.stringify({ ok: true, request_id: crypto.randomUUID() }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Falha ao excluir registro.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}

