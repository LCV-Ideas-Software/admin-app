<p align="center">
  <img src=".github/assets/lcv-ideas-software-logo.svg" alt="LCV Ideas &amp; Software" width="520" />
</p>

# admin-app

[![status: stable](https://img.shields.io/badge/status-stable-brightgreen.svg)](#status)
[![release](https://img.shields.io/github/v/release/LCV-Ideas-Software/admin-app?sort=semver)](https://github.com/LCV-Ideas-Software/admin-app/releases)
[![Deploy](https://github.com/LCV-Ideas-Software/admin-app/actions/workflows/deploy.yml/badge.svg)](https://github.com/LCV-Ideas-Software/admin-app/actions/workflows/deploy.yml)
[![Pages](https://github.com/LCV-Ideas-Software/admin-app/actions/workflows/pages.yml/badge.svg)](https://github.com/LCV-Ideas-Software/admin-app/actions/workflows/pages.yml)
[![CodeQL](https://github.com/LCV-Ideas-Software/admin-app/actions/workflows/codeql.yml/badge.svg)](https://github.com/LCV-Ideas-Software/admin-app/actions/workflows/codeql.yml)
[![runtime: Cloudflare Pages + Workers](https://img.shields.io/badge/runtime-Cloudflare%20Pages%20%2B%20Workers-orange.svg)](https://workers.cloudflare.com/)
[![framework: React 19 + Vite 8](https://img.shields.io/badge/framework-React%2019%20%2B%20Vite%208-61dafb.svg)](https://react.dev/)
[![backend: Hono on Workers](https://img.shields.io/badge/backend-Hono%20on%20Workers-f97316.svg)](https://hono.dev/)
[![license: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](./LICENSE)

**Operator admin dashboard** for a multi-app Cloudflare workspace. Single-tenant by design: it's the operator's control plane for moderation, configuration, AI model selection, DNS, Pages/Workers ops, and operational telemetry across a fleet of public apps that share a single Cloudflare D1 database.

**Status.** Stable. Current release: **v02.14.05**. See [CHANGELOG.md](./CHANGELOG.md) for the full release history.

The version history at a glance:

| Release         | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`v02.14.05`** | **Astrólogo — relatório estritamente interpretativo.** E-mail e exportação deixam de repetir explicações metodológicas e de mencionar a interface administrativa; estados incompletos permanecem compreensíveis em linguagem humana.                                                                                                                                                                                                                                                                                                                                                                               |
| **`v02.14.04`** | **Supply chain — lock Python reproduzível.** A entrada direta do Socket Security passa a ser rastreada separadamente e gera um lock hashado completo, permitindo atualizações Dependabot coerentes sem omitir dependências transitivas.                                                                                                                                                                                                                                                                                                                                                                             |
| **`v02.14.03`** | **Astrólogo — relatório sem detalhes internos.** Visualização, exportação e e-mail preservam os cálculos e a interpretação, mas ocultam versões, contratos, hashes, motores, perfis, proveniência e mensagens técnicas, inclusive em registros históricos.                                                                                                                                                                                                                                                                                                                                                           |
| **`v02.14.02`** | **Astrólogo — relatórios sem marcadores internos.** Arquivo Akáshico, resumo e e-mails HTML/texto removem sentinelas técnicas de análises históricas, com nova barreira imediatamente antes do Resend.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **`v02.14.01`** | **Astrólogo — análise extensa reentrante.** A migration 018 persiste jobs e etapas ordenadas com SHA-256 da capability, leases expiráveis, progresso, tokens, payloads/resultados JSON, cascade e no máximo uma execução ativa por mapa. O preflight 3.0 verifica o DDL integral e o índice único parcial, `astrologo/analisar-etapa` recebe bucket próprio e o Arquivo Akáshico mostra somente estado operacional seguro, em pt-BR e hora de Brasília.                                                                                                                                                                |
| **`v02.14.00`** | **Astrólogo — propriedade segura de mapas salvos.** A migration 017 adiciona claims SHA-256 para o primeiro salvamento, backfill histórico somente quando o proprietário é inequívoco e bucket `astrologo/auth-read`; o preflight 2.0 do deploy reconcilia e verifica essas garantias de forma idempotente.                                                                                                                                                                                                                                                                                                                                                                           |
| **`v02.13.00`** | **Astrólogo — artefatos avançados no admin.** Análises natais, trânsitos, sinastrias e mapas planetários de localidade persistidos ganham paridade entre tela, relatório e e-mail, com validação fail-closed dos vínculos run/artefato, apresentação pt-BR e hora de Brasília. O mapa usa Natural Earth 1:110m local e carrega o gráfico sob demanda.                                                                                                                                                                                                                                                                                                                                 |
| **`v02.12.00`** | **Astrólogo — paridade Tatwa v2.** O admin identifica ordem fixa, ordem pelo principal e mapas legados, exibe incerteza e proveniência e mantém tela, relatório e e-mail integralmente em pt-BR, sem recalcular dados canônicos.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **`v02.11.00`** | **Astrólogo — dados posicionais e angelologia v2.** O admin passa a ler e validar os dez planetas, graus, Casas Placidus, 12 cúspides, ângulos, constelações IAU, falange e Anjo Regente solar; tela, relatórios e e-mails usam apresentação pt-BR, hora oficial de Brasília, ícones coloridos e HTML escapado.                                                                                                                                                                                                                                                                                                                                                                       |
| **`v02.02.07`** | **Registrar lock/privacy controls + reliability pass.** CF DNS gains in-app transfer-lock and WHOIS-privacy toggles for registered domains through the legacy `PUT /registrar/domains` endpoint, bounded post-registration workflow polling that stops on terminal/`action_required`/`blocked` states with visual highlighting of those states, and reliability fixes: `domain-check` now skips malformed entries instead of failing the whole batch, the registrations list paginates to completion, Cloudflare `429` rate-limits surface as `429` instead of `502`, and missing-workflow detection keys on HTTP `404`.                                                              |
| **`v02.02.06`** | **Registrar workflow status hotfix.** CF DNS now treats Cloudflare Registrar `10000: No workflow found` responses from `registration-status` and `update-status` as the normal "no active workflow" state for already-active domains, returning a clean empty status instead of surfacing `502` errors in runtime.                                                                                                                                                                                                                                                                                                                                                                    |
| **`v02.02.05`** | **CF DNS Registrar operations + AI Status removal.** CF DNS now includes an operational Cloudflare Registrar panel with domain search, authoritative availability checks, billable registration confirmation, registered-domain inventory, workflow status, auto-renew updates through the current Registrar registrations API, and lock/privacy visibility with dashboard handoff where Cloudflare exposes no current write endpoint. The old AI Status module and active Workers AI routes were removed without touching Gemini/GenAI features.                                                                                                                                     |
| **`v02.02.04`** | **Quality gate directive compliance.** Added the repo-level Biome gate alongside eslint, prettier, and cross-review expectations, aligned the Biome schema/rule overrides with the installed CLI, and wired the deploy workflow to run the new gate.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **`v02.02.03`** | **Maestro AI settings/test hardening.** The web API-key test now treats authenticated empty provider text from Gemini/Perplexity as a successful health check instead of a false failure, logs failed agents with sanitized details, validates settings locally before saving to avoid preventable 400 responses, and preserves both `workers` and `ai_gateway` Secret Store scopes when keys are replaced.                                                                                                                                                                                                                                                                           |
| **`v02.02.02`** | **Maestro AI cost-field sizing.** Reduced the Maestro AI web cost and token-rate inputs so the `Custos` card no longer clips numeric fields in the admin layout while preserving the existing configuration model.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **`v02.02.01`** | **Maestro AI web polish.** Refined the web module into one continuous screen with two complete sections, `Sessão` and `Configurações`. Settings now persist the editorial protocol, provider token rates, required max cost, optional time limit, max cycles, provider models, and provider API key updates; raw provider keys are written through to Cloudflare Secret Store and are never returned to the browser. Session autos are append-only artifacts in D1 with text, diff context, revision report, link audit and metadata per turn; when unanimity produces a final text, `Criar Post` opens the existing MainSite `PostEditor` already populated with the Maestro output. |
| **`v02.02.00`** | **Maestro AI web/API module.** Added a new `Maestro AI` module inside the admin dashboard, reusing the existing MainSite `PostEditor` and running the editorial circular review flow through provider APIs only. Provider API keys are read exclusively from Cloudflare Secret Store bindings (`MAESTRO_*`), and financial ceilings/rate cards must be configured before paid calls run.                                                                                                                                                                                                                                                                                              |
| **`v02.01.02`** | **Site sponsor card iteration.** `site/index.html` GitHub Sponsors iframe (caixa branca cross-origin) substituído por link card dark navy com ❤ pink + meta cyan + seta animada; card movido para DEPOIS dos botões (lcv.dev/sponsor primário, GitHub Sponsors alternativa). Companion ship Phase 3 (12 repos).                                                                                                                                                                                                                                                                                                                                                                       |
| **`v02.01.01`** | **Site visual identity refresh.** `site/index.html` (GitHub Pages) reskinneada para a nova identidade dark-first navy/cyan da org LCV (`#050b18`/`#38bdf8`/`#34d399`, gradientes radiais, glow shadows, gradient text no h1). Coordinated Phase 2 companion ship (calculadora, oraculo, astrologo, admin, mainsite, maestro, mtasts). Sem mudança no app runtime.                                                                                                                                                                                                                                                                                                                     |
| **`v02.01.00`** | **Financeiro removed + dependency/workflow hygiene.** Removed the Financeiro module, admin-motor finance/SumUp/fees routes, SumUp/MP/PIX runtime bindings, MainSite fee/donation-trigger controls, and the SumUp SDK; updated direct dependencies and confirmed Dependabot/GitHub Actions coverage.                                                                                                                                                                                                                                                                                                                                                                                   |
| **`v02.00.00`** | **Rigorous security + UX audit.** Magic-byte upload validation in `admin-motor` (matches the renamed-binary fix shipped in `mainsite-worker v02.18.00`). Top-level Error Boundary in `main.tsx` so render-phase exceptions no longer crash the admin into a blank page. ESC dismissal on the PostEditor `PromptModal` (WCAG 2.1 AA gap closure for the only non-Radix dialog in the app). Major bump forced by the `vXX.XX.XX` 2-digit ceiling at v01.99 — not a structural change.                                                                                                                                                                                                   |
| **`v01.99.07`** | **README organizational standardization.** Adopted the shared repository README opening pattern: harmonized visual identity, added a concise status block, and introduced the top-level version-history table.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **`v01.99.06`** | **GitHub organization migration and publication alignment.** Moved the public repository surface to `LCV-Ideas-Software/admin-app`, aligned Sponsor/Page custom-domain references, and hardened Dependabot automerge behavior.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **`v01.99.05`** | **MainSite PostEditor sanitizer regression fix.** Restored Tiptap HTML roundtrip fidelity for headings, lists, media, tables, spacing, and text formatting without dropping the XSS hardening baseline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **`v01.99.04`** | **Editorial formatting parity round.** Continued the MainSite formatting/parity work that prepared the app for the later sanitizer and publishing fixes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## What it does

Operator-only Cloudflare Access-protected dashboard with these modules:

1. **Maestro AI** — web editorial orchestration module with one continuous screen made of two complete sections (`Sessão` and `Configurações`), reusing the MainSite PostEditor and storing provider credentials only through Cloudflare Secret Store.
2. **MainSite** — post editor (Tiptap) with Gemini-assisted import + AI summaries (OG/JSON-LD), comments + ratings moderation, settings, theme/disclaimer panels.
3. **Astrólogo** — consulta astrológica, Tatwas versionados, análise natal, trânsitos, sinastria, mapa planetário de localidade, síntese Gemini e envio de relatório por e-mail; o admin exibe os contratos canônicos persistidos e nunca os recalcula.
4. **Calculadora** — admin parameters and observability for a financial calculator app (PTAX/IPCA cache, rate-limit policies, backtest spot vs. PTAX, audit log).
5. **Oráculo** — financial oracle records (LCI/CDB IPCA+ + Tesouro Direto) with cascade delete + per-user data lookup.
6. **CF DNS / CF P&W** — Cloudflare DNS records CRUD, Cloudflare Registrar search/check/register and registered-domain controls, plus Pages/Workers project lifecycle (create, settings, observability, deployments cleanup) directly via Cloudflare API.
7. **MTA-STS** — MTA-STS policy publishing + sync.
8. **TLS-RPT** — TLS-RPT report viewer ingested by an internal Worker via SMTP.
9. **News** — RSS discovery + feed publication (operator content curation).
10. **Telemetria** — operational events, sync runs, AI usage logs aggregation.
11. **Configurações** — global app config + AI model selectors with D1 persistence.
12. **Conformidade e Licenças** — AGPLv3 license display + third-party inventory.

### Maestro AI settings and credentials

The web Maestro AI module runs through provider APIs. Its UI is intentionally smaller than the Windows desktop app, but the remaining sections are complete:

- `Sessão` starts and tracks the circular editorial workflow, including the initial drafter, selected panel, current agent holding the work, live session autos, and final `Criar Post` handoff into the MainSite PostEditor.
- `Configurações` stores provider API keys, tests provider responsiveness, stores token rates, required max cost, optional time limit, max cycles, provider models, and the full editorial protocol.
- There is no separate agents screen, setup screen, evidence screen, or Cloudflare settings screen.

Provider API keys can be entered in `Configurações`, but raw values are used only once by the backend to write to Cloudflare Secret Store. Saved key values are never returned to the browser. Provider credentials are exposed to the Worker through these `admin-motor/wrangler.json` Secret Store bindings:

| Binding                      | Secret Store name            |
| ---------------------------- | ---------------------------- |
| `MAESTRO_OPENAI_API_KEY`     | `MAESTRO_OPENAI_API_KEY`     |
| `MAESTRO_ANTHROPIC_API_KEY`  | `MAESTRO_ANTHROPIC_API_KEY`  |
| `MAESTRO_GEMINI_API_KEY`     | `MAESTRO_GEMINI_API_KEY`     |
| `MAESTRO_DEEPSEEK_API_KEY`   | `MAESTRO_DEEPSEEK_API_KEY`   |
| `MAESTRO_GROK_API_KEY`       | `MAESTRO_GROK_API_KEY`       |
| `MAESTRO_PERPLEXITY_API_KEY` | `MAESTRO_PERPLEXITY_API_KEY` |

The Worker also uses infrastructure-only bindings/vars to write provider keys into the same Secret Store:

| Runtime item              | Purpose                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| `CLOUDFLARE_PW`           | Cloudflare API token used by `admin-motor` to upsert Secret Store values. |
| `CF_ACCOUNT_ID`           | Cloudflare account id.                                                    |
| `MAESTRO_SECRET_STORE_ID` | Secret Store id used by Maestro AI.                                       |

These Cloudflare values are not user-facing Maestro AI settings. They are deployment infrastructure for the Worker.

Execution controls are explicit: every Maestro AI session requires a positive max cost and positive per-provider input/output rates before any paid provider call is made; an optional time limit can also be configured. The editable default rate card is seeded from the current provider list prices for Claude Opus 4.7, GPT-5.5, Gemini 2.5 Pro, DeepSeek V4 Pro, Grok 4.20 Multi-Agent and Perplexity Sonar Reasoning Pro; Perplexity also carries its search request fee. The editorial protocol is persisted in the shared Cloudflare D1 database `example_db` through the `BIGDATA_DB` binding (`maestro_ai_settings`) and loaded automatically by every session. Link/evidence checks run inside the engine and are reported through session events.

The desktop app writes session folders and Markdown files. The web module stores the same operational idea as D1-backed autos:

- `maestro_ai_sessions` keeps session state, cost, active panel, current/final text and event log.
- `maestro_ai_artifacts` stores one append-only artifact for every draft/revision turn, with the Markdown artifact body, revision report, link audit, model, cost, previous-artifact pointer and byte size.
- The UI exposes these autos inside `Sessão` as a live timeline. Selecting a turn shows the full text, simple diff against the previous artifact, revision report, link audit and metadata.
- The engine also enforces a programmatic revision-contract guard: a `READY` reviewer cannot alter custody text, text-changing revisions require a substantive report, and material shortening is blocked as anti-impoverishment defense.

Worker logs for the web engine use the fixed `MAESTRO_AI_WEB` prefix so Cloudflare Observability searches can isolate Maestro traffic quickly.

## Architecture

```text
Cloudflare Access (Zero Trust JWT)
  └─→ admin-app (Cloudflare Pages, React 19 + Vite 8)
        └─→ /api/* (catch-all Pages Function proxy)
              ├─→ admin-motor (Cloudflare Worker, Hono)   ──┐
              │     └─ JWT-validated route surface (~75 routes)  │
              │                                                  ├─→ D1 (example_db)
              ├─→ tlsrpt-motor (Cloudflare Worker)              │
              │     └─ TLS-RPT report ingest (email handler)     │
              │     └─ /report/* (admin-only listing, CORS-restricted) ─┘
              └─→ R2 (mainsite-media bucket, shared with mainsite-app)
```

Three independent compute surfaces, one shared D1 database (`example_db`), one shared R2 bucket. The Pages app is the operator UI; `admin-motor` is the operational backend (auth-gated by Cloudflare Access JWT); `tlsrpt-motor` ingests TLS-RPT reports via SMTP and serves them read-only.

## Deploy your own fork

You will need:

- A Cloudflare account ([free tier](https://www.cloudflare.com/plans/)) with Pages + Workers + D1 + R2 enabled.
- A Cloudflare Zero Trust account (free for ≤50 users) for Access JWT auth.
- The Cloudflare CLI [`wrangler`](https://developers.cloudflare.com/workers/wrangler/).
- Node.js 24+.
- A Google AI Studio API key for Gemini integration.
- A Resend API key (only if running e-mail dispatch features).

### 1. Clone + install

```bash
git clone https://github.com/LCV-Ideas-Software/admin-app.git
cd admin-app
npm ci
```

### 2. Create your D1 database + R2 bucket

```bash
npx wrangler d1 create example_db
# wrangler outputs:
#   database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
npx wrangler r2 bucket create mainsite-media
```

### 3. Wire `database_id` into all three `wrangler.json`

Replace `00000000-0000-0000-0000-000000000000` in:

- `wrangler.json` (root, Pages app)
- `admin-motor/wrangler.json`
- `tlsrpt-motor/wrangler.json`

```jsonc
{
  "d1_databases": [
    {
      "binding": "BIGDATA_DB",
      "database_name": "example_db",
      "database_id": "<your-d1-id-from-step-2>",
    },
  ],
}
```

### 4. Apply schema

Apply migrations 001 through 014 once, run the versioned Astrólogo preflight,
then apply migrations 015 and 016. Run the preflight again after those explicit
migrations. The first pass adds legacy `astrologo_mapas.email` only when absent;
the final pass materializes and verifies the idempotent contracts from migrations
017 and 018, including durable AI-analysis jobs and steps.

```bash
for f in $(git ls-files 'db/migrations/*.sql' | sort); do
  [[ "$f" == *"/015_"* ]] && break
  npx wrangler d1 execute example_db --remote --file "$f"
done

node scripts/reconcile-astrologo-schema.mjs --remote --database example_db
npx wrangler d1 execute example_db --remote --file db/migrations/015_bigdata_astrologo_schema_regularization.sql
npx wrangler d1 execute example_db --remote --file db/migrations/016_bigdata_astrologo_advanced_charts.sql
node scripts/reconcile-astrologo-schema.mjs --remote --database example_db
```

The canonical Astrólogo schema, rollout order, verification queries, and the
`astrologo-config/modeloSintese` contract are documented in
[`docs/astrologo-bigdata-schema.md`](docs/astrologo-bigdata-schema.md).

### 5. Configure Cloudflare Access

Set up a Cloudflare Access application protecting your eventual admin-app domain. Copy the team domain and audience tag. Configure the JWT enforcement secrets via Secrets Store:

```bash
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN --config admin-motor/wrangler.json
npx wrangler secret put CF_ACCESS_AUD --config admin-motor/wrangler.json
npx wrangler secret put ENFORCE_JWT_VALIDATION --config admin-motor/wrangler.json
```

`ENFORCE_JWT_VALIDATION=block` makes admin-motor fail-closed on bad/missing JWTs. Default mode if unset is `block`.

### 6. Configure additional secrets

Per `admin-motor/wrangler.json`'s `secrets_store_secrets` list, set values for the keys you intend to use (Gemini, Resend, GCP, JINA, Cloudflare DNS/Cache/Account-ID tokens, etc.). `GCP_SA_KEY` (Service Account JSON, >1024 chars) cannot live in Secrets Store and must be a native Worker secret:

```bash
npx wrangler secret put GCP_SA_KEY --config admin-motor/wrangler.json
```

### 7. Build + deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=admin-app
npx wrangler deploy --config admin-motor/wrangler.json
npx wrangler deploy --config tlsrpt-motor/wrangler.json
```

The Pages app, `admin-motor`, and `tlsrpt-motor` are deployed independently but share the same D1 binding.

## CI deploy (this repo)

This repo's [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push to `main`:

1. **detect_tlsrpt** — detects whether `tlsrpt-motor/**` changed.
2. **deploy_tlsrpt** (conditional) — runs `npm audit` + injects `D1_DATABASE_ID` into `tlsrpt-motor/wrangler.json` via `jq` from a GitHub secret + deploys the worker.
3. **deploy_admin** (conditional, after `deploy_tlsrpt`) — runs `lint` + `test` (admin-app UI) + `test:admin-motor` + injects D1 ID into root `wrangler.json` and `admin-motor/wrangler.json` + deploys admin-motor + builds the Pages app + deploys it.

The real D1 ID is kept out of git; it lives only as a GitHub Actions secret.

## Repository conventions

- **License**: [AGPL-3.0-or-later](./LICENSE). Network-service trigger applies: running a modified fork as a public service obligates you to publish modifications.
- **Notices**: see [NOTICE](./NOTICE) and [THIRDPARTY](./THIRDPARTY.md).
- **Security disclosure**: see [SECURITY.md](./SECURITY.md).
- **Code of conduct**: see [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md).
- **Contributing**: see [CONTRIBUTING.md](./CONTRIBUTING.md).
- **Sponsorship**: see the repo's `Sponsor` button or [central sponsor page](https://www.lcv.dev/sponsor).
- **Action pinning**: all GitHub Actions are pinned by full SHA per supply-chain hardening baseline.
- **Code owners**: [.github/CODEOWNERS](.github/CODEOWNERS).

## Links

- Site: [https://admin-app.lcv.dev](https://admin-app.lcv.dev)
- GitHub: [https://github.com/LCV-Ideas-Software/admin-app](https://github.com/LCV-Ideas-Software/admin-app)
- Sponsors: [https://github.com/sponsors/LCV-Ideas-Software](https://github.com/sponsors/LCV-Ideas-Software)

## License

AGPL-3.0-or-later. See [LICENSE](./LICENSE), [NOTICE](./NOTICE), and [THIRDPARTY](./THIRDPARTY.md).

---

<p align="center"><span style="font-size: 1.5em;"><strong>Copyright © 2026 LCV Ideas &amp; Software</strong></span><br><sub>LEONARDO CARDOZO VARGAS TECNOLOGIA DA INFORMACAO LTDA<br>Rua Pais Leme, 215 Conj 1713 - Pinheiros<br>São Paulo - SP - CEP 05424-150<br>CNPJ: 66.584.678/0001-77 - IM: 3039854</sub></p>
