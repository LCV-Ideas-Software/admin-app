import { accessSync, constants } from 'node:fs';
import { isAbsolute } from 'node:path';
import process from 'node:process';

const assertSafePath = (value, name) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} deve ser um caminho não vazio.`);
  }
  if (value.includes('\0') || /[\r\n]/u.test(value)) {
    throw new Error(`${name} contém caracteres de controle.`);
  }
  if (!isAbsolute(value)) {
    throw new Error(`${name} deve ser um caminho absoluto.`);
  }
};

export function resolveWranglerInvocation({
  configuredBin = process.env.WRANGLER_BIN,
  fallbackCli,
  nodeExecutable = process.execPath,
} = {}) {
  if (configuredBin !== undefined) {
    assertSafePath(configuredBin, 'WRANGLER_BIN');
    accessSync(configuredBin, constants.X_OK);
    return { command: configuredBin, argsPrefix: [] };
  }

  assertSafePath(fallbackCli, 'Wrangler CLI fallback');
  assertSafePath(nodeExecutable, 'Node.js executable');
  accessSync(fallbackCli, constants.R_OK);
  accessSync(nodeExecutable, constants.X_OK);
  return { command: nodeExecutable, argsPrefix: [fallbackCli] };
}
