import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT_INVENTORY = "THIRDPARTY.md";
const PUBLIC_INVENTORY = "public/legal/THIRDPARTY.md";
const TABLE_HEADER = [
  "Componente",
  "Versão",
  "Licença Original",
  "Modificado?",
  "Link de Origem",
];

// The legacy inventory mixes direct and selected transitive components. Keep the
// five retrospective findings from #560 fail-closed without broadening that
// repair into an unrelated migration of the whole document.
export const VERIFIED_COMPONENTS = [
  "@cloudflare/workers-types",
  "dompurify",
  "happy-dom",
  "lucide-react",
  "vite",
];

function normalizeCell(value) {
  return value.trim().replace(/^`|`$/gu, "");
}

function parseTable(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const headerIndex = lines.findIndex((line) => line.includes("| Componente"));
  assert.notEqual(headerIndex, -1, "THIRDPARTY table header is missing");

  const header = lines[headerIndex].split("|").slice(1, -1).map(normalizeCell);
  assert.deepEqual(header, TABLE_HEADER, "THIRDPARTY table header changed");

  const records = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith("|")) break;
    const cells = line.split("|").slice(1, -1).map(normalizeCell);
    assert.equal(cells.length, TABLE_HEADER.length, `invalid THIRDPARTY row: ${line}`);
    records.push({
      name: cells[0],
      version: cells[1],
      license: cells[2],
      modified: cells[3],
      origin: cells[4],
    });
  }
  return records;
}

function expectedRecord(name, packageJson, packageLock) {
  const dependencyGroups = [packageJson.dependencies ?? {}, packageJson.devDependencies ?? {}];
  const matches = dependencyGroups.flatMap((group) =>
    Object.hasOwn(group, name) ? [group[name]] : [],
  );
  assert.equal(matches.length, 1, `${name} must be exactly one direct dependency`);

  const lockEntry = packageLock.packages?.[`node_modules/${name}`];
  assert.ok(lockEntry, `${name} is missing from package-lock.json`);
  assert.equal(typeof lockEntry.version, "string", `${name} lacks an effective lockfile version`);
  assert.equal(typeof lockEntry.license, "string", `${name} lacks lockfile license metadata`);
  assert.ok(lockEntry.license.trim(), `${name} has an empty lockfile license`);
  assert.equal(typeof lockEntry.resolved, "string", `${name} lacks a lockfile source URL`);
  assert.ok(lockEntry.resolved.trim(), `${name} has an empty lockfile source URL`);

  return {
    name,
    version: matches[0],
    license: lockEntry.license,
    modified: "Não",
    origin: lockEntry.resolved,
  };
}

export function verifyThirdPartyInventory({
  packageJson,
  packageLock,
  rootInventory,
  publicInventory,
  verifiedComponents = VERIFIED_COMPONENTS,
}) {
  assert.equal(
    publicInventory,
    rootInventory,
    `${ROOT_INVENTORY} and ${PUBLIC_INVENTORY} must be byte-identical`,
  );

  const records = parseTable(rootInventory);
  const names = records.map(({ name }) => name);
  assert.equal(new Set(names).size, names.length, "THIRDPARTY contains duplicate components");
  assert.equal(
    new Set(verifiedComponents).size,
    verifiedComponents.length,
    "verified component list contains duplicates",
  );

  const recordsByName = new Map(records.map((record) => [record.name, record]));
  for (const name of verifiedComponents) {
    assert.deepEqual(
      recordsByName.get(name),
      expectedRecord(name, packageJson, packageLock),
      `${name} inventory metadata does not match package.json and package-lock.json`,
    );
  }
}

async function main() {
  const root = process.cwd();
  const [packageJson, packageLock, rootInventory, publicInventory] = await Promise.all([
    readFile(resolve(root, "package.json"), "utf8").then(JSON.parse),
    readFile(resolve(root, "package-lock.json"), "utf8").then(JSON.parse),
    readFile(resolve(root, ROOT_INVENTORY), "utf8"),
    readFile(resolve(root, PUBLIC_INVENTORY), "utf8"),
  ]);

  verifyThirdPartyInventory({ packageJson, packageLock, rootInventory, publicInventory });
  console.log("THIRDPARTY copies and verified dependency metadata are current.");
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (entryPoint === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
