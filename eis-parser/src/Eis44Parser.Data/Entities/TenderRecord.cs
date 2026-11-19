namespace Eis44Parser.Data.Entities;

/// <summary>
/// Сохранённый срез документа ЕИС. Сырой XML хранится рядом с полями DTO,
/// чтобы можно было разобрать спорную ситуацию; на проде его стоит вынести
/// в объектное хранилище, оставив в БД только ссылку и хэш.
/// </summary>
public sealed class TenderRecord
{
    public int Id { get; set; }

    /// <summary>19-значный номер закупки — ключ дедупликации.</summary>
    public string? PurchaseNumber { get; set; }

    /// <summary>Версия схемы документа.</summary>
    public string SchemeVersion { get; set; } = "unknown";

    public string? ObjectInfo { get; set; }

    public decimal? MaxPrice { get; set; }

    public string? CustomerInn { get; set; }

    public string? PublishDate { get; set; }

    /// <summary>Имя XML-файла внутри архива (резервный ключ при пустом номере).</summary>
    public string SourceFile { get; set; } = string.Empty;

    public string? ArchiveUrl { get; set; }

    public string SubsystemType { get; set; } = string.Empty;

    public string DocumentType { get; set; } = string.Empty;

    /// <summary>Когда срез впервые попал в базу.</summary>
    public DateTime ParsedAt { get; set; }

    /// <summary>Когда срез последний раз обновлён.</summary>
    public DateTime UpdatedAt { get; set; }

    public string? RawXml { get; set; }
}
