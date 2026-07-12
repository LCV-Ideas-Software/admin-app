import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { createLocalityMapV1Fixture } from '../../test/fixtures/astrologo-locality-map-v1';
import { LocalityMapPanel } from './LocalityMapPanel';

afterEach(cleanup);

describe('LocalityMapPanel', () => {
  it('apresenta mapa Natural Earth, transformação equatorial e instante de Brasília sem aconselhamento', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LocalityMapPanel result={{ status: 'available', data: createLocalityMapV1Fixture() }} />,
    );

    const panel = screen.getByRole('region', { name: 'Mapa planetário de localidade' });
    expect(within(panel).getByText(/20\/05\/1993 às 21:12:00/)).toBeInTheDocument();
    expect(within(panel).getByText(/Hora oficial de Brasília/)).toBeInTheDocument();
    expect(within(panel).getByText(/EQJ\/J2000/)).toBeInTheDocument();
    expect(within(panel).getByText(/EQD verdadeiro da data/)).toBeInTheDocument();
    expect(
      await within(panel).findByRole(
        'img',
        { name: 'Mapa-múndi com linhas planetárias de localidade' },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    expect(within(panel).getByText(/Natural Earth 1:110m/)).toBeInTheDocument();
    expect(container.querySelector('[data-world-land="natural-earth-110m"]')).toBeInTheDocument();
    expect(container.querySelector('[data-locality-line="sun:mc"]')).toBeInTheDocument();
    expect(within(panel).getByText(/não recomenda mudança/i)).toBeInTheDocument();
    expect(within(panel).queryByText(/raio de influência/i)).not.toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Saiba mais sobre Mapa planetário de localidade' }));
    expect(screen.getByRole('dialog', { name: 'Como ler o Mapa planetário de localidade' })).toBeInTheDocument();
    expect(screen.getByText(/não é uma fronteira física nem um campo mensurável/i)).toBeInTheDocument();
  }, 15_000);

  it('não cria mapa para legado e isola contrato inválido', () => {
    const { rerender } = render(<LocalityMapPanel result={{ status: 'legacy' }} />);
    expect(screen.queryByRole('region', { name: 'Mapa planetário de localidade' })).not.toBeInTheDocument();

    rerender(<LocalityMapPanel result={{ status: 'invalid', reason: 'contrato inválido' }} />);
    expect(screen.getByText('Mapa de localidade indisponível')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
