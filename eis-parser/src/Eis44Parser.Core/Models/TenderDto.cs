namespace Eis44Parser.Core.Models;

/// <summary>
/// Плоская модель документа ЕИС, пригодная для сохранения и сопоставления
/// с действующими закупками. Поля читаются из XML по локальным именам,
/// поэтому версия схемы и префикс пространства имён не важны.
/// </summary>
public sealed record TenderDto
{
    /// <summary>Имя XML-файла внутри архива.</summary>
    public string FileName { get; init; } = string.Empty;

    /// <summary>Версия схемы из атрибута schemeVersion.</summary>
    public string SchemeVersion { get; init; } = "unknown";

    /// <summary>19-значный реестровый (закупочный) номер.</summary>
    public string? PurchaseNumber { get; init; }

    /// <summary>Наименование объекта закупки.</summary>
    public string? ObjectInfo { get; init; }

    /// <summary>Начальная (максимальная) цена.</summary>
    public decimal? MaxPrice { get; init; }

    /// <summary>ИНН заказчика.</summary>
    public string? CustomerInn { get; init; }

    /// <summary>Дата размещения в ЕИС (как строка из XML).</summary>
    public string? PublishDate { get; init; }

    /// <summary>Ссылка на архив, из которого получен документ.</summary>
    public string? ArchiveUrl { get; init; }

    /// <summary>Сырой XML для юридического слепка и разбора спорных ситуаций.</summary>
    public string? RawXml { get; init; }

    /// <summary>Подсистема ЕИС, из которой получен документ.</summary>
    public string SubsystemType { get; init; } = EisSubsystems.Priz;

    /// <summary>Тип документа (номер схемы из конфигурации).</summary>
    public string DocumentType { get; init; } = string.Empty;
}
