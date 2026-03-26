// Admin-App: Endpoint para gestão de dados de usuários do Oráculo
// GET: lista registros de oraculo_user_data (paginado)
// DELETE: remove registro por ID

interface Env {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BIGDATA_DB: any
}

interface Ctx { env: Env; request: Request }

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestGet = async ({ env, request }: Ctx) => {
  const db = env?.BIGDATA_DB
  if (!db || typeof db.prepare !== 'function') {
    return jsonResponse({ ok: false, error: 'BIGDATA_DB indisponível.' }, 503)
  }

  try {
    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200)
    const offset = Number(url.searchParams.get('offset') ?? 0)

    // Garantir tabela existe
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS oraculo_user_data (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        dados_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run()

    const countRow = await db.prepare('SELECT COUNT(*) as total FROM oraculo_user_data').first()
    const total = (countRow?.total ?? 0) as number

    const { results } = await db.prepare(
      `SELECT id, email, dados_json, created_at, updated_at
       FROM oraculo_user_data
       ORDER BY datetime(updated_at) DESC
       LIMIT ? OFFSET ?`
    ).bind(limit, offset).all()

    const data = ((results ?? []) as Array<{
      id: string; email: string; dados_json: string
      created_at: string; updated_at: string
    }>).map(row => ({
      id: row.id,
      email: row.email,
      dadosJson: row.dados_json,
      criadoEm: row.created_at,
      atualizadoEm: row.updated_at,
    }))

    return jsonResponse({ ok: true, data, total, limit, offset })
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Erro ao listar dados de usuários.',
    }, 500)
  }
}

export const onRequestDelete = async ({ env, request }: Ctx) => {
  const db = env?.BIGDATA_DB
  if (!db || typeof db.prepare !== 'function') {
    return jsonResponse({ ok: false, error: 'BIGDATA_DB indisponível.' }, 503)
  }

  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.trim()

    if (!id) {
      return jsonResponse({ ok: false, error: 'Parâmetro id é obrigatório.' }, 400)
    }

    await db.prepare('DELETE FROM oraculo_user_data WHERE id = ?').bind(id).run()
    return jsonResponse({ ok: true })
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir registro.',
    }, 500)
  }
}
