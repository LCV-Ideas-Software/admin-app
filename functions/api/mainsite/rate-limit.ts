import { logModuleOperationalEvent } from '../_lib/operational'
import { fetchLegacyAdminJson, fetchLegacyJson, toHeaders, type Context } from '../_lib/mainsite-admin'
import { resolveAdminActorFromRequest } from '../_lib/admin-actor'
import { createResponseTrace } from '../_lib/request-trace'

type PolicyRoute = 'chatbot' | 'email'

type LegacyRateLimitBucket = {
  enabled?: unknown
  maxRequests?: unknown
  windowMinutes?: unknown
}

type LegacyRateLimitConfig = {
  chatbot?: LegacyRateLimitBucket
  email?: LegacyRateLimitBucket
}

type ModuleRateLimitPolicy = {
  route: PolicyRoute
  label: string
  enabled: boolean
  max_requests: number
  window_minutes: number
  updated_at: string | null
  defaults: {
    enabled: boolean
    max_requests: number
    window_minutes: number
  }
  stats: {
    total_requests_window: number
    distinct_keys_window: number
  }
}

const POLICY_LIMITS = {
  maxRequests: 500,
  windowMinutes: 1440,
} as const

const POLICY_META: Record<PolicyRoute, { label: string; defaults: { enabled: boolean; max_requests: number; window_minutes: number } }> = {
  chatbot: {
    label: 'Chatbot público',
    defaults: {
      enabled: false,
      max_requests: 5,
      window_minutes: 1,
    },
  },
  email: {
    label: 'Formulários de e-mail/contato',
    defaults: {
      enabled: false,
      max_requests: 3,
      window_minutes: 15,
    },
  },
}

const ROUTES = Object.keys(POLICY_META) as PolicyRoute[]

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: toHeaders(),
})

const toBoolean = (value: unknown) => value === true || value === 1 || value === '1' || value === 'true'

const parsePositiveInt = (value: unknown) => {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

const normalizeBucket = (raw: LegacyRateLimitBucket | undefined, route: PolicyRoute) => {
  const defaults = POLICY_META[route].defaults

  const maxRequestsRaw = parsePositiveInt(raw?.maxRequests)
  const windowMinutesRaw = parsePositiveInt(raw?.windowMinutes)

  return {
    enabled: toBoolean(raw?.enabled),
    maxRequests: Math.min(POLICY_LIMITS.maxRequests, maxRequestsRaw ?? defaults.max_requests),
    windowMinutes: Math.min(POLICY_LIMITS.windowMinutes, windowMinutesRaw ?? defaults.window_minutes),
  }
}

const normalizeConfig = (raw: LegacyRateLimitConfig | null | undefined) => ({
  chatbot: normalizeBucket(raw?.chatbot, 'chatbot'),
  email: normalizeBucket(raw?.email, 'email'),
})

const toClientPolicies = (config: ReturnType<typeof normalizeConfig>): ModuleRateLimitPolicy[] => ROUTES.map((route) => {
  const policy = config[route]
  const meta = POLICY_META[route]

  return {
    route,
    label: meta.label,
    enabled: policy.enabled,
    max_requests: policy.maxRequests,
    window_minutes: policy.windowMinutes,
    updated_at: null,
    defaults: {
      enabled: meta.defaults.enabled,
      max_requests: meta.defaults.max_requests,
      window_minutes: meta.defaults.window_minutes,
    },
    stats: {
      total_requests_window: 0,
      distinct_keys_window: 0,
    },
  }
})

const getWorkerSecret = (context: Context) => {
  const secret = context.env.MAINSITE_WORKER_API_SECRET?.trim()
  if (!secret) {
    throw new Error('MAINSITE_WORKER_API_SECRET não configurado no runtime do admin-app.')
  }
  return secret
}

const loadLegacyRateLimit = async (context: Context) => {
  const secret = getWorkerSecret(context)

  const payload = await fetchLegacyJson<LegacyRateLimitConfig>(
    context.env,
    '/api/settings/ratelimit',
    'Falha ao carregar rate limit do MainSite legado',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    },
  )

  return normalizeConfig(payload)
}

const saveLegacyRateLimit = async (
  context: Context,
  config: ReturnType<typeof normalizeConfig>,
  adminActor: string,
) => {
  await fetchLegacyAdminJson<{ success?: boolean }>(
    context.env,
    '/api/settings/ratelimit',
    'PUT',
    'Falha ao salvar rate limit no MainSite legado',
    {
      chatbot: {
        enabled: config.chatbot.enabled,
        maxRequests: config.chatbot.maxRequests,
        windowMinutes: config.chatbot.windowMinutes,
      },
      email: {
        enabled: config.email.enabled,
        maxRequests: config.email.maxRequests,
        windowMinutes: config.email.windowMinutes,
      },
    },
    adminActor,
  )
}

const normalizeRoute = (value: unknown): PolicyRoute | null => {
  const route = String(value ?? '').trim()
  if (route === 'chatbot' || route === 'email') {
    return route
  }
  return null
}

export async function onRequestGet(context: Context) {
  const trace = createResponseTrace(context.request)

  try {
    const adminActor = resolveAdminActorFromRequest(context.request)
    const policies = toClientPolicies(await loadLegacyRateLimit(context))

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'read-rate-limit',
            adminActor,
            policies: policies.length,
          },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: true, policies, admin_actor: adminActor, ...trace })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar painel de rate limit do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
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

    return json({ ok: false, error: message, ...trace }, 502)
  }
}

export async function onRequestPost(context: Context) {
  const trace = createResponseTrace(context.request)

  try {
    const body = await context.request.json() as Record<string, unknown>
    const adminActor = resolveAdminActorFromRequest(context.request, body)
    const route = normalizeRoute(body.route)

    if (!route) {
      return json({ ok: false, error: 'Rota de rate limit inválida.', ...trace }, 400)
    }

    const action = String(body.action ?? 'update').trim()
    const currentConfig = await loadLegacyRateLimit(context)
    const nextConfig = {
      ...currentConfig,
    }

    if (action === 'restore_default') {
      const defaults = POLICY_META[route].defaults
      nextConfig[route] = {
        enabled: defaults.enabled,
        maxRequests: defaults.max_requests,
        windowMinutes: defaults.window_minutes,
      }
    } else {
      const maxRequests = parsePositiveInt(body.max_requests)
      const windowMinutes = parsePositiveInt(body.window_minutes)

      if (maxRequests === null || windowMinutes === null) {
        return json({ ok: false, error: 'Parâmetros de rate limit inválidos.', ...trace }, 400)
      }

      if (maxRequests > POLICY_LIMITS.maxRequests || windowMinutes > POLICY_LIMITS.windowMinutes) {
        return json({ ok: false, error: 'Parâmetros fora da faixa permitida.', ...trace }, 400)
      }

      nextConfig[route] = {
        enabled: toBoolean(body.enabled),
        maxRequests,
        windowMinutes,
      }
    }

    await saveLegacyRateLimit(context, nextConfig, adminActor)
    const policies = toClientPolicies(await loadLegacyRateLimit(context))

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: action === 'restore_default' ? 'restore-rate-limit-default' : 'save-rate-limit',
            route,
            adminActor,
          },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: true, action, policies, admin_actor: adminActor, ...trace })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar painel de rate limit do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
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

    return json({ ok: false, error: message, ...trace }, 500)
  }
}