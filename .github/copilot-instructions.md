

## 📋 DIRETIVAS DO PROJETO E REGRAS DE CÓDIGO
# Regras
- Use princípios de Clean Code.
- Comente lógicas complexas.


## 🧠 MEMÓRIA DE CONTEXTO ISOLADO (ADMIN-APP)
# AI Memory Log — Admin-App

## 2026-04-12 — MainSite/PostEditor: Import de Markdown (Claude Chat) (v01.87.00)
### Escopo
Adicionado importador de arquivos `.md` no PostEditor, espelhando a formatação editorial do importador Gemini, mas 100% client-side.
### Adicionado
- **`editor/markdownImport.ts`**: novo módulo. Funções `stripFrontmatter`, `extractFirstH1`, `preprocessMarkdown`, `postprocessHtml` e `convertMarkdownToFormattedHtml`. Espelha as regras de `admin-motor/handlers/routes/mainsite/gemini-import.ts` (todos os títulos viram H3, parágrafos com `text-align: justify; text-indent: 1.5rem`, H3 com `text-align: left`, placeholder de imagens externas).
- **`PostEditor.tsx`**: state `isProcessingMarkdown`, ref `markdownInputRef`, callback `handleMarkdownUpload`, hidden file input + botão na toolbar (ícone `FileText` da `lucide-react`). Título extraído do primeiro `# H1` é aplicado ao `postTitle` apenas se o campo estiver vazio (mesma regra do Gemini).
- **Sanitização**: `DOMPurify.sanitize` com `ADD_ATTR: ['style']` para preservar os estilos inline aplicados pelo postprocess.
### Decisões
- **Sem novo endpoint backend**: o `.md` é arquivo local; rodar tudo no cliente elimina latência e custo de IA.
- **Formatação determinística**: as duas funções regex foram duplicadas (não compartilhadas com o backend `admin-motor`) porque os ~30 linhas estáveis não justificam o custo de refator de tsconfig/build entre os dois projetos.
- **`marked` + `dompurify` já presentes** no `package.json` do admin-app; zero novas dependências.
### Versão
- APP v01.86.00 → APP v01.87.00

## 2026-04-09 — Tier 4 Tech Upgrades (v01.84.00)
### Escopo
Vitest UI, Biome organizeImports.
### Adicionado
- `@vitest/ui ^4.1.2` + script `test:ui`.
- `organizeImports: true` no `biome.json`.
### Versão
- APP v01.83.00 → APP v01.84.00

## 2026-04-09 — Tier 1-3 Tech Upgrades (v01.83.00)
### Escopo
Três tiers de upgrades tecnológicos aplicados: TanStack Query completo, Biome linter, Husky, Knip.
### Adicionado
- **ReactQueryDevtools** em `main.tsx` (dev-only, tree-shaken em produção).
- **AiStatusModule**: 5 fetch patterns migrados de `useState+useCallback+useEffect` para `useQuery`. Imports `useEffect`/`useCallback` removidos. Query keys: `ai-status-health`, `ai-status-models`, `ai-status-usage`, `ai-status-gcp`, `ai-status-logs`.
- **Biome linter**: `biome.json` com `recommended: true` + overrides conservadores.
- **Husky + lint-staged**: Pre-commit hook `biome format + eslint --fix` em `src/**/*.{ts,tsx}`.
- **Knip**: `knip.json` + script `npm run knip` para dead code detection.
### Versão
- APP v01.82.07 → APP v01.83.00

## 2026-04-09 — MainSite: Reordenação do quadro Resumos IA (v01.82.07)
### Escopo
Reordenação de painel no `MainsiteModule.tsx`.
### Alterado
- Quadro "Resumos IA — Compartilhamento Social" movido: agora aparece entre "Moderação de Avaliações" e "Janelas de Aviso (Disclaimers)".
- Ordem anterior: Avaliações → Disclaimers → Taxas → Resumos IA.
- Nova ordem: Avaliações → **Resumos IA** → Disclaimers → Taxas.
### Versão
- APP v01.82.06 → APP v01.82.07

## 2026-04-09 — Financeiro: MP Transaction Field Mapping Fix (v01.82.05)
### Escopo
Datas e outros campos das transações Mercado Pago não apareciam na tabela do módulo Financeiro.
### Root Cause
O mapper de `transactions-advanced` para MP no backend (`financeiroInsights.ts`) retornava campos com nomes diferentes do contrato `AdvancedTx` do frontend. Ex: `dateCreated` em vez de `timestamp`, `transactionAmount` em vez de `amount`. O frontend fazia `as AdvancedTx[]` sem transformação, então campos com nomes errados ficavam `undefined` → exibidos como "—".
### Corrigido
- Mapper MP alinhado com `AdvancedTx`: `timestamp` ← `date_created`, `amount` ← `transaction_amount`, `type`, `cardType`, `refundedAmount`, `feeAmount`, `authCode`, `externalRef`, `transactionCode` agora mapeados corretamente.
- Paginação MP enriquecida com `hasNext/hasPrev/nextOffset/prevOffset` derivados de `paging.total/offset/limit`.
### SDK Check
- `@sumup/sdk` já na versão mais recente (`^0.1.4`). MP REST API v1 `/payments/search` estável, sem breaking changes em `date_created`. Nota: API MP omite dados do pagador em status `pending` desde Abr/2025.
### Versão
- APP v01.82.04 → APP v01.82.05

## 2026-04-09 — Gemini Import 524 Fix: Jina Reader Budget Overshoot (v01.82.04)
### Escopo
Correção de timeout 524 na importação Gemini causado por overshoot do budget de tempo no retry loop do Jina Reader.
### Root Cause
O `clientTimeoutMs` (52s) e `serverTimeoutS` (45s) eram calculados **uma única vez** antes do loop de retries em `fetchSharePageContent()`. Com `JINA_MAX_RETRIES=2`, o pior caso era: 52s (attempt 0 timeout) + 1.5s (backoff) + 52s (attempt 1 timeout) = **105.5s** — estourando o limite de 100s do proxy CF Pages e gerando 524.
### Corrigido
- **Timeout dinâmico por tentativa**: `clientTimeoutMs`, `serverTimeoutS` e o header `X-Timeout` agora são recalculados dentro do loop a cada tentativa usando `deadline - Date.now()`. Se o budget restante < 12s, a tentativa é abortada proativamente com o último erro, em vez de estourar o deadline.
- **`fetchConfig` per-attempt**: Headers de fetch (incluindo `X-Timeout`) são reconstruídos a cada tentativa para refletir o timeout dinâmico.
### Versão
- APP v01.82.03 → APP v01.82.04

## 2026-04-09 — PostEditor Popup Notification Context Fix (v01.82.03)
### Escopo
Correção de bug onde notificações/toasts disparados pelo PostEditor (rodando em popup window via `PopupPortal`) renderizavam na janela principal do admin em vez do popup.
### Root Cause
O `NotificationProvider` (Notification.tsx) sempre portalizava toasts para `document.body` — que refere-se ao body da **janela principal**. O PostEditor recebe `showNotification` como prop e é renderizado dentro de uma janela popup separada via `window.open()`. Ao chamar `showNotification()`, o toast aparecia na janela principal (invisível ao usuário no popup).
### Corrigido
- **`Notification.tsx`**: Adicionada prop opcional `container?: HTMLElement | null` ao `NotificationProvider`. Quando fornecido, `createPortal` usa o container em vez de `document.body`. Retrocompatível (fallback para `document.body`).
- **`MainsiteModule.tsx`**: Criados componentes `PopupNotificationBridge` + `PopupNotificationConsumer`. O bridge usa **callback ref** (não `useEffect`) para detectar `ownerDocument.body` do popup, wrapa filhos em `NotificationProvider` scoped para o popup, e passa a `showNotification` do popup para o PostEditor via render prop.
- **Lint fix**: Callback ref elimina o aviso React "Calling setState synchronously within an effect".
### Padrão Arquitetural
- Componentes renderizados dentro de `PopupPortal` vivem em um `document` diferente. Qualquer `createPortal` que target `document.body` vai mirar a janela errada. Usar `ownerDocument.body` do elemento renderizado para obter o body correto.
### Versão
- APP v01.82.02 → APP v01.82.03

### Escopo
Resolução de crash em produção no PostEditor causado por bare module specifiers no bundle Vite.
### Root Cause
O `vite.config.ts` usava `rollupOptions.external` para mascarar erros de build de peer deps do Tiptap 3.22.x (`@tiptap/extension-drag-handle`, `@tiptap/extension-collaboration`, `@tiptap/extension-node-range`, `@tiptap/y-tiptap`, `@tiptap/suggestion`, `yjs`, `y-prosemirror`). Isso deixava bare module specifiers (ex: `from"@tiptap/extension-drag-handle"`) no JS de produção, que browsers não sabem resolver → `TypeError: Failed to resolve module specifier`.
### Corrigido
- **`external` removido**: A lista inteira de externals foi eliminada do `vite.config.ts`.
- **Peer deps instaladas**: Todas as 7 peer deps foram instaladas como dependências reais (`npm install`). O Vite agora resolve, embute no bundle e aplica tree-shaking automaticamente.
- **Verificação**: Zero bare imports em nenhum dos assets de produção.
### Lição Operacional
- **NUNCA usar `rollupOptions.external` para peer deps de bibliotecas de editor (Tiptap/ProseMirror)** — esses pacotes fazem imports dinâmicos internos que sobrevivem ao tree-shaking e vazam como bare specifiers no bundle final. A abordagem correta é instalar todos os peer deps e deixar o bundler resolver/tree-shake.
- **Build success ≠ runtime success**: O build com externals não produz erro, mas o JS resultante contém specifiers que browsers não resolvem.
### Versão
- APP v01.82.01 → APP v01.82.02

## 2026-04-08 — Monorepo Tech Upgrade: ESLint 10 + TypeScript Infrastructure
### Escopo
Migração ESLint 9→10 completa. Infraestrutura TS corrigida para Cloudflare Pages Functions.
### Feito
- **ESLint 10.2.0**: Upgrade de `eslint` e `@eslint/js`. Flat config existente validada como compatível.
- **`.npmrc`**: Criado com `legacy-peer-deps=true` para contornar peer dep conflict `eslint-plugin-react-hooks@7` ↔ ESLint 10 no CI (`npm install`).
- **`tsconfig.functions.json`**: `composite: true` + referência adicionada ao root `tsconfig.json` → resolve `Fetcher`/`PagesFunction` types no IDE.
- **Lint fixes**: `gcp-monitoring.ts` cast `ArrayBuffer`, `listar.ts` tipagem `Record<string, unknown>`.
### Versão
- APP v01.82.00 → APP v01.82.01

## 2026-04-08 — GitHub Actions Purge & Dependabot Standardization
### Escopo
Auditoria completa de CI/CD para eliminação de "ghost runs" em toda a rede de repositórios do workspace, juntamente com a universalização da configuração do Dependabot ajustada às necessidades de empacotamento locais para mitigar tráfego e limites no API.
## 2026-04-07 — Admin-App v01.82.00 — Ratings Moderation Panel
### Scope
Nova funcionalidade completa de moderação de avaliações (estrelas + reações) no admin-app, com backend CRUD no admin-motor e frontend RatingsPanel no MainsiteModule.
### Adicionado
- **Backend (`ratings-admin.ts`)**: 5 endpoints CRUD no `admin-motor` para a tabela `mainsite_ratings` do D1: `GET /all` (listagem filtrada + stats), `GET /stats` (métricas + top posts), `PATCH /:id` (edição), `DELETE /:id` (exclusão individual), `POST /bulk` (exclusão em lote).
- **Frontend (`RatingsPanel.tsx`)**: Componente integrado ao `MainsiteModule.tsx` com métricas visuais (média, distribuição por estrela, reações por tipo), filtros (Post ID, estrelas, reação), edição inline (seletores clicáveis), exclusão individual e em lote.
- **Rotas**: 5 endpoints registrados no `index.ts` do admin-motor após o bloco de comments-admin.
### Arquitetura
- Segue 100% o padrão existente de `comments-admin.ts` (handler) e `ModerationPanel.tsx` (UI).
- Usa o mesmo binding D1 (`BIGDATA_DB`) e proxy catch-all `[[path]].ts`.
- Tipos de reação espelhados do `mainsite-worker/ratings.ts`: `love`, `insightful`, `thought-provoking`, `inspiring`, `beautiful`.
### Controle de versão
- `admin-app`: APP v01.81.02 → APP v01.82.00

## 2026-04-07 — Admin-App v01.81.02 — Config Persistence Safety (CRITICAL)
### Scope
Correção de bug crítico onde deploys apagavam configurações do News Feed e filtros financeiros no D1.
### Root Cause
Três módulos (`newsSettings.ts`, `useModuleConfig.ts`, `financeiro-helpers.ts`) tinham lógica destrutiva: se a API `/api/config-store` falhasse (rede, cold start durante deploy), faziam fallback para `localStorage` → vazio → **gravavam defaults no D1**, sobrescrevendo dados do usuário.
### Corrigido
- **Eliminação total de `localStorage`**: Removida toda referência a `localStorage` como fallback/migração nos 3 módulos.
- **Regra de Segurança**: Defaults só são persistidos no D1 quando `data.ok === true && data.config === null` (chave genuinamente não existe). Em qualquer erro ou falha de rede, usa defaults in-memory SEM gravar no D1.
- **Diretiva permanente**: `package.json` não precisa de bump de versão — controlado por `APP_VERSION` + CHANGELOG. Registrada no `version-control.md`.
### Controle de versão
- `admin-app`: APP v01.81.01 → APP v01.81.02


## 2026-04-07 — Admin-App v01.81.01 — Exigir Nome Toggle + Cache Removal
### Scope
Renomeação do toggle "Permitir anônimos" para "Exigir nome" com lógica invertida, e remoção da mensagem de cache de 60s.
### Alterado
- **ModerationPanel.tsx**: Toggle `allowAnonymous` agora exibe como "Exigir nome" (`checked={!settings.allowAnonymous}`, `onChange={v => setSettings(s => ({ ...s, allowAnonymous: !v }))}`). Paritário com "Exigir email".
- **Mensagem de Cache**: "cache de 60 segundos" → "aplicadas imediatamente após salvar".
### Controle de versão
- `admin-app`: APP v01.81.00 → APP v01.81.01

## 2026-04-07 — Admin-App v01.81.00 — Moderation Settings UI + Backend Enforcement
### Scope
Painel completo de configurações do motor de moderação de comentários com 18 parâmetros configuráveis, organizados em 4 seções (Funcionalidades, Limites de Conteúdo, Moderação Automática GCP NL, Anti-Spam). Backend com enforcement de rate limiting, blocklist, link policy, auto-close e duplicate detection.
### Adicionado
- **ModerationPanel.tsx**: Reescrita completa com UI em PT-BR — toggles, sliders para thresholds, chips para categorias GCP NL, textarea para blocklist, selects para link policy e API fallback behavior.
- **comments-admin.ts (admin-motor)**: Handlers `handleCommentsAdminGetSettings` / `handleCommentsAdminPutSettings` com merge forward-compatible (`{ ...DEFAULT, ...stored }`), upsert D1, validação server-side (approve threshold < reject threshold).
- **index.ts (admin-motor)**: Rotas `GET/PUT /api/mainsite/comments/admin/settings` registradas antes do catch-all `:id`.
- **comments.ts (mainsite-worker)**: Enforcement de `rateLimitPerIpPerHour`, `blocklistWords`, `linkPolicy`, `autoCloseAfterDays`, `minCommentLength`, `maxCommentLength`, `requireEmail`, `duplicateWindowHours` no POST handler. Cache 60s com invalidação no PUT.
- **moderation.ts (mainsite-worker)**: Interface `ModerationSettings` expandida + `notifyAdminNewComment` com `toEmail` dinâmico (3º parâmetro).
### Alterado
- **MainsiteModule.tsx**: "Arquivo de posts operacionais" → "Arquivo de Posts". Ordem: Arquivo → Moderação → Disclaimers.
### Controle de versão
- `admin-app`: APP v01.80.03 → APP v01.81.00
- `mainsite-worker`: v02.03.00 → v02.04.00

## 2026-04-07 — Admin-App v01.80.02 — Live Dedup Bugfix & Stabilization
### Scope
Resolução de bug crítico no mecanismo de deduplicação da aba Live do Observability, que classificava incorretamente todos os novos eventos iterados como duplicados, travando o stream realtime.
### Corrigido
- **Live Tab Deduping**: O script de deduplicação do polling tentava extrair de `evt['$metadata.id']`. Sendo `$metadata` um objeto nested, o dot-notation flat sempre resultava em `undefined`, mapeado para a string vazia `''`. Consecutivamente, o `Set` de retenção e as exclusões tratavam qualquer novo evento como duplicata. O mecanismo de unificação de IDs agora utiliza um helper `eventKey` acessando paths estruturados corretamente e utilizando o UUID explícito/timestamp como key real.
### Lições Operacionais Adicionais
- **CF Worker Event Keys**: Objetos nested vindos de `result.events.events` (`$workers`, `$metadata`) são estritamente objetos. Fuga deste isolamento (dot-notation access) deve ser feita destruturada (`(evt['$metadata'] as any)?.id`).
### Controle de versão
- `admin-app`: APP v01.80.01 → APP v01.80.02

## 2026-04-07 — Admin-App v01.80.01 — Observability Stabilization & Detail Panel
### Scope
Estabilização completa do dashboard Workers Observability: correção de 5 bugs de integração com a API CF e adição de painel de detalhes inline clicável.
### Corrigido
- **Operador `P50` inválido**: API CF Observability não suporta `P50`; substituído por `MEDIAN` no enum aceito.
- **Extração nested de eventos**: API retorna `result.events = { events: [], fields: [], count: N }` (objeto wrapper); extração corrigida para `result.events.events` em Events, Errors e Live.
- **Campos "—" nos eventos**: Mapeamento corrigido de dot-notation flat (`evt['$workers.scriptName']`) para objetos nested (`evt.$workers.scriptName`).
- **Live sem eventos (ingestion delay)**: Medição precisa revelou ~30s de delay de ingestão CF. Janela ampliada de 30s para 90s.
- **Error parsing `error.issues`**: Backend agora captura formato Zod validation (`payload.error.issues[]`) além de `payload.errors[]`.
### Adicionado
- **Painel de detalhes inline**: Click-to-expand em qualquer evento mostra todas as propriedades organizadas em seções (`source`, `$workers`, `$metadata`). Flatten recursivo de objetos nested. CSS com animação suave, chaves monospace azul, toggle click.
### Lições Operacionais
- **CF Observability API enum**: Operadores válidos NÃO incluem P50. Para percentil 50, usar `MEDIAN` ou `median`.
- **CF Observability ingestion delay**: ~30 segundos. Janelas menores que 30s retornarão 0 eventos.
- **CF Observability error format**: Erros de validação usam `{ error: { issues: [...] } }` ao invés de `{ errors: [...] }`.
### Controle de versão
- `admin-app`: APP v01.80.00 → APP v01.80.01


### Scope
Integração completa do dashboard Cloudflare Workers Observability no módulo CF P&W com 6 abas, incluindo modo Live com polling de 3 segundos.
### Adicionado
- **Backend (admin-motor)**: `observability-api.ts` (helpers Cloudflare Observability API v4) + `observability.ts` (route handler multiplexado: query, keys, values, create/delete destination). Rotas `GET/POST /api/cfpw/observability` registradas em `index.ts`.
- **Frontend (admin-app)**: `ObservabilityBlock.tsx` (998 linhas) com 6 tabs:
  - Dashboard: KPIs (total eventos, erros, taxa, workers ativos) + breakdown por worker.
  - Live: Polling 3s com deduplicação por `$metadata.id`, buffer rotativo 200 eventos, botão Play/Stop, dot pulsante, botão Limpar.
  - Eventos: Busca full-text com tabela de eventos.
  - Erros: Drill-down `$metadata.error EXISTS`.
  - Latência: p50/p95/p99/avg por worker com alertas warn/critical.
  - Destinos: CRUD OTel destinations + tutorial.
- **Time ranges**: Alinhado com CF Dashboard: 15m, 1h, 24h, 3d, 7d.
- **CSS**: 160+ regras em `CfPwModule.css` (obs-block, tabs, kpis, tables, live-btn, live-header, pulsing dot).
- **Integração**: Renderizado no `renderDashboard()` de `CfpwModule.tsx` via fragment wrapper.
### Controle de versão
- `admin-app`: APP v01.79.01 → APP v01.80.00

## 2026-04-07 — Admin-App v01.79.01 — Rotation Bar Review Fixes
### Scope
Correções de code review na faixa de rotação: estado "pausada" agora mostra "Última Rotação" + re-fetch automático pós-"Iminente".
### Corrigido
- **Fix #1**: Estado `hasPinnedPost` agora mostra "Última Rotação: timestamp" + "Próxima Rotação: pausada — post fixado" ao invés de suprimir toda informação com apenas "Rotação pausada".
- **Fix #2**: `useRef(imminentRefetchedRef)` + `setTimeout(loadPublicSettings, 30_000)` one-shot ao atingir countdown zero. Guard impede re-fetches repetidos. Reseta na troca de `rotationInfo`. Dep array inclui `loadPublicSettings` (já é `useCallback`).
### Controle de versão
- `admin-app`: APP v01.79.00 → APP v01.79.01

## 2026-04-07 — Admin-App v01.79.00 — Faixa de Status da Rotação (MainSite)
### Scope
Nova faixa visual dinâmica no módulo MainSite exibindo em tempo real a última e próxima rotação do cron de textos.
### Adicionado
- **Frontend-only**: Zero alterações backend — dados (`enabled`, `interval`, `last_rotated_at`) já disponíveis em `GET /api/mainsite/settings` → `settings.rotation`.
- **State**: `rotationInfo` (dados do cron) + `countdown` (timer string) + `hasPinnedPost` (derived de `managedPosts`).
- **Countdown Effect**: `setInterval(1s)` com cálculo ideal `last_rotated_at + interval * 60000`.
- **5 estados**: ativa (gradiente azul→verde), iminente (RotateCw spin + verde), pausada (post fixado, amarelo), desativada (cinza), não carregada (oculta).
- **Visual**: Labels "Última Rotação:" / "Próxima Rotação:" em negrito, countdown monospace sem negrito, conteúdo centralizado (`justifyContent: center`), timezone `America/Sao_Paulo`.
### Controle de versão
- `admin-app`: APP v01.78.06 → APP v01.79.00

## 2026-04-07 — Admin-App v01.78.06 — Migração Total REST → SDK @google/genai
### Scope
Migração integral de 7 arquivos do `admin-motor` de REST `fetch()` direto para o SDK oficial `@google/genai ^1.48.0`.
### Migrado
- **Geração de Conteúdo**: `transform.ts`, `gemini-import.ts`, `discover.ts` — substituídos `fetch(generativelanguage.googleapis.com)` por `ai.models.generateContent()`
- **Listagem de Modelos**: `index.ts` (health+models), `aiStatusModels.ts`, `oraculoModelos.ts` — substituídos REST por `ai.models.list()` com `for await` (AsyncPager)
### Mantido
- `gcp-logs.ts` e `gcp-monitoring.ts` usam REST direto para Cloud Logging/Monitoring APIs (SDKs GCP `@google-cloud/*` não compatíveis com Workers V8 isolate)
### Controle de versão
- `admin-app`: APP v01.78.05 → APP v01.78.06


## 2026-04-06 — Admin-App v01.78.03 — GCP Audit Logs UI Redesign
### Scope
Redesign completo da aba "GCP Raw Logs" → "GCP Audit Logs" no módulo AI Status. JSON bruto substituído por painel visual com cards por evento, renderização inteligente por tipo de método, badges de status, e identidade estruturada.
### Alterado
- `GcpLogsTab`: reescrita completa com helpers (`METHOD_LABELS`, `severityStyle`, `statusCodeStyle`, `cleanUserAgent`, `maskSensitive`, `PropRow`)
- Renderização por categoria: `generate` (prompts + respostas) vs `config/model/other` (property grid)
- Banner com estatísticas agregadas (total eventos, erros, top method)
- Tab icon: `Settings` → `BookOpen`, label: "GCP Raw Logs" → "GCP Audit Logs"
### Controle de versão
- `admin-app`: APP v01.78.02 → APP v01.78.03

## 2026-04-06 — Admin-App v01.78.02 — News Feed 502 Fix + Observability
### Scope
Corrigido crash 502 no `/api/news/feed` causado por `context.waitUntil is not a function`. O `fetch()` handler do admin-motor não recebia `ctx: ExecutionContext`, e o `routeContext` não incluía `waitUntil`.
### Corrigido
- `index.ts`: `fetch(request, env)` → `fetch(request, env, ctx: ExecutionContext)`
- `routeContext`: agora inclui `waitUntil: (p) => ctx.waitUntil(p)`
### Observability
- `admin-motor/wrangler.json`: já tinha config completa
- `tlsrpt-motor/wrangler.json`: expandido para `head_sampling_rate: 1` + `invocation_logs: true`
### Controle de versão
- `admin-app`: APP v01.78.01 → APP v01.78.02

## 2026-04-06 — Admin-App v01.78.01 — Homepage Selector (Sidebar)
### Scope
Seletor de página inicial no menu lateral. Cada nav-item (exceto "Visão Geral") exibe ícone Home (Lucide) on hover. Click toggle define/remove homepage. Persistência 100% D1 via `/api/config-store` (key: `admin-app/homepage`), zero localStorage. On mount, useEffect carrega do D1 e navega automaticamente.
### Arquitetura
- `nav-item-row` wrapper div com `.homepage-toggle` button
- State: `homepageModule: ModuleId | null`
- Seleção exclusiva + desselecionável (fallback: overview)
- CSS: opacity 0 → 1 on hover, dourado quando `.homepage-active`
### Controle de versão
- `admin-app`: APP v01.78.00 → APP v01.78.01

## 2026-04-06 — Admin-App v01.78.00 — Pages Functions → Admin-Motor Full Migration
### Scope
Migração completa de **36 Pages Functions** para o `admin-motor` Worker nativo. Arquitetura consolidada de 37+ proxy stubs individuais para um único catch-all `[[path]].ts` usando Service Binding `ADMIN_MOTOR`.
### Arquitetura
- **Monolítico (recomendado)**: V8 isolates não penalizam bundles grandes; wrangler faz tree-shaking automático. Plano pago permite 10MB comprimido.
- **Catch-all**: `functions/api/[[path]].ts` roteia TODAS as requisições `/api/*` para o motor via `ADMIN_MOTOR` binding.
- **Retained**: `health.ts` (Pages direto), `tlsrpt/[[path]].ts` (Service Binding TLSRPT_MOTOR), `_middleware.ts`.
### Dead Code Removido
- `admin-motor-proxy.ts`, `oraculo-admin.ts`, `rate-limit-common.ts` (functions + motor copies)
### Observability
- `head_sampling_rate: 1` (100% log capture), `invocation_logs: true`
### Cross-App Audit
- Zero impacto em 8 apps do workspace — todos usam BIGDATA_DB diretamente, zero chamadas HTTP externas inter-app.
### AI Gateway
- Zero resquícios em todo o workspace.
### Controle de versão
- `admin-app`: APP v01.77.44 → APP v01.78.00

### Scope
Adicionado `'style'` ao `ALLOWED_ATTR` do `sanitizeRichHtml` no `AstrologoModule.tsx`, permitindo que atributos de estilo (`text-align`, `text-indent`) gerados pelo Gemini sejam renderizados corretamente nas abas "Consultas Registradas" e "Dados de Usuários".
### Controle de versão
- `admin-app`: APP v01.77.43 → APP v01.77.44

## 2026-04-05 — Gemini Import Pipeline Estabilização + Formatting Fixes (v01.77.43)
### Scope
Estabilização do pipeline de importação Gemini e correção de bugs visuais de formatação no PostEditor e PostReader.
### Resolved
- **Pipeline Jina Reader**: Refatorada arquitetura de 2 tiers (readerlm-v2 + browser) para tier único **browser-only** (`X-Engine: browser`), eliminando `503 Reader LM at capacity` e `524 timeout`. Payload reduzido ~80% com `X-Retain-Images: none`. Parser SSE removido, código simplificado de ~395 para ~225 linhas.
- **PostEditor — Linhas em branco duplicadas**: Removida inserção forçada de `<p><br></p>` no `postprocessHtml`. Espaçamento agora via CSS: `.tiptap-editor .tiptap p { margin-bottom: 0.65em }` em `App.css`.
- **PostReader — H3 centralizado**: Adicionado inline `text-align: left` nos `<h3>` gerados pelo `postprocessHtml`.
### Controle de versão
- `admin-app`: APP v01.77.42 → APP v01.77.43

## 2026-04-05 — Remoção dos Botões de IA Públicos e Modelo do Leitor (v01.77.42)
### Scope
Remoção completa dos botões "Resumo por IA" e "Traduzir Para" do `mainsite-frontend/PostReader.tsx` e do seletor "Modelo do Leitor (Tradução/Resumo Público)" do `admin-app/ConfigModule.tsx`.
### Removido
- **PostReader.tsx**: estados `postSummary`, `translatedContent`, `isSummarizing`, `isTranslating`, `aiError`; handlers `handleSummarize`, `handleTranslate`; todo o CSS das classes `.ai-btn`, `.ai-select`, `.ai-error-msg`, `.ai-summary-box`, `.ai-actions-container`, `.processing-active`; JSX dos botões e summary box; imports órfãos (`ChangeEvent`, `useEffect`, `useState`, `AlignLeft`, `Languages`, `X`, `AlertTriangle`, `Sparkles`); prop `API_URL` da interface e do uso em `App.tsx`.
- **mainsite-worker/ai.ts**: rotas `POST /api/ai/public/summarize` e `POST /api/ai/public/translate`.
- **mainsite-worker/genai.ts**: campo `reader?` em `MainsiteConfig`; entradas `summarize` e `translate` em `ENDPOINT_CONFIGS`.
- **ConfigModule.tsx**: fieldset "Modelo do Leitor (Tradução/Resumo Público)"; campo `reader` em `msAiModels` state, no tipo de `saveAiModelsImmediately`, na union do `handleAiModelChange` e no loader de configurações.
### Controle de versão
- `admin-app`: APP v01.77.41 → APP v01.77.42
- `mainsite-frontend`: APP v03.04.03 → APP v03.04.04

## 2026-04-05 — Gemini Import Resiliência Jina Reader (v01.77.41)
### Scope
Correção dos erros intermitentes 429/timeout no `admin-motor/src/handlers/routes/mainsite/gemini-import.ts`.
### Root Causes Resolvidos
- **JINA_API_KEY ausente**: sem a key, chamadas iam para limite 20 RPM/IP compartilhado CF. Secret `jina-api-key` criado no Secrets Store (`df90c0935...`, scope: workers) e binding `JINA_API_KEY` adicionado ao `admin-motor/wrangler.json`.
- **Timeout insuficiente**: 15s → 35s local + header `X-Timeout: 30` para o servidor Jina aguardar mais tempo pelo carregamento da página-alvo.
- **Sem retry Jina**: adicionado loop de 3 tentativas com exponential backoff (1.5s, 3s), honrando `Retry-After` no 429 (cap 12s).
- **Gemini maxRetries 1→2**, retryDelayMs 1000→1500.
### Controle de versão
- `admin-app`: APP v01.77.40 → APP v01.77.41

### Scope
Extensão da Modernização do Gemini API (v1beta) com aplicação de suas 10 features estruturais diretamente no middleware / pipeline de resumos de SEO e Linked Data do mainsite (`admin-motor/src/handlers/routes/mainsite/post-summaries.ts`).
### Resolved
- **@google/genai SDK**: A adoção nativa do SDK resolve a formatação defasada de headers, introduzindo nativamente as restrições arquiteturais.
- **Implementações das 10 Features**: O código agora conta os pre-tokens via `countTokens`, gerencia o log detalhadamente via `structuredLog`, impõe os safe-guards obrigatórios (`BLOCK_ONLY_HIGH` + `CIVIC_INTEGRITY`), restringe a resiliação via retry limits formatados, loga os costs reais (usage metadata) e escapa corretamente as partes em modo de Thinking Model.

### Controle de versão
- `admin-app`: APP v01.77.38 -> APP v01.77.39
## 2026-04-04 — Gemini Direct API Migration & Gateway Elimination
### Scope
Remoção integral do Cloudflare AI Gateway e do fallback estrito para Cloudflare Workers AI nas operações de geração e processamento de textos do MainSite e backends de edição (`post-summaries`, `transform.ts`, `gemini-import.ts`), prevenindo erros \`524 Timeout\` em operações pesadas no proxy do Cloudflare.
### Resolved
- **Expurgo Ambiental**: Excluídos do `admin-motor/index.ts` e do runtime resolver os tokens estritos como \`CF_AI_GATEWAY\` e \`CF_AI_TOKEN\`.
- **Tipagens Corrigidas**: A supressão das env vars ausentes permitiram limpar problemas de linter com a `ResolvedAdminMotorEnv`.
- **Frontend Unification**: \`ConfigModule.tsx\` desvinculou as listagens nativas da CF AI para exibir puramente a UI de \`geminiModels\`.

## 2026-04-04 — Admin-Motor Post Summaries AI Binding Issue
### Scope
Resolução do erro `AI binding não configurado` que ocorria no disparo em background (via POST `/api/mainsite/post-summaries`) responsável pelas auto-summarizações (SEO e LD) dos artigos novos criados pelo LCV Admin. O Binding não fluía de forma propagada na topologia interna Worker->Service.

### Resolved
- **Injeção do Binding `AI`**: O objeto proxy local responsável por carregar o setup do ambiente e injetar the secrets dentro do `admin-app/admin-motor` (no file `index.ts`, func `resolveRuntimeEnv`) antes rejeitava (drop) a existência da injeção nativa de AI no `AdminMotorEnv` devido ao object reconstruction. O AI binding foi inserido nos mappings da interface `AdminMotorEnv`, `ResolvedAdminMotorEnv` e no próprio callback garantindo `AI: env.AI`.

### Controle de versão
- `admin-app`: APP v01.77.37 -> APP v01.77.38

## 2026-04-04 — Crash no FinanceiroModule Modal Corrigido
### Scope
Resolvido um erro fatal que ocorria ao tentar abrir o modal de estorno no ambiente financeiro (`TypeError: Cannot read properties of undefined (reading 'toLocaleString')`).

### Resolved
- **Tratamento de undefined nas Moedas**: O frontend estava tentando invocar o método nativo `.toLocaleString('pt-BR')` diretamente no atributo `modal.tx.amount` na renderização do campo Input (em `FinanceiroModule.tsx:670`). Se nulo, colapsava todo o DOM da aplicação (White Screen of Death). A correção introduziu um cast forte e coeso usando `Number(modal.tx.amount ?? 0)`.

### Controle de versão
- `admin-app`: APP v01.77.36 -> APP v01.77.37

## 2026-04-03 — Cloudflare Runtime & Secrets Parity + Proxy Strict Typings
### Scope
Resolução imediata de anomalia de middleware (em dmin-app/_middleware.ts) que causou a falha sistemática 500 em todo ecossistema administrativo por não propagar secrets (bindings limitados/deep frozen pelo Cloudflare Pages router handler lifecycle). Adicionalmente, sanados os 5 erros críticos de incompatibilidade DOM vs Worker-type em mainsite-frontend/functions/api/[[path]].ts.

### Resolved
- **Runtime Propagation (admin-app)**: Implementou-se injeção persistente adotando a especificação primária do Cloudflare via context.data.env. Executada varredura baseada em regex customizado, alterando as extrações de variáveis estritas em lote em 72 endpoints para garantirem context.data?.env || context.env, restabelecendo o fluxo em tempo real de GEMINI_API_KEY, AI Gateways e serviços financeiros isolados. Modificadores em \_middleware.ts\ validados pelo rigor de lint contra tipos inferidos inexperientes (\Record<string, unknown>\ substituindo \ny\).
- **Proxy TS Fixes (mainsite-frontend)**: Castings seguros criados para transição entre o DOM local Request interfaces e Node/Cloudflare (import('@cloudflare/workers-types')), curando falhas de BodyInit streams nulos e compatibilizando Arrays estritos de Headers, preservando com solidez os encaminhamentos \/api/*\ para o Service Binding subjacente.

> **Nota:** Este arquivo contém o histórico de desenvolvimento e decisões arquiteturais exclusivos do módulo `admin-app`. Refere-se a atualizações, correções e novos recursos referentes ao app administrativo.

## 2026-04-04 — Admin API Connectivity & Infra Parity Restored (Proxy Native Fix)
## 2026-04-03 — Cloudflare Paid Scale Integration
## 2026-04-03 — Admin-App v01.77.30 — Editor Spacing Custom Extension
## 2026-04-03 — Admin-App v01.77.19 — Fix Crítico: Gemini Import 502 Bad Gateway Fantasma
## 2026-04-02 — Admin-App v01.77.08 — Migrate AI Model Selectors to D1 (MainSite)
## 2026-04-01 — Admin-App v01.77.05 — CF P&W Module Audit & API Compliance Enforcement
## 2026-04-01 — Admin-App v01.77.04 — Cloudflare Token Eradication & Refactoring
## 2026-04-01 — Admin-App v01.77.03 — Cloudflare Cache Token Isolation
## 2026-04-01 — Admin-App v01.77.02 — Cloudflare Purge Cache Authentication Fix
## 2026-04-01 — Admin-App v01.77.01 — Cloudflare Purge Cache Authentication Fix
## 2026-04-01 — Admin-App v01.77.00 — Cloudflare Purge Cache
## 2026-03-31 — Admin-App v01.76.01 — AI Summary Auto-Generation Fix
## 2026-03-31 — Admin-App v01.75.00 — Gemini Import Gold Standard & AI Transform Fix
## 2026-03-31 — Admin-App v01.74.21 — PostEditor Gemini Import Crash Fix Fixed
## 2026-03-31 — Admin-App v01.74.20 — PostEditor Lint Gate Hardening
## 2026-03-31 — Admin-App v01.74.19 — Gemini Import Hardening + Popup Crash Fix
## 2026-03-31 — Admin-App v01.74.18 — Hotfix Build e Imports
## 2026-03-31 — Admin-App v01.74.17 — Legados BUG FIX e Chrome Opts
## 2026-03-31 — Admin-App v01.74.16 — PostEditor Legados Selection Bugfix
## 2026-03-31 — Admin-App v01.74.15 — PostEditor v5 Closure
## 2026-03-31 — Admin-App v01.74.10 — PR Queue Unblock via CodeQL Workflow
## 2026-03-31 — Admin-App v01.74.09 — GitHub Deploy ERESOLVE Fix
## 2026-03-31 — Admin-App v01.74.08 — Compliance Module Typing & Linter Cleanup
## 2026-03-31 — Admin-App v01.74.07 — GCP Monitoring JWT Fix
## 2026-03-29 — Admin-App v01.74.01 — CF DNS Table Text Overflow Fix
## 2026-03-29 — Admin-App v01.74.00 — Visual Standardization (Google Palette + Balanced Sizing)
## 2026-03-29 — Admin-App v01.73.00 + Mainsite Frontend v03.02.00 + Worker v02.01.01 — Dynamic Post Author
## 2026-03-29 — Admin-App v01.72.01 — D1 Autosave Defaults on First Run
## 2026-03-29 — Admin-App v01.72.00 — localStorage → D1 Migration
## 2026-03-29 — Admin-App v01.71.00 — AI Share Summaries for Social Sharing
## 2026-03-29 — Admin-App v01.70.04 — Financeiro Table Alignment (SumUp/MP)
## 2026-03-29 — Admin-App v01.70.01 — PostEditor Inline Save Feedback
## 2026-03-29 — Admin-App v01.70.00 — Purge Logic Fix + Complete window.confirm Migration
## 2026-03-29 — Admin-App v01.69.05 — Custom Confirm Modal (Purge Deployments)
## 2026-03-29 — Admin-App v01.69.04 — Notification Visual Overhaul + Build Cache Fix
## 2026-03-29 — Admin-App v01.69.03 — Purge Deployments Toast Compliance
## 2026-03-29 — Admin-App v01.69.02 — Telemetria Chatbot Tab Merge
## 2026-03-29 — Admin-App v01.69.01 — AI Status UI Humanization + Telemetry Instrumentation
## 2026-03-29 — Admin-App v01.69.00 — AI Status Module (Tier A+B+C)
## 2026-03-29 — Admin-App v01.67.03 — Frontend Refund Status Override Fix
## 2026-03-29 — Admin-App v01.67.02 + Mainsite v03.01.01/v02.00.01 — Refund Detection + Sitemap Fix
## 2026-03-28 — Admin-App v01.67.01 — Rate Limit Contato Parity
## 2026-03-28 — Admin-App v01.67.00 — Cloudflare Pages Deployment Governance
## 2026-03-28 — Admin-App v01.66.01 — CF DNS Audit False-Positive Fix
## 2026-03-28 — Admin-App v01.66.00 — Oráculo Rate Limit Controls
## 2026-03-28 — Admin-App v01.65.03 — CF DNS Visual UX + CF P&W Humanized Results
## 2026-03-28 — Admin-App v01.65.01 — CF DNS Proxied Record Validation Fix
## 2026-03-28 — Admin-App v01.65.00 — Cloudflare Full-Parity Expansion + DNS Zone Context
## 2026-03-28 — Admin-App v01.64.00 — Cloudflare P&W Advanced Ops + DNS Detailed Alerts
## 2026-03-28 — Admin-App v01.63.01 — Cloudflare UX Fidelity + Details Resilience
## 2026-03-28 — Admin-App v01.63.00 — Cloudflare Control Expansion (CF DNS + CF P&W)
## 2026-03-28 — Admin-App v01.61.02 — Astrologo UserData Frontend Alignment
## 2026-03-28 — Admin-App v01.61.01 — Mainsite Editor Layout Tweaks
## 2026-03-28 — Admin-App v01.61.00 — Calculadora AI Model Selector
## 2026-03-28 — Admin-App v01.60.02 — Cloudflare DNS Token Resolution
## 2026-03-28 — Admin-App v01.60.01 — Menu Lateral e Deploy Automático
## 2026-03-28 — LCV Workspace — Migração TLS-RPT (Admin-App v01.60.00)
## 2026-03-28 — SumUp Canonical Checkout ID Reconciliation (Admin-App + Mainsite)
## 2026-03-27 — Oráculo Financeiro v01.07.00 + Admin-App v01.57.00 — Data Architecture Overhaul (Email Linkage + Cascade Delete)
## 2026-03-27 — Oráculo Financeiro v01.06.01 + Admin-App v01.56.01 — Cron Modernization + Observability + Fixes
## 2026-03-26 — Oráculo Financeiro v01.05.00 + Admin-App v01.55.00 — Email Report Rewrite + Admin Data View
## 2026-03-26 — Oráculo Financeiro v01.03.00 + Admin-App v01.53.00 — Tesouro Transparente + Cron + Redesign Admin
## 2026-03-26 — Admin-App v01.52.00 + Oráculo Financeiro v01.02.00 — Migração de Gestão de Registros e UI Redesign (Tiptap / Google Blue)

## 2026-03-26 — Admin-App v01.51.00 — Remoção do Mecanismo de Dry Sync

## 2026-03-26 — Admin-App v01.50.00 — Global Settings Parity (mainsite-admin → admin-app)

## 2026-03-26 — Admin-App v01.49.02 — FloatingScrollButtons Fix

## 2026-03-26 — Admin-App v01.49.01 — PostEditor Cleanup

## 2026-03-26 — Admin-App v01.49.00 — UI/UX Redesign (tiptap.dev Style, Google Blue)

## 2026-03-26 — Admin-App v01.48.01 — TipTap Console Warnings + AI Pill UI

## 2026-03-26 — Admin-App v01.48.00 — Editor Evolution Port

## 2026-03-26 — Admin-App v01.47.00 + Mainsite Worker — updated_at Infrastructure

## 2026-03-25 — Admin-App v01.46.24 (patch)

## 2026-03-25 — Admin-App v01.46.23 (patch)

## 2026-03-25 — Admin-App v01.46.17 (patch)

## 2026-03-25 — Admin-App v01.46.16 (patch)

## 2026-03-25 — Admin-App v01.46.15 (patch)

## 2026-03-25 — Admin-App v01.46.14 (patch)

## 2026-03-25 — Admin-App v01.46.13 (patch)

## 2026-03-25 — Admin-App v01.46.12 (patch)

## 2026-03-25 — Admin-App v01.46.11 (patch)

## 2026-03-25 — Admin-App v01.46.10 (patch)

## 2026-03-25 — Admin-App v01.46.09 (patch)

## 2026-03-25 — Admin-App v01.46.08 (patch)

## 2026-03-24 — Admin-App v01.46.07 (patch)

## 2026-03-24 — Admin-App v01.46.06 (patch)

## 2026-03-24 — Admin-App v01.46.05 (patch)

## 2026-03-24 — Admin-App v01.46.04 (patch)

## 2026-03-24 — Admin-App v01.46.03 (patch)

## 2026-03-24 — Admin-App v01.46.02 (patch)

## 2026-03-24 — Admin-App v01.46.01 (patch)

## 2026-03-24 — Admin-App v01.46.00 (Antigravity Agent — RSS Discovery Engine + PostEditor Popup)

## 2026-03-24 — Admin-App v01.45.01 (patch)

## 2026-03-24 — Admin-App v01.45.00 (Antigravity Agent — Dynamic News + Scroll Buttons + MainSite Cleanup)

## 2026-03-24 — Admin-App v01.44.00 (Antigravity Agent — News Panel Overhaul + Jargon Cleanup)

## 2026-03-24 — Admin-App v01.43.00 (Antigravity Agent — UI Cleanup + News Panel)

## 2026-03-24 — Admin-App Hardening (Telemetria + UX)

## 2026-03-24 — Admin-App v01.32.00 (Antigravity Agent — Refactoring UI)

## 2026-03-24 — Admin-App v01.37.00 (Antigravity Agent — Módulo Financeiro)

## 2026-03-24 — Admin-App v01.38.00 (Antigravity Agent — UI Cleanup + Code-Splitting)

## 2026-03-24 — Admin-App v01.41.00 (Antigravity Agent — TipTap Code-Splitting)

## 2026-03-24 — Admin-App v01.42.00 (Antigravity Agent — Astrólogo Bug Fixes)

## 2026-04-03 — Enforcing Canonical Domain Security & TypeScript Audit
## 2026-04-03 — AI Models Selection Parity & Hardcoding Eradication




> **DIRETIVA DE SEGURANÇA:** Ao sugerir código ou responder perguntas, leia rigorosamente o contexto e as memórias históricas acima para não divergir das decisões já tomadas pelo outro agente.
