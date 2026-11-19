using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Eis44Parser.Core.Models;

namespace Eis44Parser.Core;

/// <summary>
/// Собирает версионируемый снимок по тем же правилам, что и csms-api
/// (EisNsiTreeImporter): канонический порядок записей, SHA-256 по
/// code|name|payload и версия eis-&lt;dataset&gt;-&lt;16 hex&gt;.
/// Повторная выгрузка того же состояния даёт ту же версию и будет
/// отклонена API как дубль.
/// </summary>
public static class NsiSnapshotBuilder
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static NsiSnapshot Build(
        string dataset,
        string sourceUrl,
        IReadOnlyList<NsiPosition> positions)
    {
        if (string.IsNullOrWhiteSpace(dataset))
        {
            throw new ArgumentException("Не задан код справочника (dataset).", nameof(dataset));
        }

        if (positions.Count == 0)
        {
            throw new ArgumentException("В выгрузке ЕИС нет позиций справочника.", nameof(positions));
        }

        var ordered = positions
            .OrderBy(position => position.Code, StringComparer.Ordinal)
            .ToArray();

        var canonical = new StringBuilder();
        foreach (var position in ordered)
        {
            canonical.Append(position.Code).Append('\t')
                .Append(position.Name).Append('\t')
                .Append(JsonSerializer.Serialize(position.Payload, JsonOptions)).Append('\n');
        }

        var sha256 = Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(canonical.ToString())));

        var items = ordered
            .Select(position => new ReferenceImportItemDto(
                position.Code,
                position.ParentCode,
                position.Name,
                position.Actual,
                position.Payload))
            .ToArray();

        return new NsiSnapshot(
            dataset,
            $"eis-{dataset}-{sha256[..16].ToLowerInvariant()}",
            "ЕИС getDocsIP, метод getNsiRequest, официальная выгрузка справочника НСИ",
            sourceUrl,
            sha256,
            ReadLastPublishDate(ordered),
            items);
    }

    /// <summary>Дата последней публикации версии позиции из тега publishDate.</summary>
    private static DateTimeOffset? ReadLastPublishDate(IEnumerable<NsiPosition> positions)
    {
        return positions
            .Select(position => position.Payload.TryGetValue("publishDate", out var value)
                ? value?.ToString()
                : null)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => DateTimeOffset.TryParse(
                value,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var parsed)
                ? parsed
                : (DateTimeOffset?)null)
            .Where(value => value is not null)
            .Max();
    }
}
