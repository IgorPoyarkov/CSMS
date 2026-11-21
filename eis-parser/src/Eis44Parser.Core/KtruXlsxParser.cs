using System.IO.Compression;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Разбор шаблонов описания позиции КТРУ из материалов экспертного совета ЕИС.
/// Это не выгрузка реестра: файлы лежат в открытых архивах заседаний и содержат
/// предложения по актуализации описаний, поэтому результат годится только как
/// источник характеристик, а не как авторитетный справочник КТРУ.
/// Читаем XLSX напрямую через ZIP+XML, без внешних библиотек: зависимости
/// парсера намеренно остаются минимальными.
/// </summary>
public static class KtruXlsxParser
{
    private static readonly Regex KtruCode = new(
        @"\d{2}\.\d{2}\.\d{2}\.\d{3}-[\dA-Za-z-]+",
        RegexOptions.Compiled);

    private static readonly Regex Okpd2Code = new(
        @"\d{2}\.\d{2}\.\d{2}(?:\.\d{2,3})?",
        RegexOptions.Compiled);

    private static readonly Regex Ordinal = new(@"^\d{1,2}$", RegexOptions.Compiled);

    /// <summary>Разобрать один файл описания позиции; null — неизвестный шаблон.</summary>
    public static KtruXlsxPosition? Parse(Stream xlsx, string fileName)
    {
        ArgumentNullException.ThrowIfNull(xlsx);

        var cells = ReadCells(xlsx);
        var catalogHeader = Find(cells, value => value.StartsWith("Идентификатор или № id", StringComparison.OrdinalIgnoreCase));
        var requestHeader = Find(cells, value => value.Contains("Код каталога ХХХ", StringComparison.OrdinalIgnoreCase));

        return catalogHeader is not null
            ? ParseCatalogTemplate(cells, catalogHeader.Value.Row, fileName)
            : requestHeader is not null
                ? ParseRequestTemplate(cells, requestHeader.Value.Row, fileName)
                : null;
    }

    /// <summary>Шаблон каталога: шапка «Идентификатор или № id», характеристики в столбцах D–J.</summary>
    private static KtruXlsxPosition ParseCatalogTemplate(
        IReadOnlyDictionary<(int Row, int Col), string> cells,
        int headerRow,
        string fileName)
    {
        var nearHeader = cells.Keys
            .Where(key => key.Row > headerRow && key.Row <= headerRow + 5)
            .ToArray();

        var subheader = Find(cells,
            value => value.Equals("Наименование", StringComparison.Ordinal),
            nearHeader);
        var codeHeader = Find(cells,
            value => value.StartsWith("Коды, соответствующие", StringComparison.Ordinal),
            nearHeader);
        var choiceHeader = Find(cells,
            value => value.Contains("Лицом, осуществляющим ведение каталога", StringComparison.Ordinal),
            nearHeader);
        var otherChoiceHeader = Find(cells,
            value => value.Equals("Заказчиком", StringComparison.Ordinal),
            nearHeader);
        var requiredHeader = Find(cells,
            value => value.StartsWith("Тип характеристики", StringComparison.Ordinal),
            nearHeader);
        var nameHeader = Find(cells,
            value => value.StartsWith("Наименование товара", StringComparison.Ordinal),
            cells.Keys.Where(key => key.Row == headerRow));
        var unitHeader = Find(cells,
            value => value.StartsWith("Единица измерения", StringComparison.Ordinal),
            cells.Keys.Where(key => key.Row == headerRow));

        var subRow = subheader?.Row ?? headerRow + 2;
        var charNameCol = subheader?.Col ?? 4;
        var charUnitCol = charNameCol + 1;
        var valueCol = FindColumn(cells, subRow, "Значение") ?? charUnitCol + 1;
        var classifierCol = codeHeader?.Col ?? valueCol + 8;
        var nameCol = nameHeader?.Col ?? 2;
        var unitCol = unitHeader?.Col ?? 3;

        // В шаблоне есть строка с порядковыми номерами столбцов (1, 2, 3…):
        // настоящая запись — первая строка после неё с наименованием товара.
        var dataRow = cells.Keys
            .Where(key => key.Row > subRow)
            .Select(key => key.Row)
            .Distinct()
            .FirstOrDefault(row => Get(cells, row, nameCol).Length > 0 &&
                !Ordinal.IsMatch(Get(cells, row, 1)));

        var classifier = Get(cells, dataRow, classifierCol);
        var codes = CodeMatches(KtruCode.Match(Path.GetFileName(fileName)).Value, classifier);
        var code = codes.FirstOrDefault() ?? classifier;
        var okpd2Codes = Okpd2Matches(classifier.Length > 0 ? classifier : code);
        var name = Get(cells, dataRow, nameCol);
        var characteristics = new List<KtruXlsxCharacteristic>();
        KtruXlsxCharacteristic? current = null;

        for (var row = dataRow; row > 0 && row <= cells.Keys.Max(key => key.Row); row++)
        {
            var charName = Get(cells, row, charNameCol);
            if (charName.Length > 0 && !IsHeaderText(charName))
            {
                var choice = Get(cells, row, choiceHeader?.Col ?? charNameCol + 4);
                if (!IsChoice(choice))
                {
                    choice = Get(cells, row, otherChoiceHeader?.Col ?? choiceHeader?.Col + 1 ?? charNameCol + 5);
                }

                var required = Get(cells, row, requiredHeader?.Col ?? charNameCol + 6);
                current = new KtruXlsxCharacteristic(
                    charName,
                    NullIfEmpty(Get(cells, row, charUnitCol)),
                    [],
                    required.StartsWith("Необязательная", StringComparison.Ordinal) ? false
                        : required.StartsWith("Обязательная", StringComparison.Ordinal) ? true
                        : null,
                    IsChoice(choice) ? null : NullIfEmpty(choice));
                characteristics.Add(current);
            }

            var value = Get(cells, row, valueCol);
            var upper = Get(cells, row, valueCol + 1);
            if (current is not null && (value.Length > 0 || upper.Length > 0))
            {
                var range = value + (upper.Length > 0 && !upper.Equals(value, StringComparison.Ordinal)
                    ? ".." + upper
                    : "");
                if (range.Length > 0 && !current.Values.Contains(range, StringComparer.Ordinal))
                {
                    current.Values.Add(range);
                }
            }
        }

        return new KtruXlsxPosition(
            code,
            codes,
            okpd2Codes.FirstOrDefault() ?? "",
            okpd2Codes,
            name,
            NullIfEmpty(Get(cells, dataRow, unitCol)),
            null,
            characteristics,
            KtruXlsxTemplate.Catalog,
            fileName);
    }

    /// <summary>Шаблон заявки: шапка «Код каталога ХХХХХХХХХ-…», коды в колонке B.</summary>
    private static KtruXlsxPosition ParseRequestTemplate(
        IReadOnlyDictionary<(int Row, int Col), string> cells,
        int headerRow,
        string fileName)
    {
        var nameHeader = Find(cells,
            value => value.StartsWith("Наименование товара", StringComparison.Ordinal),
            cells.Keys.Where(key => key.Row == headerRow));
        var unitHeader = Find(cells,
            value => value.StartsWith("Единица измерения", StringComparison.Ordinal),
            cells.Keys.Where(key => key.Row == headerRow));
        var descriptionHeader = Find(cells,
            value => value.StartsWith("Описание товара", StringComparison.Ordinal),
            cells.Keys.Where(key => key.Row == headerRow));
        var codeHeader = Find(cells,
            value => value.Contains("Код каталога", StringComparison.Ordinal),
            cells.Keys.Where(key => key.Row == headerRow));
        var qualitativeHeader = Find(cells,
            value => value.StartsWith("Качественные характеристики", StringComparison.Ordinal));
        var quantitativeHeader = Find(cells,
            value => value.StartsWith("Количественные характеристики", StringComparison.Ordinal));

        var codeCol = codeHeader?.Col ?? 2;
        var dataRow = cells.Keys
            .Where(key => key.Row > headerRow)
            .Select(key => key.Row)
            .Distinct()
            .FirstOrDefault(row => KtruCode.IsMatch(Get(cells, row, codeCol)));

        var codeCell = Get(cells, dataRow, codeCol);
        var codes = CodeMatches(codeCell, Path.GetFileName(fileName));
        var code = codes.FirstOrDefault() ?? "";
        var okpd2Codes = codes.SelectMany(value => Okpd2Matches(value)).Distinct(StringComparer.Ordinal).ToArray();
        var qualitativeNameCol = qualitativeHeader?.Col ?? 9;
        var qualitativeValueCol = qualitativeNameCol + 1;
        var quantitativeNameCol = quantitativeHeader?.Col ?? 5;

        var characteristics = new List<KtruXlsxCharacteristic>();
        KtruXlsxCharacteristic? qualitative = null;
        KtruXlsxCharacteristic? quantitative = null;

        for (var row = dataRow; row > 0 && row <= cells.Keys.Max(key => key.Row); row++)
        {
            var qualitativeName = Get(cells, row, qualitativeNameCol);
            if (qualitativeName.Length > 0 && !IsHeaderText(qualitativeName))
            {
                qualitative = new KtruXlsxCharacteristic(qualitativeName, null, [], null, null);
                characteristics.Add(qualitative);
            }

            var qualitativeValue = Get(cells, row, qualitativeValueCol);
            if (qualitative is not null && qualitativeValue.Length > 0 &&
                !qualitative.Values.Contains(qualitativeValue, StringComparer.Ordinal))
            {
                qualitative.Values.Add(qualitativeValue);
            }

            var quantitativeName = Get(cells, row, quantitativeNameCol);
            if (quantitativeName.Length > 0 && !IsHeaderText(quantitativeName) &&
                !Ordinal.IsMatch(Get(cells, row, 1)))
            {
                quantitative = new KtruXlsxCharacteristic(
                    quantitativeName,
                    NullIfEmpty(Get(cells, row, quantitativeNameCol + 3)),
                    [],
                    null,
                    null);
                characteristics.Add(quantitative);
            }

            var from = Get(cells, row, quantitativeNameCol + 1);
            var to = Get(cells, row, quantitativeNameCol + 2);
            if (quantitative is not null && (from.Length > 0 || to.Length > 0))
            {
                var value = from + (to.Length > 0 && !to.Equals(from, StringComparison.Ordinal) ? ".." + to : "");
                if (!quantitative.Values.Contains(value, StringComparer.Ordinal))
                {
                    quantitative.Values.Add(value);
                }
            }
        }

        return new KtruXlsxPosition(
            code,
            codes,
            okpd2Codes.FirstOrDefault() ?? Okpd2Code.Match(code).Value,
            okpd2Codes,
            Get(cells, dataRow, nameHeader?.Col ?? 3),
            NullIfEmpty(Get(cells, dataRow, unitHeader?.Col ?? 4)),
            NullIfEmpty(Get(cells, dataRow, descriptionHeader?.Col ?? 5)),
            characteristics,
            KtruXlsxTemplate.Request,
            fileName);
    }

    private static IReadOnlyList<string> CodeMatches(params string[] sources) =>
        sources.SelectMany(source => KtruCode.Matches(source).Select(match => match.Value))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

    private static IReadOnlyList<string> Okpd2Matches(string source) =>
        Okpd2Code.Matches(source).Select(match => match.Value)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

    private static bool IsChoice(string value) => value is "х" or "x" or "Х" or "X" or "";

    private static bool IsHeaderText(string value) =>
        value.StartsWith("Наименование", StringComparison.Ordinal) ||
        value.StartsWith("Количественные характеристики", StringComparison.Ordinal) ||
        value.StartsWith("Качественные характеристики", StringComparison.Ordinal) ||
        value.StartsWith("Тип характеристики", StringComparison.Ordinal) ||
        value.StartsWith("Коды, соответствующие", StringComparison.Ordinal);

    private static int? FindColumn(
        IReadOnlyDictionary<(int Row, int Col), string> cells,
        int row,
        string prefix)
    {
        foreach (var key in cells.Keys.Where(key => key.Row == row))
        {
            if (cells[key].StartsWith(prefix, StringComparison.Ordinal))
            {
                return key.Col;
            }
        }

        return null;
    }

    private static (int Row, int Col, string Value)? Find(
        IReadOnlyDictionary<(int Row, int Col), string> cells,
        Func<string, bool> predicate,
        IEnumerable<(int Row, int Col)>? keys = null)
    {
        foreach (var key in keys ?? cells.Keys)
        {
            if (cells.TryGetValue(key, out var value) && predicate(value))
            {
                return (key.Row, key.Col, value);
            }
        }

        return null;
    }

    private static string Get(IReadOnlyDictionary<(int Row, int Col), string> cells, int row, int col) =>
        row > 0 && cells.TryGetValue((row, col), out var value) ? value : "";

    private static string? NullIfEmpty(string value) => value.Length == 0 ? null : value;

    /// <summary>Прочитать первый лист XLSX: общие строки + ячейки с адресами A1.</summary>
    private static Dictionary<(int Row, int Col), string> ReadCells(Stream xlsx)
    {
        var cells = new Dictionary<(int Row, int Col), string>();
        using var archive = new ZipArchive(xlsx, ZipArchiveMode.Read, leaveOpen: true);

        var stringsEntry = archive.GetEntry("xl/sharedStrings.xml");
        var strings = new List<string>();
        if (stringsEntry is not null)
        {
            using var stream = stringsEntry.Open();
            var document = XDocument.Load(stream);
            strings.AddRange(document.Descendants()
                .Where(element => element.Name.LocalName == "si")
                .Select(element => string.Concat(element.Descendants()
                    .Where(part => part.Name.LocalName == "t")
                    .Select(part => part.Value))));
        }

        var sheetEntry = archive.Entries
            .FirstOrDefault(entry => entry.FullName.StartsWith("xl/worksheets/sheet", StringComparison.Ordinal)
                && entry.FullName.EndsWith(".xml", StringComparison.Ordinal));
        if (sheetEntry is null)
        {
            return cells;
        }

        using var sheetStream = sheetEntry.Open();
        var sheet = XDocument.Load(sheetStream);
        foreach (var row in sheet.Descendants().Where(element => element.Name.LocalName == "row"))
        {
            if (!int.TryParse(row.Attribute("r")?.Value, out var rowNumber))
            {
                continue;
            }

            foreach (var cell in row.Elements().Where(element => element.Name.LocalName == "c"))
            {
                var column = ColumnNumber(cell.Attribute("r")?.Value);
                if (column == 0)
                {
                    continue;
                }

                var type = cell.Attribute("t")?.Value;
                var raw = cell.Elements().FirstOrDefault(element => element.Name.LocalName == "v")?.Value;
                string? value = type switch
                {
                    "s" => raw is not null && int.TryParse(raw, out var index) && index < strings.Count
                        ? strings[index]
                        : null,
                    "inlineStr" => string.Concat(cell.Descendants()
                        .Where(element => element.Name.LocalName == "t")
                        .Select(element => element.Value)),
                    _ => raw,
                };

                if (!string.IsNullOrWhiteSpace(value))
                {
                    cells[(rowNumber, column)] = Regex.Replace(value, @"\s+", " ").Trim();
                }
            }
        }

        return cells;
    }

    private static int ColumnNumber(string? reference)
    {
        if (string.IsNullOrEmpty(reference))
        {
            return 0;
        }

        var number = 0;
        foreach (var character in reference)
        {
            if (!char.IsLetter(character))
            {
                break;
            }

            number = number * 26 + (char.ToUpperInvariant(character) - 'A' + 1);
        }

        return number;
    }
}
