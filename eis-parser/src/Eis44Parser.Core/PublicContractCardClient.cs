using System.IO.Compression;
using System.Net;
using System.Text.RegularExpressions;

namespace Eis44Parser.Core;

/// <summary>Ссылка на файл во вложениях публичной карточки контракта.</summary>
public sealed record PublicContractFile(string Uid, string Title, string Url);

/// <summary>
/// Публичный доступ к карточке контракта zakupki.gov.ru. Токен ЕИС не нужен:
/// достаточно реестрового номера в параметре reestrNumber. Клиент читает вкладку
/// «Документы», скачивает вложения и распаковывает ZIP-пакеты приёмки.
/// Zakupki жёстко ограничивает частоту запросов (429), поэтому все запросы
/// идут с паузой и повторяются с экспоненциальной задержкой.
/// </summary>
public sealed class PublicContractCardClient
{
    private const string BaseUrl = "https://zakupki.gov.ru";
    private const string FileUrl = BaseUrl + "/44fz/filestore/public/1.0/download/rgk2/file.html?uid=";
    private const string DocumentsUrl = BaseUrl + "/epz/contract/contractCard/document-info.html?reestrNumber=";
    private const string SearchUrl = BaseUrl + "/epz/contract/search/results.html?customerINN={0}&recordsPerPage=_500&pageNumber={1}";
    private const int MaxAttempts = 8;

    private static readonly Regex FileLink = new(
        @"uid=([0-9A-F]{32})""[^>]*title=""([^""]*)""",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex ContractLink = new(
        @"common-info\.html\?reestrNumber=(\d{19})",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private readonly HttpClient _httpClient;
    private readonly TimeSpan _requestDelay;
    private DateTime _lastRequestAt = DateTime.MinValue;

    public PublicContractCardClient(HttpClient? httpClient = null, TimeSpan? requestDelay = null)
    {
        _httpClient = httpClient ?? new HttpClient
        {
            Timeout = TimeSpan.FromMinutes(3),
        };
        _requestDelay = requestDelay ?? TimeSpan.FromMilliseconds(400);
        if (!_httpClient.DefaultRequestHeaders.UserAgent.Any())
        {
            _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (CSMS parser)");
        }
    }

    /// <summary>Все вложения вкладки «Документы» по реестровому номеру.</summary>
    public async Task<IReadOnlyList<PublicContractFile>> GetDocumentFilesAsync(
        string regNumber,
        CancellationToken cancellationToken = default)
    {
        using var response = await GetWithRetryAsync(DocumentsUrl + regNumber, cancellationToken);
        var html = await response.Content.ReadAsStringAsync(cancellationToken);
        return FileLink.Matches(html)
            .Select(match => new PublicContractFile(
                match.Groups[1].Value,
                match.Groups[2].Value,
                FileUrl + match.Groups[1].Value))
            .GroupBy(file => file.Uid, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .ToList();
    }

    /// <summary>Скачать один файл вложения.</summary>
    public async Task<byte[]> DownloadAsync(
        PublicContractFile file,
        CancellationToken cancellationToken = default)
    {
        using var response = await GetWithRetryAsync(file.Url, cancellationToken);
        return await response.Content.ReadAsByteArrayAsync(cancellationToken);
    }

    /// <summary>
    /// Перечислить реестровые номера контрактов заказчика по ИНН. Публичный поиск
    /// отдаёт по 500 записей на страницу; обход продолжаем, пока страница не пуста.
    /// </summary>
    public async Task<IReadOnlyList<string>> EnumerateContractsByInnAsync(
        string customerInn,
        CancellationToken cancellationToken = default)
    {
        var result = new SortedSet<string>(StringComparer.Ordinal);
        for (var page = 1; page <= 20; page++)
        {
            var url = string.Format(SearchUrl, customerInn, page);
            using var response = await GetWithRetryAsync(url, cancellationToken);
            var html = await response.Content.ReadAsStringAsync(cancellationToken);
            var found = ContractLink.Matches(html)
                .Select(match => match.Groups[1].Value)
                .Where(value => result.Add(value))
                .ToList();
            if (found.Count == 0)
            {
                break;
            }
        }

        return result.ToList();
    }

    /// <summary>Перечислить XML внутри скачанного ZIP-пакета.</summary>
    public static IReadOnlyList<(string Name, byte[] Bytes)> ReadZipEntries(byte[] archive)
    {
        using var stream = new MemoryStream(archive);
        using var zip = new ZipArchive(stream, ZipArchiveMode.Read);
        var result = new List<(string, byte[])>();
        foreach (var entry in zip.Entries.Where(item =>
                     item.FullName.EndsWith(".xml", StringComparison.OrdinalIgnoreCase)))
        {
            using var entryStream = entry.Open();
            using var buffer = new MemoryStream();
            entryStream.CopyTo(buffer);
            result.Add((entry.FullName, buffer.ToArray()));
        }

        return result;
    }

    /// <summary>
    /// Год из реестрового номера ЕИС: позиции 11–12 содержат две цифры года
    /// (например, …3926… → 2026). Используется только для быстрой фильтрации.
    /// </summary>
    public static int? YearFromRegNumber(string regNumber) =>
        regNumber.Length >= 13 && int.TryParse(regNumber.AsSpan(11, 2), out var year)
            ? 2000 + year
            : null;

    private async Task<HttpResponseMessage> GetWithRetryAsync(
        string url,
        CancellationToken cancellationToken)
    {
        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            await ThrottleAsync(cancellationToken);
            var response = await _httpClient.GetAsync(
                url,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            if (response.StatusCode == HttpStatusCode.TooManyRequests && attempt < MaxAttempts)
            {
                var retryAfter = response.Headers.RetryAfter;
                var delay = retryAfter?.Delta
                    ?? (retryAfter?.Date - DateTimeOffset.UtcNow)
                    ?? TimeSpan.FromSeconds(Math.Min(5 * Math.Pow(2, attempt - 1), 60));
                if (delay < TimeSpan.Zero || delay > TimeSpan.FromMinutes(2))
                {
                    delay = TimeSpan.FromSeconds(Math.Min(5 * Math.Pow(2, attempt - 1), 60));
                }

                response.Dispose();
                await Task.Delay(delay, cancellationToken);
                continue;
            }

            response.EnsureSuccessStatusCode();
            return response;
        }

        throw new HttpRequestException($"zakupki.gov.ru вернул 429 после {MaxAttempts} попыток: {url}");
    }

    private async Task ThrottleAsync(CancellationToken cancellationToken)
    {
        var elapsed = DateTime.UtcNow - _lastRequestAt;
        if (elapsed < _requestDelay)
        {
            await Task.Delay(_requestDelay - elapsed, cancellationToken);
        }

        _lastRequestAt = DateTime.UtcNow;
    }
}
