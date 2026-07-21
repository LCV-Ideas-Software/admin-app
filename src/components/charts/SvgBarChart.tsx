/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Gráfico de barras horizontais em SVG puro, sem dependências, compartilhado
 * entre módulos (CF DNS "Análises" hoje; CF P&W depois). Puramente
 * presentacional: label à esquerda (truncado, com <title> completo), barra
 * proporcional ao maior valor e valor formatado à direita.
 */

export type SvgBarChartItem = {
  label: string;
  value: number;
};

type SvgBarChartProps = {
  items: SvgBarChartItem[];
  formatValue?: (value: number) => string;
  maxBars?: number;
  ariaLabel: string;
};

const VIEW_WIDTH = 640;
const ROW_HEIGHT = 26;
const BAR_HEIGHT = 14;
const LABEL_WIDTH = 214;
const VALUE_WIDTH = 78;
const LABEL_MAX_CHARS = 32;

const BAR_FILL = 'var(--accent, #1a73e8)';
const TEXT_STYLE = { fill: 'var(--chart-axis, #5f6368)', fontSize: 11 } as const;

const defaultFormatValue = (value: number) => value.toLocaleString('pt-BR');

const truncateLabel = (label: string) =>
  label.length > LABEL_MAX_CHARS ? `${label.slice(0, LABEL_MAX_CHARS - 1)}…` : label;

export function SvgBarChart({ items, formatValue, maxBars = 15, ariaLabel }: SvgBarChartProps) {
  const toValueText = formatValue ?? defaultFormatValue;
  const bars = items.slice(0, maxBars);

  if (bars.length === 0) {
    return (
      <div className="chart-empty" style={{ minHeight: 80, display: 'grid', placeItems: 'center' }}>
        Sem dados no período
      </div>
    );
  }

  const maxValue = Math.max(...bars.map((item) => item.value), 1);
  const barAreaWidth = VIEW_WIDTH - LABEL_WIDTH - VALUE_WIDTH - 16;
  const viewHeight = bars.length * ROW_HEIGHT + 6;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${VIEW_WIDTH} ${viewHeight}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {bars.map((item, index) => {
        const rowY = index * ROW_HEIGHT + 4;
        const barWidth = Math.max((item.value / maxValue) * barAreaWidth, item.value > 0 ? 2 : 0);
        return (
          // Labels vêm de dimensões únicas do report (um item por dimensão).
          <g key={item.label}>
            <text x={LABEL_WIDTH - 6} y={rowY + BAR_HEIGHT - 3} textAnchor="end" style={TEXT_STYLE}>
              <title>{item.label}</title>
              {truncateLabel(item.label)}
            </text>
            <rect
              className="chart-bar-rect"
              x={LABEL_WIDTH + 4}
              y={rowY}
              width={barWidth}
              height={BAR_HEIGHT}
              rx={3}
              fill={BAR_FILL}
              opacity={0.85}
            >
              <title>{`${item.label} · ${toValueText(item.value)}`}</title>
            </rect>
            <text x={VIEW_WIDTH - 4} y={rowY + BAR_HEIGHT - 3} textAnchor="end" style={TEXT_STYLE}>
              {toValueText(item.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
