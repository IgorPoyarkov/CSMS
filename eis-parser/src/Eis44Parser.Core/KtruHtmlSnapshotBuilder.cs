using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Собирает снимок КТРУ из публичных HTML-карточек в том же контракте
/// /api/references/import, что и SOAP-выгрузка НСИ. Payload сохраняет ключи,
/// которые уже читает фронт (ktruCode, okpd2Code, unit, characteristics…
/// и isMandatory у характеристики).
/// </summary>
public static class KtruHtmlSnapshotBuilder
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    // Границы диапазона в значениях ЕИС пишутся как «>= 5» / «<= 10»
    // (иногда символами ≤/≥) — вытаскиваем число для полей minValue/maxValue.
    private static readonly Regex MinBound = new(@">=?\s*([^;\s]+)", RegexOptions.CultureInvariant);
    private static readonly Regex MaxBound = new(@"<=?\s*([^;\s]+)", RegexOptions.CultureInvariant);

    public static NsiSnapshot Build(
        IReadOnlyList<KtruCardHtmlRecord> cards,
        string dataset,
        string sourceUrl,
        DateTimeOffset? builtAt = null)
    {
        if (cards.Count == 0)
        {
            throw new ArgumentException("Публичные карточки КТРУ не собраны.", nameof(cards));
        }

        var ordered = cards
            .OrderBy(card => card.Code, StringComparer.Ordinal)
            .ToArray();

        var items = ordered
            .Select(card => new ReferenceImportItemDto(
                card.Code,
                card.Okpd2Code,
                card.Name,
                true,
                BuildPayload(card)))
            .ToArray();

        var snapshot = BuildFromItems(items, dataset, sourceUrl, builtAt);
        return snapshot with { PublishedAt = ReadLastPublishDate(ordered) };
    }

    /// <summary>
    /// Снимок из уже готовых записей — используется ежедневным RSS-мониторингом,
    /// когда к опубликованному справочнику добавляются новые позиции.
    /// </summary>
    public static NsiSnapshot BuildFromItems(
        IReadOnlyList<ReferenceImportItemDto> items,
        string dataset,
        string sourceUrl,
        DateTimeOffset? builtAt = null)
    {
        if (items.Count == 0)
        {
            throw new ArgumentException("Снимок КТРУ пуст.", nameof(items));
        }

        var ordered = items
            .OrderBy(item => item.Code, StringComparer.Ordinal)
            .ToArray();

        var canonical = new StringBuilder();
        foreach (var item in ordered)
        {
            canonical.Append(item.Code).Append('\t')
                .Append(item.Name).Append('\t')
                .Append(JsonSerializer.Serialize(item.Payload, JsonOptions)).Append('\n');
        }

        var sha256 = Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(canonical.ToString())));
        var stamp = (builtAt ?? DateTimeOffset.UtcNow).ToString("yyyyMMdd", CultureInfo.InvariantCulture);

        return new NsiSnapshot(
            dataset,
            $"ktru-html-{stamp}-{ordered.Length}-{sha256[..12].ToLowerInvariant()}",
            "Публичные HTML-карточки ЕИС: commonInfo.html, ktru-description.html",
            sourceUrl,
            sha256,
            null,
            ordered);
    }

    /// <summary>Совместимый с ktruRef.api.ts набор полей плюс новые блоки.</summary>
    private static Dictionary<string, object?> BuildPayload(KtruCardHtmlRecord card)
    {
        // Одна характеристика = одна строка. Раньше здесь был SelectMany по
        // значениям, из-за чего позиция с 5 вариантами давала 5 одинаковых
        // полей с одним именем — в ООЗ они выглядели как дубли.
        var characteristics = card.Characteristics
            .Select(BuildCharacteristic)
            .ToArray();

        return new Dictionary<string, object?>
        {
            ["ktruCode"] = card.Code,
            ["okpd2Code"] = card.Okpd2Code,
            ["unit"] = card.Unit,
            ["status"] = card.Status,
            ["includedDate"] = card.IncludedDate,
            ["mandatoryFrom"] = card.MandatoryFrom,
            ["mandatoryTo"] = card.MandatoryTo,
            ["enlarged"] = card.Enlarged,
            ["childCodes"] = card.ChildCodes,
            ["characteristics"] = characteristics,
            ["classifiers"] = card.Classifiers
                .Select(item => (object)new Dictionary<string, object?>
                {
                    ["name"] = item.Name,
                    ["value"] = item.Value,
                    ["description"] = item.Description,
                })
                .ToArray(),
            ["standards"] = card.Standards
                .Select(item => (object)new Dictionary<string, object?>
                {
                    ["name"] = item.Name,
                    ["documentUrl"] = item.DocumentUrl,
                })
                .ToArray(),
        };
    }

    /// <summary>Одна строка характеристики: все варианты остаются в values[].</summary>
    private static Dictionary<string, object?> BuildCharacteristic(KtruCharacteristic characteristic)
    {
        var values = characteristic.Values
            .Where(value => !string.IsNullOrWhiteSpace(value.Value))
            .Select(value => (object)new Dictionary<string, object?>
            {
                ["value"] = value.Value,
                ["unit"] = value.Unit,
            })
            .ToArray();

        var texts = characteristic.Values
            .Select(value => value.Value)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .ToArray();
        var unit = characteristic.Values
            .Select(value => value.Unit)
            .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? "";
        var (valueType, valueText, minValue, maxValue) = DescribeValues(texts);

        return new Dictionary<string, object?>
        {
            ["name"] = characteristic.Name,
            ["isMandatory"] = characteristic.Required,
            ["unit"] = unit,
            ["valueType"] = valueType,
            // Фронт ждёт перечень допустимых значений через «;» в valueText.
            ["valueText"] = valueText,
            ["minValue"] = minValue,
            ["maxValue"] = maxValue,
            ["values"] = values,
        };
    }

    /// <summary>Тип значения и тексты для уже существующего фронтового enum.</summary>
    private static (string Type, string Text, string? Min, string? Max) DescribeValues(
        IReadOnlyList<string> values)
    {
        var joined = string.Join("; ", values);
        var normalized = joined
            .Replace("≤", "<=", StringComparison.Ordinal)
            .Replace("≥", ">=", StringComparison.Ordinal);
        var hasMin = normalized.Contains(">=", StringComparison.Ordinal) ||
                     normalized.Contains(">", StringComparison.Ordinal);
        var hasMax = normalized.Contains("<=", StringComparison.Ordinal) ||
                     normalized.Contains("<", StringComparison.Ordinal);

        if (hasMin || hasMax)
        {
            var min = hasMin ? MinBound.Match(normalized).Groups[1].Value : null;
            var max = hasMax ? MaxBound.Match(normalized).Groups[1].Value : null;
            var type = hasMin && hasMax ? "range" : hasMin ? "min" : "max";
            return (type, "", min, max);
        }

        // Несколько вариантов — один перечень, а не несколько одинаковых полей.
        return (values.Count > 1 ? "enum" : "text", joined, null, null);
    }

    private static DateTimeOffset? ReadLastPublishDate(IEnumerable<KtruCardHtmlRecord> cards)
    {
        return cards
            .Select(card => DateTimeOffset.TryParseExact(
                card.IncludedDate,
                "dd.MM.yyyy",
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var parsed)
                ? parsed
                : (DateTimeOffset?)null)
            .Where(value => value is not null)
            .Max();
    }
}
