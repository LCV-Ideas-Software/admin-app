/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos gráficos SVG compartilhados (DNS-4): renderização de paths/barras
 * a partir de fixtures, estado vazio e legenda multi-série.
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SvgBarChart } from './SvgBarChart';
import { SvgTimeSeries } from './SvgTimeSeries';

afterEach(cleanup);

const T0 = Date.parse('2026-07-19T12:00:00Z');
const HOUR = 3_600_000;

const makeSeries = (label: string, values: number[]) => ({
  label,
  points: values.map((v, index) => ({ t: T0 + index * HOUR, v })),
});

describe('SvgTimeSeries', () => {
  it('renders one line path and one area path per series', () => {
    const { container } = render(
      <SvgTimeSeries
        series={[makeSeries('Total', [10, 20, 15]), makeSeries('NOERROR', [8, 16, 12])]}
        ariaLabel="Consultas DNS por hora"
      />,
    );

    expect(container.querySelectorAll('path.chart-series-line')).toHaveLength(2);
    expect(container.querySelectorAll('path.chart-series-area')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Consultas DNS por hora' })).toBeInTheDocument();
  });

  it('renders the legend only when there is more than one series', () => {
    const multi = render(
      <SvgTimeSeries series={[makeSeries('Total', [1, 2]), makeSeries('NXDOMAIN', [0, 1])]} ariaLabel="multi" />,
    );
    const legend = multi.container.querySelector('.chart-legend');
    expect(legend).not.toBeNull();
    expect(legend?.textContent).toContain('Total');
    expect(legend?.textContent).toContain('NXDOMAIN');
    multi.unmount();

    const single = render(<SvgTimeSeries series={[makeSeries('Total', [1, 2])]} ariaLabel="single" />);
    expect(single.container.querySelector('.chart-legend')).toBeNull();
  });

  it('shows the centered empty state when all series are empty', () => {
    const { container } = render(<SvgTimeSeries series={[{ label: 'Total', points: [] }]} ariaLabel="vazio" />);

    expect(screen.getByText('Sem dados no período')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });
});

describe('SvgBarChart', () => {
  it('renders one bar rect per item with the formatted value', () => {
    const { container } = render(
      <SvgBarChart
        items={[
          { label: 'lcv.app.br', value: 120 },
          { label: 'www.lcv.app.br', value: 60 },
          { label: 'api.lcv.app.br', value: 30 },
        ]}
        ariaLabel="Top nomes"
      />,
    );

    expect(container.querySelectorAll('rect.chart-bar-rect')).toHaveLength(3);
    expect(screen.getByText('120')).toBeInTheDocument();
    // O label aparece no <text> e no <title> (tooltip nativo) — ambos esperados.
    expect(screen.getAllByText('lcv.app.br').length).toBeGreaterThan(0);
  });

  it('caps the number of bars at maxBars', () => {
    const items = Array.from({ length: 10 }, (_, index) => ({ label: `item-${index}`, value: index + 1 }));
    const { container } = render(<SvgBarChart items={items} maxBars={5} ariaLabel="cap" />);

    expect(container.querySelectorAll('rect.chart-bar-rect')).toHaveLength(5);
  });

  it('truncates long labels and keeps the full label in a <title>', () => {
    const longLabel = 'um-subdominio-extremamente-longo-que-nao-cabe.lcv.app.br';
    const { container } = render(<SvgBarChart items={[{ label: longLabel, value: 5 }]} ariaLabel="trunc" />);

    const text = container.querySelector('text');
    expect(text?.textContent).toContain('…');
    expect(text?.querySelector('title')?.textContent).toBe(longLabel);
  });

  it('shows the empty state when there are no items', () => {
    const { container } = render(<SvgBarChart items={[]} ariaLabel="vazio" />);

    expect(screen.getByText('Sem dados no período')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });
});
