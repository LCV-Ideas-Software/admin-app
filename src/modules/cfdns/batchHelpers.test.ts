/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes dos helpers puros do DNS-2: seleção multi-registro, montagem dos
 * patches do bulk-edit (somente campos alterados), preview textual, guarda de
 * tamanho do import, contagem de linhas BIND e nome do arquivo de export.
 */

import { describe, expect, it } from 'vitest';
import {
  type BulkEditFormState,
  buildBulkEditPatches,
  buildBulkEditPreview,
  buildExportFilename,
  bulkEditIssues,
  countImportableLines,
  DEFAULT_BULK_EDIT_FORM,
  hasBulkEditChanges,
  IMPORT_MAX_FILE_BYTES,
  toggleIdSelection,
  togglePageSelection,
  validateImportFileSize,
} from './batchHelpers';

const form = (overrides: Partial<BulkEditFormState>): BulkEditFormState => ({
  ...DEFAULT_BULK_EDIT_FORM,
  ...overrides,
});

describe('toggleIdSelection', () => {
  it('adds an absent id and removes a present one, without mutating the input', () => {
    const initial = new Set(['a']);

    const withB = toggleIdSelection(initial, 'b');
    expect([...withB].sort()).toEqual(['a', 'b']);

    const withoutA = toggleIdSelection(withB, 'a');
    expect([...withoutA]).toEqual(['b']);

    expect([...initial]).toEqual(['a']);
  });
});

describe('togglePageSelection', () => {
  it('selects the whole page keeping selections from other pages', () => {
    const current = new Set(['other-page-1']);
    const next = togglePageSelection(current, ['p1', 'p2'], true);
    expect([...next].sort()).toEqual(['other-page-1', 'p1', 'p2']);
  });

  it('deselects only the page ids, keeping the rest', () => {
    const current = new Set(['other-page-1', 'p1', 'p2']);
    const next = togglePageSelection(current, ['p1', 'p2'], false);
    expect([...next]).toEqual(['other-page-1']);
  });
});

describe('buildBulkEditPatches', () => {
  it('builds one patch per id with only the changed fields', () => {
    const patches = buildBulkEditPatches(
      ['rec-1', 'rec-2'],
      form({ ttlChoice: '300', proxyMode: 'on', commentMode: 'keep', tagsMode: 'keep' }),
    );

    expect(patches).toEqual([
      { id: 'rec-1', ttl: 300, proxied: true },
      { id: 'rec-2', ttl: 300, proxied: true },
    ]);
  });

  it('produces only ids when every field stays in keep mode', () => {
    expect(buildBulkEditPatches(['rec-1'], DEFAULT_BULK_EDIT_FORM)).toEqual([{ id: 'rec-1' }]);
  });

  it('maps Auto TTL, custom TTL, comment clear/set and tags list', () => {
    expect(buildBulkEditPatches(['x'], form({ ttlChoice: '1' }))[0]).toEqual({ id: 'x', ttl: 1 });
    expect(buildBulkEditPatches(['x'], form({ ttlChoice: 'custom', ttlCustom: ' 1800 ' }))[0]).toEqual({
      id: 'x',
      ttl: 1800,
    });
    expect(buildBulkEditPatches(['x'], form({ commentMode: 'clear' }))[0]).toEqual({ id: 'x', comment: '' });
    expect(buildBulkEditPatches(['x'], form({ commentMode: 'set', commentValue: ' migrado ' }))[0]).toEqual({
      id: 'x',
      comment: 'migrado',
    });
    expect(buildBulkEditPatches(['x'], form({ tagsMode: 'set', tags: ['env:prod'] }))[0]).toEqual({
      id: 'x',
      tags: ['env:prod'],
    });
    expect(buildBulkEditPatches(['x'], form({ proxyMode: 'off' }))[0]).toEqual({ id: 'x', proxied: false });
  });
});

describe('hasBulkEditChanges / bulkEditIssues', () => {
  it('detects the all-keep form as unchanged and any deviation as a change', () => {
    expect(hasBulkEditChanges(DEFAULT_BULK_EDIT_FORM)).toBe(false);
    expect(hasBulkEditChanges(form({ proxyMode: 'off' }))).toBe(true);
    expect(hasBulkEditChanges(form({ ttlChoice: '60' }))).toBe(true);
  });

  it('flags an out-of-range custom TTL and an empty comment in set mode with pt-BR messages', () => {
    expect(bulkEditIssues(form({ ttlChoice: 'custom', ttlCustom: '30' }))[0]).toContain('TTL personalizado inválido');
    expect(bulkEditIssues(form({ ttlChoice: 'custom', ttlCustom: 'abc' }))[0]).toContain('TTL personalizado inválido');
    expect(bulkEditIssues(form({ commentMode: 'set', commentValue: '  ' }))[0]).toContain('Comentário vazio');
    expect(bulkEditIssues(form({ ttlChoice: 'custom', ttlCustom: '1800' }))).toEqual([]);
    expect(bulkEditIssues(form({ ttlChoice: 'custom', ttlCustom: '1' }))).toEqual([]);
  });
});

describe('buildBulkEditPreview', () => {
  it('describes the changed fields for N records', () => {
    expect(buildBulkEditPreview(3, form({ ttlChoice: '1', proxyMode: 'on' }))).toBe(
      'Aplicar a 3 registro(s): TTL→Auto, Proxy→ativado',
    );
    expect(buildBulkEditPreview(2, form({ commentMode: 'clear', tagsMode: 'set', tags: ['a:b', 'c:d'] }))).toBe(
      'Aplicar a 2 registro(s): Comentário→limpo, Tags→2 tag(s)',
    );
  });

  it('reports when nothing was changed', () => {
    expect(buildBulkEditPreview(5, DEFAULT_BULK_EDIT_FORM)).toContain('Nenhuma alteração selecionada');
  });
});

describe('validateImportFileSize', () => {
  it('accepts up to 2 MB and rejects above with a pt-BR diagnostic', () => {
    expect(validateImportFileSize(IMPORT_MAX_FILE_BYTES)).toBeNull();
    expect(validateImportFileSize(IMPORT_MAX_FILE_BYTES + 1)).toContain('excede 2 MB');
  });
});

describe('countImportableLines', () => {
  it('counts only non-empty, non-comment lines of a BIND file', () => {
    const bind = [
      ';; Comentário de cabeçalho',
      '',
      'example.com.\t300\tIN\tA\t192.0.2.1',
      '   ',
      '; outro comentário',
      'www.example.com.\t300\tIN\tCNAME\texample.com.',
    ].join('\n');

    expect(countImportableLines(bind)).toBe(2);
    expect(countImportableLines('')).toBe(0);
  });
});

describe('buildExportFilename', () => {
  it('uses the sanitized zone name and falls back to the zoneId', () => {
    expect(buildExportFilename('example.com', 'zone-1')).toBe('example.com.txt');
    expect(buildExportFilename('zona ruim"/injeção', 'zone-1')).toBe('zona-ruim-inje-o.txt');
    expect(buildExportFilename('', 'zone-1')).toBe('zone-1.txt');
    expect(buildExportFilename('', '')).toBe('zona.txt');
  });
});
