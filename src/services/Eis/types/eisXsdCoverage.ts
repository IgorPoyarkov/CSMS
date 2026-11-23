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
        xsd: "priceInfo",
        status: "partial",
        note: "НМЦК переносится в карточку контракта из извещения; в XSD цена контракта идёт в priceInfo, НМЦК уточняется при маппинге.",
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
        note: "ИКЗ связан с основанием заключения контракта; проверяется 36-значный формат (contractIkzError).",
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
      {
        field: "advanceAmount",
        xsd: "advancePaymentSum",
        status: "partial",
        note: "Сумма аванса в рублях хранится в карточке контракта и переносится в сведения об исполнении.",
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
        xsd: "executionInfo",
        status: "partial",
        note: "Даты начала и окончания исполнения ведутся в карточке; путь в zfcs_contract2015Type уточняется при маппинге.",
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
        field: "paymentType / paymentTypeCode",
        xsd: "payDocumentInfo/payDocumentType",
        status: "mapped",
        note: "У нас advance/intermediate/final, в XSD PC/PN/RC/RE; соответствие задаёт paymentXsdCodeFor, код можно переопределить полем paymentTypeCode.",
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
        note: "Поле хранится у нас, но в payDocumentInfo прямого элемента нет — идёт в блоке банковского сопровождения.",
      },
      {
        field: "regNumberExecution",
        xsd: "regNumberExecution",
        status: "mapped",
        note: "Реестровый номер сведений об исполнении присваивает ЕИС; сохраняем у нас для повторной отправки.",
      },
      {
        field: "treasuryExecution",
        xsd: "payDocumentInfo/paymentsSumInfo/budgetFinancingsInfo",
        status: "partial",
        note: "Казначейское исполнение раскрывается через КБК, а не флагом.",
      },
      {
        field: "paymentDeadlineDate",
        xsd: null,
        status: "derived",
        note: "Срок оплаты 7/10 рабочих дней по ч. 13.1 ст. 34 считается из даты платежа и казначейского сопровождения.",
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
        field: "sid",
        xsd: "sid / externalSid",
        status: "mapped",
        note: "В ЕИС этап идентифицируется sid, а не порядковым номером; поле добавлено в ContractStageSchema.",
      },
      {
        field: "stageNumber",
        xsd: "sid / externalSid",
        status: "partial",
        note: "Порядковый номер остаётся у нас для отображения; в ЕИС уходит sid.",
      },
      { field: "name", xsd: "stageName", status: "mapped" },
      { field: "startDate", xsd: "startDate", status: "mapped" },
      { field: "endDate", xsd: "endDate", status: "mapped" },
      {
        field: "amount / paymentsSumInfo",
        xsd: "paymentsSumInfo",
        status: "partial",
        note: "Суммы этапа в stage нет — они в paymentsSumInfo по годам; поле paymentsSumInfo добавлено в схему.",
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
        field: "planPeriodFirstYear / planPeriodSecondYear",
        xsd: "commonInfo/planPeriod/firstYear + secondYear",
        status: "mapped",
        required: true,
        note: "Поля есть в PurchasePlanSchema и заполняются в форме шапки плана-графика.",
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
        status: "partial",
        required: true,
        note: "Поле есть в схеме и форме шапки; маппер eis17Types.ts (зона Фронт-2) пока переносит только planPeriod и не выводит approveDate.",
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
        status: "mapped",
        note: "Код ОКОПФ ведётся в карточке организации и выгружается в customerInfo/OKOPF.",
      },
      {
        field: "customer.okfs",
        xsd: "commonInfo/customerInfo/OKFS",
        status: "mapped",
        note: "Код ОКФС ведётся в карточке организации и выгружается в customerInfo/OKFS.",
      },
      {
        field: "customer.oktmo",
        xsd: "commonInfo/customerInfo/OKTMOPPO",
        status: "mapped",
        note: "ОКТМО ППО берётся из реквизитов организации (oktmoPpo) и выгружается в customerInfo/OKTMOPPO.",
      },
      {
        field: "approvalAuthor",
        xsd: "commonInfo/confirmContactInfo/position",
        status: "partial",
        note: "У нас одной строкой «должность и ФИО», в XSD — должность и контактные данные.",
      },
      {
        field: "responsibleContactInfo",
        xsd: "commonInfo/responsibleContactInfo",
        status: "partial",
        note: "Поля есть в шапке плана-графика; маппер eis17Types.ts (зона Фронт-2) ещё не переносит блок ответственного контакта.",
      },
      { field: "positions", xsd: "positions/position", status: "mapped" },
      {
        field: "specialPurchases",
        xsd: "specialPurchasePositions/specialPurchasePosition",
        status: "partial",
        required: false,
        note: "Позиции особых закупок ведутся в отдельной вкладке плана-графика (тип, ИКЗ/ИКУ, год, номер закупки, КВР/КБК, КОКС, суммы по годам). Устаревший блок specialPurchases ЕИС 17.0 игнорирует.",
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
        field: "iku",
        xsd: "commonInfo/IKU",
        status: "mapped",
        required: false,
        note: "Поле есть в схеме; при пустом значении ЕИС подставит ИКУ организации.",
      },
      {
        field: "extNumber",
        xsd: "commonInfo/extNumber",
        status: "mapped",
        required: false,
        note: "Внешний номер позиции заполняется номером плана-графика; необязателен (minOccurs=0).",
      },
      {
        field: "tenderPlanPurchaseNumber",
        xsd: "commonInfo/tenderPlanPurchaseNumber",
        status: "derived",
        required: false,
        note: "ЕИС игнорирует значение и ставит '000'.",
      },
      {
        field: "kvr",
        xsd: "commonInfo/KVRInfo/code",
        status: "mapped",
        required: true,
        xsdDoc: "Классификация по КВР",
        note: "КВР хранится в поле kvr: заполняется из детализации по КВР или из последних 3 разрядов КБК.",
      },
      {
        field: "uniqueNumber",
        xsd: "commonInfo/positionNumber",
        status: "mapped",
        note: "Реестровый номер позиции — 24 цифры (xs:length=24): 18 цифр номера плана-графика (год 4 + код заказчика по СПЗ 11 + порядковый номер плана 3) и 6 цифр номера позиции, который присваивает ЕИС.",
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
        field: "positionModification / modificationDecision",
        xsd: "commonInfo/positionModification",
        status: "partial",
        required: false,
        note: "Обязателен при positionModificationStatus=E; основание и описание ведутся в блоке изменений позиции.",
      },
      {
        field: "authorizedBodyName / jointOrganizerName",
        xsd: "localInfo",
        status: "partial",
        note: "Прямого поля в позиции нет; уточнить по commonInfo плана.",
      },
      {
        field: "ktruCode / ktruName",
        xsd: "commonInfo/KTRUInfo / templateKTRUInfo / undefined",
        status: "partial",
        note: "Код и наименование КТРУ есть в схеме; характеристики КТРУ ведутся отдельно и в позицию ПГ не дублируются.",
      },
      {
        field: "executionTermStartDate / executionTermEndDate",
        xsd: "старый IntegrationTypes.xsd :: commonInfo/execution/term",
        status: "missing",
        required: false,
        note: "Блок execution отсутствует в tenderPlan2020PositionType (ПГ 2020); поля убраны из карточки позиции.",
      },
      {
        field: "periodicityType / periodicityText",
        xsd: "старый IntegrationTypes.xsd :: commonInfo/execution/periodicity",
        status: "missing",
        required: false,
        note: "Периодичность из старого плана-графика в ПГ 2020 не передаётся; поля убраны из карточки позиции.",
      },
      {
        field: "цель закупки",
        xsd: "purposeInfo",
        status: "missing",
        required: false,
        note: "Блок необязательный (minOccurs=0): мероприятие (eventName) в современном ПГ можно не заполнять.",
      },
      {
        field: "basementInfo / basementLegalAct",
        xsd: "старый IntegrationTypes.xsd :: basementInfo",
        status: "missing",
        required: false,
        note: "Блок обоснования закупки отсутствует в tenderPlan2020PositionType; поля убраны из карточки позиции.",
      },
      {
        field: "subsecYearsLegalAct",
        xsd: "purchasesSubsecYearsInfo/actInfo/docInfo",
        status: "partial",
        required: false,
        note: "Правовой акт показывается и сохраняется, только когда есть сумма на последующие годы; маппер собирает actInfo/docInfo и actFinanceInfo.",
      },
      {
        field: "isEnergyServiceContract",
        xsd: "isEnergyServiceContract",
        status: "mapped",
        note: "Признак энергосервисного контракта есть в схеме и в форме позиции.",
      },
    ],
    notes: [
      "Финансовый контур, ИКЗ, номер закупки, ОКПД2 и год размещения совпадают.",
      "Блоки execution и basementInfo относятся к старому ПГ; в ПГ 2020 их нет и карточка их не показывает.",
      "КВР позиции берётся из КБК; детализация KVRsInfo для казённого учреждения не формируется.",
      "Публичное обсуждение по documentation XSD заполняется, когда год размещения совпадает с годом планирования.",
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
        field:
          "foundationInfo.protocolName / protocolNumber / protocolPublishDate",
        xsd: "foundationInfo/protocolInfo",
        status: "partial",
        required: false,
        note: "Протокол-основание переносится из СЗ и используется проектом контракта; в извещении служит ссылкой на процедуру.",
      },
      {
        field: "foundationInfo.appNumber",
        xsd: "appNumber",
        status: "partial",
        required: false,
        note: "Номер заявки победителя появляется после процедуры и переносится из СЗ.",
      },
      {
        field: "foundationInfo.isStructuredForm",
        xsd: "contractInfo/isStructuredForm",
        status: "mapped",
        note: "Признак структурированной формы проекта контракта; при false проект контракта требует файлов.",
      },
      {
        field: "foundationInfo.contractProjectFiles",
        xsd: "contractProjectFilesInfo/contractProjectFileInfo",
        status: "partial",
        required: false,
        note: "Файлы проекта контракта ведутся в СЗ и переносятся в извещение и проект контракта.",
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
        field: "contractConditions.paymentProcedure / paymentTermDays",
        xsd: "customerRequirement/contractConditionsInfo",
        status: "partial",
        note: "Порядок и срок оплаты (7/10 рабочих дней) наследуются из СЗ; в XSD срок оплаты выгружается текстом.",
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
        xsd: "customerRequirement/contractConditionsInfo/contractExecutionPaymentPlan/stagesInfo",
        status: "mapped",
        note: "Этапы выгружаются в stagesInfo с относительными сроками и внешним идентификатором этапа.",
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
        xsd: "notificationInfo/preferensesInfo",
        status: "mapped",
        note: "Преимущества ст. 28–30 выгружаются в preferensesInfo (коды nsiPurchasePreferences: P1, P2, P3).",
      },
      {
        field: "participantsRequirements.unifiedRequirements*",
        xsd: "notificationInfo/requirementsInfo",
        status: "mapped",
        note: "Требования ст. 31 выгружаются в requirementsInfo кодами ET44, TU44, TR442, ETP44312, TOVNPIVR.",
      },
      {
        field: "participantsRequirements.pp2571Positions",
        xsd: "notificationInfo/requirementsInfo/requirementInfo/addRequirements",
        status: "mapped",
        note: "Позиции приложения ПП РФ № 2571 выгружаются в addRequirement: shortName — код записи nsiPurchasePreferences (1–20 символов, prefsReqsShortNameType), name — наименование позиции (text2000Type), content — текст требования и перечень ОКПД2 объектов закупки (text4000Type).",
      },
      {
        field: "purchaseObjects.items.nationalRegimeType",
        xsd: "notificationInfo/restrictionsInfo",
        status: "mapped",
        note: "Запрет и ограничение допуска по позициям сводятся в restrictionInfo с кодом JB2149 и перечнем restrictionSt14.",
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
      "Этапы, требования ст. 31, преимущества ст. 28–30 и ограничения нацрежима выгружаются отдельными блоками notificationInfo.",
      "Остаётся различие purchaseNumber/docNumber и технические поля (docPublishDate, href, printForm, extPrintForm, isGOZ), которые заполняет ЕИС.",
    ],
  },
  {
    domain: "ContractProject",
    xsdType: "contractProjectType",
    xsdFile: "IntegrationCPTypes.xsd",
    xsdLine: 6150,
    status: "partial",
    fields: [
      {
        field: "organizationId",
        xsd: "placerInfo/responsibleOrg",
        status: "partial",
        required: true,
        note: "В XSD — ссылка на справочник организаций ЕИС, у нас локальный id организации.",
      },
      {
        field: "eisInfo.placerRole",
        xsd: "placerInfo/responsibleRole",
        status: "partial",
        required: true,
        note: "Коды CU/RA/AI/OA/CS/RO/TKO/AU/CC; по умолчанию CU, из извещения берётся contactInfo.responsibleRole.",
      },
      {
        field: "ikz",
        xsd: "foundationInfo/purchaseCode",
        status: "derived",
        required: false,
        note: "При приёме игнорируется: ЕИС заполняет ИКЗ из связанного извещения.",
      },
      {
        field: "noticeNumber",
        xsd: "foundationInfo/purchaseNumber",
        status: "mapped",
        required: true,
        note: "Номер закупки в ЕИС; из него ЕИС подтягивает способ, ЭТП, ИКЗ и заказчика.",
      },
      {
        field: "eisInfo.purchaseNumber",
        xsd: "foundationInfo/purchaseNumber",
        status: "partial",
        required: true,
        note: "Дублирует noticeNumber для маппера: в форме отдельно не редактируется.",
      },
      {
        field: "customerName / requisites.customer*",
        xsd: "customerInfo",
        status: "partial",
        required: false,
        note: "При одном заказчике в извещении ЕИС игнорирует блок и берёт его из извещения.",
      },
      {
        field: "supplierName",
        xsd: "participantInfo",
        status: "partial",
        required: true,
        note: "Блок поставщика при приёме проверяется по итоговому протоколу.",
      },
      {
        field: "requisites.supplierInn / supplierKpp / supplierOgrn",
        xsd: "participantInfo/INN, KPP, OGRN",
        status: "partial",
      },
      {
        field: "eisInfo.protocolName / protocolNumber / protocolPublishDate",
        xsd: "foundationInfo/protocolInfo",
        status: "partial",
        required: false,
        note: "Итоговый протокол-основание; у нас заполняется после процедуры.",
      },
      {
        field: "eisInfo.etpName / etpUrl",
        xsd: "foundationInfo/ETP",
        status: "derived",
        required: false,
        note: "При приёме блок игнорируется — ЕИС берёт ЭТП из извещения.",
      },
      {
        field: "eisInfo.placingWayCode",
        xsd: "foundationInfo/placingWay",
        status: "derived",
        required: false,
        note: "При приёме блок игнорируется — ЕИС берёт подспособ из извещения.",
      },
      {
        field: "eisInfo.isStructuredForm",
        xsd: "contractInfo/isStructuredForm",
        status: "mapped",
        required: false,
        note: "Признак структурированного проекта; от него зависит, нужны ли файлы проекта контракта.",
      },
      {
        field: "subject.objectName",
        xsd: "contractInfo/subject",
        status: "partial",
        required: false,
        note: "При структурированной форме ЕИС игнорирует: предмет берётся из структуры контракта.",
      },
      {
        field: "eisInfo.concludeContractRight",
        xsd: "contractInfo/concludeContractRight",
        status: "derived",
        required: false,
        note: "Торги на право заключения контракта — заполняется из итогового протокола.",
      },
      {
        field: "eisInfo.changePrice / changePriceFoundation",
        xsd: "contractInfo/changePriceInfo",
        status: "mapped",
        required: false,
        note: "Изменённая цена и основание выгружаются в changePriceInfo; при заполненной цене основание обязательно.",
      },
      {
        field: "price.finalPrice",
        xsd: "contractInfo/price",
        status: "derived",
        required: false,
        note: "ЕИС заполняет из итогового протокола или changePriceInfo.",
      },
      {
        field: "price.advanceAmount",
        xsd: "contractInfo/advancePaymentSum",
        status: "mapped",
        required: false,
        note: "Сумма аванса рассчитывается из НМЦК и процента аванса и переносится в проект контракта.",
      },
      {
        field: "price.currency",
        xsd: "contractInfo/currency",
        status: "derived",
        required: false,
        note: "Заполняется из связанного извещения.",
      },
      {
        field: "contractNumber",
        xsd: "contractInfo/number",
        status: "partial",
        required: false,
        note: "При структурированной форме игнорируется; реестровый номер проекта присваивает ЕИС (commonInfo/number).",
      },
      {
        field: "eisInfo.conclusionContractSt95Ch17_1",
        xsd: "contractInfo/conclusionContractSt95Ch17.1",
        status: "derived",
        required: false,
        note: "Заполняется из результата определения поставщика при расторжении предыдущего контракта.",
      },
      {
        field: "eisInfo.isContractPriceFormula",
        xsd: "isContractPriceFormula",
        status: "mapped",
        required: false,
        note: "Приходит из извещения (lot/isContractPriceFormula).",
      },
      {
        field: "eisInfo.quantityUndefined",
        xsd: "quantityUndefined",
        status: "derived",
        required: false,
        note: "Заполняется из извещения (lot/quantityUndefined).",
      },
      {
        field: "eisInfo.appNumber",
        xsd: "appNumber",
        status: "partial",
        required: false,
        note: "Номер заявки победителя в итоговом протоколе; по нему ЕИС определяет участника.",
      },
      {
        field: "status",
        xsd: "versionNumber / commonInfo/publishDTInEIS",
        status: "partial",
        note: "Наш статус шире версии и даты размещения, которые ведёт ЕИС.",
      },
      {
        field: "projectDate",
        xsd: "commonInfo/docDirectDT",
        status: "derived",
        required: false,
        note: "Дату направления на размещение ставит ЕИС.",
      },
      {
        field: "eisInfo.contractProjectFiles",
        xsd: "contractProjectFilesInfo/contractProjectFileInfo",
        status: "mapped",
        required: false,
        note: "Файлы проекта контракта ведутся в форме и выгружаются в contractProjectFilesInfo; обязательны при isStructuredForm = false.",
      },
      {
        field: "appendices",
        xsd: "electronicContractInfo",
        status: "partial",
        required: false,
        note: "Приложения контракта — основа для спецификации и техзадания; электронный контракт (electronicContractInfo) не формируется.",
      },
    ],
    notes: [
      "Проект контракта выгружается в contractProjectType (IntegrationCPTypes.xsd:6150); большинство идентификаторов ЕИС заполняет из связанного извещения по foundationInfo/purchaseNumber.",
      "Изменение цены (changePriceInfo) и файлы проекта контракта (contractProjectFilesInfo) выгружаются из формы; файлы обязательны при неструктурированной форме.",
      "Поля eisInfo.* — снимок для маппера, а не текст контракта; протокол-основание и номер заявки появляются после процедуры.",
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
