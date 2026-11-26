import { z } from "zod";

/**
 * Справочник КТРУ (Каталог товаров, работ, услуг для обеспечения
 * государственных и муниципальных нужд).
 *
 * Бэкенд отдаёт позиции КТРУ с привязкой к коду ОКПД2 и набором характеристик.
 * Если выбранная позиция ОКПД2 присутствует в КТРУ, заказчик обязан описать
 * объект закупки по позиции каталога (ПП РФ от 08.02.2017 № 145): наименование,
 * единица измерения и характеристики берутся из КТРУ, а дополнительные
 * характеристики сверх каталога требуют обоснования.
 *
 * Коллекция необязательна для работы: при отсутствии ответа бэкенда
 * справочник считается пустым и предупреждение о КТРУ не показывается.
 */

export const KTRU_VALUE_TYPES = [
  "exact",
  "range",
  "min",
  "max",
  "enum",
  "text",
] as const;

export type KtruValueType = (typeof KTRU_VALUE_TYPES)[number];

export const ktruValueTypeLabels: Record<KtruValueType, string> = {
  exact: "Точное значение",
  range: "Диапазон",
  min: "Не менее",
  max: "Не более",
  enum: "Перечень значений",
  text: "Текстовое требование",
};

export const KtruCharacteristicSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Укажите наименование характеристики КТРУ"),
  unit: z.string().optional(),
  valueType: z.enum(KTRU_VALUE_TYPES).default("text"),
  valueText: z.string().optional(),
  minValue: z.string().optional(),
  maxValue: z.string().optional(),
  /** Обязательная характеристика позиции КТРУ (нельзя исключить) */
  isMandatory: z.boolean().default(true),
  /** Инструкция участнику по заполнению значения (из выгрузки КТРУ) */
  instruction: z.string().optional(),
  /** Ссылка на справочник ЕИС nsiCharacteristicsFillingInstructions */
  characteristicsFillingInstructionCode: z.string().optional(),
});

export type KtruCharacteristic = z.infer<typeof KtruCharacteristicSchema>;

export const KtruRefSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  /** Код позиции КТРУ, например 32.50.13.190-00000001 */
  ktruCode: z.string().trim().min(1, "Укажите код позиции КТРУ"),
  /** Код ОКПД2, к которому относится позиция каталога */
  okpd2Code: z.string().trim().min(1, "Укажите код ОКПД2"),
  /** Наименование позиции КТРУ */
  name: z.string().trim().min(2, "Укажите наименование позиции КТРУ"),
  /** Единица измерения по ОКЕИ (первая из объявленных в позиции) */
  unit: z.string().optional(),
  /** Все единицы, допустимые в позиции КТРУ. Если одна — подставляется в ООЗ. */
  unitOptions: z.array(z.string()).default([]),
  /** Дата начала/окончания обязательного применения позиции из ЕИС */
  mandatoryFrom: z.string().optional(),
  mandatoryTo: z.string().optional(),
  /** Статус позиции в КТРУ («Включено в КТРУ» и т. п.) */
  status: z.string().optional(),
  characteristics: z.array(KtruCharacteristicSchema).default([]),
  /** Правовой акт, которым утверждена позиция (ссылка на legalActs) */
  legalActId: z.string().optional(),
  note: z.string().optional(),
});

export type KtruRef = z.infer<typeof KtruRefSchema>;
export const KtruRefListSchema = z.array(KtruRefSchema);
