import z from "zod";

/**
 * Отчёт о закупках у СМП/СОНКО (ч. 1 ст. 30 ФЗ-44).
 *
 * Заказчик размещает в ЕИС сведения о закупках у СМП (не менее 25% от общего
 * объёма закупок) и СОНКО. Отчёт формируется по результатам проведённых закупок.
 *
 * Не путать две величины: 25% — годовой объём заказчика (ч. 1 ст. 30),
 * 5% — минимальный процент привлечения внутри одного контракта
 * (п. 1 типовых условий, ПП РФ от 23.12.2016 N 1466).
 *
 * Структура:
 * — закупки у СМП (ч. 1 ст. 30)
 * — закупки у СОНКО (ч. 1 ст. 30)
 * — расчёт доли закупок у СМП в общем объёме
 * — плановые показатели на год/квартал
 */

const optionalMoney = () =>
  z
    .string()
    .refine(
      (v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v),
      "Укажите сумму числом с точностью до копеек",
    )
    .optional();

export const SmnpSonekProcurementSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  // Ссылка на закупку
  procurementId: z.union([z.string(), z.number()]).optional(),
  // ИКЗ
  ikz: z.string().optional(),
  // Наименование закупки
  procurementName: z.string().optional(),
  // Тип закупки: СМП или СОНКО
  supplierType: z.enum(["smnp", "sonek"]),
  // Способ закупки
  procurementMethod: z.string().optional(),
  // Начальная (максимальная) цена закупки
  initialPrice: optionalMoney(),
  // Цена контракта (итоговая)
  contractPrice: optionalMoney(),
  // Сумма экономии
  savingsAmount: optionalMoney(),
  // Дата размещения извещения
  noticeDate: z
    .string()
    .refine(
      (v) =>
        v === "" || /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v),
      "Неверный формат даты (ГГГГ-ММ-ДД)",
    )
    .optional(),
  // Дата заключения контракта
  contractDate: z
    .string()
    .refine(
      (v) =>
        v === "" || /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v),
      "Неверный формат даты (ГГГГ-ММ-ДД)",
    )
    .optional(),
  // Дата размещения сведений в ЕИС
  eisDate: z
    .string()
    .refine(
      (v) =>
        v === "" || /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v),
      "Неверный формат даты (ГГГГ-ММ-ДД)",
    )
    .optional(),
  // Размещено ли в ЕИС
  publishedInEis: z.boolean().default(false),
  // Комментарий
  comment: z.string().optional(),
});

export type SmnpSonekProcurement = z.infer<typeof SmnpSonekProcurementSchema>;
export const SmnpSonekProcurementListSchema = z.array(
  SmnpSonekProcurementSchema,
);

// Плановые показатели на год/квартал (ст. 18 ФЗ-44)
export const SmnpSonekPlanSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  // Год
  year: z.number().int().min(2000).max(2100),
  // Квартал (если quarterly)
  quarter: z.enum(["q1", "q2", "q3", "q4"]).optional(),
  // Тип: annual или quarterly
  type: z.enum(["annual", "quarterly"]).default("annual"),
  // Плановый объём закупок у СМП (руб)
  plannedSmnpAmount: optionalMoney(),
  // Плановый объём закупок у СОНКО (руб)
  plannedSonekAmount: optionalMoney(),
  // Общий объём всех закупок (руб)
  totalProcurementAmount: optionalMoney(),
  // Плановая доля СМП (%)
  plannedSmnpPercent: z
    .string()
    .refine(
      (v) => v === "" || (parseFloat(v) >= 0 && parseFloat(v) <= 100),
      "Доля от 0 до 100%",
    )
    .optional(),
  // Размещён ли план в ЕИС
  publishedInEis: z.boolean().default(false),
  // Комментарий
  comment: z.string().optional(),
});

export type SmnpSonekPlan = z.infer<typeof SmnpSonekPlanSchema>;
export const SmnpSonekPlanListSchema = z.array(SmnpSonekPlanSchema);

// Итоговый отчёт
export const SmnpSonekReportSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  organizationId: z.union([z.string(), z.number()]),
  // Год отчёта
  year: z.number().int().min(2000).max(2100),
  // Квартал (если quarterly)
  quarter: z.enum(["q1", "q2", "q3", "q4"]).optional(),
  // Тип: annual или quarterly
  type: z.enum(["annual", "quarterly"]).default("annual"),
  // Фактический объём закупок у СМП (руб)
  actualSmnpAmount: optionalMoney(),
  // Фактический объём закупок у СОНКО (руб)
  actualSonekAmount: optionalMoney(),
  // Общий объём всех закупок (руб)
  totalProcurementAmount: optionalMoney(),
  // Фактическая доля СМП (%)
  actualSmnpPercent: z
    .string()
    .refine(
      (v) => v === "" || (parseFloat(v) >= 0 && parseFloat(v) <= 100),
      "Доля от 0 до 100%",
    )
    .optional(),
  // Размещён ли отчёт в ЕИС
  publishedInEis: z.boolean().default(false),
  // Дата размещения в ЕИС
  eisPublishDate: z
    .string()
    .refine(
      (v) =>
        v === "" || /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v),
      "Неверный формат даты (ГГГГ-ММ-ДД)",
    )
    .optional(),
  // Статус
  status: z.enum(["draft", "review", "published", "archived"]).default("draft"),
  comment: z.string().optional(),
});

export type SmnpSonekReport = z.infer<typeof SmnpSonekReportSchema>;
export const SmnpSonekReportListSchema = z.array(SmnpSonekReportSchema);

// Утилиты

// Расчёт доли СМП в общем объёме закупок
export const smnpShare = (
  smnpAmount: string | number,
  totalAmount: string | number,
): number => {
  const smnp =
    typeof smnpAmount === "string" ? parseFloat(smnpAmount) : smnpAmount;
  const total =
    typeof totalAmount === "string" ? parseFloat(totalAmount) : totalAmount;
  if (!total || total === 0) return 0;
  return Math.round((smnp / total) * 10000) / 100;
};

// Минимальная доля СМП в годовом отчёте (ч. 1 ст. 30 ФЗ-44)
export const MINIMUM_SMNP_SHARE = 25;

// Проверка выполнения плана
export const checkSmnpPlan = (
  _plannedPercent: string | number,
  actualPercent: string | number,
): { compliant: boolean; required: number; actual: number } => {
  const actual =
    typeof actualPercent === "string"
      ? parseFloat(actualPercent)
      : actualPercent;
  return {
    compliant: actual >= MINIMUM_SMNP_SHARE,
    required: MINIMUM_SMNP_SHARE,
    actual: actual,
  };
};

// Создание пустого плана
export const emptySmnpPlan = (
  organizationId: string | number = "",
): SmnpSonekPlan => ({
  organizationId,
  year: new Date().getFullYear(),
  type: "annual",
  plannedSmnpAmount: "",
  plannedSonekAmount: "",
  totalProcurementAmount: "",
  plannedSmnpPercent: String(MINIMUM_SMNP_SHARE),
  publishedInEis: false,
  comment: "",
});

// Создание пустого отчёта
export const emptySmnpReport = (
  organizationId: string | number = "",
): SmnpSonekReport => ({
  organizationId,
  year: new Date().getFullYear(),
  type: "annual",
  actualSmnpAmount: "",
  actualSonekAmount: "",
  totalProcurementAmount: "",
  actualSmnpPercent: "",
  publishedInEis: false,
  status: "draft",
  comment: "",
});
