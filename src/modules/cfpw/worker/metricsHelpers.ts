/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Helpers puros da aba Métricas (PW-2): conversão da série GraphQL Analytics
 * normalizada pelo motor ({t ISO, requests, errors, cpuP50…}) em séries de
 * gráfico ({t epoch ms, v}) e cálculo dos KPIs do período.
 *
 * Unidades — verificado: requests/errors/subrequests são contagens somáveis.
 * Assumido: os quantis cpuTimeP50/P99 e durationP50/P99 do dataset
 * workersInvocationsAdaptive chegam em microssegundos e são convertidos para
 * ms aqui (µs/1000); e a agregação dos percentis por bucket usa média
 * ponderada por requests (aproximação — o percentil exato do período exigiria
 * os dados brutos).
 */

import type { WorkerMetricsPoint } from '../types';

type ChartPoint = {
  t: number;
  v: number;
};

export type MetricsChartSeries = {
  requests: ChartPoint[];
  errors: ChartPoint[];
  cpuP50: ChartPoint[];
  cpuP99: ChartPoint[];
  durP50: ChartPoint[];
  durP99: ChartPoint[];
};

export type MetricsKpis = {
  requests: number;
  errors: number;
  errorRatePct: number;
  subrequests: number;
  cpuP50Ms: number;
  cpuP99Ms: number;
  durP50Ms: number;
  durP99Ms: number;
};

/** Opções do seletor de período (label → horas na whitelist do motor). */
export const METRICS_HOURS_OPTIONS: Array<{ label: string; hours: number }> = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '3d', hours: 72 },
  { label: '7d', hours: 168 },
  { label: '30d', hours: 720 },
];

const usToMs = (value: number): number => value / 1000;

/** Converte a série do motor em séries de gráfico, descartando buckets sem timestamp válido. */
export const toChartSeries = (points: WorkerMetricsPoint[]): MetricsChartSeries => {
  const series: MetricsChartSeries = { requests: [], errors: [], cpuP50: [], cpuP99: [], durP50: [], durP99: [] };

  for (const point of points) {
    const t = new Date(point.t).getTime();
    if (Number.isNaN(t)) continue;
    series.requests.push({ t, v: point.requests });
    series.errors.push({ t, v: point.errors });
    series.cpuP50.push({ t, v: usToMs(point.cpuP50) });
    series.cpuP99.push({ t, v: usToMs(point.cpuP99) });
    series.durP50.push({ t, v: usToMs(point.durP50) });
    series.durP99.push({ t, v: usToMs(point.durP99) });
  }

  return series;
};

/** KPIs do período: somas para contagens, média ponderada por requests para percentis (em ms). */
export const computeMetricsKpis = (points: WorkerMetricsPoint[]): MetricsKpis => {
  let requests = 0;
  let errors = 0;
  let subrequests = 0;
  let cpuP50Weighted = 0;
  let cpuP99Weighted = 0;
  let durP50Weighted = 0;
  let durP99Weighted = 0;

  for (const point of points) {
    requests += point.requests;
    errors += point.errors;
    subrequests += point.subrequests;
    cpuP50Weighted += point.cpuP50 * point.requests;
    cpuP99Weighted += point.cpuP99 * point.requests;
    durP50Weighted += point.durP50 * point.requests;
    durP99Weighted += point.durP99 * point.requests;
  }

  const weightBase = requests > 0 ? requests : 1;

  return {
    requests,
    errors,
    errorRatePct: requests > 0 ? (errors / requests) * 100 : 0,
    subrequests,
    cpuP50Ms: usToMs(cpuP50Weighted / weightBase),
    cpuP99Ms: usToMs(cpuP99Weighted / weightBase),
    durP50Ms: usToMs(durP50Weighted / weightBase),
    durP99Ms: usToMs(durP99Weighted / weightBase),
  };
};

/** Formata milissegundos para exibição (µs abaixo de 1ms, s acima de 1000ms). */
export const formatMsValue = (ms: number): string => {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};
