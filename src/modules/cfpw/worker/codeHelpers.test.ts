/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Testes do dirty-guard do editor de código (PW-1): detecção de módulos
 * sujos, reversão ao original e montagem dos módulos do PUT.
 */

import { describe, expect, it } from 'vitest';
import type { WorkerCodeModule } from '../types';
import { buildCodeSaveModules, dirtyModuleNames, hasBinaryModules } from './codeHelpers';

const MODULES: WorkerCodeModule[] = [
  { name: 'worker.js', content: 'export default {};', contentType: 'application/javascript+module', binary: false },
  { name: 'util.js', content: 'export const x = 1;', contentType: 'application/javascript+module', binary: false },
];

describe('dirtyModuleNames', () => {
  it('is empty when there are no drafts', () => {
    expect(dirtyModuleNames(MODULES, {})).toEqual([]);
  });

  it('flags only modules whose draft differs from the original', () => {
    expect(dirtyModuleNames(MODULES, { 'util.js': 'export const x = 2;' })).toEqual(['util.js']);
  });

  it('clears the dirty flag when the draft is reverted to the original content', () => {
    expect(dirtyModuleNames(MODULES, { 'util.js': 'export const x = 1;' })).toEqual([]);
  });
});

describe('buildCodeSaveModules', () => {
  it('applies drafts over originals and keeps untouched modules as-is', () => {
    expect(buildCodeSaveModules(MODULES, { 'worker.js': 'export default { fetch() {} };' })).toEqual([
      {
        name: 'worker.js',
        content: 'export default { fetch() {} };',
        contentType: 'application/javascript+module',
      },
      { name: 'util.js', content: 'export const x = 1;', contentType: 'application/javascript+module' },
    ]);
  });

  it('excludes binary modules from the PUT payload', () => {
    const withBinary: WorkerCodeModule[] = [
      ...MODULES,
      { name: 'blob.wasm', content: 'AAAA', contentType: 'application/wasm', binary: true },
    ];
    expect(hasBinaryModules(withBinary)).toBe(true);
    expect(buildCodeSaveModules(withBinary, {}).map((module) => module.name)).toEqual(['worker.js', 'util.js']);
  });
});
