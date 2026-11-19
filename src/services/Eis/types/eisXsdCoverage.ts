/**
 * Карта соответствия наших доменных моделей и XSD Альбома ЕИС.
 *
 * Это не копия XSD и не генератор XML: здесь только ответ на вопрос «какое
 * наше поле в какой элемент ЕИС уходит и что ещё не покрыто». Сами XSD-типы
 * лежат в `csms-api/schemas/<версия>/`, а сгенерированные TypeScript-описания —
 * в `../generated`. Маппер домена в XML пишется в csms-api, поэтому карта
 * нужна как чек-лист для него и как подсказка в интерфейсе.
 *
 * Номера строк — подсказка для перехода в снимок схем версии 17.0. При
 * обновлении Альбома они сдвинутся: ориентироваться на имя типа, а не на
 * строку. Статусы:
 * — `mapped` — поле переносится один в один;
 * — `partial` — переносится с преобразованием или требует соседних полей;
 * — `missing` — поля нет в XSD (или у нас нет поля, которое требует XSD);
 * — `derived` — поле вычисляется/заполняется на стороне ЕИС.
 */

export const EIS_XSD_SNAPSHOT_VERSION = "17.0";

export type EisCoverageStatus = "mapped" | "partial" | "missing" | "derived";

export const eisCoverageStatusLabels: Record<EisCoverageStatus, string> = {
  mapped: "Переносится",
  partial: "Переносится с преобразованием",
  missing: "Нет в XSD / нет у нас",
  derived: "Заполняет ЕИС",
};

export interface EisFieldCoverage {
  /** Поле нашей модели, включая вложенный путь. */
  field: string;
  /** Путь в XSD или null, если соответствия нет. */
  xsd: string | null;
  status: EisCoverageStatus;
  note?: string;
}

export interface EisTypeCoverage {
  /** Наша модель. */
  domain: string;
  /** XSD-тип, в который она уходит. */
  xsdType: string;
  /** Файл снимка схем. */
  xsdFile: string;
  /** Строка объявления типа в снимке 17.0 (подсказка). */
  xsdLine: number | null;
  status: EisCoverageStatus;
  fields: EisFieldCoverage[];
  notes: string[];
}

export const EIS_XSD_COVERAGE: EisTypeCoverage[] = [
  {
    domain: "ContractRegistryItem",
    xsdType: "zfcs_contract2015Type",
    xsdFile: "IntegrationTypes.xsd",
    xsdLine: 15708,
    status: "partial",
    fields: [
      {
        field: "contractNumber",
        xsd: "docNumber",
        status: "partial",
        note: "ЕИС игнорирует при приёме и заполняет из реестрового номера контракта.",
      },
      {
        field: "eisRegistryNumber",
        xsd: "regNumber",
        status: "partial",
        note: "Реестровый номер в корне типа; точный путь сверить при маппинге.",
      },
      { field: "contractDate", xsd: "contractDate", status: "mapped" },
      { field: "contractPrice", xsd: "priceInfo/price", status: "mapped" },
      {
        field: "initialMaxPrice",
        xsd: null,
        status: "missing",
        note: "НМЦК хранится в извещении, в карточке контракта её нет.",
      },
      {
        field: "supplierName",
        xsd: "supplier/fullName",
        status: "partial",
        note: "Блок поставщика зависит от организационно-правовой формы.",
      },
      { field: "supplierInn", xsd: "supplier/INN", status: "partial" },
      { field: "supplierKpp", xsd: "supplier/KPP", status: "partial" },
      {
        field: "ikz",
        xsd: "foundation",
        status: "partial",
        note: "ИКЗ связан с основанием заключения контракта.",
      },
      {
        field: "smpRequiredPercent",
        xsd: "subContractorsSum/sumInPercents",
        status: "mapped",
      },
      {
        field: "performanceSecurityAmount",
        xsd: "enforcement",
        status: "partial",
      },
      {
        field: "warrantySecurityAmount",
        xsd: "subsequentMaintenanceEnforcement",
        status: "partial",
      },
      { field: "eisPublishDate", xsd: "publishDate", status: "mapped" },
      {
        field: "status",
        xsd: "isActual / cancel",
        status: "partial",
        note: "Наш статус шире: «исполняется», «расторгнут» и т.п.",
      },
      {
        field: "executionStartDate / executionEndDate",
        xsd: null,
        status: "missing",
        note: "В прочитанном фрагменте типа дат исполнения нет — уточнить по XSD.",
      },
    ],
    notes: [
      "Тип 2015 года — основная карточка реестра контрактов.",
      "Технические поля версии и публикации заполняет ЕИС, нам их не хранить.",
    ],
  },
  {
    domain: "ContractSmpRecord",
    xsdType:
      "contractExecutionOtherType/executionOtherInfo/subContractorsnfo + zfcs_contract2015SubContractInfoType",
    xsdFile: "IntegrationCETypes.xsd, IntegrationTypes.xsd",
    xsdLine: 1356,
    status: "partial",
    fields: [
      { field: "amount", xsd: "subContractorsnfo/sum", status: "mapped" },
      {
        field: "supplierName",
        xsd: "subContractorsnfo/fullName",
        status: "mapped",
      },
      { field: "supplierInn", xsd: "subContractorsnfo/INN", status: "mapped" },
      { field: "supplierKpp", xsd: "subContractorsnfo/KPP", status: "mapped" },
      {
        field: "isSmpSubject",
        xsd: "subContractorsnfo/statusInfo/statusCode",
        status: "partial",
        note: "SMP или SONO; при наличии ИНН в ЕРСМСП ЕИС заполняет статус сам.",
      },
      {
        field: "documentNumber",
        xsd: "zfcs_contract2015SubContractInfoType",
        status: "partial",
        note: "Номер договора не входит в subContractorsnfo — идёт отдельным блоком.",
      },
      {
        field: "documentDate",
        xsd: "zfcs_contract2015SubContractInfoType",
        status: "partial",
      },
      {
        field: "okpd2Code",
        xsd: "subPurchaseObjectInfo/OKPD2Info",
        status: "partial",
      },
      {
        field: "priceType / unitPrice",
        xsd: "subPurchaseObjectInfo/unitPrice",
        status: "partial",
        note: "Вид цены и цена единицы нужны только при неопределённом объёме.",
      },
      {
        field: "subject",
        xsd: "subPurchaseObjectInfo",
        status: "partial",
      },
      {
        field: "period",
        xsd: null,
        status: "missing",
        note: "Периода как отдельного поля в XSD нет — он выводится из документов.",
      },
      {
        field: "paidToSupplierDate",
        xsd: null,
        status: "missing",
      },
      {
        field: "address",
        xsd: "subContractorsnfo/address",
        status: "missing",
        note: "Поле есть в XSD, у нас адрес субподрядчика не хранится.",
      },
    ],
    notes: [
      "Договоры с субподрядчиком передаются двумя путями: «иные сведения» (contractExecutionOther) и блок subContractorsSum в реестре контрактов.",
      "Выбор пути — в C#-маппере: для отчёта об исполнении один, для карточки контракта другой.",
    ],
  },
  {
    domain: "ContractPayment",
    xsdType: "contractExecutionPaymentType/payDocumentInfo",
    xsdFile: "IntegrationCETypes.xsd",
    xsdLine: 76,
    status: "partial",
    fields: [
      {
        field: "paymentDocumentNumber",
        xsd: "payDocumentInfo/payDocumentNum",
        status: "mapped",
      },
      {
        field: "paymentDate",
        xsd: "payDocumentInfo/payDocumentDate",
        status: "mapped",
      },
      { field: "amount", xsd: "payDocumentInfo/paid", status: "mapped" },
      {
        field: "paymentType",
        xsd: "payDocumentInfo/payDocumentType",
        status: "partial",
        note: "У нас advance/intermediate/final, в XSD PC/PN/RC/RE и т.п.",
      },
      {
        field: "invoiceNumber",
        xsd: "payDocumentInfo/baseDocumentInfo",
        status: "partial",
      },
      {
        field: "invoiceDate",
        xsd: "payDocumentInfo/baseDocumentInfo",
        status: "partial",
      },
      {
        field: "bankDocumentNumber",
        xsd: null,
        status: "missing",
        note: "В payDocumentInfo такого поля нет.",
      },
      {
        field: "treasuryExecution",
        xsd: "payDocumentInfo/paymentsSumInfo/budgetFinancingsInfo",
        status: "partial",
        note: "Казначейское исполнение раскрывается через КБК, а не флагом.",
      },
      {
        field: "comment",
        xsd: null,
        status: "derived",
        note: "Комментарий остаётся только у нас.",
      },
    ],
    notes: [
      "Оплата — отдельный документ исполнения контракта.",
      "ЕИС присваивает реестровый номер сведений (regNumberExecution) — его надо сохранять у нас.",
    ],
  },
  {
    domain: "ContractDelivery",
    xsdType: "contractExecutionDocAcceptanceType/docAcceptanceInfo",
    xsdFile: "IntegrationCETypes.xsd",
    xsdLine: 2066,
    status: "partial",
    fields: [
      {
        field: "itemName",
        xsd: "docAcceptanceInfo/productsInfo/.../productInfo",
        status: "partial",
      },
      {
        field: "quantity",
        xsd: "docAcceptanceInfo/productsInfo",
        status: "partial",
      },
      {
        field: "unit",
        xsd: "docAcceptanceInfo/productsInfo",
        status: "partial",
      },
      {
        field: "amount",
        xsd: "docAcceptanceInfo/productsInfo",
        status: "partial",
      },
      {
        field: "acceptanceActNumber / acceptanceActDate",
        xsd: "docAcceptanceInfo",
        status: "partial",
      },
      { field: "result", xsd: "docAcceptanceInfo", status: "partial" },
      { field: "notes", xsd: "docAcceptanceInfo", status: "partial" },
    ],
    notes: [
      "Тип приёмки детально не сверялся: статусы partial означают «поле есть в XSD, путь уточнить при маппинге».",
      "Приёмка — документ исполнения, а не часть карточки контракта.",
    ],
  },
  {
    domain: "ContractStage",
    xsdType: "stagetInfoType / contractInfo/stage",
    xsdFile: "IntegrationTypes.xsd, IntegrationCETypes.xsd",
    xsdLine: 4464,
    status: "partial",
    fields: [
      {
        field: "stageNumber",
        xsd: "sid / externalSid",
        status: "partial",
        note: "В ЕИС этап идентифицируется sid, а не порядковым номером.",
      },
      { field: "name", xsd: "stageName", status: "mapped" },
      { field: "startDate", xsd: "startDate", status: "mapped" },
      { field: "endDate", xsd: "endDate", status: "mapped" },
      {
        field: "amount",
        xsd: null,
        status: "missing",
        note: "Суммы этапа в stage нет — они в paymentsSumInfo.",
      },
      {
        field: "status",
        xsd: null,
        status: "derived",
        note: "Статус этапа ЕИС не хранит.",
      },
    ],
    notes: [
      "Этап в реестре — ссылка на этап контракта; сам контракт приходит из ПЗК.",
    ],
  },
  {
    domain: "SmnpReport",
    xsdType: "zfcs_customerReportSmallScaleBusinessType",
    xsdFile: "IntegrationTypes.xsd",
    xsdLine: 33093,
    status: "partial",
    fields: [],
    notes: [
      "Годовой отчёт об объёме закупок у СМП/СОНО по ч. 1 ст. 30.",
      "Поля нашего отчёта (`smnpReports`) ещё не сверены с XSD — это следующая задача маппера.",
    ],
  },
];

/** Найти карту по имени нашей модели. */
export const eisCoverageForDomain = (domain: string): EisTypeCoverage | null =>
  EIS_XSD_COVERAGE.find((coverage) => coverage.domain === domain) ?? null;

export interface EisCoverageSummary {
  mapped: number;
  partial: number;
  missing: number;
  derived: number;
  total: number;
}

/** Сколько полей в каком статусе — для прогресса и тестов. */
export const eisCoverageSummary = (
  coverage: EisTypeCoverage[] = EIS_XSD_COVERAGE,
): EisCoverageSummary => {
  const fields = coverage.flatMap((item) => item.fields);
  const count = (status: EisCoverageStatus): number =>
    fields.filter((field) => field.status === status).length;

  return {
    mapped: count("mapped"),
    partial: count("partial"),
    missing: count("missing"),
    derived: count("derived"),
    total: fields.length,
  };
};
