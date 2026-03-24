/**
 * Rate Limit Common Utilities
 * 
 * Consolidates rate limit management patterns across all modules:
 * - AstrologoModule
 * - ItauModule
 * - MainsiteModule
 * - MtastsModule
 * 
 * Eliminates code duplication and ensures consistency
 */

import { toPositiveInt } from '../../../src/lib/validation'

// ============================================================================
// CLOUDFLARE D1 TYPES (minimal interfaces — no external @cloudflare/workers-types required)
// ============================================================================

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  run(): Promise<{ success: boolean }>
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ success: boolean; results: T[] }>
}

interface D1Database {
  prepare(query: string): D1PreparedStatement
}

interface RateLimitEnv {
  BIGDATA_DB?: D1Database
}

interface D1RateLimitRow {
  route: string
  enabled: number
  max_requests: number
  window_minutes: number
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Rate limit policy for a single route or service
 */
export interface RateLimitPolicy {
  enabled: boolean
  max_requests: number
  window_minutes: number
}

/**
 * Rate limit configuration for a module
 */
export type RateLimitConfig = Record<string, RateLimitPolicy>

/**
 * Supported module routes for rate limiting
 */
export type RateLimitRoutes = 'astrologo' | 'itau' | 'mainsite' | 'mtasts'

/**
 * Per-module supported rate limit routes
 */
export const RATE_LIMIT_ROUTES: Record<string, string[]> = {
  astrologo: ['calcular', 'analisar', 'enviar-email', 'gerar-relatorio'],
  itau: ['calcular', 'buscar-taxa', 'enviar-email', 'gerar-relatorio'],
  mainsite: ['chatbot', 'email', 'newsletter'],
  mtasts: ['generate', 'regenerate', 'update-policy'],
}

// ============================================================================
// VALIDATION & NORMALIZATION
// ============================================================================

/**
 * Validates that a route is supported for a module
 * @param route Route name
 * @param supportedRoutes Array of supported routes for the module
 * @returns true if route is supported
 */
export function isValidRoute(route: string, supportedRoutes: string[]): boolean {
  return supportedRoutes.includes(route)
}

/**
 * Normalizes rate limit policy values
 * @param enabled Raw enabled value
 * @param maxRequests Raw max_requests value
 * @param windowMinutes Raw window_minutes value
 * @returns Normalized RateLimitPolicy
 */
export function normalizeRateLimitPolicy(
  enabled: unknown,
  maxRequests: unknown,
  windowMinutes: unknown,
): RateLimitPolicy {
  return {
    enabled: enabled === true || enabled === 'true',
    max_requests: toPositiveInt(maxRequests, 10, 500),
    window_minutes: toPositiveInt(windowMinutes, 60, 1440),
  }
}

/**
 * Creates a rate limit policy with default values
 * @param overrides Optional overrides
 * @returns Default RateLimitPolicy
 */
export function createDefaultRateLimitPolicy(
  overrides?: Partial<RateLimitPolicy>,
): RateLimitPolicy {
  return {
    enabled: true,
    max_requests: 10,
    window_minutes: 60,
    ...overrides,
  }
}

// ============================================================================
// LOAD & SAVE OPERATIONS
// ============================================================================

/**
 * Loads rate limit policies from the D1 database
 * @param params.env Cloudflare environment (bindings)
 * @param params.module Module name (astrologo, itau, mainsite, mtasts)
 * @param params.adminActor Admin identifier
 * @returns Rate limit config or null if not found
 */
 
export async function loadRateLimitPolicies(params: {
  env: RateLimitEnv
  module: string
  adminActor: string
}): Promise<RateLimitConfig | null> {
  const { env, module, adminActor } = params

  try {
    const db = env.BIGDATA_DB
    if (!db) {
      console.warn('BIGDATA_DB not available, using defaults')
      return null
    }

    const query = `
      SELECT route, enabled, max_requests, window_minutes
      FROM adminapp_rate_limit_policies
      WHERE context = ? AND admin_actor = ?
      ORDER BY route ASC
    `

    const result = await db.prepare(query).bind(module, adminActor).all<D1RateLimitRow>()

    if (!result.results || result.results.length === 0) {
      return null
    }

    const config: RateLimitConfig = {}
    for (const row of result.results) {
      config[row.route] = normalizeRateLimitPolicy(
        row.enabled,
        row.max_requests,
        row.window_minutes,
      )
    }

    return config
  } catch (error) {
    console.error('Failed to load rate limit policies:', error)
    return null
  }
}

/**
 * Saves rate limit policies to the D1 database
 * @param params.env Cloudflare environment
 * @param params.module Module name
 * @param params.adminActor Admin identifier
 * @param params.config Rate limit configuration
 * @returns true if successful
 */
 
export async function saveRateLimitPolicies(params: {
  env: RateLimitEnv
  module: string
  adminActor: string
  config: RateLimitConfig
}): Promise<boolean> {
  const { env, module, adminActor, config } = params

  try {
    const db = env.BIGDATA_DB
    if (!db) {
      throw new Error('BIGDATA_DB not available')
    }

    // Delete existing policies for this admin
    await db
      .prepare('DELETE FROM adminapp_rate_limit_policies WHERE context = ? AND admin_actor = ?')
      .bind(module, adminActor)
      .run()

    // Insert new policies
    const insertQuery = `
      INSERT INTO adminapp_rate_limit_policies (context, admin_actor, route, enabled, max_requests, window_minutes)
      VALUES (?, ?, ?, ?, ?, ?)
    `

    for (const [route, policy] of Object.entries(config)) {
      await db
        .prepare(insertQuery)
        .bind(module, adminActor, route, policy.enabled ? 1 : 0, policy.max_requests, policy.window_minutes)
        .run()
    }

    return true
  } catch (error) {
    console.error('Failed to save rate limit policies:', error)
    return false
  }
}

/**
 * Restores all rate limit policies to defaults for a module/admin
 * @param params.env Cloudflare environment
 * @param params.module Module name
 * @param params.adminActor Admin identifier
 * @param params.defaultConfig Default configuration
 * @returns true if successful
 */
 
export async function restoreDefaultRateLimitPolicies(params: {
  env: RateLimitEnv
  module: string
  adminActor: string
  defaultConfig: RateLimitConfig
}): Promise<boolean> {
  const { env, module, adminActor, defaultConfig } = params

  return saveRateLimitPolicies({
    env,
    module,
    adminActor,
    config: defaultConfig,
  })
}

// ============================================================================
// MIGRATION & MIRROR OPERATIONS
// ============================================================================

/**
 * Mirrors rate limit policies to bigdata_db from individual databases
 * Used during consolidation of multiple database setups
 * @param params.env Cloudflare environment
 * @param params.sourceDb Source database
 * @param params.module Module name
 * @param params.adminActor Admin identifier
 * @returns true if successful
 */
 
export async function mirrorPoliciesFromSourceDb(params: {
  env: RateLimitEnv
  sourceDb: D1Database
  module: string
  adminActor: string
}): Promise<boolean> {
  const { env, sourceDb, module, adminActor } = params

  try {
    const query = `
      SELECT route, enabled, max_requests, window_minutes
      FROM adminapp_rate_limit_policies
      WHERE admin_actor = ?
      ORDER BY route ASC
    `

    const result = await sourceDb.prepare(query).bind(adminActor).all<D1RateLimitRow>()

    if (!result.results || result.results.length === 0) {
      return false
    }

    const config: RateLimitConfig = {}
    for (const row of result.results) {
      config[row.route] = normalizeRateLimitPolicy(
        row.enabled,
        row.max_requests,
        row.window_minutes,
      )
    }

    // Save to bigdata
    return saveRateLimitPolicies({
      env,
      module,
      adminActor,
      config,
    })
  } catch (error) {
    console.error('Failed to mirror policies from source database:', error)
    return false
  }
}

// ============================================================================
// DISPLAY & FORMATTING
// ============================================================================

/**
 * Formats a rate limit policy for display
 * @param policy Rate limit policy
 * @returns Formatted string (e.g., "10 requisições / 60 minutos")
 */
export function formatRateLimitPolicy(policy: RateLimitPolicy): string {
  if (!policy.enabled) {
    return 'Desativado'
  }
  return `${policy.max_requests} requisições / ${policy.window_minutes} minutos`
}

/**
 * Gets a human-readable description of rate limit status
 * @param policy Rate limit policy
 * @returns Description
 */
export function getRateLimitStatusDescription(policy: RateLimitPolicy): string {
  if (!policy.enabled) {
    return 'Rate limit desativado'
  }

  const perMinute = Math.round((policy.max_requests / policy.window_minutes) * 100) / 100
  return `${perMinute.toFixed(2)} req/min (máx ${policy.max_requests} por ${policy.window_minutes}m)`
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates that all required routes have rate limit policies
 * @param config Rate limit config
 * @param requiredRoutes Array of required routes
 * @returns Validation result
 */
export function validateRateLimitConfig(
  config: RateLimitConfig,
  requiredRoutes: string[],
): { valid: boolean; missingRoutes: string[] } {
  const missingRoutes = requiredRoutes.filter((route) => !config[route])
  return {
    valid: missingRoutes.length === 0,
    missingRoutes,
  }
}

/**
 * Merges two rate limit configs, with second taking precedence
 * @param base Base configuration
 * @param overrides Override configuration
 * @returns Merged configuration
 */
export function mergeRateLimitConfigs(
  base: RateLimitConfig,
  overrides?: Record<string, RateLimitPolicy>,
): RateLimitConfig {
  if (!overrides) return base
  const merged: RateLimitConfig = { ...base }
  for (const [key, value] of Object.entries(overrides)) {
    if (value) {
      merged[key] = value
    }
  }
  return merged
}
