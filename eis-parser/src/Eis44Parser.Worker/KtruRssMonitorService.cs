using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Eis44Parser.Core;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Eis44Parser.Worker;

/// <summary>
/// Ежедневная проверка RSS-подписок всех категорий рубрикатора КТРУ.
/// RSS используется как триггер: если набор кодов в ленте изменился или
/// появилась новая категория, категория сканируется полностью (лента ЕИС
/// показывает только первые 100 позиций), после чего новые карточки
/// добавляются к опубликованному снимку и публикуется новая версия.
/// </summary>
internal sealed class KtruRssMonitorService(
    KtruHtmlImportService cards,
    ReferenceApiClient api,
    IOptions<KtruHtmlOptions> htmlOptions,
    IOptions<EisNsiOptions> nsiOptions,
    ILogger<KtruRssMonitorService> logger)
{
    private static readonly JsonSerializerOptions StateJson = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
    };

    private readonly KtruHtmlOptions _options = htmlOptions.Value;
    private readonly string _dataset = nsiOptions.Value.Dataset;

    public sealed record Result(
        int CategoryCount,
        string[] NewCategories,
        string[] NewCodes,
        string Version,
        bool Published);

    public async Task<Result> CheckAsync(bool publish, CancellationToken cancellationToken = default)
    {
        var state = LoadState();
        var published = await api.GetItemsAsync(_dataset, cancellationToken).ConfigureAwait(false);
        var publishedCodes = published
            .Select(item => item.Code)
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code!)
            .ToHashSet(StringComparer.Ordinal);

        // У уже опубликованного справочника есть позиции: повторно их не разбираем.
        var baseline = state.LastCheck == DateTimeOffset.MinValue;
        var startHtml = await cards.GetTextAsync(cards.ToAbsolute(_options.StartPath), cancellationToken)
            .ConfigureAwait(false);
        if (startHtml is null)
        {
            throw new InvalidOperationException("Не удалось получить список категорий КТРУ.");
        }

        var parsedCategories = KtruCardHtmlParser.ParseCategories(startHtml);
        var categories = _options.CategoryLimit > 0
            ? parsedCategories.Take(_options.CategoryLimit).ToArray()
            : parsedCategories;
        if (categories.Count == 0)
        {
            throw new InvalidOperationException("Рубрикатор КТРУ вернул пустой список категорий.");
        }

        var knownCategories = state.Categories
            .Select(category => category.Id)
            .ToHashSet(StringComparer.Ordinal);
        var newCategories = categories
            .Where(category => !knownCategories.Contains(category.Id))
            .ToArray();

        logger.LogInformation(
            "КТРУ RSS: категорий {Count}, новых категорий {New}",
            categories.Count,
            newCategories.Length);
        foreach (var category in newCategories)
        {
            logger.LogInformation("КТРУ RSS: новая категория {Id} — {Name}", category.Id, category.Name);
        }

        var feedCodes = new Dictionary<string, IReadOnlyList<string>>(StringComparer.Ordinal);
        var candidates = new HashSet<string>(StringComparer.Ordinal);
        var newCategoryIds = newCategories.Select(category => category.Id).ToHashSet(StringComparer.Ordinal);

        foreach (var category in categories)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var rssText = await cards.GetTextAsync(cards.ToAbsolute(category.RssUrl), cancellationToken)
                .ConfigureAwait(false);
            if (rssText is null)
            {
                // Не портим состояние из-за временного 404: оставляем прежний
                // набор кодов, чтобы следующее сравнение не выглядело как обновление.
                logger.LogWarning(
                    "КТРУ RSS: лента категории {Id} недоступна, пропускаем проверку",
                    category.Id);
                feedCodes[category.Id] = state.FeedCodes.TryGetValue(category.Id, out var retained)
                    ? retained
                    : [];
                continue;
            }

            var codes = KtruCardHtmlParser.ParseRssCodes(rssText);
            feedCodes[category.Id] = codes;

            var previous = state.FeedCodes.TryGetValue(category.Id, out var old)
                ? old
                : [];
            var changed = state.KnownCodes.Count == 0 ||
                          newCategoryIds.Contains(category.Id) ||
                          !new HashSet<string>(codes, StringComparer.Ordinal)
                              .SetEquals(previous);

            if (changed && !baseline)
            {
                logger.LogInformation(
                    "КТРУ RSS: категория {Id} изменилась — сканируем все страницы",
                    category.Id);
                var allCodes = await ScanCategoryAsync(category, cancellationToken).ConfigureAwait(false);
                foreach (var code in allCodes.Where(code =>
                             !state.KnownCodes.Contains(code) && !publishedCodes.Contains(code)))
                {
                    candidates.Add(code);
                }
            }
        }

        if (baseline)
        {
            // Первый запуск фиксирует текущие ленты и уже опубликованные коды.
            // Полная первичная загрузка делается отдельным режимом
            // --import-nsi-ktru-html, чтобы не обходить десятки тысяч карточек.
            logger.LogInformation(
                "КТРУ RSS: первичная фиксация — категорий {Categories}, известных кодов {Codes}",
                categories.Count,
                publishedCodes.Count);
            SaveState(new KtruRssState(
                DateTimeOffset.UtcNow,
                categories,
                publishedCodes.Concat(feedCodes.Values.SelectMany(codes => codes))
                    .Distinct(StringComparer.Ordinal)
                    .ToArray(),
                feedCodes));

            return new Result(
                categories.Count,
                [],
                [],
                "первичная фиксация",
                false);
        }

        var newCodes = candidates.OrderBy(code => code, StringComparer.Ordinal).ToArray();
        logger.LogInformation("КТРУ RSS: кандидатов на разбор — {Count}", newCodes.Length);

        var collected = await cards.CollectCardsAsync(newCodes, cancellationToken).ConfigureAwait(false);
        var version = "без изменений";

        if (collected.Count > 0)
        {
            var freshItems = await cards.FinishAsync(collected, cancellationToken).ConfigureAwait(false);
            var merged = published
                .Where(item => item.Code is null || !collected.ContainsKey(item.Code))
                .Concat(freshItems.Items)
                .ToArray();

            var snapshot = KtruHtmlSnapshotBuilder.BuildFromItems(
                merged,
                _dataset,
                cards.ToAbsolute(_options.StartPath),
                DateTimeOffset.UtcNow);

            version = snapshot.Version;
            if (publish)
            {
                var request = new ReferenceImportRequestDto(
                    snapshot.Dataset,
                    snapshot.Version,
                    snapshot.SourceDocument,
                    snapshot.SourceUrl,
                    snapshot.SourceSha256,
                    snapshot.PublishedAt,
                    snapshot.Items);
                var response = await api.PublishAsync(request, cancellationToken).ConfigureAwait(false);
                logger.LogInformation("КТРУ RSS: опубликовано — {Response}", response);
            }
            else
            {
                logger.LogInformation("КТРУ RSS: dry-run, снимок {Version} не опубликован", version);
            }
        }
        else if (publish && newCategories.Length > 0)
        {
            logger.LogInformation(
                "КТРУ RSS: новые категории есть, но новых карточек не найдено — публикация не требуется");
        }

        var known = publishedCodes
            .Concat(state.KnownCodes)
            .Concat(candidates)
            .Concat(feedCodes.Values.SelectMany(codes => codes))
            .Distinct(StringComparer.Ordinal)
            .OrderBy(code => code, StringComparer.Ordinal)
            .ToArray();

        SaveState(new KtruRssState(
            DateTimeOffset.UtcNow,
            categories,
            known,
            feedCodes));

        return new Result(
            categories.Count,
            newCategories.Select(category => $"{category.Id}: {category.Name}").ToArray(),
            newCodes,
            version,
            publish && collected.Count > 0);
    }

    /// <summary>
    /// RSS ЕИС показывает только 100 позиций, поэтому при изменении ленты
    /// проходим все страницы поиска категории и собираем полный список кодов.
    /// </summary>
    private async Task<IReadOnlyList<string>> ScanCategoryAsync(
        KtruRubricatorCategory category,
        CancellationToken cancellationToken)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var ordered = new List<string>();

        for (var page = 1; page <= _options.MaxCategoryPages; page++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var url = cards.ToAbsolute(Regex.Replace(
                category.SearchUrl,
                "pageNumber=\\d+",
                "pageNumber=" + page.ToString(CultureInfo.InvariantCulture),
                RegexOptions.IgnoreCase));

            var html = await cards.GetTextAsync(url, cancellationToken).ConfigureAwait(false);
            if (html is null)
            {
                break;
            }

            var codes = KtruCardHtmlParser.ParseSearchCodes(html);
            if (codes.Count == 0)
            {
                break;
            }

            var fresh = codes.Where(seen.Add).ToArray();
            ordered.AddRange(fresh);
            if (fresh.Length == 0)
            {
                logger.LogDebug("КТРУ RSS: категория {Id}, страница {Page} — новых кодов нет", category.Id, page);
                break;
            }
        }

        logger.LogInformation(
            "КТРУ RSS: категория {Id} — всего кодов {Count}",
            category.Id,
            ordered.Count);
        return ordered;
    }

    private KtruRssState LoadState()
    {
        var path = StatePath();
        if (!File.Exists(path))
        {
            return KtruRssState.Empty;
        }

        try
        {
            return JsonSerializer.Deserialize<KtruRssState>(File.ReadAllText(path), StateJson)
                   ?? KtruRssState.Empty;
        }
        catch (JsonException exception)
        {
            logger.LogWarning("КТРУ RSS: не удалось прочитать состояние {Path}: {Message}", path, exception.Message);
            return KtruRssState.Empty;
        }
    }

    private void SaveState(KtruRssState state)
    {
        var path = StatePath();
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        File.WriteAllText(path, JsonSerializer.Serialize(state, StateJson));
        logger.LogInformation("КТРУ RSS: состояние сохранено в {Path}", path);
    }

    private string StatePath()
    {
        return Path.IsPathRooted(_options.StatePath)
            ? _options.StatePath
            : Path.Combine(AppContext.BaseDirectory, _options.StatePath);
    }
}
