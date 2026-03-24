# Migração AdminHub & AppHub para BigData DB — 2026-03-24

## 📋 Resumo Executivo

Migração completa de **AdminHub** (v01.03.00) e **AppHub** (v03.02.00) para armazenar configurações centralizadamente em **bigdata_db**, eliminando duplicação entre apps estáticos e admin-app.

**Status:** ✅ CONCLUÍDO (código, migrações, versionamento)  
**Próximo:** Execução de migration em produção (D1 Cloudflare)

---

## 🎯 Objetivo

Antes desta migração:
- ❌ Configurações duplicadas: `adminhub/public/cards.json` e `apphub/public/cards.json`
- ❌ Sem interface centralizada de edição (exceto em admin-app)
- ❌ Sincronização manual entre versões

Depois:
- ✅ Configurações centralizadas em `bigdata_db` (tabelas `apphub_cards` e `adminhub_cards`)
- ✅ Interface de edição em admin-app (HubCardsModule)
- ✅ Fallback para JSON local (resiliência)
- ✅ Zero breaking changes

---

## 📦 Artefatos Criados/Modificados

### 1. admin-app (Backend)

#### Migration: `db/migrations/010_bigdata_hubs_bootstrap_data.sql`
```sql
-- Popula apphub_cards com 4 registros (Mapa Astral, Oráculo, Calculadora, MainSite)
-- Popula adminhub_cards com 5 registros (MTA-STS, TLS-RPT, MainSite Admin, etc.)
-- Admin actor: bootstrap@bigdata-hubs
-- Timestamp: 1711270400000 (2026-03-24T00:00:00Z)
```

**Commit:** `6fac60c` - "chore(version): admin-app bootstrap hubs config, populate bigdata_db"

---

### 2. AdminHub (Frontend) → v01.03.00

#### Mudanças em `public/app.js`
```javascript
// ANTES: fetch("./cards.json")
// DEPOIS: fetch("https://admin.lcv.app.br/api/adminhub/config") com fallback

// Novas funções:
- loadCardsFromApi()      // Carrega do endpoint centralizado
- loadCardsFromLocal()    // Fallback para local
- loadCards()             // Orquestra retry automático
```

**Strategy de Fallback:**
```
Try API (https://admin.lcv.app.br/api/adminhub/config)
  └─ On failure → console.warn + Try Local (./cards.json)
      └─ On failure → Throw error (ambas falharam)
```

**Commit:** `4ba5d96` - "chore(version): adminhub v01.03.00, migrate cards to bigdata_db"

**CHANGELOG.md:** Versão v01.03.00 adicionada

---

### 3. AppHub (Frontend) → v03.02.00

#### Mudanças em `public/app.js`
```javascript
// ANTES: fetch("./cards.json")
// DEPOIS: fetch("https://admin.lcv.app.br/api/apphub/config") com fallback

// Novas funções: (idênticas ao adminhub)
- loadCardsFromApi()      // Carrega do endpoint centralizado
- loadCardsFromLocal()    // Fallback para local
- loadCards()             // Orquestra retry automático
```

**Strategy de Fallback:** (Mesma do adminhub)

**Commit:** `918527c` - "chore(version): apphub v03.02.00, migrate cards to bigdata_db"

**CHANGELOG.md:** Versão v03.02.00 adicionada

---

### 4. Tabelas de Versionamento (Sincronização)

**Arquivos atualizados:**
- `README.md` (linhas 112–113)
- `.github/copilot-instructions.md` (linhas 132–133)
- `.agents/workflows/version-control.md` (linhas 140–141)

| App | Antes | Depois |
|-----|-------|--------|
| `AdminHub` | v01.01.00 | **v01.03.00** |
| `AppHub` | v03.01.00 | **v03.02.00** |

**Commit:** `c4f3b8e` - "chore(docs): update version control tables"

---

## 🏗️ Arquitetura: Fluxo de Carregamento de Cards

```
┌─────────────────────────────────────────────────────────────────┐
│ User visits apphub.lcv.app.br or adminhub.lcv.app.br           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Browser loads public/app.js                                     │
│   - Calls loadCards()                                           │
│   - Sets Endpoint: https://admin.lcv.app.br/api/{module}/config│
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │   Try API Call  │
                    └────────┬────────┘
                             ↓
        ┌────────────────────┴─────────────────────┐
        │ SUCCESS (HTTP 200)      │    FAILURE     │
        ↓                         ↓
   Parse cards             console.warn()
   from bigdata_db              +
   Log success          Try Local Fallback
   Return data                  │
                                ↓
                        ┌──────────────────┐
                        │ Local cards.json │
                        ├──────────────────┤
                        │ SUCCESS: Return  │
                        │ FAILURE: Error   │
                        └──────────────────┘
```

---

## 🔐 Segurança & Autenticação

### Endpoints Públicos (GET)
```
GET https://admin.lcv.app.br/api/adminhub/config
GET https://admin.lcv.app.br/api/apphub/config
```
- **Acesso:** Público (sem autenticação)
- **Proteção:** Nenhuma (config de leitura bem conhecida)
- **Rate Limit:** Padrão Cloudflare

### Endpoints Protegidos (PUT)
```
PUT https://admin.lcv.app.br/api/adminhub/config
PUT https://admin.lcv.app.br/api/apphub/config
```
- **Acesso:** Requer autenticação
- **Proteção:** Cloudflare Access (e/ou Bearer token em body)
- **Requer:** Admin actor identificado em request headers ou body

---

## 📊 Tabelas em BigData DB

### `apphub_cards`
```sql
CREATE TABLE apphub_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_order INTEGER NOT NULL,              -- Ordem de exibição (0–999)
  name TEXT NOT NULL,                          -- Até 120 caracteres
  description TEXT NOT NULL,                   -- Até 600 caracteres
  url TEXT NOT NULL,                           -- URL HTTP/HTTPS
  icon TEXT,                                   -- Emoji ou Unicode
  badge TEXT,                                  -- Até 80 caracteres
  updated_at INTEGER NOT NULL,                 -- Timestamp UNIX ms
  updated_by TEXT                              -- Admin actor (email-like)
);

CREATE INDEX idx_apphub_cards_display_order ON apphub_cards(display_order ASC);
```

### `adminhub_cards`
```sql
-- Estrutura idêntica a apphub_cards
```

---

## 🚀 Próximos Passos: Deploy & Execução

### 1. **Executar Migration 010 em Produção**

```bash
# Opção A: Via Wrangler CLI local
cd c:\Users\leona\lcv-workspace\admin-app
wrangler d1 execute bigdata_db --file db/migrations/010_bigdata_hubs_bootstrap_data.sql --remote

# Opção B: Via GitHub Actions (CI/CD)
# - Push ao main triggered migration automaticamente
# - Verificar CloudFlare Dashboard → D1 → bigdata_db → Query

# Opção C: Via Cloudflare Dashboard
# - Navegar: D1 → bigdata_db → Console
# - Copiar/colar SQL do arquivo 010
# - Execute
```

### 2. **Validar Dados em D1**

```sql
-- Verificar apphub_cards
SELECT COUNT(*) as total FROM apphub_cards;
-- Esperado: 4 registros

-- Verificar adminhub_cards
SELECT COUNT(*) as total FROM adminhub_cards;
-- Esperado: 5 registros

-- Listar todos
SELECT id, name, url, display_order FROM apphub_cards ORDER BY display_order;
```

### 3. **Deploy dos Apps (em ordem)**

```bash
# 1. Deploy admin-app (funciona com ou sem dados em D1, fallback para defaults)
cd c:\Users\leona\lcv-workspace\admin-app
npm run build && wrangler deploy

# 2. Deploy adminhub (agora consome /api/adminhub/config)
cd c:\Users\leona\lcv-workspace\adminhub
# Ou pushé para main se houver CI/CD

# 3. Deploy apphub (agora consome /api/apphub/config)
cd c:\Users\leona\lcv-workspace\apphub
# Ou pushé para main se houver CI/CD
```

### 4. **Testar Carregamento de Cards**

```bash
# Teste 1: Verificar fallback ao local (se admin-app offline)
# Abrir browser: https://apphub.lcv.app.br (ou adminhub)
# Inspecionar Console (F12 → Console)
# Esperado log: "Cards carregados de admin-app (4 cards)" ou 
#               "Aviso: usando cards.json local (admin-app indisponível)"

# Teste 2: Verificar API diretamente
curl https://admin.lcv.app.br/api/apphub/config
# Esperado: { "ok": true, "fonte": "bigdata_db", "cards": [...] }

# Teste 3: Editar cards em admin-app UI
# Navegar: https://admin.lcv.app.br (com autenticação Cloudflare Access)
# Seção: "AppHub — Catálogo de Apps" ou "AdminHub — Catálogo Administrativo"
# Modificar um card → Salvar → Verificar em apphub.lcv.app.br (refresh)
```

### 5. **Monitoramento Pós-Deploy**

**Métricas para rastrear:**
- Console warnings (fallback logs) — devem estar vazios
- API latency (admin-app) — baseline P50/P95
- TTL de cards em cache do browser (cache: "no-store")

**Alertas recomendados:**
- Se `apphub.lcv.app.br` tiver console warnings frequentes → admin-app down
- Se PUT falhar → autenticação problem ou D1 indisponível

---

## 📝 Git Commits da Migração

| Hash | Repo | Mensagem |
|------|------|----------|
| `6fac60c` | admin-app | Bootstrap hubs config, populate bigdata_db |
| `4ba5d96` | adminhub | v01.03.00, migrate cards to bigdata_db |
| `918527c` | apphub | v03.02.00, migrate cards to bigdata_db |
| `c4f3b8e` | . (root) | Update version control tables (docs) |

---

## ✅ Checklist Final

- [x] Migration 010 criada com dados iniciais
- [x] adminhub atualizado (v01.03.00) com loadCardsFromApi() + fallback
- [x] apphub atualizado (v03.02.00) com loadCardsFromApi() + fallback
- [x] Tabelas de versionamento sincronizadas (3 arquivos)
- [x] CHANGELOGs atualizados
- [x] Todos os commits feitos com mensagens descritivas
- [x] Documentação completa (este arquivo)
- [ ] Migration 010 executada em D1 (próximo)
- [ ] Apps deployados para produção (próximo)
- [ ] Testes manuais validados (próximo)

---

## 🔄 Rollback Plan (Se Necessário)

Se houver problemas após deploy:

1. **Rollback de adminhub/apphub (imediato):**
   - Revert commits `4ba5d96` (adminhub) e `918527c` (apphub)
   - Apps voltarão a usar local `./cards.json` automaticamente

2. **Rollback de admin-app (se D1 corrupto):**
   - DROP tabelas `apphub_cards` e `adminhub_cards`
   - Apps automaticamente tentarão local fallback
   - Recriar migration 010 após investigação

3. **Verificação pós-rollback:**
   - Todos os apps devem continuar funcionando via local JSON
   - Sem perda de dados (cards.json ainda presente em cada app)

---

## 📚 Referências Relacionadas

- **Admin-app endpoints:** `functions/api/{adminhub,apphub}/config.ts`
- **Hub config library:** `functions/api/_lib/hub-config.ts`
- **React UI:** `src/modules/hubs/HubCardsModule.tsx`
- **Admin-app docs:** `docs/bigdata-db-prefixacao-contexto.md`

---

**Versão:** 1.0  
**Data:** 2026-03-24T14:30:00Z  
**Autor:** GitHub Copilot  
**Status:** Pronto para deploy
