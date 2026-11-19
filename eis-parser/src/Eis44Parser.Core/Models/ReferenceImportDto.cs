namespace Eis44Parser.Core.Models;

/// <summary>
/// DTO для POST /api/references/import в csms-api. Поля совпадают с
/// Csms.Application.ReferenceImportRequest (сериализация camelCase).
/// </summary>
public sealed record ReferenceImportItemDto(
    string? Code,
    string? ParentCode,
    string? Name,
    bool? Actual,
    object Payload);

/// <summary>Тело запроса установки новой версии справочника.</summary>
public sealed record ReferenceImportRequestDto(
    string Dataset,
    string Version,
    string? SourceDocument,
    string? SourceUrl,
    string? SourceSha256,
    DateTimeOffset? PublishedAt,
    IReadOnlyList<ReferenceImportItemDto> Items);
