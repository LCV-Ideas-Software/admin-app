<p align="center">
  <img src=".github/assets/lcv-ideas-software-logo.svg" alt="LCV Ideas &amp; Software" width="520" />
</p>

# admin-app

[![status: stable](https://img.shields.io/badge/status-stable-brightgreen.svg)](#status)
[![runtime: Cloudflare Pages + Workers](https://img.shields.io/badge/runtime-Cloudflare%20Pages%20%2B%20Workers-orange.svg)](https://workers.cloudflare.com/)
[![framework: React 19 + Vite 8](https://img.shields.io/badge/framework-React%2019%20%2B%20Vite%208-61dafb.svg)](https://react.dev/)
[![backend: Hono on Workers](https://img.shields.io/badge/backend-Hono%20on%20Workers-f97316.svg)](https://hono.dev/)
[![license: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](./LICENSE)

**Operator admin dashboard** for a multi-app Cloudflare workspace. Single-tenant by design: it's the operator's control plane for moderation, configuration, AI model selection, DNS, Pages/Workers ops, and operational telemetry across a fleet of public apps that share a single Cloudflare D1 database.

**Status.** Stable. Current release: **v02.02.02**. See [CHANGELOG.md](./CHANGELOG.md) for the release history and validation notes.

The version history at a glance:

| Release | Scope |
|---|---|
| **`v02.02.02`** | **Maestro AI cost-field sizing.** Reduced the Maestro AI web cost and token-rate inputs so the `Custos` card no longer clips numeric fields in the admin layout while preserving the existing configuration model. |
| **`v02.02.01`** | **Maestro AI web polish.** Refined the web module into one continuous screen with two complete sections, `Sessão` and `Configurações`. Settings now persist the editorial protocol, provider token rates, required max cost, optional time limit, max cycles, provider models, and provider API key updates; raw provider keys are written through to Cloudflare Secret Store and are never returned to the browser. Session autos are append-only artifacts in D1 with text, diff context, revision report, link audit and metadata per turn; when unanimity produces a final text, `Criar Post` opens the existing MainSite `PostEditor` already populated with the Maestro output. |
| **`v02.02.00`** | **Maestro AI web/API module.** Added a new `Maestro AI` module inside the admin dashboard, reusing the existing MainSite `PostEditor` and running the editorial circular review flow through provider APIs only. Provider API keys are read exclusively from Cloudflare Secret Store bindings (`MAESTRO_*`), and financial ceilings/rate cards must be configured before paid calls run. |
| **`v02.01.02`** | **Site sponsor card iteration.** `site/index.html` GitHub Sponsors iframe (caixa branca cross-origin) substituído por link card dark navy com ❤ pink + meta cyan + seta animada; card movido para DEPOIS dos botões (lcv.dev/sponsor primário, GitHub Sponsors alternativa). Companion ship Phase 3 (12 repos). |
| **`v02.01.01`** | **Site visual identity refresh.** `site/index.html` (GitHub Pages) reskinneada para a nova identidade dark-first navy/cyan da org LCV (`#050b18`/`#38bdf8`/`#34d399`, gradientes radiais, glow shadows, gradient text no h1). Coordinated Phase 2 companion ship (calculadora, oraculo, astrologo, admin, mainsite, maestro, mtasts). Sem mudança no app runtime. |
| **`v02.01.00`** | **Financeiro removed + dependency/workflow hygiene.** Removed the Financeiro module, admin-motor finance/SumUp/fees routes, SumUp/MP/PIX runtime bindings, MainSite fee/donation-trigger controls, and the SumUp SDK; updated direct dependencies and confirmed Dependabot/GitHub Actions coverage. |
| **`v02.00.00`** | **Rigorous security + UX audit.** Magic-byte upload validation in `admin-motor` (matches the renamed-binary fix shipped in `mainsite-worker v02.18.00`). Top-level Error Boundary in `main.tsx` so render-phase exceptions no longer crash the admin into a blank page. ESC dismissal on the PostEditor `PromptModal` (WCAG 2.1 AA gap closure for the only non-Radix dialog in the app). Major bump forced by the `vXX.XX.XX` 2-digit ceiling at v01.99 — not a structural change. |
| **`v01.99.07`** | **README organizational standardization.** Adopted the shared repository README opening pattern: harmonized visual identity, added a concise status block, and introduced the top-level version-history table. |
| **`v01.99.06`** | **GitHub organization migration and publication alignment.** Moved the public repository surface to `LCV-Ideas-Software/admin-app`, aligned Sponsor/Page custom-domain references, and hardened Dependabot automerge behavior. |
| **`v01.99.05`** | **MainSite PostEditor sanitizer regression fix.** Restored Tiptap HTML roundtrip fidelity for headings, lists, media, tables, spacing, and text formatting without dropping the XSS hardening baseline. |
| **`v01.99.04`** | **Editorial formatting parity round.** Continued the MainSite formatting/parity work that prepared the app for the later sanitizer and publishing fixes. |

## What it does

Operator-only Cloudflare Access-protected dashboard with these modules:

1. **Maestro AI** — web editorial orchestration module with one continuous screen made of two complete sections (`Sessão` and `Configurações`), reusing the MainSite PostEditor and storing provider credentials only through Cloudflare Secret Store.
2. **MainSite** — post editor (Tiptap) with Gemini-assisted import + AI summaries (OG/JSON-LD), comments + ratings moderation, settings, theme/disclaimer panels.
3. **Astrólogo** — astrology consultation viewer + Gemini synthesis, e-mail report dispatch.
4. **Calculadora** — admin parameters and observability for a financial calculator app (PTAX/IPCA cache, rate-limit policies, backtest spot vs. PTAX, audit log).
5. **Oráculo** — financial oracle records (LCI/CDB IPCA+ + Tesouro Direto) with cascade delete + per-user data lookup.
6. **CF DNS / CF P&W** — Cloudflare DNS records CRUD + Pages/Workers project lifecycle (create, settings, observability, deployments cleanup) directly via Cloudflare API.
7. **MTA-STS** — MTA-STS policy publishing + sync.
8. **TLS-RPT** — TLS-RPT report viewer ingested by an internal Worker via SMTP.
9. **AI Status** — multi-provider AI catalog (Gemini, Workers AI), GCP Cloud Logging integration, rate-limit configuration.
10. **News** — RSS discovery + feed publication (operator content curation).
11. **Telemetria** — operational events, sync runs, AI usage logs aggregation.
12. **Configurações** — global app config + AI model selectors with D1 persistence.
13. **Conformidade e Licenças** — AGPLv3 license display + third-party inventory.

### Maestro AI settings and credentials

The web Maestro AI module runs through provider APIs. Its UI is intentionally smaller than the Windows desktop app, but the remaining sections are complete:

- `Sessão` starts and tracks the circular editorial workflow, including the initial drafter, selected panel, current agent holding the work, live session autos, and final `Criar Post` handoff into the MainSite PostEditor.
- `Configurações` stores provider API keys, tests provider responsiveness, stores token rates, required max cost, optional time limit, max cycles, provider models, and the full editorial protocol.
- There is no separate agents screen, setup screen, evidence screen, or Cloudflare settings screen.

Provider API keys can be entered in `Configurações`, but raw values are used only once by the backend to write to Cloudflare Secret Store. Saved key values are never returned to the browser. Provider credentials are exposed to the Worker through these `admin-motor/wrangler.json` Secret Store bindings:

| Binding | Secret Store name |
|---|---|
| `MAESTRO_OPENAI_API_KEY` | `MAESTRO_OPENAI_API_KEY` |
| `MAESTRO_ANTHROPIC_API_KEY` | `MAESTRO_ANTHROPIC_API_KEY` |
| `MAESTRO_GEMINI_API_KEY` | `MAESTRO_GEMINI_API_KEY` |
| `MAESTRO_DEEPSEEK_API_KEY` | `MAESTRO_DEEPSEEK_API_KEY` |
| `MAESTRO_GROK_API_KEY` | `MAESTRO_GROK_API_KEY` |
| `MAESTRO_PERPLEXITY_API_KEY` | `MAESTRO_PERPLEXITY_API_KEY` |

The Worker also uses infrastructure-only bindings/vars to write provider keys into the same Secret Store:

| Runtime item | Purpose |
|---|---|
| `CLOUDFLARE_PW` | Cloudflare API token used by `admin-motor` to upsert Secret Store values. |
| `CF_ACCOUNT_ID` | Cloudflare account id. |
| `MAESTRO_SECRET_STORE_ID` | Secret Store id used by Maestro AI. |

These Cloudflare values are not user-facing Maestro AI settings. They are deployment infrastructure for the Worker.

Execution controls are explicit: every Maestro AI session requires a positive max cost and positive per-provider input/output rates before any paid provider call is made; an optional time limit can also be configured. The editable default rate card is seeded from the current provider list prices for Claude Opus 4.7, GPT-5.5, Gemini 2.5 Pro, DeepSeek V4 Pro, Grok 4.20 Multi-Agent and Perplexity Sonar Reasoning Pro; Perplexity also carries its search request fee. The editorial protocol is persisted in the shared Cloudflare D1 database `bigdata_db` through the `BIGDATA_DB` binding (`maestro_ai_settings`) and loaded automatically by every session. Link/evidence checks run inside the engine and are reported through session events.

The desktop app writes session folders and Markdown files. The web module stores the same operational idea as D1-backed autos:

- `maestro_ai_sessions` keeps session state, cost, active panel, current/final text and event log.
- `maestro_ai_artifacts` stores one append-only artifact for every draft/revision turn, with the Markdown artifact body, revision report, link audit, model, cost, previous-artifact pointer and byte size.
- The UI exposes these autos inside `Sessão` as a live timeline. Selecting a turn shows the full text, simple diff against the previous artifact, revision report, link audit and metadata.
- The engine also enforces a programmatic revision-contract guard: a `READY` reviewer cannot alter custody text, text-changing revisions require a substantive report, and material shortening is blocked as anti-impoverishment defense.

Worker logs for the web engine use the fixed `MAESTRO_AI_WEB` prefix so Cloudflare Observability searches can isolate Maestro traffic quickly.

## Architecture

```
Cloudflare Access (Zero Trust JWT)
  └─→ admin-app (Cloudflare Pages, React 19 + Vite 8)
        └─→ /api/* (catch-all Pages Function proxy)
              ├─→ admin-motor (Cloudflare Worker, Hono)   ──┐
              │     └─ JWT-validated route surface (~75 routes)  │
              │                                                  ├─→ D1 (bigdata_db)
              ├─→ tlsrpt-motor (Cloudflare Worker)              │
              │     └─ TLS-RPT report ingest (email handler)     │
              │     └─ /report/* (admin-only listing, CORS-restricted) ─┘
              └─→ R2 (mainsite-media bucket, shared with mainsite-app)
```

Three independent compute surfaces, one shared D1 database (`bigdata_db`), one shared R2 bucket. The Pages app is the operator UI; `admin-motor` is the operational backend (auth-gated by Cloudflare Access JWT); `tlsrpt-motor` ingests TLS-RPT reports via SMTP and serves them read-only.

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
npx wrangler d1 create bigdata_db
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
      "database_name": "bigdata_db",
      "database_id": "<your-d1-id-from-step-2>"
    }
  ]
}
```

### 4. Apply schema

```bash
for f in db/migrations/*.sql; do
  npx wrangler d1 execute bigdata_db --remote --file "$f"
done
```

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

- **License**: [AGPL-3.0-or-later](./LICENSE). Network-service trigger applies — running a modified fork as a public service obligates you to publish modifications. See AGPL §13 source-offer below.
- **Security disclosure**: see [SECURITY.md](./SECURITY.md).
- **Contributing**: see [CONTRIBUTING.md](./CONTRIBUTING.md). PRs require GREEN gates locally (`lint`, `test`, `test:admin-motor`, `build`) + SHA-pinned actions.
- **Code of Conduct**: see [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md). Contributor Covenant 2.1.
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md).
- **Sponsorship**: see the repo's `Sponsor` button or [.github/FUNDING.yml](./.github/FUNDING.yml).
- **Code owners**: [.github/CODEOWNERS](./.github/CODEOWNERS).
- **Action pinning**: all GitHub Actions are pinned by full SHA (supply-chain hardening baseline).

## License

Copyright (C) 2026 Leonardo Cardozo Vargas.

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY. See the GNU Affero General Public License for more details. The full license text is at [LICENSE](./LICENSE).

### AGPL §13 source-offer (operators of public deployments)

If you operate a modified copy of this app as a publicly-accessible network service, AGPL-3.0 §13 obligates you to make the corresponding source code available to your remote users. Comply via:

- A "Source" link in the app's footer pointing to your fork's repository URL.
- A `GET /source` route in `admin-motor` returning your fork's URL as `text/plain`.

If you only deploy this app for your own infrastructure (no external users), §13 does not apply.

---

<p align="center"><span style="font-size: 1.5em;"><strong>© LCV Ideas &amp; Software</strong></span><br><sub>LEONARDO CARDOZO VARGAS TECNOLOGIA DA INFORMACAO LTDA<br>Rua Pais Leme, 215 Conj 1713&nbsp;&nbsp;- Pinheiros<br>São Paulo - SP<br>CEP 05.424-150<br>CNPJ: 66.584.678/0001-77<br>IM 05.424-150</sub></p>
