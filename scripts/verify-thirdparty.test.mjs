import { expect, test } from 'vitest';

import {
  BASE64_ARRAY_BUFFER_MIT_NOTICE,
  verifyNoRemoteGoogleFonts,
  verifySha256,
  verifyThirdPartyInventory,
} from './verify-thirdparty.mjs';

const ALPHA_SRI = `sha512-${Buffer.alloc(64, 1).toString('base64')}`;
const BETA_SRI = `sha512-${Buffer.alloc(64, 2).toString('base64')}`;
const GAMMA_SRI = `sha512-${Buffer.alloc(64, 3).toString('base64')}`;
const LICENSE_BANNER = '/* Third-party licenses: /legal/BUNDLED-LICENSES.md */';

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
    workerArtifact: overrides.workerArtifact,
    requiredStaticNoticeMarkers: overrides.requiredStaticNoticeMarkers,
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
