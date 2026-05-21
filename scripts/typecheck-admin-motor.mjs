import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const projectPath = path.join(repoRoot, 'admin-motor', 'tsconfig.json');
const baselinePath = path.join(repoRoot, 'admin-motor', '.typecheck-baseline.json');
const tscBin = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const updateBaseline = process.argv.includes('--update-baseline');

function toRepoPath(filePath) {
  const normalized = filePath.replaceAll('\\', '/');

  if (path.isAbsolute(filePath)) {
    return path.relative(repoRoot, filePath).replaceAll('\\', '/');
  }

  return normalized.replace(/^\.\//, '');
}

function normalizeMessage(message) {
  return message.replace(/\s+/g, ' ').trim();
}

function parseTypeScriptErrors(output) {
  const errors = [];
  const errorLinePattern = /^(?<file>.+?)\((?<line>\d+),(?<column>\d+)\): error TS(?<code>\d+): (?<message>.*)$/;

  for (const line of output.split(/\r?\n/)) {
    const match = errorLinePattern.exec(line);

    if (!match?.groups) {
      continue;
    }

    const file = toRepoPath(match.groups.file);
    const message = normalizeMessage(match.groups.message);
    const lineNumber = Number(match.groups.line);
    const column = Number(match.groups.column);
    const code = `TS${match.groups.code}`;
    const fingerprintKey = `${file}:${code}:${message}`;

    errors.push({
      fingerprint: fingerprintKey,
      fingerprintKey,
      file,
      line: lineNumber,
      column,
      code,
      message,
    });
  }

  errors.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.column - right.column ||
      left.code.localeCompare(right.code) ||
      left.message.localeCompare(right.message),
  );

  const occurrenceCounts = new Map();

  for (const error of errors) {
    const occurrence = (occurrenceCounts.get(error.fingerprintKey) ?? 0) + 1;
    occurrenceCounts.set(error.fingerprintKey, occurrence);
    error.fingerprint = `${error.fingerprintKey}#${occurrence}`;
    delete error.fingerprintKey;
  }

  return errors.sort((left, right) => left.fingerprint.localeCompare(right.fingerprint));
}

function readTypeScriptVersion() {
  const packageJsonPath = path.join(repoRoot, 'node_modules', 'typescript', 'package.json');

  if (!existsSync(packageJsonPath)) {
    return 'unknown';
  }

  return JSON.parse(readFileSync(packageJsonPath, 'utf8')).version ?? 'unknown';
}

function runTypeScript() {
  if (!existsSync(tscBin)) {
    console.error('TypeScript is not installed. Run npm ci before typecheck:admin-motor.');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [tscBin, '-p', projectPath, '--noEmit', '--pretty', 'false'], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  });

  const output = [result.stdout, result.stderr].filter(Boolean).join('\n');

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  return {
    exitCode: result.status ?? 1,
    output,
    errors: parseTypeScriptErrors(output),
  };
}

function writeBaseline(errors) {
  const baseline = {
    schemaVersion: 1,
    project: 'admin-motor/tsconfig.json',
    command: 'npm run typecheck:admin-motor',
    generatedAt: new Date().toISOString(),
    typescriptVersion: readTypeScriptVersion(),
    total: errors.length,
    errors,
  };

  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`admin-motor typecheck baseline updated: ${errors.length} error(s).`);
}

function readBaseline() {
  if (!existsSync(baselinePath)) {
    return undefined;
  }

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));

  if (!Array.isArray(baseline.errors)) {
    throw new Error('Invalid admin-motor typecheck baseline: missing errors array.');
  }

  return baseline;
}

function printErrors(title, errors, limit = 50) {
  if (errors.length === 0) {
    return;
  }

  console.error(title);

  for (const error of errors.slice(0, limit)) {
    console.error(`- ${error.file}:${error.line}:${error.column} ${error.code} ${error.message}`);
  }

  if (errors.length > limit) {
    console.error(`... ${errors.length - limit} more error(s) omitted.`);
  }
}

const result = runTypeScript();

if (updateBaseline) {
  writeBaseline(result.errors);
  process.exit(0);
}

let baseline;

try {
  baseline = readBaseline();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (!baseline) {
  console.error(
    'Missing admin-motor/.typecheck-baseline.json. Run `node scripts/typecheck-admin-motor.mjs --update-baseline` after reviewing the current TypeScript errors.',
  );
  console.error(`Current admin-motor typecheck has ${result.errors.length} error(s).`);
  process.exit(1);
}

if (result.exitCode !== 0 && result.errors.length === 0) {
  console.error('TypeScript failed, but no parseable TS errors were found.');
  console.error(result.output);
  process.exit(1);
}

const baselineFingerprints = new Set(baseline.errors.map((error) => error.fingerprint));
const newErrors = result.errors.filter((error) => !baselineFingerprints.has(error.fingerprint));
const baselineTotal = Number.isInteger(baseline.total) ? baseline.total : baseline.errors.length;

if (newErrors.length > 0 || result.errors.length > baselineTotal) {
  console.error(
    `admin-motor typecheck regression: ${result.errors.length} current error(s), ${baselineTotal} baseline error(s), ${newErrors.length} new fingerprint(s).`,
  );
  printErrors('New TypeScript error fingerprints:', newErrors);
  process.exit(1);
}

if (result.errors.length < baselineTotal) {
  console.warn(
    `admin-motor typecheck improved: ${result.errors.length} current error(s), ${baselineTotal} baseline error(s). Run \`node scripts/typecheck-admin-motor.mjs --update-baseline\` to shrink the committed baseline.`,
  );
}

console.log(`admin-motor typecheck baseline clean: ${result.errors.length}/${baselineTotal} error(s).`);
