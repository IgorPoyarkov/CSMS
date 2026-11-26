using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Eis44Parser.Core;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Eis44Parser.Worker;

/// <summary>
/// Обход публичных карточек КТРУ без токена ЕИС. Перебираем 11-значный
/// префикс ОКПД2 + восьмизначный suffix; у укрупнённых позиций идём по тегу
/// «N позиций» и собираем Children, а не верим первому же 404.
/// </summary>
internal sealed class KtruHtmlImportService(
    IHttpClientFactory httpFactory,
    IOptions<KtruHtmlOptions> htmlOptions,
    IOptions<EisNsiOptions> nsiOptions,
    ILogger<KtruHtmlImportService> logger)
{
    private static readonly Regex Okpd2Pattern = new(
        "^\\d{2}\\.\\d{2}\\.\\d{2}\\.\\d{3}$",
        RegexOptions.CultureInvariant);

    private readonly KtruHtmlOptions _options = htmlOptions.Value;
    private readonly IHttpClientFactory _http = httpFactory;

    private sealed record HttpResult(string? Body, HttpStatusCode? Status);

    public async Task<NsiSnapshot> BuildSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var prefixes = await LoadPrefixesAsync(cancellationToken).ConfigureAwait(false);
        logger.LogInformation(
            "КТРУ HTML: префиксов ОКПД2 — {Count}, потолок suffix — {Max}",
            prefixes.Count,
            _options.MaxSuffix);

        var cards = new Dictionary<string, KtruCardHtmlRecord>(StringComparer.Ordinal);
        // Счётчик общий для всех префиксов: три пустых подряд означают,
        // что дальше идти бессмысленно (дыры в суффиксах — норма).
        var empty = 0;

        foreach (var prefix in prefixes)
        {
            cancellationToken.ThrowIfCancellationRequested();

            for (var suffix = 1; suffix <= _options.MaxSuffix; suffix++)
            {
                var id = $"{prefix}-{suffix.ToString("D8", CultureInfo.InvariantCulture)}";
                var response = await GetAsync(CardUrl(id), cancellationToken).ConfigureAwait(false);
                var body = response.Body;

                if (body is null || !KtruCardHtmlParser.IsCard(body))
                {
                    empty++;
                    logger.LogDebug("КТРУ {Id}: пусто ({Status}), подряд {Empty}", id, response.Status, empty);
                    if (empty >= _options.StopAfterEmpty)
                    {
                        logger.LogInformation(
                            "КТРУ: глобальный стоп после {Empty} подряд пустых (последний {Id})",
                            empty,
                            id);
                        return await FinishAsync(cards, cancellationToken).ConfigureAwait(false);
                    }

                    await PauseAsync(cancellationToken).ConfigureAwait(false);
                    continue;
                }

                empty = 0;
                await CollectOneAsync(id, cards, cancellationToken).ConfigureAwait(false);

                if (_options.Take > 0 && cards.Count >= _options.Take)
                {
                    break;
                }

                await PauseAsync(cancellationToken).ConfigureAwait(false);
            }

            if (_options.Take > 0 && cards.Count >= _options.Take)
            {
                break;
            }
        }

        return await FinishAsync(cards, cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Запрос страницы ЕИС. В отличие от карточек, 404 у поиска/RSS бывает
    /// временным (ЕИС отвечает 404 примерно на каждый второй запрос), поэтому
    /// здесь он тоже считается retryable.
    /// </summary>
    public async Task<string?> GetTextAsync(string url, CancellationToken cancellationToken = default)
    {
        // ЕИС отдаёт временный 404 примерно на каждый второй запрос: шести
        // попыток достаточно, чтобы лента не выглядела «пропавшей».
        var attempts = Math.Max(_options.MaxRetries, 6);
        return (await GetAsync(url, cancellationToken, retryNotFound: true, attempts).ConfigureAwait(false)).Body;
    }

    /// <summary>Относительный путь ЕИС → абсолютный URL.</summary>
    public string ToAbsolute(string path) => Absolute(path);

    /// <summary>Собрать карточки по явному списку кодов (для RSS-мониторинга).</summary>
    public async Task<Dictionary<string, KtruCardHtmlRecord>> CollectCardsAsync(
        IEnumerable<string> codes,
        CancellationToken cancellationToken = default)
    {
        var cards = new Dictionary<string, KtruCardHtmlRecord>(StringComparer.Ordinal);
        foreach (var code in codes.Distinct(StringComparer.Ordinal))
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (!KtruCardHtmlParser.IsSupportedCode(code))
            {
                // Составные коды лекарств (ЕСКЛП) пока не поддерживаем.
                logger.LogDebug("КТРУ {Code}: пропущен неподдерживаемый формат", code);
                continue;
            }

            await CollectOneAsync(code, cards, cancellationToken).ConfigureAwait(false);
        }

        return cards;
    }

    /// <summary>Одна карточка плюс дочерние позиции укрупнённой записи.</summary>
    private async Task CollectOneAsync(
        string id,
        Dictionary<string, KtruCardHtmlRecord> cards,
        CancellationToken cancellationToken)
    {
        var response = await GetAsync(CardUrl(id), cancellationToken).ConfigureAwait(false);
        if (response.Body is null || !KtruCardHtmlParser.IsCard(response.Body))
        {
            return;
        }

        var card = KtruCardHtmlParser.ParseCard(response.Body, id);
        cards.TryAdd(card.Code, card);

        // У укрупнённой позиции в строке поиска есть «N позиций» —
        // по этой ссылке ЕИС отдаёт точный список дочерних itemId.
        var search = await GetAsync(SearchUrl(card.Code), cancellationToken).ConfigureAwait(false);
        var nesting = search.Body is null
            ? null
            : KtruCardHtmlParser.ParseNesting(search.Body);

        if (nesting is { Count: > 0 })
        {
            var childrenPage = await GetAsync(ChildUrl(nesting.RelativeUrl), cancellationToken)
                .ConfigureAwait(false);
            var childIds = childrenPage.Body is null
                ? []
                : KtruCardHtmlParser.ParseChildIds(childrenPage.Body);

            foreach (var childId in childIds)
            {
                if (!KtruCardHtmlParser.IsSupportedCode(childId))
                {
                    continue;
                }

                var childResponse = await GetAsync(CardUrl(childId), cancellationToken)
                    .ConfigureAwait(false);
                if (childResponse.Body is null || !KtruCardHtmlParser.IsCard(childResponse.Body))
                {
                    continue;
                }

                cards.TryAdd(childId, KtruCardHtmlParser.ParseCard(childResponse.Body, childId));
                await PauseAsync(cancellationToken).ConfigureAwait(false);
            }

            cards[card.Code] = cards[card.Code] with { ChildCodes = childIds };
            if (childIds.Count != nesting.Count)
            {
                logger.LogWarning(
                    "КТРУ {Code}: заявлено дочерних {Declared}, найдено {Found}",
                    card.Code,
                    nesting.Count,
                    childIds.Count);
            }
            else
            {
                logger.LogInformation(
                    "КТРУ {Code}: укрупнённая, дочерних {Count}",
                    card.Code,
                    childIds.Count);
            }
        }

        await PauseAsync(cancellationToken).ConfigureAwait(false);
    }

    /// <summary>Догружаем характеристики/справочники и собираем снимок.</summary>
    public async Task<NsiSnapshot> FinishAsync(
        Dictionary<string, KtruCardHtmlRecord> cards,
        CancellationToken cancellationToken)
    {
        logger.LogInformation("КТРУ HTML: собрано карточек — {Count}", cards.Count);
        await EnrichCharacteristicsAsync(cards, cancellationToken).ConfigureAwait(false);
        await EnrichReferenceTablesAsync(cards, cancellationToken).ConfigureAwait(false);

        var snapshot = KtruHtmlSnapshotBuilder.Build(
            cards.Values.ToArray(),
            nsiOptions.Value.Dataset,
            Absolute(_options.SearchPath),
            DateTimeOffset.UtcNow);

        logger.LogInformation(
            "КТРУ HTML: версия {Version}, SHA-256 {Hash}, позиций {Count}",
            snapshot.Version,
            snapshot.SourceSha256,
            snapshot.Items.Count);

        return snapshot;
    }

    /// <summary>Префиксы из CLI или из нашего справочника ОКПД2.</summary>
    private async Task<IReadOnlyList<string>> LoadPrefixesAsync(CancellationToken cancellationToken)
    {
        if (_options.Prefixes.Count > 0)
        {
            return _options.Prefixes
                .Where(prefix => Okpd2Pattern.IsMatch(prefix))
                .Distinct(StringComparer.Ordinal)
                .ToArray();
        }

        var response = await GetAsync(_options.Okpd2ApiUrl, cancellationToken).ConfigureAwait(false);
        if (response.Body is null)
        {
            throw new InvalidOperationException(
                $"Не удалось получить ОКПД2 из {_options.Okpd2ApiUrl} (HTTP {response.Status}).");
        }

        using var document = JsonDocument.Parse(response.Body);
        var root = document.RootElement;
        var array = root.ValueKind == JsonValueKind.Array
            ? root
            : root.TryGetProperty("items", out var items)
                ? items
                : root.TryGetProperty("data", out var data)
                    ? data
                    : default;

        if (array.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException("API ОКПД2 вернул неизвестную форму ответа.");
        }

        var codes = new List<string>();
        foreach (var element in array.EnumerateArray())
        {
            var code = element.TryGetProperty("code", out var lower)
                ? lower.GetString()
                : element.TryGetProperty("Code", out var upper)
                    ? upper.GetString()
                    : null;

            if (!string.IsNullOrWhiteSpace(code) && Okpd2Pattern.IsMatch(code))
            {
                codes.Add(code);
            }
        }

        return codes.Distinct(StringComparer.Ordinal).ToArray();
    }

    /// <summary>Характеристики с флагом обязательности — из ktru-part-description.html.</summary>
    private async Task EnrichCharacteristicsAsync(
        Dictionary<string, KtruCardHtmlRecord> cards,
        CancellationToken cancellationToken)
    {
        foreach (var original in cards.Values.ToArray())
        {
            cancellationToken.ThrowIfCancellationRequested();
            var description = await GetAsync(DescriptionUrl(original.Code), cancellationToken)
                .ConfigureAwait(false);
            if (description.Body is null)
            {
                logger.LogWarning("КТРУ {Code}: вкладка описания недоступна", original.Code);
                continue;
            }

            var version = KtruCardHtmlParser.ParseVersionId(description.Body);
            var collected = new List<KtruCharacteristic>();

            if (version is null)
            {
                collected.AddRange(KtruCardHtmlParser.ParseCharacteristics(description.Body));
            }
            else
            {
                for (var page = 1; page <= 20; page++)
                {
                    var part = await GetAsync(PartDescriptionUrl(version, page), cancellationToken)
                        .ConfigureAwait(false);
                    if (part.Body is null)
                    {
                        break;
                    }

                    var parsed = KtruCardHtmlParser.ParseCharacteristics(part.Body);
                    if (parsed.Count == 0)
                    {
                        break;
                    }

                    collected.AddRange(parsed);
                    if (parsed.Count < 10)
                    {
                        break;
                    }

                    await PauseAsync(cancellationToken).ConfigureAwait(false);
                }
            }

            cards[original.Code] = original with { Characteristics = MergeCharacteristics(collected) };
            await PauseAsync(cancellationToken).ConfigureAwait(false);
        }
    }

    /// <summary>Догружаем вторую и последующие страницы справочных таблиц.</summary>
    private async Task EnrichReferenceTablesAsync(
        Dictionary<string, KtruCardHtmlRecord> cards,
        CancellationToken cancellationToken)
    {
        foreach (var original in cards.Values.ToArray())
        {
            cancellationToken.ThrowIfCancellationRequested();
            var classifiers = new List<KtruClassifier>(original.Classifiers);
            var standards = new List<KtruStandard>(original.Standards);

            if (original.Classifiers.Count >= 10)
            {
                for (var page = 2; page <= 20; page++)
                {
                    var response = await GetAsync(ClassifiersUrl(original.Code, page), cancellationToken)
                        .ConfigureAwait(false);
                    var parsed = response.Body is null
                        ? []
                        : KtruCardHtmlParser.ParseClassifiers(response.Body);
                    if (parsed.Count == 0)
                    {
                        break;
                    }

                    classifiers.AddRange(parsed);
                    await PauseAsync(cancellationToken).ConfigureAwait(false);
                }
            }

            if (original.Standards.Count >= 10)
            {
                for (var page = 2; page <= 20; page++)
                {
                    var response = await GetAsync(StandardsUrl(original.Code, page), cancellationToken)
                        .ConfigureAwait(false);
                    var parsed = response.Body is null
                        ? []
                        : KtruCardHtmlParser.ParseStandards(response.Body);
                    if (parsed.Count == 0)
                    {
                        break;
                    }

                    standards.AddRange(parsed);
                    await PauseAsync(cancellationToken).ConfigureAwait(false);
                }
            }

            cards[original.Code] = original with
            {
                Classifiers = classifiers
                    .DistinctBy(item => item.Name + "\t" + item.Value)
                    .ToArray(),
                Standards = standards
                    .DistinctBy(item => item.Name + "\t" + item.DocumentUrl)
                    .ToArray(),
            };
        }
    }

    private static IReadOnlyList<KtruCharacteristic> MergeCharacteristics(
        IEnumerable<KtruCharacteristic> source)
    {
        var result = new List<KtruCharacteristic>();
        foreach (var item in source)
        {
            var existing = result.FirstOrDefault(row => row.Name == item.Name);
            if (existing is null)
            {
                result.Add(item);
                continue;
            }

            result[result.IndexOf(existing)] = existing with
            {
                Values = [.. existing.Values, .. item.Values],
            };
        }

        return result;
    }

    private async Task<HttpResult> GetAsync(
        string url,
        CancellationToken cancellationToken,
        bool retryNotFound = false,
        int? attempts = null)
    {
        var client = _http.CreateClient("ktru");
        var limit = attempts ?? _options.MaxRetries;
        for (var attempt = 1; attempt <= limit; attempt++)
        {
            try
            {
                using var response = await client.GetAsync(url, cancellationToken).ConfigureAwait(false);
                var body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
                if (response.IsSuccessStatusCode)
                {
                    return new HttpResult(body, response.StatusCode);
                }

                if (response.StatusCode == HttpStatusCode.NotFound && !retryNotFound)
                {
                    // Карточки: 404 означает «позиции нет», повторять бессмысленно.
                    return new HttpResult(null, response.StatusCode);
                }

                var retryable = response.StatusCode == HttpStatusCode.NotFound ||
                                (int)response.StatusCode == 403 ||
                                (int)response.StatusCode == 429 ||
                                (int)response.StatusCode >= 500;
                if (!retryable || attempt == limit)
                {
                    return new HttpResult(null, response.StatusCode);
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                logger.LogDebug("КТРУ {Url}: ошибка запроса — {Message}", url, exception.Message);
                if (attempt == limit)
                {
                    return new HttpResult(null, null);
                }
            }

            await Task.Delay(_options.PauseMs * attempt, cancellationToken).ConfigureAwait(false);
        }

        return new HttpResult(null, null);
    }

    private Task PauseAsync(CancellationToken cancellationToken) =>
        _options.PauseMs <= 0
            ? Task.CompletedTask
            : Task.Delay(_options.PauseMs, cancellationToken);

    private string Absolute(string path) =>
        path.StartsWith("http", StringComparison.OrdinalIgnoreCase)
            ? path
            : _options.PublicBaseUrl.TrimEnd('/') + "/" + path.TrimStart('/');

    private string CardUrl(string id) =>
        $"{Absolute(_options.CardPath)}?itemId={Uri.EscapeDataString(id)}";

    // ЕИС отдаёт 404, если к searchString добавить recordsPerPage/pageNumber.
    private string SearchUrl(string code) =>
        $"{Absolute(_options.SearchPath)}?searchString={Uri.EscapeDataString(code)}";

    private string ChildUrl(string relative)
    {
        if (relative.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            return relative;
        }

        return Absolute(_options.SearchPath) + (relative.StartsWith('?') ? relative : "/" + relative.TrimStart('/'));
    }

    private string DescriptionUrl(string id) =>
        $"{Absolute(_options.DescriptionPath)}?itemId={Uri.EscapeDataString(id)}";

    private string PartDescriptionUrl(string versionId, int page) =>
        $"{Absolute(_options.PartDescriptionPath)}?itemVersionId={Uri.EscapeDataString(versionId)}" +
        $"&page={page.ToString(CultureInfo.InvariantCulture)}&recordsPerPage=50&isTemplate=&onlyRequired=false";

    private string ClassifiersUrl(string id, int page) =>
        $"{Absolute(_options.ClassifierPath)}?itemId={Uri.EscapeDataString(id)}" +
        $"&pageNumber={page.ToString(CultureInfo.InvariantCulture)}&pageSize=50";

    private string StandardsUrl(string id, int page) =>
        $"{Absolute(_options.StandardPath)}?itemId={Uri.EscapeDataString(id)}" +
        $"&pageNumber={page.ToString(CultureInfo.InvariantCulture)}&pageSize=50";
}
