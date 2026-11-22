using System.Globalization;
using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Разбор подтаблицы «Информация о привлечении СМП, СОНО» из XML контракта
/// карточки ЕИС: условие контракта (требуемый процент и ответственность) и
/// фактические сведения subContractorsSum — субподрядчики с реквизитами
/// субдоговоров. Условие заполнено у контрактов с ч. 5 ст. 30 44-ФЗ, сведения
/// о привлечении появляются только после их публикации заказчиком.
///
/// Разбор отдельный от <see cref="EisDocumentParser"/>: там субподрядчики идут
/// в конвейер основной БД, а здесь нужен только снимок для проекции карточки.
/// Правила чтения те же — статус 30/40, ИНН как ключ, дедупликация по
/// «ИНН + номер субдоговора», иначе повторные договоры одного СМП схлопнутся.
/// </summary>
public sealed class ContractSmpParser
{
    /// <summary>
    /// Есть ли в XML подтаблица СМП. Два источника: фактические сведения
    /// (subContractorsSum/subContractors) и условие контракта
    /// (subcontractorsAttractionConditionsInfo) — второе заполнено у всех
    /// контрактов с требованием привлечения СМП, даже если субподрядчиков
    /// заказчик ещё не опубликовал.
    /// </summary>
    public static bool IsSmpDocument(XDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);
        var root = document.Root;
        if (root is null)
        {
            return false;
        }

        return root.DescendantsAndSelf().Any(element =>
            NameIs(element, "subContractorsSum")
            || NameIs(element, "subcontractorsAttractionConditionsInfo")
            || (NameIs(element, "subContractors")
                && element.Elements().Any(child => NameIs(child, "subContractor"))));
    }

    /// <summary>Проекция подтаблицы СМП для карточки контракта.</summary>
    public ContractSmpViewDto Parse(XDocument document, string fileName)
    {
        ArgumentNullException.ThrowIfNull(document);
        var root = document.Root
            ?? throw new InvalidOperationException("Пустой XML: нет корневого элемента.");

        var summary = First(root, "subContractorsSum");
        // Условие контракта: процент требования и текст ответственности.
        // Оно есть и тогда, когда фактических субподрядчиков ещё нет.
        var conditions = First(root, "subcontractorsAttractionConditionsInfo");

        return new ContractSmpViewDto(
            RequirementPercent: ParseMoney(GetOwnValue(summary, "sumInPercents"))
                ?? ParseMoney(GetOwnValue(conditions, "subcontractorsAttractionVolume")),
            RequirementSum: ParseMoney(
                GetOwnValue(summary, "priceValueRUR") ?? GetOwnValue(summary, "priceValue")),
            Responsibility: GetOwnValue(conditions, "responsibility"),
            Subcontractors: ParseSubcontractors(root),
            SourceFile: fileName);
    }

    private static IReadOnlyList<SubcontractorDto> ParseSubcontractors(XElement root)
    {
        var result = new List<SubcontractorDto>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var container in root.DescendantsAndSelf().Where(element =>
                     NameIs(element, "subContractors")))
        {
            foreach (var contractor in container.Elements().Where(child =>
                         NameIs(child, "subContractor")))
            {
                // Юрлицо или ИП: ИНН в обеих ветках — прямой ребёнок.
                var party = contractor.Elements()
                                .FirstOrDefault(child => NameIs(child, "legalEntityRF"))
                            ?? contractor.Elements()
                                .FirstOrDefault(child => NameIs(child, "individualBusinessmanRF"));
                if (party is null)
                {
                    continue;
                }

                var inn = GetOwnValue(party, "INN");
                if (string.IsNullOrWhiteSpace(inn))
                {
                    continue;
                }

                var statusInfo = party.Elements()
                    .FirstOrDefault(child => NameIs(child, "statusInfo"));
                var contractInfo = party.Elements()
                    .FirstOrDefault(child => NameIs(child, "subContractInfo"));

                var dto = new SubcontractorDto(
                    Inn: inn.Trim(),
                    Kpp: GetOwnValue(party, "KPP"),
                    // У ИП нет fullName: ФИО лежит отдельными полями.
                    Name: GetOwnValue(party, "fullName", "shortName", "name")
                        ?? BuildIndividualName(party),
                    StatusCode: GetOwnValue(statusInfo, "code"),
                    StatusName: GetOwnValue(statusInfo, "name"),
                    ContractSum: ParseMoney(GetValue(contractInfo, "price")),
                    ContractDate: GetOwnValue(contractInfo, "subContractDate"),
                    ContractNumber: GetOwnValue(contractInfo, "subContractNumber"),
                    ContractSubject: GetOwnValue(contractInfo, "subContractSubject"),
                    Okpd2Code: GetOkpd2Code(party));

                // Один ИНН может встречаться с разными субдоговорами,
                // поэтому ключ — ИНН + номер договора, а не только ИНН.
                if (seen.Add($"{dto.Inn}|{dto.ContractNumber}"))
                {
                    result.Add(dto);
                }
            }
        }

        return result;
    }

    private static bool NameIs(XElement element, string localName) =>
        element.Name.LocalName.Equals(localName, StringComparison.OrdinalIgnoreCase);

    private static XElement? First(XElement root, string localName) =>
        root.DescendantsAndSelf().FirstOrDefault(element => NameIs(element, localName));

    private static string? GetOwnValue(XElement? element, params string[] localNames)
    {
        if (element is null)
        {
            return null;
        }

        foreach (var localName in localNames)
        {
            var value = element.Elements()
                .FirstOrDefault(child => NameIs(child, localName))
                ?.Value;
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
    }

    private static string? GetValue(XElement? root, params string[] localNames)
    {
        if (root is null)
        {
            return null;
        }

        foreach (var localName in localNames)
        {
            var value = root.DescendantsAndSelf()
                .FirstOrDefault(element => NameIs(element, localName))
                ?.Value;
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }
        }

        return null;
    }

    private static string? BuildIndividualName(XElement party)
    {
        var parts = new[] { "lastName", "firstName", "middleName" }
            .Select(field => GetOwnValue(party, field))
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .ToArray();

        return parts.Length == 0 ? null : string.Join(" ", parts);
    }

    private static string? GetOkpd2Code(XElement party)
    {
        var okpd2 = party.DescendantsAndSelf()
            .FirstOrDefault(element => NameIs(element, "OKPD2"));

        return GetOwnValue(okpd2, "code");
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

        return decimal.TryParse(value, NumberStyles.Any, CultureInfo.GetCultureInfo("ru-RU"), out var russian)
            ? russian
            : null;
    }
}
