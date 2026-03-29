# Changelog — Admin App

## [v01.70.00] — 2026-03-29
### Corrigido
- **DeploymentCleanupPanel — Purge logic fix**: lógica de identificação de deployments obsoletos corrigida no backend (`cleanup-deployments.ts`). Agora protege tanto o deployment mais recente (por data) quanto o deployment ativo do projeto (`project.latest_deployment.id`). Safety guard adicionado no endpoint POST: retorna `403 Forbidden` se tentar deletar o deployment ativo.
- **CfDnsModule — Confirmação nativa removida**: ambas as chamadas `window.confirm()` (save e delete de registros DNS) substituídas por modais in-app com backdrop blur, ícone `AlertTriangle`, botões estilizados. Zero diálogos nativos do browser remanescentes no codebase.
- **CfPwModule — Confirmação nativa removida**: `window.confirm()` em operações destrutivas avançadas substituído por modal customizado com mesmo design system. Deps desnecessários no `useCallback` removidos.

### Controle de versão
- `admin-app`: APP v01.69.05 → APP v01.70.00

## [v01.69.05] — 2026-03-29
### Corrigido
- **DeploymentCleanupPanel — Confirmação customizada**: substituído `window.confirm()` nativo do browser por modal in-app com backdrop blur, ícone `AlertTriangle`, botões estilizados e animação spring. Alinhamento com padrão de UX do design system do admin-app — nenhum componente deve usar diálogos nativos do browser.

### Controle de versão
- `admin-app`: APP v01.69.04 → APP v01.69.05



## [v01.69.04] — 2026-03-29
### Corrigido
- **Notificações — Migração para padrão mainsite**: componente `Notification.tsx` e `Notification.css` reescritos para aderir ao padrão visual "toast inteligente" do mainsite — pill centrada no topo, `backdrop-filter: blur`, `border-radius: 100px`, variantes cromáticas (success verde, error vermelho, info translúcido), animação spring-based. O layout anterior (card retangular no canto superior-direito com barra de progresso) foi descontinuado.
- **Build cache stale**: adicionado script `prebuild` (`rmSync dist`) no `package.json` para prevenir deploys com assets de hash idêntico ao build anterior, que era o root cause das notificações não aparecendo em produção.

### Controle de versão
- `admin-app`: APP v01.69.03 → APP v01.69.04

## [v01.69.03] — 2026-03-29
### Corrigido
- **Purge de Deployments — Compliance de notificações**: componente `DeploymentCleanupPanel` violava a diretiva global de notificações (toast). Feedbacks de scan ok/erro, purge concluído/parcial e operação abortada agora emitem toast via `useNotification()`, além do log no terminal interno.

### Controle de versão
- `admin-app`: APP v01.69.02 → APP v01.69.03

## [v01.69.02] — 2026-03-29
### Alterado
- **Telemetria — Fusão de abas**: abas "Chatbot" e "Auditoria IA" unificadas em uma única aba "Chatbot IA" com duas seções empilhadas — conversas (chat logs) e auditoria de contexto (posts selecionados, termos, scores). Elimina navegação desnecessária entre dados complementares da mesma feature.

### Removido
- Import não utilizado `MessageSquare` de lucide-react.

### Controle de versão
- `admin-app`: APP v01.69.01 → APP v01.69.02

## [v01.69.01] — 2026-03-29
### Alterado
- **AI Status / GCP Tab — Quota humanizada**: nomes de métricas de quota GCP migrados de `snake_case` cru para labels humanas via mapa `QUOTA_HUMAN_NAMES` (ex: `generate_content_requests` → "Generate Content").
- **AI Status / GCP Tab — Quota ilimitada**: valores de quota `int64 MAX` (≥9e18) agora exibem badge "Ilimitado ∞" em violeta, com barra de progresso diferenciada.
- **AI Status / Usage Tab — Empty state**: substituído bloco de código cru por design limpo com badge "Instrumentação ativa ✓" e mensagem informativa.

### Adicionado
- **Telemetria — `mainsite/ai/transform.ts`**: instrumentação fire-and-forget para `ai_usage_logs` (D1) após cada chamada Gemini, registrando módulo, modelo, tokens, latência e status.
- **Telemetria — `news/discover.ts`**: mesma instrumentação para descoberta de feeds RSS via Gemini API.

### Controle de versão
- `admin-app`: APP v01.69.00 → APP v01.69.01

## [v01.69.00] — 2026-03-29
### Adicionado (MAJOR)
- **AI Status — módulo novo**: dashboard de monitoramento completo para Gemini AI, com arquitetura de 3 tiers:
  - **Tier A — Modelos & Rate Limits**: catálogo live de modelos Gemini via API (`/api/ai-status/models`), health check com latência (`/api/ai-status/health`), e tabelas de referência estática de rate limits Free/Paid por modelo e região.
  - **Tier B — Uso & Telemetria (self-managed)**: endpoint `/api/ai-status/usage` com auto-migração da tabela `ai_usage_logs` no `BIGDATA_DB` (D1). Suporta GET (aggregação por período, módulo, modelo) e POST (log de consumo). Resumo com total de tokens, custo estimado, chamadas, e breakdown por módulo/modelo. Gráfico diário CSS (bar chart) sem dependência de bibliotecas.
  - **Tier C — GCP Cloud Monitoring**: autenticação JWT → OAuth2 com Service Account (`GCP_SA_KEY` + `GCP_PROJECT_ID`). Consulta `generativelanguage.googleapis.com/` metrics via Cloud Monitoring API. Guia interativo de setup integrado ao painel quando credenciais ausentes.
- **Frontend**: `AiStatusModule.tsx` com 3 tabs, health badge dinâmico (🟢/🔴/⚪), spinner de carregamento, e fallback de erro com retry. Visual coerente com design system existente (cards, pills, tipografia).
- **CSS**: tokens `--module-accent` emerald (#10b981), `.ai-rate-table`, `.ai-daily-chart`, `.ai-model-card`, animação `fadeSlideIn`.
- **Telemetria**: tipo `ai-status` adicionado às unions `ModuleEventInput` e `SyncRunStart` em `operational.ts`.

### Controle de versão
- `admin-app`: APP v01.68.00 → APP v01.69.00

## [v01.68.00] — 2026-03-29
### Alterado (MAJOR)
- **Financeiro — Migração Live API**: Dashboard financeiro migrado de arquitetura D1-dependent para **Live API-first**. Transações, status e saldos agora vêm direto das APIs SumUp SDK e Mercado Pago REST.
- **Frontend (`FinanceiroModule.tsx`)**: Reescrito para usar `insights.advancedTx` como fonte única. Tabs SumUp/MP com tabela unificada, controles de estorno/cancelamento inline e sem dependência de D1.
- **Backend enrichment (`insights.ts`)**: Endpoint `transactions-advanced` enriquecido com `payer_email`, `entryMode`, `statusDetail`, `authCode` para paridade total.
- **Ações financeiras**: `sumup-refund.ts`, `sumup-cancel.ts`, `mp-refund.ts`, `mp-cancel.ts` refatorados para operação pure-SDK. Todo código D1 removido.
- **Balanços**: `sumup-balance.ts` migrado para SDK, `mp-balance.ts` migrado para REST API. Zero dependência D1.
- **Tipos**: `AdvancedTx` e `ModalAction` atualizados em `financeiro-helpers.ts` para suportar dados live.
- **Overview/Sync**: Referências a `mainsite_financial_logs` removidas de `overview.ts` e `sync.ts`.

### Removido
- **Endpoints D1-only deletados**: `financeiro.ts` (listagem D1), `sumup-sync.ts`, `mp-sync.ts`, `reindex-gateways.ts`, `delete.ts` — sem consumidor frontend.
- **D1 writes eliminados**: Todos os best-effort UPDATEs em `mainsite_financial_logs` removidos dos endpoints de ação.

### Nota
- A tabela `mainsite_financial_logs` permanece no D1 pois ainda é escrita pelo `mainsite-worker` (webhooks de pagamento). Migração do worker é escopo separado.
- **Fee Config** (taxas de provedores para repasse ao doador) permanece na D1 via `loadFeeConfig()` — são dados de *configuração*, não de transação.

## [v01.67.03] — 2026-03-29
### Corrigido
- **Financeiro/SumUp — frontend sobrescrevia status correto do backend**: `parseSumupPayload` em `financeiro-helpers.ts` lia apenas `transactions[0].status` (SUCCESSFUL — pagamento original), fazendo o frontend exibir `APROVADO` mesmo quando o backend já havia resolvido `REFUNDED`. Corrigido para escanear todo `transactions[]` e detectar refunds com a mesma lógica do backend.
- **Root cause**: a cadeia `resolveStatusConfig` → `parseSumupPayload` → `resolveEffectiveSumupStatus` no frontend priorizava `txStatus` extraído do raw_payload (que vinha de `transactions[0]`) sobre o `log.status` correto do backend, invertendo a prioridade de dados.

## [v01.67.02] — 2026-03-29
### Corrigido
- **Financeiro/SumUp — detecção inteligente de reembolsos**: `sumup-sync.ts` e `financeiro.ts` agora iteram todo o array `transactions[]` do checkout SumUp em vez de ler apenas `transactions[0]`. Transações com `type: "REFUND"` são somadas para determinar status `REFUNDED` (total) ou `PARTIALLY_REFUNDED` (parcial).
- **Financeiro — prioridade do provedor**: dados vindos das APIs SumUp/MP sempre sobrescrevem registros D1 locais, que servem apenas como cache offline.
- **TypeScript — lint errors eliminados**: importações de `D1Database` de `@cloudflare/workers-types`, interfaces explícitas (`SumUpTransaction`, `SumUpCheckout`, `FinancialLog`), e tipagem estrita dos handlers substituíram todos os `any` implícitos em `financeiro.ts` e `sumup-sync.ts`.
- **Deps — vulnerabilidades corrigidas**: `brace-expansion` (moderate, ReDoS) e `picomatch` (high, method injection + ReDoS) atualizados via `npm audit fix`. 0 vulnerabilidades restantes.

## [v01.67.01] — 2026-03-28
### Adicionado
- **Rate Limit — Paridade `contato`**: rota `contato` (Formulário de Contato) adicionada aos módulos **Astrólogo**, **Calculadora** e **MainSite**, equiparando ao Oráculo que já possuía essa rota. Default: 5 req / 30 min, habilitado.
- **Astrólogo**: `astrologo-admin.ts` — `SUPPORTED_ROUTES`, `DEFAULT_POLICIES` e tipo `AstrologoRateLimitPolicy` expandidos.
- **Calculadora**: `calculadora-admin.ts` — `SUPPORTED_ROUTES`, `DEFAULT_POLICIES` e tipo `CalculadoraRateLimitPolicy` expandidos.
- **MainSite**: `mainsite/rate-limit.ts` — `PolicyRoute`, `POLICY_META`, `normalizeConfig`, `saveLegacyRateLimit`, `normalizeRoute` expandidos.
- **Common**: `rate-limit-common.ts` — array `mainsite` em `RATE_LIMIT_ROUTES` expandido.

## [v01.67.00] — 2026-03-28
### Adicionado
- **Governança de Deployments — Cloudflare Pages**: nova seção em Configurações que replica a funcionalidade do script PowerShell `Clean-CloudflarePagesDeployments.ps1` via APIs nativas Cloudflare.
- **[NEW] `functions/api/cfpw/cleanup-deployments.ts`**: endpoint GET (scan de todos os projetos Pages + deployments) e POST (delete unitário de deployment obsoleto). Arquitetura frontend-driven para progresso em tempo real.
- **[NEW] `src/components/DeploymentCleanupPanel.tsx`**: componente com máquina de estados (idle→scanning→scanned→purging→complete), terminal estilizado com logs em tempo real, barra de progresso animada, cards de projeto com status e fluxo de confirmação.
- **[NEW] `src/components/DeploymentCleanupPanel.css`**: estilos dedicados com design de terminal macOS, animações de shimmer/fade e color-coding de status.
- **Backend helper**: adicionada `deleteCloudflarePagesDeployment()` em `cfpw-api.ts` com suporte a `?force=true`.
### Corrigido
- **CF DNS — Lint cleanup**: removidos 16 escapes desnecessários em template literals e corrigidas dependências de `useMemo` no `operationalAlerts`.

## [v01.66.01] — 2026-03-28
### Corrigido
- **CF DNS — Falsos positivos de auditoria**: alertas operacionais como `CFDNS-A-INVALID` ("Nome obrigatório", "Conteúdo obrigatório") eram gerados ao carregar o módulo com draft vazio, sem nenhuma interação do usuário. Alertas de validação de draft agora só aparecem quando o formulário de criação/edição está ativo (`showRecordForm || isEditing`). Alertas de zona (`CFDNS-ZONE-MISSING`) permanecem incondicionais.
- **CF DNS — A records "ausentes"**: confirmado via documentação Cloudflare DNS API que registros A visíveis em `dig`/`nslookup` para domínios com CNAME flattening no apex são sintetizados pela edge Cloudflare e **não existem como registros armazenados** na zona — a API retorna corretamente o CNAME real.

## [v01.66.00] — 2026-03-28
### Adicionado
- **Oráculo — Rate Limit**: controle completo de rate limit para o módulo Oráculo Financeiro, em paridade total com o Astrólogo.
- **[NEW] `functions/api/_lib/oraculo-admin.ts`**: helper de rate limit com tabelas D1 dedicadas (`oraculo_rate_limit_policies`, `oraculo_api_rate_limits`), 4 rotas protegidas: `analisar-ia`, `enviar-email`, `contato`, `tesouro-ipca-vision`.
- **[NEW] `functions/api/oraculo/rate-limit.ts`**: endpoint GET/POST para leitura e persistência de políticas de rate limit do Oráculo, com fallback resiliente e telemetria operacional.
- **Configurações — Oráculo no rate limit**: dropdown do painel Rate Limit em Configurações agora inclui a opção "Oráculo" com RateLimitPanel genérico.
### Alterado
- **Telemetria**: tipo `module` em `operational.ts` expandido para incluir `'oraculo'`.

## [v01.65.03] — 2026-03-28
### Alterado
- **CF DNS — Badges de proxy coloridos**: tabela de registros agora exibe badges visuais com ícone de nuvem — `Proxied` (laranja) e `DNS only` (cinza) — substituindo o texto genérico anterior, com tooltip explicativo.
- **CF DNS — TTL humanizado**: valor de TTL `1` agora é exibido como `Auto` estilizado na tabela, em vez do número cru.
- **CF DNS — Conteúdo truncado com tooltip**: valores de conteúdo maiores que 60 caracteres são truncados com reticências e o valor completo fica acessível via tooltip nativo.
- **CF P&W — Resultado humanizado**: resultado de operações avançadas deixou de exibir JSON bruto, adotando badge de status verde (`✓ Concluído`), tabela key-value para dados simples, e JSON colapsável (`<details>`) para dados complexos.
- **CF P&W — Confirmação destrutiva**: operações de delete (secrets, routes, raw DELETE) agora pedem confirmação via `window.confirm` antes de executar.
- **CF P&W — Secret toggle**: campo de valor de secret recebeu botão Eye/EyeOff para alternar visibilidade do conteúdo sensível.
- **CF P&W — Transições suaves**: campos condicionais aparecem com animação fade-in + slide-down.

### Controle de versão
- `admin-app`: APP v01.65.02 → APP v01.65.03

## [v01.65.02] — 2026-03-28
### Corrigido
- **CF DNS — Proxy laranja soberano**: qualquer registro marcado como `proxied = true` passa a ser tratado como operacionalmente correto no painel, independentemente do tipo ou do conteudo informado. Foram removidos bloqueios e alertas semanticos locais quando o proxy esta ativo.

### Alterado
- **CF DNS — UX de proxy sem restricao por tipo**: o seletor de proxy deixou de rebaixar automaticamente registros ao trocar o tipo, preservando a intencao operacional do operador.
- **CF P&W — Operacoes avancadas guiadas**: o painel deixou de exibir todos os campos crus ao mesmo tempo e passou a mostrar apenas os controles relevantes para a acao escolhida, com descricoes operacionais, agrupamento por categoria, preenchimento assistido por inventario e preview de retorno mais legivel.

### Controle de versão
- `admin-app`: APP v01.65.01 → APP v01.65.02

## [v01.65.01] — 2026-03-28
### Corrigido
- **CF DNS — Validação de registros proxied**: registros DNS com status `proxied = true` são agora considerados válidos automaticamente. Conteúdo vazio ou inválido é aceito para registros proxied, pois o gerenciamento do IP é feito pela Cloudflare. Resolve alertas falsos `CFDNS-A-INVALID` e `CFDNS-AAAA-INVALID` para registros em proxy laranja.

### Controle de versão
- `admin-app`: APP v01.65.00 → APP v01.65.01

## [v01.65.00] — 2026-03-28
### Adicionado
- **CF P&W — Criação operacional de recursos**: novas ações avançadas para criação de Worker por template (`create-worker-from-template`) e criação de projeto Pages (`create-page-project`) diretamente do módulo unificado.
- **CF P&W — Versões e rotas (Workers)**: adicionadas ações para listar versões, promover versão (`deploy-worker-version`) e gerir rotas por zona (`list/add/delete-worker-route`).
- **CF P&W — Operação raw controlada**: adicionada ação `raw-cloudflare-request` com método/path/body para cobrir endpoints Cloudflare ainda não modelados no helper, com validação de escopo (`/accounts` e `/zones`).

### Alterado
- **CF P&W helper (`cfpw-api.ts`)**: expandido com novos métodos de criação/configuração avançada (Worker template, Pages project/settings, versões, rotas) e suporte robusto a `multipart/form-data` para publish inicial de Worker.
- **CF P&W painel (`CfPwModule`)**: ampliado com novos campos e ações de paridade total para execução operacional avançada em uma única tela.
- **CF DNS alerting**: alertas operacionais agora exibem explicitamente o contexto de zona/domínio ativo em `cause/action`, eliminando ambiguidade sobre o domínio afetado.

### Controle de versão
- `admin-app`: APP v01.64.00 → APP v01.65.00

## [v01.64.00] — 2026-03-28
### Adicionado
- **CF P&W — Operações avançadas de paridade**: novo endpoint unificado `POST /api/cfpw/ops` com suporte operacional para schedules, usage model e secrets de Workers, além de domains e ações de deployment em Pages (retry, rollback e logs).
- **CF P&W — Painel de execução avançada**: módulo `CF P&W` recebeu painel dedicado para executar operações de paridade com parâmetros operacionais e pré-visualização estruturada do retorno.

### Alterado
- **CF DNS — Alertas operacionais detalhados**: warnings de validação agora são emitidos com `code`, `cause` e `action`, elevando a legibilidade e a capacidade de ação do operador em cenários de configuração arriscada.
- **CF P&W — Helper Cloudflare expandido**: `functions/api/_lib/cfpw-api.ts` ampliado para cobrir superfícies críticas da API de Workers/Pages além de overview/detalhes/exclusão.

## [v01.63.01] — 2026-03-28
### Alterado
- **CF DNS — Edição contextual no estilo Cloudflare**: ao clicar em `Editar`, o painel de edição abre imediatamente abaixo do registro selecionado na tabela, mantendo contexto local da linha.
- **CF DNS — Densidade harmônica de tabela e ações**: refinados paddings, tipografia e botões de ação para reduzir colisões visuais e evitar sobreposição de elementos no frame.

### Corrigido
- **CF P&W — Falhas 502 em detalhes de Worker/Pages**: endpoints de detalhes passaram a operar com tolerância a falha parcial (`Promise.allSettled`), retornando warnings estruturados quando apenas parte dos dados falha.
- **CF P&W — JSON bruto removido da visão principal**: painel de detalhes migrado para layout estruturado (resumo operacional + tabela de deployments), mantendo leitura humana e auditável.

## [v01.63.00] — 2026-03-28
### Adicionado
- **Módulo CF P&W (novo)**: criado o painel `CF P&W` no `admin-app` para gestão operacional de Cloudflare Pages e Workers via API nativa.
- **Overview operacional**: endpoint consolidado com contexto da conta ativa, total de Workers e total de projetos Pages.
- **Detalhes e deployments**: leitura dedicada de detalhes de Worker/projeto e histórico de deploys por recurso.
- **Exclusão com confirmação forte**: remoção de Worker e Pages com confirmação explícita por redigitação do identificador.

### Alterado
- **Menu lateral com regra fixa**: mantido o padrão obrigatório no `admin-app` com `Visão Geral` sempre em primeiro, `Configurações` sempre em último e os demais módulos em ordem alfabética.

## [v01.62.04] — 2026-03-28
### Melhorado
- **CF DNS — Validação semântica completa**: expandido o motor de validação do formulário para cobrir tipos estruturados e tipos comuns com bloqueio preventivo de save quando o payload está inválido.
- **URI (strict target)**: validação de formato URL/URI, checagem de tamanho e feedback contextual no campo `target`.
- **CAA (strict flags/tag/value)**: validação de `flags` (0-255), `tag` permitida (`issue`, `issuewild`, `iodef`) e coerência de `value` para `iodef` (`mailto:`/`http(s)://`).
- **Tipos comuns (A/AAAA/CNAME/MX/TXT)**: validações de conteúdo por tipo (IPv4/IPv6/hostname), prioridade obrigatória para MX e hints operacionais para TXT extenso.
- **UX de diagnóstico em tempo real**: mensagens inline de erro/hint por campo e gate de salvamento orientado por validação, reduzindo falhas de round-trip com a API da Cloudflare.

## [v01.62.03] — 2026-03-28
### Melhorado
- **CF DNS — Parser semântico para HTTPS/SVCB**: implementado parsing inteligente de `value` com validações de sintaxe para tokens `alpn`, `port`, `ipv4hint`, `ipv6hint` e `ech`.
- **Validação preventiva no save**: registros HTTPS/SVCB agora bloqueiam salvamento quando o parser detecta inconsistências semânticas.
- **UX assistida no formulário**: o campo `value` exibe feedback em tempo real (primeiro erro detectado, dicas e tokens parseados), reduzindo tentativa e erro na configuração de endpoints modernos.

## [v01.62.02] — 2026-03-28
### Melhorado
- **CF DNS — Tipos estruturados ampliados**: o editor avançado do módulo `CF DNS` recebeu suporte dedicado para **URI**, **HTTPS** e **SVCB**, seguindo o mesmo padrão de UX aplicado em SRV/CAA.
- **URI data payload**: adicionados campos específicos `priority`, `weight` e `target`, com validação e serialização para `record.data`.
- **HTTPS/SVCB data payload**: adicionados campos específicos `priority`, `target` e `value`, com validação e serialização para `record.data`.
- **Preview da listagem melhorado**: a coluna de conteúdo agora renderiza resumo legível de registros estruturados URI/HTTPS/SVCB quando `content` estiver vazio.

## [v01.62.01] — 2026-03-28
### Melhorado
- **CF DNS — Edição avançada por tipo**: o editor do módulo `CF DNS` agora suporta campos estruturados para registros **SRV** e **CAA**, incluindo leitura/hidratação de `data`, edição assistida e persistência completa via API.
- **SRV (Cloudflare data payload)**: adicionados campos dedicados `service`, `proto`, `name`, `priority`, `weight`, `port` e `target`, com validações de obrigatoriedade e serialização automática para `record.data`.
- **CAA (Cloudflare data payload)**: adicionados campos dedicados `flags`, `tag` (`issue`, `issuewild`, `iodef`) e `value`, com validações de consistência e serialização automática para `record.data`.
- **Listagem inteligente**: quando `content` estiver vazio em tipos estruturados, a tabela de registros exibe uma prévia legível baseada em `data` (SRV/CAA), evitando células vazias e melhorando auditoria operacional.

## [v01.62.00] — 2026-03-28
### Adicionado
- **Módulo CF DNS (novo)**: criado o painel completo `CF DNS` no `admin-app`, com gestão de DNS da Cloudflare em fluxo end-to-end.
- **Dropdown automático de domínios**: listagem dinâmica de zonas ativas via API nativa da Cloudflare (`/api/cfdns/zones`) com seleção inteligente de zona.
- **Leitura e filtro de registros DNS**: tabela operacional com paginação, filtro por tipo e busca por nome (`/api/cfdns/records`), incluindo metadados de TTL, proxy e data de atualização.
- **CRUD de registros (create/update/delete)**: inclusão e edição via `POST /api/cfdns/upsert` e exclusão via `DELETE /api/cfdns/delete`, com validação de campos críticos (TTL, priority, type/name/content).
- **Confirmações e feedback visual**: confirmações explícitas para criar/editar/excluir, estado operacional com chip dinâmico e alertas inteligentes no formulário (warnings preventivos para configurações potencialmente arriscadas).

### Alterado
- **Cloudflare API helper**: `functions/api/_lib/cloudflare-api.ts` expandido para operações genéricas de DNS (listar registros, criar, atualizar e remover) preservando a prioridade de token por `CLOUDFLARE_DNS`.
- **Telemetria operacional**: `functions/api/_lib/operational.ts` atualizado para incluir o módulo `cfdns` no trilho padronizado de eventos operacionais.

## [v01.61.02] — 2026-03-28
### Corrigido
- **AstrologoModule**: Corrigidos erros de linting relacionados à validação explícita de `any` emitidos pelo `@typescript-eslint/no-explicit-any`. O supressor de lint (`// eslint-disable-next-line`) foi adotado especificamente na assinatura e nas iterações de `renderMapaCard` para estabilizar rigorosamente o painel, sem perdas na maleabilidade essencial do modelo dinâmico do banco (que recebe mapas mistos da API ou registros de ficha). 

## [v01.61.01] — 2026-03-28
### Alterado
- **MainsiteModule**: Removido o botão "Novo Rascunho" da barra de ferramentas.
- **PostEditor**: Botão "Salvar Alterações/Criar post" realocado para a barra superior (`inline-actions`), à esquerda do botão de "Limpar".
- **PopupPortal**: CSS ajustado para permitir que o frame do editor de texto expanda e contraia dinamicamente consumindo todo o pop-up, com margem de 1cm.

## [v01.61.00] — 2026-03-28
### Adicionado
- **Calculadora**: Implementado seletor de modelos de inteligência artificial (Gemini) na calculadora administrativa, operando em paridade visual e funcional com o *Oráculo* e *Astrólogo*, com persistência via `localStorage` e carregamento de endpoint dinâmico (`/api/calculadora/modelos`).

## [v01.60.02] — 2026-03-28
### Corrigido
- **MTA-STS & Cloudflare DNS API**: Refatorada a lógica de resolução de tokens (`functions/api/_lib/cloudflare-api.ts`) para priorizar a variável de ambiente `CLOUDFLARE_DNS` antes da `CF_API_TOKEN` e `CLOUDFLARE_API_TOKEN`. Isso resolve um Conflito de Permissões Crítico onde o token reservado ao Oráculo (`CF_API_TOKEN`, com privilégios limitados apenas a Worker Scripts) estava sendo acionado inadvertidamente pelos módulos de auditoria de DNS do app, causando Erros 403 (Authentication Error). A integração agora honra a diretiva do menor privilégio, lendo cada token restritamente para sua finalidade e priorizando chaves de DNS em rotas de zona.

## [v01.60.01] — 2026-03-28
- **Menu Lateral**: Adicionada rolagem vertical inteligente (`overflow-y: auto`) na `.nav-list` do menu lateral (`App.css`), permitindo acessar todos os itens quando a lista exceder a altura da tela, sem prejudicar o estado recolhido do sidebar. Conta com scrollbar customizada e sutil (Google Blue pattern).

### Alterado
- **Deploy Automático**: Atualizado `deploy.yml` para incluir a flag `--commit-dirty=true` na step de "Deploy Admin App", garantindo sucesso mesmo havendo modificações locais em estado "dirty" no ambiente do GitHub Actions.

## [v01.60.00] — 2026-03-28
### Adicionado
- **TLS-RPT**: Módulo frontal e motor de processamento migrados do `tlsrpt-app` autônomo diretamente para dentro do `admin-app`.
- **TLS-RPT Frontend**: Criação do `TlsrptModule.tsx` e `TlsrptModule.css` portando a lógica React JSX e o design original, agora integrados no menu lateral com rota via proxy interno.
- **TLS-RPT Motor**: Motor de processamento `tlsrpt-motor` incorporado como *Service Binding* (`TLSRPT_MOTOR`) configurado no `wrangler.json`. Redirecionado tráfego por um *Proxy Pages Function* (`functions/api/tlsrpt/[[path]].ts`).

### Alterado
- **CORS e Deploy**: Variáveis CORS do `tlsrpt-motor` ajustadas (`"ALLOWED_ORIGIN": "*"`) para aceitar proxy interno. Action de CI/CD (`deploy.yml`) agora coordena deploy do motor junto com a página.

### Removido
- Aplicativo obsoleto `tlsrpt-app` foi permanentemente deletado do workspace mantendo consistência monolítica na arquitetura do admin.

## [v01.59.02] — 2026-03-28
### Corrigido
- **Financeiro/SumUp — chave canônica do registro**: sincronização, estorno e cancelamento passaram a reconciliar `mainsite_financial_logs` pelo `checkout.id` canônico, cobrindo também registros legados salvos com `transaction.id`.
- **Financeiro/SumUp — status terminal persistente**: listagem, reindexação e helpers do painel agora preservam estados terminais (`PARTIALLY_REFUNDED`, `REFUNDED`, `CANCELLED`) sem regressão para `SUCCESSFUL` após sync posterior.

## [v01.59.01] — 2026-03-28
### Adicionado
- **Financeiro/SumUp**: criados endpoints locais `POST /api/financeiro/sumup-refund` e `POST /api/financeiro/sumup-cancel` para suportar estorno/cancelamento diretamente no `admin-app`, em paridade com o fluxo operacional do worker.

### Corrigido
- **Financeiro/SumUp**: tipagem e contrato de handlers ajustados para manter build/lint limpos no contexto Pages Functions do projeto.

## [v01.59.00] — 2026-03-27
### Adicionado
- **Astrólogo**: Implementada aba de "Configurações" no módulo `AstrologoModule`.
- **Astrólogo**: Adicionado select de modelo de inteligência artificial (Gemini) para a síntese astrológica com persistência no `localStorage`. Sincronizado dinamicamente via `/api/astrologo/modelos`. Paridade visual e funcional com a aba de Configurações do `OraculoModule`.

## [v01.58.00] — 2026-03-27
### Adicionado
- **Astrólogo**: Nova aba "Dados de Usuários" adicionada no módulo Astrólogo.
- **Astrólogo**: Visualização de metadados e blocos JSON de usuários salvos pelo Frontend do Astrólogo.
- **Astrólogo**: Funcionalidade de exclusão de dados e mapas astrológicos em cascata associada ao e-mail do usuário em paridade com o Oráculo Financeiro.

## [v01.57.00] — 2026-03-27\r
### Adicionado\r
- **Cascata de exclusão completa**: `DELETE /api/oraculo/userdata` agora apaga registros de todas as tabelas — `oraculo_user_data`, `oraculo_tesouro_ipca_lotes`, `oraculo_lci_cdb_registros`, `oraculo_auth_tokens` — por IDs do JSON + email (safety net). Observabilidade com contadores de registros deletados.\r
- **Sincronização reversa em `excluir.ts`**: ao excluir registro individual das abas LCI/LCA ou Tesouro IPCA+, o `dados_json` em `oraculo_user_data` é atualizado para remover o ID deletado.\r
- **Reload pós-exclusão**: após excluir usuário na aba "Dados de Usuários", as abas LCI/LCA e Tesouro IPCA+ são recarregadas automaticamente.\r
\r
## [v01.56.02] — 2026-03-27
### Corrigido
- **OraculoModule — Excluir usuário retornava 400**: botão "Excluir" na aba "Dados de Usuários" chamava `/api/oraculo/excluir` com `tipo: 'usuarios'`, que o backend rejeitava (só aceita `lci-lca`/`tesouro-ipca`). Corrigido para usar `DELETE /api/oraculo/userdata?id=...` quando `activeTab === 'usuarios'`, e atualizar corretamente o state local `userData`/`userDataTotal`.

## [v01.56.01] — 2026-03-27
### Melhorado
- **Cron GET handler logging**: endpoint `GET /api/oraculo/cron` agora loga schedule lido e erros para observabilidade completa no Cloudflare.

## [v01.56.00] — 2026-03-27
### Adicionado
- **OraculoModule — Cron Schedule via Cloudflare API**: selects compactos de hora/minuto BRT com botão "Salvar" que atualiza o cron trigger do worker `cron-taxa-ipca` via Cloudflare Workers Schedules API (`PUT /accounts/{id}/workers/scripts/{name}/schedules`). Carrega schedule atual do worker ao abrir a aba Configurações.
- **[NEW] `functions/api/oraculo/cron.ts`**: endpoint GET (lê schedule atual) e PUT (atualiza schedule) usando `CF_API_TOKEN` + `CF_ACCOUNT_ID`. Logging estruturado para observabilidade.

### Removido
- **OraculoModule — Cron read-only**: removida exibição estática de expressão cron e texto "requer deploy para alteração" (substituída por controle interativo real).

## [v01.55.00] — 2026-03-26
### Alterado
- **OraculoModule — Visualização de dados do usuário reescrita**: detalhe de usuário expandido agora mostra parâmetros de simulação (CDI, IPCA, Duration, taxa, aporte, prazo) em card glassmorphic com badges. Lotes Tesouro IPCA+ com `border-left` colorida (verde MANTER / vermelho VENDER), sinal badge, texto de análise por lote, e totais agregados (investido + taxa média). Registros LCI/LCA com badge IR, taxa CDI, e CDB equivalente.

## [v01.54.00] — 2026-03-26
### Adicionado
- **OraculoModule Redesign v3**: reescrita completa alinhada ao design do MainsiteModule (`detail-panel`, `result-card`, `result-toolbar`, `ghost-button`, `post-row`, `admin-modal`).
- **Cron UX amigável**: selects de hora/minuto BRT com conversão automática UTC-3 e exibição da expressão cron gerada. Substituiu input de texto cru.
- **Dropdown Gemini dinâmico**: endpoint `/api/oraculo/gemini-models` consulta APIs v1+v1beta, filtra Flash/Pro, popula selects com fallback para input manual.
- **Endpoint D1 `taxa-cache.ts`**: lê/atualiza cache de taxas IPCA+ via binding interno BIGDATA_DB. Suporta `?force=true`.
- **Endpoint `gemini-models.ts`**: lista modelos Gemini disponíveis (Flash+Pro, estáveis+preview).
### Removido
- **Card "Informações do Sistema"**: removido por não agregar valor ao usuário final.

## [v01.53.00] — 2026-03-26
### Adicionado
- **OraculoModule Redesign**: módulo completamente redesenhado com 3 abas (LCI/LCA, Tesouro IPCA+, Configurações).
- **Aba Configurações**: status do cache D1 em tempo real (taxa indicativa, data de referência, fonte), tabela expandível de vencimentos NTN-B, URL do CSV editável, schedule do cron, modelos de IA (Vision/Análise), e informações do sistema (worker, database, regime fiscal).
- **Trigger Manual CSV**: botão "Disparar Agora" com spinner de loading, tempo de execução e resultado (sucesso/erro) com cores visuais.

## [v01.52.01] — 2026-03-26
### Corrigido
- **Oráculo D1 500 Error**: corrigido nome da tabela em `listar.ts` e `excluir.ts` de `oraculo_lci_cdb` para o nome correto e prefixado `oraculo_lci_cdb_registros`.

## [v01.52.00] — 2026-03-26
### Adicionado
- **Módulo Oráculo Financeiro**: criação de um módulo nativo no painel administrativo (`OraculoModule.tsx`) para gestão dos registros (Visualização LCI/Tesouro e Deleção Permanente), com integração de iconografia (`BrainCircuit`) no App Shell.
- **Endpoints D1**: criadas as rotas `functions/api/oraculo/listar.ts` e `functions/api/oraculo/excluir.ts`.
- **Menu Reordenado**: `navItems` ajustado para obedecer rigorosamente a ordem alfabética das rotas entre *Visão Geral* (1º) e *Configurações* (último).

## [v01.51.00] — 2026-03-26
### Removido
- **Mecanismo de Dry Sync:** Remoção completa da flag de simulação ("Simular antes") da interface de sincronização (`SyncStatusCard.tsx`) e da área de configurações preferenciais (`ConfigModule.tsx`).
- **Backend Sync:** Remoção da flag `?dryRun=1` dos endpoints `/api/mainsite/sync`, `/api/mtasts/sync`, `/api/astrologo/sync`, `/api/calculadora/sync` e `/api/mainsite/migrate-media-urls`. Os bancos de dados Cloudflare D1 e KV agora são sempre operados ativamente (aplicativo considerado estável).

## [v01.50.00] — 2026-03-26
### Adicionado
- **Configurações Globais — Paridade com mainsite-admin**: seção "Configurações Globais (Ambos os Temas)" do módulo Configurações ampliada de 3 para 11 controles, replicando fielmente o painel do `mainsite-admin/SettingsPanel.jsx`:
  - **Peso do Corpo de Texto** (select: Light 300 → Bold 700).
  - **Peso dos Títulos** (select: Medium 500 → Black 900).
  - **Altura de Linha** (range slider: 1.4–2.4, com labels Compacto/Confortável/Espaçoso).
  - **Alinhamento do Texto** (select: Justificado/Esquerda).
  - **Recuo da Primeira Linha** (select: 0–3.5rem em 4 opções).
  - **Espaçamento entre Parágrafos** (select: 1.2rem–3rem em 4 opções).
  - **Largura Máxima de Leitura** (select: 680px–100% em 5 opções).
  - **Cor dos Links** (color picker).
- **Família da Fonte — opções expandidas**: select atualizado de 4 para 7 opções (Inter Recomendada, System UI Nativa, Sans-Serif Genérica, Georgia Serifada, Times New Roman, Courier New, Monospace).
- **CSS — range slider helpers**: classes `.range-value`, `.range-labels` e estilo de `input[type="range"]` dentro de `.settings-fieldset` para o controle de Altura de Linha.

### Alterado
- **Tipo `AppearanceSettings.shared`**: expandido com 8 campos opcionais (`bodyWeight`, `titleWeight`, `lineHeight`, `textAlign`, `textIndent`, `paragraphSpacing`, `contentMaxWidth`, `linkColor`).
- **`DEFAULT_APPEARANCE.shared`**: defaults atualizados para parear com mainsite-admin (fontFamily agora `'Inter'`, bodyWeight `'500'`, titleWeight `'700'`, etc.).

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
- **MainsiteModule — Padronização Visual de Pop-ups**: Os comandos e mensagens de input adotam o padrão visual `calculadora`, garantindo uniformidade visual.

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
