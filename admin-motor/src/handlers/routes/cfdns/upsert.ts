import { resolveAdminActorFromRequest } from '../../../../../functions/api/_lib/admin-actor';
import type { CloudflareDnsRecordInput } from '../../../../../functions/api/_lib/cloudflare-api';
import { createCloudflareDnsRecord, updateCloudflareDnsRecord } from '../../../../../functions/api/_lib/cloudflare-api';
import type { D1Database } from '../../../../../functions/api/_lib/operational';
import { logModuleOperationalEvent } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace } from '../../../../../functions/api/_lib/request-trace';

type Context = {
  request: Request;
  env: {
    BIGDATA_DB?: D1Database;
    CLOUDFLARE_DNS?: string;
  };
};

type UpsertPayload = {
  zoneId?: unknown;
  recordId?: unknown;
  record?: {
    type?: unknown;
    name?: unknown;
    content?: unknown;
    ttl?: unknown;
    proxied?: unknown;
    priority?: unknown;
    comment?: unknown;
    tags?: unknown;
    data?: unknown;
  };
  adminActor?: unknown;
};

const toHeaders = () => ({
  'Content-Type': 'application/json',
});

const toError = (message: string, trace: { request_id: string; timestamp: string }, status = 500) =>
  new Response(
    JSON.stringify({
      ok: false,
      ...trace,
      error: message,
    }),
    {
      status,
      headers: toHeaders(),
    },
  );

const normalizeRecord = (record: UpsertPayload['record']): CloudflareDnsRecordInput => ({
  type: String(record?.type ?? '')
    .trim()
    .toUpperCase(),
  name: String(record?.name ?? '')
    .trim()
    .toLowerCase(),
  content: String(record?.content ?? '').trim(),
  ttl: record?.ttl == null ? null : Number(record.ttl),
  proxied: typeof record?.proxied === 'boolean' ? record.proxied : null,
  priority: record?.priority == null || String(record.priority).trim() === '' ? null : Number(record.priority),
  comment: String(record?.comment ?? '').trim(),
  tags: Array.isArray(record?.tags) ? record?.tags.map((tag) => String(tag).trim()).filter(Boolean) : null,
  data: record?.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : null,
});

export async function onRequestPost(context: Context) {
  const trace = createResponseTrace(context.request);

  try {
    const body = (await context.request.json()) as UpsertPayload;
    const zoneId = String(body.zoneId ?? '').trim();
    const recordId = String(body.recordId ?? '').trim();
    const record = normalizeRecord(body.record);
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>);

    if (!zoneId) {
      return toError('zoneId é obrigatório.', trace, 400);
    }

    if (!record.type || !record.name) {
      return toError('Tipo e nome do registro são obrigatórios.', trace, 400);
    }

    const saved = recordId
      ? await updateCloudflareDnsRecord((context as any).data?.env || context.env, zoneId, recordId, record)
      : await createCloudflareDnsRecord((context as any).data?.env || context.env, zoneId, record);

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: recordId ? 'record-update' : 'record-create',
            provider: 'cloudflare-api',
            adminActor,
            zoneId,
            recordId: String(saved.id ?? recordId),
            type: record.type,
            name: record.name,
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        ...trace,
        mode: recordId ? 'update' : 'create',
        zoneId,
        record: saved,
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar registro DNS.';

    if (((context as any).data?.env || context.env).BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(((context as any).data?.env || context.env).BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'record-upsert',
            provider: 'cloudflare-api',
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return toError(message, trace, 502);
  }
}
