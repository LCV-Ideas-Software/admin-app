import { resolveAdminActorFromRequest } from '../../../../../functions/api/_lib/admin-actor';
import { type Context as BaseContext, type Env, toHeaders } from '../../../../../functions/api/_lib/astrologo-admin';
import { logModuleOperationalEvent } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace } from '../../../../../functions/api/_lib/request-trace';

// Middleware do runtime Pages pode injetar `data.env`; o tipo compartilhado não declara `data`.
type Context = BaseContext & { data?: { env?: Env } };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: toHeaders(),
  });

const resolveDb = (context: Context) => (context.data?.env ?? context.env).BIGDATA_DB;
const resolveOperationalSource = () => 'bigdata_db' as const;

export async function onRequestPost(context: Context) {
  const trace = createResponseTrace(context.request);
  const db = resolveDb(context);
  const source = resolveOperationalSource();

  if (!db) {
    return json({ ok: false, error: 'Nenhum binding D1 disponível (BIGDATA_DB).', ...trace }, 503);
  }

  try {
    const body = (await context.request.json()) as Record<string, unknown>;
    const adminActor = resolveAdminActorFromRequest(context.request, body);
    const id = String(body.id ?? '').trim();

    if (!id) {
      return json({ ok: false, error: 'ID inválido.', ...trace }, 400);
    }

    await db.prepare('DELETE FROM astrologo_mapas WHERE id = ?').bind(id).run();

    const operationalDb = (context.data?.env ?? context.env).BIGDATA_DB;
    if (operationalDb) {
      try {
        await logModuleOperationalEvent(operationalDb, {
          module: 'astrologo',
          source,
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'delete-mapa',
            mapaId: id,
            adminActor,
          },
        });
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: true, id, admin_actor: adminActor, ...trace });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao excluir mapa do Astrólogo';

    const operationalDb = (context.data?.env ?? context.env).BIGDATA_DB;
    if (operationalDb) {
      try {
        await logModuleOperationalEvent(operationalDb, {
          module: 'astrologo',
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: 'delete-mapa' },
        });
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: false, error: message, ...trace }, 500);
  }
}
