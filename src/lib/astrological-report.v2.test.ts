/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from 'vitest';
import { createLocalityMapV1Fixture } from '../test/fixtures/astrologo-locality-map-v1';
import { createNatalChartAnalysisV1Fixture } from '../test/fixtures/astrologo-natal-analysis-v1';
import { createDadosPosicionaisV2Fixture } from '../test/fixtures/astrologo-positional-v2';
import { createSynastryRunV1Fixture, createTransitRunV1Fixture } from '../test/fixtures/astrologo-transit-synastry-v1';
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
  it('identifica no texto e no HTML um Tatwa produzido pelo método atual', () => {
    const report = generateAstrologicalReport({
      ...legacyMapa,
      dados_globais: JSON.stringify({
        tatwa: {
          schemaVersion: '2.0.0',
          principal: 'Akasha (Éter)',
          sub: 'Vayu (Ar)',
          calculationMode: 'fixed',
          anchor: {
            birthInstantUtc: '1993-05-21T00:12:00Z',
            sunriseInstantUtc: '1993-05-20T09:20:43.155Z',
            timeZoneIana: 'America/Sao_Paulo',
            latitudeDeg: -22.90642,
            longitudeDeg: -43.18223,
          },
        },
      }),
    });

    expect(report.text).toContain('Principal: *Akasha (Éter)*');
    expect(report.text).toContain('Subtatwa: *Vayu (Ar)*');
    expect(report.text).toContain('Método: *Ordem fixa — Akasha primeiro*');
    expect(report.html).toContain('Akasha (Éter)');
    expect(report.html).toContain('Vayu (Ar)');
    expect(report.html).toContain('Ordem fixa — Akasha primeiro');
    expect(report.text).toContain('Proveniência: âncora astronômica registrada');
    expect(report.html).toContain('Proveniência: âncora astronômica registrada');
    expect(report.text).not.toContain('fixed');
    expect(report.html).not.toContain('fixed');
  });

  it('identifica um Tatwa legado explicitamente marcado', () => {
    const report = generateAstrologicalReport({
      ...legacyMapa,
      dados_globais: JSON.stringify({
        tatwa: {
          principal: 'Vayu (Ar)',
          sub: 'Vayu (Ar)',
          calculationMode: 'legacy-rulingFirst',
        },
      }),
    });

    expect(report.text).toContain('Método: *Ordem pelo principal — Tatwa principal primeiro*');
    expect(report.html).toContain('Ordem pelo principal — Tatwa principal primeiro');
    expect(report.text).not.toContain('legacy-rulingFirst');
    expect(report.html).not.toContain('legacy-rulingFirst');
  });

  it('identifica como legado inferido um Tatwa anterior ao marcador', () => {
    const report = generateAstrologicalReport({
      ...legacyMapa,
      dados_globais: JSON.stringify({
        tatwa: {
          principal: 'Tejas (Fogo)',
          sub: 'Apas (Água)',
        },
      }),
    });

    expect(report.text).toContain('Método: *Registro legado — ordem pelo principal*');
    expect(report.html).toContain('Registro legado — ordem pelo principal');
    expect(report.text).toContain('O subtatwa é indicativo');
    expect(report.html).toContain('O subtatwa é indicativo');
  });

  it('não converte um modo explícito desconhecido em legado', () => {
    const report = generateAstrologicalReport({
      ...legacyMapa,
      dados_globais: JSON.stringify({
        tatwa: {
          principal: 'Apas (Água)',
          sub: 'Prithvi (Terra)',
          calculationMode: 'future-mode',
        },
      }),
    });

    expect(report.text).toContain('Método: *Método de cálculo não identificado*');
    expect(report.html).toContain('Método de cálculo não identificado');
    expect(report.text).not.toContain('future-mode');
    expect(report.html).not.toContain('future-mode');
  });

  it('ignora um Tatwa malformado sem impedir a geração do relatório', () => {
    const report = generateAstrologicalReport({
      ...legacyMapa,
      dados_globais: JSON.stringify({ tatwa: { principal: 'Akasha (Éter)' } }),
    });

    expect(report.text).not.toContain('*Tatwas:*');
    expect(report.html).not.toContain('Forças Globais: Tatwas');
    expect(report.text).toContain('Conteúdo legado preservado.');
    expect(report.html).toContain('Conteúdo legado preservado.');
  });

  it('não propaga sentinelas internas de análises legadas para HTML, texto ou resumo', () => {
    const marker = `⟦ASTROLOGO_PAYLOAD:advanced.synastry:${'e'.repeat(64)}⟧`;
    const report = generateAstrologicalReport({
      ...legacyMapa,
      analise_ia: `<p>Antes ${marker} depois.</p>`,
    });

    expect(report.html).toContain('Antes');
    expect(report.text).toContain('depois.');
    expect(report.summary).toContain('Antes');
    expect(report.html).not.toContain('ASTROLOGO_PAYLOAD');
    expect(report.text).not.toContain('ASTROLOGO_PAYLOAD');
    expect(report.summary).not.toContain('ASTROLOGO_PAYLOAD');
  });

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
    expect(report.text).toContain('ANJO REGENTE DO CONSULENTE');
    expect(report.text).toContain('Anjo #3: Sitael');
    expect(report.text).toContain('Critério: quinário tropical da posição do Sol');
    expect(report.text).toContain('Falange angélica');
    expect(report.text).toContain('CÚSPIDES DAS 12 CASAS PLACIDUS');
    expect(report.text).toContain('Casa 12: 0°00\'00" de Peixes');
    expect(report.text).toContain('ÂNGULOS DO MAPA');
    expect(report.text).toContain('Ascendente: 15°30\'00" de Áries');
    expect(report.text).toContain('Meio do Céu: 15°15\'00" de Câncer');
    expect(report.text).toContain('Calculado em 11/07/2026 às 12:30:45 — Hora oficial de Brasília');
    expect(report.text).not.toMatch(/grau(?:s)? (?:na|dentro da) constelação/i);

    expect(report.html.indexOf('Conteúdo legado preservado.')).toBeLessThan(
      report.html.indexOf('Posições planetárias e correspondências angélicas'),
    );
    expect(report.html).toContain('<bdi lang="he" dir="rtl">והו</bdi>');
    expect(report.html).toContain('Anjo regente do consulente');
    expect(report.html).toContain('Quinário tropical da posição do Sol');
    expect(report.html).toContain('Cúspides das 12 Casas Placidus');
    expect(report.html).toContain('Ângulos do mapa');
    expect(report.html).toContain('#db2777');
    expect(report.text).not.toMatch(/\b(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\b/);
    expect(report.html).not.toMatch(/\b(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\b/);
    expect(report.text).not.toMatch(/urn:astrologo|iau-roman|mayhem-shem|America\/Sao_Paulo/);
    expect(report.html).not.toMatch(/urn:astrologo|iau-roman|mayhem-shem|America\/Sao_Paulo/);
    expect(report.html).not.toContain('5fc61d188c19097709c4674f756da5b2.jpg');
  });

  it('propaga aspectos natais e casas para o relatório de texto e HTML do e-mail', () => {
    const natal = createNatalChartAnalysisV1Fixture();
    const report = generateAstrologicalReport({
      ...legacyMapa,
      id: natal.source.calculationId,
      natal_chart_analysis_v1: JSON.stringify(natal),
    });

    expect(report.text).toContain('ASPECTOS NATAIS');
    expect(report.text).toContain('Sol — Sextil — Lua');
    expect(report.text).toContain('Exato');
    expect(report.text).toContain('ANÁLISE DAS CASAS');
    expect(report.text).toContain('Sol: 12°00\'00" dentro da Casa 1');
    expect(report.text).toContain('não foi estimado pelas cúspides');
    expect(report.html).toContain('Aspectos natais');
    expect(report.html).toContain('Análise das casas');
    expect(report.html).not.toMatch(/fixed-by-aspect|planet:sun|POSITION_V2_0/);
  });

  it('propaga trânsitos e sinastria recíproca com cautelas e formatos brasileiros', () => {
    const transit = createTransitRunV1Fixture();
    const synastry = createSynastryRunV1Fixture(transit.source.natal.calculationId);
    const report = generateAstrologicalReport({
      ...legacyMapa,
      id: transit.source.natal.calculationId,
      transit_run_v1: JSON.stringify(transit),
      synastry_run_v1: JSON.stringify(synastry),
      synastry_subjects: { A: 'João Antônio', B: 'Leonardo Cardozo' },
    });

    expect(report.text).toContain('CÉU ATUAL E TRÂNSITOS');
    expect(report.text).toContain('12/07/2026 às 12:00:00');
    expect(report.text).toContain('Sol em trânsito e Lua natal');
    expect(report.text).toContain('constelação IAU Áries, sem grau interno definido');
    expect(report.text).toContain('Exatidão comprovada');
    expect(report.text).toContain('SINASTRIA');
    expect(report.text).toContain('João Antônio nas casas de Leonardo Cardozo');
    expect(report.text).toContain('Leonardo Cardozo nas casas de João Antônio');
    expect(report.text).toContain('não determina o destino da relação');
    expect(report.html).toContain('Céu atual e trânsitos');
    expect(report.html).toContain('Sinastria');
    expect(report.html).toContain('Constelação IAU: Áries — grau interno não definido');
    expect(report.html).not.toMatch(/astrologo-transit-major-v1|A:sun|recipient-placidus|compatibilidade/i);
  });

  it('propaga a localidade com EQJ para EQD, Natural Earth, Brasília e cautela de não relocação', () => {
    const locality = createLocalityMapV1Fixture();
    const report = generateAstrologicalReport({
      ...legacyMapa,
      id: locality.source.calculationId,
      locality_map_v1: JSON.stringify(locality),
    });

    expect(report.text).toContain('MAPA PLANETÁRIO DE LOCALIDADE');
    expect(report.text).toContain('20/05/1993 às 21:12:00');
    expect(report.text).toContain('EQJ/J2000 → EQD verdadeiro da data');
    expect(report.text).toContain('Natural Earth 1:110m');
    expect(report.text).toContain('não recomenda mudança');
    expect(report.html).toContain('Mapa planetário de localidade');
    expect(report.html).toContain('Hora oficial de Brasília');
    expect(report.html).not.toMatch(/raio de influência|recomenda-se mudar/i);
  });

  it('usa o instante v2 em Brasília no cabeçalho, sem exibir como nascimento o horário civil cru', () => {
    const dadosPosicionaisV2 = createDadosPosicionaisV2Fixture();
    dadosPosicionaisV2.birthContext.timeResolution.instantUtc = '2000-07-16T01:30:00Z';

    const report = generateAstrologicalReport({
      ...legacyMapa,
      id: dadosPosicionaisV2.calculationId,
      data_nascimento: '2000-07-16',
      hora_nascimento: '01:30',
      dados_posicionais_v2: JSON.stringify(dadosPosicionaisV2),
    });

    expect(report.text).toContain('*Nascimento — Hora oficial de Brasília:* 15/07/2000 às 22:30:00');
    expect(report.html).toContain('Nascimento — Hora oficial de Brasília');
    expect(report.html).toContain('15/07/2000 às 22:30:00');
    expect(report.text).not.toMatch(/16\/07\/2000 às 01:30|America\/Sao_Paulo/);
    expect(report.html).not.toMatch(/16\/07\/2000 às 01:30|America\/Sao_Paulo/);
  });

  it('avisa em mapas legados que o horário não tem fuso verificável e não fabrica conversão', () => {
    const report = generateAstrologicalReport(legacyMapa);

    expect(report.text).toContain('Mapa legado: horário de nascimento sem fuso verificável');
    expect(report.html).toContain('Mapa legado: horário de nascimento sem fuso verificável');
    expect(report.text).not.toContain('Horário de nascimento em Brasília');
    expect(report.text).not.toContain('10:00');
    expect(report.html).not.toContain('10:00');
  });

  it('escapa no HTML todos os campos persistidos usados no cabeçalho do e-mail', () => {
    const report = generateAstrologicalReport({
      ...legacyMapa,
      nome: '<img src=x onerror=alert(1)>',
      local_nascimento: '<script>alert(2)</script>',
    });

    expect(report.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(report.html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
    expect(report.html).not.toContain('<img src=x onerror=alert(1)>');
    expect(report.html).not.toContain('<script>alert(2)</script>');
  });
});
