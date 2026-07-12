import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logModuleOperationalEvent } = vi.hoisted(() => ({
  logModuleOperationalEvent: vi.fn(),
}));

vi.mock('../../../functions/api/_lib/operational', () => ({
  logModuleOperationalEvent,
}));

import { handleAstrologoEnviarEmailPost } from './astrologoEmail.ts';

describe('handleAstrologoEnviarEmailPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ id: 'email_123' }),
      })),
    );
  });

  it('masks the destination email in operational telemetry metadata', async () => {
    const request = new Request('https://admin.lcv.app.br/api/astrologo/enviar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': 'admin@lcv.app.br' },
      body: JSON.stringify({
        emailDestino: 'consulente@example.com',
        relatorioHtml: '<p>ok</p>',
        relatorioTexto: 'ok',
        nomeConsulente: 'Teste',
      }),
    });

    const response = await handleAstrologoEnviarEmailPost({
      request,
      env: {
        RESEND_API_KEY: 'resend-key',
        BIGDATA_DB: {} as unknown,
      },
    });

    expect(response.status).toBe(200);
    expect(logModuleOperationalEvent).toHaveBeenCalledTimes(1);
    expect(logModuleOperationalEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          action: 'send-email',
          emailDestino: 'co***@ex***.com',
        }),
      }),
    );
  });

  it('preserves the natal aspects and houses sections in the administrative email payload', async () => {
    const request = new Request('https://admin.lcv.app.br/api/astrologo/enviar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': 'admin@lcv.app.br' },
      body: JSON.stringify({
        emailDestino: 'consulente@example.com',
        relatorioHtml: '<section><h2>Aspectos natais</h2><h2>Análise das casas</h2></section>',
        relatorioTexto: '*ASPECTOS NATAIS*\n*ANÁLISE DAS CASAS*',
        nomeConsulente: 'Teste',
      }),
    });

    const response = await handleAstrologoEnviarEmailPost({
      request,
      env: { RESEND_API_KEY: 'resend-key' },
    });

    expect(response.status).toBe(200);
    const fetchMock = vi.mocked(fetch);
    const requestBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.body)) as {
      html: string;
      text: string;
    };
    expect(requestBody.html).toContain('Aspectos natais');
    expect(requestBody.html).toContain('Análise das casas');
    expect(requestBody.text).toContain('ASPECTOS NATAIS');
    expect(requestBody.text).toContain('ANÁLISE DAS CASAS');
  });

  it('preserves transit and reciprocal synastry sections in the administrative email payload', async () => {
    const request = new Request('https://admin.lcv.app.br/api/astrologo/enviar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': 'admin@lcv.app.br' },
      body: JSON.stringify({
        emailDestino: 'consulente@example.com',
        relatorioHtml:
          '<section><h2>Céu atual e trânsitos</h2><p>Constelação IAU: Áries — grau interno não definido</p><h2>Sinastria</h2></section>',
        relatorioTexto: '*CÉU ATUAL E TRÂNSITOS*\nConstelação IAU: Áries — grau interno não definido\n*SINASTRIA*',
        nomeConsulente: 'Teste',
      }),
    });

    const response = await handleAstrologoEnviarEmailPost({
      request,
      env: { RESEND_API_KEY: 'resend-key' },
    });

    expect(response.status).toBe(200);
    const fetchMock = vi.mocked(fetch);
    const requestBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.body)) as {
      html: string;
      text: string;
    };
    expect(requestBody.html).toContain('Céu atual e trânsitos');
    expect(requestBody.html).toContain('Sinastria');
    expect(requestBody.html).toContain('Constelação IAU: Áries — grau interno não definido');
    expect(requestBody.text).toContain('CÉU ATUAL E TRÂNSITOS');
    expect(requestBody.text).toContain('SINASTRIA');
    expect(requestBody.text).toContain('Constelação IAU: Áries — grau interno não definido');
  });

  it('preserves the locality section in the administrative email payload', async () => {
    const request = new Request('https://admin.lcv.app.br/api/astrologo/enviar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Actor': 'admin@lcv.app.br' },
      body: JSON.stringify({
        emailDestino: 'consulente@example.com',
        relatorioHtml: '<section><h2>Mapa planetário de localidade</h2><p>Natural Earth 1:110m</p></section>',
        relatorioTexto: '*MAPA PLANETÁRIO DE LOCALIDADE*\nNatural Earth 1:110m',
        nomeConsulente: 'Teste',
      }),
    });

    const response = await handleAstrologoEnviarEmailPost({
      request,
      env: { RESEND_API_KEY: 'resend-key' },
    });

    expect(response.status).toBe(200);
    const fetchMock = vi.mocked(fetch);
    const requestBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.body)) as {
      html: string;
      text: string;
    };
    expect(requestBody.html).toContain('Mapa planetário de localidade');
    expect(requestBody.html).toContain('Natural Earth 1:110m');
    expect(requestBody.text).toContain('MAPA PLANETÁRIO DE LOCALIDADE');
  });
});
