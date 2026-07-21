/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes do fluxo de confirmação reforçada do DNS-3 (ZoneConfirmDialog):
 * digitar o nome exato habilita o botão; em zona crítica o checkbox de
 * ciência também é obrigatório.
 */

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZoneConfirmDialog } from './ZoneConfirmDialog';

afterEach(cleanup);

const renderDialog = (overrides?: Partial<Parameters<typeof ZoneConfirmDialog>[0]>) => {
  const props = {
    open: true,
    title: 'Excluir zona example.com',
    description: 'A ação é irreversível.',
    zoneName: 'example.com',
    critical: false,
    criticalAckLabel: 'Entendo que esta é a zona crítica que hospeda o admin-app.',
    confirmLabel: 'Excluir zona',
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
  render(<ZoneConfirmDialog {...props} />);
  return props;
};

describe('ZoneConfirmDialog', () => {
  it('enables the confirm button only after typing the exact zone name', async () => {
    const user = userEvent.setup();
    const props = renderDialog();

    const confirmButton = screen.getByRole('button', { name: /Excluir zona/ });
    expect(confirmButton).toBeDisabled();

    const nameInput = screen.getByLabelText(/para confirmar/);
    await user.type(nameInput, 'exemplo.com');
    expect(confirmButton).toBeDisabled();

    await user.clear(nameInput);
    await user.type(nameInput, 'example.com');
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(props.onConfirm).toHaveBeenCalledWith({ confirmName: 'example.com', confirmCritical: false });
  });

  it('also requires the critical-zone ack checkbox when the zone is critical', async () => {
    const user = userEvent.setup();
    const props = renderDialog({
      zoneName: 'lcv.app.br',
      critical: true,
      title: 'Excluir zona lcv.app.br',
    });

    const confirmButton = screen.getByRole('button', { name: /Excluir zona/ });
    await user.type(screen.getByLabelText(/para confirmar/), 'lcv.app.br');
    expect(confirmButton).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /zona crítica/ }));
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(props.onConfirm).toHaveBeenCalledWith({ confirmName: 'lcv.app.br', confirmCritical: true });
  });

  it('does not render the ack checkbox for non-critical zones and cancels via "Cancelar"', async () => {
    const user = userEvent.setup();
    const props = renderDialog();

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });
});
