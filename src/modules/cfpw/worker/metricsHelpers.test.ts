/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos helpers puros da aba Métricas (PW-2): conversão da série do motor
 * em séries de gráfico (epoch ms + µs→ms), cálculo de KPIs (somas, taxa de
 * erro, média ponderada dos percentis) e formatação de ms.
 */

import { describe, expect, it } from 'vitest';
import type { WorkerMetricsPoint } from '../types';
import { computeMetricsKpis, formatMsValue, METRICS_HOURS_OPTIONS, toChartSeries } from './metricsHelpers';

const point = (overrides: Partial<WorkerMetricsPoint>): WorkerMetricsPoint => ({
  t: '2026-07-21T10:00:00Z',
  requests: 0,
  errors: 0,
  subrequests: 0,
  cpuP50: 0,
  cpuP99: 0,
  durP50: 0,
  durP99: 0,
  ...overrides,
});

describe('toChartSeries', () => {
  it('converts ISO timestamps to epoch ms and µs quantiles to ms', () => {
    const series = toChartSeries([
      point({ t: '2026-07-21T10:00:00Z', requests: 10, errors: 2, cpuP50: 1500, durP99: 8000 }),
    ]);

    const epoch = new Date('2026-07-21T10:00:00Z').getTime();
    expect(series.requests).toEqual([{ t: epoch, v: 10 }]);
    expect(series.errors).toEqual([{ t: epoch, v: 2 }]);
    expect(series.cpuP50).toEqual([{ t: epoch, v: 1.5 }]);
    expect(series.durP99).toEqual([{ t: epoch, v: 8 }]);
  });

  it('drops buckets with unparseable timestamps', () => {
    const series = toChartSeries([point({ t: 'não-é-data', requests: 5 }), point({ requests: 3 })]);
    expect(series.requests).toHaveLength(1);
    expect(series.requests[0]?.v).toBe(3);
  });

  it('returns empty series for an empty input', () => {
    const series = toChartSeries([]);
    expect(series.requests).toEqual([]);
    expect(series.cpuP99).toEqual([]);
  });
});

describe('computeMetricsKpis', () => {
  it('sums counters and computes the error rate', () => {
    const kpis = computeMetricsKpis([
      point({ requests: 80, errors: 2, subrequests: 10 }),
      point({ requests: 20, errors: 3, subrequests: 5 }),
    ]);

    expect(kpis.requests).toBe(100);
    expect(kpis.errors).toBe(5);
    expect(kpis.subrequests).toBe(15);
    expect(kpis.errorRatePct).toBeCloseTo(5);
  });

  it('aggregates percentiles as a request-weighted mean converted to ms', () => {
    const kpis = computeMetricsKpis([
      point({ requests: 90, cpuP50: 1000, cpuP99: 10000 }),
      point({ requests: 10, cpuP50: 11000, cpuP99: 20000 }),
    ]);

    // (1000*90 + 11000*10) / 100 = 2000µs = 2ms ; (10000*90 + 20000*10) / 100 = 11000µs = 11ms
    expect(kpis.cpuP50Ms).toBeCloseTo(2);
    expect(kpis.cpuP99Ms).toBeCloseTo(11);
  });

  it('yields zeroed KPIs without dividing by zero when there are no requests', () => {
    const kpis = computeMetricsKpis([point({ requests: 0, errors: 0, cpuP50: 5000 })]);
    expect(kpis.requests).toBe(0);
    expect(kpis.errorRatePct).toBe(0);
    expect(kpis.cpuP50Ms).toBe(0);
  });
});

describe('formatMsValue', () => {
  it('formats µs, ms and s ranges', () => {
    expect(formatMsValue(0.5)).toBe('500µs');
    expect(formatMsValue(12.34)).toBe('12.3ms');
    expect(formatMsValue(2500)).toBe('2.50s');
    expect(formatMsValue(Number.NaN)).toBe('—');
  });
});

describe('METRICS_HOURS_OPTIONS', () => {
  it('mirrors the motor whitelist (1|6|24|72|168|720)', () => {
    expect(METRICS_HOURS_OPTIONS.map((option) => option.hours)).toEqual([1, 6, 24, 72, 168, 720]);
  });
});
