using Eis44Parser.Core.Models;
using Eis44Parser.Data.Entities;

namespace Eis44Parser.Data;

/// <summary>Хранение состояний конвейера и нормализованных данных ЕИС.</summary>
public interface IEisPipelineRepository
{
    /// <summary>Идемпотентно поставить ссылку в очередь; false — уже была.</summary>
    Task<bool> EnqueueAsync(ArchiveCandidate candidate, CancellationToken cancellationToken = default);

    /// <summary>Забрать следующую задачу в работу.</summary>
    Task<EisArchiveQueueRecord?> ClaimNextAsync(CancellationToken cancellationToken = default);

    Task MarkDownloadedAsync(long id, ArchiveFile archive, CancellationToken cancellationToken = default);

    /// <summary>Зафиксировать ошибку; до лимита попыток задача остаётся в очереди.</summary>
    Task MarkFailedAsync(long id, string error, CancellationToken cancellationToken = default);

    Task MarkProcessedAsync(long id, CancellationToken cancellationToken = default);

    /// <summary>Сохранить сырой XML и обновить нормализованные сущности.</summary>
    Task PersistDocumentAsync(
        long archiveId,
        ParsedEisDocument document,
        CancellationToken cancellationToken = default);
}
