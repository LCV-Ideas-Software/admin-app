# AI Memory Log — Admin-App

> **Nota:** Este arquivo contém o histórico de desenvolvimento e decisões arquiteturais exclusivos do módulo `admin-app`. Refere-se a atualizações, correções e novos recursos referentes ao app administrativo.

## 2026-04-03 — Admin-App v01.77.19 — Fix Crítico: Gemini Import 502 Bad Gateway Fantasma
### Corrigido
- **Root Cause**: O error handler de `gemini-import.ts` retornava HTTP `502` como status code em caso de erro. O Cloudflare proxy intercepta qualquer resposta 502 de Pages Functions e **substitui o body JSON** pela sua própria página HTML de "Bad Gateway", ocultando completamente a mensagem de erro real. Diagnóstico via TTFB: 352ms prova crash imediato, não timeout.
- **Fix aplicado**:
  1. Status `502` → `500` (Cloudflare não intercepta 500).
  2. Outer bulletproof try/catch envolvendo `handleGeminiImport()`.
  3. Tipo `Parameters<PagesFunction<Env>>[0]` para context tipado sem imports extras.
- **Pipeline otimizado**: Jina Reader autenticado (`JINA_API_KEY`), modelo `gemini-2.5-flash`, AbortController 15s, prompt simplificado.
### Lição operacional
- **NUNCA** retornar HTTP 502 de dentro de um Cloudflare Worker/Pages Function — o proxy trata 502 como "origin failure" e substitui o response body.
### Controle de versão
- `admin-app`: APP v01.77.18 → APP v01.77.19

## 2026-04-01 — Admin-App v01.77.05 — CF P&W Module Audit & API Compliance Enforcement
### Escopo
Auditoria completa do módulo `CF P&W` contra a API oficial Cloudflare para eliminar operações não suportadas e garantir paridade visual com Dashboard.

### Corrigido
- **Operações Removidas:** Eliminadas `create-worker-from-template` e `deploy-worker-version` que não possuem suporte na API Cloudflare
  - `create-worker-from-template`: API não oferece template engine; upload é manual via PUT `/scripts/{name}`
  - `deploy-worker-version`: Workers v2+ descontinuou versioning classic; modelo atual usa Deployments (POST `/deployments`)
- **Campos UI Removidos:** `templateCode`, `versionId` e referências relacionadas
- **Importações Limpas:** Removidas `createCloudflareWorkerFromTemplate` e `deployCloudflareWorkerVersion` do ops.ts

### Resultado Final
- **18 Operações Válidas Nativas** (focadas em usabilidade e compliance estrito com a API Cloudflare):
  - WORKER_OPS: 11 operações (schedules, usage-model, secrets, versions list, routes)
  - PAGE_OPS: 7 operações (create, domains, retry, rollback, logs)
  - *Removido*: A aba avançada de Raw HTTP Request foi completamente removida para evitar execuções não mapeadas.
- **Build:** 100% sem erros TypeScript
- **Paridade Visual:** 100% com Dashboard Cloudflare (tabelas, deployments, alerts, operações guiadas)

### Controle de versão
- `admin-app`: APP v01.77.04 → APP v01.77.05

## 2026-04-01 — Admin-App v01.77.04 — Cloudflare Token Eradication & Refactoring
### Refatorado e Higienizado
- **Erradicação dos Tokens Globais Legados:** Remoção completa e sistemática das chaves `CF_API_TOKEN` e `CLOUDFLARE_API_TOKEN` por todo o ecosistema do App. Eles operavam como fallback genéricos, indo contra os princípios atuais de Governança.
- Consolidado a padronização e obrigatoriedade exclusiva do princípio de Defense in Depth para Tokens da Cloudflare (`CLOUDFLARE_PW`, `CLOUDFLARE_DNS` e renomeado `CLOUDFLARE_CACHE_TOKEN` puramente para `CLOUDFLARE_CACHE`).
- **Oráculo Financeiro:** Adaptado o CRON Sync de Workes de fallback genérico explicitamente para `CLOUDFLARE_PW`.
- **MTA-STS Admin:** Sanitizados os throw catchs legados que recomendavam inspecionar o saudoso token global.
### Controle de versão
- `admin-app`: APP v01.77.03 → APP v01.77.04

## 2026-04-01 — Admin-App v01.77.03 — Cloudflare Cache Token Isolation
### Corrigido e Otimizado
- **Segregação de Token Cloudflare**: O erro `403 (Authentication error)` ao limpar a zona via `purge_cache` persistia devido à restrição estrita (Governance/Defence in Depth) contida nas chaves preexistentes (`CLOUDFLARE_DNS` e `CLOUDFLARE_PW`), que não tem permissão mútua de Cache Purge por serem focadas estritamente em DNS e Pages/Workers, respectivamente.
- O loop fantasma do runtime de Pages/Workers (`cfpw-api.ts`) que testava chaves erradas ou globais indefinidas (`CLOUDFLARE_API_TOKEN`) foi erradicado para as rotinas de cache e listagem global de zonas.
- Instaurada a exigência programática e hardcoded do token exclusivo `CLOUDFLARE_CACHE_TOKEN`. A API agora é isolada: emitirá erro claro instruindo o onboarding do secret específico caso ele não esteja presente no environment.

### Controle de versão
- `admin-app`: APP v01.77.02 → APP v01.77.03

## 2026-04-01 — Admin-App v01.77.02 — Cloudflare Purge Cache Authentication Fix
### Corrigido
- Evoluída a resolução de Token na API de cache do Cloudflare Pages implementada. Agora o backend aplica iteração seqüencial (fallback robusto via loop `for`) cruzando múltiplos tokens possíveis, mitigando o erro 403 (Authentication error) em contextos restritos.
### Controle de versão
- `admin-app`: APP v01.77.01 → APP v01.77.02

## 2026-04-01 — Admin-App v01.77.01 — Cloudflare Purge Cache Authentication Fix
### Corrigido
- Tratamento de limitação de token Cloudflare: o endpoint `cleanup-cache-project.ts` passava a receber HTTP 403 (ou fallback genérico) ao expurgar o cache de domínios atrelados ao plano caso a credencial de escopo do dashboard Cloudflare Pages and Workers não explicitasse acesso ao endpoint `Zone.CachePurge`.
- Solução: implementada hierarquia de Tokens usando DNS Wrapper em `cfpw-api.ts`. A API checa e despacha nativamente com o `CLOUDFLARE_DNS` em preempção, quando disponível no environment, ao qual já se concede privilégios absolutos de Roteamento/Cache, solucionando o crash 500 sem comprometer a rigidez do core de deployment.
### Controle de versão
- `admin-app`: APP v01.77.00 → APP v01.77.01

## 2026-04-01 — Admin-App v01.77.00 — Cloudflare Purge Cache
### Adicionado
- **Governança de Infraestrutura — Purge de Cache Automático**: integrado mecanismo inteligente de invalidação de cache associado ao expurgo de deployments do Cloudflare Pages. Novo endpoint `cleanup-cache-project.ts` descobre a(s) zona(s) raiz dos domínios customizados atrelados a cada projeto do Cloudflare Pages afetado, e aplica limpeza generalizada (`purge_everything: true`) visando compatibilidade máxima nos planos free/paid.
- **Fase 2 de Limpeza**: A interface `DeploymentCleanupPanel` foi aprimorada para coordenar programaticamente as duas fases: limpar projetos (deployments antigos) e expurgar caches na sequência.
- Funções base `listCloudflareZones` e `purgeCloudflareZoneCache` foram incorporadas à sublibrary `cfpw-api`. Domínios internos da própria CF (`*.pages.dev`) são inteligentemente ignorados do expurgo.
### Controle de versão
- `admin-app`: APP v01.76.01 → APP v01.77.00

## 2026-03-31 — Admin-App v01.76.01 — AI Summary Auto-Generation Fix
### Corrigido
- **`MainsiteModule.tsx`:** Função de geração automática de Resumo IA estava inoperante desde a refatoração do PostEditor, exigindo acionamento em massa manual. Corrigida a rotina `handleSavePost` para disparar via Fetch assíncrono (Fire-and-Forget) um rebuild `/api/mainsite/post-summaries` contendo a ação "regenerate" logo após confirmar que a persistência do post foi concluída nativamente no edge.
### Controle de versão
- `admin-app`: APP v01.75.00 → APP v01.75.01 (package.json v1.62.1)

## 2026-03-31 — Admin-App v01.75.00 — Gemini Import Gold Standard & AI Transform Fix
### Alterado e Corrigido
- **`gemini-import.ts`:** O backend de importação do Gemini foi reescrito (v1.62.0) para descartar parsing bruto via `HTMLRewriter`. A prioridade da rotação foca agora no Jina.ai mirror, resgatando um Documento Markdown perfeito (com links e marcações preservados). O parser agora usa o compiler padrão `marked`, convertendo a resposta em HTML estruturado (capacitando Tiptap a injetar Tabelas e Imagens complexas vindas do Google nativamente).
- **`ai/transform.ts`:** Corrigido bug HTTP 400 ao acionar a Vinha Mágica (Freeform) no editor. A opção não possuía case/tratamento configurado para receber o valor customizado "instruction" no payload. Tipos restabelecidos.
### Controle de versão
- `admin-app`: APP v01.74.21 → APP v01.75.00 (package.json v1.62.0)

## 2026-03-31 — Admin-App v01.74.21 — PostEditor Gemini Import Crash Fix Fixed
### Corrigido
- `PostEditor.tsx`: O crash `NotFoundError: Failed to execute 'insertBefore' on 'Node'` ao importar do Gemini foi definitivamente corrigido. A falha não advinha do fechamento do `<PromptModal>` (como mitigado tentativamente via Portal na v01.74.19), mas do React tentar montar a barra visual `{geminiImportProgress.active}` logo antes de um nó transiente do Tiptap (`<DragHandle>`), o qual manipulava seu próprio DOM e dessincronizava a árvore de irmãos paternos no container do editor. A barra de status `gemini-import-progress` agora está segura dentro de uma estufa de `<div className="gemini-import-progress-wrapper" />` estática para conter o reparenting/reconciliação do DOM adequadamente e evitar interações do React dom com o núcleo Prosemirror.
### Controle de versão
- `admin-app`: APP v01.74.20 → APP v01.74.21 (package.json v1.61.1)

## 2026-03-31 — Admin-App v01.74.20 — PostEditor Lint Gate Hardening
### Corrigido
- `SearchReplace` foi decomposto em `SearchReplace.tsx` (UI) + `searchReplaceCore.ts` (plugin/extension/state), eliminando erros `react-refresh/only-export-components` sem alterar comportamento funcional de busca/substituição.
- `PromptModal` passou a consumir tipos/estado de `promptModalState.ts`, preservando o arquivo de componente livre de exports utilitários e estável para Fast Refresh.
- `FloatingMenu.tsx` recebeu memoização via `useCallback` para helpers usados em `useEffect`, removendo warning `react-hooks/exhaustive-deps` no gate de lint.
### Controle de versão
- `admin-app`: APP v01.74.19 → APP v01.74.20

## 2026-03-31 — Admin-App v01.74.19 — Gemini Import Hardening + Popup Crash Fix
### Corrigido
- `functions/api/mainsite/gemini-import.ts` endurecido para links `gemini.google.com/share/*` e `g.co/gemini/share/*`, com normalização de URL e fallback textual resiliente quando o fetch direto do Gemini retorna bloqueio/502.
- `PostEditor.tsx` recebeu progresso visual por etapas na importação Gemini (validação, request, processamento, inserção, conclusão/erro), mensagens de erro contextualizadas e ações inline de retry/fechar.
- `PromptModal.tsx` migrou de renderização por portal para renderização inline no subtree do popup editor, eliminando race de reconciliação que gerava `NotFoundError: Failed to execute 'insertBefore'` ao confirmar importação.
### Controle de versão
- `admin-app`: APP v01.74.18 → APP v01.74.19

## 2026-03-31 — Admin-App v01.74.18 — Hotfix Build e Imports
### Corrigido
- Devido às restrições do React `Fast Refresh` (que recusa arquivos de componentes que também exportam funções independentes), a versão `.17` removeu `export`s do arquivo `NodeViews.tsx` para saciar o linting do Vite. Ao fazer isso, não se identificou previamente que `PostEditor.tsx` importava o parser estático `migrateLegacyCaptions` de lá. A função foi então formalmente translocada para `editor/utils.ts` e consumida adequadamente nas linhas de cima do `PostEditor.tsx`, assegurando uma build `npx tsc -b && npm run build` livre de falhas (Exit 0; 1.6s).
### Controle de versão
- `admin-app`: APP v01.74.17 → APP v01.74.18

## 2026-03-31 — Admin-App v01.74.17 — Legados BUG FIX e Chrome Opts
### Corrigido e Otimizado
- Aplicação das diretrizes finais anti-bug em `NodeViews.tsx`: restabelecido o clique do usuário em posts muito antigos. Para o `<FigureNodeView>`, aplicou-se os handlers `onMouseDown/PointerDown` ausentes para ativar via React. Em paralelo, o YouTube (`<ResizableYoutubeNodeView>`) agora emprega `pointerEvents: editor.isEditable ? 'none' : 'auto'`, resolvendo o cross-origin event block.
- Configurado `text-rendering` e aliases de hardware-acceleration (will-change) no `App.css` para painéis flutuantes (menus TiTtap) no Chrome, suavizando a leitura e aliviando a carga térmica de repaint da toolbar.
### Controle de versão
- `admin-app`: APP v01.74.16 → APP v01.74.17

## 2026-03-31 — Admin-App v01.74.16 — PostEditor Legados Selection Bugfix
### Corrigido
- `PostEditor` teve a seleção funcional e menus flutuantes restaurados para mídias antigas (imagens vindas do banco de dados). O `FigureNodeView` agora injeta seus próprios botões (resize, snap bar, select media) de forma isolada, em completa conformidade funcional com a versão original.
- Para iFrames brutos de YouTube (`<iframe src="...">`) perdidos em posts muito antigos sem encapsulamento nativo, estendeu-se `CustomResizableYoutube.parseHTML()` com regex customizado salvando a estrutura do Youtube nativamente no NodeView.
### Controle de versão
- `admin-app`: APP v01.74.15 → APP v01.74.16

## 2026-03-31 — Admin-App v01.74.15 — PostEditor v5 Closure
### Corrigido
- `PostEditor` do `admin-app` teve a seleção de mídia endurecida em `NodeViews.tsx`: clique direto em imagem/vídeo agora força `NodeSelection`, restaurando `media-select-btn`, `media-snap-bar` e `media-resize-handle` sem depender apenas de `is-selected`.
- `PostEditor` recebeu `DragHandle` oficial via `@tiptap/extension-drag-handle-react`, integrado no orquestrador (`PostEditor.tsx`) e estilizado com suporte a dark mode.
- `App.css` do editor teve dark mode consolidado e limpeza final: removido CSS legado duplicado de `pre/code/task-item`; `isYoutubeUrl` movido para `editor/utils.ts`; prop morta `adminActor` removida do contrato do `PostEditor`.
### Controle de versão
- `admin-app`: APP v01.74.14 → APP v01.74.15

## 2026-03-31 — Admin-App v01.74.10 — PR Queue Unblock via CodeQL Workflow
### Corrigido
- PRs do `admin-app` ficaram presos em `pending` com `total_count: 0` porque a branch protection exigia `Analyze (javascript-typescript)` sem workflow local que publicasse esse check.
- Adicionado `admin-app/.github/workflows/codeql.yml` com job `Analyze (javascript-typescript)` para `pull_request` e `push` em `main`, restaurando o sinal obrigatório para auto-merge/merge manual.
### Lição operacional
- Sempre validar paridade entre **required status checks** da branch protection e workflows realmente presentes no repositório alvo; check obrigatório sem job correspondente gera fila de PR "travada".
### Controle de versão
- `admin-app`: APP v01.74.09 → APP v01.74.10

## 2026-03-31 — Admin-App v01.74.09 — GitHub Deploy ERESOLVE Fix
### Corrigido
- **Workflow `Deploy` (GitHub Actions)** falhava no step `npm ci` com `ERESOLVE`: `eslint@10.1.0` incompatível com `eslint-plugin-react-hooks@7.0.1` (peer até `^9`).
- Fix aplicado no `admin-app`: `eslint` retornou para `^9.39.4` + `package-lock.json` atualizado, destravando o deploy em `main`.
### Lição operacional
- Não promover major de `eslint` sem validar matriz de peer dependencies dos plugins (`eslint-plugin-react-hooks`, `typescript-eslint`) no CI antes do merge.
### Controle de versão
- `admin-app`: APP v01.74.08 → APP v01.74.09

## 2026-03-31 — Admin-App v01.74.08 — Compliance Module Typing & Linter Cleanup
### Corrigido
- **Component Type Mismatch**: `LicencasModule.tsx` exportava `React.FC`, conflitando com a assinatura exigida pelo wrapper `lazyWithAccessRecovery()` no `App.tsx` que demanda um `ComponentType` não restrito que possa mapear todas as props injetáveis. A declaração foi revertida para `export function LicencasModule()` limpando os TypeScript Errors de lazy mount do root.
- **Linter Cleanup**: Remoção de inputs fantasmas nos try/catch blocks do `Licencas.tsx` (parâmetro `err` nunca lido). Em `src/lib/validation.ts`, a regra ESLint `no-control-regex` que disparava falso-positivo foi silenciada cirurgicamente com disable comment (pois os control characters são intencionais contra vulnerabilidades na string parsing de Schemes URLs).
### Controle de versão
- `admin-app`: APP v01.74.07 → APP v01.74.08

## 2026-03-31 — Admin-App v01.74.07 — GCP Monitoring JWT Fix
### Corrigido
- **`gcp-monitoring.ts`**: parsing robusto de `GCP_SA_KEY` com suporte a raw JSON, base64 e JSON duplamente stringificado. `normalizePrivateKey()` normaliza `\r\n`/`\\n`. Helpers `toBase64UrlFromBytes`/`toBase64UrlFromString` substituem spread `btoa()` que falha em chaves grandes. Erro `invalid_grant` expõe `private_key_id` para diagnóstico de rotação.
### Lição operacional
- Após rotacionar chave GCP SA, a chave anterior exposta em chat deve ser invalidada no GCP IAM antes de qualquer deploy.
### Controle de versão
- `admin-app`: APP v01.74.05 → APP v01.74.07

## 2026-03-29 — Admin-App v01.74.01 — CF DNS Table Text Overflow Fix
### Corrigido
- **CF DNS — Tabela de registros overflow**: campos longos (Nome/Conteúdo) truncam com `...` via CSS `text-overflow: ellipsis` em vez de quebrar linha. Coluna Ações com `overflow: visible` explícito para impedir clipping do ícone lixeira. Proporções ajustadas (Conteúdo 32%, TTL 6%, Ações 14%). Tooltip `title` adicionado à coluna Nome. Truncação JS redundante removida.
### Controle de versão
- `admin-app`: APP v01.74.00 → APP v01.74.01

## 2026-03-29 — Admin-App v01.74.00 — Visual Standardization (Google Palette + Balanced Sizing)
### Alterado
- **Google Material Design Palette**: toda a paleta de cores padronizada para sistema oficial Google (`#1a73e8` Blue, `#34a853` Green, `#ea4335` Red, `#f9ab00` Yellow, neutrals `#202124`→`#80868b`). Design tokens centralizados. Inline color overrides removidos.
- **UI Density "Balanced" (~20% reduction)**: redução proporcional aplicada a botões, badges, chips, pills, nav items, form inputs/labels/hints, confirm dialogs, módulo-specific tabs (telemetria, financeiro, TLS-RPT, deployment cleanup).
- **Toast Notifications**: sizing reduzido ~20%. Nova variante `warning` (fundo `#f9ab00`, ícone `AlertTriangle`, texto escuro).
### Escopo
- Somente CSS/visual. Zero alterações funcionais, estruturais ou de layout.
### Controle de versão
- `admin-app`: APP v01.73.00 → APP v01.74.00

## 2026-03-29 — Admin-App v01.73.00 + Mainsite Frontend v03.02.00 + Worker v02.01.01 — Dynamic Post Author
### Adicionado
- **Autor dinâmico de posts**: campo `author` adicionado ao schema `mainsite_posts` (D1) com auto-migração (`ensureAuthorColumn`). `PostEditor` exibe input "Autor do post" entre título e editor. Backend admin-app (`posts.ts`) persiste `author` em INSERT/UPDATE/SELECT. Worker (`posts.ts`) atualizado com paridade.
- **PostReader dinâmico**: byline, Schema.org JSON-LD e edge pre-rendering (`[[path]].js`) consomem `post.author` do D1 em vez de string hardcoded. Fallback "Leonardo Cardozo Vargas" quando vazio.
- **Tipo `Post` expandido**: `author?: string` adicionado em `mainsite-frontend/src/types.ts` e `ManagedPost` no admin-app.
### Controle de versão
- `admin-app`: APP v01.72.01 → APP v01.73.00
- `mainsite-frontend`: APP v03.01.03 → APP v03.02.00
- `mainsite-worker`: v02.01.00 → v02.01.01

## 2026-03-29 — Admin-App v01.72.01 — D1 Autosave Defaults on First Run
### Adicionado
- **Autosave de defaults no first run**: quando D1 está vazio e localStorage também, os valores padrão são automaticamente persistidos no D1. Aplicado em `useModuleConfig` (5 módulos), `newsSettings.ts` e `financeiro-helpers.ts`.
### Controle de versão
- `admin-app`: APP v01.72.00 → APP v01.72.01

## 2026-03-29 — Admin-App v01.72.00 — localStorage → D1 Migration
### Alterado (MAJOR)
- **Persistência migrada de localStorage para D1**: todas as configurações de módulos (`mainsite-config`, `calculadora-config`, `astrologo-config`, `oraculo-config`, `admin-app/runtime-config/v1`, `lcv-news-settings`, `adminapp_sumup/mp_filters_v1`) migradas de `localStorage` para tabela D1 `admin_config_store` no `BIGDATA_DB`.
- **Endpoint centralizado (`config-store.ts`)**: novo endpoint CRUD `GET/POST /api/config-store` com auto-migração de tabela e SQL limpo (sem comentários inline).
- **Hook `useModuleConfig<T>`**: hook genérico de persistência D1 com migração one-shot automática do localStorage, callbacks `onSaveSuccess`/`onSaveError` para notificação obrigatória ao usuário.
- **Módulos refatorados**: MainsiteModule, CalculadoraModule, AstrologoModule, OraculoModule, ConfigModule — todos utilizam `useModuleConfig` com feedback via `showNotification`.
- **Financeiro filtros async**: `loadFilters`/`saveFilters` em `financeiro-helpers.ts` migrados para fetch async D1. `FinanceiroModule` usa `useRef` + `useEffect` para persistência sem writes redundantes.
- **NewsSettings async**: `loadNewsSettings`/`saveNewsSettings` convertidos para async. `NewsPanel.tsx` e `ConfigModule.tsx` atualizados com `useEffect` no mount.
### Arquitetura
- **Tabela D1**: `admin_config_store` com colunas `config_key` (PK), `config_value` (JSON text), `updated_at`.
- **Migração one-shot**: na primeira carga, dados são lidos do localStorage, persistidos no D1 e o localStorage é limpo. Zero `localStorage.setItem` remanescente no codebase.
### Controle de versão
- `admin-app`: APP v01.71.00 → APP v01.72.00

## 2026-03-29 — Admin-App v01.71.00 — AI Share Summaries for Social Sharing
### Adicionado
- **Resumos IA para Compartilhamento Social**: sistema completo de geração de resumos por IA integrado ao `MainsiteModule` do `admin-app`. Resumos gerados via Gemini 2.0 Flash são armazenados na tabela `mainsite_post_ai_summaries` (D1 `BIGDATA_DB`) e servem para enriquecer metatags OG/Twitter ao compartilhar posts.
- **Backend (`functions/api/mainsite/post-summaries.ts`)**: endpoint dedicado self-contained (sem proxy para worker). Ações: `generate-bulk` (modos `missing`/`all`), `regenerate` (individual), `save` (edição manual com `is_manual=1`), `list` (listagem). Auto-migração de tabela via `ensureTable`.
- **Frontend (`MainsiteModule.tsx`)**: painel "Resumos IA ✨" com UI completa — geração em massa com progresso (spinner + logs por post), edição inline com contadores de caracteres (OG: 200, LD: 300), marcação de override manual, regeneração individual.
- **Integração Gemini**: API key via `GEMINI_API_KEY` no env do admin-app. Modelo `gemini-2.0-flash`. Edições manuais preservadas (flag `is_manual` impede sobrescrita pela IA).
### Arquitetura
- **Tabela D1**: `mainsite_post_ai_summaries` com colunas `post_id`, `og_description`, `ld_description`, `is_manual`, `created_at`, `updated_at`.
- **Padrão admin-app**: D1 direto via `BIGDATA_DB`, sem dependência do mainsite-worker.
### Controle de versão
- `admin-app`: APP v01.70.04 → APP v01.71.00

## 2026-03-29 — Admin-App v01.70.04 — Financeiro Table Alignment (SumUp/MP)
### Corrigido
- **Financeiro — Desalinhamento visual de tabela**: cabeçalho e linhas de transações no módulo `Financeiro` usavam malhas diferentes, gerando quebra de alinhamento entre colunas (principalmente em `E-mail/Ações` e campos intermediários). Ajustado para usar template de colunas compartilhado por provedor (SumUp e Mercado Pago), preservando 100% do comportamento funcional.
- **Escopo da correção**: somente layout/alinhamento. Nenhuma mudança em textos, cores, regras de negócio, integrações, filtros, ações de estorno/cancelamento ou telemetria.
### Controle de versão
- `admin-app`: APP v01.70.03 → APP v01.70.04

## 2026-03-29 — Admin-App v01.70.01 — PostEditor Inline Save Feedback
### Corrigido
- **PostEditor — Feedback em popup window**: `showNotification` disparava toasts na janela principal, invisíveis ao usuário no popup (`PopupPortal`). Adicionado banner inline com estado local (`saveFeedback`) diretamente na janela popup. Variantes success (verde) e error (vermelho) com animação spring e auto-dismiss em 5s.
- **onSave — Promise-based**: assinatura de `onSave` alterada de `void` para `Promise<boolean>` (`PostEditorProps`). `handleSavePost` em `MainsiteModule` agora retorna `true`/`false`. PostEditor aguarda resultado e renderiza feedback contextual.
### Controle de versão
- `admin-app`: APP v01.70.00 → APP v01.70.01

## 2026-03-29 — Admin-App v01.70.00 — Purge Logic Fix + Complete window.confirm Migration
### Corrigido
- **DeploymentCleanupPanel — Purge logic fix**: lógica de identificação de deployments obsoletos corrigida no backend. Agora protege tanto o deployment mais recente (por data) quanto o deployment ativo do projeto (`project.latest_deployment.id`). Safety guard no POST: retorna `403 Forbidden` se tentar deletar o deployment ativo.
- **CfDnsModule — Confirmação nativa removida**: ambas as chamadas `window.confirm()` (save e delete de registros DNS) substituídas por modais in-app.
- **CfPwModule — Confirmação nativa removida**: `window.confirm()` em operações destrutivas avançadas substituído por modal customizado. Deps desnecessários removidos do `useCallback`.
### Diretiva confirmada
- Zero instâncias de `window.confirm()` ou `window.alert()` remanescentes no codebase do admin-app. Todos os diálogos de confirmação usam modais in-app com design system do admin-app.
### Controle de versão
- `admin-app`: APP v01.69.05 → APP v01.70.00

## 2026-03-29 — Admin-App v01.69.05 — Custom Confirm Modal (Purge Deployments)
### Corrigido
- **DeploymentCleanupPanel — Confirmação nativa removida**: `window.confirm()` substituído por modal in-app com backdrop blur, `AlertTriangle` icon, botões estilizados e animação spring. Diálogos nativos do browser são proibidos no design system.
### Controle de versão
- `admin-app`: APP v01.69.04 → APP v01.69.05

## 2026-03-29 — Admin-App v01.69.04 — Notification Visual Overhaul + Build Cache Fix
### Corrigido
- **Notificações — Padrão mainsite**: `Notification.tsx` e `Notification.css` reescritos para aderir ao padrão "toast inteligente" do mainsite — pill centrada no topo, `backdrop-filter: blur`, `border-radius: 100px`, variantes cromáticas, animação spring-based. Layout anterior (card retangular canto superior-direito com progress bar) descontinuado.
- **Build cache stale (root cause)**: deploys anteriores enviavam 0 arquivos novos porque os hashes do Vite coincidiam com build anterior. Adicionado `prebuild` script (`rmSync dist`) no `package.json` para garantir builds sempre limpos.
### Lição operacional
- **Cloudflare Pages caching**: quando `wrangler pages deploy` reporta "0 files uploaded", o novo código **não** está sendo servido. Sempre validar que arquivos foram uploaded no output do deploy.
### Controle de versão
- `admin-app`: APP v01.69.03 → APP v01.69.04

## 2026-03-29 — Admin-App v01.69.03 — Purge Deployments Toast Compliance
### Corrigido
- **DeploymentCleanupPanel — Notificações**: componente não usava `useNotification()`, violando diretiva global de toast. Adicionados toasts para scan ok/erro, purge concluído/parcial e abort. Import path corrigido para `./Notification`.
### Controle de versão
- `admin-app`: APP v01.69.02 → APP v01.69.03

## 2026-03-29 — Admin-App v01.69.02 — Telemetria Chatbot Tab Merge
### Alterado
- **Telemetria — Fusão de abas**: abas "Chatbot" e "Auditoria IA" unificadas em aba única "Chatbot IA" com duas seções (conversas + auditoria de contexto). Import `MessageSquare` removido.
### Controle de versão
- `admin-app`: APP v01.69.01 → APP v01.69.02

## 2026-03-29 — Admin-App v01.69.01 — AI Status UI Humanization + Telemetry Instrumentation
### Alterado
- **AI Status / GCP Tab — Quota humanizada**: nomes de métricas de quota GCP migrados de `snake_case` cru para labels humanas via constante `QUOTA_HUMAN_NAMES` (module-level). Mapa cobre `generate_content_requests`, `api_requests`, `model_requests`, `tokens_per_minute`, `images_per_minute`, `embedding_requests`, `batch_requests`. Fallback: title-case automático para métricas desconhecidas.
- **AI Status / GCP Tab — Quota ilimitada**: valores de quota `int64 MAX` (≥9e18, constante `INT64_MAX_THRESHOLD`) agora exibem badge "Ilimitado ∞" em violeta, substituindo o número bruto `9.223.372.036.854.776.000`.
- **AI Status / Usage Tab — Empty state**: substituído bloco de código com instruções de instrumentação por design limpo com badge "Instrumentação ativa ✓".
### Adicionado
- **Telemetria — `mainsite/ai/transform.ts`**: instrumentação fire-and-forget para `ai_usage_logs` (D1 via `BIGDATA_DB`) após cada chamada Gemini `generateContent`. Registra `module='mainsite'`, `model`, `input_tokens`, `output_tokens`, `latency_ms`, `status`. Helper `logAiUsage()` com `.catch()` silencioso para nunca bloquear o fluxo principal.
- **Telemetria — `news/discover.ts`**: mesma instrumentação para descoberta de feeds RSS via Gemini API (`module='news-discover'`). Binding D1 passado como parâmetro opcional.
### Controle de versão
- `admin-app`: APP v01.69.00 → APP v01.69.01

## 2026-03-29 — Admin-App v01.69.00 — AI Status Module (Tier A+B+C)
### Adicionado (MAJOR)
- **AI Status — módulo novo**: dashboard de monitoramento completo para Gemini AI, 3 tiers:
  - **Tier A (Modelos & Rate Limits)**: catálogo live de modelos Gemini via API, health check com latência, tabelas de referência estática Free/Paid.
  - **Tier B (Uso & Telemetria)**: self-managed via `BIGDATA_DB` (D1). Tabela `ai_usage_logs` com auto-migração. GET (aggregação) + POST (log de consumo). Gráfico diário CSS, breakdown por módulo/modelo.
  - **Tier C (GCP Cloud Monitoring)**: JWT→OAuth2 com Service Account (`GCP_SA_KEY` + `GCP_PROJECT_ID`). Consulta Cloud Monitoring API. Guia interativo de setup no painel.
- **Backend**: `models.ts`, `health.ts`, `usage.ts`, `gcp-monitoring.ts` em `functions/api/ai-status/`.
- **Frontend**: `AiStatusModule.tsx` com 3 tabs, health badge dinâmico, spinner, retry.
- **Telemetria**: `ai-status` adicionado às unions de tipo em `operational.ts`.
### Controle de versão
- `admin-app`: APP v01.68.00 → APP v01.69.00
### Lição operacional — Cloudflare Secrets + GCP SA Key
- **Cloudflare Secrets** armazena o valor como string encriptada. Para `GCP_SA_KEY`, deve-se colar o **conteúdo completo do arquivo `.json`** da Service Account (começa com `{"type":"service_account",...}`), **não** o fingerprint/hash da chave (hex como `b89ccf571a...`) nem o Key ID.
- O GCP Console exibe o fingerprint SHA-1 na lista de chaves — esse **não** é o valor correto para o secret.
- Diagnóstico implementado: `gcp-monitoring.ts` exibe preview seguro dos primeiros 40 chars do valor recebido quando o parse falha, facilitando identificação do problema.

## 2026-03-29 — Admin-App v01.67.03 — Frontend Refund Status Override Fix
### Corrigido
- **Root cause real**: `parseSumupPayload()` em `financeiro-helpers.ts` lia `transactions[0].status` (pagamento original = `SUCCESSFUL`). A cadeia `resolveStatusConfig` → `resolveEffectiveSumupStatus` priorizava esse `txStatus` extraído sobre o `log.status` correto do backend, exibindo `APROVADO` quando deveria exibir `ESTORNADO`.
- **Fix**: `parseSumupPayload()` agora escaneia todo `transactions[]` com a mesma lógica de refund do backend — filtra `type=REFUND` + `status=SUCCESSFUL`, soma valores, e resolve `REFUNDED`/`PARTIALLY_REFUNDED`.
### Controle de versão
- `admin-app`: APP v01.67.02 → APP v01.67.03

## 2026-03-29 — Admin-App v01.67.02 + Mainsite v03.01.01/v02.00.01 — Refund Detection + Sitemap Fix
### Corrigido
- **Financeiro/SumUp — detecção inteligente de reembolsos**: `sumup-sync.ts` e `financeiro.ts` (admin-app) + `payments-sumup.ts` (mainsite-worker) agora iteram todo `transactions[]` do checkout SumUp. Transações `type: "REFUND"` são somadas para resolver `REFUNDED` (total) ou `PARTIALLY_REFUNDED` (parcial). Antes, apenas `transactions[0]` era lido.
- **Financeiro/MP — detecção de reembolso parcial**: `payments-mp.ts` expandido para verificar `refunds[]`/`refund_resources[]` no payload.
- **Prioridade do provedor**: regra formalizada — dados de APIs SumUp/MP sempre sobrescrevem D1; banco serve apenas como cache offline.
- **Sitemap vazio**: `functions/sitemap.xml.js` corrigido — tabela `mainsite_posts` (não `posts`) e coluna `display_order` (não `created_at`).
- **TypeScript lint errors**: interfaces explícitas (`SumUpTransaction`, `SumUpCheckout`, `FinancialLog`), import `D1Database`, tipagem estrita de handlers. Zero `any` implícito.
- **Deps — vulnerabilidades**: `brace-expansion` (moderate) e `picomatch` (high) corrigidos via `npm audit fix`.
### Controle de versão
- `admin-app`: APP v01.67.01 → APP v01.67.02
- `mainsite-frontend`: APP v03.01.00 → APP v03.01.01
- `mainsite-worker`: v02.00.00 → v02.00.01

## 2026-03-28 — Admin-App v01.67.01 — Rate Limit Contato Parity
### Adicionado
- **Rate Limit `contato`**: rota Formulário de Contato adicionada a Astrólogo, Calculadora e MainSite para paridade total com Oráculo. Default: 5 req / 30 min. Afetou `astrologo-admin.ts`, `calculadora-admin.ts`, `mainsite/rate-limit.ts` e `rate-limit-common.ts`.
### Controle de versão
- `admin-app`: APP v01.67.00 → APP v01.67.01

## 2026-03-28 — Admin-App v01.67.00 — Cloudflare Pages Deployment Governance
### Adicionado
- **Governança de Deployments**: nova seção em Configurações que varre todos os projetos Cloudflare Pages, identifica deployments obsoletos (tudo exceto o mais recente) e expurga via API nativa, com progresso em tempo real.
- **Backend**: `cleanup-deployments.ts` (GET scan + POST delete unitário) + helper `deleteCloudflarePagesDeployment` em `cfpw-api.ts`.
- **Frontend**: `DeploymentCleanupPanel.tsx` — componente com máquina de estados (idle→scanning→scanned→purging→complete), terminal macOS com log ao vivo, barra de progresso animada, cards de projeto com badges de status e fluxo abortar.
### Arquitetura
- **Frontend-driven orchestration**: o frontend itera pela lista de deployments obsoletos e chama o backend para cada delete individualmente, permitindo UX responsiva sem WebSockets.
- **Safety**: confirmação obrigatória antes do purge; botão Abortar interrompe o loop.
### Controle de versão
- `admin-app`: APP v01.66.01 → APP v01.67.00

## 2026-03-28 — Admin-App v01.66.01 — CF DNS Audit False-Positive Fix
### Corrigido
- **CF DNS — Falsos positivos de auditoria**: `operationalAlerts` em `CfDnsModule.tsx` validava o draft vazio (`type=A`, `name=''`, `content=''`) ao carregar o módulo, gerando alertas `CFDNS-A-INVALID` sem interação do usuário. Fix: alertas de draft só disparam quando `showRecordForm || isEditing`. Alerta `CFDNS-ZONE-MISSING` permanece incondicional.
- **CF DNS — A records ausentes em CNAME flattening**: validado via documentação Cloudflare que registros A visíveis em `dig`/`nslookup` para apex com CNAME flattening são sintetizados pela edge e não existem como registros armazenados — a API retorna corretamente o CNAME real.
### Controle de versão
- `admin-app`: APP v01.66.00 → APP v01.66.01

## 2026-03-28 — Admin-App v01.66.00 — Oráculo Rate Limit Controls
### Adicionado
- **Oráculo — Rate Limit (paridade Astrólogo)**: controle completo de rate limit implementado para o módulo Oráculo Financeiro, cobrindo 4 rotas: `analisar-ia`, `enviar-email`, `contato`, `tesouro-ipca-vision`.
- **Backend**: `oraculo-admin.ts` (helper D1) + `oraculo/rate-limit.ts` (endpoint GET/POST) com tabelas dedicadas, fallback resiliente e telemetria via `operational.ts`.
- **Frontend**: dropdown de Rate Limit em Configurações agora inclui opção "Oráculo" com `RateLimitPanel` genérico reutilizado.
### Alterado
- **Telemetria**: tipo `module` em `operational.ts` expandido com `'oraculo'`.
### Controle de versão
- `admin-app`: APP v01.65.03 → APP v01.66.00

## 2026-03-28 — Admin-App v01.65.03 — CF DNS Visual UX + CF P&W Humanized Results
### Alterado
- **CF DNS — Badges de proxy coloridos**: tabela exibe badges visuais `Proxied` (laranja, ícone Cloud) e `DNS only` (cinza) com tooltip, substituindo texto genérico.
- **CF DNS — TTL humanizado**: TTL `1` exibe `Auto` estilizado. Conteúdo longo (> 60 chars) truncado com tooltip.
- **CF P&W — Resultado humanizado**: JSON bruto substituído por badge de status verde, tabela key-value e JSON colapsável (`<details>`).
- **CF P&W — Confirmação destrutiva**: operações de delete pedem `window.confirm` antes de executar.
- **CF P&W — Secret toggle**: botão Eye/EyeOff para mostrar/ocultar valor de secret.
- **CF P&W — Transições suaves**: campos condicionais com animação fade-in + slide-down.

### Controle de versão
- `admin-app`: APP v01.65.02 → APP v01.65.03

## 2026-03-28 — Admin-App v01.65.01 — CF DNS Proxied Record Validation Fix
### Corrigido
- **Validação de registros proxied**: função `parseCommonRecordDraft()` modificada para aceitar parâmetro `proxied` e dispensar validação de conteúdo quando `proxied = true`. Elimina falsos positivos para registros gerenciados pela Cloudflare.
- **Regra universal**: todos os registros DNS com `proxied = true` (sem distinção de tipo) são agora considerados válidos, independentemente do conteúdo do campo `content`.

### Controle de versão
- `admin-app`: APP v01.65.00 → APP v01.65.01

## 2026-03-28 — Admin-App v01.65.00 — Cloudflare Full-Parity Expansion + DNS Zone Context
### Adicionado
- **CF P&W (fases 1-3 unificadas)**: adicionadas operações para criação de Worker por template, criação de projeto Pages, atualização de settings de Pages, gestão de versões de Worker (list/promote) e gestão de rotas de Worker por zona (list/add/delete).
- **CF P&W (operação raw controlada)**: nova ação `raw-cloudflare-request` no endpoint unificado para cobrir endpoints Cloudflare não modelados, com validação de path e método.

### Alterado
- **CF P&W helper**: `cfpw-api.ts` recebeu suporte a `multipart/form-data` para publish de Worker e novos métodos avançados (create/update/version/routes/raw).
- **CF P&W painel**: `CfPwModule` ampliado com novas ações/inputs operacionais para execução avançada end-to-end.
- **CF DNS alerting**: alertas passaram a incluir explicitamente o domínio/zona ativo no texto (`cause`/`action`) para eliminar ambiguidade operacional.

### Controle de versão
- `admin-app`: APP v01.64.00 → APP v01.65.00

## 2026-03-28 — Admin-App v01.64.00 — Cloudflare P&W Advanced Ops + DNS Detailed Alerts
### Adicionado
- **CF P&W (paridade avançada)**: criado endpoint unificado `functions/api/cfpw/ops.ts` para operações avançadas de Workers e Pages (schedules, usage model, secrets, domains, retry/rollback/logs de deployments).
- **CF P&W (controle operacional)**: `CfPwModule` recebeu painel de operações avançadas com seleção de ação, parâmetros contextuais e preview de retorno para auditoria técnica.

### Alterado
- **CF P&W helper**: `functions/api/_lib/cfpw-api.ts` foi expandido com novos métodos da API Cloudflare para cobrir superfícies críticas além de overview/detalhes/exclusão.
- **CF DNS alerting**: `CfDnsModule` passou a emitir alertas estruturados (`code`, `cause`, `action`) por regra de validação, melhorando diagnóstico e acionabilidade.

### Controle de versão
- `admin-app`: APP v01.63.01 → APP v01.64.00

## 2026-03-28 — Admin-App v01.63.01 — Cloudflare UX Fidelity + Details Resilience
### Alterado
- **CF DNS (fidelidade Cloudflare)**: edição de registro agora abre inline imediatamente abaixo da linha selecionada, preservando contexto operacional da tabela.
- **CF DNS (harmonia visual)**: densidade de grid/ações compactada com redução de paddings, fontes e botões para eliminar sobreposição e manter legibilidade em frame denso.

### Corrigido
- **CF P&W (502 em detalhes)**: `worker-details.ts` e `page-details.ts` migrados para estratégia resiliente com `Promise.allSettled`, evitando quebra total quando apenas um subendpoint falha.
- **CF P&W (detalhes humanizados)**: painel de detalhes deixou de exibir JSON bruto como visão primária, adotando resumo estruturado e tabela de deployments.

### Controle de versão
- `admin-app`: APP v01.63.00 → APP v01.63.01

## 2026-03-28 — Admin-App v01.63.00 — Cloudflare Control Expansion (CF DNS + CF P&W)
### Adicionado
- **CF DNS (módulo completo)**: gestão end-to-end de zonas e registros DNS Cloudflare no `admin-app`, com listagem, filtros, CRUD e confirmações operacionais.
- **CF DNS avançado**: suporte estruturado para SRV/CAA/URI/HTTPS/SVCB, hidratação de `data` e validações semânticas preventivas no save.
- **CF P&W (módulo novo)**: gestão nativa de Cloudflare Pages & Workers com overview de conta, detalhes de recursos/deployments e exclusão com confirmação por redigitação.
- **Backend cfpw**: novos endpoints `overview`, `worker-details`, `page-details`, `delete-worker`, `delete-page` e helper dedicado `cfpw-api.ts` com priorização de token `CLOUDFLARE_PW`.
### Alterado
- **Telemetria operacional**: módulo `cfpw` incluído em `functions/api/_lib/operational.ts` para trilha padronizada em `BIGDATA_DB`.
- **Regra fixa de menu lateral**: formalizado no `App.tsx` que `Visão Geral` permanece sempre primeiro, `Configurações` sempre último e os demais módulos em ordem alfabética.
### Controle de versão
- `admin-app`: APP v01.62.04 → APP v01.63.00

## 2026-03-28 — Admin-App v01.61.02 — Astrologo UserData Frontend Alignment
### Corrigido
- **User Data Render mapping**: JSON parsing de `dadosJson` do `AstrologoModule` ajustado para suportar `ResultData` encabeçado sob a prop `mapasSalvos` quando enviado pelo client.
- **Frontend CamelCase Parity**: O renderizador universal `renderMapaCard` foi expandido para puxar keys tanto em `snake_case` (DB nativo) quanto em `camelCase` e do objeto `query` (padrão de array salva como snapshot pelo frontend), permitindo visualização de histórico de mapas da comunidade sem bugar por falhas de parser.
### Controle de versão
- `admin-app`: APP v01.61.01 → APP v01.61.02

## 2026-03-28 — Admin-App v01.61.01 — Mainsite Editor Layout Tweaks
### Alterado
- **MainsiteModule**: Removido o botão "Novo Rascunho" da barra de ferramentas.
- **PostEditor**: Botão "Salvar Alterações/Criar post" realocado para a barra superior (`inline-actions`), à esquerda do botão de "Limpar".
- **PopupPortal**: CSS ajustado para permitir que o frame do editor de texto expanda e contraia dinamicamente consumindo todo o pop-up, com margem de 1cm.
### Controle de versão
- `admin-app`: APP v01.61.00 → APP v01.61.01

## 2026-03-28 — Admin-App v01.61.00 — Calculadora AI Model Selector
### Adicionado
- **Paridade Multi-Módulo**: Implantado o seletor de modelos de IA (Gemini) no `CalculadoraModule`, idêntico ao Astrologo e Oraculo. Renderiza uma rotina buscando os ranges flash e pro da infra base do Google via API interna e salvaguarda a escolha no navegador sob a chave de configuração `calculadora-config` em memória síncrona com `localStorage`. O endpoint `/api/calculadora/modelos` foi implementado com resiliência total a timeouts.
### Controle de versão
- `admin-app`: APP v01.60.02 → APP v01.61.00

## 2026-03-28 — Admin-App v01.60.02 — Cloudflare DNS Token Resolution
### Corrigido
- **MTA-STS & Cloudflare DNS API**: Refatorada a lógica de resolução de tokens (`functions/api/_lib/cloudflare-api.ts`) para priorizar a variável de ambiente `CLOUDFLARE_DNS` antes da `CF_API_TOKEN` e `CLOUDFLARE_API_TOKEN`. 
- Isso resolve um Conflito de Permissões Crítico onde o token do Oráculo (`CF_API_TOKEN`, com privilégios limitados apenas a Worker Scripts) estava sendo interceptado pelos módulos de auditoria de DNS do app, causando Erros 403 (Authentication Error) nas listagens. A integração agora honra a regra do menor privilégio (SoC), enviando cada token estritamente para sua respectiva finalidade.
### Controle de versão
- `admin-app`: APP v01.60.01 → APP v01.60.02

## 2026-03-28 — Admin-App v01.60.01 — Menu Lateral e Deploy Automático
### Corrigido
- **Menu Lateral**: a lista de navegação do menu lateral (`.nav-list`) agora possui rolagem vertical inteligente (`overflow-y: auto`), resolvendo quebra de interface quando há muitos módulos, garantindo acesso completo aos itens preservando o estado colhido da navbar.
### Alterado
- **Deploy Automático**: injetado a flag `--commit-dirty=true` no passo de Pages Deploy da action correspondente no Cloudflare para garantir resiliência aos eventos disparados de ambiente contínuo do Github.
### Controle de versão
- `admin-app`: APP v01.60.00 → APP v01.60.01

## 2026-03-28 — LCV Workspace — Migração TLS-RPT (Admin-App v01.60.00)
### Adicionado
- **TLS-RPT no Admin-App**: Módulo frontal e motor de processamento foram migrados do `tlsrpt-app` isolado diretamente para dentro do `admin-app`.
- **Frontend nativo**: Criado `TlsrptModule.tsx` integrando a interface do relatador no sidebar do painel administrativo.
- **Backend nativo**: Adicionado o binding `TLSRPT_MOTOR` no `wrangler.json` (Service Binding) para conectar ao motor, roteado localmente via `functions/api/tlsrpt/[[path]].ts`.
### Alterado
- CORS do motor TLS-RPT relaxado (`ALLOWED_ORIGIN: "*"`) para aceitar o proxy interno. Action `deploy.yml` agora gerencia os deploys conjuntos.
### Removido
- Repositório autônomo `tlsrpt-app` foi inteiramente deletado do workspace.
### Controle de versão
- `admin-app`: v01.59.02 → v01.60.00.

## 2026-03-28 — SumUp Canonical Checkout ID Reconciliation (Admin-App + Mainsite)
### Corrigido
- **Root cause fechada**: `mainsite_financial_logs` podia alternar entre `checkout.id` e `transaction.id` como `payment_id` durante syncs SumUp. Isso fazia estornos/cancelamentos acertarem um identificador e o painel ler outro, preservando badges em `SUCCESSFUL` apesar do provider já exibir `Refunded`.
- **Admin-App**: `sumup-sync.ts`, `sumup-refund.ts`, `sumup-cancel.ts`, `financeiro.ts`, `reindex-gateways.ts` e `financeiro-helpers.ts` agora convergem para `checkout.id` como chave canônica e preservam estados terminais na reconciliação.
- **Mainsite Worker/Admin**: `sumup/sync`, rotas de refund/cancel e aliases legados foram ajustados para atualizar tanto registros canônicos quanto legados, impedindo regressão visual no `mainsite-admin/financeiro/sumup`.

### Controle de versão
- `admin-app`: APP v01.59.01 → APP v01.59.02
- `mainsite-admin`: APP v03.46.06 → APP v03.46.07
- `mainsite-worker`: v01.35.01 → v01.35.02

## 2026-03-27 — Oráculo Financeiro v01.07.00 + Admin-App v01.57.00 — Data Architecture Overhaul (Email Linkage + Cascade Delete)
### Adicionado
- **Email linkage**: coluna `email TEXT DEFAULT ''` adicionada a `oraculo_tesouro_ipca_lotes` e `oraculo_lci_cdb_registros` via self-healing migration. `oraculo-auth.ts` `verify-save` vincula email nos registros individuais via `stampEmailOnRecords()`.
- **Auto-exclusão de dados (frontend)**: botão "🗑️ Excluir Meus Dados" no frontend com fluxo email/token (`request-delete-token` + `verify-delete`). Cascata por email em 4 tabelas.
- **Cascata de exclusão (admin-app)**: `userdata.ts` DELETE cascateia por IDs do JSON + email (safety net) em todas as tabelas. `excluir.ts` sincroniza `dados_json` ao excluir registro individual.
### Corrigido
- **Cron resetava ao deploy**: `triggers.crons` hardcoded em `wrangler.json` sobrescrevia agendamento. Removido — gerenciado exclusivamente via API Cloudflare.
- **[SECURITY] GET handlers públicos removidos**: `onRequestGet` de `tesouro-ipca.ts` e `registros-lci-cdb.ts` retornavam todos os registros sem autenticação. Removidos.
- **[SECURITY] Frontend auto-load removido**: `carregarRegistros()` deletado. Frontend inicia vazio — dados só via email/token.
- **Sessão persistente 60 min**: após OTP, backend gera session token (UUID/60min). Frontend `sessionStorage` + `session-retrieve` com rotação de token. Sobrevive F5, não sobrevive fechar janela.
### Melhorado
- **Botão "Análise Inteligente"**: reposicionado para antes dos botões de ação, centralizado em linha própria, largura 100%.
### Arquitetura
- **5 tabelas D1**: `oraculo_user_data` (JSON blob/email), `oraculo_auth_tokens` (OTP), `oraculo_tesouro_ipca_lotes` (lotes + email), `oraculo_lci_cdb_registros` (registros + email), `oraculo_taxa_ipca_cache` (mercado).
- **Princípio**: dados em todas as tabelas são vinculados ao email do usuário. Nenhum dado pode ser exibido no frontend público sem autenticação via email/token.
### Controle de versão
- `oraculo-financeiro`: v01.06.02 → v01.07.00.
- `admin-app`: v01.56.02 → v01.57.00.

## 2026-03-27 — Oráculo Financeiro v01.06.01 + Admin-App v01.56.01 — Cron Modernization + Observability + Fixes
### Adicionado
- **Admin-App OraculoModule — Cron Schedule Live**: campos cosmético/read-only de cron substituídos por selects de hora/minuto BRT compactos + botão "Salvar" que chama Cloudflare Workers Schedules API (`PUT /accounts/{id}/workers/scripts/cron-taxa-ipca/schedules`). Carrega schedule atual ao abrir aba Configurações.
- **[NEW] `functions/api/oraculo/cron.ts`**: endpoint GET (lê schedule) e PUT (atualiza schedule) via `CF_API_TOKEN` + `CF_ACCOUNT_ID`.
### Corrigido
- **Cron Worker CSV Parser**: `parseCSV` reescrito com mapeamento correto de 7 colunas (antes usava 8, causando dados corrompidos). Full-scan para data-base mais recente implementado.
- **Dropdown Vencimentos desordenado**: sort de `dd/mm/yyyy` via `localeCompare` direto → convertido para `yyyymmdd` antes de comparar.
- **IDE Type Errors**: `ScheduledEvent` e `ExecutionContext` declarados inline no worker (sem dependência de `@cloudflare/workers-types`).
### Melhorado
- **Cron Worker Observability completa**: logging granular — trigger metadata (scheduledTime, cron expression, UTC), origem (`cron(...)` vs `http-manual`), listagem de cada título IPCA+, timing separado de parse e D1, stack trace em erros.
- **Admin-App cron.ts GET logging**: endpoint loga schedule lido e erros.
- **Footer Buttons UX**: `box-shadow` e hover `#1557b0` com glow nos botões Contato/E-mail.
### Controle de versão
- `oraculo-financeiro`: v01.05.00 → v01.06.00 → v01.06.01.
- `admin-app`: v01.55.00 → v01.56.00 → v01.56.01.

## 2026-03-26 — Oráculo Financeiro v01.05.00 + Admin-App v01.55.00 — Email Report Rewrite + Admin Data View
### Alterado
- **E-mail de Análise — reescrita completa**: `gerarHtmlRelatorio()` reescrito com inline CSS replicando a tela do frontend (parâmetros, LCI/LCA com benchmark, Tesouro IPCA+ com MtM/lotes/sinal, análise IA com badge/ciladas/recomendação). Design tiptap.dev com `@media` responsive.
- **Admin-App OraculoModule — detalhe do usuário**: visualização reescrita com card de parâmetros (CDI/IPCA/Duration/taxa/aporte), lotes Tesouro com `border-left` colorida (MANTER/VENDER), texto de análise, totais agregados. LCI/LCA com badge IR e CDB equivalente.
- **Vencimentos cronológicos**: dropdown IPCA+ ordenado do vencimento mais próximo ao mais distante.
### Corrigido
- **Lint TypeScript**: corrigidos comparadores `benchmarkLci.classe` (`'bom'`→`'muito-bom'`, `'razoavel'`→`'regular'`) e `analiseIa.recomendacao` (`'INVESTIR'`→`'MANTER'`).
### Controle de versão
- `oraculo-financeiro`: v01.04.00 → v01.05.00.
- `admin-app`: v01.54.01 → v01.55.00.

## 2026-03-26 — Oráculo Financeiro v01.03.00 + Admin-App v01.53.00 — Tesouro Transparente + Cron + Redesign Admin
### Adicionado
- **Tesouro Transparente**: Worker `/api/taxa-ipca-atual` migrado de ANBIMA (paga) para CSV público gratuito. Cache D1 (`oraculo_taxa_ipca_cache`). Suporta `?force=true`.
- **Cron Worker**: `workers/cron-taxa-ipca/` — scheduled handler `0 5 * * *` (02:00 BRT). CI/CD via `deploy.yml`.
- **Máscaras Input BR**: `formatBRL`/`parseBRL`/`formatTaxa` — 7 inputs convertidos para formato brasileiro.
- **Admin-App OraculoModule**: redesign 3 abas. Configurações: status cache, URL CSV, cron, modelos IA, trigger manual CSV.
### Alterado
- **~~MP 2026~~** *(corrigido em v01.06.02)*: MP 1.303/25 caducou em outubro/2025 sem conversão em lei; tabela regressiva IR (22,5%→15%) permanece vigente. Prompt Vision: `gemini-3.1-pro-preview`, datas `dd/mm/aaaa`.
### Controle de versão
- `oraculo-financeiro`: v01.02.05 → v01.03.00.
- `admin-app`: v01.52.01 → v01.53.00.

## 2026-03-26 — Admin-App v01.52.00 + Oráculo Financeiro v01.02.00 — Migração de Gestão de Registros e UI Redesign (Tiptap / Google Blue)

### Escopo Admin-App (v01.52.00)
- **[NEW] OráculoModule.tsx**: criado módulo 'Oráculo Financeiro' no painel principal, idêntico ao modelo AstrologoModule. Interfaces organizam listagem (`/api/oraculo/listar` paginada via D1) e deleção de dados simulados LCI/LCA + Tesouro IPCA+. 
- **Integração:** Adicionado no `App.tsx` (Lazy Load) e menu lateral (ícone `BrainCircuit`). **Menu Principal reordenado** estritamente por ordem alfabética (Visão Geral em 1º, Configurações por último).

### Escopo Oráculo Financeiro Frontend (v01.02.00)
- **UI Redesign**: Removido interface pesada (blurs e gradients) na camada de design tokens (\`index.css\` e \`App.css\`). Substituído por padrão **Tiptap/Google Blue** — cards sólidos brancos (30px radius), border sutil de 1px off-black, fonte Google Fonts *Inter*, botões 'pill' de alta fricção Google Blue (#1a73e8).
- **Cleanup**: Tabela de registros no rodapé e state hooks associados foram *DELETADOS* do frontend (função assumida 100% pelo admin-app).
- **Compliance AI**: Gemini API end-points (\`functions/api/analisar-ia.ts\`) receberam upgrade de *Safety Settings* (Harassment, Sexually Explicit para *BLOCK_ONLY_HIGH*), garantindo filtro coerente de extração de thought para 'thinking models'.



### Implementação Multimodal (OCR Vision + Drag & Drop)
- **Objetivo Concluído**: O fluxo de captura de imagens de extratos do Tesouro Direto foi materializado no frontend do Oráculo Financeiro (`tesouro-ipca-vision`).
- **Engenharia de Prompting API**: 
  - Criação do Cloudflare Worker `/api/tesouro-ipca-vision.ts` interceptando uploads em Base64, e forçando `responseMimeType: "application/json"` ao endpoint do Gemini 1.5 Pro.
  - Segurança `BLOCK_ONLY_HIGH` aplicada no processamento.
  - Extração literal validada de `dataCompra`, `valorInvestido` e `taxaContratada` com purga cirúrgica de marcação markdown.
- **Frontend Dropzone**:
  - `App.tsx` abraçou os arrays de evento `onDragOver` e `onDrop` revelando um *backdrop filter* azul (identidade Visual Tiptap). O frontend auto-preenche e notifica sucesso com `pushNotification` sem violar requisições em lote desnecessárias ao banco de dados `BIGDATA_DB`.

## 2026-03-26 — Admin-App v01.51.00 — Remoção do Mecanismo de Dry Sync

### Removido
- **Dry Sync Extinto**: O mecanismo de "Simular antes (dry run)" foi completamente removido do aplicativo e dos backends (agora considerados estáveis).
- **UI**: Remoção do checkbox e de variáveis de simulação em `SyncStatusCard.tsx` e tela de configurações (`ConfigModule.tsx` `defaultSyncDryRun`).
- **Backend**: Limpeza completa da flag `?dryRun=1` das Pages Functions (`api/mainsite/sync`, `api/mtasts/sync`, `api/astrologo/sync`, `api/calculadora/sync`, `api/mainsite/migrate-media-urls`). Simplificados fluxos de persistência no `BIGDATA_DB` e logs do D1 (removidas chaves virtuais como "settingsInseridos: dryRun ? 0 : X").

### Controle de versão
- `admin-app`: v01.50.00 → v01.51.00.

### Auditoria Paritária
- Workspace inteiro (todos os apps) escaneado em busca de `dry run`/`dryrun` remanescentes: 0 instâncias ativas fora de dependências (node_modules/CLI docs).

### Qualidade
- `npm run build` ✅ admin-app (637ms)

## 2026-03-26 — Admin-App v01.50.00 — Global Settings Parity (mainsite-admin → admin-app)

### Adicionado
- **Configurações Globais — 8 novos controles**: seção "Configurações Globais (Ambos os Temas)" no `ConfigModule.tsx` ampliada de 3 para 11 controles, replicando `mainsite-admin/SettingsPanel.jsx`:
  - Peso do Corpo de Texto (select 300–700), Peso dos Títulos (select 500–900), Altura de Linha (range 1.4–2.4), Alinhamento do Texto (justify/left), Recuo da Primeira Linha (0–3.5rem), Espaçamento entre Parágrafos (1.2–3rem), Largura Máxima de Leitura (680px–100%), Cor dos Links (color picker).
- **Família da Fonte — 7 opções**: select alinhado ao mainsite-admin (Inter Recomendada, System UI, Sans-Serif, Georgia, Times New Roman, Courier New, Monospace).
- **Tipo `AppearanceSettings.shared`**: expandido com 8 campos opcionais. Defaults alinhados ao mainsite-admin.
- **CSS**: `.range-value`, `.range-labels`, `input[type="range"]` em `.settings-fieldset`.

### Controle de versão
- `admin-app`: v01.49.02 → v01.50.00.

### Qualidade
- `npm run build` ✅ admin-app (1.23s)

## 2026-03-26 — Admin-App v01.49.02 — FloatingScrollButtons Fix

### Corrigido
- **FloatingScrollButtons CSS**: `position: sticky` não funciona dentro de container com `overflow-y: auto` (`.content`). Corrigido para `position: fixed` com `bottom: 24px; right: 24px`. Removido `margin-top: -60px` hack e `pointer-events: none` do container.
- **App shell layout**: `.app-shell` tinha `min-height: 100vh` — grid row crescia infinitamente, `.content` nunca desbordava, scroll events nunca disparavam. Corrigido para `height: 100vh` + `min-height: 0` em `.content`. Agora `.content` é constrito pela viewport e rola internamente.

## 2026-03-26 — Admin-App v01.49.01 — PostEditor Cleanup

### Removido
- **Indicador "Modo atual"**: campo read-only (`Criando novo post` / `Editando #ID`) removido do popup do editor. Sem função prática.
- **`form-grid` wrapper**: removido pois restava apenas o campo título, que agora ocupa a largura completa.

### Controle de versão
- `admin-app`: v01.49.00 → v01.49.01.

### Qualidade
- `npm run build` ✅ admin-app (939ms)

## 2026-03-26 — Admin-App v01.49.00 — UI/UX Redesign (tiptap.dev Style, Google Blue)

### Design Tokens atualizados (`variables.css`)
- **Paleta primária**: `#3b82f6` → `#1a73e8` (Google Blue). Secondary purple removido (unificado).
- **Background**: `#f8fafc` → `#f5f4f4` (warm gray tiptap). Texto `#0f172a` → `#0d0d0d`.
- **Bordas**: `rgba(148,163,184)` → `rgba(0,0,0)` (warm). Font: `'Inter'` primária.
- **Radius**: card `24px` → `30px`, button `16px` → `100px` (pill), input `16px` → `10px`.
- **Shadows**: ultra-subtle (`0.04–0.08` opacidade vs `0.1–0.14` anterior).

### Sidebar redesenhada
- Fundo escuro navy → claro `#f5f4f4`. Texto → `#0d0d0d`. Nav items pill (100px radius).
- Active: `rgba(26,115,232,0.1)` + texto Google Blue. Brand card pill (100px).

### Content + Cards + Module Shells
- Background: gradientes radiais removidos → sólido `#f5f4f4`.
- Cards: `rgba(255,255,255,0.72)` → `#ffffff`. Shadows `0 18px 48px` → `0 1px 3px`.
- Module shells: glassmorphism heavy removido → clean white surface.
- Buttons: gradient azul-roxo → sólido preto com hover Google Blue. Pill (100px).

### WCAG/eMAG preservado
- Focus indicators: `#3b82f6` → `#1a73e8`. Skip-link, sr-only, forced-colors, reduced-motion intactos.
- Contraste mantido: `#0d0d0d` / `#f5f4f4` = 17.4:1, `#514b48` / `#fff` = 5.8:1.

### Controle de versão
- `admin-app`: v01.48.01 → v01.49.00.

### Qualidade
- `npm run build` ✅ admin-app (869ms)

## 2026-03-26 — Admin-App v01.48.01 — TipTap Console Warnings + AI Pill UI

### Console warnings corrigidos
- **Duplicate `underline` extension**: `StarterKit` do TipTap v3 já inclui `Underline` por padrão. Removida importação explícita de `@tiptap/extension-underline` e entrada no array `TIPTAP_EXTENSIONS`. O `mainsite-admin` não tinha esse problema pois usa `StarterKit.configure({ underline: false })` + standalone `Underline`.
- **ProseMirror white-space missing**: adicionado `white-space: pre-wrap` na regra `.tiptap-editor .tiptap` em `App.css`. O `mainsite-admin` já tinha essa regra em `index.css`.

### UI aprimorada
- **AI Dropdown pill**: adicionado CSS `.tiptap-ai-group` com design pill (border-radius 100px, fundo `rgba(2, 132, 199, 0.1)`, borda `rgba(2, 132, 199, 0.3)`, texto `#0284c7` bold 800, hover transitions). Dark mode via `[data-theme="dark"]` com cores `#38bdf8`.

### Controle de versão
- `admin-app`: v01.48.00 → v01.48.01.

### Qualidade
- `npm run build` ✅ admin-app (591ms)

## 2026-03-26 — Admin-App v01.48.00 — Editor Evolution Port

### Ported from mainsite-admin (v03.46.02–v03.46.05)
- **BubbleMenu**: toolbar contextual ao selecionar texto (drag, viewport clamping, `ownerDocument.body` portal).
- **FloatingMenu**: toolbar de inserção em linhas vazias (drag, viewport clamping, `ownerDocument.body` portal).
- **TextIndent**: extensão custom TipTap com 4 níveis (0/1.5/2.5/3.5rem), botões Indent/Outdent.
- **Dynamic toolbar**: `transaction` + `selectionUpdate` listeners para estado dinâmico (Word-like).
- **AI Freeform (Wand2)**: botão de instrução livre com popover glassmorphic, portal via `ownerDocument.body`.

### Bugs corrigidos (já existiam no admin-app)
- `defaultAlignment: 'justify'` → removido (fix: justify sempre ativo).
- `font-synthesis: none` + sem Inter italic → Google Fonts URL com `ital` axis adicionada.
- Prompt modal inline → portaled via `ReactDOM.createPortal(ownerDocument.body)`.

### Decisão técnica
- Admin-app usa `PopupPortal.tsx` para o editor → todos os portais usam `ownerDocument.body` (mesma estratégia do mainsite-admin v03.46.04).

### Controle de versão
- `admin-app`: v01.47.00 → v01.48.00.

### Qualidade
- `npm run build` ✅ admin-app (1.06s)

## 2026-03-26 — Admin-App v01.47.00 + Mainsite Worker — updated_at Infrastructure

### Coluna updated_at na mainsite_posts
- **ALTER TABLE**: `updated_at DATETIME DEFAULT NULL` adicionada via D1 dashboard.
- **admin-app/posts.ts**: INSERT seta `updated_at = CURRENT_TIMESTAMP`, UPDATE seta `updated_at = CURRENT_TIMESTAMP`, SELECTs incluem `updated_at`, PostRow type e mapPostRow atualizados.
- **mainsite-worker/index.js**: UPDATE de posts (PUT /api/posts/:id) seta `updated_at = CURRENT_TIMESTAMP`.
- Posts antigos: `updated_at = NULL` (graceful fallback no frontend).

### Controle de versão
- `admin-app`: v01.46.24 → v01.47.00.

## 2026-03-25 — Admin-App v01.46.24 (patch)

### Correções
- **PostEditor — YouTube X-Frame-Options**: `ResizableYoutubeNodeView` agora converte watch URLs para embed format via `getEmbedUrlFromYoutubeUrl` (TipTap). `ReactNodeViewRenderer` bypassa `renderHTML`, exigindo conversão explícita.

### Melhorias
- **PostEditor — Input inteligente YouTube**: aceita código puro (`dQw4w9WgXcQ`) ou URL completa. Regex `^[\w-]+$` detecta código e converte para `https://www.youtube.com/watch?v={code}`.

### Controle de versão
- `APP_VERSION`: `v01.46.23` → `v01.46.24`.
- `CHANGELOG.md`: entrada `v01.46.24` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação
- `npm run lint` ✅ (admin-app)
- `npm run build` ✅ (admin-app)

## 2026-03-25 — Admin-App v01.46.23 (patch)

### Correções
- **PostEditor — Inserção simultânea imagem + legenda**: `insertCaptionBlock` usava `insertContent` que substituía a `NodeSelection` do nó de imagem. Corrigido para `insertContentAt(to, ...)` que insere a legenda na posição imediatamente após o nó de mídia.
- **PostEditor — Integração interna R2**: Eliminada URL externa `mainsite-app.lcv.rio.br/api/uploads/...` no upload de imagens. Criada rota `GET /api/mainsite/media/:filename` para servir R2 localmente via binding `MEDIA_BUCKET`. Upload retorna URL relativa.
- **PostEditor — crossOrigin removido**: `crossOrigin="anonymous"` na `<img>` causava bloqueio silencioso de CORS em imagens cross-origin. Removido sem regressão (tone analysis faz fallback para `'neutral'`).

### Adicionado
- **[NEW] `functions/api/mainsite/media/[filename].ts`**: Serve objetos R2 direto do admin-app.
- **[NEW] `functions/api/mainsite/migrate-media-urls.ts`**: Migra URLs externas para relativas em posts existentes na `bigdata_db`. Suporta `dryRun`.

### Auditoria de URLs externas
- Código morto em `_lib/mainsite-admin.ts`: `fetchLegacyJson`, `fetchLegacyAdminJson`, `readLegacyPublicSettings` — zero chamadores.
- Código morto em `_lib/mtasts-admin.ts`: `fetchLegacyJson`, `postLegacyJson` — zero chamadores.
- Todos os módulos (`sync.ts`, `posts.ts`, `settings.ts`, `rate-limit.ts`) leem/gravam via `BIGDATA_DB` diretamente.
- Usos legítimos confirmados: RSS feeds, Cloudflare API, Gemini API, links de navegação HubCards.

### Controle de versão
- `APP_VERSION`: `v01.46.22` → `v01.46.23`.
- `CHANGELOG.md`: entrada `v01.46.23` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação
- `npm run lint` ✅ (admin-app)
- `npm run build` ✅ (admin-app)

## 2026-03-25 — Admin-App v01.46.17 (patch)

### Correções
- **Financeiro — coluna única robusta no detalhe expandido**: `FinanceiroModule` passou a renderizar detalhes no container `.fin-expanded-stack`, separado de estilos antigos, assegurando cards empilhados em 1 coluna sem regressão por sobrescrita CSS.

### Controle de versão
- `APP_VERSION`: `v01.46.16` → `v01.46.17`.
- `CHANGELOG.md`: entrada `v01.46.17` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

## 2026-03-25 — Admin-App v01.46.16 (patch)

### Correções
- **Financeiro — detalhes novamente visíveis e empilhados**: `.fin-expanded-grid` migrou para fluxo vertical explícito com `.fin-detail-group` em cards de largura total, restaurando leitura de valores no detalhe expandido.

### Alteração operacional
- **CSP local amplamente permissivo**: `admin-app/public/_headers` recebeu política CSP aberta (`default-src/script-src/connect-src/frame-src` com curingas) para reduzir bloqueios e ruído durante diagnóstico operacional.

### Controle de versão
- `APP_VERSION`: `v01.46.15` → `v01.46.16`.
- `CHANGELOG.md`: entrada `v01.46.16` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

## 2026-03-25 — Admin-App v01.46.15 (patch)

### Correções
- **Financeiro — empilhamento vertical dos detalhes**: o container `.fin-expanded-grid` foi ajustado para coluna única fixa no `admin-app`, com cards `.fin-detail-group` empilhados e visual uniforme dentro do frame expandido de transações.

### Controle de versão
- `APP_VERSION`: `v01.46.14` → `v01.46.15`.
- `CHANGELOG.md`: entrada `v01.46.15` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

## 2026-03-25 — Admin-App v01.46.14 (patch)

### Correções
- **Falha residual de módulo lazy com UX controlada**: `admin-app/src/App.tsx` recebeu `LazyModuleErrorBoundary` para capturar erro de carregamento dinâmico após tentativa de recuperação automática e renderizar estado amigável com CTA de recarregar sessão.

### Controle de versão
- `APP_VERSION`: `v01.46.13` → `v01.46.14`.
- `CHANGELOG.md`: entrada `v01.46.14` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

## 2026-03-25 — Admin-App v01.46.13 (patch)

### Correções
- **Cloudflare Access + chunks lazy**: `admin-app/src/App.tsx` recebeu recuperação automática para falhas de `import()` dinâmico (`Failed to fetch dynamically imported module`) com reload único de sessão, mitigando cenário de `401 Unauthorized` em módulos lazy após expiração de autenticação.
- **CSP Report-Only sem warning de diretiva ignorada**: `admin-app/public/_headers` removeu `upgrade-insecure-requests` do `Content-Security-Policy-Report-Only`, eliminando ruído de console sem alterar a política efetiva de bloqueio.

### Controle de versão
- `APP_VERSION`: `v01.46.12` → `v01.46.13`.
- `CHANGELOG.md`: entrada `v01.46.13` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

## 2026-03-25 — Admin-App v01.46.12 (patch)

### Adicionado
- **README com ponte para runbook CSP**: `admin-app/README.md` atualizado para referenciar explicitamente `docs/csp-report-only-edge-checklist.md`, reduzindo tempo de triagem em incidentes de `Content-Security-Policy-Report-Only` no edge.

### Controle de versão
- `APP_VERSION`: `v01.46.11` → `v01.46.12`.
- `CHANGELOG.md`: entrada `v01.46.12` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

## 2026-03-25 — Admin-App v01.46.11 (patch)

### Adicionado
- **Runbook de operação CSP**: criado `admin-app/docs/csp-report-only-edge-checklist.md` com checklist click-by-click para investigar e remover `Content-Security-Policy-Report-Only` inválido injetado no edge Cloudflare.

### Controle de versão
- `APP_VERSION`: `v01.46.10` → `v01.46.11`.
- `CHANGELOG.md`: entrada `v01.46.11` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação
- `npm run build` ✅ (admin-app)

## 2026-03-25 — Admin-App v01.46.10 (patch)

### Correções
- **CSP — headers reforçados no `admin-app`**: `public/_headers` atualizado com `script-src-elem`, `connect-src` explícito e `Content-Security-Policy-Report-Only` alinhado ao runtime estável (`self` + Cloudflare Insights).

### Diagnóstico operacional
- **Ruído de `script-src/connect-src 'none'` em Report-Only**: quando persistir após deploy, a origem tende a ser regra de header no edge (Cloudflare Transform/managed) sobrepondo ou adicionando `Content-Security-Policy-Report-Only`, e não o bundle do app.

### Controle de versão
- `APP_VERSION`: `v01.46.09` → `v01.46.10`.
- `CHANGELOG.md`: entrada `v01.46.10` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação
- `npm run build` ✅ (admin-app)

## 2026-03-25 — Admin-App v01.46.09 (patch)

### Correções
- **Financeiro — badges com texto/cores restaurados**: corrigida a resolução de status efetivo da SumUp para evitar fallback indevido em `—` e recuperar label operacional real na tabela.
- **Financeiro — mapeamento visual compatível com legado**: função de tons atualizada para reconhecer labels pt-BR e variações do painel original (`APROVADO`, `PENDENTE`, `EM ANÁLISE`, `RECUSADO`, `CANCELADO`, `ESTORNADO`), restaurando cores por estado.

### Controle de versão
- `APP_VERSION`: `v01.46.08` → `v01.46.09`.
- `CHANGELOG.md`: entrada `v01.46.09` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação
- `npm run lint` ✅ (admin-app)
- `npm run build` ✅ (admin-app)

## 2026-03-25 — Admin-App v01.46.08 (patch)

### Correções
- **Financeiro — detalhes expandidos com paridade do legado**: seção reconstruída no `admin-app` para espelhar o `mainsite-admin` campo a campo, mantendo adaptação ao esqueleto do `admin-app`.
- **Financeiro — fallback técnico corrigido**: bug que exibia chaves literais (`status_detail`, `payment_id`, `id`) no painel expandido foi corrigido; agora renderiza os valores reais parseados do payload.
- **Financeiro — status SumUp efetivo**: resolução de status passou a priorizar `txStatus`/`checkoutStatus` do payload antes do status bruto do log, alinhando badges e semântica operacional ao painel de referência.
- **Financeiro — matrix de status/actions**: `getSumupStatusConfig` ajustado para o mesmo comportamento do painel original nos estados `SUCCESSFUL`, `PENDING` e `PARTIALLY_REFUNDED`.

### Controle de versão
- `APP_VERSION`: `v01.46.07` → `v01.46.08`.
- `CHANGELOG.md`: entrada `v01.46.08` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação
- `npm run lint` ✅ (admin-app)
- `npm run build` ✅ (admin-app)

## 2026-03-24 — Admin-App v01.46.07 (patch)

### Correções
- **Workspace — alertas ARIA limpos**: `FinanceiroModule` e `ConfigModule` foram reestruturados para usar ramos JSX com atributos ARIA literais, eliminando os avisos do workspace sobre `aria-expanded` e `aria-selected`.
- **Financeiro — semântica mantida sem ruído estático**: a linha expansível da tabela continua acessível por teclado, mas agora sem disparar falso positivo estrutural no editor.
- **Config — discovery RSS sem warnings**: a lista de sugestões preserva `listbox/option` e navegação assistiva, agora com painel de problemas zerado.

### Controle de versão
- `APP_VERSION`: `v01.46.06` → `v01.46.07`.
- `CHANGELOG.md`: entrada `v01.46.07` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação
- `npm run lint` ✅ (admin-app)
- `npm run build` ✅ (admin-app)

## 2026-03-24 — Admin-App v01.46.06 (patch)

### Correções
- **PopupPortal — semântica e foco**: popup nativo passou a publicar `role="dialog"`, `aria-modal` e nome acessível, além de restaurar o foco ao elemento que abriu a janela quando ela fecha.
- **HubCards — reordenação acessível**: catálogo agora suporta reordenação por teclado com setas/Home/End, preservando o drag-and-drop por mouse e reduzindo dependência de ponteiro.
- **News/Config — labels e anúncio assistivo**: campos de busca e descoberta RSS receberam labels explícitas para leitores de tela e `aria-live` para comunicar sugestões dinâmicas.

### Controle de versão
- `APP_VERSION`: `v01.46.05` → `v01.46.06`.
- `CHANGELOG.md`: entrada `v01.46.06` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação
- `npm run lint` ✅ (admin-app)
- `npm run build` ✅ (admin-app)

## 2026-03-24 — Admin-App v01.46.05 (patch)

### Correções
- **Financeiro — acessibilidade de teclado**: linhas expansíveis do histórico financeiro migradas de `div` clicável para `button`, com rótulo acessível e associação explícita à área de detalhes, alinhando o módulo a WCAG 2.1 AA / eMAG em operabilidade por teclado.
- **Financeiro — modal mais semântico**: diálogo financeiro passou a usar `aria-labelledby` e `aria-describedby` para anunciar corretamente o contexto da ação em tecnologias assistivas.
- **Financeiro — gate restaurado**: função interna obsoleta removida após a refatoração dos badges, restabelecendo `npm run lint` e `npm run build` sem falhas.

### Controle de versão
- `APP_VERSION`: `v01.46.04` → `v01.46.05`.
- `CHANGELOG.md`: entrada `v01.46.05` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação
- `npm run lint` ✅ (admin-app)
- `npm run build` ✅ (admin-app)

## 2026-03-24 — Admin-App v01.46.04 (patch)

### Correções
- **Financeiro — badges sem inline style**: badges de status da tabela e dos insights migrados para classes CSS semânticas (`fin-tone-success`, `fin-tone-pending`, `fin-tone-error`, etc.), preservando as cores por estado sem depender de `style={{ ... }}`.
- **Financeiro — limpeza estática**: os avisos restantes do `FinanceiroModule.tsx` relacionados a estilos inline foram eliminados sem alterar o comportamento visual do módulo.

### Controle de versão
- `APP_VERSION`: `v01.46.03` → `v01.46.04`.
- `CHANGELOG.md`: entrada `v01.46.04` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação
- `npm run lint` ✅ (admin-app)
- `npm run build` ✅ (admin-app)

## 2026-03-24 — Admin-App v01.46.03 (patch)

### Correções
- **Financeiro — SumUp 3DS / next_step**: payloads com `next_step`, `pre_action`, `methodRedirect` e `iframe` agora são identificados como fluxo SumUp válido e renderizados com campos estruturados em vez de JSON cru no detalhe expandido.
- **Financeiro — Mercado Pago payloads alternativos**: parser ampliado para exibir `message`, `error`, `code`, `type`, `cause`, `ticket_url` e `qr_code` quando o retorno do gateway foge do formato canônico.
- **Financeiro — Fallback estruturado**: registros fora do padrão agora mostram um resumo técnico legível (status, IDs, método, links e mensagens) no lugar do bloco `Raw` sempre que o payload puder ser parseado.

### Controle de versão
- `APP_VERSION`: `v01.46.02` → `v01.46.03`.
- `CHANGELOG.md`: entrada `v01.46.03` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação
- `npm run build` ✅ (admin-app)

## 2026-03-24 — Admin-App v01.46.02 (patch)

### Correções
- **Financeiro — Cores dos badges**: CSS `.fin-status-badge` e `.fin-insight-count-badge` corrigidos para usar `color: var(--badge-color)` e `background: var(--badge-bg)`. Antes não consumiam as CSS custom properties passadas pelo JSX.
- **Financeiro — Labels pt-BR**: rótulos dos detalhes expandidos traduzidos de inglês para português nos blocos SumUp e Mercado Pago (~30 labels).

## 2026-03-24 — Admin-App v01.46.01 (patch)

### Correções
- **E-mail HTML do Astrólogo**: `astrological-report.ts` reescrito com porte fiel de `gerarHtmlRelatorio()` e `gerarTextoRelatorio()` do `astrologo-frontend`. Modelo de dados corrigido de `planets/houses/aspects` para `astrologia/umbanda/tatwas/numerologia`.
- **Autopreenchimento de e-mail**: formulário inline convertido de `<div>` para `<form autoComplete="on">`, `name="email"`, botão `type="submit"`. Browsers agora sugerem endereços salvos.

## 2026-03-24 — Admin-App v01.46.00 (Antigravity Agent — RSS Discovery Engine + PostEditor Popup)

### Motor de Descoberta RSS Inteligente (3 camadas)
- **[NEW]** `src/lib/rssDirectory.ts`: banco curado de ~150 fontes RSS (Brasil + Internacional) em 12 categorias, com busca fuzzy por nome/URL/categoria/tags.
- **[NEW]** `functions/api/news/discover.ts`: endpoint backend com 3 camadas de descoberta:
  1. Diretório curado local (~150 feeds, matching instantâneo).
  2. Google News RSS dinâmico (`news.google.com/rss/search?q={query}`).
  3. Gemini AI (`gemini-2.5-flash-lite` via Google Generative Language API v1beta).
  4. Bônus: auto-detect de RSS via `<link rel="alternate">` em URLs HTML.
- **ConfigModule**: autocomplete debounced (400ms) nos 3 inputs (Nome, URL, Categoria). Dropdown glassmorphic com badges de origem (📚/📰/🤖/🔍), navegação por teclado (↑↓ Enter Esc), click-outside dismiss.
- **Filtro por categoria**: dropdown `<select>` na seção "Fontes de notícias ativas" com contagem por categoria.
- **Lista scrollável**: fontes com scroll encapsulado (~10 itens visíveis por rolagem).
- **CSS**: ~200 linhas para `.rss-discover-*`, `.rss-category-filter`, `.rss-sources-scroll`, badges de origem, responsivo.

### PostEditor em Popup Nativo do SO
- **[NEW]** `src/components/PopupPortal.tsx`: componente genérico `window.open()` + `ReactDOM.createPortal`. Auto-sizing (~90% da tela), cópia de stylesheets do parent, monitoramento de close via polling (300ms).
- **MainsiteModule**: PostEditor envolvido em `<PopupPortal>`. Botão "Novo Post" e "Editar" agora abrem janela nativa do SO.
- **Comportamento pós-save**: popup permanece aberto após salvar (não fecha automaticamente). Só fecha via botão "Fechar" ou controle X do SO.

### Remoção de preview de conteúdo
- Lista de posts no MainSite agora exibe apenas título + metadados (removida exibição de HTML bruto truncado).

### Secrets requeridos (deploy)
- `GEMINI_API_KEY` (já implantada pelo usuário).

### Controle de versão
- `APP_VERSION`: `v01.45.01` → `v01.46.00`.
- `CHANGELOG.md`: entrada `v01.46.00` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação
- `npm run lint` ✅ (0 erros)
- `npm run build` ✅ (1.08s, 0 warnings)

## 2026-03-24 — Admin-App v01.45.01 (patch)

### Correções pós-deploy
- 3 referências a loadOverview substituídas por loadManagedPosts() em MainsiteModule.tsx.
- FormEvent corrigido para React.FormEvent.
- Filtro de palavras-chave duplicado removido do ConfigModule.
- Barra de busca do NewsPanel: borda sombreada + order-radius + efeito :focus-within.

## 2026-03-24 — Admin-App v01.45.00 (Antigravity Agent — Dynamic News + Scroll Buttons + MainSite Cleanup)

### Fontes de Notícias Dinâmicas
- **`newsSettings.ts`**: refatorado para `NewsSource[]` com id/name/url/category. Migração automática de localStorage legado. Helper `slugify()`.
- **`feed.ts` (backend)**: aceita fontes customizadas via param `custom_sources` (JSON-encoded). Qualquer URL RSS funciona.
- **ConfigModule**: UI com checkboxes + lixeira por fonte + formulário "Adicionar nova fonte RSS" (nome, URL, categoria).
- **NewsPanel**: passa fontes completas ao backend. Filtro por palavras-chave movido para barra de busca inline (local, sem re-fetch).

### Astrólogo — Email Dialog Inline
- Modal global `confirm-overlay` substituído por formulário inline glassmorphic dentro da linha do registro.
- `autoComplete="email"` ativo, suporte a Enter key. Backend fix: `RESEND_API_KEY` runtime secret documentado.

### Botões Flutuantes de Rolagem
- **[NEW]** `src/components/FloatingScrollButtons.tsx`: FABs ↑/↓ inteligentes baseados em scroll position do `.content`.
- Glassmorphism, animação fadeIn, MutationObserver para detecção de mudança de conteúdo.
- CSS: `.floating-scroll-btns/.floating-scroll-btn` com responsividade.

### MainsiteModule — Remoção de Overview
- Removidos: formulário "Qtd. posts" + botão "Carregar overview" + seção "Últimos posts" + badge BIGDATA_DB.
- Dead code eliminado: `OverviewPayload`, `initialPayload`, `loadOverview`, `handleSubmit`, `overviewLoading`, `limit`, `payload`, `disabled`, imports `Activity`/`Search`/`useMemo`/`FormEvent`.

### Label Accessibility
- Labels sem campo associado convertidas para `<p className="field-label">` em ConfigModule.

## 2026-03-24 — Admin-App v01.44.00 (Antigravity Agent — News Panel Overhaul + Jargon Cleanup)

### News Panel Overhaul
- **Backend encoding fix**: `feed.ts` reescrito com `ArrayBuffer` + `TextDecoder` + detecção automática de charset (Content-Type / prólogo XML). Resolve caracteres `�` em feeds ISO-8859-1 (Folha, G1).
- **Layout**: carousel single-card substituído por lista scrollável com 5 itens visíveis simultaneamente + barra de rolagem custom.
- **Configurações centralizadas**: controles de fontes, atualização, max items e palavras-chave movidos para o módulo Configurações (não mais inline no painel).
- **[NEW]** `src/lib/newsSettings.ts` — utilitário compartilhado de configurações com localStorage + `CustomEvent` para reatividade cross-componente.
- **CSP**: `img-src 'self' data: https:` para permitir thumbnails HTTPS de portais de notícias.

### Remoção de Jargão Técnico (~25 instâncias em 11 arquivos)
- Removidos textos expostos ao usuário: `bigdata_db`, `BIGDATA_DB`, `D1`, `SDK`, `DNS`, `Cloudflare`, `cockpit`, `policy`, `dry run`, `persistence`, `binding`.
- Módulos afetados: MainsiteModule, PostEditor, MtastsModule, CalculadoraModule, HubCardsModule, CardHubModule, ApphubModule, AdminhubModule, FinanceiroModule, ConfigModule, TelemetriaModule.
- Notificações e descriptions de sync substituídas por linguagem amigável em pt-BR.

### Decisões
- Todo texto visível ao usuário deve ser em pt-BR e sem jargão técnico.
- Configurações do painel de notícias ficam no módulo Configurações, não inline no painel.

## 2026-03-24 — Admin-App v01.43.00 (Antigravity Agent — UI Cleanup + News Panel)

### UI Cleanup
- Removido `<p>` descritivo de todos os 7 módulos headers (Telemetria, Astrólogo, MTA-STS, MainSite, Calculadora, Config, HubCards).
- Removido card "Telemetria centralizada" da tela overview.
- Removida mensagem fabricada "motor astrológico" do empty-state do Astrólogo (inexistente no admin original).
- "Qtd. posts" (MainSite): espessura reduzida em 50% via `.form-card--compact`.

### News Panel (Google News-like)
- **[NEW]** `admin-app/functions/api/news/feed.ts` — Pages Function que busca RSS de G1, Folha, BBC Brasil e TechCrunch em paralelo, faz parse XML via regex (compatível com Workers), cache Cloudflare 10min.
- **[NEW]** `admin-app/src/modules/news/NewsPanel.tsx` — Componente lazy-loaded com carousel automático (10s), auto-refresh (5min), pause on hover, barra de progresso, navegação manual (setas + dots), thumbnails, design glassmorphism.
- **[NEW]** CSS: ~300 linhas de estilos para news panel em `App.css`.

### Decisão arquitetural
- Banco D1 antigo do Astrólogo foi deletado — dados antigos perdidos. Novos registros vão direto para `bigdata_db`.
- Títulos de módulos atualizados: MTA-STS → "MTA-STS — Identidades e Segurança", MainSite → "MainSite — Posts e Conteúdo", Calculadora → "Calculadora — Calculadora Administrativa".

## 2026-03-24 — Admin-App Hardening (Telemetria + UX)

### Entregas concluídas

- `admin-app/src/App.tsx`
	- Removido card lateral **Guia de rollout**.
	- Nota da telemetria atualizada para declarar `BIGDATA_DB` como baseline operacional vigente.
	- Versionamento atualizado até `APP v01.31.14`.

- `admin-app/src/lib/operationalSource.ts`
	- Consolidada normalização de labels de source operacional:
		- `formatOperationalSourceLabel(...)`
		- `isLegacyOperationalSource(...)`

- Padronização de UX de fonte nos módulos:
	- `admin-app/src/modules/calculadora/CalculadoraModule.tsx`
	- `admin-app/src/modules/mtasts/MtastsModule.tsx`
	- `admin-app/src/modules/hubs/HubCardsModule.tsx`

- Endpoints auditados sem emissão futura de `source: legacy-admin`:
	- `admin-app/functions/api/astrologo/rate-limit.ts`
	- `admin-app/functions/api/astrologo/ler.ts`
	- `admin-app/functions/api/astrologo/excluir.ts`
	- `admin-app/functions/api/calculadora/parametros.ts`
	- `admin-app/functions/api/calculadora/rate-limit.ts`

- Tipagem de evento operacional alinhada ao baseline:
	- `admin-app/functions/api/_lib/operational.ts`
	- `source` agora: `bigdata_db | bootstrap-default`

### Normalização de histórico operacional no D1

- Executado no `bigdata_db` (remoto):
	- `UPDATE adminapp_module_events SET source = 'bigdata_db', fallback_used = 0 WHERE source IN ('legacy-admin','legacy-worker');`

- Verificação pós-normalização:
	- `SELECT source, COUNT(1) FROM adminapp_module_events GROUP BY source`
	- Resultado: apenas `bigdata_db` (279 registros no momento da verificação).

### Qualidade e validação

- `admin-app`: `npm run lint` ✅
- `admin-app`: `npm run build` ✅
- `admin-app/CHANGELOG.md` atualizado com as versões:
	- `v01.31.10` (utilitário central de source)
	- `v01.31.11` (padronização de labels nos módulos)
	- `v01.31.12` (higienização textual de sync)
	- `v01.31.13` (remoção do card Guia de rollout)
	- `v01.31.14` (remoção de emissão legacy + normalização histórica)

## 2026-03-24 — Admin-App v01.32.00 (Antigravity Agent — Refactoring UI)

### Escopo da sessão

Refactoring completo da interface do `admin-app` com foco em redução de ruído visual e melhoria de usabilidade. Versão final: `APP v01.32.00`.

### Fase 1 — HubCardsModule: Menu Suspenso + Drag-and-Drop

- `admin-app/src/modules/hubs/HubCardsModule.tsx`
	- Grid inline de edição de cards substituído por `<select>` dropdown (padrão MtaSts) com edição de um card por vez.
	- Implementado drag-and-drop HTML5 nativo no Catálogo (paridade visual) para reordenação de cards, com `GripVertical` handle.
	- Estado `draggedPreviewIndex` + handlers `handlePreviewDragStart/DragEnd/DragOver/Drop`.
- `admin-app/src/App.css`
	- CSS para `.card-selector-group`, `.card-selector-nav`.

### Fase 2 — Remoção de Elementos Operacionais Redundantes

Removidos os seguintes elementos de UI em 7 arquivos:

| Elemento | Arquivos afetados |
|---|---|
| Status badges (`Access protegido`, `bigdata_db reservado`) | `App.tsx` |
| Metrics-grid (cards com totais/fonte) | `MtastsModule`, `MainsiteModule`, `CalculadoraModule`, `HubCardsModule`, `ConfigModule` |
| Campo "Administrador responsável" | `MtastsModule`, `MainsiteModule`, `CalculadoraModule`, `HubCardsModule`, `AstrologoModule` |
| Campo "Fonte atual" | `HubCardsModule` |
| Métricas Estrito/Ligado/Sincronizado | `ConfigModule` |

Dead code removido:
- Imports: `Lock` (App.tsx), `AlertTriangle` (CalculadoraModule), `formatOperationalSourceLabel` (MtastsModule, HubCardsModule)
- State: `setAdminActor` removido em 5 módulos (valor `adminActor` mantido para headers `X-Admin-Actor`)
- State: `payload` + `setPayload` removidos de `HubCardsModule`

### Fase 3 — Redesign do Catálogo (Paridade Visual)

- `admin-app/src/modules/hubs/HubCardsModule.tsx`
	- Preview de cards redesenhado: cada card exibe apenas **ícone → nome → grip handle** (horizontal, compacto).
	- Removida chrome de portal (título, section heading, status dot, badge, descrição, URL).
	- Variáveis `previewLevel`, `previewSectionId`, `previewSectionLabel`, `previewPortalTitle` removidas.
- `admin-app/src/App.css`
	- Classes `.card-grid`, `.card-drag-handle` substituídas por `.catalog-grid`, `.catalog-row`, `.catalog-row__icon/name/grip`.
	- Layout: `grid-template-columns: repeat(3, 1fr)` com `grid-auto-flow: column` (empilhamento vertical em 3 colunas).
	- Responsivo: 2 colunas ≤900px, 1 coluna ≤600px.

### Fase 4 — Ajustes pontuais

- `admin-app/src/App.tsx`: título do topbar "Visão Geral da Fase 1" → "Visão Geral".

### Controle de versão

- `APP_VERSION`: `v01.31.14` → `v01.32.00` (minor bump).
- `admin-app/CHANGELOG.md`: entrada `v01.32.00` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada para `APP v01.32.00`.

### Qualidade e validação

- `npm run lint` ✅ (0 erros)
- `npm run build` ✅ (729ms, exit 0)

## 2026-03-24 — Admin-App v01.37.00 (Antigravity Agent — Módulo Financeiro)

### Escopo da sessão

Criação do módulo Financeiro completo no `admin-app`, replicando 100% das funcionalidades do painel financeiro legado (`mainsite-admin/FinancialPanel.jsx`) com compliance integral aos SDKs de SumUp e Mercado Pago.

### Backend — Pages Functions criadas

| Endpoint | Método | Descrição |
|---|---|---|
| `financeiro/financeiro.ts` | GET | Logs D1 com filtros + totais |
| `financeiro/delete.ts` | DELETE | Exclusão de registro por ID |
| `financeiro/sumup-balance.ts` | GET | Saldo SumUp via D1 |
| `financeiro/mp-balance.ts` | GET | Saldo MP via D1 |
| `financeiro/sumup-sync.ts` | POST | Sync SumUp via `@sumup/sdk` |
| `financeiro/mp-sync.ts` | POST | Sync MP via `mercadopago` SDK |
| `financeiro/mp-refund.ts` | POST | Estorno MP via `PaymentRefund` |
| `financeiro/mp-cancel.ts` | POST | Cancelamento MP via `Payment.cancel` |
| `financeiro/sumup-reindex.ts` | POST | Reindex status SumUp canônicos |
| `financeiro/insights.ts` | GET | Insights unificados SumUp+MP |

### Frontend — FinanceiroModule.tsx

- Balance cards (SumUp + MP) com saldo disponível/pendente.
- Insights com dropdown provider/tipo: `transactions-summary`, `payment-methods`, `payouts-summary`.
- Sync/Reindex com botões dedicados e feedback toast.
- Tabela de transações: 25+ status configs (SumUp+MP), expanded details com parsing de payload SDK-compliant.
- Refund/Cancel modais com confirmação e campo de valor parcial.
- Filtros (status/método/data), date presets, CSV export.
- Auto-refresh a cada 60s.

### Compilance SDK

- **SumUp SDK** (`@sumup/sdk`): `client.checkouts.list()`, `client.transactions.list()`, `client.checkouts.listAvailablePaymentMethods()`, `client.payouts.list()`, `normalizeSumupStatus()` (mapa 1:1).
- **Mercado Pago** (`mercadopago`): `Payment.search()`, `Payment.get()`, `Payment.cancel()`, `PaymentRefund.create()`, `PaymentMethod.get()`.

### Secrets requeridos (deploy)

- `SUMUP_API_KEY_PRIVATE`, `SUMUP_MERCHANT_CODE`, `MP_ACCESS_TOKEN` via `wrangler secret put`.

### Controle de versão

- `APP_VERSION`: `v01.36.00` → `v01.37.00`.
- `CHANGELOG.md`: entrada `v01.37.00` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação

- `npm run lint` ✅ (0 erros)
- `npm run build` ✅ (exit 0)

## 2026-03-24 — Admin-App v01.38.00 (Antigravity Agent — UI Cleanup + Code-Splitting)

### Escopo da sessão

Limpeza de elementos UI redundantes, correção de paridade do módulo Astrólogo, e implementação de code-splitting para otimização de bundle.

### Remoções de UI

| Elemento | Arquivo |
|---|---|
| Module cards grid (Visão Geral) | `App.tsx` |
| `ModuleCard` type + `moduleCards` array | `App.tsx` |
| Seção fallback `detail-panel` | `App.tsx` |
| `useMemo`/`selectedModule`/`showNotification` | `App.tsx` |
| Imports mortos (`Activity`, `AlertTriangle`, `useNotification`) | `App.tsx` |
| Botões "Copiar Tudo" e "WhatsApp" | `AstrologoModule.tsx` |

### Correções de paridade (Astrólogo)

- Formulário de e-mail: agora condicional — só aparece com mapa selecionado + toggle "Enviar por E-mail" ativo.
- Arquivo Akáshico: lista encapsulada com scroll (~5 itens visíveis).
- Inline style extraído para CSS class `.astro-local-hint`.

### Code-splitting

- 8 módulos convertidos para `React.lazy` + `Suspense`.
- Fallback com `Loader2` spinner (`.module-loading`).
- Eliminou warning de chunks >500kB no build.

### Controle de versão

- `APP_VERSION`: `v01.37.00` → `v01.38.00`.
- `CHANGELOG.md`: entrada `v01.38.00` adicionada.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação

- `npm run build` ✅ (exit 0, sem warning de chunk)

## 2026-03-24 — Admin-App v01.41.00 (Antigravity Agent — TipTap Code-Splitting)

### Escopo

Extração do editor TipTap pesado (~450 kB de dependências) do `MainsiteModule` para sub-componente lazy-loaded independente.

### Entregas

- **[NEW]** `admin-app/src/modules/mainsite/PostEditor.tsx`
  - Componente standalone com todos os 24 TipTap extensions, toolbar completa, media handlers (R2 upload, YouTube, link), prompt modal e color/font selectors.
  - Props: `editingPostId`, `initialTitle`, `initialContent`, `savingPost`, `showNotification`, `onSave`, `onClose`.

- **[MODIFY]** `admin-app/src/modules/mainsite/MainsiteModule.tsx`
  - ~200 linhas de código inline do editor removidas (imports, state, handlers, JSX).
  - 165 linhas de form JSX substituídas por `<Suspense><PostEditor /></Suspense>`.
  - Imports mortos removidos: `X`, `React`, `AlertTriangle`, `adminActor`.

### Resultados de bundle

| Chunk | Antes | Depois |
|---|---|---|
| MainsiteModule | ~598 kB | **38.54 kB** |
| PostEditor (lazy) | — | **583.86 kB** (gzip: 194.50 kB) |

### Qualidade e validação

- `npm run build` ✅ (974ms, 0 warnings)

## 2026-03-24 — Admin-App v01.42.00 (Antigravity Agent — Astrólogo Bug Fixes)

### Escopo

Correção de bugs no módulo Astrólogo e simplificação do fluxo de e-mail.

### Correções

1. **"Ler detalhes" vazio para registros NOVO**: registros sem dados de análise (`dados_globais`, `dados_tropical`, `dados_astronomica` NULL) agora exibem mensagem explicativa (`.result-empty`) em vez de card vazio.

2. **E-mail simplificado (paridade `astrologo-frontend`)**: botão "E-mail" movido da seção de detalhes para a listagem (ao lado de "Ler detalhes"). Formulário avançado substituído por modal simples (`confirm-overlay` + `confirm-dialog`) pedindo apenas o endereço de e-mail.

### Dead code removido (~80 linhas)

| Elemento | Arquivo |
|---|---|
| `useEffect` de relatório default | `AstrologoModule.tsx` |
| `copyReportToClipboard` | `AstrologoModule.tsx` |
| `restoreDefaultReport` | `AstrologoModule.tsx` |
| `showEmailForm` + toggle + form avançado | `AstrologoModule.tsx` |
| Imports `Copy`, `RefreshCw`, `useEffect` | `AstrologoModule.tsx` |

### CSS adicionado

- `.result-empty` em `App.css` para empty-state.

### Controle de versão

- `APP_VERSION`: `v01.40.00` → `v01.42.00`.
- `CHANGELOG.md`: entradas `v01.41.00` e `v01.42.00` adicionadas.
- `.agents/workflows/version-control.md`: tabela atualizada.

### Qualidade e validação

- `npm run build` ✅ (974ms, 0 warnings, 0 erros)

### Decisão arquitetural registrada

- **Padrão de acessibilidade**: após feedback positivo do usuário, padrões de acessibilidade (WCAG 2.1 AA, eMAG) devem ser aplicados em todo novo código como baseline de qualidade visual e funcional.
