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
  КБК: z.string().optional(),
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
 * Сроки процедуры из вкладки «Информация о процедуре закупки» извещения.
 *
 * Тип намеренно локальный, а не `NoticeInfoFormValues["procedureInfo"]`:
 * схема извещения тянет в себя весь альбом 44-ФЗ, а реестру нужны только даты.
 * Структурно совместим с `procedureInfo` — дополнительные поля не мешают.
 */
export interface NoticeProcedureDates {
  collectingStartDT?: string;
  submissionEndDate?: string;
  firstPartsDate?: string;
  secondPartsReviewEndDate?: string;
  biddingDate?: string;
  summingUpDate?: string;
}

/**
 * Дата из `date`/`datetime-local` (`2026-05-01` или `2026-05-01T09:00`).
 * В запись закупки пишем только день: реестру время не нужно.
 */
const toDateOnly = (value?: string | null): string | undefined => {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec((value ?? "").trim());
  return iso ? iso[1] : undefined;
};

/**
 * Патч записи закупки сроками процедуры из сохранённого извещения.
 *
 * Пока сроки не были в записи закупки, реестр показывал «—» по всем четырём
 * полям: даты лежат в коллекции `notices`, а `/procurements` их не содержал.
 * Пустые поля не отдаём — PATCH должен перетирать только заполненное.
 *
 * Дата рассмотрения: у конкурса — первые части заявок, у конкурса с допуском
 * к вторым частям — окончание их рассмотрения, у аукциона — дата процедуры.
 *
 * Тот же набор правил в скриптах импорта — `scripts/lib/notice-procedure-dates.mjs`.
 */
export const procedureDatesPatch = (
  procedureInfo: NoticeProcedureDates | undefined,
): Partial<RawProcurement> => {
  if (!procedureInfo) return {};

  const patch: Partial<RawProcurement> = {};

  const start = toDateOnly(procedureInfo.collectingStartDT);
  const end = toDateOnly(procedureInfo.submissionEndDate);
  const review = toDateOnly(
    procedureInfo.firstPartsDate ||
      procedureInfo.secondPartsReviewEndDate ||
      procedureInfo.biddingDate,
  );
  const summing = toDateOnly(procedureInfo.summingUpDate);

  if (start) patch["Дата начала подачи заявок"] = start;
  if (end) patch["Дата окончания подачи заявок"] = end;
  if (review) patch["Дата рассмотрения заявок"] = review;
  if (summing) patch["Дата подведения итогов"] = summing;

  return patch;
};

/**
 * Статус извещения, фиксируемый в записи закупки при сохранении извещения.
 *
 * Пишем материальное значение, а не оставляем производное: фильтры реестра
 * ушли на сервер, и серверу нужен обычный `=` по полю, без правил нормализации.
 *
 * Менять разрешено только «подготовительную» пару статусов: запись создаётся
 * из служебной записки без номера («На подготовке»), а после сохранения
 * извещения с номером переходит в «Размещено». Рабочие и финальные статусы
 * (на контроле, подведение итогов, состоялась/не состоялась, отменено) —
 * следствие процесса закупки, пересохранение извещения их не трогает.
 */
const DRAFT_NOTICE_STATUSES: readonly string[] = ["preparing", "published"];

export const procurementStatusPatch = (
  currentStatus: string | undefined,
  hasNoticeNumber: boolean,
): Partial<RawProcurement> => {
  const value = (currentStatus ?? "").trim();
  if (value && !DRAFT_NOTICE_STATUSES.includes(value)) return {};

  return {
    "Статус извещения": hasNoticeNumber ? "published" : "preparing",
  };
};

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
