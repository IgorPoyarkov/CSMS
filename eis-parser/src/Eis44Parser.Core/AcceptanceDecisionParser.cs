using System.Globalization;
using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Разбор решения заказчика по результатам приёмки. Поддерживаются обе формы:
/// ОН_АКТРЕЗРАБЗ (КНД 1110336) и ОН_НСЧФДОППОК (КНД 1115132). Документ ссылается
/// на акт через ИдФайлИнфПодр/ИдФайлИнфПр, содержит код операции и подписантов.
/// Новые таблицы БД не нужны — результат сразу готов к выдаче на фронт.
/// </summary>
public sealed class AcceptanceDecisionParser
{
    private static readonly CultureInfo Russian = CultureInfo.GetCultureInfo("ru-RU");

    /// <summary>Признак решения заказчика: блок СодФХЖ4.</summary>
    public static bool IsAcceptanceDecision(XDocument document) =>
        document.Root is not null &&
        NameIs(document.Root, "Файл") &&
        document.Root.Descendants().Any(element => NameIs(element, "СодФХЖ4"));

    /// <summary>Разобрать решение заказчика во все значимые поля.</summary>
    public AcceptanceDecisionDto Parse(XDocument document, string fileName)
    {
        ArgumentNullException.ThrowIfNull(document);

        var root = document.Root!;
        var doc = Element(root, "Документ");
        var original = Element(doc, "ИдИнфПодр") ?? Element(doc, "ИдИнфПрод");
        var content = Element(doc, "СодФХЖ4");
        var acceptance = Element(content, "СвПрием") ?? Element(content, "СвПрин");
        var refusal = Element(acceptance, "ИдДокОтказ");
        var operation = Element(acceptance, "КодСодОпер");
        var signature = Element(original, "ЭП");

        return new AcceptanceDecisionDto(
            fileName,
            Attr(root, "ИдФайл") ?? string.Empty,
            Attr(root, "ВерсПрог"),
            Attr(doc, "КНД"),
            NormalizeDate(Attr(doc, "ДатИнфЗак") ?? Attr(doc, "ДатаИнфПок")),
            Attr(doc, "ВрИнфЗак") ?? Attr(doc, "ВремИнфПок"),
            Attr(doc, "НаимЭконСубСост"),
            Attr(original, "ИдФайлИнфПодр") ?? Attr(original, "ИдФайлИнфПр"),
            NormalizeDate(Attr(original, "ДатаФайлИнфПодр") ?? Attr(original, "ДатаФайлИнфПр")),
            Attr(original, "ВремяФайлИнфПодр") ?? Attr(original, "ВремФайлИнфПр"),
            Attr(content, "НомПостДок") ?? Attr(content, "ПорНомДокИнфПр"),
            NormalizeDate(Attr(content, "ДатаПостДок") ?? Attr(content, "ДатаДокИнфПр")),
            Attr(operation, "КодИтога") ?? Attr(acceptance, "КодСодОпер"),
            Attr(Element(refusal, "ТипИдДок"), "ИдДок"),
            ParseSignatories(doc),
            signature is null ? 0 : signature.Value.Count(character => !char.IsWhiteSpace(character)));
    }

    private static List<AcceptanceSignatoryDto> ParseSignatories(XElement? doc) =>
        (doc?.Descendants() ?? Enumerable.Empty<XElement>())
            .Where(element =>
                (NameIs(element, "ПодписантЗак") || NameIs(element, "Подписант")) &&
                !element.Ancestors().Any(ancestor => NameIs(ancestor, "ПодписантЗак")))
            .Select(element =>
            {
                var fio = Element(element, "ФИО") ?? Element(Element(Element(element, "СвЛицПрин"), "РабОргПок"), "ФИО");
                var extra = Element(element.Parent, "ДопПолеСтрИнф") ?? Element(element, "ДопПолеСтрИнф");
                var authority = Element(extra, "ДопИнф");
                return new AcceptanceSignatoryDto(
                    Attr(element, "Должн")
                        ?? Attr(element, "Должность")
                        ?? Attr(Element(Element(element, "СвЛицПрин"), "РабОргПок"), "Должность"),
                    Attr(fio, "Фамилия"),
                    Attr(fio, "Имя"),
                    Attr(fio, "Отчество"),
                    Attr(authority, "ОснПолн"));
            })
            .ToList();

    private static XElement? Element(XElement? parent, string localName) =>
        parent?.Descendants().FirstOrDefault(element => NameIs(element, localName));

    private static string? Attr(XElement? element, string localName) =>
        element?.Attributes()
            .FirstOrDefault(attribute => attribute.Name.LocalName == localName)
            ?.Value is { } value && !string.IsNullOrWhiteSpace(value)
                ? value.Trim()
                : null;

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
}
