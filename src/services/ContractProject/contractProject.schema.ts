import z from "zod";

/**
 * Проект контракта по 44-ФЗ.
 *
 * Проект контракта — следующий этап цепочки после извещения:
 * ПГ → СЗ → извещение → проект контракта → подписанный контракт → реестр.
 * Поэтому схема хранит не только «свои» поля, но и снимок структуры извещения,
 * из которого проект предзаполняется (предмет, цена, сроки, приёмка,
 * обеспечения, СМП, сопровождение, реквизиты).
 *
 * Правовая основа:
 * — ст. 34 Закона № 44-ФЗ: обязательные условия контракта (ч. 1), цена
 *   (ч. 2), пени и штрафы (ч. 5–8), обеспечение (ч. 6, 7), срок оплаты
 *   (ч. 12, 13.1), возврат обеспечения (ч. 27);
 * — ст. 51 Закона № 44-ФЗ: порядок заключения контракта по результатам
 *   электронной процедуры, протокол разногласий и сроки подписания;
 * — ст. 30, 33, 94, 95, 96 Закона № 44-ФЗ и ПП РФ № 1466 — СМП/СОНКО,
 *   описание объекта, приёмка, изменение/расторжение, обеспечение.
 */

// ─── Виды контракта ────────────────────────────────────────────────────────

export const CONTRACT_KINDS = [
  "goods",
  "works_repair",
  "works_construction",
  "works_capital_repair",
  "works_construction_control",
  "design_survey",
  "services_maintenance",
  "works_maintenance",
] as const;

export type ContractKind = (typeof CONTRACT_KINDS)[number];

export const CONTRACT_KIND_LABELS: Record<ContractKind, string> = {
  goods: "Поставка товара",
  works_repair: "Ремонт (в том числе автомобильных дорог)",
  works_construction: "Строительство, реконструкция",
  works_capital_repair: "Капитальный ремонт",
  works_construction_control: "Строительный контроль",
  design_survey: "Проектно-изыскательские работы (ПИР)",
  services_maintenance: "Содержание объектов (услуги)",
  works_maintenance: "Содержание объектов (работы)",
};

export const CONTRACT_KIND_SHORT_LABELS: Record<ContractKind, string> = {
  goods: "Товар",
  works_repair: "Ремонт",
  works_construction: "Строительство",
  works_capital_repair: "Капремонт",
  works_construction_control: "Стройконтроль",
  design_survey: "ПИР",
  services_maintenance: "Содержание (услуги)",
  works_maintenance: "Содержание (работы)",
};

export const ContractKindSchema = z.enum(CONTRACT_KINDS).default("goods");

// ─── Хелперы полей ─────────────────────────────────────────────────────────

const optionalText = (min: number, message: string) =>
  z
    .string()
    .refine((v) => v === "" || v.length >= min, message)
    .optional();

const requiredText = (min: number, message: string) =>
  z.string().min(min, message);

const optionalDate = () =>
  z
    .string()
    .refine(
      (v) =>
        v === "" || /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v),
      "Неверный формат даты (ГГГГ-ММ-ДД)",
    )
    .optional();

const optionalMoney = () =>
  z
    .string()
    .refine(
      (v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v),
      "Укажите сумму числом с точностью до копеек",
    )
    .optional();

const optionalPercent = () =>
  z
    .string()
    .refine(
      (v) =>
        v === "" ||
        (/^\d{1,3}(\.\d{1,2})?$/.test(v) && Number(v) >= 0 && Number(v) <= 100),
      "Укажите значение от 0 до 100",
    )
    .optional();

// П. 11 Положения (ПП РФ от 27.01.2022 N 60): цена единицы товара, работы,
// услуги округляется до 11 цифр после запятой. В форме хранится строкой,
// чтобы не потерять знаки при сериализации.
const optionalUnitPrice = () =>
  z
    .string()
    .refine(
      (v) => v === "" || /^\d+(\.\d{1,11})?$/.test(v),
      "Цена единицы указывается с точностью до 11 знаков после запятой",
    )
    .optional();

export const roundUnitPrice = (value: number | string): string => {
  const num =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(num)) return "";
  const fixed = num.toFixed(11);
  // Убираем хвостовые нули, сохраняя не более 11 знаков после запятой
  return fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
};

const optionalInt = (min = 0) =>
  z.number().int("Укажите целое число").min(min).optional();

// ─── Преамбула ─────────────────────────────────────────────────────────────

export const ContractPreambleSchema = z.object({
  // Место заключения контракта
  place: z.string().optional(),
  // Роль заказчика в преамбуле (например, «Заказчик»)
  customerRole: z.string().optional(),
  // Роль победителя: Поставщик / Подрядчик / Исполнитель
  contractorRole: z.string().optional(),
  // Основание заключения: протокол, извещение, результаты процедуры
  basis: z.string().optional(),
  // Подписант заказчика
  signerPosition: z.string().optional(),
  signerName: z.string().optional(),
  signerBasis: z.string().optional(),
});

export type ContractPreamble = z.infer<typeof ContractPreambleSchema>;

// ─── Раздел 1: Предмет контракта (ст. 34 ч. 1 п. 1, ст. 33) ────────────────

export const ContractSubjectSchema = z.object({
  // Наименование объекта закупки (позиция плана-графика)
  objectName: requiredText(5, "Укажите наименование объекта закупки"),
  // Описание объекта закупки (ст. 33 ч. 1 п. 1)
  description: requiredText(10, "Опишите объект закупки"),
  // Вид работ/услуг (строительство, реконструкция, капремонт, ремонт, ПИР,
  // строительный контроль, содержание)
  worksType: z.string().optional(),
  // Перечень объектов (для работ и содержания)
  objectList: z.string().optional(),
  // ОКПД2 код
  okpd2Code: optionalText(4, "Укажите код ОКПД2"),
  // КВЕД2 код
  kved2Code: optionalText(4, "Укажите код КВЕД2"),
  // Единица измерения и количество
  quantity: optionalText(1, "Укажите количество"),
  // Место поставки / выполнения работ (ст. 34 ч. 1 п. 3)
  deliveryPlace: optionalText(5, "Укажите место поставки"),
});

// ─── Раздел 2: Цена и порядок оплаты (ст. 34 ч. 1 п. 2, ч. 2, 12) ──────────

export const ContractPriceSchema = z.object({
  // Валюта контракта
  currency: z.string().default("Российский рубль"),
  // П. 15 Раздела 1 формы извещения: код валюты по ОКВ
  currencyCode: z.string().default("643"),
  // Начальная (максимальная) цена контракта
  initialMaxPrice: optionalMoney(),
  // Цена контракта (итоговая, с учётом скидок)
  finalPrice: optionalMoney(),
  // Обоснование цены (ст. 33 ч. 1 п. 4, ст. 22)
  priceBasis: optionalText(10, "Укажите обоснование НМЦК"),
  // Цена твёрдая на весь срок (ч. 2 ст. 34)
  isFixed: z.boolean().default(true),
  // Структура цены: включены ли расходы на перевозку, страхование, пошлины,
  // налоги, НДС
  priceIncludesExpenses: z.boolean().default(true),
  // Формула цены и максимальное значение (ПП РФ № 19)
  formula: z.string().optional(),
  // Цена единицы товара, работы, услуги (п. 11 Положения, ПП РФ N 60):
  // округляется до 11 цифр после запятой
  unitPrice: optionalUnitPrice(),
  // Цена единицы, если объём нельзя определить (ч. 24 ст. 22, ч. 4 ст. 34)
  unitPriceNote: z.string().optional(),
  // Порядок оплаты: аванс, постоплата, поэтапная (ст. 34 ч. 12)
  paymentProcedure: z
    .enum(["advance", "postpayment", "staged"])
    .default("postpayment"),
  // Размер аванса (в процентах)
  advancePercent: optionalPercent(),
  // Срок оплаты (в рабочих днях, ст. 34 ч. 13.1)
  paymentTermDays: z
    .number()
    .int("Укажите целое число дней")
    .min(1, "Срок оплаты не менее 1 дня")
    .optional(),
  // Текст порядка оплаты (по этапам, документам, счетам)
  paymentTerms: z.string().optional(),
  // КБК / лицевой счёт
  kbk: z.string().optional(),
  // Казначейское сопровождение (ст. 242.23 БК РФ) и банковское сопровождение
  treasurySupport: z.boolean().default(false),
  bankSupport: z.boolean().default(false),
});

// ─── Раздел 3: Сроки, место и порядок исполнения (ст. 34 ч. 1 п. 3) ────────

export const ContractTermStageSchema = z.object({
  name: requiredText(3, "Название этапа"),
  startDate: optionalDate(),
  endDate: optionalDate(),
  amount: optionalMoney(),
});

export const ContractTermSchema = z.object({
  // Дата начала исполнения
  startDate: optionalDate(),
  // Дата окончания исполнения
  endDate: optionalDate(),
  // Срок действия контракта (если отличается от срока исполнения)
  validUntil: optionalDate(),
  // Порядок исполнения (поставка партиями, выполнение по графику и т.п.)
  executionProcedure: z.string().optional(),
  // График поставки / выполнения работ
  deliverySchedule: z.string().optional(),
  // Этапы исполнения (ст. 33 ч. 1 п. 1.1)
  stages: z.array(ContractTermStageSchema).default(() => []),
  // Порядок приёмки (ст. 94)
  acceptanceProcedure: optionalText(10, "Опишите порядок приёмки"),
  // Срок приёмки (дней после поставки)
  acceptanceTermDays: z
    .number()
    .int()
    .min(1, "Срок приёмки не менее 1 дня")
    .optional(),
});

// ─── Раздел 4: Приёмка (ст. 34 ч. 1 п. 4, ст. 94) ──────────────────────────

export const ContractAcceptanceSchema = z.object({
  // Экспертиза результатов исполнения (ч. 3 ст. 94)
  expertiseRequired: z.boolean().default(true),
  // Порядок проведения экспертизы
  expertiseProcedure: z.string().optional(),
  // Форма акта приёмки
  acceptanceActForm: z.string().optional(),
  // Перечень документов, подтверждающих исполнение
  documentsList: z.string().optional(),
  // Место приёмки
  acceptancePlace: z.string().optional(),
  // Срок устранения недостатков (дней)
  deficienciesDeadlineDays: optionalInt(1),
});

// ─── Раздел 5: Качество, гарантия, комплектность (ст. 33, 34) ──────────────

export const ContractQualitySchema = z.object({
  // Требования к качеству (ст. 33 ч. 1 п. 2)
  qualityRequirements: requiredText(10, "Укажите требования к качеству"),
  // Гарантия (ст. 33 ч. 1 п. 6)
  warrantyPeriodMonths: optionalInt(0),
  // Срок службы
  serviceLifeMonths: optionalInt(0),
  // Требования к объёму и качеству (по позициям)
  specifications: z.string().optional(),
  // Гарантийные обязательства (ПП РФ № 1466, ст. 33 ч. 1 п. 6)
  guaranteeObligations: z.string().optional(),
  // Порядок контроля качества
  qualityControlProcedure: z.string().optional(),
});

// ─── Раздел 6: Ответственность сторон и обеспечение (ст. 34 ч. 5-8) ────────

export const ContractSecuritySchema = z.object({
  // Обеспечение заявки (ст. 44)
  bidSecurityRequired: z.boolean().default(false),
  bidSecurityPercent: z
    .string()
    .refine(
      (v) => v === "" || (parseFloat(v) >= 0.5 && parseFloat(v) <= 5),
      "Обеспечение заявки: 0.5–5% (ст. 44)",
    )
    .optional(),
  // Обеспечение исполнения контракта (ст. 34 ч. 6, ст. 96)
  performanceSecurityRequired: z.boolean().default(true),
  performanceSecurityPercent: z
    .string()
    .refine(
      (v) => v === "" || (parseFloat(v) >= 0.5 && parseFloat(v) <= 30),
      "Обеспечение исполнения: 0.5–30% (ст. 34 ч. 6)",
    )
    .optional(),
  // Форма обеспечения: независимая гарантия или денежные средства
  securityForm: z
    .string()
    .default("независимая гарантия или денежные средства"),
  // Сумма обеспечения
  securityAmount: optionalMoney(),
  // Обеспечение гарантийных обязательств (ст. 34 ч. 7, ст. 96 ч. 2)
  warrantySecurityRequired: z.boolean().default(false),
  warrantySecurityPercent: z
    .string()
    .refine(
      (v) => v === "" || (parseFloat(v) >= 0 && parseFloat(v) <= 10),
      "Обеспечение гарантийных обязательств: не более 10% (ст. 96)",
    )
    .optional(),
  warrantySecurityAmount: optionalMoney(),
  // Пени: 1/300 ключевой ставки ЦБ (ст. 34 ч. 5 п. 1)
  penaltyFormula: z
    .string()
    .default("1/300 ключевой ставки ЦБ РФ за каждый день просрочки"),
  // Штрафы (фиксированные, ст. 34 ч. 5 п. 2, ПП РФ № 1042)
  fixedPenaltyAmount: optionalMoney(),
  // Ответственность за нарушение сроков промежуточных обязательств
  interimPenaltyEnabled: z.boolean().default(true),
  // Текст ответственности сторон (если нужна расшифровка)
  penaltyText: z.string().optional(),
  // Примечание к таблице штрафов
  finesTableNote: z.string().optional(),
});

// ─── Раздел 7: Привлечение СМП/СОНКО (ч. 5, 6 ст. 30, ПП РФ № 1466) ───────

export const ContractSmpSchema = z.object({
  // Требование установлено заказчиком
  required: z.boolean().default(false),
  // Срок представления декларации и копии договора (п. 2 ПП РФ № 1466)
  attractDeadlineDays: optionalInt(1),
  // Срок оплаты субподрядчику (п. 5 ПП РФ № 1466)
  paymentDeadlineDays: optionalInt(1),
  // Срок представления документов о приёмке и оплате (п. 4 ПП РФ № 1466)
  reportingDeadlineDays: optionalInt(1),
  // Текст типовых условий
  termsText: z.string().optional(),
  // Ответственность за непривлечение / недостоверные сведения (п. 6)
  responsibilityText: z.string().optional(),
});

// ─── Раздел 8: Изменение и расторжение (ст. 34 ч. 1 п. 6, ст. 95) ──────────

export const ContractChangeSchema = z.object({
  // Условия изменения контракта (ст. 95 ч. 1)
  changeConditions: optionalText(10, "Укажите условия изменения контракта"),
  // Возможность изменения количества и объёма (ст. 95 ч. 1 п. 1, 2)
  allowQuantityChange: z.boolean().default(false),
  // Возможность изменения цены (ст. 95 ч. 1 п. 1, 2)
  allowPriceChange: z.boolean().default(false),
  // Односторонний отказ (ст. 95 ч. 8-9, 19)
  unilateralRefusal: z.boolean().default(true),
  // Условия одностороннего отказа / расторжения
  terminationConditions: optionalText(10, "Условия расторжения контракта"),
  // Срок направления уведомления об изменении/расторжении
  changeNoticeDays: optionalInt(1),
  // Срок возврата обеспечения (ст. 34 ч. 27)
  securityReturnDays: optionalInt(1),
});

// ─── Специальные разделы для отдельных видов контракта ─────────────────────

export const ContractManagementSchema = z.object({
  // Порядок управления контрактом (совещания, отчётность, представители)
  managementProcedure: z.string().optional(),
  // Представитель заказчика
  customerRepresentative: z.string().optional(),
  // Представитель подрядчика
  contractorRepresentative: z.string().optional(),
  // Порядок проведения совещаний и оформления протоколов
  meetings: z.string().optional(),
});

export const ContractProjectDocsSchema = z.object({
  // Перечень проектной и технической документации
  documentsList: z.string().optional(),
  // Требуется ли экспертиза проектной документации
  expertiseRequired: z.boolean().default(false),
  // Предмет экспертизы
  expertiseSubject: z.string().optional(),
  // Порядок передачи документации
  transferProcedure: z.string().optional(),
});

export const ContractDesignRightsSchema = z.object({
  // Принадлежность прав на результаты работ
  rightsOwner: z.string().optional(),
  // Права использования результатов
  usageRights: z.string().optional(),
  // Исключительные права и ограничения
  exclusiveRightsNote: z.string().optional(),
});

export const ContractMaintenanceSchema = z.object({
  // Территория (районы, участки, объекты)
  regions: z.string().optional(),
  // Период оказания услуг / выполнения работ
  periodStart: optionalDate(),
  periodEnd: optionalDate(),
  // Состав и объём работ/услуг
  scope: z.string().optional(),
});

export const ContractControlSchema = z.object({
  // Предмет строительного контроля
  controlSubject: z.string().optional(),
  // Полномочия и обязанности контролирующего органа
  controlPowers: z.string().optional(),
  // Форма акта по результатам контроля
  controlActForm: z.string().optional(),
  // Период контроля
  controlPeriod: z.string().optional(),
});

export const ContractPartyRightsSchema = z.object({
  // Текст прав и обязанностей стороны (редактируемый)
  text: z.string().optional(),
});

// ─── Уведомления и реквизиты ───────────────────────────────────────────────

export const ContractNotificationsSchema = z.object({
  // Способ обмена документами
  method: z
    .string()
    .default(
      "Обмен документами и уведомлениями осуществляется через единую информационную систему в сфере закупок, а при технической невозможности — на адреса электронной почты, указанные в разделе «Реквизиты сторон».",
    ),
  // Адрес заказчика для уведомлений
  customerAddress: z.string().optional(),
  // Адрес поставщика для уведомлений
  supplierAddress: z.string().optional(),
  customerEmail: z.string().optional(),
  supplierEmail: z.string().optional(),
  // Срок ответа на уведомление (рабочих дней)
  responseDays: optionalInt(1),
  // Электронный документооборот
  electronicDocumentFlow: z.boolean().default(true),
});

export const ContractRequisitesSchema = z.object({
  customerFullName: z.string().optional(),
  customerShortName: z.string().optional(),
  customerInn: z.string().optional(),
  customerKpp: z.string().optional(),
  customerOgrn: z.string().optional(),
  customerAddress: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
  customerBankDetails: z.string().optional(),
  supplierFullName: z.string().optional(),
  supplierShortName: z.string().optional(),
  supplierInn: z.string().optional(),
  supplierKpp: z.string().optional(),
  supplierOgrn: z.string().optional(),
  supplierAddress: z.string().optional(),
  supplierEmail: z.string().optional(),
  supplierPhone: z.string().optional(),
  supplierBankDetails: z.string().optional(),
  // П. 11 Положения (ПП РФ N 60): реквизиты платёжного агента / банковского
  // платёжного агента, если он участвует в расчётах по контракту
  isAgentInvolved: z.boolean().default(false),
  agentType: z.enum(["payment", "bank_payment", "other"]).default("payment"),
  agentFullName: z.string().optional(),
  agentShortName: z.string().optional(),
  agentInn: z.string().optional(),
  agentKpp: z.string().optional(),
  agentAccount: z.string().optional(),
  agentBankDetails: z.string().optional(),
  // П. 11: контракт на приобретение жилого помещения с представителем
  // собственника — реквизиты счёта представителя и собственника
  isResidentialPremisesPurchase: z.boolean().default(false),
  ownerRepresentativeName: z.string().optional(),
  ownerRepresentativeAccount: z.string().optional(),
  ownerAccount: z.string().optional(),
  ownerBankDetails: z.string().optional(),
  // Подписант заказчика (для блока подписей)
  signerPosition: z.string().optional(),
  signerName: z.string().optional(),
  signerBasis: z.string().optional(),
});

// ─── Поля выгрузки в ЕИС (contractProjectType) ─────────────────────────────

/**
 * Поля проекта контракта, которые требует XSD ЕИС
 * (IntegrationCPTypes.xsd, contractProjectCommonType + contractProjectType),
 * но которых нет в тексте контракта. Часть приходит по цепочке
 * ПГ → СЗ → извещение (номер закупки, способ, ЭТП, формула цены, объём),
 * часть появляется только после процедуры (протокол-основание, номер заявки).
 *
 * Блок хранится отдельно от разделов контракта: он нужен мапперу в XML,
 * а не печатной форме.
 */
export const ContractEisInfoSchema = z.object({
  // foundationInfo/purchaseNumber — номер закупки в ЕИС (номер извещения)
  purchaseNumber: optionalText(1, "Укажите номер закупки в ЕИС"),
  // foundationInfo/protocolInfo — итоговый протокол-основание
  protocolName: optionalText(2, "Укажите наименование протокола-основания"),
  protocolNumber: optionalText(1, "Укажите номер протокола-основания"),
  protocolPublishDate: optionalDate(),
  // foundationInfo/ETP и placingWay — значения из связанного извещения
  etpName: z.string().optional(),
  etpUrl: z.string().optional(),
  placingWayCode: z.string().optional(),
  // placerInfo/responsibleRole — роль организации, размещающей проект
  placerRole: z.string().default("CU"),
  // contractInfo/isStructuredForm — проект формируется в структурированном виде
  isStructuredForm: z.boolean().default(false),
  // isContractPriceFormula — указана формула цены и максимальное значение
  isContractPriceFormula: z.boolean().default(false),
  // quantityUndefined — объём нельзя определить (ч. 24 ст. 22)
  quantityUndefined: z.boolean().default(false),
  // appNumber — номер заявки победителя в итоговом протоколе
  appNumber: optionalText(1, "Укажите номер заявки победителя"),
  // contractInfo/concludeContractRight — торги на право заключения контракта
  concludeContractRight: z.boolean().default(false),
  // contractInfo/conclusionContractSt95Ch17.1
  conclusionContractSt95Ch17_1: z.boolean().default(false),
  // contractInfo/changePriceInfo — цена изменена относительно предложения
  changePrice: optionalMoney(),
  changePriceFoundation: z.string().optional(),
});

export type ContractEisInfo = z.infer<typeof ContractEisInfoSchema>;

// ─── Приложения ────────────────────────────────────────────────────────────

export const CONTRACT_APPENDIX_KINDS = [
  "specification",
  "technical_task",
  "estimate",
  "schedule",
  "payment_schedule",
  "defect_list",
  "project_docs",
  "smp_terms",
  "control_program",
  "maintenance_list",
  "other",
] as const;

export type ContractAppendixKind = (typeof CONTRACT_APPENDIX_KINDS)[number];

export const CONTRACT_APPENDIX_LABELS: Record<ContractAppendixKind, string> = {
  specification: "Спецификация (описание объекта закупки)",
  technical_task: "Техническое задание",
  estimate: "Проект сметы контракта",
  schedule: "График выполнения работ (оказания услуг)",
  payment_schedule: "График оплаты",
  defect_list: "Дефектная ведомость",
  project_docs: "Проектная и техническая документация",
  smp_terms: "Типовые условия привлечения СМП/СОНКО (ПП РФ № 1466)",
  control_program: "Программа строительного контроля",
  maintenance_list: "Перечень объектов содержания",
  other: "Иное приложение",
};

export const ContractAppendixSchema = z.object({
  id: z.string(),
  number: z.number().int().min(1),
  title: z.string().min(1, "Укажите название приложения"),
  kind: z.enum(CONTRACT_APPENDIX_KINDS).default("other"),
  // Приложение включено в контракт
  included: z.boolean().default(true),
  // Приложение обязательно для этого вида контракта
  required: z.boolean().default(false),
  note: z.string().optional(),
});

export type ContractAppendix = z.infer<typeof ContractAppendixSchema>;

// ─── Переопределение разделов ──────────────────────────────────────────────

export const ContractSectionOverrideSchema = z.object({
  id: z.string(),
  included: z.boolean().optional(),
  text: z.string().optional(),
});

export type ContractSectionOverride = z.infer<
  typeof ContractSectionOverrideSchema
>;

// ─── Итоговая схема проекта контракта ──────────────────────────────────────

export const ContractProjectSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  // Вид контракта определяет набор разделов и приложений
  kind: ContractKindSchema,
  // Ссылка на закупку
  procurementId: z.union([z.string(), z.number()]).optional(),
  // ИКЗ (идентификационный код закупки)
  ikz: optionalText(10, "Укажите ИКЗ"),
  // Номер извещения
  noticeNumber: optionalText(1, "Укажите номер извещения"),
  // Поля выгрузки в ЕИС, которых нет в тексте контракта
  eisInfo: ContractEisInfoSchema.default(() => ({
    purchaseNumber: "",
    protocolName: "",
    protocolNumber: "",
    protocolPublishDate: "",
    etpName: "",
    etpUrl: "",
    placingWayCode: "",
    placerRole: "CU",
    isStructuredForm: false,
    isContractPriceFormula: false,
    quantityUndefined: false,
    appNumber: "",
    concludeContractRight: false,
    conclusionContractSt95Ch17_1: false,
    changePrice: "",
    changePriceFoundation: "",
  })),
  // Номер проекта контракта
  contractNumber: z.string().optional(),
  // Процент привлечения СМП/СОНКО по ч. 5 ст. 30 — наследуется из
  // служебной записки по позиции ПГ через извещение
  smpRequiredPercent: optionalPercent(),
  // Номер служебки, из которой унаследовано требование — для справки
  subcontractingSmpNoteNumber: z.string().optional(),
  // Наименование контракта
  contractName: requiredText(5, "Укажите наименование контракта"),
  // Заказчик
  customerName: optionalText(5, "Укажите наименование заказчика"),
  // Поставщик (победитель)
  supplierName: optionalText(5, "Укажите наименование поставщика"),
  // Дата составления проекта
  projectDate: optionalDate(),
  // Дата заключения контракта (ст. 51)
  conclusionDate: optionalDate(),
  // Протокол разногласий (ст. 51 ч. 3-5)
  protocolOfDisagreements: z.boolean().default(false),
  // Срок размещения/рассмотрения протокола разногласий (3 рабочих дня)
  disagreementsDeadlineDays: optionalInt(1),

  // Преамбула и структура
  preamble: ContractPreambleSchema.default(() => ({
    place: "",
    customerRole: "Заказчик",
    contractorRole: "Поставщик",
    basis: "",
    signerPosition: "",
    signerName: "",
    signerBasis: "",
  })),

  // Разделы проекта
  subject: ContractSubjectSchema,
  price: ContractPriceSchema,
  term: ContractTermSchema,
  acceptance: ContractAcceptanceSchema.default(() => ({
    expertiseRequired: true,
    expertiseProcedure: "",
    acceptanceActForm: "",
    documentsList: "",
    acceptancePlace: "",
    deficienciesDeadlineDays: 10,
  })),
  quality: ContractQualitySchema,
  security: ContractSecuritySchema,
  smp: ContractSmpSchema.default(() => ({
    required: false,
    attractDeadlineDays: 5,
    paymentDeadlineDays: 7,
    reportingDeadlineDays: 10,
    termsText: "",
    responsibilityText: "",
  })),
  change: ContractChangeSchema,
  rightsCustomer: ContractPartyRightsSchema.default(() => ({ text: "" })),
  rightsSupplier: ContractPartyRightsSchema.default(() => ({ text: "" })),
  management: ContractManagementSchema.default(() => ({
    managementProcedure: "",
    customerRepresentative: "",
    contractorRepresentative: "",
    meetings: "",
  })),
  projectDocs: ContractProjectDocsSchema.default(() => ({
    documentsList: "",
    expertiseRequired: false,
    expertiseSubject: "",
    transferProcedure: "",
  })),
  designRights: ContractDesignRightsSchema.default(() => ({
    rightsOwner: "",
    usageRights: "",
    exclusiveRightsNote: "",
  })),
  maintenance: ContractMaintenanceSchema.default(() => ({
    regions: "",
    periodStart: "",
    periodEnd: "",
    scope: "",
  })),
  control: ContractControlSchema.default(() => ({
    controlSubject: "",
    controlPowers: "",
    controlActForm: "",
    controlPeriod: "",
  })),
  notifications: ContractNotificationsSchema.default(() => ({
    method:
      "Обмен документами и уведомлениями осуществляется через единую информационную систему в сфере закупок, а при технической невозможности — на адреса электронной почты, указанные в разделе «Реквизиты сторон».",
    customerAddress: "",
    supplierAddress: "",
    customerEmail: "",
    supplierEmail: "",
    responseDays: 3,
    electronicDocumentFlow: true,
  })),
  requisites: ContractRequisitesSchema.default(() => ({
    customerFullName: "",
    customerShortName: "",
    customerInn: "",
    customerKpp: "",
    customerOgrn: "",
    customerAddress: "",
    customerEmail: "",
    customerPhone: "",
    customerBankDetails: "",
    supplierFullName: "",
    supplierShortName: "",
    supplierInn: "",
    supplierKpp: "",
    supplierOgrn: "",
    supplierAddress: "",
    supplierEmail: "",
    supplierPhone: "",
    supplierBankDetails: "",
    signerPosition: "",
    signerName: "",
    signerBasis: "",
  })),

  // Приложения и ручные переопределения разделов
  appendices: z.array(ContractAppendixSchema).default(() => []),
  sectionOverrides: z.array(ContractSectionOverrideSchema).default(() => []),

  // Статус проекта
  status: z
    .enum(["draft", "published", "signed", "terminated"])
    .default("draft"),
  createdAt: optionalDate(),
  updatedAt: optionalDate(),
});

export type ContractProject = z.infer<typeof ContractProjectSchema>;
export type ContractProjectInput = z.input<typeof ContractProjectSchema>;
export const ContractProjectListSchema = z.array(ContractProjectSchema);

export const emptyContractProject = (
  organizationId: string | number = "",
  kind: ContractKind = "goods",
): ContractProject => ({
  organizationId,
  kind,
  procurementId: "",
  ikz: "",
  noticeNumber: "",
  eisInfo: {
    purchaseNumber: "",
    protocolName: "",
    protocolNumber: "",
    protocolPublishDate: "",
    etpName: "",
    etpUrl: "",
    placingWayCode: "",
    placerRole: "CU",
    isStructuredForm: false,
    isContractPriceFormula: false,
    quantityUndefined: false,
    appNumber: "",
    concludeContractRight: false,
    conclusionContractSt95Ch17_1: false,
    changePrice: "",
    changePriceFoundation: "",
  },
  contractNumber: "",
  contractName: "",
  customerName: "",
  supplierName: "",
  projectDate: "",
  conclusionDate: "",
  protocolOfDisagreements: false,
  disagreementsDeadlineDays: 3,
  preamble: {
    place: "",
    customerRole: "Заказчик",
    contractorRole: "Поставщик",
    basis: "",
    signerPosition: "",
    signerName: "",
    signerBasis: "",
  },
  subject: {
    objectName: "",
    description: "",
    worksType: "",
    objectList: "",
    okpd2Code: "",
    kved2Code: "",
    quantity: "",
    deliveryPlace: "",
  },
  price: {
    currency: "Российский рубль",
    initialMaxPrice: "",
    finalPrice: "",
    priceBasis: "",
    isFixed: true,
    priceIncludesExpenses: true,
    formula: "",
    unitPriceNote: "",
    paymentProcedure: "postpayment",
    advancePercent: "",
    paymentTermDays: 7,
    paymentTerms: "",
    kbk: "",
    treasurySupport: false,
    bankSupport: false,
  },
  term: {
    startDate: "",
    endDate: "",
    validUntil: "",
    executionProcedure: "",
    deliverySchedule: "",
    stages: [],
    acceptanceProcedure: "",
    acceptanceTermDays: 10,
  },
  acceptance: {
    expertiseRequired: true,
    expertiseProcedure: "",
    acceptanceActForm: "",
    documentsList: "",
    acceptancePlace: "",
    deficienciesDeadlineDays: 10,
  },
  quality: {
    qualityRequirements: "",
    warrantyPeriodMonths: undefined,
    serviceLifeMonths: undefined,
    specifications: "",
    guaranteeObligations: "",
    qualityControlProcedure: "",
  },
  security: {
    bidSecurityRequired: false,
    bidSecurityPercent: "",
    performanceSecurityRequired: true,
    performanceSecurityPercent: "5",
    securityForm: "независимая гарантия или денежные средства",
    securityAmount: "",
    warrantySecurityRequired: false,
    warrantySecurityPercent: "",
    warrantySecurityAmount: "",
    penaltyFormula: "1/300 ключевой ставки ЦБ РФ за каждый день просрочки",
    fixedPenaltyAmount: "",
    interimPenaltyEnabled: true,
    penaltyText: "",
    finesTableNote: "",
  },
  smp: {
    required: false,
    attractDeadlineDays: 5,
    paymentDeadlineDays: 7,
    reportingDeadlineDays: 10,
    termsText: "",
    responsibilityText: "",
  },
  change: {
    changeConditions: "",
    allowQuantityChange: false,
    allowPriceChange: false,
    unilateralRefusal: true,
    terminationConditions: "",
    changeNoticeDays: 3,
    securityReturnDays: 30,
  },
  rightsCustomer: { text: "" },
  rightsSupplier: { text: "" },
  management: {
    managementProcedure: "",
    customerRepresentative: "",
    contractorRepresentative: "",
    meetings: "",
  },
  projectDocs: {
    documentsList: "",
    expertiseRequired: false,
    expertiseSubject: "",
    transferProcedure: "",
  },
  designRights: {
    rightsOwner: "",
    usageRights: "",
    exclusiveRightsNote: "",
  },
  maintenance: {
    regions: "",
    periodStart: "",
    periodEnd: "",
    scope: "",
  },
  control: {
    controlSubject: "",
    controlPowers: "",
    controlActForm: "",
    controlPeriod: "",
  },
  notifications: {
    method:
      "Обмен документами и уведомлениями осуществляется через единую информационную систему в сфере закупок, а при технической невозможности — на адреса электронной почты, указанные в разделе «Реквизиты сторон».",
    customerAddress: "",
    supplierAddress: "",
    customerEmail: "",
    supplierEmail: "",
    responseDays: 3,
    electronicDocumentFlow: true,
  },
  requisites: {
    customerFullName: "",
    customerShortName: "",
    customerInn: "",
    customerKpp: "",
    customerOgrn: "",
    customerAddress: "",
    customerEmail: "",
    customerPhone: "",
    customerBankDetails: "",
    supplierFullName: "",
    supplierShortName: "",
    supplierInn: "",
    supplierKpp: "",
    supplierOgrn: "",
    supplierAddress: "",
    supplierEmail: "",
    supplierPhone: "",
    supplierBankDetails: "",
    signerPosition: "",
    signerName: "",
    signerBasis: "",
  },
  appendices: [],
  sectionOverrides: [],
  status: "draft",
  createdAt: "",
  updatedAt: "",
});

// ─── Обязательные условия ст. 34 ───────────────────────────────────────────

export const MANDATORY_TERMS = [
  {
    id: "subject",
    label: "Предмет контракта",
    article: "ст. 34 ч. 1 п. 1, ст. 33",
  },
  {
    id: "price",
    label: "Цена и порядок оплаты",
    article: "ст. 34 ч. 1 п. 2, ч. 2, 12",
  },
  {
    id: "term",
    label: "Сроки, место и порядок исполнения",
    article: "ст. 34 ч. 1 п. 3",
  },
  {
    id: "acceptance",
    label: "Порядок приёмки",
    article: "ст. 34 ч. 1 п. 4, ст. 94",
  },
  {
    id: "quality",
    label: "Качество и гарантия",
    article: "ст. 33 ч. 1 п. 2, 6",
  },
  {
    id: "responsibility",
    label: "Ответственность сторон",
    article: "ст. 34 ч. 1 п. 5, ч. 5-8",
  },
  {
    id: "security",
    label: "Обеспечение исполнения",
    article: "ст. 34 ч. 1 п. 7, ч. 6, ст. 96",
  },
  {
    id: "change",
    label: "Изменение и расторжение",
    article: "ст. 34 ч. 1 п. 6, ст. 95",
  },
  {
    id: "smp",
    label: "Привлечение СМП/СОНКО",
    article: "ч. 5, 6 ст. 30, ПП РФ № 1466",
  },
] as const;

export type MandatoryTermId = (typeof MANDATORY_TERMS)[number]["id"];

// Проверка заполненности разделов (обязательные условия ст. 34)
export const sectionCompletion = (project: ContractProject) => {
  const smpApplicable = Boolean(
    project.smp?.required ||
    (project.smpRequiredPercent && Number(project.smpRequiredPercent) > 0),
  );
  const sections = [
    {
      id: "subject" as const,
      applicable: true,
      complete: Boolean(
        project.subject.objectName && project.subject.description,
      ),
    },
    {
      id: "price" as const,
      applicable: true,
      complete: Boolean(project.price.finalPrice && project.price.priceBasis),
    },
    {
      id: "term" as const,
      applicable: true,
      complete: Boolean(project.term.endDate),
    },
    {
      id: "acceptance" as const,
      applicable: true,
      complete: Boolean(
        project.term.acceptanceProcedure ||
        project.acceptance?.acceptanceActForm,
      ),
    },
    {
      id: "quality" as const,
      applicable: true,
      complete: Boolean(project.quality.qualityRequirements),
    },
    {
      id: "responsibility" as const,
      applicable: true,
      complete: Boolean(project.security.penaltyFormula),
    },
    {
      id: "security" as const,
      applicable: project.security.performanceSecurityRequired,
      complete:
        !project.security.performanceSecurityRequired ||
        Boolean(project.security.performanceSecurityPercent),
    },
    {
      id: "change" as const,
      applicable: true,
      complete: Boolean(
        project.change.changeConditions || project.change.terminationConditions,
      ),
    },
    {
      id: "smp" as const,
      applicable: smpApplicable,
      complete:
        !smpApplicable ||
        (Number(project.smpRequiredPercent) >= 5 &&
          Boolean(project.smp?.termsText || project.smp?.required)),
    },
  ];

  const applicable = sections.filter((s) => s.applicable);
  const completed = applicable.filter((s) => s.complete).length;
  const percent = applicable.length
    ? Math.round((completed / applicable.length) * 100)
    : 100;

  return { sections, completed, total: applicable.length, percent };
};

// ─── Сроки заключения контракта (ст. 51) ───────────────────────────────────

export interface ContractConclusionRule {
  id: string;
  label: string;
  days: number;
  unit: "рабочих" | "календарных";
  article: string;
}

export const CONTRACT_CONCLUSION_RULES: ContractConclusionRule[] = [
  {
    id: "send_project",
    label: "Направление проекта контракта победителю",
    days: 3,
    unit: "рабочих",
    article: "ч. 1 ст. 51",
  },
  {
    id: "sign_project",
    label: "Подписание проекта контракта победителем",
    days: 5,
    unit: "календарных",
    article: "ч. 2 ст. 51",
  },
  {
    id: "disagreements",
    label: "Рассмотрение протокола разногласий заказчиком",
    days: 3,
    unit: "рабочих",
    article: "ч. 4 ст. 51",
  },
  {
    id: "sign_final",
    label: "Подписание доработанного проекта победителем",
    days: 3,
    unit: "рабочих",
    article: "ч. 5 ст. 51",
  },
  {
    id: "registry",
    label: "Размещение сведений о заключённом контракте в ЕИС",
    days: 3,
    unit: "рабочих",
    article: "ч. 3 ст. 103",
  },
];

export const addCalendarDays = (
  isoDate: string,
  days: number,
): string | null => {
  if (!isoDate) return null;
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const addWorkingDays = (
  isoDate: string,
  days: number,
): string | null => {
  if (!isoDate) return null;
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return date.toISOString().slice(0, 10);
};

/**
 * Ориентировочный срок подписания проекта победителем — 5 календарных дней
 * с даты направления проекта (ч. 2 ст. 51). Оставлено для совместимости
 * с прежним экраном; полный график — CONTRACT_CONCLUSION_RULES.
 */
export const conclusionDeadline = (protocolDate: string): string | null =>
  addCalendarDays(protocolDate, 5);
