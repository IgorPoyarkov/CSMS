using System.Text.Json;
using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Eis44Parser.Core.Fns;

/// <summary>
/// Карточки организаций через api-fns.ru: GET /api/egr?req={ИНН}&key={ключ}.
/// Ответ у сервиса менялся между версиями, поэтому поля ищем по нескольким
/// именам (русским и латинским), а не привязываемся к одной схеме.
/// </summary>
public sealed class ApiFnsContractorClient(
    HttpClient http,
    IOptions<FnsOptions> options,
    ILogger<ApiFnsContractorClient> logger) : IFnsContractorClient
{
    public string ProviderName => "api-fns";

    public async Task<ContractorInfo?> GetByInnAsync(
        string inn,
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (!settings.HasApiKey || string.IsNullOrWhiteSpace(inn))
        {
            return null;
        }

        var url =
            $"{settings.ApiFnsBaseUrl.TrimEnd('/')}/api/egr" +
            $"?req={Uri.EscapeDataString(inn.Trim())}" +
            $"&key={Uri.EscapeDataString(settings.ApiKey!)}";

        try
        {
            using var response = await http.GetAsync(url, cancellationToken).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning(
                    "api-fns.ru: ИНН {Inn} — HTTP {Status}",
                    inn,
                    (int)response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            using var document = JsonDocument.Parse(json);
            var found = FindItem(document.RootElement);
            if (found is null)
            {
                return null;
            }

            var item = found.Value;
            var status = NormalizeStatus(GetString(item, "Статус", "STATUS", "status"));
            var isSmp = ParseBool(GetString(item, "КатегорияСубъекта", "isSmp", "SMP"));

            return new ContractorInfo(
                Inn: GetString(item, "ИНН", "INN", "inn") ?? inn.Trim(),
                Kpp: GetString(item, "КПП", "KPP", "kpp"),
                Name: GetString(item, "НаимСокр", "NAIMSOKR", "shortName", "name"),
                FullName: GetString(item, "НаимПолн", "NAIMPOLN", "fullName", "name"),
                Ogrn: GetString(item, "ОГРН", "OGRN", "ogrn"),
                Address: GetString(item, "АдресПолн", "ADRESSPOLN", "address"),
                Status: status,
                IsSmp: isSmp,
                IsSono: ParseBool(GetString(item, "isSono", "SONO")),
                Source: ProviderName,
                RawJson: json);
        }
        catch (Exception exception) when (
            exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning(exception, "api-fns.ru: не удалось получить карточку по ИНН {Inn}", inn);
            return null;
        }
    }

    /// <summary>Ответ бывает массивом, объектом с items/data/result или сразу карточкой.</summary>
    private static JsonElement? FindItem(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Array)
        {
            return root.GetArrayLength() > 0 ? root[0] : null;
        }

        if (root.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        foreach (var name in new[] { "items", "data", "result", "rows" })
        {
            if (!root.TryGetProperty(name, out var value))
            {
                continue;
            }

            if (value.ValueKind == JsonValueKind.Array && value.GetArrayLength() > 0)
            {
                return value[0];
            }

            if (value.ValueKind == JsonValueKind.Object)
            {
                return value;
            }
        }

        return root;
    }

    internal static string? GetString(JsonElement element, params string[] names)
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        foreach (var name in names)
        {
            foreach (var property in element.EnumerateObject())
            {
                if (!property.Name.Equals(name, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (property.Value.ValueKind == JsonValueKind.String)
                {
                    var value = property.Value.GetString();
                    return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
                }

                if (property.Value.ValueKind is JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False)
                {
                    return property.Value.ToString();
                }
            }
        }

        return null;
    }

    private static bool? ParseBool(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (bool.TryParse(value, out var parsed))
        {
            return parsed;
        }

        return value.Trim() switch
        {
            "1" or "да" or "Да" or "true" or "TRUE" => true,
            "0" or "нет" or "Нет" or "false" or "FALSE" => false,
            _ => null,
        };
    }

    private static string? NormalizeStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim().ToLowerInvariant();
        if (normalized.Contains("ликвидац") || normalized.Contains("исключ"))
        {
            return "liquidated";
        }

        if (normalized.Contains("действ") || normalized.Contains("активн"))
        {
            return "active";
        }

        return value.Trim();
    }
}
