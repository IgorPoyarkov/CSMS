using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
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
        var characteristics = card.Characteristics
            .SelectMany(characteristic => characteristic.Values.Select(value =>
                (object)new Dictionary<string, object?>
                {
                    ["name"] = characteristic.Name,
                    ["isMandatory"] = characteristic.Required,
                    ["unit"] = value.Unit,
                    ["valueText"] = value.Value,
                    ["valueType"] = DetectValueType(value.Value, characteristic.Values.Count),
                    ["values"] = characteristic.Values
                        .Select(item => (object)new Dictionary<string, object?>
                        {
                            ["value"] = item.Value,
                            ["unit"] = item.Unit,
                        })
                        .ToArray(),
                }))
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

    /// <summary>Грубая типизация значения для уже существующего фронтового enum.</summary>
    private static string DetectValueType(string value, int valuesCount)
    {
        var normalized = value
            .Replace("≤", "<=", StringComparison.Ordinal)
            .Replace("≥", ">=", StringComparison.Ordinal);

        var hasMin = normalized.Contains(">=", StringComparison.Ordinal) ||
                     normalized.Contains(">", StringComparison.Ordinal);
        var hasMax = normalized.Contains("<=", StringComparison.Ordinal) ||
                     normalized.Contains("<", StringComparison.Ordinal);

        if (hasMin && hasMax)
        {
            return "range";
        }

        if (hasMin)
        {
            return "min";
        }

        if (hasMax)
        {
            return "max";
        }

        return valuesCount > 1 ? "enum" : "text";
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
