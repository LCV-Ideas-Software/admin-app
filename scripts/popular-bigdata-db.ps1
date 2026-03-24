param(
    [string]$DatabaseName = "bigdata_db",
    [string]$DatabaseId = "6a71b62e-8ab9-45e6-a867-c0d4e6a56269",
    [switch]$UseDatabaseId
)

$ErrorActionPreference = 'Stop'

function Normalize-CloudflareApiToken {
    param(
        [AllowNull()]
        [string]$Token
    )

    if ([string]::IsNullOrWhiteSpace($Token)) {
        return $null
    }

    $normalized = $Token.Trim().Trim('"').Trim("'")
    if ($normalized -match '^(?i)Bearer\s+') {
        $normalized = ($normalized -replace '^(?i)Bearer\s+', '').Trim()
    }

    if ([string]::IsNullOrWhiteSpace($normalized)) {
        return $null
    }

    return $normalized
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$wranglerConfig = Join-Path $projectRoot "wrangler.json"

if (!(Test-Path $wranglerConfig)) {
    throw "wrangler.json não encontrado em $projectRoot"
}

$targetDatabase = if ($UseDatabaseId) { $DatabaseId } else { $DatabaseName }
$modeArg = "--remote"
$yesArg = "--yes"

$rawCloudflareToken = if ($env:CLOUDFLARE_API_TOKEN) { $env:CLOUDFLARE_API_TOKEN } else { $env:CF_API_TOKEN }
$normalizedCloudflareToken = Normalize-CloudflareApiToken -Token $rawCloudflareToken
$authMode = "interactive-login"

# Sempre remove variável legada para evitar que o Wrangler use cabeçalho Authorization inválido/deprecado
if (Test-Path Env:CF_API_TOKEN) {
    Remove-Item Env:CF_API_TOKEN -ErrorAction SilentlyContinue
}

if (-not [string]::IsNullOrWhiteSpace($normalizedCloudflareToken)) {
    # Padroniza para a variável recomendada pelo Wrangler e evita fallback legado/deprecado
    $env:CLOUDFLARE_API_TOKEN = $normalizedCloudflareToken
    $authMode = "api-token"
}

$migrationFiles = @(
    "db/migrations/001_bigdata_astrologo_prefixacao.sql",
    "db/migrations/002_bigdata_itau_prefixacao.sql",
    "db/migrations/003_bigdata_mainsite_prefixacao.sql",
    "db/migrations/004_bigdata_mtasts_prefixacao.sql",
    "db/migrations/005_bigdata_adminapp_operational.sql",
    "db/migrations/006_bigdata_hubs_config.sql"
)

Write-Host "[info] Projeto: $projectRoot"
Write-Host "[info] Banco alvo: $targetDatabase"
Write-Host "[info] Modo: $modeArg"
Write-Host "[info] Confirmação automática Wrangler: $yesArg"
Write-Host "[info] Autenticação Wrangler: $authMode"
if ($authMode -eq "interactive-login") {
    Write-Host "[warn] CLOUDFLARE_API_TOKEN não definido; usando sessão de login do Wrangler (npx wrangler login)."
}

Push-Location $projectRoot
try {
    Write-Host "[verify] Validando autenticação Wrangler"
    npx wrangler@latest whoami --config "$wranglerConfig"
    if ($LASTEXITCODE -ne 0) {
        if ($authMode -eq "interactive-login") {
            Write-Host "[warn] Sessão Wrangler inválida ou ausente. Tentando login interativo..."
            npx wrangler@latest login --config "$wranglerConfig"
            if ($LASTEXITCODE -ne 0) {
                throw "Falha ao executar login interativo do Wrangler. Defina CLOUDFLARE_API_TOKEN (sem prefixo 'Bearer') ou conclua 'npx wrangler@latest login'."
            }

            Write-Host "[verify] Revalidando autenticação Wrangler após login"
            npx wrangler@latest whoami --config "$wranglerConfig"
            if ($LASTEXITCODE -ne 0) {
                throw "Falha de autenticação Wrangler após tentativa de login. Verifique token/permissões de D1 ou refaça o login."
            }
        }
        else {
            throw "Falha de autenticação Wrangler. Use CLOUDFLARE_API_TOKEN (sem prefixo 'Bearer') com permissões de D1 ou execute 'npx wrangler@latest login'."
        }
    }

    foreach ($file in $migrationFiles) {
        if (!(Test-Path $file)) {
            throw "Migration não encontrada: $file"
        }

        Write-Host "[apply] $file"
        npx wrangler@latest d1 execute $targetDatabase --config "$wranglerConfig" --file "$file" $modeArg $yesArg
        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao aplicar migration: $file"
        }
    }

    Write-Host "[verify] Listando tabelas principais"
    npx wrangler@latest d1 execute $targetDatabase --config "$wranglerConfig" --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" $modeArg $yesArg

    Write-Host "[ok] Migrações aplicadas com sucesso."
}
finally {
    Pop-Location
}
