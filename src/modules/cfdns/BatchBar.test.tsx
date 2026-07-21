/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes do BatchBar (DNS-2): contagem de selecionados, gate do checkbox
 * tudo-ou-nada na exclusão em lote e montagem do formulário de edição em lote
 * entregue ao handler do controller.
 */

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BatchBar } from './BatchBar';
import type { BulkEditFormState } from './batchHelpers';

afterEach(cleanup);

const SELECTED_META = [
  { id: 'rec-1', type: 'A', name: 'a.example.com' },
  { id: 'rec-2', type: 'TXT', name: 'b.example.com' },
];

const renderBar = (overrides?: Partial<Parameters<typeof BatchBar>[0]>) => {
  const props = {
    selectedCount: 2,
    selectedMeta: SELECTED_META,
    busy: false,
    tagsSupported: true,
    commentMaxLength: 100,
    onClearSelection: vi.fn(),
    onApplyDelete: vi.fn().mockResolvedValue(true),
    onApplyEdit: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  render(<BatchBar {...props} />);
  return props;
};

describe('BatchBar', () => {
  it('shows the selection count and clears it via "Limpar seleção"', async () => {
    const user = userEvent.setup();
    const props = renderBar();

    expect(screen.getByText('2 selecionado(s)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Limpar seleção/ }));
    expect(props.onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('lists the affected records and only enables the bulk delete after the all-or-nothing ack', async () => {
    const user = userEvent.setup();
    const props = renderBar();

    await user.click(screen.getByRole('button', { name: /Excluir selecionados/ }));

    expect(screen.getByText('a.example.com')).toBeInTheDocument();
    expect(screen.getByText('b.example.com')).toBeInTheDocument();

    const applyButton = screen.getByRole('button', { name: /Excluir em lote/ });
    expect(applyButton).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /tudo-ou-nada/ }));
    expect(applyButton).toBeEnabled();

    await user.click(applyButton);
    expect(props.onApplyDelete).toHaveBeenCalledTimes(1);
  });

  it('sends only the changed fields of the bulk edit form to the controller handler', async () => {
    const user = userEvent.setup();
    const props = renderBar();

    await user.click(screen.getByRole('button', { name: /Editar em lote/ }));

    await user.selectOptions(screen.getByLabelText('TTL'), '1');
    await user.selectOptions(screen.getByLabelText('Proxy Cloudflare'), 'on');

    expect(screen.getByText('Aplicar a 2 registro(s): TTL→Auto, Proxy→ativado')).toBeInTheDocument();

    const applyButton = screen.getByRole('button', { name: /Aplicar em lote/ });
    expect(applyButton).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /tudo-ou-nada/ }));
    expect(applyButton).toBeEnabled();

    await user.click(applyButton);
    expect(props.onApplyEdit).toHaveBeenCalledTimes(1);

    const submitted = (props.onApplyEdit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as BulkEditFormState;
    expect(submitted.ttlChoice).toBe('1');
    expect(submitted.proxyMode).toBe('on');
    expect(submitted.commentMode).toBe('keep');
    expect(submitted.tagsMode).toBe('keep');
  });

  it('keeps the bulk edit apply disabled while every field stays in keep mode', async () => {
    const user = userEvent.setup();
    renderBar();

    await user.click(screen.getByRole('button', { name: /Editar em lote/ }));
    await user.click(screen.getByRole('checkbox', { name: /tudo-ou-nada/ }));

    expect(screen.getByRole('button', { name: /Aplicar em lote/ })).toBeDisabled();
  });
});
