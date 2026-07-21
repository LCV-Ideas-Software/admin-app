/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos transforms puros do report dns_analytics (DNS-4): matriz bytime
 * (métrica × intervalos) → séries, top-3 responseCodes, totais e ranking top.
 */

import { describe, expect, it } from 'vitest';
import {
  isPeriodAllowed,
  resolveBreakdown,
  toPercentLabel,
  transformBytimeReport,
  transformTopReport,
} from './analyticsHelpers';
import type { DnsAnalyticsReport } from './types';

const T0 = Date.parse('2026-07-19T12:00:00Z');
const T1 = Date.parse('2026-07-19T13:00:00Z');

const BYTIME_REPORT: DnsAnalyticsReport = {
  rows: 4,
  data: [
    {
      dimensions: ['NOERROR'],
      metrics: [
        [100, 200],
        [10, 20],
        [1, 2],
      ],
    },
    {
      dimensions: ['NXDOMAIN'],
      metrics: [
        [50, 30],
        [5, 3],
        [0, 0],
      ],
    },
    {
      dimensions: ['SERVFAIL'],
      metrics: [
        [7, 3],
        [1, 0],
        [0, 0],
      ],
    },
    {
      dimensions: ['REFUSED'],
      metrics: [
        [1, 1],
        [0, 0],
        [0, 0],
      ],
    },
  ],
  totals: { queryCount: 392, uncachedCount: 39, staleCount: 3 },
  query: { metrics: ['queryCount', 'uncachedCount', 'staleCount'] },
  time_intervals: [
    ['2026-07-19T12:00:00Z', '2026-07-19T13:00:00Z'],
    ['2026-07-19T13:00:00Z', '2026-07-19T14:00:00Z'],
  ],
};

describe('transformBytimeReport', () => {
  it('sums queryCount per interval into the total series with parsed timestamps', () => {
    const result = transformBytimeReport(BYTIME_REPORT);

    expect(result.total).toEqual([
      { t: T0, v: 158 },
      { t: T1, v: 234 },
    ]);
  });

  it('keeps only the top-3 responseCodes by volume as separate series', () => {
    const result = transformBytimeReport(BYTIME_REPORT);

    expect(result.byResponseCode.map((series) => series.label)).toEqual(['NOERROR', 'NXDOMAIN', 'SERVFAIL']);
    expect(result.byResponseCode[0]?.points).toEqual([
      { t: T0, v: 100 },
      { t: T1, v: 200 },
    ]);
  });

  it('passes the report totals through', () => {
    const result = transformBytimeReport(BYTIME_REPORT);

    expect(result.totals).toEqual({ queryCount: 392, uncachedCount: 39, staleCount: 3 });
  });

  it('resolves the queryCount column via the query.metrics echo when the order differs', () => {
    const reordered: DnsAnalyticsReport = {
      data: [
        {
          dimensions: ['NOERROR'],
          metrics: [
            [9, 9],
            [100, 200],
          ],
        },
      ],
      query: { metrics: ['uncachedCount', 'queryCount'] },
      time_intervals: BYTIME_REPORT.time_intervals,
    };

    const result = transformBytimeReport(reordered);

    expect(result.total).toEqual([
      { t: T0, v: 100 },
      { t: T1, v: 200 },
    ]);
  });

  it('falls back to summed queryCount when totals are missing and to zeros on empty reports', () => {
    const withoutTotals = transformBytimeReport({
      data: BYTIME_REPORT.data,
      query: BYTIME_REPORT.query,
      time_intervals: BYTIME_REPORT.time_intervals,
    });
    expect(withoutTotals.totals.queryCount).toBe(392);

    const empty = transformBytimeReport(undefined);
    expect(empty).toEqual({
      total: [],
      byResponseCode: [],
      totals: { queryCount: 0, uncachedCount: 0, staleCount: 0 },
    });
  });
});

describe('transformTopReport', () => {
  it('maps rows to labeled items, accepting scalar or single-element metrics, sorted desc', () => {
    const items = transformTopReport({
      data: [
        { dimensions: ['www.lcv.app.br'], metrics: [30] },
        { dimensions: ['lcv.app.br'], metrics: [[120]] },
        { dimensions: [''], metrics: [7] },
      ],
      query: { metrics: ['queryCount'] },
    });

    expect(items).toEqual([
      { label: 'lcv.app.br', value: 120 },
      { label: 'www.lcv.app.br', value: 30 },
      { label: '—', value: 7 },
    ]);
  });

  it('returns an empty list for missing or empty reports', () => {
    expect(transformTopReport(undefined)).toEqual([]);
    expect(transformTopReport({ data: [] })).toEqual([]);
  });
});

describe('toPercentLabel', () => {
  it('formats pt-BR percentages and degrades to "—" without a denominator', () => {
    expect(toPercentLabel(39, 392)).toBe('9,9%');
    expect(toPercentLabel(1, 0)).toBe('—');
  });
});

describe('isPeriodAllowed', () => {
  it('blocks windows above the Free plan max window (6h) — 24h is not allowed', () => {
    // Free: retenção 8 dias, mas janela máxima por consulta = 6h.
    expect(isPeriodAllowed(6, 8, 6)).toBe(true);
    expect(isPeriodAllowed(24, 8, 6)).toBe(false);
    expect(isPeriodAllowed(720, 8, 6)).toBe(false);
  });

  it('blocks windows above retention (days) when there is no per-window cap', () => {
    // Pro: 31 dias de retenção, sem teto de janela por consulta.
    expect(isPeriodAllowed(720, 31, null)).toBe(true);
    expect(isPeriodAllowed(24 * 40, 31, null)).toBe(false);
  });

  it('allows everything when both limits are unknown', () => {
    expect(isPeriodAllowed(720, null, null)).toBe(true);
  });
});

describe('resolveBreakdown', () => {
  const okPayload = (report: DnsAnalyticsReport) => ({
    ok: true as const,
    data: { ok: true as const, report },
  });

  it('returns items on success', () => {
    const result = resolveBreakdown(
      okPayload({ data: [{ dimensions: ['A'], metrics: [10] }], query: { metrics: ['queryCount'] } }),
      'ctx',
    );
    expect('items' in result && result.items).toEqual([{ label: 'A', value: 10 }]);
  });

  it('returns { unavailable } with the backend error when the plan gates the dimension', () => {
    const result = resolveBreakdown(
      {
        ok: true,
        data: {
          ok: false,
          error: 'Recurso de análises indisponível no plano da zona (código CF 1034: Upgrade to the business plan)',
        },
      },
      'Não foi possível carregar o top de tipos de consulta',
    );
    expect('unavailable' in result && result.unavailable).toContain('indisponível no plano');
    expect('unavailable' in result && result.unavailable).toContain('business plan');
  });

  it('returns { unavailable } on a transport failure (never throws)', () => {
    const result = resolveBreakdown(
      { ok: false, status: 500, statusText: 'x', contentType: null, error: 'falha', bodyPreview: '' },
      'Contexto do card',
    );
    expect('unavailable' in result).toBe(true);
  });
});
