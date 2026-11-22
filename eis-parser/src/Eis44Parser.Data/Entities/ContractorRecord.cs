namespace Eis44Parser.Data.Entities;

/// <summary>
/// Справочник подрядчиков/контрагентов по ИНН. Заполняется из XML ЕИС
/// минимальными реквизитами и обогащается по API ФНС (api-fns.ru или
/// «Прозрачный бизнес»). Не привязан к роли: один и тот же ИНН может быть
/// поставщиком, субподрядчиком, соисполнителем или заказчиком, а также
/// вырасти из субподрядчика в генподрядчика — карточка при этом не меняется.
/// </summary>
public sealed class ContractorRecord
{
    public long Id { get; set; }

    /// <summary>ИНН — естественный ключ карточки (10 или 12 цифр).</summary>
    public string Inn { get; set; } = string.Empty;

    public string? Kpp { get; set; }

    /// <summary>Наименование из ЕИС (как в XML контракта).</summary>
    public string? Name { get; set; }

    /// <summary>Полное наименование из ФНС.</summary>
    public string? FullName { get; set; }

    public string? Ogrn { get; set; }

    public string? Address { get; set; }

    /// <summary>Код статуса ЕИС: 30 — СМП, 40 — СОНО (может быть пустым).</summary>
    public string? StatusCode { get; set; }

    public string? StatusName { get; set; }

    /// <summary>Признак субъекта малого предпринимательства (из ФНС/ЕРСМСП).</summary>
    public bool? IsSmp { get; set; }

    /// <summary>Признак социально ориентированной НКО (из ЕИС/ФНС).</summary>
    public bool? IsSono { get; set; }

    /// <summary>Статус организации по данным ФНС: active | liquidated | иное.</summary>
    public string? FnsStatus { get; set; }

    /// <summary>Источник последних данных: eis | api-fns | transparent.</summary>
    public string? Source { get; set; }

    /// <summary>Когда карточку последний раз сверяли с API ФНС.</summary>
    public DateTimeOffset? FnsCheckedAt { get; set; }

    /// <summary>Сырой ответ ФНС (JSON) — чтобы не терять поля, которых нет в модели.</summary>
    public string? FnsPayload { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
