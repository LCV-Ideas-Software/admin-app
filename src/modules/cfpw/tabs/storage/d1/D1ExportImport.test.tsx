/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../../api';
import { D1ExportImport } from './D1ExportImport';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const okResponse = () => new Response(null, { status: 200 });

describe('D1ExportImport', () => {
  it('polls a new import after the operator previously cancels export polling', async () => {
    vi.spyOn(api, 'postD1Export').mockImplementation(() => new Promise(() => {}));
    const postImport = vi
      .spyOn(api, 'postD1Import')
      .mockResolvedValueOnce({
        response: okResponse(),
        payload: { ok: true, result: { upload_url: 'https://upload.test/dump.sql', filename: 'dump.sql' } },
      })
      .mockResolvedValueOnce({
        response: okResponse(),
        payload: { ok: true, result: { status: 'complete', success: true } },
      });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse()));

    const user = userEvent.setup();
    render(
      <D1ExportImport adminActor="admin@app.lcv" database={{ uuid: 'db-1', name: 'financeiro', protected: false }} />,
    );

    await user.click(screen.getByRole('button', { name: 'Exportar' }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar polling' }));

    await user.upload(
      screen.getByLabelText('Arquivo .sql'),
      new File(['CREATE TABLE t (id INTEGER);'], 'dump.sql', { type: 'application/sql' }),
    );
    await user.click(screen.getByRole('button', { name: 'Importar' }));
    await user.type(screen.getByLabelText('Verificação de segurança'), 'financeiro');
    await user.click(screen.getByRole('button', { name: 'Iniciar import' }));

    await waitFor(() => expect(postImport).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Import concluído\./)).toBeInTheDocument();
  });
});
