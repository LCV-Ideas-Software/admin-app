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
| development | @cloudflare/vitest-pool-workers | MIT                            | https://github.com/cloudflare/workers-sdk (`packages/vitest-pool-workers`) |
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
| dingbat-to-unicode             | Detectado pelo Vite; o tarball não contém arquivo de licença e o suplemento preserva somente evidência exata             | BSD-2-Clause; aviso de copyright inconclusivo | <https://github.com/mwilliamson/dingbat-to-unicode>            |
| react-remove-scroll-bar        | Detectado pelo Vite; o tarball não contém arquivo de licença e o suplemento preserva somente evidência exata             | MIT; aviso de copyright inconclusivo          | <https://github.com/theKashey/react-remove-scroll-bar>         |
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

O tarball npm e o `js/package.json` da tag correspondente no repositório
upstream são byte-idênticos; ambos declaram `BSD-2-Clause` e identificam
Michael Williamson como autor. O
[contrato oficial do npm](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#license)
usa o identificador SPDX para declarar como o pacote pode ser usado, mas
nenhuma versão upstream contém `LICENSE` ou `COPYING` e o campo `author` não
comprova titularidade. Resultado: **INCONCLUSIVO** quanto ao aviso de copyright
da versão exata. O suplemento separa a atribuição literal do manifesto dos
[termos canônicos da BSD-2-Clause](https://spdx.org/licenses/BSD-2-Clause), sem
inventar titular, ano ou aviso de copyright ausente no upstream.

```text
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```

### react-remove-scroll-bar — MIT

O `package.json` e o `README.md` do tarball npm declaram `MIT` de forma
independente e o manifesto identifica Anton Korzunov como autor.
O `gitHead` publicado no registro npm já não é alcançável no repositório; o
`LICENSE` acrescentado depois apenas corrobora os termos e não comprova o aviso
histórico da versão instalada. Resultado: **INCONCLUSIVO** quanto ao aviso de
copyright da versão exata. O suplemento separa a atribuição literal do manifesto
dos [termos canônicos da MIT](https://spdx.org/licenses/MIT), sem inventar
titular, ano ou aviso de copyright ausente no artefato.

```text
MIT License

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
