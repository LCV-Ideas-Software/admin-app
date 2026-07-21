import { resolveAdminActorFromRequest } from '../../../../../functions/api/_lib/admin-actor';
import type { D1Database } from '../../../../../functions/api/_lib/operational';
import { logModuleOperationalEvent } from '../../../../../functions/api/_lib/operational';
import { createResponseTrace } from '../../../../../functions/api/_lib/request-trace';
import { CfApiError, cfApiRequest } from '../_lib/cf-api-core';
import type { CloudflareDnsRecordInput } from '../_lib/cloudflare-api';
import {
  buildDnsRecordFullPayload,
  buildDnsRecordPatchPayload,
  DnsRecordValidationError,
} from '../_lib/cloudflare-api';

type Env = {
  BIGDATA_DB?: D1Database;
  CLOUDFLARE_DNS?: string;
};

type Context = {
  request: Request;
  env: Env;
  data?: {
    env?: Env;
  };
};

type BatchPayload = {
  zoneId?: unknown;
  adminActor?: unknown;
  deletes?: unknown;
  patches?: unknown;
  puts?: unknown;
  posts?: unknown;
};

type CloudflareBatchResult = {
  deletes?: unknown[];
  patches?: unknown[];
  puts?: unknown[];
  posts?: unknown[];
};

// Teto do endpoint de lote da API Cloudflare nos planos pagos; o plano Free
// aceita no máximo 200 operações e lotes maiores são rejeitados pela própria
// CF (a mensagem traduzida do erro orienta o admin nesse caso).
const BATCH_MAX_OPS = 3500;

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

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// Toda exceção dos builders é validação local de entrada — vira 400 nomeando o
// grupo e o índice da operação ofensora (ex.: "posts[2]: ...").
const buildOrThrowIndexed = <T>(group: string, index: number, build: () => T): T => {
  try {
    return build();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DnsRecordValidationError(`${group}[${index}]: ${message}`);
  }
};

const requireOpId = (group: string, index: number, op: unknown): string => {
  const id = String((op as { id?: unknown })?.id ?? '').trim();
  if (!id) {
    throw new DnsRecordValidationError(`${group}[${index}]: id do registro é obrigatório.`);
  }
  return id;
};

const resolveErrorStatus = (error: unknown) => {
  if (error instanceof DnsRecordValidationError) {
    return 400;
  }
  if (error instanceof CfApiError) {
    if (error.kind === 'missing-token') {
      return 500;
    }
    // Erros 4xx da CF (ex.: lote acima do limite do plano, registro
    // conflitante) voltam com o mesmo status e a mensagem traduzida.
    if (error.kind === 'api' && error.status >= 400 && error.status < 500) {
      return error.status;
    }
  }
  return 502;
};

export async function onRequestPost(context: Context) {
  const trace = createResponseTrace(context.request);
  const env = context.data?.env ?? context.env;

  let body: BatchPayload;
  try {
    body = (await context.request.json()) as BatchPayload;
  } catch {
    return toError('Corpo da requisição inválido: envie JSON com zoneId e as operações do lote.', trace, 400);
  }

  const zoneId = String(body.zoneId ?? '').trim();
  const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>);

  if (!zoneId) {
    return toError('zoneId é obrigatório.', trace, 400);
  }

  const rawDeletes = toArray(body.deletes);
  const rawPatches = toArray(body.patches);
  const rawPuts = toArray(body.puts);
  const rawPosts = toArray(body.posts);
  const counts = {
    deletes: rawDeletes.length,
    patches: rawPatches.length,
    puts: rawPuts.length,
    posts: rawPosts.length,
  };
  const totalOps = counts.deletes + counts.patches + counts.puts + counts.posts;

  if (totalOps === 0) {
    return toError('Informe ao menos uma operação no lote (deletes, patches, puts ou posts).', trace, 400);
  }

  if (totalOps > BATCH_MAX_OPS) {
    return toError(
      `Lote com ${totalOps} operações excede o limite da API Cloudflare: 200 operações por lote no plano Free e ${BATCH_MAX_OPS} nos planos pagos (no Free, lotes acima de 200 são rejeitados pela própria Cloudflare). Divida o lote em chamadas menores.`,
      trace,
      400,
    );
  }

  try {
    // deletes → patches → puts → posts é a ordem de execução documentada do
    // endpoint de lote; montamos o corpo na mesma ordem para reproduzi-la.
    const deletes = rawDeletes.map((op, index) => ({ id: requireOpId('deletes', index, op) }));
    const patches = rawPatches.map((op, index) =>
      buildOrThrowIndexed('patches', index, () => ({
        id: requireOpId('patches', index, op),
        ...buildDnsRecordPatchPayload(op as Partial<CloudflareDnsRecordInput>),
      })),
    );
    const puts = rawPuts.map((op, index) =>
      buildOrThrowIndexed('puts', index, () => ({
        id: requireOpId('puts', index, op),
        ...buildDnsRecordFullPayload(op as CloudflareDnsRecordInput),
      })),
    );
    const posts = rawPosts.map((op, index) =>
      buildOrThrowIndexed('posts', index, () => buildDnsRecordFullPayload(op as CloudflareDnsRecordInput)),
    );

    const cfBody = {
      ...(deletes.length > 0 ? { deletes } : {}),
      ...(patches.length > 0 ? { patches } : {}),
      ...(puts.length > 0 ? { puts } : {}),
      ...(posts.length > 0 ? { posts } : {}),
    };

    const { result } = await cfApiRequest<CloudflareBatchResult>(
      env,
      'dns',
      `/zones/${encodeURIComponent(zoneId)}/dns_records/batch`,
      'Falha ao aplicar o lote de registros DNS na zona',
      {
        method: 'POST',
        body: JSON.stringify(cfBody),
      },
    );

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'batch-apply',
            provider: 'cloudflare-api',
            adminActor,
            zoneId,
            ...counts,
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
        zoneId,
        result: {
          deletes: Array.isArray(result?.deletes) ? result.deletes : [],
          patches: Array.isArray(result?.patches) ? result.patches : [],
          puts: Array.isArray(result?.puts) ? result.puts : [],
          posts: Array.isArray(result?.posts) ? result.posts : [],
        },
      }),
      {
        headers: toHeaders(),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao aplicar o lote de registros DNS.';

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'cfdns',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'batch-apply',
            provider: 'cloudflare-api',
            adminActor,
            zoneId,
            ...counts,
          },
        });
      } catch {
        // Telemetria não bloqueia resposta.
      }
    }

    return toError(message, trace, resolveErrorStatus(error));
  }
}
