# Auditoria de Integração Interna Cloudflare — admin-app

**Data:** 2026-03-24  
**Escopo:** aplicação `admin-app` (frontend + Pages Functions + bindings)  
**Diretriz aplicada:** evitar integração interna entre apps Cloudflare por URL pública, priorizando APIs locais e bindings internos.

---

## 1) Resultado Executivo

- ✅ **Aplicado e corrigido** para fluxo de hubs (`apphub`/`adminhub`) com foco em bindings internos e bootstrap local em D1.
- ✅ **Removidas variáveis de URL pública de hubs** no `wrangler.json` do `admin-app`.
- ✅ **CSP endurecida no browser** (connect-src mínimo necessário).
- ✅ **Resiliência adicionada** no endpoint de rate-limit do Astrólogo para evitar erro 500 no painel.
- ⚠️ **Exceções restantes identificadas** (módulos `mainsite` e `mtasts`) por dependência funcional de APIs legadas externas. Exceções documentadas abaixo.

---

## 2) Mudanças Aplicadas

### 2.1 Fluxo de hubs sem fallback por URL pública

Arquivo: `functions/api/_lib/hub-config.ts`

- Removidos:
  - `APPHUB_PUBLIC_BASE_URL`
  - `ADMINHUB_PUBLIC_BASE_URL`
  - Funções de fetch de legado por URL pública (`cards.json` remoto)
- Novo comportamento:
  - Lê de `BIGDATA_DB` quando disponível;
  - Se vazio, aplica bootstrap local de defaults no próprio D1;
  - Se D1 indisponível, retorna defaults locais (sem chamada cross-domain).

### 2.2 Endpoints de hubs tipados para runtime interno

Arquivos:
- `functions/api/adminhub/config.ts`
- `functions/api/apphub/config.ts`

- Removidas tipagens de env legadas de URL pública.
- Mantida autenticação de PUT por Bearer token.

### 2.3 Configuração runtime sem URLs públicas de hubs

Arquivo: `wrangler.json`

- Removidas variáveis:
  - `APPHUB_PUBLIC_BASE_URL`
  - `ADMINHUB_PUBLIC_BASE_URL`

### 2.4 CSP no frontend do admin-app

Arquivo: `public/_headers`

- `connect-src` reduzido para:
  - `'self'`
  - `https://cloudflareinsights.com`
- Removidas permissões de conexão browser para domínios públicos de apps internos.
- Hash adicional inline aplicado para reduzir bloqueio de script reportado em produção.

### 2.5 Correção de erro 500 em rate-limit Astrólogo

Arquivo: `functions/api/astrologo/rate-limit.ts`

- Fallback de DB de leitura:
  - `ASTROLOGO_SOURCE_DB ?? BIGDATA_DB`
- GET resiliente:
  - em falha, retorna políticas default e `warnings` com status 200.
- Objetivo: evitar indisponibilidade do painel causada por 500.

---

## 3) Exceções Técnicas (documentadas)

### 3.1 Mainsite (pendente de migração total)

Arquivos:
- `functions/api/_lib/mainsite-admin.ts`
- `functions/api/mainsite/sync.ts`
- `functions/api/mainsite/overview.ts`

Situação atual:
- Ainda consome `mainsite-app.lcv.rio.br` via URL pública para obter dados do worker legado.

Justificativa técnica atual:
- Fluxo histórico já operacional de sincronização/overview dependente de payloads remotos do worker legado.

Plano recomendado:
1. Mover leitura de settings/posts para tabelas `mainsite_*` no `BIGDATA_DB` como fonte primária;
2. Migrar sync para ingestão interna por binding (ou job controlado), eliminando fetch cross-domain;
3. Manter URL pública somente como fallback temporário com prazo de remoção.

### 3.2 MTASTS (pendente de migração total)

Arquivo: `functions/api/_lib/mtasts-admin.ts`

Situação atual:
- Consome `mtasts-admin.lcv.app.br` via URL pública para operações legadas.

Justificativa técnica atual:
- Endpoint legado ainda concentra regras/estado que não foram totalmente internalizados no `admin-app`.

Plano recomendado:
1. Internalizar operações de policy/zone no `admin-app`;
2. Persistir estado operacional diretamente no `BIGDATA_DB`;
3. Remover dependência de URL pública após paridade funcional.

---

## 4) Validação

Validação executada no `admin-app` após as mudanças:

- `npm run lint` ✅
- `npm run build` ✅

Sem erros de lint/build nas mudanças aplicadas.

---

## 5) Conclusão

A diretriz foi **aplicada de forma efetiva** no escopo crítico de hubs e endurecimento de CSP/browser.

Para conformidade total em todo `admin-app`, faltam as migrações de `mainsite` e `mtasts` do modelo legado (cross-domain) para modelo interno (bindings + APIs locais).

**Status final desta auditoria:**
- Parcialmente concluída com ações concretas em produção de código.
- Exceções remanescentes mapeadas e com plano técnico explícito.
