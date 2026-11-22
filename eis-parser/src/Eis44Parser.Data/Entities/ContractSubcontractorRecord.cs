namespace Eis44Parser.Data.Entities;

/// <summary>
/// Связь контракта с субподрядчиком/соисполнителем (СМП, СОНО). Реквизиты
/// организации здесь не дублируются: хранится только ИНН — ключ справочника
/// <see cref="ContractorRecord"/>. Остальные поля — данные субподрядного
/// договора из XML ЕИС (сумма, номер, дата, предмет, ОКПД2).
/// </summary>
public sealed class ContractSubcontractorRecord
{
    public long Id { get; set; }

    public long ContractId { get; set; }

    public string Inn { get; set; } = string.Empty;

    /// <summary>КПП на момент договора: у филиала может отличаться от карточки.</summary>
    public string? Kpp { get; set; }

    /// <summary>Код статуса ЕИС: 30 — СМП, 40 — СОНО.</summary>
    public string? StatusCode { get; set; }

    /// <summary>Сумма субподрядного договора.</summary>
    public decimal? Amount { get; set; }

    public string? DocumentNumber { get; set; }

    public string? DocumentDate { get; set; }

    public string? Subject { get; set; }

    public string? Okpd2Code { get; set; }

    public long? RawDocumentId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
