import { useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import { validatePlacingWayAgainstAuctionList } from "../../../services/Okpd2Ref/auctionListControl";
import { useOkpd2Dictionary } from "../../../services/Okpd2Ref/okpd2Ref.api";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import CustomSelect from "../../UI/CustomSelect";
import { ETP_OPTIONS, PLACING_WAYS_ALL } from "../noticeInfo.config";
import styles from "../NoticeInfoForm.module.scss";

const GeneralInfoSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { register, watch, setValue } = useFormContext<NoticeInfoFormValues>();
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  const generalInfo = watch("generalInfo");
  const purchaseObjects = watch("purchaseObjects.items") ?? [];
  const auctionValidation = validatePlacingWayAgainstAuctionList(
    generalInfo.placingWayCode,
    purchaseObjects.map((item) => ({
      code: item?.okpd2OrKtruCode,
      name: item?.name,
    })),
    okpd2Refs,
  );

  const handleSelectEtp = (etpName: string) => {
    setValue("generalInfo.etpName", etpName);
    const found = ETP_OPTIONS.find((item) => item.name === etpName);
    if (found) {
      setValue("generalInfo.etpUrl", found.url);
    }
  };

  return (
    <>
      <section className={block("section")}>
        <h2 className={block("section-title")}>Общая информация</h2>

        <div className={block("form-grid")}>
          <div className={block("row")}>
            <span className={block("label")}>Номер извещения</span>
            <span className={block("value")}>
              {generalInfo.noticeNumber ||
                "Генерируется автоматически после размещения"}
            </span>
          </div>

          <div className={block("row")}>
            <span className={block("label")}>
              Способ определения поставщика (подрядчика, исполнителя)
              <sup>*</sup>
            </span>
            <div className={block("field-col")}>
              <div className={block("radio-group")}>
                {PLACING_WAYS_ALL.map((way) => (
                  <label key={way.code} className={block("radio")}>
                    <input
                      type="radio"
                      value={way.code}
                      checked={generalInfo.placingWayCode === way.code}
                      onChange={() =>
                        setValue("generalInfo.placingWayCode", way.code)
                      }
                    />
                    <span>{way.label}</span>
                  </label>
                ))}
              </div>

              {auctionValidation.hasViolation && auctionValidation.warningMessage && (
                <div className={block("danger-warning")} role="alert">
                  <span className={block("danger-badge")}>!</span>
                  <div>
                    <div>{auctionValidation.warningMessage}</div>
                    <button
                      type="button"
                      className={block("link-btn")}
                      onClick={() =>
                        setValue("generalInfo.placingWayCode", "EA20")
                      }
                    >
                      Переключить способ на электронный аукцион (EA20)
                    </button>
                  </div>
                </div>
              )}

              {!auctionValidation.hasViolation && auctionValidation.infoMessage && (
                <div className={block("yellow-warning")}>
                  <span className={block("warning-badge")}>i</span>
                  <span>{auctionValidation.infoMessage}</span>
                </div>
              )}

              <p className={block("red-note")}>
                В случае проведения открытого конкурса с учетом особенностей,
                предусмотренных ч. 19 ст. 48 Закона № 44-ФЗ должен быть
                проставлен признак «Конкурс проводится в соответствии с ч. 19
                ст. 48 Закона № 44-ФЗ»
              </p>

              <label className={block("checkbox")}>
                <input
                  type="checkbox"
                  {...register("generalInfo.isPart19Art48")}
                />
                <span>
                  Конкурс проводится в соответствии с ч. 19 ст. 48 Закона №
                  44-ФЗ
                </span>
              </label>
            </div>
          </div>

          <div className={block("row")}>
            <span className={block("label")}>
              Наименование электронной площадки в
              информационно-телекоммуникационной сети «Интернет»<sup>*</sup>
            </span>
            <div className={block("field-col", ["narrow"])}>
              <CustomSelect
                listData={ETP_OPTIONS}
                selectedValue={generalInfo.etpName}
                getKey={(item) => item.name}
                getLabel={(item) => item.name}
                renderItem={(item) => item.name}
                onClick={(val) => handleSelectEtp(String(val))}
              />
            </div>
          </div>

          <div className={block("row")}>
            <span className={block("label")}>
              Адрес электронной площадки в информационно-телекоммуникационной
              сети «Интернет»<sup>*</sup>
            </span>
            <span className={block("value")}>{generalInfo.etpUrl}</span>
          </div>

          <div className={block("row")}>
            <span className={block("label")}>
              Размещение осуществляет<sup>*</sup>
            </span>
            <div className={block("radio-group")}>
              <label className={block("radio")}>
                <input
                  type="radio"
                  value="customer"
                  checked={generalInfo.placementOrganizerType === "customer"}
                  onChange={() =>
                    setValue("generalInfo.placementOrganizerType", "customer")
                  }
                />
                <span>Заказчик</span>
              </label>
              <label className={block("radio")}>
                <input
                  type="radio"
                  value="joint_organizer"
                  checked={
                    generalInfo.placementOrganizerType === "joint_organizer"
                  }
                  onChange={() =>
                    setValue(
                      "generalInfo.placementOrganizerType",
                      "joint_organizer"
                    )
                  }
                />
                <span>
                  Заказчик в качестве Организатора совместного конкурса
                </span>
              </label>
            </div>
          </div>

          <div className={block("row")}>
            <span className={block("label")}>
              Согласование уполномоченным органом
            </span>
            <span className={block("value")}>
              {generalInfo.authorizedBodyApproval}
            </span>
          </div>

          <div className={block("row")}>
            <span className={block("label")}>
              Наименование объекта закупки<sup>*</sup>
            </span>
            <div className={block("field-col")}>
              <textarea
                rows={2}
                className={block("textarea")}
                {...register("generalInfo.orderName")}
              />
              <div className={block("yellow-warning")}>
                <span className={block("warning-badge")}>!</span>
                <span>
                  В проекте электронного контракта, направляемом победителю
                  электронной процедуры, наименование объекта закупки будет
                  автоматически заполнено в поле «Предмет контракта» и
                  недоступно для редактирования
                </span>
              </div>
            </div>
          </div>

          <div className={block("row")}>
            <span className={block("label")}>
              Сведения о связи с позицией плана-графика
            </span>
            <span className={block("value")}>
              {generalInfo.planPositionNumber} (ИКЗ: {generalInfo.ikz})
            </span>
          </div>
        </div>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>
          Информация о заключении контракта на поставку товара, необходимого
          для обеспечения нормального жизнеобеспечения
        </h2>

        <div className={block("form-grid")}>
          <div className={block("row", ["single"])}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("purchaseObjectsCh9St37")}
              />
              <span>
                Предметом контракта является поставка товара, необходимого для
                нормального жизнеобеспечения в случаях, указанных в ч. 9 ст. 37
                Закона 44-ФЗ
              </span>
            </label>
          </div>
        </div>
      </section>
    </>
  );
};

export default GeneralInfoSection;
