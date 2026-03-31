/**
 * Astrological Report Generation — Ported from astrologo-frontend
 *
 * Generates rich HTML email and plain text from mapa data,
 * faithfully reproducing the original Oráculo Celestial layout.
 */

// ─── Types (paridade com astrologo-frontend) ──────────────────────
interface AstroData { astro: string; signo: string; simbolo: string }
interface UmbandaData { posicao: string; orixa: string; simbolo: string }
interface DadosGlobais { tatwa: { principal: string; sub: string }; numerologia: { expressao: number; caminhoVida: number; vibracaoHora: number } }
interface DadosSistema { astrologia: AstroData[]; umbanda: UmbandaData[] }

interface MapaDetalhado {
  id: string
  nome: string
  data_nascimento: string | null
  hora_nascimento: string | null
  local_nascimento: string | null
  dados_astronomica: string | null
  dados_tropical: string | null
  dados_globais: string | null
  analise_ia: string | null
  created_at: string | null
}

interface GeneratedReport {
  html: string
  text: string
  summary: string
}

// ─── Helpers ──────────────────────────────────────────────────────

function safeParseJson<T>(jsonString: string | null): T | null {
  if (!jsonString) return null
  try { return JSON.parse(jsonString) } catch { return null }
}

const formatarData = (dataStr: string): string => {
  if (!dataStr) return ''
  const p = dataStr.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dataStr
}

const formatPosicaoLabel = (pos: string): string => {
  const p = pos.toUpperCase()
  if (p.includes('FAIXA') || p.includes('PERÍODO')) return 'FAIXA HORÁRIA (3H)'
  if (p.startsWith('HORA PLANETÁRIA')) return p
  if (p.includes('ASTRO')) {
    const match = p.match(/\((.*?)\)/)
    return match ? `HORA PLANETÁRIA (${match[1].trim()})` : 'HORA PLANETÁRIA (ASTRO)'
  }
  return p
}

/** Sanitiza HTML para uso em e-mail (tags seguras apenas) */
const sanitizeForEmail = (html: string): string => {
  if (typeof DOMParser === 'undefined') {
    return html
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
      if (name.startsWith('on') || value.startsWith('javascript:') || value.startsWith('data:') || value.startsWith('vbscript:')) {
        node.removeAttribute(attr.name)
      }
    })
  })

  return parsed.body.innerHTML
}

// ─── Text Report (WhatsApp-style) ────────────────────────────────

function gerarTextoRelatorio(
  mapa: MapaDetalhado,
  globais: DadosGlobais | null,
  tropical: DadosSistema | null,
  astronomica: DadosSistema | null,
  analiseIa: string | null
): string {
  const divider = '\n' + '─'.repeat(28) + '\n'

  let t = `*🌌 DIAGNÓSTICO ASTROLÓGICO E ESOTÉRICO 🌌*\n\n`
  t += `*Consulente:* ${mapa.nome}\n`
  if (mapa.local_nascimento) t += `*Local:* ${mapa.local_nascimento}\n`
  if (mapa.data_nascimento) t += `*Nascimento:* ${formatarData(mapa.data_nascimento)} às ${mapa.hora_nascimento ?? '??:??'}\n`

  if (globais) {
    t += divider
    t += `*🌬️ FORÇAS GLOBAIS*\n\n`
    t += `*Tatwas:*\n`
    t += `  • Principal: *${globais.tatwa.principal}*\n`
    t += `  • Sub-tatwa: *${globais.tatwa.sub}*\n\n`
    t += `*Numerologia:*\n`
    t += `  • Expressão: *${globais.numerologia.expressao}*\n`
    t += `  • Caminho da Vida: *${globais.numerologia.caminhoVida}*\n`
    t += `  • Vibração da Hora: *${globais.numerologia.vibracaoHora}*\n`
  }

  const blocoTexto = (dados: DadosSistema): string => {
    let texto = `\n*Astrologia:*\n`
    if (dados.astrologia[0]) texto += `  • ☀️ Sol: *${dados.astrologia[0].signo}*\n`
    if (dados.astrologia[1]) texto += `  • ⬆️ Ascendente: *${dados.astrologia[1].signo}*\n`
    if (dados.astrologia[2]) texto += `  • 🌙 Lua: *${dados.astrologia[2].signo}*\n`
    if (dados.astrologia[3]) texto += `  • 🔭 Meio do Céu: *${dados.astrologia[3].signo}*\n\n`
    texto += `*Umbanda:*\n`
    if (dados.umbanda[0]) texto += `  • 👑 Coroa (Orixá Ancestral): *${dados.umbanda[0].orixa}*\n`
    if (dados.umbanda[1]) texto += `  • 🌊 Adjuntó (Orixá de Frente): *${dados.umbanda[1].orixa}*\n`
    if (dados.umbanda[2]) texto += `  • 🏹 Frente (Orixá de Trabalho): *${dados.umbanda[2].orixa}*\n`
    if (dados.umbanda[3]) texto += `  • 🌟 Decanato (Regente Secundário): *${dados.umbanda[3].orixa}*\n`
    if (dados.umbanda[4]) texto += `  • ⏳ Faixa Horária (Regente da Hora): *${dados.umbanda[4].orixa}*\n`
    if (dados.umbanda[5]) texto += `  • 🪐 ${formatPosicaoLabel(dados.umbanda[5].posicao)}: *${dados.umbanda[5].orixa}*\n`
    return texto
  }

  if (tropical) {
    t += divider
    t += `*🌞 MÓDULO I: ASTROLÓGICO TROPICAL (A PERSONA)*\n`
    t += blocoTexto(tropical)
  }

  t += divider
  t += `*✨ AGORA, A VERDADE OCULTA... ✨*\n\n`
  t += `_O módulo tropical acima revelou a sua máscara terrena (Persona). Desfaça a ilusão sazonal e contemple abaixo a sua *verdadeira assinatura estelar*._\n`

  if (astronomica) {
    t += divider
    t += `*⭐ MÓDULO II: ASTRONÔMICO CONSTELACIONAL (A ALMA)*\n`
    t += blocoTexto(astronomica)
  }

  if (analiseIa) {
    const iaTxt = analiseIa
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
      .replace(/<b>(.*?)<\/b>/gi, '*$1*')
      .replace(/<em>(.*?)<\/em>/gi, '_$1_')
      .replace(/<i>(.*?)<\/i>/gi, '_$1_')
      .replace(/<li>(.*?)<\/li>/gi, '• $1\n')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n*$1*\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')

    t += divider
    t += `*🧠 SÍNTESE DO MESTRE (IA)*\n\n` + iaTxt.replace(/\n{3,}/g, '\n\n').trim() + `\n`
  }

  t += divider
  t += `✨ _Gerado via Oráculo Celestial — Admin LCV_ ✨`
  return t
}

// ─── HTML Report (rich email with inline styles) ─────────────────

function gerarHtmlRelatorio(
  mapa: MapaDetalhado,
  globais: DadosGlobais | null,
  tropical: DadosSistema | null,
  astronomica: DadosSistema | null,
  analiseIa: string | null
): string {
  const fontFamily = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;"
  const boxShadow = "box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.05);"

  // Astrologia grid cards
  const blocoAstrologiaHtml = (dados: AstroData[]) => dados.map(a => `
    <div style="background-color: #ffffff; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; ${boxShadow} text-align: left;">
      <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">${a.astro}</p>
      <p style="font-size: 15px; color: #1e293b; margin: 0; font-weight: bold;">${a.simbolo} ${a.signo}</p>
    </div>
  `).join('')

  // Umbanda grid cards
  const blocoUmbandaHtml = (dados: UmbandaData[], isTropical: boolean) => {
    const color = isTropical ? '#e37400' : '#1a73e8'
    const bgColor = isTropical ? 'rgba(251, 146, 60, 0.1)' : 'rgba(99, 102, 241, 0.1)'
    const borderColor = isTropical ? '#fed7aa' : '#c7d2fe'

    return dados.map(u => `
      <div style="background-color: #ffffff; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; ${boxShadow} display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 100%; text-align: center;">
        <span style="font-size: 32px; margin-bottom: 8px;">${u.simbolo}</span>
        <p style="font-size: 10px; color: #64748b; margin: 0 0 8px 0; font-weight: bold; text-transform: uppercase; line-height: 1.2;">${formatPosicaoLabel(u.posicao)}</p>
        <div style="background-color: ${bgColor}; color: ${color}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 8px 4px; width: 100%; margin-top: auto;">
          <p style="margin: 0; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${u.orixa}</p>
        </div>
      </div>
    `).join('')
  }

  // Section block (Tropical or Astronômico)
  const renderBlocoAstrologicoEmail = (titulo: string, dadosAstrologia: AstroData[], dadosUmbanda: UmbandaData[], isTropical: boolean) => {
    const titleColor = isTropical ? '#f9ab00' : '#1967d2'
    const borderTopColor = isTropical ? '#fdd663' : '#1a73e8'
    return `
      <div style="margin-top: 40px; padding-top: 40px; border-top: 1px solid ${borderTopColor};">
        <h2 style="font-size: 28px; font-weight: 900; color: ${titleColor}; margin: 0 0 32px 0;">${titulo}</h2>
        <div style="background-color: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); padding: 32px; border-radius: 24px; border: 1px solid #ffffff; ${boxShadow} margin-bottom: 32px;">
          <h3 style="font-size: 20px; font-weight: bold; color: #1e293b; margin: 0 0 24px 0; padding-bottom: 12px; border-bottom: 1px solid #dadce0;">I. Astrologia (${isTropical ? '12 Signos' : '13 Signos'})</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px;">
            ${blocoAstrologiaHtml(dadosAstrologia)}
          </div>
        </div>
        <div style="background-color: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); padding: 32px; border-radius: 24px; border: 1px solid #ffffff; ${boxShadow}">
          <h3 style="font-size: 20px; font-weight: bold; color: ${titleColor}; margin: 0 0 24px 0; padding-bottom: 12px; border-bottom: 1px solid #dadce0;">II. Umbanda</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            ${blocoUmbandaHtml(dadosUmbanda, isTropical)}
          </div>
        </div>
      </div>
    `
  }

  // Sanitize IA analysis for email
  const analiseSanitizada = analiseIa ? sanitizeForEmail(analiseIa) : ''

  const dataNasc = mapa.data_nascimento ? formatarData(mapa.data_nascimento) : ''
  const horaNasc = mapa.hora_nascimento ?? ''

  const html = `
  <!DOCTYPE html>
  <html lang="pt-br">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dossiê Astrológico</title>
    <style>
      @media (max-width: 600px) {
        .container { padding: 15px !important; }
        .grid-2 { grid-template-columns: 1fr !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f1f5f9; ${fontFamily}">
    <div class="container" style="background-color: #f1f5f9; background-image: radial-gradient(ellipse at top, #e0e7ff 0%, #f1f5f9 50%, #fdf4ff 100%); max-width: 800px; margin: auto; padding: 40px;">

      <header style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 36px; font-weight: 900; letter-spacing: -1px; color: transparent; background-clip: text; -webkit-background-clip: text; background-image: linear-gradient(to right, #4285f4, #1a73e8); margin: 0 0 8px 0;">Diagnóstico Astrológico</h1>
        <p style="font-size: 18px; color: #475569; margin: 0;">Umbanda Esotérica da Raiz de Guiné</p>
      </header>

      <div style="background-color: rgba(255, 255, 255, 0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); padding: 32px; border-radius: 24px; border: 1px solid #ffffff; ${boxShadow} text-align: center; margin-bottom: 40px;">
        <h2 style="font-size: 24px; font-weight: 800; color: #1e293b; margin: 0 0 8px 0;">${mapa.nome}</h2>
        ${mapa.local_nascimento ? `<p style="font-size: 16px; color: #475569; margin: 0;">${mapa.local_nascimento}</p>` : ''}
        ${dataNasc ? `<p style="font-size: 16px; color: #475569; margin: 0;">${dataNasc}${horaNasc ? ` às ${horaNasc}` : ''}</p>` : ''}
      </div>

      ${globais ? `
      <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px;">
        <div style="background-color: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); padding: 24px; border-radius: 24px; border: 1px solid #ffffff; ${boxShadow}">
          <h3 style="font-size: 20px; font-weight: bold; color: #2563eb; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #dadce0;">🌬️ Forças Globais: Tatwas</h3>
          <div style="font-size: 16px; color: #334155;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 8px;"><span>Principal</span> <strong style="color: #1e293b;">${globais.tatwa.principal}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background-color: #f8fafc; border-radius: 8px;"><span>Sub-tatwa</span> <strong style="color: #1e293b;">${globais.tatwa.sub}</strong></div>
          </div>
        </div>
        <div style="background-color: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); padding: 24px; border-radius: 24px; border: 1px solid #ffffff; ${boxShadow}">
          <h3 style="font-size: 20px; font-weight: bold; color: #2563eb; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #dadce0;">#️⃣ Forças Globais: Numerologia</h3>
          <div style="font-size: 16px; color: #334155;">
            <div style="display: flex; justify-content: space-between; padding: 12px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 8px;"><span>Expressão</span> <strong style="color: #1e293b;">${globais.numerologia.expressao}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 8px;"><span>Caminho</span> <strong style="color: #1e293b;">${globais.numerologia.caminhoVida}</strong></div>
            <div style="display: flex; justify-content: space-between; padding: 12px; background-color: #f8fafc; border-radius: 8px;"><span>Hora</span> <strong style="color: #1e293b;">${globais.numerologia.vibracaoHora}</strong></div>
          </div>
        </div>
      </div>
      ` : ''}

      ${tropical?.astrologia && tropical?.umbanda ? renderBlocoAstrologicoEmail('Módulo I: Astrológico Tropical', tropical.astrologia, tropical.umbanda, true) : ''}

      <div style="margin: 60px 0; text-align: center; position: relative;">
        <div style="position: absolute; inset: 0; background-image: linear-gradient(to right, rgba(251, 146, 60, 0.2), rgba(99, 102, 241, 0.2), rgba(52, 211, 153, 0.2)); border-radius: 24px; filter: blur(20px);"></div>
        <div style="position: relative; background-color: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.5); padding: 40px; border-radius: 24px; ${boxShadow}">
          <p style="font-size: 32px; margin: 0 0 12px 0;">✨</p>
          <h3 style="font-size: 24px; font-weight: 900; color: #1a73e8; margin: 0 0 8px 0;">Agora, a Verdade Oculta!</h3>
          <p style="font-size: 16px; color: #475569; margin: 0; max-width: 500px; margin-left: auto; margin-right: auto;">O módulo tropical acima revelou a sua <strong>máscara terrena (Persona)</strong>. Desfaça a ilusão sazonal e contemple abaixo a sua <strong>verdadeira assinatura estelar</strong>.</p>
        </div>
      </div>

      ${astronomica?.astrologia && astronomica?.umbanda ? renderBlocoAstrologicoEmail('Módulo II: Astronômico Constelacional', astronomica.astrologia, astronomica.umbanda, false) : ''}

      ${analiseSanitizada ? `
      <div style="margin-top: 60px; padding: 40px; background-color: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); border-radius: 24px; border: 1px solid #ffffff; ${boxShadow}">
        <h3 style="font-size: 28px; font-weight: 900; color: transparent; background-clip: text; -webkit-background-clip: text; background-image: linear-gradient(to right, #4285f4, #1a73e8); margin: 0 0 24px 0; padding-bottom: 16px; border-bottom: 1px solid #dadce0;">🧠 Síntese do Mestre (IA)</h3>
        <div style="font-size: 16px; line-height: 1.7; color: #334155;">${analiseSanitizada}</div>
      </div>
      ` : ''}

      <footer style="text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid #dde4ee;">
        <p style="font-size: 12px; color: #64748b; margin: 0;">Gerado via Oráculo Celestial — Admin LCV</p>
      </footer>

    </div>
  </body>
  </html>
  `
  return html
}

// ─── Public API ───────────────────────────────────────────────────

export function generateAstrologicalReport(
  mapa: MapaDetalhado,
): GeneratedReport {
  const globais = safeParseJson<DadosGlobais>(mapa.dados_globais)
  const tropical = safeParseJson<DadosSistema>(mapa.dados_tropical)
  const astronomica = safeParseJson<DadosSistema>(mapa.dados_astronomica)

  const htmlContent = gerarHtmlRelatorio(mapa, globais, tropical, astronomica, mapa.analise_ia)
  const textContent = gerarTextoRelatorio(mapa, globais, tropical, astronomica, mapa.analise_ia)

  // Summary from AI or fallback
  let summary: string
  if (mapa.analise_ia) {
    summary = mapa.analise_ia.replace(/<[^>]+>/g, '').split('.')[0].trim()
  } else {
    summary = `Mapa astrológico de ${mapa.nome}`
  }

  return { html: htmlContent, text: textContent, summary }
}
