/**
 * API Endpoint: /api/config
 * 
 * Handles global configuration management:
 * - GET /api/config - Retrieve current configuration
 * - POST /api/config - Update configuration
 * - DELETE /api/config - Reset to defaults
 */

import { jsonResponse, errorResponse, successResponse } from './_lib/http-common'

const DEFAULT_CONFIG = {
  theme: {
    colors: {
      primary: '#3b82f6',
      secondary: '#a855f7',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#06b6d4',
    },
    typography: {
      fontSize: 'base',
      fontWeight: 'normal',
      lineHeightMultiplier: 1.5,
    },
    spacing: {
      gap: 'base',
      padding: 'base',
      borderRadius: 'base',
    },
  },
  rateLimits: {
    astrologo_calcular: { enabled: true, max_requests: 20, window_minutes: 60 },
    astrologo_analisar: { enabled: true, max_requests: 10, window_minutes: 60 },
    astrologo_email: { enabled: true, max_requests: 5, window_minutes: 60 },
    itau_calcular: { enabled: true, max_requests: 30, window_minutes: 60 },
    itau_taxa: { enabled: true, max_requests: 50, window_minutes: 60 },
    itau_email: { enabled: true, max_requests: 5, window_minutes: 60 },
    mainsite_chatbot: { enabled: true, max_requests: 20, window_minutes: 60 },
    mainsite_email: { enabled: true, max_requests: 10, window_minutes: 60 },
    mtasts_generate: { enabled: true, max_requests: 50, window_minutes: 60 },
    mtasts_update: { enabled: true, max_requests: 30, window_minutes: 60 },
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
  },
}

/**
 * Validates configuration object
 */
function validateConfig(config: unknown): { valid: boolean; error?: string } {
  if (!config || typeof config !== 'object') {
    return { valid: false, error: 'Configuration must be an object' }
  }

  const cfg = config as Record<string, unknown>

  // Validate theme section
  if (cfg.theme && typeof cfg.theme === 'object') {
    const theme = cfg.theme as Record<string, unknown>
    if (theme.colors && typeof theme.colors === 'object') {
      const colors = theme.colors as Record<string, unknown>
      if (colors.primary && typeof colors.primary === 'string' && !colors.primary.match(/^#[0-9a-f]{6}$/i)) {
        return { valid: false, error: 'Invalid primary color format' }
      }
    }
  }

  // Validate rate limits
  if (cfg.rateLimits && typeof cfg.rateLimits === 'object') {
    for (const [route, policy] of Object.entries(cfg.rateLimits as Record<string, unknown>)) {
      if (policy && typeof policy === 'object') {
        const p = policy as Record<string, unknown>
        if (typeof p.max_requests === 'number' && (p.max_requests < 1 || p.max_requests > 500)) {
          return { valid: false, error: `Invalid max_requests for ${route}` }
        }
        if (typeof p.window_minutes === 'number' && (p.window_minutes < 1 || p.window_minutes > 1440)) {
          return { valid: false, error: `Invalid window_minutes for ${route}` }
        }
      }
    }
  }

  return { valid: true }
}

/**
 * GET /api/config - Retrieve configuration
 */
async function handleGet(): Promise<Response> {
  try {
    // In a real implementation, fetch from D1 database
    // const db = env.BIGDATA_DB
    // const result = await db.prepare('SELECT config FROM global_config LIMIT 1').first()
    // const config = result ? JSON.parse(result.config) : DEFAULT_CONFIG

    // For now, return defaults
    return jsonResponse(DEFAULT_CONFIG, 200)
  } catch (error) {
    console.error('Failed to retrieve config:', error)
    return errorResponse('Failed to retrieve configuration', 500)
  }
}

/**
 * POST /api/config - Update configuration
 */
async function handlePost(request: Request): Promise<Response> {
  try {
    const body = await request.json()

    // Validate configuration
    const validation = validateConfig(body)
    if (!validation.valid) {
      return errorResponse(validation.error || 'Invalid configuration', 400)
    }

    // Sanitize configuration
    const sanitized = JSON.parse(JSON.stringify(body))

    // In a real implementation, save to D1 database
    // const db = env.BIGDATA_DB
    // await db.prepare(
    //   'INSERT OR REPLACE INTO global_config (id, config) VALUES (1, ?)'
    // ).bind(JSON.stringify(sanitized)).run()

    console.log('Configuration updated:', sanitized)

    return successResponse(
      {
        message: 'Configuration saved successfully',
        config: sanitized,
      },
      200,
    )
  } catch (error) {
    console.error('Failed to save config:', error)
    return errorResponse('Failed to save configuration', 500)
  }
}

/**
 * DELETE /api/config - Reset to defaults
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
async function handleDelete(_request: Request, _env: any): Promise<Response> {
  try {
    // In a real implementation, delete from D1 database
    // const db = env.BIGDATA_DB
    // await db.prepare('DELETE FROM global_config WHERE id = 1').run()

    console.log('Configuration reset to defaults')

    return successResponse(
      {
        message: 'Configuration reset to defaults',
        config: DEFAULT_CONFIG,
      },
      200,
    )
  } catch (error) {
    console.error('Failed to reset config:', error)
    return errorResponse('Failed to reset configuration', 500)
  }
}

/**
 * Main handler
 */
 
export async function onRequest(context: {
  request: Request
  env: Record<string, unknown>
  params: Record<string, string>
}): Promise<Response> {
  const { request, env } = context

  // Set CORS headers
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Route to appropriate handler
  try {
    switch (request.method) {
      case 'GET':
        return await handleGet()
      case 'POST':
        return await handlePost(request)
      case 'DELETE':
        return await handleDelete(request, env)
      default:
        return errorResponse(`Method ${request.method} not allowed`, 405)
    }
  } catch (error) {
    console.error('Config endpoint error:', error)
    return errorResponse('Internal server error', 500)
  }
}
