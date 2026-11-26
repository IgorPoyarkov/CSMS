namespace Eis44Parser.Core.Models;

/// <summary>
/// Настройки обхода публичных HTML-карточек КТРУ (без токена ЕИС).
/// Отделены от EisNsiOptions: там SOAP-выгрузка, здесь — публичный сайт.
/// </summary>
public sealed class KtruHtmlOptions
{
    public const string SectionName = "KtruHtml";

    /// <summary>Корень публичного сайта ЕИС.</summary>
    public string PublicBaseUrl { get; set; } = "https://zakupki.gov.ru";

    /// <summary>Поиск КТРУ — оттуда берём ссылки на дочерние позиции.</summary>
    public string SearchPath { get; set; } = "/epz/ktru/search/results.html";

    /// <summary>Карточка позиции: код, статус, даты, справочная информация.</summary>
    public string CardPath { get; set; } = "/epz/ktru/ktruCard/commonInfo.html";

    /// <summary>Вкладка с таблицей характеристик.</summary>
    public string DescriptionPath { get; set; } = "/epz/ktru/ktruCard/ktru-description.html";

    /// <summary>Ajax-подгрузка характеристик (по 50 строк за раз).</summary>
    public string PartDescriptionPath { get; set; } = "/epz/ktru/ktruCard/ktru-part-description.html";

    /// <summary>Справочники и стандарты подгружаются своими ajax-эндпоинтами.</summary>
    public string ClassifierPath { get; set; } = "/epz/ktru/ktruCard/classifier-info.html";
    public string StandardPath { get; set; } = "/epz/ktru/ktruCard/standard-info.html";
    public string BtkPath { get; set; } = "/epz/ktru/ktruCard/btkInfo.html";

    /// <summary>Стартовая страница рубрикатора КТРУ — список категорий.</summary>
    public string StartPath { get; set; } = "/epz/ktru/start/startPage.html";

    /// <summary>Файл состояния ежедневной проверки RSS (относительный путь от корня воркера).</summary>
    public string StatePath { get; set; } = "ktru-rss-state.json";

    /// <summary>Сколько страниц поиска просматривать в одной категории.</summary>
    public int MaxCategoryPages { get; set; } = 100;

    /// <summary>Ограничение числа категорий в проверке; 0 — все.</summary>
    public int CategoryLimit { get; set; }

    /// <summary>Наш справочник ОКПД2 — источник 11-значных префиксов.</summary>
    public string Okpd2ApiUrl { get; set; } = "http://localhost:5099/api/references/nsiOKPD2/all";

    /// <summary>Потолок suffix внутри одного префикса ОКПД2.</summary>
    public int MaxSuffix { get; set; } = 40;

    /// <summary>Глобальный стоп после N подряд пустых ответов (дыры и временные 403).</summary>
    public int StopAfterEmpty { get; set; } = 3;

    /// <summary>Пауза между запросами, чтобы не словить блокировку ЕИС.</summary>
    public int PauseMs { get; set; } = 350;

    /// <summary>Сколько карточек собрать; 0 — все найденные.</summary>
    public int Take { get; set; }

    /// <summary>Повторы на 403/429/сетевые ошибки.</summary>
    public int MaxRetries { get; set; } = 3;

    /// <summary>Явно заданные префиксы ОКПД2 (из CLI). Пусто — взять из API.</summary>
    public IReadOnlyList<string> Prefixes { get; set; } = [];
}

/// <summary>Значение характеристики: текст и единица измерения ЕИС.</summary>
public sealed record KtruCharacteristicValue(string Value, string Unit);

/// <summary>
/// Характеристика позиции. Required — из пометки «(характеристика является
/// обязательной для применения)» на вкладке «Описание товара…».
/// </summary>
public sealed record KtruCharacteristic(
    string Name,
    bool Required,
    IReadOnlyList<KtruCharacteristicValue> Values);

/// <summary>Строка таблицы «Общероссийские и международные классификаторы».</summary>
public sealed record KtruClassifier(string Name, string Value, string Description);

/// <summary>Строка таблицы «Информация о технических регламентах и стандартах».</summary>
public sealed record KtruStandard(string Name, string DocumentUrl);

/// <summary>Полная публичная карточка КТРУ, разобранная из HTML ЕИС.</summary>
public sealed record KtruCardHtmlRecord(
    string Code,
    string Okpd2Code,
    string Name,
    string Unit,
    string Status,
    string IncludedDate,
    string MandatoryFrom,
    string MandatoryTo,
    bool Enlarged,
    IReadOnlyList<string> ChildCodes,
    IReadOnlyList<KtruCharacteristic> Characteristics,
    IReadOnlyList<KtruClassifier> Classifiers,
    IReadOnlyList<KtruStandard> Standards);

/// <summary>Признак вложенности из тега hidden-block-hover строки поиска.</summary>
public sealed record KtruNestingInfo(int Count, string RelativeUrl);

/// <summary>Категория рубрикатора КТРУ и её RSS-подписка.</summary>
public sealed record KtruRubricatorCategory(
    string Id,
    string Name,
    string SearchUrl,
    string RssUrl);

/// <summary>Состояние ежедневной проверки подписок.</summary>
public sealed record KtruRssState(
    DateTimeOffset LastCheck,
    IReadOnlyList<KtruRubricatorCategory> Categories,
    IReadOnlyList<string> KnownCodes,
    IReadOnlyDictionary<string, IReadOnlyList<string>> FeedCodes)
{
    public static KtruRssState Empty { get; } = new(
        DateTimeOffset.MinValue,
        [],
        [],
        new Dictionary<string, IReadOnlyList<string>>());
}
