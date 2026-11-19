namespace Eis44Parser.Core.Models;

/// <summary>
/// Настройки клиента сервиса ЕИС getDocsIP. Значения приходят из раздела
/// Eis44 файла appsettings.json и могут быть переопределены переменными
/// окружения (например, Eis44__IndividualPersonToken).
/// </summary>
public sealed class EisClientOptions
{
    /// <summary>Имя раздела конфигурации.</summary>
    public const string SectionName = "Eis44";

    /// <summary>Токен физического лица из личного кабинета участника закупок.</summary>
    public string IndividualPersonToken { get; set; } = string.Empty;

    /// <summary>
    /// Адрес локального ГОСТ-туннеля Stunnel с КриптоПро/msspi.
    /// К ЕИС напрямую с обычного HttpClient обращаться нельзя.
    /// </summary>
    public string BaseTunnelUrl { get; set; } = "http://127.0.0.1:8080";

    /// <summary>Путь сервиса getDocsIP внутри туннеля.</summary>
    public string ServicePath { get; set; } = "/eis-integration/services/getDocsIP";

    /// <summary>Режим запроса: PROD или TEST.</summary>
    public string Mode { get; set; } = "PROD";

    /// <summary>Таймаут одного сетевого запроса.</summary>
    public int RequestTimeoutMinutes { get; set; } = 3;

    /// <summary>Число повторных попыток при лимитах и временных ошибках.</summary>
    public int MaxRetryAttempts { get; set; } = 5;

    /// <summary>Начальная задержка между повторами (экспоненциально растёт).</summary>
    public int RetryBaseDelayMs { get; set; } = 1000;

    /// <summary>Период опроса фоновой службы.</summary>
    public int PollingIntervalMinutes { get; set; } = 60;

    /// <summary>Глубина выборки по дате: сегодня и предыдущие дни.</summary>
    public int LookbackDays { get; set; } = 2;

    /// <summary>Коды регионов заказчиков (orgRegion).</summary>
    public List<string> RegionCodes { get; set; } = ["31"];

    /// <summary>Типы документов, которые забираем.</summary>
    public List<string> DocumentTypes { get; set; } = [.. EisDocumentTypes.NotificationTypes];

    /// <summary>Подсистемы, из которых забираем документы.</summary>
    public List<string> SubsystemTypes { get; set; } = [EisSubsystems.Priz];

    /// <summary>Признак незаполненного токена (заглушка из конфигурации).</summary>
    public bool HasPlaceholderToken =>
        string.IsNullOrWhiteSpace(IndividualPersonToken) ||
        IndividualPersonToken.Contains("TOKEN", StringComparison.OrdinalIgnoreCase) ||
        IndividualPersonToken.Contains("ЗАМЕНИ", StringComparison.OrdinalIgnoreCase);
}
