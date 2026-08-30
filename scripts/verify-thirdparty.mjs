import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { Window } from 'happy-dom';

const ROOT_INVENTORY = 'THIRDPARTY.md';
const ROOT_NOTICE = 'NOTICE';
const PUBLIC_INVENTORY = 'public/legal/THIRDPARTY.md';
const PUBLIC_NOTICE = 'public/legal/NOTICE.txt';
const ARTIFACT_INVENTORY = 'dist/legal/THIRDPARTY.md';
const ARTIFACT_NOTICE = 'dist/legal/NOTICE.txt';
const ARTIFACT_BUNDLED_LICENSES = 'dist/legal/BUNDLED-LICENSES.md';
const WORKER_ARTIFACT = 'tlsrpt-motor/dist/legal-audit/index.js';
const ROOT_HTML = 'index.html';
const JSZIP_BROWSER_DISTRIBUTION = 'node_modules/jszip/dist/jszip.min.js';
const JSZIP_BROWSER_DISTRIBUTION_SHA256 = 'ACC7E41455A80765B5FD9C7EE1B8078A6D160BBBCA455AEAE854DE65C947D59E';
const POSTAL_MIME_BASE64_SOURCE = 'tlsrpt-motor/node_modules/postal-mime/src/base64-encoder.js';
const POSTAL_MIME_BASE64_SOURCE_SHA256 = '71161FF0AB6BEDF58A047D3FC5631B50D5F60655938A418D9F49CAC75BC01251';
const ARTIFACT_LICENSE_BANNER = 'Third-party licenses: /legal/BUNDLED-LICENSES.md';
const GOOGLE_FONTS_HOSTNAMES = Object.freeze(['fonts.googleapis.com', 'fonts.gstatic.com']);
const VITE_SCAFFOLD_ASSETS = Object.freeze([
  Object.freeze({
    path: 'src/assets/hero.png',
    sha256: '72A860570EDDF1DD9988F26C7106C67BE286BC9F2FD3303C465CE87EDB1AE6CD',
  }),
  Object.freeze({
    path: 'src/assets/react.svg',
    sha256: '35EF61ED53B323AE94A16A8EC659B3D0AF3880698791133F23B084085AB1C2E5',
  }),
  Object.freeze({
    path: 'src/assets/vite.svg',
    sha256: '5BE21ACD42EB7B896E517F4E0F0F11EB5C5D9E54FBBCEBE9453F033008FCCA6F',
  }),
]);

export const BASE64_ARRAY_BUFFER_MIT_NOTICE = `MIT LICENSE

Copyright 2011 Jon Leighton

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

export const DINGBAT_TO_UNICODE_BSD_NOTICE = `Copyright (c) Michael Williamson <mike@zwobble.org>

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`;

export const REACT_REMOVE_SCROLL_BAR_MIT_NOTICE = `MIT License

Copyright (c) 2025 Anton Korzunov <thekashey@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

export const VITE_SCAFFOLD_MIT_NOTICE = `MIT License

Copyright (c) 2019-present, VoidZero Inc. and Vite contributors

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

export const MANIFESTS = Object.freeze([
  Object.freeze({
    id: 'root',
    heading: '## Inventário: package.json (raiz)',
    packagePath: 'package.json',
    lockPath: 'package-lock.json',
  }),
  Object.freeze({
    id: 'tlsrpt-motor',
    heading: '## Inventário: tlsrpt-motor/package.json',
    packagePath: 'tlsrpt-motor/package.json',
    lockPath: 'tlsrpt-motor/package-lock.json',
  }),
]);

const TABLE_HEADER = [
  'Escopo',
  'Componente',
  'Versão declarada',
  'Versão resolvida',
  'Licença do pacote',
  'Eleição',
  'Integridade',
  'Origem imutável',
];

// Elections are explicit only where the exact package declares an OR expression.
// They do not rewrite upstream metadata; they record the option used by this project.
export const LICENSE_ELECTIONS = Object.freeze({
  'root:@biomejs/biome': 'MIT',
  'root:@cloudflare/workers-types': 'MIT',
  'root:dompurify': 'Apache-2.0',
  'root:spark-md5': 'MIT',
  'root:wrangler': 'MIT',
  'tlsrpt-motor:@biomejs/biome': 'MIT',
  'tlsrpt-motor:wrangler': 'MIT',
});

export const REQUIRED_STATIC_NOTICE_MARKERS = Object.freeze([
  '### JSZip 3.10.1 — MIT',
  '### Pako 1.0.5 — MIT e Zlib',
  '0f2f1e4d0509514417db83fe5b86bde90e0ffe8d',
  'ACC7E41455A80765B5FD9C7EE1B8078A6D160BBBCA455AEAE854DE65C947D59E',
  'sha512-umumrxStF9I4G8OZlhzEgTlwktjp4bofYq7E0mfH/IM7fctJ1pzLBhVrhNmP86hA1b3RNP5gAzxJJ4mjj0Up6Q==',
  '### Spark MD5 3.0.2 — MIT',
  'SHA-256 `6E7ABBD885F650C938CF377A6EDCAD56C7DCB61DE092853AF6141D806F8C9F04`',
  '### base64ArrayBuffer — MIT',
  '71161FF0AB6BEDF58A047D3FC5631B50D5F60655938A418D9F49CAC75BC01251',
  BASE64_ARRAY_BUFFER_MIT_NOTICE,
  '### dingbat-to-unicode 1.0.1 — BSD-2-Clause',
  'b27f259b49907f99b1b9097abba5a9668106b779',
  DINGBAT_TO_UNICODE_BSD_NOTICE,
  '### react-remove-scroll-bar 2.3.8 — MIT',
  '7301c160fda44cb8cf2b9fdfde61efad35736196',
  REACT_REMOVE_SCROLL_BAR_MIT_NOTICE,
  '### Assets do scaffold create-vite 8.0.0 — MIT',
  'b565af6f1123a62b3058253b2147574b8515e89f',
  '72A860570EDDF1DD9988F26C7106C67BE286BC9F2FD3303C465CE87EDB1AE6CD',
  '35EF61ED53B323AE94A16A8EC659B3D0AF3880698791133F23B084085AB1C2E5',
  '5BE21ACD42EB7B896E517F4E0F0F11EB5C5D9E54FBBCEBE9453F033008FCCA6F',
  VITE_SCAFFOLD_MIT_NOTICE,
]);

export const REQUIRED_BUNDLED_LICENSE_MARKERS = Object.freeze([
  '## jszip - 3.10.1 ((MIT OR GPL-3.0-or-later))',
  '## dingbat-to-unicode - 1.0.1 (BSD-2-Clause)',
  '## react-remove-scroll-bar - 2.3.8 (MIT)',
]);

export const BUNDLED_LICENSE_SUPPLEMENT_HEADINGS = Object.freeze([
  '## dingbat-to-unicode - 1.0.1 (BSD-2-Clause)',
  '## react-remove-scroll-bar - 2.3.8 (MIT)',
]);

export const REQUIRED_WORKER_NOTICE_MARKERS = Object.freeze([BASE64_ARRAY_BUFFER_MIT_NOTICE]);

export function verifySha256(content, expectedSha256, label) {
  const actualSha256 = createHash('sha256').update(content).digest('hex').toUpperCase();
  assert.equal(actualSha256, expectedSha256, `${label} SHA-256 changed; review vendored legal notices`);
}

export function verifyNoRemoteGoogleFonts(html) {
  const window = new Window({
    url: 'https://admin.lcv.dev/',
    settings: {
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
    },
  });

  try {
    window.document.write(html);
    for (const link of window.document.querySelectorAll('link[href]')) {
      const href = link.getAttribute('href');
      assert.ok(href, `${ROOT_HTML} link[href] must contain a valid remote URL or local reference`);

      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        assert.fail(`${ROOT_HTML} link[href] must contain a valid remote URL or local reference`);
      }

      const hostname = url.hostname.toLowerCase().replace(/\.+$/u, '');
      assert.ok(
        !GOOGLE_FONTS_HOSTNAMES.includes(hostname),
        `${ROOT_HTML} must not load mutable Google Fonts resources outside the locked dependency graph`,
      );
    }
  } finally {
    window.close();
  }
}

function normalizeCell(value) {
  return value.trim().replace(/^`|`$/gu, '');
}

function normalizeNotice(value) {
  return value.replace(/\s+/gu, ' ').trim();
}

function assertContainsNotice(content, notice, label) {
  assert.ok(
    normalizeNotice(content).includes(normalizeNotice(notice)),
    `${label} is missing a complete required legal notice`,
  );
}

function parseTable(markdown, heading) {
  const lines = markdown.split(/\r?\n/u);
  const headingIndex = lines.indexOf(heading);
  assert.notEqual(headingIndex, -1, `${heading} is missing from THIRDPARTY`);

  const headerIndex = lines.findIndex(
    (line, index) =>
      index > headingIndex && line.startsWith('|') && normalizeCell(line.split('|')[1] ?? '') === 'Escopo',
  );
  assert.notEqual(headerIndex, -1, `${heading} inventory table is missing`);

  const nextHeadingIndex = lines.findIndex((line, index) => index > headingIndex && line.startsWith('## '));
  assert.ok(
    nextHeadingIndex === -1 || headerIndex < nextHeadingIndex,
    `${heading} inventory table is outside its section`,
  );

  const header = lines[headerIndex].split('|').slice(1, -1).map(normalizeCell);
  assert.deepEqual(header, TABLE_HEADER, `${heading} inventory header changed`);

  const records = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith('|')) break;
    const cells = line.split('|').slice(1, -1).map(normalizeCell);
    assert.equal(cells.length, TABLE_HEADER.length, `invalid THIRDPARTY row: ${line}`);
    records.push({
      scope: cells[0],
      name: cells[1],
      declaredVersion: cells[2],
      resolvedVersion: cells[3],
      license: cells[4],
      election: cells[5],
      integrity: cells[6],
      origin: cells[7],
    });
  }
  return records;
}

function parseBundledLicenseSections(markdown) {
  const matches = [...markdown.matchAll(/^## (.+)\r?$/gmu)];
  assert.ok(matches.length > 0, `${ARTIFACT_BUNDLED_LICENSES} has no dependency sections`);

  const sections = new Map();
  for (const [index, match] of matches.entries()) {
    const heading = `## ${match[1]}`;
    assert.ok(!sections.has(heading), `${ARTIFACT_BUNDLED_LICENSES} repeats ${heading}`);
    const bodyStart = match.index + match[0].length;
    const bodyEnd = matches[index + 1]?.index ?? markdown.length;
    sections.set(heading, markdown.slice(bodyStart, bodyEnd).trim());
  }
  return sections;
}

function licenseChoices(expression) {
  return expression
    .replaceAll('(', '')
    .replaceAll(')', '')
    .split(/\s+OR\s+/u)
    .map((choice) => choice.trim());
}

function assertImmutableRegistryProvenance(label, packageName, lockEntry) {
  for (const field of ['version', 'license', 'resolved', 'integrity']) {
    assert.equal(typeof lockEntry[field], 'string', `${label} lacks lockfile ${field}`);
    assert.ok(lockEntry[field].trim(), `${label} has an empty lockfile ${field}`);
  }

  const source = new URL(lockEntry.resolved);
  assert.equal(source.protocol, 'https:', `${label} source must use HTTPS`);
  assert.equal(
    source.origin,
    'https://registry.npmjs.org',
    `${label} source must be the canonical npm registry origin`,
  );
  assert.equal(source.username, '', `${label} source must not contain credentials`);
  assert.equal(source.password, '', `${label} source must not contain credentials`);
  assert.equal(source.search, '', `${label} source must not contain a query`);
  assert.equal(source.hash, '', `${label} source must not contain a fragment`);

  const packageBasename = packageName.split('/').at(-1);
  const expectedPath = `/${packageName}/-/${packageBasename}-${lockEntry.version}.tgz`;
  assert.equal(
    decodeURIComponent(source.pathname),
    expectedPath,
    `${label} source must match its exact package name and resolved version`,
  );

  const integrityMatch = /^sha512-([A-Za-z0-9+/]+={0,2})$/u.exec(lockEntry.integrity);
  assert.ok(integrityMatch, `${label} lacks one canonical sha512 SRI`);
  const digest = Buffer.from(integrityMatch[1], 'base64');
  assert.equal(digest.length, 64, `${label} sha512 SRI must decode to 64 bytes`);
  assert.equal(digest.toString('base64'), integrityMatch[1], `${label} sha512 SRI must use canonical base64`);
}

function expectedRecords(manifest) {
  const records = [];
  const groups = [
    ['runtime', manifest.packageJson.dependencies ?? {}],
    ['development', manifest.packageJson.devDependencies ?? {}],
  ];

  for (const [scope, dependencies] of groups) {
    for (const [name, declaredVersion] of Object.entries(dependencies).sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const lockEntry = manifest.packageLock.packages?.[`node_modules/${name}`];
      assert.ok(lockEntry, `${manifest.id}:${name} is missing from ${manifest.lockPath}`);
      assertImmutableRegistryProvenance(`${manifest.id}:${name}`, name, lockEntry);

      const choices = licenseChoices(lockEntry.license);
      const election = LICENSE_ELECTIONS[`${manifest.id}:${name}`];
      if (choices.length > 1) {
        assert.ok(election, `${manifest.id}:${name} requires an explicit license election`);
        assert.ok(
          choices.includes(election),
          `${manifest.id}:${name} election ${election} is outside ${lockEntry.license}`,
        );
      } else {
        assert.equal(election, undefined, `${manifest.id}:${name} has an unnecessary election`);
      }

      records.push({
        scope,
        name,
        declaredVersion,
        resolvedVersion: lockEntry.version,
        license: lockEntry.license,
        election: election ?? '—',
        integrity: lockEntry.integrity,
        origin: lockEntry.resolved,
      });
    }
  }
  return records;
}

export function verifyThirdPartyInventory({
  manifests,
  rootInventory,
  rootNotice,
  publicInventory,
  publicNotice,
  artifactInventory,
  artifactNotice,
  artifactBundledLicenses,
  artifactJavaScript,
  workerArtifact,
  requiredStaticNoticeMarkers = [],
  requiredBundledLicenseMarkers = [],
  bundledLicenseSupplementHeadings = [],
  requiredWorkerNoticeMarkers = [],
}) {
  assert.equal(publicInventory, rootInventory, `${ROOT_INVENTORY} and ${PUBLIC_INVENTORY} must be byte-identical`);
  assert.equal(rootNotice, publicNotice, `${ROOT_NOTICE} and ${PUBLIC_NOTICE} must be byte-identical`);

  for (const marker of requiredStaticNoticeMarkers) {
    assertContainsNotice(rootInventory, marker, 'THIRDPARTY');
  }

  for (const manifest of manifests) {
    const actual = parseTable(rootInventory, manifest.heading);
    const expected = expectedRecords(manifest);
    assert.deepEqual(
      actual,
      expected,
      `${manifest.id} inventory must equal every direct manifest dependency and exact lockfile provenance`,
    );
  }

  if (
    artifactInventory !== undefined ||
    artifactNotice !== undefined ||
    artifactBundledLicenses !== undefined ||
    artifactJavaScript !== undefined
  ) {
    assert.equal(
      artifactInventory,
      publicInventory,
      `${ARTIFACT_INVENTORY} must be byte-identical to ${PUBLIC_INVENTORY}`,
    );
    assert.equal(artifactNotice, publicNotice, `${ARTIFACT_NOTICE} must be byte-identical to ${PUBLIC_NOTICE}`);
    assert.equal(
      typeof artifactBundledLicenses,
      'string',
      `${ARTIFACT_BUNDLED_LICENSES} must be emitted by Vite build.license`,
    );
    assert.match(
      artifactBundledLicenses,
      /^# Licenses\r?\n/u,
      `${ARTIFACT_BUNDLED_LICENSES} must be Vite's native license inventory`,
    );
    const bundledSections = parseBundledLicenseSections(artifactBundledLicenses);
    for (const marker of requiredBundledLicenseMarkers) {
      assert.ok(
        artifactBundledLicenses.includes(marker),
        `${ARTIFACT_BUNDLED_LICENSES} is missing bundled dependency notice: ${marker}`,
      );
    }
    const supplementHeadings = new Set(bundledLicenseSupplementHeadings);
    for (const [heading, body] of bundledSections) {
      assert.ok(
        body || supplementHeadings.has(heading),
        `${ARTIFACT_BUNDLED_LICENSES} has an empty unsupplemented section: ${heading}`,
      );
    }

    assert.ok(
      Array.isArray(artifactJavaScript) && artifactJavaScript.length > 0,
      'Vite build must emit at least one JavaScript artifact',
    );
    for (const artifact of artifactJavaScript) {
      assert.equal(typeof artifact.path, 'string', 'Vite JavaScript artifact path is missing');
      assert.equal(typeof artifact.content, 'string', `${artifact.path} content is missing`);
      assert.ok(
        artifact.content.includes(ARTIFACT_LICENSE_BANNER),
        `${artifact.path} is missing the bundled-license banner`,
      );
    }
  }

  if (workerArtifact !== undefined) {
    assert.equal(typeof workerArtifact, 'string', `${WORKER_ARTIFACT} must be emitted by Wrangler`);
    for (const marker of requiredWorkerNoticeMarkers) {
      assertContainsNotice(workerArtifact, marker, WORKER_ARTIFACT);
    }
  }
}

async function loadManifest(root, config) {
  const [packageJson, packageLock] = await Promise.all([
    readFile(resolve(root, config.packagePath), 'utf8').then(JSON.parse),
    readFile(resolve(root, config.lockPath), 'utf8').then(JSON.parse),
  ]);
  return { ...config, packageJson, packageLock };
}

async function loadJavaScriptArtifacts(root, directory = resolve(root, 'dist/assets')) {
  const artifacts = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      artifacts.push(...(await loadJavaScriptArtifacts(root, entryPath)));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      artifacts.push({
        path: relative(root, entryPath).replaceAll('\\', '/'),
        content: await readFile(entryPath, 'utf8'),
      });
    }
  }
  return artifacts;
}

async function main() {
  const root = process.cwd();
  const artifactMode = process.argv.includes('--artifact');
  const workerArtifactMode = process.argv.includes('--worker-artifact');
  const [
    manifests,
    rootInventory,
    rootNotice,
    publicInventory,
    publicNotice,
    rootHtml,
    jszipBrowserDistribution,
    postalMimeBase64Source,
    viteScaffoldAssets,
  ] = await Promise.all([
    Promise.all(MANIFESTS.map((config) => loadManifest(root, config))),
    readFile(resolve(root, ROOT_INVENTORY), 'utf8'),
    readFile(resolve(root, ROOT_NOTICE), 'utf8'),
    readFile(resolve(root, PUBLIC_INVENTORY), 'utf8'),
    readFile(resolve(root, PUBLIC_NOTICE), 'utf8'),
    readFile(resolve(root, ROOT_HTML), 'utf8'),
    readFile(resolve(root, JSZIP_BROWSER_DISTRIBUTION)),
    readFile(resolve(root, POSTAL_MIME_BASE64_SOURCE)),
    Promise.all(VITE_SCAFFOLD_ASSETS.map(({ path }) => readFile(resolve(root, path)))),
  ]);

  verifyNoRemoteGoogleFonts(rootHtml);
  verifySha256(jszipBrowserDistribution, JSZIP_BROWSER_DISTRIBUTION_SHA256, JSZIP_BROWSER_DISTRIBUTION);
  verifySha256(postalMimeBase64Source, POSTAL_MIME_BASE64_SOURCE_SHA256, POSTAL_MIME_BASE64_SOURCE);
  for (const [index, asset] of VITE_SCAFFOLD_ASSETS.entries()) {
    verifySha256(viteScaffoldAssets[index], asset.sha256, asset.path);
  }

  const [artifactInventory, artifactNotice, artifactBundledLicenses, artifactJavaScript] = artifactMode
    ? await Promise.all([
        readFile(resolve(root, ARTIFACT_INVENTORY), 'utf8'),
        readFile(resolve(root, ARTIFACT_NOTICE), 'utf8'),
        readFile(resolve(root, ARTIFACT_BUNDLED_LICENSES), 'utf8'),
        loadJavaScriptArtifacts(root),
      ])
    : [undefined, undefined, undefined, undefined];
  const workerArtifact = workerArtifactMode ? await readFile(resolve(root, WORKER_ARTIFACT), 'utf8') : undefined;

  verifyThirdPartyInventory({
    manifests,
    rootInventory,
    rootNotice,
    publicInventory,
    publicNotice,
    artifactInventory,
    artifactNotice,
    artifactBundledLicenses,
    artifactJavaScript,
    workerArtifact,
    requiredStaticNoticeMarkers: REQUIRED_STATIC_NOTICE_MARKERS,
    requiredBundledLicenseMarkers: REQUIRED_BUNDLED_LICENSE_MARKERS,
    bundledLicenseSupplementHeadings: BUNDLED_LICENSE_SUPPLEMENT_HEADINGS,
    requiredWorkerNoticeMarkers: REQUIRED_WORKER_NOTICE_MARKERS,
  });
  const verifiedTargets = [
    'direct dependency inventory and public legal copies',
    artifactMode ? 'Vite legal artifact' : undefined,
    workerArtifactMode ? 'Wrangler Worker legal notice' : undefined,
  ].filter(Boolean);
  console.log(`${verifiedTargets.join(', ')} are current.`);
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (entryPoint === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
