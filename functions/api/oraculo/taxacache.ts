// Módulo: admin-app/functions/api/oraculo/taxa-cache.ts
// Descrição: Lê o status do cache de taxas IPCA+ diretamente do D1 (binding interno).
// Suporta ?force=true para forçar re-download do CSV do Tesouro Transparente.

interface Env { BIGDATA_DB: any }
interface Ctx { env: Env; request: Request }

interface TaxaIpcaCache {
  data_referencia: string
  taxa_indicativa: number
  vencimentos_json: string
  atualizado_em: string
}

interface TituloTD {
  tipo: string
  vencimento: string
  dataBase: string
  taxaCompra: number
  taxaVenda: number
  pu: number
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

interface ParseResult {
  titulos: TituloTD[]
  totalLines: number
  sampleRow: string
}

function parseCSV(csvText: string): ParseResult {
  // Strip BOM e normalizar line endings
  const clean = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = clean.trim().split('\n')
  if (lines.length < 2) return { titulos: [], totalLines: lines.length, sampleRow: lines[0] ?? '' }

  const results: TituloTD[] = []
  let latestDate = ''

  // Sample da última linha para debug
  const sampleRow = lines[lines.length - 1]

  for (let i = lines.length - 1; i >= 1; i--) {
    const cols = lines[i].split(';')
    if (cols.length < 6) continue

    const tipoTitulo = cols[0].trim()
    const tituloPublico = cols[1]?.trim() ?? ''
    const dataVencimento = cols[2]?.trim() ?? ''
    const dataBase = cols[3]?.trim() ?? ''
    const taxaCompra = parseFloat((cols[4] ?? '0').replace(',', '.'))
    const taxaVenda = parseFloat((cols[5] ?? '0').replace(',', '.'))
    const puCompra = parseFloat((cols[6] ?? '0').replace(',', '.'))

    if (!dataBase) continue
    if (!latestDate) latestDate = dataBase
    if (dataBase !== latestDate) break

    // Matching robusto: case-insensitive, inclui NTN-B (nome antigo)
    const tipoLower = tipoTitulo.toLowerCase()
    const pubLower = tituloPublico.toLowerCase()
    const isIpca =
      tipoLower.includes('ipca') ||
      tipoLower.includes('ntn-b') ||
      tipoLower === 'ntn-b' ||
      tipoLower === 'ntn-b principal' ||
      pubLower.includes('ipca') ||
      pubLower.includes('ntn-b')

    if (isIpca) {
      results.push({
        tipo: tipoTitulo,
        vencimento: dataVencimento,
        dataBase,
        taxaCompra: isNaN(taxaCompra) ? 0 : taxaCompra,
        taxaVenda: isNaN(taxaVenda) ? 0 : taxaVenda,
        pu: isNaN(puCompra) ? 0 : puCompra,
      })
    }
  }
  return { titulos: results, totalLines: lines.length, sampleRow }
}

export const onRequestGet = async ({ env, request }: Ctx) => {
  const db = env?.BIGDATA_DB
  if (!db || typeof db.prepare !== 'function')
    return json({ ok: false, error: 'BIGDATA_DB indisponível.' }, 503)

  const url = new URL(request.url)
  const force = url.searchParams.get('force') === 'true'

  try {
    const hoje = new Date().toISOString().slice(0, 10)
    const cacheRow = await db.prepare(
      'SELECT data_referencia, taxa_indicativa, vencimentos_json, atualizado_em FROM oraculo_taxa_ipca_cache WHERE id = ? LIMIT 1'
    ).bind('latest').first() as TaxaIpcaCache | null

    // Retornar cache se válido e sem force
    if (!force && cacheRow && cacheRow.atualizado_em?.startsWith(hoje)) {
      return json({
        ok: true, fonte: 'cache',
        dataReferencia: cacheRow.data_referencia,
        taxaMediaIndicativa: cacheRow.taxa_indicativa,
        atualizadoEm: cacheRow.atualizado_em,
        titulos: JSON.parse(cacheRow.vencimentos_json),
      })
    }

    // Forçar download do CSV
    const csvUrl = 'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv'
    const csvRes = await fetch(csvUrl)
    if (!csvRes.ok) {
      if (cacheRow) {
        return json({
          ok: true, fonte: 'cache-stale',
          dataReferencia: cacheRow.data_referencia,
          taxaMediaIndicativa: cacheRow.taxa_indicativa,
          atualizadoEm: cacheRow.atualizado_em,
          titulos: JSON.parse(cacheRow.vencimentos_json),
        })
      }
      return json({ ok: false, error: `CSV indisponível (HTTP ${csvRes.status}).` }, 502)
    }

    const csvText = await csvRes.text()
    const { titulos, totalLines, sampleRow } = parseCSV(csvText)
    if (titulos.length === 0) {
      if (cacheRow) {
        return json({
          ok: true, fonte: 'cache-stale',
          dataReferencia: cacheRow.data_referencia,
          taxaMediaIndicativa: cacheRow.taxa_indicativa,
          atualizadoEm: cacheRow.atualizado_em,
          titulos: JSON.parse(cacheRow.vencimentos_json),
        })
      }
      return json({
        ok: false,
        error: 'Nenhum título IPCA+ encontrado no CSV.',
        debug: { totalLines, sampleRow: sampleRow.substring(0, 200), csvBytes: csvText.length },
      }, 200)
    }

    const taxasValidas = titulos.filter(t => t.taxaCompra > 0)
    const taxaMedia = taxasValidas.length > 0
      ? Math.round(taxasValidas.reduce((s, t) => s + t.taxaCompra, 0) / taxasValidas.length * 100) / 100
      : 0
    const dataRef = titulos[0].dataBase
    const vencJson = JSON.stringify(titulos)
    const agora = new Date().toISOString()

    await db.prepare(
      `INSERT INTO oraculo_taxa_ipca_cache (id, data_referencia, taxa_indicativa, vencimentos_json, atualizado_em)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data_referencia = ?, taxa_indicativa = ?, vencimentos_json = ?, atualizado_em = ?`
    ).bind('latest', dataRef, taxaMedia, vencJson, agora, dataRef, taxaMedia, vencJson, agora).run()

    return json({
      ok: true, fonte: 'tesouro-transparente',
      dataReferencia: dataRef,
      taxaMediaIndicativa: taxaMedia,
      atualizadoEm: agora,
      titulos,
    })
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'Erro interno.' }, 500)
  }
}
