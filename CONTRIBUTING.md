# Contributing to admin-app

Thanks for your interest. Quick guide for filing issues and opening pull requests.

---

## Before you start

1. **Read the [README](./README.md)** — covers architecture (Pages app + admin-motor Worker + tlsrpt-motor Worker), local dev, and deploy.
2. **Read [SECURITY.md](./SECURITY.md)** — for security reports, do NOT open a public issue.
3. **Check existing issues** before opening a new one.

---

## Filing issues

- **Bug reports**: include steps to reproduce, the route/handler hit, expected vs actual behavior, and (if applicable) browser console / Worker logs / D1 query traces.
- **Feature requests**: explain the use case. This is the operator's admin dashboard — features serve operator-only workflows.
- **Documentation gaps**: open an issue or a PR directly.

---

## Opening a pull request

### Local gates

From repo root:

```bash
npm ci
npm run lint              # eslint + biome
npm test                  # vitest (admin-app UI)
npm run test:admin-motor  # vitest (admin-motor Worker)
npm run build             # tsc + vite build
```

Optional pre-deploy sanity:

```bash
npx wrangler deploy --config admin-motor/wrangler.json --dry-run
npx wrangler deploy --config tlsrpt-motor/wrangler.json --dry-run
```

All gates must be GREEN. CI re-runs these on push.

### PR description

Include what changed, why, and how you tested. Public surface changes (admin UI, admin-motor route shapes, D1 schema, /api/\* paths) need careful review.

### Action pinning

This repo enforces SHA-pinned GitHub Actions. Don't downgrade to floating tags. Dependabot opens version-bump PRs with new SHAs + tag comments.

### Versioning

`APP_VERSION` lives in `src/App.tsx`. Bump per workspace policy: patch for fixes, minor for features, major for breaking changes. CHANGELOG.md entry required.

### D1 schema changes

Migrations live in `db/migrations/*.sql`. Add a new numbered file; do NOT mutate historical migrations. ALTER TABLE / column adds need to be coordinated with all consumers (admin-motor handlers + any cross-app reader/writer).

---

## License

By contributing, you agree your contribution is licensed under [AGPL-3.0-or-later](./LICENSE). AGPL §13 applies to network-service operators of forks.

---

## Code of Conduct

By participating, you agree to follow [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) (Contributor Covenant 3.0). Violations to `lcv@lcv.dev`.

---

## Maintainer

Single maintainer: [@example-beneficiary](https://github.com/example-beneficiary). Response time best-effort.
