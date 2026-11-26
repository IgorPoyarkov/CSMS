using System.Globalization;
using System.Text.RegularExpressions;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Разбор публичных HTML-карточек КТРУ на zakupki.gov.ru. Внешней
/// HTML-библиотеки нет: разметка ЕИС стабильна, а зависимости не нужны —
/// так же, как в <see cref="ContractSmpHtmlParser"/>.
///
/// Источники:
/// - commonInfo.html — код, статус, даты и «Справочная информация»;
/// - search/results.html — тег hidden-block-hover с числом дочерних позиций;
/// - ktru-part-description.html — таблица характеристик с пометкой
///   «обязательная/необязательная для применения».
/// </summary>
public static class KtruCardHtmlParser
{
    private const RegexOptions Options =
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant;

    /// <summary>Отличает настоящую карточку от короткой страницы 404 ЕИС.</summary>
    public static bool IsCard(string html) =>
        html.Contains("Код позиции КТРУ", StringComparison.OrdinalIgnoreCase) ||
        html.Contains("cardMainInfo__content", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Поддерживаемый формат — «11 цифр ОКПД2 - 8 цифр suffix». Составные
    /// коды лекарств (ЕСКЛП) вида 21.10.51.123-000001-1-00047-0000000000000
    /// имеют другой формат данных и в текущей реализации не разбираются.
    /// </summary>
    public static bool IsSupportedCode(string code) =>
        Regex.IsMatch(code, "^\\d{2}\\.\\d{2}\\.\\d{2}\\.\\d{3}-\\d{8}$", Options);

    /// <summary>Декодирует HTML-entities ЕИС: &amp;, &lt;, &#034; и т.п.</summary>
    private static string Decode(string value)
    {
        return Regex.Replace(
                value,
                "&#(\\d+);",
                match => char.ConvertFromUtf32(int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture)),
                Options)
            .Replace("&nbsp;", " ", StringComparison.OrdinalIgnoreCase)
            .Replace("&lt;", "<", StringComparison.OrdinalIgnoreCase)
            .Replace("&gt;", ">", StringComparison.OrdinalIgnoreCase)
            .Replace("&quot;", "\"", StringComparison.OrdinalIgnoreCase)
            .Replace("&#39;", "'", StringComparison.OrdinalIgnoreCase)
            .Replace("&amp;", "&", StringComparison.OrdinalIgnoreCase);
    }

    private static string Text(string html)
    {
        var withoutTags = Regex.Replace(html, "<[^>]+>", " ", Options);
        return Regex.Replace(Decode(withoutTags), "\\s+", " ").Trim();
    }

    private static string Escape(string value) =>
        Regex.Replace(value, "[.*+?^${}()|[\\]\\\\]", "\\$&");

    /// <summary>Пара «section__title» → «section__info» из карточки.</summary>
    private static string Section(string html, string title)
    {
        var pattern =
            "<span class=\"section__title\">\\s*" + Escape(title) +
            "\\s*</span>\\s*<span class=\"section__info\">([\\s\\S]*?)</span>";
        var match = Regex.Match(html, pattern, Options);
        return match.Success ? Text(match.Groups[1].Value) : string.Empty;
    }

    /// <summary>Вырезает div по id с учётом вложенных div — в справочной информации они есть.</summary>
    private static string ExtractDiv(string html, string id)
    {
        var marker = $"id=\"{id}\"";
        var markerIndex = html.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (markerIndex < 0)
        {
            return string.Empty;
        }

        var start = html.LastIndexOf("<div", markerIndex, StringComparison.OrdinalIgnoreCase);
        if (start < 0)
        {
            return string.Empty;
        }

        var depth = 0;
        for (var i = start; i < html.Length;)
        {
            var open = html.IndexOf("<div", i, StringComparison.OrdinalIgnoreCase);
            var close = html.IndexOf("</div>", i, StringComparison.OrdinalIgnoreCase);
            if (close < 0)
            {
                break;
            }

            if (open >= 0 && open < close)
            {
                depth++;
                i = open + 4;
            }
            else
            {
                depth--;
                i = close + 6;
                if (depth == 0)
                {
                    return html[start..i];
                }
            }
        }

        return html[start..];
    }

    private static List<List<(string Text, string Html)>> TableRows(string html)
    {
        var rows = new List<List<(string, string)>>();
        var body = Regex.Match(html, "<tbody[^>]*>([\\s\\S]*?)</tbody>", Options);
        if (!body.Success)
        {
            return rows;
        }

        foreach (var row in Regex.Matches(body.Groups[1].Value, "<tr[^>]*>([\\s\\S]*?)</tr>", Options).Cast<Match>())
        {
            var cells = new List<(string, string)>();
            foreach (var cell in Regex.Matches(row.Groups[1].Value, "<t[dh][^>]*>([\\s\\S]*?)</t[dh]>", Options).Cast<Match>())
            {
                // Сохраняем и полный тег: в нём живёт class="characteristicName".
                cells.Add((Text(cell.Groups[1].Value), cell.Value));
            }

            if (cells.Count > 0)
            {
                rows.Add(cells);
            }
        }

        return rows;
    }

    /// <summary>Строки таблицы классификаторов (в том числе ajax-страницы).</summary>
    public static IReadOnlyList<KtruClassifier> ParseClassifiers(string tableHtml)
    {
        return TableRows(tableHtml)
            .Where(row => !row[0].Text.Contains("Наименование классификатора", StringComparison.OrdinalIgnoreCase))
            .Select(row => new KtruClassifier(
                row.ElementAtOrDefault(0).Text ?? string.Empty,
                row.ElementAtOrDefault(1).Text ?? string.Empty,
                row.ElementAtOrDefault(2).Text ?? string.Empty))
            .Where(item => item.Name.Length > 0)
            .ToArray();
    }

    /// <summary>Строки таблицы стандартов и техрегламентов.</summary>
    public static IReadOnlyList<KtruStandard> ParseStandards(string tableHtml)
    {
        return TableRows(tableHtml)
            .Where(row => !row[0].Text.Contains("Наименование документа", StringComparison.OrdinalIgnoreCase))
            .Select(row =>
            {
                var cell = row.ElementAtOrDefault(1).Html ?? string.Empty;
                var link = Regex.Match(cell, "href=\"([^\"]+)\"", Options);
                return new KtruStandard(
                    row.ElementAtOrDefault(0).Text ?? string.Empty,
                    link.Success ? Decode(link.Groups[1].Value) : string.Empty);
            })
            .Where(item => item.Name.Length > 0)
            .ToArray();
    }

    /// <summary>Основная карточка: поля, статус, вложенность и справочная информация.</summary>
    public static KtruCardHtmlRecord ParseCard(string html, string itemId)
    {
        var okpd2Raw = Section(html, "Код по ОКПД2");
        var okpd2 = okpd2Raw.Split(':', 2)[0].Trim();
        if (string.IsNullOrWhiteSpace(okpd2))
        {
            okpd2 = itemId.Split('-')[0];
        }

        var classifiers = ParseClassifiers(ExtractDiv(html, "classfrContent"));
        var standards = ParseStandards(ExtractDiv(html, "standardContent"));

        return new KtruCardHtmlRecord(
            Code: Section(html, "Код позиции КТРУ") is { Length: > 0 } code ? code : itemId,
            Okpd2Code: okpd2,
            Name: Section(html, "Наименование товара, работы, услуги"),
            Unit: Section(html, "Единицы измерения (количество товара, объем работы, услуги по ОКЕИ)"),
            Status: Section(html, "Статус"),
            IncludedDate: Section(html, "Дата включения позиции в каталог"),
            MandatoryFrom: Section(html, "Дата начала обязательного применения позиции каталога"),
            MandatoryTo: Section(html, "Дата окончания применения позиции каталога"),
            Enlarged: html.Contains("Позиция является укрупненной", StringComparison.OrdinalIgnoreCase),
            ChildCodes: [],
            Characteristics: [],
            Classifiers: classifiers,
            Standards: standards);
    }

    /// <summary>
    /// Категории рубрикатора КТРУ со стартовой страницы ЕИС. Отрицательные
    /// идентификаторы — справочник лекарств (ЕСКЛП), пока не поддерживаем.
    /// </summary>
    public static IReadOnlyList<KtruRubricatorCategory> ParseCategories(string startHtml)
    {
        var result = new List<KtruRubricatorCategory>();

        foreach (var match in Regex.Matches(
                     startHtml,
                     "href=\"(/epz/ktru/search/results\\.html\\?rubricatorIdSelected=(-?\\d+)[^\"]*)\"",
                     Options).Cast<Match>())
        {
            var id = match.Groups[2].Value;
            if (!int.TryParse(id, out var numericId) || numericId < 0)
            {
                continue;
            }

            var href = Decode(match.Groups[1].Value);
            var nameMatch = Regex.Match(href, "selectedNameFromRubricator=([^&]*)", Options);
            var name = nameMatch.Success
                ? Uri.UnescapeDataString(nameMatch.Groups[1].Value).Replace('+', ' ')
                : id;

            // ЕИС отдаёт 404 как на raw-кириллицу, так и на %20 в пробелах:
            // кодируем значение параметра и ставим '+' вместо пробелов.
            var encodedName = Uri.EscapeDataString(name).Replace("%20", "+");
            href = Regex.Replace(
                href,
                "selectedNameFromRubricator=[^&]*",
                "selectedNameFromRubricator=" + encodedName,
                Options);

            var searchUrl = Regex.Replace(
                href,
                "recordsPerPage=_\\d+",
                "recordsPerPage=_100",
                Options);
            var rssUrl = searchUrl
                .Replace("/search/results.html?", "/search/rss?", StringComparison.OrdinalIgnoreCase);
            rssUrl = Regex.Replace(rssUrl, "recordsPerPage=_\\d+", "recordsPerPage=_100", Options);

            result.Add(new KtruRubricatorCategory(id, name.Trim(), searchUrl, rssUrl));
        }

        return result
            .DistinctBy(category => category.Id)
            .ToArray();
    }

    /// <summary>Коды позиций из RSS-подписки категории.</summary>
    public static IReadOnlyList<string> ParseRssCodes(string rssXml)
    {
        var decoded = Decode(rssXml);
        return Regex.Matches(
                decoded,
                "Код позиции КТРУ:\\s*</strong>\\s*([0-9.\\-]+)",
                Options)
            .Select(match => match.Groups[1].Value.Trim())
            .Where(IsSupportedCode)
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }

    /// <summary>Коды позиций на странице поиска категории.</summary>
    public static IReadOnlyList<string> ParseSearchCodes(string searchHtml)
    {
        return Regex.Matches(
                searchHtml,
                "ktruCard/commonInfo\\.html\\?itemId=([0-9.\\-]+)",
                Options)
            .Select(match => match.Groups[1].Value)
            .Where(IsSupportedCode)
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }

    /// <summary>
    /// Блок hidden-block-hover строки поиска: у укрупнённой позиции содержит
    /// «N позиций» и ссылку на список дочерних itemId.
    /// </summary>
    public static KtruNestingInfo? ParseNesting(string searchHtml)
    {
        var match = Regex.Match(
            searchHtml,
            "hidden-block-hover[\\s\\S]{0,2000}?<a href=\"([^\"]+)\">\\s*(\\d+)\\s*позици",
            Options);
        if (!match.Success)
        {
            return null;
        }

        return new KtruNestingInfo(
            int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture),
            Decode(match.Groups[1].Value));
    }

    /// <summary>itemId из ответа на ссылку «N позиций».</summary>
    public static IReadOnlyList<string> ParseChildIds(string searchHtml)
    {
        return Regex.Matches(
                searchHtml,
                "ktruCard/commonInfo\\.html\\?itemId=([0-9.\\-]+)",
                Options)
            .Select(match => match.Groups[1].Value)
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }

    /// <summary>Версия позиции для ajax-таблицы характеристик.</summary>
    public static string? ParseVersionId(string descriptionHtml)
    {
        var match = Regex.Match(
            descriptionHtml,
            "id=\"ktruItemVersionId\"\\s+value=\"([^\"]+)\"",
            Options);
        return match.Success ? Decode(match.Groups[1].Value) : null;
    }

    /// <summary>
    /// Таблица характеристик. У первой строки группы есть ячейка
    /// characteristicName с rowspan, у остальных — только значение и единица.
    /// </summary>
    public static IReadOnlyList<KtruCharacteristic> ParseCharacteristics(string partHtml)
    {
        var result = new List<KtruCharacteristic>();
        KtruCharacteristic? current = null;

        // TableRows читает только tbody: шапку thead надо отфильтровать по тексту,
        // иначе первая настоящая строка характеристики теряется.
        foreach (var row in TableRows(partHtml))
        {
            if (row[0].Text.Contains("Наименование характеристики", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var hasName = row[0].Html.Contains("characteristicName", StringComparison.OrdinalIgnoreCase);

            string value;
            string unit;

            if (hasName)
            {
                var nameMatch = Regex.Match(row[0].Html, "<div>([\\s\\S]*?)</div>", Options);
                var name = Text(nameMatch.Success ? nameMatch.Groups[1].Value : row[0].Text);
                if (string.IsNullOrWhiteSpace(name))
                {
                    continue;
                }

                var required = !row[0].Text.Contains(
                    "не является обязательной", StringComparison.OrdinalIgnoreCase);

                current = new KtruCharacteristic(name, required, []);
                result.Add(current);
                value = row.ElementAtOrDefault(1).Text ?? string.Empty;
                unit = row.ElementAtOrDefault(2).Text ?? string.Empty;
            }
            else
            {
                // У характеристики с несколькими значениями ячейка с названием
                // имеет rowspan, а последующие строки содержат только значение и ЕИ.
                if (current is null)
                {
                    continue;
                }

                value = row.ElementAtOrDefault(0).Text ?? string.Empty;
                unit = row.ElementAtOrDefault(1).Text ?? string.Empty;
            }

            if (string.IsNullOrWhiteSpace(value) || current is null)
            {
                continue;
            }

            var updated = current with
            {
                Values = [.. current.Values, new KtruCharacteristicValue(value.Trim(), unit.Trim())],
            };
            result[result.IndexOf(current)] = updated;
            current = updated;
        }

        return result;
    }
}
