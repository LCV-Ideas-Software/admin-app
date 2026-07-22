import { resolve } from 'node:path';
import process from 'node:process';
import { describe, expect, it } from 'vitest';

import { resolveWranglerInvocation } from '../../scripts/lib/wrangler-command.mjs';

const readableFallback = resolve('scripts/lib/wrangler-command.mjs');

describe('Wrangler command resolution', () => {
  it('uses the isolated executable when WRANGLER_BIN is absolute and executable', () => {
    expect(
      resolveWranglerInvocation({
        configuredBin: process.execPath,
        fallbackCli: readableFallback,
      }),
    ).toEqual({ command: process.execPath, argsPrefix: [] });
  });

  it('uses Node.js with the project CLI only when WRANGLER_BIN is absent', () => {
    expect(
      resolveWranglerInvocation({
        configuredBin: undefined,
        fallbackCli: readableFallback,
      }),
    ).toEqual({ command: process.execPath, argsPrefix: [readableFallback] });
  });

  it('rejects empty, relative, control-character and missing executable paths', () => {
    expect(() => resolveWranglerInvocation({ configuredBin: '', fallbackCli: readableFallback })).toThrow(
      /caminho não vazio/u,
    );
    expect(() => resolveWranglerInvocation({ configuredBin: './wrangler', fallbackCli: readableFallback })).toThrow(
      /caminho absoluto/u,
    );
    expect(() =>
      resolveWranglerInvocation({ configuredBin: `${process.execPath}\nother`, fallbackCli: readableFallback }),
    ).toThrow(/caracteres de controle/u);
    expect(() =>
      resolveWranglerInvocation({
        configuredBin: `${process.execPath}.definitely-missing`,
        fallbackCli: readableFallback,
      }),
    ).toThrow();
  });
});
