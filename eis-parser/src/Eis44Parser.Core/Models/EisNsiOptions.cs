namespace Eis44Parser.Core.Models;

/// <summary>
/// Настройки импорта справочников НСИ. Отделены от Eis44: токен и туннель
/// берутся из общего EisClientOptions, чтобы секрет не дублировался.
/// </summary>
public sealed class EisNsiOptions
{
    public const string SectionName = "EisNsi";

    /// <summary>Код справочника в csms-api (совпадает со справочником ЕИС).</summary>
    public string Dataset { get; set; } = "nsiKtru";

    /// <summary>
    /// Код из перечня nsiAllList. Значение по умолчанию — из документации
    /// сервиса; перед живым прогоном подтвердить ответом nsiAllList.
    /// </summary>
    public string NsiCode { get; set; } = "nsiKtru";

    /// <summary>all — полная выгрузка, inc — инкремент (по XSD).</summary>
    public string NsiKind { get; set; } = "all";

    /// <summary>Адрес csms-api, который публикует версионируемые справочники.</summary>
    public string ApiBaseUrl { get; set; } = "http://localhost:5099";

    /// <summary>Источник, попадающий в карточку набора данных.</summary>
    public string ServiceUrl { get; set; } =
        "https://int.zakupki.gov.ru/eis-integration/services/getDocsIP";
}
