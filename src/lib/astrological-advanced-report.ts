import { type LocalityMapV1ParseResult, localityAvailabilityPtBr } from './astrological-locality-map-v1';
import { formatDegreeDmsTruncated, formatInstantInBrasilia, PLANET_LABEL_BY_ID } from './astrological-position-v2';
import {
  type SynastryRunV1ParseResult,
  type SynastrySubjectNames,
  synastryPlanetNamePtBr,
} from './astrological-synastry-run-v1';
import {
  type TransitExactitudeV1,
  type TransitRunV1ParseResult,
  transitPhasePtBr,
} from './astrological-transit-run-v1';

const decimalFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

const escapeHtml = (value: unknown): string =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const exactitudePtBr = (exactitude: TransitExactitudeV1): string => {
  if (exactitude.status === 'available') {
    return `Exatidão comprovada em ${formatInstantInBrasilia(exactitude.exactAtUtc)}`;
  }
  if (exactitude.reasonCode === 'HORIZON_ZERO_NO_SEARCH') return 'Exatidão não pesquisada: horizonte zero.';
  if (exactitude.reasonCode === 'NO_EXACTITUDE_WITHIN_HORIZON') {
    return 'Exatidão não encontrada dentro do horizonte.';
  }
  if (exactitude.reasonCode === 'EXACT_SEARCH_UNAVAILABLE') return 'Exatidão não comprovada pelo provedor.';
  return 'Exatidão não comprovada: a resposta do provedor foi rejeitada.';
};

export const renderTransitRunText = (result: TransitRunV1ParseResult): string => {
  if (result.status === 'legacy') return '';
  if (result.status === 'invalid') {
    return '*⚠️ CÉU ATUAL INDISPONÍVEL*\n\nO artefato não passou pela validação defensiva; nenhum valor foi recalculado pelo Admin.\n';
  }
  const data = result.data;
  const transitNames = new Map(
    data.positionsAtReference.map((position) => [position.bodyId, position.displayNamePtBr]),
  );
  const natalNames = new Map(data.natalTargets.map((target) => [target.pointId, target.displayNamePtBr]));
  const lines = [
    '*🌌 CÉU ATUAL E TRÂNSITOS*',
    '',
    `*Referência:* ${formatInstantInBrasilia(data.request.referenceInstantUtc)} — ${data.presentationPolicy.timeZoneLabel}`,
    `*Horizonte:* até ${formatInstantInBrasilia(data.request.horizonEndInstantUtc)} (${data.request.horizonDays} dia(s) UTC)`,
    '_Leitura simbólica; não é uma previsão inevitável de acontecimentos._',
    '_A classificação astronômica usa regiões IAU bidimensionais; grau interno em constelação não é definido._',
    '',
    '*Posições no instante de referência:*',
  ];
  for (const position of data.positionsAtReference) {
    const house =
      position.natalHousePlacement.status === 'available'
        ? `Casa natal ${position.natalHousePlacement.houseIndex1}`
        : 'Casa natal indisponível';
    const astronomicalReal =
      position.astronomicalReal.status === 'available'
        ? `constelação IAU ${position.astronomicalReal.constellation.namePtBr}, sem grau interno definido`
        : 'constelação IAU indisponível junto ao limite catalogado, sem grau interno definido';
    lines.push(
      `  • ${PLANET_LABEL_BY_ID[position.bodyId]}: ${formatDegreeDmsTruncated(position.tropical.degreeWithinSignDeg)} de ${position.tropical.signNamePtBr}; ${astronomicalReal} — ${house}`,
    );
  }
  lines.push('', '*Aspectos entre trânsitos e mapa natal:*');
  if (data.aspects.length === 0) lines.push('  • Nenhum aspecto persistido dentro do orbe de 2°.');
  for (const aspect of data.aspects) {
    lines.push(
      `  • ${transitNames.get(aspect.transitPoint.bodyId) ?? 'Planeta'} em trânsito e ${natalNames.get(aspect.natalPoint.pointId) ?? 'ponto'} natal — ${aspect.displayNamePtBr}; orbe ${decimalFormatter.format(aspect.orbDeg)}°; fase ${transitPhasePtBr(aspect.phase).toLocaleLowerCase('pt-BR')}; ${exactitudePtBr(aspect.exactitude)}`,
    );
  }
  return `${lines.join('\n')}\n`;
};

export const renderTransitRunHtml = (result: TransitRunV1ParseResult, boxShadow: string): string => {
  if (result.status === 'legacy') return '';
  if (result.status === 'invalid') {
    return `<section style="margin-top:28px;padding:24px;border:1px solid #fdba74;border-radius:18px;background:#fff7ed;${boxShadow}"><h2 style="color:#9a3412;margin:0 0 8px;">Céu atual indisponível</h2><p style="color:#7c2d12;margin:0;">O artefato não passou pela validação defensiva; nenhum valor foi recalculado pelo Admin.</p></section>`;
  }
  const data = result.data;
  const transitNames = new Map(
    data.positionsAtReference.map((position) => [position.bodyId, position.displayNamePtBr]),
  );
  const natalNames = new Map(data.natalTargets.map((target) => [target.pointId, target.displayNamePtBr]));
  const positions = data.positionsAtReference
    .map((position) => {
      const house =
        position.natalHousePlacement.status === 'available'
          ? `Casa natal ${position.natalHousePlacement.houseIndex1}`
          : 'Casa natal indisponível';
      const astronomicalReal =
        position.astronomicalReal.status === 'available'
          ? `Constelação IAU: ${position.astronomicalReal.constellation.namePtBr} — grau interno não definido`
          : 'Constelação IAU indisponível junto ao limite catalogado — grau interno não definido';
      return `<li style="padding:10px;border:1px solid #bae6fd;border-radius:12px;list-style:none;background:#f8fafc;"><strong>${escapeHtml(position.symbol)} ${escapeHtml(PLANET_LABEL_BY_ID[position.bodyId])}</strong><br><span style="font-size:13px;color:#475569;">${escapeHtml(formatDegreeDmsTruncated(position.tropical.degreeWithinSignDeg))} de ${escapeHtml(position.tropical.signNamePtBr)} · ${escapeHtml(house)}</span><br><span style="font-size:12px;color:#64748b;">${escapeHtml(astronomicalReal)}</span></li>`;
    })
    .join('');
  const aspects = data.aspects.length
    ? data.aspects
        .map(
          (aspect) =>
            `<tr><th scope="row" style="padding:9px;text-align:left;border-bottom:1px solid #e2e8f0;">${escapeHtml(transitNames.get(aspect.transitPoint.bodyId) ?? 'Planeta')} em trânsito e ${escapeHtml(natalNames.get(aspect.natalPoint.pointId) ?? 'ponto')} natal</th><td style="padding:9px;border-bottom:1px solid #e2e8f0;">${escapeHtml(aspect.displayNamePtBr)}</td><td style="padding:9px;border-bottom:1px solid #e2e8f0;">${escapeHtml(decimalFormatter.format(aspect.orbDeg))}°</td><td style="padding:9px;border-bottom:1px solid #e2e8f0;">${escapeHtml(transitPhasePtBr(aspect.phase))}</td><td style="padding:9px;border-bottom:1px solid #e2e8f0;">${escapeHtml(exactitudePtBr(aspect.exactitude))}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="5" style="padding:10px;">Nenhum aspecto persistido dentro do orbe de 2°.</td></tr>';
  return `<section style="margin-top:28px;padding:28px;border:1px solid #bae6fd;border-radius:22px;background:#f0f9ff;${boxShadow}">
    <h2 style="font-size:23px;color:#075985;margin:0 0 8px;">🌌 Céu atual e trânsitos</h2>
    <p style="font-size:13px;color:#475569;margin:0 0 4px;"><strong>Referência:</strong> ${escapeHtml(formatInstantInBrasilia(data.request.referenceInstantUtc))} — ${escapeHtml(data.presentationPolicy.timeZoneLabel)}</p>
    <p style="font-size:12px;color:#64748b;margin:0 0 6px;">Horizonte até ${escapeHtml(formatInstantInBrasilia(data.request.horizonEndInstantUtc))}. Leitura simbólica; não é uma previsão inevitável.</p>
    <p style="font-size:12px;color:#64748b;margin:0 0 16px;">Constelações IAU são regiões bidimensionais; grau interno não é definido.</p>
    <h3 style="color:#0369a1;">Posições no instante de referência</h3><ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;padding:0;">${positions}</ul>
    <h3 style="color:#6d28d9;margin-top:22px;">Aspectos entre trânsitos e mapa natal</h3><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#e0f2fe;"><th style="padding:9px;text-align:left;">Relação</th><th style="padding:9px;text-align:left;">Aspecto</th><th style="padding:9px;text-align:left;">Orbe</th><th style="padding:9px;text-align:left;">Fase</th><th style="padding:9px;text-align:left;">Exatidão</th></tr></thead><tbody>${aspects}</tbody></table></div>
  </section>`;
};

const overlayText = (body: string, source: string, target: string, house?: number): string =>
  house === undefined
    ? `${body} de ${source}: casas de ${target} indisponíveis`
    : `${body} de ${source} na Casa ${house} de ${target}`;

export const renderSynastryRunText = (result: SynastryRunV1ParseResult, subjects: SynastrySubjectNames): string => {
  if (result.status === 'legacy') return '';
  if (result.status === 'invalid') {
    return '*⚠️ SINASTRIA INDISPONÍVEL*\n\nO artefato não passou pela validação defensiva; nenhuma relação foi reconstruída pelo Admin.\n';
  }
  const data = result.data;
  const lines = [
    '*💞 SINASTRIA*',
    '',
    `*Pessoas:* ${subjects.A} e ${subjects.B}`,
    '_Leitura simbólica recíproca; não classifica as pessoas e não determina o destino da relação._',
    '',
    '*Aspectos intermapa:*',
  ];
  if (data.aspects.length === 0) lines.push('  • Nenhum aspecto persistido dentro dos orbes declarados.');
  for (const aspect of data.aspects) {
    lines.push(
      `  • ${synastryPlanetNamePtBr(aspect.pointA.bodyId)} de ${subjects.A} e ${synastryPlanetNamePtBr(aspect.pointB.bodyId)} de ${subjects.B} — ${aspect.displayNamePtBr}; separação ${decimalFormatter.format(aspect.separationDeg)}°; orbe ${decimalFormatter.format(aspect.orbDeg)}°`,
    );
  }
  lines.push('', `*${subjects.A} nas casas de ${subjects.B}:*`);
  for (const overlay of data.houseOverlays.aToB) {
    lines.push(
      `  • ${overlayText(synastryPlanetNamePtBr(overlay.sourceBodyId), subjects.A, subjects.B, overlay.placement.status === 'available' ? overlay.placement.houseIndex1 : undefined)}`,
    );
  }
  lines.push('', `*${subjects.B} nas casas de ${subjects.A}:*`);
  for (const overlay of data.houseOverlays.bToA) {
    lines.push(
      `  • ${overlayText(synastryPlanetNamePtBr(overlay.sourceBodyId), subjects.B, subjects.A, overlay.placement.status === 'available' ? overlay.placement.houseIndex1 : undefined)}`,
    );
  }
  return `${lines.join('\n')}\n`;
};

export const renderSynastryRunHtml = (
  result: SynastryRunV1ParseResult,
  subjects: SynastrySubjectNames,
  boxShadow: string,
): string => {
  if (result.status === 'legacy') return '';
  if (result.status === 'invalid') {
    return `<section style="margin-top:28px;padding:24px;border:1px solid #f9a8d4;border-radius:18px;background:#fdf2f8;${boxShadow}"><h2 style="color:#9d174d;margin:0 0 8px;">Sinastria indisponível</h2><p style="color:#831843;margin:0;">O artefato não passou pela validação defensiva; nenhuma relação foi reconstruída pelo Admin.</p></section>`;
  }
  const data = result.data;
  const aspects = data.aspects.length
    ? data.aspects
        .map(
          (aspect) =>
            `<li style="margin:0 0 8px;"><strong>${escapeHtml(aspect.displayNamePtBr)}</strong> — ${escapeHtml(synastryPlanetNamePtBr(aspect.pointA.bodyId))} de ${escapeHtml(subjects.A)} e ${escapeHtml(synastryPlanetNamePtBr(aspect.pointB.bodyId))} de ${escapeHtml(subjects.B)} · separação ${escapeHtml(decimalFormatter.format(aspect.separationDeg))}° · orbe ${escapeHtml(decimalFormatter.format(aspect.orbDeg))}°</li>`,
        )
        .join('')
    : '<li>Nenhum aspecto persistido dentro dos orbes declarados.</li>';
  const aToB = data.houseOverlays.aToB
    .map((overlay) => {
      const text = overlayText(
        synastryPlanetNamePtBr(overlay.sourceBodyId),
        subjects.A,
        subjects.B,
        overlay.placement.status === 'available' ? overlay.placement.houseIndex1 : undefined,
      );
      return `<li style="margin-bottom:6px;">${escapeHtml(text)}</li>`;
    })
    .join('');
  const bToA = data.houseOverlays.bToA
    .map((overlay) => {
      const text = overlayText(
        synastryPlanetNamePtBr(overlay.sourceBodyId),
        subjects.B,
        subjects.A,
        overlay.placement.status === 'available' ? overlay.placement.houseIndex1 : undefined,
      );
      return `<li style="margin-bottom:6px;">${escapeHtml(text)}</li>`;
    })
    .join('');
  return `<section style="margin-top:28px;padding:28px;border:1px solid #fbcfe8;border-radius:22px;background:#fdf2f8;${boxShadow}">
    <h2 style="font-size:23px;color:#9d174d;margin:0 0 8px;">💞 Sinastria</h2>
    <p style="font-size:13px;color:#475569;margin:0 0 6px;"><strong>${escapeHtml(subjects.A)}</strong> e <strong>${escapeHtml(subjects.B)}</strong></p>
    <p style="font-size:12px;color:#64748b;margin:0 0 16px;">Leitura simbólica recíproca; não classifica as pessoas e não determina o destino da relação.</p>
    <h3 style="color:#be185d;">Aspectos intermapa</h3><ul style="padding-left:20px;">${aspects}</ul>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:20px;">
      <section style="padding:14px;border:1px solid #fbcfe8;border-radius:14px;background:#fff;"><h3 style="color:#9d174d;margin-top:0;">${escapeHtml(subjects.A)} nas casas de ${escapeHtml(subjects.B)}</h3><ul style="padding-left:18px;">${aToB}</ul></section>
      <section style="padding:14px;border:1px solid #fbcfe8;border-radius:14px;background:#fff;"><h3 style="color:#9d174d;margin-top:0;">${escapeHtml(subjects.B)} nas casas de ${escapeHtml(subjects.A)}</h3><ul style="padding-left:18px;">${bToA}</ul></section>
    </div>
  </section>`;
};

export const renderLocalityMapText = (result: LocalityMapV1ParseResult): string => {
  if (result.status === 'legacy') return '';
  if (result.status === 'invalid') {
    return '*⚠️ MAPA DE LOCALIDADE INDISPONÍVEL*\n\nO artefato não passou pela validação defensiva; nenhuma linha foi reconstruída pelo Admin.\n';
  }
  const data = result.data;
  const lines = [
    '*🗺️ MAPA PLANETÁRIO DE LOCALIDADE*',
    '',
    `*Instante natal:* ${formatInstantInBrasilia(data.source.birthInstantUtc)} — ${data.presentationPolicy.timeZoneLabel}`,
    `*Resolução latitudinal:* ${decimalFormatter.format(data.models.sampling.latitudeResolutionDeg)}°`,
    '*Referência equatorial:* EQJ/J2000 → EQD verdadeiro da data, com precessão e nutação explícitas.',
    '*Base cartográfica:* Natural Earth 1:110m, carregada localmente e sem tiles externos.',
    '*Horizonte geométrico:* altitude 0°, sem refração e sem elevação do observador.',
    '_Referência simbólica e exploratória: não recomenda mudança, viagem, investimento ou moradia._',
    '',
    '*Linhas planetárias:*',
  ];
  for (const line of data.lines) {
    lines.push(
      `  • ${line.bodySymbol} ${line.bodyDisplayNamePtBr} — ${line.angleDisplayNamePtBr}: ${localityAvailabilityPtBr(line)}`,
    );
  }
  return `${lines.join('\n')}\n`;
};

export const renderLocalityMapHtml = (result: LocalityMapV1ParseResult, boxShadow: string): string => {
  if (result.status === 'legacy') return '';
  if (result.status === 'invalid') {
    return `<section style="margin-top:28px;padding:24px;border:1px solid #fcd34d;border-radius:18px;background:#fffbeb;${boxShadow}"><h2 style="color:#92400e;margin:0 0 8px;">Mapa de localidade indisponível</h2><p style="color:#78350f;margin:0;">O artefato não passou pela validação defensiva; nenhuma linha foi reconstruída pelo Admin.</p></section>`;
  }
  const data = result.data;
  const lines = data.lines
    .map(
      (line) =>
        `<li style="margin:0 0 7px;"><strong>${escapeHtml(line.bodySymbol)} ${escapeHtml(line.bodyDisplayNamePtBr)} — ${escapeHtml(line.angleDisplayNamePtBr)}:</strong> ${escapeHtml(localityAvailabilityPtBr(line))}</li>`,
    )
    .join('');
  return `<section style="margin-top:28px;padding:28px;border:1px solid #fde68a;border-radius:22px;background:#fffbeb;${boxShadow}">
    <h2 style="font-size:23px;color:#92400e;margin:0 0 8px;">🗺️ Mapa planetário de localidade</h2>
    <p style="font-size:13px;color:#475569;margin:0 0 5px;"><strong>Instante natal:</strong> ${escapeHtml(formatInstantInBrasilia(data.source.birthInstantUtc))} — ${escapeHtml(data.presentationPolicy.timeZoneLabel)}</p>
    <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0 0 5px;">EQJ/J2000 transformado para EQD verdadeiro da data, com precessão e nutação. Horizonte geométrico em 0°, sem refração.</p>
    <p style="font-size:12px;line-height:1.6;color:#64748b;margin:0 0 16px;">Base cartográfica Natural Earth 1:110m, carregada localmente e sem tiles externos.</p>
    <h3 style="color:#b45309;">Linhas planetárias</h3><ul style="padding-left:20px;">${lines}</ul>
    <p style="font-size:12px;line-height:1.6;color:#881337;margin:18px 0 0;">Referência simbólica e exploratória: não recomenda mudança, viagem, investimento, moradia ou decisão de alto impacto.</p>
  </section>`;
};
