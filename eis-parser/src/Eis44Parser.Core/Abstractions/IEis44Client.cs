using Eis44Parser.Core.Models;

namespace Eis44Parser.Core.Abstractions;

/// <summary>Клиент сервиса ЕИС getDocsIP поверх локального ГОСТ-туннеля.</summary>
public interface IEis44Client
{
    /// <summary>
    /// Этап 1: получить ссылки на ZIP-архивы по региону и дате.
    /// </summary>
    Task<IReadOnlyList<string>> FetchArchivesByRegionAsync(
        string regionCode,
        string documentType44,
        DateTime date,
        string subsystemType = EisSubsystems.Priz,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Этап 1: получить ссылки на ZIP-архивы по 19-значному номеру закупки.
    /// </summary>
    Task<IReadOnlyList<string>> FetchArchivesByReestrNumberAsync(
        string reestrNumber,
        string subsystemType = EisSubsystems.Priz,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Этап 2: скачать архив через туннель и разобрать XML внутри.
    /// </summary>
    Task<IReadOnlyList<TenderDto>> DownloadAndParseArchiveAsync(
        string archiveUrl,
        string subsystemType = EisSubsystems.Priz,
        string documentType = "",
        CancellationToken cancellationToken = default);
}
