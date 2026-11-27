import { z } from "zod";
import type { NoticeInfoFormValues } from "../Procurements/noticeInfo.schema";
import { isGoodsObjectDescription } from "./descriptionTemplates";

/**
 * Структурированное описание объекта закупки (ООЗ) по ст. 33 44-ФЗ,
 * ПП РФ от 08.02.2017 № 145 (Правила КТРУ) и п. 7 ПП РФ от 02.09.2015 № 926.
 *
 * Документ живёт в едином конструкторе (/norming-requirements) в двух видах:
 * - `object_description` — структурированное ООЗ для закупки (ТЗ/характеристики/ГОСТ/КТРУ),
 *   которое затем наследуется по цепочке ПГ → СЗ → Извещение → Проект контракта → Реестр;
 * - `norming_template` — типовые требования по коду ОКПД2 (п. 7 ПП РФ № 926),
 *   которые подтягиваются в ООЗ и позиции извещения при выборе нормируемого кода.
 */

export const OBJECT_DESCRIPTION_KINDS = [
  "object_description",
  "norming_template",
] as const;

export type ObjectDescriptionKind = (typeof OBJECT_DESCRIPTION_KINDS)[number];

export const OBJECT_DESCRIPTION_STATUSES = [
  "draft",
  "ready",
  "approved",
] as const;

export type ObjectDescriptionStatus =
  (typeof OBJECT_DESCRIPTION_STATUSES)[number];

/**
 * Вид предмета ООЗ. Первые три значения совпадают с `productType` ЕИС,
 * последние два — доменное уточнение: предмет остаётся товаром, но поставляется
 * в ходе выполнения работ/оказания услуг. В ЕИС 17.0 это кодируется парой
 * `type=PRODUCT` + `parentPurchaseObject` (карточка родителя WORK/SERVICE).
 */
export const OBJECT_DESCRIPTION_PRODUCT_TYPES = [
  "PRODUCT",
  "WORK",
  "SERVICE",
  "PRODUCT_DURING_WORK",
  "PRODUCT_DURING_SERVICE",
] as const;

export type ObjectDescriptionProductType =
  (typeof OBJECT_DESCRIPTION_PRODUCT_TYPES)[number];

export const OBJECT_DESCRIPTION_PRODUCT_TYPE_LABELS: Record<
  ObjectDescriptionProductType,
  string
> = {
  PRODUCT: "Товар",
  WORK: "Работа",
  SERVICE: "Услуга",
  PRODUCT_DURING_WORK: "Товар при выполнении работ",
  PRODUCT_DURING_SERVICE: "Товар при оказании услуг",
};

/** Значение `productType`, допустимое в XSD 17.0. */
export const toEisProductType = (
  type?: ObjectDescriptionProductType | string,
): "PRODUCT" | "WORK" | "SERVICE" => {
  if (type === "WORK" || type === "SERVICE") return type;
  return "PRODUCT";
};

/** Товар, поставляемый в ходе работ или услуг: нужен родительский объект. */
export const isEmbeddedSupplyProductType = (
  type?: ObjectDescriptionProductType | string,
): boolean =>
  type === "PRODUCT_DURING_WORK" || type === "PRODUCT_DURING_SERVICE";

/** Ожидаемый тип родителя для «товара при работе/услуге». */
export const embeddedSupplyParentType = (
  type?: ObjectDescriptionProductType | string,
): "WORK" | "SERVICE" | undefined => {
  if (type === "PRODUCT_DURING_WORK") return "WORK";
  if (type === "PRODUCT_DURING_SERVICE") return "SERVICE";
  return undefined;
};

export const objectDescriptionStatusLabels: Record<
  ObjectDescriptionStatus,
  string
> = {
  draft: "Черновик",
  ready: "Готово к передаче в КС",
  approved: "Утверждено",
};

export const CHARACTERISTIC_CATEGORIES = [
  "consumer",
  "quality",
  "functional",
  "technical",
  "operational",
  "environmental",
  "other",
] as const;

export type CharacteristicCategory = (typeof CHARACTERISTIC_CATEGORIES)[number];

export const characteristicCategoryLabels: Record<
  CharacteristicCategory,
  string
> = {
  consumer: "Потребительские свойства",
  quality: "Качественные характеристики",
  functional: "Функциональные характеристики",
  technical: "Технические характеристики",
  operational: "Эксплуатационные характеристики",
  environmental: "Экологические требования",
  other: "Иные требования",
};

export const CHARACTERISTIC_VALUE_TYPES = [
  "exact",
  "range",
  "min",
  "max",
  "enum",
  "text",
] as const;

export type CharacteristicValueType =
  (typeof CHARACTERISTIC_VALUE_TYPES)[number];

export const characteristicValueTypeLabels: Record<
  CharacteristicValueType,
  string
> = {
  exact: "Точное значение",
  range: "Диапазон (от — до)",
  min: "Не менее",
  max: "Не более",
  enum: "Перечень допустимых значений",
  text: "Текстовое требование",
};

export const STANDARD_TYPES = [
  "GOST",
  "TR_TS",
  "TU",
  "SanPiN",
  "SNiP",
  "other",
] as const;

export type StandardType = (typeof STANDARD_TYPES)[number];

export const standardTypeLabels: Record<StandardType, string> = {
  GOST: "ГОСТ / ГОСТ Р",
  TR_TS: "Технический регламент (ТР ТС / ЕАЭС)",
  TU: "Технические условия (ТУ)",
  SanPiN: "СанПиН",
  SNiP: "СНиП / СП",
  other: "Иной нормативный документ",
};

export const TRADEMARK_RULES = [
  "none",
  "with_equivalent",
  "compatibility",
  "spare_parts",
  "medical_purpose",
] as const;

export type TrademarkRule = (typeof TRADEMARK_RULES)[number];

export const trademarkRuleLabels: Record<TrademarkRule, string> = {
  none: "Без указания товарного знака (п. 1 ч. 1 ст. 33)",
  with_equivalent: "С указанием товарного знака и словами «или эквивалент»",
  compatibility:
    "Необходимость обеспечения взаимодействия с имеющимися товарами (без эквивалента)",
  spare_parts:
    "Запасные части и расходные материалы по технической документации",
  medical_purpose:
    "Медицинские изделия и лечебное питание по медицинским показаниям (п. 1 «г» ч. 1 ст. 33)",
};

/**
 * Состав описания объекта закупки по п. 3 ч. 1 ст. 33: перечень не является
 * обязательным, заказчик включает только те материалы, которые нужны для
 * идентификации объекта и подготовки заявки.
 */
export const DESCRIPTION_COMPONENTS = [
  "specifications",
  "plans",
  "drawings",
  "sketches",
  "photos",
  "testResults",
  "testRequirements",
  "packaging",
  "marking",
  "labels",
  "conformityConfirmation",
  "productionMethods",
  "symbolsAndTerminology",
] as const;

export type DescriptionComponent = (typeof DESCRIPTION_COMPONENTS)[number];

export const descriptionComponentLabels: Record<DescriptionComponent, string> = {
  specifications: "Спецификации",
  plans: "Планы",
  drawings: "Чертежи",
  sketches: "Эскизы",
  photos: "Фотографии",
  testResults: "Результаты работы, тестирования",
  testRequirements: "Требования к испытаниям и методам испытаний",
  packaging: "Упаковка (ст. 481 ГК РФ)",
  marking: "Маркировка",
  labels: "Этикетки",
  conformityConfirmation: "Подтверждение соответствия",
  productionMethods: "Процессы и методы производства",
  symbolsAndTerminology: "Условные обозначения и терминология",
};

/**
 * Компоненты состава описания, которые существуют только как приложенный
 * материал: спецификации, планы, чертежи, эскизы, фотографии, результаты
 * испытаний и подтверждение соответствия. Отметить такой пункт без файла или
 * реквизитов приложения бессмысленно — заявку по нему не проверить.
 * Остальные компоненты — текстовые требования, им достаточно формулировки.
 */
export const DESCRIPTION_COMPONENT_DOCUMENTS: DescriptionComponent[] = [
  "specifications",
  "plans",
  "drawings",
  "sketches",
  "photos",
  "testResults",
  "conformityConfirmation",
];

/**
 * Документация, которая должна входить в описание по п. 8 ч. 1 ст. 33 при
 * закупке работ по строительству, реконструкции, капремонту или сносу ОКС.
 */
export const CONSTRUCTION_DOC_TYPES = [
  "none",
  "project",
  "standard_project",
  "major_repair_estimate",
  "not_required",
] as const;

export type ConstructionDocType = (typeof CONSTRUCTION_DOC_TYPES)[number];

export const constructionDocTypeLabels: Record<ConstructionDocType, string> = {
  none: "Документация не приложена (нарушение п. 8 ч. 1 ст. 33)",
  project: "Проектная документация, утверждённая в установленном порядке",
  standard_project: "Типовая проектная документация",
  major_repair_estimate: "Смета на капитальный ремонт объекта капстроительства",
  not_required:
    "Подготовка документации не требуется / закупка по ч. 16, 16.1 ст. 34",
};

const optionalString = () => z.string().optional().default("");

export const ObjectCharacteristicSchema = z.object({
  id: z.string(),
  category: z.enum(CHARACTERISTIC_CATEGORIES).default("consumer"),
  name: z.string().trim().min(1, "Укажите наименование показателя"),
  unit: optionalString(),
  valueType: z.enum(CHARACTERISTIC_VALUE_TYPES).default("text"),
  valueText: optionalString(),
  minValue: optionalString(),
  maxValue: optionalString(),
  isMandatoryFromKtru: z.boolean().default(false),
  isAdditionalOverKtru: z.boolean().default(false),
  additionalJustification: optionalString(),
  /** В КТРУ у показателя нет единицы, но пользователь задал свою */
  unitManuallyChanged: z.boolean().default(false),
  /** Обоснование единицы, которой нет в позиции КТРУ */
  unitChangeJustification: optionalString(),
  instructionForParticipant: optionalString(),
  /** Код инструкции из справочника ЕИС nsiCharacteristicsFillingInstructions */
  instructionSourceCode: optionalString(),
});

export type ObjectCharacteristic = z.infer<typeof ObjectCharacteristicSchema>;

export const ObjectStandardRefSchema = z.object({
  id: z.string(),
  standardType: z.enum(STANDARD_TYPES).default("GOST"),
  code: z.string().trim().min(1, "Укажите обозначение стандарта"),
  title: optionalString(),
  hasDeviation: z.boolean().default(false),
  deviationJustification: optionalString(),
});

export type ObjectStandardRef = z.infer<typeof ObjectStandardRefSchema>;

/**
 * Приложение к описанию объекта закупки (п. 3 ч. 1 ст. 33).
 *
 * Файл обрабатывается в браузере и не загружается в систему — сохраняются имя,
 * размер и ссылка/реквизиты приложения, как в остальных документах закупки
 * (извещение, СЗ). Сам файл прикладывается к извещению в ЕИС, а описание
 * остаётся проверяемым: видно, какой материал заявлен и где он лежит.
 */
export const ObjectDescriptionAttachmentSchema = z.object({
  id: z.string(),
  component: z.enum(DESCRIPTION_COMPONENTS).default("specifications"),
  fileName: optionalString(),
  fileSize: z.coerce.number().nonnegative().default(0),
  /** Ссылка на файл либо реквизиты приложения: «приложение № 1 к ООЗ» */
  url: optionalString(),
});

export type ObjectDescriptionAttachment = z.infer<
  typeof ObjectDescriptionAttachmentSchema
>;

export const emptyDescriptionAttachment = (
  component: DescriptionComponent = "specifications",
): ObjectDescriptionAttachment => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  component,
  fileName: "",
  fileSize: 0,
  url: "",
});

/** Год, с которого ГОСТ считается современным для предупреждения в ООЗ. */
export const MODERN_GOST_MIN_YEAR = 2010;

/**
 * Год публикации из обозначения ГОСТ: «ГОСТ Р 2.102-2023» → 2023,
 * «ГОСТ 10382-85» → 1985. Дополнительные пометки в скобках не разбираем —
 * для предупреждения достаточно года из кода стандарта.
 */
export const gostPublicationYear = (code: string): number | null => {
  const match = code.match(/-(\d{4}|\d{2})(?!\d)/);
  if (!match) return null;
  const year = match[1].length === 2 ? 1900 + Number(match[1]) : Number(match[1]);
  return year >= 1900 && year <= 2100 ? year : null;
};

/**
 * Дополнительный код ОКПД2 в одном ООЗ: закупка может включать несколько
 * объектов (например, позиция ПГ с несколькими кодами). Основной код остаётся
 * в okpd2Code для обратной совместимости с извещением и старыми документами.
 */
export const ObjectDescriptionOkpd2ItemSchema = z.object({
  code: z.string().trim().min(2, "Укажите код ОКПД2"),
  name: optionalString(),
});

export type ObjectDescriptionOkpd2Item = z.infer<
  typeof ObjectDescriptionOkpd2ItemSchema
>;

export const ObjectDescriptionSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]).nullable().optional(),
  kind: z.enum(OBJECT_DESCRIPTION_KINDS).default("object_description"),
  status: z.enum(OBJECT_DESCRIPTION_STATUSES).default("draft"),

  // Сквозные ссылки по цепочке ПГ → СЗ → Закупка/Извещение → Реестр
  purchasePlanId: z.union([z.string(), z.number()]).optional(),
  positionId: z.union([z.string(), z.number()]).optional(),
  purchaseNoteId: z.union([z.string(), z.number()]).optional(),
  procurementId: z.union([z.string(), z.number()]).optional(),
  ikz: optionalString(),

  // Идентификация объекта
  title: z.string().trim().min(2, "Укажите наименование объекта закупки"),
  // Вид предмета: источник правды для СЗ, извещения и ЕИС. Старые ООЗ без
  // поля получают PRODUCT — миграция БД не требуется.
  productType: z
    .enum(OBJECT_DESCRIPTION_PRODUCT_TYPES)
    .default("PRODUCT"),
  okpd2Code: z.string().trim().min(2, "Укажите код ОКПД2"),
  okpd2Name: optionalString(),
  // Дополнительные объекты закупки; .default([]) подставляется для старых
  // сохранённых ООЗ, где такого поля ещё нет.
  okpd2Items: z.array(ObjectDescriptionOkpd2ItemSchema).default([]),
  useKtru: z.boolean().default(false),
  ktruCode: optionalString(),
  ktruName: optionalString(),
  // Мотивированный отказ от применения КТРУ, когда позиция не подходит.
  // Приходит из позиции ПГ и сохраняется вместе с ООЗ.
  ktruRefusalReason: optionalString(),
  unit: optionalString(),
  quantity: optionalString(),
  isIndeterminateVolume: z.boolean().default(false),

  // Структурированные характеристики (ст. 33 / ПП 145 / п. 7 ПП 926)
  characteristics: z.array(ObjectCharacteristicSchema).default([]),

  // Товарный знак (п. 1 ч. 1 ст. 33)
  trademarkRule: z.enum(TRADEMARK_RULES).default("none"),
  trademarkName: optionalString(),
  trademarkJustification: optionalString(),

  // Технические регламенты и стандарты (п. 2 ч. 1 ст. 33)
  standards: z.array(ObjectStandardRefSchema).default([]),
  // Если показатели берутся не из техрегламентов и документов по
  // стандартизации, п. 2 ч. 1 ст. 33 требует обосновать такой выбор.
  nonStandardIndicatorsJustification: optionalString(),

  // Состав описания (п. 3 ч. 1 ст. 33): спецификации, чертежи, фотографии,
  // требования к испытаниям, упаковке, маркировке, этикеткам и т. п.
  descriptionComponents: z.array(z.enum(DESCRIPTION_COMPONENTS)).default([]),
  // Материалы, приложенные к описанию: планы, чертежи, эскизы, фотографии,
  // спецификации. Хранятся реквизиты приложений, файл передаётся в ЕИС.
  descriptionAttachments: z
    .array(ObjectDescriptionAttachmentSchema)
    .default([]),

  // Изображение поставляемого товара (п. 4 ч. 1 ст. 33). Поле нужно, только
  // если в описании есть требование о соответствии товара изображению.
  goodsImageRequired: z.boolean().default(false),
  goodsImageReference: optionalString(),
  goodsImageFileName: optionalString(),
  goodsImageFileSize: z.coerce.number().nonnegative().default(0),
  goodsImageUrl: optionalString(),

  // Осмотр образца или макета товара (п. 5 ч. 1 ст. 33): место, даты начала
  // и окончания, порядок и график осмотра обязательны, если заявлено осмотр.
  sampleInspectionRequired: z.boolean().default(false),
  sampleInspectionPlace: optionalString(),
  sampleInspectionStartDate: optionalString(),
  sampleInspectionEndDate: optionalString(),
  sampleInspectionProcedure: optionalString(),
  sampleInspectionSchedule: optionalString(),

  // Лекарственные средства (п. 6 ч. 1 ст. 33): МНН обязательны, торговые
  // наименования допустимы только по установленным основаниям.
  isMedicinalProduct: z.boolean().default(false),
  innIndication: optionalString(),
  tradeNameUseBasis: optionalString(),

  // Работы по строительству, реконструкции, капремонту, сносу ОКС
  // (п. 8 ч. 1 ст. 33): в описание включается проектная документация,
  // типовая проектная документация или смета на капремонт.
  capitalConstructionWork: z.boolean().default(false),
  constructionDocType: z.enum(CONSTRUCTION_DOC_TYPES).default("none"),
  constructionDocDetails: optionalString(),

  // Национальный режим (ч. 1.1 ст. 33): если в отношении товара установлены
  // запрет, ограничение или преимущество по п. 1 ч. 2 ст. 14, в описании
  // указываются характеристики товара российского происхождения.
  nationalRegimeRestriction: z.boolean().default(false),
  russianGoodsCharacteristics: optionalString(),
  nationalRegimeException: optionalString(),

  // Новизна товара, гарантия и инструкция участнику (п. 7 ч. 1, ч. 4 ст. 33)
  isNewGoodsRequired: z.boolean().default(true),
  warrantyTermMonths: optionalString(),
  warrantyRequirements: optionalString(),
  participantInstruction: optionalString(),
  noRestrictionDeclaration: z.boolean().default(false),
  otherRequirements: optionalString(),

  // Автор и утверждение
  authorName: optionalString(),
  approvedByName: optionalString(),
  approvedDate: optionalString(),
  updatedAt: optionalString(),
});

export type ObjectDescription = z.infer<typeof ObjectDescriptionSchema>;
export type ObjectDescriptionInput = z.input<typeof ObjectDescriptionSchema>;

export const ObjectDescriptionListSchema = z.array(ObjectDescriptionSchema);

/**
 * Человекочитаемое значение показателя для таблицы и печатной сводки ТЗ.
 */
export const formatCharacteristicValue = (c: ObjectCharacteristic): string => {
  const unitSuffix = c.unit ? ` ${c.unit}` : "";
  switch (c.valueType) {
    case "range": {
      const from = c.minValue ? `от ${c.minValue}` : "";
      const to = c.maxValue ? `до ${c.maxValue}` : "";
      const joined = [from, to].filter(Boolean).join(" ");
      return joined ? `${joined}${unitSuffix}` : "диапазон не задан";
    }
    case "min":
      return c.minValue ? `не менее ${c.minValue}${unitSuffix}` : "не задано";
    case "max":
      return c.maxValue ? `не более ${c.maxValue}${unitSuffix}` : "не задано";
    case "exact":
    case "enum":
    case "text":
    default:
      return c.valueText ? `${c.valueText}${unitSuffix}` : "не задано";
  }
};

export interface ComplianceIssue {
  level: "error" | "warning";
  code: string;
  message: string;
}

/**
 * Автоматическая проверка ООЗ на соответствие ст. 33 44-ФЗ и ПП РФ N 145:
 * ловит типовые причины жалоб в ФАС до публикации извещения.
 */
export const validateObjectDescriptionCompliance = (
  desc: ObjectDescription,
  options: {
    hasKtruForOkpd2?: boolean;
    /**
     * Режим по ПП РФ № 1875, который агент определил по коду ОКПД2. Передаёт
     * вызывающая сторона: схема остаётся свободной от справочников, а проверка
     * ч. 1.1 ст. 33 видит тот же режим, что и карточка.
     */
    expectedNationalRegime?: "ban" | "restriction" | null;
  } = {},
): ComplianceIssue[] => {
  const issues: ComplianceIssue[] = [];
  // Флаг «Применение КТРУ» не имеет смысла, когда по коду ОКПД2 позиций нет.
  const useKtru = options.hasKtruForOkpd2 === false ? false : desc.useKtru;
  // Явно выбранные работы или услуги: товарные правила п. 4–7 ч. 1 и ч. 1.1
  // ст. 33 к ним не применяются, зато п. 8 адресован именно работам.
  const explicitNonGoods =
    desc.productType === "WORK" || desc.productType === "SERVICE";

  if (desc.kind === "object_description" && desc.characteristics.length === 0) {
    issues.push({
      level: "warning",
      code: "NO_CHARACTERISTICS",
      message: useKtru
        ? "Не добавлено ни одной характеристики. Для позиции КТРУ показатели обязательны (п. 6 Правил использования КТРУ, ПП РФ N 145); ст. 33 44-ФЗ также требует описания объекта. Это предупреждение, сохранение не блокируется."
        : "Не добавлено ни одной характеристики. Ст. 33 44-ФЗ требует описания объекта закупки, а при применении КТРУ показатели обязательны (ПП РФ N 145). Это предупреждение, сохранение не блокируется.",
    });
  }

  if (useKtru) {
    if (!desc.ktruCode?.trim()) {
      issues.push({
        level: "error",
        code: "KTRU_CODE_MISSING",
        message:
          "Включено применение КТРУ, но код позиции КТРУ не указан (ПП РФ N 145).",
      });
    }

    const unjustified = desc.characteristics.filter(
      (c) => c.isAdditionalOverKtru && !c.additionalJustification?.trim(),
    );
    if (unjustified.length > 0) {
      issues.push({
        level: "error",
        code: "KTRU_ADDITIONAL_UNJUSTIFIED",
        message: `По п. 6 Правил использования КТРУ (ПП РФ N 145) дополнительные характеристики сверх КТРУ требуют письменного обоснования (${unjustified.map((u) => `«${u.name}»`).join(", ")}).`,
      });
    }
  }

  if (desc.trademarkRule !== "none") {
    if (!desc.trademarkName?.trim()) {
      issues.push({
        level: "error",
        code: "TRADEMARK_NAME_MISSING",
        message:
          "Указан режим с товарным знаком, но наименование товарного знака не заполнено (п. 1 ч. 1 ст. 33 44-ФЗ).",
      });
    }
    if (!desc.trademarkJustification?.trim()) {
      issues.push({
        level: "error",
        code: "TRADEMARK_JUSTIFICATION_MISSING",
        message:
          "Для указания товарного знака нужно описать параметры эквивалентности или обосновать совместимость/запчасти (п. 1 ч. 1 ст. 33 44-ФЗ).",
      });
    }
  }

  const badStandards = desc.standards.filter(
    (s) => s.hasDeviation && !s.deviationJustification?.trim(),
  );
  if (badStandards.length > 0) {
    issues.push({
      level: "error",
      code: "STANDARD_DEVIATION_UNJUSTIFIED",
      message: `Отклонение от показателей ГОСТ/технических регламентов требует обоснования (п. 2 ч. 1 ст. 33 44-ФЗ): ${badStandards.map((s) => s.code).join(", ")}.`,
    });
  }

  // П. 1 «г» ч. 1 ст. 33: медицинские изделия и специализированные продукты
  // лечебного питания — это товар, для работ и услуг основание неприменимо.
  if (desc.trademarkRule === "medical_purpose" && explicitNonGoods) {
    issues.push({
      level: "warning",
      code: "MEDICAL_TRADEMARK_NOT_GOODS",
      message:
        "Основание п. 1 «г» ч. 1 ст. 33 относится к медицинским изделиям и специализированным продуктам лечебного питания, то есть к товару. Для работы или услуги выберите другое основание указания товарного знака.",
    });
  }

  // П. 4 ч. 1 ст. 33: если описание ссылается на изображение товара, само
  // изображение должно быть в описании — иначе участник не сможет
  // идентифицировать товар и подготовить заявку.
  if (desc.goodsImageRequired) {
    if (
      !desc.goodsImageReference?.trim() &&
      !desc.goodsImageFileName?.trim() &&
      !desc.goodsImageUrl?.trim()
    ) {
      issues.push({
        level: "error",
        code: "GOODS_IMAGE_MISSING",
        message:
          "Заявлено требование о соответствии товара изображению, но изображение не описано и не приложено (п. 4 ч. 1 ст. 33 44-ФЗ). Приложите файл либо укажите ссылку или реквизиты изображения.",
      });
    }
    if (explicitNonGoods) {
      issues.push({
        level: "warning",
        code: "GOODS_IMAGE_NOT_GOODS",
        message:
          "Изображение поставляемого товара предусмотрено п. 4 ч. 1 ст. 33 только для закупки товара. Для работ и услуг это требование не применяется.",
      });
    }
  }

  // П. 5 ч. 1 ст. 33: осмотр образца или макета требует места, дат начала и
  // окончания, порядка и графика — без них условие осмотра неисполнимо.
  if (desc.sampleInspectionRequired) {
    const missing = [
      !desc.sampleInspectionPlace?.trim() ? "место осмотра" : "",
      !desc.sampleInspectionStartDate?.trim() ? "дата начала осмотра" : "",
      !desc.sampleInspectionEndDate?.trim() ? "дата окончания осмотра" : "",
      !desc.sampleInspectionProcedure?.trim() &&
      !desc.sampleInspectionSchedule?.trim()
        ? "порядок и график осмотра"
        : "",
    ].filter(Boolean);
    if (missing.length > 0) {
      issues.push({
        level: "error",
        code: "SAMPLE_INSPECTION_INCOMPLETE",
        message: `Осмотр образца или макета товара (п. 5 ч. 1 ст. 33 44-ФЗ) требует указания: ${missing.join(", ")}.`,
      });
    }
  }

  // П. 6 ч. 1 ст. 33: для лекарственных средств обязательны МНН (либо
  // химические, группировочные наименования), торговые наименования — только
  // по установленным основаниям.
  if (desc.isMedicinalProduct) {
    if (explicitNonGoods) {
      issues.push({
        level: "warning",
        code: "MEDICINAL_PRODUCT_NOT_GOODS",
        message:
          "Признак лекарственного средства относится к товару. Для работы или услуги правило п. 6 ч. 1 ст. 33 не применяется.",
      });
    }
    if (!desc.innIndication?.trim()) {
      issues.push({
        level: "error",
        code: "MEDICINAL_PRODUCT_INN_MISSING",
        message:
          "Объектом закупки указано лекарственное средство, но не приведены международные непатентованные наименования (при их отсутствии — химические, группировочные) — п. 6 ч. 1 ст. 33 44-ФЗ.",
      });
    }
    if (desc.trademarkRule !== "none" && !desc.tradeNameUseBasis?.trim()) {
      issues.push({
        level: "warning",
        code: "MEDICINAL_TRADE_NAME_BASIS_MISSING",
        message:
          "Для лекарственного средства указано торговое наименование без основания: перечень лекарственных средств, закупаемых по торговым наименованиям, или решение врачебной комиссии (п. 6 ч. 1 ст. 33 44-ФЗ).",
      });
    }
  }

  // П. 8 ч. 1 ст. 33: описание работ по строительству, реконструкции,
  // капремонту и сносу ОКС должно содержать проектную документацию, типовую
  // проектную документацию или смету на капремонт.
  if (desc.capitalConstructionWork) {
    if (desc.productType !== "WORK") {
      issues.push({
        level: "warning",
        code: "CONSTRUCTION_WORK_TYPE_MISMATCH",
        message:
          "Отмечены работы по строительству, реконструкции, капремонту или сносу ОКС, но вид объекта закупки — не «Работа». П. 8 ч. 1 ст. 33 применяется к закупке работ.",
      });
    }
    if (desc.constructionDocType === "none") {
      issues.push({
        level: "error",
        code: "CONSTRUCTION_DOC_MISSING",
        message:
          "В описание работ по строительству, реконструкции, капремонту или сносу ОКС не включена проектная документация, типовая проектная документация либо смета на капитальный ремонт (п. 8 ч. 1 ст. 33 44-ФЗ).",
      });
    } else if (
      desc.constructionDocType !== "not_required" &&
      !desc.constructionDocDetails?.trim()
    ) {
      issues.push({
        level: "error",
        code: "CONSTRUCTION_DOC_DETAILS_MISSING",
        message:
          "Укажите реквизиты приложенной документации (проектной, типовой проектной или сметы) — без них включение её в описание не подтверждено (п. 8 ч. 1 ст. 33 44-ФЗ).",
      });
    }
  }

  // Ч. 1.1 ст. 33: при запрете, ограничении или преимуществе по п. 1 ч. 2
  // ст. 14 в описании товара указываются характеристики российского товара.
  if (desc.nationalRegimeRestriction) {
    if (explicitNonGoods) {
      issues.push({
        level: "warning",
        code: "NATIONAL_REGIME_NOT_GOODS",
        message:
          "Запрет, ограничение или преимущество по п. 1 ч. 2 ст. 14 устанавливаются в отношении товара. Для работы или услуги правило ч. 1.1 ст. 33 не применяется.",
      });
    }
    if (!desc.russianGoodsCharacteristics?.trim()) {
      issues.push({
        level: "error",
        code: "RUSSIAN_GOODS_CHARACTERISTICS_MISSING",
        message:
          "Установлен запрет, ограничение или преимущество по п. 1 ч. 2 ст. 14 44-ФЗ, но не указаны характеристики товара российского происхождения (ч. 1.1 ст. 33).",
      });
    }
  }

  // Ч. 1.1 ст. 33 + ПП РФ № 1875: если код ОКПД2 входит в перечень запрета или
  // ограничения, описание товара должно содержать характеристики российского
  // товара. Агент по нацрежиму режим уже определил — не даём молча пропустить
  // обязательный раздел.
  if (
    options.expectedNationalRegime &&
    !explicitNonGoods &&
    !desc.nationalRegimeRestriction
  ) {
    const regimeLabel =
      options.expectedNationalRegime === "ban"
        ? "приложение № 1 (запрет)"
        : "приложение № 2 (ограничение)";
    issues.push({
      level: "warning",
      code: "NATIONAL_REGIME_DESCRIPTION_SKIPPED",
      message: `Код ОКПД2 входит в ${regimeLabel} к ПП РФ № 1875, но в описании не указаны характеристики товара российского происхождения (ч. 1.1 ст. 33 44-ФЗ). Включите раздел и заполните характеристики либо обоснуйте неприменение.`,
    });
  }

  // П. 3 ч. 1 ст. 33: спецификации, планы, чертежи, эскизы, фотографии и
  // результаты испытаний существуют только как приложение — отметка без файла
  // или реквизитов приложения ничего не подтверждает.
  const declaredDocuments = desc.descriptionComponents.filter((component) =>
    DESCRIPTION_COMPONENT_DOCUMENTS.includes(component),
  );
  const filledAttachments = desc.descriptionAttachments.filter(
    (attachment) => attachment.fileName?.trim() || attachment.url?.trim(),
  );
  const documentsWithoutAttachment = declaredDocuments.filter(
    (component) =>
      !filledAttachments.some(
        (attachment) => attachment.component === component,
      ),
  );
  if (documentsWithoutAttachment.length > 0) {
    issues.push({
      level: "warning",
      code: "DESCRIPTION_ATTACHMENT_MISSING",
      message: `В составе описания заявлены материалы без файла и реквизитов приложения: ${documentsWithoutAttachment
        .map((component) => descriptionComponentLabels[component])
        .join(", ")}. Приложите файл или укажите реквизиты приложения (п. 3 ч. 1 ст. 33 44-ФЗ).`,
    });
  }

  const emptyAttachments = desc.descriptionAttachments.filter(
    (attachment) => !attachment.fileName?.trim() && !attachment.url?.trim(),
  );
  if (emptyAttachments.length > 0) {
    issues.push({
      level: "warning",
      code: "DESCRIPTION_ATTACHMENT_EMPTY",
      message: `В составе описания ${emptyAttachments.length} незаполненных приложений: выберите файл или укажите реквизиты приложения, иначе материал считается не приложенным (п. 3 ч. 1 ст. 33 44-ФЗ).`,
    });
  }

  const unlinkedAttachments = desc.descriptionAttachments.filter(
    (attachment) => !desc.descriptionComponents.includes(attachment.component),
  );
  if (unlinkedAttachments.length > 0) {
    const unlinkedLabels = [
      ...new Set(
        unlinkedAttachments.map(
          (attachment) => descriptionComponentLabels[attachment.component],
        ),
      ),
    ].join(", ");
    issues.push({
      level: "warning",
      code: "DESCRIPTION_ATTACHMENT_UNLINKED",
      message: `Приложены материалы, не заявленные в составе описания: ${unlinkedLabels}. Отметьте компонент в составе описания или удалите приложение.`,
    });
  }

  // П. 2 ч. 1 ст. 33: отказ от показателей техрегламентов и документов по
  // стандартизации требует обоснования. Предупреждение, а не ошибка: ГОСТ
  // может отсутствовать объективно.
  if (
    desc.kind === "object_description" &&
    desc.characteristics.length > 0 &&
    desc.standards.length === 0 &&
    !desc.nonStandardIndicatorsJustification?.trim()
  ) {
    issues.push({
      level: "warning",
      code: "NON_STANDARD_INDICATORS_UNJUSTIFIED",
      message:
        "Показатели описания не опираются на технические регламенты и документы по стандартизации, а обоснование использования других показателей не приведено (п. 2 ч. 1 ст. 33 44-ФЗ).",
    });
  }

  // Единицу характеристики КТРУ можно задать вручную, только если в позиции
  // её нет. Такое изменение должно быть обосновано до публикации извещения.
  const badUnitChanges = desc.characteristics.filter(
    (c) => c.unitManuallyChanged && !c.unitChangeJustification?.trim(),
  );
  if (badUnitChanges.length > 0) {
    issues.push({
      level: "error",
      code: "KTRU_UNIT_CHANGE_UNJUSTIFIED",
      message: `Изменение единицы характеристики КТРУ без обоснования (п. 1 ч. 1 ст. 33 44-ФЗ, ПП РФ № 145): ${badUnitChanges.map((c) => c.name).join(", ")}. Укажите обоснование либо верните единицу как в КТРУ.`,
    });
  }

  // Честное предупреждение вместо попытки собрать весь каталог ГОСТ:
  // если описание не «гостировалось» современными стандартами, пользователь
  // должен увидеть это до публикации извещения. Год берём из обозначения,
  // без обращения к внешним справочникам.
  if (desc.kind === "object_description") {
    const gosts = desc.standards.filter((s) => s.standardType === "GOST");
    const modern = gosts.filter(
      (s) => (gostPublicationYear(s.code) ?? 0) >= MODERN_GOST_MIN_YEAR,
    );
    if (gosts.length === 0) {
      issues.push({
        level: "warning",
        code: "GOST_NOT_MODERN",
        message: `ОЗ не гостировалось после ${MODERN_GOST_MIN_YEAR} года: не указано ни одного ГОСТ. Проверьте, есть ли действующий ГОСТ, принятый не ранее ${MODERN_GOST_MIN_YEAR} г., и добавьте его в описание.`,
      });
    } else if (modern.length === 0) {
      issues.push({
        level: "warning",
        code: "GOST_NOT_MODERN",
        message: `ОЗ не гостировалось после ${MODERN_GOST_MIN_YEAR} года: указанные ГОСТы приняты раньше (${gosts.map((s) => s.code).join(", ")}). Проверьте актуальные редакции и при необходимости замените обозначения.`,
      });
    }
  }

  const hasVariableValues = desc.characteristics.some(
    (c) =>
      c.valueType === "range" ||
      c.valueType === "min" ||
      c.valueType === "max" ||
      c.valueType === "enum",
  );
  const hasAnyInstruction =
    Boolean(desc.participantInstruction?.trim()) ||
    desc.characteristics.some((c) =>
      Boolean(c.instructionForParticipant?.trim()),
    );

  if (hasVariableValues && !hasAnyInstruction) {
    issues.push({
      level: "warning",
      code: "INSTRUCTION_RECOMMENDED",
      message:
        "При наличии диапазонных или вариативных показателей заполните инструкцию по заполнению заявки (п. 2 ч. 1 ст. 33 44-ФЗ).",
    });
  }

  if (
    desc.kind === "object_description" &&
    desc.status !== "draft" &&
    !desc.noRestrictionDeclaration
  ) {
    issues.push({
      level: "warning",
      code: "NO_RESTRICTION_CHECK",
      message:
        "Перед передачей в КС подтвердите отсутствие требований, ограничивающих конкуренцию (п. 1 ч. 1 ст. 33 44-ФЗ).",
    });
  }

  return issues;
};

/**
 * Источник кодов ОКПД2: и полный ООЗ, и уже заполненный блок извещения,
 * где эти поля необязательны.
 */
type Okpd2CodeSource = {
  okpd2Code?: string | null;
  okpd2Name?: string | null;
  okpd2Items?: Array<{ code?: string | null; name?: string | null }>;
};

/**
 * Все коды ОКПД2 ООЗ: основной плюс дополнительные объекты закупки.
 * Повторы отсекаются, чтобы один код не породил две позиции в извещении.
 */
export const getObjectDescriptionOkpd2Codes = (
  desc: Okpd2CodeSource,
): Array<{ code: string; name?: string }> => {
  const seen = new Set<string>();
  return [
    { code: desc.okpd2Code, name: desc.okpd2Name },
    ...(desc.okpd2Items ?? []),
  ]
    .map((item) => ({
      code: item.code?.trim() ?? "",
      name: item.name?.trim() || undefined,
    }))
    .filter((item) => {
      const key = item.code.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

/**
 * Берём из списка только те коды, которых ещё нет в извещении. Множество
 * `usedCodes` обновляется, чтобы повтор не попал в другую позицию.
 */
export const takeMissingOkpd2Codes = (
  allCodes: Array<{ code: string; name?: string }>,
  usedCodes: Set<string>,
): Array<{ code: string; name?: string }> => {
  const missing: Array<{ code: string; name?: string }> = [];
  allCodes.forEach((item) => {
    const code = item.code?.trim();
    const key = code?.toLowerCase();
    if (!code || !key || usedCodes.has(key)) return;
    usedCodes.add(key);
    missing.push({ code, name: item.name });
  });
  return missing;
};

/**
 * ISO-дата (2026-12-01) → 01.12.2026: в тексте ООЗ даты читает человек, и
 * формат ДД.ММ.ГГГГ соответствует обычаю документа. Нераспознанное значение
 * возвращаем как есть, чтобы не потерять данные.
 */
const formatRuDate = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value.trim();
};

/**
 * Приложения к описанию в текстовом виде: «Планы — файл plans.pdf; прил. № 1».
 * Пустые строки приложений в текст не попадают.
 */
const attachmentTexts = (
  attachments: ObjectDescription["descriptionAttachments"],
): string[] =>
  attachments
    .filter((attachment) => attachment.fileName?.trim() || attachment.url?.trim())
    .map((attachment) =>
      [
        descriptionComponentLabels[attachment.component],
        attachment.fileName?.trim() ? `файл ${attachment.fileName.trim()}` : "",
        attachment.url?.trim() ?? "",
      ]
        .filter(Boolean)
        .join(" — "),
    );

/**
 * Реквизиты изображения товара (п. 4 ч. 1 ст. 33): описание, файл, ссылка.
 */
const goodsImageText = (desc: ObjectDescription): string =>
  [
    desc.goodsImageReference?.trim() ?? "",
    desc.goodsImageFileName?.trim()
      ? `файл ${desc.goodsImageFileName.trim()}`
      : "",
    desc.goodsImageUrl?.trim() ?? "",
  ]
    .filter(Boolean)
    .join("; ");

/**
 * Сборник текстовых полей для подстановки в секцию ObjectDescriptionSection извещения.
 */
export const toNoticeObjectDescriptionFields = (
  desc: ObjectDescription,
): NonNullable<NoticeInfoFormValues["objectDescription"]> => {
  const joinByCategory = (categories: CharacteristicCategory[]) =>
    desc.characteristics
      .filter((c) => categories.includes(c.category))
      .map((c) => `${c.name}: ${formatCharacteristicValue(c)}`)
      .join("; ");

  const allOkpd2 = getObjectDescriptionOkpd2Codes(desc);
  const extras: string[] = [];
  if (desc.ktruCode) {
    extras.push(`КТРУ: ${desc.ktruCode}`);
  }
  if (desc.standards.length > 0) {
    extras.push(
      `Стандарты: ${desc.standards.map((s) => `${standardTypeLabels[s.standardType]} ${s.code}`).join(", ")}`,
    );
  }
  if (desc.nonStandardIndicatorsJustification) {
    extras.push(
      `Обоснование иных показателей (п. 2 ч. 1 ст. 33): ${desc.nonStandardIndicatorsJustification}`,
    );
  }
  // Частичные объекты ООЗ (извещение, скрипты проверки) могут не содержать
  // новых массивов — читаем их безопасно, чтобы текст собирался всегда.
  const components = desc.descriptionComponents ?? [];
  if (components.length > 0) {
    extras.push(
      `Состав описания (п. 3 ч. 1 ст. 33): ${components
        .map((component) => descriptionComponentLabels[component])
        .join(", ")}`,
    );
  }
  const attachmentLines = attachmentTexts(desc.descriptionAttachments ?? []);
  if (attachmentLines.length > 0) {
    extras.push(
      `Материалы описания (п. 3 ч. 1 ст. 33): ${attachmentLines.join("; ")}`,
    );
  }
  if (desc.goodsImageRequired) {
    extras.push(
      `Изображение товара (п. 4 ч. 1 ст. 33): ${goodsImageText(desc) || "требуется"}`,
    );
  }
  if (desc.sampleInspectionRequired) {
    extras.push(
      `Осмотр образца или макета (п. 5 ч. 1 ст. 33): ${[
        desc.sampleInspectionPlace,
        [desc.sampleInspectionStartDate, desc.sampleInspectionEndDate]
          .filter(Boolean)
          .map(formatRuDate)
          .join(" — "),
        desc.sampleInspectionProcedure || desc.sampleInspectionSchedule,
      ]
        .filter(Boolean)
        .join("; ")}`,
    );
  }
  if (desc.isMedicinalProduct && desc.innIndication) {
    extras.push(`МНН (п. 6 ч. 1 ст. 33): ${desc.innIndication}`);
  }
  if (desc.capitalConstructionWork) {
    extras.push(
      `Документация по п. 8 ч. 1 ст. 33: ${constructionDocTypeLabels[desc.constructionDocType]}${desc.constructionDocDetails ? ` — ${desc.constructionDocDetails}` : ""}`,
    );
  }
  if (desc.nationalRegimeRestriction) {
    extras.push(
      `Характеристики товара российского происхождения (ч. 1.1 ст. 33): ${desc.russianGoodsCharacteristics || "не указаны"}`,
    );
  }
  if (desc.warrantyTermMonths || desc.warrantyRequirements) {
    const term = desc.warrantyTermMonths
      ? `${desc.warrantyTermMonths} мес.`
      : "";
    extras.push(
      `Гарантия: ${[term, desc.warrantyRequirements].filter(Boolean).join(" — ")}`,
    );
  }
  if (desc.participantInstruction) {
    extras.push(`Инструкция к заявке: ${desc.participantInstruction}`);
  }
  if (desc.otherRequirements) {
    extras.push(desc.otherRequirements);
  }

  return {
    objectName: desc.title,
    okpd2Code: desc.okpd2Code,
    okpd2Name: desc.okpd2Name ?? "",
    // Дополнительные коды приходят структурированно, а не текстом в otherRequirements
    okpd2Items: allOkpd2.slice(1).map((item) => ({
      code: item.code,
      name: item.name ?? "",
    })),
    ktruCode: desc.ktruCode ?? "",
    ktruName: "",
    consumerProperties: joinByCategory(["consumer"]),
    qualityCharacteristics: joinByCategory(["quality", "technical"]),
    functionalProperties: joinByCategory(["functional", "operational"]),
    environmentalCharacteristics: joinByCategory(["environmental"]),
    otherRequirements: [joinByCategory(["other"]), ...extras]
      .filter(Boolean)
      .join("\n"),
  };
};

/**
 * Текстовый макет структурированного ООЗ для копирования в документы закупки.
 */
export const buildObjectDescriptionSummaryText = (
  desc: ObjectDescription,
): string => {
  const okpd2Parts = getObjectDescriptionOkpd2Codes(desc).map(
    (item) => `${item.code}${item.name ? ` — ${item.name}` : ""}`,
  );
  const lines: string[] = [
    `ОПИСАНИЕ ОБЪЕКТА ЗАКУПКИ (ст. 33 44-ФЗ, ПП РФ № 145)`,
    `Наименование: ${desc.title}`,
    `ОКПД2: ${okpd2Parts.join("; ")}`,
  ];

  if (desc.useKtru && desc.ktruCode) {
    lines.push(`КТРУ: ${desc.ktruCode}`);
  }
  if (desc.unit || desc.quantity || desc.isIndeterminateVolume) {
    lines.push(
      `Объём: ${desc.isIndeterminateVolume ? "невозможно определить объём (ч. 24 ст. 22)" : `${desc.quantity || "—"} ${desc.unit || ""}`.trim()}`,
    );
  }

  if (desc.characteristics.length > 0) {
    lines.push("", "Характеристики товара (работы, услуги):");
    desc.characteristics.forEach((c, idx) => {
      const ktruTag = c.isMandatoryFromKtru
        ? " [обяз. КТРУ]"
        : c.isAdditionalOverKtru
          ? " [доп. сверх КТРУ]"
          : "";
      lines.push(
        `${idx + 1}. [${characteristicCategoryLabels[c.category]}] ${c.name}: ${formatCharacteristicValue(c)}${ktruTag}`,
      );
      if (c.isAdditionalOverKtru && c.additionalJustification) {
        lines.push(
          `   Обоснование доп. характеристики (ПП 145): ${c.additionalJustification}`,
        );
      }
      if (c.instructionForParticipant) {
        lines.push(`   Инструкция участнику: ${c.instructionForParticipant}`);
      }
    });
  }

  lines.push("", `Товарный знак: ${trademarkRuleLabels[desc.trademarkRule]}`);
  if (desc.trademarkRule !== "none") {
    if (desc.trademarkName)
      lines.push(`Наименование знака: ${desc.trademarkName}`);
    if (desc.trademarkJustification) {
      lines.push(
        `Параметры эквивалентности / обоснование: ${desc.trademarkJustification}`,
      );
    }
  }

  if (desc.standards.length > 0) {
    lines.push("", "Стандарты и технические регламенты:");
    desc.standards.forEach((s) => {
      lines.push(
        `- ${standardTypeLabels[s.standardType]} ${s.code}${s.title ? ` (${s.title})` : ""}${s.hasDeviation && s.deviationJustification ? ` — отклонение обосновано: ${s.deviationJustification}` : ""}`,
      );
    });
  }

  if (desc.nonStandardIndicatorsJustification) {
    lines.push(
      `Обоснование иных показателей (п. 2 ч. 1 ст. 33): ${desc.nonStandardIndicatorsJustification}`,
    );
  }

  const components = desc.descriptionComponents ?? [];
  if (components.length > 0) {
    lines.push(
      "",
      `Состав описания (п. 3 ч. 1 ст. 33): ${components
        .map((component) => descriptionComponentLabels[component])
        .join(", ")}`,
    );
  }
  const attachmentLines = attachmentTexts(desc.descriptionAttachments ?? []);
  if (attachmentLines.length > 0) {
    lines.push("Материалы описания (приложения):");
    attachmentLines.forEach((line) => lines.push(`- ${line}`));
  }

  if (desc.goodsImageRequired) {
    lines.push(
      `Изображение товара (п. 4 ч. 1 ст. 33): ${goodsImageText(desc) || "требуется, реквизиты не указаны"}`,
    );
  }

  if (desc.sampleInspectionRequired) {
    lines.push(
      `Осмотр образца или макета (п. 5 ч. 1 ст. 33): место — ${desc.sampleInspectionPlace || "не указано"}; даты — ${
        [desc.sampleInspectionStartDate, desc.sampleInspectionEndDate]
          .filter(Boolean)
          .map(formatRuDate)
          .join(" — ") || "не указаны"
      }`,
    );
    if (desc.sampleInspectionProcedure) {
      lines.push(`   Порядок осмотра: ${desc.sampleInspectionProcedure}`);
    }
    if (desc.sampleInspectionSchedule) {
      lines.push(`   График осмотра: ${desc.sampleInspectionSchedule}`);
    }
  }

  if (desc.isMedicinalProduct) {
    lines.push(
      "",
      `Лекарственное средство (п. 6 ч. 1 ст. 33): МНН — ${desc.innIndication || "не указаны"}`,
    );
    if (desc.tradeNameUseBasis) {
      lines.push(
        `   Основание указания торгового наименования: ${desc.tradeNameUseBasis}`,
      );
    }
  }

  if (isGoodsObjectDescription(desc)) {
    lines.push(
      "",
      `Требование к новизне (п. 7 ч. 1 ст. 33): ${desc.isNewGoodsRequired ? "товар должен быть новым" : "допускается не новый товар"}`,
    );
  }
  if (desc.capitalConstructionWork) {
    lines.push(
      "",
      `Документация по п. 8 ч. 1 ст. 33: ${constructionDocTypeLabels[desc.constructionDocType]}`,
    );
    if (desc.constructionDocDetails) {
      lines.push(`   Реквизиты документации: ${desc.constructionDocDetails}`);
    }
  }

  if (desc.nationalRegimeRestriction) {
    lines.push(
      "",
      `Товар российского происхождения (ч. 1.1 ст. 33): ${desc.russianGoodsCharacteristics || "характеристики не указаны"}`,
    );
    if (desc.nationalRegimeException) {
      lines.push(
        `   Исключение, установленное Правительством РФ: ${desc.nationalRegimeException}`,
      );
    }
  }
  if (desc.warrantyTermMonths || desc.warrantyRequirements) {
    lines.push(
      `Гарантийные обязательства (ч. 4 ст. 33): ${[desc.warrantyTermMonths ? `срок ${desc.warrantyTermMonths} мес.` : "", desc.warrantyRequirements].filter(Boolean).join("; ")}`,
    );
  }
  if (desc.participantInstruction) {
    lines.push(
      `Инструкция по заполнению заявки: ${desc.participantInstruction}`,
    );
  }
  if (desc.otherRequirements) {
    lines.push(`Иные требования: ${desc.otherRequirements}`);
  }

  return lines.join("\n");
};

export const emptyCharacteristic = (
  category: CharacteristicCategory = "consumer",
): ObjectCharacteristic => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  category,
  name: "",
  unit: "",
  valueType: "text",
  valueText: "",
  minValue: "",
  maxValue: "",
  isMandatoryFromKtru: false,
  isAdditionalOverKtru: false,
  additionalJustification: "",
  unitManuallyChanged: false,
  unitChangeJustification: "",
  instructionForParticipant: "",
  instructionSourceCode: "",
});

export const emptyObjectDescription = (
  organizationId: string | number | null = "",
  kind: ObjectDescriptionKind = "object_description",
): ObjectDescription => ({
  organizationId: organizationId === "" ? null : organizationId,
  kind,
  status: "draft",
  ikz: "",
  title: "",
  productType: "PRODUCT",
  okpd2Code: "",
  okpd2Name: "",
  okpd2Items: [],
  useKtru: false,
  ktruCode: "",
  ktruName: "",
  ktruRefusalReason: "",
  unit: "",
  quantity: "",
  isIndeterminateVolume: false,
  characteristics: [emptyCharacteristic("consumer")],
  trademarkRule: "none",
  trademarkName: "",
  trademarkJustification: "",
  standards: [],
  nonStandardIndicatorsJustification: "",
  descriptionComponents: [],
  descriptionAttachments: [],
  goodsImageRequired: false,
  goodsImageReference: "",
  goodsImageFileName: "",
  goodsImageFileSize: 0,
  goodsImageUrl: "",
  sampleInspectionRequired: false,
  sampleInspectionPlace: "",
  sampleInspectionStartDate: "",
  sampleInspectionEndDate: "",
  sampleInspectionProcedure: "",
  sampleInspectionSchedule: "",
  isMedicinalProduct: false,
  innIndication: "",
  tradeNameUseBasis: "",
  capitalConstructionWork: false,
  constructionDocType: "none",
  constructionDocDetails: "",
  nationalRegimeRestriction: false,
  russianGoodsCharacteristics: "",
  nationalRegimeException: "",
  isNewGoodsRequired: true,
  warrantyTermMonths: "",
  warrantyRequirements: "",
  participantInstruction: "",
  noRestrictionDeclaration: false,
  otherRequirements: "",
  authorName: "",
  approvedByName: "",
  approvedDate: "",
  updatedAt: new Date().toISOString().slice(0, 10),
});
