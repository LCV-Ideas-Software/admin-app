/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Teste de componente do KvValueDrawer em modo criação (ST-KV): contador de
 * bytes UTF-8 do nome da chave (multibyte), gating do botão Salvar e erro
 * inline de TTL abaixo do mínimo sem chamada de rede.
 */

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../../../../components/Notification';
import { KvValueDrawer } from './KvValueDrawer';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const renderCreateDrawer = () => {
  const props = {
    adminActor: 'admin@app.lcv',
    namespaceId: 'ns-1',
    mode: 'create' as const,
    entry: null,
    onClose: vi.fn(),
    onChanged: vi.fn(),
  };
  render(
    <NotificationProvider>
      <KvValueDrawer {...props} />
    </NotificationProvider>,
  );
  return props;
};

describe('KvValueDrawer (modo criação)', () => {
  it('shows the UTF-8 byte counter for multibyte key names and enables Salvar only with a name', async () => {
    const user = userEvent.setup();
    renderCreateDrawer();

    expect(screen.getByText('0 / 512 bytes UTF-8')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();

    await user.type(screen.getByLabelText('Nome da chave'), 'π♥');
    // 'π' = 2 bytes + '♥' = 3 bytes → 5 bytes para 2 caracteres.
    expect(screen.getByText('5 / 512 bytes UTF-8')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });

  it('blocks saving with TTL below 60 and shows the inline error without calling the API', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const user = userEvent.setup();
    const props = renderCreateDrawer();

    await user.type(screen.getByLabelText('Nome da chave'), 'config');
    await user.type(screen.getByLabelText(/TTL em segundos/), '59');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/60 segundos/);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(props.onChanged).not.toHaveBeenCalled();
  });
});
