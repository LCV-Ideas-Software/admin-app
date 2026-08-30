import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import {
  BASE64_ARRAY_BUFFER_MIT_NOTICE,
  verifyAdminWorkerBundle,
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

function launderSectionBody({
  license = 'MIT',
  resolved = 'https://registry.npmjs.org/launder/-/launder-1.7.1.tgz',
  integrity = LAUNDER_AUDITED_SRI,
  packageJsonSha256 = LAUNDER_PACKAGE_JSON_SHA256,
  upstreamCommit = LAUNDER_UPSTREAM_COMMIT,
} = {}) {
  return `- **Caminho no lockfile:** \`package-lock.json -> packages["node_modules/launder"]\`
- **Licença:** \`${license}\`
- **Resolved:** \`${resolved}\`
- **Integrity:** \`${integrity}\`
- **Evidência da licença declarada:** \`node_modules/launder/package.json\` (\`SHA-256: ${packageJsonSha256}\`).
- **Origem upstream imutável:** tag anotada \`launder@1.7.1\`, commit \`${upstreamCommit}\`, caminho \`packages/launder\` no repositório \`apostrophecms/apostrophe\`.

O pacote npm não contém arquivo LICENSE.

${LAUNDER_MIT_TERMS}`;
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
  const licenseSha256 = createHash('sha256').update(TEST_LICENSE).digest('hex');
  const defaultSectionBody = `- **Caminho no lockfile:** \`package-lock.json -> packages["${lockKey}"]\`
- **Resolved:** \`${resolved}\`
- **Integrity:** \`${integrity}\`
- **Fonte do aviso integral:** \`${lockKey}/LICENSE\` (\`SHA-256: ${licenseSha256}\`).

${TEST_LICENSE}`;
  const sourceNotice = sourceNoticeTransform(`# Admin Motor third-party notices

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
    if (includeLicense) await writeFile(join(root, lockKey, 'LICENSE'), TEST_LICENSE);
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
  const sourceNotice = `# Admin Motor third-party notices

## Inventário efetivo

| Componente | Versão | Licença | Caminho no lockfile |
| --- | --- | --- | --- |
${lockKeys.map((lockKey) => `| \`foo\` | \`${version}\` | \`MIT\` | \`packages["${lockKey}"]\` |`).join('\n')}

## foo ${version} — MIT

${lockMarkers.join('\n')}
- **Resolved:** \`${resolved}\`
- **Integrity:** \`${integrity}\`
${sourceMarkers.join('\n')}

${TEST_LICENSE}
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
    requiredBundledLicenseMarkers: overrides.requiredBundledLicenseMarkers,
    bundledLicenseSupplementHeadings: overrides.bundledLicenseSupplementHeadings,
    requiredWorkerNoticeMarkers: overrides.requiredWorkerNoticeMarkers,
  });
}

test('accepts complete inventories for both manifests', () => {
  expect(() => verify()).not.toThrow();
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
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/visible Integrity field|exactly one/iu);
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
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/exactly one structural Resolved/iu);
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
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/HTML comments|visible contiguous table/iu);
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

test('rejects the HTML comment end-tag variant --!>', async () => {
  await withAdminWorkerFixture(
    {
      packageName: 'alpha',
      version: '1.0.1',
      sourceNoticeTransform: (notice) => `${notice}\n--!>`,
    },
    async (fixture) => {
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/HTML comments/iu);
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
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/visible contiguous table/iu);
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
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/visible contiguous table/iu);
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
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/Inventário efetivo|exact bundled npm artifact/iu);
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
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/Inventário efetivo|exact bundled npm artifact/iu);
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
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/separator is invalid/iu);
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
      await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/exactly one section per.*artifact/iu);
    },
  );
});

test('rejects a shared package section that omits one exact repeated lockfile path', async () => {
  await withRepeatedAdminWorkerFixture({ includeBothLockPaths: false }, async (fixture) => {
    await expect(verifyAdminWorkerBundle(fixture)).rejects.toThrow(/must contain exactly once.*node_modules\/foo/iu);
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
