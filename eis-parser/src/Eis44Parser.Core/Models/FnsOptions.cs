namespace Eis44Parser.Core.Models;

/// <summary>
/// Настройки обогащения карточек подрядчиков данными ФНС. Провайдер
/// выбирается в appsettings: api-fns (нужен ключ) или transparent
/// («Прозрачный бизнес» ФНС, без ключа). При ошибке основного провайдера
/// композитный клиент пробует второй.
/// </summary>
public sealed class FnsOptions
{
    public const string SectionName = "Fns";

    /// <summary>api-fns | transparent | none.</summary>
    public string Provider { get; set; } = "none";

    /// <summary>Ключ api-fns.ru. Хранить в User Secrets, не в appsettings.</summary>
    public string? ApiKey { get; set; }

    public string ApiFnsBaseUrl { get; set; } = "https://api-fns.ru";

    public string TransparentBaseUrl { get; set; } = "https://pb.nalog.ru";

    public int TimeoutSeconds { get; set; } = 20;

    /// <summary>Сколько дней карточка считается актуальной без повторного запроса.</summary>
    public int CacheDays { get; set; } = 30;

    public bool HasApiKey => !string.IsNullOrWhiteSpace(ApiKey);
}
