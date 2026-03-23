import { logModuleOperationalEvent } from '../_lib/operational'
import { listPoliciesWithStats, resetRateLimitPolicy, SUPPORTED_ROUTES, toHeaders, upsertRateLimitPolicy, type Context } from '../_lib/calculadora-admin'

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: toHeaders(),
})

const ADMIN_ACTOR = 'admin-app'

const normalizeRoute = (value: unknown) => {
  const route = String(value ?? '').trim() as (typeof SUPPORTED_ROUTES)[number]
  if (SUPPORTED_ROUTES.includes(route)) {
    return route
  }
  return null
}

const toPositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

const mirrorPoliciesToBigdata = async (context: Context) => {
  if (!context.env.BIGDATA_DB || !context.env.CALC_SOURCE_DB) {
    return
  }

  const rows = await context.env.CALC_SOURCE_DB.prepare(`
    SELECT route_key, enabled, max_requests, window_minutes, updated_at, updated_by
    FROM rate_limit_policies
  `).all<{ route_key?: string; enabled?: number; max_requests?: number; window_minutes?: number; updated_at?: number; updated_by?: string | null }>()

  for (const item of rows.results ?? []) {
    const routeKey = String(item.route_key ?? '').trim()
    if (!routeKey) {
      continue
    }

    const enabled = Number(item.enabled) === 1 ? 1 : 0
    const maxRequests = Math.max(1, toPositiveInt(item.max_requests, 2))
    const windowMinutes = Math.max(1, toPositiveInt(item.window_minutes, 10))
    const updatedAt = Number.isFinite(Number(item.updated_at)) ? Number(item.updated_at) : Date.now()
    const updatedBy = typeof item.updated_by === 'string' && item.updated_by.trim() ? item.updated_by.trim() : null

    await context.env.BIGDATA_DB.prepare(`
      INSERT INTO calc_rate_limit_policies (route_key, enabled, max_requests, window_minutes, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(route_key) DO UPDATE SET
        enabled = excluded.enabled,
        max_requests = excluded.max_requests,
        window_minutes = excluded.window_minutes,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `)
      .bind(routeKey, enabled, maxRequests, windowMinutes, updatedAt, updatedBy)
      .run()
  }
}

export async function onRequestGet(context: Context) {
  if (!context.env.CALC_SOURCE_DB) {
    return json({ ok: false, error: 'CALC_SOURCE_DB não configurado no runtime.' }, 503)
  }

  try {
    const policies = await listPoliciesWithStats(context.env.CALC_SOURCE_DB)

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'calculadora',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'read-rate-limit',
            policies: policies.length,
          },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({
      ok: true,
      admin_email: ADMIN_ACTOR,
      policies,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar painel de rate limit do Calculadora'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'calculadora',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: 'read-rate-limit' },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: false, error: message }, 500)
  }
}

export async function onRequestPost(context: Context) {
  if (!context.env.CALC_SOURCE_DB) {
    return json({ ok: false, error: 'CALC_SOURCE_DB não configurado no runtime.' }, 503)
  }

  try {
    const body = await context.request.json() as Record<string, unknown>
    const routeKey = normalizeRoute(body.route_key)

    if (!routeKey) {
      return json({ ok: false, error: 'Rota de rate limit inválida.' }, 400)
    }

    const action = String(body.action ?? 'update').trim()

    if (action === 'restore_default') {
      await resetRateLimitPolicy(context.env.CALC_SOURCE_DB, routeKey, ADMIN_ACTOR)
      await mirrorPoliciesToBigdata(context)
      const policies = await listPoliciesWithStats(context.env.CALC_SOURCE_DB)

      if (context.env.BIGDATA_DB) {
        try {
          await logModuleOperationalEvent(context.env.BIGDATA_DB, {
            module: 'calculadora',
            source: 'legacy-admin',
            fallbackUsed: false,
            ok: true,
            metadata: {
              action: 'restore-rate-limit-default',
              routeKey,
            },
          })
        } catch {
          // Não bloquear por telemetria.
        }
      }

      return json({ ok: true, action: 'restore_default', policies })
    }

    const enabled = body.enabled ? 1 : 0
    const maxRequests = toPositiveInt(body.max_requests, 2)
    const windowMinutes = toPositiveInt(body.window_minutes, 10)

    if (maxRequests > 5000 || windowMinutes > 1440) {
      return json({ ok: false, error: 'Parâmetros fora da faixa permitida.' }, 400)
    }

    await upsertRateLimitPolicy(context.env.CALC_SOURCE_DB, {
      routeKey,
      enabled,
      maxRequests,
      windowMinutes,
      updatedBy: ADMIN_ACTOR,
    })

    await mirrorPoliciesToBigdata(context)
    const policies = await listPoliciesWithStats(context.env.CALC_SOURCE_DB)

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'calculadora',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'save-rate-limit',
            routeKey,
            enabled: enabled === 1,
            maxRequests,
            windowMinutes,
          },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: true, action: 'update', policies })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar painel de rate limit do Calculadora'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'calculadora',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: 'save-rate-limit' },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: false, error: message }, 500)
  }
}
