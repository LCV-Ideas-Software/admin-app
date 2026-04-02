import { logModuleOperationalEvent } from '../_lib/operational'
import { type Context, type MainsitePublicSettings, toHeaders } from '../_lib/mainsite-admin'
import { resolveAdminActorFromRequest } from '../_lib/admin-actor'
import { createResponseTrace, type ResponseTrace } from '../_lib/request-trace'

type D1PreparedStatement = {
  bind: (...values: Array<string | number | null>) => D1PreparedStatement
  first: <T>() => Promise<T | null>
  run: () => Promise<unknown>
}

type D1Database = {
  prepare: (query: string) => D1PreparedStatement
}

type MainsiteEnv = Context['env'] & {
  BIGDATA_DB?: D1Database
}

type MainsiteContext = {
  request: Request
  env: MainsiteEnv
}

type SettingRow = {
  payload?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const buildErrorResponse = (message: string, trace: ResponseTrace, status = 500) => new Response(JSON.stringify({
  ok: false,
  error: message,
  ...trace,
}), {
  status,
  headers: toHeaders(),
})

const requireDb = (env: MainsiteEnv) => {
  if (!env.BIGDATA_DB) {
    throw new Error('BIGDATA_DB não configurado no runtime do admin-app.')
  }
  return env.BIGDATA_DB
}

const safeParseObject = (rawPayload: string | undefined, fallback: Record<string, unknown>) => {
  if (!rawPayload?.trim()) {
    return fallback
  }

  try {
    const parsed = JSON.parse(rawPayload) as unknown
    return isRecord(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

const readPublicSettings = async (db: D1Database): Promise<MainsitePublicSettings> => {
  const [appearanceRow, rotationRow, disclaimersRow, aiModelsRow] = await Promise.all([
    db.prepare('SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1').bind('mainsite/appearance').first<SettingRow>(),
    db.prepare('SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1').bind('mainsite/rotation').first<SettingRow>(),
    db.prepare('SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1').bind('mainsite/disclaimers').first<SettingRow>(),
    db.prepare('SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1').bind('mainsite/ai_models').first<SettingRow>(),
  ])

  return {
    appearance: safeParseObject(appearanceRow?.payload, {}),
    rotation: safeParseObject(rotationRow?.payload, {}),
    disclaimers: safeParseObject(disclaimersRow?.payload, {}),
    aiModels: safeParseObject(aiModelsRow?.payload, {
      chat: 'gemini-1.5-flash-latest',
      summary: 'gemini-1.5-flash-latest',
    }),
  }
}

const upsertSetting = async (db: D1Database, id: string, payload: Record<string, unknown>) => {
  await db.prepare(`
    INSERT INTO mainsite_settings (id, payload, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      payload = excluded.payload,
      updated_at = CURRENT_TIMESTAMP
  `)
    .bind(id, JSON.stringify(payload))
    .run()
}

export async function onRequestGet(context: MainsiteContext) {
  const trace = createResponseTrace(context.request)

  try {
    const db = requireDb(context.env)
    const settings = await readPublicSettings(db)

    return new Response(JSON.stringify({
      ok: true,
      settings,
      ...trace,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao consultar settings públicos do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'read-public-settings',
          },
        })
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, trace, 500)
  }
}

export async function onRequestPut(context: MainsiteContext) {
  const trace = createResponseTrace(context.request)

  try {
    const db = requireDb(context.env)
    const body = await context.request.json() as Partial<MainsitePublicSettings>
    const adminActor = resolveAdminActorFromRequest(context.request, body as Record<string, unknown>)

    if (!isRecord(body.appearance) || !isRecord(body.rotation) || !isRecord(body.disclaimers) || (body.aiModels && !isRecord(body.aiModels))) {
      return buildErrorResponse('Appearance, rotation, disclaimers e aiModels precisam ser objetos JSON válidos.', trace, 400)
    }

    const settings: MainsitePublicSettings = {
      appearance: body.appearance,
      rotation: body.rotation,
      disclaimers: body.disclaimers,
      aiModels: body.aiModels ?? {},
    }

    await Promise.all([
      upsertSetting(db, 'mainsite/appearance', settings.appearance),
      upsertSetting(db, 'mainsite/rotation', settings.rotation),
      upsertSetting(db, 'mainsite/disclaimers', settings.disclaimers),
      upsertSetting(db, 'mainsite/ai_models', settings.aiModels),
    ])

    try {
      await logModuleOperationalEvent(db, {
        module: 'mainsite',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: 'save-public-settings',
          adminActor,
          settingsUpserted: 4,
        },
      })
    } catch {
      // Telemetria não deve bloquear a resposta.
    }

    return new Response(JSON.stringify({
      ok: true,
      settingsUpserted: 4,
      admin_actor: adminActor,
      ...trace,
    }), {
      headers: toHeaders(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar settings públicos do MainSite'

    if (context.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context.env.BIGDATA_DB, {
          module: 'mainsite',
          source: 'bigdata_db',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'save-public-settings',
          },
        })
      } catch {
        // Telemetria não deve bloquear a resposta.
      }
    }

    return buildErrorResponse(message, trace)
  }
}
