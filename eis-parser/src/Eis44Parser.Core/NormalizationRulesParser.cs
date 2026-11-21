using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Маппинг публичного XML печатаемой формы реестра правил нормирования.
/// Корень — &lt;fcsRegulationRules&gt;, он же описан в XSD 17.0 как
/// zfcs_regulationRulesType (IntegrationTypes.xsd). Теги ищем по LocalName:
/// префиксы пространств имён в печатных формах меняются между релизами.
/// </summary>
public sealed class NormalizationRulesParser
{
    /// <summary>Типы правил нормирования из zfcs_regulationRulesTypeEnum.</summary>
    private static readonly Dictionary<int, string> RuleTypes = new()
    {
        [1] = "Общие правила нормирования в сфере закупок",
        [2] = "Общие требования к правовым актам по нормированию",
        [3] = "Общие правила определения требований к отдельным видам товаров, работ, услуг",
        [4] = "Общие правила определения нормативных затрат",
        [5] = "Правила нормирования в сфере закупок",
        [6] = "Требования к правовым актам по нормированию",
        [7] = "Требования к отдельным видам товаров, работ, услуг",
        [8] = "Правила определения нормативных затрат",
        [9] = "Нормативные затраты",
        [10] = "Правила определения требований к отдельным видам товаров, работ, услуг",
    };

    /// <summary>Виды документа из zfcs_regulationRulesBaseDocumentTypeEnum.</summary>
    private static readonly Dictionary<int, string> BaseDocumentTypes = new()
    {
        [1] = "Указ",
        [2] = "Распоряжение",
        [3] = "Постановление",
        [4] = "Приказ",
        [5] = "Письмо",
        [6] = "Протокол",
        [7] = "Иное",
    };

    /// <summary>Типы вложений из zfcs_regulationRulesDocumentsEnum.</summary>
    private static readonly Dictionary<int, string> AttachmentTypes = new()
    {
        [1] = "Проект правил нормирования",
        [2] = "Пояснительная записка к проекту",
        [3] = "Предложения (устарело)",
        [4] = "Ответы на предложения (устарело)",
        [5] = "Протокол общественного совета (устарело)",
        [6] = "Правила, принятые после обсуждения",
        [7] = "Утверждённые правила нормирования",
        [8] = "Протокол общественного обсуждения",
    };

    private static readonly Dictionary<string, string> ApprovedForNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["central"] = "ГО, ОУ ГВФ, МО",
        ["territorial"] = "Территориальные органы",
        ["treasury"] = "Казённые учреждения",
        ["budgetary"] = "Бюджетные учреждения",
        ["unitary"] = "Унитарные предприятия",
        ["scientific"] = "Наука, образование, культура, здравоохранение",
        ["Rosatom"] = "Росатом",
        ["Roskosmos"] = "Роскосмос",
    };

    /// <summary>Признак того, что XML — версия правил нормирования.</summary>
    public static bool IsRegulationRules(XDocument document) =>
        string.Equals(document.Root?.Name.LocalName, "fcsRegulationRules", StringComparison.OrdinalIgnoreCase);

    /// <summary>Разобрать печатную форму; другое корневой элемент — ошибка.</summary>
    public RegulationRuleDocument Parse(XDocument document, string fileName)
    {
        ArgumentNullException.ThrowIfNull(document);
        var root = document.Root;
        if (!IsRegulationRules(document) || root is null)
        {
            throw new ArgumentException("Ожидается корневой элемент fcsRegulationRules.", nameof(document));
        }

        var publishOrg = Child(root, "publishOrg");
        var approval = Child(root, "approvedFrom");
        var approveFor = Child(root, "approveFor");
        var baseDocument = Child(root, "baseDocument");
        var discussion = Child(root, "discussion");
        var term = Child(discussion, "term");
        var typeCode = ReadInt(Value(root, "type"));

        var regions = Elements(root, "regions", "region");
        var regionCodes = regions.Select(region => Value(region, "code")).OfType<string>().ToArray();
        var regionNames = regions.Select(region => Value(region, "name")).OfType<string>().ToArray();

        return new RegulationRuleDocument(
            fileName,
            ReadLong(Value(root, "id")),
            Value(root, "registryNum") ?? "",
            Value(root, "docPublishDate"),
            typeCode,
            RuleTypes.TryGetValue(typeCode, out var typeName) ? typeName : $"Неизвестный тип ({typeCode})",
            Value(root, "state"),
            Value(publishOrg, "fullName"),
            Value(publishOrg, "regNum"),
            Value(publishOrg, "INN"),
            Value(publishOrg, "KPP"),
            Child(approval, "publishOrg") is { } approver ? Value(approver, "fullName") : null,
            Child(approval, "government") is not null,
            approveFor?.Elements()
                .Where(element => ApprovedForNames.ContainsKey(element.Name.LocalName) &&
                    element.Value.Equals("true", StringComparison.OrdinalIgnoreCase))
                .Select(element => ApprovedForNames[element.Name.LocalName])
                .ToArray() ?? [],
            regionCodes,
            regionNames,
            Value(baseDocument, "name"),
            NullIfEmpty(Value(baseDocument, "number")),
            Value(baseDocument, "date"),
            ReadNullableInt(Value(baseDocument, "type")),
            BaseDocumentType(Value(baseDocument, "type")),
            NullIfEmpty(Value(discussion, "addInfo")) ?? NullIfEmpty(Value(root, "addInfo")),
            Value(term, "startDate"),
            Value(term, "endDate"),
            Elements(root, "documents", "document").Select(ParseAttachment).ToArray(),
            document.ToString(SaveOptions.DisableFormatting));
    }

    private static RegulationRuleAttachment ParseAttachment(XElement element)
    {
        var typeCode = ReadInt(Value(element, "type"));
        return new RegulationRuleAttachment(
            Value(element, "publishedContentId") ?? "",
            Value(element, "fileName") ?? "",
            NullIfEmpty(Value(element, "docDescription")),
            ReadNullableLong(Value(element, "fileSize")),
            Value(element, "url") ?? "",
            typeCode,
            AttachmentTypes.TryGetValue(typeCode, out var typeName) ? typeName : $"Неизвестный тип ({typeCode})",
            Value(element, "placingDate"));
    }

    private static string? BaseDocumentType(string? value) =>
        ReadNullableInt(value) is { } code && BaseDocumentTypes.TryGetValue(code, out var name) ? name : null;

    private static XElement? Child(XElement? parent, string localName) =>
        parent?.Elements().FirstOrDefault(element =>
            element.Name.LocalName.Equals(localName, StringComparison.OrdinalIgnoreCase));

    private static IReadOnlyList<XElement> Elements(XElement? parent, string containerName, string itemName) =>
        Child(parent, containerName)?.Elements()
            .Where(element => element.Name.LocalName.Equals(itemName, StringComparison.OrdinalIgnoreCase))
            .ToArray() ?? [];

    private static string? Value(XElement? parent, string localName) =>
        NullIfEmpty(Child(parent, localName)?.Value);

    private static long ReadLong(string? value) => long.TryParse(value, out var result) ? result : 0;

    private static int ReadInt(string? value) => int.TryParse(value, out var result) ? result : 0;

    private static long? ReadNullableLong(string? value) => long.TryParse(value, out var result) ? result : null;

    private static int? ReadNullableInt(string? value) => int.TryParse(value, out var result) ? result : null;

    private static bool NotEmpty(string? value) => !string.IsNullOrWhiteSpace(value);

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
