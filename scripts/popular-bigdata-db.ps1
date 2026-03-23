param(
    [string]$DatabaseName = "bigdata_db",
    [string]$DatabaseId = "00000000-0000-0000-0000-000000000000",
    [switch]$UseDatabaseId
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$wranglerConfig = Join-Path $projectRoot "wrangler.json"

if (!(Test-Path $wranglerConfig)) {
    throw "wrangler.json não encontrado em $projectRoot"
}

$targetDatabase = if ($UseDatabaseId) { $DatabaseId } else { $DatabaseName }
$modeArg = "--remote"

$migrationFiles = @(
    "db/migrations/001_bigdata_astrologo_prefixacao.sql",
    "db/migrations/002_bigdata_calc_prefixacao.sql",
    "db/migrations/003_bigdata_mainsite_prefixacao.sql",
    "db/migrations/004_bigdata_mtasts_prefixacao.sql",
    "db/migrations/005_bigdata_adminapp_operational.sql"
)

Write-Host "[info] Projeto: $projectRoot"
Write-Host "[info] Banco alvo: $targetDatabase"
Write-Host "[info] Modo: $modeArg"

Push-Location $projectRoot
try {
    foreach ($file in $migrationFiles) {
        if (!(Test-Path $file)) {
            throw "Migration não encontrada: $file"
        }

        Write-Host "[apply] $file"
        npx wrangler@latest d1 execute $targetDatabase --config "$wranglerConfig" --file "$file" $modeArg
        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao aplicar migration: $file"
        }
    }

    Write-Host "[verify] Listando tabelas principais"
    npx wrangler@latest d1 execute $targetDatabase --config "$wranglerConfig" --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" $modeArg

    Write-Host "[ok] Migrações aplicadas com sucesso."
}
finally {
    Pop-Location
}
