# Конвертация PEFT-адаптера в GGUF для Ollama.
# Перед запуском: prepare-llama-cpp.ps1 и обучение train-lora.py.
$ErrorActionPreference = "Stop"
$py = "C:\Users\liven\AppData\Local\Programs\Python\Python311\python.exe"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$llama = Join-Path $root ".tmp\llama.cpp"
$base = Join-Path $root ".tmp\lora\base-model"
$adapter = Join-Path $root ".tmp\lora\adapter"
$out = Join-Path $root ".tmp\lora\adapter.gguf"

Push-Location $llama
try {
    & $py (Join-Path $llama "convert_lora_to_gguf.py") `
        --base $base --outfile $out --outtype f16 $adapter
} finally {
    Pop-Location
}
Get-Item $out | Select-Object FullName, Length
