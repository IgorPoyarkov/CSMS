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
  /** Поле обязательно по XSD (minOccurs не равен 0). */
  required?: boolean;
  /** Что написано рядом с элементом в XSD (цитата описания). */
  xsdDoc?: string;
  /** Что это значит для нас. */
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
  {
    domain: "PurchasePlan",
    xsdType: "zfcs_purchasePlanType",
    xsdFile: "IntegrationTypes.xsd",
    xsdLine: 63286,
    status: "partial",
    fields: [
      { field: "planNumber", xsd: "planNumber", status: "mapped" },
      {
        field: "planYear",
        xsd: "commonInfo/planYear",
        status: "mapped",
        required: true,
      },
      {
        field: "planPeriod",
        xsd: "commonInfo/planPeriod/firstYear + secondYear",
        status: "missing",
        required: true,
        note: "У нас только год планирования; первый и второй год планового периода не хранятся.",
      },
      {
        field: "approvalDate",
        xsd: "commonInfo/confirmDate",
        status: "partial",
        required: true,
        note: "XSD различает confirmDate (утверждение плана) и approveDate (утверждение обоснования) — у нас одна дата.",
      },
      {
        field: "approveDate",
        xsd: "commonInfo/approveDate",
        status: "missing",
        required: true,
        note: "Отдельной даты утверждения обоснования плана у нас нет.",
      },
      {
        field: "customer",
        xsd: "commonInfo/customerInfo",
        status: "partial",
        note: "В XSD реквизиты заказчика идут по справочникам ОКОПФ/ОКФС/ОКТМО, у нас — снимок организации.",
      },
      {
        field: "customer.okopf",
        xsd: "commonInfo/customerInfo/OKOPF",
        status: "missing",
        note: "ОКОПФ в карточке организации не хранится.",
      },
      {
        field: "customer.okfs",
        xsd: "commonInfo/customerInfo/OKFS",
        status: "missing",
        note: "ОКФС в карточке организации не хранится.",
      },
      {
        field: "customer.oktmo",
        xsd: "commonInfo/customerInfo/OKTMOPPO",
        status: "missing",
        note: "ОКТМО есть только в реквизитах бюджета (ч. 13 ст. 44), в снимке заказчика его нет.",
      },
      {
        field: "approvalAuthor",
        xsd: "commonInfo/confirmContactInfo/position",
        status: "partial",
        note: "У нас одной строкой «должность и ФИО», в XSD — должность и контактные данные.",
      },
      {
        field: "responsibleContact",
        xsd: "commonInfo/responsibleContactInfo/position",
        status: "missing",
        note: "Ответственный за планирование хранится в карточке организации, а не в плане.",
      },
      { field: "positions", xsd: "positions/position", status: "mapped" },
      {
        field: "specialPurchases",
        xsd: "specialPurchases/specialPurchase",
        status: "missing",
        required: false,
        note: "Особые закупки — отдельная задача (Tasks 5).",
      },
      {
        field: "totalAmount",
        xsd: "outcomeIndicators/totalsInfo",
        status: "partial",
        note: "Совокупный объём ЕИС пересчитывает по позициям.",
      },
      {
        field: "status",
        xsd: "versionNumber / confirmDate",
        status: "partial",
        note: "Наш статус (проект/размещён/изменён/удалён) шире, чем версия и дата утверждения в XSD.",
      },
      { field: "versionNumber", xsd: "versionNumber", status: "mapped" },
      {
        field: "publishDate",
        xsd: "commonInfo/publishDate",
        status: "derived",
        note: "Дату размещения в ЕИС ставит сама ЕИС.",
      },
      {
        field: "eisUrl",
        xsd: "href",
        status: "derived",
        note: "Ссылку на карточку плана формирует ЕИС.",
      },
      {
        field: "remarks",
        xsd: null,
        status: "missing",
        note: "Служебные примечания в XSD не выгружаются.",
      },
    ],
    notes: [
      "Шапка плана-графика: год и период планирования, даты утверждения, реквизиты заказчика и контакты.",
      "Главные пробелы шапки: planPeriod, approveDate, ОКОПФ/ОКФС/ОКТМО и отдельный ответственный контакт.",
      "`positions/position` уходит в zfcs_purchasePlanPositionType — см. таб «План-график».",
    ],
  },
  {
    domain: "PurchasePlanPosition",
    xsdType: "zfcs_purchasePlanPositionType",
    xsdFile: "IntegrationTypes.xsd",
    xsdLine: 63862,
    status: "partial",
    fields: [
      {
        field: "purchaseNumber",
        xsd: "commonInfo/purchaseNumber",
        status: "mapped",
        required: true,
      },
      {
        field: "identificationCode",
        xsd: "commonInfo/IKZ",
        status: "mapped",
        note: "Обязателен для новых позиций; ЕИС контролирует по publishYear, ИКУ, purchaseNumber, ОКПД2 и КВР.",
      },
      {
        field: "IKU",
        xsd: "commonInfo/IKU",
        status: "missing",
        required: false,
        note: "Если не заполнено, ЕИС подставит ИКУ организации.",
      },
      {
        field: "extNumber",
        xsd: "commonInfo/extNumber",
        status: "missing",
        required: false,
        note: "Внешний номер позиции; необязателен (minOccurs=0).",
      },
      {
        field: "tenderPlanPurchaseNumber",
        xsd: "commonInfo/tenderPlanPurchaseNumber",
        status: "derived",
        required: false,
        note: "ЕИС игнорирует значение и ставит '000'.",
      },
      {
        field: "kvrCode",
        xsd: "commonInfo/KVRInfo",
        status: "missing",
        required: true,
        xsdDoc: "Классификация по КВР",
        note: "Отдельный код вида расходов. У нас есть kbk на 20 цифр, КВР — его последние 3 разряда. Можно вычислять, но лучше хранить kvrCode явно.",
      },
      {
        field: "uniqueNumber",
        xsd: "commonInfo/positionNumber",
        status: "partial",
        note: "В XSD это реестровый номер позиции, а не склейка номера плана и порядка.",
      },
      {
        field: "serialNumber",
        xsd: "commonInfo/positionNumber",
        status: "partial",
        note: "Отдельного порядкового номера в XSD нет — только реестровый.",
      },
      {
        field: "objectOfPurchase",
        xsd: "commonInfo/purchaseObjectInfo",
        status: "mapped",
        required: true,
      },
      {
        field: "objectName",
        xsd: "commonInfo/purchaseObjectInfo",
        status: "partial",
        note: "У нас два поля об объекте; в XSD одно — нужно выбрать основное.",
      },
      {
        field: "plannedPlacementYear",
        xsd: "commonInfo/publishYear",
        status: "mapped",
        required: true,
        note: "Год размещения извещения обязателен и участвует в контроле ИКЗ.",
      },
      {
        field: "amountTotal",
        xsd: "financeInfo/total",
        status: "mapped",
        note: "ЕИС игнорирует при приёме и пересчитывает как сумму по годам.",
      },
      {
        field: "amountCurrentYear",
        xsd: "financeInfo/currentYear",
        status: "mapped",
      },
      {
        field: "amountPlanPeriodFirstYear",
        xsd: "financeInfo/firstYear",
        status: "mapped",
      },
      {
        field: "amountPlanPeriodSecondYear",
        xsd: "financeInfo/secondYear",
        status: "mapped",
      },
      {
        field: "amountSubsequentYears",
        xsd: "financeInfo/subsecYears",
        status: "mapped",
      },
      {
        field: "isPublicDiscussionRequired",
        xsd: "commonInfo/publicDiscussion",
        status: "mapped",
        required: true,
      },
      {
        field: "okpd2Code / okpd2Name",
        xsd: "commonInfo/OKPD2Info",
        status: "partial",
        note: "В XSD выбор: ОКПД2, КТРУ, укрупнённая КТРУ или набор из нескольких. Код — строка 1..12 без pattern, точки убирать не нужно.",
      },
      {
        field: "kbk / kbkEntries",
        xsd: "financeInfo/KBKsInfo",
        status: "partial",
        required: false,
        xsdDoc:
          "Детализация по кодам бюджетной классификации. При приёме контролируется, что суммы по всем КБК в полях currentYear, firstYear, secondYear, subsecYears равны значениям в financeInfo",
        note: "Наши kbkEntries есть, но структура другая: в XSD это KBK + KBKYearsInfo с суммами по годам.",
      },
      {
        field: "status",
        xsd: "commonInfo/positionModificationStatus",
        status: "partial",
        note: "В XSD N/E (без изменений/отредактирована) и отдельный флаг отмены.",
      },
      { field: "statusDate", xsd: null, status: "missing" },
      {
        field: "complexityInfo",
        xsd: "commonInfo/complexityInfo/addComplexityText",
        status: "missing",
        required: false,
        note: "Признак сложности закупки; необязателен (minOccurs=0).",
      },
      {
        field: "publicDiscussionPhase1Num",
        xsd: "commonInfo/publicDiscussionPhase1Num",
        status: "derived",
        required: false,
        note: "Номер этапа общественного обсуждения заполняет ЕИС.",
      },
      {
        field: "positionCanceled",
        xsd: "commonInfo/positionCanceled",
        status: "partial",
        required: false,
        note: "Флаг отмены позиции; ЕИС игнорирует значение при приёме.",
      },
      {
        field: "positionModification",
        xsd: "commonInfo/positionModification",
        status: "missing",
        required: false,
        note: "Обязателен при positionModificationStatus=E (позиция отредактирована).",
      },
      {
        field: "authorizedBodyName / jointOrganizerName",
        xsd: "localInfo",
        status: "partial",
        note: "Прямого поля в позиции нет; уточнить по commonInfo плана.",
      },
      {
        field: "КТРУ",
        xsd: "commonInfo/KTRUInfo / templateKTRUInfo / undefined",
        status: "missing",
        note: "У нас только ОКПД2; для КТРУ-позиций нужен отдельный код и характеристики.",
      },
      {
        field: "срок осуществления закупки",
        xsd: "commonInfo/execution/term",
        status: "missing",
        required: true,
        xsdDoc:
          "Осуществление закупки. В рамках блока должен быть заполнен блок term и/или periodicity",
        note: "Обязательный блок. Внутри term/startDate, term/endDate или periodicity. У нас в позиции ПГ срока осуществления закупки нет.",
      },
      {
        field: "периодичность",
        xsd: "commonInfo/execution/periodicity",
        status: "missing",
        required: false,
        xsdDoc: "Периодичность осуществления закупки",
        note: "periodicityType W/B/M/Q/S/Y или otherPeriodicityText. Заполняется вместе с term внутри блока execution.",
      },
      {
        field: "цель закупки",
        xsd: "purposeInfo",
        status: "missing",
        required: false,
        note: "Блок необязательный (minOccurs=0): мероприятие (eventName) в современном ПГ можно не заполнять.",
      },
      {
        field: "обоснование закупки",
        xsd: "basementInfo",
        status: "missing",
        required: true,
        note: "basement и legalActs/noLegalAct — блок обязателен по XSD.",
      },
      {
        field: "закупки на последующие годы",
        xsd: "purchasesSubsecYearsInfo",
        status: "missing",
      },
      {
        field: "энергосервисный контракт",
        xsd: "isEnergyServiceContract",
        status: "missing",
      },
    ],
    notes: [
      "Финансовый контур, ИКЗ, номер закупки, ОКПД2 и год размещения совпадают.",
      "Обязательны по XSD, но у нас не заполняются: КВР, блок execution (срок и/или периодичность), обоснование закупки (basementInfo), публичное обсуждение.",
      "Для полной выгрузки ПГ не хватает КТРУ, срока/периодичности, цели и обоснования закупки.",
      "`total` — дублирующее поле: ЕИС считает его само; `tenderPlanPurchaseNumber` ЕИС тоже игнорирует.",
    ],
  },
  {
    domain: "NoticeInfoFormValues",
    xsdType: "zfcs_purchaseNotificationType + zfcs_notificationEFType",
    xsdFile: "IntegrationTypes.xsd",
    xsdLine: 43525,
    status: "partial",
    fields: [
      {
        field: "generalInfo.noticeNumber",
        xsd: "docNumber",
        status: "partial",
        note: "В XSD отдельно purchaseNumber (номер закупки) и docNumber (номер документа).",
      },
      {
        field: "generalInfo.placingWayCode",
        xsd: "placingWay",
        status: "mapped",
        required: true,
      },
      {
        field: "generalInfo.orderName",
        xsd: "purchaseObjectInfo",
        status: "mapped",
        required: true,
      },
      {
        field: "generalInfo.ikz",
        xsd: "customerRequirement/purchaseCode",
        status: "partial",
        note: "При наличии позиции ПГ ЕИС заполняет из неё; иначе обязателен.",
      },
      {
        field: "generalInfo.nmck",
        xsd: "lot/maxPrice",
        status: "mapped",
        required: true,
      },
      {
        field: "generalInfo.etpName / etpUrl",
        xsd: "ETP",
        status: "mapped",
        note: "Для электронных процедур (ЭА и др.).",
      },
      {
        field: "generalInfo.positionUniqueNumber",
        xsd: "customerRequirement/tenderPlan2020Info",
        status: "partial",
      },
      {
        field: "generalInfo.planPositionNumber",
        xsd: "customerRequirement/tenderPlanInfo",
        status: "partial",
      },
      {
        field: "generalInfo.kbk",
        xsd: "contractExecutionPaymentPlan/budgetFinancings",
        status: "partial",
        note: "План оплаты обязателен после версии ЕИС 10.0.",
      },
      {
        field: "generalInfo.authorizedBodyName / jointOrganizerName",
        xsd: "purchaseResponsible/responsibleOrg + responsibleRole",
        status: "partial",
        note: "Роль кодируется: CU, RA, AI, OCU, ORA, OAI и т.п.",
      },
      {
        field: "contactInfo.*",
        xsd: "purchaseResponsible/responsibleInfo",
        status: "mapped",
        required: true,
      },
      {
        field: "procedureInfo.plannedPublishDate",
        xsd: "docPublishDate",
        status: "mapped",
        required: true,
      },
      {
        field: "procedureInfo.submissionEndDate / submissionEndTime",
        xsd: "procedureInfo/collecting",
        status: "mapped",
      },
      {
        field: "procedureInfo.secondPartsReviewEndDate",
        xsd: "procedureInfo/scoring/date",
        status: "partial",
      },
      {
        field: "procedureInfo.summingUpDate",
        xsd: "procedureInfo/bidding/date",
        status: "partial",
      },
      {
        field: "contractConditions.currency",
        xsd: "lot/currency",
        status: "mapped",
      },
      {
        field: "contractConditions.usePriceFormulaPP19 / priceFormulaText",
        xsd: "lot/isContractPriceFormula / lot/priceFormula",
        status: "mapped",
      },
      {
        field: "contractConditions.hasAdvance / advancePercent",
        xsd: "customerRequirement/advancePaymentSum",
        status: "mapped",
      },
      {
        field: "contractConditions.requiresPublicDiscussionArt20",
        xsd: "customerRequirement/mustPublicDiscussion",
        status: "mapped",
      },
      {
        field: "contractConditions.ikz*",
        xsd: "customerRequirement/IKZInfo",
        status: "partial",
        note: "Год, ОКПД2, КВР, ИКУ ЕИС заполняет из purchaseCode.",
      },
      {
        field: "contractConditions.deliveryPlaces",
        xsd: "customerRequirement/deliveryPlace / kladrPlaces",
        status: "partial",
      },
      {
        field: "contractConditions.typicalConditionsNumber",
        xsd: "lot/standardContractNumber",
        status: "mapped",
      },
      {
        field: "contractConditions.isLifecycleContract / lifecycleCasesPP1087",
        xsd: "lot/contractLifeCycleInfo",
        status: "mapped",
      },
      {
        field:
          "contractConditions.isRelativeTerms / startOffsetDays / durationDays",
        xsd: "customerRequirement/deliveryTerm",
        status: "partial",
        required: true,
        note: "В XSD срок — текстом, а не структурой из дней.",
      },
      {
        field: "contractConditions.stages",
        xsd: null,
        status: "missing",
        note: "Структурированных этапов в извещении не нашли: этапы живут в контракте.",
      },
      {
        field:
          "contractConditions.isBudgetFunds / budgetName / budgetLevel / oktmoCode",
        xsd: "contractExecutionPaymentPlan/budgetFinancings",
        status: "partial",
      },
      {
        field: "purchaseObjects.isIndeterminateVolume",
        xsd: "lot/quantityUndefined",
        status: "mapped",
        required: true,
      },
      {
        field: "purchaseObjects.items",
        xsd: "customerRequirement/purchaseObjects/purchaseObject",
        status: "mapped",
        note: "Код ОКПД2 в XSD — строка 1..12 без pattern: 42.12.20.100 и 421220100 технически проходят, но ЕИС сверяет со справочником nsiOKPD2.",
      },
      {
        field: "purchaseObjects.normingRequirements",
        xsd: "purchaseObject/OKPD2/characteristics",
        status: "partial",
        note: "Набор характеристик зависит от ОКПД2 или КТРУ.",
      },
      {
        field: "objectDescription",
        xsd: "purchaseObjectInfo + OKPD2/addCharacteristics + KTRU/characteristics",
        status: "partial",
      },
      {
        field: "participantsRequirements.requiresApplicationSecurity / percent",
        xsd: "customerRequirement/applicationGuarantee",
        status: "mapped",
      },
      {
        field: "participantsRequirements.requiresContractSecurity / percent",
        xsd: "customerRequirement/contractGuarantee",
        status: "mapped",
      },
      {
        field: "participantsRequirements.requiresWarrantySecurity / percent",
        xsd: "customerRequirement/provisionWarranty",
        status: "mapped",
      },
      {
        field: "participantsRequirements.advantage*",
        xsd: null,
        status: "partial",
        note: "Преимущества и требования ст. 31 в XSD разложены по отдельным блокам — сверять при маппинге.",
      },
      {
        field: "participantsRequirements.unifiedRequirements*",
        xsd: null,
        status: "partial",
        note: "Требования к участникам в XSD идут отдельными блоками, не одним текстом.",
      },
      {
        field: "attachedDocs",
        xsd: "attachments",
        status: "mapped",
      },
      {
        field: "noticeState",
        xsd: "docPublishDate / href / printForm",
        status: "derived",
        note: "Дату, ссылку и печатную форму заполняет ЕИС.",
      },
    ],
    notes: [
      "Базовый контур извещения совпадает: предмет, НМЦК, способ, ЭТП, контакты, сроки подачи, валюта, аванс, обеспечения, документы.",
      "Главные пробелы: purchaseNumber отдельно от noticeNumber, структурированные этапы/сроки, требования к участникам и нацрежим.",
      "Технические поля (docPublishDate, href, printForm, extPrintForm, isGOZ, isBBST) заполняет ЕИС или они вне нашего scope.",
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
