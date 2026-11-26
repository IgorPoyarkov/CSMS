param(
    [switch]$DryRun
)

# Ежедневный запуск проверки RSS-подписок КТРУ.
# Вызывается Планировщиком заданий Windows, но годится и для ручного прогона.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$workerDll = Join-Path $root 'src/Eis44Parser.Worker/bin/Release/net9.0/Eis44Parser.Worker.dll'
if (-not (Test-Path $workerDll)) {
    throw "Не найдена сборка воркера: $workerDll. Сначала выполните dotnet build -c Release."
}

$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd'
$log = Join-Path $logDir "ktru-rss-$stamp.log"

$arguments = @($workerDll, '--import-nsi-ktru-rss')
if ($DryRun) {
    $arguments += '--dry-run'
}

& dotnet @arguments *>&1 | Tee-Object -FilePath $log -Append
exit $LASTEXITCODE
