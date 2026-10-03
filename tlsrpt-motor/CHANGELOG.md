# Changelog — TLS-RPT Motor (Backend)

## [Unreleased]

- Atualizada a integração de testes para Vitest 5.0.3 e o preview oficial
  `@cloudflare/vitest-plugin` da PR Cloudflare workers-sdk #15500, fixado no
  commit `160d3a445597e650500253831000f3dffc624fa8`. O preview ainda não é uma
  publicação estável do upstream. A árvore de testes deixa de incluir
  `stackback`; os testes existentes e o código do Worker foram preservados.
- O Wrangler direto de deploy mantém o artefato npm estável 4.147.0 por uma
  referência à sua URL oficial imutável, enquanto os previews exigidos pela
  integração permanecem transitivos. Lockfile regenerado com o npm oficial.
- Removidos os overrides obsoletos de `miniflare > undici@7.29.0` e de `sharp`,
  pois os pacotes atuais já exigem as versões corrigidas diretamente.
- Documentados os grants de origem do preview e da dependência opcional
  `@napi-rs/wasm-runtime`, preservando seus limites de abrangência e as
  expressões de licença declaradas.

## [v03.02.00] — 2026-04-25

### Segurança

- `ALLOWED_ORIGIN` deixou de aceitar `*` e passou a permitir explicitamente apenas `https://admin.lcv.app.br`.

### Alterado

- Dependências atualizadas e lockfile regenerado durante a auditoria coordenada de `admin-app` e `mainsite-app`.

### Validação

- `npm test` — 1 arquivo / 5 testes passando.
- `npm audit --audit-level=moderate` — 0 vulnerabilidades.
- `npm outdated --json` — sem pacotes pendentes.
- `npx --no-install wrangler deploy --dry-run` — configuração válida com `ALLOWED_ORIGIN=https://admin.lcv.app.br`.

## [v03.01.00] — 2026-03-24

### Alterado

- Migração de persistência para `example_db` com tabela prefixada `tlsrpt_relatorios_tls`

### Infra

- Versionamento atualizado para `v3.1.0` no código e `package.json` 3.1.0

## [v03.00.00] — 2026-03-22

### Alterado

- Auditoria completa: segurança, CORS, validação de inputs, logging estruturado
- Migração de wrangler.toml para wrangler.json
- Índices de performance no banco D1
- Adaptação da API para roteamento v3

## Anterior

### Histórico

- Backend do motor TLS-RPT com processamento de relatórios RFC 8460
