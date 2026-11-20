namespace Eis44Parser.Data.Entities;

/// <summary>Курсор одного среза: регион + подсистема + тип документа + дата.</summary>
public sealed class EisSyncStateRecord
{
    public string Key { get; set; } = string.Empty;
    public string? RegionCode { get; set; }
    public string SubsystemType { get; set; } = string.Empty;
    public string? DocumentType { get; set; }
    public DateTimeOffset? PeriodStart { get; set; }
    public DateTimeOffset? PeriodEnd { get; set; }
    public string Status { get; set; } = "pending";
    public string? LastError { get; set; }
    public DateTimeOffset? LastSuccessAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
