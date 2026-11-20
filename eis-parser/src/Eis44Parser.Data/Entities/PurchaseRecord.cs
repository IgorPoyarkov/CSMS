namespace Eis44Parser.Data.Entities;

/// <summary>Закупка (извещение), ключ — реестровый номер из XML ЕИС.</summary>
public sealed class PurchaseRecord
{
    public long Id { get; set; }
    public string PurchaseNumber { get; set; } = string.Empty;
    public string? Ikz { get; set; }
    public string? CustomerInn { get; set; }
    public string? CustomerKpp { get; set; }
    public decimal? Nmck { get; set; }
    public string? ObjectInfo { get; set; }
    public string? PublishDate { get; set; }
    public string? DocumentType { get; set; }
    public string? SchemeVersion { get; set; }
    public long? RawDocumentId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
