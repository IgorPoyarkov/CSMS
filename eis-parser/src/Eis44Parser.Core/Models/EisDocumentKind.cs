namespace Eis44Parser.Core.Models;

/// <summary>Тип XML-документа внутри архива ЕИС.</summary>
public enum EisDocumentKind
{
    /// <summary>Тип не определён по корневому элементу — XML всё равно сохраняется в raw.</summary>
    Unknown = 0,

    /// <summary>Извещение, изменение, план-график (сущность «закупка»).</summary>
    Purchase = 1,

    /// <summary>Контракт или элемент реестра контрактов.</summary>
    Contract = 2,

    /// <summary>Справочник НСИ (разбирается отдельным NsiXmlParser).</summary>
    Nsi = 3,
}
