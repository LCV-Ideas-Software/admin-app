import { logModuleOperationalEvent } from '../_lib/operational'
import {
  listPoliciesWithStats,
  resetRateLimitPolicy,
  SUPPORTED_ROUTES,
  toHeaders,
  upsertRateLimitPolicy,
  type Context,
} from '../_lib/astrologo-admin'
import { resolveAdminActorFromRequest } from '../_lib/admin-actor'

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: toHeaders(),
})

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

const toBigdataRoute = (route: string) => route.startsWith('astrologo/') ? route : `astrologo/${route}`

const mirrorPoliciesToBigdata = async (context: Context) => {
  if (!context.env.BIGDATA_DB || !context.env.ASTROLOGO_SOURCE_DB) {
    return
  }

  const rows = await context.env.ASTROLOGO_SOURCE_DB.prepare(`
    SELECT route, enabled, max_requests, window_minutes, updated_at
    FROM rate_limit_policies
  `).all<{ route?: string; enabled?: number; max_requests?: number; window_minutes?: number; updated_at?: string | null }>()

  for (const item of rows.results ?? []) {
    const rawRoute = String(item.route ?? '').trim()
    if (!rawRoute) {
      continue
    }

    const route = toBigdataRoute(rawRoute)
    const enabled = Number(item.enabled) === 1 ? 1 : 0
    const maxRequests = Math.max(1, toPositiveInt(item.max_requests, 10))
    const windowMinutes = Math.max(1, toPositiveInt(item.window_minutes, 10))
    const updatedAt = typeof item.updated_at === 'string' && item.updated_at.trim() ? item.updated_at : new Date().toISOString()

    await context.env.BIGDATA_DB.prepare(`
      INSERT INTO astrologo_rate_limit_policies (route, enabled, max_requests, window_minutes, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(route) DO UPDATE SET
        enabled = excluded.enabled,
        max_requests = excluded.max_requests,
        window_minutes = excluded.window_minutes,
        updated_at = excluded.updated_at
    `)
      .bind(route, enabled, maxRequests, windowMinutes, updatedAt)
      .run()
  }
}

export async function onRequestGet(context: Context) {
  if (!context.env.ASTROLOGO_SOURCE_DB) {
    return json({ ok: false, error: 'ASTROLOGO_SOURCE_DB não configurado no runtime.' }, 503)
  }

  try {
    const adminActor = resolveAdminActorFromRequest(context.request)
    const policies = await listPoliciesWithStats(context.env.ASTROLOGO_SOURCE_DB)

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'astrologo',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'read-rate-limit',
            policies: policies.length,
            adminActor,
          },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: true, policies, admin_actor: adminActor })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar painel de rate limit do Astrólogo'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'astrologo',
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
  if (!context.env.ASTROLOGO_SOURCE_DB) {
    return json({ ok: false, error: 'ASTROLOGO_SOURCE_DB não configurado no runtime.' }, 503)
  }

  try {
    const body = await context.request.json() as Record<string, unknown>
    const adminActor = resolveAdminActorFromRequest(context.request, body)
    const route = normalizeRoute(body.route)

    if (!route) {
      return json({ ok: false, error: 'Rota de rate limit inválida.' }, 400)
    }

    const action = String(body.action ?? 'update').trim()

    if (action === 'restore_default') {
      await resetRateLimitPolicy(context.env.ASTROLOGO_SOURCE_DB, route)
      await mirrorPoliciesToBigdata(context)
      const policies = await listPoliciesWithStats(context.env.ASTROLOGO_SOURCE_DB)

      if (context.env.BIGDATA_DB) {
        try {
          await logModuleOperationalEvent(context.env.BIGDATA_DB, {
            module: 'astrologo',
            source: 'legacy-admin',
            fallbackUsed: false,
            ok: true,
            metadata: {
              action: 'restore-rate-limit-default',
              route,
              adminActor,
            },
          })
        } catch {
          // Não bloquear por telemetria.
        }
      }

      return json({ ok: true, action: 'restore_default', policies, admin_actor: adminActor })
    }

    const enabled = body.enabled ? 1 : 0
    const maxRequests = toPositiveInt(body.max_requests, 10)
    const windowMinutes = toPositiveInt(body.window_minutes, 10)

    if (maxRequests > 500 || windowMinutes > 1440) {
      return json({ ok: false, error: 'Parâmetros fora da faixa permitida.' }, 400)
    }

    await upsertRateLimitPolicy(context.env.ASTROLOGO_SOURCE_DB, {
      route,
      enabled,
      maxRequests,
      windowMinutes,
    })

    await mirrorPoliciesToBigdata(context)
    const policies = await listPoliciesWithStats(context.env.ASTROLOGO_SOURCE_DB)

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'astrologo',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'save-rate-limit',
            route,
            enabled: enabled === 1,
            maxRequests,
            windowMinutes,
            adminActor,
          },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: true, action: 'update', policies, admin_actor: adminActor })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar painel de rate limit do Astrólogo'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'astrologo',
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
