#requires -Version 7.0
# Генерация строгих C#-моделей из XSD-схем ЕИС 44-ФЗ.
# Запуск из папки schemas: ./generate-models.ps1

$ErrorActionPreference = "Stop"

if (-not (Get-Command xscgen -ErrorAction SilentlyContinue)) {
    dotnet tool install --global dotnet-xscgen
}

$schemaDir = Join-Path $PSScriptRoot "Schemas44"
$outputDir = Join-Path $PSScriptRoot "../src/Eis44Parser.Core/Models/Generated"

if (-not (Test-Path $schemaDir)) {
    throw "Папка со схемами не найдена: $schemaDir"
}

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$xsdFiles = Get-ChildItem -Path $schemaDir -Filter "*.xsd" -File
if ($xsdFiles.Count -eq 0) {
    throw "В $schemaDir нет XSD-файлов"
}

xscgen `
    -o $outputDir `
    -n "http://zakupki.gov.ru" `
    -n "http://zakupki.gov.ru" `
    $xsdFiles.FullName

Write-Host "Модели сгенерированы в $outputDir"
