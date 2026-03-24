// admin-app/functions/api/financeiro/delete.ts
// DELETE — Remove a financial log record by ID from BIGDATA_DB

interface Env {
  BIGDATA_DB: D1Database
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const db = context.env.BIGDATA_DB
  const url = new URL(context.request.url)
  const id = url.searchParams.get('id')

  if (!id || !Number.isFinite(Number(id))) {
    return Response.json({ ok: false, error: 'ID inválido.' }, { status: 400 })
  }

  try {
    const result = await db.prepare(
      'DELETE FROM mainsite_financial_logs WHERE id = ?'
    ).bind(Number(id)).run()

    if (!result.success) {
      return Response.json({ ok: false, error: 'Falha ao excluir registro.' }, { status: 500 })
    }

    return Response.json({ ok: true, deleted: Number(id) })
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Erro interno ao excluir registro financeiro.' },
      { status: 500 },
    )
  }
}
