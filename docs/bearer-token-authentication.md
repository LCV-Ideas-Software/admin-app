# Bearer Token Authentication for Hub Config Endpoints

**Date:** 2026-03-24  
**Status:** ✅ IMPLEMENTED (Opção A - Native Cloudflare API Approach)  
**Affected Endpoints:**
- `PUT /api/adminhub/config`
- `PUT /api/apphub/config`

## Overview

Hub configuration endpoints (`/api/{adminhub,apphub}/config`) now require Bearer token authentication for PUT (write) operations, while GET (read) operations remain public.

This implements **Opção A** of the authentication strategy:
- **GET endpoints:** Public (no authentication required)
- **PUT endpoints:** Require Bearer token authentication
- **Fallback:** Cloudflare Access headers support for existing Access-protected domains

## Architecture

### Authentication Flow

```
PUT /api/adminhub/config
  ↓
validatePutAuth(request, env.ADMINHUB_BEARER_TOKEN)
  ├─ Check Authorization: Bearer <token> header
  ├─ If configured: validate against env token
  ├─ If match: return { isAuthenticated: true, source: 'bearer' }
  ├─ Fallback: Check CF-Access-JWT-Assertion header
  └─ If no auth: return { isAuthenticated: false, error: "..." }
  ↓
if (!authContext.isAuthenticated) {
  return unauthorizedResponse() // HTTP 401
}
  ↓
Proceed with config update (saveCardsToDb)
```

### GET Endpoints (Public)

```
GET /api/adminhub/config
  ↓
resolveHubConfig (no auth validation)
  ├─ Fetch from D1 database
  ├─ Fallback to local JSON if unavailable
  └─ Return { ok: true, cards: [...] }
```

## Implementation Details

### 1. Authentication Utility (`_lib/auth.ts`)

New utility file with two main exports:

```typescript
// Validate PUT request authentication
export function validatePutAuth(
  request: Request,
  bearerTokenEnv?: string
): AuthContext

// Generate 401 Unauthorized response
export function unauthorizedResponse(message: string): Response
```

#### validatePutAuth() Logic

1. **Check Authorization Header**
   ```typescript
   Authorization: Bearer <token>
   ```
   - If env token configured: validate token matches
   - If no env token: accept any Bearer token
   - If invalid: return `{ isAuthenticated: false, error: "Invalid Bearer token" }`

2. **Fallback: Cloudflare Access Headers**
   ```typescript
   CF-Access-JWT-Assertion: <jwt>
   CF-Access-Authenticated-User-Email: user@domain.com
   ```
   - If both headers present: return `{ isAuthenticated: true, source: 'cloudflare-access' }`

3. **Default: No Authentication**
   - Return `{ isAuthenticated: false, source: 'none', error: "No authentication provided..." }`

### 2. Endpoint Integration

Both `adminhub/config.ts` and `apphub/config.ts` updated with:

```typescript
// In onRequestPut()
const authContext = validatePutAuth(context.request, context.env.ADMINHUB_BEARER_TOKEN)
if (!authContext.isAuthenticated) {
  return unauthorizedResponse(authContext.error || 'No authentication provided')
}
```

Key features:
- ✅ GET endpoints unchanged (remain public)
- ✅ PUT endpoints validated before processing
- ✅ 401 response returned if auth fails
- ✅ Admin actor logged in audit trail

## Configuration

### For Static Apps (adminhub, apphub)

To call PUT endpoints, add Bearer token to request:

```javascript
// Example: Update cards in adminhub
const bearerToken = 'your-secret-token-here';

fetch('https://admin.lcv.app.br/api/adminhub/config', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${bearerToken}`  // ← Required
  },
  body: JSON.stringify({
    cards: [
      { id: 'app-1', title: 'App 1', ... }
    ]
  })
})
.then(r => r.json())
.then(data => {
  if (!data.ok) {
    console.error('Failed:', data.error);  // Might be 401 Unauthorized
  }
})
```

### For Manual Testing (curl)

```bash
# GET - No auth required
curl -X GET https://admin.lcv.app.br/api/adminhub/config

# PUT - Requires Bearer token
curl -X PUT https://admin.lcv.app.br/api/adminhub/config \
  -H "Authorization: Bearer your-secret-token-here" \
  -H "Content-Type: application/json" \
  -d '{"cards": [...]}'
```

### Environment Variables

To enable token validation, configure in `wrangler.json`:

```json
{
  "env": {
    "production": {
      "vars": {
        "ADMINHUB_BEARER_TOKEN": "your-secure-token"
      }
    }
  }
}
```

> **⚠️ Important:** Never commit tokens to git. Use Cloudflare dashboard or `wrangler secret` to store securely.

## Security Considerations

### ✅ What's Secured

- **PUT operations** require Bearer token authentication
- **No plaintext tokens** in logs (only `source: 'bearer'` logged)
- **Fallback to Cloudflare Access** for zero-trust environments
- **401 responses** prevent brute force attacks (standard HTTP semantics)

### ⚠️ Limitations

1. **Token must be configured** to be validated:
   - If `ADMINHUB_BEARER_TOKEN` not set, any Bearer token is accepted
   - Recommendation: Always configure env token in production

2. **No rate limiting** at auth level:
   - Multiple auth failures not throttled
   - Cloudflare Workers have built-in DDoS protection, but not specified here

3. **Bearer token in query string not supported**:
   - Only Authorization header recognized
   - Query string tokens would be logged in HTTP access logs (security risk)

## Testing

### Local Development

1. Start admin-app in dev mode (requires no auth if no env token):
   ```bash
   npm run dev
   ```

2. Test GET (should work without auth):
   ```bash
   curl -X GET http://localhost:8787/api/adminhub/config
   ```

3. Test PUT without token (should fail with 401):
   ```bash
   curl -X PUT http://localhost:8787/api/adminhub/config \
     -H "Content-Type: application/json" \
     -d '{"cards": []}'
   # Expected: 401 Unauthorized
   ```

4. Test PUT with token (should still work since no env token configured):
   ```bash
   curl -X PUT http://localhost:8787/api/adminhub/config \
     -H "Authorization: Bearer any-token" \
     -H "Content-Type: application/json" \
     -d '{"cards": []}'
   # Expected: 200 OK (success)
   ```

### Production Testing

After deploying with env token configured:

```bash
# Should fail (invalid token)
curl -X PUT https://admin.lcv.app.br/api/adminhub/config \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"cards": []}'
# Expected: 401 Unauthorized

# Should succeed (valid token)
curl -X PUT https://admin.lcv.app.br/api/adminhub/config \
  -H "Authorization: Bearer $ADMINHUB_BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cards": []}'
# Expected: 200 OK
```

## Deployment Steps

1. **Deploy Admin-App with Auth**
   ```bash
   cd admin-app
   npm run build && npx wrangler deploy
   ```

2. **Configure Bearer Token (Securely)**
   ```bash
   # Option A: via Cloudflare Dashboard
   # Settings → Variables → ADMINHUB_BEARER_TOKEN (encrypted)
   
   # Option B: via CLI (recommended for automation)
   npx wrangler secret put ADMINHUB_BEARER_TOKEN
   # Enter token when prompted
   ```

3. **Update Admin UI** (if needed)
   - Adminhub and apphub no longer need to update PUT calls
   - They already support Bearer token if implemented

4. **Monitor Logs**
   ```bash
   npx wrangler tail --status-code 401
   # Watch for authentication failures
   ```

## Migration Path from 401 Errors

Current state: All requests to admin.lcv.app.br return 401 due to Cloudflare Access policy.

**After this deployment:**
- ✅ GET /api/{adminhub,apphub}/config returns 200 (public)
- ❌ PUT /api/{adminhub,apphub}/config returns 401 (requires auth)
- ❌ All other paths still 401 (Cloudflare Access still active)

**Next steps (if needed):**
1. Disable Cloudflare Access policy on admin.lcv.app.br
2. Or: Whitelist HubCardsModule IP ranges at Access policy level
3. Or: Add CF-Access-Authenticated-User-Email header to static app requests

## Error Responses

### 401 Unauthorized - No Authentication

```json
{
  "error": "Unauthorized",
  "message": "No authentication provided. Use Bearer token in Authorization header.",
  "timestamp": "2026-03-24T12:34:56.789Z"
}
```

### 401 Unauthorized - Invalid Token

```json
{
  "error": "Unauthorized",
  "message": "Invalid Bearer token",
  "timestamp": "2026-03-24T12:34:56.789Z"
}
```

### 200 OK - Success

```json
{
  "ok": true,
  "total": 4,
  "admin_actor": "admin@lcv.app.br",
  "request_id": "req_abc123...",
  "timestamp": "2026-03-24T12:34:56.789Z"
}
```

## Logging & Observability

Authentication events logged in admin_audit table:

```json
{
  "module": "adminhub",
  "action": "config-save",
  "ok": true,
  "metadata": {
    "totalCards": 4,
    "adminActor": "admin@lcv.app.br",
    "authSource": "bearer"  // "bearer" | "cloudflare-access"
  }
}
```

Monitor via Cloudflare Tail:
```bash
npx wrangler tail --grep "authSource"
```

## Future Enhancements

1. **Token Rotation**
   - Implement short-lived tokens (JWT)
   - Add refresh token mechanism

2. **Rate Limiting**
   - Limit auth failures per IP
   - Exponential backoff after repeated failures

3. **Multi-Factor Authentication**
   - Require email verification after token auth
   - Or: Add TOTP support

4. **API Key Management**
   - Create UI for generating/revoking API keys
   - Track token usage per app

## References

- [HTTP Authorization Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization)
- [Bearer Token RFC 6750](https://tools.ietf.org/html/rfc6750)
- [Cloudflare Workers Headers API](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
- [Cloudflare Access Headers](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/)

---

**Version:** 1.0  
**Last Updated:** 2026-03-24  
**Status:** ✅ Production Ready
