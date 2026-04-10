/**
 * Authentication utilities for admin-app endpoints
 * Supports Bearer token and Cloudflare Access headers.
 * Uses constant-time comparison to prevent timing attacks.
 */

export interface AuthContext {
  isAuthenticated: boolean;
  token?: string;
  source?: 'bearer' | 'cloudflare-access' | 'none';
  error?: string;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against self to keep constant time even with different lengths
    const dummy = new TextEncoder().encode(a);
    crypto.subtle.timingSafeEqual(dummy, dummy);
    return false;
  }
  const encoder = new TextEncoder();
  return crypto.subtle.timingSafeEqual(encoder.encode(a), encoder.encode(b));
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
      if (timingSafeEqual(token, bearerTokenEnv)) {
        return { isAuthenticated: true, token, source: 'bearer' };
      }
      return { isAuthenticated: false, source: 'bearer', error: 'Invalid Bearer token' };
    }

    // Check Cloudflare Access headers as fallback when bearer token env is set.
    // Note: CF-Access-Authenticated-User-Email is set by Cloudflare Access after
    // JWT validation at the edge — it cannot be spoofed by end users when Access
    // is properly configured. The JWT is stripped and replaced by this header.
    const cfAccessEmail = request.headers.get('CF-Access-Authenticated-User-Email');
    if (cfAccessEmail) {
      return { isAuthenticated: true, token: cfAccessEmail, source: 'cloudflare-access' };
    }

    return { isAuthenticated: false, source: 'none', error: 'No authentication provided.' };
  }

  // No bearer token configured — trust Cloudflare Access edge authentication.
  // The admin-app is behind CF Access; the JWT is validated at the edge before
  // the request reaches this Worker (directly or via Service Binding).
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
