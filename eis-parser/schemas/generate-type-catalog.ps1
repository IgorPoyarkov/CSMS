#requires -Version 5.1
# Builds a catalog of every global XSD definition from the official TFF 17.0
# schema set in Schemas44. Run from any location: ./generate-type-catalog.ps1

$ErrorActionPreference = 'Stop'

$root = Join-Path $PSScriptRoot 'Schemas44'
$jsonPath = Join-Path $PSScriptRoot 'TYPE_CATALOG.json'
$mdPath = Join-Path $PSScriptRoot 'TYPE_CATALOG.md'

if (-not (Test-Path -LiteralPath $root)) { throw "Schema directory not found: $root" }

$kinds = 'complexType', 'simpleType', 'element', 'group', 'attributeGroup'
$records = New-Object System.Collections.Generic.List[object]
$perFile = New-Object System.Collections.Generic.List[object]

foreach ($file in (Get-ChildItem -LiteralPath $root -Recurse -File -Filter '*.xsd' | Sort-Object FullName)) {
    $relative = $file.FullName.Substring($root.Length).TrimStart('\', '/')
    $text = [IO.File]::ReadAllText($file.FullName, [Text.Encoding]::UTF8)
    $doc = New-Object Xml.XmlDocument
    $doc.XmlResolver = $null
    $doc.LoadXml($text)

    $ns = New-Object Xml.XmlNamespaceManager($doc.NameTable)
    $ns.AddNamespace('xs', 'http://www.w3.org/2001/XMLSchema')
    $schema = $doc.DocumentElement
    $targetNs = $schema.GetAttribute('targetNamespace')
    $fileCounts = [ordered]@{ File = $relative; Namespace = $targetNs }

    foreach ($kind in $kinds) {
        $nodes = $doc.SelectNodes("/xs:schema/xs:$kind", $ns)
        $fileCounts[$kind] = $nodes.Count

        foreach ($node in $nodes) {
            $name = $node.GetAttribute('name')
            if (-not $name) { continue }

            $docNode = $node.SelectSingleNode('./xs:annotation/xs:documentation', $ns)
            $description = ''
            if ($docNode) {
                $description = [regex]::Replace($docNode.InnerText, '\s+', ' ').Trim()
                if ($description.Length -gt 400) { $description = $description.Substring(0, 400) + '...' }
            }

            $record = [ordered]@{
                kind        = $kind
                name        = $name
                namespace   = $targetNs
                file        = $relative
                description = $description
            }

            if ($kind -eq 'simpleType') {
                $restriction = $node.SelectSingleNode('./xs:restriction | ./xs:extension', $ns)
                $record['base'] = if ($restriction) { $restriction.GetAttribute('base') } else { '' }
                $record['enumValues'] = @($node.SelectNodes('.//xs:enumeration/@value', $ns) | ForEach-Object { $_.Value })
            }
            elseif ($kind -eq 'complexType') {
                $record['childElements'] = @($node.SelectNodes('.//xs:element/@name', $ns) | ForEach-Object { $_.Value } | Select-Object -Unique)
            }
            elseif ($kind -eq 'element') {
                $record['type'] = $node.GetAttribute('type')
                $record['minOccurs'] = $node.GetAttribute('minOccurs')
                $record['maxOccurs'] = $node.GetAttribute('maxOccurs')
            }

            $records.Add([pscustomobject]$record)
        }
    }
    $perFile.Add([pscustomobject]$fileCounts)
}

$json = $records | Sort-Object kind, name, file | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText($jsonPath, $json, (New-Object Text.UTF8Encoding($false)))

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('# Каталог типов Альбома ТФФ 17.0')
$lines.Add('')
$lines.Add('Сгенерирован из `Schemas44/` official XSD 17.0 (iteration 2).')
$lines.Add('Не редактировать вручную: `./generate-type-catalog.ps1`.')
$lines.Add('')
$lines.Add('Всего глобальных определений: **' + $records.Count + '**.')
$lines.Add('')
$lines.Add('| KIND | COUNT |')
$lines.Add('| --- | ---: |')
foreach ($kind in $kinds) {
    $count = @($records | Where-Object { $_.kind -eq $kind }).Count
    $lines.Add('| ' + $kind + ' | ' + $count + ' |')
}
$lines.Add('')
$lines.Add('## По файлам')
$lines.Add('')
$headers = 'FILE | NS | CT | ST | Elem | Groups | AttrGroups'
$lines.Add('| ' + $headers + ' |')
$lines.Add('| --- | --- | ---: | ---: | ---: | ---: | ---: |')
foreach ($item in $perFile) {
    $shortNs = if ($item.Namespace -match '([^/]+)$') { $Matches[1] } else { $item.Namespace }
    $lines.Add('| ' + $item.File + ' | ' + $shortNs + ' | ' + $item.complexType + ' | ' + $item.simpleType + ' | ' + $item.element + ' | ' + $item.group + ' | ' + $item.attributeGroup + ' |')
}
$lines.Add('')

foreach ($kind in $kinds) {
    $lines.Add('## ' + $kind)
    $lines.Add('')
    $lines.Add('| NAME | FILE | DESCRIPTION |')
    $lines.Add('| --- | --- | --- |')
    foreach ($record in ($records | Where-Object { $_.kind -eq $kind } | Sort-Object name, file)) {
        $description = $record.description -replace '\|', '\|'
        $lines.Add('| `' + $record.name + '` | ' + $record.file + ' | ' + $description + ' |')
    }
    $lines.Add('')
}

[IO.File]::WriteAllText($mdPath, ($lines -join "`n"), (New-Object Text.UTF8Encoding($false)))
Write-Output ("Catalog: " + $records.Count + " definitions")
Write-Output $jsonPath
Write-Output $mdPath
