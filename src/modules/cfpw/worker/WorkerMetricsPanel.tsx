/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Aba "Métricas" do WorkerDetail (PW-2, GraphQL Analytics): seletor de período
 * (1h→30d, whitelist do motor), KPI cards (requests, erros com taxa, subrequests,
 * CPU p50/p99, duração p50/p99) e gráficos SvgTimeSeries (requests×erros, CPU,
 * duração). Transformações puras vivem em metricsHelpers.ts.
 */

import { Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SvgTimeSeries } from '../../../components/charts/SvgTimeSeries';
import * as api from '../api';
import type { WorkerMetricsPoint } from '../types';
import { computeMetricsKpis, formatMsValue, METRICS_HOURS_OPTIONS, toChartSeries } from './metricsHelpers';

type WorkerMetricsPanelProps = {
  scriptName: string;
  adminActor: string;
};

export function WorkerMetricsPanel({ scriptName, adminActor }: WorkerMetricsPanelProps) {
  const [hours, setHours] = useState(24);
  const [points, setPoints] = useState<WorkerMetricsPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { response, payload } = await api.fetchWorkerMetrics(adminActor, { scriptName, hours });
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? 'Falha ao consultar métricas.');
      setPoints(Array.isArray(payload.series) ? payload.series : []);
    } catch (err) {
      setPoints([]);
      setError(err instanceof Error ? err.message : 'Falha ao consultar métricas.');
    } finally {
      setLoading(false);
    }
  }, [adminActor, scriptName, hours]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const kpis = useMemo(() => computeMetricsKpis(points), [points]);
  const chart = useMemo(() => toChartSeries(points), [points]);

  const renderBody = () => {
    if (loading && points.length === 0) {
      return (
        <div className="cfpw-obs-loading">
          <Loader2 size={20} className="spin" /> Consultando GraphQL Analytics...
        </div>
      );
    }

    if (error) {
      return (
        <div className="cfpw-metrics-error" role="alert">
          <p>{error}</p>
          <button type="button" className="ghost-button" onClick={() => void loadMetrics()}>
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      );
    }

    if (points.length === 0 || kpis.requests === 0) {
      return <div className="cfpw-empty-state">Sem invocações no período.</div>;
    }

    return (
      <>
        <div className="cfpw-obs-kpis cfpw-metrics-kpis">
          <div className="cfpw-obs-kpi-card">
            <div className="cfpw-obs-kpi-data">
              <span>Requests</span>
              <strong>{kpis.requests.toLocaleString('pt-BR')}</strong>
            </div>
          </div>
          <div className="cfpw-obs-kpi-card">
            <div className="cfpw-obs-kpi-data">
              <span>Erros</span>
              <strong>
                {kpis.errors.toLocaleString('pt-BR')}
                <small className="cfpw-metrics-kpi-sub"> ({kpis.errorRatePct.toFixed(2)}%)</small>
              </strong>
            </div>
          </div>
          <div className="cfpw-obs-kpi-card">
            <div className="cfpw-obs-kpi-data">
              <span>Subrequests</span>
              <strong>{kpis.subrequests.toLocaleString('pt-BR')}</strong>
            </div>
          </div>
          <div className="cfpw-obs-kpi-card">
            <div className="cfpw-obs-kpi-data">
              <span>CPU p50 / p99</span>
              <strong>
                {formatMsValue(kpis.cpuP50Ms)}{' '}
                <small className="cfpw-metrics-kpi-sub">/ {formatMsValue(kpis.cpuP99Ms)}</small>
              </strong>
            </div>
          </div>
          <div className="cfpw-obs-kpi-card">
            <div className="cfpw-obs-kpi-data">
              <span>Duração p50 / p99</span>
              <strong>
                {formatMsValue(kpis.durP50Ms)}{' '}
                <small className="cfpw-metrics-kpi-sub">/ {formatMsValue(kpis.durP99Ms)}</small>
              </strong>
            </div>
          </div>
        </div>

        <div className="cfpw-metrics-chart">
          <h4>Requests × Erros</h4>
          <SvgTimeSeries
            ariaLabel={`Requests e erros de ${scriptName} no período`}
            series={[
              { label: 'Requests', points: chart.requests },
              { label: 'Erros', color: 'var(--chart-series-4, #d93025)', points: chart.errors },
            ]}
          />
        </div>

        <div className="cfpw-metrics-chart">
          <h4>CPU (ms) — p50 / p99</h4>
          <SvgTimeSeries
            ariaLabel={`CPU p50 e p99 de ${scriptName} no período`}
            formatValue={formatMsValue}
            series={[
              { label: 'CPU p50', points: chart.cpuP50 },
              { label: 'CPU p99', color: 'var(--chart-series-3, #f9ab00)', points: chart.cpuP99 },
            ]}
          />
        </div>

        <div className="cfpw-metrics-chart">
          <h4>Duração (ms) — p50 / p99</h4>
          <SvgTimeSeries
            ariaLabel={`Duração p50 e p99 de ${scriptName} no período`}
            formatValue={formatMsValue}
            series={[
              { label: 'Duração p50', points: chart.durP50 },
              { label: 'Duração p99', color: 'var(--chart-series-5, #9334e6)', points: chart.durP99 },
            ]}
          />
        </div>
      </>
    );
  };

  return (
    <div className="cfpw-detail-section">
      <div className="cfpw-code-header">
        <h3>Métricas (GraphQL Analytics)</h3>
        <div className="cfpw-code-header-actions">
          <div className="cfpw-obs-time-range">
            {METRICS_HOURS_OPTIONS.map((option) => (
              <button
                key={option.hours}
                type="button"
                className={`cfpw-obs-time-btn ${option.hours === hours ? 'active' : ''}`}
                onClick={() => setHours(option.hours)}
                disabled={loading}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button type="button" className="ghost-button" onClick={() => void loadMetrics()} disabled={loading}>
            {loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
          </button>
        </div>
      </div>
      {renderBody()}
    </div>
  );
}
