/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../components/Notification';
import { createLocalityMapV1Fixture } from '../../test/fixtures/astrologo-locality-map-v1';
import { createNatalChartAnalysisV1Fixture } from '../../test/fixtures/astrologo-natal-analysis-v1';
import { createDadosPosicionaisV2Fixture } from '../../test/fixtures/astrologo-positional-v2';
import {
  createSynastryRunV1Fixture,
  createTransitRunV1Fixture,
} from '../../test/fixtures/astrologo-transit-synastry-v1';
import { AstrologoModule } from './AstrologoModule';

vi.mock('../../lib/useModuleConfig', () => ({
  useModuleConfig: () => [{ modeloSintese: '' }, vi.fn(), false],
}));

const dadosPosicionaisV2 = createDadosPosicionaisV2Fixture();
dadosPosicionaisV2.birthContext.timeResolution.instantUtc = '2000-07-16T01:30:00Z';
const mapa = {
  id: dadosPosicionaisV2.calculationId,
  nome: 'Consulente V2',
  data_nascimento: '2000-07-16',
  hora_nascimento: '01:30',
  local_nascimento: 'São Paulo',
  dados_astronomica: null,
  dados_tropical: null,
  dados_globais: JSON.stringify({
    tatwa: {
      schemaVersion: '2.0.0',
      principal: 'Akasha (Éter)',
      sub: 'Vayu (Ar)',
      calculationMode: 'fixed',
    },
  }),
  dados_posicionais_v2: JSON.stringify(dadosPosicionaisV2),
  natal_chart_analysis_v1: JSON.stringify(createNatalChartAnalysisV1Fixture(dadosPosicionaisV2.calculationId)),
  transit_run_v1: JSON.stringify(createTransitRunV1Fixture(dadosPosicionaisV2.calculationId)),
  synastry_run_v1: JSON.stringify(createSynastryRunV1Fixture(dadosPosicionaisV2.calculationId)),
  synastry_subjects: { A: 'Consulente V2', B: 'Pessoa B' },
  locality_map_v1: JSON.stringify(createLocalityMapV1Fixture(dadosPosicionaisV2.calculationId)),
  analise_ia: null,
  created_at: '2026-07-11T15:30:45Z',
};

const jsonResponse = (payload: unknown): Response => ({ ok: true, json: async () => payload }) as unknown as Response;

describe('AstrologoModule dados posicionais v2', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.startsWith('/api/astrologo/listar?')) {
          return jsonResponse({
            ok: true,
            total: 1,
            filtros: { nome: '', dataInicial: '', dataFinal: '', email: '' },
            items: [
              {
                id: mapa.id,
                nome: mapa.nome,
                dataNascimento: '15/07/2000',
                status: 'analisado',
              },
            ],
          });
        }
        if (url === '/api/astrologo/ler') return jsonResponse({ ok: true, mapa });
        throw new Error(`Fetch inesperado no teste: ${url}`);
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('mostra a tabela de dez planetas, falange e proveniência em horário de Brasília', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <AstrologoModule />
      </NotificationProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Atualizar arquivo' }));
    const row = (await screen.findByText(mapa.nome)).closest('li');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Ler detalhes' }));

    const table = await screen.findByRole('table', { name: 'Posições planetárias v2' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(11);
    expect(within(table).getByText('12°20\'44" de Áries')).toBeInTheDocument();
    expect(within(table).getAllByText('Áries (Ari)')).toHaveLength(10);
    for (const row of rows.slice(1)) {
      expect(within(row).getAllByRole('cell')[1]).toHaveTextContent(/^Áries \(Ari\)$/);
    }
    expect(screen.getByText(/Falange angélica/)).toBeInTheDocument();
    const regent = screen.getByRole('region', { name: 'Anjo regente do consulente' });
    expect(within(regent).getByText(/#3 Sitael/)).toBeInTheDocument();
    expect(within(regent).getByText(/Quinário tropical da posição do Sol/)).toBeInTheDocument();
    expect(regent).toHaveClass('astro-regent-card');
    const tatwaSection = screen.getByText('Forças Globais: Tatwas').closest('.field-group');
    expect(tatwaSection).not.toBeNull();
    expect(within(tatwaSection as HTMLElement).getByText('Akasha (Éter)')).toBeInTheDocument();
    expect(within(tatwaSection as HTMLElement).getByText('Vayu (Ar)')).toBeInTheDocument();
    expect(within(tatwaSection as HTMLElement).getByText('Ordem fixa — Akasha primeiro')).toBeInTheDocument();
    expect(within(tatwaSection as HTMLElement).queryByText('fixed')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/\b(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\b/),
    ).not.toBeInTheDocument();
    expect(screen.getByText('15/07/2000 às 22:30:00 — Hora oficial de Brasília')).toBeInTheDocument();
    expect(screen.queryByText(/16\/07\/2000 às 01:30/)).not.toBeInTheDocument();
    expect(screen.queryByText(/America\/Sao_Paulo/)).not.toBeInTheDocument();
    expect(screen.queryByText(/urn:astrologo|iau-roman|mayhem-shem/)).not.toBeInTheDocument();
    const cusps = screen.getByRole('list', { name: 'Cúspides das doze casas Placidus' });
    expect(within(cusps).getAllByRole('listitem')).toHaveLength(12);
    const angles = screen.getByRole('list', { name: 'Ângulos do mapa' });
    expect(within(angles).getByText(/Ascendente/)).toBeInTheDocument();
    expect(within(angles).getByText(/Meio do Céu/)).toBeInTheDocument();
    expect(screen.getByText(/11\/07\/2026 às 12:30:45/)).toBeInTheDocument();
    expect(screen.getByText(/Astronomy Engine 2\.1\.19/)).toBeInTheDocument();
    expect(screen.getByText(/Swiss Ephemeris 2\.10\.03/)).toBeInTheDocument();
    const aspects = screen.getByRole('region', { name: 'Aspectos natais' });
    expect(within(aspects).getByText('Sextil')).toBeInTheDocument();
    expect(within(aspects).getByText(/Sol.*Lua/)).toBeInTheDocument();
    expect(within(aspects).getByText('Exato')).toBeInTheDocument();
    const houses = screen.getByRole('region', { name: 'Análise das casas' });
    expect(within(houses).getByText(/12°00'00" dentro da Casa 1/)).toBeInTheDocument();
    expect(within(houses).getAllByText(/não foi estimado pelas cúspides/i)).toHaveLength(9);
    expect(screen.getByRole('region', { name: 'Céu atual e trânsitos' })).toBeInTheDocument();
    const synastry = screen.getByRole('region', { name: 'Sinastria' });
    expect(within(synastry).getByText('Consulente V2 nas casas de Pessoa B')).toBeInTheDocument();
    expect(within(synastry).getByText('Pessoa B nas casas de Consulente V2')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Mapa planetário de localidade' })).toBeInTheDocument();
    expect(screen.queryByText(/fixed-by-aspect|planet:sun|POSITION_V2_0/)).not.toBeInTheDocument();
  });
});
