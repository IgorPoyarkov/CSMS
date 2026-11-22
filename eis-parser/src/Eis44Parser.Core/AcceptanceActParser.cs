using System.Globalization;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Разбор кириллических XML приёмки (ОН_АКТРЕЗРАБП) и платёжных поручений
/// Казначейства. Это отдельный парсер: основной EisDocumentParser остаётся
/// для извещений, контрактов и contractProcedure. Сущности БД не меняются —
/// результат сразу готов к выдаче на фронт для формирования документов.
/// </summary>
public sealed class AcceptanceActParser
{
    private static readonly CultureInfo Russian = CultureInfo.GetCultureInfo("ru-RU");

    // В поручениях Казначейства встречаются и четырёхзначные, и двухзначные года.
    private static readonly Regex ContractInPurpose = new(
        @"контракт\s*№\s*(?<num>[^,]+?)\s+от\s+(?<date>\d{2}\.\d{2}\.(?:\d{4}|\d{2}))",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex ActInPurpose = new(
        @"Документ\s+о\s+при[её]мке\s*№\s*(?<num>[^,\s]+)\s+от\s+(?<date>\d{2}\.\d{2}\.(?:\d{4}|\d{2}))",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>Признак документа о приёмке: корневой Файл с блоком СвАктСдПр.</summary>
    public static bool IsAcceptanceAct(XDocument document) =>
        document.Root is not null &&
        NameIs(document.Root, "Файл") &&
        document.Root.Descendants().Any(element => NameIs(element, "СвАктСдПр"));

    /// <summary>Признак платёжного поручения Казначейства (Росказна).</summary>
    public static bool IsPaymentOrder(XDocument document) =>
        document.Root is not null &&
        (NameIs(document.Root, "MSC_TransfOrderAcc") ||
         NameIs(document.Root, "FAM_PaymOrderCr") ||
         document.Root.Name.LocalName.Contains("PaymOrder", StringComparison.OrdinalIgnoreCase));

    /// <summary>Разобрать акт приёмки во все поля, нужные фронту.</summary>
    public AcceptanceActViewDto Parse(XDocument document, string fileName, string? sourceArchive = null)
    {
        ArgumentNullException.ThrowIfNull(document);

        var root = document.Root!;
        var info = Element(root, "Документ");
        var act = Element(info, "СвАктСдПр")
            ?? throw new InvalidOperationException($"В {fileName} нет блока СвАктСдПр.");
        var construction = Element(act, "ОсновСтроит");
        var contractVersion = Element(construction, "СведКонт");
        var contract = OwnElement(OwnElement(act, "ИдДог"), "ТипИдДок");

        var regNumber = Attr(construction, "РеестрНомКонт") ?? string.Empty;
        var actNumber = Attr(act, "НомерДок") ?? string.Empty;

        return new AcceptanceActViewDto(
            fileName,
            Attr(root, "ИдФайл") ?? string.Empty,
            sourceArchive,
            Attr(root, "ВерсПрог"),
            regNumber,
            actNumber,
            NormalizeDate(Attr(act, "ДатаДок")),
            Attr(info, "КНД"),
            NormalizeDate(Attr(info, "ДатаИнфПодр")),
            Attr(info, "ВремИнфПодр"),
            Attr(act, "НаимОб"),
            Attr(act, "КодОКВДог"),
            new ContractReferenceDto(
                Attr(contract, "НомерДок"),
                NormalizeDate(Attr(contract, "ДатаДок")),
                Attr(contractVersion, "ИдГосКон")?.Trim(),
                Attr(contractVersion, "ИдВерсКонт")),
            new StageReferenceDto(
                Attr(contractVersion, "ИдЭтапКонт"),
                Attr(contractVersion, "ТехИдЭтапКонт"),
                Attr(contractVersion, "ИКЗ")),
            ParseParties(act),
            ParseWorkItems(root),
            ParseTotals(root),
            ParsePeriod(root),
            ParseAttachments(root),
            ParseSignatories(root));
    }

    /// <summary>Разобрать платёжное поручение из Казначейства.</summary>
    public PaymentOrderViewDto ParsePaymentOrder(XDocument document, string fileName)
    {
        ArgumentNullException.ThrowIfNull(document);
        var root = document.Root!;
        var purpose = Value(root, "DepInfo_PayPurpose");
        var contract = ContractInPurpose.Match(purpose ?? string.Empty);
        var act = ActInPurpose.Match(purpose ?? string.Empty);

        return new PaymentOrderViewDto(
            fileName,
            Value(root, "AccDoc_DocNum"),
            NormalizeDate(Value(root, "AccDoc_DocDate")),
            NormalizeDate(Value(root, "ExecDate")),
            ParseMoney(FirstNonEmpty(
                Value(root, "BasicRequisites_PaySum"),
                Value(root, "PayAmountRub"))),
            Value(root, "StmInfrmtn_ReestrNumGK"),
            purpose,
            contract.Success ? contract.Groups["num"].Value.Trim() : null,
            contract.Success ? NormalizeDate(contract.Groups["date"].Value) : null,
            act.Success ? act.Groups["num"].Value.Trim() : null,
            act.Success ? NormalizeDate(act.Groups["date"].Value) : null,
            Value(root, "Payer_INN"),
            Value(root, "Payer_KPP"),
            Value(root, "Payer_Name"),
            Value(root, "Recip_INN"),
            Value(root, "Recip_KPP"),
            Value(root, "Recip_Name"),
            Value(root, "IGK"),
            Value(root, "StmInfrmtn_IdDoc"),
            NormalizeDate(Value(root, "AddInfo_ChargeOffDate") ?? Value(root, "MarksCS_DateFAH")),
            Value(root, "AddInfo_ED2_EDNo"),
            NormalizeDate(Value(root, "AddInfo_ED2_EDDate")),
            Value(root, "Payer_BIK"),
            Value(root, "Payer_CheckAcc"),
            Value(root, "Payer_BankName"),
            Value(root, "Recip_BIK"),
            Value(root, "Recip_CheckAcc"),
            Value(root, "Recip_BankName"),
            Value(root, "StmInfrmtn_Sum1"),
            Value(root, "BasicRequisites_PayType"),
            Value(root, "KBK"));
    }

    private static List<AcceptancePartyDto> ParseParties(XElement act)
    {
        var result = new List<AcceptancePartyDto>();
        AddParty(result, "Подрядчик", Element(act, "СвПодр"));
        AddParty(result, "Заказчик", Element(act, "СвЗак"));
        return result;
    }

    private static void AddParty(List<AcceptancePartyDto> result, string role, XElement? container)
    {
        if (container is null)
        {
            return;
        }

        var party = OwnElement(container, "СвСторДог");
        var organization = Element(party, "СвЮЛУч");
        var address = Element(container, "АдрИнф")
            ?? Element(container, "АдрРФ");
        var bank = Element(container, "БанкРекв");

        result.Add(new AcceptancePartyDto(
            role,
            Attr(organization, "НаимОрг"),
            Attr(party, "КраткНазв"),
            Attr(organization, "ИННЮЛ"),
            Attr(organization, "КПП"),
            Attr(party, "ИнфДляУчаст"),
            address is null
                ? null
                : string.Join(
                    ", ",
                    new[]
                    {
                        Attr(address, "Индекс"), Attr(address, "КодРегион"), Attr(address, "Город"),
                        Attr(address, "Улица"), Attr(address, "Дом"), Attr(address, "АдрТекст"),
                    }.Where(value => !string.IsNullOrWhiteSpace(value))),
            Value(container, "Тлф"),
            Value(container, "ЭлПочта"),
            bank is null
                ? null
                : new BankRequisitesDto(
                    Attr(bank, "ЛицСчетКС"),
                    Attr(bank, "БИК"),
                    Attr(bank, "НаимБанкТОФК"),
                    Attr(bank, "ЕдинКазнСчет"),
                    Attr(bank, "КазнСчет"),
                    Attr(bank, "КонтрагентНаим"),
                    Attr(bank, "ИдПлатежнРеквКонт"))));
    }

    private static List<AcceptanceWorkItemDto> ParseWorkItems(XElement root)
    {
        // <СведТРУКонт> лежит рядом с ВидРаб (в НаимИСт/ДопПолеСтрИнф), поэтому
        // собираем идентификаторы КТРУ по номеру строки отдельно.
        var ktruByLine = root.Descendants()
            .Where(element => NameIs(element, "СведТРУКонт"))
            .GroupBy(element => Attr(element, "НомСтр") ?? string.Empty, StringComparer.Ordinal)
            .ToDictionary(
                group => group.Key,
                group => group.First(),
                StringComparer.Ordinal);

        return root.Descendants()
            .Where(element => NameIs(element, "ВидРаб"))
            .Select(item =>
            {
                var code = Element(item, "КодТов");
                var okpd2Element = code ?? item;
                var (okpd2Code, ktruCode) = ClassifierCodes.Split(
                    Attr(code, "Код") ?? Attr(item, "ОКПД2") ?? Attr(item, "ОКПД"));
                ktruByLine.TryGetValue(Attr(item, "НомСтр") ?? string.Empty, out var ktru);
                var (_, ktruFromBlock) = ClassifierCodes.Split(Attr(ktru, "КодТов"));

                return new AcceptanceWorkItemDto(
                    Attr(item, "НомСтр"),
                    Attr(item, "НаимТов"),
                    okpd2Code,
                    Attr(code, "Наим") ?? Attr(okpd2Element, "ОКПД2Name"),
                    ktruCode ?? ktruFromBlock,
                    Attr(ktru, "ИдТРУ"),
                    Attr(ktru, "ТехИдТРУ"),
                    Attr(ktru, "ЭАИдТРУ"),
                    Value(item, "КолТов"),
                    Attr(item, "НаимЕдИзм"),
                    ParseMoney(Attr(item, "ЦенаТов")),
                    ParseMoney(Attr(item, "СтТовБезНДС")),
                    ParseMoney(Attr(item, "СтТовУчНал")),
                    Value(item, "НалСтПостр") ?? Attr(item, "НалСтПостр"),
                    ParseMoney(Value(item, "СумНал")));
            })
            .ToList();
    }

    private static AcceptanceTotalsDto ParseTotals(XElement root)
    {
        var total = Element(root, "ВсегоАктОтч");
        return new AcceptanceTotalsDto(
            ParseMoney(Attr(total, "СтТовБезНДСВсего")),
            ParseMoney(Attr(total, "СтТовУчНалВсего")),
            ParseMoney(Value(total, "СумНалВсего")));
    }

    private static AcceptancePeriodDto? ParsePeriod(XElement root)
    {
        var period = Element(root, "СвПер");
        return period is null
            ? null
            : new AcceptancePeriodDto(
                NormalizeDate(Attr(period, "НачПерВДок")),
                NormalizeDate(Attr(period, "ОконПерВДок")),
                NormalizeDate(Attr(period, "ДатПредъявЗак")),
                Attr(period, "СодОпер"));
    }

    private static List<AcceptanceAttachmentDto> ParseAttachments(XElement root) =>
        root.Descendants()
            .Where(element => NameIs(element, "Вложен"))
            .Select(item => new AcceptanceAttachmentDto(
                Attr(item, "КонтентИд"),
                Attr(item, "ИмяФайл"),
                Attr(item, "ХэшФайл"),
                Attr(item, "РасширенФайл"),
                Attr(item, "ДатаПрикреплен"),
                Value(item, "Наим") ?? Attr(Element(item, "ВидДок"), "Наим")))
            .ToList();

    private static List<AcceptanceSignatoryDto> ParseSignatories(XElement root) =>
        root.Descendants()
            .Where(element => NameIs(element, "Подписант"))
            .Select(item =>
            {
                var fio = Element(item, "ФИО");
                return new AcceptanceSignatoryDto(
                    Attr(item, "Должн") ?? Attr(item, "Должность"),
                    Attr(fio, "Фамилия"),
                    Attr(fio, "Имя"),
                    Attr(fio, "Отчество"),
                    Attr(Element(item.Parent, "ДопИнф"), "ОснПолн") ?? Attr(item, "ОблПолн"));
            })
            .ToList();

    // Большинство блоков в кириллических XML вложены через ДопПолеСтрИнф/ИдСв,
    // поэтому поиск идёт по всем потомкам. Прямые дети нужны только там, где
    // важен порядок (например, ИдДог → ТипИдДок).
    private static XElement? Element(XElement? parent, params string[] localNames)
    {
        if (parent is null)
        {
            return null;
        }

        foreach (var localName in localNames)
        {
            var found = parent.Descendants()
                .FirstOrDefault(element => NameIs(element, localName));
            if (found is not null)
            {
                return found;
            }
        }

        return null;
    }

    private static XElement? OwnElement(XElement? parent, string localName) =>
        parent?.Elements().FirstOrDefault(element => NameIs(element, localName));

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

    // Даты в кириллических XML приходят как 25.09.2026, в ЕИС — как 2026-09-25.
    private static string? NormalizeDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        if (trimmed.Length == 10 &&
            DateTime.TryParseExact(trimmed, "dd.MM.yyyy", Russian, DateTimeStyles.None, out var parsed))
        {
            return parsed.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        if (trimmed.Length == 8 &&
            DateTime.TryParseExact(trimmed, "dd.MM.yy", Russian, DateTimeStyles.None, out var shortYear))
        {
            return shortYear.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        return value.Length >= 10 && value[4] == '-' && value[7] == '-'
            ? value[..10]
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

        return decimal.TryParse(value, NumberStyles.Any, Russian, out var russian)
            ? russian
            : null;
    }
}
