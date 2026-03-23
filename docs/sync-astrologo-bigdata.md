# Sync manual Astrólogo → `bigdata_db`

Primeira rotina de sync real para copiar dados legados do Astrólogo para `astrologo_mapas` com upsert.

## Endpoint

- `POST /api/astrologo/sync`

Parâmetros via query string:

- `limit` (1..1000, padrão `300`)
- `dryRun` (`true|false`, padrão `false`)

## Exemplo (dry-run)

```powershell
Invoke-RestMethod -Uri "https://admin.lcv.app.br/api/astrologo/sync?limit=200&dryRun=true" -Method Post -ContentType "application/json" -Body "{}"
```

## Exemplo (execução real)

```powershell
Invoke-RestMethod -Uri "https://admin.lcv.app.br/api/astrologo/sync?limit=500&dryRun=false" -Method Post -ContentType "application/json" -Body "{}"
```

## Script pronto

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-astrologo-bigdata.ps1 -Limit 500
```

Dry-run via script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-astrologo-bigdata.ps1 -Limit 200 -DryRun
```

Validação local sem rede (não chama endpoint):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-astrologo-bigdata.ps1 -ValidateOnly
```

Alias equivalente:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-astrologo-bigdata.ps1 -NoNetworkCheck
```

## Resiliência para 522 (Cloudflare)

O script já faz:

- precheck de disponibilidade por host em `GET /api/health` antes de tentar o `POST /api/astrologo/sync`
- retry automático por host (`-MaxAttemptsPerHost`, padrão `3`)
- backoff simples (`-RetryDelaySeconds`, padrão `3`)
- fallback de host (opcional via `-FallbackBaseUrls`; por padrão não adiciona fallback)

Se quiser ignorar o precheck (não recomendado), use:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-astrologo-bigdata.ps1 -SkipHealthCheck
```

Exemplo com ajuste explícito:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-astrologo-bigdata.ps1 -Limit 500 -MaxAttemptsPerHost 5 -RetryDelaySeconds 4 -FallbackBaseUrls @("https://admin-app.pages.dev")
```

Exemplo fixando host específico:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-astrologo-bigdata.ps1 -AdminAppBaseUrl "https://admin-app.pages.dev"
```

Se `https://admin.lcv.app.br/api/health` retornar `522`, o problema é de disponibilidade da origem no Cloudflare (não de sintaxe do script).

Quando todos os hosts falham, o script encerra com `Diagnóstico:` listando status/detalhe por host para facilitar triagem operacional.

## Observabilidade do sync

A execução registra trilha em `adminapp_sync_runs` e eventos em `adminapp_module_events`.
