namespace Eis44Parser.Data.Entities;

/// <summary>Неизменный слепок XML из архива для повторного парсинга.</summary>
public sealed class RawDocumentRecord
{
    public long Id { get; set; }
    public long ArchiveId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string DocumentSha256 { get; set; } = string.Empty;
    public string SchemeVersion { get; set; } = "unknown";
    public string DocumentKind { get; set; } = "unknown";
    public string RawXml { get; set; } = string.Empty;
    public DateTimeOffset ParsedAt { get; set; }
}
