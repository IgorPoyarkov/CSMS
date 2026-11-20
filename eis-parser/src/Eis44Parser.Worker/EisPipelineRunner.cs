using Eis44Parser.Core;
using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;
using Eis44Parser.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Eis44Parser.Worker;

/// <summary>Итог одного прохода четырёхэтапного конвейера.</summary>
public sealed record PipelineRunResult(int Enqueued, int Processed, int Failed);

/// <summary>
/// Связывает этапы 1–4: опрос → очередь → загрузка → разбор → БД.
/// Ошибка одного среза или архива не останавливает остальные задачи.
/// </summary>
public sealed class EisPipelineRunner(
    IEisSoapClient soap,
    ArchiveDownloader downloader,
    ArchiveProcessor processor,
    IEisPipelineRepository repository,
    IOptions<EisClientOptions> options,
    ILogger<EisPipelineRunner> logger)
{
    /// <summary>Выполнить один проход (для CLI --pipeline-once).</summary>
    public async Task<PipelineRunResult> RunOnceAsync(CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        var enqueued = await PollAsync(settings, cancellationToken).ConfigureAwait(false);
        var (processed, failed) = await DrainAsync(settings, cancellationToken).ConfigureAwait(false);

        logger.LogInformation(
            "Проход конвейера ЕИС: поставлено в очередь {Enqueued}, обработано {Processed}, ошибок {Failed}",
            enqueued, processed, failed);

        return new PipelineRunResult(enqueued, processed, failed);
    }

    private async Task<int> PollAsync(EisClientOptions settings, CancellationToken cancellationToken)
    {
        var count = 0;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        foreach (var region in settings.RegionCodes)
        foreach (var subsystem in settings.SubsystemTypes)
        foreach (var documentType in settings.DocumentTypes)
        for (var offset = 0; offset < Math.Max(1, settings.LookbackDays); offset++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var date = today.AddDays(-offset);

            try
            {
                var urls = await soap.FetchArchivesByRegionAsync(
                        region,
                        documentType,
                        date,
                        subsystem,
                        cancellationToken)
                    .ConfigureAwait(false);

                foreach (var url in urls)
                {
                    var added = await repository.EnqueueAsync(
                        new ArchiveCandidate(url, region, subsystem, documentType, null, null),
                        cancellationToken).ConfigureAwait(false);
                    if (added)
                    {
                        count++;
                    }
                }
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogError(exception,
                    "Не удалось опросить срез {Region}/{Subsystem}/{DocumentType}/{Date}",
                    region, subsystem, documentType, date);
            }
        }

        return count;
    }

    private async Task<(int Processed, int Failed)> DrainAsync(
        EisClientOptions settings,
        CancellationToken cancellationToken)
    {
        var processed = 0;
        var failed = 0;
        var limit = Math.Max(1, settings.MaxArchivesPerRun);

        while (processed + failed < limit)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var item = await repository.ClaimNextAsync(cancellationToken).ConfigureAwait(false);
            if (item is null)
            {
                break;
            }

            try
            {
                var archive = await downloader.DownloadAsync(item.ArchiveUrl, cancellationToken)
                    .ConfigureAwait(false);
                await repository.MarkDownloadedAsync(item.Id, archive, cancellationToken).ConfigureAwait(false);

                var result = await processor.ProcessAsync(archive, cancellationToken).ConfigureAwait(false);
                foreach (var document in result.Documents)
                {
                    await repository.PersistDocumentAsync(item.Id, document, cancellationToken).ConfigureAwait(false);
                }

                await repository.MarkProcessedAsync(item.Id, cancellationToken).ConfigureAwait(false);
                processed++;
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogError(exception, "Ошибка обработки архива {Archive}", item.ArchiveUrl);
                await repository.MarkFailedAsync(item.Id, exception.Message, cancellationToken).ConfigureAwait(false);
                failed++;
            }
        }

        return (processed, failed);
    }
}
