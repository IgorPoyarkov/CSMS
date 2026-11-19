# Запуск локального ГОСТ-TLS туннеля к ЕИС без сохранения PIN в репозитории.
# Рабочий конфиг пишется в %TEMP%, PIN читается из переменной EIS44_CERT_PIN
# или запрашивается у пользователя.
param(
    [string]$StunnelExe = 'C:\Tools\stunnel-cpro\stunnel-msspi.exe',
    [string]$CertThumbprint = '08A26ABA98738FEE6BB29A103D1909A251C5D20F',
    [int]$ListenPort = 8080,
    [string]$Connect = 'int44.zakupki.gov.ru:443',
    [string]$LogPath = (Join-Path $env:TEMP 'eis44-stunnel.log'),
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $StunnelExe)) {
    throw "Не найден stunnel-msspi.exe: $StunnelExe"
}

$pin = $env:EIS44_CERT_PIN
if (-not $pin) {
    $secure = Read-Host -Prompt 'PIN контейнера на Рутокене' -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $pin = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}
if (-not $pin) { throw 'PIN не введён' }

$configPath = Join-Path $env:TEMP 'eis44-stunnel.conf'
$config = @"
debug = 5
output = $LogPath

[eis-44]
client = yes
accept = 127.0.0.1:$ListenPort
connect = $Connect
sni = int44.zakupki.gov.ru
sslVersion = TLSv1.2
cert = $CertThumbprint
pin = $pin
ciphers = ff85
verify = 0
"@
Set-Content -LiteralPath $configPath -Value $config -Encoding ascii

if ($Force) {
    Get-Process -Name stunnel* -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Milliseconds 500
}

$existing = Get-NetTCPConnection -LocalPort $ListenPort -State Listen -ErrorAction SilentlyContinue
if ($existing) {
    throw "Порт $ListenPort уже занят. Остановите старый туннель или используйте -ListenPort."
}

$process = Start-Process -FilePath $StunnelExe -ArgumentList ('"' + $configPath + '"') `
    -WindowStyle Hidden -PassThru

Write-Host "stunnel запущен (PID $($process.Id)), конфиг: $configPath"
Write-Host "Проверка: dotnet run --project src/Eis44Parser.Worker -- --check"
Write-Host "Лог: $LogPath"
