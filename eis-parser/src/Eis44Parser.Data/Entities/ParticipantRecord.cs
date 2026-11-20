namespace Eis44Parser.Data.Entities;

/// <summary>Участник закупки или контракта: заказчик, поставщик, соисполнитель.</summary>
public sealed class ParticipantRecord
{
    public long Id { get; set; }
    public long? PurchaseId { get; set; }
    public long? ContractId { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Inn { get; set; } = string.Empty;
    public string? Kpp { get; set; }
    public string? Name { get; set; }
    public long? RawDocumentId { get; set; }
}
