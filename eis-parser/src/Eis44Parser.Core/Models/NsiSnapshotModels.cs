namespace Eis44Parser.Core.Models;

/// <summary>
/// Одна позиция КТРУ из официальной выгрузки. Ключевые поля дублируются,
/// полный набор тегов сохраняется в Payload без переименований.
/// </summary>
public sealed record NsiPosition(
    string Code,
    string? ParentCode,
    string? Name,
    bool Actual,
    IReadOnlyDictionary<string, object?> Payload);

/// <summary>Снимок справочника в формате контракта csms-api /api/references/import.</summary>
public sealed record NsiSnapshot(
    string Dataset,
    string Version,
    string? SourceDocument,
    string? SourceUrl,
    string? SourceSha256,
    DateTimeOffset? PublishedAt,
    IReadOnlyList<ReferenceImportItemDto> Items);
