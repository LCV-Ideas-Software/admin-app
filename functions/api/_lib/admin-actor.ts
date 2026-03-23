const DEFAULT_ADMIN_ACTOR = 'admin-app'

const normalizeAdminActor = (value: unknown): string | null => {
  const actor = String(value ?? '').trim()
  if (!actor) {
    return null
  }

  return actor.slice(0, 160)
}

export const resolveAdminActorFromRequest = (request: Request, body?: Record<string, unknown>): string => {
  const fromHeader = normalizeAdminActor(request.headers.get('X-Admin-Actor'))
  if (fromHeader) {
    return fromHeader
  }

  const fromEmailHeader = normalizeAdminActor(request.headers.get('X-Admin-Email'))
  if (fromEmailHeader) {
    return fromEmailHeader
  }

  const fromBody = normalizeAdminActor(body?.adminActor)
  if (fromBody) {
    return fromBody
  }

  const fromBodyEmail = normalizeAdminActor(body?.adminEmail)
  if (fromBodyEmail) {
    return fromBodyEmail
  }

  return DEFAULT_ADMIN_ACTOR
}
