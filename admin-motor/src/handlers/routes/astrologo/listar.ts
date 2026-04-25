import type { D1Database } from '../../../../../functions/api/_lib/operational';
import { logModuleOperationalEvent } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace } from '../../../../../functions/api/_lib/request-trace';

type StatusResumo = 'novo' | 'analisado' | 'indisponivel';

type Item = {
  id: string;
  nome: string;
  dataNascimento: string;
  status: StatusResumo;
};

type LegacyMapa = {
  id?: string;
  nome?: string;
  data_nascimento?: string;
  analise_ia?: string | null;
  email?: string;
};

type Env = {
  BIGDATA_DB?: D1Database;
};

type Context = {
  request: Request;
  env: Env;
};

type BigdataMapa = {
  id?: string;
  nome?: string;
  data_nascimento?: string;
  analise_ia?: string | null;
};

const toResponseHeaders = () => ({
  'Content-Type': 'application/json',
});

const toItem = (mapa: LegacyMapa): Item | null => {
  const id = (mapa.id ?? '').trim();
  const nome = (mapa.nome ?? '').trim();
  const dataNascimento = (mapa.data_nascimento ?? '').trim();

  if (!id || !nome || !dataNascimento) {
    return null;
  }

  const hasAnaliseField = Object.hasOwn(mapa, 'analise_ia');
  const status: StatusResumo = hasAnaliseField ? (mapa.analise_ia ? 'analisado' : 'novo') : 'indisponivel';

  return {
    id,
    nome,
    dataNascimento,
    status,
  };
};

const queryBigdataItems = async (db: D1Database, filtros: { nome: string; dataInicial: string; dataFinal: string }) => {
  const { nome, dataInicial, dataFinal } = filtros;
  const clauses: string[] = [];
  const bindings: Array<string | number | null> = [];

  if (nome) {
    clauses.push('LOWER(nome) LIKE ?');
    bindings.push(`%${nome.toLowerCase()}%`);
  }

  if (dataInicial) {
    clauses.push('data_nascimento >= ?');
    bindings.push(dataInicial);
  }

  if (dataFinal) {
    clauses.push('data_nascimento <= ?');
    bindings.push(dataFinal);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const query = `
    SELECT id, nome, data_nascimento, analise_ia
    FROM astrologo_mapas
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 300
  `;

  const result = await db
    .prepare(query)
    .bind(...bindings)
    .all<BigdataMapa>();
  const rows = Array.isArray(result.results) ? result.results : [];

  return rows
    .map((mapa) =>
      toItem({
        id: mapa.id,
        nome: mapa.nome,
        data_nascimento: mapa.data_nascimento,
        analise_ia: mapa.analise_ia,
      }),
    )
    .filter((item): item is Item => item !== null);
};

export async function onRequestGet(context: Context) {
  const { request } = context;
  const env = context.env;
  const trace = createResponseTrace(request);
  const url = new URL(request.url);

  const nome = (url.searchParams.get('nome') ?? '').trim();
  const dataInicial = (url.searchParams.get('dataInicial') ?? '').trim();
  const dataFinal = (url.searchParams.get('dataFinal') ?? '').trim();
  const email = (url.searchParams.get('email') ?? '').trim();

  const avisos: string[] = [];

  if (email) {
    avisos.push('Filtro por e-mail ainda não está disponível nesta fase de integração.');
  }

  if (env.BIGDATA_DB) {
    try {
      const items = await queryBigdataItems(env.BIGDATA_DB, { nome, dataInicial, dataFinal });
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'astrologo',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: { total: items.length },
        });
      } catch {
        // Não bloquear resposta por falha de telemetria.
      }

      return new Response(
        JSON.stringify({
          ok: true,
          ...trace,
          total: items.length,
          fonte: 'bigdata_db',
          filtros: { nome, dataInicial, dataFinal, email },
          avisos,
          items,
        }),
        { headers: toResponseHeaders() },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao consultar bigdata_db';
      avisos.push(`Fallback para legado ativado: ${message}`);
    }
  }

  return new Response(
    JSON.stringify({
      ok: false,
      ...trace,
      error: 'BIGDATA_DB indisponível para leitura do módulo Astrólogo.',
      total: 0,
      filtros: { nome, dataInicial, dataFinal, email },
      avisos: [...avisos, 'Fallback para admin legado desativado por Cloudflare Access.'],
      items: [] as Item[],
    }),
    {
      status: 503,
      headers: toResponseHeaders(),
    },
  );
}
