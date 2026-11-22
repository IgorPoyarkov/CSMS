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
    private const string CommonInfoUrl = BaseUrl + "/epz/contract/contractCard/common-info.html?reestrNumber=";
    private const string PrintFormUrl = BaseUrl + "/epz/contract/printForm/view.html?contractReestrNumber=";
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

    /// <summary>
    /// HTML печатной формы карточки контракта. В XML контрактов 2026 года
    /// заказчик не публикует блок subContractorsSum, но на сайте сведения о
    /// привлечении СМП/СОНО видны. Печатная форма — полный источник: таблица
    /// субподрядчиков отдаётся целиком, без пагинации вкладки «Общая информация».
    /// Разбор — в <see cref="ContractSmpHtmlParser"/>.
    /// </summary>
    public async Task<string> GetPrintFormHtmlAsync(
        string regNumber,
        CancellationToken cancellationToken = default)
    {
        using var response = await GetWithRetryAsync(PrintFormUrl + regNumber, cancellationToken);
        return await response.Content.ReadAsStringAsync(cancellationToken);
    }

    /// <summary>
    /// HTML вкладки «Общая информация». Оставлен как запасной источник:
    /// таблица субподрядчиков здесь обрезается до 10 строк, но требование
    /// и первая страница списка доступны без печатной формы.
    /// </summary>
    public async Task<string> GetCommonInfoHtmlAsync(
        string regNumber,
        CancellationToken cancellationToken = default)
    {
        using var response = await GetWithRetryAsync(CommonInfoUrl + regNumber, cancellationToken);
        return await response.Content.ReadAsStringAsync(cancellationToken);
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
            try
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
                        ?? Backoff(attempt);
                    if (delay < TimeSpan.Zero || delay > TimeSpan.FromMinutes(2))
                    {
                        delay = Backoff(attempt);
                    }

                    response.Dispose();
                    await Task.Delay(delay, cancellationToken);
                    continue;
                }

                response.EnsureSuccessStatusCode();
                return response;
            }
            catch (HttpRequestException) when (attempt < MaxAttempts)
            {
                // Обрыв соединения или 5xx — тоже временный сбой, повторяем.
                await Task.Delay(Backoff(attempt), cancellationToken);
            }
        }

        throw new HttpRequestException($"zakupki.gov.ru не отдал данные после {MaxAttempts} попыток: {url}");
    }

    private static TimeSpan Backoff(int attempt) =>
        TimeSpan.FromSeconds(Math.Min(5 * Math.Pow(2, attempt - 1), 60));

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
