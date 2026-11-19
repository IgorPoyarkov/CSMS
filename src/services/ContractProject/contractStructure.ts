import {
  CONTRACT_APPENDIX_LABELS,
  CONTRACT_KIND_LABELS,
  CONTRACT_KIND_SHORT_LABELS,
  type ContractAppendix,
  type ContractAppendixKind,
  type ContractKind,
  type ContractProject,
} from "./contractProject.schema";

/**
 * Структура проекта контракта.
 *
 * Один реестр разделов обслуживает и конструктор (какие поля показывать),
 * и проверку обязательных условий ст. 34, и предпросмотр текста контракта.
 * Вид контракта задаёт применимость специальных разделов и набор приложений —
 * так один и тот же конструктор покрывает поставку, ремонт, строительство,
 * капремонт, стройконтроль, ПИР и содержание (услуги/работы).
 */

// ─── Термины вида контракта ────────────────────────────────────────────────

export interface ContractKindTerms {
  /** Название вида контракта для интерфейса */
  label: string;
  /** Краткая подпись */
  shortLabel: string;
  /** Предмет в дательном падеже: «поставке товара», «ремонту…» */
  subjectDative: string;
  /** Предмет в родительном падеже: «поставки товара» */
  subjectGenitive: string;
  /** Предмет в винительном падеже: «поставку товара» */
  subjectAccusative: string;
  /** Роль победителя: Поставщик / Подрядчик / Исполнитель */
  contractorRole: string;
  contractorRoleGenitive: string;
  /** Что именно исполняется: «товар», «работы», «услуги» */
  resultNoun: string;
  /** Глагол обязанности: «поставить», «выполнить», «оказать» */
  performVerb: string;
  /** Существительное действия: «поставка», «выполнение работ», «оказание услуг» */
  actionNoun: string;
  /** Документ приёмки: «акт приёмки», «акт выполненных работ» */
  acceptanceAct: string;
  /** Вид работ для поля «вид работ» по умолчанию */
  defaultWorksType: string;
}

export const CONTRACT_KIND_TERMS: Record<ContractKind, ContractKindTerms> = {
  goods: {
    label: CONTRACT_KIND_LABELS.goods,
    shortLabel: CONTRACT_KIND_SHORT_LABELS.goods,
    subjectDative: "поставке товара",
    subjectGenitive: "поставки товара",
    subjectAccusative: "поставку товара",
    contractorRole: "Поставщик",
    contractorRoleGenitive: "Поставщика",
    resultNoun: "товар",
    performVerb: "поставить",
    actionNoun: "поставка товара",
    acceptanceAct: "акт приёмки товара",
    defaultWorksType: "поставка товара",
  },
  works_repair: {
    label: CONTRACT_KIND_LABELS.works_repair,
    shortLabel: CONTRACT_KIND_SHORT_LABELS.works_repair,
    subjectDative: "выполнению работ по ремонту",
    subjectGenitive: "выполнения работ по ремонту",
    subjectAccusative: "выполнение работ по ремонту",
    contractorRole: "Подрядчик",
    contractorRoleGenitive: "Подрядчика",
    resultNoun: "работы",
    performVerb: "выполнить",
    actionNoun: "выполнение работ по ремонту",
    acceptanceAct: "акт выполненных работ",
    defaultWorksType: "ремонт",
  },
  works_construction: {
    label: CONTRACT_KIND_LABELS.works_construction,
    shortLabel: CONTRACT_KIND_SHORT_LABELS.works_construction,
    subjectDative: "выполнению работ по строительству (реконструкции)",
    subjectGenitive: "выполнения работ по строительству (реконструкции)",
    subjectAccusative: "выполнение работ по строительству (реконструкции)",
    contractorRole: "Подрядчик",
    contractorRoleGenitive: "Подрядчика",
    resultNoun: "работы",
    performVerb: "выполнить",
    actionNoun: "выполнение работ по строительству (реконструкции)",
    acceptanceAct: "акт приёмки объекта",
    defaultWorksType: "строительство (реконструкция)",
  },
  works_capital_repair: {
    label: CONTRACT_KIND_LABELS.works_capital_repair,
    shortLabel: CONTRACT_KIND_SHORT_LABELS.works_capital_repair,
    subjectDative: "выполнению работ по капитальному ремонту",
    subjectGenitive: "выполнения работ по капитальному ремонту",
    subjectAccusative: "выполнение работ по капитальному ремонту",
    contractorRole: "Подрядчик",
    contractorRoleGenitive: "Подрядчика",
    resultNoun: "работы",
    performVerb: "выполнить",
    actionNoun: "выполнение работ по капитальному ремонту",
    acceptanceAct: "акт выполненных работ",
    defaultWorksType: "капитальный ремонт",
  },
  works_construction_control: {
    label: CONTRACT_KIND_LABELS.works_construction_control,
    shortLabel: CONTRACT_KIND_SHORT_LABELS.works_construction_control,
    subjectDative: "оказанию услуг по строительному контролю",
    subjectGenitive: "оказания услуг по строительному контролю",
    subjectAccusative: "оказание услуг по строительному контролю",
    contractorRole: "Исполнитель",
    contractorRoleGenitive: "Исполнителя",
    resultNoun: "услуги",
    performVerb: "оказать",
    actionNoun: "оказание услуг по строительному контролю",
    acceptanceAct: "акт приёмки услуг",
    defaultWorksType: "строительный контроль",
  },
  design_survey: {
    label: CONTRACT_KIND_LABELS.design_survey,
    shortLabel: CONTRACT_KIND_SHORT_LABELS.design_survey,
    subjectDative: "выполнению проектно-изыскательских работ",
    subjectGenitive: "выполнения проектно-изыскательских работ",
    subjectAccusative: "выполнение проектно-изыскательских работ",
    contractorRole: "Подрядчик",
    contractorRoleGenitive: "Подрядчика",
    resultNoun: "работы",
    performVerb: "выполнить",
    actionNoun: "выполнение проектно-изыскательских работ",
    acceptanceAct: "акт приёмки проектной документации",
    defaultWorksType: "проектно-изыскательские работы",
  },
  services_maintenance: {
    label: CONTRACT_KIND_LABELS.services_maintenance,
    shortLabel: CONTRACT_KIND_SHORT_LABELS.services_maintenance,
    subjectDative: "оказанию услуг по содержанию объектов",
    subjectGenitive: "оказания услуг по содержанию объектов",
    subjectAccusative: "оказание услуг по содержанию объектов",
    contractorRole: "Исполнитель",
    contractorRoleGenitive: "Исполнителя",
    resultNoun: "услуги",
    performVerb: "оказать",
    actionNoun: "оказание услуг по содержанию объектов",
    acceptanceAct: "акт приёмки услуг",
    defaultWorksType: "содержание объектов (услуги)",
  },
  works_maintenance: {
    label: CONTRACT_KIND_LABELS.works_maintenance,
    shortLabel: CONTRACT_KIND_SHORT_LABELS.works_maintenance,
    subjectDative: "выполнению работ по содержанию объектов",
    subjectGenitive: "выполнения работ по содержанию объектов",
    subjectAccusative: "выполнение работ по содержанию объектов",
    contractorRole: "Подрядчик",
    contractorRoleGenitive: "Подрядчика",
    resultNoun: "работы",
    performVerb: "выполнить",
    actionNoun: "выполнение работ по содержанию объектов",
    acceptanceAct: "акт выполненных работ",
    defaultWorksType: "содержание объектов (работы)",
  },
};

export const contractKindTerms = (kind: ContractKind): ContractKindTerms =>
  CONTRACT_KIND_TERMS[kind] ?? CONTRACT_KIND_TERMS.goods;

// ─── Определение вида контракта ────────────────────────────────────────────

export interface ContractKindDetectionInput {
  procurementType?: string;
  okpd2Code?: string;
  objectName?: string;
  description?: string;
  placingWayCode?: string;
}

const normalize = (value?: string) => (value ?? "").toLowerCase();

/**
 * Определяет вид контракта по типу закупки, коду ОКПД2 и предмету.
 * Порядок важен: стройконтроль и ПИР проверяются раньше «строительства»,
 * а капремонт — раньше общего ремонта.
 */
export const detectContractKind = (
  input: ContractKindDetectionInput,
): ContractKind => {
  const type = normalize(input.procurementType);
  const name = normalize(input.objectName);
  const description = normalize(input.description);
  const text = `${type} ${name} ${description}`;
  const okpd2 = (input.okpd2Code ?? "").trim();

  if (/строительн\w*\s+контрол|стройконтрол/.test(text)) {
    return "works_construction_control";
  }
  if (/авторск\w*\s+надзор/.test(text)) {
    return "works_construction_control";
  }
  if (/проектн|изыскан|пир\b/.test(text) || okpd2.startsWith("71.11")) {
    return "design_survey";
  }
  if (/капитальн\w*\s+ремонт/.test(text)) {
    return "works_capital_repair";
  }
  if (/реконструкц|строительств/.test(text)) {
    return "works_construction";
  }
  if (/ремонт/.test(text) || okpd2.startsWith("43.3")) {
    return "works_repair";
  }
  if (/содержан/.test(text)) {
    return /услуг/.test(text) ? "services_maintenance" : "works_maintenance";
  }
  if (
    okpd2.startsWith("41") ||
    okpd2.startsWith("42") ||
    okpd2.startsWith("43")
  ) {
    return "works_construction";
  }
  return "goods";
};

// ─── Описание полей раздела ────────────────────────────────────────────────

export type ContractFieldKind =
  | "text"
  | "textarea"
  | "date"
  | "money"
  | "percent"
  | "number"
  | "checkbox"
  | "select"
  | "stages";

export interface ContractFieldOption {
  value: string;
  label: string;
}

export interface ContractFieldCondition {
  path: string;
  /** Показывать, если значение равно указанному */
  equals?: string | boolean | number;
  /** Показывать, если значение истинно */
  truthy?: boolean;
}

export interface ContractFieldDef {
  /** Путь к полю в ContractProject, например "price.finalPrice" */
  path: string;
  label: string;
  kind: ContractFieldKind;
  article?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  options?: ContractFieldOption[];
  when?: ContractFieldCondition;
  rows?: number;
}

export interface ContractSectionDef {
  id: string;
  title: string;
  article: string;
  purpose: string;
  /** Раздел показывается только для перечисленных видов контракта */
  appliesTo?: ContractKind[];
  fields: ContractFieldDef[];
  /** Особый раздел: приложения или предпросмотр */
  special?: "appendices" | "preview";
}

const PAYMENT_OPTIONS: ContractFieldOption[] = [
  { value: "postpayment", label: "Постоплата (после приёмки)" },
  { value: "advance", label: "Аванс" },
  { value: "staged", label: "Поэтапная оплата" },
];

export const CONTRACT_SECTION_DEFS: ContractSectionDef[] = [
  {
    id: "preamble",
    title: "Преамбула",
    article: "ст. 34, ст. 51",
    purpose:
      "Стороны, основание заключения, подписанты и место заключения контракта.",
    fields: [
      {
        path: "contractNumber",
        label: "Номер проекта контракта",
        kind: "text",
        placeholder: "Например, 2026.001",
      },
      {
        path: "preamble.place",
        label: "Место заключения",
        kind: "text",
        placeholder: "г. Белгород",
      },
      { path: "projectDate", label: "Дата проекта", kind: "date" },
      {
        path: "customerName",
        label: "Заказчик",
        kind: "text",
        required: true,
      },
      {
        path: "preamble.customerRole",
        label: "Роль заказчика в тексте",
        kind: "text",
        placeholder: "Заказчик",
      },
      {
        path: "supplierName",
        label: "Поставщик (подрядчик, исполнитель)",
        kind: "text",
        required: true,
      },
      {
        path: "preamble.contractorRole",
        label: "Роль победителя в тексте",
        kind: "text",
        placeholder: "Поставщик / Подрядчик / Исполнитель",
      },
      {
        path: "preamble.basis",
        label: "Основание заключения",
        kind: "textarea",
        placeholder:
          "Например: протокол подведения итогов электронного аукциона от … № …",
        rows: 2,
      },
      {
        path: "preamble.signerPosition",
        label: "Должность подписанта заказчика",
        kind: "text",
      },
      {
        path: "preamble.signerName",
        label: "ФИО подписанта заказчика",
        kind: "text",
      },
      {
        path: "preamble.signerBasis",
        label: "Основание полномочий подписанта",
        kind: "text",
        placeholder: "Устав, доверенность № …",
      },
    ],
  },
  {
    id: "subject",
    title: "Предмет контракта",
    article: "ст. 34 ч. 1 п. 1, ст. 33",
    purpose:
      "Наименование и описание объекта закупки, перечень объектов, количество и место исполнения.",
    fields: [
      {
        path: "subject.objectName",
        label: "Наименование объекта закупки",
        kind: "text",
        required: true,
      },
      {
        path: "subject.description",
        label: "Описание объекта закупки",
        kind: "textarea",
        required: true,
        rows: 4,
      },
      {
        path: "subject.worksType",
        label: "Вид работ / услуг",
        kind: "text",
        hint: "строительство, реконструкция, капремонт, ремонт, ПИР, стройконтроль, содержание",
      },
      {
        path: "subject.objectList",
        label: "Перечень объектов",
        kind: "textarea",
        hint: "Заполняется для работ и содержания; в поставке можно оставить пустым",
        rows: 3,
      },
      { path: "subject.okpd2Code", label: "Код ОКПД2", kind: "text" },
      { path: "subject.kved2Code", label: "Код КВЕД2", kind: "text" },
      {
        path: "subject.quantity",
        label: "Количество / объём",
        kind: "text",
      },
      {
        path: "subject.deliveryPlace",
        label: "Место поставки / выполнения работ",
        kind: "textarea",
        required: true,
        rows: 2,
      },
    ],
  },
  {
    id: "price",
    title: "Цена контракта и порядок оплаты",
    article: "ст. 34 ч. 1 п. 2, ч. 2, 12, 13.1",
    purpose:
      "Цена, структура цены, валюта, порядок и срок оплаты, аванс, сопровождение.",
    fields: [
      { path: "price.currency", label: "Валюта", kind: "text" },
      { path: "price.initialMaxPrice", label: "НМЦК, руб.", kind: "money" },
      {
        path: "price.finalPrice",
        label: "Цена контракта, руб.",
        kind: "money",
        required: true,
      },
      {
        path: "price.priceBasis",
        label: "Обоснование цены",
        kind: "textarea",
        required: true,
        hint: "ст. 22 Закона № 44-ФЗ",
        rows: 3,
      },
      {
        path: "price.isFixed",
        label: "Цена твёрдая на весь срок исполнения (ч. 2 ст. 34)",
        kind: "checkbox",
      },
      {
        path: "price.priceIncludesExpenses",
        label:
          "Включены расходы на перевозку, страхование, пошлины, налоги и обязательные платежи",
        kind: "checkbox",
      },
      {
        path: "price.formula",
        label: "Формула цены и максимальное значение (ПП РФ № 19)",
        kind: "textarea",
        rows: 2,
      },
      {
        path: "price.unitPriceNote",
        label: "Цена единицы при неопределённом объёме (ч. 24 ст. 22)",
        kind: "textarea",
        rows: 2,
      },
      {
        path: "price.paymentProcedure",
        label: "Порядок оплаты",
        kind: "select",
        options: PAYMENT_OPTIONS,
      },
      {
        path: "price.advancePercent",
        label: "Аванс, %",
        kind: "percent",
        when: { path: "price.paymentProcedure", equals: "advance" },
      },
      {
        path: "price.paymentTermDays",
        label: "Срок оплаты, рабочих дней",
        kind: "number",
        hint: "ч. 13.1 ст. 34: не более 7 рабочих дней; при казначейском сопровождении — 10",
      },
      {
        path: "price.paymentTerms",
        label: "Порядок оплаты (документы, счета, этапы)",
        kind: "textarea",
        rows: 3,
      },
      { path: "price.kbk", label: "КБК / лицевой счёт", kind: "text" },
      {
        path: "price.treasurySupport",
        label: "Казначейское сопровождение контракта (ст. 242.23 БК РФ)",
        kind: "checkbox",
      },
      {
        path: "price.bankSupport",
        label: "Банковское сопровождение контракта",
        kind: "checkbox",
      },
    ],
  },
  {
    id: "term",
    title: "Сроки, место и порядок исполнения",
    article: "ст. 34 ч. 1 п. 3, ст. 33 ч. 1 п. 1.1",
    purpose:
      "Даты начала и окончания исполнения, срок действия, этапы и график исполнения.",
    fields: [
      { path: "term.startDate", label: "Дата начала исполнения", kind: "date" },
      {
        path: "term.endDate",
        label: "Дата окончания исполнения",
        kind: "date",
        required: true,
      },
      {
        path: "term.validUntil",
        label: "Срок действия контракта",
        kind: "date",
        hint: "Если отличается от срока исполнения",
      },
      {
        path: "term.executionProcedure",
        label: "Порядок исполнения",
        kind: "textarea",
        rows: 2,
      },
      {
        path: "term.deliverySchedule",
        label: "График поставки / выполнения работ",
        kind: "textarea",
        rows: 2,
      },
      {
        path: "term.stages",
        label: "Этапы исполнения",
        kind: "stages",
        hint: "Сумма этапов должна соответствовать цене контракта",
      },
    ],
  },
  {
    id: "acceptance",
    title: "Порядок приёмки",
    article: "ст. 34 ч. 1 п. 4, ст. 94",
    purpose:
      "Экспертиза результатов, документы приёмки, срок и место приёмки, устранение недостатков.",
    fields: [
      {
        path: "acceptance.expertiseRequired",
        label: "Проводится экспертиза результатов исполнения (ч. 3 ст. 94)",
        kind: "checkbox",
      },
      {
        path: "acceptance.expertiseProcedure",
        label: "Порядок проведения экспертизы",
        kind: "textarea",
        rows: 2,
        when: { path: "acceptance.expertiseRequired", truthy: true },
      },
      {
        path: "acceptance.acceptanceActForm",
        label: "Форма акта приёмки",
        kind: "text",
      },
      {
        path: "acceptance.documentsList",
        label: "Документы, подтверждающие исполнение",
        kind: "textarea",
        rows: 3,
      },
      {
        path: "acceptance.acceptancePlace",
        label: "Место приёмки",
        kind: "text",
      },
      {
        path: "term.acceptanceTermDays",
        label: "Срок приёмки, дней",
        kind: "number",
      },
      {
        path: "term.acceptanceProcedure",
        label: "Порядок приёмки",
        kind: "textarea",
        required: true,
        rows: 3,
      },
      {
        path: "acceptance.deficienciesDeadlineDays",
        label: "Срок устранения недостатков, дней",
        kind: "number",
      },
    ],
  },
  {
    id: "quality",
    title: "Качество, гарантия и комплектность",
    article: "ст. 33 ч. 1 п. 2, 6",
    purpose:
      "Требования к качеству, гарантийный срок, срок службы и гарантийные обязательства.",
    fields: [
      {
        path: "quality.qualityRequirements",
        label: "Требования к качеству",
        kind: "textarea",
        required: true,
        rows: 3,
      },
      {
        path: "quality.specifications",
        label: "Спецификация / требования по позициям",
        kind: "textarea",
        rows: 3,
      },
      {
        path: "quality.warrantyPeriodMonths",
        label: "Гарантийный срок, мес.",
        kind: "number",
      },
      {
        path: "quality.serviceLifeMonths",
        label: "Срок службы, мес.",
        kind: "number",
      },
      {
        path: "quality.guaranteeObligations",
        label: "Гарантийные обязательства",
        kind: "textarea",
        rows: 2,
      },
      {
        path: "quality.qualityControlProcedure",
        label: "Порядок контроля качества",
        kind: "textarea",
        rows: 2,
      },
    ],
  },
  {
    id: "rightsCustomer",
    title: "Права и обязанности заказчика",
    article: "ст. 34, ст. 94, 95",
    purpose:
      "Права заказчика по контролю исполнения, приёмке, требованию устранения недостатков.",
    fields: [
      {
        path: "rightsCustomer.text",
        label: "Текст раздела",
        kind: "textarea",
        rows: 5,
        hint: "Если пусто — в предпросмотре подставляется типовой текст",
      },
    ],
  },
  {
    id: "rightsSupplier",
    title: "Права и обязанности поставщика (подрядчика, исполнителя)",
    article: "ст. 34, ст. 95",
    purpose:
      "Обязанности по исполнению, качеству, срокам, предоставлению документов и уведомлений.",
    fields: [
      {
        path: "rightsSupplier.text",
        label: "Текст раздела",
        kind: "textarea",
        rows: 5,
        hint: "Если пусто — в предпросмотре подставляется типовой текст",
      },
    ],
  },
  {
    id: "responsibility",
    title: "Ответственность сторон",
    article: "ст. 34 ч. 1 п. 5, ч. 5-8",
    purpose:
      "Пени за просрочку, штрафы за ненадлежащее исполнение, ответственность за промежуточные обязательства.",
    fields: [
      {
        path: "security.penaltyFormula",
        label: "Пени",
        kind: "text",
        required: true,
        hint: "ч. 5 ст. 34: 1/300 ключевой ставки ЦБ РФ за каждый день просрочки",
      },
      {
        path: "security.fixedPenaltyAmount",
        label: "Фиксированный штраф, руб.",
        kind: "money",
      },
      {
        path: "security.interimPenaltyEnabled",
        label: "Неустойка за нарушение промежуточных обязательств",
        kind: "checkbox",
      },
      {
        path: "security.penaltyText",
        label: "Текст раздела об ответственности",
        kind: "textarea",
        rows: 4,
      },
      {
        path: "security.finesTableNote",
        label: "Примечание к таблице штрафов",
        kind: "textarea",
        rows: 2,
      },
    ],
  },
  {
    id: "security",
    title: "Обеспечение исполнения контракта и гарантийных обязательств",
    article: "ст. 34 ч. 1 п. 7, ч. 6, 7, ст. 96",
    purpose:
      "Обеспечение заявки, исполнения контракта и гарантийных обязательств, форма и срок возврата.",
    fields: [
      {
        path: "security.bidSecurityRequired",
        label: "Требуется обеспечение заявки",
        kind: "checkbox",
      },
      {
        path: "security.bidSecurityPercent",
        label: "Обеспечение заявки, %",
        kind: "percent",
        when: { path: "security.bidSecurityRequired", truthy: true },
        hint: "0,5–5 % (ст. 44)",
      },
      {
        path: "security.performanceSecurityRequired",
        label: "Требуется обеспечение исполнения контракта",
        kind: "checkbox",
      },
      {
        path: "security.performanceSecurityPercent",
        label: "Обеспечение исполнения, %",
        kind: "percent",
        when: { path: "security.performanceSecurityRequired", truthy: true },
        hint: "0,5–30 % (ч. 6 ст. 34)",
      },
      {
        path: "security.securityAmount",
        label: "Сумма обеспечения исполнения, руб.",
        kind: "money",
        when: { path: "security.performanceSecurityRequired", truthy: true },
      },
      {
        path: "security.securityForm",
        label: "Форма обеспечения",
        kind: "text",
        when: { path: "security.performanceSecurityRequired", truthy: true },
      },
      {
        path: "security.warrantySecurityRequired",
        label: "Требуется обеспечение гарантийных обязательств",
        kind: "checkbox",
      },
      {
        path: "security.warrantySecurityPercent",
        label: "Обеспечение гарантийных обязательств, %",
        kind: "percent",
        when: { path: "security.warrantySecurityRequired", truthy: true },
        hint: "не более 10 %",
      },
      {
        path: "security.warrantySecurityAmount",
        label: "Сумма обеспечения гарантийных обязательств, руб.",
        kind: "money",
        when: { path: "security.warrantySecurityRequired", truthy: true },
      },
      {
        path: "change.securityReturnDays",
        label: "Срок возврата обеспечения, дней",
        kind: "number",
        hint: "ч. 27 ст. 34",
      },
    ],
  },
  {
    id: "smp",
    title: "Привлечение субподрядчиков из СМП/СОНКО",
    article: "ч. 5, 6 ст. 30, ПП РФ № 1466",
    purpose:
      "Объём привлечения, сроки представления сведений и ответственность по типовым условиям.",
    fields: [
      {
        path: "smp.required",
        label: "Установлено требование о привлечении СМП/СОНКО",
        kind: "checkbox",
      },
      {
        path: "smpRequiredPercent",
        label: "Объём привлечения, % от цены контракта",
        kind: "percent",
        when: { path: "smp.required", truthy: true },
        hint: "не менее 5 % (п. 1 ПП РФ № 1466)",
      },
      {
        path: "subcontractingSmpNoteNumber",
        label: "Номер служебной записки — основание",
        kind: "text",
        when: { path: "smp.required", truthy: true },
      },
      {
        path: "smp.attractDeadlineDays",
        label: "Срок представления декларации и договора, раб. дней",
        kind: "number",
        when: { path: "smp.required", truthy: true },
        hint: "п. 2 ПП РФ № 1466 — не более 5 рабочих дней",
      },
      {
        path: "smp.paymentDeadlineDays",
        label: "Срок оплаты субподрядчику, раб. дней",
        kind: "number",
        when: { path: "smp.required", truthy: true },
        hint: "п. 5 ПП РФ № 1466 — 7 рабочих дней",
      },
      {
        path: "smp.reportingDeadlineDays",
        label: "Срок представления документов о приёмке и оплате, раб. дней",
        kind: "number",
        when: { path: "smp.required", truthy: true },
        hint: "п. 4 ПП РФ № 1466 — 10 рабочих дней",
      },
      {
        path: "smp.termsText",
        label: "Текст типовых условий",
        kind: "textarea",
        rows: 4,
        when: { path: "smp.required", truthy: true },
      },
      {
        path: "smp.responsibilityText",
        label: "Ответственность за непривлечение / недостоверные сведения",
        kind: "textarea",
        rows: 3,
        when: { path: "smp.required", truthy: true },
      },
    ],
  },
  {
    id: "change",
    title: "Изменение и расторжение контракта",
    article: "ст. 34 ч. 1 п. 6, ст. 95",
    purpose:
      "Основания изменения, односторонний отказ, порядок расторжения и уведомления.",
    fields: [
      {
        path: "change.changeConditions",
        label: "Условия изменения контракта",
        kind: "textarea",
        rows: 3,
      },
      {
        path: "change.allowQuantityChange",
        label: "Допускается изменение количества (объёма)",
        kind: "checkbox",
      },
      {
        path: "change.allowPriceChange",
        label: "Допускается изменение цены контракта",
        kind: "checkbox",
      },
      {
        path: "change.unilateralRefusal",
        label:
          "Предусмотрен односторонний отказ от исполнения (ч. 8, 9, 19 ст. 95)",
        kind: "checkbox",
      },
      {
        path: "change.terminationConditions",
        label: "Условия расторжения / одностороннего отказа",
        kind: "textarea",
        required: true,
        rows: 3,
      },
      {
        path: "change.changeNoticeDays",
        label: "Срок направления уведомления, дней",
        kind: "number",
      },
    ],
  },
  {
    id: "management",
    title: "Управление контрактом",
    article: "ст. 34, ст. 52, 53 ГрК РФ",
    purpose:
      "Порядок взаимодействия сторон, представители, совещания и отчётность по контракту.",
    appliesTo: [
      "works_construction",
      "works_capital_repair",
      "works_construction_control",
      "design_survey",
    ],
    fields: [
      {
        path: "management.managementProcedure",
        label: "Порядок управления контрактом",
        kind: "textarea",
        rows: 3,
      },
      {
        path: "management.customerRepresentative",
        label: "Представитель заказчика",
        kind: "text",
      },
      {
        path: "management.contractorRepresentative",
        label: "Представитель подрядчика",
        kind: "text",
      },
      {
        path: "management.meetings",
        label: "Совещания и протоколы",
        kind: "textarea",
        rows: 2,
      },
    ],
  },
  {
    id: "projectDocs",
    title: "Проектная и техническая документация",
    article: "ст. 34, ст. 48, 52 ГрК РФ",
    purpose:
      "Состав документации, экспертиза, порядок передачи и использования документации.",
    appliesTo: [
      "works_repair",
      "works_construction",
      "works_capital_repair",
      "works_construction_control",
      "design_survey",
    ],
    fields: [
      {
        path: "projectDocs.documentsList",
        label: "Перечень документации",
        kind: "textarea",
        rows: 4,
      },
      {
        path: "projectDocs.expertiseRequired",
        label: "Требуется экспертиза проектной документации",
        kind: "checkbox",
      },
      {
        path: "projectDocs.expertiseSubject",
        label: "Предмет экспертизы",
        kind: "textarea",
        rows: 2,
        when: { path: "projectDocs.expertiseRequired", truthy: true },
      },
      {
        path: "projectDocs.transferProcedure",
        label: "Порядок передачи документации",
        kind: "textarea",
        rows: 2,
      },
    ],
  },
  {
    id: "designRights",
    title: "Права на результаты интеллектуальной деятельности",
    article: "ст. 1296 ГК РФ, ст. 34 44-ФЗ",
    purpose:
      "Принадлежность прав на проектную документацию и результаты изысканий, права использования.",
    appliesTo: ["design_survey"],
    fields: [
      {
        path: "designRights.rightsOwner",
        label: "Принадлежность прав",
        kind: "text",
        placeholder: "Заказчику / Подрядчику / совместно",
      },
      {
        path: "designRights.usageRights",
        label: "Права использования результатов",
        kind: "textarea",
        rows: 3,
      },
      {
        path: "designRights.exclusiveRightsNote",
        label: "Исключительные права и ограничения",
        kind: "textarea",
        rows: 2,
      },
    ],
  },
  {
    id: "maintenance",
    title: "Территория и период содержания",
    article: "ст. 34, ст. 33",
    purpose:
      "Районы, участки и объекты, период и состав работ/услуг по содержанию.",
    appliesTo: ["services_maintenance", "works_maintenance"],
    fields: [
      {
        path: "maintenance.regions",
        label: "Территория (районы, участки, объекты)",
        kind: "textarea",
        rows: 3,
      },
      {
        path: "maintenance.periodStart",
        label: "Начало периода",
        kind: "date",
      },
      {
        path: "maintenance.periodEnd",
        label: "Окончание периода",
        kind: "date",
      },
      {
        path: "maintenance.scope",
        label: "Состав и объём работ/услуг",
        kind: "textarea",
        rows: 3,
      },
    ],
  },
  {
    id: "control",
    title: "Предмет и полномочия строительного контроля",
    article: "ст. 53 ГрК РФ, ст. 34 44-ФЗ",
    purpose:
      "Что контролируется, какими полномочиями наделён исполнитель и как оформляются результаты.",
    appliesTo: ["works_construction_control"],
    fields: [
      {
        path: "control.controlSubject",
        label: "Предмет строительного контроля",
        kind: "textarea",
        rows: 3,
      },
      {
        path: "control.controlPowers",
        label: "Полномочия и обязанности",
        kind: "textarea",
        rows: 3,
      },
      {
        path: "control.controlActForm",
        label: "Форма акта по результатам контроля",
        kind: "text",
      },
      {
        path: "control.controlPeriod",
        label: "Период контроля",
        kind: "text",
      },
    ],
  },
  {
    id: "notifications",
    title: "Порядок направления уведомлений и обмена документами",
    article: "ст. 34, ст. 94, 95",
    purpose:
      "Каналы обмена, адреса и сроки ответа на уведомления, электронный документооборот.",
    fields: [
      {
        path: "notifications.method",
        label: "Способ обмена документами",
        kind: "textarea",
        rows: 3,
      },
      {
        path: "notifications.customerAddress",
        label: "Адрес заказчика для уведомлений",
        kind: "text",
      },
      {
        path: "notifications.supplierAddress",
        label: "Адрес поставщика для уведомлений",
        kind: "text",
      },
      {
        path: "notifications.customerEmail",
        label: "Email заказчика",
        kind: "text",
      },
      {
        path: "notifications.supplierEmail",
        label: "Email поставщика",
        kind: "text",
      },
      {
        path: "notifications.responseDays",
        label: "Срок ответа на уведомление, раб. дней",
        kind: "number",
      },
      {
        path: "notifications.electronicDocumentFlow",
        label: "Электронный документооборот",
        kind: "checkbox",
      },
    ],
  },
  {
    id: "requisites",
    title: "Юридические адреса и реквизиты сторон",
    article: "ст. 34, ст. 51",
    purpose: "Реквизиты заказчика и поставщика, банковские счета и подписанты.",
    fields: [
      {
        path: "requisites.customerFullName",
        label: "Полное наименование заказчика",
        kind: "text",
      },
      {
        path: "requisites.customerShortName",
        label: "Краткое наименование заказчика",
        kind: "text",
      },
      { path: "requisites.customerInn", label: "ИНН заказчика", kind: "text" },
      { path: "requisites.customerKpp", label: "КПП заказчика", kind: "text" },
      {
        path: "requisites.customerOgrn",
        label: "ОГРН заказчика",
        kind: "text",
      },
      {
        path: "requisites.customerAddress",
        label: "Адрес заказчика",
        kind: "text",
      },
      {
        path: "requisites.customerEmail",
        label: "Email заказчика",
        kind: "text",
      },
      {
        path: "requisites.customerPhone",
        label: "Телефон заказчика",
        kind: "text",
      },
      {
        path: "requisites.customerBankDetails",
        label: "Банковские реквизиты заказчика",
        kind: "textarea",
        rows: 2,
      },
      {
        path: "requisites.supplierFullName",
        label: "Полное наименование поставщика",
        kind: "text",
      },
      {
        path: "requisites.supplierShortName",
        label: "Краткое наименование поставщика",
        kind: "text",
      },
      { path: "requisites.supplierInn", label: "ИНН поставщика", kind: "text" },
      { path: "requisites.supplierKpp", label: "КПП поставщика", kind: "text" },
      {
        path: "requisites.supplierOgrn",
        label: "ОГРН поставщика",
        kind: "text",
      },
      {
        path: "requisites.supplierAddress",
        label: "Адрес поставщика",
        kind: "text",
      },
      {
        path: "requisites.supplierEmail",
        label: "Email поставщика",
        kind: "text",
      },
      {
        path: "requisites.supplierPhone",
        label: "Телефон поставщика",
        kind: "text",
      },
      {
        path: "requisites.supplierBankDetails",
        label: "Банковские реквизиты поставщика",
        kind: "textarea",
        rows: 2,
      },
      {
        path: "requisites.signerPosition",
        label: "Должность подписанта заказчика",
        kind: "text",
      },
      {
        path: "requisites.signerName",
        label: "ФИО подписанта заказчика",
        kind: "text",
      },
      {
        path: "requisites.signerBasis",
        label: "Основание полномочий",
        kind: "text",
      },
    ],
  },
  {
    id: "appendices",
    title: "Приложения к контракту",
    article: "ст. 34, ст. 33, ст. 94",
    purpose:
      "Неотъемлемая часть контракта: спецификация, смета, график, дефектовка, документация.",
    special: "appendices",
    fields: [],
  },
];

/** Разделы, применимые к выбранному виду контракта */
export const contractSectionsForKind = (
  kind: ContractKind,
): ContractSectionDef[] =>
  CONTRACT_SECTION_DEFS.filter(
    (section) => !section.appliesTo || section.appliesTo.includes(kind),
  );

/** Раздел включён в проект (учитывает ручное переопределение) */
export const isContractSectionIncluded = (
  project: ContractProject,
  sectionId: string,
): boolean => {
  const override = project.sectionOverrides?.find((o) => o.id === sectionId);
  return override?.included !== false;
};

export const contractSectionOverrideText = (
  project: ContractProject,
  sectionId: string,
): string => {
  return project.sectionOverrides?.find((o) => o.id === sectionId)?.text ?? "";
};

// ─── Приложения по умолчанию ───────────────────────────────────────────────

export interface DefaultAppendicesOptions {
  smpRequired?: boolean;
  stagedPayment?: boolean;
  hasAdvance?: boolean;
  construction?: boolean;
}

const appendix = (
  number: number,
  kind: ContractAppendixKind,
  required = true,
): ContractAppendix => ({
  id: `appendix-${kind}`,
  number,
  title: CONTRACT_APPENDIX_LABELS[kind],
  kind,
  included: true,
  required,
  note: "",
});

export const buildDefaultAppendices = (
  kind: ContractKind,
  options: DefaultAppendicesOptions = {},
): ContractAppendix[] => {
  const kinds: ContractAppendixKind[] = ["specification", "technical_task"];

  if (
    kind === "works_repair" ||
    kind === "works_construction" ||
    kind === "works_capital_repair" ||
    kind === "works_maintenance"
  ) {
    kinds.push("estimate", "schedule");
  }
  if (
    kind === "works_repair" ||
    kind === "works_capital_repair" ||
    kind === "works_maintenance"
  ) {
    kinds.push("defect_list");
  }
  if (
    kind === "works_construction" ||
    kind === "works_capital_repair" ||
    kind === "works_construction_control" ||
    kind === "design_survey"
  ) {
    kinds.push("project_docs");
  }
  if (kind === "works_construction_control") {
    kinds.push("control_program");
  }
  if (kind === "services_maintenance" || kind === "works_maintenance") {
    kinds.push("maintenance_list");
  }
  if (options.stagedPayment || options.hasAdvance) {
    kinds.push("payment_schedule");
  }
  if (options.smpRequired) {
    kinds.push("smp_terms");
  }

  const unique = Array.from(new Set(kinds));
  return unique.map((appendixKind, index) =>
    appendix(index + 1, appendixKind, true),
  );
};

/** Следующий свободный номер приложения */
export const nextAppendixNumber = (appendices: ContractAppendix[]): number =>
  appendices.reduce((max, item) => Math.max(max, item.number), 0) + 1;
