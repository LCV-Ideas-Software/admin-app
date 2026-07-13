/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const INTERNAL_ANALYSIS_MARKER_UNICODE = /⟦ASTROLOGO_PAYLOAD:[A-Za-z0-9._:-]{1,128}:[0-9a-f]{64}⟧/giu;
const INTERNAL_ANALYSIS_MARKER_ENTITY =
  /(?:&#10214;|&#x0*27e6;)ASTROLOGO_PAYLOAD:[A-Za-z0-9._:-]{1,128}:[0-9a-f]{64}(?:&#10215;|&#x0*27e7;)/giu;
const OBSOLETE_POSITIONAL_FALLBACK = /Dados posicionais v2 indisponíveis para este mapa legado\.?/giu;
const INTERNAL_ANALYSIS_DETAIL =
  /(?:\b(?:schema(?:Id|Version)?|profile(?:Id|Version)?|calculationId|payload(?:Sha256)?|sourceRef|methodId|targetSetId|latitudeDeg|longitudeDeg)\b|vers[aã]o do contrato|contrato posicional|perfil (?:metodol[oó]gico|versionado)|dados (?:posicionais v\d+|can[oô]nicos)|\b(?:EQJ|EQD|GAST|J2000|WASM|D1)\b|SHA-?256|Astronomy Engine|Swiss Ephemeris|Cloudflare|Wrangler|\b(?:modelo|provedor|SDK) (?:Gemini|Claude)\b|\b(?:Gemini|Claude) (?:API|SDK|modelo)\b|\b(?:endpoint|worker)\b|urn:astrologo|astrologo-[a-z0-9.-]+-v\d+|DADOS_[A-Z0-9_]+)/iu;

export const stripInternalDetailBlocksWithoutDom = (input: string): string => {
  const blockPattern = /<(p|li|h[1-6])\b[^>]*>[\s\S]*?<\/\1\s*>/giu;
  if (!/<(?:p|li|h[1-6])\b/iu.test(input)) {
    return input
      .split('\n')
      .filter((line) => !INTERNAL_ANALYSIS_DETAIL.test(line))
      .join('\n');
  }

  let result = '';
  let cursor = 0;
  for (const match of input.matchAll(blockPattern)) {
    const index = match.index ?? cursor;
    const outside = input.slice(cursor, index);
    if (!INTERNAL_ANALYSIS_DETAIL.test(outside)) result += outside;
    if (!INTERNAL_ANALYSIS_DETAIL.test(match[0])) result += match[0];
    cursor = index + match[0].length;
  }
  const tail = input.slice(cursor);
  if (!INTERNAL_ANALYSIS_DETAIL.test(tail)) result += tail;
  return result;
};

const stripInternalDetailBlocks = (input: string): string => {
  if (typeof DOMParser === 'undefined' || !/<(?:p|li|h[1-6])\b/iu.test(input)) {
    return stripInternalDetailBlocksWithoutDom(input);
  }

  const parsed = new DOMParser().parseFromString(input, 'text/html');
  for (const node of parsed.body.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6')) {
    if (INTERNAL_ANALYSIS_DETAIL.test(node.textContent ?? '')) node.remove();
  }
  return parsed.body.innerHTML;
};

/** Remove sentinelas e blocos internos da análise, inclusive em registros históricos. */
export const stripInternalAnalysisMarkers = (input: string): string =>
  stripInternalDetailBlocks(
    String(input ?? '')
      .replace(INTERNAL_ANALYSIS_MARKER_UNICODE, '')
      .replace(INTERNAL_ANALYSIS_MARKER_ENTITY, '')
      .replace(OBSOLETE_POSITIONAL_FALLBACK, ''),
  );
