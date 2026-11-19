import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import { MIN_PROCEDURE_DAYS, placingWayFamily } from "../noticeInfo.config";
import styles from "../NoticeInfoForm.module.scss";

/**
 * Считает календарные дни между двумя датами (YYYY-MM-DD).
 * Результат = разница в днях, включая день подачи, но не включая день публикации.
 */
const calendarDaysBetween = (from: string, to: string): number => {
  if (!from || !to) return 0;
  const start = new Date(from);
  const end = new Date(to);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diffMs / 86_400_000));
};

const ProcedureDatesSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<NoticeInfoFormValues>();

  const plannedPublishDate = watch("procedureInfo.plannedPublishDate");
  const submissionEndDate = watch("procedureInfo.submissionEndDate");
  const summingUpDate = watch("procedureInfo.summingUpDate");
  const isPart19Art48 = watch("generalInfo.isPart19Art48");
  const placingWayCode = watch("generalInfo.placingWayCode");

  const normalizedCode = (placingWayCode ?? "").trim().toUpperCase();
  const isContest =
    normalizedCode.startsWith("OK") || normalizedCode.startsWith("EOK");
  const isAuction = normalizedCode.startsWith("EA");

  // Вторые части заявок отображаются для конкурса (обязательно в EOK2020)
  const showSecondPartsDate =
    isContest || (isPart19Art48 && placingWayCode.startsWith("OK"));

  // Валидация минимального срока подачи заявок по ч. 2 ст. 45 44-ФЗ
  const procedureWarning = useMemo(() => {
    if (!submissionEndDate || !plannedPublishDate) return null;

    const family = placingWayFamily(placingWayCode);
    if (family === "single") return null; // ЕП — ограничений ст. 45 нет

    const minDays = MIN_PROCEDURE_DAYS[family];
    if (minDays === undefined) return null;

    const actualDays = calendarDaysBetween(
      plannedPublishDate,
      submissionEndDate,
    );
    if (actualDays < minDays) {
      return {
        message: `Для «${family === "contest" ? "конкурса" : family === "auction" ? "аукциона" : "котировок"}» минимальный срок подачи заявок — ${minDays} календарных дней (ч. 2 ст. 45 44-ФЗ). Текущий срок: ${actualDays} дн.`,
        actualDays,
        minDays,
      };
    }
    return null;
  }, [plannedPublishDate, submissionEndDate, placingWayCode]);

  // Валидация: дата подведения итогов не раньше окончания подачи
  const summingUpWarning = useMemo(() => {
    if (!submissionEndDate || !summingUpDate) return null;
    const days = calendarDaysBetween(submissionEndDate, summingUpDate);
    if (days < 0) {
      return {
        message:
          "Дата подведения итогов не может быть раньше даты окончания подачи заявок.",
      };
    }
    return null;
  }, [submissionEndDate, summingUpDate]);

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>
        Информация о процедуре закупки (сроки ЕИС 17.0)
      </h2>

      <div className={block("form-grid")}>
        {/* Предупреждение о нарушении минимального срока */}
        {procedureWarning && (
          <div className={block("warning-banner")}>
            <span className={block("warning-badge")}>!</span>
            <span>{procedureWarning.message}</span>
          </div>
        )}

        {/* Предупреждение о некорректной дате итогов */}
        {summingUpWarning && (
          <div className={block("warning-banner")}>
            <span className={block("warning-badge")}>!</span>
            <span>{summingUpWarning.message}</span>
          </div>
        )}

        <div className={block("row")}>
          <span className={block("label")}>
            Предполагаемая дата размещения<sup>*</sup>
          </span>
          <div className={block("field-col", ["narrow"])}>
            <input
              type="date"
              className={block("input")}
              {...register("procedureInfo.plannedPublishDate")}
            />
            {errors.procedureInfo?.plannedPublishDate && (
              <span className={block("error")}>
                {errors.procedureInfo.plannedPublishDate.message}
              </span>
            )}
          </div>
        </div>

        <div className={block("row")}>
          <span className={block("label")}>
            Дата и время начала срока подачи заявок (collectingInfo/startDT)
          </span>
          <div className={block("field-col", ["narrow"])}>
            <input
              type="datetime-local"
              className={block("input")}
              {...register("procedureInfo.collectingStartDT")}
            />
            <span className={block("caption")}>
              Если не заполнено, фиксируется автоматически при размещении
              извещения в ЕИС
            </span>
          </div>
        </div>

        <div className={block("row")}>
          <span className={block("label")}>
            Окончание срока подачи заявок<sup>*</sup>
          </span>
          <div className={block("field-col")}>
            <div className={block("fio-grid")}>
              <input
                type="date"
                className={block("input")}
                {...register("procedureInfo.submissionEndDate")}
              />
              <input
                type="time"
                className={block("input")}
                {...register("procedureInfo.submissionEndTime")}
              />
            </div>
            {errors.procedureInfo?.submissionEndDate && (
              <span className={block("error")}>
                {errors.procedureInfo.submissionEndDate.message}
              </span>
            )}
          </div>
        </div>

        {isContest && (
          <>
            <div className={block("row")}>
              <span className={block("label")}>
                Дата рассмотрения и оценки первых частей заявок (firstPartsDate)
              </span>
              <div className={block("field-col", ["narrow"])}>
                <input
                  type="date"
                  className={block("input")}
                  {...register("procedureInfo.firstPartsDate")}
                />
              </div>
            </div>

            <div className={block("row")}>
              <span className={block("label")}>
                Дата процедуры подачи предложений о цене
                (submissionProcedureDate)
              </span>
              <div className={block("field-col", ["narrow"])}>
                <input
                  type="date"
                  className={block("input")}
                  {...register("procedureInfo.submissionProcedureDate")}
                />
              </div>
            </div>
          </>
        )}

        {showSecondPartsDate && (
          <div className={block("row")}>
            <span className={block("label")}>
              Дата окончания срока рассмотрения и оценки вторых частей заявок
              {isPart19Art48 && <sup>*</sup>}
            </span>
            <div className={block("field-col", ["narrow"])}>
              <input
                type="date"
                className={block("input")}
                {...register("procedureInfo.secondPartsReviewEndDate")}
              />
            </div>
          </div>
        )}

        {isAuction && (
          <div className={block("row")}>
            <span className={block("label")}>
              Дата проведения электронного аукциона (biddingDate)
            </span>
            <div className={block("field-col", ["narrow"])}>
              <input
                type="date"
                className={block("input")}
                {...register("procedureInfo.biddingDate")}
              />
            </div>
          </div>
        )}

        <div className={block("row")}>
          <span className={block("label")}>
            Дата подведения итогов определения поставщика<sup>*</sup>
          </span>
          <div className={block("field-col", ["narrow"])}>
            <input
              type="date"
              className={block("input")}
              {...register("procedureInfo.summingUpDate")}
            />
            {errors.procedureInfo?.summingUpDate && (
              <span className={block("error")}>
                {errors.procedureInfo.summingUpDate.message}
              </span>
            )}
          </div>
        </div>

        <div className={block("row")}>
          <span className={block("label")}>
            Дополнительная информация о процедуре и заключении контракта
          </span>
          <textarea
            rows={2}
            className={block("textarea")}
            {...register("procedureInfo.additionalInfo")}
          />
        </div>
      </div>
    </section>
  );
};

export default ProcedureDatesSection;
