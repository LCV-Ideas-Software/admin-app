// D1 types (via context.data?.env || context.env): db.prepare().bind().all(), db.batch()
// Env: { BIGDATA_DB: D1Database } — accessed dynamically


export const onRequestGet = async (context: any) => {
  const { request } = context;
  const env = context.data?.env || context.env;
  const url = new URL(request.url)
  const tipo = url.searchParams.get('tipo') ?? 'tesouro-ipca'
  const limit = parseInt(url.searchParams.get('limit') ?? '50', 10)
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)

  const db = env?.BIGDATA_DB
  if (!db || typeof db.prepare !== 'function') {
    return new Response(JSON.stringify({ ok: false, error: 'Database binding (BIGDATA_DB) indisponível.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    if (tipo === 'lci-lca') {
      const stmt = db.prepare('SELECT * FROM oraculo_lci_cdb_registros ORDER BY created_at DESC LIMIT ? OFFSET ?')
      const countStmt = db.prepare('SELECT COUNT(*) as c FROM oraculo_lci_cdb_registros')
      
      const [res, countRes] = await db.batch([
        stmt.bind(limit, offset),
        countStmt
      ])

      const total = Number(countRes.results?.[0]?.c ?? 0)
      
      const items = (res.results ?? []).map((row) => {
        const prazoDias = Number(row.prazo_dias ?? 0)
        const aliquotaIr = prazoDias <= 180 ? 22.5 : prazoDias <= 360 ? 20 : prazoDias <= 720 ? 17.5 : 15
        return {
          id: row.id,
          criadoEm: row.created_at,
          prazoDias,
          taxaLciLca: row.taxa_cdi,
          aporte: row.aporte,
          aliquotaIr,
          cdbEquivalente: row.rendimento_bruto
        }
      })

      return new Response(JSON.stringify({ ok: true, total, items }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } else {
      const stmt = db.prepare('SELECT * FROM oraculo_tesouro_ipca_lotes ORDER BY data_compra DESC LIMIT ? OFFSET ?')
      const countStmt = db.prepare('SELECT COUNT(*) as c FROM oraculo_tesouro_ipca_lotes')
      
      const [res, countRes] = await db.batch([
        stmt.bind(limit, offset),
        countStmt
      ])

      const total = Number(countRes.results?.[0]?.c ?? 0)
      
      const items = (res.results ?? []).map((row) => ({
        id: row.id,
        criadoEm: row.created_at,
        dataCompra: row.data_compra,
        valorInvestido: row.valor_investido,
        taxaContratada: row.taxa_contratada
      }))

      return new Response(JSON.stringify({ ok: true, total, items }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Falha na consulta ao banco de dados.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
