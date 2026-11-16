import { useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import styles from "../NoticeInfoForm.module.scss";

const ProcedureDatesSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<NoticeInfoFormValues>();

  const isPart19Art48 = watch("generalInfo.isPart19Art48");
  const placingWayCode = watch("generalInfo.placingWayCode");

  // Вторые части заявок отображаются только для конкурса с признаком ч. 19 ст. 48
  const showSecondPartsDate =
    isPart19Art48 && placingWayCode.startsWith("OK");

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>
        Информация о процедуре закупки (сроки)
      </h2>

      <div className={block("form-grid")}>
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
            <span className={block("caption")}>
              Дата и время начала подачи заявок фиксируются автоматически при
              размещении извещения по местному времени организации
            </span>
            {errors.procedureInfo?.submissionEndDate && (
              <span className={block("error")}>
                {errors.procedureInfo.submissionEndDate.message}
              </span>
            )}
          </div>
        </div>

        {showSecondPartsDate && (
          <div className={block("row")}>
            <span className={block("label")}>
              Дата окончания срока рассмотрения и оценки вторых частей заявок
              <sup>*</sup>
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
      </div>
    </section>
  );
};

export default ProcedureDatesSection;
