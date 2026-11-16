import { useFieldArray, useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import AddressCascade from "../../UI/AddressCascade/AddressCascade";
import { RUSSIA } from "../../../services/AddressRef/addressRef.schema";
import { LIFECYCLE_CASES_PP1087 } from "../noticeInfo.config";
import styles from "../NoticeInfoForm.module.scss";

const ContractConditionsSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { register, watch, setValue, control } =
    useFormContext<NoticeInfoFormValues>();

  const conditions = watch("contractConditions");
  const nmck = watch("generalInfo.nmck");

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
        {/* НМЦК и валюта */}
        <div className={block("row")}>
          <span className={block("label")}>
            Начальная (максимальная) цена контракта<sup>*</sup>
          </span>
          <div className={block("inline-group")}>
            <input
              type="number"
              step="any"
              className={block("input", ["phone-num"])}
              {...register("generalInfo.nmck", { valueAsNumber: true })}
            />
            <span className={block("muted")}>{conditions.currency}</span>
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
          </div>
        </div>

        {/* Составные части ИКЗ */}
        <div className={block("row")}>
          <span className={block("label")}>
            Сведения для формирования ИКЗ<sup>*</sup>
          </span>
          <div className={block("ikz-grid")}>
            <div>
              <span className={block("caption")}>Год размещения</span>
              <input
                type="text"
                maxLength={4}
                className={block("input")}
                {...register("contractConditions.ikzYear")}
              />
            </div>
            <div>
              <span className={block("caption")}>Код заказчика</span>
              <input
                type="text"
                maxLength={20}
                className={block("input")}
                {...register("contractConditions.ikzCustomerCode")}
              />
            </div>
            <div>
              <span className={block("caption")}>№ в плане-графике</span>
              <input
                type="text"
                maxLength={4}
                className={block("input")}
                {...register("contractConditions.ikzPlanNumber")}
              />
            </div>
            <div>
              <span className={block("caption")}>Порядковый №</span>
              <input
                type="text"
                maxLength={3}
                className={block("input")}
                {...register("contractConditions.ikzOrderNumber")}
              />
            </div>
            <div>
              <span className={block("caption")}>Код ОКПД2</span>
              <input
                type="text"
                maxLength={6}
                className={block("input")}
                {...register("contractConditions.ikzOkpd2")}
              />
            </div>
            <div>
              <span className={block("caption")}>Код КВР</span>
              <input
                type="text"
                maxLength={3}
                className={block("input")}
                {...register("contractConditions.ikzKvr")}
              />
            </div>
          </div>
        </div>

        {/* Сроки исполнения контракта */}
        <div className={block("row")}>
          <span className={block("label")}>Сроки исполнения контракта</span>
          <div className={block("field-col")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("contractConditions.isRelativeTerms")}
              />
              <span>Относительные сроки (в календарных днях)</span>
            </label>

            <div className={block("inline-group")}>
              <span>Начало через (дней с даты заключения):</span>
              <input
                type="number"
                className={block("input", ["code"])}
                {...register("contractConditions.startOffsetDays", {
                  valueAsNumber: true,
                })}
              />
              <span>Срок исполнения (дней):</span>
              <input
                type="number"
                className={block("input", ["code"])}
                {...register("contractConditions.durationDays", {
                  valueAsNumber: true,
                })}
              />
            </div>
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
