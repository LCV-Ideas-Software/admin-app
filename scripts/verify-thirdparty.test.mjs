import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import {
  BASE64_ARRAY_BUFFER_MIT_NOTICE,
  LICENSE_FILE_FREE_PACKAGE_EVIDENCE,
  verifyAdminWorkerBundle,
  verifyLicenseFileFreePackageEvidence,
  verifyNoRemoteGoogleFonts,
  verifySha256,
  verifyThirdPartyInventory,
} from './verify-thirdparty.mjs';

const ALPHA_SRI = `sha512-${Buffer.alloc(64, 1).toString('base64')}`;
const BETA_SRI = `sha512-${Buffer.alloc(64, 2).toString('base64')}`;
const GAMMA_SRI = `sha512-${Buffer.alloc(64, 3).toString('base64')}`;
const LICENSE_BANNER = '/* Third-party licenses: /legal/BUNDLED-LICENSES.md */';
const LAUNDER_AUDITED_SRI =
  'sha512-mU6WRz5EusL9ZZuiZ5SO4Y6C0P9PAUR9iwdb6bzj4KDihm28DiHFw+/yk9DBH4f+Pv1wuzQ4e2jV3oQ7mkIqvw==';
const LAUNDER_PACKAGE_JSON_SHA256 = 'b111ad703bae61d8cef17863c38f4618e813b24284a874d0b81db1b5cfbdf601';
const LAUNDER_UPSTREAM_COMMIT = 'e9b0ab0849a5dfea0f75335fbdf99b5c6bf9e4b3';
const TEST_LICENSE = `MIT License

Copyright (c) Test Author

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
const TEST_LICENSE_SHA256 = createHash('sha256').update(TEST_LICENSE).digest('hex');
const LAUNDER_MIT_TERMS = TEST_LICENSE.slice(TEST_LICENSE.indexOf('Permission is hereby granted'));

function adminWorkerPreamble(packageCount) {
  return `# Avisos de componentes de terceiros — Admin Motor

Este arquivo acompanha o Worker \`admin-motor\` como módulo adicional do tipo \`Text\`. O inventário cobre exatamente os ${packageCount} pacotes npm com código efetivamente incorporado ao bundle Wrangler informado para este artefato. Pacotes de desenvolvimento, ferramentas externas e entradas desabilitadas de zero byte não pertencem a este escopo.

Versão, licença declarada, URL \`resolved\` e SRI \`integrity\` foram conferidos na entrada \`packages\` de \`package-lock.json\`; o texto de cada aviso foi reproduzido integralmente do pacote da mesma versão instalado em \`node_modules\`. O caminho e o SHA-256 de cada fonte permitem verificar o texto sem confundi-lo com outra versão homônima.`;
}

function launderSectionBody({
  resolved = 'https://registry.npmjs.org/launder/-/launder-1.7.1.tgz',
  integrity = LAUNDER_AUDITED_SRI,
  packageJsonSha256 = LAUNDER_PACKAGE_JSON_SHA256,
  upstreamCommit = LAUNDER_UPSTREAM_COMMIT,
} = {}) {
  return `- **Caminho no lockfile:** \`package-lock.json -> packages["node_modules/launder"]\`
- **Resolved:** \`${resolved}\`
- **Integrity:** \`${integrity}\`
- **Origem imutável/hash:** tarball npm versionado indicado em \`Resolved\`, autenticado pelo SRI SHA-512 indicado em \`Integrity\`.
- **Evidência da licença declarada:** \`node_modules/launder/package.json\` (\`SHA-256: ${packageJsonSha256}\`).
- **Origem upstream imutável:** tag anotada \`launder@1.7.1\`, commit \`${upstreamCommit}\`, caminho \`packages/launder\` no repositório \`apostrophecms/apostrophe\`.

O pacote npm e a tag upstream \`launder@1.7.1\` declaram \`MIT\`, mas o pacote/tarball dessa versão não traz arquivo \`LICENSE\`. Por isso, os termos canônicos da MIT são reproduzidos abaixo sem inventar titular, ano ou aviso de copyright ausente no upstream.

\`\`\`text
MIT License

${LAUNDER_MIT_TERMS}
\`\`\``;
}

async function withAdminWorkerFixture(
  {
    packageName,
    version,
    tableVersion = version,
    license = 'MIT',
    resolved: resolvedOverride,
    integrity = `sha512-${Buffer.alloc(64, 4).toString('base64')}`,
    includeLicense = true,
    licenseContent = TEST_LICENSE,
    sectionBody,
    sourceNoticeTransform = (notice) => notice,
    packageJsonTransform = (content) => content,
  },
  assertion,
) {
  const root = await mkdtemp(join(tmpdir(), 'admin-worker-legal-'));
  const lockKey = `node_modules/${packageName}`;
  const entryContent = 'export default {};\n';
  const resolved =
    resolvedOverride ?? `https://registry.npmjs.org/${packageName}/-/${packageName}-${version}.tgz`;
  const licenseSha256 = createHash('sha256').update(licenseContent).digest('hex');
  const defaultSectionBody = `- **Caminho no lockfile:** \`package-lock.json -> packages["${lockKey}"]\`
- **Resolved:** \`${resolved}\`
- **Integrity:** \`${integrity}\`
- **Origem imutável/hash:** tarball npm versionado indicado em \`Resolved\`, autenticado pelo SRI SHA-512 indicado em \`Integrity\`.
- **Fonte do aviso integral:** \`${lockKey}/LICENSE\` (\`SHA-256: ${licenseSha256}\`).

\`\`\`text
${licenseContent}
\`\`\``;
  const sourceNotice = sourceNoticeTransform(`${adminWorkerPreamble(1)}

## Inventário efetivo

| Componente | Versão | Licença | Caminho no lockfile |
| --- | --- | --- | --- |
| \`${packageName}\` | \`${tableVersion}\` | \`${license}\` | \`packages["${lockKey}"]\` |

## ${packageName} ${version} — ${license}

${sectionBody ?? defaultSectionBody}
`);

  try {
    await mkdir(join(root, 'admin-motor', 'dist', 'legal-audit'), { recursive: true });
    await mkdir(join(root, lockKey), { recursive: true });
    await writeFile(join(root, 'admin-motor', 'dist', 'legal-audit', 'index.js'), entryContent);
    if (includeLicense) await writeFile(join(root, lockKey, 'LICENSE'), licenseContent);
    const packageJson =
      packageName === 'launder'
        ? await readFile(join(process.cwd(), 'node_modules', 'launder', 'package.json'))
        : Buffer.from(JSON.stringify({ name: packageName, version, license }));
    await writeFile(join(root, lockKey, 'package.json'), packageJsonTransform(packageJson));

    await assertion({
      root,
      metafile: {
        outputs: {
          'dist/legal-audit/index.js': {
            entryPoint: 'src/index.ts',
            bytes: Buffer.byteLength(entryContent),
            inputs: { [`../${lockKey}/index.js`]: { bytesInOutput: 1 } },
          },
        },
      },
      packageLock: {
        packages: {
          [lockKey]: { version, license, resolved, integrity },
        },
      },
      sourceNotice,
      emittedNotice: sourceNotice,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withRepeatedAdminWorkerFixture({ includeBothLockPaths }, assertion) {
  const root = await mkdtemp(join(tmpdir(), 'admin-worker-repeated-'));
  const lockKeys = ['node_modules/foo', 'node_modules/parent/node_modules/foo'];
  const version = '1.2.3';
  const integrity = `sha512-${Buffer.alloc(64, 6).toString('base64')}`;
  const resolved = `https://registry.npmjs.org/foo/-/foo-${version}.tgz`;
  const licenseSha256 = createHash('sha256').update(TEST_LICENSE).digest('hex');
  const lockMarkers = includeBothLockPaths
    ? lockKeys.map((lockKey) => `- **Caminho no lockfile:** \`package-lock.json -> packages["${lockKey}"]\``)
    : [`- **Caminho no lockfile:** \`package-lock.json -> packages["${lockKeys[1]}"]\``];
  const sourceMarkers = (includeBothLockPaths ? lockKeys : [lockKeys[1]]).map(
    (lockKey) =>
      `- **Fonte do aviso integral:** \`${lockKey}/LICENSE\` (\`SHA-256: ${licenseSha256}\`).`,
  );
  const sourceNotice = `${adminWorkerPreamble(2)}

## Inventário efetivo

| Componente | Versão | Licença | Caminho no lockfile |
| --- | --- | --- | --- |
${lockKeys.map((lockKey) => `| \`foo\` | \`${version}\` | \`MIT\` | \`packages["${lockKey}"]\` |`).join('\n')}

## foo ${version} — MIT

${lockMarkers.join('\n')}
- **Resolved:** \`${resolved}\`
- **Integrity:** \`${integrity}\`
- **Origem imutável/hash:** tarball npm versionado indicado em \`Resolved\`, autenticado pelo SRI SHA-512 indicado em \`Integrity\`.
${sourceMarkers.join('\n')}

\`\`\`text
${TEST_LICENSE}
\`\`\`
`;

  try {
    await mkdir(join(root, 'admin-motor', 'dist', 'legal-audit'), { recursive: true });
    await writeFile(join(root, 'admin-motor', 'dist', 'legal-audit', 'index.js'), 'export default {};\n');
    for (const lockKey of lockKeys) {
      await mkdir(join(root, lockKey), { recursive: true });
      await writeFile(join(root, lockKey, 'LICENSE'), TEST_LICENSE);
      await writeFile(join(root, lockKey, 'package.json'), JSON.stringify({ name: 'foo', version, license: 'MIT' }));
    }
    await assertion({
      root,
      metafile: {
        outputs: {
          'dist/legal-audit/index.js': {
            entryPoint: 'src/index.ts',
            bytes: Buffer.byteLength('export default {};\n'),
            inputs: Object.fromEntries(
              lockKeys.map((lockKey) => [`../${lockKey}/index.js`, { bytesInOutput: 1 }]),
            ),
          },
        },
      },
      packageLock: {
        packages: Object.fromEntries(
          lockKeys.map((lockKey) => [lockKey, { version, license: 'MIT', resolved, integrity }]),
        ),
      },
      sourceNotice,
      emittedNotice: sourceNotice,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const rootManifest = {
  id: 'root',
  heading: '## Inventário: package.json (raiz)',
  lockPath: 'package-lock.json',
  packageJson: {
    dependencies: { alpha: '^1.0.0' },
    devDependencies: { beta: '^2.0.0' },
  },
  packageLock: {
    packages: {
      'node_modules/alpha': {
        version: '1.0.1',
        license: 'MIT',
        resolved: 'https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz',
        integrity: ALPHA_SRI,
      },
      'node_modules/beta': {
        version: '2.0.2',
        license: 'Apache-2.0',
        resolved: 'https://registry.npmjs.org/beta/-/beta-2.0.2.tgz',
        integrity: BETA_SRI,
      },
    },
  },
};

const motorManifest = {
  id: 'tlsrpt-motor',
  heading: '## Inventário: tlsrpt-motor/package.json',
  lockPath: 'tlsrpt-motor/package-lock.json',
  packageJson: { dependencies: { gamma: '3.0.0' } },
  packageLock: {
    packages: {
      'node_modules/gamma': {
        version: '3.0.0',
        license: 'ISC',
        resolved: 'https://registry.npmjs.org/gamma/-/gamma-3.0.0.tgz',
        integrity: GAMMA_SRI,
      },
    },
  },
};

const ROOT_TEST_DOCUMENT_SCHEMA = Object.freeze({
  title: '# Third-party inventory',
  headings: Object.freeze([rootManifest.heading, motorManifest.heading]),
  paragraphCount: 0,
  tableCount: 2,
  codeBlockCount: 0,
});

function inventory({ omitBeta = false } = {}) {
  return `# Third-party inventory

## Inventário: package.json (raiz)

| Escopo | Componente | Versão declarada | Versão resolvida | Licença do pacote | Eleição | Integridade | Origem imutável |
| --- | --- | --- | --- | --- | --- | --- | --- |
| runtime | alpha | ^1.0.0 | 1.0.1 | MIT | — | ${ALPHA_SRI} | https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz |
${omitBeta ? '' : `| development | beta | ^2.0.0 | 2.0.2 | Apache-2.0 | — | ${BETA_SRI} | https://registry.npmjs.org/beta/-/beta-2.0.2.tgz |\n`}
## Inventário: tlsrpt-motor/package.json

| Escopo | Componente | Versão declarada | Versão resolvida | Licença do pacote | Eleição | Integridade | Origem imutável |
| --- | --- | --- | --- | --- | --- | --- | --- |
| runtime | gamma | 3.0.0 | 3.0.0 | ISC | — | ${GAMMA_SRI} | https://registry.npmjs.org/gamma/-/gamma-3.0.0.tgz |
`;
}

function verify(overrides = {}) {
  const rootInventory = overrides.rootInventory ?? inventory();
  verifyThirdPartyInventory({
    manifests: overrides.manifests ?? [rootManifest, motorManifest],
    rootInventory,
    rootNotice: overrides.rootNotice ?? 'notice\n',
    publicInventory: overrides.publicInventory ?? rootInventory,
    publicNotice: 'notice\n',
    artifactInventory: overrides.artifactInventory,
    artifactNotice: overrides.artifactNotice,
    artifactBundledLicenses: overrides.artifactBundledLicenses,
    artifactJavaScript: overrides.artifactJavaScript,
    artifactHtml: overrides.artifactHtml,
    artifactCss: overrides.artifactCss,
    workerArtifact: overrides.workerArtifact,
    workerArtifacts: overrides.workerArtifacts,
    requiredStaticNoticeMarkers: overrides.requiredStaticNoticeMarkers,
    requiredStaticNoticeSections: overrides.requiredStaticNoticeSections,
    rootDocumentSchema: overrides.rootDocumentSchema,
    requiredBundledLicenseMarkers: overrides.requiredBundledLicenseMarkers,
    bundledLicenseSupplementHeadings: overrides.bundledLicenseSupplementHeadings,
    requiredWorkerNoticeMarkers: overrides.requiredWorkerNoticeMarkers,
  });
}

test('accepts complete inventories for both manifests', () => {
  expect(() => verify()).not.toThrow();
});

test('publishes exact evidence without inventing notices for license-file-free tarballs', async () => {
  const [rootNotice, publicNotice] = await Promise.all([
    readFile(join(process.cwd(), 'THIRDPARTY.md'), 'utf8'),
    readFile(join(process.cwd(), 'public', 'legal', 'THIRDPARTY.md'), 'utf8'),
  ]);

  expect(publicNotice).toBe(rootNotice);
  expect(rootNotice.match(/Resultado: \*\*INCONCLUSIVO\*\*/gu)).toHaveLength(2);
  expect(rootNotice).not.toContain('Copyright (c) Michael Williamson <mike@zwobble.org>');
  expect(rootNotice).not.toContain('Copyright (c) 2025 Anton Korzunov <thekashey@gmail.com>');
  expect(rootNotice).toContain('E34A07AF5C8074EC60FDC1F9DB775D117D2B2F985D88175C455C9FC37F898D59');
  expect(rootNotice).toContain('E372F857CE05F266137C65293436B5380FEC42AC311E6ACB9378ED78B98D75D0');
  expect(rootNotice).toContain('486442209236FFA3893312E508694699A6B8834D30A2F9C083C1F3379983E4F9');
  expect(rootNotice).toMatch(/sem\s+inventar titular, ano ou aviso de copyright ausente/gu);
});

test('recomputes the exact installed evidence for license-file-free tarballs', async () => {
  const artifacts = await Promise.all(
    LICENSE_FILE_FREE_PACKAGE_EVIDENCE.map(({ path }) => readFile(join(process.cwd(), path))),
  );
  expect(() => verifyLicenseFileFreePackageEvidence(artifacts)).not.toThrow();

  const drifted = [...artifacts];
  drifted[1] = Buffer.concat([drifted[1], Buffer.from(' ')]);
  expect(() => verifyLicenseFileFreePackageEvidence(drifted)).toThrow(
    /react-remove-scroll-bar[/\\]package\.json exact audited evidence SHA-256 changed/iu,
  );
});

test('labels license text without an upstream copyright notice as reference terms', () => {
  const rootInventory = `${inventory()}\n### Review terms\n\ntruncated terms\n`;
  expect(() =>
    verify({
      rootInventory,
      requiredStaticNoticeSections: [
        {
          heading: '### Review terms',
          referenceTerms: ['complete canonical terms'],
        },
      ],
    }),
  ).toThrow(/required canonical license reference terms/iu);
});

test('rejects a root inventory table with a malformed separator', () => {
  const changed = inventory().replace(
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    'this is not a Markdown table separator',
  );
  expect(() => verify({ rootInventory: changed })).toThrow(/inventory table|separator/iu);
});

test.each([
  ['tilde fence', (content) => `~~~markdown\n${content}\n~~~`],
  ['HTML comment', (content) => `<!--\n${content}\n-->`],
  ['raw pre block', (content) => `<pre>\n${content}\n</pre>`],
])('rejects a root inventory rendered as %s', (_label, transform) => {
  expect(() => verify({ rootInventory: transform(inventory()) })).toThrow(/Inventário|inventory/iu);
});

test('rejects a duplicate indented inventory heading', () => {
  const changed = `${inventory()}\n  ## Inventário: package.json (raiz)\n\nContraditório.\n`;
  expect(() => verify({ rootInventory: changed })).toThrow(/exactly one|inventory/iu);
});

test('rejects a rendered-equivalent duplicate inventory heading', () => {
  const changed = `${inventory()}\n## Inventário&#58; *package.json* (raiz)\n`;
  expect(() => verify({ rootInventory: changed })).toThrow(/exactly one|top-level|inventory/iu);
});

test('rejects a Unicode-normalized duplicate inventory heading', () => {
  const changed = `${inventory()}\n## Inventa\u0301rio: package.json (raiz)\n`;
  expect(() => verify({ rootInventory: changed })).toThrow(/exactly one|top-level|inventory/iu);
});

test('rejects a duplicate heading whose canonical form emerges after invisible formatting is removed', () => {
  const changed = `${inventory()}\n## Inventa\u200b\u0301rio: package.json (raiz)\n`;
  expect(() => verify({ rootInventory: changed })).toThrow(/exactly one|top-level|inventory/iu);
});

test.each([
  ['combining grapheme joiner', '\u034f'],
  ['variation selector', '\ufe0f'],
])('rejects a duplicate inventory heading containing a default-ignorable %s', (_label, marker) => {
  const changed = `${inventory()}\n## Inventário${marker}: package.json (raiz)\n`;
  expect(() => verify({ rootInventory: changed })).toThrow(/exactly one|top-level|inventory/iu);
});

test.each([
  ['backspace', '\u0008'],
  ['delete', '\u007f'],
])('rejects a duplicate inventory heading containing an invisible %s control', (_label, control) => {
  const changed = `${inventory()}\n## Inventário${control}: package.json (raiz)\n`;
  expect(() => verify({ rootInventory: changed })).toThrow(/control|visible legal evidence/iu);
});

test('rejects an NFKC-equivalent duplicate inventory heading', () => {
  const changed = `${inventory()}\n## Inventário： package.json (raiz)\n`;
  expect(() => verify({ rootInventory: changed })).toThrow(/exactly one|canonical|inventory/iu);
});

test.each([
  ['lowercase', '## inventário: package.json (raiz)'],
  ['space before colon', '## Inventário : package.json (raiz)'],
])('rejects a %s duplicate inventory heading', (_variant, heading) => {
  const changed = `${inventory()}\n${heading}\n`;
  expect(() => verify({ rootInventory: changed })).toThrow(/exactly one|canonical|inventory/iu);
});

test('rejects a required legal notice rendered as struck-through Markdown', () => {
  const changed = `${inventory()}\n### Review notice\n\n~~complete legal notice~~\n`;
  expect(() =>
    verify({
      rootInventory: changed,
      requiredStaticNoticeSections: [
        { heading: '### Review notice', notices: ['complete legal notice'] },
      ],
    }),
  ).toThrow(/struck-through|deleted|visible legal evidence/iu);
});

test('rejects a required heading rendered as struck-through Markdown', () => {
  const changed = `${inventory()}\n### ~~JSZip 3.10.1 — MIT~~\n`;
  expect(() =>
    verify({
      rootInventory: changed,
      requiredStaticNoticeMarkers: ['### JSZip 3.10.1 — MIT'],
    }),
  ).toThrow(/struck-through|deleted|visible legal evidence/iu);
});

test('rejects bidirectional controls in visible legal evidence', () => {
  const changed = `${inventory()}\n### Review notice\n\ncomplete \u202elegal\u202c notice\n`;
  expect(() =>
    verify({
      rootInventory: changed,
      requiredStaticNoticeSections: [
        { heading: '### Review notice', notices: ['complete legal notice'] },
      ],
    }),
  ).toThrow(/bidirectional|bidi|visible legal evidence/iu);
});

test('rejects a duplicate inventory heading nested in a blockquote', () => {
  const changed = `${inventory()}\n> ## Inventário: package.json (raiz)\n`;
  expect(() => verify({ rootInventory: changed })).toThrow(/exactly one|top-level|inventory/iu);
});

test('rejects a duplicate inventory heading nested in a list item', () => {
  const changed = `${inventory()}\n- Wrapper\n\n  ## Inventário: package.json (raiz)\n`;
  expect(() => verify({ rootInventory: changed })).toThrow(/exactly one|top-level|inventory/iu);
});

test.each([
  ['hidden div', (content) => `<div hidden>\n\n${content}\n\n</div>`],
  ['closed details', (content) => `<details>\n\n${content}\n\n</details>`],
  ['remote iframe', (content) => `<iframe src="https://example.invalid/probe"></iframe>\n\n${content}`],
])('rejects a root inventory nested in a raw HTML %s', (_label, transform) => {
  expect(() => verify({ rootInventory: transform(inventory()) })).toThrow(/top-level|raw HTML|inventory/iu);
});

test('rejects a second visible inventory table in the same section', () => {
  const duplicate = `| Escopo | Componente | Versão declarada | Versão resolvida | Licença do pacote | Eleição | Integridade | Origem imutável |
| --- | --- | --- | --- | --- | --- | --- | --- |
| runtime | attacker | 9.9.9 | 9.9.9 | MIT | — | ${ALPHA_SRI} | https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz |`;
  const changed = inventory().replace(
    '## Inventário: tlsrpt-motor/package.json',
    `${duplicate}\n\n## Inventário: tlsrpt-motor/package.json`,
  );
  expect(() => verify({ rootInventory: changed })).toThrow(/exactly one visible Markdown inventory table/iu);
});

test('rejects a second inventory table nested in a blockquote', () => {
  const nested = `> | Escopo | Componente | Versão declarada | Versão resolvida | Licença do pacote | Eleição | Integridade | Origem imutável |
> | --- | --- | --- | --- | --- | --- | --- | --- |
> | runtime | attacker | 9.9.9 | 9.9.9 | MIT | — | ${ALPHA_SRI} | https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz |`;
  const changed = inventory().replace(
    '## Inventário: tlsrpt-motor/package.json',
    `${nested}\n\n## Inventário: tlsrpt-motor/package.json`,
  );
  expect(() => verify({ rootInventory: changed })).toThrow(/exactly one visible Markdown inventory table/iu);
});

test('rejects an inventory-shaped table under a different heading', () => {
  const extra = `## Inventário contraditório

| Escopo | Componente | Versão declarada | Versão resolvida | Licença do pacote | Eleição | Integridade | Origem imutável |
| --- | --- | --- | --- | --- | --- | --- | --- |
| runtime | attacker | 9.9.9 | 9.9.9 | MIT | — | ${ALPHA_SRI} | https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz |`;
  expect(() => verify({ rootInventory: `${inventory()}\n${extra}\n` })).toThrow(
    /exactly one visible Markdown inventory table/iu,
  );
});

test('rejects an additional noncanonical table outside the closed root inventory outline', () => {
  const extra = `# Apêndice contraditório

| Componente | Licença |
| --- | --- |
| pacote-fantasma | Proprietária |`;
  expect(() =>
    verify({
      rootInventory: `${inventory()}\n${extra}\n`,
      rootDocumentSchema: ROOT_TEST_DOCUMENT_SCHEMA,
    }),
  ).toThrow(/closed document|exactly two visible Markdown tables|table count/iu);
});

test('rejects an additional H1 and contradictory prose outside the closed root outline', () => {
  const extra = `# Avisos revogados

Este documento não concede qualquer permissão.`;
  expect(() =>
    verify({
      rootInventory: `${inventory()}\n${extra}\n`,
      rootDocumentSchema: ROOT_TEST_DOCUMENT_SCHEMA,
    }),
  ).toThrow(/closed document|heading outline|paragraph count|title/iu);
});

test('rejects legal drift inside a closed static root table', () => {
  const staticTable = `## Complementos legais

| Componente | Licença aplicada |
| --- | --- |
| JSZip | Proprietária; redistribuição proibida |`;
  expect(() =>
    verify({
      rootInventory: `${inventory()}\n${staticTable}\n`,
      rootDocumentSchema: {
        ...ROOT_TEST_DOCUMENT_SCHEMA,
        headings: [...ROOT_TEST_DOCUMENT_SCHEMA.headings, '## Complementos legais'],
        tableCount: 3,
        dynamicTableCount: 2,
        staticTableDigests: [
          '58c4b5700269607e51b0d6f2badcdd2d0304cbb0c230ecb3b726acad1cfb696f',
        ],
      },
    }),
  ).toThrow(/static legal table|audited table/iu);
});

test('rejects moving an unchanged legal block into a different root section', () => {
  const misplaced = `## Componente incorporado

### Aviso integral

## Complementos

\`\`\`text
LEGAL
\`\`\``;
  const headings = [
    ...ROOT_TEST_DOCUMENT_SCHEMA.headings,
    '## Componente incorporado',
    '### Aviso integral',
    '## Complementos',
  ];
  expect(() =>
    verify({
      rootInventory: `${inventory()}\n${misplaced}\n`,
      rootDocumentSchema: {
        ...ROOT_TEST_DOCUMENT_SCHEMA,
        headings,
        codeBlockCount: 1,
        codeBlockDigests: [
          'ab0730acb114a4ef42c2b4e3d80cf0f3a580ff5d4cd54a2d6c2a3d75c05c952b',
        ],
        sections: [
          { heading: '# Third-party inventory', tokens: [] },
          { heading: rootManifest.heading, tokens: [{ type: 'table' }] },
          { heading: motorManifest.heading, tokens: [{ type: 'table' }] },
          { heading: '## Componente incorporado', tokens: [] },
          {
            heading: '### Aviso integral',
            tokens: [
              {
                type: 'code',
                digest: 'ab0730acb114a4ef42c2b4e3d80cf0f3a580ff5d4cd54a2d6c2a3d75c05c952b',
              },
            ],
          },
          { heading: '## Complementos', tokens: [] },
        ],
      },
    }),
  ).toThrow(/section content|assigned.*section|Aviso integral/iu);
});

test('rejects an inventory-shaped table with an NFKC-equivalent header', () => {
  const extra = `## Inventário contraditório

| Ｅｓｃｏｐｏ | Componente | Versão declarada | Versão resolvida | Licença do pacote | Eleição | Integridade | Origem imutável |
| --- | --- | --- | --- | --- | --- | --- | --- |
| runtime | attacker | 9.9.9 | 9.9.9 | MIT | — | ${ALPHA_SRI} | https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz |`;
  expect(() => verify({ rootInventory: `${inventory()}\n${extra}\n` })).toThrow(
    /exactly one visible Markdown inventory table/iu,
  );
});

test.each([
  ['a cross-script homograph', 'Escоpo'],
  ['a simple typo', 'Escop'],
])('rejects an additional eight-column inventory table with %s in its header', (_label, scopeHeader) => {
  const extra = `## Inventário contraditório

| ${scopeHeader} | Componente | Versão declarada | Versão resolvida | Licença do pacote | Eleição | Integridade | Origem imutável |
| --- | --- | --- | --- | --- | --- | --- | --- |
| runtime | attacker | 9.9.9 | 9.9.9 | MIT | — | ${ALPHA_SRI} | https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz |`;
  expect(() => verify({ rootInventory: `${inventory()}\n${extra}\n` })).toThrow(
    /exactly two|eight-column|inventory table/iu,
  );
});

test('rejects an inventory-shaped table whose header contains a zero-width character', () => {
  const extra = `## Inventário contraditório

| Escopo\u200b | Componente | Versão declarada | Versão resolvida | Licença do pacote | Eleição | Integridade | Origem imutável |
| --- | --- | --- | --- | --- | --- | --- | --- |
| runtime | attacker | 9.9.9 | 9.9.9 | MIT | — | ${ALPHA_SRI} | https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz |`;
  expect(() => verify({ rootInventory: `${inventory()}\n${extra}\n` })).toThrow(
    /exactly one visible Markdown inventory table/iu,
  );
});

test.each([
  ['combining grapheme joiner', '\u034f'],
  ['variation selector', '\ufe0f'],
])('rejects an inventory-shaped table whose header contains a default-ignorable %s', (_label, marker) => {
  const extra = `## Inventário contraditório

| Escopo${marker} | Componente | Versão declarada | Versão resolvida | Licença do pacote | Eleição | Integridade | Origem imutável |
| --- | --- | --- | --- | --- | --- | --- | --- |
| runtime | attacker | 9.9.9 | 9.9.9 | MIT | — | ${ALPHA_SRI} | https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz |`;
  expect(() => verify({ rootInventory: `${inventory()}\n${extra}\n` })).toThrow(
    /exactly one visible Markdown inventory table/iu,
  );
});

test('rejects drift in a vendored browser distribution', () => {
  expect(() => verifySha256(Buffer.from('changed'), '0'.repeat(64), 'vendor.js')).toThrow(/SHA-256 changed/u);
});

test('accepts locally bundled fonts', () => {
  expect(() => verifyNoRemoteGoogleFonts('<link rel="stylesheet" href="/assets/inter.css">')).not.toThrow();
});

test('rejects a mutable Google Fonts runtime dependency', () => {
  expect(() =>
    verifyNoRemoteGoogleFonts('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">'),
  ).toThrow(/outside the locked dependency graph/u);
});

test('rejects protocol-relative Google Fonts runtime dependencies', () => {
  expect(() => verifyNoRemoteGoogleFonts('<link rel="preconnect" href="//fonts.gstatic.com">')).toThrow(
    /outside the locked dependency graph/u,
  );
});

test.each([
  'http://fonts.googleapis.com/css2?family=Inter',
  'https://FONTS.GOOGLEAPIS.COM:443/css2?family=Inter',
  'https://fonts.googleapis.com./css2?family=Inter',
  'https://fonts&#46;googleapis&#46;com/css2?family=Inter',
  'https://fonts.gstatic.com/s/inter/v20/font.woff2',
  'https://fonts.gstatic.com./s/inter/v20/font.woff2',
])('rejects the canonical Google Fonts hosts after HTML and URL normalization: %s', (href) => {
  expect(() => verifyNoRemoteGoogleFonts(`<link rel="stylesheet" href="${href}">`)).toThrow(
    /outside the locked dependency graph/u,
  );
});

test('rejects a false visible field backed only by the exact value inside a code fence', async () => {
  const exact = '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz`';
  const falseVisible = '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`';
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(exact, `${falseVisible}\n\n\`\`\`text\n${exact}\n\`\`\``),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/visible Resolved field|exactly one/iu);
    },
  );
});

test('rejects a false visible field backed only by the exact value inside raw HTML', async () => {
  const exact = '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz`';
  const falseVisible = '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`';
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(exact, `${falseVisible}\n\n<pre>\n${exact}\n</pre>`),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/raw HTML|structural Resolved|exactly one/iu);
    },
  );
});

test('rejects a contradictory duplicate visible field beside the exact value', async () => {
  const exact = '- **Integrity:** `sha512-BAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBA==`';
  const contradiction = `- **Integrity:** \`${ALPHA_SRI}\``;
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => notice.replace(exact, `${exact}\n${contradiction}`),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /visible Integrity field|exactly one|metadata/iu,
      );
    },
  );
});

test.each([
  ['an indented list marker', '  - **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`'],
  ['extra list-marker spacing', '-  **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`'],
])('rejects a contradictory duplicate field rendered with %s', async (_variant, contradiction) => {
  const exact = '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz`';
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => notice.replace(exact, `${exact}\n${contradiction}`),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /exactly one (?:structural Resolved|structural visible list item)|metadata/iu,
      );
    },
  );
});

test.each([
  ['a blockquote', '> **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`'],
  ['a paragraph', '**Resolved:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`'],
])('rejects a contradictory duplicate field rendered as %s', async (_variant, contradiction) => {
  const exact = '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz`';
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => notice.replace(exact, `${exact}\n\n${contradiction}`),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /exactly one structural Resolved field|metadata|closed document/iu,
      );
    },
  );
});

test.each([
  [
    'adjacent strong elements',
    '- **Resolved****:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`',
  ],
  [
    'strong text and a plain colon',
    '- **Resolved**: `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`',
  ],
])('rejects a contradictory field label split across %s', async (_variant, contradiction) => {
  const exact = '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz`';
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => notice.replace(exact, `${exact}\n${contradiction}`),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /exactly one structural Resolved field|metadata/iu,
      );
    },
  );
});

test.each([
  [
    'an icon-prefixed fragmented strong label',
    '- ⚠ **Resolved****:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`',
    '\n',
  ],
  [
    'an icon-prefixed strong label',
    '- ⚠ **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`',
    '\n',
  ],
  [
    'a heading',
    '### **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`',
    '\n\n',
  ],
])(
  'rejects a contradictory field label rendered inside %s',
  async (_variant, contradiction, separator) => {
    const exact = '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz`';
    await withAdminWorkerFixture(
      {
        packageName: 'alpha',
        version: '1.0.1',
        sourceNoticeTransform: (notice) =>
          notice.replace(exact, `${exact}${separator}${contradiction}`),
      },
      async (fixture) => {
        await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
          /exactly one structural Resolved field|metadata|heading outline/iu,
        );
      },
    );
  },
);

test('rejects a contradictory NFKC-equivalent Admin Worker field label', async () => {
  const exact = '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz`';
  const contradiction =
    '- **Ｒｅｓｏｌｖｅｄ:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`';
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => notice.replace(exact, `${exact}\n${contradiction}`),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /exactly one structural Resolved field|metadata/iu,
      );
    },
  );
});

test('rejects an invisible control inside a contradictory Admin Worker field label', async () => {
  const exact = '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz`';
  const contradiction =
    '- **Resolved\u0008:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`';
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => notice.replace(exact, `${exact}\n${contradiction}`),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /control|visible legal evidence/iu,
      );
    },
  );
});

test.each([
  ['lowercase', '- **resolved:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`'],
  ['space before colon', '- **Resolved :** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`'],
  ['cross-script homograph', '- **Rеsolved:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`'],
])('rejects an additional %s metadata field', async (_variant, contradiction) => {
  const exact = '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz`';
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => notice.replace(exact, `${exact}\n${contradiction}`),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /metadata|list item|exactly one structural Resolved field/iu,
      );
    },
  );
});

test('accepts an upstream legal notice whose prose contains a field-like word', async () => {
  const licenseContent = `${TEST_LICENSE}\n\nThis historical dispute was Resolved: amicably.`;
  await withAdminWorkerFixture(
    { packageName: 'alpha', version: '1.0.1', licenseContent },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).resolves.toEqual({
        entryOutputPath: 'dist/legal-audit/index.js',
        packageCount: 1,
      });
    },
  );
});

test('rejects drift in the Admin Worker immutable-origin metadata field', async () => {
  const exact =
    '- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.';
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(exact, '- **Origem imutável/hash:** origem mutável sem autenticação.'),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /Origem imutável\/hash|immutable-origin|metadata/iu,
      );
    },
  );
});

test('accepts unrelated hosts whose names merely contain a Google Fonts hostname', () => {
  expect(() =>
    verifyNoRemoteGoogleFonts(
      '<link rel="stylesheet" href="https://fonts.googleapis.com.example.invalid/local.css">',
    ),
  ).not.toThrow();
});

test('accepts local resources and non-resource mentions of Google Fonts hosts', () => {
  expect(() =>
    verifyNoRemoteGoogleFonts(`
      <!-- https://fonts.googleapis.com/css2?family=Inter -->
      <p>https://fonts.gstatic.com is documented here without being loaded.</p>
      <link rel="stylesheet" href="/assets/inter.css">
      <link rel="stylesheet" href="https://example.invalid/fonts.googleapis.com/local.css">
      <link rel="stylesheet" href="https://example.invalid/local.css?source=fonts.gstatic.com">
    `),
  ).not.toThrow();
});

test('fails closed on malformed remote resource URLs', () => {
  expect(() => verifyNoRemoteGoogleFonts('<link rel="stylesheet" href="https://[">')).toThrow(
    /valid remote URL/u,
  );
});

test('rejects a mutable Google Fonts dependency in emitted HTML', () => {
  expect(() =>
    verify({
      artifactHtml: [
        {
          path: 'dist/index.html',
          content: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">',
        },
      ],
    }),
  ).toThrow(/outside the locked dependency graph/u);
});

test('rejects a mutable Google Fonts dependency in emitted CSS', () => {
  expect(() =>
    verify({
      artifactCss: [
        {
          path: 'dist/assets/app.css',
          content: '@font-face { src: url("https://fonts.gstatic.com/inter.woff2") format("woff2"); }',
        },
      ],
    }),
  ).toThrow(/outside the locked dependency graph/u);
});

test('rejects a truncated legal notice inside its configured section', () => {
  const rootInventory = `${inventory()}\n### Pako 1.0.5 — MIT e Zlib\n\ncomplete MIT notice only\n`;
  expect(() =>
    verify({
      rootInventory,
      requiredStaticNoticeSections: [
        {
          heading: '### Pako 1.0.5 — MIT e Zlib',
          notices: ['complete MIT notice', 'complete Zlib notice'],
        },
      ],
    }),
  ).toThrow(/complete required legal notice/u);
});

test('rejects a legal notice whose inline token boundaries do not render whitespace', () => {
  const rootInventory = `${inventory()}\n### Review notice\n\ncomplete**MIT**notice\n`;
  expect(() =>
    verify({
      rootInventory,
      requiredStaticNoticeSections: [
        {
          heading: '### Review notice',
          notices: ['complete MIT notice'],
        },
      ],
    }),
  ).toThrow(/complete required legal notice/u);
});

test('rejects a configured legal notice supplied only as raw HTML', () => {
  const rootInventory = `${inventory()}\n### Pako 1.0.5 — MIT e Zlib\n\n<pre>\ncomplete MIT notice\ncomplete Zlib notice\n</pre>\n`;
  expect(() =>
    verify({
      rootInventory,
      requiredStaticNoticeSections: [
        {
          heading: '### Pako 1.0.5 — MIT e Zlib',
          notices: ['complete MIT notice', 'complete Zlib notice'],
        },
      ],
    }),
  ).toThrow(/complete required legal notice|raw HTML/u);
});

test('rejects a configured legal notice supplied only as image alt text', () => {
  const rootInventory = `${inventory()}\n### Review notice\n\n![complete legal notice](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==)\n`;
  expect(() =>
    verify({
      rootInventory,
      requiredStaticNoticeSections: [
        {
          heading: '### Review notice',
          notices: ['complete legal notice'],
        },
      ],
    }),
  ).toThrow(/complete required legal notice/u);
});

test('rejects a required legal heading supplied only as an invisible link title', () => {
  const changed = inventory().replace(
    '### JSZip 3.10.1 — MIT',
    '[supplement](https://example.invalid "### JSZip 3.10.1 — MIT")',
  );
  expect(() =>
    verify({
      rootInventory: changed,
      requiredStaticNoticeMarkers: ['### JSZip 3.10.1 — MIT'],
    }),
  ).toThrow(/exactly one semantic|section/u);
});

test('rejects a deployed Worker whose configured complete notice is absent', () => {
  expect(() =>
    verify({
      workerArtifacts: [
        {
          path: 'admin-motor/dist/legal-audit/index.js',
          content: 'export default {};',
          requiredNotices: ['complete Hono MIT notice'],
        },
      ],
    }),
  ).toThrow(/complete required legal notice/u);
});

test('rejects a missing configured supplemental notice', () => {
  expect(() => verify({ requiredStaticNoticeMarkers: ['required legal notice'] })).toThrow(
    /missing a complete required legal notice/u,
  );
});

test('rejects divergence between root and public copies', () => {
  expect(() => verify({ publicInventory: `${inventory()}\n` })).toThrow(/byte-identical/u);
});

test('rejects divergence between root and public NOTICE copies', () => {
  expect(() => verify({ rootNotice: 'different\n' })).toThrow(/NOTICE.*byte-identical/u);
});

test('rejects any omitted direct dependency', () => {
  expect(() => verify({ rootInventory: inventory({ omitBeta: true }) })).toThrow(/every direct manifest dependency/u);
});

test.each([
  ['declared version', '| alpha | ^1.0.0 |', '| alpha | ^1.9.0 |'],
  ['resolved version', '| 1.0.1 | MIT |', '| 1.0.0 | MIT |'],
  ['license', '| MIT | — |', '| ISC | — |'],
  ['integrity', ALPHA_SRI, BETA_SRI],
  ['source', 'alpha-1.0.1.tgz', 'alpha-1.0.0.tgz'],
])('rejects %s drift', (_label, current, changed) => {
  expect(() => verify({ rootInventory: inventory().replace(current, changed) })).toThrow(/exact lockfile provenance/u);
});

test('rejects a non-registry or unhashed direct dependency', () => {
  const changedManifest = structuredClone(rootManifest);
  changedManifest.packageLock.packages['node_modules/alpha'].resolved = 'https://example.com/alpha.tgz';
  expect(() => verify({ manifests: [changedManifest, motorManifest] })).toThrow(/canonical npm registry origin/u);
});

test('rejects a registry tarball for a different package or version', () => {
  const changedManifest = structuredClone(rootManifest);
  changedManifest.packageLock.packages['node_modules/alpha'].resolved =
    'https://registry.npmjs.org/attacker/-/attacker-9.9.9.tgz';
  expect(() => verify({ manifests: [changedManifest, motorManifest] })).toThrow(
    /exact package name and resolved version/u,
  );
});

test('rejects a short digest mislabeled as sha512', () => {
  const changedManifest = structuredClone(rootManifest);
  changedManifest.packageLock.packages['node_modules/alpha'].integrity = 'sha512-YQ==';
  expect(() => verify({ manifests: [changedManifest, motorManifest] })).toThrow(/decode to 64 bytes/u);
});

test('rejects a missing emitted inventory', () => {
  expect(() => verify({ artifactNotice: 'notice\n' })).toThrow(/dist\/legal\/THIRDPARTY/u);
});

test('rejects a truncated emitted notice', () => {
  expect(() => verify({ artifactInventory: inventory(), artifactNotice: 'notice' })).toThrow(/dist\/legal\/NOTICE/u);
});

test("rejects an artifact without Vite's native bundled-license inventory", () => {
  expect(() =>
    verify({
      artifactInventory: inventory(),
      artifactNotice: 'notice\n',
    }),
  ).toThrow(/dist\/legal\/BUNDLED-LICENSES/u);
});

test("accepts Vite's native bundled-license inventory in the emitted artifact", () => {
  expect(() =>
    verify({
      artifactInventory: inventory(),
      artifactNotice: 'notice\n',
      artifactBundledLicenses: '# Licenses\n\n## alpha - 1.0.1 (MIT)\n\nMIT License\n',
      artifactJavaScript: [{ path: 'dist/assets/app.js', content: LICENSE_BANNER }],
    }),
  ).not.toThrow();
});

test('rejects an empty native license section without a full static supplement', () => {
  expect(() =>
    verify({
      artifactInventory: inventory(),
      artifactNotice: 'notice\n',
      artifactBundledLicenses: '# Licenses\n\n## alpha - 1.0.1 (MIT)\n\nMIT License\n\n## empty - 1.0.0 (MIT)\n',
      artifactJavaScript: [{ path: 'dist/assets/app.js', content: LICENSE_BANNER }],
    }),
  ).toThrow(/empty unsupplemented section/u);
});

test('accepts an empty native section only when it has a configured supplement', () => {
  expect(() =>
    verify({
      artifactInventory: inventory(),
      artifactNotice: 'notice\n',
      artifactBundledLicenses: '# Licenses\n\n## alpha - 1.0.1 (MIT)\n\nMIT License\n\n## empty - 1.0.0 (MIT)\n',
      artifactJavaScript: [{ path: 'dist/assets/app.js', content: LICENSE_BANNER }],
      bundledLicenseSupplementHeadings: ['## empty - 1.0.0 (MIT)'],
    }),
  ).not.toThrow();
});

test('rejects a Vite chunk without the bundled-license banner', () => {
  expect(() =>
    verify({
      artifactInventory: inventory(),
      artifactNotice: 'notice\n',
      artifactBundledLicenses: '# Licenses\n\n## alpha - 1.0.1 (MIT)\n\nMIT License\n',
      artifactJavaScript: [{ path: 'dist/assets/app.js', content: 'export default {};' }],
    }),
  ).toThrow(/missing the bundled-license banner/u);
});

test('rejects a missing configured bundled dependency notice', () => {
  expect(() =>
    verify({
      artifactInventory: inventory(),
      artifactNotice: 'notice\n',
      artifactBundledLicenses: '# Licenses\n\n## alpha - 1.0.1 (MIT)\n\nMIT License\n',
      requiredBundledLicenseMarkers: ['## jszip - 3.10.1'],
    }),
  ).toThrow(/missing bundled dependency notice/u);
});

test('accepts a Wrangler Worker artifact with its required legal notice', () => {
  expect(() =>
    verify({
      workerArtifact: `/*! ${BASE64_ARRAY_BUFFER_MIT_NOTICE} */`,
      requiredWorkerNoticeMarkers: [BASE64_ARRAY_BUFFER_MIT_NOTICE],
    }),
  ).not.toThrow();
});

test('accepts an unrelated control in Worker code when the complete legal notice is intact', () => {
  expect(() =>
    verify({
      workerArtifact: `const sentinel = "\u0001";\n/*! ${BASE64_ARRAY_BUFFER_MIT_NOTICE} */`,
      requiredWorkerNoticeMarkers: [BASE64_ARRAY_BUFFER_MIT_NOTICE],
    }),
  ).not.toThrow();
});

test('rejects a Worker legal notice altered with a default-ignorable character', () => {
  const alteredNotice = BASE64_ARRAY_BUFFER_MIT_NOTICE.replace('Copyright', 'Copy\u200bright');
  expect(() =>
    verify({
      workerArtifact: `/*! ${alteredNotice} */`,
      requiredWorkerNoticeMarkers: [BASE64_ARRAY_BUFFER_MIT_NOTICE],
    }),
  ).toThrow(/complete required legal notice/u);
});

test('rejects a truncated Wrangler Worker legal notice', () => {
  expect(() =>
    verify({
      workerArtifact:
        '/*! Copyright 2011 Jon Leighton. The above copyright notice and this permission notice shall be included. */',
      requiredWorkerNoticeMarkers: [BASE64_ARRAY_BUFFER_MIT_NOTICE],
    }),
  ).toThrow(/complete required legal notice/u);
});

test('rejects a Wrangler Worker artifact without its required legal notice', () => {
  expect(() =>
    verify({
      workerArtifact: 'export default {};',
      requiredWorkerNoticeMarkers: [BASE64_ARRAY_BUFFER_MIT_NOTICE],
    }),
  ).toThrow(/complete required legal notice/u);
});

test('rejects drift in the Admin Worker effective inventory table', async () => {
  await withAdminWorkerFixture(
    { packageName: 'alpha', version: '1.0.1', tableVersion: '1.0.0' },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/inventory table.*lockfile-derived/iu);
    },
  );
});

test('rejects a replaced Admin Worker title', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(
          '# Avisos de componentes de terceiros — Admin Motor',
          '# Licenças revogadas — Admin Motor',
        ),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/canonical title|heading outline/iu);
    },
  );
});

test('rejects an additional Admin Worker H1 and contradictory prose', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        `${notice}\n# Avisos revogados\n\nEste documento não concede qualquer permissão.\n`,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/heading outline|closed document/iu);
    },
  );
});

test('rejects contradictory metadata before the Admin Worker inventory', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(
          '## Inventário efetivo',
          '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz`\n\n## Inventário efetivo',
        ),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/canonical preamble|closed document/iu);
    },
  );
});

test('rejects contradictory prose inside an Admin Worker package section', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(
          '\n```text\n',
          '\nEste aviso foi revogado e não concede qualquer permissão.\n\n```text\n',
        ),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /canonical prose|closed section|noncanonical package prose/iu,
      );
    },
  );
});

test('rejects a duplicate integral license block in an Admin Worker package section', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => `${notice}\n\n\`\`\`text\n${TEST_LICENSE}\n\`\`\`\n`,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /one fenced legal-text block|closed section|legal-text block per package/iu,
      );
    },
  );
});

test('rejects an unfenced integral license in an Admin Worker package section', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(`\`\`\`text\n${TEST_LICENSE}\n\`\`\``, TEST_LICENSE),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /one fenced legal-text block|closed section|legal-text block per package/iu,
      );
    },
  );
});

test('rejects an Admin Worker inventory hidden in an HTML comment', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(
          /## Inventário efetivo\n\n([\s\S]*?)\n\n## alpha/u,
          '## Inventário efetivo\n\n<!--\n$1\n-->\n\n## alpha',
        ),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/raw HTML|visible contiguous table/iu);
    },
  );
});

test('rejects an Admin Worker legal document hidden entirely in an HTML comment', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => `<!--\n${notice}\n-->`,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/HTML comments|visible/iu);
    },
  );
});

test('rejects an unexpected standalone HTML comment end-tag marker outside the closed outline', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => `${notice}\n--!>`,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/closed document|heading outline/iu);
    },
  );
});

test('rejects an Admin Worker legal document rendered as a raw pre block', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => `<pre>\n${notice}\n</pre>`,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/Inventário efetivo|visible/iu);
    },
  );
});

test('rejects an encoded bidirectional control after GFM entity decoding', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(
          '# Avisos de componentes de terceiros — Admin Motor',
          '# Avisos de componentes de terceiros — Admin Motor &#x202e;etiqueta&#x202c;',
        ),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /bidirectional|bidi|visible legal evidence/iu,
      );
    },
  );
});

test('rejects an encoded invisible control after GFM entity decoding', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(
          '# Avisos de componentes de terceiros — Admin Motor',
          '# Avisos de componentes de terceiros — Admin Motor &#x7f;',
        ),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /control|visible legal evidence/iu,
      );
    },
  );
});

test.each([
  ['hidden div', (notice) => `<div hidden>\n\n${notice}\n\n</div>`],
  ['closed details', (notice) => `<details>\n\n${notice}\n\n</details>`],
])('rejects an Admin Worker legal document nested in a raw HTML %s', async (_label, transform) => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: transform,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/top-level|raw HTML|visible/iu);
    },
  );
});

test('rejects a duplicate Admin Worker inventory heading nested in a blockquote', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => `${notice}\n> ## Inventário efetivo\n`,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/exactly one semantic|top-level/iu);
    },
  );
});

test('rejects an unexpected Admin Worker dependency heading nested in a blockquote', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        `${notice}\n> ## attacker 9.9.9 — MIT\n>\n> Contraditório.\n`,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /dependency sections.*top-level|closed document/iu,
      );
    },
  );
});

test('rejects an extra Admin Worker inventory-shaped table under another heading', async () => {
  const extra = `## Inventário contraditório

| Componente | Versão | Licença | Caminho no lockfile |
| --- | --- | --- | --- |
| \`attacker\` | \`9.9.9\` | \`MIT\` | \`packages["node_modules/attacker"]\` |`;
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => `${notice}\n${extra}\n`,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /exactly one (?:effective inventory-shaped|visible contiguous|visible Markdown table)/iu,
      );
    },
  );
});

test('rejects an extra noncanonical table inside an Admin Worker dependency section', async () => {
  const extra = `| Componentе | Versão | Licença | Caminho no lockfile |
| --- | --- | --- | --- |
| \`attacker\` | \`9.9.9\` | \`MIT\` | \`packages["node_modules/attacker"]\` |`;
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => `${notice}\n${extra}\n`,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /exactly one visible Markdown table/iu,
      );
    },
  );
});

test('rejects an Admin Worker inventory indented as a Markdown code block', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(
          /\| Componente \| Versão \| Licença \| Caminho no lockfile \|\n\| --- \| --- \| --- \| --- \|\n\| `alpha` \| `1\.0\.1` \| `MIT` \| `packages\["node_modules\/alpha"\]` \|/u,
          (table) => table.split('\n').map((line) => `    ${line}`).join('\n'),
        ),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /visible contiguous table|visible Markdown table/iu,
      );
    },
  );
});

test('rejects an Admin Worker inventory whose first header row alone is a Markdown code block', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(
          '| Componente | Versão | Licença | Caminho no lockfile |',
          '    | Componente | Versão | Licença | Caminho no lockfile |',
        ),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /visible contiguous table|visible Markdown table/iu,
      );
    },
  );
});

test('rejects an Admin Worker legal document hidden in a tilde code fence', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => `~~~markdown\n${notice}\n~~~`,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /Inventário efetivo|exact bundled npm artifact|visible Markdown table/iu,
      );
    },
  );
});

test('rejects an Admin Worker legal document hidden by a longer backtick fence', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => `\`\`\`\`markdown\n\`\`\`\n${notice}\n\`\`\`\n\`\`\`\``,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /Inventário efetivo|exact bundled npm artifact|visible Markdown table/iu,
      );
    },
  );
});

test('rejects an Admin Worker inventory with a malformed separator cardinality', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => notice.replace('| --- | --- | --- | --- |', '| --- |'),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /separator is invalid|visible Markdown table/iu,
      );
    },
  );
});

test('rejects an Admin Worker package heading whose version only shares the expected prefix', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => notice.replace('## alpha 1.0.1 — MIT', '## alpha 1.0.10 — MIT'),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /exactly one section per.*artifact|heading outline/iu,
      );
    },
  );
});

test('rejects a shared package section that omits one exact repeated lockfile path', async () => {
  await withRepeatedAdminWorkerFixture({ includeBothLockPaths: false }, async (fixture) => {
    await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
      /must contain exactly (?:once|one structural).*node_modules\/foo/iu,
    );
  });
});

test('accepts one exact package section that names every repeated lockfile path', async () => {
  await withRepeatedAdminWorkerFixture({ includeBothLockPaths: true }, async (fixture) => {
    await expect(verifyAdminWorkerBundle(fixture)).resolves.toEqual({
      entryOutputPath: 'dist/legal-audit/index.js',
      packageCount: 2,
    });
  });
});

test('rejects a rendered-equivalent Admin Worker field label with collapsed whitespace', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(
          '- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/alpha"]`',
          '- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/alpha"]`\n' +
            '- **Caminho  no lockfile:** `package-lock.json -> packages["node_modules/attacker"]`',
        ),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /exactly one structural lockfile field|metadata/iu,
      );
    },
  );
});

test.each([
  ['zero-width character', '\u200b'],
  ['combining grapheme joiner', '\u034f'],
  ['variation selector', '\ufe0f'],
])('rejects a rendered-equivalent Admin Worker field label containing a %s', async (_label, marker) => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) =>
        notice.replace(
          '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz`',
          '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz`\n' +
            `- **Resolved${marker}:** \`https://registry.npmjs.org/alpha/-/alpha-9.9.9.tgz\``,
        ),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /exactly one structural Resolved field|metadata/iu,
      );
    },
  );
});

test('accepts an HTML-comment marker when it belongs to the exact upstream legal text', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      licenseContent: `${TEST_LICENSE}\n\n<!-- literal upstream text -->`,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).resolves.toEqual({
        entryOutputPath: 'dist/legal-audit/index.js',
        packageCount: 1,
      });
    },
  );
});

test.each([
  [
    'lock path',
    '- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/alpha"]`',
    '- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/alpha"]-decoy`',
  ],
  [
    'resolved URL',
    '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz`',
    '- **Resolved:** `https://registry.npmjs.org/alpha/-/alpha-1.0.1.tgz?tampered`',
  ],
  [
    'integrity',
    `- **Integrity:** \`${ALPHA_SRI}\``,
    `- **Integrity:** \`${ALPHA_SRI}decoy\``,
  ],
  [
    'license source SHA-256',
    `- **Fonte do aviso integral:** \`node_modules/alpha/LICENSE\` (\`SHA-256: ${TEST_LICENSE_SHA256}\`).`,
    `- **Fonte do aviso integral:** \`node_modules/alpha/LICENSE\` (\`SHA-256: ${TEST_LICENSE_SHA256}dead\`).`,
  ],
])('rejects an Admin Worker package section with an extended %s decoy', async (_field, exact, decoy) => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      integrity: ALPHA_SRI,
      sourceNoticeTransform: (notice) => notice.replace(exact, decoy),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /exactly (?:once|one structural)|required legal notice/iu,
      );
    },
  );
});

test('rejects the launder exception for any version other than the audited 1.7.1', async () => {
  const version = '1.7.2';
  const integrity = `sha512-${Buffer.alloc(64, 4).toString('base64')}`;
  const resolved = `https://registry.npmjs.org/launder/-/launder-${version}.tgz`;
  const sectionBody = `- **Caminho no lockfile:** \`package-lock.json -> packages["node_modules/launder"]\`
- **Resolved:** \`${resolved}\`
- **Integrity:** \`${integrity}\`
- **Origem upstream imutável:** commit \`e9b0ab0849a5dfea0f75335fbdf99b5c6bf9e4b3\`

O pacote npm não contém arquivo LICENSE.

${LAUNDER_MIT_TERMS}`;

  await withAdminWorkerFixture(
    { packageName: 'launder', version, includeLicense: false, sectionBody },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/exact audited provenance.*re-audit/iu);
    },
  );
});

test.each([
  ['license', 'ISC', LAUNDER_AUDITED_SRI],
  ['integrity', 'MIT', `sha512-${Buffer.alloc(64, 5).toString('base64')}`],
])('rejects launder 1.7.1 when its audited %s changes', async (_field, license, integrity) => {
  const version = '1.7.1';
  const resolved = `https://registry.npmjs.org/launder/-/launder-${version}.tgz`;
  const sectionBody = `- **Caminho no lockfile:** \`package-lock.json -> packages["node_modules/launder"]\`
- **Licença:** \`${license}\`
- **Resolved:** \`${resolved}\`
- **Integrity:** \`${integrity}\`
- **Origem upstream imutável:** commit \`e9b0ab0849a5dfea0f75335fbdf99b5c6bf9e4b3\`

O pacote npm não contém arquivo LICENSE.

${LAUNDER_MIT_TERMS}`;

  await withAdminWorkerFixture(
    { packageName: 'launder', version, license, integrity, includeLicense: false, sectionBody },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/exact audited provenance/iu);
    },
  );
});

test('accepts the exact audited launder 1.7.1 artifact and evidence', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'launder',
      version: '1.7.1',
      integrity: LAUNDER_AUDITED_SRI,
      includeLicense: false,
      sectionBody: launderSectionBody(),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).resolves.toEqual({
        entryOutputPath: 'dist/legal-audit/index.js',
        packageCount: 1,
      });
    },
  );
});

test('rejects launder when the exact package.json bytes drift', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'launder',
      version: '1.7.1',
      integrity: LAUNDER_AUDITED_SRI,
      includeLicense: false,
      sectionBody: launderSectionBody(),
      packageJsonTransform: (content) => Buffer.concat([content, Buffer.from(' ')]),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/package\.json.*exact audited artifact/iu);
    },
  );
});

test.each([
  [
    'resolved URL',
    {
      resolved: 'https://registry.npmjs.org/launder/-/launder-1.7.1-repacked.tgz',
      sectionBody: launderSectionBody({
        resolved: 'https://registry.npmjs.org/launder/-/launder-1.7.1-repacked.tgz',
      }),
    },
    /source must match its exact package name|exact audited provenance/iu,
  ],
  [
    'documented package.json hash',
    {
      sectionBody: launderSectionBody({ packageJsonSha256: '0'.repeat(64) }),
    },
    /must contain exactly (?:once|one structural)/iu,
  ],
  [
    'documented upstream commit',
    {
      sectionBody: launderSectionBody({ upstreamCommit: '0'.repeat(40) }),
    },
    /must contain exactly (?:once|one structural)/iu,
  ],
])('rejects launder when its exact audited %s drifts', async (_field, overrides, expectedError) => {
  await withAdminWorkerFixture(
    {
      packageName: 'launder',
      version: '1.7.1',
      integrity: LAUNDER_AUDITED_SRI,
      includeLicense: false,
      ...overrides,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(expectedError);
    },
  );
});

test.each([
  [
    'manifest SHA-256',
    `SHA-256: ${LAUNDER_PACKAGE_JSON_SHA256}`,
    `SHA-256: ${LAUNDER_PACKAGE_JSON_SHA256}dead`,
  ],
  [
    'upstream commit',
    `commit \`${LAUNDER_UPSTREAM_COMMIT}\``,
    `commit \`${LAUNDER_UPSTREAM_COMMIT}dead\``,
  ],
])('rejects launder when the documented exact %s is only a decoy prefix', async (_field, exact, decoy) => {
  await withAdminWorkerFixture(
    {
      packageName: 'launder',
      version: '1.7.1',
      integrity: LAUNDER_AUDITED_SRI,
      includeLicense: false,
      sectionBody: launderSectionBody().replace(exact, decoy),
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(
        /exactly (?:once|one structural)|required legal notice/iu,
      );
    },
  );
});
