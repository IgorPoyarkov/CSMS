import { PP2571_POSITION_LABELS } from "../Pp2571/pp2571.schema";

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
    label: "Закупка товара в электронной форме по ч. 12 ст. 93 Закона № 44-ФЗ (ЭЗТ20)",
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

// Коды критериев XSD 17.0 (base:costCriterionCodeEnum / qualitativeCriterionCodeEnum):
// CP — цена, MC — расходы на эксплуатацию и ремонт, TC — стоимость жизненного
// цикла, EN — энергосервис; QF — характеристики объекта, QO — квалификация.
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

/**
 * Метки позиций приложения ПП РФ № 2571.
 *
 * Единый источник — каталог `src/services/Pp2571/pp2571.schema.ts`: в СЗ и
 * извещении хранятся идентификаторы позиций, а метки нужны для выгрузок и
 * совместимости со старыми записями, где лежали готовые строки.
 */
export const PP2571_POSITIONS = PP2571_POSITION_LABELS;

// Единый источник категорий документов — `noticeAttachment.schema.ts`.
// Раньше список дублировался здесь и в конфиге формы, из-за чего набор и
// признаки обязательности расходились. Оставлен реэкспорт для совместимости.
export {
  NOTICE_ATTACHMENT_CATEGORIES as ATTACHED_DOC_CATEGORIES,
  type NoticeAttachmentCategoryMeta,
} from "./noticeAttachment.schema";
