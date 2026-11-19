import { useFieldArray, useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import Okpd2Select from "../../UI/Okpd2Select/Okpd2Select";
import OkeiSelect from "../../UI/OkeiSelect/OkeiSelect";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../../services/Okpd2Ref/okpd2Ref.api";
import {
  formatRub,
  normingViolation,
} from "../../../services/Okpd2Ref/normingControl";
import { checkOkpd2AuctionList } from "../../../services/Okpd2Ref/auctionListControl";
import {
  checkOkpd2NationalRegime,
  nationalRegimeExpectedLabel,
  validateNationalRegime,
} from "../../../services/NationalRegime/pp1875";
import {
  EIS_PRODUCT_TYPE_OPTIONS,
  EIS_VOLUME_SPECIFYING_METHODS,
  NATIONAL_REGIME_OPTIONS,
} from "../noticeInfo.config";
import NormingRequirementsBlock from "./NormingRequirementsBlock";
import MoneyInput from "../../UI/MoneyInput/MoneyInput";
import styles from "../NoticeInfoForm.module.scss";

const PurchaseObjectsSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { register, watch, setValue, control } =
    useFormContext<NoticeInfoFormValues>();

  const items = watch("purchaseObjects.items");
  const isIndeterminate = watch("purchaseObjects.isIndeterminateVolume");
  // Подпись главного подписанта опускает контроль нормирования до предупреждения
  const breachSignedBy = watch("normingControl.breachConfirmedByName");
  const isBreachSigned = Boolean(breachSignedBy);

  // Справочник ОКПД2 даёт признак нормирования и предельную цену единицы
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "purchaseObjects.items",
  });

  // Национальный режим (ПП РФ N 1875): ожидаемый режим по ОКПД2 сверяется
  // с выбранным в каждой позиции
  const nationalRegimeValidation = validateNationalRegime(
    items.map((item) => ({
      code: item.okpd2OrKtruCode,
      name: item.name,
      declaredMode: item.nationalRegimeType,
    })),
    okpd2Refs,
  );

  const totalSum = items.reduce((acc, item) => acc + (item.totalPrice || 0), 0);

  const handleRecalcRow = (index: number, qty: number, price: number) => {
    const sum = Number((qty * price).toFixed(2));
    setValue(`purchaseObjects.items.${index}.totalPrice`, sum);
  };

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>Объект закупки</h2>

      <div className={block("form-grid")}>
        <div className={block("row", ["single"])}>
          <div className={block("field-col")}>
            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("purchaseObjects.isMedicines")}
              />
              <span>
                Лекарственные препараты (признак устанавливается только при
                закупке лекарственных препаратов)
              </span>
            </label>

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("purchaseObjects.isIndeterminateVolume")}
              />
              <span>
                Невозможно определить количество (объем) закупаемых товаров,
                работ, услуг
              </span>
            </label>

            <label className={block("checkbox")}>
              <input
                type="checkbox"
                {...register("purchaseObjects.isStructuredForm")}
              />
              <span>
                Формировать объект закупки в структурированном виде
                (isStructuredForm, ЕИС 17.0)
              </span>
            </label>
          </div>
        </div>

        <div className={block("row", ["single"])}>
          <div className={block("field-col")}>
            <div className={block("inline-group")}>
              <button
                type="button"
                className={block("small-btn")}
                onClick={() =>
                  append({
                    id: String(Date.now()),
                    externalSid: "",
                    productType: "PRODUCT",
                    okpd2OrKtruCode: "",
                    ktruCode: "",
                    okeiCode: "",
                    name: "",
                    unit: "Условная единица",
                    quantity: 1,
                    unitPrice: 0,
                    totalPrice: 0,
                    volumeSpecifyingMethod: isIndeterminate ? "SF" : "QF",
                    volumeTextForm: "",
                    trademarks: "",
                    isEquivalentDeliveryAllowed: false,
                    isMedicalProduct: false,
                    isSoftware: false,
                    isSupplyDuringWorks: false,
                    nationalRegimeType: "none",
                    imposibilityBan: false,
                    imposibilityBanReason: "",
                  })
                }
              >
                + Добавить товар, работу, услугу
              </button>
              <span className={block("muted")}>
                Итого по позициям:{" "}
                <strong>
                  {totalSum.toLocaleString("ru-RU", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  РУБЛЬ
                </strong>
              </span>
            </div>

            {fields.map((field, index) => {
              const currentQty = items[index]?.quantity || 0;
              const currentPrice = items[index]?.unitPrice || 0;
              // Позиция подпадает под нормирование и её цена за единицу
              // сравнивается с предельной ценой (ПП РФ N 926)
              const normedRef = findOkpd2ByCode(
                okpd2Refs,
                items[index]?.okpd2OrKtruCode,
              );
              const violation = normingViolation(
                {
                  code: items[index]?.okpd2OrKtruCode,
                  unitPrice: items[index]?.unitPrice,
                },
                okpd2Refs,
              );
              const auctionCheck = checkOkpd2AuctionList(
                items[index]?.okpd2OrKtruCode,
                okpd2Refs,
              );
              const regimeCheck = checkOkpd2NationalRegime(
                items[index]?.okpd2OrKtruCode,
                okpd2Refs,
              );
              const regimeIssue = nationalRegimeValidation.issues.find(
                (issue) => issue.code === regimeCheck.code,
              );

              return (
                <div key={field.id} className={block("sub-box")}>
                  <div className={block("object-grid")}>
                    <div>
                      <span className={block("caption")}>
                        Код позиции (ОКПД2 / КТРУ)
                      </span>
                      {/* Код выбирается из справочника ОКПД2 с поиском по коду
                          и наименованию; наименование подставляется в позицию */}
                      <Okpd2Select
                        code={items[index]?.okpd2OrKtruCode}
                        name={items[index]?.name}
                        onSelect={(item) => {
                          setValue(
                            `purchaseObjects.items.${index}.okpd2OrKtruCode`,
                            item?.code ?? "",
                          );

                          if (item && !items[index]?.name) {
                            setValue(
                              `purchaseObjects.items.${index}.name`,
                              item.name,
                            );
                          }
                        }}
                      />
                      {normedRef?.isNormed && (
                        <span className={block("yellow-warning")}>
                          <span className={block("warning-badge")}>!</span>
                          <span>
                            Код {normedRef.code} подлежит обязательному
                            нормированию.
                            {normedRef.normLimit !== undefined
                              ? ` Предельная цена единицы — ${formatRub(normedRef.normLimit)}.`
                              : " Предельная цена единицы устанавливается правовым актом о нормировании."}
                          </span>
                        </span>
                      )}
                      {auctionCheck.inAuctionList && (
                        <span className={block("yellow-warning")}>
                          <span className={block("warning-badge")}>!</span>
                          <span>
                            Аукционный перечень (РП РФ № 471-р): для кода{" "}
                            {auctionCheck.code} обязателен электронный аукцион
                            (кроме котировок / ед. поставщика).
                          </span>
                        </span>
                      )}
                      {regimeCheck.regime && (
                        <span className={block("yellow-warning")}>
                          <span className={block("warning-badge")}>!</span>
                          <span>
                            ПП РФ № 1875:{" "}
                            {regimeCheck.regime === "ban"
                              ? "запрет (приложение № 1)"
                              : "ограничение (приложение № 2)"}
                            {regimeCheck.groupLabel
                              ? ` — ${regimeCheck.groupLabel}`
                              : ""}
                            .
                          </span>
                        </span>
                      )}
                    </div>

                    <div>
                      <span className={block("caption")}>
                        Наименование товара, работы, услуги
                      </span>
                      <input
                        type="text"
                        placeholder="Наименование позиции"
                        className={block("input")}
                        {...register(`purchaseObjects.items.${index}.name`)}
                      />
                    </div>
                    <div>
                      <span className={block("caption")}>Ед. изм.</span>
                      <OkeiSelect
                        compact
                        value={items[index]?.unit ?? ""}
                        valueMode="name"
                        placeholder="Ед. по ОКЕИ…"
                        onChange={(nextUnit, okeiItem) => {
                          setValue(
                            `purchaseObjects.items.${index}.unit`,
                            nextUnit,
                            { shouldDirty: true },
                          );
                          if (okeiItem?.code) {
                            setValue(
                              `purchaseObjects.items.${index}.okeiCode`,
                              okeiItem.code,
                              { shouldDirty: true },
                            );
                          }
                        }}
                      />
                    </div>
                    <div>
                      <span className={block("caption")}>
                        {isIndeterminate ? "Объем (не опр.)" : "Количество"}
                      </span>
                      <input
                        type="number"
                        step="any"
                        disabled={isIndeterminate}
                        className={block("input")}
                        {...register(
                          `purchaseObjects.items.${index}.quantity`,
                          {
                            valueAsNumber: true,
                            onChange: (e) =>
                              handleRecalcRow(
                                index,
                                Number(e.target.value) || 0,
                                currentPrice,
                              ),
                          },
                        )}
                      />
                    </div>
                    <div>
                      <span className={block("caption")}>
                        Цена за ед., руб.
                      </span>
                      {/* Цена единицы нормируемой позиции сверх предельной —
                          ошибка; она гасится только подписью главного подписанта */}
                      <MoneyInput
                        className={block(
                          "input",
                          violation && !isBreachSigned ? ["invalid"] : [],
                        )}
                        value={items[index]?.unitPrice}
                        ariaLabel={`Цена за единицу, позиция ${index + 1}`}
                        onChange={(next) => {
                          setValue(
                            `purchaseObjects.items.${index}.unitPrice`,
                            next,
                            { shouldDirty: true },
                          );
                          handleRecalcRow(index, currentQty, next);
                        }}
                      />
                      {violation &&
                        (isBreachSigned ? (
                          <span className={block("yellow-warning")}>
                            <span className={block("warning-badge")}>!</span>
                            <span>
                              Предельная цена превышена на{" "}
                              {formatRub(violation.excess)}, нарушение принято
                              главным подписантом.
                            </span>
                          </span>
                        ) : (
                          <span className={block("red-note")}>
                            Так делать нельзя: цена за единицу{" "}
                            {formatRub(violation.unitPrice)} превышает
                            предельную {formatRub(violation.normLimit)} (ПП РФ N
                            926). Сохранение извещения заблокировано до подписи
                            главного подписанта.
                          </span>
                        ))}
                    </div>

                    <div>
                      <span className={block("caption")}>Стоимость, руб.</span>
                      <MoneyInput
                        className={block("input")}
                        value={items[index]?.totalPrice}
                        readOnly
                        ariaLabel={`Стоимость, позиция ${index + 1}`}
                      />
                    </div>
                  </div>

                  {/* Реквизиты позиции для XSD ЕИС 17.0 */}
                  <div className={block("sub-grid")}>
                    <div className={block("field-col")}>
                      <span className={block("caption")}>
                        Тип объекта (productTypeEnumType)
                      </span>
                      <select
                        className={block("select")}
                        {...register(
                          `purchaseObjects.items.${index}.productType`,
                        )}
                      >
                        {EIS_PRODUCT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={block("field-col")}>
                      <span className={block("caption")}>
                        Код КТРУ (если применимо)
                      </span>
                      <input
                        type="text"
                        placeholder="Например, 26.20.11.110-00000001"
                        className={block("input")}
                        {...register(`purchaseObjects.items.${index}.ktruCode`)}
                      />
                    </div>
                    <div className={block("field-col")}>
                      <span className={block("caption")}>Код ОКЕИ</span>
                      <input
                        type="text"
                        placeholder="796"
                        className={block("input")}
                        {...register(`purchaseObjects.items.${index}.okeiCode`)}
                      />
                    </div>
                    <div className={block("field-col")}>
                      <span className={block("caption")}>
                        Способ указания объёма
                      </span>
                      <select
                        className={block("select")}
                        {...register(
                          `purchaseObjects.items.${index}.volumeSpecifyingMethod`,
                        )}
                      >
                        {EIS_VOLUME_SPECIFYING_METHODS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {items[index]?.volumeSpecifyingMethod === "SF" && (
                    <input
                      type="text"
                      placeholder="Текстовое описание объёма (volumeTextForm)"
                      className={block("input")}
                      {...register(
                        `purchaseObjects.items.${index}.volumeTextForm`,
                      )}
                    />
                  )}

                  <div className={block("inline-group")}>
                    <label className={block("checkbox")}>
                      <input
                        type="checkbox"
                        {...register(
                          `purchaseObjects.items.${index}.isMedicalProduct`,
                        )}
                      />
                      <span>Медицинское изделие</span>
                    </label>
                    <label className={block("checkbox")}>
                      <input
                        type="checkbox"
                        {...register(
                          `purchaseObjects.items.${index}.isSoftware`,
                        )}
                      />
                      <span>Программное обеспечение (ПО)</span>
                    </label>
                    <label className={block("checkbox")}>
                      <input
                        type="checkbox"
                        {...register(
                          `purchaseObjects.items.${index}.isEquivalentDeliveryAllowed`,
                        )}
                      />
                      <span>Допускается поставка эквивалента</span>
                    </label>
                  </div>

                  <div className={block("inline-group")}>
                    <span className={block("caption")}>
                      Нац. режим (ст. 14 44-ФЗ):
                    </span>
                    <select
                      className={block("select")}
                      {...register(
                        `purchaseObjects.items.${index}.nationalRegimeType`,
                      )}
                    >
                      {NATIONAL_REGIME_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className={block("small-btn", ["danger"])}
                      onClick={() => remove(index)}
                    >
                      Удалить позицию
                    </button>
                  </div>

                  <label className={block("checkbox")}>
                    <input
                      type="checkbox"
                      {...register(
                        `purchaseObjects.items.${index}.imposibilityBan`,
                      )}
                    />
                    <span>
                      Обстоятельства невозможности применения запрета/ограничения
                      по ст. 14 (imposibilityBan)
                    </span>
                  </label>

                  {items[index]?.imposibilityBan && (
                    <textarea
                      rows={2}
                      placeholder="Обоснование невозможности применения запрета/ограничения (imposibilityBanReason)"
                      className={block("input")}
                      {...register(
                        `purchaseObjects.items.${index}.imposibilityBanReason`,
                      )}
                    />
                  )}

                  {regimeIssue && (
                    <span
                      className={block(
                        regimeIssue.level === "error"
                          ? "red-note"
                          : regimeIssue.level === "warning"
                            ? "yellow-warning"
                            : "muted",
                      )}
                    >
                      {regimeIssue.message}
                    </span>
                  )}

                  {/* Типовые требования по п. 7 ПП 926 для нормируемых позиций */}
                  <NormingRequirementsBlock
                    index={index}
                    okpd2OrKtruCode={items[index]?.okpd2OrKtruCode}
                  />
                </div>
              );
            })}

            {/* Сводка по национальному режиму (ПП РФ N 1875) */}
            {nationalRegimeValidation.expectedMode && (
              <div className={block("field-col")}>
                <span className={block("muted")}>
                  Национальный режим по ПП РФ № 1875: по объектам закупки
                  ожидается «
                  {nationalRegimeExpectedLabel(
                    nationalRegimeValidation.expectedMode,
                  )}
                  ».
                </span>
                {nationalRegimeValidation.issues.map((issue, issueIndex) => (
                  <span
                    key={`regime-${issue.code}-${issueIndex}`}
                    className={block(
                      issue.level === "error"
                        ? "red-note"
                        : issue.level === "warning"
                          ? "yellow-warning"
                          : "muted",
                    )}
                  >
                    {issue.message}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PurchaseObjectsSection;
