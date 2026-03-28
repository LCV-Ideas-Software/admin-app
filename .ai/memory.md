# AI Memory Log — Admin-App

## 2026-03-28 — APP v01.65.02 — CF DNS Proxied Sovereignty + CF P&W Guided Ops
### Corrigido
- `src/modules/cfdns/CfDnsModule.tsx`: qualquer registro com `proxied = true` passou a neutralizar alertas e bloqueios semanticos do painel. O proxy nao e mais rebaixado automaticamente por tipo.

### Alterado
- `src/modules/cfpw/CfPwModule.tsx`: painel de operacoes avancadas refeito para exibir apenas campos pertinentes a cada acao, com descricoes orientativas, datalist alimentado pelo inventario e preview de resultado com titulo semantico.
- `src/App.css`: adicionados estilos para guias operacionais e preview estruturado do modulo CF P&W.

### Controle de versão
- `APP_VERSION`: APP v01.65.01 → APP v01.65.02
- `CHANGELOG.md`: entrada v01.65.02 registrada.

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
