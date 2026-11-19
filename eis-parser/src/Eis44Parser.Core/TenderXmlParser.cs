using System.Globalization;
using System.Xml.Linq;
using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Устойчивый к версиям схем парсер: ищет теги по локальным именам и
/// не зависит от префиксов пространств имён и атрибута schemeVersion.
/// </summary>
public sealed class TenderXmlParser : ITenderXmlParser
{
    /// <inheritdoc />
    public TenderDto Parse(XDocument document, string fileName)
    {
        ArgumentNullException.ThrowIfNull(document);

        string? GetValue(params string[] localNames)
        {
            foreach (var localName in localNames)
            {
                var value = document.Descendants()
                    .FirstOrDefault(element => element.Name.LocalName == localName)
                    ?.Value;

                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value.Trim();
                }
            }

            return null;
        }

        var schemeVersion = document.Descendants()
            .SelectMany(element => element.Attributes())
            .FirstOrDefault(attribute => attribute.Name.LocalName == "schemeVersion")
            ?.Value;

        return new TenderDto
        {
            FileName = fileName,
            SchemeVersion = string.IsNullOrWhiteSpace(schemeVersion) ? "unknown" : schemeVersion,
            PurchaseNumber = GetValue("purchaseNumber", "reestrNumber", "registrationNumber"),
            ObjectInfo = GetValue("purchaseObjectInfo", "objectInfo", "subject"),
            MaxPrice = ParseMoney(GetValue("maxPrice", "initialMaxPrice", "nmck")),
            CustomerInn = GetValue("INN", "inn", "customerInn"),
            PublishDate = GetValue("publishDTInEIS", "publishDate", "publishDt"),
            RawXml = document.ToString(SaveOptions.DisableFormatting),
        };
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

        // ЕИС иногда отдаёт десятичный разделитель «,».
        var russian = CultureInfo.GetCultureInfo("ru-RU");
        return decimal.TryParse(value, NumberStyles.Any, russian, out var result) ? result : null;
    }
}
