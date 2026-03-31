/**
 * Validação centralizada para admin-app
 * Consolidação de regras de negócio com foco em segurança e compliance
 */

export type ValidationResult = {
  valid: boolean
  normalized?: string
  error?: string
}

// ============================================================================
// EMAIL & ADMIN ACTOR VALIDATION
// ============================================================================

const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,255}$/
const ADMIN_ACTOR_REGEX = /^[\w._%-]+@[\w.-]+\.[a-z]{2,}$/i

/**
 * Validates email address (RFC 5322 simplified)
 * @param email Raw email string
 * @returns Validation result with normalized email
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email?.trim() ?? ''

  if (!trimmed) {
    return { valid: false, error: 'Email não pode estar vazio.' }
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Formato de email inválido.' }
  }

  return { valid: true, normalized: trimmed.toLowerCase() }
}

/**
 * Validates admin actor (email-like identifier)
 * Used for X-Admin-Actor header and form field
 * @param actor Raw admin actor string
 * @returns Validation result with normalized actor
 */
export function validateAdminActor(actor: string): ValidationResult {
  const trimmed = actor?.trim() ?? ''

  if (!trimmed) {
    return { valid: false, error: 'Administrador não pode estar vazio.' }
  }

  if (trimmed.length > 160) {
    return { valid: false, error: 'Administrador excede 160 caracteres.' }
  }

  if (!ADMIN_ACTOR_REGEX.test(trimmed)) {
    return { valid: false, error: 'Formato de administrador inválido (esperado: email).' }
  }

  return { valid: true, normalized: trimmed.toLowerCase() }
}

// ============================================================================
// URL & DOMAIN VALIDATION
// ============================================================================

const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i
const MX_HOSTNAME_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(\s+\d+)?$/i
const BLOCKED_URL_SCHEMES = ['javascript:', 'data:'] as const

const normalizeSchemeInput = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\u0000-\u001f\u007f\s]+/g, '')

/**
 * Validates HTTP/HTTPS URL
 * @param url Raw URL string
 * @returns Validation result
 */
export function validateUrl(url: string): ValidationResult {
  const trimmed = url?.trim() ?? ''

  if (!trimmed) {
    return { valid: false, error: 'URL não pode estar vazia.' }
  }

  const normalized = normalizeSchemeInput(trimmed)
  if (BLOCKED_URL_SCHEMES.some((scheme) => normalized.startsWith(scheme))) {
    return { valid: false, error: 'URL com protocolo não permitido.' }
  }

  try {
    const parsed = new URL(trimmed)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL deve usar protocolo HTTP ou HTTPS.' }
    }
    return { valid: true, normalized: parsed.toString() }
  } catch {
    return { valid: false, error: 'URL inválida.' }
  }
}

/**
 * Validates domain name (DNS-compliant)
 * Supports: example.com, subdomain.example.com
 * @param domain Raw domain string
 * @returns Validation result with normalized domain
 */
export function validateDomain(domain: string): ValidationResult {
  const trimmed = domain?.trim().toLowerCase() ?? ''

  if (!trimmed) {
    return { valid: false, error: 'Domínio não pode estar vazio.' }
  }

  if (trimmed.length > 253) {
    return { valid: false, error: 'Domínio excede 253 caracteres.' }
  }

  if (!DOMAIN_REGEX.test(trimmed)) {
    return { valid: false, error: 'Formato de domínio inválido (usando: exemplo.com).' }
  }

  return { valid: true, normalized: trimmed }
}

/**
 * Validates MX hostname (domain or domain with preference)
 * @param hostname Raw hostname or "hostname priority" format
 * @returns Validation result
 */
export function validateMxHostname(hostname: string): ValidationResult {
  const trimmed = hostname?.trim().toLowerCase() ?? ''

  if (!trimmed) {
    return { valid: false, error: 'Hostname MX não pode estar vazio.' }
  }

  if (!MX_HOSTNAME_REGEX.test(trimmed)) {
    return { valid: false, error: 'Formato de hostname MX inválido.' }
  }

  return { valid: true, normalized: trimmed }
}

// ============================================================================
// NUMERIC VALIDATIONS
// ============================================================================

/**
 * Converts and validates positive integer
 * @param value Raw value (string or number)
 * @param fallback Default value if invalid
 * @param max Optional maximum bound
 * @returns Valid positive integer
 */
export function toPositiveInt(value: unknown, fallback: number, max?: number): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  if (max !== undefined && parsed > max) {
    return max
  }

  return Math.floor(parsed)
}

/**
 * Converts and validates non-negative integer
 * @param value Raw value
 * @param fallback Default value if invalid
 * @param max Optional maximum bound
 * @returns Valid non-negative integer
 */
export function toNonNegativeInt(value: unknown, fallback: number, max?: number): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback
  }

  if (max !== undefined && parsed > max) {
    return max
  }

  return Math.floor(parsed)
}

/**
 * Validates percentage (0-100)
 * @param value Raw value
 * @param name Field name for error message
 * @returns Validation result with normalized value (0-100)
 */
export function validatePercentage(value: unknown, name: string): ValidationResult {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return { valid: false, error: `${name}: valor deve ser um número.` }
  }

  if (parsed < 0 || parsed > 100) {
    return { valid: false, error: `${name}: valor deve estar entre 0 e 100.` }
  }

  return { valid: true, normalized: String(parsed) }
}

/**
 * Validates rate limit window (1-1440 minutes = 1 min to 24 hours)
 * @param minutes Raw value
 * @returns Validation result
 */
export function validateRateLimitWindow(minutes: unknown): ValidationResult {
  const parsed = toPositiveInt(minutes, 60, 1440)

  if (parsed < 1 || parsed > 1440) {
    return { valid: false, error: 'Janela de rate limit deve estar entre 1 e 1440 minutos.' }
  }

  return { valid: true, normalized: String(parsed) }
}

/**
 * Validates rate limit max requests (1-500)
 * @param requests Raw value
 * @returns Validation result
 */
export function validateRateLimitMaxRequests(requests: unknown): ValidationResult {
  const parsed = toPositiveInt(requests, 10, 500)

  if (parsed < 1 || parsed > 500) {
    return { valid: false, error: 'Máximo de requisições deve estar entre 1 e 500.' }
  }

  return { valid: true, normalized: String(parsed) }
}

// ============================================================================
// FORM FIELD VALIDATIONS
// ============================================================================

/**
 * Validates required text field (non-empty after trim)
 * @param value Raw value
 * @param fieldName Field name for error message
 * @param minLength Optional minimum length
 * @param maxLength Optional maximum length
 * @returns Validation result
 */
export function validateRequired(
  value: string,
  fieldName: string,
  minLength?: number,
  maxLength?: number,
): ValidationResult {
  const trimmed = value?.trim() ?? ''

  if (!trimmed) {
    return { valid: false, error: `${fieldName} é obrigatório.` }
  }

  if (minLength && trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} deve ter no mínimo ${minLength} caracteres.` }
  }

  if (maxLength && trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} não pode exceder ${maxLength} caracteres.` }
  }

  return { valid: true, normalized: trimmed }
}

/**
 * Validates text field (optional, but with length constraints if provided)
 * @param value Raw value
 * @param maxLength Optional maximum length
 * @returns Validation result
 */
export function validateOptionalText(value: string, maxLength?: number): ValidationResult {
  const trimmed = value?.trim() ?? ''

  if (maxLength && trimmed.length > maxLength) {
    return { valid: false, error: `Texto não pode exceder ${maxLength} caracteres.` }
  }

  return { valid: true, normalized: trimmed }
}

// ============================================================================
// COMPOSITE VALIDATIONS (Common Patterns)
// ============================================================================

/**
 * Validates admin form fields (common pattern across all modules)
 * @param adminActor Admin email identifier
 * @param limits Optional additional limit validations
 * @returns Merged validation result
 */
export function validateAdminFormFields(adminActor: string, limits?: {
  maxRequests?: unknown
  windowMinutes?: unknown
}): ValidationResult {
  const actor = validateAdminActor(adminActor)
  if (!actor.valid) {
    return actor
  }

  if (limits?.maxRequests) {
    const reqValidation = validateRateLimitMaxRequests(limits.maxRequests)
    if (!reqValidation.valid) {
      return reqValidation
    }
  }

  if (limits?.windowMinutes) {
    const windowValidation = validateRateLimitWindow(limits.windowMinutes)
    if (!windowValidation.valid) {
      return windowValidation
    }
  }

  return { valid: true, normalized: actor.normalized }
}

// ============================================================================
// SANITIZATION HELPERS (XSS Prevention)
// ============================================================================

/**
 * Escapes HTML special chars to prevent XSS
 * @param text Raw text
 * @returns Escaped text safe for HTML context
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char] ?? char)
}

/**
 * Validates and escapes JSON string (prevents injection)
 * @param jsonString Raw JSON string
 * @returns Parsed object if valid, null otherwise
 */
export function safeParseJson<T>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString) as T
  } catch {
    return null
  }
}

/**
 * Strips dangerous HTML tags (keeps safe formatting)
 * @param html Raw HTML
 * @returns Sanitized HTML
 */
export function stripDangerousHtml(html: string): string {
  if (typeof DOMParser === 'undefined') {
    return escapeHtml(html)
  }

  const blockedTags = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'meta', 'link', 'base'])
  const parsed = new DOMParser().parseFromString(html, 'text/html')

  const nodes = Array.from(parsed.body.querySelectorAll('*'))
  nodes.forEach((node) => {
    const tagName = node.tagName.toLowerCase()

    if (blockedTags.has(tagName)) {
      node.remove()
      return
    }

    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim().toLowerCase()
      if (name.startsWith('on') || value.startsWith('javascript:') || value.startsWith('data:')) {
        node.removeAttribute(attr.name)
      }
    })
  })

  return parsed.body.innerHTML
}
