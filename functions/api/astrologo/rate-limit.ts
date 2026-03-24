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
import { createResponseTrace } from '../_lib/request-trace'

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

const buildFallbackPolicies = () => ([
  {
    route: 'calcular',
    label: 'Cálculo de Mapa',
    enabled: true,
    max_requests: 10,
    window_minutes: 10,
    updated_at: null,
    defaults: { enabled: true, max_requests: 10, window_minutes: 10 },
    stats: { total_requests_window: 0, distinct_keys_window: 0 },
  },
  {
    route: 'analisar',
    label: 'Análise IA',
    enabled: true,
    max_requests: 6,
    window_minutes: 15,
    updated_at: null,
    defaults: { enabled: true, max_requests: 6, window_minutes: 15 },
    stats: { total_requests_window: 0, distinct_keys_window: 0 },
  },
  {
    route: 'enviar-email',
    label: 'Envio de E-mail',
    enabled: true,
    max_requests: 4,
    window_minutes: 60,
    updated_at: null,
    defaults: { enabled: true, max_requests: 4, window_minutes: 60 },
    stats: { total_requests_window: 0, distinct_keys_window: 0 },
  },
])

const resolveRateLimitDb = (context: Context) => context.env.BIGDATA_DB ?? context.env.ASTROLOGO_SOURCE_DB
const resolveOperationalSource = (context: Context) => (context.env.BIGDATA_DB ? 'bigdata_db' : 'legacy-admin') as const

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request)
  const db = resolveRateLimitDb(context)
  const source = resolveOperationalSource(context)

  if (!db) {
    return json({ ok: false, error: 'Nenhum binding D1 disponível (ASTROLOGO_SOURCE_DB/BIGDATA_DB).', ...trace }, 503)
  }

  try {
    const adminActor = resolveAdminActorFromRequest(context.request)
    const policies = await listPoliciesWithStats(db)

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'astrologo',
          source,
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

    return json({ ok: true, policies, admin_actor: adminActor, ...trace })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar painel de rate limit do Astrólogo'
    const fallbackPolicies = buildFallbackPolicies()

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'astrologo',
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: 'read-rate-limit' },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({
      ok: true,
      warnings: [message, 'Fallback de políticas padrão aplicado para evitar indisponibilidade do painel.'],
      policies: fallbackPolicies,
      ...trace,
    }, 200)
  }
}

export async function onRequestPost(context: Context) {
  const trace = createResponseTrace(context.request)
  const db = resolveRateLimitDb(context)
  const source = resolveOperationalSource(context)

  if (!db) {
    return json({ ok: false, error: 'Nenhum binding D1 disponível (ASTROLOGO_SOURCE_DB/BIGDATA_DB).', ...trace }, 503)
  }

  try {
    const body = await context.request.json() as Record<string, unknown>
    const adminActor = resolveAdminActorFromRequest(context.request, body)
    const route = normalizeRoute(body.route)

    if (!route) {
      return json({ ok: false, error: 'Rota de rate limit inválida.', ...trace }, 400)
    }

    const action = String(body.action ?? 'update').trim()

    if (action === 'restore_default') {
      await resetRateLimitPolicy(db, route)
      const policies = await listPoliciesWithStats(db)

      if (context.env.BIGDATA_DB) {
        try {
          await logModuleOperationalEvent(context.env.BIGDATA_DB, {
            module: 'astrologo',
            source,
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

      return json({ ok: true, action: 'restore_default', policies, admin_actor: adminActor, ...trace })
    }

    const enabled = body.enabled ? 1 : 0
    const maxRequests = toPositiveInt(body.max_requests, 10)
    const windowMinutes = toPositiveInt(body.window_minutes, 10)

    if (maxRequests > 500 || windowMinutes > 1440) {
      return json({ ok: false, error: 'Parâmetros fora da faixa permitida.', ...trace }, 400)
    }

    await upsertRateLimitPolicy(db, {
      route,
      enabled,
      maxRequests,
      windowMinutes,
    })

    const policies = await listPoliciesWithStats(db)

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'astrologo',
          source,
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

    return json({ ok: true, action: 'update', policies, admin_actor: adminActor, ...trace })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar painel de rate limit do Astrólogo'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'astrologo',
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: 'save-rate-limit' },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: false, error: message, ...trace }, 500)
  }
}
