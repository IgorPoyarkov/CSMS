# Минимальная выгрузка llama.cpp: только конвертер LoRA и его зависимости.
# Полный репозиторий не нужен — sparse-checkout экономит трафик и место.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$target = Join-Path $root ".tmp\llama.cpp"

if (-not (Test-Path (Join-Path $target ".git"))) {
    git clone --depth 1 --filter=blob:none --sparse https://github.com/ggml-org/llama.cpp.git $target
}
# Без --no-cone Git считает паттерны каталогами и не выгружает отдельный файл.
git -C $target sparse-checkout set --no-cone gguf-py/ conversion/ /convert_lora_to_gguf.py
git -C $target rev-parse --short HEAD
