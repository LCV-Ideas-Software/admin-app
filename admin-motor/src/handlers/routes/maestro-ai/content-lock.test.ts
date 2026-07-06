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
    const error = validateRevisionContentLock(BEFORE, dropped, 'x');
    expect(error).toContain('no changed_blocks section with block IDs');
    expect(error).toContain('B0003');
  });

  it('rejects a changed received block with no changed_blocks section', () => {
    const after = '# Titulo\n\nParagrafo encurtado.\n\nReferencia pendente citada.';
    const error = validateRevisionContentLock(BEFORE, after, 'custody: "revised" without section');
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
      '"changed_blocks": [{"block_id": "B0002", "protocol_basis": "factual precision rule"}]\n"custody": "revised"';
    expect(validateRevisionContentLock(BEFORE, after, good)).toBeNull();
    const empty = '"changed_blocks": [{"block_id": "B0002", "protocol_basis": ""}]\n"custody": "revised"';
    expect(validateRevisionContentLock(BEFORE, after, empty)).toContain('must include protocol_basis');
  });

  it('requires change_type split/addition for block-count growth', () => {
    const grown = `${BEFORE}\n\nBloco novo acrescentado.`;
    const noGrowth =
      '"changed_blocks": [{"block_id": "B0003", "protocol_basis": "expansion rule"}]\n"custody": "revised"';
    expect(validateRevisionContentLock(BEFORE, grown, noGrowth)).toContain(
      'added new blocks without declaring change_type split/addition',
    );
    const withGrowth =
      '"changed_blocks": [{"block_id": "B0003", "protocol_basis": "expansion rule", "change_type": "addition"}]\n"custody": "revised"';
    expect(validateRevisionContentLock(BEFORE, grown, withGrowth)).toBeNull();
  });

  it('requires change_type reorder on every moved block', () => {
    const reordered = '# Titulo\n\nReferencia pendente citada.\n\nParagrafo aprovado e denso.';
    expect(validateRevisionContentLock(BEFORE, reordered, 'no section here')).toContain('reordered received blocks');
    const undeclared =
      '"changed_blocks": [{"block_id": "B0002", "protocol_basis": "order rule"}]\n"custody": "revised"';
    expect(validateRevisionContentLock(BEFORE, reordered, undeclared)).toContain(
      'must each declare change_type reorder',
    );
    const declared =
      '"changed_blocks": [{"block_id": "B0002", "protocol_basis": "order rule", "change_type": "reorder"}, {"block_id": "B0003", "protocol_basis": "order rule", "change_type": "reorder"}]\n"custody": "revised"';
    expect(validateRevisionContentLock(BEFORE, reordered, declared)).toBeNull();
  });

  it('rejects a Unicode-suffixed block_id exactly like the Rust word boundary', () => {
    // The Rust regex word boundary is Unicode: "B0002é" does NOT match the
    // block_id pattern on the desktop (é is a word character), so the entry is
    // ignored and the change stays undeclared. A JS ASCII boundary would
    // wrongly match and accept the declaration.
    const after = '# Titulo\n\nParagrafo corrigido com base protocolar.\n\nReferencia pendente citada.';
    const report =
      '"changed_blocks": [{"block_id": "B0002é", "protocol_basis": "precision rule"}]\n"custody": "revised"';
    const error = validateRevisionContentLock(BEFORE, after, report);
    expect(error).toContain('without matching changed_blocks declaration');
    expect(error).toContain('B0002');
  });
  it('mirrors the Rust regex whitespace and digit classes in field extraction', () => {
    const after = '# Titulo\n\nParagrafo corrigido com base protocolar.\n\nReferencia pendente citada.';
    // U+0085 (NEL) is Rust \s but not JS \s: the assignment gap must accept it.
    const nelReport =
      '"changed_blocks": [{"block_id":\u0085"B0002", "protocol_basis": "precision rule"}]\n"custody": "revised"';
    expect(validateRevisionContentLock(BEFORE, after, nelReport)).toBeNull();
    // U+FEFF is JS \s but NOT Rust \s: the declaration must be ignored.
    const feffReport =
      '"changed_blocks": [{"block_id":\uFEFF"B0002", "protocol_basis": "precision rule"}]\n"custody": "revised"';
    const feffError = validateRevisionContentLock(BEFORE, after, feffReport);
    expect(feffError).toContain('without matching changed_blocks declaration');
    // Rust \d is Unicode Nd: a declaration keyed by Arabic-Indic digits is
    // still parsed on the desktop, so its change_type addition allows growth.
    const grown = `${BEFORE}\n\nBloco novo acrescentado.`;
    const arabicReport =
      '"changed_blocks": [{"block_id": "B\u0660\u0661\u0662\u0663", "protocol_basis": "x", "change_type": "addition"}]\n"custody": "revised"';
    expect(validateRevisionContentLock(BEFORE, grown, arabicReport)).toBeNull();
  });
  it('reads bare (non-JSON) changed_blocks lines via the block_id fallback', () => {
    const after = '# Titulo\n\nParagrafo corrigido com base protocolar.\n\nReferencia pendente citada.';
    const report = 'changed_blocks:\n- block_id: B0002, protocol_basis: precision clause\ncustody: revised';
    expect(validateRevisionContentLock(BEFORE, after, report)).toBeNull();
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
