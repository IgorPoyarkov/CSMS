namespace Eis44Parser.Data.Entities;

/// <summary>Позиция объекта закупки с кодом КТРУ или ОКПД2.</summary>
public sealed class PurchaseItemRecord
{
    public long Id { get; set; }
    public long PurchaseId { get; set; }
    public int LineNo { get; set; }
    public string? KtruCode { get; set; }
    public string? Okpd2Code { get; set; }
    public string? ItemName { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? Price { get; set; }
    public long? RawDocumentId { get; set; }
}
