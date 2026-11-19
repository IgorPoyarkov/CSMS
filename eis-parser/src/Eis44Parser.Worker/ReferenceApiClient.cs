using System.Net.Http.Json;
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

    private static string Truncate(string value, int maxLength = 500) =>
        value.Length <= maxLength ? value : value[..maxLength] + "…";
}
