// Módulo: admin-app/functions/api/oraculo/cron.ts
// Descrição: Atualiza o cron schedule do worker cron-taxa-ipca via Cloudflare API.

interface Env { CLOUDFLARE_PW?: string; CF_ACCOUNT_ID?: string }
interface Ctx { env: Env; request: Request }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Resolve o token da Cloudflare API entre as variáveis disponíveis */
function resolveToken(env: Env): string {
  return env.CLOUDFLARE_PW?.trim() || ''
}

// ─── GET: Lê o cron schedule atual do worker ─────────────────────────────────

export const onRequestGet = async ({ env }: Ctx) => {
  console.log('[oraculo/cron] GET — Lendo schedule atual do worker cron-taxa-ipca')
  const token = resolveToken(env)
  const accountId = env.CF_ACCOUNT_ID?.trim()

  if (!token || !accountId) {
    console.error('[oraculo/cron] GET — CLOUDFLARE_PW ou CF_ACCOUNT_ID ausente')
    return json({ ok: false, error: 'CLOUDFLARE_PW ou CF_ACCOUNT_ID ausente.' }, 503)
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/cron-taxa-ipca/schedules`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )
    const data = await res.json() as { success?: boolean; result?: { schedules?: { cron: string }[] }; errors?: { message: string }[] }
    if (!res.ok || !data.success) {
      const msg = data.errors?.[0]?.message || `HTTP ${res.status}`
      return json({ ok: false, error: `Falha ao ler cron: ${msg}` }, 502)
    }

    const schedules = data.result?.schedules ?? []
    console.log(`[oraculo/cron] GET — Schedule atual: ${JSON.stringify(schedules)}`)
    return json({ ok: true, schedules })
  } catch (err) {
    console.error(`[oraculo/cron] GET — Erro: ${err instanceof Error ? err.message : err}`)
    return json({ ok: false, error: err instanceof Error ? err.message : 'Erro interno.' }, 500)
  }
}

// ─── PUT: Atualiza o cron schedule do worker ─────────────────────────────────

export const onRequestPut = async ({ env, request }: Ctx) => {
  const token = resolveToken(env)
  const accountId = env.CF_ACCOUNT_ID?.trim()

  if (!token || !accountId) {
    return json({ ok: false, error: 'CLOUDFLARE_PW ou CF_ACCOUNT_ID ausente.' }, 503)
  }

  let body: { cron?: string }
  try {
    body = await request.json() as { cron?: string }
  } catch {
    return json({ ok: false, error: 'Body inválido (esperado JSON com campo "cron").' }, 400)
  }

  const cronExpr = body.cron?.trim()
  if (!cronExpr) {
    return json({ ok: false, error: 'Campo "cron" é obrigatório.' }, 400)
  }

  // Validação básica da expressão cron (5 segmentos)
  const parts = cronExpr.split(/\s+/)
  if (parts.length !== 5) {
    return json({ ok: false, error: `Expressão cron inválida: esperado 5 segmentos, recebido ${parts.length}.` }, 400)
  }

  try {
    console.log(`[oraculo/cron] Atualizando cron do worker cron-taxa-ipca para: ${cronExpr}`)

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
      }
    )

    const data = await res.json() as { success?: boolean; result?: { schedules?: { cron: string }[] }; errors?: { message: string }[] }
    if (!res.ok || !data.success) {
      const msg = data.errors?.[0]?.message || `HTTP ${res.status}`
      console.error(`[oraculo/cron] Falha ao atualizar cron: ${msg}`)
      return json({ ok: false, error: `Falha ao atualizar cron: ${msg}` }, 502)
    }

    const schedules = data.result?.schedules ?? []
    console.log(`[oraculo/cron] Cron atualizado com sucesso: ${JSON.stringify(schedules)}`)
    return json({ ok: true, schedules, message: `Cron atualizado para: ${cronExpr}` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno.'
    console.error(`[oraculo/cron] Erro: ${msg}`)
    return json({ ok: false, error: msg }, 500)
  }
}
