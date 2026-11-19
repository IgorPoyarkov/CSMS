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
  const normalizedCode = (placingWayCode ?? "").trim().toUpperCase();
  const isContest =
    normalizedCode.startsWith("OK") || normalizedCode.startsWith("EOK");
  const isAuction = normalizedCode.startsWith("EA");

  // Вторые части заявок отображаются для конкурса (обязательно в EOK2020)
  const showSecondPartsDate =
    isContest || (isPart19Art48 && placingWayCode.startsWith("OK"));

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>
        Информация о процедуре закупки (сроки ЕИС 17.0)
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
                Дата процедуры подачи предложений о цене (submissionProcedureDate)
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
