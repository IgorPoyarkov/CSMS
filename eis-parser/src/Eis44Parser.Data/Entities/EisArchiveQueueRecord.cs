namespace Eis44Parser.Data.Entities;

/// <summary>Задача на скачивание архива, привязанная к конкретной ссылке ЕИС.</summary>
public sealed class EisArchiveQueueRecord
{
    public long Id { get; set; }
    public string ArchiveUrl { get; set; } = string.Empty;
    public string UrlSha256 { get; set; } = string.Empty;
    public string? RegionCode { get; set; }
    public string SubsystemType { get; set; } = string.Empty;
    public string? DocumentType { get; set; }
    public DateTimeOffset? PeriodStart { get; set; }
    public DateTimeOffset? PeriodEnd { get; set; }
    public string Status { get; set; } = "pending";
    public int? HttpStatus { get; set; }
    public string? ArchiveSha256 { get; set; }
    public long? ArchiveSizeBytes { get; set; }
    public string? LocalPath { get; set; }
    public int Attempts { get; set; }
    public string? LastError { get; set; }
    public DateTimeOffset EnqueuedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? ProcessedAt { get; set; }
}
