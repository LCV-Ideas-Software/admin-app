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
  analise_ia: '<p>Conteúdo histórico preservado.</p>',
  created_at: '2026-07-11T15:30:45Z',
};

describe('astrological-report v2', () => {
  it('apresenta os Tatwas sem expor método ou proveniência internos', () => {
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
    expect(report.html).toContain('Akasha (Éter)');
    expect(report.html).toContain('Vayu (Ar)');
    expect(report.text).not.toMatch(/método|proveniência|fixed|âncora astronômica/iu);
    expect(report.html).not.toMatch(/método|proveniência|fixed|âncora astronômica/iu);
  });

  it('apresenta um Tatwa anterior sem revelar a classificação interna', () => {
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

    expect(report.text).toContain('Principal: *Vayu (Ar)*');
    expect(report.html).toContain('Vayu (Ar)');
    expect(report.text).not.toMatch(/método|mapa legado|legacy-rulingFirst/iu);
    expect(report.html).not.toMatch(/método|mapa legado|legacy-rulingFirst/iu);
  });

  it('apresenta um Tatwa sem marcador sem expor a inferência interna', () => {
    const report = generateAstrologicalReport({
      ...legacyMapa,
      dados_globais: JSON.stringify({
        tatwa: {
          principal: 'Tejas (Fogo)',
          sub: 'Apas (Água)',
        },
      }),
    });

    expect(report.text).toContain('Principal: *Tejas (Fogo)*');
    expect(report.html).toContain('Tejas (Fogo)');
    expect(report.text).not.toMatch(/método|registro legado/iu);
    expect(report.html).not.toMatch(/método|registro legado/iu);
    expect(report.text).toContain('O subtatwa é indicativo');
    expect(report.html).toContain('O subtatwa é indicativo');
  });

  it('omite do relatório um modo de cálculo desconhecido', () => {
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

    expect(report.text).toContain('Principal: *Apas (Água)*');
    expect(report.html).toContain('Apas (Água)');
    expect(report.text).not.toMatch(/método|future-mode/iu);
    expect(report.html).not.toMatch(/método|future-mode/iu);
  });

  it('ignora um Tatwa malformado sem impedir a geração do relatório', () => {
    const report = generateAstrologicalReport({
      ...legacyMapa,
      dados_globais: JSON.stringify({ tatwa: { principal: 'Akasha (Éter)' } }),
    });

    expect(report.text).not.toContain('*Tatwas:*');
    expect(report.html).not.toContain('Forças Globais: Tatwas');
    expect(report.text).toContain('Conteúdo histórico preservado.');
    expect(report.html).toContain('Conteúdo histórico preservado.');
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

  it('preserva a interpretação histórica, mas remove parágrafos técnicos da análise exibida e enviada', () => {
    const report = generateAstrologicalReport({
      ...legacyMapa,
      analise_ia: [
        '<p>Sol e Lua reforçam uma expressão afetiva direta.</p>',
        '<p>Versão do contrato posicional: 2.0.0; schemaId urn:astrologo:dados-posicionais.</p>',
        '<p>Perfil metodológico astrologo-natal-major-v1; referencial EQJ/J2000 para EQD.</p>',
      ].join(''),
    });

    expect(report.html).toContain('Sol e Lua reforçam uma expressão afetiva direta.');
    expect(report.text).toContain('Sol e Lua reforçam uma expressão afetiva direta.');
    expect(report.summary).toContain('Sol e Lua reforçam uma expressão afetiva direta.');
    expect(report.html).not.toMatch(/contrato posicional|schemaId|perfil metodológico|EQJ|J2000|EQD/iu);
    expect(report.text).not.toMatch(/contrato posicional|schemaId|perfil metodológico|EQJ|J2000|EQD/iu);
    expect(report.summary).not.toMatch(/contrato posicional|schemaId|perfil metodológico|EQJ|J2000|EQD/iu);
  });

  it('acrescenta os dez planetas e a falange após o conteúdo legado, sem grau IAU interno', () => {
    const dadosPosicionaisV2 = createDadosPosicionaisV2Fixture();
    const report = generateAstrologicalReport({
      ...legacyMapa,
      id: dadosPosicionaisV2.calculationId,
      dados_posicionais_v2: JSON.stringify(dadosPosicionaisV2),
    });

    expect(report.text.indexOf('Conteúdo histórico preservado.')).toBeLessThan(
      report.text.indexOf('POSIÇÕES PLANETÁRIAS E CORRESPONDÊNCIAS ANGÉLICAS'),
    );
    expect(report.text).toContain('Sol: 12°20\'44" de Áries | Constelação IAU: Áries (Ari) | Casa Placidus 1');
    expect(report.text).toContain('Anjo #3: Sitael');
    expect(report.text).toContain('ANJO REGENTE DO CONSULENTE');
    expect(report.text).toContain('Anjo #3: Sitael');
    expect(report.text).toContain('Falange angélica');
    expect(report.text).toContain('CÚSPIDES DAS 12 CASAS PLACIDUS');
    expect(report.text).toContain('Casa 12: 0°00\'00" de Peixes');
    expect(report.text).toContain('ÂNGULOS DO MAPA');
    expect(report.text).toContain('Ascendente: 15°30\'00" de Áries');
    expect(report.text).toContain('Meio do Céu: 15°15\'00" de Câncer');
    expect(report.text).toContain('Nascimento — Hora oficial de Brasília:* 20/05/1993 às 21:12:00');
    expect(report.text).not.toMatch(/grau(?:s)? (?:na|dentro da) constelação/i);

    expect(report.html.indexOf('Conteúdo histórico preservado.')).toBeLessThan(
      report.html.indexOf('Posições planetárias e correspondências angélicas'),
    );
    expect(report.html).toContain('<bdi lang="he" dir="rtl">והו</bdi>');
    expect(report.html).toContain('Anjo regente do consulente');
    expect(report.html).toContain('Anjo correspondente');
    expect(report.html).toContain('Cúspides das 12 Casas Placidus');
    expect(report.html).toContain('Ângulos do mapa');
    expect(report.html).toContain('#db2777');
    expect(report.text).not.toMatch(/\b(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\b/);
    expect(report.html).not.toMatch(/\b(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\b/);
    expect(report.text).not.toMatch(/urn:astrologo|iau-roman|mayhem-shem|America\/Sao_Paulo/);
    expect(report.html).not.toMatch(/urn:astrologo|iau-roman|mayhem-shem|America\/Sao_Paulo/);
    expect(report.text).not.toMatch(/contrato posicional|sha-256|astronomy engine|swiss ephemeris|wasm/iu);
    expect(report.html).not.toMatch(/contrato posicional|sha-256|astronomy engine|swiss ephemeris|wasm/iu);
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
    expect(report.text).toContain('grau na casa indisponível');
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
    expect(report.text).toContain('constelação IAU Áries');
    expect(report.text).toContain('Exatidão comprovada');
    expect(report.text).toContain('SINASTRIA');
    expect(report.text).toContain('João Antônio nas casas de Leonardo Cardozo');
    expect(report.text).toContain('Leonardo Cardozo nas casas de João Antônio');
    expect(report.text).toContain('não determina o destino da relação');
    expect(report.html).toContain('Céu atual e trânsitos');
    expect(report.html).toContain('Sinastria');
    expect(report.html).toContain('Constelação IAU: Áries');
    expect(report.html).not.toMatch(/astrologo-transit-major-v1|A:sun|recipient-placidus|compatibilidade/i);
  });

  it('propaga a localidade em Brasília e a cautela, sem referenciais ou implementação internos', () => {
    const locality = createLocalityMapV1Fixture();
    const report = generateAstrologicalReport({
      ...legacyMapa,
      id: locality.source.calculationId,
      locality_map_v1: JSON.stringify(locality),
    });

    expect(report.text).toContain('MAPA PLANETÁRIO DE LOCALIDADE');
    expect(report.text).toContain('20/05/1993 às 21:12:00');
    expect(report.text).toContain('não recomenda mudança');
    expect(report.html).toContain('Mapa planetário de localidade');
    expect(report.html).toContain('Hora oficial de Brasília');
    expect(report.text).not.toMatch(/EQJ|EQD|J2000|Natural Earth|grade amostrada|resolução latitudinal/iu);
    expect(report.html).not.toMatch(/EQJ|EQD|J2000|Natural Earth|tiles externos|grade amostrada/iu);
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

  it('avisa que o horário não tem fuso verificável sem classificar o mapa internamente', () => {
    const report = generateAstrologicalReport(legacyMapa);

    expect(report.text).toContain('Horário de nascimento sem fuso verificável');
    expect(report.html).toContain('Horário de nascimento sem fuso verificável');
    expect(report.text).not.toMatch(/mapa legado|dados posicionais v2/iu);
    expect(report.html).not.toMatch(/mapa legado|dados posicionais v2/iu);
    expect(report.text).not.toContain('Horário de nascimento em Brasília');
    expect(report.text).not.toContain('10:00');
    expect(report.html).not.toContain('10:00');
  });

  it('não inclui metadados técnicos do cálculo em nenhuma saída destinada ao consulente', () => {
    const dadosPosicionaisV2 = createDadosPosicionaisV2Fixture();
    const natal = createNatalChartAnalysisV1Fixture(dadosPosicionaisV2.calculationId);
    const locality = createLocalityMapV1Fixture(dadosPosicionaisV2.calculationId);
    const report = generateAstrologicalReport({
      ...legacyMapa,
      id: dadosPosicionaisV2.calculationId,
      dados_posicionais_v2: JSON.stringify(dadosPosicionaisV2),
      natal_chart_analysis_v1: JSON.stringify(natal),
      locality_map_v1: JSON.stringify(locality),
    });
    const internalTerms =
      /schema|contrato posicional|perfil maior versionado|artefato|validação defensiva|recalculado pelo Admin|SHA-256|WASM|Astronomy Engine|Swiss Ephemeris|EQJ|EQD|J2000|Natural Earth|mapa legado|dados posicionais v2/iu;

    expect(report.text).not.toMatch(internalTerms);
    expect(report.html).not.toMatch(internalTerms);
    expect(report.summary).not.toMatch(internalTerms);
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
