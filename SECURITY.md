# Security Policy

## Supported status

Latest supported source target: APP v02.15.27 on the current `main` branch. The
last historical tagged release is v02.15.22; this web application no longer
creates package, tag, or GitHub Release artifacts for source-only revisions.
The current dependency security baseline was
established in v02.15.15, which resolved the Hono, `brace-expansion`, Undici and
PostCSS findings in the root and TLS reporting toolchains while preserving
scoped overrides for incompatible dependency families. Hono 4.12.34 resolves
GHSA-8j4g-w8fx-2239.

## Reporting a vulnerability

Please do not open a public issue for suspected vulnerabilities, credential leaks, private data exposure, authentication bypasses, payment-flow issues, supply-chain issues, or deployment misconfiguration.

Report privately by email:

- security@lcv.dev

If GitHub private vulnerability reporting is enabled for this repository, that channel is also acceptable.

Please include:

- affected repository, component, route, package, workflow, or public surface;
- affected version, release tag, commit SHA, or deployment URL when known;
- impact and exploitability;
- reproduction steps or a safe proof of concept, if available;
- whether any credential, personal data, payment data, private editorial material, or operational secret may be involved.

## Scope

In scope: application code, Workers/Pages functions, package publication, GitHub Actions, dependency and supply-chain configuration, repository publication boundaries, security documentation, and public service configuration documented in this repository.

Out of scope: social engineering, physical attacks, denial-of-service testing without prior written authorization, spam, automated noisy scanning, and reports that rely only on outdated browser or dependency versions without a concrete vulnerable path in this repository.

## Automation and credentials

- Pull requests against `main` run the `CI` workflow (lint, Biome, root and Admin Motor tests,
  Admin Motor type check, the root build with `tsc -b && vite build`, lint plus tests for
  `tlsrpt-motor`, and a strict Wrangler dry run of both Workers), Dependency Review, zizmor and
  the Pages build; pushes to `main` additionally run `npm audit`, the same dry run before the D1
  migration and the Wrangler deployments inside the `Deploy` workflow. The repository ruleset
  `main: required checks` requires `CI`, `Build Pages artifact`, `Dependency Review` and
  `Run zizmor` before any merge into `main`.
- This repository handles its own Dependabot pull requests with the repository-local workflow
  `.github/workflows/dependabot-auto-merge.yml`. It runs only on `pull_request` events of
  Dependabot-authored pull requests from this repository against `main` (an event initiated by a
  person runs and fails visibly without the token), grants no `GITHUB_TOKEN` permission, runs no
  Action, checkout, cache, artifact, or pull-request-controlled command, and enables GitHub's
  native auto-merge (squash) bound to the exact event head. GitHub performs the merge only after
  every rule of the effective rulesets and every required check is satisfied. The token is one
  organization-level Dependabot secret, `DEPENDABOT_AUTOMERGE_TOKEN`, shared by every repository
  of the organization, a residual the operator accepted on 02/09/2026.
- Credentials live only in environments, by name: `cloudflare-production` holds
  `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` for the `Deploy` workflow; `linear-release`
  holds `LINEAR_ACCESS_KEY` for the `Linear Release` workflow; `github-pages` holds nothing. The
  repository has no Actions secrets or variables of its own, and no secret value belongs in Git.

## Coordinated disclosure

LCV Ideas & Software will triage reports privately, request clarification when needed, and coordinate remediation before public disclosure. Public disclosure should wait until a fix or mitigation is available, unless there is an immediate user-safety reason to do otherwise.
