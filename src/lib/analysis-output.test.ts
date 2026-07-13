import { describe, expect, it } from 'vitest';
import { stripInternalAnalysisMarkers, stripInternalDetailBlocksWithoutDom } from './analysis-output';

describe('barreira editorial para análises históricas', () => {
  it('remove blocos técnicos, mas preserva nomes próprios e interpretações', () => {
    const result = stripInternalAnalysisMarkers(
      [
        '<p>O trígono entre Sol e Lua favorece a integração entre identidade e afeto.</p>',
        '<p>A Casa 7 enfatiza reciprocidade, escuta e acordos conscientes.</p>',
        '<p>Claude reconhece na sinastria um vínculo de comunicação e afeto.</p>',
        '<p>O modelo Gemini recebeu o payload com schemaVersion 2.0.0.</p>',
        '<p>Jeliel inspira conciliação na expressão solar do consulente.</p>',
        '<p>O endpoint recebeu DADOS_NATAIS com calculationId interno.</p>',
        '<p>Contrato posicional versão 2.0.0, SHA-256 registrado.</p>',
      ].join(''),
    );

    expect(result).toContain('trígono entre Sol e Lua');
    expect(result).toContain('A Casa 7 enfatiza reciprocidade');
    expect(result).toContain('Claude reconhece na sinastria');
    expect(result).toContain('Jeliel inspira conciliação');
    expect(result).not.toMatch(
      /modelo Gemini|payload|schemaVersion|endpoint|DADOS_NATAIS|calculationId|Contrato posicional|SHA-256/iu,
    );
  });

  it('no caminho sem DOM preserva um bloco legítimo mesmo quando resíduo técnico está na mesma linha', () => {
    const result = stripInternalDetailBlocksWithoutDom(
      '<p>Sol e Lua integram identidade e afeto.</p><span>schemaVersion 2.0.0</span>',
    );

    expect(result).toBe('<p>Sol e Lua integram identidade e afeto.</p>');
  });

  it('remove uma sentinela na mesma linha sem descartar o parágrafo interpretativo', () => {
    const result = stripInternalAnalysisMarkers(
      '⟦ASTROLOGO_PAYLOAD:canonical.v2:2584512c65f96e4e4dec19c3f5180cd0df189c3924e7ca92c4bd4ed9f0f5dc22⟧<p>Vênus na Casa 5 amplia a expressão afetiva e criativa.</p>',
    );

    expect(result).toBe('<p>Vênus na Casa 5 amplia a expressão afetiva e criativa.</p>');
  });

  it('no texto simples remove somente a linha técnica', () => {
    const result = stripInternalDetailBlocksWithoutDom(
      'A quadratura mobiliza amadurecimento.\nContrato posicional versão 2.0.0.\nA Casa 7 pede reciprocidade.',
    );

    expect(result).toContain('A quadratura mobiliza amadurecimento.');
    expect(result).toContain('A Casa 7 pede reciprocidade.');
    expect(result).not.toContain('Contrato posicional');
  });
});
