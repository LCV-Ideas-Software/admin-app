# admin-app

Shell administrativo unificado da LCV em `admin.lcv.app.br`, desenvolvido com React + TypeScript + Vite e executado no Cloudflare Pages/Functions.

## Estado atual

- Fase 1 em andamento: shell paralelo sem desligar admins legados.
- Módulos funcionais: Astrólogo (`/api/astrologo/listar`), Calculadora (`/api/calculadora/overview`), MainSite (`/api/mainsite/overview`), MTA-STS (`/api/mtasts/overview`), AppHub (`/api/apphub/config`) e AdminHub (`/api/adminhub/config`) com persistência operacional centralizada no `bigdata_db`.
- Endurecimento operacional ativo: telemetria padronizada por módulo e indicadores de fallback em `/api/overview/operational`.
- Sync manual disponível para Astrólogo em `POST /api/astrologo/sync` (mapas para `astrologo_mapas`).
- Ações administrativas do Astrólogo já disponíveis no shell: `POST /api/astrologo/ler`, `POST /api/astrologo/excluir`, `GET|POST /api/astrologo/rate-limit` e `POST /api/astrologo/enviar-email` (com persistência no `ASTROLOGO_SOURCE_DB`, envio server-side via Resend e espelhamento de policies no `bigdata_db`). As ações aceitam `X-Admin-Actor` para trilha de auditoria por operador em telemetria operacional.
- Sync manual disponível para Calculadora em `POST /api/calculadora/sync` (observabilidade + rate limit policies).
- Ações administrativas do Calculadora já disponíveis no shell: `GET|POST /api/calculadora/parametros` e `GET|POST /api/calculadora/rate-limit` (com persistência no `CALC_SOURCE_DB` e espelhamento de policies no `bigdata_db`).
- Sync manual disponível para MainSite em `POST /api/mainsite/sync` (posts + settings públicos).
- Ações administrativas do MainSite já disponíveis no shell: `GET|POST|PUT|DELETE /api/mainsite/posts`, `POST /api/mainsite/posts-pin`, `GET|PUT /api/mainsite/settings` e `GET|POST /api/mainsite/rate-limit` (proxy autenticado para `/api/settings/ratelimit` do worker legado via `MAINSITE_WORKER_API_SECRET`).
- Paridade visual em avanço: módulos do `admin-app` agora usam superfície `module-shell` com acentuação por domínio (`astrologo`, `calculadora`, `mainsite`, `mtasts`, `apphub`, `adminhub`, `config`) para aproximar linguagem visual dos admins legados.
- MainSite com paridade funcional ampliada no rate limit: detecção de alterações não salvas, restauração local de padrões (por rota e em lote) e botão de salvar painel completo.
- Sync manual disponível para MTA-STS em `POST /api/mtasts/sync` (history + policies auditáveis por zonas).
- Orquestração operacional do MTA-STS já disponível no shell: `GET /api/mtasts/zones`, `GET /api/mtasts/policy` e `POST /api/mtasts/orchestrate` com integração direta à API Cloudflare (sem dependência de admin legado protegido por Access).
- Diretriz de continuidade: `adminhub` e `apphub` também serão incorporados ao `admin-app` como módulos, com configurações persistidas em D1 (`bigdata_db`) durante a consolidação.
- Configuração dos hubs já disponível no shell: `GET|PUT /api/apphub/config` e `GET|PUT /api/adminhub/config` (bootstrap via `cards.json` legado e persistência em D1).
- UX dos hubs evoluída: AppHub/AdminHub já suportam CRUD visual de cards (adicionar, editar campos, remover e reordenar) com persistência no `bigdata_db`.
- Edição avançada dos hubs: busca/filtro de cards por texto livre, validação inline por campo (nome/descrição/URL), detecção de duplicidade (`nome` e `URL`) e banner de qualidade para prontidão de publicação.
- Acessibilidade no editor de cards: mensagens de erro inline com associação semântica via `aria-describedby` para leitura assistiva consistente.
- Hardening backend dos hubs: endpoints `PUT /api/apphub/config` e `PUT /api/adminhub/config` validam server-side URL (`http/https`) e bloqueiam duplicidade de `nome`/`url`, impedindo persistência inválida por bypass de frontend.
- Limites operacionais dos hubs: máximo de 100 cards por módulo; validação de tamanho server-side para campos (`name`, `description`, `url`, `icon`, `badge`) com rejeição explícita de payload fora do contrato.
- Convenção global de auditoria: ações administrativas críticas dos módulos (`astrologo`, `calculadora`, `mainsite` e `mtasts`) aceitam `X-Admin-Actor` e registram o operador na telemetria operacional (`adminapp_module_events`).
- Convenção de rastreabilidade de resposta: endpoints administrativos, de leitura híbrida e de visão operacional retornam `request_id` e `timestamp` para correlação de logs/incidentes em suporte operacional.
- Health check ativo em `/api/health`.
- Diretriz operacional aplicada: fallback para URLs administrativas protegidas por Cloudflare Access foi desativado nos fluxos de leitura críticos (`mtasts`, `astrologo`, `calculadora`), priorizando D1/source DB e API Cloudflare.

## Diretivas de arquitetura

- Segredos reais: **somente server-side** (Cloudflare Secrets).
- Diretriz global de integração: como toda a operação roda em Cloudflare, priorizar APIs nativas da plataforma (D1, DNS/Zone API, Workers/Pages bindings) antes de depender de endpoints administrativos legados protegidos por Access.
- Para habilitar CRUD e save de settings públicos do MainSite, configurar o secret `MAINSITE_WORKER_API_SECRET` no runtime do `admin-app`.
- CSP hardening em produção: o build foi ajustado para não injetar polyfill inline de `modulepreload` (Vite), reduzindo violações de `script-src` em ambientes com política estrita.
- Para operações DNS/auditoria do MTA-STS, configurar no runtime um dos tokens: `CLOUDFLARE_API_TOKEN` (preferencial) ou `CLOUDFLARE_DNS`.
- Variáveis client-side públicas: prefixo `VITE_`.
- Migração D1 futura para `bigdata_db`:
  - **Prefixação obrigatória por contexto** em tabelas, índices e políticas.
  - Objetivo: evitar colisão de nomes entre domínios (`astrologo_*`, `calculadora_*`, `mainsite_*`, `mtasts_*`, etc.).
  - Guia operacional: `docs/bigdata-db-prefixacao-contexto.md`.
  - Migration inicial criada: `db/migrations/001_bigdata_astrologo_prefixacao.sql`.
  - Migration adicional criada: `db/migrations/002_bigdata_calc_prefixacao.sql`.
  - Migration adicional criada: `db/migrations/003_bigdata_mainsite_prefixacao.sql`.
  - Migration adicional criada: `db/migrations/004_bigdata_mtasts_prefixacao.sql`.
  - Migration adicional criada: `db/migrations/005_bigdata_adminapp_operational.sql`.
  - Migration adicional criada: `db/migrations/006_bigdata_hubs_config.sql`.
  - Passo-a-passo Wrangler CLI: `docs/wrangler-popular-bigdata-db.md`.
  - Automação opcional: `scripts/popular-bigdata-db.ps1`.
  - Sync manual Astrólogo: `docs/sync-astrologo-bigdata.md` + `scripts/sync-astrologo-bigdata.ps1`.
  - Sync manual Calculadora: `docs/sync-calculadora-bigdata.md` + `scripts/sync-calculadora-bigdata.ps1`.

## Execução local

- `npm install`
- `npm run build`
- `npm run lint`
- `npm run dev`

## Deploy

- Branch padrão: `main`.
- Deploy via GitHub Actions + Wrangler (`wrangler.json`).
- Projeto Cloudflare Pages: `admin-app`.
