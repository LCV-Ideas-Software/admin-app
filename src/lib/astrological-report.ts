/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * Astrological Report Generation — Ported from astrologo-frontend
 *
 * Generates rich HTML email and plain text from mapa data,
 * faithfully reproducing the original Oráculo Celestial layout.
 */

import {
  type DadosPosicionaisV2,
  type DadosPosicionaisV2ParseResult,
  deriveConsultantRulingAngel,
  formatDegreeDmsTruncated,
  formatIauConstellation,
  formatInstantInBrasilia,
  formatPlacidusHouse,
  formatTropicalPosition,
  LEGACY_TIME_WARNING,
  PLANET_LABEL_BY_ID,
  parseDadosPosicionaisV2,
} from './astrological-position-v2';

// ─── Types (paridade com astrologo-frontend) ──────────────────────
interface AstroData {
  astro: string;
  signo: string;
  simbolo: string;
}
interface UmbandaData {
  posicao: string;
  orixa: string;
  simbolo: string;
}
interface DadosGlobais {
  tatwa: { principal: string; sub: string };
  numerologia: { expressao: number; caminhoVida: number; vibracaoHora: number };
}
interface DadosSistema {
  astrologia: AstroData[];
  umbanda: UmbandaData[];
}

interface MapaDetalhado {
  id: string;
  nome: string;
  data_nascimento: string | null;
  hora_nascimento: string | null;
  local_nascimento: string | null;
  dados_astronomica: string | null;
  dados_tropical: string | null;
  dados_globais: string | null;
  dados_posicionais_v2?: string | null;
  dadosPosicionaisV2?: unknown;
  analise_ia: string | null;
  created_at: string | null;
}

interface GeneratedReport {
  html: string;
  text: string;
  summary: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

function safeParseJson<T>(jsonString: string | null): T | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

const formatarData = (dataStr: string): string => {
  if (!dataStr) return '';
  const p = dataStr.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dataStr;
};

const formatPosicaoLabel = (pos: string): string => {
  const p = pos.toUpperCase();
  if (p.includes('FAIXA') || p.includes('PERÍODO')) return 'FAIXA HORÁRIA (3H)';
  if (p.startsWith('HORA PLANETÁRIA')) return p;
  if (p.includes('ASTRO')) {
    const match = p.match(/\((.*?)\)/);
    return match ? `HORA PLANETÁRIA (${(match[1] ?? '').trim()})` : 'HORA PLANETÁRIA (ASTRO)';
  }
  return p;
};

/** Sanitiza HTML para uso em e-mail (tags seguras apenas) */
const htmlToPlainText = (html: string): string => {
  if (typeof DOMParser === 'undefined') {
    return html
      .split('&nbsp;')
      .join(' ')
      .split('&amp;')
      .join('&')
      .split('&quot;')
      .join('"')
      .split('&#39;')
      .join("'")
      .trim();
  }

  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return (parsed.body.textContent || '').trim();
};

const sanitizeForEmail = (html: string): string => {
  if (typeof DOMParser === 'undefined') {
    return htmlToPlainText(html);
  }

  const blockedTags = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'meta', 'link', 'base']);
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  const nodes = Array.from(parsed.body.querySelectorAll('*'));
  nodes.forEach((node) => {
    const tagName = node.tagName.toLowerCase();

    if (blockedTags.has(tagName)) {
      node.remove();
      return;
    }

    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const rawValue = attr.value.trim();
      const lowerValue = rawValue.toLowerCase();

      if (
        name.startsWith('on') ||
        lowerValue.startsWith('javascript:') ||
        lowerValue.startsWith('data:') ||
        lowerValue.startsWith('vbscript:')
      ) {
        node.removeAttribute(attr.name);
        return;
      }

      if (name === 'href' || name === 'src') {
        try {
          const resolved = new URL(rawValue, 'https://example.invalid');
          const protocol = resolved.protocol.toLowerCase();
          if (protocol === 'javascript:' || protocol === 'data:' || protocol === 'vbscript:') {
            node.removeAttribute(attr.name);
          }
        } catch {
          node.removeAttribute(attr.name);
        }
      }
    });
  });

  return parsed.body.innerHTML;
};

const escapeHtml = (value: string | number): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const PLANET_EMAIL_COLOR_BY_ID: Readonly<Record<keyof typeof PLANET_LABEL_BY_ID, string>> = Object.freeze({
  sun: '#f59e0b',
  moon: '#64748b',
  mercury: '#0f766e',
  venus: '#db2777',
  mars: '#dc2626',
  jupiter: '#7c3aed',
  saturn: '#a16207',
  uranus: '#0891b2',
  neptune: '#2563eb',
  pluto: '#9333ea',
});

const formatTropicalPoint = (degreeWithinSignDeg: number, signNamePtBr: string): string =>
  `${formatDegreeDmsTruncated(degreeWithinSignDeg)} de ${signNamePtBr}`;

const positionalWarning = (result: DadosPosicionaisV2ParseResult): string =>
  result.status === 'invalid'
    ? `Dados posicionais v2 indisponíveis (${result.reason}). ${LEGACY_TIME_WARNING}`
    : LEGACY_TIME_WARNING;

const renderFalangeText = (dados: DadosPosicionaisV2): string => {
  const angelById = new Map(
    dados.positions.map((position) => [position.angelicQuinary.angel.id, position.angelicQuinary.angel]),
  );
  return dados.aggregates.angelicFalange
    .map((group) => {
      const angel = angelById.get(group.angelId);
      const members = group.memberBodyIds.map((bodyId) => PLANET_LABEL_BY_ID[bodyId]).join(', ');
      return `  • Anjo #${group.angelId}${angel ? ` ${angel.canonicalName}` : ''}: ${members} (${group.occurrenceCount})`;
    })
    .join('\n');
};

const renderPositionalText = (dados: DadosPosicionaisV2): string => {
  const rulingPosition = deriveConsultantRulingAngel(dados);
  const rulingAngel = rulingPosition.angelicQuinary.angel;
  let text = '*🪐 POSIÇÕES PLANETÁRIAS E CORRESPONDÊNCIAS ANGÉLICAS*\n\n';
  text += '*☀️ ANJO REGENTE DO CONSULENTE*\n';
  text += `  • Anjo #${rulingAngel.id}: ${rulingAngel.canonicalName} (${rulingAngel.hebrewTriplet}) — ${rulingAngel.choir}; príncipe ${rulingAngel.prince}\n`;
  text += `  • ${rulingAngel.qualitySummaryPtBr}\n`;
  text += '  • Critério: quinário tropical da posição do Sol\n\n';
  for (const position of dados.positions) {
    const angel = position.angelicQuinary.angel;
    text += `  • ${position.symbol} ${PLANET_LABEL_BY_ID[position.bodyId]}: ${formatTropicalPosition(position)} | Constelação IAU: ${formatIauConstellation(position)} | ${formatPlacidusHouse(position)}\n`;
    text += `    Anjo #${angel.id}: ${angel.canonicalName} (${angel.hebrewTriplet}) — ${angel.choir}; príncipe ${angel.prince}\n`;
  }

  text += '\n*Falange angélica (dez planetas):*\n';
  text += `${renderFalangeText(dados)}\n`;

  text += '\n*🏛️ CÚSPIDES DAS 12 CASAS PLACIDUS*\n';
  if (dados.houses.status === 'available') {
    for (const cusp of dados.houses.cusps) {
      text += `  • Casa ${cusp.houseIndex1}: ${formatTropicalPoint(cusp.tropical.degreeWithinSignDeg, cusp.tropical.signNamePtBr)}\n`;
    }
  } else {
    text += '  • Cúspides indisponíveis para este mapa.\n';
  }

  text += '\n*📐 ÂNGULOS DO MAPA*\n';
  if (dados.angles.length > 0) {
    for (const angle of dados.angles) {
      text += `  • ${angle.displayNamePtBr}: ${formatTropicalPoint(angle.tropical.degreeWithinSignDeg, angle.tropical.signNamePtBr)}\n`;
    }
  } else {
    text += '  • Ângulos indisponíveis para este mapa.\n';
  }

  text += '\n*Proveniência e política temporal:*\n';
  text += `  • Versão do contrato posicional: ${dados.schemaVersion}\n`;
  text += `  • Calculado em ${formatInstantInBrasilia(dados.calculatedAtUtc)} — ${dados.presentationPolicy.timeZoneLabel}\n`;
  text += `  • Nascimento em ${formatInstantInBrasilia(dados.birthContext.timeResolution.instantUtc)} — ${dados.presentationPolicy.timeZoneLabel}\n`;
  text += `  • Efemérides: Astronomy Engine ${dados.models.ephemeris.engineVersion}; SHA-256 ${dados.models.ephemeris.sourceSha256}\n`;
  text += `  • Casas: Swiss Ephemeris ${dados.models.houses.engineVersion}, Placidus; WASM SHA-256 ${dados.models.houses.runtimeWasmSha256}\n`;
  text += `  • Base das constelações IAU: SHA-256 ${dados.models.astronomicalReal.boundaryDatasetSha256}\n`;
  text += `  • Catálogo dos 72 anjos: versão ${dados.catalogs.angelic72.catalogVersion}; SHA-256 ${dados.catalogs.angelic72.catalogSha256}\n`;
  return text;
};

const renderPositionalHtml = (dados: DadosPosicionaisV2, boxShadow: string): string => {
  const rulingPosition = deriveConsultantRulingAngel(dados);
  const rulingAngel = rulingPosition.angelicQuinary.angel;
  const rows = dados.positions
    .map((position) => {
      const angel = position.angelicQuinary.angel;
      const planetColor = PLANET_EMAIL_COLOR_BY_ID[position.bodyId];
      return `
        <tr>
          <th scope="row" style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top;"><span style="display: inline-block; min-width: 1.35em; font-size: 24px; line-height: 1; color: ${planetColor};">${escapeHtml(position.symbol)}</span> ${escapeHtml(PLANET_LABEL_BY_ID[position.bodyId])}</th>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">${escapeHtml(formatTropicalPosition(position))}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">${escapeHtml(formatIauConstellation(position))}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">${escapeHtml(formatPlacidusHouse(position))}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top;">
            <strong>#${angel.id} ${escapeHtml(angel.canonicalName)}</strong>
            <bdi lang="he" dir="rtl">${escapeHtml(angel.hebrewTriplet)}</bdi><br>
            <span style="font-size: 12px; color: #475569;">${escapeHtml(angel.choir)} · príncipe ${escapeHtml(angel.prince)}</span><br>
            <span style="font-size: 12px; color: #64748b;">${escapeHtml(angel.qualitySummaryPtBr)}</span>
          </td>
        </tr>`;
    })
    .join('');

  const angelById = new Map(
    dados.positions.map((position) => [position.angelicQuinary.angel.id, position.angelicQuinary.angel]),
  );
  const positionById = new Map(dados.positions.map((position) => [position.bodyId, position]));
  const falange = dados.aggregates.angelicFalange
    .map((group) => {
      const angel = angelById.get(group.angelId);
      const members = group.memberBodyIds
        .map((bodyId) => {
          const position = positionById.get(bodyId);
          return `<span style="display: inline-block; margin: 3px 4px 3px 0; padding: 5px 9px; border: 1px solid #e2e8f0; border-radius: 999px; background-color: #ffffff; color: #334155; font-size: 12px; font-weight: 700;"><span style="display: inline-block; margin-right: 4px; font-size: 18px; line-height: 1; color: ${PLANET_EMAIL_COLOR_BY_ID[bodyId]};">${escapeHtml(position?.symbol ?? '✦')}</span>${escapeHtml(PLANET_LABEL_BY_ID[bodyId])}</span>`;
        })
        .join('');
      return `<li style="margin: 0 0 10px 0; padding: 12px; border: 1px solid #ddd6fe; border-radius: 12px; background-color: #faf8ff;"><strong style="display: block; margin-bottom: 5px; color: #4c1d95;">#${group.angelId}${angel ? ` ${escapeHtml(angel.canonicalName)}` : ''}</strong><div>${members}</div><span style="font-size: 11px; color: #64748b;">${group.occurrenceCount} ${group.occurrenceCount === 1 ? 'planeta' : 'planetas'}</span></li>`;
    })
    .join('');

  const cusps =
    dados.houses.status === 'available'
      ? dados.houses.cusps
          .map(
            (cusp) =>
              `<li style="padding: 9px 11px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;"><strong style="color: #334155;">Casa ${cusp.houseIndex1}</strong><br><span style="font-size: 12px; color: #64748b;">${escapeHtml(formatTropicalPoint(cusp.tropical.degreeWithinSignDeg, cusp.tropical.signNamePtBr))}</span></li>`,
          )
          .join('')
      : '<li style="color: #64748b;">Cúspides indisponíveis para este mapa.</li>';

  const angles =
    dados.angles.length > 0
      ? dados.angles
          .map(
            (angle) =>
              `<li style="padding: 12px; border: 1px solid #bfdbfe; border-radius: 12px; background-color: #eff6ff;"><strong style="color: #1e3a8a;">${escapeHtml(angle.displayNamePtBr)}</strong><br><span style="font-size: 12px; color: #475569;">${escapeHtml(formatTropicalPoint(angle.tropical.degreeWithinSignDeg, angle.tropical.signNamePtBr))}</span></li>`,
          )
          .join('')
      : '<li style="color: #64748b;">Ângulos indisponíveis para este mapa.</li>';

  return `
    <section style="margin-top: 60px; padding: 32px; background-color: rgba(255, 255, 255, 0.85); border-radius: 24px; border: 1px solid #cbd5e1; ${boxShadow}">
      <h2 style="font-size: 26px; color: #334155; margin: 0 0 12px 0;">🪐 Posições planetárias e correspondências angélicas</h2>
      <p style="font-size: 13px; color: #475569; margin: 0 0 20px 0;">A constelação IAU é uma região bidimensional do céu; por isso, este relatório não atribui grau interno à constelação.</p>
      <section aria-label="Anjo regente do consulente" style="display: flex; gap: 18px; align-items: center; margin: 22px 0; padding: 22px; color: #312e81; background: linear-gradient(135deg, #fffbeb, #eef2ff); border: 1px solid #fbbf24; border-radius: 18px;">
        <span style="font-size: 46px; line-height: 1; color: #f59e0b;">☉</span>
        <div>
          <p style="margin: 0 0 5px; color: #92400e; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Anjo regente do consulente</p>
          <p style="margin: 0 0 5px; font-size: 22px; font-weight: 900;">#${rulingAngel.id} ${escapeHtml(rulingAngel.canonicalName)} <bdi lang="he" dir="rtl">${escapeHtml(rulingAngel.hebrewTriplet)}</bdi></p>
          <p style="margin: 0 0 4px; font-size: 13px;">${escapeHtml(rulingAngel.choir)} · príncipe ${escapeHtml(rulingAngel.prince)}</p>
          <p style="margin: 0 0 8px; font-size: 13px; color: #475569;">${escapeHtml(rulingAngel.qualitySummaryPtBr)}</p>
          <p style="margin: 0; font-size: 11px; font-weight: 700; color: #6d28d9;">Quinário tropical da posição do Sol</p>
        </div>
      </section>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #e2e8f0;">
              <th scope="col" style="padding: 10px; text-align: left;">Planeta</th>
              <th scope="col" style="padding: 10px; text-align: left;">Tropical</th>
              <th scope="col" style="padding: 10px; text-align: left;">Constelação IAU</th>
              <th scope="col" style="padding: 10px; text-align: left;">Casa</th>
              <th scope="col" style="padding: 10px; text-align: left;">Anjo do quinário tropical</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <h3 style="font-size: 18px; color: #334155; margin: 28px 0 8px 0;">Falange angélica dos dez planetas</h3>
      <ul style="margin: 0; padding: 0; color: #334155; line-height: 1.6; list-style: none;">${falange}</ul>
      <h3 style="font-size: 18px; color: #334155; margin: 28px 0 8px 0;">Cúspides das 12 Casas Placidus</h3>
      <ul style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 0; padding: 0; list-style: none;">${cusps}</ul>
      <h3 style="font-size: 18px; color: #334155; margin: 28px 0 8px 0;">Ângulos do mapa</h3>
      <ul style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin: 0; padding: 0; list-style: none;">${angles}</ul>
      <h3 style="font-size: 18px; color: #334155; margin: 28px 0 8px 0;">Proveniência e política temporal</h3>
      <ul style="font-size: 12px; color: #475569; line-height: 1.6; overflow-wrap: anywhere;">
        <li>Versão do contrato posicional: ${escapeHtml(dados.schemaVersion)}</li>
        <li>Calculado em ${escapeHtml(formatInstantInBrasilia(dados.calculatedAtUtc))} — ${escapeHtml(dados.presentationPolicy.timeZoneLabel)}</li>
        <li>Nascimento em ${escapeHtml(formatInstantInBrasilia(dados.birthContext.timeResolution.instantUtc))} — ${escapeHtml(dados.presentationPolicy.timeZoneLabel)}</li>
        <li>Efemérides: Astronomy Engine ${escapeHtml(dados.models.ephemeris.engineVersion)}; SHA-256 ${escapeHtml(dados.models.ephemeris.sourceSha256)}</li>
        <li>Casas: Swiss Ephemeris ${escapeHtml(dados.models.houses.engineVersion)}, Placidus; WASM SHA-256 ${escapeHtml(dados.models.houses.runtimeWasmSha256)}</li>
        <li>Base das constelações IAU: SHA-256 ${escapeHtml(dados.models.astronomicalReal.boundaryDatasetSha256)}</li>
        <li>Catálogo dos 72 anjos: versão ${escapeHtml(dados.catalogs.angelic72.catalogVersion)}; SHA-256 ${escapeHtml(dados.catalogs.angelic72.catalogSha256)}</li>
      </ul>
    </section>`;
};

// ─── Text Report (WhatsApp-style) ────────────────────────────────

function gerarTextoRelatorio(
  mapa: MapaDetalhado,
  globais: DadosGlobais | null,
  tropical: DadosSistema | null,
  astronomica: DadosSistema | null,
  analiseIa: string | null,
  positional: DadosPosicionaisV2ParseResult,
): string {
  const divider = `\n${'─'.repeat(28)}\n`;

  let t = `*🌌 DIAGNÓSTICO ASTROLÓGICO E ESOTÉRICO 🌌*\n\n`;
  t += `*Consulente:* ${mapa.nome}\n`;
  if (mapa.local_nascimento) t += `*Local:* ${mapa.local_nascimento}\n`;
  if (positional.status === 'available') {
    t += `*Nascimento — Hora oficial de Brasília:* ${formatInstantInBrasilia(positional.data.birthContext.timeResolution.instantUtc)}\n`;
  } else if (mapa.data_nascimento) {
    t += `*Data de nascimento informada — mapa legado:* ${formatarData(mapa.data_nascimento)}\n`;
  }

  if (globais) {
    t += divider;
    t += `*🌬️ FORÇAS GLOBAIS*\n\n`;
    t += `*Tatwas:*\n`;
    t += `  • Principal: *${globais.tatwa.principal}*\n`;
    t += `  • Sub-tatwa: *${globais.tatwa.sub}*\n\n`;
    t += `*Numerologia:*\n`;
    t += `  • Expressão: *${globais.numerologia.expressao}*\n`;
    t += `  • Caminho da Vida: *${globais.numerologia.caminhoVida}*\n`;
    t += `  • Vibração da Hora: *${globais.numerologia.vibracaoHora}*\n`;
  }

  const blocoTexto = (dados: DadosSistema): string => {
    let texto = `\n*Astrologia:*\n`;
    if (dados.astrologia[0]) texto += `  • ☀️ Sol: *${dados.astrologia[0].signo}*\n`;
    if (dados.astrologia[1]) texto += `  • ⬆️ Ascendente: *${dados.astrologia[1].signo}*\n`;
    if (dados.astrologia[2]) texto += `  • 🌙 Lua: *${dados.astrologia[2].signo}*\n`;
    if (dados.astrologia[3]) texto += `  • 🔭 Meio do Céu: *${dados.astrologia[3].signo}*\n\n`;
    texto += `*Umbanda:*\n`;
    if (dados.umbanda[0]) texto += `  • 👑 Coroa (Orixá Ancestral): *${dados.umbanda[0].orixa}*\n`;
    if (dados.umbanda[1]) texto += `  • 🌊 Adjuntó (Orixá de Frente): *${dados.umbanda[1].orixa}*\n`;
    if (dados.umbanda[2]) texto += `  • 🏹 Frente (Orixá de Trabalho): *${dados.umbanda[2].orixa}*\n`;
    if (dados.umbanda[3]) texto += `  • 🌟 Decanato (Regente Secundário): *${dados.umbanda[3].orixa}*\n`;
    if (dados.umbanda[4]) texto += `  • ⏳ Faixa Horária (Regente da Hora): *${dados.umbanda[4].orixa}*\n`;
    if (dados.umbanda[5])
      texto += `  • 🪐 ${formatPosicaoLabel(dados.umbanda[5].posicao)}: *${dados.umbanda[5].orixa}*\n`;
    return texto;
  };

  if (tropical) {
    t += divider;
    t += `*🌞 MÓDULO I: ASTROLÓGICO TROPICAL (A PERSONA)*\n`;
    t += blocoTexto(tropical);
  }

  t += divider;
  t += `*✨ AGORA, A VERDADE OCULTA... ✨*\n\n`;
  t += `_O módulo tropical acima revelou a sua máscara terrena (Persona). Desfaça a ilusão sazonal e contemple abaixo a sua *verdadeira assinatura estelar*._\n`;

  if (astronomica) {
    t += divider;
    t += `*⭐ MÓDULO II: ASTRONÔMICO CONSTELACIONAL (A ALMA)*\n`;
    t += blocoTexto(astronomica);
  }

  if (analiseIa) {
    const iaTxt = htmlToPlainText(analiseIa);

    t += divider;
    t += `*🧠 SÍNTESE DO MESTRE (IA)*\n\n${iaTxt.replace(/\n{3,}/g, '\n\n').trim()}\n`;
  }

  t += divider;
  if (positional.status === 'available') {
    t += renderPositionalText(positional.data);
  } else {
    t += `*⚠️ DADOS POSICIONAIS V2 INDISPONÍVEIS*\n\n${positionalWarning(positional)}\n`;
  }

  t += divider;
  t += `✨ _Gerado via Oráculo Celestial — Admin LCV_ ✨`;
  return t;
}

// ─── HTML Report (rich email with inline styles) ─────────────────

function gerarHtmlRelatorio(
  mapa: MapaDetalhado,
  globais: DadosGlobais | null,
  tropical: DadosSistema | null,
  astronomica: DadosSistema | null,
  analiseIa: string | null,
  positional: DadosPosicionaisV2ParseResult,
): string {
  const fontFamily =
    "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;";
  const boxShadow = 'box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.05);';

  // Astrologia grid cards
  const blocoAstrologiaHtml = (dados: AstroData[]) =>
    dados
      .map(
        (a) => `
    <div style="background-color: #ffffff; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; ${boxShadow} text-align: left;">
      <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">${a.astro}</p>
      <p style="font-size: 15px; color: #1e293b; margin: 0; font-weight: bold;">${a.simbolo} ${a.signo}</p>
    </div>
  `,
      )
      .join('');

  // Umbanda grid cards
  const blocoUmbandaHtml = (dados: UmbandaData[], isTropical: boolean) => {
    const color = isTropical ? '#e37400' : '#1a73e8';
    const bgColor = isTropical ? 'rgba(251, 146, 60, 0.1)' : 'rgba(99, 102, 241, 0.1)';
    const borderColor = isTropical ? '#fed7aa' : '#c7d2fe';

    return dados
      .map(
        (u) => `
      <div style="background-color: #ffffff; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; ${boxShadow} display: flex; flex-direction: column; align-items: center; justify-content: space-between; height: 100%; text-align: center;">
        <span style="font-size: 32px; margin-bottom: 8px;">${u.simbolo}</span>
        <p style="font-size: 10px; color: #64748b; margin: 0 0 8px 0; font-weight: bold; text-transform: uppercase; line-height: 1.2;">${formatPosicaoLabel(u.posicao)}</p>
        <div style="background-color: ${bgColor}; color: ${color}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 8px 4px; width: 100%; margin-top: auto;">
          <p style="margin: 0; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${u.orixa}</p>
        </div>
      </div>
    `,
      )
      .join('');
  };

  // Section block (Tropical or Astronômico)
  const renderBlocoAstrologicoEmail = (
    titulo: string,
    dadosAstrologia: AstroData[],
    dadosUmbanda: UmbandaData[],
    isTropical: boolean,
  ) => {
    const titleColor = isTropical ? '#f9ab00' : '#1967d2';
    const borderTopColor = isTropical ? '#fdd663' : '#1a73e8';
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
    `;
  };

  // Sanitize IA analysis for email
  const analiseSanitizada = analiseIa ? sanitizeForEmail(analiseIa) : '';

  const nascimentoApresentado =
    positional.status === 'available'
      ? formatInstantInBrasilia(positional.data.birthContext.timeResolution.instantUtc)
      : mapa.data_nascimento
        ? formatarData(mapa.data_nascimento)
        : '';
  const nascimentoLabel =
    positional.status === 'available'
      ? 'Nascimento — Hora oficial de Brasília'
      : 'Data de nascimento informada — mapa legado';

  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
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
        <h2 style="font-size: 24px; font-weight: 800; color: #1e293b; margin: 0 0 8px 0;">${escapeHtml(mapa.nome)}</h2>
        ${mapa.local_nascimento ? `<p style="font-size: 16px; color: #475569; margin: 0;">${escapeHtml(mapa.local_nascimento)}</p>` : ''}
        ${nascimentoApresentado ? `<p style="font-size: 12px; color: #64748b; margin: 10px 0 2px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;">${escapeHtml(nascimentoLabel)}</p><p style="font-size: 16px; color: #475569; margin: 0;">${escapeHtml(nascimentoApresentado)}</p>` : ''}
      </div>

      ${
        globais
          ? `
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
      `
          : ''
      }

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

      ${
        analiseSanitizada
          ? `
      <div style="margin-top: 60px; padding: 40px; background-color: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); border-radius: 24px; border: 1px solid #ffffff; ${boxShadow}">
        <h3 style="font-size: 28px; font-weight: 900; color: transparent; background-clip: text; -webkit-background-clip: text; background-image: linear-gradient(to right, #4285f4, #1a73e8); margin: 0 0 24px 0; padding-bottom: 16px; border-bottom: 1px solid #dadce0;">🧠 Síntese do Mestre (IA)</h3>
        <div style="font-size: 16px; line-height: 1.7; color: #334155;">${analiseSanitizada}</div>
      </div>
      `
          : ''
      }

      ${
        positional.status === 'available'
          ? renderPositionalHtml(positional.data, boxShadow)
          : `
      <section style="margin-top: 60px; padding: 24px; background-color: #fff7ed; border-radius: 16px; border: 1px solid #fdba74; ${boxShadow}">
        <h2 style="font-size: 20px; color: #9a3412; margin: 0 0 8px 0;">⚠️ Dados posicionais v2 indisponíveis</h2>
        <p style="font-size: 14px; color: #7c2d12; margin: 0;">${escapeHtml(positionalWarning(positional))}</p>
      </section>`
      }

      <footer style="text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid #dde4ee;">
        <p style="font-size: 12px; color: #64748b; margin: 0;">Gerado via Oráculo Celestial — Admin LCV</p>
      </footer>

    </div>
  </body>
  </html>
  `;
  return html;
}

// ─── Public API ───────────────────────────────────────────────────

export function generateAstrologicalReport(mapa: MapaDetalhado): GeneratedReport {
  const globais = safeParseJson<DadosGlobais>(mapa.dados_globais);
  const tropical = safeParseJson<DadosSistema>(mapa.dados_tropical);
  const astronomica = safeParseJson<DadosSistema>(mapa.dados_astronomica);
  const positional = parseDadosPosicionaisV2(mapa.dados_posicionais_v2 ?? mapa.dadosPosicionaisV2, mapa.id);

  const htmlContent = gerarHtmlRelatorio(mapa, globais, tropical, astronomica, mapa.analise_ia, positional);
  const textContent = gerarTextoRelatorio(mapa, globais, tropical, astronomica, mapa.analise_ia, positional);

  // Summary from AI or fallback
  let summary: string;
  if (mapa.analise_ia) {
    summary = (htmlToPlainText(mapa.analise_ia).split('.')[0] ?? '').trim();
  } else {
    summary = `Mapa astrológico de ${mapa.nome}`;
  }

  return { html: htmlContent, text: textContent, summary };
}
