# Changelog — Admin App

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
