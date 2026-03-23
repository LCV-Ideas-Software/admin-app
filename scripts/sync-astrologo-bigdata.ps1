param(
    [string]$AdminAppBaseUrl = "https://admin-app-bir.pages.dev",
    [string[]]$FallbackBaseUrls = @(),
    [int]$Limit = 300,
    [switch]$DryRun,
    [switch]$ValidateOnly,
    [switch]$NoNetworkCheck,
    [switch]$SkipHealthCheck,
    [int]$MaxAttemptsPerHost = 3,
    [int]$RetryDelaySeconds = 3
)

$ErrorActionPreference = 'Stop'
$dryRunParam = if ($DryRun) { 'true' } else { 'false' }

if ($MaxAttemptsPerHost -lt 1) {
    throw "MaxAttemptsPerHost deve ser >= 1"
}

if ($RetryDelaySeconds -lt 1) {
    throw "RetryDelaySeconds deve ser >= 1"
}

$baseUrls = @($AdminAppBaseUrl) + @($FallbackBaseUrls)
$baseUrls = $baseUrls |
    Where-Object { $_ -and $_.Trim().Length -gt 0 } |
    ForEach-Object { $_.TrimEnd('/') } |
    Select-Object -Unique

if ($baseUrls.Count -eq 0) {
    throw "Nenhuma URL base informada para executar o sync."
}

$skipNetwork = $ValidateOnly -or $NoNetworkCheck
if ($skipNetwork) {
    Write-Host "[ok] Validação local concluída (sem chamadas de rede)."
    Write-Host "[info] Hosts efetivos: $($baseUrls -join ', ')"
    Write-Host "[info] limit=$Limit dryRun=$dryRunParam skipHealthCheck=$SkipHealthCheck maxAttempts=$MaxAttemptsPerHost retryDelaySeconds=$RetryDelaySeconds"
    exit 0
}

function Test-HostHealth {
    param([string]$BaseUrl)

    $healthUri = "$BaseUrl/api/health"
    try {
        $response = Invoke-WebRequest -Uri $healthUri -Method Get -MaximumRedirection 3
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
            return @{ ok = $true; status = $response.StatusCode; message = 'healthy' }
        }

        return @{ ok = $false; status = [int]$response.StatusCode; message = "status HTTP $($response.StatusCode)" }
    }
    catch {
        $statusCode = Get-StatusCodeFromException -Exception $_.Exception
        return @{ ok = $false; status = $statusCode; message = $_.Exception.Message }
    }
}

function Get-StatusCodeFromException {
    param([System.Exception]$Exception)

    $response = $null
    if ($Exception.PSObject.Properties.Name -contains 'Response') {
        $response = $Exception.Response
    }
    elseif ($Exception.InnerException -and $Exception.InnerException.PSObject.Properties.Name -contains 'Response') {
        $response = $Exception.InnerException.Response
    }

    if ($null -ne $response -and $response.PSObject.Properties.Name -contains 'StatusCode') {
        return [int]$response.StatusCode
    }

    $msg = [string]$Exception.Message
    $match = [regex]::Match($msg, 'error\s+code\s*:\s*(\d{3})')
    if ($match.Success) {
        return [int]$match.Groups[1].Value
    }

    return $null
}

function Invoke-SyncRequestWithRetry {
    param(
        [string]$BaseUrl,
        [int]$Limit,
        [string]$DryRunParam,
        [int]$Attempts,
        [int]$DelaySeconds
    )

    $uri = "$BaseUrl/api/astrologo/sync?limit=$Limit&dryRun=$DryRunParam"

    Write-Host "[info] Endpoint: $uri"
    Write-Host "[info] Executando sync manual Astrólogo -> bigdata_db (remote runtime)"

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        try {
            Write-Host "[try] host=$BaseUrl tentativa=$attempt/$Attempts"
            return Invoke-RestMethod -Uri $uri -Method Post -ContentType 'application/json' -Body '{}'
        }
        catch {
            $statusCode = Get-StatusCodeFromException -Exception $_.Exception
            $message = $_.Exception.Message
            $isRetryable = $statusCode -in @(522, 523, 524, 408, 429, 500, 502, 503, 504)

            if ($attempt -lt $Attempts -and $isRetryable) {
                Write-Warning "Falha temporária (status=$statusCode): $message"
                Write-Host "[wait] aguardando ${DelaySeconds}s para nova tentativa..."
                Start-Sleep -Seconds $DelaySeconds
                continue
            }

            throw
        }
    }
}

$lastError = $null
$hostFailures = @()
foreach ($baseUrl in $baseUrls) {
    try {
        if (-not $SkipHealthCheck) {
            $health = Test-HostHealth -BaseUrl $baseUrl
            if (-not $health.ok) {
                $reason = "${baseUrl} => precheck /api/health falhou (status=$($health.status), detalhe=$($health.message))"
                $hostFailures += $reason
                Write-Warning "Host indisponível para sync (${baseUrl}) no precheck /api/health: status=$($health.status) detalhe=$($health.message)"
                continue
            }

            Write-Host "[info] Precheck health OK para $baseUrl (status=$($health.status))"
        }

        $response = Invoke-SyncRequestWithRetry -BaseUrl $baseUrl -Limit $Limit -DryRunParam $dryRunParam -Attempts $MaxAttemptsPerHost -DelaySeconds $RetryDelaySeconds
        Write-Host "[ok] Sync executado com sucesso via $baseUrl"
        $response | ConvertTo-Json -Depth 10
        exit 0
    }
    catch {
        $lastError = $_
        $reason = "${baseUrl} => sync falhou ($($_.Exception.Message))"
        $hostFailures += $reason
        Write-Warning "Falha no host ${baseUrl}: $($_.Exception.Message)"
    }
}

if ($hostFailures.Count -gt 0) {
    throw "Não foi possível executar o sync em nenhum host configurado. Diagnóstico: $($hostFailures -join '; ')"
}

throw "Não foi possível executar o sync em nenhum host configurado. Último erro: $($lastError.Exception.Message)"
