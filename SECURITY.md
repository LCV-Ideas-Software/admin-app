# Security Policy

## Supported status

Latest supported source target: APP v02.15.29 on the current `main` branch. The
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
  the Pages build; pushes to `main` additionally run `npm audit` (a report with a high or critical
  finding stops the deploy; when the advisory request to the npm registry fails, the audit step
  records a warning and the deploy continues on the native coverage: Dependabot alerts and
  security updates, Dependency Review, CodeQL; any other npm error stops the deploy), the same
  dry run before the D1 migration and the Wrangler deployments inside the `Deploy` workflow. The repository ruleset
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

The optional TLS-RPT acknowledgement in `Deploy` is for an explicitly approved
one-off adoption of the reconciled `last_deployed_from: api` edit. Only the first
attempt (`github.run_attempt == 1`) of a manual dispatch with
`acknowledge_tlsrpt_dashboard_change: true` selects `deploy` without `--strict` for
TLS-RPT Motor; pushes and omitted or false inputs keep strict mode. Every re-run
keeps `--strict`, even when it retains the true input. A renewed acknowledgement
requires a new dispatch, renewed operator approval and fresh whole readback; a
previous run does not authorize it.
In CI, ordinary deploy auto-accepts all Wrangler pre-upload confirmations, including
origin overwrite, remote configuration/secrets and workflow conflicts. It is not
bound by code to a particular remote version or compatibility-date-only change.
Immediately before an authorized dispatch, reread the whole live service provenance,
current version and deployment allocation, module bytes, compatibility date and
flags, configuration and bindings against the reviewed snapshot and source. Abort
on any unapproved drift; this input does not authorize overwriting new edits, secrets
or workflow conflicts. Record the exact workflow SHA/input and post-run version,
code/configuration/bindings, date and deployment provenance in the private audit
evidence, then verify a subsequent ordinary push deploy retains `--strict`. A past
readback or a successful local dry run does not satisfy this fresh live check.

## Dependency updates

Dependabot checks all configured ecosystems every day, including weekends, at
05:00 (UTC-03:00), using the native `cron` schedule and `Etc/GMT+3`. GitHub may
start the jobs later when its update queue is busy. Version updates retain the
seven-day cooldown and existing groups; official `actions/*` and `github/*`
updates are excluded from that cooldown.

Security updates run independently of this schedule and cooldown. Each configured
ecosystem and directory has its own security group, separate from version updates.
A failing update can delay its security group; diagnose the failure before
adjusting the native group configuration or recreating a pull request. Any
configured version ignores also constrain security fixes, so review them when
upstream compatibility changes. Native auto-merge remains subject to every required check.

The TLS reporting worker uses Vitest 5.0.3 with Cloudflare's official
`@cloudflare/vitest-plugin` preview from workers-sdk PR #15500, pinned to
commit `160d3a445597e650500253831000f3dffc624fa8`. This preview is not a stable
release. The direct deployment CLI remains Wrangler 4.147.0 from the official
npm registry, separate from preview-only test dependencies through scoped npm
overrides. The preview declares Vitest `^4.1.11 || ^5.0.0` peer support. The
scoped Dependabot ignore excludes only Vitest 6 and later, including security
updates in that unsupported range. Remove the constraint only after upstream
support and the required repository checks pass; investigate any security fix
blocked by the retained constraint.
See the [official integration PR](https://github.com/cloudflare/workers-sdk/pull/15500)
and the exact package manifest, lockfile and [third-party notices](THIRDPARTY.md).

See the [Dependabot options reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)
and [security update documentation](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-security-updates).

## Coordinated disclosure

LCV Ideas & Software will triage reports privately, request clarification when needed, and coordinate remediation before public disclosure. Public disclosure should wait until a fix or mitigation is available, unless there is an immediate user-safety reason to do otherwise.
