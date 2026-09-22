import { describe, expect, it } from 'vitest';

import { formatBlockManifestForPrompt, segmentEditorialBlocks, validateRevisionContentLock } from './content-lock.ts';

// Oracle fixtures mirror maestro-app editorial_content_lock.rs (canonical).
const BEFORE = '# Titulo\n\nParagrafo aprovado e denso.\n\nReferencia pendente citada.';

describe('Maestro AI approved-content lock (Plan B2)', () => {
  it('segments blocks on blank lines with B%04d ids', () => {
    const blocks = segmentEditorialBlocks(BEFORE);
    expect(blocks.map((block) => block.id)).toEqual(['B0001', 'B0002', 'B0003']);
    expect(segmentEditorialBlocks('  \n\n  ')).toEqual([]);
    // CRLF and stray CR normalize before segmentation.
    expect(segmentEditorialBlocks('a\r\n\r\nb').map((block) => block.id)).toEqual(['B0001', 'B0002']);
  });

  it('accepts an unchanged revision without a changed_blocks section', () => {
    expect(validateRevisionContentLock(BEFORE, BEFORE, 'custody: "revised"')).toBeNull();
    // Whitespace-only differences are cosmetic under the canonical normalization.
    expect(
      validateRevisionContentLock(BEFORE, BEFORE.replace('aprovado e denso.', 'aprovado  e\ndenso.'), 'x'),
    ).toBeNull();
    // Dropping a block counts as changing it: the canonical rule requires the
    // drop to be declared, so an undeclared drop is a lock violation.
    const dropped = '# Titulo\n\nParagrafo aprovado e denso.';
    const error = validateRevisionContentLock(BEFORE, dropped, '{}');
    expect(error).toContain('no changed_blocks section with block IDs');
    expect(error).toContain('B0003');
  });

  it('rejects a changed received block with no changed_blocks section', () => {
    const after = '# Titulo\n\nParagrafo encurtado.\n\nReferencia pendente citada.';
    const error = validateRevisionContentLock(BEFORE, after, '{"custody":"revised"}');
    expect(error).toContain('no changed_blocks section with block IDs');
    expect(error).toContain('B0002');
  });

  it('rejects a changed block missing from the declarations (canonical oracle test)', () => {
    const before = '# Titulo\n\nParagrafo aprovado e denso.\n\nReferencia pendente [EVIDENCIA_PENDENTE].';
    const after = '# Titulo\n\nParagrafo encurtado.\n\nReferencia removida.';
    const report = `{
      "changed_blocks": [
        {"block_id": "B0003", "protocol_basis": "bibliographic integrity"}
      ],
      "custody": "revised"
    }`;
    const error = validateRevisionContentLock(before, after, report);
    expect(error).toContain('without matching changed_blocks declaration');
    expect(error).toContain('B0002');
  });

  it('accepts a declared change with non-empty protocol_basis and rejects an empty one', () => {
    const after = '# Titulo\n\nParagrafo corrigido com base protocolar.\n\nReferencia pendente citada.';
    const good =
      '{"changed_blocks": [{"block_id": "B0002", "protocol_basis": "factual precision rule"}], "custody": "revised"}';
    expect(validateRevisionContentLock(BEFORE, after, good)).toBeNull();
    const empty = '{"changed_blocks": [{"block_id": "B0002", "protocol_basis": ""}], "custody": "revised"}';
    expect(validateRevisionContentLock(BEFORE, after, empty)).toContain('must include protocol_basis');
  });

  it('requires change_type split/addition for block-count growth', () => {
    const grown = `${BEFORE}\n\nBloco novo acrescentado.`;
    const noGrowth =
      '{"changed_blocks": [{"block_id": "B0003", "protocol_basis": "expansion rule"}], "custody": "revised"}';
    expect(validateRevisionContentLock(BEFORE, grown, noGrowth)).toContain(
      'added new blocks without declaring change_type split/addition',
    );
    const withGrowth =
      '{"changed_blocks": [{"block_id": "B0003", "protocol_basis": "expansion rule", "change_type": "addition"}], "custody": "revised"}';
    expect(validateRevisionContentLock(BEFORE, grown, withGrowth)).toBeNull();
  });

  it('requires change_type reorder on every moved block', () => {
    const reordered = '# Titulo\n\nReferencia pendente citada.\n\nParagrafo aprovado e denso.';
    expect(validateRevisionContentLock(BEFORE, reordered, '{}')).toContain('reordered received blocks');
    const undeclared =
      '{"changed_blocks": [{"block_id": "B0002", "protocol_basis": "order rule"}], "custody": "revised"}';
    expect(validateRevisionContentLock(BEFORE, reordered, undeclared)).toContain(
      'must each declare change_type reorder',
    );
    const declared =
      '{"changed_blocks": [{"block_id": "B0002", "protocol_basis": "order rule", "change_type": "reorder"}, {"block_id": "B0003", "protocol_basis": "order rule", "change_type": "reorder"}], "custody": "revised"}';
    expect(validateRevisionContentLock(BEFORE, reordered, declared)).toBeNull();
  });

  it('rejects a Unicode-suffixed block_id exactly like the Rust word boundary', () => {
    // The Rust regex word boundary is Unicode: "B0002é" does NOT match the
    // block_id pattern on the desktop (é is a word character), so the entry is
    // ignored and the change stays undeclared. A JS ASCII boundary would
    // wrongly match and accept the declaration.
    const after = '# Titulo\n\nParagrafo corrigido com base protocolar.\n\nReferencia pendente citada.';
    const report =
      '{"changed_blocks": [{"block_id": "B0002é", "protocol_basis": "precision rule"}], "custody": "revised"}';
    const error = validateRevisionContentLock(BEFORE, after, report);
    expect(error).toContain('without matching changed_blocks declaration');
    expect(error).toContain('B0002');
  });
  it('rejects non-JSON field whitespace and retains Unicode digit growth declarations', () => {
    const after = '# Titulo\n\nParagrafo corrigido com base protocolar.\n\nReferencia pendente citada.';
    // U+0085 (NEL) is outside the JSON whitespace grammar.
    const nelReport =
      '"changed_blocks": [{"block_id":\u0085"B0002", "protocol_basis": "precision rule"}]\n"custody": "revised"';
    expect(validateRevisionContentLock(BEFORE, after, nelReport)).toContain('strict JSON');
    // U+FEFF is also outside JSON whitespace.
    const feffReport =
      '"changed_blocks": [{"block_id":\uFEFF"B0002", "protocol_basis": "precision rule"}]\n"custody": "revised"';
    const feffError = validateRevisionContentLock(BEFORE, after, feffReport);
    expect(feffError).toContain('strict JSON');
    // Rust \d is Unicode Nd: a declaration keyed by Arabic-Indic digits is
    // still parsed on the desktop, so its change_type addition allows growth.
    const grown = `${BEFORE}\n\nBloco novo acrescentado.`;
    const arabicReport =
      '{"changed_blocks": [{"block_id": "B\u0660\u0661\u0662\u0663", "protocol_basis": "x", "change_type": "addition"}], "custody": "revised"}';
    expect(validateRevisionContentLock(BEFORE, grown, arabicReport)).toBeNull();
  });
  it('requires JSON for a changed block declaration', () => {
    const after = '# Titulo\n\nParagrafo corrigido com base protocolar.\n\nReferencia pendente citada.';
    const report = 'changed_blocks:\n- block_id: B0002, protocol_basis: precision clause\ncustody: revised';
    expect(validateRevisionContentLock(BEFORE, after, report)).toContain('strict JSON');
    expect(
      validateRevisionContentLock(
        BEFORE,
        after,
        '{"changed_blocks":[{"block_id":"B0002","protocol_basis":"precision clause"}],"custody":"revised"}',
      ),
    ).toBeNull();
  });

  it('formats the block manifest exactly like the desktop prompt table', async () => {
    const manifest = await formatBlockManifestForPrompt(BEFORE);
    const lines = manifest.split('\n');
    expect(lines[0]).toBe('| block_id | kind | chars | sha256_12 | locked_by_default | excerpt |');
    expect(lines[1]).toBe('|---|---:|---:|---|---|---|');
    expect(lines[2]).toContain('| B0001 | heading |');
    expect(lines[3]).toContain('| B0002 | paragraph |');
    expect(lines[2]).toContain('| yes |');
    // sha256_12 column: 12 lowercase hex chars of the normalized block hash.
    const sha12 = lines[2]?.split('|')[4]?.trim() ?? '';
    expect(sha12).toMatch(/^[0-9a-f]{12}$/);
    expect(await formatBlockManifestForPrompt('   ')).toBe('No editorial content blocks were detected.');
    // Backslashes are escaped before pipes in the excerpt column, so a
    // pre-existing backslash cannot merge with the pipe escape.
    const tricky = await formatBlockManifestForPrompt('celula \\| com barra e pipe');
    expect(tricky).toContain('celula \\\\\\| com barra e pipe');
  });
});

describe('ADMIAPP-29 measured content-lock failures', () => {
  const declared = (entries: unknown[]) => JSON.stringify({ changed_blocks: entries, custody: 'revised' });
  const basis = 'editorial protocol';

  it('does not turn removed in free-text reason into reorder permission', () => {
    const before = 'Primeiro.\n\nSegundo.';
    const after = 'Segundo.\n\nPrimeiro.';
    const report = declared([
      { block_id: 'B0001', change_type: 'edit', reason: 'removed duplicate punctuation', protocol_basis: basis },
      { block_id: 'B0002', change_type: 'edit', reason: 'removed duplicate punctuation', protocol_basis: basis },
    ]);
    expect(validateRevisionContentLock(before, after, report)).toContain('reorder');
  });

  it('does not turn negated addition in reason into growth permission', () => {
    const before = 'Primeiro.\n\nSegundo.';
    const after = `${before}\n\nTerceiro.`;
    const report = declared([
      { block_id: 'B0002', change_type: 'edit', reason: 'no addition was made to this block', protocol_basis: basis },
    ]);
    expect(validateRevisionContentLock(before, after, report)).toContain('added new blocks');
  });

  it('requires the actual protocol_basis field, not its mention in reason', () => {
    const report = declared([{ block_id: 'B0002', reason: 'protocol_basis: nao foi fornecida' }]);
    expect(validateRevisionContentLock('Primeiro.\n\nSegundo.', 'Primeiro.\n\nSegundo editado.', report)).toContain(
      'protocol_basis',
    );
  });

  it('does not let one split authorize three extra blocks', () => {
    const report = declared([{ block_id: 'B0001', change_type: 'split', protocol_basis: basis }]);
    expect(validateRevisionContentLock('Primeiro.', 'Primeiro.\n\nSegundo.\n\nTerceiro.\n\nQuarto.', report)).toContain(
      'added new blocks',
    );
  });

  it('accepts a declared multiway split with its exact net block growth', () => {
    const report = declared([{ block_id: 'B0001', change_type: 'split', new_block_count: 2, protocol_basis: basis }]);
    expect(
      validateRevisionContentLock('Primeiro. Segundo. Terceiro.', 'Primeiro.\n\nSegundo.\n\nTerceiro.', report),
    ).toBeNull();
  });

  it('accepts nonempty structured protocol bases in strict JSON', () => {
    const before = 'Primeiro.';
    const after = 'Primeiro corrigido.';
    expect(
      validateRevisionContentLock(
        before,
        after,
        declared([{ block_id: 'B0001', protocol_basis: ['regra editorial'] }]),
      ),
    ).toBeNull();
    expect(
      validateRevisionContentLock(
        before,
        after,
        declared([{ block_id: 'B0001', protocol_basis: { rule: 'integrity' } }]),
      ),
    ).toBeNull();
    expect(validateRevisionContentLock(before, after, declared([{ block_id: 'B0001', protocol_basis: [] }]))).toContain(
      'protocol_basis',
    );
  });

  it('segments a whitespace-only separator line', () => {
    expect(segmentEditorialBlocks('Primeiro.\n   \nSegundo.')).toHaveLength(2);
    expect(segmentEditorialBlocks('Primeiro.\n\u2003\nSegundo.')).toHaveLength(2);
  });

  it('accepts a declaration for block B10000', () => {
    const before = Array.from({ length: 10_000 }, (_, index) => `Bloco ${index + 1}.`).join('\n\n');
    const after = `${before.slice(0, before.lastIndexOf('\n\n'))}\n\nBloco 10000 editado.`;
    expect(
      validateRevisionContentLock(before, after, declared([{ block_id: 'B10000', protocol_basis: basis }])),
    ).toBeNull();
  });

  it('rejects prose before the JSON report', () => {
    const report = `Resumo das mudancas:\n${declared([{ block_id: 'B0002', protocol_basis: basis }])}`;
    expect(validateRevisionContentLock('Primeiro.\n\nSegundo.', 'Primeiro.\n\nSegundo editado.', report)).toContain(
      'JSON',
    );
  });

  it('rejects duplicate declarations instead of combining permissions', () => {
    const report = declared([
      { block_id: 'B0002', change_type: 'addition', protocol_basis: basis },
      { block_id: 'B0002', change_type: 'edit', protocol_basis: basis },
    ]);
    expect(
      validateRevisionContentLock('Primeiro.\n\nSegundo.', 'Primeiro.\n\nSegundo editado.\n\nTerceiro.', report),
    ).toContain('duplicate');
  });

  it('attributes the first changed occurrence of duplicate text to B0001', () => {
    const before = 'Igual.\n\nIgual.';
    const after = 'Editado.\n\nIgual.';
    expect(
      validateRevisionContentLock(before, after, declared([{ block_id: 'B0001', protocol_basis: basis }])),
    ).toBeNull();
  });
});
