interface Env {
  BIGDATA_DB: any
}

interface Context {
  env: Env
  request: Request
}

export const onRequestGet = async ({ env, request }: Context) => {
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
      const stmt = db.prepare('SELECT * FROM oraculo_lci_cdb ORDER BY criado_em DESC LIMIT ? OFFSET ?')
      const countStmt = db.prepare('SELECT COUNT(*) as c FROM oraculo_lci_cdb')
      
      const [res, countRes] = await db.batch([
        stmt.bind(limit, offset),
        countStmt
      ])

      const total = (countRes.results?.[0] as any)?.c || 0
      
      // Mapeamento snake_case para camelCase estruturado como no front-end original
      const items = (res.results ?? []).map((row: any) => ({
        id: row.id,
        criadoEm: row.criado_em,
        prazoDias: row.prazo_dias,
        taxaLciLca: row.taxa_lci_lca,
        aporte: row.aporte,
        aliquotaIr: row.aliquota_ir,
        cdbEquivalente: row.cdb_equivalente
      }))

      return new Response(JSON.stringify({ ok: true, total, items }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } else {
      // Tesouro IPCA
      const stmt = db.prepare('SELECT * FROM oraculo_tesouro_ipca_lotes ORDER BY data_compra DESC LIMIT ? OFFSET ?')
      const countStmt = db.prepare('SELECT COUNT(*) as c FROM oraculo_tesouro_ipca_lotes')
      
      const [res, countRes] = await db.batch([
        stmt.bind(limit, offset),
        countStmt
      ])

      const total = (countRes.results?.[0] as any)?.c || 0
      
      const items = (res.results ?? []).map((row: any) => ({
        id: row.id,
        criadoEm: row.criado_em,
        dataCompra: row.data_compra,
        valorInvestido: row.valor_investido,
        taxaContratada: row.taxa_contratada
      }))

      return new Response(JSON.stringify({ ok: true, total, items }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: 'Falha na consulta ao banco de dados.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
