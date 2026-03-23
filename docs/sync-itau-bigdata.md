# Sync manual Calculadora → `bigdata_db`

Rotina de sync para copiar dados legados do módulo Calculadora para tabelas `calculadora_*` no banco unificado.

## Endpoint

- `POST /api/calculadora/sync`

Parâmetros via query string:

- `limit` (1..1000, padrão `300`) aplicado ao histórico de observabilidade
- `dryRun` (`true|false`, padrão `false`)

## Escopo do sync atual

- `calc_oraculo_observabilidade` (histórico de análises do Oráculo)
- `calc_rate_limit_policies` (políticas administrativas de rate limit)

## Exemplo (dry-run)

```powershell
Invoke-RestMethod -Uri "https://admin.lcv.app.br/api/calculadora/sync?limit=200&dryRun=true" -Method Post -ContentType "application/json" -Body "{}"
```

## Exemplo (execução real)

```powershell
Invoke-RestMethod -Uri "https://admin.lcv.app.br/api/calculadora/sync?limit=500&dryRun=false" -Method Post -ContentType "application/json" -Body "{}"
```

## Script pronto

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-calculadora-bigdata.ps1 -Limit 500
```

Dry-run via script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-calculadora-bigdata.ps1 -Limit 200 -DryRun
```

Validação local sem rede (não chama endpoint):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-calculadora-bigdata.ps1 -ValidateOnly
```

Alias equivalente:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-calculadora-bigdata.ps1 -NoNetworkCheck
```

## Resiliência para indisponibilidade de borda

O script faz:

- precheck de disponibilidade por host em `GET /api/health` antes de tentar o `POST /api/calculadora/sync`
- retry automático por host (`-MaxAttemptsPerHost`, padrão `3`)
- backoff simples (`-RetryDelaySeconds`, padrão `3`)
- fallback opcional de host via `-FallbackBaseUrls`

Se quiser ignorar o precheck (não recomendado), use:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-calculadora-bigdata.ps1 -SkipHealthCheck
```

Exemplo com fallback explícito:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-calculadora-bigdata.ps1 -Limit 500 -FallbackBaseUrls @("https://admin-app.pages.dev")
```

Quando todos os hosts falham, o script encerra com `Diagnóstico:` listando status/detalhe por host para facilitar triagem operacional.

## Observabilidade do sync

A execução registra trilha em `adminapp_sync_runs` e eventos em `adminapp_module_events`.
