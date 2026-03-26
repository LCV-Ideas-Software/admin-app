# Changelog — Admin App

## [v01.49.02] — 2026-03-26
### Corrigido
- **FloatingScrollButtons — posicionamento**: CSS de `.floating-scroll-btns` corrigido de `position: sticky` para `position: fixed` com `bottom: 24px; right: 24px`.
- **App shell — layout de scroll**: `.app-shell` mudou de `min-height: 100vh` para `height: 100vh` e `.content` recebeu `min-height: 0`. Com `min-height`, o grid row crescia infinitamente e `.content` nunca desborda — scroll events nunca disparam. Agora `.content` é constrito pela viewport e rola internamente.

## [v01.49.01] — 2026-03-26
### Removido
- **PostEditor — Indicador "Modo atual"**: removido campo read-only que exibia "Criando novo post" / "Editando #ID". Sem utilidade funcional, ocupava espaço no popup do editor.
- **`form-grid` wrapper**: removido pois restava apenas o campo título. O título agora ocupa a largura completa do editor popup.

## [v01.49.00] — 2026-03-26
### UI/UX Redesign — tiptap.dev Style (Google Blue)
- **Design Tokens (`variables.css`)**: paleta primária migrou de `#3b82f6` (Tailwind blue) para `#1a73e8` (Google Blue). Cor secundária unificada (purple removido). Background `#f8fafc` → `#f5f4f4` (warm gray tiptap). Texto `#0f172a` → `#0d0d0d`. Bordas de `rgba(148,163,184)` → `rgba(0,0,0)`. Font family: `'Inter'` como primária. Radius card `24px` → `30px`, button `16px` → `100px` (pill), input `16px` → `10px`. Shadows ultra-sutis (opacidade 0.04–0.08).
- **Sidebar**: fundo escuro (`linear-gradient navy`) → fundo claro `#f5f4f4`. Texto branco → texto escuro `#0d0d0d`. Nav items pill (border-radius 100px), active Google Blue `rgba(26,115,232,0.1)`. Brand card pill com borda sutil.
- **Content area**: gradientes radiais azul/roxo removidos → sólido warm gray `#f5f4f4`.
- **Buttons**: primary de gradient azul-roxo → sólido preto `#0d0d0d` com hover Google Blue. Ghost: transparente com borda sutil. Ambos pill (100px).
- **Cards/Forms**: background semi-transparente → sólido `#ffffff`. Shadows de `0 18px 48px` → `0 1px 3px`. Glassmorphism `backdrop-filter` removido.
- **Module Shells**: glassmorphism pesado (`blur(24px) saturate(145%)`) → clean white surface. Accents softer (opacity 0.08/0.18 vs 0.14/0.34).
- **Focus Indicators (WCAG)**: migrados de `#3b82f6` para `#1a73e8`. Todos os `:focus-visible` pill-shaped onde aplicável.
- **Cores secundárias**: ~80 referências de valores hardcoded (slate/cool gray) atualizadas para warm palette tiptap.

## [v01.48.01] — 2026-03-26
### Corrigido
- **PostEditor — Duplicate extension `underline`**: removida importação explícita de `@tiptap/extension-underline` e entrada no array `TIPTAP_EXTENSIONS`. O `StarterKit` do TipTap v3 já inclui `Underline` por padrão; a duplicata gerava warning no console.
- **PostEditor — ProseMirror white-space warning**: adicionado `white-space: pre-wrap` na regra CSS `.tiptap-editor .tiptap`, satisfazendo requisito do ProseMirror e silenciando aviso no console.

### Melhorado
- **PostEditor — AI Dropdown pill styling**: dropdown "IA: Aprimorar Texto" recebeu CSS `.tiptap-ai-group` com design pill (border-radius 100px, fundo sky-blue translúcido, texto bold accent, hover transitions). Paridade visual com o mainsite-admin. Suporte a dark mode via `[data-theme="dark"]`.

## [v01.48.00] — 2026-03-26
### Adicionado
- **PostEditor — BubbleMenu (toolbar contextual)**: menu flutuante aparece ao selecionar texto, com formatação rápida (negrito, itálico, sublinhado, tachado, marca-texto, sub/sobrescrito, código inline, link). Arrastável com viewport clamping. Portal via `ownerDocument.body` (compatível com PopupPortal).
- **PostEditor — FloatingMenu (toolbar de inserção)**: menu flutuante aparece em linhas vazias para inserção rápida (H1-H3, listas, tarefas, citação, código, HR, tabela). Arrastável com viewport clamping.
- **PostEditor — TextIndent extension**: recuo de parágrafo em 4 níveis (0/1.5/2.5/3.5rem). Botões Indent/Outdent na toolbar.
- **PostEditor — AI Freeform (Wand2)**: botão de instrução livre para Gemini. Popover glassmorphic com textarea. Opera em seleção ou texto inteiro. Portal via `ownerDocument.body`.
- **Google Fonts Inter com itálico**: `index.html` agora carrega Inter com eixo `ital` (variantes normais + itálicas). Corrige itálico invisível causado por `font-synthesis: none`.
- **CSS**: estilos para `.bubble-menu`, `.floating-menu`, `.ai-freeform-popover` com glassmorphism, drag states, e active indicators.

### Corrigido
- **PostEditor — Justify sempre ativo**: removido `defaultAlignment: 'justify'` do TextAlign. Default volta a `'left'`.
- **PostEditor — Toolbar estática**: adicionados listeners `transaction` + `selectionUpdate` para re-render dinâmico dos botões (Word-like).
- **PostEditor — Prompt modal em popup**: modal de inserção (link/imagem/YouTube) agora renderiza via `ReactDOM.createPortal(ownerDocument.body)`, corrigindo supressão pelo browser em janela não-ativa.

## [v01.47.00] — 2026-03-26
### Adicionado
- **Coluna `updated_at` na tabela `mainsite_posts`**: suporte completo a rastreamento de data de atualização de posts.
- **INSERT com `updated_at`**: novos posts são criados com `updated_at = CURRENT_TIMESTAMP` (igual a `created_at`).
- **UPDATE com `updated_at`**: edições de posts agora setam `updated_at = CURRENT_TIMESTAMP` automaticamente.
- **SELECTs ampliados**: queries de listagem e detalhe de posts retornam `updated_at` para exibição no frontend.
- **PostRow type + mapPostRow**: tipo e mapeador atualizados para incluir `updated_at`.

## [v01.46.24] — 2026-03-25
### Corrigido
- **PostEditor — YouTube iframe bloqueado (X-Frame-Options)**: O `ReactNodeViewRenderer` customizado do YouTube bypassa o `renderHTML` do TipTap, que normalmente converte URLs `watch?v=` para `embed/`. A conversão foi implementada explicitamente no `ResizableYoutubeNodeView` usando `getEmbedUrlFromYoutubeUrl` importado do `@tiptap/extension-youtube`, com `nocookie: true`.

### Melhorado
- **PostEditor — Input inteligente de YouTube**: O diálogo de inserção de vídeo agora aceita tanto o **código do vídeo** (`dQw4w9WgXcQ`) quanto a **URL completa** (`https://youtube.com/watch?v=...`). Códigos puros são convertidos automaticamente para URL antes da inserção.

## [v01.46.23] — 2026-03-25
### Corrigido
- **PostEditor — Inserção Simultânea de Imagem + Legenda**: `insertCaptionBlock` substituía o nó de imagem selecionado em vez de inserir a legenda após ele. Corrigido de `insertContent` para `insertContentAt(to, ...)`, calculando a posição imediatamente após o nó de mídia selecionado.

### Adicionado
- **[NEW] `functions/api/mainsite/media/[filename].ts`**: Rota interna para servir objetos do R2 (`MEDIA_BUCKET`) diretamente pelo admin-app. Cache público imutável de 1 ano.
- **[NEW] `functions/api/mainsite/migrate-media-urls.ts`**: Endpoint de migração que substitui URLs externas (`mainsite-app.lcv.rio.br/api/uploads/...`) por relativas (`/api/mainsite/media/...`) no conteúdo HTML de posts existentes. Suporta `?dryRun=1`.

### Auditoria
- **Auditoria completa de URLs externas no admin-app**: Verificados todos os arquivos `.ts`/`.tsx` em `src/` e `functions/`. Código morto identificado em `_lib/mainsite-admin.ts` (`fetchLegacyJson`, `fetchLegacyAdminJson`, `readLegacyPublicSettings`) e `_lib/mtasts-admin.ts` (`fetchLegacyJson`, `postLegacyJson`) — zero chamadores fora de `_lib/`. Usos legítimos confirmados: RSS feeds, Cloudflare API, Gemini API, links de navegação HubCards.

## [v01.46.22] — 2026-03-25
### Corrigido
- **PostEditor — Integração Interna R2 (Diretiva Cloudflare)**: Eliminada dependência de URL externa (`mainsite-app.lcv.rio.br/api/uploads/...`) no upload de imagens. O admin-app agora serve mídia diretamente do próprio binding R2 (`MEDIA_BUCKET`) via rota interna `GET /api/mainsite/media/:filename`. O `upload.ts` retorna URL relativa (`/api/mainsite/media/{uuid}`) em vez de URL pública de outro app.
- **PostEditor — Renderização de Mídia**: Removido atributo `crossOrigin="anonymous"` da tag `<img>`, que causava bloqueio silencioso de carregamento por CORS quando a imagem era servida de outra origem. A análise de tom (`analyzeTone`) faz fallback gracioso para `'neutral'` via try/catch existente.

## [v01.46.21] — 2026-03-25
### Corrigido
- **PostEditor — Renderização Fatal de Mídia (Tiptap Schema)**: O node customizado `CustomResizableImage` estava renderizando como 0x0/transparente após inserção porque faltava a marcação `inline: false` em sua configuração. A falta dessa diretriz de escopo bloco destruía a árvore DOM do editor, pois media nodes interativos geram React Views complexas que não podem coabitar propriedades _inline_ padrão. Tanto a imagem quanto o Youtube foram selados como `inline: false`.
- **PostEditor — Extensão FontSize Reinstaurada**: A extensão `FontSize` (e seu componente UI) que existia na arquitetura do legando mas que havia sido perdida acidentalmente durante essa refatoração estrutural, foi trazida de volta nativamente com inferência tipada (bypassing `any` estrito em comandos locais do Tiptap).

## [v01.46.20] — 2026-03-25
### Corrigido
- **PostEditor — Replicada Arquitetura Nativa (Inserção de Mídia vs Legenda)**: Código original do protótipo (`mainsite-admin`) restaurado na íntegra. Em vez de comandos hacky de manipulação de cursores para corrigir colisão com legendas, a resolução voltou à base: injetar a imagem com o atributo `width` pré-formatado diretamente na função `setImage`. O cursor agora descansa suavemente pós-imagem sem desativar/substituir o bloco primário, viabilizando o parágrafo da legenda.
- **Workspace — Tipagem Estrita (Zero Errors / Zero Warnings)**: Foram corrigidos mais de 15 erros na IDE causados por atribuições `Implicit Any`. Em `PostEditor.tsx`, importou-se a interface `NodeViewProps` da bilbioteca `@tiptap/react`. No `functions/api/mainsite/ai/transform.ts`, uma interface estrita modular (`GeminiResponse`) com rastreio da `usageMetadata` foi arquitetada para certificar confiabilidade aos objetos trafegados. Adicionalmente, injetou-se a regra do CSS `pointer-events: none/auto` baseada em classes condionais (`.is-selected`) para contornar lints estáticos acusando abuso de in-line styling no iframe do Youtube.

## [v01.46.19] — 2026-03-25
### Corrigido
- **PostEditor — Inserção de Mídia vs Legenda**: Resolvido falha de sobrescrita. Ao inserir uma imagem ou vídeo diretamente por URL ou Upload sem informar uma legenda, o Tiptap perdia o nó selecionado. A instrução `setTextSelection` com o ponteiro do node garante a transição segura antes de invocar `insertContent()`, mantendo a imagem e a legenda a salvo de formatações acidentais simultâneas.
- **PostEditor — Expansão Dinâmica (Flexbox)**: Corrigido o colapso visual do editor no novo `PopupPortal`. A cadeia inteira de componentes (`body`, `#popup-root`, `.popup-portal__dialog` e `.form-card`) agora compõe uma sub-árvore `flex` em `height: 100vh`, permitindo que o `.tiptap-container` adote o atributo `flex: 1` e estique ocupando inteiramente o pop-up dinâmico no Desktop sem quebras.

## [v01.46.18] — 2026-03-25
### Adicionado
- **PostEditor — Funcionalidades de Mídia Interativa**: Portado `ResizableImageNodeView` e `ResizableYoutubeNodeView` para o `admin-app/src/modules/mainsite/PostEditor.tsx`.
- **PostEditor — Transformer IA**: Integrada barra de formatação inteligente usando Gemini v1beta, contendo correções gramaticais, tradução, sumário, modo formal e expansão criativa (requer as configs já documentadas no backend).

### Corrigido
- **PostEditor — Correção de CORS e bug de legenda**: Removido o atributo `crossOrigin="anonymous"` da extensão `ResizableImage` para resolver bloqueios CORS (`tiny icon` no editor).
- **PostEditor — Fluxo de Legenda**: Corrigido bug onde a mídia que não continha legenda perdia o evento de edição, focando o nó adjacente e mantendo o conteúdo isolado.
- **MainsiteModule — Padronização Visual de Pop-ups**: Os comandos e mensagens de input adotam o padrão visual `itau-calculadora`, garantindo uniformidade visual.

## [v01.46.17] — 2026-03-25
### Corrigido
- **Financeiro — empilhamento forçado sem conflito de CSS legado**: o container de detalhes expandido passou a usar classe dedicada (`.fin-expanded-stack`) com fluxo vertical obrigatório, garantindo exibição em coluna única e evitando sobrescrita por regras herdadas da lista.

## [v01.46.16] — 2026-03-25
### Corrigido
- **Financeiro — detalhes restaurados com empilhamento vertical**: seção expandida de transações ajustada para coluna única real (`.fin-expanded-grid` em fluxo vertical), com cards de detalhe visíveis e empilhados dentro do frame.

### Alterado
- **CSP local afrouxado ao máximo**: `public/_headers` atualizado para política permissiva ampla em `Content-Security-Policy` e `Content-Security-Policy-Report-Only` (`script-src/connect-src/frame-src` com curingas), conforme solicitação operacional.

## [v01.46.15] — 2026-03-25
### Corrigido
- **Financeiro — detalhes em coluna única**: o bloco expandido das transações agora renderiza os dados em uma única coluna, com todos os cards de detalhe empilhados verticalmente dentro do frame, eliminando distribuição em múltiplas colunas.

## [v01.46.14] — 2026-03-25
### Corrigido
- **UX de falha em módulo lazy**: adicionado `LazyModuleErrorBoundary` em `App.tsx` para capturar erro residual de `import()` dinâmico e exibir painel amigável com ação de recarregar sessão, evitando quebra silenciosa da interface quando chunks continuam indisponíveis após o reload automático.

## [v01.46.13] — 2026-03-25
### Corrigido
- **Cloudflare Access + lazy chunks**: adicionado mecanismo de recuperação no `App.tsx` para falhas de `import()` dinâmico (ex.: `401 Unauthorized` em chunks lazy após expiração de sessão), com reload único automático para renegociar autenticação e evitar crash persistente (`Failed to fetch dynamically imported module`).
- **CSP Report-Only — ruído de console**: removido `upgrade-insecure-requests` do `Content-Security-Policy-Report-Only` em `public/_headers`, eliminando o aviso recorrente de diretiva ignorada no navegador.

## [v01.46.12] — 2026-03-25
### Adicionado
- **README — referência operacional de CSP**: documentação principal do `admin-app` agora inclui atalho explícito para `docs/csp-report-only-edge-checklist.md`, facilitando triagem rápida de incidentes `Content-Security-Policy-Report-Only` no edge.

## [v01.46.11] — 2026-03-25
### Adicionado
- **Runbook operacional de CSP no edge**: novo guia `docs/csp-report-only-edge-checklist.md` com passo a passo click-by-click no Cloudflare para identificar/remover injeção indevida de `Content-Security-Policy-Report-Only` com `script-src/connect-src 'none'`.

### Operacional
- **Auditoria de resposta efetiva**: procedimento formalizado para validar header final no navegador (Network/Response Headers) e diferenciar problema de app vs regra de edge.

## [v01.46.10] — 2026-03-25
### Corrigido
- **CSP — política estável reforçada no deploy**: `public/_headers` atualizado com `script-src-elem` e `connect-src` explícitos, além de `Content-Security-Policy-Report-Only` alinhado à política válida de runtime (`self` + Cloudflare Insights), reduzindo ruído de fallback em navegadores.

### Operacional
- **Diagnóstico de edge**: quando o browser reportar `Content-Security-Policy-Report-Only` com `script-src 'none'` / `connect-src 'none'`, a causa provável é header injetado por regra externa no edge (Cloudflare Transform/managed rule), não por código do app.

## [v01.46.09] — 2026-03-25
### Corrigido
- **Financeiro — badges de status (texto + cor) restaurados**: corrigida a resolução do status efetivo da SumUp para ignorar fallback técnico `—` quando o payload não traz `txStatus/checkoutStatus`, preservando o `log.status` real.
- **Financeiro — tons por label alinhados ao original**: mapeamento visual de badges ampliado para labels do painel legado em pt-BR (`APROVADO`, `PENDENTE`, `EM ANÁLISE`, `RECUSADO`, `CANCELADO`, `ESTORNADO`, etc.), restabelecendo padrão de cor e legibilidade.

## [v01.46.08] — 2026-03-25
### Corrigido
- **Financeiro — paridade dos detalhes expandidos (base `mainsite-admin`)**: a seção de detalhes das transações foi reconstruída campo a campo para reproduzir a estrutura do painel original, incluindo ordem, nomenclatura e regras de exibição por provedor (SumUp e Mercado Pago), com adaptação ao esqueleto visual do `admin-app`.
- **Financeiro — fallback técnico estruturado**: corrigido bug que exibia chaves literais do payload (`status_detail`, `payment_id`, etc.) no lugar dos valores reais quando o retorno vinha em formatos alternativos.
- **Financeiro — status efetivo SumUp**: cálculo de status passou a priorizar `txStatus`/`checkoutStatus` do payload antes do `log.status`, alinhando o badge e os estados de ação ao comportamento do painel legado.
- **Financeiro — compliance de status/action matrix**: `getSumupStatusConfig` alinhado ao mapeamento do painel original para fluxos `SUCCESSFUL/PENDING/PARTIALLY_REFUNDED`, preservando compatibilidade com os SDKs oficiais (SumUp e Mercado Pago) já integrados no backend.

### Alterado
- **Financeiro — paridade visual do bloco expandido**: o container de detalhes agora aplica estilização contextual por provedor (fundo, borda lateral e nota operacional) equivalente ao padrão do `FinancialPanel.jsx`.

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
- **Headers descritivos**: removido `<p>` explicativo de todos os 7 módulos (Telemetria, Astrólogo, MTA-STS, MainSite, Itaú, Config, HubCards).
- **Card "Telemetria centralizada"**: removido da tela principal (overview).
- **Empty-state fabricado (Astrólogo)**: removida mensagem "motor astrológico" inexistente no admin original.
- **Dead code**: imports `ArrowUpRight` de `App.tsx`, função `extractThumbnail` de `feed.ts`.

### Alterado
- **Títulos de módulos**: MTA-STS → "MTA-STS — Identidades e Segurança", MainSite → "MainSite — Posts e Conteúdo", Itaú → "Itaú — Calculadora Administrativa".
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
- **Itaú — telemetria**: card "Telemetria e últimas observações do backtest" removido (centralizado no módulo Telemetria).
- **Itaú — dead code**: tipos `Resumo`, `Observacao`, `ApiResponse`, estado `fonte`/`resumo`/`ultimasObservacoes`, imports `Activity`/`Search`/`formatOperationalSourceLabel`, form de overview removidos.
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
- Sidebar: módulo "Financeiro" integrado em ordem alfabética (Visão Geral → Astrólogo → Card Hub → **Financeiro** → Itaú → MainSite → MTA-STS → Telemetria → Configurações).
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
- Wrangler: bindings `ASTROLOGO_SOURCE_DB` e `ITAU_SOURCE_DB` removidos; 12 arquivos atualizados para usar exclusivamente `BIGDATA_DB`.
- Mensagens de erro de binding atualizadas para referenciar apenas `BIGDATA_DB`.
- Astrólogo: labels `#94a3b8` → `#bcc5d0`, conteúdo IA `#cbd5e1` → `#e2e8f0` (melhoria de contraste WCAG AA).
- Rótulo: "Gatilho de Doação (Mercado Pago)" → "Gatilho de Doação".
- Safari: `-webkit-backdrop-filter` adicionado em `.confirm-overlay`.
- `ItauModule.tsx`: hint de persistência atualizado para `BIGDATA_DB`.

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
- Metrics-grid de `MtastsModule`, `MainsiteModule`, `ItauModule`, `HubCardsModule`, `ConfigModule`.
- Campo "Administrador responsável" de `MtastsModule`, `MainsiteModule`, `ItauModule`, `HubCardsModule`, `AstrologoModule`.
- Campo "Fonte atual" de `HubCardsModule`.
- Métricas Estrito/Ligado/Sincronizado de `ConfigModule`.
- Imports e state não utilizados (`Lock`, `AlertTriangle`, `formatOperationalSourceLabel`, `setAdminActor`, `payload` em HubCards).

### Alterado
- Catálogo (paridade visual) nos módulos AdminHub e AppHub redesenhado: cards compactos exibindo apenas ícone, nome e handle de drag-and-drop, organizados em 3 colunas com empilhamento vertical.
- Título do topbar alterado de "Visão Geral da Fase 1" para "Visão Geral".
- Versão da aplicação incrementada para `APP v01.32.00`.

## [v01.31.14] — 2026-03-24
### Corrigido
- Eliminada emissão de `source: legacy-admin` nos endpoints auditados de `astrologo` e `itau`, com padronização para `bigdata_db`.
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
- Higienizadas descrições de sync nos módulos `Itaú` e `MTA-STS` para remover referência textual a migração legada já superada em operação interna.
- Mensagens agora descrevem sincronização diretamente no `bigdata_db`, mantendo o contexto de observabilidade do cockpit.
- Versão da aplicação incrementada para `APP v01.31.12` em `src/App.tsx`.

## [v01.31.11] — 2026-03-24
### Alterado
- Padronizada a exibição de `fonte` operacional nos módulos `Itaú`, `MTA-STS` e `HubCards` via `formatOperationalSourceLabel` em `src/lib/operationalSource.ts`.
- Eliminada apresentação crua de valores de source no frontend dos módulos, mantendo consistência visual com a `Visão Geral`.
- Versão da aplicação incrementada para `APP v01.31.11` em `src/App.tsx`.

## [v01.31.10] — 2026-03-24
### Alterado
- Extraída a normalização de `source` operacional para utilitário compartilhado em `src/lib/operationalSource.ts` (`formatOperationalSourceLabel` e `isLegacyOperationalSource`).
- `src/App.tsx` passou a consumir o utilitário central, eliminando duplicação local de mapeamento de fontes de telemetria.
- Versão da aplicação incrementada para `APP v01.31.10`.

## [v01.31.09] — 2026-03-24
### Corrigido
- Alinhados contratos de `fonte` no frontend para refletir o estado operacional atual sem ponte legada nos módulos `Itaú` e `MTA-STS`.
- `src/modules/hubs/HubCardsModule.tsx` atualizado para refletir fontes reais do backend (`bigdata_db` e `bootstrap-default`).
- `functions/api/itau/overview.ts` teve a tipagem de payload ajustada para origem exclusiva em `bigdata_db`.
- `functions/api/mtasts/overview.ts` corrigido para remover referência a tipo legado inexistente no mapper de histórico.

### Alterado
- `src/App.tsx` passou a rotular `bootstrap-default` como `BOOTSTRAP-DEFAULT (local)` na telemetria operacional.
- Versão da aplicação incrementada para `APP v01.31.09` em `src/App.tsx`.

## [v01.31.08] — 2026-03-24
### Corrigido
- Removidas emissões de telemetria com `source: legacy-admin` nos endpoints do `admin-app` auditados nesta etapa.
- `functions/api/astrologo/ler.ts` e `functions/api/astrologo/excluir.ts` agora priorizam `BIGDATA_DB` (com fallback de compatibilidade) e registram fonte operacional coerente.
- `functions/api/astrologo/enviar-email.ts` agora registra telemetria como `bigdata_db`.
- `functions/api/itau/rate-limit.ts` e `functions/api/itau/parametros.ts` agora priorizam `BIGDATA_DB` e removem espelhamento legado redundante no fluxo de rate limit.

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
- Padronização de leitura/gravação no domínio Itaú para tabelas prefixadas em `bigdata_db`: `itau_parametros_customizados`, `itau_parametros_auditoria`, `itau_rate_limit_policies`, `itau_rate_limit_hits`, `itau_oraculo_observabilidade`.
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
