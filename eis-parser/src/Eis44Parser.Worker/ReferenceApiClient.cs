using System.Net.Http.Json;
using System.Text.Json;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Options;

namespace Eis44Parser.Worker;

/// <summary>
/// Публикация готового снимка в csms-api. Токен ЕИС сюда не попадает:
/// бэк сам хранит версии и рассылает обновление через SSE.
/// </summary>
internal sealed class ReferenceApiClient(HttpClient http, IOptions<EisNsiOptions> options)
{
    public async Task<string> PublishAsync(
        ReferenceImportRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var url = $"{options.Value.ApiBaseUrl.TrimEnd('/')}/api/references/import";
        using var response = await http.PostAsync(url, JsonContent.Create(request), cancellationToken)
            .ConfigureAwait(false);

        var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"csms-api вернул {(int)response.StatusCode} {response.ReasonPhrase}: {Truncate(body)}");
        }

        return body;
    }

    /// <summary>
    /// Текущий опубликованный справочник. Используется при ежедневном
    /// RSS-мониторинге: новые карточки добавляются к уже опубликованному снимку,
    /// а не вместо него. API отдаёт не более 500 записей за запрос.
    /// </summary>
    public async Task<IReadOnlyList<ReferenceImportItemDto>> GetItemsAsync(
        string dataset,
        CancellationToken cancellationToken = default)
    {
        const int pageSize = 500;
        var result = new List<ReferenceImportItemDto>();

        for (var skip = 0; ; skip += pageSize)
        {
            var url = $"{options.Value.ApiBaseUrl.TrimEnd('/')}/api/references/{dataset}/items" +
                      $"?take={pageSize}&skip={skip}";
            using var response = await http.GetAsync(url, cancellationToken).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"csms-api вернул {(int)response.StatusCode} {response.ReasonPhrase} при чтении {dataset}.");
            }

            using var document = JsonDocument.Parse(
                await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false));
            var root = document.RootElement;
            var array = root.ValueKind == JsonValueKind.Array
                ? root
                : root.TryGetProperty("items", out var items)
                    ? items
                    : default;

            if (array.ValueKind != JsonValueKind.Array || array.GetArrayLength() == 0)
            {
                break;
            }

            foreach (var element in array.EnumerateArray())
            {
                var code = element.TryGetProperty("code", out var codeProperty)
                    ? codeProperty.GetString()
                    : null;
                var name = element.TryGetProperty("name", out var nameProperty)
                    ? nameProperty.GetString()
                    : null;
                if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
                {
                    continue;
                }

                var parentCode = element.TryGetProperty("parentCode", out var parent)
                    ? parent.GetString()
                    : null;
                var actual = element.TryGetProperty("actual", out var actualProperty) &&
                             actualProperty.ValueKind == JsonValueKind.True;

                object payload = new Dictionary<string, object?>();
                if (element.TryGetProperty("payloadJson", out var payloadProperty) &&
                    payloadProperty.ValueKind == JsonValueKind.String &&
                    !string.IsNullOrWhiteSpace(payloadProperty.GetString()))
                {
                    payload = JsonDocument.Parse(payloadProperty.GetString()!).RootElement.Clone();
                }

                result.Add(new ReferenceImportItemDto(code, parentCode, name, actual, payload));
            }

            if (array.GetArrayLength() < pageSize)
            {
                break;
            }
        }

        return result;
    }

    private static string Truncate(string value, int maxLength = 500) =>
        value.Length <= maxLength ? value : value[..maxLength] + "…";
}
