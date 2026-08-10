/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../components/Notification';
import { MaestroAiModule } from './MaestroAiModule';

const AGENT_KEYS = ['claude', 'codex', 'gemini', 'deepseek', 'grok', 'perplexity'] as const;

const rate = { input_usd_per_million: 1, output_usd_per_million: 2 };

const settingsPayload = {
  ok: true,
  settings: {
    protocol_text:
      'Protocolo editorial de teste com mais de cem caracteres para satisfazer o backend em cenários reais de gravação.',
    max_cost_usd: 5,
    max_runtime_minutes: null,
    max_cycles: 2,
    rates: Object.fromEntries(AGENT_KEYS.map((key) => [key, rate])),
    models: Object.fromEntries(AGENT_KEYS.map((key) => [key, `${key}-model`])),
    agents: AGENT_KEYS.map((key) => ({
      key,
      label: key,
      secret_name: key === 'gemini' ? 'VERTEX_SA_KEY' : `MAESTRO_${key.toUpperCase()}_API_KEY`,
      configured: true,
      runtime_ready: true,
      financially_ready: true,
      model: `${key}-model`,
      rates: rate,
    })),
    updated_at: '2026-08-09T00:00:00Z',
  },
};

const putBodies: unknown[] = [];

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.includes('/api/maestro-ai/settings')) {
    if (init?.method === 'PUT') {
      putBodies.push(JSON.parse(String(init.body)));
    }
    return new Response(JSON.stringify(settingsPayload), { status: 200 });
  }
  if (url.includes('/api/maestro-ai/sessions')) {
    return new Response(JSON.stringify({ ok: true, sessions: [] }), { status: 200 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});

const renderModule = () =>
  render(
    <NotificationProvider>
      <MaestroAiModule />
    </NotificationProvider>,
  );

const settingsSection = () => within(screen.getByRole('region', { name: /Configurações/i }));

const geminiKeyField = (): HTMLInputElement | undefined => {
  const inputs = Array.from(document.querySelectorAll('input[type="password"]'));
  return inputs.find((element) => /VERTEX_SA_KEY/i.test(element.getAttribute('placeholder') ?? '')) as
    | HTMLInputElement
    | undefined;
};

beforeEach(() => {
  putBodies.length = 0;
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('MaestroAiModule — credencial do Gemini é gerida pela infraestrutura', () => {
  it('desabilita o campo de chave do Gemini e explica onde a credencial vive', async () => {
    renderModule();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    const campo = await waitFor(() => {
      const found = geminiKeyField();
      expect(found).toBeDefined();
      return found as HTMLInputElement;
    });
    expect(campo.disabled).toBe(true);
    expect(campo.placeholder).toContain('VERTEX_SA_KEY');
  });

  it('salvar continua funcionando com os demais ajustes, sem chave do Gemini no payload', async () => {
    renderModule();
    await waitFor(() => expect(settingsSection().getByRole('button', { name: 'Salvar' })).toBeEnabled());

    await userEvent.click(settingsSection().getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(putBodies).toHaveLength(1));
    const body = putBodies[0] as { api_keys?: Record<string, string>; protocol_text?: string };
    expect(Object.keys(body.api_keys ?? {})).not.toContain('gemini');
    expect(body.protocol_text).toContain('Protocolo editorial de teste');
  });
});
