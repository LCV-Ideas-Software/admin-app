/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes de componente do CreateWorkerModal (PW-1): validação do nome
 * (hint/erro + botão desabilitado) e habilitação com nome válido.
 */

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../../components/Notification';
import { CreateWorkerModal } from './CreateWorkerModal';

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
      <CreateWorkerModal {...props} />
    </NotificationProvider>,
  );
  return props;
};

describe('CreateWorkerModal', () => {
  it('shows the naming hint and keeps submit disabled while the name is empty', () => {
    renderModal();
    expect(screen.getByText(/letras minúsculas, dígitos e hífens/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar Worker' })).toBeDisabled();
  });

  it('flags invalid names inline and keeps submit disabled', async () => {
    const user = userEvent.setup();
    renderModal();

    const input = screen.getByLabelText('Nome do Worker');
    await user.type(input, 'Meu_Worker');
    expect(screen.getByRole('alert')).toHaveTextContent(/letras minúsculas, dígitos e hífens/);
    expect(screen.getByRole('button', { name: 'Criar Worker' })).toBeDisabled();

    await user.clear(input);
    await user.type(input, '-worker');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar Worker' })).toBeDisabled();
  });

  it('enables submit for a valid name', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Nome do Worker'), 'meu-worker-01');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar Worker' })).toBeEnabled();
  });
});
