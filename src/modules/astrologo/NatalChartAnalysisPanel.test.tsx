import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { createNatalChartAnalysisV1Fixture } from '../../test/fixtures/astrologo-natal-analysis-v1';
import { NatalChartAnalysisPanel } from './NatalChartAnalysisPanel';

afterEach(cleanup);

describe('NatalChartAnalysisPanel defensive states', () => {
  it('renders nothing for a legacy map', () => {
    const { container } = render(<NatalChartAnalysisPanel result={{ status: 'legacy' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('explains an invalid artifact without exposing or using its payload', () => {
    render(
      <NatalChartAnalysisPanel result={{ status: 'invalid', reason: 'contrato natal v1 inválido ou incompleto' }} />,
    );

    expect(screen.getByText('Análise natal avançada indisponível')).toBeInTheDocument();
    expect(screen.getByText(/nenhum valor foi recalculado pelo Admin/i)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Aspectos natais calculados' })).not.toBeInTheDocument();
  });

  it('oferece ajuda leiga acessível para aspectos natais e análise das casas', async () => {
    const user = userEvent.setup();
    render(<NatalChartAnalysisPanel result={{ status: 'available', data: createNatalChartAnalysisV1Fixture() }} />);

    await user.click(screen.getByRole('button', { name: 'Saiba mais sobre Aspectos natais' }));
    expect(screen.getByRole('dialog', { name: 'Como ler os Aspectos natais' })).toBeInTheDocument();
    expect(screen.getByText(/o orbe é a diferença entre a separação observada e o ângulo exato/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fechar explicação' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Saiba mais sobre Análise das casas' }));
    expect(screen.getByRole('dialog', { name: 'Como ler a Análise das casas' })).toBeInTheDocument();
    expect(screen.getByText(/grau mundano indica o avanço do corpo dentro da divisão Placidus/i)).toBeInTheDocument();
  });
});
