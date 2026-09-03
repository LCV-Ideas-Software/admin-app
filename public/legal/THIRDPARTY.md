# Inventário de componentes de terceiros

Este documento separa os dois manifestos do repositório. Cada linha corresponde a uma dependência direta declarada e a identifica por nome, licença e fonte: a expressão SPDX publicada no pacote, com a eleição explícita quando a expressão contém `OR`, e a URL do repositório upstream declarado pelo próprio pacote. A coluna **Escopo** reproduz a declaração no manifesto e não presume se o componente foi ou não empacotado. Versões, intervalos e resoluções imutáveis das dependências diretas vivem em `package.json`, `tlsrpt-motor/package.json` e nos respectivos lockfiles, onde o Dependabot as atualiza, e não se repetem nestas tabelas; o grafo de dependências do GitHub é o inventário versionado e fornece o SBOM sob demanda. Os complementos abaixo e o `NOTICE` continuam fixados à versão instalada e exigem atualização manual a cada bump; o módulo Text do Admin Motor lista os pacotes incorporados por nome, licença e fonte.

No build público, o recurso nativo `build.license` do Vite gera `legal/BUNDLED-LICENSES.md` diretamente do grafo efetivamente empacotado, incluindo dependências transitivas e componentes declarados como desenvolvimento que acabem no bundle. Quando o pacote publica um arquivo reconhecido, o inventário reproduz o texto; algumas seções podem ficar vazias. Os avisos abaixo fornecem suplementos documentados para essas lacunas, código vendorizado, eleições e ativos. A divulgação do build público é o conjunto dos dois arquivos; nenhum é declarado completo isoladamente.

## Inventário: package.json (raiz)

| Escopo      | Componente                            | Licença                                     | Fonte                                                       |
| ----------- | ------------------------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| runtime     | @codemirror/lang-javascript           | MIT                                         | https://github.com/codemirror/lang-javascript               |
| runtime     | @fontsource/inter                     | OFL-1.1                                     | https://github.com/fontsource/font-files                    |
| runtime     | @radix-ui/react-dialog                | MIT                                         | https://github.com/radix-ui/primitives                      |
| runtime     | @tanstack/react-query                 | MIT                                         | https://github.com/TanStack/query                           |
| runtime     | @tanstack/react-query-devtools        | MIT                                         | https://github.com/TanStack/query                           |
| runtime     | @tiptap/core                          | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-character-count     | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-code-block-lowlight | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-collaboration       | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-color               | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-drag-handle         | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-drag-handle-react   | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-dropcursor          | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-focus               | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-font-family         | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-highlight           | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-image               | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-link                | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-mention             | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-node-range          | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-placeholder         | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-subscript           | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-superscript         | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-table               | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-table-cell          | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-table-header        | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-table-row           | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-task-item           | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-task-list           | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-text-align          | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-text-style          | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-typography          | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/extension-youtube             | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/pm                            | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/react                         | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/starter-kit                   | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/suggestion                    | MIT                                         | https://github.com/ueberdosis/tiptap                        |
| runtime     | @tiptap/y-tiptap                      | MIT                                         | https://github.com/ueberdosis/y-tiptap                      |
| runtime     | codemirror                            | MIT                                         | https://github.com/codemirror/basic-setup                   |
| runtime     | croner                                | MIT                                         | https://github.com/hexagon/croner                           |
| runtime     | cronstrue                             | MIT                                         | https://github.com/bradymholt/cRonstrue                     |
| runtime     | d3-geo                                | ISC                                         | https://github.com/d3/d3-geo                                |
| runtime     | dompurify                             | (MPL-2.0 OR Apache-2.0), eleição Apache-2.0 | https://github.com/cure53/DOMPurify                         |
| runtime     | hono                                  | MIT                                         | https://github.com/honojs/hono                              |
| runtime     | lowlight                              | MIT                                         | https://github.com/wooorm/lowlight                          |
| runtime     | lucide-react                          | ISC                                         | https://github.com/lucide-icons/lucide                      |
| runtime     | mammoth                               | BSD-2-Clause                                | https://github.com/mwilliamson/mammoth.js                   |
| runtime     | marked                                | MIT                                         | https://github.com/markedjs/marked                          |
| runtime     | prosemirror-model                     | MIT                                         | https://code.haverbeke.berlin/prosemirror/prosemirror-model |
| runtime     | prosemirror-state                     | MIT                                         | https://github.com/prosemirror/prosemirror-state            |
| runtime     | prosemirror-view                      | MIT                                         | https://code.haverbeke.berlin/prosemirror/prosemirror-view  |
| runtime     | react                                 | MIT                                         | https://github.com/react/react                              |
| runtime     | react-dom                             | MIT                                         | https://github.com/react/react                              |
| runtime     | sanitize-html                         | MIT                                         | https://github.com/apostrophecms/apostrophe                 |
| runtime     | spark-md5                             | (WTFPL OR MIT), eleição MIT                 | https://github.com/satazor/js-spark-md5                     |
| runtime     | tiptap-markdown                       | MIT                                         | https://github.com/aguingand/tiptap-markdown                |
| runtime     | topojson-client                       | ISC                                         | https://github.com/topojson/topojson-client                 |
| runtime     | world-atlas                           | ISC                                         | https://github.com/topojson/world-atlas                     |
| runtime     | y-protocols                           | MIT                                         | https://github.com/yjs/y-protocols                          |
| runtime     | yjs                                   | MIT                                         | https://github.com/yjs/yjs                                  |
| development | @biomejs/biome                        | MIT OR Apache-2.0, eleição MIT              | https://github.com/biomejs/biome                            |
| development | @cloudflare/workers-types             | MIT OR Apache-2.0, eleição MIT              | https://github.com/cloudflare/workerd                       |
| development | @eslint/js                            | MIT                                         | https://github.com/eslint/eslint                            |
| development | @playwright/test                      | Apache-2.0                                  | https://github.com/microsoft/playwright                     |
| development | @testing-library/dom                  | MIT                                         | https://github.com/testing-library/dom-testing-library      |
| development | @testing-library/jest-dom             | MIT                                         | https://github.com/testing-library/jest-dom                 |
| development | @testing-library/react                | MIT                                         | https://github.com/testing-library/react-testing-library    |
| development | @testing-library/user-event           | MIT                                         | https://github.com/testing-library/user-event               |
| development | @types/d3-geo                         | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped          |
| development | @types/node                           | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped          |
| development | @types/react                          | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped          |
| development | @types/react-dom                      | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped          |
| development | @types/sanitize-html                  | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped          |
| development | @types/spark-md5                      | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped          |
| development | @types/topojson-client                | MIT                                         | https://github.com/DefinitelyTyped/DefinitelyTyped          |
| development | @vitejs/plugin-react                  | MIT                                         | https://github.com/vitejs/vite-plugin-react                 |
| development | @vitest/coverage-v8                   | MIT                                         | https://github.com/vitest-dev/vitest                        |
| development | @vitest/ui                            | MIT                                         | https://github.com/vitest-dev/vitest                        |
| development | eslint                                | MIT                                         | https://github.com/eslint/eslint                            |
| development | eslint-config-prettier                | MIT                                         | https://github.com/prettier/eslint-config-prettier          |
| development | eslint-plugin-react-hooks             | MIT                                         | https://github.com/facebook/react                           |
| development | eslint-plugin-react-refresh           | MIT                                         | https://github.com/ArnaudBarre/eslint-plugin-react-refresh  |
| development | globals                               | MIT                                         | https://github.com/sindresorhus/globals                     |
| development | happy-dom                             | MIT                                         | https://github.com/capricorn86/happy-dom                    |
| development | husky                                 | MIT                                         | https://github.com/typicode/husky                           |
| development | knip                                  | ISC                                         | https://github.com/webpro-nl/knip                           |
| development | lightningcss                          | MPL-2.0                                     | https://github.com/parcel-bundler/lightningcss              |
| development | lint-staged                           | MIT                                         | https://github.com/lint-staged/lint-staged                  |
| development | prettier                              | MIT                                         | https://github.com/prettier/prettier                        |
| development | rollup-plugin-visualizer              | MIT                                         | https://github.com/btd/rollup-plugin-visualizer             |
| development | typescript                            | Apache-2.0                                  | https://github.com/microsoft/TypeScript                     |
| development | typescript-eslint                     | MIT                                         | https://github.com/typescript-eslint/typescript-eslint      |
| development | vite                                  | MIT                                         | https://github.com/vitejs/vite                              |
| development | vitest                                | MIT                                         | https://github.com/vitest-dev/vitest                        |
| development | wrangler                              | MIT OR Apache-2.0, eleição MIT              | https://github.com/cloudflare/workers-sdk                   |

## Inventário: tlsrpt-motor/package.json

| Escopo      | Componente                      | Licença                        | Fonte                                     |
| ----------- | ------------------------------- | ------------------------------ | ----------------------------------------- |
| runtime     | postal-mime                     | MIT-0                          | https://github.com/postalsys/postal-mime  |
| development | @biomejs/biome                  | MIT OR Apache-2.0, eleição MIT | https://github.com/biomejs/biome          |
| development | @cloudflare/vitest-pool-workers | MIT                            | https://github.com/cloudflare/workers-sdk |
| development | vitest                          | MIT                            | https://github.com/vitest-dev/vitest      |
| development | wrangler                        | MIT OR Apache-2.0, eleição MIT | https://github.com/cloudflare/workers-sdk |

## Componente incorporado ao Worker TLS-RPT

`postal-mime@3.0.0` é publicado sob MIT-0, mas incorpora em
`src/base64-encoder.js` o componente `base64ArrayBuffer`, de Jon Leighton, sob
MIT clássica. O Worker usa esse código em runtime. Como o comentário original
não possui um marcador de comentário legal reconhecido pelo esbuild, o
entrypoint local reproduz o aviso abaixo com `/*!`, formato preservado pelo
empacotador oficial usado pelo Wrangler.

| Componente                       | Relação com o Worker                                               | Licença aplicada | Proveniência imutável                                                                                                                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| base64ArrayBuffer (Jon Leighton) | Incorporado por `postal-mime@3.0.0` e alcançável no bundle TLS-RPT | MIT              | Tarball `https://registry.npmjs.org/postal-mime/-/postal-mime-3.0.0.tgz`; SRI `sha512-Z4a9ar2Bv3YpK3IXag+Yda30k7bMZfpRuUGyqtHnZ2pjHG8Bl62EhZIk4n1dzv00gfzP9g+94e9kd8+XmjVWLA==`; `src/base64-encoder.js` SHA-256 `71161FF0AB6BEDF58A047D3FC5631B50D5F60655938A418D9F49CAC75BC01251` |

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

| Componente                           | Relação com o bundle                                                                                                     | Licença aplicada                              | Proveniência imutável                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSZip 3.10.1                         | Incorporado por Mammoth e detectado pelo inventário nativo do Vite                                                       | `(MIT OR GPL-3.0-or-later)`; eleição: **MIT** | SRI `sha512-xXDvecyTpGLrqFrvkrUSoxxfJI5AH7U8zxxtVclpsUtMCq4JQ290LY8AW5c7Ggnr/Y/oK+bQMbqK2qmtk3pN4g==`; `https://registry.npmjs.org/jszip/-/jszip-3.10.1.tgz`                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Pako 1.0.5                           | Vendorizado na distribuição browser do JSZip 3.10.1; não recebe seção própria do inventário nativo                       | `(MIT AND Zlib)`; **ambas** se aplicam        | JSZip `v3.10.1`/commit `0f2f1e4d0509514417db83fe5b86bde90e0ffe8d`; lock oficial fixa `pako@1.0.5`; `dist/jszip.min.js` SHA-256 `ACC7E41455A80765B5FD9C7EE1B8078A6D160BBBCA455AEAE854DE65C947D59E`; SRI `sha512-umumrxStF9I4G8OZlhzEgTlwktjp4bofYq7E0mfH/IM7fctJ1pzLBhVrhNmP86hA1b3RNP5gAzxJJ4mjj0Up6Q==`; `https://registry.npmjs.org/pako/-/pako-1.0.5.tgz`                                                                                                                                                                                                                                                                      |
| Spark MD5 3.0.2                      | Dependência direta detectada pelo Vite; o projeto usa a alternativa oficial MIT                                          | `(WTFPL OR MIT)`; eleição: **MIT**            | tag oficial `v3.0.2`, commit `9315385868fe11076674d4ddd763005319a462a7`, arquivo `LICENSE2`, SHA-256 `6E7ABBD885F650C938CF377A6EDCAD56C7DCB61DE092853AF6141D806F8C9F04`                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| dingbat-to-unicode 1.0.1             | Detectado pelo Vite; o tarball não contém arquivo de licença e o suplemento preserva somente evidência exata             | BSD-2-Clause; aviso de copyright inconclusivo | SRI `sha512-98l0sW87ZT58pU4i61wa2OHwxbiYSbuxsCBozaVnYX2iCnr3bLM3fIes1/ej7h1YdOKuKt/MLs706TVnALA65w==`; `https://registry.npmjs.org/dingbat-to-unicode/-/dingbat-to-unicode-1.0.1.tgz`; `package/package.json` SHA-256 `E34A07AF5C8074EC60FDC1F9DB775D117D2B2F985D88175C455C9FC37F898D59`, byte-idêntico ao blob `ebe4c8b90b43316a9e2a2e4cdf3a075895aecf60` da tag anotada `js-1.0.1`, objeto `bf8184cc2522b6f30a4c35e5062418382ff03667`, commit `b27f259b49907f99b1b9097abba5a9668106b779`                                                                                                                                        |
| react-remove-scroll-bar 2.3.8        | Detectado pelo Vite; o tarball não contém arquivo de licença e o suplemento preserva somente evidência exata             | MIT; aviso de copyright inconclusivo          | SRI `sha512-9r+yi9+mgU33AKcj6IbT9oRCO78WriSj6t/cF8DWBZJ9aOGPOTEDvdUDz1FwKim7QXWwmHqtdHnRJfhAxEG46Q==`; `https://registry.npmjs.org/react-remove-scroll-bar/-/react-remove-scroll-bar-2.3.8.tgz`; `package/package.json` SHA-256 `E372F857CE05F266137C65293436B5380FEC42AC311E6ACB9378ED78B98D75D0`; `package/README.md` SHA-256 `486442209236FFA3893312E508694699A6B8834D30A2F9C083C1F3379983E4F9`; `gitHead` npm `b3b1287aad81def2e2ae707274b74531b61ddbaf` não alcançável; `LICENSE` posterior no commit `7301c160fda44cb8cf2b9fdfde61efad35736196`, SHA-256 `A79AAE0C0F21990D9D963BB3C5A79CDCEA9A46F8523BA55C58D7FE776B6EBC84` |
| Assets do scaffold create-vite 8.0.0 | `src/assets/hero.png`, `react.svg` e `vite.svg`; distribuídos no código-fonte, sem consumidores e fora do bundle público | MIT                                           | tag oficial `v8.0.0`, commit `b565af6f1123a62b3058253b2147574b8515e89f`; SHA-256 respectivos `72A860570EDDF1DD9988F26C7106C67BE286BC9F2FD3303C465CE87EDB1AE6CD`, `35EF61ED53B323AE94A16A8EC659B3D0AF3880698791133F23B084085AB1C2E5` e `5BE21ACD42EB7B896E517F4E0F0F11EB5C5D9E54FBBCEBE9453F033008FCCA6F`; licença SHA-256 `692057AF3D664CBB79AC38293EB50AA3C4987F8182E2A440136E59E08F1B4A54`                                                                                                                                                                                                                                      |

### Assets do scaffold create-vite 8.0.0 — MIT

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

### JSZip 3.10.1 — MIT

O texto MIT integral do JSZip é preservado automaticamente em
`legal/BUNDLED-LICENSES.md`. A eleição acima evita aplicar a alternativa GPLv3
ao componente.

### Pako 1.0.5 — MIT e Zlib

Embora o lockfile deste repositório também resolva `pako@1.0.11` como pacote
transitivo, o campo `browser` do JSZip seleciona `dist/jszip.min.js`, gerado com
`pako@1.0.5` segundo o lockfile oficial e imutável do próprio JSZip 3.10.1. Os
avisos a seguir correspondem aos bytes efetivamente distribuídos.

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

### Spark MD5 3.0.2 — MIT

O repositório oficial oferece a MIT como alternativa no `LICENSE2` da tag
`v3.0.2`; o SHA-256 registrado na tabela de complementos fixa o texto escolhido à versão instalada.

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

### dingbat-to-unicode 1.0.1 — BSD-2-Clause

O tarball npm identificado pelo SRI registrado na tabela de complementos e o `js/package.json` da tag anotada
`js-1.0.1` são byte-idênticos; ambos declaram `BSD-2-Clause` e identificam
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

### react-remove-scroll-bar 2.3.8 — MIT

O `package.json` e o `README.md` do tarball npm identificado pelo SRI registrado na tabela de complementos declaram
`MIT` de forma independente e o manifesto identifica Anton Korzunov como autor.
O `gitHead` publicado no registro npm já não é alcançável no repositório; o
`LICENSE` acrescentado depois apenas corrobora os termos e não comprova o aviso
histórico da versão 2.3.8. Resultado: **INCONCLUSIVO** quanto ao aviso de
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

O mapa planetário de localidade é renderizado no navegador com `d3-geo@3.1.1`,
`topojson-client@3.1.0` e o arquivo `countries-110m.json` de
`world-atlas@2.0.2`. As três dependências estão fixadas exatamente no manifesto
e no lockfile. O arquivo cartográfico deriva dos limites administrativos
Natural Earth 4.1.0 em escala 1:110m. Segundo os
[termos de uso oficiais](https://www.naturalearthdata.com/about/terms-of-use/),
os dados vetoriais e raster Natural Earth são de domínio público.

A base é empacotada no aplicativo. A renderização não solicita tiles nem envia
dados natais ou de navegação a provedores cartográficos externos. “Natural
Earth” identifica a proveniência do mapa-base, não endossa as interpretações ou
o aplicativo.

## Avisos de licenças da cartografia

### d3-geo 3.1.1 — ISC e GeographicLib — MIT

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

### d3-array 3.2.4 — ISC

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

### internmap 2.0.3 — ISC

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

### topojson-client 3.1.0 — ISC

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

### commander 2.20.3 — MIT

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

### world-atlas 2.0.2 — ISC

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
