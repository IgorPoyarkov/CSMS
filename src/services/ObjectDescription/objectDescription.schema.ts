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
] as const;

export type TrademarkRule = (typeof TRADEMARK_RULES)[number];

export const trademarkRuleLabels: Record<TrademarkRule, string> = {
  none: "Без указания товарного знака (п. 1 ч. 1 ст. 33)",
  with_equivalent: "С указанием товарного знака и словами «или эквивалент»",
  compatibility:
    "Необходимость обеспечения взаимодействия с имеющимися товарами (без эквивалента)",
  spare_parts:
    "Запасные части и расходные материалы по технической документации",
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
  options: { hasKtruForOkpd2?: boolean } = {},
): ComplianceIssue[] => {
  const issues: ComplianceIssue[] = [];
  // Флаг «Применение КТРУ» не имеет смысла, когда по коду ОКПД2 позиций нет.
  const useKtru = options.hasKtruForOkpd2 === false ? false : desc.useKtru;

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

  if (isGoodsObjectDescription(desc)) {
    lines.push(
      "",
      `Требование к новизне (п. 7 ч. 1 ст. 33): ${desc.isNewGoodsRequired ? "товар должен быть новым" : "допускается не новый товар"}`,
    );
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
