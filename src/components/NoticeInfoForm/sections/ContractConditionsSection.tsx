import { useFieldArray, useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import AddressCascade from "../../UI/AddressCascade/AddressCascade";
import MoneyInput from "../../UI/MoneyInput/MoneyInput";
import { RUSSIA } from "../../../services/AddressRef/addressRef.schema";
import {
  EIS_DAY_TYPE_OPTIONS,
  LIFECYCLE_CASES_PP1087,
} from "../noticeInfo.config";
import styles from "../NoticeInfoForm.module.scss";

const ContractConditionsSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { register, watch, setValue, control } =
    useFormContext<NoticeInfoFormValues>();

  const conditions = watch("contractConditions");
  const nmck = watch("generalInfo.nmck");
  const generalIkz = watch("generalInfo.ikz");

  const {
    fields: placeFields,
    append: appendPlace,
    remove: removePlace,
  } = useFieldArray({
    control,
    name: "contractConditions.deliveryPlaces",
  });

  const toggleLifecycleCase = (item: string) => {
    const current = conditions.lifecycleCasesPP1087 || [];
    const next = current.includes(item)
      ? current.filter((x) => x !== item)
      : [...current, item];
    setValue("contractConditions.lifecycleCasesPP1087", next);
  };

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>Условия контракта</h2>

      <div className={block("form-grid")}>
        {/* НМЦК и валюта (п. 15 Раздела 1 формы извещения, ПП РФ N 60) */}
        <div className={block("row")}>
          <span className={block("label")}>
            Начальная (максимальная) цена контракта<sup>*</sup>
          </span>
          <div className={block("field-col")}>
            <div className={block("inline-group")}>
              <MoneyInput
                className={block("input", ["phone-num"])}
                value={nmck}
                ariaLabel="Начальная (максимальная) цена контракта"
                onChange={(next) =>
                  setValue("generalInfo.nmck", next, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              <span className={block("muted")}>{conditions.currency}</span>
            </div>
            <div className={block("inline-group")}>
              <span className={block("caption")}>
                Код валюты по ОКВ (maxPriceCurrency)
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                placeholder="643"
                className={block("input", ["code"])}
                {...register("contractConditions.currencyCode")}
              />
              <span className={block("caption")}>
                643 — российский рубль; иное значение — только при закупке в
                иностранной валюте
              </span>
            </div>
          </div>
        </div>

        {/* Аванс, формула цены и общественное обсуждение */}
        <div className={block("row")}>
          <span className={block("label")}>Аванс и обсуждение</span>
          <div className={block("field-col")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("contractConditions.hasAdvance")}
              />
              <span>Предусмотрена выплата аванса</span>
            </label>

            {conditions.hasAdvance && (
              <div className={block("inline-group")}>
                <span>Размер аванса, %:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={block("input", ["code"])}
                  {...register("contractConditions.advancePercent", {
                    valueAsNumber: true,
                  })}
                />
                <span className={block("muted")}>
                  (
                  {(
                    (nmck * (conditions.advancePercent || 0)) /
                    100
                  ).toLocaleString("ru-RU", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  руб.)
                </span>
              </div>
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("contractConditions.usePriceFormulaPP19")}
              />
              <span>
                Указать формулу цены и максимальное значение цены контракта (ПП
                РФ от 13.01.2014 № 19)
              </span>
            </label>

            {conditions.usePriceFormulaPP19 && (
              <input
                type="text"
                placeholder="Введите формулу цены контракта"
                className={block("input")}
                {...register("contractConditions.priceFormulaText")}
              />
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register(
                  "contractConditions.requiresPublicDiscussionArt20",
                )}
              />
              <span>
                Необходимо обязательное общественное обсуждение в соответствии
                со ст. 20 Закона № 44-ФЗ
              </span>
            </label>

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("contractConditions.interbudgetaryTransfer")}
              />
              <span>
                Закупка за счёт средств межбюджетных трансфертов (ЕИС 17.0)
              </span>
            </label>
          </div>
        </div>

        {/* ИКЗ — одной строкой. Расшифровка разрядов живёт в форме позиции
            плана-графика, в извещении она только мешает читать номер. */}
        <div className={block("row")}>
          <span className={block("label")}>
            Идентификационный код закупки (ИКЗ)<sup>*</sup>
          </span>
          <div className={block("field-col")}>
            <span className={block("value", ["ikz-value"])}>
              {generalIkz || "—"}
            </span>
            <span className={block("caption")}>
              Формируется из позиции плана-графика автоматически.
            </span>
          </div>
        </div>

        {/* Сроки исполнения контракта (relativeAndNotRelativeTerms2022Type) */}
        <div className={block("row")}>
          <span className={block("label")}>Сроки исполнения контракта</span>
          <div className={block("field-col")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("contractConditions.isRelativeTerms")}
              />
              <span>Относительные сроки (от даты заключения контракта)</span>
            </label>

            {conditions.isRelativeTerms ? (
              <div className={block("inline-group")}>
                <span>Начало через:</span>
                <input
                  type="number"
                  className={block("input", ["code"])}
                  {...register("contractConditions.startOffsetDays", {
                    valueAsNumber: true,
                  })}
                />
                <select
                  className={block("select")}
                  aria-label="Тип дней начала исполнения"
                  {...register("contractConditions.startDayType")}
                >
                  {EIS_DAY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span>Срок исполнения:</span>
                <input
                  type="number"
                  className={block("input", ["code"])}
                  {...register("contractConditions.durationDays", {
                    valueAsNumber: true,
                  })}
                />
                <select
                  className={block("select")}
                  aria-label="Тип дней срока исполнения"
                  {...register("contractConditions.termDayType")}
                >
                  {EIS_DAY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className={block("sub-box")}>
                <div className={block("sub-grid")}>
                  <div className={block("field-col")}>
                    <span className={block("caption")}>
                      Дата начала исполнения (startDate)
                    </span>
                    <input
                      type="date"
                      className={block("input")}
                      {...register("contractConditions.startDate")}
                    />
                  </div>
                  <div className={block("field-col")}>
                    <span className={block("caption")}>
                      Дата окончания исполнения (endDate)
                    </span>
                    <input
                      type="date"
                      className={block("input")}
                      {...register("contractConditions.endDate")}
                    />
                  </div>
                </div>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register("contractConditions.isFromConclusionDate")}
                  />
                  <span>
                    С даты заключения контракта (isFromConclusionDate)
                  </span>
                </label>
                <label className={block("checkbox")}>
                  <input
                    type="checkbox"
                    {...register(
                      "contractConditions.isNotEarlierConclusionDate",
                    )}
                  />
                  <span>
                    Не ранее даты заключения контракта
                    (isNotEarlierConclusionDate)
                  </span>
                </label>
              </div>
            )}

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("contractConditions.isExecutionStagesTerms")}
              />
              <span>
                Предусмотрены отдельные этапы исполнения контракта
                (isExecutionStagesTerms)
              </span>
            </label>
          </div>
        </div>

        {/* Бюджетные средства */}
        <div className={block("row")}>
          <span className={block("label")}>Бюджетные средства и ОКТМО</span>
          <div className={block("field-col")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("contractConditions.isBudgetFunds")}
              />
              <span>Закупка за счет бюджетных средств</span>
            </label>

            <div className={block("fio-grid")}>
              <input
                type="text"
                placeholder="Наименование бюджета"
                className={block("input")}
                {...register("contractConditions.budgetName")}
              />
              <input
                type="text"
                placeholder="Вид бюджета"
                className={block("input")}
                {...register("contractConditions.budgetLevel")}
              />
              <input
                type="text"
                placeholder="Код ОКТМО"
                className={block("input")}
                {...register("contractConditions.oktmoCode")}
              />
            </div>
          </div>
        </div>

        {/* Контракт жизненного цикла */}
        <div className={block("row")}>
          <span className={block("label")}>Контракт жизненного цикла</span>
          <div className={block("field-col")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("contractConditions.isLifecycleContract")}
              />
              <span>
                С поставщиком (подрядчиком, исполнителем) будет заключен
                контракт жизненного цикла (ПП РФ от 28.11.2013 № 1087)
              </span>
            </label>

            {conditions.isLifecycleContract && (
              <div className={block("sub-box")}>
                {LIFECYCLE_CASES_PP1087.map((item) => (
                  <label key={item} className={block("checkbox")}>
                    <input
                      type="checkbox"
                      checked={conditions.lifecycleCasesPP1087.includes(item)}
                      onChange={() => toggleLifecycleCase(item)}
                    />
                    <span>{item}</span>
                  </label>
                ))}
                <div className={block("sub-grid")}>
                  <div className={block("field-col")}>
                    <span className={block("caption")}>
                      Стоимость поставки товара/работы (КЖЦ), руб.
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      className={block("input")}
                      {...register("contractConditions.lcDeliveryPrice", {
                        setValueAs: (v) =>
                          v === "" || v === null || v === undefined
                            ? undefined
                            : Number(v),
                      })}
                    />
                  </div>
                  <div className={block("field-col")}>
                    <span className={block("caption")}>
                      Стоимость обслуживания/эксплуатации (КЖЦ), руб.
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      className={block("input")}
                      {...register("contractConditions.lcServicePrice", {
                        setValueAs: (v) =>
                          v === "" || v === null || v === undefined
                            ? undefined
                            : Number(v),
                      })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Места поставки — каскад уровней: страна, субъект РФ, муниципальное
            образование, населённый пункт, адрес (Tasks 7, п. 2) */}
        <div className={block("row")}>
          <span className={block("label")}>
            Место поставки товара, выполнения работы или оказания услуги
            <sup>*</sup>
          </span>
          <div className={block("field-col")}>
            {placeFields.map((field, index) => {
              const current =
                watch(`contractConditions.deliveryPlaces.${index}`) ??
                placeFields[index];

              return (
                <div key={field.id} className={block("sub-box")}>
                  <AddressCascade
                    idPrefix={`delivery-place-${index}`}
                    value={current}
                    onChange={(next) =>
                      setValue(
                        `contractConditions.deliveryPlaces.${index}`,
                        {
                          ...current,
                          ...next,
                        } as NoticeInfoFormValues["contractConditions"]["deliveryPlaces"][number],
                        { shouldValidate: true },
                      )
                    }
                  />
                  <div className={block("sub-grid")}>
                    <div className={block("field-col")}>
                      <span className={block("caption")}>
                        Код страны по ОКСМ (по умолчанию 643)
                      </span>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="643"
                        className={block("input")}
                        {...register(
                          `contractConditions.deliveryPlaces.${index}.oksmCode`,
                        )}
                      />
                    </div>
                    <div className={block("field-col")}>
                      <span className={block("caption")}>
                        GUID ГАР (byGARInfoType / GARInfo)
                      </span>
                      <input
                        type="text"
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className={block("input")}
                        {...register(
                          `contractConditions.deliveryPlaces.${index}.garGuid`,
                        )}
                      />
                    </div>
                  </div>
                  {placeFields.length > 1 && (
                    <button
                      type="button"
                      className={block("small-btn", ["danger"])}
                      onClick={() => removePlace(index)}
                    >
                      Удалить место поставки
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              className={block("link-btn")}
              onClick={() =>
                appendPlace({
                  id: String(Date.now()),
                  country: RUSSIA,
                  oksmCode: "643",
                  garGuid: "",
                  region: "",
                  municipality: "",
                  settlement: "",
                  address: "",
                  additionalInfo: "",
                })
              }
            >
              + Добавить место поставки товара, выполнения работы или оказания
              услуги
            </button>
          </div>
        </div>

        {/* Односторонний отказ и несколько участников */}
        <div className={block("row")}>
          <span className={block("label")}>Дополнительные условия</span>
          <div className={block("field-col")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("contractConditions.allowUnilateralRefusalArt95")}
              />
              <span>
                Предусмотрена возможность одностороннего отказа от исполнения
                контракта в соответствии со ст. 95 Закона № 44-ФЗ
              </span>
            </label>

            {conditions.allowUnilateralRefusalArt95 && (
              <textarea
                rows={2}
                placeholder="Порядок / обоснование одностороннего отказа по ст. 95 (oneSideRejectionSt95Text)"
                className={block("input")}
                {...register("contractConditions.oneSideRejectionSt95Text")}
              />
            )}

            <div className={block("radio-group")}>
              <span className={block("muted")}>
                Право заключения контрактов с несколькими участниками закупки
                (ч. 10 ст. 34 44-ФЗ):
              </span>
              <label className={block("radio")}>
                <input
                  type="radio"
                  value="not_established"
                  checked={
                    conditions.multipleWinnersPart10Art34 === "not_established"
                  }
                  onChange={() =>
                    setValue(
                      "contractConditions.multipleWinnersPart10Art34",
                      "not_established",
                    )
                  }
                />
                <span>Не установлено</span>
              </label>
              <label className={block("radio")}>
                <input
                  type="radio"
                  value="established"
                  checked={
                    conditions.multipleWinnersPart10Art34 === "established"
                  }
                  onChange={() =>
                    setValue(
                      "contractConditions.multipleWinnersPart10Art34",
                      "established",
                    )
                  }
                />
                <span>
                  Установлено для заключения контрактов в случаях, указанных в
                  ч. 10 ст. 34 Закона № 44-ФЗ
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContractConditionsSection;
