namespace Eis44Parser.Core.Abstractions;

/// <summary>
/// Этап 1 конвейера: только SOAP-опрос getDocsIP. Скачивание и разбор
/// архивов делают ArchiveDownloader и ArchiveProcessor.
/// </summary>
public interface IEisSoapClient
{
    /// <summary>Ссылки на архивы по региону, подсистеме и дате (exactDate).</summary>
    Task<IReadOnlyList<string>> FetchArchivesByRegionAsync(
        string regionCode,
        string documentType44,
        DateOnly date,
        string subsystemType,
        CancellationToken cancellationToken = default);

    /// <summary>Точечная выгрузка по реестровому номеру.</summary>
    Task<IReadOnlyList<string>> FetchArchivesByReestrNumberAsync(
        string reestrNumber,
        string subsystemType,
        CancellationToken cancellationToken = default);

    /// <summary>Ссылки на архив справочника НСИ (getNsiRequest).</summary>
    Task<IReadOnlyList<string>> FetchNsiArchiveUrlsAsync(
        string nsiCode,
        string nsiKind,
        CancellationToken cancellationToken = default);
}
