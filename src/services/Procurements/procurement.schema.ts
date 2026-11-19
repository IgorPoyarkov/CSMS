import { z } from "zod";

/**
 * Статусы извещения в контуре закупки.
 *
 * Значения хранятся в записи закупки в поле «Статус извещения» (json-server
 * не валидирует данные, поэтому поле читается мягко). Если статус не задан,
 * он выводится из данных: есть номер извещения — «Размещено», иначе
 * «На подготовке». Отменённые извещения в списке текущих не показываются.
 */
export const NOTICE_STATUSES = [
  "preparing",
  "control",
  "published",
  "summing_up",
  "completed",
  "failed",
  "cancelled",
] as const;

export type NoticeStatus = (typeof NOTICE_STATUSES)[number];

export const NOTICE_STATUS_LABELS: Record<NoticeStatus, string> = {
  preparing: "На подготовке",
  control: "На контроле",
  published: "Размещено",
  summing_up: "Подведение итогов",
  completed: "Закупка состоялась",
  failed: "Закупка не состоялась",
  cancelled: "Отменено",
};

/** Статусы для фильтра: отменённые в текущих извещениях не показываем. */
export const NOTICE_FILTER_STATUSES: NoticeStatus[] = [
  "preparing",
  "control",
  "published",
  "summing_up",
  "completed",
  "failed",
];

export const noticeStatusLabel = (status?: string): string =>
  NOTICE_STATUS_LABELS[(status ?? "preparing") as NoticeStatus] ??
  "На подготовке";

export const normalizeNoticeStatus = (
  raw: string | undefined,
  hasNoticeNumber: boolean,
): NoticeStatus => {
  const value = (raw ?? "").trim();
  if ((NOTICE_STATUSES as readonly string[]).includes(value)) {
    return value as NoticeStatus;
  }
  return hasNoticeNumber ? "published" : "preparing";
};

export const RawProcurementSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  "Идентификационный код закупки": z.string(),
  "Наименование закупки": z.string(),
  "Номер извещения": z.string().nullable().optional(),
  "Начальная (максимальная) цена контракта, руб": z.coerce.number(),
  "Тип закупки": z.string(),
  "Статус извещения": z.string().optional(),
  // Сроки процедуры: заполняются при подготовке извещения
  "Дата начала подачи заявок": z.string().optional(),
  "Дата окончания подачи заявок": z.string().optional(),
  "Дата рассмотрения заявок": z.string().optional(),
  "Дата подведения итогов": z.string().optional(),
  "Уполномоченный орган (учреждение)": z.string().optional(),
  "Организатор совместной закупки": z.string().optional(),
  "КБК": z.string().optional(),
});

export const ProcurementSchema = RawProcurementSchema.transform((raw) => ({
  id: raw.id ?? raw["Идентификационный код закупки"],
  ikz: raw["Идентификационный код закупки"],
  name: raw["Наименование закупки"],
  noticeNumber: raw["Номер извещения"] || null,
  nmck: raw["Начальная (максимальная) цена контракта, руб"],
  procurementType: raw["Тип закупки"],
  noticeStatus: normalizeNoticeStatus(
    raw["Статус извещения"],
    Boolean(raw["Номер извещения"]),
  ),
  applicationStartDate: raw["Дата начала подачи заявок"] || null,
  applicationEndDate: raw["Дата окончания подачи заявок"] || null,
  reviewDate: raw["Дата рассмотрения заявок"] || null,
  summingUpDate: raw["Дата подведения итогов"] || null,
  authorizedBodyName: raw["Уполномоченный орган (учреждение)"] || null,
  jointOrganizerName: raw["Организатор совместной закупки"] || null,
  kbk: raw["КБК"] || null,
}));

export const ProcurementListSchema = z.array(ProcurementSchema);

export type RawProcurement = z.infer<typeof RawProcurementSchema>;
export type Procurement = z.infer<typeof ProcurementSchema>;

/**
 * Бюджетное обязательство, сформированное по извещению.
 * Хранится в отдельной коллекции `budgetObligations`.
 */
export interface BudgetObligation {
  id?: string | number;
  organizationId?: string | number;
  procurementId: string | number;
  ikz: string;
  noticeNumber: string | null;
  /** Номер обязательства формируется по извещению: БО-<номер извещения|id>-<год> */
  obligationNumber: string;
  obligationDate: string;
  kbk: string;
  amount: string;
  comment?: string;
  createdAt?: string;
}
