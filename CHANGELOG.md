# Changelog — Admin App

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
