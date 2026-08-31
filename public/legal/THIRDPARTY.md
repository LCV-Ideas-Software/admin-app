# Inventário de componentes de terceiros

Este documento separa os dois manifestos do repositório. Cada linha corresponde a uma dependência direta declarada, com a versão efetivamente resolvida pelo lockfile, a expressão SPDX publicada no pacote, a eleição explícita quando a expressão contém `OR`, o SRI SHA-512 e a URL versionada do tarball oficial do npm. A coluna **Escopo** reproduz a declaração no manifesto e não presume se o componente foi ou não empacotado. O gate `npm run verify:thirdparty` deriva a cobertura dos manifestos e falha diante de omissão, duplicidade ou drift.

No build público, o recurso nativo `build.license` do Vite gera `legal/BUNDLED-LICENSES.md` diretamente do grafo efetivamente empacotado, incluindo dependências transitivas e componentes declarados como desenvolvimento que acabem no bundle. Quando o pacote publica um arquivo reconhecido, o inventário reproduz o texto; algumas seções podem ficar vazias. Os avisos abaixo fornecem suplementos documentados para essas lacunas, código vendorizado, eleições e ativos. A divulgação do build público é o conjunto dos dois arquivos; nenhum é declarado completo isoladamente.

## Inventário: package.json (raiz)

| Escopo      | Componente                            | Versão declarada | Versão resolvida | Licença do pacote       | Eleição    | Integridade                                                                                     | Origem imutável                                                                                             |
| ----------- | ------------------------------------- | ---------------- | ---------------- | ----------------------- | ---------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| runtime     | @codemirror/lang-javascript           | ^6.2.5           | 6.2.5            | MIT                     | —          | sha512-zD4e5mS+50htS7F+TYjBPsiIFGanfVqg4HyUz6WNFikgOPf2BgKlx+TQedI1w6n/IqRBVBbBWmGFdLB/7uxO4A== | https://registry.npmjs.org/@codemirror/lang-javascript/-/lang-javascript-6.2.5.tgz                          |
| runtime     | @fontsource/inter                     | ^5.3.0           | 5.3.0            | OFL-1.1                 | —          | sha512-RofMylZmjlJEfELXeNHFWBRcSs75rGU/6bV2S2jfnvv/3rPXPGe0LgUJTklcHZ9lM4OZmAVFhcJPnACfb91A3g== | https://registry.npmjs.org/@fontsource/inter/-/inter-5.3.0.tgz                                              |
| runtime     | @radix-ui/react-dialog                | ^1.1.23          | 1.1.23           | MIT                     | —          | sha512-Ksw4WeROkO4rC9k/onilX/Ao2Cr1ku1unMNH+XSCcP4jSXYu7HDsg9n4ojMjVb22XpYjAQ9qfrFlVbru1vXDUA== | https://registry.npmjs.org/@radix-ui/react-dialog/-/react-dialog-1.1.23.tgz                                 |
| runtime     | @tanstack/react-query                 | ^5.102.2         | 5.102.2          | MIT                     | —          | sha512-KxU8ZyOEuJ81eTSgXa8GQbk/jO/rz0elYtNKt3VMtM2pRjeO8ADIu7sqqmEjFKJKqco9h2N1ojIDuHs6VfDItQ== | https://registry.npmjs.org/@tanstack/react-query/-/react-query-5.102.2.tgz                                  |
| runtime     | @tanstack/react-query-devtools        | ^5.102.2         | 5.102.2          | MIT                     | —          | sha512-5KzH1NAdess98Jgbo8R0sraP0yto49+eGgSGu6umvrLbXPNdsNJ7iOgAiXegBOoWJrHygp6hW01L2U6MvSIT5Q== | https://registry.npmjs.org/@tanstack/react-query-devtools/-/react-query-devtools-5.102.2.tgz                |
| runtime     | @tiptap/core                          | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-QbZC/s1OOqcoUdkhIY16TjR/gCtR0qAk9e4bJwUqOJqZuv5ozqCL5hzWm22jjTPp6c6Ei2tPd6t30VwfIKW4lQ== | https://registry.npmjs.org/@tiptap/core/-/core-3.30.2.tgz                                                   |
| runtime     | @tiptap/extension-character-count     | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-9Mnej4qOLf2/kFPAmGxkxwdpFNRq8+D9nQVnyFF50x32myaKl/BXcCftsm+EiKpnH9JNT5mhZA0nh4JoH7OwrA== | https://registry.npmjs.org/@tiptap/extension-character-count/-/extension-character-count-3.30.2.tgz         |
| runtime     | @tiptap/extension-code-block-lowlight | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-xmC1MOAMl7QmcayV0H/SLxpJ84o4SPwzAcJDhtgUWFdWyf8aO5rnNtUj/2HnvLXlM1nqZPMjTBOmSK7qgPwSZw== | https://registry.npmjs.org/@tiptap/extension-code-block-lowlight/-/extension-code-block-lowlight-3.30.2.tgz |
| runtime     | @tiptap/extension-collaboration       | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-n0de2+ZVQCJGrHzlvtZr1jA3qasr9AMlohGNrv/F6DFasXPNFYIzt+2Jin/Zx9mRvfiL47GPPQxg/pQftHTmjA== | https://registry.npmjs.org/@tiptap/extension-collaboration/-/extension-collaboration-3.30.2.tgz             |
| runtime     | @tiptap/extension-color               | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-VNct6qKePIoruJZ4PR30JtA3YfENOqESrUtDLF1YMJYf/oU26Bx4ePJGTy428IA0mouyE+uHruyUGfZXnT73Iw== | https://registry.npmjs.org/@tiptap/extension-color/-/extension-color-3.30.2.tgz                             |
| runtime     | @tiptap/extension-drag-handle         | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-g+XeceniP8zvDeRrMuAUiQa5r9T+5PJBDH4JhI8AKp4d/1LTgXMRlVW5vQjm5r6p7lnlEOwXwN+zlYI3mHmP0A== | https://registry.npmjs.org/@tiptap/extension-drag-handle/-/extension-drag-handle-3.30.2.tgz                 |
| runtime     | @tiptap/extension-drag-handle-react   | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-51LqlN7Y8shV8q+IXkK+Nn/f2UGFIjNOfg/FFjJUXI8cBjjmSNW9TAEtTOTXqq+C8Aq+wZYK610A8bwNaS5sjQ== | https://registry.npmjs.org/@tiptap/extension-drag-handle-react/-/extension-drag-handle-react-3.30.2.tgz     |
| runtime     | @tiptap/extension-dropcursor          | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-nyRKUmItATnKI9AiRChmjhcBbCEsNxRu+AaCz+cx8EvnAcNHsVRdNYL5PmBs3WlNA/Et4Eb2DG0hVQDnNF61eg== | https://registry.npmjs.org/@tiptap/extension-dropcursor/-/extension-dropcursor-3.30.2.tgz                   |
| runtime     | @tiptap/extension-focus               | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-Ywy/TI+IM6dfWX7BwMZa32D/KUVuUHwMjyEeXYxVpeV9rFFO6B+Gzl/0weA4+kddeKGySo0YzIH50nVoo/s9iA== | https://registry.npmjs.org/@tiptap/extension-focus/-/extension-focus-3.30.2.tgz                             |
| runtime     | @tiptap/extension-font-family         | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-syg9Gfo+TN3rhxPxACgHSKRjcpl08enBHNinjCQI2pg8BMGDLG7DTrSAlIK/uEhTxxzSqBUOBaGrue+Q0oJQmg== | https://registry.npmjs.org/@tiptap/extension-font-family/-/extension-font-family-3.30.2.tgz                 |
| runtime     | @tiptap/extension-highlight           | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-LY1/LTEluP/z82JkoPVE3ffCVO7Bt6ltVeBMXsfb6S7GLS8eXput2KU1XlyLqTCQADvjaS1oTMfaplH+tS7Meg== | https://registry.npmjs.org/@tiptap/extension-highlight/-/extension-highlight-3.30.2.tgz                     |
| runtime     | @tiptap/extension-image               | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-K/BPlWauHXI6Y4s7se2A1BLcZ2pnWmRQTEDkPJYe/8kmv1GyJzPu34sZed5Mvfu5chUH8u6aNZ/utZbvSbI/0Q== | https://registry.npmjs.org/@tiptap/extension-image/-/extension-image-3.30.2.tgz                             |
| runtime     | @tiptap/extension-link                | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-jwdcymKcrbFpj5hRAuGVLCq8FieVkGFnENyroYmvkad+XAt8ZLy/MTFYRN6SK3ukH6PZMY7H4iObGtciQaC5nw== | https://registry.npmjs.org/@tiptap/extension-link/-/extension-link-3.30.2.tgz                               |
| runtime     | @tiptap/extension-mention             | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-x3W9+p5G0Ex/QrQPgfC8Cy+rwr6wrXmizdrwMpslfvpEJZmlgHEBd5LntqKGztI21X9QldIge2by0005D7A6iA== | https://registry.npmjs.org/@tiptap/extension-mention/-/extension-mention-3.30.2.tgz                         |
| runtime     | @tiptap/extension-node-range          | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-dRjt2cMrSYuivBo1cxOp7geZMdQ9uKdWy4j/vQv6kby2C/Or4eWsPVC7m8UyAu1ADnU/9lfiBBbaqp05zq5gxg== | https://registry.npmjs.org/@tiptap/extension-node-range/-/extension-node-range-3.30.2.tgz                   |
| runtime     | @tiptap/extension-placeholder         | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-Bj1seUvPCoRrD/LpzMoKD+jQIjxuc+oq931GpPq4wobSUUbD4pF/0NMwpCLpiHO19QnTQz8+9p2dqPdlc44LHA== | https://registry.npmjs.org/@tiptap/extension-placeholder/-/extension-placeholder-3.30.2.tgz                 |
| runtime     | @tiptap/extension-subscript           | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-rf16ZQiWTMMmsoG7c1AirGAjQ/gTabsleOLp+6JEwRQ/XFOO4XiPWVEgpbEXdwtzKNfyRp3sXAUzZvSKzGX+jg== | https://registry.npmjs.org/@tiptap/extension-subscript/-/extension-subscript-3.30.2.tgz                     |
| runtime     | @tiptap/extension-superscript         | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-jcfWyHAqq2wHlNGzNxpXp2SyBJoQYuGkj5LW/u2BuKm9uf/MJWRzczS2uSs43Gsc2kC1R4R+LZGHia3q473QcA== | https://registry.npmjs.org/@tiptap/extension-superscript/-/extension-superscript-3.30.2.tgz                 |
| runtime     | @tiptap/extension-table               | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-zWp0ehZnx6N5lwRa8anSTn17GBEF3wxHXfOJGbBugf4Vwmp5keUEAXrgeIS4j7gIdxjN3XawdwjuMImG93N+Fg== | https://registry.npmjs.org/@tiptap/extension-table/-/extension-table-3.30.2.tgz                             |
| runtime     | @tiptap/extension-table-cell          | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-fcFG6MsJV+x1ua27dJqIdpOa5wiTXaLSfXfZ0G+rhwchH8EtSM3Q64gT4KeHsa/vVt7pOEc6ChQhKMnm40fWdA== | https://registry.npmjs.org/@tiptap/extension-table-cell/-/extension-table-cell-3.30.2.tgz                   |
| runtime     | @tiptap/extension-table-header        | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-qcpMr8x1XvevEG5QZdk4JGLzsjZal1zzNfy4xmEtwUYVYkXkWaXklQvxEXC6GUkVpTGTOSXtHl25/cSbnJ5qbg== | https://registry.npmjs.org/@tiptap/extension-table-header/-/extension-table-header-3.30.2.tgz               |
| runtime     | @tiptap/extension-table-row           | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-dlbkcmgb5eiMI9hLX5C6CaPGuGcpyyPxJCjIYcI1l4glimYcbgxxEeqtGIvySgDewxWgofY/V3CLOGHrfyBCkQ== | https://registry.npmjs.org/@tiptap/extension-table-row/-/extension-table-row-3.30.2.tgz                     |
| runtime     | @tiptap/extension-task-item           | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-cb9SK9TxfK6rOJZSQemqwdEhv3KsUWwTAZG4aKE4ByLWOPhf7omAw7P5/4NO4TxnnwyZglOZMNhmrFXoKqoMWw== | https://registry.npmjs.org/@tiptap/extension-task-item/-/extension-task-item-3.30.2.tgz                     |
| runtime     | @tiptap/extension-task-list           | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-xo59REkBIb/1EMKQth24RW2CEcyZbuBTQog3JHqcQJotItsaIQP/HBRggtI3W+6eMxhujbRsuL9sLWbW1OPw6Q== | https://registry.npmjs.org/@tiptap/extension-task-list/-/extension-task-list-3.30.2.tgz                     |
| runtime     | @tiptap/extension-text-align          | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-zexiz0uJlX2KzeAyYI/uEoBsl0Zw3Ua0CTV/kRKTnk7K9vCOnwvJXtXdkHA4WC12ACqUsPnyc4yMTwDR22fKFw== | https://registry.npmjs.org/@tiptap/extension-text-align/-/extension-text-align-3.30.2.tgz                   |
| runtime     | @tiptap/extension-text-style          | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-o3YMN3JNHg/rCCLZB3PUcAfl4bkrsXDoYoHRXvrbE9cl/RT+qAEFAAssI8kBC1fp9en9V2F4Z7Uy2uuzkbecKw== | https://registry.npmjs.org/@tiptap/extension-text-style/-/extension-text-style-3.30.2.tgz                   |
| runtime     | @tiptap/extension-typography          | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-kQ+6Vxo+WVLtb6e1kiE59STSUExd8gTW9vuD1S3sBhUaYKRLfGYhiO7tiwvvA1SGlv+CphOKrwOoJg6d+5BU3g== | https://registry.npmjs.org/@tiptap/extension-typography/-/extension-typography-3.30.2.tgz                   |
| runtime     | @tiptap/extension-youtube             | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-DOx6/YBH2464oKeEiBsMfhrHPJHnwp6PugYOMbBGsdMLXFujp4IhM5Q5L/+RTvVp/D6sG/7BG5obQegFTusGKQ== | https://registry.npmjs.org/@tiptap/extension-youtube/-/extension-youtube-3.30.2.tgz                         |
| runtime     | @tiptap/pm                            | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-BJN8tUx4ppFN3R3cV/FJfrJbJkvo1lj4uciq+nwpjwzdRvFzqIuglWf+HLcJ6CwlYpLOHp7ArgkBg4Q5e60Gog== | https://registry.npmjs.org/@tiptap/pm/-/pm-3.30.2.tgz                                                       |
| runtime     | @tiptap/react                         | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-7hGaTstpUeTmQ008mCPkjz+GSlChWhucgy+PeX0z93v4+nh7qM5F+0lh+kJ9zo6Os5abO7v36GtgHRZdQI6+FQ== | https://registry.npmjs.org/@tiptap/react/-/react-3.30.2.tgz                                                 |
| runtime     | @tiptap/starter-kit                   | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-fJSrhW1CyD4sjYA20evSP4Cp13B/HhbxCdM974K0xpHOVqvCtNU9w2s9hfq9mg2yGoU7MSNHKNYMkJjIi2/Xyw== | https://registry.npmjs.org/@tiptap/starter-kit/-/starter-kit-3.30.2.tgz                                     |
| runtime     | @tiptap/suggestion                    | ^3.30.2          | 3.30.2           | MIT                     | —          | sha512-qsQv+rlh5ik9G1n+SGLak69JoLQAFwdtQRjGpABYxx5USc14J7hrR1K8sj9tnWymX1fKXfJOlz+Dimcb1kDhWA== | https://registry.npmjs.org/@tiptap/suggestion/-/suggestion-3.30.2.tgz                                       |
| runtime     | @tiptap/y-tiptap                      | ^3.0.9           | 3.0.9            | MIT                     | —          | sha512-7/El8NQ8R5V5MkdrOUdfj9IgZacpt0H071xNimX7B0AnYiWiKefQnMKd41neQYzo2MOXbWdN3iZ+7Z7BruzOSA== | https://registry.npmjs.org/@tiptap/y-tiptap/-/y-tiptap-3.0.9.tgz                                            |
| runtime     | codemirror                            | ^6.0.2           | 6.0.2            | MIT                     | —          | sha512-VhydHotNW5w1UGK0Qj96BwSk/Zqbp9WbnyK2W/eVMv4QyF41INRGpjUhFJY7/uDNuudSc33a/PKr4iDqRduvHw== | https://registry.npmjs.org/codemirror/-/codemirror-6.0.2.tgz                                                |
| runtime     | croner                                | ^10.0.1          | 10.0.1           | MIT                     | —          | sha512-ixNtAJndqh173VQ4KodSdJEI6nuioBWI0V1ITNKhZZsO0pEMoDxz539T4FTTbSZ/xIOSuDnzxLVRqBVSvPNE2g== | https://registry.npmjs.org/croner/-/croner-10.0.1.tgz                                                       |
| runtime     | cronstrue                             | ^3.24.0          | 3.24.0           | MIT                     | —          | sha512-t/Ji3Ur2c/pzhIAWNwC0ftl3JAE4dLfCjAdZoTZXmPDZwcispnS1PaMcMS4OmIIXyIVouAz+yw+mfQiE3hz5OQ== | https://registry.npmjs.org/cronstrue/-/cronstrue-3.24.0.tgz                                                 |
| runtime     | d3-geo                                | 3.1.1            | 3.1.1            | ISC                     | —          | sha512-637ln3gXKXOwhalDzinUgY83KzNWZRKbYubaG+fGVuc/dxO64RRljtCTnf5ecMyE1RIdtqpkVcq0IbtU2S8j2Q== | https://registry.npmjs.org/d3-geo/-/d3-geo-3.1.1.tgz                                                        |
| runtime     | dompurify                             | ^3.4.14          | 3.4.14           | (MPL-2.0 OR Apache-2.0) | Apache-2.0 | sha512-dVoH9z+MY+C9IilgGCk3YfFqjLi3fChm2OiKJMzh6axrJ5qwxqWaZamgmHrpv22CN/KdbZJuGEGgfQoL00LTdg== | https://registry.npmjs.org/dompurify/-/dompurify-3.4.14.tgz                                                 |
| runtime     | hono                                  | ^4.13.3          | 4.13.3           | MIT                     | —          | sha512-r8AO2mYHoLxSHkgafNeC/BXyb2vWRxD3jem4Ts+ptav8oTG5FIRifAjuJEmZI4bSvvc2ns0GxmIYiZnHqN3mMw== | https://registry.npmjs.org/hono/-/hono-4.13.3.tgz                                                           |
| runtime     | lowlight                              | ^3.3.0           | 3.3.0            | MIT                     | —          | sha512-0JNhgFoPvP6U6lE/UdVsSq99tn6DhjjpAj5MxG49ewd2mOBVtwWYIT8ClyABhq198aXXODMU6Ox8DrGy/CpTZQ== | https://registry.npmjs.org/lowlight/-/lowlight-3.3.0.tgz                                                    |
| runtime     | lucide-react                          | ^1.33.0          | 1.33.0           | ISC                     | —          | sha512-MTRwMy0ZlL8Ur/vOAiJ9XGHE+kFPC7brq6MxAm0GiGXEBj0qy0jA/pG4N675oSzciO/UCdX8T+5yUQdmDeTLxg== | https://registry.npmjs.org/lucide-react/-/lucide-react-1.33.0.tgz                                           |
| runtime     | mammoth                               | ^1.12.1          | 1.12.1           | BSD-2-Clause            | —          | sha512-nCH9KKjWi3jQ+i8bUKs7k1yrXtSEGpWgF8IYkzsFMcbn+5S6l4bZEBbyx2hOQErFiXPuAs9RPa6qjXVxhyx/8g== | https://registry.npmjs.org/mammoth/-/mammoth-1.12.1.tgz                                                     |
| runtime     | marked                                | ^18.0.10         | 18.0.10          | MIT                     | —          | sha512-FJeH4bRpYoXiggcgriCGItKCSv3xkngJc4QCZ/rkQCogU3VYaLxYJoZl8Nw/b4+x7iij/pd+09mZ6A1dXzpL0A== | https://registry.npmjs.org/marked/-/marked-18.0.10.tgz                                                      |
| runtime     | prosemirror-model                     | ^1.25.11         | 1.25.11          | MIT                     | —          | sha512-QWg9RhnpLlogAmp3p96uEFrE5txQpFynd4vhBAELkwgOCWQs/X0yCzB3/hrHqiPwf91RG5KyWq6553zs9JqIOQ== | https://registry.npmjs.org/prosemirror-model/-/prosemirror-model-1.25.11.tgz                                |
| runtime     | prosemirror-state                     | ^1.4.4           | 1.4.4            | MIT                     | —          | sha512-6jiYHH2CIGbCfnxdHbXZ12gySFY/fz/ulZE333G6bPqIZ4F+TXo9ifiR86nAHpWnfoNjOb3o5ESi7J8Uz1jXHw== | https://registry.npmjs.org/prosemirror-state/-/prosemirror-state-1.4.4.tgz                                  |
| runtime     | prosemirror-view                      | ^1.42.2          | 1.42.2           | MIT                     | —          | sha512-Pdg0l5kXm8aLDquFAnQFTCITg0q44sLqBlHlpsVLD9segdOao8TOfQdAhCrCXyVgPSRr6UDDROOIWA3bIrN9YQ== | https://registry.npmjs.org/prosemirror-view/-/prosemirror-view-1.42.2.tgz                                   |
| runtime     | react                                 | ^19.2.8          | 19.2.8           | MIT                     | —          | sha512-PWaYA1L/q9u2u7xYQi+Y3L3Yfnie7XyLeaJICV1MGD6LprsBxcAqGjYyr0eY3p+QdsA+x/Irkt4Qif8D63+Sbw== | https://registry.npmjs.org/react/-/react-19.2.8.tgz                                                         |
| runtime     | react-dom                             | ^19.2.8          | 19.2.8           | MIT                     | —          | sha512-rVprimfGBG3DR+Tq0IQG2DT5PxKth1WIGDmj5yPmlzr4YBe7uyE+Du4oVqTDXZSHGGGXRtTJEGSSePyQCMBglQ== | https://registry.npmjs.org/react-dom/-/react-dom-19.2.8.tgz                                                 |
| runtime     | sanitize-html                         | ^2.17.7          | 2.17.7           | MIT                     | —          | sha512-PGtEkc9cbnedU3s9TmzDbpsZ8w086g/0Q8k8/oIO1NLNU3i5k9yn835CrjJSajp1KMmkisbO1qPXxNKO3welAg== | https://registry.npmjs.org/sanitize-html/-/sanitize-html-2.17.7.tgz                                         |
| runtime     | spark-md5                             | ^3.0.2           | 3.0.2            | (WTFPL OR MIT)          | MIT        | sha512-wcFzz9cDfbuqe0FZzfi2or1sgyIrsDwmPwfZC4hiNidPdPINjeUwNfv5kldczoEAcjl9Y1L3SM7Uz2PUEQzxQw== | https://registry.npmjs.org/spark-md5/-/spark-md5-3.0.2.tgz                                                  |
| runtime     | tiptap-markdown                       | ^0.9.0           | 0.9.0            | MIT                     | —          | sha512-dKLQ9iiuGNgrlGVjrNauF/UBzWu4LYOx5pkD0jNkmQt/GOwfCJsBuzZTsf1jZ204ANHOm572mZ9PYvGh1S7tpQ== | https://registry.npmjs.org/tiptap-markdown/-/tiptap-markdown-0.9.0.tgz                                      |
| runtime     | topojson-client                       | 3.1.0            | 3.1.0            | ISC                     | —          | sha512-605uxS6bcYxGXw9qi62XyrV6Q3xwbndjachmNxu8HWTtVPxZfEJN9fd/SZS1Q54Sn2y0TMyMxFj/cJINqGHrKw== | https://registry.npmjs.org/topojson-client/-/topojson-client-3.1.0.tgz                                      |
| runtime     | world-atlas                           | 2.0.2            | 2.0.2            | ISC                     | —          | sha512-IXfV0qwlKXpckz1FhwXVwKRjiIhOnWttOskm5CtxMsjgE/MXAYRHWJqgXOpM8IkcPBoXnyTU5lFHcYa5ChG0LQ== | https://registry.npmjs.org/world-atlas/-/world-atlas-2.0.2.tgz                                              |
| runtime     | y-protocols                           | ^1.0.7           | 1.0.7            | MIT                     | —          | sha512-YSVsLoXxO67J6eE/nV4AtFtT3QEotZf5sK5BHxFBXso7VDUT3Tx07IfA6hsu5Q5OmBdMkQVmFZ9QOA7fikWvnw== | https://registry.npmjs.org/y-protocols/-/y-protocols-1.0.7.tgz                                              |
| runtime     | yjs                                   | ^13.6.32         | 13.6.32          | MIT                     | —          | sha512-lfiJIIC4Xayt5ItynE407ehlE03pCjeOc4hkR4yxxvvNJ4kuiN25B0g+Qp8XagYz361LLL7DCzR5bvFJ81QKtQ== | https://registry.npmjs.org/yjs/-/yjs-13.6.32.tgz                                                            |
| development | @biomejs/biome                        | ^2.5.10          | 2.5.10           | MIT OR Apache-2.0       | MIT        | sha512-WRKXARA3kTuiV5sxqTpobJ/I0MVd4vk3pOL6wnp5az4LntFIhWTj1RWZq3DI9PCEN3lXcqy7p5aqUHzvq8AXyQ== | https://registry.npmjs.org/@biomejs/biome/-/biome-2.5.10.tgz                                                |
| development | @cloudflare/workers-types             | ^5.20260823.1    | 5.20260823.1     | MIT OR Apache-2.0       | MIT        | sha512-HdBVDR/gecQ5QwB+DZ9kB5yjNZLS85fe8bMB2K/k0xmCvaoMlAFrQQGLaCBYR00j+i9aTkQzwfrPInVZwlMPwQ== | https://registry.npmjs.org/@cloudflare/workers-types/-/workers-types-5.20260823.1.tgz                       |
| development | @eslint/js                            | ^10.0.1          | 10.0.1           | MIT                     | —          | sha512-zeR9k5pd4gxjZ0abRoIaxdc7I3nDktoXZk2qOv9gCNWx3mVwEn32VRhyLaRsDiJjTs0xq/T8mfPtyuXu7GWBcA== | https://registry.npmjs.org/@eslint/js/-/js-10.0.1.tgz                                                       |
| development | @playwright/test                      | ^1.62.1          | 1.62.1           | Apache-2.0              | —          | sha512-DTcUc8qii+cpHvtOwggMtBRMjKZHXYWdw8syRYu2vtzuq4Wxphqq4NfCs5Zt44L6mA8rfDfj+PHnxFc/FeK6mQ== | https://registry.npmjs.org/@playwright/test/-/test-1.62.1.tgz                                               |
| development | @testing-library/dom                  | ^10.4.1          | 10.4.1           | MIT                     | —          | sha512-o4PXJQidqJl82ckFaXUeoAW+XysPLauYI43Abki5hABd853iMhitooc6znOnczgbTYmEP6U6/y1ZyKAIsvMKGg== | https://registry.npmjs.org/@testing-library/dom/-/dom-10.4.1.tgz                                            |
| development | @testing-library/jest-dom             | ^7.0.1           | 7.0.1            | MIT                     | —          | sha512-oMDTC3oA+6CXSO2JZnvOI7CA6oVub6kij5ggk9ohwye5slmkwxYDXcPOVxgMw/RQlticjtO0C1RZkR97HgrWMw== | https://registry.npmjs.org/@testing-library/jest-dom/-/jest-dom-7.0.1.tgz                                   |
| development | @testing-library/react                | ^16.0.0          | 16.3.2           | MIT                     | —          | sha512-XU5/SytQM+ykqMnAnvB2umaJNIOsLF3PVv//1Ew4CTcpz0/BRyy/af40qqrt7SjKpDdT1saBMc42CUok5gaw+g== | https://registry.npmjs.org/@testing-library/react/-/react-16.3.2.tgz                                        |
| development | @testing-library/user-event           | ^14.6.5          | 14.6.5           | MIT                     | —          | sha512-FhqjldLTpteueBaKflhNFlMT3+PM0O5fiBUivht6b9CZ1eesJyy7+g3Jr7XwJzt/Hip3ZG5hWwK1MX1FuDiE4w== | https://registry.npmjs.org/@testing-library/user-event/-/user-event-14.6.5.tgz                              |
| development | @types/d3-geo                         | 3.1.1            | 3.1.1            | MIT                     | —          | sha512-65Emv9fQiQQqphLlRkuQ5ypPsOmWPhtBGCMv61JDPEPMvsx+gzhGf74yw1a78xFKPj6zw4AgQICJoQv0vK9M2w== | https://registry.npmjs.org/@types/d3-geo/-/d3-geo-3.1.1.tgz                                                 |
| development | @types/node                           | ^26.2.0          | 26.2.0           | MIT                     | —          | sha512-5IviulTZeRNp2vAJ514cc/HUlY5nZ9fCbq9DMyC52BrhFZACo3nI0R7qBxhQmo/d27NFe96ur/b7Wwxklda+kg== | https://registry.npmjs.org/@types/node/-/node-26.2.0.tgz                                                    |
| development | @types/react                          | ^19.2.18         | 19.2.18          | MIT                     | —          | sha512-AnzbBERsrLKtk2XSfTbYRLjQPdy116Sty4q+T+Bp3IC4l6jNBvreVPAHmpq9qhXQM7CXZPjLVmGMw9sy+hxQ3w== | https://registry.npmjs.org/@types/react/-/react-19.2.18.tgz                                                 |
| development | @types/react-dom                      | ^19.2.5          | 19.2.5           | MIT                     | —          | sha512-fMPwH9v7r/pp43yUd2/Mbiex5KouJwwR3dzHkhLREUC6764VyDsqxhAxv6OFEYR1RhjOyD1naqba8ECDBe7ZQg== | https://registry.npmjs.org/@types/react-dom/-/react-dom-19.2.5.tgz                                          |
| development | @types/sanitize-html                  | ^2.16.1          | 2.16.1           | MIT                     | —          | sha512-n9wjs8bCOTyN/ynwD8s/nTcTreIHB1vf31vhLMGqUPNHaweKC4/fAl4Dj+hUlCTKYgm4P3k83fmiFfzkZ6sgMA== | https://registry.npmjs.org/@types/sanitize-html/-/sanitize-html-2.16.1.tgz                                  |
| development | @types/spark-md5                      | ^3.0.5           | 3.0.5            | MIT                     | —          | sha512-lWf05dnD42DLVKQJZrDHtWFidcLrHuip01CtnC2/S6AMhX4t9ZlEUj4iuRlAnts0PQk7KESOqKxeGE/b6sIPGg== | https://registry.npmjs.org/@types/spark-md5/-/spark-md5-3.0.5.tgz                                           |
| development | @types/topojson-client                | 3.1.5            | 3.1.5            | MIT                     | —          | sha512-C79rySTyPxnQNNguTZNI1Ct4D7IXgvyAs3p9HPecnl6mNrJ5+UhvGNYcZfpROYV2lMHI48kJPxwR+F9C6c7nmw== | https://registry.npmjs.org/@types/topojson-client/-/topojson-client-3.1.5.tgz                               |
| development | @vitejs/plugin-react                  | ^6.1.0           | 6.1.0            | MIT                     | —          | sha512-qd2BzUBehkov86WFhg0JkEFEYyCLG9uPCe6qWTY/kRlss9OvJrOF2UbIWT7p+8IzZHkEu0DNGHc4HSv+JdDLsw== | https://registry.npmjs.org/@vitejs/plugin-react/-/plugin-react-6.1.0.tgz                                    |
| development | @vitest/coverage-v8                   | ^4.1.11          | 4.1.11           | MIT                     | —          | sha512-8MVGEFnJIcdGjcbfKmeq8z0pZHH0JlVtoVZH9Q/qwUp6wyFnEJUBMrw9DCaj+ra3vShGmhavjalMIhPNxZAUcw== | https://registry.npmjs.org/@vitest/coverage-v8/-/coverage-v8-4.1.11.tgz                                     |
| development | @vitest/ui                            | ^4.1.11          | 4.1.11           | MIT                     | —          | sha512-r/rwyKoev21mWdRGSEkZOqkQ2BYy68mwjihg9M90nNRbf4NGrgzZ4cj6JNCEwlOGJkbKeMgsjlykvwKUbRr7gw== | https://registry.npmjs.org/@vitest/ui/-/ui-4.1.11.tgz                                                       |
| development | eslint                                | ^10.9.0          | 10.9.0           | MIT                     | —          | sha512-5KeEOJZBfEVA47boFiBsf+6MmmJpffM7qEBg4pLla2e4nlKgdKlqCW0oSLOGsT8Wl5uCGJptLV1bkaiShj90Gw== | https://registry.npmjs.org/eslint/-/eslint-10.9.0.tgz                                                       |
| development | eslint-config-prettier                | ^10.1.8          | 10.1.8           | MIT                     | —          | sha512-82GZUjRS0p/jganf6q1rEO25VSoHH0hKPCTrgillPjdI/3bgBhAE1QzHrHTizjpRvy6pGAvKjDJtk2pF9NDq8w== | https://registry.npmjs.org/eslint-config-prettier/-/eslint-config-prettier-10.1.8.tgz                       |
| development | eslint-plugin-react-hooks             | ^7.1.1           | 7.1.1            | MIT                     | —          | sha512-f2I7Gw6JbvCexzIInuSbZpfdQ44D7iqdWX01FKLvrPgqxoE7oMj8clOfto8U6vYiz4yd5oKu39rRSVOe1zRu0g== | https://registry.npmjs.org/eslint-plugin-react-hooks/-/eslint-plugin-react-hooks-7.1.1.tgz                  |
| development | eslint-plugin-react-refresh           | ^0.5.4           | 0.5.4            | MIT                     | —          | sha512-7bqTKz7T0r+HKWFarNXByDE9/5+73wI2ru+M3zuqGbR7s/b/5/pQJXZoufWlrngqGqoZto73ZkGumCdLxk+4rw== | https://registry.npmjs.org/eslint-plugin-react-refresh/-/eslint-plugin-react-refresh-0.5.4.tgz              |
| development | globals                               | ^17.11.0         | 17.11.0          | MIT                     | —          | sha512-Z2I8hM+PbJDXQDq3Icgpzv+mPdwr68iZUU9d5WW4FuXfDUQfkZaZuvjMv42/5crNyw154+9+VWXbYrUgDXbxNw== | https://registry.npmjs.org/globals/-/globals-17.11.0.tgz                                                    |
| development | happy-dom                             | ^20.11.6         | 20.11.6          | MIT                     | —          | sha512-Hldbg8AdAa5a5oDcZpjqnGitp7JB0hqWmfv/8qr+kft4vzSD8BHsbdRfzYvL/0QcbKcURC/yyoygbeDQarPvYg== | https://registry.npmjs.org/happy-dom/-/happy-dom-20.11.6.tgz                                                |
| development | husky                                 | ^9.0.0           | 9.1.7            | MIT                     | —          | sha512-5gs5ytaNjBrh5Ow3zrvdUUY+0VxIuWVL4i9irt6friV+BqdCfmV11CQTWMiBYWHbXhco+J1kHfTOUkePhCDvMA== | https://registry.npmjs.org/husky/-/husky-9.1.7.tgz                                                          |
| development | knip                                  | ^6.32.2          | 6.32.2           | ISC                     | —          | sha512-WXTXbmocrw7gqm1A1TQvFN0OgJ7hUSU6E1g6SPRIzzHFogUBhXByc7cYeOFVtJ2uODg7DP4VbESYBYnfbtBYsg== | https://registry.npmjs.org/knip/-/knip-6.32.2.tgz                                                           |
| development | lightningcss                          | ^1.33.0          | 1.33.0           | MPL-2.0                 | —          | sha512-WkUDrojuJs0xkgGf2udWxa3yGBRxPtxUkB79i6aCZLRgc7PM8fZe9TosfPDcvEpQZbuFASnHYmRLBLUbmLOIIA== | https://registry.npmjs.org/lightningcss/-/lightningcss-1.33.0.tgz                                           |
| development | lint-staged                           | ^17.3.0          | 17.3.0           | MIT                     | —          | sha512-woZS3vNe3UKqBaLPvbLOtKRY4tLANpWQhom12MGWqC8Mh1lCOO+WgSwmX2amjJAqTY9BkXYW87fCUH5H9Ph6xw== | https://registry.npmjs.org/lint-staged/-/lint-staged-17.3.0.tgz                                             |
| development | prettier                              | ^3.9.6           | 3.9.6            | MIT                     | —          | sha512-OpN0zzVdiaiAhxpuuj5efpIS4sY9j7bY6uR5mnj5yPzGkdkjNKSJeUThPb60Jw29QuAZgA4o+/iB49kFiaBX6g== | https://registry.npmjs.org/prettier/-/prettier-3.9.6.tgz                                                    |
| development | rollup-plugin-visualizer              | ^7.1.1           | 7.1.1            | MIT                     | —          | sha512-ThaGiHTU8XW02OkK80TrTHATraJmM9OAduU4otal+7gyXLpYEtmGBLfx5kW+EHvvLwn03YGW2NnwKUIqsYlJAA== | https://registry.npmjs.org/rollup-plugin-visualizer/-/rollup-plugin-visualizer-7.1.1.tgz                    |
| development | typescript                            | ~6.0.3           | 6.0.3            | Apache-2.0              | —          | sha512-y2TvuxSZPDyQakkFRPZHKFm+KKVqIisdg9/CZwm9ftvKXLP8NRWj38/ODjNbr43SsoXqNuAisEf1GdCxqWcdBw== | https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz                                                |
| development | typescript-eslint                     | ^8.67.0          | 8.67.0           | MIT                     | —          | sha512-S2udFs8tCKEKffuJ4TB1idGUZiXdCPGi3IPBGWXarbLQ5UPXORV8QEVzJ4gCRduURMb5EkpNCdjbk0eDIuI8Yg== | https://registry.npmjs.org/typescript-eslint/-/typescript-eslint-8.67.0.tgz                                 |
| development | vite                                  | ^8.2.2           | 8.2.2            | MIT                     | —          | sha512-cFKLV/PRgAUlIRm5WjMjJ86jrftzpqcgH+Us+DS8mI3CDNiH30Whrz8uHL3+MOLPAgqbMBAqWdAHAphOAM+z/Q== | https://registry.npmjs.org/vite/-/vite-8.2.2.tgz                                                            |
| development | vitest                                | ^4.1.11          | 4.1.11           | MIT                     | —          | sha512-fhACrNXUidIbGSBr5FlbuBkO7VWC1ZyLl0DO4CU2DrQoAPxX84Ysxs+HeGQpii5lZWV1Q4gBZTTu49mF+A6Edw== | https://registry.npmjs.org/vitest/-/vitest-4.1.11.tgz                                                       |
| development | wrangler                              | ^4.125.0         | 4.125.0          | MIT OR Apache-2.0       | MIT        | sha512-yFpvggu+xk1Hdm/Uxwaqa19bb7GArME4CrCS3Vov68a2TZq2MPO+wLocKbbnIC9K0oLowcdau7/ycxbbNHKCEg== | https://registry.npmjs.org/wrangler/-/wrangler-4.125.0.tgz                                                  |

## Inventário: tlsrpt-motor/package.json

| Escopo      | Componente                      | Versão declarada | Versão resolvida | Licença do pacote | Eleição | Integridade                                                                                     | Origem imutável                                                                             |
| ----------- | ------------------------------- | ---------------- | ---------------- | ----------------- | ------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| runtime     | postal-mime                     | ^3.0.0           | 3.0.0            | MIT-0             | —       | sha512-Z4a9ar2Bv3YpK3IXag+Yda30k7bMZfpRuUGyqtHnZ2pjHG8Bl62EhZIk4n1dzv00gfzP9g+94e9kd8+XmjVWLA== | https://registry.npmjs.org/postal-mime/-/postal-mime-3.0.0.tgz                              |
| development | @biomejs/biome                  | ^2.5.10          | 2.5.10           | MIT OR Apache-2.0 | MIT     | sha512-WRKXARA3kTuiV5sxqTpobJ/I0MVd4vk3pOL6wnp5az4LntFIhWTj1RWZq3DI9PCEN3lXcqy7p5aqUHzvq8AXyQ== | https://registry.npmjs.org/@biomejs/biome/-/biome-2.5.10.tgz                                |
| development | @cloudflare/vitest-pool-workers | ^0.22.0          | 0.22.0           | MIT               | —       | sha512-OJv/qikkOgxnKxJ5xrLS7zuOLZhc/6iziU+llqZm4tiQf2CJUYwlMuXN68VaWIQebORd1AUx4w6A0oy8XRbuaQ== | https://registry.npmjs.org/@cloudflare/vitest-pool-workers/-/vitest-pool-workers-0.22.0.tgz |
| development | vitest                          | ^4.1.11          | 4.1.11           | MIT               | —       | sha512-fhACrNXUidIbGSBr5FlbuBkO7VWC1ZyLl0DO4CU2DrQoAPxX84Ysxs+HeGQpii5lZWV1Q4gBZTTu49mF+A6Edw== | https://registry.npmjs.org/vitest/-/vitest-4.1.11.tgz                                       |
| development | wrangler                        | ^4.125.0         | 4.125.0          | MIT OR Apache-2.0 | MIT     | sha512-yFpvggu+xk1Hdm/Uxwaqa19bb7GArME4CrCS3Vov68a2TZq2MPO+wLocKbbnIC9K0oLowcdau7/ycxbbNHKCEg== | https://registry.npmjs.org/wrangler/-/wrangler-4.125.0.tgz                                  |

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

| Componente                           | Relação com o bundle                                                                                                     | Licença aplicada                              | Proveniência imutável                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSZip 3.10.1                         | Incorporado por Mammoth e detectado pelo inventário nativo do Vite                                                       | `(MIT OR GPL-3.0-or-later)`; eleição: **MIT** | SRI `sha512-xXDvecyTpGLrqFrvkrUSoxxfJI5AH7U8zxxtVclpsUtMCq4JQ290LY8AW5c7Ggnr/Y/oK+bQMbqK2qmtk3pN4g==`; `https://registry.npmjs.org/jszip/-/jszip-3.10.1.tgz`                                                                                                                                                                                                                                 |
| Pako 1.0.5                           | Vendorizado na distribuição browser do JSZip 3.10.1; não recebe seção própria do inventário nativo                       | `(MIT AND Zlib)`; **ambas** se aplicam        | JSZip `v3.10.1`/commit `0f2f1e4d0509514417db83fe5b86bde90e0ffe8d`; lock oficial fixa `pako@1.0.5`; `dist/jszip.min.js` SHA-256 `ACC7E41455A80765B5FD9C7EE1B8078A6D160BBBCA455AEAE854DE65C947D59E`; SRI `sha512-umumrxStF9I4G8OZlhzEgTlwktjp4bofYq7E0mfH/IM7fctJ1pzLBhVrhNmP86hA1b3RNP5gAzxJJ4mjj0Up6Q==`; `https://registry.npmjs.org/pako/-/pako-1.0.5.tgz`                                 |
| Spark MD5 3.0.2                      | Dependência direta detectada pelo Vite; o projeto usa a alternativa oficial MIT                                          | `(WTFPL OR MIT)`; eleição: **MIT**            | tag oficial `v3.0.2`, commit `9315385868fe11076674d4ddd763005319a462a7`, arquivo `LICENSE2`, SHA-256 `6E7ABBD885F650C938CF377A6EDCAD56C7DCB61DE092853AF6141D806F8C9F04`                                                                                                                                                                                                                      |
| dingbat-to-unicode 1.0.1             | Detectado pelo Vite, mas o tarball npm gera seção vazia porque não contém arquivo de licença                             | BSD-2-Clause                                  | SRI `sha512-98l0sW87ZT58pU4i61wa2OHwxbiYSbuxsCBozaVnYX2iCnr3bLM3fIes1/ej7h1YdOKuKt/MLs706TVnALA65w==`; `https://registry.npmjs.org/dingbat-to-unicode/-/dingbat-to-unicode-1.0.1.tgz`; tag oficial `js-1.0.1`, commit `b27f259b49907f99b1b9097abba5a9668106b779`                                                                                                                             |
| react-remove-scroll-bar 2.3.8        | Detectado pelo Vite, mas o tarball npm gera seção vazia porque não contém arquivo de licença                             | MIT                                           | SRI `sha512-9r+yi9+mgU33AKcj6IbT9oRCO78WriSj6t/cF8DWBZJ9aOGPOTEDvdUDz1FwKim7QXWwmHqtdHnRJfhAxEG46Q==`; `https://registry.npmjs.org/react-remove-scroll-bar/-/react-remove-scroll-bar-2.3.8.tgz`; licença oficial posterior no commit `7301c160fda44cb8cf2b9fdfde61efad35736196`, SHA-256 `A79AAE0C0F21990D9D963BB3C5A79CDCEA9A46F8523BA55C58D7FE776B6EBC84`                                  |
| Assets do scaffold create-vite 8.0.0 | `src/assets/hero.png`, `react.svg` e `vite.svg`; distribuídos no código-fonte, sem consumidores e fora do bundle público | MIT                                           | tag oficial `v8.0.0`, commit `b565af6f1123a62b3058253b2147574b8515e89f`; SHA-256 respectivos `72A860570EDDF1DD9988F26C7106C67BE286BC9F2FD3303C465CE87EDB1AE6CD`, `35EF61ED53B323AE94A16A8EC659B3D0AF3880698791133F23B084085AB1C2E5` e `5BE21ACD42EB7B896E517F4E0F0F11EB5C5D9E54FBBCEBE9453F033008FCCA6F`; licença SHA-256 `692057AF3D664CBB79AC38293EB50AA3C4987F8182E2A440136E59E08F1B4A54` |

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
`v3.0.2`; o hash acima fixa o texto escolhido à versão instalada.

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

O tarball e a tag exatos declaram BSD-2-Clause no `package.json`, mas não
contêm `LICENSE` ou `COPYING`. O texto abaixo é a forma canônica BSD-2-Clause;
a atribuição foi derivada do campo `author` e não é apresentada como aviso
autoral upstream comprovado. Aviso da versão exata: **inconclusivo**.

```text
Copyright (c) Michael Williamson <mike@zwobble.org>

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

O tarball 2.3.8 declara MIT e não contém `LICENSE`. O arquivo citado foi
adicionado ao repositório oficial em 21/05/2025, depois da publicação de 2.3.8
em 15/12/2024; ele corrobora posteriormente a licença do projeto, mas não
comprova o aviso autoral do artefato 2.3.8. Aviso da versão exata:
**inconclusivo**.

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
