# Сливает PEFT-адаптер с базовой моделью Ollama в один GGUF через llama.cpp.
# Основа: llama-export-lora — работает с квантованным base GGUF, не требует 16 ГБ ОЗУ.
$ErrorActionPreference = "Stop"
$py = "C:\Users\liven\AppData\Local\Programs\Python\Python311\python.exe"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$llama = Join-Path $root ".tmp\llama.cpp"
$bin = Join-Path $llama "bin"
$baseHf = Join-Path $root ".tmp\lora\base-model"
$baseGguf = "C:\Users\liven\.ollama\models\blobs\sha256-731ece8d06dc7eda6f6572997feb9ee1258db0784827e642909d9b565641937b"
$adapter = Join-Path $root ".tmp\lora\adapter-v2"
$adapterGguf = Join-Path $root ".tmp\lora\adapter-v2.gguf"
$out = Join-Path $root ".tmp\lora\csms-44fz-merged.gguf"

Push-Location $llama
try {
    & $py (Join-Path $llama "convert_lora_to_gguf.py") `
        --base $baseHf --outfile $adapterGguf --outtype f16 $adapter
    if ($LASTEXITCODE -ne 0) { throw "convert_lora_to_gguf завершился с $LASTEXITCODE" }
} finally {
    Pop-Location
}

& (Join-Path $bin "llama-export-lora.exe") -m $baseGguf --lora $adapterGguf -o $out
if ($LASTEXITCODE -ne 0) { throw "llama-export-lora завершился с $LASTEXITCODE" }
Get-Item $out | Select-Object FullName, Length
