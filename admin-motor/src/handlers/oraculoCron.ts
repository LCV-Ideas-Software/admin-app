type Env = { CLOUDFLARE_PW?: string; CF_ACCOUNT_ID?: string };

type Context = { request: Request; env: Env };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const resolveToken = (env: Env): string => env.CLOUDFLARE_PW?.trim() || '';

export const handleOraculoCronGet = async (context: Context) => {
  const token = resolveToken(context.env);
  const accountId = context.env.CF_ACCOUNT_ID?.trim();

  if (!token || !accountId) {
    return json({ ok: false, error: 'CLOUDFLARE_PW ou CF_ACCOUNT_ID ausente.' }, 503);
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/cron-taxa-ipca/schedules`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    );

    const data = (await res.json()) as {
      success?: boolean;
      result?: { schedules?: { cron: string }[] };
      errors?: { message: string }[];
    };

    if (!res.ok || !data.success) {
      const msg = data.errors?.[0]?.message || `HTTP ${res.status}`;
      return json({ ok: false, error: `Falha ao ler cron: ${msg}` }, 502);
    }

    return json({ ok: true, schedules: data.result?.schedules ?? [] });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'Erro interno.' }, 500);
  }
};

export const handleOraculoCronPut = async (context: Context) => {
  const token = resolveToken(context.env);
  const accountId = context.env.CF_ACCOUNT_ID?.trim();

  if (!token || !accountId) {
    return json({ ok: false, error: 'CLOUDFLARE_PW ou CF_ACCOUNT_ID ausente.' }, 503);
  }

  let body: { cron?: string };
  try {
    body = (await context.request.json()) as { cron?: string };
  } catch {
    return json({ ok: false, error: 'Body inválido (esperado JSON com campo "cron").' }, 400);
  }

  const cronExpr = body.cron?.trim();
  if (!cronExpr) {
    return json({ ok: false, error: 'Campo "cron" é obrigatório.' }, 400);
  }

  const parts = cronExpr.split(/\s+/);
  if (parts.length !== 5) {
    return json({ ok: false, error: `Expressão cron inválida: esperado 5 segmentos, recebido ${parts.length}.` }, 400);
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/cron-taxa-ipca/schedules`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify([{ cron: cronExpr }]),
      },
    );

    const data = (await res.json()) as {
      success?: boolean;
      result?: { schedules?: { cron: string }[] };
      errors?: { message: string }[];
    };

    if (!res.ok || !data.success) {
      const msg = data.errors?.[0]?.message || `HTTP ${res.status}`;
      return json({ ok: false, error: `Falha ao atualizar cron: ${msg}` }, 502);
    }

    return json({ ok: true, schedules: data.result?.schedules ?? [], message: `Cron atualizado para: ${cronExpr}` });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'Erro interno.' }, 500);
  }
};
