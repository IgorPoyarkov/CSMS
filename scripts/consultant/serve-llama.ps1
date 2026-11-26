# Поднимает базовую модель Ollama через llama.cpp с подключённым LoRA-адаптером.
# Адрес совпадает с chatBase в scripts/consultant/sources.json.
# llama.cpp применяет адаптер при загрузке, поэтому наружу отдаётся одна модель.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$bin = Join-Path $root ".tmp\llama.cpp\bin\llama-server.exe"
$base = "C:\Users\liven\.ollama\models\blobs\sha256-731ece8d06dc7eda6f6572997feb9ee1258db0784827e642909d9b565641937b"
$adapter = Join-Path $root ".tmp\lora\adapter-v2.gguf"
if (-not (Test-Path $bin)) { throw "Нет llama-server: $bin" }
if (-not (Test-Path $adapter)) { throw "Нет адаптера GGUF: $adapter" }
& $bin `
    --model $base `
    --alias csms-44fz `
    --lora $adapter `
    --host 127.0.0.1 `
    --port 5100 `
    --ctx-size 8192 `
    --n-gpu-layers 99 `
    --parallel 1 `
    --no-webui
