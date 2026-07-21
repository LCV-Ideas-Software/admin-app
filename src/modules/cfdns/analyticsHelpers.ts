/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Transforms puros do report de análises DNS da Cloudflare (DNS-4) para as
 * séries/barras dos gráficos SVG compartilhados. O shape da CF em `bytime` é
 * matricial (data[i].metrics = métrica × intervalos), por isso a transformação
 * vive aqui, isolada e testável, e não no componente.
 */

import type { DnsAnalyticsReport } from './types';

export type AnalyticsPoint = {
  t: number;
  v: number;
};

export type AnalyticsSeries = {
  label: string;
  points: AnalyticsPoint[];
};

export type BytimeTransform = {
  /** Soma de queryCount por intervalo (todas as linhas/responseCodes). */
  total: AnalyticsPoint[];
  /** Top-3 responseCodes por volume, como séries separadas. */
  byResponseCode: AnalyticsSeries[];
  totals: {
    queryCount: number;
    uncachedCount: number;
    staleCount: number;
  };
};

export type TopItem = {
  label: string;
  value: number;
};

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Índice da métrica dentro de data[i].metrics, resolvido pelo eco de
// query.metrics do report (fallback: ordem pedida pelo backend).
const resolveMetricIndex = (report: DnsAnalyticsReport, metric: string, fallbackIndex: number) => {
  const metrics = report.query?.metrics;
  if (Array.isArray(metrics)) {
    const index = metrics.indexOf(metric);
    if (index >= 0) {
      return index;
    }
  }
  return fallbackIndex;
};

const toIntervalTimestamps = (report: DnsAnalyticsReport): number[] =>
  (Array.isArray(report.time_intervals) ? report.time_intervals : []).map((interval) =>
    Date.parse(String(interval?.[0] ?? '')),
  );

export const transformBytimeReport = (report?: DnsAnalyticsReport | null): BytimeTransform => {
  const empty: BytimeTransform = {
    total: [],
    byResponseCode: [],
    totals: { queryCount: 0, uncachedCount: 0, staleCount: 0 },
  };
  if (!report) {
    return empty;
  }

  const timestamps = toIntervalTimestamps(report);
  const queryCountIndex = resolveMetricIndex(report, 'queryCount', 0);

  type Row = { label: string; perInterval: number[]; sum: number };
  const rows: Row[] = [];
  for (const entry of Array.isArray(report.data) ? report.data : []) {
    const metricRow = entry?.metrics?.[queryCountIndex];
    const perInterval = (Array.isArray(metricRow) ? metricRow : []).map(toFiniteNumber);
    const label = String(entry?.dimensions?.[0] ?? '').trim() || '—';
    rows.push({
      label,
      perInterval,
      sum: perInterval.reduce((accumulator, value) => accumulator + value, 0),
    });
  }

  const total: AnalyticsPoint[] = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const timestamp = timestamps[index];
    if (timestamp == null || Number.isNaN(timestamp)) {
      continue;
    }
    total.push({
      t: timestamp,
      v: rows.reduce((accumulator, row) => accumulator + toFiniteNumber(row.perInterval[index]), 0),
    });
  }

  const byResponseCode: AnalyticsSeries[] = [...rows]
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 3)
    .map((row) => ({
      label: row.label,
      points: timestamps
        .map((timestamp, index) => ({ t: timestamp, v: toFiniteNumber(row.perInterval[index]) }))
        .filter((point) => !Number.isNaN(point.t)),
    }));

  const summedQueryCount = rows.reduce((accumulator, row) => accumulator + row.sum, 0);
  const totals = {
    queryCount: report.totals?.queryCount != null ? toFiniteNumber(report.totals.queryCount) : summedQueryCount,
    uncachedCount: toFiniteNumber(report.totals?.uncachedCount),
    staleCount: toFiniteNumber(report.totals?.staleCount),
  };

  return { total, byResponseCode, totals };
};

export const transformTopReport = (report?: DnsAnalyticsReport | null): TopItem[] => {
  if (!report) {
    return [];
  }

  const queryCountIndex = resolveMetricIndex(report, 'queryCount', 0);

  return (Array.isArray(report.data) ? report.data : [])
    .map((entry) => {
      const metric = entry?.metrics?.[queryCountIndex];
      return {
        label: String(entry?.dimensions?.[0] ?? '').trim() || '—',
        value: toFiniteNumber(Array.isArray(metric) ? metric[0] : metric),
      };
    })
    .sort((a, b) => b.value - a.value);
};

/** Percentual 0–100 formatado pt-BR (1 casa); '—' quando não há denominador. */
export const toPercentLabel = (numerator: number, denominator: number) => {
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return '—';
  }
  return `${((numerator / denominator) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
};
