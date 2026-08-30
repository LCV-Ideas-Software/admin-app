import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { Window } from 'happy-dom';
import { transform } from 'lightningcss';
import { marked } from 'marked';

const ROOT_INVENTORY = 'THIRDPARTY.md';
const ROOT_NOTICE = 'NOTICE';
const PUBLIC_INVENTORY = 'public/legal/THIRDPARTY.md';
const PUBLIC_NOTICE = 'public/legal/NOTICE.txt';
const ARTIFACT_INVENTORY = 'dist/legal/THIRDPARTY.md';
const ARTIFACT_NOTICE = 'dist/legal/NOTICE.txt';
const ARTIFACT_BUNDLED_LICENSES = 'dist/legal/BUNDLED-LICENSES.md';
const TLSRPT_WORKER_ARTIFACT = 'tlsrpt-motor/dist/legal-audit/index.js';
const ADMIN_WORKER_OUTDIR = 'admin-motor/dist/legal-audit';
const ADMIN_WORKER_METAFILE = `${ADMIN_WORKER_OUTDIR}/bundle-meta.json`;
const ADMIN_WORKER_NOTICE_SOURCE = 'admin-motor/src/legal/THIRDPARTY.md';
const ADMIN_WORKER_NOTICE_ARTIFACT = `${ADMIN_WORKER_OUTDIR}/legal/THIRDPARTY.md`;
const ADMIN_WORKER_TITLE = '# Avisos de componentes de terceiros — Admin Motor';
const ADMIN_WORKER_INVENTORY_HEADER = Object.freeze([
  'Componente',
  'Versão',
  'Licença',
  'Caminho no lockfile',
]);
const LAUNDER_AUDITED_ARTIFACT = Object.freeze({
  version: '1.7.1',
  license: 'MIT',
  resolved: 'https://registry.npmjs.org/launder/-/launder-1.7.1.tgz',
  integrity:
    'sha512-mU6WRz5EusL9ZZuiZ5SO4Y6C0P9PAUR9iwdb6bzj4KDihm28DiHFw+/yk9DBH4f+Pv1wuzQ4e2jV3oQ7mkIqvw==',
  packageJsonSha256: 'b111ad703bae61d8cef17863c38f4618e813b24284a874d0b81db1b5cfbdf601',
  upstreamCommit: 'e9b0ab0849a5dfea0f75335fbdf99b5c6bf9e4b3',
});
const LAUNDER_DISCLOSURE =
  'O pacote npm e a tag upstream `launder@1.7.1` declaram `MIT`, mas o pacote/tarball dessa versão não traz arquivo `LICENSE`. Por isso, os termos canônicos da MIT são reproduzidos abaixo sem inventar titular, ano ou aviso de copyright ausente no upstream.';
const MARKED_DISCLOSURE =
  'O `LICENSE` de Marked contém tanto os termos MIT de Marked quanto o aviso BSD-3-Clause integral do componente Markdown incorporado; ambos seguem reproduzidos sem redução.';
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

export const PAKO_MIT_NOTICE = `(The MIT License)

Copyright (C) 2014-2017 by Vitaly Puzrin and Andrei Tuputcyn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.`;

export const PAKO_ZLIB_NOTICE = `Copyright (C) 1995-2013 Jean-loup Gailly and Mark Adler
Copyright (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin

This software is provided 'as-is', without any express or implied warranty.
In no event will the authors be held liable for any damages arising from the
use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

1. The origin of this software must not be misrepresented; you must not claim
   that you wrote the original software. If you use this software in a
   product, an acknowledgment in the product documentation would be
   appreciated but is not required.
2. Altered source versions must be plainly marked as such, and must not be
   misrepresented as being the original software.
3. This notice may not be removed or altered from any source distribution.`;

export const SPARK_MD5_MIT_NOTICE = `Copyright (c) 2015 André Cruz <amdfcruz@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const LAUNDER_MIT_TERMS = `Permission is hereby granted, free of charge, to any person obtaining a copy
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

export const REQUIRED_STATIC_NOTICE_SECTIONS = Object.freeze([
  Object.freeze({
    heading: '### Pako 1.0.5 — MIT e Zlib',
    notices: Object.freeze([PAKO_MIT_NOTICE, PAKO_ZLIB_NOTICE]),
  }),
  Object.freeze({
    heading: '### Spark MD5 3.0.2 — MIT',
    notices: Object.freeze([SPARK_MD5_MIT_NOTICE]),
  }),
]);

const ROOT_DOCUMENT_SCHEMA = (() => {
  const paragraphDigests = Object.freeze([
    '9bab20a62df1c95df7c4f41826b2043f57d13086b6fcb7dab7f7649dd57454a6',
    '6368032d6cd1fb14fe34fb4303e56e053ccd824b296f84be0bd56c7d53e6d48e',
    'f9217459944bc8d30a7083bbfe7ebfc051ea7e51429ea5f8642912ea6767ac93',
    'f7ebc7c3f34069daf29f96bd17b27f0dda176a756ebc29258094b232ecea96d2',
    'a287ef08363a2f9aa3e339cc54d4b02c97439f9cdb53e28d51daffd8f753eed5',
    '2bd045c34c582095d72e33a3184ae3fa04aa13509b23d8161a36293abe6d468d',
    '8aa9b4d5a20a0091628c62615c6dedf028cea06c539b1c397b140fb49771089c',
    '6681f9df11fce09360a300b0d5b789ffdfbc9e476e8c051986f426fa421827d2',
    '608e94a2b431b884dee76f739b85d4eaf3524cd74e20d00d316b0bafb575315e',
    'e348e036ff14139783bd38220796591680b3db555e0c79f42ce23d91c9668fdd',
    '44abe5998af13e517b197c592319e87e5ca4056947fe1886e56771d5058bcb09',
    'e56a8cc6060745bdc403b9a66aa93983327e523612623698f3de6a36b8a158c3',
  ]);
  const codeBlockDigests = Object.freeze([
    '8a3c2abaecf6a5d4af7b06f564727babf141aa3b1708ad399d2e9cffeb9c4692',
    'e824161e0aab3814aca1883bd7058e67034d25fce254e6629495e78d3f8a53c3',
    'f2c7bd8d9e43896c730ad9e095cc9b861c5aa8741119fb7237666ef03c21b608',
    'ededb65e4fd8561af59d0ec209a3dd4012a458e8364e532ce320181757c9f4b6',
    'dc0711f67148ef151102483996a3caa360c0aef631ba2562afed140ab9742daf',
    'ceedc02ca6ecc228bec601367e8d3905331c33cd74f7131d4d45ad2562d23bb4',
    'ac22553a5f529c8bca6305b6f445de70b384d922dc0560a6ad86c662bb9cad3e',
    'f57e3a2cabf2b43ab2fc942a8e9f4b38366ab0d1f859c6439b1fb69e80d9af73',
    'f4bb8f655fdb4d119878a0eea6dfcb871da509d83baa7426794f7c70b9bb9d46',
    '5d72d08481a4760883a0242accc9cd076c78775e1735ccfdec443b3eae80d288',
    '4cc9c2af4eb0056cd4d2297b7404819e3816b4c44b7f8012c42d5fd671d783d3',
    '7f7a686a9e08517613587583611772c18a60ca99dabfabd96641d9ac210d0c7d',
  ]);
  const staticTableDigests = Object.freeze([
    '811c781139c97acd137093850a7817293769002be642fc03823c1062df88b7ca',
    '0cbd8ef384944e9223fdcf1acb98df4412c2fd6cbc6e322854bfa86201f5c1df',
  ]);
  const paragraph = (index) => ({ type: 'paragraph', digest: paragraphDigests[index] });
  const code = (index) => ({ type: 'code', digest: codeBlockDigests[index] });
  const sections = Object.freeze([
    { heading: '# Inventário de componentes de terceiros', tokens: [paragraph(0), paragraph(1)] },
    { heading: MANIFESTS[0].heading, tokens: [{ type: 'table' }] },
    { heading: MANIFESTS[1].heading, tokens: [{ type: 'table' }] },
    {
      heading: '## Componente incorporado ao Worker TLS-RPT',
      tokens: [paragraph(2), { type: 'table', digest: staticTableDigests[0] }],
    },
    { heading: '### base64ArrayBuffer — MIT', tokens: [code(0)] },
    {
      heading: '## Complementos para componentes incorporados ao bundle',
      tokens: [paragraph(3), { type: 'table', digest: staticTableDigests[1] }],
    },
    { heading: '### Assets do scaffold create-vite 8.0.0 — MIT', tokens: [paragraph(4), code(1)] },
    { heading: '### JSZip 3.10.1 — MIT', tokens: [paragraph(5)] },
    { heading: '### Pako 1.0.5 — MIT e Zlib', tokens: [paragraph(6), code(2)] },
    { heading: '### Spark MD5 3.0.2 — MIT', tokens: [paragraph(7), code(3)] },
    { heading: '### dingbat-to-unicode 1.0.1 — BSD-2-Clause', tokens: [paragraph(8), code(4)] },
    { heading: '### react-remove-scroll-bar 2.3.8 — MIT', tokens: [paragraph(9), code(5)] },
    { heading: '## Cartografia local e dados Natural Earth', tokens: [paragraph(10), paragraph(11)] },
    { heading: '## Avisos de licenças da cartografia', tokens: [] },
    { heading: '### d3-geo 3.1.1 — ISC e GeographicLib — MIT', tokens: [code(6)] },
    { heading: '### d3-array 3.2.4 — ISC', tokens: [code(7)] },
    { heading: '### internmap 2.0.3 — ISC', tokens: [code(8)] },
    { heading: '### topojson-client 3.1.0 — ISC', tokens: [code(9)] },
    { heading: '### commander 2.20.3 — MIT', tokens: [code(10)] },
    { heading: '### world-atlas 2.0.2 — ISC', tokens: [code(11)] },
  ]);
  return Object.freeze({
    title: sections[0].heading,
    headings: Object.freeze(sections.slice(1).map(({ heading }) => heading)),
    paragraphCount: paragraphDigests.length,
    tableCount: MANIFESTS.length + staticTableDigests.length,
    codeBlockCount: codeBlockDigests.length,
    dynamicTableCount: MANIFESTS.length,
    paragraphDigests,
    codeBlockDigests,
    staticTableDigests,
    sections,
  });
})();

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

function verifyNoGoogleFontsUrl(value, baseUrl, label) {
  let url;
  try {
    url = new URL(value, baseUrl);
  } catch {
    assert.fail(`${label} must contain a valid remote URL or local reference`);
  }

  const hostname = url.hostname.toLowerCase().replace(/\.+$/u, '');
  assert.ok(
    !GOOGLE_FONTS_HOSTNAMES.includes(hostname),
    `${label} must not load mutable Google Fonts resources outside the locked dependency graph`,
  );
}

export function verifyNoRemoteGoogleFontsInCss(
  css,
  label = 'CSS artifact',
  baseUrl = 'https://admin.lcv.dev/',
) {
  let dependencies;
  try {
    ({ dependencies = [] } = transform({
      filename: label,
      code: Buffer.from(css),
      analyzeDependencies: true,
      minify: false,
    }));
  } catch (error) {
    assert.fail(`${label} must be valid CSS: ${error.message}`);
  }

  for (const dependency of dependencies) {
    verifyNoGoogleFontsUrl(dependency.url, baseUrl, `${label} resource URL`);
  }
}

export function verifyNoRemoteGoogleFonts(html, label = ROOT_HTML) {
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
    window.document.open();
    window.document.write(html);
    window.document.close();
    const baseUrl = window.document.baseURI;

    for (const link of window.document.querySelectorAll('link[href]')) {
      const href = link.getAttribute('href');
      assert.ok(href, `${label} link[href] must contain a valid remote URL or local reference`);
      verifyNoGoogleFontsUrl(href, baseUrl, `${label} link[href]`);
    }

    for (const [index, style] of [...window.document.querySelectorAll('style')].entries()) {
      verifyNoRemoteGoogleFontsInCss(style.textContent ?? '', `${label} style[${index}]`, baseUrl);
    }

    for (const [index, element] of [...window.document.querySelectorAll('[style]')].entries()) {
      const declaration = element.getAttribute('style');
      assert.notEqual(declaration, null, `${label} style attribute is missing`);
      verifyNoRemoteGoogleFontsInCss(
        `:root { ${declaration} }`,
        `${label} style-attribute[${index}]`,
        baseUrl,
      );
    }
  } finally {
    window.close();
  }
}

function normalizeCell(value) {
  return value.trim().replace(/^`|`$/gu, '');
}

const INVISIBLE_CONTROL_PATTERN =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;

function assertNoInvisibleControls(value, label = 'visible legal evidence') {
  assert.equal(
    INVISIBLE_CONTROL_PATTERN.test(value),
    false,
    `${label} must not contain invisible Unicode control characters`,
  );
}

function normalizeNotice(value) {
  return value.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

function normalizeLegalText(value) {
  return value.replace(/\r\n/gu, '\n').replace(/\n+$/u, '');
}

function normalizeEmbeddedLegalText(value) {
  return normalizeLegalText(value)
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
}

function normalizedSha256(value, normalizer) {
  return createHash('sha256').update(normalizer(value)).digest('hex');
}

function markdownTableDigest(table) {
  const rows = [table.header, ...table.rows].map((row) =>
    row.map((cell) => normalizeNotice(cell.text)),
  );
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

function structuralTokenDigest(token) {
  if (token.type === 'paragraph') return normalizedSha256(token.text, normalizeNotice);
  if (token.type === 'code') return normalizedSha256(token.text, normalizeLegalText);
  if (token.type === 'table') return markdownTableDigest(token);
  return undefined;
}

function normalizeStructuralIdentifier(value) {
  return value
    .replace(/\p{Default_Ignorable_Code_Point}+/gu, '')
    .normalize('NFKC')
    .replace(/\s+/gu, ' ')
    .replace(/\s*:\s*/gu, ':')
    .toLowerCase()
    .trim();
}

function assertContainsNotice(content, notice, label) {
  assert.ok(
    normalizeNotice(content).includes(normalizeNotice(notice)),
    `${label} is missing a complete required legal notice`,
  );
}

function markdownTokenChildren(token) {
  if (token.type === 'list') return token.items.flatMap((item) => item.tokens ?? []);
  if (token.type === 'table') {
    return [...token.header, ...token.rows.flat()].flatMap((cell) => cell.tokens ?? []);
  }
  return Array.isArray(token.tokens) ? token.tokens : [];
}

function markdownTokensMatching(tokens, predicate) {
  const matches = [];
  for (const token of tokens) {
    if (predicate(token)) matches.push(token);
    matches.push(...markdownTokensMatching(markdownTokenChildren(token), predicate));
  }
  return matches;
}

function renderedMarkdownText(markdown) {
  return withRenderedMarkdown(markdown, (document) => document.body.textContent ?? '');
}

function assertContainsMarkdownNotice(markdown, notice, label) {
  assertContainsNotice(renderedMarkdownText(markdown), notice, label);
}

function assertContainsRenderedMarkdown(markdown, expectedMarkdown, label) {
  const actualText = renderedMarkdownText(markdown);
  const expectedText = expectedMarkdown.replace(/`([^`\r\n]+)`/gu, '$1');
  assertContainsNotice(actualText, expectedText, label);
}

function assertVisibleMarkdownEvidence(markdown, label) {
  assertNoInvisibleControls(markdown, `${label} visible legal evidence`);
  assert.equal(
    /\p{Bidi_Control}/u.test(markdown),
    false,
    `${label} visible legal evidence must not contain Unicode bidirectional controls`,
  );
  assert.equal(
    markdownTokensMatching(marked.lexer(markdown, { gfm: true }), (token) => token.type === 'html')
      .length,
    0,
    `${label} must not contain raw HTML; visible structural inventory and legal evidence must remain auditable`,
  );
  const rendered = withRenderedMarkdown(markdown, (document) => ({
    deletedElementCount: document.querySelectorAll('del').length,
    text: document.body.textContent ?? '',
  }));
  assert.equal(
    /\p{Bidi_Control}/u.test(rendered.text),
    false,
    `${label} visible legal evidence must not contain encoded Unicode bidirectional controls`,
  );
  assertNoInvisibleControls(rendered.text, `${label} rendered visible legal evidence`);
  assert.equal(
    rendered.deletedElementCount,
    0,
    `${label} visible legal evidence must not contain struck-through Markdown`,
  );
}

const markdownWindow = new Window({
  url: 'https://legal.local.invalid/',
  settings: {
    disableCSSFileLoading: true,
    disableIframePageLoading: true,
    disableJavaScriptEvaluation: true,
    disableJavaScriptFileLoading: true,
  },
});

function withRenderedMarkdown(markdown, callback) {
  const html = marked.parse(markdown, { gfm: true });
  assert.equal(typeof html, 'string', 'GFM rendering must be synchronous');
  const document = markdownWindow.document;
  try {
    document.body.innerHTML = html;
    return callback(document);
  } finally {
    document.body.replaceChildren();
  }
}

function renderedListItemRecords(markdown) {
  return withRenderedMarkdown(markdown, (document) =>
    [...document.querySelectorAll('li')].map((item) => ({
      html: item.innerHTML,
      topLevel:
        (item.parentElement?.tagName === 'UL' || item.parentElement?.tagName === 'OL') &&
        item.parentElement?.parentElement === document.body,
    })),
  );
}

function renderedExpectedListItem(expectedLine, label) {
  const records = renderedListItemRecords(expectedLine);
  assert.equal(records.length, 1, `${label} expected list item is invalid: ${expectedLine}`);
  assert.equal(records[0].topLevel, true, `${label} expected list item must be top-level`);
  return records[0].html;
}

function assertExactMarkdownLine(content, expectedLine, label) {
  const expectedHtml = renderedExpectedListItem(expectedLine, label);
  const occurrences = renderedListItemRecords(content).filter(
    ({ html, topLevel }) => topLevel && html === expectedHtml,
  ).length;
  assert.equal(
    occurrences,
    1,
    `${label} must contain exactly one structural visible list item: ${expectedLine}`,
  );
}

function assertExactMarkdownField(content, field, expectedLine, label) {
  assertExactMarkdownLine(content, expectedLine, `${label} ${field} field`);
}

function adminWorkerPreamble(packageCount) {
  return [
    `Este arquivo acompanha o Worker \`admin-motor\` como módulo adicional do tipo \`Text\`. O inventário cobre exatamente os ${packageCount} pacotes npm com código efetivamente incorporado ao bundle Wrangler informado para este artefato. Pacotes de desenvolvimento, ferramentas externas e entradas desabilitadas de zero byte não pertencem a este escopo.`,
    'Versão, licença declarada, URL `resolved` e SRI `integrity` foram conferidos na entrada `packages` de `package-lock.json`; o texto de cada aviso foi reproduzido integralmente do pacote da mesma versão instalado em `node_modules`. O caminho e o SHA-256 de cada fonte permitem verificar o texto sem confundi-lo com outra versão homônima.',
  ];
}

function expectedAdminSectionProse(packageName) {
  if (packageName === 'launder') return [LAUNDER_DISCLOSURE];
  if (packageName === 'marked') return [MARKED_DISCLOSURE];
  return [];
}

function assertAdminSectionStructure(
  markdown,
  expectedMetadataItems,
  expectedProse,
  expectedLegalText,
  label,
) {
  const tokens = marked.lexer(markdown, { gfm: true });
  const topLevelLists = tokens.filter((token) => token.type === 'list');
  const allLists = markdownTokensMatching(tokens, (token) => token.type === 'list');
  assert.equal(topLevelLists.length, 1, `${label} must contain exactly one top-level metadata list`);
  assert.equal(allLists.length, 1, `${label} must not contain nested or additional metadata lists`);
  assert.equal(topLevelLists[0].ordered, false, `${label} metadata must use one unordered list`);
  assert.equal(
    topLevelLists[0].items.length,
    expectedMetadataItems,
    `${label} metadata list must contain exactly ${expectedMetadataItems} canonical list items`,
  );

  const structuralTokens = tokens.filter((token) => token.type !== 'space');
  const expectedTypes = [
    'list',
    ...expectedProse.map(() => 'paragraph'),
    'code',
  ];
  assert.deepEqual(
    structuralTokens.map((token) => token.type),
    expectedTypes,
    `${label} must be one closed section: metadata, canonical prose when required, and one fenced legal-text block`,
  );

  const actualProse = structuralTokens
    .filter((token) => token.type === 'paragraph')
    .map((token) => normalizeNotice(token.text));
  assert.deepEqual(
    actualProse,
    expectedProse.map(normalizeNotice),
    `${label} must contain exactly its canonical prose`,
  );

  const codeBlocks = structuralTokens.filter((token) => token.type === 'code');
  assert.equal(codeBlocks.length, 1, `${label} must contain exactly one fenced legal-text block`);
  assert.equal(codeBlocks[0].lang, 'text', `${label} legal-text block must use the text info string`);
  assert.equal(
    normalizeEmbeddedLegalText(codeBlocks[0].text),
    normalizeEmbeddedLegalText(expectedLegalText),
    `${label} fenced legal text must equal its exact audited source after line-ending and trailing-whitespace normalization`,
  );
}

function parseExpectedHeading(heading, label) {
  const match = /^(#+)\s+(.+)$/u.exec(heading);
  assert.ok(match, `${label} expected heading is invalid: ${heading}`);
  return { depth: match[1].length, text: match[2].trim() };
}

function markdownHeadingRecords(markdown) {
  const tokens = marked.lexer(markdown, { gfm: true });
  const headings = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.type === 'heading')
    .map(({ token, index }) => ({
      heading: `${'#'.repeat(token.depth)} ${token.text.trim()}`,
      index,
      level: token.depth,
    }));
  return { headings, tokens };
}

function assertClosedMarkdownDocument(markdown, schema, label) {
  const tokens = marked.lexer(markdown, { gfm: true });
  const allowedTypes = new Set(['heading', 'space', 'paragraph', 'table', 'code']);
  const unexpectedTypes = [
    ...new Set(tokens.filter((token) => !allowedTypes.has(token.type)).map((token) => token.type)),
  ];
  assert.deepEqual(
    unexpectedTypes,
    [],
    `${label} closed document contains unexpected top-level Markdown structures`,
  );

  const headings = tokens
    .filter((token) => token.type === 'heading')
    .map((token) => `${'#'.repeat(token.depth)} ${token.text.trim()}`);
  assert.deepEqual(
    headings,
    [schema.title, ...schema.headings],
    `${label} closed document heading outline must remain exact and canonical`,
  );

  const paragraphs = tokens.filter((token) => token.type === 'paragraph');
  const tables = tokens.filter((token) => token.type === 'table');
  const codeBlocks = tokens.filter((token) => token.type === 'code');
  assert.equal(
    paragraphs.length,
    schema.paragraphCount,
    `${label} closed document paragraph count changed`,
  );
  assert.equal(
    tables.length,
    schema.tableCount,
    `${label} closed document must contain exactly ${schema.tableCount} visible Markdown tables`,
  );
  assert.equal(
    codeBlocks.length,
    schema.codeBlockCount,
    `${label} closed document legal-text block count changed`,
  );
  assert.equal(
    codeBlocks.every((token) => token.lang === 'text'),
    true,
    `${label} closed document legal-text blocks must use the text info string`,
  );

  if (schema.paragraphDigests) {
    assert.deepEqual(
      paragraphs.map((token) => normalizedSha256(token.text, normalizeNotice)),
      schema.paragraphDigests,
      `${label} closed document explanatory legal prose changed`,
    );
  }
  if (schema.codeBlockDigests) {
    assert.deepEqual(
      codeBlocks.map((token) => normalizedSha256(token.text, normalizeLegalText)),
      schema.codeBlockDigests,
      `${label} closed document audited legal text changed`,
    );
  }
  if (schema.staticTableDigests) {
    assert.deepEqual(
      tables.slice(schema.dynamicTableCount ?? 0).map(markdownTableDigest),
      schema.staticTableDigests,
      `${label} closed document static legal tables changed`,
    );
  }
  if (schema.sections) {
    const actualSections = [];
    for (const token of tokens) {
      if (token.type === 'heading') {
        actualSections.push({
          heading: `${'#'.repeat(token.depth)} ${token.text.trim()}`,
          tokens: [],
        });
      } else if (token.type !== 'space') {
        assert.ok(actualSections.length > 0, `${label} content appears before its canonical title`);
        actualSections.at(-1).tokens.push({
          type: token.type,
          digest: structuralTokenDigest(token),
        });
      }
    }

    assert.equal(
      actualSections.length,
      schema.sections.length,
      `${label} closed document section count changed`,
    );
    for (const [index, expectedSection] of schema.sections.entries()) {
      const actualSection = actualSections[index];
      assert.equal(
        actualSection.heading,
        expectedSection.heading,
        `${label} closed document section order changed`,
      );
      assert.deepEqual(
        actualSection.tokens.map(({ type }) => type),
        expectedSection.tokens.map(({ type }) => type),
        `${label} ${expectedSection.heading} section content types changed`,
      );
      for (const [tokenIndex, expectedToken] of expectedSection.tokens.entries()) {
        if (!expectedToken.digest) continue;
        assert.equal(
          actualSection.tokens[tokenIndex].digest,
          expectedToken.digest,
          `${label} ${expectedSection.heading} section content changed or was assigned to another section`,
        );
      }
    }
  }
}

function assertAdminDocumentStructure(markdown, expectedSectionHeadings, packageCount) {
  const tokens = marked.lexer(markdown, { gfm: true });
  const allowedTypes = new Set(['heading', 'space', 'paragraph', 'table', 'list', 'code']);
  const unexpectedTypes = [
    ...new Set(tokens.filter((token) => !allowedTypes.has(token.type)).map((token) => token.type)),
  ];
  assert.deepEqual(
    unexpectedTypes,
    [],
    `${ADMIN_WORKER_NOTICE_SOURCE} closed document contains unexpected top-level Markdown structures`,
  );

  const headings = tokens
    .filter((token) => token.type === 'heading')
    .map((token) => `${'#'.repeat(token.depth)} ${token.text.trim()}`);
  assert.deepEqual(
    headings,
    [ADMIN_WORKER_TITLE, '## Inventário efetivo', ...expectedSectionHeadings],
    `${ADMIN_WORKER_NOTICE_SOURCE} heading outline and canonical title must remain exact`,
  );

  const inventoryHeadingIndex = tokens.findIndex(
    (token) => token.type === 'heading' && token.depth === 2 && token.text === 'Inventário efetivo',
  );
  assert.notEqual(inventoryHeadingIndex, -1, `${ADMIN_WORKER_NOTICE_SOURCE} lacks its canonical inventory heading`);
  const preamble = tokens.slice(1, inventoryHeadingIndex).filter((token) => token.type !== 'space');
  assert.deepEqual(
    preamble.map((token) => token.type),
    ['paragraph', 'paragraph'],
    `${ADMIN_WORKER_NOTICE_SOURCE} must contain only its two canonical preamble paragraphs before the inventory`,
  );
  assert.deepEqual(
    preamble.map((token) => normalizeNotice(token.text)),
    adminWorkerPreamble(packageCount).map((paragraph) => normalizeNotice(paragraph)),
    `${ADMIN_WORKER_NOTICE_SOURCE} canonical preamble changed`,
  );

  const inventoryTokens = markdownSectionTokens(
    markdown,
    '## Inventário efetivo',
    ADMIN_WORKER_NOTICE_SOURCE,
  ).filter((token) => token.type !== 'space');
  assert.deepEqual(
    inventoryTokens.map((token) => token.type),
    ['table'],
    `${ADMIN_WORKER_NOTICE_SOURCE} effective inventory section must contain only its canonical table`,
  );

  assert.equal(
    tokens.filter((token) => token.type === 'table').length,
    1,
    `${ADMIN_WORKER_NOTICE_SOURCE} closed document must contain exactly one table`,
  );
  assert.equal(
    tokens.filter((token) => token.type === 'list').length,
    expectedSectionHeadings.length,
    `${ADMIN_WORKER_NOTICE_SOURCE} closed document must contain exactly one metadata list per package section`,
  );
  assert.equal(
    tokens.filter((token) => token.type === 'code').length,
    expectedSectionHeadings.length,
    `${ADMIN_WORKER_NOTICE_SOURCE} closed document must contain exactly one legal-text block per package section`,
  );
  assert.equal(
    tokens.filter((token) => token.type === 'paragraph').length,
    2 + expectedSectionHeadings.filter((heading) => /^(?:## launder |## marked )/u.test(heading)).length,
    `${ADMIN_WORKER_NOTICE_SOURCE} closed document contains noncanonical package prose`,
  );
}

function renderedSectionInspection(markdown, heading, label, selector) {
  const expected = parseExpectedHeading(heading, label);
  return withRenderedMarkdown(markdown, (document) => {
    const matches = [...document.querySelectorAll(`h${expected.depth}`)].filter(
      (element) =>
        normalizeStructuralIdentifier(element.textContent ?? '') ===
        normalizeStructuralIdentifier(expected.text),
    );
    assert.equal(matches.length, 1, `${label} must contain exactly one semantic ${heading} section`);
    const [sectionHeading] = matches;
    assert.equal(
      normalizeNotice(sectionHeading.textContent ?? ''),
      normalizeNotice(expected.text),
      `${label} ${heading} section must use the exact canonical rendered identifier`,
    );
    assert.equal(
      sectionHeading.parentElement,
      document.body,
      `${label} ${heading} section must be top-level rendered GFM`,
    );

    const elements = [];
    for (let sibling = sectionHeading.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
      const headingMatch = /^H([1-6])$/u.exec(sibling.tagName);
      if (headingMatch && Number(headingMatch[1]) <= expected.depth) break;
      if (selector) {
        if (sibling.matches(selector)) elements.push(sibling);
        elements.push(...sibling.querySelectorAll(selector));
      }
    }
    return {
      elementCount: elements.length,
      allElementsTopLevel: elements.every((element) => element.parentElement === document.body),
    };
  });
}

function renderedHeadingRecords(markdown, depth) {
  return withRenderedMarkdown(markdown, (document) =>
    [...document.querySelectorAll(`h${depth}`)].map((heading) => ({
      heading: `${'#'.repeat(depth)} ${normalizeNotice(heading.textContent ?? '')}`,
      topLevel: heading.parentElement === document.body,
    })),
  );
}

function assertSingleTopLevelSectionElement(markdown, heading, label, selector, elementLabel) {
  const inspection = renderedSectionInspection(markdown, heading, label, selector);
  assert.equal(
    inspection.elementCount,
    1,
    `${heading} must contain exactly one visible Markdown ${elementLabel}`,
  );
  assert.equal(
    inspection.allElementsTopLevel,
    true,
    `${heading} ${elementLabel} must be top-level rendered GFM`,
  );
}

function renderedTableCountWithHeader(markdown, expectedHeader) {
  return withRenderedMarkdown(markdown, (document) =>
    [...document.querySelectorAll('table')].filter((table) => {
      const firstRow = table.querySelector('thead tr') ?? table.querySelector('tr');
      if (!firstRow) return false;
      const header = [...firstRow.children].map((cell) =>
        normalizeStructuralIdentifier(cell.textContent ?? ''),
      );
      return header.length === expectedHeader.length &&
        header.every(
          (cell, index) => cell === normalizeStructuralIdentifier(expectedHeader[index]),
        );
    }).length,
  );
}

function renderedTableCountWithColumnCount(markdown, expectedColumnCount) {
  return withRenderedMarkdown(markdown, (document) =>
    [...document.querySelectorAll('table')].filter((table) => {
      const firstRow = table.querySelector('thead tr') ?? table.querySelector('tr');
      return firstRow?.children.length === expectedColumnCount;
    }).length,
  );
}

function renderedTableCount(markdown) {
  return withRenderedMarkdown(markdown, (document) => document.querySelectorAll('table').length);
}

function markdownSectionTokens(markdown, heading, label) {
  renderedSectionInspection(markdown, heading, label);
  const { tokens } = markdownHeadingRecords(markdown);
  const expected = parseExpectedHeading(heading, label);
  const matches = tokens
    .map((token, index) => ({ token, index }))
    .filter(
      ({ token }) =>
        token.type === 'heading' && token.depth === expected.depth && token.text.trim() === expected.text,
    );
  assert.equal(matches.length, 1, `${label} must contain exactly one ${heading} section`);
  const end = tokens.findIndex(
    (token, index) =>
      index > matches[0].index && token.type === 'heading' && token.depth <= expected.depth,
  );
  const sectionTokens = tokens.slice(matches[0].index + 1, end === -1 ? undefined : end);
  assert.equal(
    markdownTokensMatching(sectionTokens, (token) => token.type === 'html').length,
    0,
    `${label} ${heading} section must not contain raw HTML`,
  );
  return sectionTokens;
}

function markdownSection(markdown, heading, label) {
  return markdownSectionTokens(markdown, heading, label)
    .map((token) => token.raw)
    .join('');
}

function assertNoticeSections(markdown, sections, label) {
  for (const section of sections) {
    const body = markdownSection(markdown, section.heading, label);
    for (const notice of section.notices) {
      assertContainsMarkdownNotice(body, notice, `${label} section ${section.heading}`);
    }
  }
}

function parseTable(markdown, heading) {
  assertSingleTopLevelSectionElement(markdown, heading, 'THIRDPARTY', 'table', 'inventory table');
  const tables = markdownSectionTokens(markdown, heading, 'THIRDPARTY').filter(
    (token) => token.type === 'table',
  );
  assert.equal(tables.length, 1, `${heading} must contain exactly one visible Markdown inventory table`);
  const [table] = tables;

  const header = table.header.map((cell) => normalizeCell(cell.text));
  assert.deepEqual(header, TABLE_HEADER, `${heading} inventory header changed`);

  return table.rows.map((row) => {
    const cells = row.map((cell) => normalizeCell(cell.text));
    assert.equal(cells.length, TABLE_HEADER.length, `invalid THIRDPARTY row: ${table.raw}`);
    return {
      scope: cells[0],
      name: cells[1],
      declaredVersion: cells[2],
      resolvedVersion: cells[3],
      license: cells[4],
      election: cells[5],
      integrity: cells[6],
      origin: cells[7],
    };
  });
}

function parseAdminWorkerInventory(markdown) {
  assert.equal(
    renderedTableCount(markdown),
    1,
    `${ADMIN_WORKER_NOTICE_SOURCE} must contain exactly one visible Markdown table`,
  );
  assert.equal(
    renderedTableCountWithHeader(markdown, ADMIN_WORKER_INVENTORY_HEADER),
    1,
    `${ADMIN_WORKER_NOTICE_SOURCE} Inventário efetivo must contain exactly one visible contiguous table; separator is invalid when no such GFM table exists`,
  );
  assertSingleTopLevelSectionElement(
    markdown,
    '## Inventário efetivo',
    ADMIN_WORKER_NOTICE_SOURCE,
    'table',
    'effective inventory table',
  );
  const section = markdownSection(markdown, '## Inventário efetivo', ADMIN_WORKER_NOTICE_SOURCE);
  const tableLines = section.split(/\r?\n/u);
  while (tableLines[0]?.trim() === '') tableLines.shift();
  while (tableLines.at(-1)?.trim() === '') tableLines.pop();
  assert.ok(
    tableLines.length >= 3 && tableLines.every((line) => /^\|.*\|$/u.test(line)),
    `${ADMIN_WORKER_NOTICE_SOURCE} effective inventory must be one visible contiguous table`,
  );

  const cells = (line) => line.split('|').slice(1, -1).map(normalizeCell);
  assert.deepEqual(
    cells(tableLines[0]),
    ADMIN_WORKER_INVENTORY_HEADER,
    `${ADMIN_WORKER_NOTICE_SOURCE} effective inventory header changed`,
  );
  const separator = cells(tableLines[1]);
  assert.ok(
    separator.length === ADMIN_WORKER_INVENTORY_HEADER.length &&
      separator.every((cell) => /^:?-{3,}:?$/u.test(cell)),
    `${ADMIN_WORKER_NOTICE_SOURCE} effective inventory separator is invalid`,
  );

  const records = tableLines.slice(2).map((line) => {
    const row = cells(line);
    assert.equal(
      row.length,
      ADMIN_WORKER_INVENTORY_HEADER.length,
      `${ADMIN_WORKER_NOTICE_SOURCE} has an invalid effective inventory row: ${line}`,
    );
    assert.ok(
      row.every((value) => value.length > 0),
      `${ADMIN_WORKER_NOTICE_SOURCE} has an empty effective inventory cell: ${line}`,
    );
    return {
      packageName: row[0],
      version: row[1],
      license: row[2],
      lockPath: row[3],
    };
  });
  assert.equal(
    new Set(records.map(({ lockPath }) => lockPath)).size,
    records.length,
    `${ADMIN_WORKER_NOTICE_SOURCE} effective inventory repeats a lockfile path`,
  );
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
  artifactHtml,
  artifactCss,
  workerArtifact,
  workerArtifacts,
  requiredStaticNoticeMarkers = [],
  requiredStaticNoticeSections = [],
  rootDocumentSchema,
  requiredBundledLicenseMarkers = [],
  bundledLicenseSupplementHeadings = [],
  requiredWorkerNoticeMarkers = [],
}) {
  assert.equal(publicInventory, rootInventory, `${ROOT_INVENTORY} and ${PUBLIC_INVENTORY} must be byte-identical`);
  assert.equal(rootNotice, publicNotice, `${ROOT_NOTICE} and ${PUBLIC_NOTICE} must be byte-identical`);
  assertVisibleMarkdownEvidence(rootInventory, 'THIRDPARTY');
  if (rootDocumentSchema) {
    assertClosedMarkdownDocument(rootInventory, rootDocumentSchema, 'THIRDPARTY');
  }

  for (const marker of requiredStaticNoticeMarkers) {
    if (/^#{1,6}\s/u.test(marker)) {
      renderedSectionInspection(rootInventory, marker, 'THIRDPARTY');
    } else {
      assertContainsRenderedMarkdown(rootInventory, marker, 'THIRDPARTY');
    }
  }
  assertNoticeSections(rootInventory, requiredStaticNoticeSections, 'THIRDPARTY');

  assert.equal(
    renderedTableCountWithHeader(rootInventory, TABLE_HEADER),
    manifests.length,
    `THIRDPARTY must contain exactly one visible Markdown inventory table per manifest (${manifests.length} total)`,
  );
  assert.equal(
    renderedTableCountWithColumnCount(rootInventory, TABLE_HEADER.length),
    manifests.length,
    `THIRDPARTY must contain exactly ${manifests.length} eight-column inventory tables`,
  );

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

  if (artifactHtml !== undefined) {
    assert.ok(
      Array.isArray(artifactHtml) && artifactHtml.length > 0,
      'Vite build must emit at least one HTML artifact',
    );
    for (const artifact of artifactHtml) {
      assert.equal(typeof artifact.path, 'string', 'Vite HTML artifact path is missing');
      assert.equal(typeof artifact.content, 'string', `${artifact.path} content is missing`);
      verifyNoRemoteGoogleFonts(artifact.content, artifact.path);
    }
  }

  if (artifactCss !== undefined) {
    assert.ok(
      Array.isArray(artifactCss) && artifactCss.length > 0,
      'Vite build must emit at least one CSS artifact',
    );
    for (const artifact of artifactCss) {
      assert.equal(typeof artifact.path, 'string', 'Vite CSS artifact path is missing');
      assert.equal(typeof artifact.content, 'string', `${artifact.path} content is missing`);
      verifyNoRemoteGoogleFontsInCss(artifact.content, artifact.path);
    }
  }

  if (workerArtifact !== undefined) {
    assert.equal(typeof workerArtifact, 'string', `${TLSRPT_WORKER_ARTIFACT} must be emitted by Wrangler`);
    for (const marker of requiredWorkerNoticeMarkers) {
      assertContainsNotice(workerArtifact, marker, TLSRPT_WORKER_ARTIFACT);
    }
  }

  if (workerArtifacts !== undefined) {
    assert.ok(
      Array.isArray(workerArtifacts) && workerArtifacts.length > 0,
      'Wrangler must emit at least one configured Worker artifact',
    );
    for (const artifact of workerArtifacts) {
      assert.equal(typeof artifact.path, 'string', 'Wrangler Worker artifact path is missing');
      assert.equal(typeof artifact.content, 'string', `${artifact.path} content is missing`);
      for (const notice of artifact.requiredNotices ?? []) {
        assertContainsNotice(artifact.content, notice, artifact.path);
      }
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

async function loadTextArtifacts(root, extensions, directory = resolve(root, 'dist')) {
  const artifacts = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      artifacts.push(...(await loadTextArtifacts(root, extensions, entryPath)));
    } else if (entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension))) {
      artifacts.push({
        path: relative(root, entryPath).replaceAll('\\', '/'),
        content: await readFile(entryPath, 'utf8'),
      });
    }
  }
  return artifacts;
}

function assertPathInside(parent, candidate, label) {
  const child = relative(parent, candidate);
  assert.ok(
    child && !isAbsolute(child) && child !== '..' && !child.startsWith('../') && !child.startsWith('..\\'),
    `${label} must remain inside ${relative(process.cwd(), parent).replaceAll('\\', '/')}`,
  );
}

function packageFromMetafileInput(inputPath) {
  const normalized = inputPath.replaceAll('\\', '/');
  if (normalized.startsWith('(disabled):')) return undefined;

  const segments = normalized.split('/').filter((segment) => segment && segment !== '.' && segment !== '..');
  const firstNodeModules = segments.indexOf('node_modules');
  const lastNodeModules = segments.lastIndexOf('node_modules');
  if (lastNodeModules === -1) return undefined;

  const firstPackageSegment = segments[lastNodeModules + 1];
  assert.ok(firstPackageSegment, `cannot identify package from Wrangler input ${inputPath}`);
  const packageEnd = firstPackageSegment.startsWith('@') ? lastNodeModules + 3 : lastNodeModules + 2;
  assert.ok(segments[packageEnd - 1], `cannot identify scoped package from Wrangler input ${inputPath}`);
  const packageName = segments.slice(lastNodeModules + 1, packageEnd).join('/');
  const lockKey = segments.slice(firstNodeModules, packageEnd).join('/');
  return { lockKey, packageName };
}

async function packageLicenseNotice(root, lockKey) {
  const packageDirectory = resolve(root, lockKey);
  const candidates = (await readdir(packageDirectory, { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.isFile() && /^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/iu.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort();
  assert.ok(candidates.length <= 1, `${lockKey} has multiple legal notice files; map them explicitly`);
  if (candidates.length === 0) return undefined;

  const content = await readFile(resolve(packageDirectory, candidates[0]), 'utf8');
  return {
    name: candidates[0],
    content,
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}

export async function verifyAdminWorkerBundle({
  root,
  metafile,
  packageLock,
  sourceNotice,
  emittedNotice,
}) {
  assert.equal(
    emittedNotice,
    sourceNotice,
    `${ADMIN_WORKER_NOTICE_ARTIFACT} must be byte-identical to ${ADMIN_WORKER_NOTICE_SOURCE}`,
  );
  assertVisibleMarkdownEvidence(sourceNotice, ADMIN_WORKER_NOTICE_SOURCE);

  const entryOutputs = Object.entries(metafile.outputs ?? {}).filter(
    ([, output]) => output.entryPoint !== undefined,
  );
  assert.equal(entryOutputs.length, 1, `${ADMIN_WORKER_METAFILE} must describe exactly one Worker entry`);
  const [entryOutputPath, entryOutput] = entryOutputs[0];
  assert.equal(entryOutput.entryPoint, 'src/index.ts', 'Admin Motor metafile must describe src/index.ts');

  const outdir = resolve(root, ADMIN_WORKER_OUTDIR);
  const entryPath = resolve(root, 'admin-motor', entryOutputPath);
  assertPathInside(outdir, entryPath, entryOutputPath);
  const entryContent = await readFile(entryPath, 'utf8');
  assert.equal(
    Buffer.byteLength(entryContent),
    entryOutput.bytes,
    `${entryOutputPath} byte size must match the Wrangler metafile`,
  );

  const packages = new Map();
  for (const [inputPath, input] of Object.entries(entryOutput.inputs ?? {})) {
    if (!(input.bytesInOutput > 0)) continue;
    const resolvedPackage = packageFromMetafileInput(inputPath);
    if (!resolvedPackage) continue;
    packages.set(resolvedPackage.lockKey, resolvedPackage);
  }
  assert.ok(packages.size > 0, 'Admin Motor metafile must identify at least one bundled npm package');

  const byLockPath = (left, right) => left.lockPath.localeCompare(right.lockPath);
  const expectedInventory = [...packages.values()]
    .map(({ lockKey, packageName }) => {
      const lockEntry = packageLock.packages?.[lockKey];
      assert.ok(lockEntry, `${lockKey} from the Admin Motor metafile is missing from package-lock.json`);
      return {
        packageName,
        version: lockEntry.version,
        license: lockEntry.license,
        lockPath: `packages["${lockKey}"]`,
      };
    })
    .sort(byLockPath);
  const actualInventory = parseAdminWorkerInventory(sourceNotice).sort(byLockPath);
  assert.deepEqual(
    actualInventory,
    expectedInventory,
    `${ADMIN_WORKER_NOTICE_SOURCE} effective inventory table must equal the Wrangler metafile and lockfile-derived inventory`,
  );

  const expectedSectionHeadings = [
    ...new Set(
      expectedInventory.map(
        ({ packageName, version, license }) => `## ${packageName} ${version} — ${license}`,
      ),
    ),
  ].sort();
  for (const { lockKey, packageName } of packages.values()) {
    if (packageName !== 'launder') continue;
    const lockEntry = packageLock.packages?.[lockKey];
    assert.ok(lockEntry, `${lockKey} from the Admin Motor metafile is missing from package-lock.json`);
    assert.deepEqual(
      {
        version: lockEntry.version,
        license: lockEntry.license,
        resolved: lockEntry.resolved,
        integrity: lockEntry.integrity,
      },
      {
        version: LAUNDER_AUDITED_ARTIFACT.version,
        license: LAUNDER_AUDITED_ARTIFACT.license,
        resolved: LAUNDER_AUDITED_ARTIFACT.resolved,
        integrity: LAUNDER_AUDITED_ARTIFACT.integrity,
      },
      'launder must match the exact audited provenance; any drift requires a legal re-audit',
    );
  }
  assertAdminDocumentStructure(sourceNotice, expectedSectionHeadings, packages.size);
  const renderedPackageHeadings = renderedHeadingRecords(sourceNotice, 2).filter(
    (record) => record.heading !== '## Inventário efetivo',
  );
  assert.equal(
    renderedPackageHeadings.every((record) => record.topLevel),
    true,
    `${ADMIN_WORKER_NOTICE_SOURCE} dependency sections must all be top-level rendered GFM`,
  );
  const documentHeadings = renderedPackageHeadings
    .map((record) => record.heading)
    .sort();
  assert.deepEqual(
    documentHeadings,
    expectedSectionHeadings,
    `${ADMIN_WORKER_NOTICE_SOURCE} must contain exactly one section per exact bundled npm artifact`,
  );

  for (const { lockKey, packageName } of [...packages.values()].sort((left, right) =>
    left.lockKey.localeCompare(right.lockKey),
  )) {
    const lockEntry = packageLock.packages?.[lockKey];
    assert.ok(lockEntry, `${lockKey} from the Admin Motor metafile is missing from package-lock.json`);
    assertImmutableRegistryProvenance(`admin-motor:${lockKey}`, packageName, lockEntry);
    const sectionHeading = `## ${packageName} ${lockEntry.version} — ${lockEntry.license}`;
    const sectionBody = markdownSection(sourceNotice, sectionHeading, ADMIN_WORKER_NOTICE_SOURCE);
    const sectionPackageCount = expectedInventory.filter(
      (record) =>
        record.packageName === packageName &&
        record.version === lockEntry.version &&
        record.license === lockEntry.license,
    ).length;
    assertExactMarkdownLine(
      sectionBody,
      `- **Caminho no lockfile:** \`package-lock.json -> packages["${lockKey}"]\``,
      `${ADMIN_WORKER_NOTICE_SOURCE} section ${packageName} ${lockEntry.version}`,
    );
    assertExactMarkdownField(
      sectionBody,
      'Resolved',
      `- **Resolved:** \`${lockEntry.resolved}\``,
      `${ADMIN_WORKER_NOTICE_SOURCE} section ${packageName} ${lockEntry.version}`,
    );
    assertExactMarkdownField(
      sectionBody,
      'Integrity',
      `- **Integrity:** \`${lockEntry.integrity}\``,
      `${ADMIN_WORKER_NOTICE_SOURCE} section ${packageName} ${lockEntry.version}`,
    );
    assertExactMarkdownField(
      sectionBody,
      'Origem imutável/hash',
      '- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.',
      `${ADMIN_WORKER_NOTICE_SOURCE} section ${packageName} ${lockEntry.version}`,
    );

    const upstreamNotice = await packageLicenseNotice(root, lockKey);
    let expectedLegalText;
    if (packageName === 'launder') {
      assert.equal(
        upstreamNotice,
        undefined,
        'launder 1.7.1 handling must be re-evaluated if upstream starts shipping a license file',
      );
      const packageJson = await readFile(resolve(root, lockKey, 'package.json'));
      assert.equal(
        createHash('sha256').update(packageJson).digest('hex'),
        LAUNDER_AUDITED_ARTIFACT.packageJsonSha256,
        'launder package.json must match the exact audited artifact',
      );
      assert.match(
        sectionBody,
        /não (?:contém|fornece|traz)[^\n]*LICENSE/iu,
        'launder section must disclose that the exact upstream package lacks a LICENSE file',
      );
      assertExactMarkdownField(
        sectionBody,
        'Evidência da licença declarada',
        `- **Evidência da licença declarada:** \`node_modules/launder/package.json\` (\`SHA-256: ${LAUNDER_AUDITED_ARTIFACT.packageJsonSha256}\`).`,
        'launder section',
      );
      assertExactMarkdownField(
        sectionBody,
        'Origem upstream imutável',
        `- **Origem upstream imutável:** tag anotada \`launder@1.7.1\`, commit \`${LAUNDER_AUDITED_ARTIFACT.upstreamCommit}\`, caminho \`packages/launder\` no repositório \`apostrophecms/apostrophe\`.`,
        'launder section',
      );
      assertContainsMarkdownNotice(sectionBody, LAUNDER_MIT_TERMS, 'launder section');
      expectedLegalText = `MIT License\n\n${LAUNDER_MIT_TERMS}`;
    } else {
      assert.ok(upstreamNotice, `${lockKey} must ship a legal notice file`);
      assertContainsMarkdownNotice(sectionBody, upstreamNotice.content, `${packageName} section`);
      assertExactMarkdownLine(
        sectionBody,
        `- **Fonte do aviso integral:** \`${lockKey}/${upstreamNotice.name}\` (\`SHA-256: ${upstreamNotice.sha256}\`).`,
        `${packageName} section`,
      );
      expectedLegalText = upstreamNotice.content;
    }
    assertAdminSectionStructure(
      sectionBody,
      packageName === 'launder' ? sectionPackageCount + 5 : sectionPackageCount * 2 + 3,
      expectedAdminSectionProse(packageName),
      expectedLegalText,
      `${ADMIN_WORKER_NOTICE_SOURCE} section ${packageName} ${lockEntry.version}`,
    );
  }

  return {
    entryOutputPath,
    packageCount: packages.size,
  };
}

async function main() {
  const root = process.cwd();
  const artifactMode = process.argv.includes('--artifact');
  const workerArtifactMode =
    process.argv.includes('--worker-artifact') || process.argv.includes('--worker-artifacts');
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

  const [
    artifactInventory,
    artifactNotice,
    artifactBundledLicenses,
    artifactJavaScript,
    artifactHtml,
    artifactCss,
  ] = artifactMode
    ? await Promise.all([
        readFile(resolve(root, ARTIFACT_INVENTORY), 'utf8'),
        readFile(resolve(root, ARTIFACT_NOTICE), 'utf8'),
        readFile(resolve(root, ARTIFACT_BUNDLED_LICENSES), 'utf8'),
        loadTextArtifacts(root, ['.js']),
        loadTextArtifacts(root, ['.html']),
        loadTextArtifacts(root, ['.css']),
      ])
    : [undefined, undefined, undefined, undefined, undefined, undefined];
  const workerArtifacts = workerArtifactMode
    ? [
        {
          path: TLSRPT_WORKER_ARTIFACT,
          content: await readFile(resolve(root, TLSRPT_WORKER_ARTIFACT), 'utf8'),
          requiredNotices: REQUIRED_WORKER_NOTICE_MARKERS,
        },
      ]
    : undefined;

  let adminWorkerVerification;
  if (workerArtifactMode) {
    const [metafile, packageLock, sourceNotice, emittedNotice] = await Promise.all([
      readFile(resolve(root, ADMIN_WORKER_METAFILE), 'utf8').then(JSON.parse),
      readFile(resolve(root, 'package-lock.json'), 'utf8').then(JSON.parse),
      readFile(resolve(root, ADMIN_WORKER_NOTICE_SOURCE), 'utf8'),
      readFile(resolve(root, ADMIN_WORKER_NOTICE_ARTIFACT), 'utf8'),
    ]);
    adminWorkerVerification = await verifyAdminWorkerBundle({
      root,
      metafile,
      packageLock,
      sourceNotice,
      emittedNotice,
    });
  }

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
    artifactHtml,
    artifactCss,
    workerArtifacts,
    requiredStaticNoticeMarkers: REQUIRED_STATIC_NOTICE_MARKERS,
    requiredStaticNoticeSections: REQUIRED_STATIC_NOTICE_SECTIONS,
    rootDocumentSchema: ROOT_DOCUMENT_SCHEMA,
    requiredBundledLicenseMarkers: REQUIRED_BUNDLED_LICENSE_MARKERS,
    bundledLicenseSupplementHeadings: BUNDLED_LICENSE_SUPPLEMENT_HEADINGS,
  });
  const verifiedTargets = [
    'direct dependency inventory and public legal copies',
    artifactMode ? 'Vite legal artifact' : undefined,
    workerArtifactMode
      ? `Wrangler Worker legal notices (${adminWorkerVerification.packageCount} Admin Motor packages)`
      : undefined,
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
