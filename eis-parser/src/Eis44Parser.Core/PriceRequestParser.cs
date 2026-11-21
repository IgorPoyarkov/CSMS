using System.Globalization;
using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Маппинг публичной печатной формы запроса ценовых предложений
/// (fcsRequestForQuotation, закупки до 100 тыс. руб. по 44-ФЗ).
/// Корень отличается от извещения: здесь нет purchaseNumber и ИКЗ, а
/// реестровый номер документа лежит в &lt;id&gt;. Поэтому документ не должен
/// попадать в таблицу purchases — только в raw_documents со своим типом.
/// Теги ищем по LocalName: префиксы пространств имён меняются между релизами.
/// </summary>
public sealed class PriceRequestParser
{
    /// <summary>Признак того, что XML — запрос ценовых предложений.</summary>
    public static bool IsPriceRequest(XDocument document) =>
        string.Equals(document.Root?.Name.LocalName, "fcsRequestForQuotation", StringComparison.OrdinalIgnoreCase);

    /// <summary>Разобрать печатную форму; другой корневой элемент — ошибка.</summary>
    public PriceRequestDocument Parse(XDocument document, string fileName)
    {
        ArgumentNullException.ThrowIfNull(document);
        var root = document.Root;
        if (!IsPriceRequest(document) || root is null)
        {
            throw new ArgumentException("Ожидается корневой элемент fcsRequestForQuotation.", nameof(document));
        }

        var publishOrg = Child(root, "publishOrg");
        var responsible = Child(root, "responsibleInfo");
        var contact = Child(responsible, "contactPerson");
        var procedure = Child(root, "procedureInfo");
        var products = Child(root, "products");
        var conditions = Child(root, "conditions");

        var requestPeriod = Child(procedure, "request");
        var purchasePeriod = Child(procedure, "purchase");

        var parsedProducts = Elements(products, "product")
            .Select(ParseProduct)
            .ToArray();

        var parsedConditions = conditions?.Elements()
            .Where(element => !string.IsNullOrWhiteSpace(element.Value))
            .GroupBy(element => element.Name.LocalName, StringComparer.Ordinal)
            .ToDictionary(
                group => group.Key,
                group => string.Join("; ", group.Select(element => element.Value.Trim())),
                StringComparer.Ordinal)
            ?? new Dictionary<string, string>(StringComparer.Ordinal);

        return new PriceRequestDocument(
            fileName,
            ReadLong(Value(root, "id")),
            Value(root, "versionNumber"),
            Value(root, "state"),
            Value(publishOrg, "regNum"),
            Value(publishOrg, "fullName"),
            Value(publishOrg, "INN"),
            Value(publishOrg, "KPP"),
            Value(root, "href"),
            Child(Child(root, "printForm"), "url")?.Value,
            Value(products, "objectInfo") ?? Value(root, "requestObjectInfo"),
            JoinNames(contact),
            Value(responsible, "contactEMail"),
            Value(responsible, "contactPhone"),
            Value(requestPeriod, "startDate"),
            Value(requestPeriod, "endDate"),
            Value(purchasePeriod, "startDate"),
            Value(purchasePeriod, "endDate"),
            parsedProducts,
            parsedConditions,
            document.ToString(SaveOptions.DisableFormatting));
    }

    private static PriceRequestProduct ParseProduct(XElement element)
    {
        var okpd2 = Child(element, "OKPD2");
        var okei = Child(element, "OKEI");
        return new PriceRequestProduct(
            Value(okpd2, "code"),
            Value(okpd2, "name"),
            Value(element, "name") ?? "",
            Value(okei, "code"),
            Value(okei, "name"),
            ReadDecimal(Value(element, "quantity")));
    }

    private static string? JoinNames(XElement? contact)
    {
        if (contact is null)
        {
            return null;
        }

        var parts = new[] { Value(contact, "lastName"), Value(contact, "firstName"), Value(contact, "middleName") }
            .Where(part => !string.IsNullOrWhiteSpace(part))
            .ToArray();
        return parts.Length == 0 ? null : string.Join(" ", parts);
    }

    private static XElement? Child(XElement? parent, string localName) =>
        parent?.Elements().FirstOrDefault(element =>
            element.Name.LocalName.Equals(localName, StringComparison.OrdinalIgnoreCase));

    private static IReadOnlyList<XElement> Elements(XElement? parent, string itemName) =>
        parent?.Elements()
            .Where(element => element.Name.LocalName.Equals(itemName, StringComparison.OrdinalIgnoreCase))
            .ToArray() ?? [];

    private static string? Value(XElement? parent, string localName) =>
        NullIfEmpty(Child(parent, localName)?.Value);

    private static long ReadLong(string? value) => long.TryParse(value, out var result) ? result : 0;

    private static decimal? ReadDecimal(string? value) =>
        decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var result) ? result : null;

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
