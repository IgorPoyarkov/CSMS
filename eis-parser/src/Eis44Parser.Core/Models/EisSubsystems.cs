namespace Eis44Parser.Core.Models;

/// <summary>
/// Коды подсистем 44-ФЗ из XSD 17.0 getDocsIP-ws-api.xsd, поле
/// selectionParams/subsystemType (commonsubsystemType). Список в ТЗ, где
/// указаны RPZ/RBG/RNP, не совпадает с XSD: RPZ есть только как RPZ223
/// (223-ФЗ), RBG/RNP в перечне отсутствуют, а справочники выгружаются
/// отдельным методом getNsiRequest, а не подсистемой NSI.
/// </summary>
public static class EisSubsystems
{
    /// <summary>Размещение извещений (без протоколов со сведениями об участниках).</summary>
    public const string Priz = "PRIZ";

    /// <summary>Заключение контрактов.</summary>
    public const string Rpec = "RPEC";

    /// <summary>Реестр планов-графиков с 2020 года.</summary>
    public const string Rpgz = "RPGZ";

    /// <summary>Реестр контрактов.</summary>
    public const string Rgk = "RGK";

    /// <summary>Целевой реестр контрактов.</summary>
    public const string Crk = "CRK";

    /// <summary>Электронное актирование.</summary>
    public const string Ea = "EA";

    /// <summary>Односторонний отказ.</summary>
    public const string Ur = "UR";

    /// <summary>Реестр электронных контрактов.</summary>
    public const string Rec = "REC";

    /// <summary>Все коды 44-ФЗ, поддерживаемые конвейером.</summary>
    public static readonly string[] All = [Priz, Rpec, Rpgz, Rgk, Crk, Ea, Ur, Rec];
}

/// <summary>Типы документов 44-ФЗ, для которых есть XSD-схемы в Альбоме ТФФ.</summary>
public static class EisDocumentTypes
{
    /// <summary>Электронный аукцион (ЕИС 2020+).</summary>
    public const string NotificationEf2020 = "epNotificationEF2020";

    /// <summary>Открытый конкурс (ЕИС 2020+).</summary>
    public const string NotificationOk2020 = "epNotificationOK2020";

    /// <summary>Запрос котировок (ЕИС 2020+).</summary>
    public const string NotificationZk2020 = "epNotificationZK2020";

    /// <summary>Запрос предложений (ЕИС 2020+).</summary>
    public const string NotificationZp2020 = "epNotificationZP2020";

    /// <summary>План-график 2020+.</summary>
    public const string TenderPlan2020 = "tenderPlan2020";

    /// <summary>Типы извещений, которые запрашиваются по умолчанию.</summary>
    public static readonly string[] NotificationTypes =
    [
        NotificationEf2020,
        NotificationOk2020,
        NotificationZk2020,
        NotificationZp2020,
    ];
}
