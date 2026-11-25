# Сборка модели Ollama с адаптером: FROM deepseek-r1:7b + ADAPTER.
# Исходная deepseek-r1:7b остаётся на месте — создаётся отдельная модель.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$adapterGguf = Join-Path $root ".tmp\lora\adapter.gguf"
$modelfile = Join-Path $root ".tmp\lora\Modelfile.csms-44fz"

@"
FROM deepseek-r1:7b
ADAPTER $adapterGguf
PARAMETER temperature 0.6
PARAMETER top_p 0.95
"@ | Set-Content -Path $modelfile -Encoding utf8

ollama create csms-44fz-lora -f $modelfile
ollama list | Select-String "csms-44fz-lora"
