using System.Text.Json;
using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Eis44Parser.Core.Fns;

/// <summary>
/// Карточки организаций из открытого сервиса ФНС «Прозрачный бизнес»
/// (pb.nalog.ru). Ключ не нужен, но сервис отвечает только браузерным
/// клиентам, поэтому запросы идут form-urlencoded с обычными заголовками.
/// Структура ответа не документирована и меняется — поля ищем рекурсивно
/// по известным именам, при любой ошибке возвращаем null.
/// </summary>
public sealed class TransparentBusinessContractorClient(
    HttpClient http,
    IOptions<FnsOptions> options,
    ILogger<TransparentBusinessContractorClient> logger) : IFnsContractorClient
{
    public string ProviderName => "transparent";

    public async Task<ContractorInfo?> GetByInnAsync(
        string inn,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(inn))
        {
            return null;
        }

        var normalizedInn = inn.Trim();
        var settings = options.Value;
        var baseUrl = settings.TransparentBaseUrl.TrimEnd('/');

        try
        {
            var searchJson = await PostFormAsync(
                $"{baseUrl}/search-proc.json",
                new Dictionary<string, string>
                {
                    ["query"] = normalizedInn,
                    ["page"] = "1",
                    ["pageSize"] = "10",
                    ["mode"] = "search-proc",
                    ["vyp3Check"] = "1",
                    ["dateFormat"] = "date",
                },
                cancellationToken).ConfigureAwait(false);

            if (searchJson is null)
            {
                return null;
            }

            using var searchDocument = JsonDocument.Parse(searchJson);
            var found = FindObjectByInn(searchDocument.RootElement, normalizedInn);
            if (found is null)
            {
                return null;
            }

            var id = ApiFnsContractorClient.GetString(found.Value, "id", "idOrg", "orgId", "idUL");
            if (string.IsNullOrWhiteSpace(id))
            {
                return null;
            }

            var cardJson = await PostFormAsync(
                $"{baseUrl}/company-proc.json",
                new Dictionary<string, string>
                {
                    ["id"] = id,
                    ["idType"] = "1",
                },
                cancellationToken).ConfigureAwait(false);

            if (cardJson is null)
            {
                return null;
            }

            using var cardDocument = JsonDocument.Parse(cardJson);
            var card = FindCard(cardDocument.RootElement) ?? cardDocument.RootElement;

            return new ContractorInfo(
                Inn: ApiFnsContractorClient.GetString(card, "inn", "ИНН") ?? normalizedInn,
                Kpp: ApiFnsContractorClient.GetString(card, "kpp", "КПП"),
                Name: ApiFnsContractorClient.GetString(card, "name", "shortName", "НаимСокр"),
                FullName: ApiFnsContractorClient.GetString(card, "fullName", "НаимПолн"),
                Ogrn: ApiFnsContractorClient.GetString(card, "ogrn", "ОГРН"),
                Address: ApiFnsContractorClient.GetString(card, "address", "АдресПолн"),
                Status: ApiFnsContractorClient.GetString(card, "status", "Статус"),
                IsSmp: null,
                IsSono: null,
                Source: ProviderName,
                RawJson: cardJson);
        }
        catch (Exception exception) when (
            exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning(
                exception,
                "Прозрачный бизнес: не удалось получить карточку по ИНН {Inn}",
                normalizedInn);
            return null;
        }
    }

    private async Task<string?> PostFormAsync(
        string url,
        IReadOnlyDictionary<string, string> form,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new FormUrlEncodedContent(form),
        };
        request.Headers.TryAddWithoutValidation("Referer", "https://pb.nalog.ru/");
        request.Headers.TryAddWithoutValidation("X-Requested-With", "XMLHttpRequest");
        request.Headers.TryAddWithoutValidation(
            "Accept",
            "application/json, text/javascript, */*; q=0.01");

        using var response = await http.SendAsync(request, cancellationToken).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning(
                "Прозрачный бизнес: {Url} — HTTP {Status}",
                url,
                (int)response.StatusCode);
            return null;
        }

        return await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
    }

    private static JsonElement? FindObjectByInn(JsonElement element, string inn)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
            {
                var value = ApiFnsContractorClient.GetString(element, "inn", "ИНН", "innUl", "innFl");
                if (string.Equals(value, inn, StringComparison.Ordinal))
                {
                    return element;
                }

                foreach (var property in element.EnumerateObject())
                {
                    var found = FindObjectByInn(property.Value, inn);
                    if (found is not null)
                    {
                        return found;
                    }
                }

                return null;
            }
            case JsonValueKind.Array:
            {
                foreach (var item in element.EnumerateArray())
                {
                    var found = FindObjectByInn(item, inn);
                    if (found is not null)
                    {
                        return found;
                    }
                }

                return null;
            }
            default:
                return null;
        }
    }

    /// <summary>Карточка бывает в company/data/result или прямо в корне.</summary>
    private static JsonElement? FindCard(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        foreach (var name in new[] { "company", "data", "result", "row" })
        {
            if (root.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Object)
            {
                return value;
            }
        }

        return null;
    }
}
