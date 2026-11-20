namespace Eis44Parser.Core.Models;

/// <summary>Позиция объекта закупки (КТРУ/ОКПД2) из XML ЕИС.</summary>
public sealed record PurchaseItemDto(
    int LineNo,
    string? KtruCode,
    string? Okpd2Code,
    string? ItemName,
    decimal? Quantity,
    decimal? Price);

/// <summary>Результат разбора одного XML-файла из архива.</summary>
public sealed record ParsedEisDocument
{
    public string FileName { get; init; } = string.Empty;
    public string DocumentSha256 { get; init; } = string.Empty;
    public string SchemeVersion { get; init; } = "unknown";
    public EisDocumentKind Kind { get; init; } = EisDocumentKind.Unknown;

    public string? PurchaseNumber { get; init; }

    /// <summary>Реестровый номер контракта (regNum) — ключ сущности contracts.</summary>
    public string? RegNumber { get; init; }

    public string? Ikz { get; init; }
    public string? CustomerInn { get; init; }
    public string? CustomerKpp { get; init; }
    public string? SupplierInn { get; init; }
    public string? SupplierKpp { get; init; }
    public string? CustomerName { get; init; }
    public string? SupplierName { get; init; }
    public decimal? Price { get; init; }
    public string? PublishDate { get; init; }
    public string? ObjectInfo { get; init; }
    public string? PrintFormUrl { get; init; }
    public IReadOnlyList<PurchaseItemDto> Items { get; init; } = [];
    public string RawXml { get; init; } = string.Empty;
}

/// <summary>Проверенный ZIP-архив, сохранённый загрузчиком на диск.</summary>
public sealed record ArchiveFile(
    string SourceUrl,
    string LocalPath,
    string Sha256,
    long SizeBytes);

/// <summary>Результат распаковки и разбора архива (этап 3).</summary>
public sealed record ArchiveProcessingResult(
    string ArchiveSha256,
    long ArchiveSizeBytes,
    IReadOnlyList<ParsedEisDocument> Documents);

/// <summary>Метаданные ссылки, которые этап 1 кладёт в очередь загрузки.</summary>
public sealed record ArchiveCandidate(
    string ArchiveUrl,
    string? RegionCode,
    string SubsystemType,
    string? DocumentType,
    DateTimeOffset? PeriodStart,
    DateTimeOffset? PeriodEnd);
