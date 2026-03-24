# Changelog — Admin App

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
