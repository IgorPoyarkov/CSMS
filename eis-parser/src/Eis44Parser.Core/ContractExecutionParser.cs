using System.Globalization;
using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Разбор исполнения контракта из XML 2026 года: этапы и документы о приёмке.
/// Результат — проекция для карточки контракта, а не сущность БД: сырой XML
/// уже лежит в raw_documents, новая запись для каждого акта не создаётся.
/// </summary>
public sealed class ContractExecutionParser
{
    private static readonly string[] AcceptanceElementNames =
        ["docAcceptance", "contractExecutionDocAcceptance", "ceContractExecutionDocAcceptance"];

    /// <summary>Признак документа исполнения: корневой contractProcedure или export с ним.</summary>
    public static bool IsContractExecution(XDocument document)
    {
        var root = document.Root;
        if (root is null)
        {
            return false;
        }

        return NameIs(root, "export")
            ? root.Elements().Any(IsProcedureElement)
            : IsProcedureElement(root);
    }

    /// <summary>Собрать дерево «этап → акты приёмки» из одного XML.</summary>
    public ContractExecutionViewDto Parse(XDocument document, string fileName)
    {
        ArgumentNullException.ThrowIfNull(document);

        var root = document.Root;
        var element = root is not null && NameIs(root, "export")
            ? root.Elements().FirstOrDefault(IsProcedureElement) ?? root
            : root;

        // Для кириллических форм актов номер лежит в атрибуте РеестрНомКонт.
        // Для ЕИС-экспорта — в непосредственном ребёнке <regNum>.
        var regNumber = NormalizeRegNumber(
                GetOwnValue(element, "regNum") ?? GetValue(root, "РеестрНомКонт", "regNumber", "contractRegNum"))
            ?? string.Empty;

        var nodes = element?.DescendantsAndSelf() ?? [];
        var groups = nodes.Where(item => NameIs(item, "executions")).ToList();
        var allActs = nodes.Where(IsAcceptanceElement).ToList();

        var stages = new List<ContractStageDto>();
        foreach (var group in groups)
        {
            var acts = allActs.Where(act => act.Ancestors().Contains(group)).ToList();
            var stage = group.Elements().FirstOrDefault(item => NameIs(item, "stage"));
            if (stage is null && acts.Count == 0)
            {
                continue;
            }

            var index = ParseInt(GetValue(stage, "indexNum"))
                ?? (groups.Count == 1 ? 1 : groups.IndexOf(group) + 1);
            stages.Add(new ContractStageDto(
                index,
                GetValue(stage, "sid", "externalSid"),
                GetValue(stage, "stageName", "name"),
                GetValue(stage, "startDate"),
                GetValue(stage, "endDate"),
                ParseInt(GetOwnValue(group, "ordinalNumber")),
                MergeActs(acts.Select(act => ParseAct(act, regNumber)))));
        }

        // В ЕИС документ без признака этапности относится к первому (единственному)
        // этапу. Акты вне блока executions кладём туда же, не создавая новых сущностей.
        var unassigned = allActs
            .Where(act => !groups.Any(group => act.Ancestors().Contains(group)))
            .ToList();
        if (unassigned.Count > 0)
        {
            var firstIndex = stages.FirstOrDefault(stage => stage.Index == 1);
            var acts = unassigned.Select(act => ParseAct(act, regNumber)).ToList();
            if (firstIndex is null)
            {
                stages.Add(new ContractStageDto(1, null, null, null, null, null, acts));
            }
            else
            {
                stages[stages.IndexOf(firstIndex)] = firstIndex with
                {
                    Acts = MergeActs([.. firstIndex.Acts, .. acts]),
                };
            }
        }

        return new ContractExecutionViewDto(
            fileName,
            regNumber,
            stages.OrderBy(item => item.Index).ToList());
    }

    /// <summary>
    /// Один и тот же акт встречается в нескольких версиях contractProcedure:
    /// ранняя версия содержит только номер и дату, поздняя — сумму и guidEDI.
    /// Оставляем самую полную запись, чтобы фронт не показывал дубли.
    /// </summary>
    private static List<ContractAcceptanceActDto> MergeActs(IEnumerable<ContractAcceptanceActDto> acts)
    {
        var result = new List<ContractAcceptanceActDto>();
        foreach (var act in acts)
        {
            var key = act.Sid ?? act.DocumentNumber;
            var index = key is null ? -1 : result.FindIndex(item => (item.Sid ?? item.DocumentNumber) == key);
            if (index < 0)
            {
                result.Add(act);
            }
            else if (Completeness(act) > Completeness(result[index]))
            {
                result[index] = act;
            }
        }

        return result;
    }

    private static int Completeness(ContractAcceptanceActDto act) =>
        (act.Sum is null ? 0 : 1) +
        (act.AcceptanceDate is null ? 0 : 1) +
        (act.GuidEdi is null ? 0 : 1);

    /// <summary>
    /// Проекция по всем XML одного контракта: версии одного акта из разных
    /// документов схлопываются, этапы объединяются по номеру.
    /// </summary>
    public ContractExecutionViewDto ParseAll(IEnumerable<(XDocument Document, string FileName)> documents)
    {
        ArgumentNullException.ThrowIfNull(documents);

        var views = documents.Select(item => Parse(item.Document, item.FileName)).ToList();
        var regNumber = views.FirstOrDefault(view => view.RegNumber.Length > 0)?.RegNumber ?? string.Empty;
        var stages = new Dictionary<int, ContractStageDto>();

        foreach (var stage in views.SelectMany(view => view.Stages))
        {
            if (stages.TryGetValue(stage.Index, out var existing))
            {
                stages[stage.Index] = existing with
                {
                    Acts = MergeActs([.. existing.Acts, .. stage.Acts]),
                };
            }
            else
            {
                stages[stage.Index] = stage with { Acts = MergeActs(stage.Acts) };
            }
        }

        var fileName = views.Count == 1
            ? views[0].FileName
            : $"{views.Count} документов";
        return new ContractExecutionViewDto(fileName, regNumber, stages.Values.OrderBy(item => item.Index).ToList());
    }

    private static ContractAcceptanceActDto ParseAct(XElement act, string regNumber) =>
        new(
            regNumber,
            GetValue(act, "sid", "externalSid"),
            GetValue(act, "documentNum", "documentNumber"),
            NormalizeDate(GetValue(act, "documentDate")),
            NormalizeDate(GetValue(act, "deliveryAcceptDate")),
            ParseMoney(FirstNonEmpty(
                GetValue(act, "totalPaymentAmount"),
                GetValue(act, "fulfilmentSum"),
                GetValue(act, "paid"))),
            ParseInt(GetValue(act, "ordinalNumber")),
            GetValue(act, "guidEDI") ?? GetValue(act.Parent, "guidEDI"));

    private static bool IsProcedureElement(XElement element) =>
        NameIs(element, "contractProcedure") ||
        AcceptanceElementNames.Any(name => NameIs(element, name));

    private static bool IsAcceptanceElement(XElement element) =>
        AcceptanceElementNames.Any(name => NameIs(element, name));

    private static bool NameIs(XElement element, string localName) =>
        element.Name.LocalName.Equals(localName, StringComparison.OrdinalIgnoreCase);

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

    private static string? GetValue(XElement? element, params string[] localNames)
    {
        if (element is null)
        {
            return null;
        }

        foreach (var localName in localNames)
        {
            var own = element.Elements()
                .FirstOrDefault(child => NameIs(child, localName))
                ?.Value;
            if (!string.IsNullOrWhiteSpace(own))
            {
                return own.Trim();
            }

            var nested = element.Descendants()
                .FirstOrDefault(child => NameIs(child, localName))
                ?.Value;
            if (!string.IsNullOrWhiteSpace(nested))
            {
                return nested.Trim();
            }
        }

        return null;
    }

    // В печатной форме дата может прийти как 2026-08-24+03:00 — фронту нужна дата.
    private static string? NormalizeDate(string? value) =>
        value is not null && value.Length >= 10 && value[4] == '-' && value[7] == '-'
            ? value[..10]
            : value;

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));

    private static string? NormalizeRegNumber(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var digits = new string(value.Where(char.IsDigit).ToArray());
        return digits.Length is >= 15 and <= 20 ? digits : null;
    }

    private static int? ParseInt(string? value) =>
        int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var result)
            ? result
            : null;

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
