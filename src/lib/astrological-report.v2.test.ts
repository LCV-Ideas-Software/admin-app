/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest';
import { createDadosPosicionaisV2Fixture } from '../test/fixtures/astrologo-positional-v2';
import { generateAstrologicalReport } from './astrological-report';

const legacyMapa = {
  id: 'mapa-legado-001',
  nome: 'Consulente Legado',
  data_nascimento: '1990-01-01',
  hora_nascimento: '10:00',
  local_nascimento: 'São Paulo',
  dados_astronomica: null,
  dados_tropical: null,
  dados_globais: null,
  analise_ia: '<p>Conteúdo legado preservado.</p>',
  created_at: '2026-07-11T15:30:45Z',
};

describe('astrological-report v2', () => {
  it('acrescenta os dez planetas e a falange após o conteúdo legado, sem grau IAU interno', () => {
    const dadosPosicionaisV2 = createDadosPosicionaisV2Fixture();
    const report = generateAstrologicalReport({
      ...legacyMapa,
      id: dadosPosicionaisV2.calculationId,
      dados_posicionais_v2: JSON.stringify(dadosPosicionaisV2),
    });

    expect(report.text.indexOf('Conteúdo legado preservado.')).toBeLessThan(
      report.text.indexOf('POSIÇÕES PLANETÁRIAS E CORRESPONDÊNCIAS ANGÉLICAS'),
    );
    expect(report.text).toContain('Sol: 12°20\'44" de Áries | Constelação IAU: Áries (Ari) | Casa Placidus 1');
    expect(report.text).toContain('Anjo #3: Sitael');
    expect(report.text).toContain('Falange angélica');
    expect(report.text).toContain('Calculado em 11/07/2026 às 12:30:45 — Hora oficial de Brasília');
    expect(report.text).not.toMatch(/grau(?:s)? (?:na|dentro da) constelação/i);

    expect(report.html.indexOf('Conteúdo legado preservado.')).toBeLessThan(
      report.html.indexOf('Posições planetárias e correspondências angélicas'),
    );
    expect(report.html).toContain('<bdi lang="he" dir="rtl">והו</bdi>');
    expect(report.html).not.toContain('5fc61d188c19097709c4674f756da5b2.jpg');
  });

  it('avisa em mapas legados que o horário não tem fuso verificável e não fabrica conversão', () => {
    const report = generateAstrologicalReport(legacyMapa);

    expect(report.text).toContain('Mapa legado: horário de nascimento sem fuso verificável');
    expect(report.html).toContain('Mapa legado: horário de nascimento sem fuso verificável');
    expect(report.text).not.toContain('Horário de nascimento em Brasília');
  });
});
