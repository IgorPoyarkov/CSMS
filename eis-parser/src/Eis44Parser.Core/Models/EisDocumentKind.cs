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

    /// <summary>Этап исполнения контракта (contractProcedure): хранится как сырой XML,
    /// но не должен перезаписывать основную запись контракта в БД.</summary>
    ContractProcedure = 4,

    /// <summary>План-график (tenderPlan2020): хранится как сырой XML. Его
    /// &lt;purchaseNumber&gt; — это номера позиций (0001, 0002…), а не закупок,
    /// поэтому запись в purchases была бы мусором.</summary>
    TenderPlan = 5,

    /// <summary>Правила нормирования (fcsRegulationRules): разбираются отдельным
    /// NormalizationRulesParser и сохраняются как сырой XML до появления своей
    /// нормализованной таблицы.</summary>
    RegulationRules = 6,

    /// <summary>Запрос ценовых предложений (fcsRequestForQuotation): у него нет
    /// номера закупки/ИКЗ, только <id>. Разбирается отдельным PriceRequestParser,
    /// в purchases не попадает.</summary>
    PriceRequest = 7,
}
