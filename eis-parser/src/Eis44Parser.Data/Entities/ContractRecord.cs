namespace Eis44Parser.Data.Entities;

/// <summary>Контракт из реестра контрактов (RGK/RPEC).</summary>
public sealed class ContractRecord
{
    public long Id { get; set; }
    public string RegNumber { get; set; } = string.Empty;
    public string? PurchaseNumber { get; set; }
    public string? Ikz { get; set; }
    public string? CustomerInn { get; set; }
    public string? CustomerKpp { get; set; }
    public string? SupplierInn { get; set; }
    public string? SupplierKpp { get; set; }
    public decimal? ContractPrice { get; set; }
    public string? ContractDate { get; set; }
    public long? RawDocumentId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
