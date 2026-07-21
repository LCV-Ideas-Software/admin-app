/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Gráfico de série temporal em SVG puro, sem dependências, compartilhado entre
 * módulos (CF DNS "Análises" hoje; CF P&W depois). Puramente presentacional:
 * recebe séries prontas ({t, v}), não faz fetch nem carrega strings de módulo
 * além dos defaults. Responsivo via viewBox + width 100%; cores padrão em CSS
 * variables para acompanhar temas.
 */

import { useState } from 'react';

export type SvgTimeSeriesPoint = {
  /** Timestamp em ms (epoch). */
  t: number;
  v: number;
};

export type SvgTimeSeriesSeries = {
  label: string;
  color?: string;
  points: SvgTimeSeriesPoint[];
};

type SvgTimeSeriesProps = {
  series: SvgTimeSeriesSeries[];
  height?: number;
  formatValue?: (value: number) => string;
  formatTime?: (t: number) => string;
  ariaLabel: string;
};

const VIEW_WIDTH = 640;
const MARGIN = { top: 10, right: 12, bottom: 26, left: 56 };
const Y_GRIDLINES = 4;
const X_TICKS = 4;

const DEFAULT_CHART_COLORS = [
  'var(--accent, #1a73e8)',
  'var(--chart-series-2, #1e8e3e)',
  'var(--chart-series-3, #f9ab00)',
  'var(--chart-series-4, #d93025)',
  'var(--chart-series-5, #9334e6)',
];

const AXIS_TEXT_STYLE = { fill: 'var(--chart-axis, #80868b)', fontSize: 10 } as const;
const GRID_STROKE = 'var(--chart-grid, rgba(128, 134, 139, 0.25))';

const defaultFormatValue = (value: number) => value.toLocaleString('pt-BR');

const defaultFormatTime = (t: number) =>
  new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

type HoverState = {
  x: number;
  y: number;
  label: string;
  t: number;
  v: number;
};

export function SvgTimeSeries({ series, height = 220, formatValue, formatTime, ariaLabel }: SvgTimeSeriesProps) {
  const [hover, setHover] = useState<HoverState | null>(null);

  const toValueText = formatValue ?? defaultFormatValue;
  const toTimeText = formatTime ?? defaultFormatTime;

  const allPoints = series.flatMap((entry) => entry.points);
  if (allPoints.length === 0) {
    return (
      <div className="chart-empty" style={{ minHeight: height, display: 'grid', placeItems: 'center' }}>
        Sem dados no período
      </div>
    );
  }

  const plotWidth = VIEW_WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;

  const tMin = Math.min(...allPoints.map((point) => point.t));
  const tMax = Math.max(...allPoints.map((point) => point.t));
  const vMax = Math.max(...allPoints.map((point) => point.v), 1);
  const tSpan = tMax - tMin || 1;

  const toX = (t: number) => MARGIN.left + ((t - tMin) / tSpan) * plotWidth;
  const toY = (v: number) => MARGIN.top + plotHeight - (v / vMax) * plotHeight;

  const colorOf = (entry: SvgTimeSeriesSeries, index: number) =>
    entry.color ?? DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length];

  const linePath = (points: SvgTimeSeriesPoint[]) =>
    points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(point.t)} ${toY(point.v)}`).join(' ');

  const areaPath = (points: SvgTimeSeriesPoint[]) => {
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    if (!firstPoint || !lastPoint) {
      return '';
    }
    const baseline = MARGIN.top + plotHeight;
    return `${linePath(points)} L ${toX(lastPoint.t)} ${baseline} L ${toX(firstPoint.t)} ${baseline} Z`;
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const mouseX = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;

    let nearest: HoverState | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const entry of series) {
      for (const point of entry.points) {
        const distance = Math.abs(toX(point.t) - mouseX);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = { x: toX(point.t), y: toY(point.v), label: entry.label, t: point.t, v: point.v };
        }
      }
    }
    setHover(nearest);
  };

  const tooltipText = hover ? `${hover.label} · ${toTimeText(hover.t)} · ${toValueText(hover.v)}` : '';
  const tooltipWidth = Math.max(60, tooltipText.length * 5.6 + 12);
  const tooltipX = hover ? Math.min(Math.max(hover.x - tooltipWidth / 2, 2), VIEW_WIDTH - tooltipWidth - 2) : 0;
  const tooltipY = hover ? Math.max(hover.y - 30, 2) : 0;

  return (
    <div>
      {/* Hover de tooltip é enriquecimento visual; o conteúdo acessível vem do aria-label e dos <title> por ponto. */}
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: Y_GRIDLINES + 1 }, (_, index) => {
          const value = (vMax * index) / Y_GRIDLINES;
          const y = toY(value);
          return (
            <g key={`grid-${value}`}>
              <line
                x1={MARGIN.left}
                x2={VIEW_WIDTH - MARGIN.right}
                y1={y}
                y2={y}
                stroke={GRID_STROKE}
                strokeWidth={1}
              />
              <text x={MARGIN.left - 6} y={y + 3} textAnchor="end" style={AXIS_TEXT_STYLE}>
                {toValueText(Math.round(value))}
              </text>
            </g>
          );
        })}

        {Array.from({ length: X_TICKS }, (_, index) => {
          const t = tMin + (tSpan * index) / (X_TICKS - 1 || 1);
          const x = toX(t);
          return (
            <text key={`tick-${t}-${x}`} x={x} y={height - 8} textAnchor="middle" style={AXIS_TEXT_STYLE}>
              {toTimeText(t)}
            </text>
          );
        })}

        {series.map((entry, index) =>
          entry.points.length === 0 ? null : (
            <g key={entry.label}>
              <path
                className="chart-series-area"
                d={areaPath(entry.points)}
                fill={colorOf(entry, index)}
                opacity={0.12}
              />
              <path
                className="chart-series-line"
                d={linePath(entry.points)}
                fill="none"
                stroke={colorOf(entry, index)}
                strokeWidth={2}
              />
              {entry.points.map((point) => (
                <circle
                  key={`${entry.label}-${point.t}`}
                  cx={toX(point.t)}
                  cy={toY(point.v)}
                  r={2.5}
                  fill={colorOf(entry, index)}
                >
                  <title>{`${entry.label} · ${toTimeText(point.t)} · ${toValueText(point.v)}`}</title>
                </circle>
              ))}
            </g>
          ),
        )}

        {hover ? (
          <g pointerEvents="none">
            <circle cx={hover.x} cy={hover.y} r={4} fill="none" stroke="var(--chart-axis, #80868b)" strokeWidth={1.5} />
            <rect
              x={tooltipX}
              y={tooltipY}
              width={tooltipWidth}
              height={18}
              rx={4}
              fill="var(--surface-1, #ffffff)"
              stroke={GRID_STROKE}
            />
            <text x={tooltipX + tooltipWidth / 2} y={tooltipY + 12} textAnchor="middle" style={AXIS_TEXT_STYLE}>
              {tooltipText}
            </text>
          </g>
        ) : null}
      </svg>

      {series.length > 1 ? (
        <div className="chart-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
          {series.map((entry, index) => (
            <span
              key={entry.label}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.74rem' }}
            >
              <span
                aria-hidden="true"
                style={{ width: 10, height: 10, borderRadius: 3, background: colorOf(entry, index) }}
              />
              {entry.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
