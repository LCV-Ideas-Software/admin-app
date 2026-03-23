# admin-app

Shell administrativo unificado da LCV em `admin.lcv.app.br`, desenvolvido com React + TypeScript + Vite e executado no Cloudflare Pages/Functions.

## Estado atual

- Fase 1 em andamento: shell paralelo sem desligar admins legados.
- Módulos funcionais: Astrólogo (`/api/astrologo/listar`), Calculadora (`/api/calculadora/overview`), MainSite (`/api/mainsite/overview`) e MTA-STS (`/api/mtasts/overview`) com leitura híbrida (prioriza `bigdata_db` via D1 e usa fallback legado).
- Endurecimento operacional ativo: telemetria padronizada por módulo e indicadores de fallback em `/api/overview/operational`.
- Sync manual disponível para Astrólogo em `POST /api/astrologo/sync` (mapas para `astrologo_mapas`).
- Ações administrativas do Astrólogo já disponíveis no shell: `POST /api/astrologo/ler`, `POST /api/astrologo/excluir`, `GET|POST /api/astrologo/rate-limit` e `POST /api/astrologo/enviar-email` (com persistência no `ASTROLOGO_SOURCE_DB`, envio server-side via Resend e espelhamento de policies no `bigdata_db`). As ações aceitam `X-Admin-Actor` para trilha de auditoria por operador em telemetria operacional.
- Sync manual disponível para Calculadora em `POST /api/calculadora/sync` (observabilidade + rate limit policies).
- Ações administrativas do Calculadora já disponíveis no shell: `GET|POST /api/calculadora/parametros` e `GET|POST /api/calculadora/rate-limit` (com persistência no `CALC_SOURCE_DB` e espelhamento de policies no `bigdata_db`).
- Sync manual disponível para MainSite em `POST /api/mainsite/sync` (posts + settings públicos).
- Ações administrativas do MainSite já disponíveis no shell: `GET|POST|PUT|DELETE /api/mainsite/posts`, `POST /api/mainsite/posts-pin` e `GET|PUT /api/mainsite/settings`.
- Sync manual disponível para MTA-STS em `POST /api/mtasts/sync` (history + policies auditáveis por zonas).
- Orquestração operacional do MTA-STS já disponível no shell: `GET /api/mtasts/zones`, `GET /api/mtasts/policy` e `POST /api/mtasts/orchestrate` (policy + DNS + novo ID).
- Diretriz de continuidade: `adminhub` e `apphub` também serão incorporados ao `admin-app` como módulos, com configurações persistidas em D1 (`bigdata_db`) durante a consolidação.
- Convenção global de auditoria: ações administrativas críticas dos módulos (`astrologo`, `calculadora`, `mainsite` e `mtasts`) aceitam `X-Admin-Actor` e registram o operador na telemetria operacional (`adminapp_module_events`).
- Convenção de rastreabilidade de resposta: endpoints administrativos, de leitura híbrida e de visão operacional retornam `request_id` e `timestamp` para correlação de logs/incidentes em suporte operacional.
- Health check ativo em `/api/health`.

## Diretivas de arquitetura

- Segredos reais: **somente server-side** (Cloudflare Secrets).
- Para habilitar CRUD e save de settings públicos do MainSite, configurar o secret `MAINSITE_WORKER_API_SECRET` no runtime do `admin-app`.
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
