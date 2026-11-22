using System.Globalization;
using System.Text.RegularExpressions;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Разбор подтаблицы «Информация о привлечении СМП, СОНО» из HTML-карточки
/// контракта на zakupki.gov.ru.
///
/// Зачем отдельный парсер: с 2026 года заказчик перестал публиковать блок
/// subContractorsSum в XML контракта, но на сайте сведения есть. XML-парсер
/// (<see cref="ContractSmpParser"/>) остаётся основным источником, а этот —
/// дополняет проекцию там, где в XML сведений нет.
///
/// Основной источник — печатная форма карточки
/// (<c>printForm/view.html?contractReestrNumber=…</c>): она отдаёт таблицу
/// субподрядчиков целиком. Вкладка «Общая информация» показывает только
/// первые 10 строк, поэтому используется как запасной вариант.
/// </summary>
public sealed class ContractSmpHtmlParser
{
    /// <summary>Заголовок секции субподрядчиков — граница таблицы на странице.</summary>
    private const string SubcontractorsHeading =
        "Информация о субподрядчиках, соисполнителях из числа СМП, СОНО";

    /// <summary>
    /// Идентификатор версии контракта для AJAX-таблицы субподрядчиков: лежит
    /// в скрытом поле <c>subcontractorsUrlRefresh</c> на вкладке «Общая
    /// информация» (`…/subcontractors.html?contractInfoId=112512585`).
    /// </summary>
    private static readonly Regex ContractInfoId = new(
        @"subcontractorsUrlRefresh""[\s\S]{0,400}?contractInfoId=(?<id>\d+)",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Требуемый объём: процент и сумма в одной секции «Объем привлечения…».</summary>
    private static readonly Regex RequirementBlock = new(
        @"Объем\s+привлечения\s+к\s+исполнению\s+контракта\s+субподрядчиков,[\s\S]{0,200}?из\s+числа\s+СМП,\s*СОНО\s*</span>\s*<span\s+class=""section__info"">(?<value>[\s\S]*?)</span>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Печатная форма: строка «…в %» с процентом в соседней ячейке.</summary>
    private static readonly Regex PrintPercent = new(
        @"Объем\s+привлечения[\s\S]{0,400}?в\s*%</td>\s*<td[^>]*>(?<value>[\s\S]*?)</td>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Печатная форма: строка «…в рублях» с суммой в соседней ячейке.</summary>
    private static readonly Regex PrintSum = new(
        @"Объем\s+привлечения[\s\S]{0,400}?в\s*рублях</td>\s*<td[^>]*>(?<value>[\s\S]*?)</td>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Строка таблицы печатной формы (вложенных таблиц в ней нет).</summary>
    private static readonly Regex PrintRow = new(
        @"<tr[^>]*>(?<row>[\s\S]*?)</tr>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Видимая строка таблицы субподрядчиков: маркер раскрытия + ячейки.</summary>
    private static readonly Regex VisibleRow = new(
        @"<tr\s+class=""tableBlock__row"">\s*<td\s+class=""tableBlock__col"">\s*<img[^>]*data-id=""(?<id>\d+)""[\s\S]*?</tr>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Ячейка таблицы; первая — раскрывающая картинка.</summary>
    private static readonly Regex TableCell = new(
        @"<td[^>]*>(?<value>[\s\S]*?)</td>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Начало раскрывающейся строки с деталями субподрядчика.</summary>
    private static readonly Regex DetailStart = new(
        @"<tr\s+class=""tableBlock__row\s+subContractor-(?<id>\d+)""",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex PercentValue = new(
        @"(?<value>\d+(?:[.,]\d+)?)\s*%",
        RegexOptions.CultureInvariant);

    private static readonly Regex RequirementSumValue = new(
        @"что\s+составляет\s*(?<value>[\d\s\u00A0]+(?:[.,]\d{1,2})?)",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex StatusSection = new(
        @"<span\s+class=""section__title"">\s*Статус\s*</span>\s*<span\s+class=""section__info"">(?<value>[\s\S]*?)</span>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex Okpd2Cell = new(
        @"<td[^>]*tableBlock__col_right[^>]*>\s*(?<code>\d{2}\.\d{2}\.\d{2}\.\d{3})\s*</td>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex KppValue = new(
        @"(?<!\d)(?<value>\d{9})(?!\d)",
        RegexOptions.CultureInvariant);

    /// <summary>
    /// Реквизиты договора: «№ 01/09/26/20Р от 28.10.2026». Печатная форма для
    /// части записей отдаёт дату в ISO («от 2026-05-18») — поддерживаем оба вида.
    /// </summary>
    private static readonly Regex ContractNumberAndDate = new(
        @"№\s*(?<number>.+?)\s+от\s+(?<date>\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2})",
        RegexOptions.CultureInvariant);

    private static readonly Regex DateValue = new(
        @"\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2}",
        RegexOptions.CultureInvariant);

    private static readonly Regex Tag = new(@"<[^>]+>", RegexOptions.CultureInvariant);

    /// <summary>
    /// Число в тексте: «940 000,00 руб.» → «940 000,00». Точка из «руб.» в сумму
    /// попасть не должна, иначе decimal.TryParse отвергнет строку с двумя точками.
    /// </summary>
    private static readonly Regex MoneyValue = new(
        @"\d[\d\s\u00A0]*(?:[.,]\d{1,2})?",
        RegexOptions.CultureInvariant);

    private static readonly Regex Whitespace = new(@"\s+", RegexOptions.CultureInvariant);

    /// <summary>
    /// Проекция подтаблицы СМП из HTML. Возвращает null, если на странице нет
    /// ни требования, ни субподрядчиков: значит, карточка не про СМП.
    /// </summary>
    public ContractSmpViewDto? Parse(string html, string regNumber)
    {
        ArgumentNullException.ThrowIfNull(html);

        // Печатная форма полнее вкладки «Общая информация» (та режет таблицу
        // до 10 строк), но в печатной нет ОКПД2. Основной путь — карточка плюс
        // AJAX-фрагмент: см. ParseCommonInfoCard.
        return ParsePrintForm(html, regNumber) ?? ParseCommonInfo(html, regNumber);
    }

    /// <summary>Идентификатор версии контракта для AJAX-таблицы субподрядчиков.</summary>
    public static string? ContractInfoIdOf(string commonInfoHtml)
    {
        ArgumentNullException.ThrowIfNull(commonInfoHtml);
        var match = ContractInfoId.Match(commonInfoHtml);
        return match.Success ? match.Groups["id"].Value : null;
    }

    /// <summary>
    /// Карточка «Общая информация» + полный фрагмент таблицы субподрядчиков.
    /// Требование берём из карточки, строки — из AJAX-фрагмента
    /// `subcontractors.html`: там весь список (pageSize) и ОКПД2 в раскрывающихся
    /// блоках. Если фрагмент не получен, остаются первые 10 строк карточки.
    /// </summary>
    public ContractSmpViewDto? ParseCommonInfoCard(
        string commonInfoHtml,
        string? subcontractorsHtml,
        string regNumber)
    {
        ArgumentNullException.ThrowIfNull(commonInfoHtml);

        var (percent, sum) = ParseRequirement(commonInfoHtml);
        var subcontractors = string.IsNullOrWhiteSpace(subcontractorsHtml)
            ? ParseSubcontractors(commonInfoHtml)
            : ParseSubcontractorRows(subcontractorsHtml);

        if (percent is null && sum is null && subcontractors.Count == 0)
        {
            return null;
        }

        return new ContractSmpViewDto(
            RequirementPercent: percent,
            RequirementSum: sum,
            Responsibility: null,
            Subcontractors: subcontractors,
            SourceFile: $"html:{regNumber}");
    }

    /// <summary>Печатная форма карточки: полная таблица без пагинации.</summary>
    private static ContractSmpViewDto? ParsePrintForm(string html, string regNumber)
    {
        var headingIndex = html.IndexOf(SubcontractorsHeading, StringComparison.OrdinalIgnoreCase);
        if (headingIndex < 0)
        {
            return null;
        }

        var percentMatch = PrintPercent.Match(html);
        var sumMatch = PrintSum.Match(html);
        var percent = percentMatch.Success
            ? ParseMoney(PlainText(percentMatch.Groups["value"].Value))
            : null;
        var sum = sumMatch.Success
            ? ParseMoney(PlainText(sumMatch.Groups["value"].Value))
            : null;

        var tableEnd = html.IndexOf("</table>", headingIndex, StringComparison.OrdinalIgnoreCase);
        var section = tableEnd > headingIndex
            ? html[headingIndex..tableEnd]
            : html[headingIndex..];

        var result = new List<SubcontractorDto>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (Match row in PrintRow.Matches(section))
        {
            var cells = TableCell.Matches(row.Groups["row"].Value)
                .Select(match => PlainText(match.Groups["value"].Value))
                .ToList();
            // 0 — № п/п, 1 — наименование, 2/3 — адреса, 4 — ИНН, 5 — КПП,
            // 6 — ОКОПФ, 7 — статус, 8 — реквизиты договора, 9 — предмет,
            // 10 — способ указания цены, 11 — цена договора
            if (cells.Count < 12)
            {
                continue;
            }

            // Шапка («№ п/п») и строка нумерации столбцов («1», «2», …) не данные
            if (cells[0].Length == 0 || !cells[0].All(char.IsDigit))
            {
                continue;
            }

            var inn = OnlyDigits(cells[4]);
            if (inn.Length is not (10 or 12))
            {
                continue;
            }

            var status = ParseStatus(cells[7]);

            var contractNumber = cells[8];
            var contractDate = (string?)null;
            var numberMatch = ContractNumberAndDate.Match(cells[8]);
            if (numberMatch.Success)
            {
                contractNumber = numberMatch.Groups["number"].Value.Trim();
                contractDate = IsoDate(numberMatch.Groups["date"].Value);
            }
            else
            {
                var dateMatch = DateValue.Match(cells[8]);
                if (dateMatch.Success)
                {
                    contractDate = IsoDate(dateMatch.Value);
                }
            }

            var dto = new SubcontractorDto(
                Inn: inn,
                Kpp: KppValue.Match(cells[5]).Groups["value"].Value is { Length: > 0 } kpp
                    ? kpp
                    : null,
                Name: NullIfEmpty(cells[1]),
                StatusCode: status.Code,
                StatusName: TrimStatusName(status.Name),
                ContractSum: ParseMoney(cells[11]),
                ContractDate: contractDate,
                ContractNumber: NullIfEmpty(contractNumber.TrimStart('№', ' ', '\u00A0')),
                ContractSubject: NullIfEmpty(cells[9]),
                // В печатной форме кода ОКПД2 нет — остаётся пустым
                Okpd2Code: null);

            if (seen.Add($"{dto.Inn}|{dto.ContractNumber}"))
            {
                result.Add(dto);
            }
        }

        if (percent is null && sum is null && result.Count == 0)
        {
            return null;
        }

        return new ContractSmpViewDto(
            RequirementPercent: percent,
            RequirementSum: sum,
            Responsibility: null,
            Subcontractors: result,
            SourceFile: $"html:{regNumber}");
    }

    /// <summary>Запасной вариант: вкладка «Общая информация» (первые 10 строк).</summary>
    private static ContractSmpViewDto? ParseCommonInfo(string html, string regNumber)
    {
        var (percent, sum) = ParseRequirement(html);
        var subcontractors = ParseSubcontractors(html);

        if (percent is null && sum is null && subcontractors.Count == 0)
        {
            return null;
        }

        return new ContractSmpViewDto(
            RequirementPercent: percent,
            RequirementSum: sum,
            // В HTML текст ответственности не выводится — он остаётся из XML
            Responsibility: null,
            Subcontractors: subcontractors,
            // Префикс отделяет источник от имени XML-файла в проекции
            SourceFile: $"html:{regNumber}");
    }

    private static (decimal? Percent, decimal? Sum) ParseRequirement(string html)
    {
        var block = RequirementBlock.Match(html);
        if (!block.Success)
        {
            return (null, null);
        }

        var text = PlainText(block.Groups["value"].Value);
        var percentMatch = PercentValue.Match(text);
        var sumMatch = RequirementSumValue.Match(text);

        return (
            percentMatch.Success ? ParseMoney(percentMatch.Groups["value"].Value) : null,
            sumMatch.Success ? ParseMoney(sumMatch.Groups["value"].Value) : null);
    }

    private static IReadOnlyList<SubcontractorDto> ParseSubcontractors(string html)
    {
        var headingIndex = html.IndexOf(SubcontractorsHeading, StringComparison.OrdinalIgnoreCase);
        if (headingIndex < 0)
        {
            return [];
        }

        // Дальше заголовка идёт только таблица субподрядчиков и подвал сайта,
        // поэтому другие таблицы страницы в выборку не попадут.
        return ParseSubcontractorRows(html[headingIndex..]);
    }

    /// <summary>
    /// Строки таблицы субподрядчиков без заголовка секции: подходит и для
    /// хвоста карточки, и для AJAX-фрагмента subcontractors.html.
    /// </summary>
    private static IReadOnlyList<SubcontractorDto> ParseSubcontractorRows(string section)
    {
        var details = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (Match detail in DetailStart.Matches(section))
        {
            var id = detail.Groups["id"].Value;
            // Окно с запасом: «Статус» идёт в начале блока, ОКПД2 — в таблице
            // объектов ниже; дальше начинается следующий субподрядчик.
            var length = Math.Min(20000, section.Length - detail.Index);
            details[id] = section.Substring(detail.Index, length);
        }

        var result = new List<SubcontractorDto>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (Match row in VisibleRow.Matches(section))
        {
            var cells = TableCell.Matches(row.Value)
                .Select(match => PlainText(match.Groups["value"].Value))
                .ToList();
            // 0 — картинка раскрытия, 1 — наименование, 2 — ИНН, 3 — КПП/дата,
            // 4 — адрес, 5 — реквизиты договора, 6 — предмет, 7 — цена
            if (cells.Count < 8)
            {
                continue;
            }

            var inn = OnlyDigits(cells[2]);
            if (inn.Length == 0)
            {
                continue;
            }

            var detailsHtml = details.GetValueOrDefault(row.Groups["id"].Value) ?? string.Empty;
            var status = ParseStatus(detailsHtml);

            var contractNumber = cells[5];
            var contractDate = (string?)null;
            var numberMatch = ContractNumberAndDate.Match(cells[5]);
            if (numberMatch.Success)
            {
                contractNumber = numberMatch.Groups["number"].Value.Trim();
                contractDate = IsoDate(numberMatch.Groups["date"].Value);
            }
            else
            {
                var dateMatch = DateValue.Match(cells[5]);
                if (dateMatch.Success)
                {
                    contractDate = IsoDate(dateMatch.Value);
                }
            }

            var dto = new SubcontractorDto(
                Inn: inn,
                Kpp: KppValue.Match(cells[3]).Groups["value"].Value is { Length: > 0 } kpp
                    ? kpp
                    : null,
                Name: NullIfEmpty(cells[1]),
                StatusCode: status.Code,
                StatusName: status.Name,
                ContractSum: ParseMoney(cells[7]),
                ContractDate: contractDate,
                ContractNumber: NullIfEmpty(contractNumber.TrimStart('№', ' ', '\u00A0')),
                ContractSubject: NullIfEmpty(cells[6]),
                Okpd2Code: Okpd2Cell.Match(detailsHtml).Groups["code"].Value is { Length: > 0 } okpd2
                    ? okpd2
                    : null);

            // Как и в XML: один ИНН может иметь несколько субдоговоров,
            // поэтому ключ — «ИНН + номер договора».
            if (seen.Add($"{dto.Inn}|{dto.ContractNumber}"))
            {
                result.Add(dto);
            }
        }

        return result;
    }

    /// <summary>Статус в HTML: «30 - субъект малого предпринимательства».</summary>
    private static (string? Code, string? Name) ParseStatus(string value)
    {
        // В common-info статус лежит в секции «Статус», в печатной форме —
        // прямо в ячейке таблицы. Поддерживаем оба варианта.
        var match = StatusSection.Match(value);
        var text = PlainText(match.Success ? match.Groups["value"].Value : value);
        if (string.IsNullOrWhiteSpace(text))
        {
            return (null, null);
        }

        var separator = text.IndexOfAny(['-', '–', '—']);
        if (separator < 0)
        {
            return (null, NullIfEmpty(text));
        }

        var code = text[..separator].Trim();
        var name = text[(separator + 1)..].Trim();
        return (code.Length > 0 && code.All(char.IsDigit) ? code : null, NullIfEmpty(name));
    }

    private static string PlainText(string html) =>
        Whitespace.Replace(
                Tag.Replace(System.Net.WebUtility.HtmlDecode(html), " "),
                " ")
            .Trim();

    private static string OnlyDigits(string value) =>
        new(value.Where(char.IsDigit).ToArray());

    /// <summary>Сумма из текста вида «494 590,16 руб.» → 494590.16.</summary>
    private static decimal? ParseMoney(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var match = MoneyValue.Match(value);
        if (!match.Success)
        {
            return null;
        }

        var cleaned = new string(match.Value
            .Where(ch => char.IsDigit(ch) || ch is ',' or '.')
            .ToArray());
        if (cleaned.Length == 0)
        {
            return null;
        }

        return decimal.TryParse(
            cleaned.Replace(',', '.'),
            NumberStyles.Number,
            CultureInfo.InvariantCulture,
            out var amount)
            ? amount
            : null;
    }

    /// <summary>Дата сайта «04.05.2026» → ISO «2026-05-04», как в XML.</summary>
    private static string? IsoDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        if (DateTime.TryParseExact(
                trimmed,
                "dd.MM.yyyy",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var date))
        {
            return date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        // ISO-дата уже в нужном формате — оставляем как есть
        return trimmed;
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>В печатной форме после статуса остаётся запятая: «…, ».</summary>
    private static string? TrimStatusName(string? value) =>
        NullIfEmpty(value?.TrimEnd(',', ';', '.', ' '));
}
