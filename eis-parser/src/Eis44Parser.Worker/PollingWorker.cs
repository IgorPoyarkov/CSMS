using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;
using Eis44Parser.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Eis44Parser.Worker;

/// <summary>
/// Фоновая служба: по расписанию забирает из ЕИС архивы по регионам и датам
/// и сохраняет новые/изменённые версии документов. Запросы идут строго
/// последовательно, чтобы не превысить лимиты ЕИС (около 8 RPS).
/// </summary>
public sealed class PollingWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptions<EisClientOptions> _options;
    private readonly ILogger<PollingWorker> _logger;

    public PollingWorker(
        IServiceScopeFactory scopeFactory,
        IOptions<EisClientOptions> options,
        ILogger<PollingWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _logger = logger;
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var settings = _options.Value;
        if (settings.HasPlaceholderToken)
        {
            _logger.LogError(
                "Токен individualPerson_token не задан — опрос ЕИС не запущен. " +
                "Укажите Eis44:IndividualPersonToken в конфигурации.");
            return;
        }

        var interval = TimeSpan.FromMinutes(Math.Max(1, settings.PollingIntervalMinutes));
        using var timer = new PeriodicTimer(interval);

        do
        {
            try
            {
                await PollOnceAsync(stoppingToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Ошибка очередного опроса ЕИС");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken).ConfigureAwait(false));
    }

    /// <summary>Один проход по всем настроенным регионам, типам и подсистемам.</summary>
    public async Task PollOnceAsync(CancellationToken cancellationToken)
    {
        var settings = _options.Value;
        if (settings.HasPlaceholderToken)
        {
            throw new InvalidOperationException(
                "Не задан individualPerson_token. Укажите Eis44__IndividualPersonToken " +
                "или отредактируйте eis-parser/src/Eis44Parser.Worker/appsettings.json.");
        }

        using var scope = _scopeFactory.CreateScope();
        var client = scope.ServiceProvider.GetRequiredService<IEis44Client>();
        var repository = scope.ServiceProvider.GetRequiredService<ITenderRepository>();
        var db = scope.ServiceProvider.GetRequiredService<EisDbContext>();
        await db.Database.EnsureCreatedAsync(cancellationToken).ConfigureAwait(false);

        var today = DateTime.UtcNow.Date;
        var lookback = Math.Max(1, settings.LookbackDays);
        var total = new SaveResult(0, 0, 0);

        foreach (var region in settings.RegionCodes)
        {
            foreach (var documentType in settings.DocumentTypes)
            {
                foreach (var subsystem in settings.SubsystemTypes)
                {
                    for (var offset = 0; offset < lookback; offset++)
                    {
                        cancellationToken.ThrowIfCancellationRequested();
                        var date = today.AddDays(-offset);

                        IReadOnlyList<string> archives;
                        try
                        {
                            archives = await client.FetchArchivesByRegionAsync(
                                    region, documentType, date, subsystem, cancellationToken)
                                .ConfigureAwait(false);
                        }
                        catch (Exception exception) when (exception is not OperationCanceledException)
                        {
                            _logger.LogWarning(
                                exception,
                                "Не удалось получить архивы: регион {Region}, тип {DocumentType}, дата {Date}",
                                region, documentType, date);
                            continue;
                        }

                        foreach (var archiveUrl in archives)
                        {
                            var documents = await client.DownloadAndParseArchiveAsync(
                                    archiveUrl, subsystem, documentType, cancellationToken)
                                .ConfigureAwait(false);

                            var result = await repository.SaveAsync(documents, cancellationToken)
                                .ConfigureAwait(false);

                            total = new SaveResult(
                                total.Inserted + result.Inserted,
                                total.Updated + result.Updated,
                                total.Skipped + result.Skipped);
                        }
                    }
                }
            }
        }

        _logger.LogInformation(
            "Опрос завершён: добавлено {Inserted}, обновлено {Updated}, пропущено {Skipped}",
            total.Inserted,
            total.Updated,
            total.Skipped);
    }
}
