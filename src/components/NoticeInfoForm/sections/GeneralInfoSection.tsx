import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import { validatePlacingWayAgainstAuctionList } from "../../../services/Okpd2Ref/auctionListControl";
import { useOkpd2Dictionary } from "../../../services/Okpd2Ref/okpd2Ref.api";
import {
  EIS_ARTICLE15_PARTS,
  EIS_ARTICLE15_PART_LABELS,
  inferNotificationType,
} from "../../../services/Eis/eis17Types";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import CustomSelect from "../../UI/CustomSelect";
import {
  ETP_OPTIONS,
  PLACING_WAY_FAMILY_OPTIONS,
  PLACING_WAYS_BY_FAMILY,
} from "../noticeInfo.config";
import styles from "../NoticeInfoForm.module.scss";
import Select from "../../UI/Select";

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
  if (normalized.startsWith("EZT") || normalized.startsWith("EP")) {
    return "single";
  }
  return null;
};

// Конкурсные способы: только для них применяется ч. 19 ст. 48 Закона N 44-ФЗ
const isContestCode = (code?: string): boolean => {
  if (code === "contest") return true;
  return placingWayFamily(code) === "contest";
};

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
  const { register, watch, setValue, getValues } =
    useFormContext<NoticeInfoFormValues>();
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  const generalInfo = watch("generalInfo");
  const isContestWay = isContestCode(generalInfo.placingWayCode);
  const purchaseObjects = watch("purchaseObjects.items") ?? [];

  // Семейство способа: если СЗ его задала, выбор ограничивается подспособами
  // этого семейства; без СЗ доступен полный список
  const lockedFamily = placingWayFamily(lockedPlacingWayCode);

  // Определяем семейство по коду подспособа
  const rawPlacingWay = generalInfo.placingWayCode ?? "";
  const currentFamily = placingWayFamily(rawPlacingWay);
  const family = currentFamily ?? lockedFamily;

  // Подспособы только выбранного семейства
  const availableWays = family ? (PLACING_WAYS_BY_FAMILY[family] ?? []) : [];

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

  // Сброс критериев оценки и организатора при смене подспособа на не-конкурсный
  useEffect(() => {
    if (!isContestWay) {
      const criteria = getValues("participantsRequirements.evaluationCriteria");
      setValue(
        "participantsRequirements.evaluationCriteria",
        criteria.map((c) => ({ ...c, enabled: false })),
      );
      setValue("generalInfo.placementOrganizerType", "customer");
    }
  }, [isContestWay, setValue, getValues]);

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
              {!family && (
                <span className={block("muted")}>
                  Выберите семейство способов закупки
                </span>
              )}
              {lockedFamily && family === lockedFamily && (
                <span className={block("muted")}>
                  Способ определения поставщика зафиксирован служебной записью и
                  позицией плана-графика. Выберите подспособ закупки.
                </span>
              )}

              {/* Выбор семейства — когда не задан */}
              {!family && !lockedFamily && (
                <div className={block("radio-group")}>
                  {PLACING_WAY_FAMILY_OPTIONS.map((fam) => {
                    const ways = PLACING_WAYS_BY_FAMILY[fam.code] ?? [];
                    const firstWay = ways[0];
                    return (
                      <label key={fam.code} className={block("radio")}>
                        <input
                          type="radio"
                          value={firstWay?.code ?? ""}
                          checked={false}
                          onChange={() => {
                            if (firstWay) {
                              setValue(
                                "generalInfo.placingWayCode",
                                firstWay.code,
                              );
                            }
                          }}
                        />
                        <span>{fam.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Подспособы выбранного семейства */}
              {family && availableWays.length > 1 ? (
                <div className={block("radio-group")}>
                  {availableWays.map((way) => (
                    <label key={way.code} className={block("radio")}>
                      <input
                        type="radio"
                        value={way.code}
                        checked={generalInfo.placingWayCode === way.code}
                        onChange={() => {
                          setValue("generalInfo.placingWayCode", way.code);
                          setValue(
                            "notificationType",
                            inferNotificationType(way.code),
                          );
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
                family &&
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

          {isContestWay && (
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
          )}

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
              Сведения о связи с позицией плана-графика (tenderPlan2020Info)
            </span>
            <div className={block("field-col")}>
              <span className={block("value")}>
                № ПГ: {generalInfo.plan2020Number || "—"} · Уникальный №
                позиции: {generalInfo.positionUniqueNumber || "—"}
                {generalInfo.position2020ExtNumber
                  ? ` · Внешний №: ${generalInfo.position2020ExtNumber}`
                  : ""}
                {generalInfo.positionSerialNumber
                  ? ` · № п/п в ПГ: ${generalInfo.positionSerialNumber}`
                  : ""}
              </span>
              <div className={block("sub-grid")}>
                <input
                  type="text"
                  placeholder="Реестровый № плана-графика (plan2020Number)"
                  className={block("input")}
                  {...register("generalInfo.plan2020Number")}
                />
                <input
                  type="text"
                  placeholder="Внешний № позиции ПГ (position2020ExtNumber)"
                  className={block("input")}
                  {...register("generalInfo.position2020ExtNumber")}
                />
              </div>
            </div>
          </div>

          <div className={block("row")}>
            <span className={block("label")}>
              Особенности commonInfo (ЕИС 17.0)
            </span>
            <div className={block("field-col")}>
              <Select
                className={block("select")}
                {...register("generalInfo.article15Features")}
              >
                <option value="">
                  — Без особенностей ст. 15 Закона № 44-ФЗ —
                </option>
                {EIS_ARTICLE15_PARTS.map((code) => (
                  <option key={code} value={code}>
                    {EIS_ARTICLE15_PART_LABELS[code]}
                  </option>
                ))}
              </Select>
              <div className={block("inline-group")}>
                <label className={block("checkbox")}>
                  <input type="checkbox" {...register("generalInfo.isGOZ")} />
                  <span>Гособоронзаказ (isGOZ)</span>
                </label>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("generalInfo.notPublishedOnEIS")}
                  />
                  <span>Не размещать на ОС ЕИС</span>
                </label>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("generalInfo.isBudgetUnionState")}
                  />
                  <span>Бюджет Союзного государства</span>
                </label>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("generalInfo.is449Features")}
                  />
                  <span>Особенности по 449-ФЗ</span>
                </label>
              </div>
            </div>
          </div>

          {/* П. 3 Раздела 1 формы извещения: указание на часть ст. 15 */}
          <div className={block("row")}>
            <span className={block("label")}>
              Указание на часть ст. 15 Закона № 44-ФЗ
            </span>
            <div className={block("field-col")}>
              <input
                type="text"
                className={block("input")}
                placeholder="Например: ч. 1 ст. 15 (закупка для обеспечения государственных нужд)"
                {...register("generalInfo.article15Part")}
              />
            </div>
          </div>

          {/* П. 13 Раздела 1: максимальное значение цены и сумма цен единиц */}
          <div className={block("row")}>
            <span className={block("label")}>
              Максимальное значение цены контракта, ₽
            </span>
            <div className={block("field-col", ["narrow"])}>
              <input
                type="number"
                min={0}
                step="0.01"
                className={block("input")}
                placeholder="При формуле цены или цене единицы (ч. 24 ст. 22)"
                {...register("generalInfo.maxContractPrice", {
                  valueAsNumber: true,
                })}
              />
            </div>
          </div>

          <div className={block("row")}>
            <span className={block("label")}>
              Начальная сумма цен единиц товара, работы, услуги, ₽
            </span>
            <div className={block("field-col", ["narrow"])}>
              <input
                type="number"
                min={0}
                step="0.01"
                className={block("input")}
                placeholder="При закупке по цене единицы (ч. 24 ст. 22)"
                {...register("generalInfo.initialUnitPriceSum", {
                  valueAsNumber: true,
                })}
              />
            </div>
          </div>

          {/* П. 38 Раздела 1: предупреждение об ответственности */}
          <div className={block("row", ["single"])}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("generalInfo.antitrustWarning")}
              />
              <span>
                Предупреждение об административной и уголовной ответственности
                за нарушение антимонопольного законодательства (п. 38 Раздела 1
                формы извещения)
              </span>
            </label>
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
