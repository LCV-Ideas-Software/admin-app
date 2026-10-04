# Inventário de componentes de terceiros

Este documento separa os dois manifestos do repositório. Cada linha corresponde a uma dependência direta declarada e a identifica por nome, licença e fonte: a expressão SPDX publicada no pacote, com a eleição explícita quando a expressão contém `OR`, e a URL do repositório upstream declarado pelo próprio pacote. A coluna **Escopo** reproduz a declaração no manifesto e não presume se o componente foi ou não empacotado. Versões, intervalos e resoluções imutáveis das dependências diretas vivem em `package.json`, `tlsrpt-motor/package.json` e nos respectivos lockfiles, onde o Dependabot as atualiza, e não se repetem nestas tabelas; o grafo de dependências do GitHub é o inventário versionado e fornece o SBOM sob demanda. Os complementos abaixo, o `NOTICE` e o módulo Text do Admin Motor também identificam os componentes por nome, licença e fonte; os textos de licença reproduzem a versão instalada no momento da escrita.

No build público, o recurso nativo `build.license` do Vite gera `legal/BUNDLED-LICENSES.md` diretamente do grafo efetivamente empacotado, incluindo dependências transitivas e componentes declarados como desenvolvimento que acabem no bundle. Quando o pacote publica um arquivo reconhecido, o inventário reproduz o texto; algumas seções podem ficar vazias. Os avisos abaixo fornecem suplementos documentados para essas lacunas, código vendorizado, eleições e ativos. A divulgação do build público é o conjunto dos dois arquivos; nenhum é declarado completo isoladamente.

## Inventário: package.json (raiz)

| Escopo      | Componente                            | Licença                                     | Fonte                                                                                  |
| ----------- | ------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- |
| runtime     | @codemirror/lang-javascript           | MIT                                         | https://github.com/codemirror/lang-javascript                                          |
| runtime     | @fontsource/inter                     | OFL-1.1                                     | https://github.com/fontsource/font-files (`fonts/google/inter`)                        |
| runtime     | @radix-ui/react-dialog                | MIT                                         | https://github.com/radix-ui/primitives (`packages/react/dialog`)                       |
| runtime     | @tanstack/react-query                 | MIT                                         | https://github.com/TanStack/query (`packages/react-query`)                             |
| runtime     | @tanstack/react-query-devtools        | MIT                                         | https://github.com/TanStack/query (`packages/react-query-devtools`)                    |
| runtime     | @tiptap/core                          | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/core`)                                 |
| runtime     | @tiptap/extension-character-count     | MIT                                         | https://github.com/ueberdosis/tiptap (`packages-deprecated/extension-character-count`) |
| runtime     | @tiptap/extension-code-block-lowlight | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-code-block-lowlight`)        |
| runtime     | @tiptap/extension-collaboration       | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-collaboration`)              |
| runtime     | @tiptap/extension-color               | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-color`)                      |
| runtime     | @tiptap/extension-drag-handle         | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-drag-handle`)                |
| runtime     | @tiptap/extension-drag-handle-react   | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-drag-handle-react`)          |
| runtime     | @tiptap/extension-dropcursor          | MIT                                         | https://github.com/ueberdosis/tiptap (`packages-deprecated/extension-dropcursor`)      |
| runtime     | @tiptap/extension-focus               | MIT                                         | https://github.com/ueberdosis/tiptap (`packages-deprecated/extension-focus`)           |
| runtime     | @tiptap/extension-font-family         | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-font-family`)                |
| runtime     | @tiptap/extension-highlight           | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-highlight`)                  |
| runtime     | @tiptap/extension-image               | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-image`)                      |
| runtime     | @tiptap/extension-link                | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-link`)                       |
| runtime     | @tiptap/extension-mention             | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-mention`)                    |
| runtime     | @tiptap/extension-node-range          | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-node-range`)                 |
| runtime     | @tiptap/extension-placeholder         | MIT                                         | https://github.com/ueberdosis/tiptap (`packages-deprecated/extension-placeholder`)     |
| runtime     | @tiptap/extension-subscript           | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-subscript`)                  |
| runtime     | @tiptap/extension-superscript         | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-superscript`)                |
| runtime     | @tiptap/extension-table               | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-table`)                      |
| runtime     | @tiptap/extension-table-cell          | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-table-cell`)                 |
| runtime     | @tiptap/extension-table-header        | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-table-header`)               |
| runtime     | @tiptap/extension-table-row           | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-table-row`)                  |
| runtime     | @tiptap/extension-task-item           | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-task-item`)                  |
| runtime     | @tiptap/extension-task-list           | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-task-list`)                  |
| runtime     | @tiptap/extension-text-align          | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-text-align`)                 |
| runtime     | @tiptap/extension-text-style          | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-text-style`)                 |
| runtime     | @tiptap/extension-typography          | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-typography`)                 |
| runtime     | @tiptap/extension-youtube             | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/extension-youtube`)                    |
| runtime     | @tiptap/pm                            | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/pm`)                                   |
| runtime     | @tiptap/react                         | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/react`)                                |
| runtime     | @tiptap/starter-kit                   | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/starter-kit`)                          |
| runtime     | @tiptap/suggestion                    | MIT                                         | https://github.com/ueberdosis/tiptap (`packages/suggestion`)                           |
| runtime     | @tiptap/y-tiptap                      | MIT                                         | https://github.com/ueberdosis/y-tiptap                                                 |
| runtime     | codemirror                            | MIT                                         | https://github.com/codemirror/basic-setup                                              |
| runtime     | croner                                | MIT                                         | https://github.com/hexagon/croner                                                      |
| runtime     | cronstrue                             | MIT                                         | https://github.com/bradymholt/cRonstrue                                                |
| runtime     | d3-geo                                | ISC                                         | https://github.com/d3/d3-geo                                                           |
| runtime     | dompurify                             | (MPL-2.0 OR Apache-2.0), eleição Apache-2.0 | https://github.com/cure53/DOMPurify                                                    |
| runtime     | hono                                  | MIT                                         | https://github.com/honojs/hono                                                         |
| runtime     | lowlight                              | MIT                                         | https://github.com/wooorm/lowlight                                                     |
| runtime     | lucide-react                          | ISC                                         | https://github.com/lucide-icons/lucide (`packages/lucide-react`)                       |
| runtime     | mammoth                               | BSD-2-Clause                                | https://github.com/mwilliamson/mammoth.js                                              |
| runtime     | marked                                | MIT                                         | https://github.com/markedjs/marked                                                     |
| runtime     | prosemirror-model                     | MIT                                         | https://code.haverbeke.berlin/prosemirror/prosemirror-model                            |
| runtime     | prosemirror-state                     | MIT                                         | https://github.com/prosemirror/prosemirror-state                                       |
| runtime     | prosemirror-view                      | MIT                                         | https://code.haverbeke.berlin/prosemirror/prosemirror-view                             |
| runtime     | react                                 | MIT                                         | https://github.com/react/react (`packages/react`)                                      |
| runtime     | react-dom                             | MIT                                         | https://github.com/react/react (`packages/react-dom`)                                  |
| runtime     | sanitize-html                         | MIT                                         | https://github.com/apostrophecms/apostrophe (`packages/sanitize-html`)                 |
| runtime     | spark-md5                             | (WTFPL OR MIT), eleição MIT                 | https://github.com/satazor/js-spark-md5                                                |
| runtime     | tiptap-markdown                       | MIT                                         | https://github.com/aguingand/tiptap-markdown                                           |
| runtime     | topojson-client                       | ISC                                         | https://github.com/topojson/topojson-client                                            |
| runtime     | world-atlas                           | ISC                                         | https://github.com/topojson/world-atlas                                                |
| runtime     | y-protocols                           | MIT                                         | https://github.com/yjs/y-protocols                                                     |
| runtime     | yjs                                   | MIT                                         | https://github.com/yjs/yjs                                                             |
| development | @biomejs/biome                        | MIT OR Apache-2.0, eleição MIT              | https://github.com/biomejs/biome (`packages/@biomejs/biome`)                           |
| development | @cloudflare/workers-types             | MIT OR Apache-2.0, eleição MIT              | https://github.com/cloudflare/workerd                                                  |
| development | @eslint/js                            | MIT                                         | https://github.com/eslint/eslint (`packages/js`)                                       |
| development | @playwright/test                      | Apache-2.0                                  | https://github.com/microsoft/playwright                                                |
| development | @testing-library/dom                  | MIT                                         | https://github.com/testing-library/dom-testing-library                                 |
| development | @testing-library/jest-dom             | MIT                                         | https://github.com/testing-library/jest-dom                                            |
| development | @testing-library/react                | MIT                                         | https://github.com/testing-library/react-testing-library                               |
| development | @testing-library/user-event           | MIT                                         | https://github.com/testing-library/user-event                                          |
| development | @types/d3-geo                         | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped (`types/d3-geo`)                    |
| development | @types/node                           | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped (`types/node`)                      |
| development | @types/react                          | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped (`types/react`)                     |
| development | @types/react-dom                      | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped (`types/react-dom`)                 |
| development | @types/sanitize-html                  | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped (`types/sanitize-html`)             |
| development | @types/spark-md5                      | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped (`types/spark-md5`)                 |
| development | @types/topojson-client                | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped (`types/topojson-client`)           |
| development | @vitejs/plugin-react                  | MIT                                         | https://github.com/vitejs/vite-plugin-react (`packages/plugin-react`)                  |
| development | @vitest/coverage-v8                   | MIT                                         | https://github.com/vitest-dev/vitest (`packages/coverage-v8`)                          |
| development | @vitest/ui                            | MIT                                         | https://github.com/vitest-dev/vitest (`packages/ui`)                                   |
| development | eslint                                | MIT                                         | https://github.com/eslint/eslint                                                       |
| development | eslint-config-prettier                | MIT                                         | https://github.com/prettier/eslint-config-prettier                                     |
| development | eslint-plugin-react-hooks             | MIT                                         | https://github.com/facebook/react (`packages/eslint-plugin-react-hooks`)               |
| development | eslint-plugin-react-refresh           | MIT                                         | https://github.com/ArnaudBarre/eslint-plugin-react-refresh                             |
| development | globals                               | MIT                                         | https://github.com/sindresorhus/globals                                                |
| development | happy-dom                             | MIT                                         | https://github.com/capricorn86/happy-dom                                               |
| development | husky                                 | MIT                                         | https://github.com/typicode/husky                                                      |
| development | knip                                  | ISC                                         | https://github.com/webpro-nl/knip (`packages/knip`)                                    |
| development | lightningcss                          | MPL-2.0                                     | https://github.com/parcel-bundler/lightningcss                                         |
| development | lint-staged                           | MIT                                         | https://github.com/lint-staged/lint-staged                                             |
| development | prettier                              | MIT                                         | https://github.com/prettier/prettier                                                   |
| development | rollup-plugin-visualizer              | MIT                                         | https://github.com/btd/rollup-plugin-visualizer                                        |
| development | typescript                            | Apache-2.0                                  | https://github.com/microsoft/TypeScript                                                |
| development | typescript-eslint                     | MIT                                         | https://github.com/typescript-eslint/typescript-eslint (`packages/typescript-eslint`)  |
| development | vite                                  | MIT                                         | https://github.com/vitejs/vite (`packages/vite`)                                       |
| development | vitest                                | MIT                                         | https://github.com/vitest-dev/vitest (`packages/vitest`)                               |
| development | wrangler                              | MIT OR Apache-2.0, eleição MIT              | https://github.com/cloudflare/workers-sdk (`packages/wrangler`)                        |

## Inventário: tlsrpt-motor/package.json

| Escopo      | Componente                      | Licença                        | Fonte                                                                      |
| ----------- | ------------------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| runtime     | postal-mime                     | MIT-0                          | https://github.com/postalsys/postal-mime                                   |
| development | @biomejs/biome                  | MIT OR Apache-2.0, eleição MIT | https://github.com/biomejs/biome (`packages/@biomejs/biome`)               |
| development | @cloudflare/vitest-plugin       | MIT                            | https://github.com/cloudflare/workers-sdk (`packages/vitest-plugin`)       |
| development | vitest                          | MIT                            | https://github.com/vitest-dev/vitest (`packages/vitest`)                   |
| development | wrangler                        | MIT OR Apache-2.0, eleição MIT | https://github.com/cloudflare/workers-sdk (`packages/wrangler`)            |

## Componente incorporado ao Worker TLS-RPT

`postal-mime` é publicado sob MIT-0, mas incorpora em
`src/base64-encoder.js` o componente `base64ArrayBuffer`, de Jon Leighton, sob
MIT clássica. O Worker usa esse código em runtime. Como o comentário original
não possui um marcador de comentário legal reconhecido pelo esbuild, o
entrypoint local reproduz o aviso abaixo com `/*!`, formato preservado pelo
empacotador oficial usado pelo Wrangler.

| Componente                       | Relação com o Worker                                         | Licença aplicada | Fonte                                                                |
| -------------------------------- | ------------------------------------------------------------ | ---------------- | -------------------------------------------------------------------- |
| base64ArrayBuffer (Jon Leighton) | Incorporado por `postal-mime` e alcançável no bundle TLS-RPT | MIT              | <https://github.com/postalsys/postal-mime> (`src/base64-encoder.js`) |

### base64ArrayBuffer — MIT

```text
MIT LICENSE

Copyright 2011 Jon Leighton

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## Complementos para componentes incorporados ao bundle

O inventário nativo do Vite associa cada módulo ao pacote npm mais próximo. Um
complemento estático continua necessário quando há código incorporado em uma
distribuição já compilada, uma licença alternativa oficial cujo arquivo não
acompanha o tarball npm ou uma seção nativa vazia porque o pacote publicado não
inclui o arquivo de licença. Estes complementos não substituem
`legal/BUNDLED-LICENSES.md`; cobrem precisamente essas fronteiras comprovadas.

| Componente                     | Relação com o bundle                                                                                                     | Licença aplicada                              | Fonte                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------- |
| JSZip                          | Incorporado por Mammoth e detectado pelo inventário nativo do Vite                                                       | `(MIT OR GPL-3.0-or-later)`; eleição: **MIT** | <https://github.com/Stuk/jszip>                                |
| Pako                           | Vendorizado na distribuição browser do JSZip; não recebe seção própria do inventário nativo                              | `(MIT AND Zlib)`; **ambas** se aplicam        | <https://github.com/nodeca/pako>                               |
| Spark MD5                      | Dependência direta detectada pelo Vite; o projeto usa a alternativa oficial MIT                                          | `(WTFPL OR MIT)`; eleição: **MIT**            | <https://github.com/satazor/js-spark-md5> (arquivo `LICENSE2`) |
| dingbat-to-unicode             | Detectado pelo Vite; o tarball 1.0.1 não contém arquivo de licença, e o titular confirmou o aviso aplicável em 19/09/2026 (ver suplemento) | BSD-2-Clause; `Copyright (c) 2021, Michael Williamson` | <https://github.com/mwilliamson/dingbat-to-unicode>            |
| react-remove-scroll-bar        | Detectado pelo Vite; o tarball não contém arquivo de licença e o suplemento preserva somente evidência exata             | MIT; concessão atual dos 26 membros; aviso histórico em aberto          | <https://github.com/theKashey/react-remove-scroll-bar>         |
| Assets do scaffold create-vite | `src/assets/hero.png`, `react.svg` e `vite.svg`; distribuídos no código-fonte, sem consumidores e fora do bundle público | MIT                                           | <https://github.com/vitejs/vite> (`packages/create-vite`)      |

### Assets do scaffold create-vite — MIT

Os três assets fonte identificados na tabela coincidem byte a byte com o
template React TypeScript da tag oficial `v8.0.0`. Eles não são importados e
não integram o artefato Vite atual, mas permanecem cobertos enquanto estiverem
distribuídos no repositório.

```text
MIT License

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
SOFTWARE.
```

### JSZip — MIT

O texto MIT integral do JSZip é preservado automaticamente em
`legal/BUNDLED-LICENSES.md`. A eleição acima evita aplicar a alternativa GPLv3
ao componente.

### Pako — MIT e Zlib

O campo `browser` do JSZip seleciona `dist/jszip.min.js`, gerado com a versão
do Pako fixada pelo lockfile oficial do próprio JSZip, distinta do `pako`
transitivo resolvido neste repositório. Os avisos a seguir correspondem aos
bytes efetivamente distribuídos.

```text
(The MIT License)

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
THE SOFTWARE.

The zlib-derived files are additionally covered by the following notice:

Copyright (C) 1995-2013 Jean-loup Gailly and Mark Adler
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
3. This notice may not be removed or altered from any source distribution.
```

### Spark MD5 — MIT

O repositório oficial oferece a MIT como alternativa no arquivo `LICENSE2`; o
texto abaixo reproduz o da versão instalada no momento da escrita.

```text
Copyright (c) 2015 André Cruz <amdfcruz@gmail.com>

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
SOFTWARE.
```

### dingbat-to-unicode — BSD-2-Clause

O tarball npm da versão instalada (1.0.1) e o `js/package.json` da tag
correspondente no repositório upstream declaram `BSD-2-Clause` e identificam
Michael Williamson como autor, mas o tarball 1.0.1 não contém `LICENSE` ou
`COPYING`. Em 19/09/2026 o titular acrescentou `js/LICENSE` ao repositório
(commit `a89b69198c2dd030b097cbf44b4eb7dd8b85722d`), publicou 1.0.2 com esse
arquivo no tarball e declarou em
[dingbat-to-unicode#1](https://github.com/mwilliamson/dingbat-to-unicode/issues/1#issuecomment-5740760399)
que a licença "also applies to any previous versions". O aviso abaixo é o
texto integral de `js/LICENSE` (1.304 bytes; tarball 1.0.2 SHA-256
`3ff52fb8c0586a748aa11cbbac2f16524cf9971767f06077ff344729a69321c1`), reproduzido
sem alteração, e cobre a versão 1.0.1 por declaração expressa do titular.

```text
Copyright (c) 2021, Michael Williamson
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### react-remove-scroll-bar — MIT

O tarball npm de `react-remove-scroll-bar` 2.3.8 declara MIT e identifica Anton
Korzunov como autor, mas não contém LICENSE. Seu `gitHead` publicado não é
alcançável na pesquisa registrada. O aviso histórico exato do artefato de 2024
continua aguardando a confirmação upstream; não se atribui a ele um aviso de
copyright posterior.

A concessão de origem abaixo foi acrescentada no commit oficial
`7301c160fda44cb8cf2b9fdfde61efad35736196`, aprovado e mesclado pelo mantenedor
em [react-remove-scroll-bar #76](https://github.com/theKashey/react-remove-scroll-bar/pull/76).
A fonte licenciada declara versão 2.3.7 e `react-style-singleton ^2.2.1`;
o manifesto npm 2.3.8 declara `react-style-singleton ^2.2.2`. Não são árvores
de pacote idênticas nem se identifica aquele commit como o `gitHead` publicado.

A reprodução com o compilador oficial TypeScript 4.6.3, escolhido para esta
prova, gerou os 12 arquivos JavaScript de `dist/es5`, `dist/es2015` e
`dist/es2019` byte a byte iguais aos publicados em 2.3.8, sem alterar ou
normalizar fonte e saída. As seis combinações explícitas de target e interop
por arquivo foram registradas; não se afirma reconstrução do build original
ou emit fixado pelo tsconfig/lockfile. Os quatro arquivos de código dessa
fonte licenciada também são byte iguais aos da revisão upstream examinada
em 03/10/2026; essa comparação é entre duas revisões Git.

A prova adicional de 03/10/2026 reproduziu com TypeScript 4.6.3 os 12
arquivos `.d.ts` byte a byte iguais aos publicados. O README e
`constants/package.json` também são byte-idênticos aos membros da fonte
licenciada. São, assim, 26 correspondências exatas entre os 27 membros do
tarball: 12 JavaScript, 12 declarações e esses dois arquivos associados.

O membro restante, `package.json` da raiz, difere somente em duas literais:
`"version": "2.3.7"` para `"version": "2.3.8"` e
`"react-style-singleton": "^2.2.1"` para `"react-style-singleton": "^2.2.2"`.
Aplicar apenas essas duas alterações de metadados reconstrói integralmente
seus bytes publicados. Essa comparação local não identifica o `gitHead`
histórico nem certifica o procedimento original de release. A emissão exata
das declarações conserva os diagnósticos de tipagem encontrados; não é uma
certificação de build completo do upstream.

O texto completo é preservado como concessão atual da fonte correspondente
a esses 26 membros de código e documentação, com a atribuição literal de
2025. A MIT permite modificar e distribuir o Software e a documentação
associada, preservados os avisos exigidos. As duas diferenças de metadados
estão delimitadas acima; não se declara identidade integral dos pacotes nem
uma confirmação do mantenedor sobre a publicação npm histórica.

A aprovação da inclusão de LICENSE não responde às perguntas posteriores
sobre o aviso npm histórico. Permanecem sem comprovação o `gitHead` original,
o aviso exato de 2024 e usos anteriores à concessão. Não se afirma que esse
texto acompanhava o tarball original, nem PASS global do licenciamento.
As dependências importadas mantêm seus próprios avisos no inventário do build.

Fonte exata: <https://github.com/theKashey/react-remove-scroll-bar/blob/7301c160fda44cb8cf2b9fdfde61efad35736196/LICENSE>.

```text
MIT License

Copyright (c) 2025 Anton Korzunov <thekashey@gmail.com>

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
SOFTWARE.
```

## Cartografia local e dados Natural Earth

O mapa planetário de localidade é renderizado no navegador com `d3-geo`,
`topojson-client` e o arquivo `countries-110m.json` de `world-atlas`. As três
dependências estão declaradas no manifesto e resolvidas no lockfile. O arquivo cartográfico deriva dos limites administrativos
Natural Earth 4.1.0 em escala 1:110m. Segundo os
[termos de uso oficiais](https://www.naturalearthdata.com/about/terms-of-use/),
os dados vetoriais e raster Natural Earth são de domínio público.

A base é empacotada no aplicativo. A renderização não solicita tiles nem envia
dados natais ou de navegação a provedores cartográficos externos. “Natural
Earth” identifica a proveniência do mapa-base, não endossa as interpretações ou
o aplicativo.

## Avisos de licenças da cartografia

### d3-geo — ISC e GeographicLib — MIT

```text
Copyright 2010-2024 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.

This license applies to GeographicLib, versions 1.12 and later.

Copyright 2008-2012 Charles Karney

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### d3-array — ISC

```text
Copyright 2010-2023 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### internmap — ISC

```text
Copyright 2021 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### topojson-client — ISC

```text
Copyright 2012-2019 Michael Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### commander — MIT

```text
(The MIT License)

Copyright (c) 2011 TJ Holowaychuk <tj@vision-media.ca>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### world-atlas — ISC

```text
Copyright 2013-2019 Michael Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

## Atualização documental — 02/10/2026 (LCV-183 / LCV-211)

O Vitest 5.0.3 seleciona `why-is-node-running` 3.2.1, cuja publicação oficial não depende de `stackback`. A árvore exata permanece nos lockfiles regenerados pelo npm. Fonte: https://github.com/vitest-dev/vitest/pull/11316 e https://github.com/vitest-dev/vitest/releases/tag/v5.0.3. Esta atualização de ferramenta de teste não afirma incorporação no produto distribuído.

O pacote independente `tlsrpt-motor` usa Vitest 5.0.3 com o preview oficial de `@cloudflare/vitest-plugin` produzido pela PR Cloudflare workers-sdk #15500 no commit `160d3a445597e650500253831000f3dffc624fa8`. Esse artefato declara o peer `vitest ^4.1.11 || ^5.0.0`; a árvore npm deste pacote não inclui `stackback`. Trata-se de preview de uma PR não mesclada, distinto da publicação estável de mesmo número de versão. O Wrangler direto permanece no artefato npm oficial de 4.147.0, identificado pela URL imutável no manifesto; os previews de Wrangler e Miniflare necessários à integração de testes permanecem transitivos e isolados. Nenhum peer foi forçado e nenhuma exceção de licença foi criada. O uso histórico de `stackback` não é retroativamente declarado resolvido. Overrides nativos do npm fixam os descendentes de deploy de Wrangler nos tarballs oficiais de `miniflare` 5.20261001.0-alpha, `@cloudflare/kv-asset-handler` 0.5.0 e `@cloudflare/unenv-preset` 2.16.2, preservando os URLs de preview somente na subárvore do plugin. O override por versão de `@jridgewell/trace-mapping@0.3.9` conserva o codec 1.5.5 compatível com `^1.4.10`; `magic-string` 1.4.2 e a árvore Vitest mantêm o codec 1.6.0 exigido por seus manifests publicados. Todos os 91 artefatos da closure de deploy preservam nome, versão, origem e integridade da base, sem downgrade global ou peers forçados. O override de `picomatch` usa 4.0.7, atendendo ao mínimo `^4.0.7` do manifesto original publicado de Vitest 5.0.3 e às faixas originais de Vite, tinyglobby e fdir. O tarball oficial dessa versão inclui seu texto MIT integral; essa atualização da árvore de testes não altera nenhum dos 91 artefatos transitivos de deploy.

## Proveniência do preview de testes TLS-RPT

A integração é produzida pelo workflow oficial Continuous Releases da PR [cloudflare/workers-sdk #15500](https://github.com/cloudflare/workers-sdk/pull/15500). O pacote direto usa o SHA completo; as referências transitivas do produtor usam o prefixo do mesmo commit e seus bytes ficam fixados por SRI no lockfile npm. A PR continua sujeita à revisão e publicação do upstream; o preview não é apresentado como release estável homologada.

Os cinco artefatos de preview não incluem arquivos de licença no tarball. Os textos oficiais abaixo vêm do mesmo commit de origem e cobrem o código do próprio workers-sdk conforme as declarações de cada pacote. Eles não certificam por si só todos os componentes de terceiros incorporados aos bundles. As expressões OR foram preservadas; não se criou eleição nova.

| Componente do preview          | Expressão declarada | Fonte exata                                                                                                         |
| ------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `@cloudflare/vitest-plugin`    | `MIT`               | <https://github.com/cloudflare/workers-sdk/tree/160d3a445597e650500253831000f3dffc624fa8/packages/vitest-plugin>    |
| `miniflare`                    | `MIT`               | <https://github.com/cloudflare/workers-sdk/tree/160d3a445597e650500253831000f3dffc624fa8/packages/miniflare>        |
| `wrangler`                     | `MIT OR Apache-2.0` | <https://github.com/cloudflare/workers-sdk/tree/160d3a445597e650500253831000f3dffc624fa8/packages/wrangler>         |
| `@cloudflare/kv-asset-handler` | `MIT OR Apache-2.0` | <https://github.com/cloudflare/workers-sdk/tree/160d3a445597e650500253831000f3dffc624fa8/packages/kv-asset-handler> |
| `@cloudflare/unenv-preset`     | `MIT OR Apache-2.0` | <https://github.com/cloudflare/workers-sdk/tree/160d3a445597e650500253831000f3dffc624fa8/packages/unenv-preset>     |

### workers-sdk — texto MIT integral do commit do preview

Fonte: <https://github.com/cloudflare/workers-sdk/blob/160d3a445597e650500253831000f3dffc624fa8/LICENSE-MIT>.

```text
Copyright (c) 2020 Cloudflare, Inc. <wrangler@cloudflare.com>

Permission is hereby granted, free of charge, to any
person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the
Software without restriction, including without
limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice
shall be included in all copies or substantial portions
of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
```

### workers-sdk — texto Apache-2.0 integral do commit do preview

Fonte: <https://github.com/cloudflare/workers-sdk/blob/160d3a445597e650500253831000f3dffc624fa8/LICENSE-APACHE>.

```text
                              Apache License
                        Version 2.0, January 2004
                     http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

   "License" shall mean the terms and conditions for use, reproduction,
   and distribution as defined by Sections 1 through 9 of this document.

   "Licensor" shall mean the copyright owner or entity authorized by
   the copyright owner that is granting the License.

   "Legal Entity" shall mean the union of the acting entity and all
   other entities that control, are controlled by, or are under common
   control with that entity. For the purposes of this definition,
   "control" means (i) the power, direct or indirect, to cause the
   direction or management of such entity, whether by contract or
   otherwise, or (ii) ownership of fifty percent (50%) or more of the
   outstanding shares, or (iii) beneficial ownership of such entity.

   "You" (or "Your") shall mean an individual or Legal Entity
   exercising permissions granted by this License.

   "Source" form shall mean the preferred form for making modifications,
   including but not limited to software source code, documentation
   source, and configuration files.

   "Object" form shall mean any form resulting from mechanical
   transformation or translation of a Source form, including but
   not limited to compiled object code, generated documentation,
   and conversions to other media types.

   "Work" shall mean the work of authorship, whether in Source or
   Object form, made available under the License, as indicated by a
   copyright notice that is included in or attached to the work
   (an example is provided in the Appendix below).

   "Derivative Works" shall mean any work, whether in Source or Object
   form, that is based on (or derived from) the Work and for which the
   editorial revisions, annotations, elaborations, or other modifications
   represent, as a whole, an original work of authorship. For the purposes
   of this License, Derivative Works shall not include works that remain
   separable from, or merely link (or bind by name) to the interfaces of,
   the Work and Derivative Works thereof.

   "Contribution" shall mean any work of authorship, including
   the original version of the Work and any modifications or additions
   to that Work or Derivative Works thereof, that is intentionally
   submitted to Licensor for inclusion in the Work by the copyright owner
   or by an individual or Legal Entity authorized to submit on behalf of
   the copyright owner. For the purposes of this definition, "submitted"
   means any form of electronic, verbal, or written communication sent
   to the Licensor or its representatives, including but not limited to
   communication on electronic mailing lists, source code control systems,
   and issue tracking systems that are managed by, or on behalf of, the
   Licensor for the purpose of discussing and improving the Work, but
   excluding communication that is conspicuously marked or otherwise
   designated in writing by the copyright owner as "Not a Contribution."

   "Contributor" shall mean Licensor and any individual or Legal Entity
   on behalf of whom a Contribution has been received by Licensor and
   subsequently incorporated within the Work.

2. Grant of Copyright License. Subject to the terms and conditions of
   this License, each Contributor hereby grants to You a perpetual,
   worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   copyright license to reproduce, prepare Derivative Works of,
   publicly display, publicly perform, sublicense, and distribute the
   Work and such Derivative Works in Source or Object form.

3. Grant of Patent License. Subject to the terms and conditions of
   this License, each Contributor hereby grants to You a perpetual,
   worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   (except as stated in this section) patent license to make, have made,
   use, offer to sell, sell, import, and otherwise transfer the Work,
   where such license applies only to those patent claims licensable
   by such Contributor that are necessarily infringed by their
   Contribution(s) alone or by combination of their Contribution(s)
   with the Work to which such Contribution(s) was submitted. If You
   institute patent litigation against any entity (including a
   cross-claim or counterclaim in a lawsuit) alleging that the Work
   or a Contribution incorporated within the Work constitutes direct
   or contributory patent infringement, then any patent licenses
   granted to You under this License for that Work shall terminate
   as of the date such litigation is filed.

4. Redistribution. You may reproduce and distribute copies of the
   Work or Derivative Works thereof in any medium, with or without
   modifications, and in Source or Object form, provided that You
   meet the following conditions:

   (a) You must give any other recipients of the Work or
       Derivative Works a copy of this License; and

   (b) You must cause any modified files to carry prominent notices
       stating that You changed the files; and

   (c) You must retain, in the Source form of any Derivative Works
       that You distribute, all copyright, patent, trademark, and
       attribution notices from the Source form of the Work,
       excluding those notices that do not pertain to any part of
       the Derivative Works; and

   (d) If the Work includes a "NOTICE" text file as part of its
       distribution, then any Derivative Works that You distribute must
       include a readable copy of the attribution notices contained
       within such NOTICE file, excluding those notices that do not
       pertain to any part of the Derivative Works, in at least one
       of the following places: within a NOTICE text file distributed
       as part of the Derivative Works; within the Source form or
       documentation, if provided along with the Derivative Works; or,
       within a display generated by the Derivative Works, if and
       wherever such third-party notices normally appear. The contents
       of the NOTICE file are for informational purposes only and
       do not modify the License. You may add Your own attribution
       notices within Derivative Works that You distribute, alongside
       or as an addendum to the NOTICE text from the Work, provided
       that such additional attribution notices cannot be construed
       as modifying the License.

   You may add Your own copyright statement to Your modifications and
   may provide additional or different license terms and conditions
   for use, reproduction, or distribution of Your modifications, or
   for any such Derivative Works as a whole, provided Your use,
   reproduction, and distribution of the Work otherwise complies with
   the conditions stated in this License.

5. Submission of Contributions. Unless You explicitly state otherwise,
   any Contribution intentionally submitted for inclusion in the Work
   by You to the Licensor shall be under the terms and conditions of
   this License, without any additional terms or conditions.
   Notwithstanding the above, nothing herein shall supersede or modify
   the terms of any separate license agreement you may have executed
   with Licensor regarding such Contributions.

6. Trademarks. This License does not grant permission to use the trade
   names, trademarks, service marks, or product names of the Licensor,
   except as required for reasonable and customary use in describing the
   origin of the Work and reproducing the content of the NOTICE file.

7. Disclaimer of Warranty. Unless required by applicable law or
   agreed to in writing, Licensor provides the Work (and each
   Contributor provides its Contributions) on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
   implied, including, without limitation, any warranties or conditions
   of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
   PARTICULAR PURPOSE. You are solely responsible for determining the
   appropriateness of using or redistributing the Work and assume any
   risks associated with Your exercise of permissions under this License.

8. Limitation of Liability. In no event and under no legal theory,
   whether in tort (including negligence), contract, or otherwise,
   unless required by applicable law (such as deliberate and grossly
   negligent acts) or agreed to in writing, shall any Contributor be
   liable to You for damages, including any direct, indirect, special,
   incidental, or consequential damages of any character arising as a
   result of this License or out of the use or inability to use the
   Work (including but not limited to damages for loss of goodwill,
   work stoppage, computer failure or malfunction, or any and all
   other commercial damages or losses), even if such Contributor
   has been advised of the possibility of such damages.

9. Accepting Warranty or Additional Liability. While redistributing
   the Work or Derivative Works thereof, You may choose to offer,
   and charge a fee for, acceptance of support, warranty, indemnity,
   or other liability obligations and/or rights consistent with this
   License. However, in accepting such obligations, You may act only
   on Your own behalf and on Your sole responsibility, not on behalf
   of any other Contributor, and only if You agree to indemnify,
   defend, and hold each Contributor harmless for any liability
   incurred by, or claims asserted against, such Contributor by reason
   of your accepting any such warranty or additional liability.

END OF TERMS AND CONDITIONS
```

### @napi-rs/wasm-runtime — grant de origem para a dependência opcional

O artefato npm 1.2.4 não inclui LICENSE. A attestation oficial associa seu digest ao commit `7e3f293e2d6a3032eabfe51ff38bcaa82d342a2f` de napi-rs/napi-rs. O texto abaixo reproduz o LICENSE desse commit, aplicável ao código do próprio projeto; não é uma certificação integral do código de terceiros incorporado ao bundle `dist/fs.js`. Essa dependência opcional resolve `@tybys/wasm-util` 0.10.4.

Fonte: <https://github.com/napi-rs/napi-rs/blob/7e3f293e2d6a3032eabfe51ff38bcaa82d342a2f/LICENSE>.

```text
MIT License

Copyright (c) 2020-present LongYinan

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
SOFTWARE.

MIT License

Copyright (c) 2018 GitHub

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
SOFTWARE.
```

## Avisos suplementares das Pages Functions — 03/10/2026

Estes avisos completam os textos dos componentes abaixo efetivamente selecionados pelo empacotamento nativo das Pages Functions. O escopo foi conferido no metafile do artefato preservado do mesmo build, distinguindo o código de runtime das dependências usadas somente como ferramentas. Os manifestos e lockfiles continuam sendo as fontes das resoluções exatas. Este suplemento integra o aviso canônico e sua cópia pública em `legal/THIRDPARTY.md`; não substitui os demais avisos nem declara conformidade retroativa de entregas anteriores.

| Componente selecionado | Versão | Licença declarada | Fonte oficial |
| --- | --- | --- | --- |
| `path-to-regexp` | 6.3.0 | MIT | https://github.com/pillarjs/path-to-regexp |
| `unenv` | 2.0.0-rc.24 | MIT | https://github.com/unjs/unenv |
| `@cloudflare/unenv-preset` | 2.16.2 | MIT OR Apache-2.0 | https://github.com/cloudflare/workers-sdk/tree/6e7712725698df46db9ec25ac738dd155ff8d39e/packages/unenv-preset |

Os textos de `path-to-regexp` e `unenv` vêm integralmente dos respectivos tarballs npm oficiais cujas integridades SHA-512 coincidem com o lockfile produtor: https://registry.npmjs.org/path-to-regexp/-/path-to-regexp-6.3.0.tgz e https://registry.npmjs.org/unenv/-/unenv-2.0.0-rc.24.tgz.

O tarball oficial https://registry.npmjs.org/@cloudflare/unenv-preset/-/unenv-preset-2.16.2.tgz não inclui um arquivo de licença. Sua proveniência publicada no registro npm identifica o commit `6e7712725698df46db9ec25ac738dd155ff8d39e` de `cloudflare/workers-sdk`; o digest SHA-512 do subject publicado coincide com o tarball selecionado. Os dois textos abaixo vêm desse commit exato e conservam a expressão `MIT OR Apache-2.0`, sem nova eleição. Essa leitura da proveniência publicada não é apresentada como verificação criptográfica da atestação. O preset selecionado em runtime é distinto do preview de testes documentado acima.

### path-to-regexp 6.3.0 — MIT

Fonte: https://registry.npmjs.org/path-to-regexp/-/path-to-regexp-6.3.0.tgz

```text
The MIT License (MIT)

Copyright (c) 2014 Blake Embrey (hello@blakeembrey.com)

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
THE SOFTWARE.
```

### unenv 2.0.0-rc.24 — MIT

Fonte: https://registry.npmjs.org/unenv/-/unenv-2.0.0-rc.24.tgz

```text
MIT License

Copyright (c) Pooya Parsa <pooya@pi0.io>

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
SOFTWARE.
```

### @cloudflare/unenv-preset 2.16.2 — texto MIT

Fonte: https://github.com/cloudflare/workers-sdk/blob/6e7712725698df46db9ec25ac738dd155ff8d39e/LICENSE-MIT

```text
Copyright (c) 2020 Cloudflare, Inc. <wrangler@cloudflare.com>

Permission is hereby granted, free of charge, to any
person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the
Software without restriction, including without
limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice
shall be included in all copies or substantial portions
of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
```

### @cloudflare/unenv-preset 2.16.2 — texto Apache-2.0

Fonte: https://github.com/cloudflare/workers-sdk/blob/6e7712725698df46db9ec25ac738dd155ff8d39e/LICENSE-APACHE

```text
                              Apache License
                        Version 2.0, January 2004
                     http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

   "License" shall mean the terms and conditions for use, reproduction,
   and distribution as defined by Sections 1 through 9 of this document.

   "Licensor" shall mean the copyright owner or entity authorized by
   the copyright owner that is granting the License.

   "Legal Entity" shall mean the union of the acting entity and all
   other entities that control, are controlled by, or are under common
   control with that entity. For the purposes of this definition,
   "control" means (i) the power, direct or indirect, to cause the
   direction or management of such entity, whether by contract or
   otherwise, or (ii) ownership of fifty percent (50%) or more of the
   outstanding shares, or (iii) beneficial ownership of such entity.

   "You" (or "Your") shall mean an individual or Legal Entity
   exercising permissions granted by this License.

   "Source" form shall mean the preferred form for making modifications,
   including but not limited to software source code, documentation
   source, and configuration files.

   "Object" form shall mean any form resulting from mechanical
   transformation or translation of a Source form, including but
   not limited to compiled object code, generated documentation,
   and conversions to other media types.

   "Work" shall mean the work of authorship, whether in Source or
   Object form, made available under the License, as indicated by a
   copyright notice that is included in or attached to the work
   (an example is provided in the Appendix below).

   "Derivative Works" shall mean any work, whether in Source or Object
   form, that is based on (or derived from) the Work and for which the
   editorial revisions, annotations, elaborations, or other modifications
   represent, as a whole, an original work of authorship. For the purposes
   of this License, Derivative Works shall not include works that remain
   separable from, or merely link (or bind by name) to the interfaces of,
   the Work and Derivative Works thereof.

   "Contribution" shall mean any work of authorship, including
   the original version of the Work and any modifications or additions
   to that Work or Derivative Works thereof, that is intentionally
   submitted to Licensor for inclusion in the Work by the copyright owner
   or by an individual or Legal Entity authorized to submit on behalf of
   the copyright owner. For the purposes of this definition, "submitted"
   means any form of electronic, verbal, or written communication sent
   to the Licensor or its representatives, including but not limited to
   communication on electronic mailing lists, source code control systems,
   and issue tracking systems that are managed by, or on behalf of, the
   Licensor for the purpose of discussing and improving the Work, but
   excluding communication that is conspicuously marked or otherwise
   designated in writing by the copyright owner as "Not a Contribution."

   "Contributor" shall mean Licensor and any individual or Legal Entity
   on behalf of whom a Contribution has been received by Licensor and
   subsequently incorporated within the Work.

2. Grant of Copyright License. Subject to the terms and conditions of
   this License, each Contributor hereby grants to You a perpetual,
   worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   copyright license to reproduce, prepare Derivative Works of,
   publicly display, publicly perform, sublicense, and distribute the
   Work and such Derivative Works in Source or Object form.

3. Grant of Patent License. Subject to the terms and conditions of
   this License, each Contributor hereby grants to You a perpetual,
   worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   (except as stated in this section) patent license to make, have made,
   use, offer to sell, sell, import, and otherwise transfer the Work,
   where such license applies only to those patent claims licensable
   by such Contributor that are necessarily infringed by their
   Contribution(s) alone or by combination of their Contribution(s)
   with the Work to which such Contribution(s) was submitted. If You
   institute patent litigation against any entity (including a
   cross-claim or counterclaim in a lawsuit) alleging that the Work
   or a Contribution incorporated within the Work constitutes direct
   or contributory patent infringement, then any patent licenses
   granted to You under this License for that Work shall terminate
   as of the date such litigation is filed.

4. Redistribution. You may reproduce and distribute copies of the
   Work or Derivative Works thereof in any medium, with or without
   modifications, and in Source or Object form, provided that You
   meet the following conditions:

   (a) You must give any other recipients of the Work or
       Derivative Works a copy of this License; and

   (b) You must cause any modified files to carry prominent notices
       stating that You changed the files; and

   (c) You must retain, in the Source form of any Derivative Works
       that You distribute, all copyright, patent, trademark, and
       attribution notices from the Source form of the Work,
       excluding those notices that do not pertain to any part of
       the Derivative Works; and

   (d) If the Work includes a "NOTICE" text file as part of its
       distribution, then any Derivative Works that You distribute must
       include a readable copy of the attribution notices contained
       within such NOTICE file, excluding those notices that do not
       pertain to any part of the Derivative Works, in at least one
       of the following places: within a NOTICE text file distributed
       as part of the Derivative Works; within the Source form or
       documentation, if provided along with the Derivative Works; or,
       within a display generated by the Derivative Works, if and
       wherever such third-party notices normally appear. The contents
       of the NOTICE file are for informational purposes only and
       do not modify the License. You may add Your own attribution
       notices within Derivative Works that You distribute, alongside
       or as an addendum to the NOTICE text from the Work, provided
       that such additional attribution notices cannot be construed
       as modifying the License.

   You may add Your own copyright statement to Your modifications and
   may provide additional or different license terms and conditions
   for use, reproduction, or distribution of Your modifications, or
   for any such Derivative Works as a whole, provided Your use,
   reproduction, and distribution of the Work otherwise complies with
   the conditions stated in this License.

5. Submission of Contributions. Unless You explicitly state otherwise,
   any Contribution intentionally submitted for inclusion in the Work
   by You to the Licensor shall be under the terms and conditions of
   this License, without any additional terms or conditions.
   Notwithstanding the above, nothing herein shall supersede or modify
   the terms of any separate license agreement you may have executed
   with Licensor regarding such Contributions.

6. Trademarks. This License does not grant permission to use the trade
   names, trademarks, service marks, or product names of the Licensor,
   except as required for reasonable and customary use in describing the
   origin of the Work and reproducing the content of the NOTICE file.

7. Disclaimer of Warranty. Unless required by applicable law or
   agreed to in writing, Licensor provides the Work (and each
   Contributor provides its Contributions) on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
   implied, including, without limitation, any warranties or conditions
   of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
   PARTICULAR PURPOSE. You are solely responsible for determining the
   appropriateness of using or redistributing the Work and assume any
   risks associated with Your exercise of permissions under this License.

8. Limitation of Liability. In no event and under no legal theory,
   whether in tort (including negligence), contract, or otherwise,
   unless required by applicable law (such as deliberate and grossly
   negligent acts) or agreed to in writing, shall any Contributor be
   liable to You for damages, including any direct, indirect, special,
   incidental, or consequential damages of any character arising as a
   result of this License or out of the use or inability to use the
   Work (including but not limited to damages for loss of goodwill,
   work stoppage, computer failure or malfunction, or any and all
   other commercial damages or losses), even if such Contributor
   has been advised of the possibility of such damages.

9. Accepting Warranty or Additional Liability. While redistributing
   the Work or Derivative Works thereof, You may choose to offer,
   and charge a fee for, acceptance of support, warranty, indemnity,
   or other liability obligations and/or rights consistent with this
   License. However, in accepting such obligations, You may act only
   on Your own behalf and on Your sole responsibility, not on behalf
   of any other Contributor, and only if You agree to indemnify,
   defend, and hold each Contributor harmless for any liability
   incurred by, or claims asserted against, such Contributor by reason
   of your accepting any such warranty or additional liability.

END OF TERMS AND CONDITIONS
```

### @cloudflare/unenv-preset 2.16.2 — texto MIT específico do pacote

Fonte: <https://github.com/cloudflare/workers-sdk/blob/6e7712725698df46db9ec25ac738dd155ff8d39e/packages/unenv-preset/LICENSE-MIT>.

O aviso a seguir é o texto integral do pacote no mesmo commit de origem do artefato de runtime já identificado. A expressão `MIT OR Apache-2.0` permanece preservada; este complemento de atribuição não estabelece uma nova eleição.

```text
Copyright (c) 2024 Pooya Parsa <pooya@pi0.io> & Cloudflare, Inc. <wrangler@cloudflare.com>

Permission is hereby granted, free of charge, to any
person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the
Software without restriction, including without
limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice
shall be included in all copies or substantial portions
of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
```
