using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Разбор выгрузки КТРУ по XSD 17.0: zfcs_nsiKTRUType → position/data.
/// Ищем теги по локальным именам: в архивах ЕИС меняются префиксы
/// пространств имён и атрибут schemeVersion, поэтому XName с namespace
/// здесь не годится (тот же подход, что в TenderXmlParser).
/// </summary>
public static class NsiXmlParser
{
    /// <summary>Поля позиции, которые обязательны по XSD: code и OKPD2.</summary>
    public static IReadOnlyList<NsiPosition> ParseKtru(XDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);

        var positions = new List<NsiPosition>();
        foreach (var position in document.Descendants()
                     .Where(element => element.Name.LocalName == "position"))
        {
            var data = Child(position, "data") ?? position;
            var code = Value(data, "code");
            if (string.IsNullOrWhiteSpace(code))
            {
                continue;
            }

            var okpd2 = Child(data, "OKPD2");
            var parentCode = okpd2 is null ? null : Value(okpd2, "code");
            var name = Value(data, "name");
            var rawActual = Value(data, "actual");
            var status = Value(data, "status");

            // В выгрузках поле actual может отсутствовать (примечание в XSD
            // к zfcs_KTRUPositionType). Тогда ориентируемся на статус версии.
            var actual = bool.TryParse(rawActual, out var parsed)
                ? parsed
                : status is null || string.Equals(status, "ACTIVE", StringComparison.OrdinalIgnoreCase);

            var payload = new Dictionary<string, object?>(StringComparer.Ordinal);
            foreach (var element in data.Elements())
            {
                var key = element.Name.LocalName;
                if (element.HasElements)
                {
                    var nested = new Dictionary<string, object?>(StringComparer.Ordinal);
                    foreach (var child in element.Elements())
                    {
                        nested[child.Name.LocalName] = NullIfEmpty(child.Value);
                    }

                    payload[key] = nested;
                }
                else
                {
                    payload[key] = NullIfEmpty(element.Value);
                }
            }

            positions.Add(new NsiPosition(code, parentCode, name, actual, payload));
        }

        return positions;
    }

    private static XElement? Child(XElement parent, string localName) =>
        parent.Elements().FirstOrDefault(element => element.Name.LocalName == localName);

    private static string? Value(XElement parent, string localName)
    {
        var value = Child(parent, localName)?.Value;
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
