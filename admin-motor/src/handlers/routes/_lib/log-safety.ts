function maskSegment(segment: string): string {
  if (!segment) return '***'
  if (segment.length <= 2) return `${segment[0] ?? '*'}***`
  return `${segment.slice(0, 2)}***`
}

export function maskEmail(email: string): string {
  const [localPart = '', domainPart = ''] = email.split('@')
  const domainChunks = domainPart.split('.').filter(Boolean)

  if (!localPart || domainChunks.length === 0) {
    return '***'
  }

  const [host, ...rest] = domainChunks
  const suffix = rest.length > 0 ? `.${rest.join('.')}` : ''
  return `${maskSegment(localPart)}@${maskSegment(host)}${suffix}`
}

export function summarizeConfigPayload(config: unknown): Record<string, unknown> {
  if (!config || typeof config !== 'object') {
    return { shape: typeof config }
  }

  const payload = config as Record<string, unknown>
  const rateLimits = payload.rateLimits as Record<string, unknown> | undefined
  const theme = payload.theme as Record<string, unknown> | undefined
  const accessibility = payload.accessibility as Record<string, unknown> | undefined

  return {
    topLevelKeys: Object.keys(payload).sort(),
    rateLimitRoutes: rateLimits ? Object.keys(rateLimits).length : 0,
    themeSections: theme ? Object.keys(theme).sort() : [],
    accessibilityKeys: accessibility ? Object.keys(accessibility).sort() : [],
  }
}
