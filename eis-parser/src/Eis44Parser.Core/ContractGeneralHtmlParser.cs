using System.Globalization;
using System.Text.RegularExpressions;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Разбор реквизитов контракта из HTML-карточки zakupki.gov.ru: заказчик и
/// поставщик с ИНН/КПП, аванс, срок исполнения, ИКЗ, обеспечение и банковские
/// счета сторон.
///
/// Зачем отдельный парсер: XML-вложения вкладки «Документы» (акты, платёжные
/// поручения) не содержат условий контракта, а именно из них заполняется наш
/// реестр — поставщик, аванс и даты исполнения до сих пор оставались пустыми.
/// Вкладка «Общая информация» публикует эти поля секциями
/// <c>section.blockInfo__section</c>, поставщик и его счета — только в печатной
/// форме карточки (<c>printForm/view.html?contractReestrNumber=…</c>).
///
/// Парсер чистый: HTML передаётся снаружи, поэтому разметку можно проверять
/// офлайн на сохранённом снимке.
/// </summary>
public sealed class ContractGeneralHtmlParser
{
    /// <summary>Пара «заголовок → значение» в блоке сведений карточки.</summary>
    private static readonly Regex SectionPair = new(
        @"<span\s+class=""section__title"">(?<title>[\s\S]*?)</span>\s*" +
        @"<span\s+class=""section__info[^""]*"">(?<value>[\s\S]*?)</span>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Пара «заголовок → значение» в шапке карточки (цена, заказчик).</summary>
    private static readonly Regex MainInfoPair = new(
        @"<span\s+class=""cardMainInfo__title"">(?<title>[\s\S]*?)</span>\s*" +
        @"<span\s+class=""cardMainInfo__content[^""]*"">(?<value>[\s\S]*?)</span>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Строка таблицы печатной формы.</summary>
    private static readonly Regex TableRow = new(
        @"<tr[^>]*>(?<row>[\s\S]*?)</tr>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Ячейка таблицы печатной формы.</summary>
    private static readonly Regex TableCell = new(
        @"<td[^>]*>(?<value>[\s\S]*?)</td>",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex Tag = new(@"<[^>]+>", RegexOptions.CultureInvariant);
    private static readonly Regex Whitespace = new(@"\s+", RegexOptions.CultureInvariant);

    /// <summary>ИНН: 10 цифр у организации, 12 — у ИП.</summary>
    private static readonly Regex InnValue = new(
        @"ИНН\s*:?\s*(?<value>\d{10,12})",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex KppValue = new(
        @"КПП\s*:?\s*(?<value>\d{9})",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex BikValue = new(
        @"БИК\s*:?\s*(?<value>\d{9})",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex CorrespondentAccountValue = new(
        @"к/с\s*:?\s*(?<value>\d{20})",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Процент аванса в значении «29.59%, что составляет 43 701 531,08 ₽».</summary>
    private static readonly Regex PercentValue = new(
        @"(?<value>\d+(?:[.,]\d+)?)\s*%",
        RegexOptions.CultureInvariant);

    /// <summary>Остаток после «что составляет» — сумма аванса.</summary>
    private static readonly Regex AmountAfterWords = new(
        @"что\s+составляет\s*(?<value>[\d\s\u00A0]+(?:[.,]\d{1,2})?)",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Число в тексте: «147 712 728,82 ₽» → «147 712 728,82».</summary>
    private static readonly Regex MoneyValue = new(
        @"\d[\d\s\u00A0]*(?:[.,]\d{1,2})?",
        RegexOptions.CultureInvariant);

    private static readonly Regex DateValue = new(
        @"\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2}",
        RegexOptions.CultureInvariant);


    /// <summary>
    /// Реквизиты контракта из HTML. Возвращает null, если карточка не разобралась
    /// совсем (нет ни одной секции): значит, страница отдала заглушку или ошибку.
    /// </summary>
    public ContractGeneralViewDto? Parse(
        string commonInfoHtml,
        string? printFormHtml,
        string regNumber)
    {
        ArgumentNullException.ThrowIfNull(commonInfoHtml);

        var sections = SectionPairs(commonInfoHtml);
        var main = MainInfoPairs(commonInfoHtml);
        var print = printFormHtml is null ? null : ParsePrintForm(printFormHtml);

        if (sections.Count == 0 && main.Count == 0 && print is null)
        {
            return null;
        }

        var advance = First(sections, "Размер аванса");

        var result = new ContractGeneralViewDto(
            ContractNumber: First(sections, "Номер контракта"),
            ContractDate: IsoDate(First(sections, "Дата заключения контракта")),
            ContractName: Plain(First(sections, "Предмет контракта") ?? First(main, "Объекты закупки")),
            ContractPrice: Number(First(sections, "Цена контракта") ?? First(main, "Цена контракта")),
            CurrencyName: First(sections, "Валюта контракта"),
            Ikz: First(sections, "Идентификационный код закупки (ИКЗ)"),
            // В карточке наименование заказчика — ссылка на организацию:
            // без снятия тегов в реестр попадает <a href=…>.
            CustomerName: Plain(
                First(sections, "Полное наименование заказчика") ??
                First(sections, "Сокращенное наименование заказчика") ??
                First(main, "Заказчик")),
            CustomerInn: First(sections, "ИНН"),
            CustomerKpp: First(sections, "КПП"),
            SupplierName: print?.SupplierName,
            SupplierInn: print?.SupplierInn,
            SupplierKpp: print?.SupplierKpp,
            AdvancePercent: advance is null
                ? null
                : Number(PercentValue.Match(advance).Groups["value"].Value),

            AdvanceAmount: advance is null
                ? null
                : Number(AmountAfterWords.Match(advance).Groups["value"].Value),
            PerformanceSecurityAmount: Number(First(sections, "Размер обеспечения исполнения контракта")),
            ExecutionStartDate: IsoDate(First(sections, "Дата начала исполнения контракта")),
            ExecutionEndDate: IsoDate(First(sections, "Дата окончания исполнения контракта")),
            SupplierPersonalAccount: print?.SupplierPersonalAccount,
            SupplierAccount: print?.SupplierAccount,
            SupplierBankName: print?.SupplierBankName,
            SupplierBik: print?.SupplierBik,
            SupplierCorrespondentAccount: print?.SupplierCorrespondentAccount,
            CustomerAccount: print?.CustomerAccount,
            CustomerBankName: print?.CustomerBankName,
            CustomerBik: print?.CustomerBik,
            SourceFile: print is null
                ? $"common-info:{regNumber}"
                : $"common-info+print-form:{regNumber}");

        // Пустая проекция (все поля null) — это не «контракт без реквизитов», а
        // неразобранная страница: лучше не писать её в выгрузку.
        return IsEmpty(result) ? null : result;
    }

    /// <summary>
    /// Поставщик и банковские реквизиты сторон из печатной формы. В карточке
    /// «Общая информация» поставщика нет вовсе, а платёжное поручение и акт
    /// должны заполняться счетами и БИК обеих сторон.
    /// </summary>
    private static PrintParties? ParsePrintForm(string html)
    {
        string? supplierName = null;
        string? supplierInn = null;
        string? supplierKpp = null;
        string? supplierPersonalAccount = null;
        string? supplierAccount = null;
        string? supplierBankName = null;
        string? supplierBik = null;
        string? supplierCorrespondent = null;
        string? customerAccount = null;
        string? customerBankName = null;
        string? customerBik = null;

        foreach (Match rowMatch in TableRow.Matches(html))
        {
            var row = rowMatch.Groups["row"].Value;
            var cells = TableCell.Matches(row)
                .Select(match => PlainText(match.Groups["value"].Value))
                .ToList();
            if (cells.Count == 0)
            {
                continue;
            }

            var head = cells[0];
            if (head.StartsWith("Поставщик", StringComparison.OrdinalIgnoreCase))
            {
                // «Поставщик (подрядчик, исполнитель): НАИМЕНОВАНИЕ ИНН: …, КПП: …»
                supplierName = NameOf(head, "Поставщик (подрядчик, исполнитель)");
                supplierInn = MatchOrNull(InnValue, head);
                supplierKpp = MatchOrNull(KppValue, head);
                // Ячейки: 0 — сторона, 1 — тип счёта, 2 — лицевой счёт,
                // 3 — банковский счёт, 4 — банк с БИК и к/с.
                supplierPersonalAccount = CellOrNull(cells, 2);
                supplierAccount = CellOrNull(cells, 3);
                var bank = CellOrNull(cells, 4);
                supplierBankName = BankNameOf(bank);
                supplierBik = MatchOrNull(BikValue, bank);
                supplierCorrespondent = MatchOrNull(CorrespondentAccountValue, bank);
            }
            else if (head.StartsWith("Заказчик", StringComparison.OrdinalIgnoreCase))
            {
                customerAccount = CellOrNull(cells, 3);
                var bank = CellOrNull(cells, 4);
                customerBankName = BankNameOf(bank);
                customerBik = MatchOrNull(BikValue, bank);
            }
        }

        return supplierName is null && supplierInn is null
            ? null
            : new PrintParties(
                supplierName,
                supplierInn,
                supplierKpp,
                supplierPersonalAccount,
                supplierAccount,
                supplierBankName,
                supplierBik,
                supplierCorrespondent,
                customerAccount,
                customerBankName,
                customerBik);
    }

    /// <summary>Наименование стороны: текст до «ИНН:» без служебного заголовка.</summary>
    private static string? NameOf(string cell, string heading)
    {
        var index = cell.IndexOf(heading, StringComparison.OrdinalIgnoreCase);
        var rest = index < 0 ? cell : cell[(index + heading.Length)..];
        var innIndex = rest.IndexOf("ИНН", StringComparison.OrdinalIgnoreCase);
        var name = Text(innIndex > 0 ? rest[..innIndex] : rest)
            .TrimStart(':', '-', '—', ' ');
        return name.Length == 0 ? null : name;
    }

    /// <summary>Название банка без БИК и корреспондентского счёта.</summary>
    private static string? BankNameOf(string? cell)
    {
        if (cell is null)
        {
            return null;
        }

        var index = cell.IndexOf("БИК", StringComparison.OrdinalIgnoreCase);
        var name = Text(index > 0 ? cell[..index] : cell);
        return name.Length == 0 ? null : name;
    }

    /// <summary>Значение ячейки по регулярке; null — если ячейки нет или пусто.</summary>
    private static string? MatchOrNull(Regex regex, string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return null;
        }

        var match = regex.Match(value);
        return match.Success ? match.Groups["value"].Value : null;
    }

    /// <summary>Ячейка таблицы по индексу; null — если колонки нет.</summary>
    private static string? CellOrNull(IReadOnlyList<string> cells, int index)
    {
        if (cells.Count <= index)
        {
            return null;
        }

        var value = Text(cells[index]);
        return value.Length == 0 ? null : value;
    }

    /// <summary>Все секции карточки: заголовок → значение (первое вхождение).</summary>
    private static Dictionary<string, string> SectionPairs(string html)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match match in SectionPair.Matches(html))
        {
            var title = Text(match.Groups["title"].Value);
            var value = Text(match.Groups["value"].Value);
            if (title.Length == 0 || value.Length == 0 || result.ContainsKey(title))
            {
                continue;
            }

            result[title] = value;
        }

        return result;
    }

    /// <summary>Пары шапки карточки (цена, заказчик, объекты закупки).</summary>
    private static Dictionary<string, string> MainInfoPairs(string html)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match match in MainInfoPair.Matches(html))
        {
            var title = Text(match.Groups["title"].Value);
            var value = Text(match.Groups["value"].Value);
            if (title.Length == 0 || value.Length == 0 || result.ContainsKey(title))
            {
                continue;
            }

            result[title] = value;
        }

        return result;
    }

    /// <summary>Значение секции по началу заголовка: в карточке бывают уточнения.</summary>
    private static string? First(IReadOnlyDictionary<string, string> sections, string title) =>
        sections.TryGetValue(title, out var exact)
            ? exact
            : sections
                .Where(pair => pair.Key.StartsWith(title, StringComparison.OrdinalIgnoreCase))
                .Select(pair => pair.Value)
                .FirstOrDefault();

    /// <summary>Значение без разметки: в карточке часть полей — ссылки.</summary>
    private static string? Plain(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : PlainText(value);

    private static decimal? Number(string? value)
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

        var normalized = match.Value
            .Replace("\u00A0", string.Empty)
            .Replace(" ", string.Empty)
            .Replace(',', '.');
        return decimal.TryParse(
            normalized,
            NumberStyles.AllowDecimalPoint,
            CultureInfo.InvariantCulture,
            out var parsed)
            ? parsed
            : null;
    }

    /// <summary>Дата карточки («17.02.2026») → ISO («2026-02-17»).</summary>
    private static string? IsoDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var match = DateValue.Match(value);
        if (!match.Success)
        {
            return null;
        }

        return DateTime.TryParseExact(
            match.Value,
            ["dd.MM.yyyy", "yyyy-MM-dd"],
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out var date)
            ? date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            : null;
    }

    /// <summary>Текст без разметки: сущности раскрыты, пробелы схлопнуты.</summary>
    private static string PlainText(string html) =>
        Text(System.Net.WebUtility.HtmlDecode(Tag.Replace(html, " ")));

    private static string Text(string value)
    {
        var decoded = System.Net.WebUtility.HtmlDecode(value)
            .Replace("\u00A0", " ")
            .Replace("\u200B", string.Empty);
        return Whitespace.Replace(decoded, " ").Trim();
    }

    private static bool IsEmpty(ContractGeneralViewDto value) =>
        value.ContractNumber is null &&
        value.ContractDate is null &&
        value.ContractName is null &&
        value.ContractPrice is null &&
        value.Ikz is null &&
        value.CustomerName is null &&
        value.SupplierName is null &&
        value.SupplierInn is null &&
        value.AdvanceAmount is null &&
        value.ExecutionStartDate is null &&
        value.ExecutionEndDate is null;

    /// <summary>Реквизиты сторон, вытащенные из печатной формы.</summary>
    private sealed record PrintParties(
        string? SupplierName,
        string? SupplierInn,
        string? SupplierKpp,
        string? SupplierPersonalAccount,
        string? SupplierAccount,
        string? SupplierBankName,
        string? SupplierBik,
        string? SupplierCorrespondentAccount,
        string? CustomerAccount,
        string? CustomerBankName,
        string? CustomerBik);
}
