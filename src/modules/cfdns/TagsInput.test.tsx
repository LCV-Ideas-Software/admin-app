/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes do input de tags em chips (DNS-1): Enter adiciona chip válida,
 * formato inválido gera erro pt-BR inline, × remove e o gating de plano
 * (tagsSupported=false) desabilita o campo com hint.
 */

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { TagsInput } from './recordEditors';

afterEach(cleanup);

function Harness({ tagsSupported = true, initialTags = [] }: { tagsSupported?: boolean; initialTags?: string[] }) {
  const [tags, setTags] = useState<string[]>(initialTags);
  return (
    <TagsInput idPrefix="test" tags={tags} onTagsChange={setTags} disabled={false} tagsSupported={tagsSupported} />
  );
}

describe('TagsInput', () => {
  it('adds a chip on Enter for a valid nome:valor tag (unicode value)', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByLabelText('Tags');
    await user.type(input, 'ambiente:produção');
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'Remover tag ambiente:produção' })).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('shows a pt-BR error and adds no chip for an invalid tag', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Tags'), 'nome com espaço');
    await user.keyboard('{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent('Tag inválida');
    expect(screen.queryByRole('button', { name: /Remover tag/ })).not.toBeInTheDocument();
  });

  it('removes a chip via the × button', async () => {
    const user = userEvent.setup();
    render(<Harness initialTags={['infra']} />);

    await user.click(screen.getByRole('button', { name: 'Remover tag infra' }));

    expect(screen.queryByRole('button', { name: 'Remover tag infra' })).not.toBeInTheDocument();
  });

  it('disables the input and shows the paid-plan hint when tagsSupported=false', () => {
    render(<Harness tagsSupported={false} />);

    expect(screen.getByLabelText('Tags')).toBeDisabled();
    expect(screen.getByText('Tags exigem plano pago na Cloudflare.')).toBeInTheDocument();
  });
});
