// Admin-App: Endpoint para gestão de dados de usuários do Astrólogo
// GET: lista registros de astrologo_user_data (paginado)
// DELETE: remove registro por ID

interface D1RunResult { meta?: { changes?: number } }

// Env: { BIGDATA_DB } — via context.data?.env || context.env

import { maskEmail } from '../_lib/log-safety'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestGet = async (context: any) => {
  const { request } = context;
  const env = context.data?.env || context.env;
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
      CREATE TABLE IF NOT EXISTS astrologo_user_data (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        dados_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run()

    const countRow = await db.prepare('SELECT COUNT(*) as total FROM astrologo_user_data').first()
    const total = (countRow?.total ?? 0) as number

    const { results } = await db.prepare(
      `SELECT id, email, dados_json, created_at, updated_at
       FROM astrologo_user_data
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

export const onRequestDelete = async (context: any) => {
  const { request } = context;
  const env = context.data?.env || context.env;
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

    // 1. Ler o registro do usuário para obter email e dados_json (para cascata)
    const row = await db.prepare(
      'SELECT email, dados_json FROM astrologo_user_data WHERE id = ? LIMIT 1'
    ).bind(id).first() as { email: string; dados_json: string } | null

    if (!row) {
      return jsonResponse({ ok: false, error: 'Registro não encontrado.' }, 404)
    }

    const email = row.email
    const deletedCounts = { userdata: 0, mapas: 0, tokens: 0 }

    let mapasIds: string[] = []
    try {
      const dados = JSON.parse(row.dados_json)
      mapasIds = (dados.mapasSalvos ?? [])
        .map((r: { id?: string }) => r.id)
        .filter((v: unknown): v is string => typeof v === 'string' && v.length > 0)
    } catch {
      console.warn(`[astrologo/userdata DELETE] dados_json inválido para user ${id}`)
    }

    // 3. Deletar lotes (por IDs extraídos do JSON)
    for (const mapId of mapasIds) {
      const result = await db.prepare(
        'DELETE FROM astrologo_mapas WHERE id = ?'
      ).bind(mapId).run()
      if ((result as D1RunResult)?.meta?.changes && (result as D1RunResult).meta!.changes! > 0) deletedCounts.mapas++
    }

    // 5. Deletar todos os tokens de autenticação desse email
    const tokenResult = await db.prepare(
      'DELETE FROM astrologo_auth_tokens WHERE email = ?'
    ).bind(email).run()
    deletedCounts.tokens = (tokenResult as D1RunResult)?.meta?.changes ?? 0

    // 6. Safety net
    try {
      await db.prepare(`ALTER TABLE astrologo_mapas ADD COLUMN email TEXT DEFAULT ''`).run()
    } catch { /* exists */ }
    await db.prepare('DELETE FROM astrologo_mapas WHERE email = ?').bind(email).run()

    // 7. Deletar o registro principal de astrologo_user_data
    await db.prepare('DELETE FROM astrologo_user_data WHERE id = ?').bind(id).run()
    deletedCounts.userdata = 1

    console.log('[astrologo/userdata DELETE] cascata:complete', {
      userId: id,
      email: maskEmail(email),
      deleted: deletedCounts,
    })

    return jsonResponse({
      ok: true,
      email,
      deleted: deletedCounts,
    })
  } catch (error) {
    console.error('[astrologo/userdata DELETE] Erro:', error)
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir registro.',
    }, 500)
  }
}
