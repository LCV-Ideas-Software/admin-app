<p align="center">
  <img src=".github/assets/lcv-ideas-software-logo.svg" alt="LCV Ideas &amp; Software" width="520" />
</p>

# admin-app

[![status: stable](https://img.shields.io/badge/status-stable-brightgreen.svg)](#status)
[![runtime: Cloudflare Pages + Workers](https://img.shields.io/badge/runtime-Cloudflare%20Pages%20%2B%20Workers-orange.svg)](https://workers.cloudflare.com/)
[![framework: React 19 + Vite 8](https://img.shields.io/badge/framework-React%2019%20%2B%20Vite%208-61dafb.svg)](https://react.dev/)
[![backend: Hono on Workers](https://img.shields.io/badge/backend-Hono%20on%20Workers-f97316.svg)](https://hono.dev/)
[![license: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](./LICENSE)

**Operator admin dashboard** for a multi-app Cloudflare workspace. Single-tenant by design: it's the operator's control plane for moderation, configuration, AI model selection, financial reports, DNS, Pages/Workers ops, and operational telemetry across a fleet of public apps that share a single Cloudflare D1 database.

**Status.** Stable. Current release: **v02.00.00**. See [CHANGELOG.md](./CHANGELOG.md) for the release history and validation notes.

The version history at a glance:

| Release | Scope |
|---|---|
| **`v02.00.00`** | **Rigorous security + UX audit.** Magic-byte upload validation in `admin-motor` (matches the renamed-binary fix shipped in `mainsite-worker v02.18.00`). Top-level Error Boundary in `main.tsx` so render-phase exceptions no longer crash the admin into a blank page. ESC dismissal on the PostEditor `PromptModal` (WCAG 2.1 AA gap closure for the only non-Radix dialog in the app). Major bump forced by the `vXX.XX.XX` 2-digit ceiling at v01.99 — not a structural change. |
| **`v01.99.07`** | **README organizational standardization.** Adopted the shared repository README opening pattern: harmonized visual identity, added a concise status block, and introduced the top-level version-history table. |
| **`v01.99.06`** | **GitHub organization migration and publication alignment.** Moved the public repository surface to `LCV-Ideas-Software/admin-app`, aligned Sponsor/Page custom-domain references, and hardened Dependabot automerge behavior. |
| **`v01.99.05`** | **MainSite PostEditor sanitizer regression fix.** Restored Tiptap HTML roundtrip fidelity for headings, lists, media, tables, spacing, and text formatting without dropping the XSS hardening baseline. |
| **`v01.99.04`** | **Editorial formatting parity round.** Continued the MainSite formatting/parity work that prepared the app for the later sanitizer and publishing fixes. |

## What it does

Operator-only Cloudflare Access-protected dashboard with these modules:

1. **MainSite** — post editor (Tiptap) with Gemini-assisted import + AI summaries (OG/JSON-LD), comments + ratings moderation, settings, theme/disclaimer panels.
2. **Astrólogo** — astrology consultation viewer + Gemini synthesis, e-mail report dispatch.
3. **Calculadora** — admin parameters and observability for a financial calculator app (PTAX/IPCA cache, rate-limit policies, backtest spot vs. PTAX, audit log).
4. **Oráculo** — financial oracle records (LCI/CDB IPCA+ + Tesouro Direto) with cascade delete + per-user data lookup.
5. **Financeiro** — SumUp transactions, refunds, payouts, fees and AI-driven insights.
6. **CF DNS / CF P&W** — Cloudflare DNS records CRUD + Pages/Workers project lifecycle (create, settings, observability, deployments cleanup) directly via Cloudflare API.
7. **MTA-STS** — MTA-STS policy publishing + sync.
8. **TLS-RPT** — TLS-RPT report viewer ingested by an internal Worker via SMTP.
9. **AI Status** — multi-provider AI catalog (Gemini, Workers AI), GCP Cloud Logging integration, rate-limit configuration.
10. **News** — RSS discovery + feed publication (operator content curation).
11. **Telemetria** — operational events, sync runs, AI usage logs aggregation.
12. **Configurações** — global app config + AI model selectors with D1 persistence.
13. **Conformidade e Licenças** — AGPLv3 license display + third-party inventory.

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
- A SumUp Business account API key (only if running the Financeiro module).
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

Per `admin-motor/wrangler.json`'s `secrets_store_secrets` list, set values for the keys you intend to use (Gemini, Resend, SumUp, GCP, JINA, Cloudflare DNS/Cache/Account-ID tokens, etc.). `GCP_SA_KEY` (Service Account JSON, >1024 chars) cannot live in Secrets Store and must be a native Worker secret:

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