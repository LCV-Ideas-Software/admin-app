import { logModuleOperationalEvent, type D1Database } from '../_lib/operational'
import { toHeaders } from '../_lib/mainsite-admin'
import { createResponseTrace } from '../_lib/request-trace'

type FeesEnv = {
  BIGDATA_DB?: D1Database
}

type FeesContext = {
  request: Request
  env: FeesEnv
}

interface FeeConfig {
  sumupRate: number
  sumupFixed: number
  mpRate: number
  mpFixed: number
}

const DEFAULT_FEES: FeeConfig = {
  sumupRate: 0.0267,
  sumupFixed: 0,
  mpRate: 0.0499,
  mpFixed: 0.40,
}

const FEES_KEY = 'mainsite/fees'

export async function onRequestGet(context: FeesContext) {
  const trace = createResponseTrace(context.request)

  try {
    const db = context.env.BIGDATA_DB
    if (!db) throw new Error('BIGDATA_DB não configurado.')

    const row = await db.prepare('SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1')
      .bind(FEES_KEY)
      .first<{ payload?: string }>()

    let fees = DEFAULT_FEES
    if (row?.payload) {
      try {
        const parsed = JSON.parse(row.payload) as Partial<FeeConfig>
        fees = {
          sumupRate: typeof parsed.sumupRate === 'number' ? parsed.sumupRate : DEFAULT_FEES.sumupRate,
          sumupFixed: typeof parsed.sumupFixed === 'number' ? parsed.sumupFixed : DEFAULT_FEES.sumupFixed,
          mpRate: typeof parsed.mpRate === 'number' ? parsed.mpRate : DEFAULT_FEES.mpRate,
          mpFixed: typeof parsed.mpFixed === 'number' ? parsed.mpFixed : DEFAULT_FEES.mpFixed,
        }
      } catch { /* use defaults */ }
    }

    return new Response(JSON.stringify({ ok: true, fees, ...trace }), { headers: toHeaders() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao ler configuração de taxas.'
    return new Response(JSON.stringify({ ok: false, error: message, ...trace }), { status: 500, headers: toHeaders() })
  }
}

export async function onRequestPost(context: FeesContext) {
  const trace = createResponseTrace(context.request)

  try {
    const db = context.env.BIGDATA_DB
    if (!db) throw new Error('BIGDATA_DB não configurado.')

    const body = await context.request.json() as Partial<FeeConfig>

    // Validate each field
    const fees: FeeConfig = {
      sumupRate: typeof body.sumupRate === 'number' && body.sumupRate >= 0 && body.sumupRate < 1 ? body.sumupRate : DEFAULT_FEES.sumupRate,
      sumupFixed: typeof body.sumupFixed === 'number' && body.sumupFixed >= 0 ? body.sumupFixed : DEFAULT_FEES.sumupFixed,
      mpRate: typeof body.mpRate === 'number' && body.mpRate >= 0 && body.mpRate < 1 ? body.mpRate : DEFAULT_FEES.mpRate,
      mpFixed: typeof body.mpFixed === 'number' && body.mpFixed >= 0 ? body.mpFixed : DEFAULT_FEES.mpFixed,
    }

    await db.prepare(`
      INSERT INTO mainsite_settings (id, payload, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        payload = excluded.payload,
        updated_at = CURRENT_TIMESTAMP
    `)
      .bind(FEES_KEY, JSON.stringify(fees))
      .run()

    try {
      await logModuleOperationalEvent(db, {
        module: 'mainsite',
        source: 'bigdata_db',
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: 'save-fee-config',
          fees,
        },
      })
    } catch { /* telemetria não bloqueia */ }

    return new Response(JSON.stringify({ ok: true, fees, ...trace }), { headers: toHeaders() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar configuração de taxas.'
    return new Response(JSON.stringify({ ok: false, error: message, ...trace }), { status: 500, headers: toHeaders() })
  }
}
