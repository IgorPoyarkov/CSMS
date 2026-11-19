using Eis44Parser.Core.Models;

namespace Eis44Parser.Data;

/// <summary>Итог пакетной сохранности срезов.</summary>
public sealed record SaveResult(int Inserted, int Updated, int Skipped);

/// <summary>Хранилище срезов ЕИС с дедупликацией.</summary>
public interface ITenderRepository
{
    /// <summary>
    /// Сохранить документы: повтор с тем же номером, версией схемы и датой
    /// публикации пропускается, изменённая версия обновляет запись.
    /// </summary>
    Task<SaveResult> SaveAsync(IEnumerable<TenderDto> tenders, CancellationToken cancellationToken = default);
}
