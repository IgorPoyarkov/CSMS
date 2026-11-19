using System.IO.Compression;
using System.Net;
using System.Text;
using System.Xml.Linq;
using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Polly;
using Polly.Retry;

namespace Eis44Parser.Core;

/// <summary>
/// Клиент сервиса getDocsIP. SOAP-запрос уходит на локальный Stunnel
/// (ГОСТ-TLS terminates на КриптоПро/msspi), скачивание архива — GET с
/// тем же токеном в заголовке individualPerson_token.
/// </summary>
public sealed class Eis44Client : IEis44Client
{
    // SOAPAction из официальной WSDL getDocsIP: у всех операций сервиса
    // (в том числе getNsi) он одинаковый.
    private const string SoapAction = "http://zakupki.gov.ru/fz44/queue/ws/get-docs-ip";

    private readonly HttpClient _httpClient;
    private readonly EisClientOptions _options;
    private readonly ITenderXmlParser _parser;
    private readonly ILogger<Eis44Client> _logger;
    private readonly ResiliencePipeline<HttpResponseMessage> _pipeline;

    public Eis44Client(
        HttpClient httpClient,
        IOptions<EisClientOptions> options,
        ITenderXmlParser parser,
        ILogger<Eis44Client> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _parser = parser;
        _logger = logger;

        _httpClient.Timeout = TimeSpan.FromMinutes(Math.Max(1, _options.RequestTimeoutMinutes));
        _pipeline = BuildRetryPipeline();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<string>> FetchArchivesByRegionAsync(
        string regionCode,
        string documentType44,
        DateTime date,
        string subsystemType = EisSubsystems.Priz,
        CancellationToken cancellationToken = default)
    {
        var soap = SoapRequestBuilder.BuildRegionRequest(
            _options.IndividualPersonToken,
            regionCode,
            documentType44,
            date,
            subsystemType,
            _options.Mode,
            Guid.NewGuid(),
            DateTime.UtcNow);

        return await SendSoapAndGetArchiveUrlsAsync(soap, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<string>> FetchArchivesByReestrNumberAsync(
        string reestrNumber,
        string subsystemType = EisSubsystems.Priz,
        CancellationToken cancellationToken = default)
    {
        var soap = SoapRequestBuilder.BuildReestrNumberRequest(
            _options.IndividualPersonToken,
            reestrNumber,
            subsystemType,
            _options.Mode,
            Guid.NewGuid(),
            DateTime.UtcNow);

        return await SendSoapAndGetArchiveUrlsAsync(soap, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<TenderDto>> DownloadAndParseArchiveAsync(
        string archiveUrl,
        string subsystemType = EisSubsystems.Priz,
        string documentType = "",
        CancellationToken cancellationToken = default)
    {
        var documents = await DownloadArchiveDocumentsAsync(archiveUrl, cancellationToken)
            .ConfigureAwait(false);

        var results = documents
            .Select(document => _parser.Parse(document.Document, document.FileName) with
            {
                ArchiveUrl = archiveUrl,
                SubsystemType = subsystemType,
                DocumentType = documentType,
            })
            .ToArray();

        _logger.LogInformation(
            "Из архива {Archive} прочитано документов: {Count}",
            archiveUrl,
            results.Length);

        return results;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<string>> FetchNsiArchiveUrlsAsync(
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

        return await SendSoapAndGetArchiveUrlsAsync(soap, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<XDocument>> DownloadArchiveXmlAsync(
        string archiveUrl,
        CancellationToken cancellationToken = default)
    {
        var documents = await DownloadArchiveDocumentsAsync(archiveUrl, cancellationToken)
            .ConfigureAwait(false);
        return documents.Select(document => document.Document).ToArray();
    }

    /// <summary>
    /// Скачивание ZIP через туннель. Общая часть для извещений и справочников:
    /// и там и там ссылка ведёт на архив с XML, только парсеры разные.
    /// </summary>
    private async Task<IReadOnlyList<(string FileName, XDocument Document)>> DownloadArchiveDocumentsAsync(
        string archiveUrl,
        CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(archiveUrl, UriKind.Absolute, out var archiveUri))
        {
            throw new ArgumentException($"Некорректная ссылка на архив ЕИС: {archiveUrl}", nameof(archiveUrl));
        }

        await TunnelProbe.EnsureAvailableAsync(_options.BaseTunnelUrl, cancellationToken)
            .ConfigureAwait(false);

        // Домен ЕИС подменяем на локальный туннель: ГОСТ-шифрование делает Stunnel.
        var localUrl = $"{_options.BaseTunnelUrl.TrimEnd('/')}{archiveUri.PathAndQuery}";

        Task<HttpResponseMessage> Send(CancellationToken token)
        {
            var request = new HttpRequestMessage(HttpMethod.Get, localUrl);
            request.Headers.Add("individualPerson_token", _options.IndividualPersonToken);
            return _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, token);
        }

        ValueTask<HttpResponseMessage> SendWithRetry(CancellationToken token) => new(Send(token));

        using var response = await _pipeline
            .ExecuteAsync(SendWithRetry, cancellationToken)
            .ConfigureAwait(false);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            throw new HttpRequestException(
                $"Не удалось скачать архив ЕИС: {(int)response.StatusCode} {response.ReasonPhrase}. {Truncate(body)}");
        }

        await using var zipStream = await response.Content
            .ReadAsStreamAsync(cancellationToken)
            .ConfigureAwait(false);
        using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);

        var documents = new List<(string, XDocument)>();
        foreach (var entry in archive.Entries.Where(entry =>
                     entry.FullName.EndsWith(".xml", StringComparison.OrdinalIgnoreCase)))
        {
            cancellationToken.ThrowIfCancellationRequested();

            await using var entryStream = entry.Open();
            documents.Add((entry.FullName, await XDocument
                .LoadAsync(entryStream, LoadOptions.None, cancellationToken)
                .ConfigureAwait(false)));
        }

        return documents;
    }

    private async Task<IReadOnlyList<string>> SendSoapAndGetArchiveUrlsAsync(
        string soapXml,
        CancellationToken cancellationToken)
    {
        await TunnelProbe.EnsureAvailableAsync(_options.BaseTunnelUrl, cancellationToken)
            .ConfigureAwait(false);

        var endpoint = $"{_options.BaseTunnelUrl.TrimEnd('/')}/{_options.ServicePath.TrimStart('/')}";
        using var content = new StringContent(soapXml, Encoding.UTF8, "text/xml");
        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint) { Content = content };
        request.Headers.Add("SOAPAction", SoapAction);
        // Токен дублируется в HTTP-заголовке: часть шлюзов ЕИС читает его
        // оттуда, даже когда SOAP-заголовок уже заполнен.
        request.Headers.Add("individualPerson_token", _options.IndividualPersonToken);

        ValueTask<HttpResponseMessage> PostWithRetry(CancellationToken token) =>
            new(_httpClient.SendAsync(request, token));

        using var response = await _pipeline
            .ExecuteAsync(PostWithRetry, cancellationToken)
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

        return document.Descendants()
            .Where(element => element.Name.LocalName == "archiveUrl")
            .Select(element => element.Value.Trim())
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }

    private ResiliencePipeline<HttpResponseMessage> BuildRetryPipeline()
    {
        var delay = TimeSpan.FromMilliseconds(Math.Max(100, _options.RetryBaseDelayMs));

        return new ResiliencePipelineBuilder<HttpResponseMessage>()
            .AddRetry(new RetryStrategyOptions<HttpResponseMessage>
            {
                MaxRetryAttempts = Math.Max(0, _options.MaxRetryAttempts),
                Delay = delay,
                BackoffType = DelayBackoffType.Exponential,
                ShouldHandle = args => ValueTask.FromResult(
                    args.Outcome.Exception is HttpRequestException or TaskCanceledException ||
                    (args.Outcome.Result is { IsSuccessStatusCode: false } result && IsTransient(result.StatusCode))),
                OnRetry = args =>
                {
                    _logger.LogWarning(
                        "Запрос к ЕИС повторяется (попытка {Attempt}): {Reason}",
                        args.AttemptNumber,
                        args.Outcome.Exception?.Message ?? args.Outcome.Result?.StatusCode.ToString());
                    return ValueTask.CompletedTask;
                },
            })
            .Build();
    }

    private static bool IsTransient(HttpStatusCode statusCode) =>
        statusCode is HttpStatusCode.TooManyRequests or
            HttpStatusCode.RequestTimeout or
            HttpStatusCode.InternalServerError or
            HttpStatusCode.BadGateway or
            HttpStatusCode.ServiceUnavailable or
            HttpStatusCode.GatewayTimeout;

    private static string Truncate(string? value, int maxLength = 500)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return value.Length <= maxLength ? value : value[..maxLength] + "…";
    }
}
