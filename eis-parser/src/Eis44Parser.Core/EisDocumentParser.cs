using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Версионно-устойчивый парсер XML из архивов ЕИС. Ищет теги по LocalName,
/// не привязываясь к префиксам пространств имён и версии Альбома ТФФ.
/// Названия кандидатов взяты из XSD 17.0 (IntegrationTypes.xsd):
/// regNum, purchaseNumber, IKZ, INN, KPP, nmck/contractPrice, printForm,
/// OKPD2, KTRU/code, signDate. Точная семантика поля уточняется при
/// появлении реального примера документа — здесь осознанно нет «догадок»
/// вроде выдуманных кодов справочников.
/// </summary>
public sealed class EisDocumentParser
{
    /// <summary>Разобрать один XML-файл архива.</summary>
    public ParsedEisDocument Parse(XDocument document, string fileName)
    {
        ArgumentNullException.ThrowIfNull(document);

        var root = document.Root;
        var code = document.ToString(SaveOptions.DisableFormatting);

        return new ParsedEisDocument
        {
            FileName = fileName,
            DocumentSha256 = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code))).ToLowerInvariant(),
            SchemeVersion = GetValue(root, "schemeVersion") ?? "unknown",
            Kind = DetectKind(root?.Name.LocalName),
            PurchaseNumber = FirstNonEmpty(
                GetValue(root, "purchaseNumber", "notificationNumber"),
                IsRegistryNumber(GetValue(root, "regNum")) ? GetValue(root, "regNum") : null),
            RegNumber = GetValue(root, "regNum"),
            Ikz = GetValue(root, "IKZ", "ikz"),
            CustomerInn = GetPartyValue(root, ["customer", "customerInfo", "mainInfo"], "INN"),
            CustomerKpp = GetPartyValue(root, ["customer", "customerInfo", "mainInfo"], "KPP"),
            CustomerName = GetPartyValue(root, ["customer", "customerInfo", "mainInfo"], "name", "fullName", "shortName"),
            SupplierInn = GetPartyValue(root, ["supplier", "supplierInfo", "postavshik"], "INN"),
            SupplierKpp = GetPartyValue(root, ["supplier", "supplierInfo", "postavshik"], "KPP"),
            SupplierName = GetPartyValue(root, ["supplier", "supplierInfo", "postavshik"], "name", "fullName", "shortName"),
            Price = ParseMoney(GetValue(root, "contractPrice", "nmck", "initialMaxPrice", "maxPrice", "price")),
            PublishDate = GetValue(root, "publishDTInEIS", "publishDate", "signDate", "contractDate"),
            ObjectInfo = GetValue(root, "purchaseObjectInfo", "objectInfo", "subject", "name"),
            PrintFormUrl = GetPrintFormUrl(root),
            Items = ParseItems(root),
            RawXml = code,
        };
    }

    private static string? GetPartyValue(
        XElement? root,
        IReadOnlyCollection<string> scopes,
        params string[] fields)
    {
        if (root is null)
        {
            return null;
        }

        foreach (var scope in scopes)
        {
            var element = root.DescendantsAndSelf()
                .FirstOrDefault(candidate =>
                    candidate.Name.LocalName.Contains(scope, StringComparison.OrdinalIgnoreCase));

            if (element is null)
            {
                continue;
            }

            var value = GetValue(element, fields);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        // В извещениях заказчик часто лежит без обёртки customer.
        return scopes.FirstOrDefault() == "customer" ? GetValue(root, fields) : null;
    }

    private static string? GetPrintFormUrl(XElement? root)
    {
        var printForm = root?.DescendantsAndSelf()
            .FirstOrDefault(element => element.Name.LocalName.Equals("printForm", StringComparison.OrdinalIgnoreCase));

        return printForm?
            .Attributes()
            .FirstOrDefault(attribute =>
                attribute.Name.LocalName.Equals("url", StringComparison.OrdinalIgnoreCase) ||
                attribute.Name.LocalName.Equals("href", StringComparison.OrdinalIgnoreCase))
            ?.Value ?? GetValue(printForm, "url", "href", "fileName");
    }

    private static IReadOnlyList<PurchaseItemDto> ParseItems(XElement? root)
    {
        var items = new List<PurchaseItemDto>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var element in (root?.DescendantsAndSelf() ?? []).Where(candidate =>
                     candidate.Name.LocalName.Equals("item", StringComparison.OrdinalIgnoreCase) ||
                     candidate.Name.LocalName.Equals("position", StringComparison.OrdinalIgnoreCase) ||
                     candidate.Name.LocalName.Equals("product", StringComparison.OrdinalIgnoreCase) ||
                     candidate.Name.LocalName.Equals("purchaseItem", StringComparison.OrdinalIgnoreCase)))
        {
            var ktru = GetClassifierCode(element, "KTRU");
            var okpd2 = GetClassifierCode(element, "OKPD2");
            var name = GetValue(element, "name", "itemName", "productName");

            if (ktru is null && okpd2 is null && name is null)
            {
                continue;
            }

            var key = $"{ktru}|{okpd2}|{name}";
            if (!seen.Add(key))
            {
                continue;
            }

            items.Add(new PurchaseItemDto(
                LineNo: items.Count + 1,
                KtruCode: ktru,
                Okpd2Code: okpd2,
                ItemName: name,
                Quantity: ParseMoney(GetValue(element, "quantity", "qty", "amount")),
                Price: ParseMoney(GetValue(element, "price", "unitPrice", "initialPrice"))));
        }

        return items;
    }

    private static string? GetClassifierCode(XElement item, string classifier)
    {
        var node = item.DescendantsAndSelf()
            .FirstOrDefault(element => element.Name.LocalName.Equals(classifier, StringComparison.OrdinalIgnoreCase));

        if (node is null)
        {
            return null;
        }

        return GetValue(node, "code", "codeOKPD2", "codeKTRU") ??
            (node.Value.Length is > 0 and < 40 ? node.Value.Trim() : null);
    }

    private static bool IsRegistryNumber(string? value) =>
        value is not null && value.Length is >= 15 and <= 20 && value.All(char.IsDigit);

    private static EisDocumentKind DetectKind(string? rootName)
    {
        if (string.IsNullOrWhiteSpace(rootName))
        {
            return EisDocumentKind.Unknown;
        }

        if (rootName.Contains("nsi", StringComparison.OrdinalIgnoreCase))
        {
            return EisDocumentKind.Nsi;
        }

        if (rootName.Contains("project", StringComparison.OrdinalIgnoreCase) ||
            rootName.Contains("notification", StringComparison.OrdinalIgnoreCase) ||
            rootName.Contains("tenderPlan", StringComparison.OrdinalIgnoreCase) ||
            rootName.Contains("plan", StringComparison.OrdinalIgnoreCase))
        {
            return EisDocumentKind.Purchase;
        }

        return rootName.Contains("contract", StringComparison.OrdinalIgnoreCase)
            ? EisDocumentKind.Contract
            : EisDocumentKind.Unknown;
    }

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));

    private static string? GetValue(XElement? root, params string[] localNames)
    {
        if (root is null)
        {
            return null;
        }

        foreach (var localName in localNames)
        {
            var elementValue = root.DescendantsAndSelf()
                .FirstOrDefault(element => element.Name.LocalName.Equals(localName, StringComparison.OrdinalIgnoreCase))
                ?.Value;

            if (!string.IsNullOrWhiteSpace(elementValue))
            {
                return elementValue.Trim();
            }

            // schemeVersion и url живут в атрибутах: element.Value вернул бы
            // весь текст потомка, поэтому читаем именно атрибут.
            var attributeValue = root.DescendantsAndSelf()
                .SelectMany(element => element.Attributes())
                .FirstOrDefault(attribute => attribute.Name.LocalName.Equals(localName, StringComparison.OrdinalIgnoreCase))
                ?.Value;

            if (!string.IsNullOrWhiteSpace(attributeValue))
            {
                return attributeValue.Trim();
            }
        }

        return null;
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
