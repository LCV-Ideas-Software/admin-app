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
  // Check Authorization header for Bearer token
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // If env token is configured, validate against it
    if (bearerTokenEnv) {
      if (token === bearerTokenEnv) {
        return {
          isAuthenticated: true,
          token,
          source: 'bearer'
        };
      }
      return {
        isAuthenticated: false,
        source: 'bearer',
        error: 'Invalid Bearer token'
      };
    }
    // If no env token configured, any Bearer token is accepted
    return {
      isAuthenticated: true,
      token,
      source: 'bearer'
    };
  }

  // Fallback: Check Cloudflare Access headers
  const cfAccessJwt = request.headers.get('CF-Access-JWT-Assertion');
  const cfAccessEmail = request.headers.get('CF-Access-Authenticated-User-Email');

  if (cfAccessJwt && cfAccessEmail) {
    return {
      isAuthenticated: true,
      token: cfAccessEmail,
      source: 'cloudflare-access'
    };
  }

  // No authentication found
  return {
    isAuthenticated: false,
    source: 'none',
    error: 'No authentication provided. Use Bearer token in Authorization header.'
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
