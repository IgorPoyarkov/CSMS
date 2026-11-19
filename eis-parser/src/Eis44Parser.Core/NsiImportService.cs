using Eis44Parser.Core.Abstractions;
using Eis44Parser.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Eis44Parser.Core;

/// <summary>
/// Полный цикл выгрузки справочника НСИ: getNsiRequest → ZIP → XML позиций
/// → версионируемый снимок. Публикацию делает csms-api через свой API.
/// </summary>
public sealed class NsiImportService(
    IEis44Client client,
    IOptions<EisNsiOptions> options,
    ILogger<NsiImportService> logger)
{
    public async Task<NsiSnapshot> BuildSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        if (settings.NsiKind is not ("all" or "inc"))
        {
            throw new ArgumentException("EisNsi:NsiKind может быть только all или inc.");
        }

        var archiveUrls = await client
            .FetchNsiArchiveUrlsAsync(settings.NsiCode, settings.NsiKind, cancellationToken)
            .ConfigureAwait(false);

        if (archiveUrls.Count == 0)
        {
            throw new InvalidOperationException(
                $"ЕИС не вернула архивов для {settings.NsiCode} (nsiKind={settings.NsiKind}).");
        }

        logger.LogInformation(
            "ЕИС НСИ {Code}: получено ссылок на архивы — {Count}",
            settings.NsiCode,
            archiveUrls.Count);

        var positions = new List<NsiPosition>();
        foreach (var archiveUrl in archiveUrls)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var documents = await client.DownloadArchiveXmlAsync(archiveUrl, cancellationToken)
                .ConfigureAwait(false);

            foreach (var document in documents)
            {
                positions.AddRange(NsiXmlParser.ParseKtru(document));
            }
        }

        logger.LogInformation(
            "ЕИС НСИ {Code}: разобрано позиций — {Count}",
            settings.NsiCode,
            positions.Count);

        return NsiSnapshotBuilder.Build(settings.Dataset, settings.ServiceUrl, positions);
    }
}
