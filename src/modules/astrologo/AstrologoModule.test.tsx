/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../components/Notification';
import { AstrologoModule } from './AstrologoModule';

vi.mock('../../lib/useModuleConfig', () => ({
  useModuleConfig: () => [{ modeloSintese: '' }, vi.fn(), false],
}));

vi.mock('../../lib/astrological-report', () => ({
  generateAstrologicalReport: (mapa: { nome: string }) => ({
    html: `<p>Relatório de ${mapa.nome}</p>`,
    text: `Relatório de ${mapa.nome}`,
    summary: `Mapa de ${mapa.nome}`,
  }),
}));

const mapaA = {
  id: 'mapa-a',
  nome: 'Consulente A',
  data_nascimento: '1990-01-01',
  hora_nascimento: '10:00',
  local_nascimento: 'São Paulo',
  dados_astronomica: null,
  dados_tropical: null,
  dados_globais: null,
  analise_ia: null,
  created_at: '2026-07-11T12:00:00Z',
};

const mapaB = {
  ...mapaA,
  id: 'mapa-b',
  nome: 'Consulente B',
  data_nascimento: '1992-02-02',
};

const listPayload = {
  ok: true,
  total: 2,
  filtros: { nome: '', dataInicial: '', dataFinal: '', email: '' },
  items: [
    { id: mapaA.id, nome: mapaA.nome, dataNascimento: '01/01/1990', status: 'analisado' },
    { id: mapaB.id, nome: mapaB.nome, dataNascimento: '02/02/1992', status: 'analisado' },
  ],
};

const jsonResponse = (payload: unknown, ok = true): Response =>
  ({ ok, json: async () => payload }) as unknown as Response;

describe('AstrologoModule email report ownership', () => {
  const fetchMock = vi.fn();
  let failMapaBRead = true;

  beforeEach(() => {
    failMapaBRead = true;
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);

      if (url.startsWith('/api/astrologo/listar?')) return jsonResponse(listPayload);

      if (url === '/api/astrologo/ler') {
        const body = JSON.parse(String(init?.body)) as { id: string };
        if (body.id === mapaA.id) return jsonResponse({ ok: true, mapa: mapaA });
        if (failMapaBRead) return jsonResponse({ ok: false, error: 'Falha controlada ao ler B' }, false);
        return jsonResponse({ ok: true, mapa: mapaB });
      }

      if (url === '/api/astrologo/enviar-email') return jsonResponse({ ok: true });

      throw new Error(`Fetch inesperado no teste: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('bloqueia o envio quando B falha ao carregar depois de o relatório de A ter sido gerado', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <AstrologoModule />
      </NotificationProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Atualizar arquivo' }));

    const rowA = (await screen.findByText(mapaA.nome)).closest('li');
    const rowB = (await screen.findByText('Consulente B')).closest('li');
    expect(rowA).not.toBeNull();
    expect(rowB).not.toBeNull();

    await user.click(within(rowA as HTMLElement).getByRole('button', { name: 'Ler detalhes' }));
    await screen.findByText(/Mapa carregado com detalhes completos/);

    await user.click(within(rowB as HTMLElement).getByRole('button', { name: 'E-mail' }));
    await screen.findByText('Não foi possível carregar os detalhes do mapa.');

    // No código vulnerável, a falha de B ainda abre o formulário. Prosseguimos
    // deliberadamente para reproduzir a tentativa de enviar o relatório de A como B.
    const staleEmailInput = document.querySelector<HTMLInputElement>('#astrologo-email-inline-mapa-b');
    if (staleEmailInput) {
      await user.type(staleEmailInput, 'destino@example.com');
      const form = staleEmailInput.closest('form');
      expect(form).not.toBeNull();
      await user.click(within(form as HTMLFormElement).getByRole('button', { name: 'Enviar' }));
    }

    expect(staleEmailInput).toBeNull();

    await waitFor(() => {
      const unsafeSends = fetchMock.mock.calls
        .filter(([input]) => String(input) === '/api/astrologo/enviar-email')
        .map(([, init]) => {
          const body = JSON.parse(String((init as RequestInit | undefined)?.body)) as {
            nomeConsulente: string;
            relatorioTexto: string;
          };
          return {
            nomeConsulente: body.nomeConsulente,
            relatorioDeA: body.relatorioTexto.includes(mapaA.nome),
          };
        });

      expect(unsafeSends).toEqual([]);
    });
  });

  it('envia somente o relatório vinculado ao mesmo mapa do modal', async () => {
    failMapaBRead = false;
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <AstrologoModule />
      </NotificationProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Atualizar arquivo' }));
    const rowB = (await screen.findByText(mapaB.nome)).closest('li');
    expect(rowB).not.toBeNull();

    await user.click(within(rowB as HTMLElement).getByRole('button', { name: 'E-mail' }));
    const emailInput = document.querySelector<HTMLInputElement>(`#astrologo-email-inline-${mapaB.id}`);
    expect(emailInput).not.toBeNull();

    await user.type(emailInput as HTMLInputElement, 'destino@example.com');
    const form = (emailInput as HTMLInputElement).closest('form');
    expect(form).not.toBeNull();
    await user.click(within(form as HTMLFormElement).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => {
      const sendCall = fetchMock.mock.calls.find(([input]) => String(input) === '/api/astrologo/enviar-email');
      expect(sendCall).toBeDefined();
      const body = JSON.parse(String((sendCall?.[1] as RequestInit | undefined)?.body)) as Record<string, string>;
      expect(body).toMatchObject({
        mapaId: mapaB.id,
        nomeConsulente: mapaB.nome,
        relatorioTexto: `Relatório de ${mapaB.nome}`,
      });
    });
  });
});
