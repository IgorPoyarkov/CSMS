using System.IO.Compression;
using System.Xml.Linq;
using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Polly;

namespace Eis44Parser.Core;

/// <summary>
/// Совместимый клиент getDocsIP: SOAP-опрос делегируется EisSoapClient,
/// скачивание архива остаётся здесь для старого воркера. Новый конвейер
/// использует отдельные ArchiveDownloader и ArchiveProcessor.
/// </summary>
public sealed class Eis44Client : IEis44Client
{
    private readonly HttpClient _httpClient;
    private readonly EisClientOptions _options;
    private readonly ITenderXmlParser _parser;
    private readonly ILogger<Eis44Client> _logger;
    private readonly IEisSoapClient _soap;
    private readonly ResiliencePipeline<HttpResponseMessage> _pipeline;

    public Eis44Client(
        HttpClient httpClient,
        IOptions<EisClientOptions> options,
        ITenderXmlParser parser,
        IEisSoapClient soap,
        ILogger<Eis44Client> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _parser = parser;
        _soap = soap;
        _logger = logger;

        _httpClient.Timeout = TimeSpan.FromMinutes(Math.Max(1, _options.RequestTimeoutMinutes));
        _pipeline = EisHttpPolicies.CreateRetryPipeline(_options, logger);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<string>> FetchArchivesByRegionAsync(
        string regionCode,
        string documentType44,
        DateTime date,
        string subsystemType = EisSubsystems.Priz,
        CancellationToken cancellationToken = default)
    {
        return await _soap.FetchArchivesByRegionAsync(
            regionCode,
            documentType44,
            DateOnly.FromDateTime(date),
            subsystemType,
            cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<string>> FetchArchivesByReestrNumberAsync(
        string reestrNumber,
        string subsystemType = EisSubsystems.Priz,
        CancellationToken cancellationToken = default)
    {
        return await _soap.FetchArchivesByReestrNumberAsync(
            reestrNumber,
            subsystemType,
            cancellationToken).ConfigureAwait(false);
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
        return await _soap.FetchNsiArchiveUrlsAsync(nsiCode, nsiKind, cancellationToken)
            .ConfigureAwait(false);
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

    private static string Truncate(string? value, int maxLength = 500)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return value.Length <= maxLength ? value : value[..maxLength] + "…";
    }
}
