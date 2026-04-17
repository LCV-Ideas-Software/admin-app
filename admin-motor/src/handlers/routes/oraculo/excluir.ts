// Env: { BIGDATA_DB } — via context.data?.env || context.env

import { DEFAULT_ADMIN_ACTOR, resolveAdminActorFromRequest } from '../_lib/admin-actor';

interface DeleteBody {
  id?: string;
  tipo?: string;
  adminActor?: string;
  adminEmail?: string;
}

interface D1RunResult {
  meta?: {
    changes?: number;
  };
}

interface D1Prepared {
  bind(...values: unknown[]): {
    run(): Promise<D1RunResult>;
  };
  all(): Promise<{ results?: Array<{ id: string; dados_json: string }> }>;
}

interface D1DatabaseLike {
  prepare(query: string): D1Prepared;
}

interface HandlerContext {
  request: Request;
  env?: {
    BIGDATA_DB?: D1DatabaseLike;
  };
  data?: {
    env?: {
      BIGDATA_DB?: D1DatabaseLike;
    };
  };
}

export const onRequestPost = async (context: HandlerContext) => {
  const { request } = context;
  const env = context.data?.env || context.env;

  let body: DeleteBody;
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Payload JSON inválido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adminActor = resolveAdminActorFromRequest(request, body);
  if (adminActor === DEFAULT_ADMIN_ACTOR) {
    return new Response(JSON.stringify({ ok: false, error: 'Admin actor não resolvido.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id, tipo } = body;
  if (!id || !tipo || !['lci-lca', 'tesouro-ipca'].includes(tipo)) {
    return new Response(JSON.stringify({ ok: false, error: 'ID e tipo válidos são obrigatórios.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = env?.BIGDATA_DB;
  if (!db || typeof db.prepare !== 'function') {
    return new Response(JSON.stringify({ ok: false, error: 'Database indisponível.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Deletar o registro da tabela individual
    const table = tipo === 'lci-lca' ? 'oraculo_lci_cdb_registros' : 'oraculo_tesouro_ipca_lotes';
    const result = await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();

    if (result.meta?.changes === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Registro não encontrado.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Cascata: remover o ID do dados_json em oraculo_user_data (se existir)
    //    Assim, se o usuário resgatar pelos dados salvos, o registro deletado não reaparece.
    const jsonField = tipo === 'lci-lca' ? 'lciRegistros' : 'tesouroRegistros';
    try {
      const { results } = await db.prepare('SELECT id, dados_json FROM oraculo_user_data').all();

      for (const row of results ?? []) {
        try {
          const dados = JSON.parse(row.dados_json);
          const arr = dados[jsonField] as Array<{ id?: string }> | undefined;
          if (!arr || !Array.isArray(arr)) continue;

          const filtered = arr.filter((r: { id?: string }) => r.id !== id);
          if (filtered.length < arr.length) {
            dados[jsonField] = filtered;
            await db
              .prepare("UPDATE oraculo_user_data SET dados_json = ?, updated_at = datetime('now') WHERE id = ?")
              .bind(JSON.stringify(dados), row.id)
              .run();
          }
        } catch {
          // JSON inválido neste registro — pular
        }
      }
    } catch {
      // Falha na cascata não deve bloquear a exclusão principal (já feita)
      console.warn('[oraculo/excluir] Cascata para oraculo_user_data falhou silenciosamente');
    }

    return new Response(JSON.stringify({ ok: true, request_id: crypto.randomUUID(), admin_actor: adminActor }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Falha ao excluir registro.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
