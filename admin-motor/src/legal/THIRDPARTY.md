# Avisos de componentes de terceiros — Admin Motor

Este arquivo acompanha o Worker `admin-motor` como módulo adicional do tipo `Text`. O inventário cobre exatamente os 18 pacotes npm com código efetivamente incorporado ao bundle Wrangler informado para este artefato. Pacotes de desenvolvimento, ferramentas externas e entradas desabilitadas de zero byte não pertencem a este escopo.

Versão, licença declarada, URL `resolved` e SRI `integrity` foram conferidos na entrada `packages` de `package-lock.json`; o texto de cada aviso foi reproduzido integralmente do pacote da mesma versão instalado em `node_modules`. O caminho e o SHA-256 de cada fonte permitem verificar o texto sem confundi-lo com outra versão homônima.

## Inventário efetivo

| Componente | Versão | Licença | Caminho no lockfile |
| --- | --- | --- | --- |
| `dayjs` | `1.11.20` | `MIT` | `packages["node_modules/dayjs"]` |
| `deepmerge` | `4.3.1` | `MIT` | `packages["node_modules/deepmerge"]` |
| `dom-serializer` | `3.1.1` | `MIT` | `packages["node_modules/sanitize-html/node_modules/dom-serializer"]` |
| `domelementtype` | `3.0.0` | `BSD-2-Clause` | `packages["node_modules/sanitize-html/node_modules/domelementtype"]` |
| `domhandler` | `6.0.1` | `BSD-2-Clause` | `packages["node_modules/sanitize-html/node_modules/domhandler"]` |
| `domutils` | `4.0.2` | `BSD-2-Clause` | `packages["node_modules/sanitize-html/node_modules/domutils"]` |
| `entities` | `8.0.0` | `BSD-2-Clause` | `packages["node_modules/sanitize-html/node_modules/entities"]` |
| `escape-string-regexp` | `4.0.0` | `MIT` | `packages["node_modules/escape-string-regexp"]` |
| `hono` | `4.13.3` | `MIT` | `packages["node_modules/hono"]` |
| `htmlparser2` | `12.0.0` | `MIT` | `packages["node_modules/sanitize-html/node_modules/htmlparser2"]` |
| `is-plain-object` | `5.0.0` | `MIT` | `packages["node_modules/is-plain-object"]` |
| `launder` | `1.7.1` | `MIT` | `packages["node_modules/launder"]` |
| `marked` | `18.0.10` | `MIT` | `packages["node_modules/marked"]` |
| `nanoid` | `3.3.18` | `MIT` | `packages["node_modules/nanoid"]` |
| `parse-srcset` | `1.0.2` | `MIT` | `packages["node_modules/parse-srcset"]` |
| `picocolors` | `1.1.1` | `ISC` | `packages["node_modules/picocolors"]` |
| `postcss` | `8.5.26` | `MIT` | `packages["node_modules/postcss"]` |
| `sanitize-html` | `2.17.7` | `MIT` | `packages["node_modules/sanitize-html"]` |

## dayjs 1.11.20 — MIT

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/dayjs"]`
- **Resolved:** `https://registry.npmjs.org/dayjs/-/dayjs-1.11.20.tgz`
- **Integrity:** `sha512-YbwwqR/uYpeoP4pu043q+LTDLFBLApUP6VxRihdfNTqu4ubqMlGDLd6ErXhEgsyvY0K6nCs7nggYumAN+9uEuQ==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/dayjs/LICENSE` (`SHA-256: 5faab7526d055651be3aab769d58897be6bd91f3d39d137f25f12dba1b31d5dc`).

```text
MIT License

Copyright (c) 2018-present, iamkun

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

## deepmerge 4.3.1 — MIT

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/deepmerge"]`
- **Resolved:** `https://registry.npmjs.org/deepmerge/-/deepmerge-4.3.1.tgz`
- **Integrity:** `sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/deepmerge/license.txt` (`SHA-256: 6cfc4687cb2f2d86f4a77e6b526290d3878e5e512f3fec2f4cb36a9cb36f798b`).

```text
The MIT License (MIT)

Copyright (c) 2012 James Halliday, Josh Duff, and other contributors

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

## dom-serializer 3.1.1 — MIT

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/sanitize-html/node_modules/dom-serializer"]`
- **Resolved:** `https://registry.npmjs.org/dom-serializer/-/dom-serializer-3.1.1.tgz`
- **Integrity:** `sha512-4MEa38/QexBob6gFNwu+EGdWvhJ1OKuNwdYY3Y3NyeWDQfnGeDYQUDfIRzWu5B5gsv03so2Uxd28YC6zrsx3Lw==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/sanitize-html/node_modules/dom-serializer/LICENSE` (`SHA-256: fd495b1bdd024995c6b3bd612584a4e37513250317bb5a6586f62c7756f9aff1`).

```text
Copyright © 2022 The Cheerio contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## domelementtype 3.0.0 — BSD-2-Clause

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/sanitize-html/node_modules/domelementtype"]`
- **Resolved:** `https://registry.npmjs.org/domelementtype/-/domelementtype-3.0.0.tgz`
- **Integrity:** `sha512-umCQid3jKbDmVjx8jGaW7uUykm4DEUeyV21hPxNMo2nV955DhUThwqyOIDtreepP31hl84X7G5U9ZfsWvIB3Pg==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/sanitize-html/node_modules/domelementtype/LICENSE` (`SHA-256: cb992345949ccd6e8394b2cd6c465f7b897c864f845937dbf64e8997f389e164`).

```text
Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## domhandler 6.0.1 — BSD-2-Clause

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/sanitize-html/node_modules/domhandler"]`
- **Resolved:** `https://registry.npmjs.org/domhandler/-/domhandler-6.0.1.tgz`
- **Integrity:** `sha512-gYzvtM72ZtxQO0T048kd6HWSbbGCNOUwcnfQ01cqIJ4X2IYKFFHZ5mKvrQETcFXxsRObZulDaKmy//R7TPtsBg==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/sanitize-html/node_modules/domhandler/LICENSE` (`SHA-256: cb992345949ccd6e8394b2cd6c465f7b897c864f845937dbf64e8997f389e164`).

```text
Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## domutils 4.0.2 — BSD-2-Clause

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/sanitize-html/node_modules/domutils"]`
- **Resolved:** `https://registry.npmjs.org/domutils/-/domutils-4.0.2.tgz`
- **Integrity:** `sha512-qI4JLRKnSzqFqr7hAlS5xQDusBCjKSEG4t4+7aNrIQMHBcsC2TGEhuyABJdYkgSewL57PNLYEiibY2iPKhKpaA==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/sanitize-html/node_modules/domutils/LICENSE` (`SHA-256: cb992345949ccd6e8394b2cd6c465f7b897c864f845937dbf64e8997f389e164`).

```text
Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## entities 8.0.0 — BSD-2-Clause

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/sanitize-html/node_modules/entities"]`
- **Resolved:** `https://registry.npmjs.org/entities/-/entities-8.0.0.tgz`
- **Integrity:** `sha512-zwfzJecQ/Uej6tusMqwAqU/6KL2XaB2VZ2Jg54Je6ahNBGNH6Ek6g3jjNCF0fG9EWQKGZNddNjU5F1ZQn/sBnA==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/sanitize-html/node_modules/entities/LICENSE` (`SHA-256: cb992345949ccd6e8394b2cd6c465f7b897c864f845937dbf64e8997f389e164`).

```text
Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## escape-string-regexp 4.0.0 — MIT

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/escape-string-regexp"]`
- **Resolved:** `https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz`
- **Integrity:** `sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/escape-string-regexp/license` (`SHA-256: 5c932d88256b4ab958f64a856fa48e8bd1f55bc1d96b8149c65689e0c61789d3`).

```text
MIT License

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## hono 4.13.3 — MIT

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/hono"]`
- **Resolved:** `https://registry.npmjs.org/hono/-/hono-4.13.3.tgz`
- **Integrity:** `sha512-r8AO2mYHoLxSHkgafNeC/BXyb2vWRxD3jem4Ts+ptav8oTG5FIRifAjuJEmZI4bSvvc2ns0GxmIYiZnHqN3mMw==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/hono/LICENSE` (`SHA-256: a6ab98e5c77b9070c443eaff2ff81034a6f8cc05a7524d5098eb0f24defa0115`).

```text
MIT License

Copyright (c) 2021 - present, Yusuke Wada and Hono contributors

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

## htmlparser2 12.0.0 — MIT

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/sanitize-html/node_modules/htmlparser2"]`
- **Resolved:** `https://registry.npmjs.org/htmlparser2/-/htmlparser2-12.0.0.tgz`
- **Integrity:** `sha512-Tz7u1i95/g2x2jz81+x0FBVhBhY5aRTvD3tXXdFaljuNdzDLJ8UGNRrTcj2cgQvAg3iW/h77Fz15nLW0L0CrZw==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/sanitize-html/node_modules/htmlparser2/LICENSE` (`SHA-256: 204cfa747341660e4da64cd23e8c876c6b20279d247f48564993d3fc4a2eab47`).

```text
Copyright 2010, 2011, Chris Winberry <chris@winberry.net>. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
```

## is-plain-object 5.0.0 — MIT

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/is-plain-object"]`
- **Resolved:** `https://registry.npmjs.org/is-plain-object/-/is-plain-object-5.0.0.tgz`
- **Integrity:** `sha512-VRSzKkbMm5jMDoKLbltAkFQ5Qr7VDiTFGXxYFXXowVj387GeGNOCsOH6Msy00SGZ3Fp84b1Naa1psqgcCIEP5Q==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/is-plain-object/LICENSE` (`SHA-256: 4cd903859549d4b20b571041f96dfae1136ed079c476126268f9d7cc1b611150`).

```text
The MIT License (MIT)

Copyright (c) 2014-2017, Jon Schlinkert.

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

## launder 1.7.1 — MIT

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/launder"]`
- **Resolved:** `https://registry.npmjs.org/launder/-/launder-1.7.1.tgz`
- **Integrity:** `sha512-mU6WRz5EusL9ZZuiZ5SO4Y6C0P9PAUR9iwdb6bzj4KDihm28DiHFw+/yk9DBH4f+Pv1wuzQ4e2jV3oQ7mkIqvw==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Evidência da licença declarada:** `node_modules/launder/package.json` (`SHA-256: b111ad703bae61d8cef17863c38f4618e813b24284a874d0b81db1b5cfbdf601`).
- **Origem upstream imutável:** tag anotada `launder@1.7.1`, commit `e9b0ab0849a5dfea0f75335fbdf99b5c6bf9e4b3`, caminho `packages/launder` no repositório `apostrophecms/apostrophe`.

O pacote npm e a tag upstream `launder@1.7.1` declaram `MIT`, mas o pacote/tarball dessa versão não traz arquivo `LICENSE`. Por isso, os termos canônicos da MIT são reproduzidos abaixo sem inventar titular, ano ou aviso de copyright ausente no upstream.

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

## marked 18.0.10 — MIT

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/marked"]`
- **Resolved:** `https://registry.npmjs.org/marked/-/marked-18.0.10.tgz`
- **Integrity:** `sha512-FJeH4bRpYoXiggcgriCGItKCSv3xkngJc4QCZ/rkQCogU3VYaLxYJoZl8Nw/b4+x7iij/pd+09mZ6A1dXzpL0A==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/marked/LICENSE` (`SHA-256: 8e3a3f82f59a60958f56ca08f445647c32a4733dc7ca6c2c46f6eb898471ab9c`).

O `LICENSE` de Marked contém tanto os termos MIT de Marked quanto o aviso BSD-3-Clause integral do componente Markdown incorporado; ambos seguem reproduzidos sem redução.

```text
# License information

## Contribution License Agreement

If you contribute code to this project, you are implicitly allowing your code
to be distributed under the MIT license. You are also implicitly verifying that
all code is your original work. `</legalese>`

## Marked

Copyright (c) 2018+, MarkedJS (https://github.com/markedjs/)
Copyright (c) 2011-2018, Christopher Jeffrey (https://github.com/chjj/)

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

## Markdown

Copyright © 2004, John Gruber
http://daringfireball.net/
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name “Markdown” nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

This software is provided by the copyright holders and contributors “as is” and any express or implied warranties, including, but not limited to, the implied warranties of merchantability and fitness for a particular purpose are disclaimed. In no event shall the copyright owner or contributors be liable for any direct, indirect, incidental, special, exemplary, or consequential damages (including, but not limited to, procurement of substitute goods or services; loss of use, data, or profits; or business interruption) however caused and on any theory of liability, whether in contract, strict liability, or tort (including negligence or otherwise) arising in any way out of the use of this software, even if advised of the possibility of such damage.
```

## nanoid 3.3.18 — MIT

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/nanoid"]`
- **Resolved:** `https://registry.npmjs.org/nanoid/-/nanoid-3.3.18.tgz`
- **Integrity:** `sha512-DTg4MJbGMWkfi6VZFdNt2/caMbQy4Ou+Op/hJQvGEWcnVfoA1QA+xzRKAzw9jD6+GVOOeYr/mIcuDSdug6F6+w==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/nanoid/LICENSE` (`SHA-256: da4db1480d9beea3483a2eda5c53b22238d0827d57da162b48f122e04d2d9987`).

```text
The MIT License (MIT)

Copyright 2017 Andrey Sitnik <andrey@sitnik.ru>

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

## parse-srcset 1.0.2 — MIT

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/parse-srcset"]`
- **Resolved:** `https://registry.npmjs.org/parse-srcset/-/parse-srcset-1.0.2.tgz`
- **Integrity:** `sha512-/2qh0lav6CmI15FzA3i/2Bzk2zCgQhGMkvhOhKNcBVQ1ldgpbfiNTVslmooUmWJcADi1f1kIeynbDRVzNlfR6Q==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/parse-srcset/LICENSE` (`SHA-256: 240b6a23478dc1b044a457f1e9260c725d50b66b2502f7c3240f54f79c13ab58`).

```text
The MIT License (MIT)

Copyright (c) 2014 Alex Bell

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

## picocolors 1.1.1 — ISC

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/picocolors"]`
- **Resolved:** `https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz`
- **Integrity:** `sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/picocolors/LICENSE` (`SHA-256: 6582629e2979466878f6014313dcc2f3756c9616148682227ce3063dde310750`).

```text
ISC License

Copyright (c) 2021-2024 Oleksii Raspopov, Kostiantyn Denysov, Anton Verinov

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## postcss 8.5.26 — MIT

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/postcss"]`
- **Resolved:** `https://registry.npmjs.org/postcss/-/postcss-8.5.26.tgz`
- **Integrity:** `sha512-u82N74LFzG8ca+dD8puPnplTXoGH4fTPpVGuIbt36G3qvNlkvfD0lEAZSxaly3KX8TS/L1A1gsCEmvKmBcVbkQ==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/postcss/LICENSE` (`SHA-256: 5be1f3465bba68a626777f984878814aaf35e7ef8e9fd314d469bcf887050fb8`).

```text
The MIT License (MIT)

Copyright 2013 Andrey Sitnik <andrey@sitnik.es>

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

## sanitize-html 2.17.7 — MIT

- **Caminho no lockfile:** `package-lock.json -> packages["node_modules/sanitize-html"]`
- **Resolved:** `https://registry.npmjs.org/sanitize-html/-/sanitize-html-2.17.7.tgz`
- **Integrity:** `sha512-PGtEkc9cbnedU3s9TmzDbpsZ8w086g/0Q8k8/oIO1NLNU3i5k9yn835CrjJSajp1KMmkisbO1qPXxNKO3welAg==`
- **Origem imutável/hash:** tarball npm versionado indicado em `Resolved`, autenticado pelo SRI SHA-512 indicado em `Integrity`.
- **Fonte do aviso integral:** `node_modules/sanitize-html/LICENSE` (`SHA-256: 24526b61784870909780321dac50fcd3a33ff0bdfd507549dd63163899237bd1`).

```text
Copyright (c) 2013, 2014, 2015 P'unk Avenue LLC

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
