import { logModuleOperationalEvent, type D1Database } from '../_lib/operational'
import { toHeaders } from '../_lib/astrologo-admin'

type Env = {
  RESEND_API_KEY?: string
  BIGDATA_DB?: D1Database
}

type Context = {
  request: Request
  env: Env
}

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: toHeaders(),
})

const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

export async function onRequestPost(context: Context) {
  const { request, env } = context

  try {
    const body = await request.json() as Record<string, unknown>
    const emailDestino = String(body.emailDestino ?? '').trim()
    const relatorioHtml = String(body.relatorioHtml ?? '')
    const relatorioTexto = String(body.relatorioTexto ?? '')
    const nomeConsulente = String(body.nomeConsulente ?? '').trim()

    if (!isValidEmail(emailDestino)) {
      return json({ ok: false, error: 'E-mail de destino inválido.' }, 400)
    }

    if (!relatorioHtml && !relatorioTexto) {
      return json({ ok: false, error: 'Relatório vazio.' }, 400)
    }

    if (!env.RESEND_API_KEY) {
      return json({ ok: false, error: 'RESEND_API_KEY não configurada no runtime.' }, 503)
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Oráculo Astrológico <astrologo@lcv.app.br>',
        to: [emailDestino],
        subject: `🌌 Dossiê Astrológico e Esotérico de ${nomeConsulente || 'consulente'}`,
        html: relatorioHtml,
        text: relatorioTexto,
      }),
    })

    const resendPayload = await resendResponse.json() as Record<string, unknown>

    if (!resendResponse.ok) {
      const message = String(resendPayload.message ?? resendPayload.error ?? 'Falha ao enviar e-mail via Resend.')

      if (env.BIGDATA_DB) {
        try {
          await logModuleOperationalEvent(env.BIGDATA_DB, {
            module: 'astrologo',
            source: 'legacy-admin',
            fallbackUsed: false,
            ok: false,
            errorMessage: message,
            metadata: {
              action: 'send-email',
              emailDestino,
            },
          })
        } catch {
          // Não bloquear por telemetria.
        }
      }

      return json({ ok: false, error: message }, 502)
    }

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'astrologo',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: 'send-email',
            emailDestino,
          },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({
      ok: true,
      message: 'E-mail enviado com sucesso!',
      provider: 'resend',
      id: resendPayload.id ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha interna na comunicação do e-mail.'

    if (env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env.BIGDATA_DB, {
          module: 'astrologo',
          source: 'legacy-admin',
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: 'send-email',
          },
        })
      } catch {
        // Não bloquear por telemetria.
      }
    }

    return json({ ok: false, error: message }, 500)
  }
}
