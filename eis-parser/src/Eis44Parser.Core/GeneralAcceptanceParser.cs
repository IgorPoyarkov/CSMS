using System.Globalization;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Разбор упрощённой формы документов о приёмке ОН_НСЧФДОПPR (КНД 1115131,
/// счёт-фактура и документ об отгрузке). У многих контрактов заказчика акты
/// приходят именно в этой форме, поэтому она включена в общую проекцию актов —
/// фронт получает одинаковый набор полей независимо от формы документа.
/// </summary>
public sealed class GeneralAcceptanceParser
{
    private static readonly CultureInfo Russian = CultureInfo.GetCultureInfo("ru-RU");

    private static readonly Regex RegNumberInText = new(
        @"Реестровый номер в реестре контрактов:\s*(\d{19})",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Признак упрощённого документа о приёмке: блок СвСчФакт.</summary>
    public static bool IsGeneralAcceptanceDocument(XDocument document) =>
        document.Root is not null &&
        NameIs(document.Root, "Файл") &&
        document.Root.Descendants().Any(element => NameIs(element, "СвСчФакт"));

    /// <summary>Разобрать документ в ту же проекцию, что и ОН_АКТРЕЗРАБП.</summary>
    public AcceptanceActViewDto Parse(XDocument document, string fileName, string? sourceArchive = null)
    {
        ArgumentNullException.ThrowIfNull(document);

        var root = document.Root!;
        var doc = Element(root, "Документ");
        var fact = Element(doc, "СвСчФакт");
        var confirmation = Element(fact, "ДокПодтвОтгрНом");
        var contractInfo = Element(fact, "ИнфПродЗаГоскКазн");
        var period = Element(doc, "СвПер");
        var regNumberMatch = RegNumberInText.Match(AttrAnywhere(doc, "РеквДопСведДок") ?? string.Empty);

        return new AcceptanceActViewDto(
            fileName,
            Attr(root, "ИдФайл") ?? string.Empty,
            sourceArchive,
            Attr(root, "ВерсПрог"),
            regNumberMatch.Groups[1].Value,
            Attr(fact, "НомерДок") ?? Attr(confirmation, "РеквНомерДок") ?? string.Empty,
            NormalizeDate(Attr(fact, "ДатаДок") ?? Attr(confirmation, "РеквДатаДок")),
            Attr(doc, "КНД"),
            NormalizeDate(Attr(doc, "ДатаИнфПр")),
            Attr(doc, "ВремИнфПр"),
            Attr(doc, "ПоФактХЖ") ?? Attr(doc, "НаимДокОпр"),
            Attr(Element(fact, "ДенИзм"), "КодОКВ"),
            new ContractReferenceDto(
                Attr(contractInfo, "НомерГосКонт"),
                NormalizeDate(Attr(contractInfo, "ДатаГосКонт")),
                Attr(contractInfo, "НомерГосКонт"),
                null),
            null,
            ParseParties(fact),
            ParseWorkItems(doc),
            ParseTotals(doc),
            period is null
                ? null
                : new AcceptancePeriodDto(
                    NormalizeDate(Attr(period, "ДатаПер")),
                    null,
                    null,
                    Attr(period, "СодОпер")),
            [],
            ParseSignatories(doc));
    }

    private static List<AcceptancePartyDto> ParseParties(XElement? fact)
    {
        var result = new List<AcceptancePartyDto>();
        AddParty(result, "Подрядчик", Element(fact, "СвПрод"));
        AddParty(result, "Заказчик", Element(fact, "СвПокуп"));
        return result;
    }

    private static void AddParty(List<AcceptancePartyDto> result, string role, XElement? container)
    {
        if (container is null)
        {
            return;
        }

        var organization = Element(container, "СвЮЛУч") ?? Element(container, "СвИП");
        var address = Element(container, "АдрИнф") ?? Element(container, "АдрРФ");
        var bank = Element(container, "Банк");

        result.Add(new AcceptancePartyDto(
            role,
            Attr(organization, "НаимОрг"),
            Attr(container, "СокрНаим"),
            Attr(organization, "ИННЮЛ") ?? Attr(organization, "ИННФЛ"),
            Attr(organization, "КПП"),
            Attr(container, "ИнфДляУчаст"),
            address is null
                ? null
                : FirstNonEmpty(
                    Attr(address, "АдрТекст"),
                    string.Join(
                        ", ",
                        new[]
                        {
                            Attr(address, "Индекс"), Attr(address, "КодРегион"), Attr(address, "Город"),
                            Attr(address, "Улица"), Attr(address, "Дом"),
                        }.Where(value => !string.IsNullOrWhiteSpace(value)))),
            Value(container, "Тлф"),
            Value(container, "ЭлПочта"),
            bank is null
                ? null
                : new BankRequisitesDto(
                    Attr(bank, "ЛицСчет"),
                    Attr(bank, "БИК"),
                    Attr(bank, "НаимБанк"),
                    Attr(bank, "КазнСчет"),
                    Attr(bank, "ЕдинКазнСчет"),
                    Attr(bank, "НаимКазнОрг"),
                    null)));
    }

    private static List<AcceptanceWorkItemDto> ParseWorkItems(XElement? doc) =>
        (doc?.Descendants() ?? Enumerable.Empty<XElement>())
            .Where(element => NameIs(element, "СведТов"))
            .Select(item => new AcceptanceWorkItemDto(
                Attr(item, "НомСтр"),
                Attr(item, "НаимТов"),
                Attr(Element(item, "ДопСведТов"), "КодТов"),
                Attr(item, "КолТов"),
                Attr(item, "НаимЕдИзм"),
                ParseMoney(Attr(item, "ЦенаТов")),
                ParseMoney(Attr(item, "СтТовБезНДС")),
                ParseMoney(Attr(item, "СтТовУчНал")),
                Attr(item, "НалСт"),
                ParseMoney(Value(item, "СумНал"))))
            .ToList();

    private static AcceptanceTotalsDto ParseTotals(XElement? doc)
    {
        var total = Element(doc, "ВсегоОпл");
        return new AcceptanceTotalsDto(
            ParseMoney(Attr(total, "СтТовБезНДСВсего")),
            ParseMoney(Attr(total, "СтТовУчНалВсего")),
            ParseMoney(Value(total, "СумНалВсего")));
    }

    private static List<AcceptanceSignatoryDto> ParseSignatories(XElement? doc) =>
        (doc?.Descendants() ?? Enumerable.Empty<XElement>())
            .Where(element => NameIs(element, "Подписант"))
            .Select(element =>
            {
                var fio = Element(element, "ФИО");
                return new AcceptanceSignatoryDto(
                    Attr(element, "Должн") ?? Attr(element, "Должность"),
                    Attr(fio, "Фамилия"),
                    Attr(fio, "Имя"),
                    Attr(fio, "Отчество"),
                    Attr(element, "ДопСведПодп"));
            })
            .ToList();

    private static XElement? Element(XElement? parent, string localName) =>
        parent?.Descendants().FirstOrDefault(element => NameIs(element, localName));

    private static string? AttrAnywhere(XElement? parent, string localName) =>
        parent?.DescendantsAndSelf()
            .Attributes()
            .FirstOrDefault(attribute => attribute.Name.LocalName == localName)
            ?.Value;

    private static string? Attr(XElement? element, string localName) =>
        element?.Attributes()
            .FirstOrDefault(attribute => attribute.Name.LocalName == localName)
            ?.Value is { } value && !string.IsNullOrWhiteSpace(value)
                ? value.Trim()
                : null;

    private static string? Value(XElement? element, string localName) =>
        element?.DescendantsAndSelf()
            .FirstOrDefault(item => NameIs(item, localName))
            ?.Value is { } value && !string.IsNullOrWhiteSpace(value)
                ? value.Trim()
                : null;

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));

    private static bool NameIs(XElement element, string localName) =>
        element.Name.LocalName.Equals(localName, StringComparison.OrdinalIgnoreCase);

    private static string? NormalizeDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return DateTime.TryParseExact(
            value.Trim(), "dd.MM.yyyy", Russian, DateTimeStyles.None, out var parsed)
            ? parsed.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            : value.Trim();
    }

    private static decimal? ParseMoney(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var invariant))
        {
            return invariant;
        }

        return decimal.TryParse(value, NumberStyles.Any, Russian, out var russian) ? russian : null;
    }
}
