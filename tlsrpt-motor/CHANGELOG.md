# Changelog — TLS-RPT Motor (Backend)

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
