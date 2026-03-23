import { logModuleOperationalEvent } from '../_lib/operational'

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement
  first: <T>() => Promise<T | null>
  all: <T>() => Promise<{ results?: T[] }>
  run: () => Promise<unknown>
}

type D1Database = {
  prepare: (query: string) => D1PreparedStatement
}

type Env = {
  BIGDATA_DB?: D1Database
  CALC_ADMIN_API_BASE_URL?: string
}

type Context = {
  request: Request
  env: Env
}

type BacktestRow = {
  created_at?: number
  moeda?: string
  erro_percentual?: number
}

type LegacyOverviewResponse = {
  backtest?: {
    total_observacoes?: number
    observacoes_7d?: number
    mape_7d_percent?: number | null
    ultimas_observacoes?: Array<{
      created_at?: number
      moeda?: string
      erro_percentual?: number
    }>
  }
  oraculo_telemetria?: {
    total?: number
    cache_hits?: number
    avg_duration_ms?: number | null
    errors?: number
  }
  contexto_operacional?: {
    is_plantao?: boolean
  }
}

type CalculadoraOverviewPayload = {
  ok: boolean
  fonte: 'bigdata_db' | 'legacy-admin'
  filtros: {
    moeda: string
    dias: number
  }
  avisos: string[]
  resumo: {
    totalObservacoes: number
    observacoesJanela: number
    mapeJanelaPercent: number | null
    telemetriaTotal: number
    telemetriaErros: number
    telemetriaCacheHits: number
    telemetriaAvgDurationMs: number | null
    isPlantao: boolean | null
  }
  ultimasObservacoes: Array<{
    createdAt: number
    moeda: string
    erroPercentual: number
  }>
}

const DEFAULT_CALC_ADMIN_URL = 'https://admin.lcv.app.br'

const toResponseHeaders = () => ({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
})

const normalizeBaseUrl = (value: string) => value.endsWith('/') ? value.slice(0, -1) : value

const normalizeMoeda = (rawValue: string) => rawValue.trim().toUpperCase()

const parseDias = (rawValue: string | null) => {
  const parsed = Number.parseInt(rawValue ?? '7', 10)
  if (!Number.isFinite(parsed)) {
    return 7
  }
  return Math.min(90, Math.max(1, parsed))
}

const mapLegacyPayload = (
  legacy: LegacyOverviewResponse,
  filtros: { moeda: string; dias: number },
  avisos: string[],
): CalculadoraOverviewPayload => {
  const ultimas = Array.isArray(legacy.backtest?.ultimas_observacoes)
    ? legacy.backtest?.ultimas_observacoes
    : []

  const mappedUltimas = ultimas
    .filter((item) => Number.isFinite(Number(item.created_at)) && typeof item.moeda === 'string' && Number.isFinite(Number(item.erro_percentual)))
    .map((item) => ({
      createdAt: Number(item.created_at),
      moeda: String(item.moeda),
      erroPercentual: Number(item.erro_percentual),
    }))

  return {
    ok: true,
    fonte: 'legacy-admin',
    filtros,
    avisos,
    resumo: {
      totalObservacoes: Number(legacy.backtest?.total_observacoes ?? 0),
      observacoesJanela: Number(legacy.backtest?.observacoes_7d ?? 0),
      mapeJanelaPercent: Number.isFinite(Number(legacy.backtest?.mape_7d_percent))
        ? Number(legacy.backtest?.mape_7d_percent)
        : null,
      telemetriaTotal: Number(legacy.oraculo_telemetria?.total ?? 0),
      telemetriaErros: Number(legacy.oraculo_telemetria?.errors ?? 0),
      telemetriaCacheHits: Number(legacy.oraculo_telemetria?.cache_hits ?? 0),
      telemetriaAvgDurationMs: Number.isFinite(Number(legacy.oraculo_telemetria?.avg_duration_ms))
        ? Number(legacy.oraculo_telemetria?.avg_duration_ms)
        : null,
      isPlantao: typeof legacy.contexto_operacional?.is_plantao === 'boolean' ? legacy.contexto_operacional.is_plantao : null,
    },
    ultimasObservacoes: mappedUltimas,
  }
}

const queryBigdataOverview = async (
  db: D1Database,
  filtros: { moeda: string; dias: number },
): Promise<CalculadoraOverviewPayload> => {
  const { moeda, dias } = filtros
  const cutoff = Date.now() - (dias * 24 * 60 * 60 * 1000)
  const hasMoedaFilter = moeda.length > 0

  const totalRow = hasMoedaFilter
    ? await db.prepare('SELECT COUNT(1) AS total FROM calc_backtest_spot_vs_ptax WHERE moeda = ?').bind(moeda).first<{ total?: number }>()
    : await db.prepare('SELECT COUNT(1) AS total FROM calc_backtest_spot_vs_ptax').first<{ total?: number }>()

  const janelaRow = hasMoedaFilter
    ? await db.prepare('SELECT COUNT(1) AS total_janela, AVG(erro_percentual) AS mape_janela FROM calc_backtest_spot_vs_ptax WHERE created_at >= ? AND moeda = ?').bind(cutoff, moeda).first<{ total_janela?: number; mape_janela?: number | null }>()
    : await db.prepare('SELECT COUNT(1) AS total_janela, AVG(erro_percentual) AS mape_janela FROM calc_backtest_spot_vs_ptax WHERE created_at >= ?').bind(cutoff).first<{ total_janela?: number; mape_janela?: number | null }>()

  const ultimasRows = hasMoedaFilter
    ? await db.prepare('SELECT created_at, moeda, erro_percentual FROM calc_backtest_spot_vs_ptax WHERE moeda = ? ORDER BY created_at DESC LIMIT 10').bind(moeda).all<BacktestRow>()
    : await db.prepare('SELECT created_at, moeda, erro_percentual FROM calc_backtest_spot_vs_ptax ORDER BY created_at DESC LIMIT 10').all<BacktestRow>()

  const telemetriaRow = hasMoedaFilter
    ? await db.prepare(`
      SELECT
        COUNT(1) AS total,
        SUM(CASE WHEN from_cache = 1 THEN 1 ELSE 0 END) AS cache_hits,
        AVG(duration_ms) AS avg_duration,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
      FROM calc_oraculo_observabilidade
      WHERE moeda = ?
    `).bind(moeda).first<{ total?: number; cache_hits?: number; avg_duration?: number | null; errors?: number }>()
    : await db.prepare(`
      SELECT
        COUNT(1) AS total,
        SUM(CASE WHEN from_cache = 1 THEN 1 ELSE 0 END) AS cache_hits,
        AVG(duration_ms) AS avg_duration,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
      FROM calc_oraculo_observabilidade
    `).first<{ total?: number; cache_hits?: number; avg_duration?: number | null; errors?: number }>()

  const mappedUltimas = (ultimasRows.results ?? [])
    .filter((item) => Number.isFinite(Number(item.created_at)) && typeof item.moeda === 'string' && Number.isFinite(Number(item.erro_percentual)))
    .map((item) => ({
      createdAt: Number(item.created_at),
      moeda: String(item.moeda),
      erroPercentual: Number(item.erro_percentual),
    }))

  return {
    ok: true,
    fonte: 'bigdata_db',
    filtros,
    avisos: [],
    resumo: {
      totalObservacoes: Number(totalRow?.total ?? 0),
      observacoesJanela: Number(janelaRow?.total_janela ?? 0),
      mapeJanelaPercent: Number.isFinite(Number(janelaRow?.mape_janela))
        ? Number((Number(janelaRow?.mape_janela) * 100).toFixed(4))
        : null,
      telemetriaTotal: Number(telemetriaRow?.total ?? 0),
      telemetriaErros: Number(telemetriaRow?.errors ?? 0),
      telemetriaCacheHits: Number(telemetriaRow?.cache_hits ?? 0),
      telemetriaAvgDurationMs: Number.isFinite(Number(telemetriaRow?.avg_duration))
        ? Math.round(Number(telemetriaRow?.avg_duration))
        : null,
      isPlantao: null,
    },
    ultimasObservacoes: mappedUltimas,
  }
}

export async function onRequestGet(context: Context) {
  const { request, env } = context
  const url = new URL(request.url)

  const moeda = normalizeMoeda(url.searchParams.get('moeda') ?? '')
  const dias = parseDias(url.searchParams.get('dias'))
  const filtros = { moeda, dias }
  const avisos: string[] = []

  if (env.BIGDATA_DB) {
    try {
      const payload = await queryBigdataOverview(env.BIGDATA_DB, filtros)
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'calculadora',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            totalObservacoes: payload.resumo.totalObservacoes,
            observacoesJanela: payload.resumo.observacoesJanela,
          },
        })
      } catch {
        // Não bloquear resposta por falha de telemetria.
      }

      return new Response(JSON.stringify(payload), {
        headers: toResponseHeaders(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao consultar bigdata_db'
      avisos.push(`Fallback para legado ativado: ${message}`)
    }
  }

  const legacyBaseUrl = normalizeBaseUrl(env.CALC_ADMIN_API_BASE_URL ?? DEFAULT_CALC_ADMIN_URL)
  const legacyUrl = `${legacyBaseUrl}/api/admin/overview`

  try {
    const response = await fetch(legacyUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Falha no backend legado do Calculadora: HTTP ${response.status}`)
    }

    const payload = await response.json() as LegacyOverviewResponse
    const mapped = mapLegacyPayload(payload, filtros, avisos)

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'calculadora',
          source: 'legacy-admin',
          fallbackUsed: true,
          ok: true,
          metadata: {
            totalObservacoes: mapped.resumo.totalObservacoes,
            observacoesJanela: mapped.resumo.observacoesJanela,
          },
        })
      } catch {
        // Não bloquear resposta por falha de telemetria.
      }
    }

    return new Response(JSON.stringify(mapped), {
      headers: toResponseHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido no módulo Calculadora'

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'calculadora',
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
      filtros,
      avisos,
      resumo: {
        totalObservacoes: 0,
        observacoesJanela: 0,
        mapeJanelaPercent: null,
        telemetriaTotal: 0,
        telemetriaErros: 0,
        telemetriaCacheHits: 0,
        telemetriaAvgDurationMs: null,
        isPlantao: null,
      },
      ultimasObservacoes: [],
    }), {
      status: 502,
      headers: toResponseHeaders(),
    })
  }
}
