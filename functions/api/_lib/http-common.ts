/**
 * HTTP Common Utilities
 * 
 * Consolidates HTTP headers and request/response patterns across all modules:
 * - astrologo-admin.ts
 * - itau-admin.ts
 * - mainsite-admin.ts
 * - mtasts-admin.ts
 * 
 * Eliminates code duplication and ensures consistency
 */

// ============================================================================
// STANDARD HEADERS
// ============================================================================

/**
 * Standard JSON response headers for all API responses
 */
export const STANDARD_JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'no-store, max-age=0, must-revalidate',
}

/**
 * Headers for CORS-enabled endpoints
 */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

/**
 * Headers for secure responses (forms, sensitive data)
 */
export const SECURE_HEADERS: Record<string, string> = {
  ...STANDARD_JSON_HEADERS,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Permitted-Cross-Domain-Policies': 'none',
}

/**
 * Headers for cacheable responses (static assets, non-sensitive data)
 */
export const CACHEABLE_HEADERS: Record<string, string> = {
  ...STANDARD_JSON_HEADERS,
  'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  'ETag': undefined as any, // Will be set dynamically per response
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates response headers with standard JSON headers
 * @param additional Additional headers to include
 * @param secure Whether to include security headers
 * @returns Complete headers object
 */
export function createJsonHeaders(
  additional?: Record<string, string>,
  secure = true,
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
): Record<string, any> {
  const base = secure ? SECURE_HEADERS : STANDARD_JSON_HEADERS
  return {
    ...base,
    ...(additional || {}),
  }
}

/**
 * Applies default headers to an existing headers object
 * @param headers Existing headers
 * @param defaultHeaders Default headers to apply
 * @returns Merged headers with defaults applied
 */
export function withDefaultHeaders(
  headers?: Record<string, string>,
  defaultHeaders?: Record<string, string>,
): Record<string, string> {
  return {
    ...(defaultHeaders || STANDARD_JSON_HEADERS),
    ...headers,
  }
}

/**
 * Creates a Response object with standard JSON headers
 * @param body Response body (will be JSON stringified)
 * @param status HTTP status code
 * @param additional Additional headers
 * @returns Response object
 */
export function jsonResponse(
  body: unknown,
  status = 200,
  additional?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: createJsonHeaders(additional),
  })
}

/**
 * Creates an error response
 * @param message Error message
 * @param status HTTP status code
 * @param details Additional error details
 * @returns Response object
 */
export function errorResponse(message: string, status = 400, details?: unknown): Response {
  const body: Record<string, unknown> = {
    error: message,
  }
  if (details) {
    body.details = details
  }
  return jsonResponse(body, status)
}

/**
 * Creates a success response with data
 * @param data Response data
 * @param status HTTP status code
 * @returns Response object
 */
export function successResponse(data: unknown, status = 200): Response {
  return jsonResponse(
    {
      success: true,
      data,
    },
    status,
  )
}

/**
 * Creates a created response (201)
 * @param data Created resource data
 * @param additional Additional headers
 * @returns Response object
 */
export function createdResponse(data: unknown, additional?: Record<string, string>): Response {
  return jsonResponse(
    {
      success: true,
      data,
    },
    201,
    additional,
  )
}

/**
 * Creates a no-content response (204)
 * @returns Response object
 */
export function noContentResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: createJsonHeaders(),
  })
}

// ============================================================================
// BASE URL RESOLUTION
// ============================================================================

/**
 * Resolves the base URL for API requests
 * @param request Request object
 * @param customHost Optional custom host to override
 * @returns Base URL
 */
export function resolveBaseUrl(request: Request, customHost?: string): string {
  const url = new URL(request.url)
  const host = customHost || url.host
  const protocol = url.protocol

  return `${protocol}//${host}`
}

/**
 * Builds a full URL from a path
 * @param baseUrl Base URL
 * @param path Path segment
 * @returns Full URL
 */
export function buildUrl(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}

// ============================================================================
// REQUEST UTILITIES
// ============================================================================

/**
 * Safely parses JSON from request body
 * @param request Request object
 * @returns Parsed JSON or null if invalid
 */
export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/**
 * Gets Bearer token from Authorization header
 * @param request Request object
 * @returns Token string or null if not found
 */
export function getBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return null
  }
  return auth.slice(7)
}

/**
 * Checks if request is CORS preflight
 * @param request Request object
 * @returns true if this is a preflight request
 */
export function isCorsPreflight(request: Request): boolean {
  return request.method === 'OPTIONS'
}

/**
 * Handles CORS preflight request
 * @param request Request object
 * @returns Response object
 */
export function handleCorsPreflight(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      'Allow': request.headers.get('Access-Control-Request-Method') || 'GET, POST, OPTIONS',
    },
  })
}

// ============================================================================
// RESPONSE UTILITIES
// ============================================================================

/**
 * Adds cache headers to a response
 * @param response Response object
 * @param maxAge Cache duration in seconds
 * @param sMaxAge Server cache duration in seconds
 * @returns Modified response
 */
export function addCacheHeaders(
  response: Response,
  maxAge: number,
  sMaxAge?: number,
): Response {
  const cacheControl = sMaxAge
    ? `public, max-age=${maxAge}, s-maxage=${sMaxAge}`
    : `public, max-age=${maxAge}`

  const newResponse = new Response(response.body, response)
  newResponse.headers.set('Cache-Control', cacheControl)
  return newResponse
}

/**
 * Creates a redirect response
 * @param url Redirect URL
 * @param status Redirect status code (301, 302, 307, 308)
 * @returns Response object
 */
export function redirectResponse(url: string, status = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: url,
    },
  })
}

/**
 * Wraps a response with security headers
 * @param response Response object
 * @returns Response with security headers added
 */
export function withSecurityHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response)

  for (const [key, value] of Object.entries(SECURE_HEADERS)) {
    if (value !== undefined && !newResponse.headers.has(key)) {
      newResponse.headers.set(key, value)
    }
  }

  return newResponse
}
