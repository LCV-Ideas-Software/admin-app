/**
 * Authentication utilities for admin-app endpoints
 * Supports Bearer token and Cloudflare Access headers.
 * Uses constant-time comparison to prevent timing attacks.
 * Optionally validates CF-Access-JWT-Assertion when CF_ACCESS_TEAM_DOMAIN is configured.
 */

export interface AuthContext {
  isAuthenticated: boolean;
  token?: string;
  source?: 'bearer' | 'cloudflare-access' | 'none';
  error?: string;
}

export interface JwtConfig {
  /** CF Access team domain, e.g. "lcv" for lcv.cloudflareaccess.com */
  teamDomain?: string;
  /** "warn" = log failures but allow access; "block" = reject on failure */
  enforcement?: string;
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

// ── CF-Access JWT validation ──────────────────────────────────────────────────

type JwksKey = {
  kid?: string;
  kty?: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
};

let cachedJwks: JwksKey[] | null = null;
let cachedJwksTeamDomain: string | null = null;

async function fetchJwks(teamDomain: string): Promise<JwksKey[]> {
  if (cachedJwks && cachedJwksTeamDomain === teamDomain) {
    return cachedJwks;
  }
  const url = `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const body = await res.json() as { keys?: JwksKey[] };
  const keys = Array.isArray(body?.keys) ? body.keys : [];
  cachedJwks = keys;
  cachedJwksTeamDomain = teamDomain;
  return keys;
}

function base64UrlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function verifyJwt(jwt: string, teamDomain: string): Promise<{ valid: boolean; email?: string; error?: string }> {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return { valid: false, error: 'JWT malformado.' };

    const [headerB64, payloadB64, signatureB64] = parts;
    const headerJson = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64))) as { kid?: string; alg?: string };
    const payloadJson = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as { exp?: number; iat?: number; email?: string };

    if (headerJson.alg !== 'RS256') return { valid: false, error: `Algoritmo JWT inesperado: ${headerJson.alg}` };

    // Clock skew tolerance: 30 seconds
    const now = Math.floor(Date.now() / 1000);
    if (payloadJson.exp && now > payloadJson.exp + 30) {
      return { valid: false, error: 'JWT expirado.' };
    }
    if (payloadJson.iat && payloadJson.iat > now + 30) {
      return { valid: false, error: 'JWT com iat no futuro.' };
    }

    const keys = await fetchJwks(teamDomain);
    const signingKey = keys.find((k) => (!headerJson.kid || k.kid === headerJson.kid) && k.kty === 'RSA');
    if (!signingKey?.n || !signingKey?.e) {
      return { valid: false, error: 'Chave de assinatura não encontrada no JWKS.' };
    }

    const publicKey = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: signingKey.n, e: signingKey.e, alg: 'RS256', use: 'sig' },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);
    const isValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, signingInput);

    if (!isValid) return { valid: false, error: 'Assinatura JWT inválida.' };

    return { valid: true, email: payloadJson.email };
  } catch (err) {
    return { valid: false, error: `Erro na verificação JWT: ${(err as Error).message}` };
  }
}

// ── Main auth function ────────────────────────────────────────────────────────

/**
 * Validate authentication for PUT operations.
 * Checks Bearer token in Authorization header.
 * Falls back to Cloudflare Access headers if configured.
 * Optionally validates CF-Access-JWT-Assertion when jwtConfig.teamDomain is set.
 *
 * @param request - Incoming HTTP request
 * @param bearerTokenEnv - Optional Bearer token to validate against (from env)
 * @param jwtConfig - Optional CF Access JWT validation config
 * @returns AuthContext with authentication status
 */
export async function validatePutAuth(
  request: Request,
  bearerTokenEnv?: string,
  jwtConfig?: JwtConfig,
): Promise<AuthContext> {
  // If a Bearer token is configured in the environment, validate strictly against it.
  if (bearerTokenEnv) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (timingSafeEqual(token, bearerTokenEnv)) {
        return { isAuthenticated: true, token, source: 'bearer' };
      }
      return { isAuthenticated: false, source: 'bearer', error: 'Invalid Bearer token' };
    }

    const cfAccessEmail = request.headers.get('CF-Access-Authenticated-User-Email');
    if (cfAccessEmail) {
      return { isAuthenticated: true, token: cfAccessEmail, source: 'cloudflare-access' };
    }

    return { isAuthenticated: false, source: 'none', error: 'No authentication provided.' };
  }

  // No bearer token — trust Cloudflare Access edge authentication.
  const cfAccessEmail = request.headers.get('CF-Access-Authenticated-User-Email');

  // Optionally validate CF-Access-JWT-Assertion
  const teamDomain = jwtConfig?.teamDomain?.trim();
  const enforcement = jwtConfig?.enforcement?.trim()?.toLowerCase();

  if (teamDomain && (enforcement === 'warn' || enforcement === 'block')) {
    const jwtToken = request.headers.get('CF-Access-JWT-Assertion');

    if (!jwtToken) {
      const msg = 'CF-Access-JWT-Assertion ausente.';
      console.warn(`[Auth] JWT validation: ${msg}`);
      if (enforcement === 'block') {
        return { isAuthenticated: false, source: 'none', error: msg };
      }
    } else {
      const result = await verifyJwt(jwtToken, teamDomain);

      if (!result.valid) {
        console.warn(`[Auth] JWT inválido: ${result.error}`);
        if (enforcement === 'block') {
          return { isAuthenticated: false, source: 'cloudflare-access', error: result.error };
        }
      } else if (result.email && cfAccessEmail && result.email !== cfAccessEmail) {
        const msg = `JWT email (${result.email}) não corresponde ao header CF-Access (${cfAccessEmail}).`;
        console.warn(`[Auth] ${msg}`);
        if (enforcement === 'block') {
          return { isAuthenticated: false, source: 'cloudflare-access', error: msg };
        }
      }
    }
  } else if (teamDomain) {
    // teamDomain set but no valid enforcement value — just log that validation is not enforced
    console.info('[Auth] CF_ACCESS_TEAM_DOMAIN configurado mas ENFORCE_JWT_VALIDATION não definido. JWT não verificado.');
  }

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
