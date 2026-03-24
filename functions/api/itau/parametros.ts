import { logModuleOperationalEvent } from '../_lib/operational'
import { readLatestParams, SUPPORTED_ROUTES, toHeaders, toRate, validateRate, type Context } from '../_lib/calculadora-admin'
import { resolveAdminActorFromRequest } from '../_lib/admin-actor'
import { createResponseTrace } from '../_lib/request-trace'

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: toHeaders(),
})

export async function onRequestGet(context: Context) {
  const { env } = context
  const trace = createResponseTrace(context.request)
  const adminActor = resolveAdminActorFromRequest(context.request)

  if (!env.CALC_SOURCE_DB) {
    return json({ ok: false, error: 'CALC_SOURCE_DB não configurado no runtime.', ...trace }, 503)
  }

  try {
    const parametros = await readLatestParams(env.CALC_SOURCE_DB)

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'calculadora',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'read-parametros',
            adminActor,
            totalCampos: Object.keys(parametros).length,
            rotasRateLimitSuportadas: SUPPORTED_ROUTES,
          },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({
      ok: true,
      admin_email: adminActor,
      admin_actor: adminActor,
      ...trace,
      parametros_vigentes: parametros,
      parametros_form: {
        iof_cartao_percent: Number((parametros.iof_cartao * 100).toFixed(4)),
        iof_global_percent: Number((parametros.iof_global * 100).toFixed(4)),
        spread_cartao_percent: Number((parametros.spread_cartao * 100).toFixed(4)),
        spread_global_aberto_percent: Number((parametros.spread_global_aberto * 100).toFixed(4)),
        spread_global_fechado_percent: Number((parametros.spread_global_fechado * 100).toFixed(4)),
        fator_calibragem_global: parametros.fator_calibragem_global,
        backtest_mape_boa_percent: parametros.backtest_mape_boa_percent,
        backtest_mape_atencao_percent: parametros.backtest_mape_atencao_percent,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao carregar parâmetros da Calculadora'

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'calculadora',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: 'read-parametros' },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: false, error: message, ...trace }, 500)
  }
}

export async function onRequestPost(context: Context) {
  const { env } = context
  const trace = createResponseTrace(context.request)

  if (!env.CALC_SOURCE_DB) {
    return json({ ok: false, error: 'CALC_SOURCE_DB não configurado no runtime.', ...trace }, 503)
  }

  try {
    const body = await context.request.json() as Record<string, unknown>
    const adminActor = resolveAdminActorFromRequest(context.request, body)

    const iofCartao = toRate(body.iof_cartao_percent)
    const iofGlobal = toRate(body.iof_global_percent)
    const spreadCartao = toRate(body.spread_cartao_percent)
    const spreadAberto = toRate(body.spread_global_aberto_percent)
    const spreadFechado = toRate(body.spread_global_fechado_percent)
    const calibragem = Number(body.fator_calibragem_global)
    const mapeBoa = Number(body.backtest_mape_boa_percent)
    const mapeAtencao = Number(body.backtest_mape_atencao_percent)

    const validations = [
      validateRate('IOF Cartão', iofCartao),
      validateRate('IOF Global', iofGlobal),
      validateRate('Spread Cartão', spreadCartao),
      validateRate('Spread Global Aberto', spreadAberto),
      validateRate('Spread Global Fechado', spreadFechado),
      !Number.isFinite(calibragem) || calibragem <= 0 ? 'Fator de calibragem deve ser maior que 0.' : null,
      !Number.isFinite(mapeBoa) || mapeBoa < 0 || mapeBoa > 100 ? 'MAPE Boa inválido.' : null,
      !Number.isFinite(mapeAtencao) || mapeAtencao < 0 || mapeAtencao > 100 ? 'MAPE Atenção inválido.' : null,
      Number.isFinite(mapeBoa) && Number.isFinite(mapeAtencao) && mapeAtencao <= mapeBoa
        ? 'MAPE Atenção deve ser maior que MAPE Boa.'
        : null,
    ].filter(Boolean)

    if (validations.length) {
      return json({ ok: false, error: validations[0], ...trace }, 400)
    }

    const values = {
      iof_cartao: Number(iofCartao),
      iof_global: Number(iofGlobal),
      spread_cartao: Number(spreadCartao),
      spread_global_aberto: Number(spreadAberto),
      spread_global_fechado: Number(spreadFechado),
      fator_calibragem_global: calibragem,
      backtest_mape_boa_percent: mapeBoa,
      backtest_mape_atencao_percent: mapeAtencao,
    }

    const atuais = await readLatestParams(env.CALC_SOURCE_DB)

    const mudancas = Object.entries(values)
      .filter(([chave, valorNovo]) => !Number.isFinite(atuais[chave as keyof typeof atuais]) || Number(atuais[chave as keyof typeof atuais]) !== Number(valorNovo))
      .map(([chave, valorNovo]) => ({
        chave,
        valorAnterior: Number.isFinite(atuais[chave as keyof typeof atuais]) ? atuais[chave as keyof typeof atuais] : null,
        valorNovo,
      }))

    for (const [chave, valor] of Object.entries(values)) {
      await env.CALC_SOURCE_DB.prepare('INSERT INTO calc_parametros_customizados (chave, valor) VALUES (?, ?)')
        .bind(chave, String(valor))
        .run()
    }

    for (const mudanca of mudancas) {
      await env.CALC_SOURCE_DB.prepare(`
        INSERT INTO calc_parametros_auditoria (created_at, admin_email, chave, valor_anterior, valor_novo, origem)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
        .bind(
          Date.now(),
          adminActor,
          mudanca.chave,
          mudanca.valorAnterior == null ? null : String(mudanca.valorAnterior),
          String(mudanca.valorNovo),
          'admin-app',
        )
        .run()
    }

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'calculadora',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'save-parametros',
            adminActor,
            mudancas: mudancas.length,
            chaves: mudancas.map((item) => item.chave),
          },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({
      ok: true,
      admin_email: adminActor,
      admin_actor: adminActor,
      ...trace,
      saved_at: new Date().toISOString(),
      parametros_salvos: values,
      mudancas_registradas: mudancas.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar parâmetros da Calculadora'

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'calculadora',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: 'save-parametros' },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: false, error: message, ...trace }, 500)
  }
}
