namespace Eis44Parser.Core.Models;

/// <summary>
/// Коды подсистем ЕИС, из которых запрашиваются документы 44-ФЗ.
/// Значения берутся из спецификации сервиса getDocsIP.
/// </summary>
public static class EisSubsystems
{
    /// <summary>Извещения и протоколы (определение поставщика).</summary>
    public const string Priz = "PRIZ";

    /// <summary>Реестр контрактов.</summary>
    public const string Rpec = "RPEC";

    /// <summary>Планы-графики.</summary>
    public const string Rpgz = "RPGZ";

    /// <summary>Справочники НСИ (ОКПД2, КТРУ и др.).</summary>
    public const string Nsi = "NSI";

    /// <summary>Все поддерживаемые коды.</summary>
    public static readonly string[] All = [Priz, Rpec, Rpgz, Nsi];
}

/// <summary>Типы документов 44-ФЗ, для которых есть XSD-схемы в альбоме ТФФ.</summary>
public static class EisDocumentTypes
{
    /// <summary>Электронный аукцион (ЕИС 2020+).</summary>
    public const string NotificationEf2020 = "epNotificationEF2020";

    /// <summary>Открытый конкурс (ЕИС 2020+).</summary>
    public const string NotificationEok2020 = "epNotificationEOK2020";

    /// <summary>Запрос котировок (ЕИС 2020+).</summary>
    public const string NotificationEzk2020 = "epNotificationEZK2020";

    /// <summary>Все поддерживаемые типы извещений.</summary>
    public static readonly string[] NotificationTypes =
    [
        NotificationEf2020,
        NotificationEok2020,
        NotificationEzk2020,
    ];
}
