param(
    [string]$TaskName = 'CSMS KTRU RSS daily',
    [string]$User = ''
)

# Регистрирует ежедневную проверку RSS КТРУ в 03:00 по Москве.
# Планировщик Windows хранит время в локальном поясе machines, поэтому
# переводим 03:00 МСК в локальное время явным преобразованием.
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    & dotnet build src/Eis44Parser.Worker/Eis44Parser.Worker.csproj -c Release
    if ($LASTEXITCODE -ne 0) {
        throw "Сборка воркера завершилась с кодом $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

$runScript = Join-Path $PSScriptRoot 'run-ktru-rss.ps1'
$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runScript`"" `
    -WorkingDirectory $root

$msk = [TimeZoneInfo]::FindSystemTimeZoneById('Russian Standard Time')
$mskTime = [DateTime]::SpecifyKind((Get-Date).Date.AddHours(3), [DateTimeKind]::Unspecified)
$utc = [TimeZoneInfo]::ConvertTimeToUtc($mskTime, $msk)
$local = [TimeZoneInfo]::ConvertTimeFromUtc($utc, [TimeZoneInfo]::Local)
$trigger = New-ScheduledTaskTrigger -Daily -At $local

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 3) `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew

$principal = if ($User) {
    New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive -RunLevel Limited
}
else {
    New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Settings $settings -Principal $principal -Force | Out-Null

Write-Host "Задача '$TaskName' зарегистрирована: каждый день в $local (локальное время), что соответствует 03:00 МСК."
Write-Host "Лог: $(Join-Path $root 'logs')"
