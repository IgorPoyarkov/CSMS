using System.Globalization;
using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Разбор служебных сообщений ЭДО Казначейства: извещения о получении (DP_IZVPOL,
/// КНД 1115110) и подтверждения (DP_PDOTPR, КНД 1115111). Используется как отдельный
/// парсер рядом с основным EisDocumentParser и парсером актов приёмки.
/// </summary>
public sealed class EdoMessageParser
{
    private static readonly CultureInfo Russian = CultureInfo.GetCultureInfo("ru-RU");

    /// <summary>Признак сообщения ЭДО по структуре документа.</summary>
    public static bool IsEdoMessage(XDocument document) =>
        document.Root is not null &&
        NameIs(document.Root, "Файл") &&
        document.Root.Descendants().Any(element =>
            NameIs(element, "СвИзвПолуч") || NameIs(element, "СведПодтв"));

    /// <summary>Разобрать сообщение ЭДО во все значимые поля.</summary>
    public EdoMessageDto Parse(XDocument document, string fileName)
    {
        ArgumentNullException.ThrowIfNull(document);

        var root = document.Root!;
        var doc = Element(root, "Документ");
        var knd = Attr(doc, "КНД");
        var confirmation = Element(doc, "СведПодтв");
        var notification = Element(doc, "СвИзвПолуч");
        var eventBlock = notification ?? confirmation;
        var postedFile = Element(eventBlock, "СведПолФайл") ?? Element(eventBlock, "СведОтпрФайл");
        var documentInfo = Element(postedFile, "ДанПолучДок");
        var operatorInfo = Element(doc, "ОперЭДО");
        var signatory = Element(doc, "Подписант");
        var fio = Element(signatory, "ФИО");
        var signature = Element(eventBlock, "ЭЦППолФайл") ?? Element(postedFile, "ЭЦППолФайл");

        return new EdoMessageDto(
            fileName,
            Attr(root, "ИдФайл") ?? string.Empty,
            Attr(root, "ВерсПрог"),
            knd switch
            {
                "1115110" => "Извещение о получении",
                "1115111" => "Подтверждение ЭДО",
                _ => "ЭДО-сообщение",
            },
            knd,
            Attr(operatorInfo, "НаимОрг"),
            Attr(operatorInfo, "ИННЮЛ"),
            Attr(operatorInfo, "ИдОперЭДО"),
            NormalizeDate(Attr(notification, "ДатаПол") ?? Attr(confirmation, "ДатаОтпр")),
            Attr(notification, "ВремяПол") ?? Attr(confirmation, "ВремяОтпр"),
            Attr(postedFile, "ИмяПостФайла"),
            Attr(documentInfo, "НаимДок"),
            Attr(documentInfo, "НомДок"),
            NormalizeDate(Attr(documentInfo, "ДатаДок")),
            ParseParticipants(doc),
            Attr(signatory, "Должность") ?? Attr(signatory, "Должн"),
            string.Join(
                " ",
                new[] { Attr(fio, "Фамилия"), Attr(fio, "Имя"), Attr(fio, "Отчество") }
                    .Where(value => !string.IsNullOrWhiteSpace(value))),
            SignatureLength(signature));
    }

    private static List<EdoParticipantDto> ParseParticipants(XElement? doc) =>
        (doc?.Descendants() ?? Enumerable.Empty<XElement>())
            .Where(element => IsParticipant(element.Name.LocalName))
            .Select(element =>
            {
                var organization = Element(element, "ЮЛ")
                    ?? Element(element, "ОтпрЮЛ")
                    ?? Element(element, "ИП");
                return new EdoParticipantDto(
                    Role(element.Name.LocalName),
                    Attr(element, "ИдУчастЭДО"),
                    Attr(organization, "НаимОрг"),
                    Attr(organization, "ИННЮЛ") ?? Attr(organization, "ИННФЛ"),
                    Attr(organization, "КПП"));
            })
            .ToList();

    private static bool IsParticipant(string name) =>
        name is "УчастЭДО" or "ОтпрДок" or "ПолДок" or "СвОтпрДок" or "СвПолДок";

    private static string Role(string name) =>
        name.Contains("Отпр", StringComparison.Ordinal)
            ? "Отправитель"
            : name.Contains("Пол", StringComparison.Ordinal)
                ? "Получатель"
                : "Участник ЭДО";

    private static XElement? Element(XElement? parent, string localName) =>
        parent?.Descendants().FirstOrDefault(element => NameIs(element, localName));

    private static string? Attr(XElement? element, string localName) =>
        element?.Attributes()
            .FirstOrDefault(attribute => attribute.Name.LocalName == localName)
            ?.Value is { } value && !string.IsNullOrWhiteSpace(value)
                ? value.Trim()
                : null;

    private static int SignatureLength(XElement? signature) =>
        signature is null ? 0 : signature.Value.Count(character => !char.IsWhiteSpace(character));

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
