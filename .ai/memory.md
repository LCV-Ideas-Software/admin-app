# AI Memory Log — Admin-App

## 2026-03-28 — APP v01.65.00 — CF P&W Full-Parity Expansion + DNS Zone Context
### Adicionado
- CF P&W: criação de Worker via template, criação de projeto Pages, update de settings de Pages, operações de versão de Worker (list/promote), rotas por zona (list/add/delete) e ação raw controlada para endpoints Cloudflare não modelados.

### Alterado
- `functions/api/_lib/cfpw-api.ts`: suporte a `multipart/form-data` no publish inicial de Worker e novos métodos avançados de paridade.
- `functions/api/cfpw/ops.ts`: switch de ações ampliado para cobrir fases 1-3 da paridade operacional.
- `src/modules/cfpw/CfPwModule.tsx`: painel avançado ampliado com novos campos e ações.
- `src/modules/cfdns/CfDnsModule.tsx`: alertas agora incluem contexto explícito de zona/domínio ativo.

### Controle de versão
- `APP_VERSION`: APP v01.64.00 → APP v01.65.00
- `CHANGELOG.md`: entrada v01.65.00 registrada.
