# Changelog — TLS-RPT Motor (Backend)

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
- Migração de persistência para `bigdata_db` com tabela prefixada `tlsrpt_relatorios_tls`

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
