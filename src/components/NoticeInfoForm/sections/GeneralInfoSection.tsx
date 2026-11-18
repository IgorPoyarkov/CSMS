import { useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import { validatePlacingWayAgainstAuctionList } from "../../../services/Okpd2Ref/auctionListControl";
import { useOkpd2Dictionary } from "../../../services/Okpd2Ref/okpd2Ref.api";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import CustomSelect from "../../UI/CustomSelect";
import { ETP_OPTIONS, PLACING_WAYS_ALL } from "../noticeInfo.config";
import styles from "../NoticeInfoForm.module.scss";

interface GeneralInfoSectionProps {
  /**
   * Способ определения поставщика, зафиксированный служебной запиской.
   * Способ в извещении не выбирается — из него берётся семейство
   * (конкурс / аукцион / котировки / единственный поставщик), внутри которого
   * выбирается подспособ (например, конкурс на строительство — OKB20).
   */
  lockedPlacingWayCode?: string;
}

type PlacingWayFamily = "contest" | "auction" | "quotation" | "single";

const PLACING_WAY_FAMILY_LABELS: Record<PlacingWayFamily, string> = {
  contest: "Конкурс",
  auction: "Электронный аукцион",
  quotation: "Электронный запрос котировок",
  single: "Закупка у единственного поставщика",
};

const placingWayFamily = (code?: string): PlacingWayFamily | null => {
  const normalized = (code ?? "").trim().toUpperCase();
  if (normalized.startsWith("OK") || normalized.startsWith("EOK")) {
    return "contest";
  }
  if (normalized.startsWith("EA")) return "auction";
  if (normalized.startsWith("ZK")) return "quotation";
  if (normalized.startsWith("EP")) return "single";
  return null;
};

// Конкурсные способы: только для них применяется ч. 19 ст. 48 Закона N 44-ФЗ
const isContestCode = (code?: string): boolean =>
  placingWayFamily(code) === "contest";

// Строительство, реконструкция и капремонт: по п. 8 ч. 1 ст. 33 44-ФЗ
// проводится открытый конкурс в электронной форме (OKB20)
const isBuildingOkpd2 = (code?: string): boolean => {
  const digits = (code ?? "").replace(/\D/g, "");
  return (
    digits.startsWith("41") ||
    digits.startsWith("42") ||
    digits.startsWith("43")
  );
};

const GeneralInfoSection = ({
  lockedPlacingWayCode,
}: GeneralInfoSectionProps) => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { register, watch, setValue } = useFormContext<NoticeInfoFormValues>();
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  const generalInfo = watch("generalInfo");
  const isContestWay = isContestCode(generalInfo.placingWayCode);
  const purchaseObjects = watch("purchaseObjects.items") ?? [];

  // Семейство способа: если СЗ его задала, выбор ограничивается подспособами
  // этого семейства; без СЗ доступен полный список
  const lockedFamily = placingWayFamily(lockedPlacingWayCode);
  const currentFamily = placingWayFamily(generalInfo.placingWayCode);
  const family = currentFamily ?? lockedFamily;
  const availableWays = lockedFamily
    ? PLACING_WAYS_ALL.filter(
        (way) => placingWayFamily(way.code) === (currentFamily ?? lockedFamily),
      )
    : PLACING_WAYS_ALL;

  // Подсказка по подспособу: строительные ОКПД2 требуют конкурса OKB20
  const buildingRecommended =
    family === "contest" &&
    generalInfo.placingWayCode !== "OKB20" &&
    purchaseObjects.some((item) => isBuildingOkpd2(item?.okpd2OrKtruCode));
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
              {family && (
                <span className={block("value")}>
                  Способ: {PLACING_WAY_FAMILY_LABELS[family]}
                </span>
              )}
              {lockedFamily && family === lockedFamily && (
                <span className={block("muted")}>
                  Способ определения поставщика зафиксирован служебной записью и
                  позицией плана-графика. Выберите подспособ закупки.
                </span>
              )}

              {availableWays.length > 1 ? (
                <div className={block("radio-group")}>
                  {availableWays.map((way) => (
                    <label key={way.code} className={block("radio")}>
                      <input
                        type="radio"
                        value={way.code}
                        checked={generalInfo.placingWayCode === way.code}
                        onChange={() => {
                          setValue("generalInfo.placingWayCode", way.code);
                          // Признак ч. 19 ст. 48 относится только к конкурсу
                          if (!isContestCode(way.code)) {
                            setValue("generalInfo.isPart19Art48", false);
                          }
                        }}
                      />
                      <span>{way.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                availableWays.length === 1 && (
                  <span className={block("value")}>
                    {availableWays[0].label} ({availableWays[0].code})
                  </span>
                )
              )}

              {buildingRecommended && (
                <div className={block("yellow-warning")}>
                  <span className={block("warning-badge")}>i</span>
                  <div>
                    <div>
                      По ОКПД2 объекта закупки (строительство, реконструкция,
                      капитальный ремонт) применяется открытый конкурс в
                      электронной форме по п. 8 ч. 1 ст. 33 Закона № 44-ФЗ.
                    </div>
                    <button
                      type="button"
                      className={block("link-btn")}
                      onClick={() =>
                        setValue("generalInfo.placingWayCode", "OKB20")
                      }
                    >
                      Выбрать подспособ OKB20
                    </button>
                  </div>
                </div>
              )}

              {auctionValidation.hasViolation &&
                auctionValidation.warningMessage && (
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

              {!auctionValidation.hasViolation &&
                auctionValidation.infoMessage && (
                  <div className={block("yellow-warning")}>
                    <span className={block("warning-badge")}>i</span>
                    <span>{auctionValidation.infoMessage}</span>
                  </div>
                )}

              {isContestWay && (
                <>
                  <p className={block("red-note")}>
                    В случае проведения открытого конкурса с учетом
                    особенностей, предусмотренных ч. 19 ст. 48 Закона № 44-ФЗ
                    должен быть проставлен признак «Конкурс проводится в
                    соответствии с ч. 19 ст. 48 Закона № 44-ФЗ»
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
                </>
              )}
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
                      "joint_organizer",
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
              Уникальный номер позиции:{" "}
              {generalInfo.positionUniqueNumber || "—"}
              {generalInfo.positionSerialNumber
                ? ` · № позиции в плане-графике: ${generalInfo.positionSerialNumber}`
                : ""}
            </span>
          </div>
        </div>
      </section>

      <section className={block("section")}>
        <h2 className={block("section-title")}>
          Информация о заключении контракта на поставку товара, необходимого для
          обеспечения нормального жизнеобеспечения
        </h2>

        <div className={block("form-grid")}>
          <div className={block("row", ["single"])}>
            <label className={block("checkbox")}>
              <input type="checkbox" {...register("purchaseObjectsCh9St37")} />
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
