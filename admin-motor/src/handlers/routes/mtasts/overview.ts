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

type MtastsHistoryRow = {
  gerado_em?: string;
  domain?: string | null;
  data_criacao?: string;
};

type MtastsPolicyRow = {
  domain?: string;
  policy_text?: string;
  tlsrpt_email?: string | null;
  updated_at?: string;
};

const toResponseHeaders = () => ({
  'Content-Type': 'application/json',
});

const parseLimit = (rawValue: string | null) => {
  const parsed = Number.parseInt(rawValue ?? '30', 10);
  if (!Number.isFinite(parsed)) {
    return 30;
  }
  return Math.min(100, Math.max(1, parsed));
};

const normalizeDomain = (rawValue: string | null) =>
  String(rawValue ?? '')
    .trim()
    .toLowerCase();

const mapHistoryRow = (row: MtastsHistoryRow) => {
  const geradoEm = String(row.gerado_em ?? '').trim();
  if (!geradoEm) {
    return null;
  }

  return {
    geradoEm,
    domain: row.domain == null ? null : String(row.domain).trim().toLowerCase(),
  };
};

const mapPolicyRow = (row: MtastsPolicyRow) => {
  const domain = String(row.domain ?? '')
    .trim()
    .toLowerCase();
  const policyText = String(row.policy_text ?? '').trim();
  if (!domain || !policyText) {
    return null;
  }

  return {
    domain,
    policyText,
    tlsrptEmail: row.tlsrpt_email == null ? null : String(row.tlsrpt_email).trim().toLowerCase(),
    updatedAt: row.updated_at == null ? null : String(row.updated_at),
  };
};

export async function onRequestGet(context: Context) {
  const { request } = context;
  const env = context.env;
  const trace = createResponseTrace(request);
  const url = new URL(request.url);

  const domain = normalizeDomain(url.searchParams.get('domain'));
  const limit = parseLimit(url.searchParams.get('limit'));
  const avisos: string[] = [];

  if (env.BIGDATA_DB) {
    try {
      const historyRows = domain
        ? await env.BIGDATA_DB.prepare(
            'SELECT gerado_em, domain, data_criacao FROM mtasts_history WHERE domain = ? ORDER BY id DESC LIMIT ?',
          )
            .bind(domain, limit)
            .all<MtastsHistoryRow>()
        : await env.BIGDATA_DB.prepare(
            'SELECT gerado_em, domain, data_criacao FROM mtasts_history ORDER BY id DESC LIMIT ?',
          )
            .bind(limit)
            .all<MtastsHistoryRow>();

      const policyRows = domain
        ? await env.BIGDATA_DB.prepare(
            'SELECT domain, policy_text, tlsrpt_email, updated_at FROM mtasts_mta_sts_policies WHERE domain = ? ORDER BY updated_at DESC LIMIT 10',
          )
            .bind(domain)
            .all<MtastsPolicyRow>()
        : await env.BIGDATA_DB.prepare(
            'SELECT domain, policy_text, tlsrpt_email, updated_at FROM mtasts_mta_sts_policies ORDER BY updated_at DESC',
          ).all<MtastsPolicyRow>();

      const history = (historyRows.results ?? [])
        .map((row) => mapHistoryRow(row))
        .filter((item): item is NonNullable<ReturnType<typeof mapHistoryRow>> => item !== null);

      const policies = (policyRows.results ?? [])
        .map((row) => mapPolicyRow(row))
        .filter((item): item is NonNullable<ReturnType<typeof mapPolicyRow>> => item !== null);

      const payload = {
        ok: true,
        fonte: 'bigdata_db',
        filtros: { domain, limit },
        avisos,
        resumo: {
          totalHistorico: history.length,
          totalPolicies: policies.length,
        },
        historico: history,
        policies,
      };

      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'mtasts',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: true,
          metadata: {
            totalHistorico: payload.resumo.totalHistorico,
            totalPolicies: payload.resumo.totalPolicies,
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

  const message = 'BIGDATA_DB indisponível para leitura de overview do MTA-STS.';

  return new Response(
    JSON.stringify({
      ok: false,
      ...trace,
      error: message,
      filtros: { domain, limit },
      avisos: [...avisos, 'Fallback para admin legado desativado por Cloudflare Access.'],
      resumo: {
        totalHistorico: 0,
        totalPolicies: 0,
      },
      historico: [],
      policies: [],
    }),
    {
      status: 503,
      headers: toResponseHeaders(),
    },
  );
}
