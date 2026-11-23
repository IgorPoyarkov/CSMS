import { PP2571_POSITION_LABELS } from "../../services/Pp2571/pp2571.schema";


export const ETP_OPTIONS = [
  { name: 'АО "РАД"', url: "https://lot-online.ru" },
  { name: 'АО "ЕЭТП"', url: "https://roseltorg.ru" },
  { name: 'АО "Сбербанк-АСТ"', url: "https://sberbank-ast.ru" },
  { name: "РТС-тендер", url: "https://rts-tender.ru" },
  { name: "ЭТП ГПБ", url: "https://etpgpb.ru" },
  { name: "ТЭК-Торг", url: "https://tektorg.ru" },
];

export const PLACING_WAYS_CONTEST = [
  {
    code: "OKP20",
    label: "Открытый конкурс в электронной форме",
  },
  {
    code: "EOK20",
    label:
      "Открытый конкурс в электронной форме для заключения энергосервисного контракта",
  },
  {
    code: "OKI20",
    label:
      "Открытый конкурс в электронной форме в соответствии со ст. 111.4 Закона № 44-ФЗ",
  },
  {
    code: "OKB20",
    label:
      "Открытый конкурс в электронной форме на проведение работ по строительству, реконструкции, кап. ремонту, сносу объекта кап. строительства в соответствии с п. 8 ч. 1 ст. 33 Закона № 44-ФЗ",
  },
];

export const PLACING_WAYS_ALL = [
  ...PLACING_WAYS_CONTEST,
  {
    code: "EA20",
    label: "Электронный аукцион",
  },
  {
    code: "ZK20",
    label: "Электронный запрос котировок",
  },
  {
    code: "EZT20",
    label:
      "Закупка товара в электронной форме по ч. 12 ст. 93 Закона № 44-ФЗ (ЭЗТ20)",
  },
  {
    code: "EP93",
    label:
      "Закупка у единственного поставщика (подрядчика, исполнителя) по ст. 93 Закона № 44-ФЗ (EMZ2025)",
  },
];

export const LIFECYCLE_CASES_PP1087 = [
  "Выполнение работ по строительству (реконструкции, капитальному ремонту) и содержанию автомобильных дорог и (или) работ по их ремонту",
  "Выполнение работ по проектированию и строительству объектов системы коммунальной инфраструктуры и иных объектов коммунального хозяйства",
  "Выполнение работ по проектированию, строительству и реконструкции объектов капитального строительства в сфере здравоохранения",
  "Выполнение работ по созданию, вводу в эксплуатацию, эксплуатации и выводу из эксплуатации информационных систем, ЦОД и ПАК",
];

export const NATIONAL_REGIME_OPTIONS = [
  { id: "none", label: "Не установлено" },
  {
    id: "ban",
    label: "Запрет закупок иностранных товаров (работ, услуг) по ст. 14 44-ФЗ",
  },
  {
    id: "restriction",
    label:
      "Ограничение закупок иностранных товаров (работ, услуг) по ст. 14 44-ФЗ",
  },
  {
    id: "advantage",
    label:
      "Преимущество в отношении товаров (работ, услуг) российского происхождения",
  },
];

export const CRITERION_LABELS: Record<string, string> = {
  price: "Цена контракта, сумма цен единиц товара, работы, услуги",
  exploitation_expenses:
    "Расходы на эксплуатацию и ремонт товаров, использование результатов работ",
  lifecycle_cost:
    "Стоимость жизненного цикла товара или созданного в результате выполнения работы объекта",
  energy_service_expenses:
    "Предложение о сумме расходов заказчика по энергосервисному контракту",
  qualitative_characteristics:
    "Качественные, функциональные и экологические характеристики объекта закупки",
  qualification:
    "Квалификация участников закупки (финансовые ресурсы, оборудование, опыт, деловая репутация, специалисты)",
};

// Коды критериев XSD 17.0: CP — цена, MC — расходы на эксплуатацию и ремонт,
// TC — стоимость жизненного цикла, EN — энергосервис; QF — характеристики
// объекта, QO — квалификация участников.
export const CRITERION_EIS_CODES: Record<string, string> = {
  price: "CP",
  exploitation_expenses: "MC",
  lifecycle_cost: "TC",
  energy_service_expenses: "EN",
  qualitative_characteristics: "QF",
  qualification: "QO",
};

export const EIS_PRODUCT_TYPE_OPTIONS = [
  { value: "PRODUCT", label: "Товар (PRODUCT)" },
  { value: "WORK", label: "Работа (WORK)" },
  { value: "SERVICE", label: "Услуга (SERVICE)" },
] as const;

export const EIS_DAY_TYPE_OPTIONS = [
  { value: "C", label: "Календарные дни (C)" },
  { value: "W", label: "Рабочие дни (W)" },
] as const;

export const EIS_VOLUME_SPECIFYING_METHODS = [
  { value: "QF", label: "Количественно (QF)" },
  { value: "SF", label: "Текстовое описание объёма (SF)" },
] as const;

export const PP2571_POSITIONS = PP2571_POSITION_LABELS;

/**
 * Минимальные сроки подачи заявок (календарные дни) по ч. 2 ст. 45 Закона
 * № 44-ФЗ в зависимости от семейства способа определения поставщика.
 */
export const MIN_PROCEDURE_DAYS: Record<string, number> = {
  contest: 25, // OKP20, EOK20, OKI20, OKB20 — конкурс (ч. 2 ст. 45)
  auction: 20, // EA20 — аукцион (ч. 2 ст. 45)
  quotation: 7, // ZK20 — запрос котировок (ч. 2 ст. 45)
};

/**
 * Семейство способа закупки для выбора минимального срока.
 * Возвращает ключ, по которому можно найти значение в MIN_PROCEDURE_DAYS.
 */
export const placingWayFamily = (
  code: string,
): "contest" | "auction" | "quotation" | "single" => {
  if (code.startsWith("OK") || code.startsWith("EOK")) return "contest";
  if (code.startsWith("EA")) return "auction";
  if (code.startsWith("ZK")) return "quotation";
  return "single"; // EP93 — единственный поставщик, ограничений ст. 45 нет
};

export const PLACING_WAY_FAMILY_OPTIONS = [
  { code: "contest", label: "Открытый конкурс в электронной форме" },
  { code: "auction", label: "Электронный аукцион" },
  { code: "quotation", label: "Электронный запрос котировок" },
  { code: "single", label: "Закупка у единственного поставщика" },
];

/**
 * Подспособы для каждого семейства.
 */
export const PLACING_WAYS_BY_FAMILY: Record<string, typeof PLACING_WAYS_ALL> = {
  contest: PLACING_WAYS_CONTEST,
  auction: [PLACING_WAYS_ALL.find((w) => w.code === "EA20")!],
  quotation: [PLACING_WAYS_ALL.find((w) => w.code === "ZK20")!],
  single: PLACING_WAYS_ALL.filter(
    (w) => w.code === "EP93" || w.code === "EZT20",
  ),
};

export const ATTACHED_DOC_CATEGORIES: Array<{
  id:
    | "nmck_justification"
    | "contract_project"
    | "object_description"
    | "application_requirements"
    | "evaluation_order"
    | "additional_requirements"
    | "additional_docs";
  title: string;
  required: boolean;
  hint?: string;
}> = [
  // Раздел 2 формы извещения (п. 8 Положения, утв. ПП РФ от 27.01.2022 N 60):
  // 1) описание объекта закупки (ст. 33); 2) обоснование НМЦК;
  // 3) требования к содержанию, составу заявки и инструкция;
  // 4) порядок рассмотрения и оценки заявок; 5) проект контракта;
  // 6) перечень дополнительных требований
  {
    id: "object_description",
    title: "Описание объекта закупки (ст. 33 Закона № 44-ФЗ)",
    required: true,
    hint: "П. 1 Раздела 2 формы извещения: описание объекта закупки в соответствии со ст. 33 Закона № 44-ФЗ.",
  },
  {
    id: "nmck_justification",
    title: "Обоснование начальной (максимальной) цены контракта",
    required: true,
    hint: "П. 2 Раздела 2 формы извещения: обоснование НМЦК в соответствии со ст. 22 Закона № 44-ФЗ.",
  },
  {
    id: "application_requirements",
    title:
      "Требования к содержанию, составу заявки на участие в закупке и инструкция по её заполнению",
    required: true,
    hint: "П. 3 Раздела 2 формы извещения: требования к содержанию и составу заявки и инструкция по её заполнению.",
  },
  {
    id: "evaluation_order",
    title: "Порядок рассмотрения и оценки заявок на участие в конкурсах",
    required: false,
    hint: "П. 4 Раздела 2 формы извещения: порядок рассмотрения и оценки заявок (обязателен для конкурса).",
  },
  {
    id: "contract_project",
    title: "Проект контракта",
    required: true,
    hint: "П. 5 Раздела 2 формы извещения: проект контракта (формируется в модуле «Проект контракта»).",
  },
  {
    id: "additional_requirements",
    title:
      "Перечень дополнительных требований к извещению, участникам закупок, содержанию заявок",
    required: false,
    hint: "П. 6 Раздела 2 формы извещения: перечень дополнительных требований (при наличии).",
  },
  {
    id: "additional_docs",
    title: "Дополнительная информация и документы",
    required: false,
  },
];
