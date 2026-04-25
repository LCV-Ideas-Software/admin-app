import type { D1Database } from '../../../../../functions/api/_lib/operational';
import { logModuleOperationalEvent } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace } from '../../../../../functions/api/_lib/request-trace';

type Env = {
  BIGDATA_DB?: D1Database;
};

type Context = {
  request: Request;
  env: Env;
};

type BacktestRow = {
  created_at?: number;
  moeda?: string;
  erro_percentual?: number;
};

type CalculadoraOverviewPayload = {
  ok: boolean;
  fonte: 'bigdata_db';
  filtros: {
    moeda: string;
    dias: number;
  };
  avisos: string[];
  resumo: {
    totalObservacoes: number;
    observacoesJanela: number;
    mapeJanelaPercent: number | null;
    telemetriaTotal: number;
    telemetriaErros: number;
    telemetriaCacheHits: number;
    telemetriaAvgDurationMs: number | null;
    isPlantao: boolean | null;
  };
  ultimasObservacoes: Array<{
    createdAt: number;
    moeda: string;
    erroPercentual: number;
  }>;
};

const toResponseHeaders = () => ({
  'Content-Type': 'application/json',
});

const normalizeMoeda = (rawValue: string) => rawValue.trim().toUpperCase();

const parseDias = (rawValue: string | null) => {
  const parsed = Number.parseInt(rawValue ?? '7', 10);
  if (!Number.isFinite(parsed)) {
    return 7;
  }
  return Math.min(90, Math.max(1, parsed));
};

const queryBigdataOverview = async (
  db: D1Database,
  filtros: { moeda: string; dias: number },
): Promise<CalculadoraOverviewPayload> => {
  const { moeda, dias } = filtros;
  const cutoff = Date.now() - dias * 24 * 60 * 60 * 1000;
  const hasMoedaFilter = moeda.length > 0;

  const totalRow = hasMoedaFilter
    ? await db
        .prepare('SELECT COUNT(1) AS total FROM calc_backtest_spot_vs_ptax WHERE moeda = ?')
        .bind(moeda)
        .first<{ total?: number }>()
    : await db.prepare('SELECT COUNT(1) AS total FROM calc_backtest_spot_vs_ptax').first<{ total?: number }>();

  const janelaRow = hasMoedaFilter
    ? await db
        .prepare(
          'SELECT COUNT(1) AS total_janela, AVG(erro_percentual) AS mape_janela FROM calc_backtest_spot_vs_ptax WHERE created_at >= ? AND moeda = ?',
        )
        .bind(cutoff, moeda)
        .first<{ total_janela?: number; mape_janela?: number | null }>()
    : await db
        .prepare(
          'SELECT COUNT(1) AS total_janela, AVG(erro_percentual) AS mape_janela FROM calc_backtest_spot_vs_ptax WHERE created_at >= ?',
        )
        .bind(cutoff)
        .first<{ total_janela?: number; mape_janela?: number | null }>();

  const ultimasRows = hasMoedaFilter
    ? await db
        .prepare(
          'SELECT created_at, moeda, erro_percentual FROM calc_backtest_spot_vs_ptax WHERE moeda = ? ORDER BY created_at DESC LIMIT 10',
        )
        .bind(moeda)
        .all<BacktestRow>()
    : await db
        .prepare(
          'SELECT created_at, moeda, erro_percentual FROM calc_backtest_spot_vs_ptax ORDER BY created_at DESC LIMIT 10',
        )
        .all<BacktestRow>();

  const telemetriaRow = hasMoedaFilter
    ? await db
        .prepare(`
      SELECT
        COUNT(1) AS total,
        SUM(CASE WHEN from_cache = 1 THEN 1 ELSE 0 END) AS cache_hits,
        AVG(duration_ms) AS avg_duration,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
      FROM calc_oraculo_observabilidade
      WHERE moeda = ?
    `)
        .bind(moeda)
        .first<{ total?: number; cache_hits?: number; avg_duration?: number | null; errors?: number }>()
    : await db
        .prepare(`
      SELECT
        COUNT(1) AS total,
        SUM(CASE WHEN from_cache = 1 THEN 1 ELSE 0 END) AS cache_hits,
        AVG(duration_ms) AS avg_duration,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
      FROM calc_oraculo_observabilidade
    `)
        .first<{ total?: number; cache_hits?: number; avg_duration?: number | null; errors?: number }>();

  const mappedUltimas = (ultimasRows.results ?? [])
    .filter(
      (item) =>
        Number.isFinite(Number(item.created_at)) &&
        typeof item.moeda === 'string' &&
        Number.isFinite(Number(item.erro_percentual)),
    )
    .map((item) => ({
      createdAt: Number(item.created_at),
      moeda: String(item.moeda),
      erroPercentual: Number(item.erro_percentual),
    }));

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
  };
};

export async function onRequestGet(context: Context) {
  const { request } = context;
  const env = context.env;
  const trace = createResponseTrace(request);
  const url = new URL(request.url);

  const moeda = normalizeMoeda(url.searchParams.get('moeda') ?? '');
  const dias = parseDias(url.searchParams.get('dias'));
  const filtros = { moeda, dias };
  const avisos: string[] = [];

  if (env.BIGDATA_DB) {
    try {
      const payload = await queryBigdataOverview(env.BIGDATA_DB, filtros);
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
        });
      } catch {
        // Não bloquear resposta por falha de telemetria.
      }

      return new Response(
        JSON.stringify({
          ...payload,
          ...trace,
        }),
        {
          headers: toResponseHeaders(),
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao consultar bigdata_db';
      avisos.push(`Leitura em modo D1 indisponível: ${message}`);
    }
  }

  return new Response(
    JSON.stringify({
      ok: false,
      ...trace,
      error: 'BIGDATA_DB indisponível para leitura do módulo Calculadora.',
      filtros,
      avisos: [...avisos, 'Fallback para admin legado desativado por Cloudflare Access.'],
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
    }),
    {
      status: 503,
      headers: toResponseHeaders(),
    },
  );
}
