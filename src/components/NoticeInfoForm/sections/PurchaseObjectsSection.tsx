import { useFieldArray, useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import Okpd2Select from "../../UI/Okpd2Select/Okpd2Select";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../../services/Okpd2Ref/okpd2Ref.api";
import {
  formatRub,
  normingViolation,
} from "../../../services/Okpd2Ref/normingControl";
import { NATIONAL_REGIME_OPTIONS } from "../noticeInfo.config";
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
                    okpd2OrKtruCode: "",
                    name: "",
                    unit: "Условная единица",
                    quantity: 1,
                    unitPrice: 0,
                    totalPrice: 0,
                    trademarks: "",
                    isSupplyDuringWorks: false,
                    nationalRegimeType: "none",
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
                      <input
                        type="text"
                        className={block("input")}
                        {...register(`purchaseObjects.items.${index}.unit`)}
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
                      <input
                        type="number"
                        step="any"
                        className={block(
                          "input",
                          violation && !isBreachSigned ? ["invalid"] : [],
                        )}
                        {...register(
                          `purchaseObjects.items.${index}.unitPrice`,
                          {
                            valueAsNumber: true,
                            onChange: (e) =>
                              handleRecalcRow(
                                index,
                                currentQty,
                                Number(e.target.value) || 0,
                              ),
                          },
                        )}
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
                      <input
                        type="number"
                        step="any"
                        readOnly
                        className={block("input")}
                        {...register(
                          `purchaseObjects.items.${index}.totalPrice`,
                          { valueAsNumber: true },
                        )}
                      />
                    </div>
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
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PurchaseObjectsSection;
