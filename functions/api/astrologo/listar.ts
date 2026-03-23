import { logModuleOperationalEvent } from '../_lib/operational'

type StatusResumo = 'novo' | 'analisado' | 'indisponivel'

type Item = {
  id: string
  nome: string
  dataNascimento: string
  status: StatusResumo
}

type LegacyMapa = {
  id?: string
  nome?: string
  data_nascimento?: string
  analise_ia?: string | null
  email?: string
}

type LegacyListResponse = {
  success?: boolean
  mapas?: LegacyMapa[]
}

type Env = {
  ASTROLOGO_ADMIN_API_BASE_URL?: string
  BIGDATA_DB?: D1Database
}

type Context = {
  request: Request
  env: Env
}

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement
  all: <T>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

type D1Database = {
  prepare: (query: string) => D1PreparedStatement
}

type BigdataMapa = {
  id?: string
  nome?: string
  data_nascimento?: string
  analise_ia?: string | null
}

const DEFAULT_ASTROLOGO_ADMIN_URL = 'https://admin-astrologo.lcv.app.br'

const toResponseHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

const normalizeBaseUrl = (value: string) => value.endsWith('/') ? value.slice(0, -1) : value

const toItem = (mapa: LegacyMapa): Item | null => {
  const id = (mapa.id ?? '').trim()
  const nome = (mapa.nome ?? '').trim()
  const dataNascimento = (mapa.data_nascimento ?? '').trim()

  if (!id || !nome || !dataNascimento) {
    return null
  }

  const hasAnaliseField = Object.hasOwn(mapa, 'analise_ia')
  const status: StatusResumo = hasAnaliseField
    ? (mapa.analise_ia ? 'analisado' : 'novo')
    : 'indisponivel'

  return {
    id,
    nome,
    dataNascimento,
    status,
  }
}

const filterItems = (
  items: Item[],
  filtros: { nome: string; dataInicial: string; dataFinal: string },
) => {
  const { nome, dataInicial, dataFinal } = filtros
  let filtered = [...items]

  if (nome) {
    const nomeNormalized = nome.toLowerCase()
    filtered = filtered.filter((item) => item.nome.toLowerCase().includes(nomeNormalized))
  }

  if (dataInicial) {
    filtered = filtered.filter((item) => item.dataNascimento >= dataInicial)
  }

  if (dataFinal) {
    filtered = filtered.filter((item) => item.dataNascimento <= dataFinal)
  }

  return filtered
}

const queryBigdataItems = async (
  db: D1Database,
  filtros: { nome: string; dataInicial: string; dataFinal: string },
) => {
  const { nome, dataInicial, dataFinal } = filtros
  const clauses: string[] = []
  const bindings: Array<string | number | null> = []

  if (nome) {
    clauses.push('LOWER(nome) LIKE ?')
    bindings.push(`%${nome.toLowerCase()}%`)
  }

  if (dataInicial) {
    clauses.push('data_nascimento >= ?')
    bindings.push(dataInicial)
  }

  if (dataFinal) {
    clauses.push('data_nascimento <= ?')
    bindings.push(dataFinal)
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const query = `
    SELECT id, nome, data_nascimento, analise_ia
    FROM astrologo_mapas
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 300
  `

  const result = await db.prepare(query).bind(...bindings).all<BigdataMapa>()
  const rows = Array.isArray(result.results) ? result.results : []

  return rows
    .map((mapa) => toItem({
      id: mapa.id,
      nome: mapa.nome,
      data_nascimento: mapa.data_nascimento,
      analise_ia: mapa.analise_ia,
    }))
    .filter((item): item is Item => item !== null)
}

export async function onRequestGet(context: Context) {
  const { request, env } = context
  const url = new URL(request.url)

  const nome = (url.searchParams.get('nome') ?? '').trim()
  const dataInicial = (url.searchParams.get('dataInicial') ?? '').trim()
  const dataFinal = (url.searchParams.get('dataFinal') ?? '').trim()
  const email = (url.searchParams.get('email') ?? '').trim()

  const astrologoAdminBaseUrl = normalizeBaseUrl(env.ASTROLOGO_ADMIN_API_BASE_URL ?? DEFAULT_ASTROLOGO_ADMIN_URL)
  const astrologoListUrl = `${astrologoAdminBaseUrl}/api/admin/listar`
  const avisos: string[] = []

  if (email) {
    avisos.push('Filtro por e-mail ainda não está disponível nesta fase de integração.')
  }

  if (env.BIGDATA_DB) {
    try {
      const items = await queryBigdataItems(env.BIGDATA_DB, { nome, dataInicial, dataFinal })
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'astrologo',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: { total: items.length },
        })
      } catch {
        // Não bloquear resposta por falha de telemetria.
      }

      return new Response(JSON.stringify({
        ok: true,
        total: items.length,
        fonte: 'bigdata_db',
        filtros: { nome, dataInicial, dataFinal, email },
        avisos,
        items,
      }), { headers: toResponseHeaders() })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao consultar bigdata_db'
      avisos.push(`Fallback para legado ativado: ${message}`)
    }
  }

  try {
    const response = await fetch(astrologoListUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Falha no backend legado: HTTP ${response.status}`)
    }

    const payload = await response.json() as LegacyListResponse
    if (!payload.success || !Array.isArray(payload.mapas)) {
      throw new Error('Resposta inválida do backend legado do Astrólogo')
    }

    const normalizedItems = payload.mapas
      .map((mapa) => toItem(mapa))
      .filter((item): item is Item => item !== null)

    const filteredItems = filterItems(normalizedItems, { nome, dataInicial, dataFinal })

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'astrologo',
          source: 'legacy-admin',
          fallbackUsed: true,
          ok: true,
          metadata: { total: filteredItems.length },
        })
      } catch {
        // Não bloquear resposta por falha de telemetria.
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      total: filteredItems.length,
      fonte: 'legacy-admin',
      filtros: { nome, dataInicial, dataFinal, email },
      avisos,
      items: filteredItems,
    }), { headers: toResponseHeaders() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido no módulo Astrólogo'

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'astrologo',
          source: 'legacy-admin',
          fallbackUsed: true,
          ok: false,
          errorMessage: message,
        })
      } catch {
        // Não bloquear resposta por falha de telemetria.
      }
    }

    return new Response(JSON.stringify({
      ok: false,
      error: message,
      total: 0,
      filtros: { nome, dataInicial, dataFinal, email },
      avisos: ['Fallback de mock desativado: integração operando em modo real.'],
      items: [] as Item[],
    }), {
      status: 502,
      headers: toResponseHeaders(),
    })
  }
}