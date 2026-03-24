/**
 * Authentication utilities for admin-app endpoints
 * Supports Bearer token and Cloudflare Access headers
 */

export interface AuthContext {
  isAuthenticated: boolean;
  token?: string;
  source?: 'bearer' | 'cloudflare-access' | 'none';
  error?: string;
}

/**
 * Validate authentication for PUT operations
 * Checks Bearer token in Authorization header
 * Falls back to Cloudflare Access headers if configured
 *
 * @param request - Incoming HTTP request
 * @param bearerTokenEnv - Optional Bearer token to validate against (from env)
 * @returns AuthContext with authentication status
 */
export function validatePutAuth(request: Request, bearerTokenEnv?: string): AuthContext {
  // If a Bearer token is configured in the environment, validate strictly against it.
  // This allows programmatic/script access with a known token.
  if (bearerTokenEnv) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token === bearerTokenEnv) {
        return { isAuthenticated: true, token, source: 'bearer' };
      }
      return { isAuthenticated: false, source: 'bearer', error: 'Invalid Bearer token' };
    }

    // Check Cloudflare Access headers as fallback when bearer token env is set
    const cfAccessEmail = request.headers.get('CF-Access-Authenticated-User-Email');
    if (cfAccessEmail) {
      return { isAuthenticated: true, token: cfAccessEmail, source: 'cloudflare-access' };
    }

    return { isAuthenticated: false, source: 'none', error: 'No authentication provided.' };
  }

  // When no bearer token is configured in the environment, the entire domain is
  // protected by Cloudflare Access at the edge. If this function is reachable,
  // the request already passed Access authentication. Trust the session.
  const cfAccessEmail = request.headers.get('CF-Access-Authenticated-User-Email');
  return {
    isAuthenticated: true,
    token: cfAccessEmail ?? 'cloudflare-access-session',
    source: 'cloudflare-access',
  };
}

/**
 * Generate a 401 Unauthorized response
 * @param message - Error message to include in response
 * @param headers - Optional additional headers
 * @returns Response with 401 status and JSON error body
 */
export function unauthorizedResponse(message: string, headers?: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message,
      timestamp: new Date().toISOString()
    }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {})
      }
    }
  );
}
