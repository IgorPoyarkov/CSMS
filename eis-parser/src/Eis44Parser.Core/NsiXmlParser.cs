using System.Xml.Linq;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Разбор выгрузки КТРУ по XSD 17.0: zfcs_nsiKTRUType → position/data.
/// Ищем теги по локальным именам: в архивах ЕИС меняются префиксы
/// пространств имён и атрибут schemeVersion, поэтому XName с namespace
/// здесь не годится (тот же подход, что в TenderXmlParser).
///
/// Характеристики позиции (data/characteristics/characteristic) приводятся
/// к плоской форме, которую уже читает фронт (KtruRef.characteristics):
/// name, unit, valueType, valueText, minValue, maxValue, isMandatory.
/// Без этого маппинга generic-разбор терял повторяющиеся <characteristic>.
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
            var okpd2Code = okpd2 is null ? null : Value(okpd2, "code");
            // ParentCode в ref.items остаётся ОКПД2: по нему селект КТРУ
            // выбирает позиции для кода закупки. Ссылку на родительскую
            // позицию КТРУ сохраняем в payload отдельным полем, чтобы
            // не потерять иерархию и при этом не скрыть детализированную
            // позицию из выборки по ОКПД2.
            var parentInfo = Child(data, "parentPositionInfo");
            var parentKtruCode = parentInfo is null ? null : Value(parentInfo, "code");
            var parentCode = okpd2Code;

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
                // Характеристики и ссылку на родителя разбираем отдельно:
                // generic-словарь склеивает повторяющиеся <characteristic>.
                if (element.Name.LocalName is "characteristics" or "parentPositionInfo")
                {
                    continue;
                }

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

            // Плоские ключи, которые уже понимает KtruRef.ktruFromReferenceItem.
            payload["ktruCode"] = code;
            payload["okpd2Code"] = okpd2Code;
            payload["unit"] = ReadUnit(data);
            payload["characteristics"] = ParseCharacteristics(data);
            if (!string.IsNullOrWhiteSpace(parentKtruCode))
            {
                payload["parentKtruCode"] = parentKtruCode;
            }

            var actualTo = Value(data, "applicationDateEnd");
            if (!string.IsNullOrWhiteSpace(actualTo))
            {
                payload["actualTo"] = actualTo;
            }

            positions.Add(new NsiPosition(code, parentCode, name, actual, payload));
        }

        return positions;
    }

    /// <summary>Единица измерения позиции из блока data/OKEIs.</summary>
    private static string? ReadUnit(XElement data)
    {
        var okei = Child(Child(data, "OKEIs"), "OKEI");
        if (okei is null)
        {
            return null;
        }

        return Value(okei, "name") ?? Value(okei, "nationalCode") ?? Value(okei, "code");
    }

    /// <summary>
    /// data/characteristics/characteristic → массив плоских характеристик.
    /// Поля повторяют KtruCharacteristicSchema на фронте, чтобы XML-снимок
    /// не требовал отдельного маппера в браузере.
    /// </summary>
    private static List<Dictionary<string, object?>> ParseCharacteristics(XElement data)
    {
        var result = new List<Dictionary<string, object?>>();
        var container = Child(data, "characteristics");
        if (container is null)
        {
            return result;
        }

        foreach (var characteristic in container.Elements()
                     .Where(element => element.Name.LocalName == "characteristic"))
        {
            var name = Value(characteristic, "name");
            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            var values = ParseCharacteristicValues(characteristic);
            var (valueType, valueText, minValue, maxValue) =
                DescribeValues(values);
            var requiredRaw = Value(characteristic, "isRequired");

            result.Add(new Dictionary<string, object?>(StringComparer.Ordinal)
            {
                ["id"] = Value(characteristic, "code") ?? name,
                ["name"] = name,
                ["unit"] = values
                    .Select(value => value.Unit)
                    .FirstOrDefault(unit => !string.IsNullOrWhiteSpace(unit)) ?? "",
                ["valueType"] = valueType,
                ["valueText"] = valueText,
                ["minValue"] = minValue,
                ["maxValue"] = maxValue,
                // По ПП 145 характеристика позиции считается обязательной,
                // если ЕИС явно не указала обратное.
                ["isMandatory"] = bool.TryParse(requiredRaw, out var required)
                    ? required
                    : true,
                ["kind"] = Value(characteristic, "kind"),
                ["choiceType"] = Value(characteristic, "choiceType"),
                ["type"] = Value(characteristic, "type"),
                ["instruction"] = "",
                ["characteristicsFillingInstructionCode"] = "",
            });
        }

        return result;
    }

    private static List<ParsedCharacteristicValue> ParseCharacteristicValues(
        XElement characteristic)
    {
        var result = new List<ParsedCharacteristicValue>();
        var container = Child(characteristic, "values");
        if (container is null)
        {
            return result;
        }

        foreach (var value in container.Elements()
                     .Where(element => element.Name.LocalName == "value"))
        {
            var valueSet = Child(value, "valueSet");
            var concreteValue = valueSet is null ? null : Value(valueSet, "concreteValue");
            var rangeSet = Child(value, "rangeSet");
            var range = rangeSet is null
                ? null
                : Child(rangeSet, "valueRange") ?? rangeSet;
            var min = range is null ? null : Value(range, "min");
            var max = range is null ? null : Value(range, "max");
            var okei = Child(value, "OKEI");

            result.Add(new ParsedCharacteristicValue(
                // Качественная характеристика приходит текстом, количественная —
                // конкретным значением или кодом значения.
                Value(value, "qualityDescription")
                    ?? concreteValue
                    ?? Value(value, "valueCode"),
                min,
                max,
                okei is null
                    ? null
                    : Value(okei, "name")
                        ?? Value(okei, "nationalCode")
                        ?? Value(okei, "code")));
        }

        return result;
    }

    private static (string ValueType, string ValueText, string MinValue, string MaxValue)
        DescribeValues(IReadOnlyList<ParsedCharacteristicValue> values)
    {
        var texts = values
            .Select(value => value.Text)
            .Where(text => !string.IsNullOrWhiteSpace(text))
            .ToList();
        var mins = values
            .Select(value => value.Min)
            .Where(min => !string.IsNullOrWhiteSpace(min))
            .ToList();
        var maxes = values
            .Select(value => value.Max)
            .Where(max => !string.IsNullOrWhiteSpace(max))
            .ToList();

        var valueText = string.Join("; ", texts);
        var minValue = mins.FirstOrDefault() ?? "";
        var maxValue = maxes.FirstOrDefault() ?? "";

        if (minValue.Length > 0 && maxValue.Length > 0)
        {
            return ("range", valueText, minValue, maxValue);
        }

        if (minValue.Length > 0)
        {
            return ("min", valueText, minValue, "");
        }

        if (maxValue.Length > 0)
        {
            return ("max", valueText, "", maxValue);
        }

        if (values.Count > 1)
        {
            return ("enum", valueText, "", "");
        }

        if (values.Count == 1)
        {
            return ("exact", valueText, "", "");
        }

        return ("text", "", "", "");
    }

    private static XElement? Child(XElement? parent, string localName) =>
        parent?.Elements().FirstOrDefault(element => element.Name.LocalName == localName);

    private static string? Value(XElement parent, string localName)
    {
        var value = Child(parent, localName)?.Value;
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private sealed record ParsedCharacteristicValue(
        string? Text,
        string? Min,
        string? Max,
        string? Unit);
}
