/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const INTERNAL_ANALYSIS_MARKER_UNICODE = /⟦ASTROLOGO_PAYLOAD:[A-Za-z0-9._:-]{1,128}:[0-9a-f]{64}⟧/giu;
const INTERNAL_ANALYSIS_MARKER_ENTITY =
  /(?:&#10214;|&#x0*27e6;)ASTROLOGO_PAYLOAD:[A-Za-z0-9._:-]{1,128}:[0-9a-f]{64}(?:&#10215;|&#x0*27e7;)/giu;

/** Remove exclusivamente sentinelas internas da análise, inclusive em registros históricos. */
export const stripInternalAnalysisMarkers = (input: string): string =>
  String(input ?? '')
    .replace(INTERNAL_ANALYSIS_MARKER_UNICODE, '')
    .replace(INTERNAL_ANALYSIS_MARKER_ENTITY, '');
