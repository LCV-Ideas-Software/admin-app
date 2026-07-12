import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createSynastryRunV1Fixture,
  createTransitRunV1Fixture,
} from '../../test/fixtures/astrologo-transit-synastry-v1';
import { SynastryRunPanel, TransitRunPanel } from './TransitSynastryPanels';

afterEach(cleanup);

describe('TransitRunPanel', () => {
  it('apresenta referência de Brasília, posições, fase, exatidão e ajuda leiga em pt_BR', async () => {
    const user = userEvent.setup();
    render(<TransitRunPanel result={{ status: 'available', data: createTransitRunV1Fixture() }} />);

    const panel = screen.getByRole('region', { name: 'Céu atual e trânsitos' });
    expect(within(panel).getByText('12/07/2026 às 12:00:00')).toBeInTheDocument();
    expect(within(panel).getByText(/Hora oficial de Brasília/)).toBeInTheDocument();
    expect(within(panel).getByText(/10°00'00" de Áries/)).toBeInTheDocument();
    expect(within(panel).getByText('Constelação IAU: Áries — grau interno não definido')).toBeInTheDocument();
    const exactRow = within(panel).getByRole('row', { name: /Sol em trânsito e Lua natal Sextil/ });
    expect(within(exactRow).getByText('Sextil')).toBeInTheDocument();
    expect(within(exactRow).getByText('Exata')).toBeInTheDocument();
    expect(within(exactRow).getByText(/Exatidão comprovada em 12\/07\/2026 às 12:00:00/)).toBeInTheDocument();
    expect(within(panel).getByText(/não é uma previsão inevitável/i)).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Saiba mais sobre Céu atual e trânsitos' }));
    expect(screen.getByRole('dialog', { name: 'Como ler o Céu atual e os trânsitos' })).toBeInTheDocument();
    expect(screen.getByText(/não transforma uma aproximação em acontecimento garantido/i)).toBeInTheDocument();
  });

  it('não cria seção para mapa legado e isola artefato inválido', () => {
    const { rerender } = render(<TransitRunPanel result={{ status: 'legacy' }} />);
    expect(screen.queryByRole('region', { name: 'Céu atual e trânsitos' })).not.toBeInTheDocument();

    rerender(<TransitRunPanel result={{ status: 'invalid', reason: 'contrato inválido' }} />);
    expect(screen.getByText('Céu atual indisponível')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('SynastryRunPanel', () => {
  it('apresenta a reciprocidade A→B e B→A, ajuda leiga e nenhuma pontuação de compatibilidade', async () => {
    const user = userEvent.setup();
    render(
      <SynastryRunPanel
        result={{ status: 'available', data: createSynastryRunV1Fixture() }}
        subjects={{ A: 'João Antônio', B: 'Leonardo Cardozo' }}
      />,
    );

    const panel = screen.getByRole('region', { name: 'Sinastria' });
    expect(within(panel).getByText('Aspectos intermapa')).toBeInTheDocument();
    expect(within(panel).getByText(/Sol de João Antônio e Lua de Leonardo Cardozo/)).toBeInTheDocument();
    expect(within(panel).getByText('João Antônio nas casas de Leonardo Cardozo')).toBeInTheDocument();
    expect(within(panel).getByText('Leonardo Cardozo nas casas de João Antônio')).toBeInTheDocument();
    expect(within(panel).getByText(/Sol de João Antônio na Casa 1 de Leonardo Cardozo/)).toBeInTheDocument();
    expect(within(panel).queryByText(/compatibilidade|pontuação|nota\s*:/i)).not.toBeInTheDocument();
    expect(within(panel).getByText(/não determina o destino da relação/i)).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Saiba mais sobre Sinastria' }));
    expect(screen.getByRole('dialog', { name: 'Como ler a Sinastria' })).toBeInTheDocument();
    expect(
      screen.getByText(/as duas direções são mantidas porque as casas natais não são intercambiáveis/i),
    ).toBeInTheDocument();
  });
});
