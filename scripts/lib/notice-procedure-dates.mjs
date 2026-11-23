/**
 * Сроки процедуры извещения → поля записи закупки.
 *
 * Реестр извещений (`/procurement-processing`) читает коллекцию
 * `procurements`, а сроки процедуры живут в `notices.procedureInfo`. Если их
 * не перекладывать, реестр показывает «—» по всем четырём полям. Те же правила
 * на фронте — `procedureDatesPatch` в
 * `src/services/Procurements/procurement.schema.ts`.
 */

/** Дата из `YYYY-MM-DD` или `YYYY-MM-DDTHH:MM` → `YYYY-MM-DD`. */
export const toDateOnly = (value) => {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? "").trim());
  return iso ? iso[1] : undefined;
};

/**
 * Только заполненные даты: пустые поля не отдаём, чтобы PATCH не стирал то,
 * что уже было в записи.
 *
 * Дата рассмотрения: у конкурса — первые части заявок, у конкурса с допуском
 * к вторым частям — окончание их рассмотрения, у аукциона — дата процедуры.
 */
export const procedureDateFields = (procedureInfo) => {
  if (!procedureInfo) return {};

  const fields = {};

  const start = toDateOnly(procedureInfo.collectingStartDT);
  const end = toDateOnly(procedureInfo.submissionEndDate);
  const review = toDateOnly(
    procedureInfo.firstPartsDate ||
      procedureInfo.secondPartsReviewEndDate ||
      procedureInfo.biddingDate,
  );
  const summing = toDateOnly(procedureInfo.summingUpDate);

  if (start) fields["Дата начала подачи заявок"] = start;
  if (end) fields["Дата окончания подачи заявок"] = end;
  if (review) fields["Дата рассмотрения заявок"] = review;
  if (summing) fields["Дата подведения итогов"] = summing;

  return fields;
};

/**
 * Статус извещения для записи закупки.
 *
 * Значение материализуем в данных, а не выводим на клиенте: фильтры реестра
 * считаются на сервере обычным `=` по полю. Меняться разрешает только
 * «подготовительная» пара статусов — рабочие и финальные (на контроле, подведение
 * итогов, состоялась/не состоялась, отменено) — следствие процесса закупки.
 */
const DRAFT_NOTICE_STATUSES = ["preparing", "published"];

export const noticeStatusField = (currentStatus, hasNoticeNumber) => {
  const value = String(currentStatus ?? "").trim();
  if (value && !DRAFT_NOTICE_STATUSES.includes(value)) return value;

  return hasNoticeNumber ? "published" : "preparing";
};
