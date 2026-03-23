# Popular a `bigdata_db` com Wrangler CLI (D1)

Este guia aplica as migrations do `admin-app` no banco unificado `bigdata_db`.

> Diretiva operacional: comandos D1 deste fluxo devem rodar **sempre com `--remote`**.

## Banco alvo

- Nome: `bigdata_db`
- ID: `00000000-0000-0000-0000-000000000000`

## Pré-requisitos

- `node` e `npm` instalados
- acesso Cloudflare configurado para o projeto
- autenticação Wrangler concluída

## 1) Entrar no projeto

```powershell
cd c:\Users\leona\sites\admin-app
```

## 2) Autenticar e validar acesso

```powershell
npx wrangler@latest login
npx wrangler@latest d1 list
```

## 3) Aplicação manual (passo-a-passo)

Aplicar em ordem:

```powershell
npx wrangler@latest d1 execute bigdata_db --config wrangler.json --file db/migrations/001_bigdata_astrologo_prefixacao.sql --remote
npx wrangler@latest d1 execute bigdata_db --config wrangler.json --file db/migrations/002_bigdata_calc_prefixacao.sql --remote
npx wrangler@latest d1 execute bigdata_db --config wrangler.json --file db/migrations/003_bigdata_mainsite_prefixacao.sql --remote
npx wrangler@latest d1 execute bigdata_db --config wrangler.json --file db/migrations/004_bigdata_mtasts_prefixacao.sql --remote
npx wrangler@latest d1 execute bigdata_db --config wrangler.json --file db/migrations/005_bigdata_adminapp_operational.sql --remote
```

## 4) Verificação pós-carga

```powershell
npx wrangler@latest d1 execute bigdata_db --config wrangler.json --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" --remote
```

Checagens rápidas por domínio:

```powershell
npx wrangler@latest d1 execute bigdata_db --config wrangler.json --command "SELECT COUNT(*) AS total FROM astrologo_mapas;" --remote
npx wrangler@latest d1 execute bigdata_db --config wrangler.json --command "SELECT COUNT(*) AS total FROM calc_ptax_cache;" --remote
npx wrangler@latest d1 execute bigdata_db --config wrangler.json --command "SELECT COUNT(*) AS total FROM mainsite_posts;" --remote
npx wrangler@latest d1 execute bigdata_db --config wrangler.json --command "SELECT COUNT(*) AS total FROM mtasts_history;" --remote
```

## 5) Alternativa automática (script pronto)

O projeto já possui automação:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\popular-bigdata-db.ps1
```

Opções úteis:

```powershell
# usar ID do banco em vez do nome
powershell -ExecutionPolicy Bypass -File .\scripts\popular-bigdata-db.ps1 -UseDatabaseId
```
