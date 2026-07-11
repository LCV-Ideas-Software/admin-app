/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type TatwaCalculationMode = 'fixed' | 'legacy-rulingFirst';
export type NormalizedTatwaCalculationMode = TatwaCalculationMode | 'unknown';
export type TatwaCalculationModeSource = 'explicit' | 'inferred-from-absence' | 'explicit-unknown';

export interface NormalizedTatwa {
  principal: string;
  sub: string;
  calculationMode: NormalizedTatwaCalculationMode;
  calculationModeSource: TatwaCalculationModeSource;
  nearMainBoundary: boolean;
  mainBoundaryMarginSec: number | null;
  subIsIndicative: boolean;
  adjacent: { principal: string; sub: string } | null;
  provenanceAvailable: boolean;
}

const TATWA_NAMES = new Set(['Akasha (Éter)', 'Vayu (Ar)', 'Tejas (Fogo)', 'Apas (Água)', 'Prithvi (Terra)']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasValidProvenance = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  if (
    typeof value.birthInstantUtc !== 'string' ||
    !Number.isFinite(Date.parse(value.birthInstantUtc)) ||
    typeof value.sunriseInstantUtc !== 'string' ||
    !Number.isFinite(Date.parse(value.sunriseInstantUtc)) ||
    typeof value.timeZoneIana !== 'string' ||
    typeof value.latitudeDeg !== 'number' ||
    !Number.isFinite(value.latitudeDeg) ||
    value.latitudeDeg < -90 ||
    value.latitudeDeg > 90 ||
    typeof value.longitudeDeg !== 'number' ||
    !Number.isFinite(value.longitudeDeg) ||
    value.longitudeDeg < -180 ||
    value.longitudeDeg > 180
  ) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: value.timeZoneIana }).format(0);
    return true;
  } catch {
    return false;
  }
};

const parseDadosGlobais = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === 'string') {
    if (value.trim() === '') return null;
    try {
      const parsed: unknown = JSON.parse(value);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return isRecord(value) ? value : null;
};

export const normalizeTatwa = (dadosGlobais: unknown): NormalizedTatwa | null => {
  const globais = parseDadosGlobais(dadosGlobais);
  if (!globais || !isRecord(globais.tatwa)) return null;

  const principal = globais.tatwa.principal;
  const sub = globais.tatwa.sub;
  if (
    typeof principal !== 'string' ||
    !TATWA_NAMES.has(principal) ||
    typeof sub !== 'string' ||
    !TATWA_NAMES.has(sub)
  ) {
    return null;
  }

  const base = {
    principal,
    sub,
  };

  if (!Object.hasOwn(globais.tatwa, 'calculationMode') && !Object.hasOwn(globais.tatwa, 'schemaVersion')) {
    return {
      ...base,
      calculationMode: 'legacy-rulingFirst',
      calculationModeSource: 'inferred-from-absence',
      nearMainBoundary: false,
      mainBoundaryMarginSec: null,
      subIsIndicative: true,
      adjacent: null,
      provenanceAvailable: false,
    };
  }

  const calculationMode = globais.tatwa.calculationMode;
  if (calculationMode === 'fixed' && globais.tatwa.schemaVersion === '2.0.0') {
    const margin = globais.tatwa.mainBoundaryMarginSec;
    const mainBoundaryMarginSec =
      Number.isSafeInteger(margin) && Number(margin) >= 0 && Number(margin) <= 720 ? Number(margin) : null;
    const nearMainBoundary = globais.tatwa.nearMainBoundary === true && mainBoundaryMarginSec !== null;
    const adjacentRaw = nearMainBoundary && isRecord(globais.tatwa.adjacentMain) ? globais.tatwa.adjacentMain : null;
    const adjacent =
      adjacentRaw &&
      (adjacentRaw.relation === 'previous' || adjacentRaw.relation === 'next') &&
      adjacentRaw.secondsToBoundary === mainBoundaryMarginSec &&
      typeof adjacentRaw.principal === 'string' &&
      TATWA_NAMES.has(adjacentRaw.principal) &&
      typeof adjacentRaw.sub === 'string' &&
      TATWA_NAMES.has(adjacentRaw.sub)
        ? { principal: adjacentRaw.principal, sub: adjacentRaw.sub }
        : null;
    return {
      ...base,
      calculationMode: 'fixed',
      calculationModeSource: 'explicit',
      nearMainBoundary,
      mainBoundaryMarginSec,
      subIsIndicative: true,
      adjacent,
      provenanceAvailable: hasValidProvenance(globais.tatwa.anchor),
    };
  }

  if (calculationMode === 'legacy-rulingFirst') {
    return {
      ...base,
      calculationMode: 'legacy-rulingFirst',
      calculationModeSource: 'explicit',
      nearMainBoundary: false,
      mainBoundaryMarginSec: null,
      subIsIndicative: true,
      adjacent: null,
      provenanceAvailable: false,
    };
  }

  return {
    ...base,
    calculationMode: 'unknown',
    calculationModeSource: 'explicit-unknown',
    nearMainBoundary: false,
    mainBoundaryMarginSec: null,
    subIsIndicative: false,
    adjacent: null,
    provenanceAvailable: false,
  };
};

export const formatTatwaCalculationModePtBr = (tatwa: NormalizedTatwa): string => {
  if (tatwa.calculationMode === 'fixed') return 'Ordem fixa — Akasha primeiro';
  if (tatwa.calculationMode === 'unknown') return 'Método de cálculo não identificado';
  return tatwa.calculationModeSource === 'inferred-from-absence'
    ? 'Registro legado — ordem pelo principal'
    : 'Ordem pelo principal — Tatwa principal primeiro';
};

export const formatTatwaDurationPtBr = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.trunc(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  if (minutes === 0) return `${remainder} s`;
  return remainder === 0 ? `${minutes} min` : `${minutes} min ${remainder} s`;
};
