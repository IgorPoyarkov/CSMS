using System.Text;
using System.Xml.Linq;
using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Polly;

namespace Eis44Parser.Core;

/// <summary>
/// SOAP-клиент сервиса getDocsIP (этап 1). Запросы идут через локальный
/// ГОСТ-туннель; токен кладётся и в SOAP Header, и в HTTP-заголовок.
/// Порядок тегов фиксирован XSD getDocsIP-ws-api.xsd 17.0 и задаётся
/// SoapRequestBuilder. В XSD для region-запроса есть только exactDate
/// и oneHourInfo — произвольного интервала from/to там нет.
/// </summary>
public sealed class EisSoapClient : IEisSoapClient
{
    // SOAPAction из официальной WSDL getDocsIP: одинаков для всех операций.
    private const string SoapAction = "http://zakupki.gov.ru/fz44/queue/ws/get-docs-ip";

    private readonly HttpClient _httpClient;
    private readonly EisClientOptions _options;
    private readonly ILogger<EisSoapClient> _logger;
    private readonly ResiliencePipeline<HttpResponseMessage> _pipeline;

    public EisSoapClient(
        HttpClient httpClient,
        IOptions<EisClientOptions> options,
        ILogger<EisSoapClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
        _httpClient.Timeout = TimeSpan.FromMinutes(Math.Max(1, _options.RequestTimeoutMinutes));
        _pipeline = EisHttpPolicies.CreateRetryPipeline(_options, logger);
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<string>> FetchArchivesByRegionAsync(
        string regionCode,
        string documentType44,
        DateOnly date,
        string subsystemType,
        CancellationToken cancellationToken = default)
    {
        ValidateRegion(regionCode);

        var soap = SoapRequestBuilder.BuildRegionRequest(
            _options.IndividualPersonToken,
            regionCode,
            documentType44,
            date.ToDateTime(TimeOnly.MinValue),
            subsystemType,
            _options.Mode,
            Guid.NewGuid(),
            DateTime.UtcNow);

        return SendAsync(soap, cancellationToken);
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<string>> FetchArchivesByReestrNumberAsync(
        string reestrNumber,
        string subsystemType,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(reestrNumber))
        {
            throw new ArgumentException("Не задан реестровый номер.", nameof(reestrNumber));
        }

        var soap = SoapRequestBuilder.BuildReestrNumberRequest(
            _options.IndividualPersonToken,
            reestrNumber,
            subsystemType,
            _options.Mode,
            Guid.NewGuid(),
            DateTime.UtcNow);

        return SendAsync(soap, cancellationToken);
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<string>> FetchNsiArchiveUrlsAsync(
        string nsiCode,
        string nsiKind,
        CancellationToken cancellationToken = default)
    {
        var soap = SoapRequestBuilder.BuildNsiRequest(
            _options.IndividualPersonToken,
            nsiCode,
            nsiKind,
            _options.Mode,
            Guid.NewGuid(),
            DateTime.UtcNow);

        return SendAsync(soap, cancellationToken);
    }

    private async Task<IReadOnlyList<string>> SendAsync(string soapXml, CancellationToken cancellationToken)
    {
        if (!_options.SkipTunnelProbe)
        {
            await TunnelProbe.EnsureAvailableAsync(_options.BaseTunnelUrl, cancellationToken).ConfigureAwait(false);
        }

        await EisHttpPolicies.ThrottleAsync(_options, cancellationToken).ConfigureAwait(false);

        var endpoint = $"{_options.BaseTunnelUrl.TrimEnd('/')}/{_options.ServicePath.TrimStart('/')}";

        // HttpRequestMessage нельзя отправлять повторно: при каждом ретрае
        // Polly создаёт новый запрос с теми же заголовками и телом.
        using var response = await _pipeline
            .ExecuteAsync(async token =>
            {
                using var content = new StringContent(soapXml, Encoding.UTF8, "text/xml");
                using var request = new HttpRequestMessage(HttpMethod.Post, endpoint) { Content = content };
                request.Headers.Add("SOAPAction", SoapAction);
                request.Headers.Add("individualPerson_token", _options.IndividualPersonToken);
                return await _httpClient.SendAsync(request, token).ConfigureAwait(false);
            }, cancellationToken)
            .ConfigureAwait(false);

        var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                $"Ошибка ЕИС: {(int)response.StatusCode} {response.ReasonPhrase}. {Truncate(body)}");
        }

        var document = XDocument.Parse(body);
        var error = document.Descendants()
            .FirstOrDefault(element => element.Name.LocalName == "errorInfo")
            ?.Value;

        if (!string.IsNullOrWhiteSpace(error))
        {
            throw new InvalidOperationException($"Ошибка ЕИС: {error.Trim()}");
        }

        _logger.LogDebug("SOAP-ответ ЕИС: ссылок на архивы {Count}",
            document.Descendants().Count(element => element.Name.LocalName == "archiveUrl"));

        return document.Descendants()
            .Where(element => element.Name.LocalName == "archiveUrl")
            .Select(element => element.Value.Trim())
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }

    private static void ValidateRegion(string regionCode)
    {
        if (regionCode.Length != 2 || !regionCode.All(char.IsDigit))
        {
            // orgRegionKladrType в XSD — ровно 2 символа (код субъекта РФ).
            throw new ArgumentException("orgRegion должен быть двухзначным кодом субъекта РФ.", nameof(regionCode));
        }
    }

    private static string Truncate(string? value, int maxLength = 500) =>
        string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Length <= maxLength ? value : value[..maxLength] + "…";
}
