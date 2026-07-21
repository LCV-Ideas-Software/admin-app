/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes de componente do CreatePagesProjectModal (PW-3): validação de nome no
 * passo 1, aviso do GitHub App ao conectar repo e avanço para o passo 2.
 */

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../../components/Notification';
import { CreatePagesProjectModal } from './CreatePagesProjectModal';

afterEach(cleanup);

const renderModal = () => {
  const props = {
    open: true,
    adminActor: 'admin@app.lcv',
    onClose: vi.fn(),
    onCreated: vi.fn(),
  };
  render(
    <NotificationProvider>
      <CreatePagesProjectModal {...props} />
    </NotificationProvider>,
  );
  return props;
};

describe('CreatePagesProjectModal', () => {
  it('shows the naming hint and keeps Avançar disabled while the name is empty', () => {
    renderModal();
    expect(screen.getByText(/letras minúsculas, dígitos e hífens/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Avançar →' })).toBeDisabled();
  });

  it('flags invalid names inline and keeps Avançar disabled', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Nome do projeto'), 'Meu_Projeto');
    expect(screen.getByRole('alert')).toHaveTextContent(/letras minúsculas, dígitos e hífens/);
    expect(screen.getByRole('button', { name: 'Avançar →' })).toBeDisabled();
  });

  it('shows the GitHub App warning when connecting a repository', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByLabelText('Conectar repositório GitHub'));
    expect(screen.getByText(/instale o GitHub App da Cloudflare Pages/)).toBeInTheDocument();
    // Sem owner/repo o avanço continua bloqueado mesmo com nome válido.
    await user.type(screen.getByLabelText('Nome do projeto'), 'meu-projeto');
    expect(screen.getByRole('button', { name: 'Avançar →' })).toBeDisabled();
  });

  it('advances to step 2 (build config) with a valid name', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Nome do projeto'), 'meu-projeto');
    const advanceButton = screen.getByRole('button', { name: 'Avançar →' });
    expect(advanceButton).toBeEnabled();
    await user.click(advanceButton);

    expect(screen.getByLabelText('Build command (opcional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar projeto' })).toBeEnabled();
  });
});
