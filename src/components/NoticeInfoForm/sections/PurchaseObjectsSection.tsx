import { Fragment } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import useUtils from "../../../hooks/useUtils";
import type { NoticeInfoFormValues } from "../../../services/Procurements/noticeInfo.schema";
import Okpd2Select from "../../UI/Okpd2Select/Okpd2Select";
import KtruSelect from "../../UI/KtruSelect/KtruSelect";
import OkeiSelect from "../../UI/OkeiSelect/OkeiSelect";
import MoneyInput from "../../UI/MoneyInput/MoneyInput";
import CustomCheckbox from "../../UI/CustomCheckbox";
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
  findKtruByCode,
  useKtruDictionary,
} from "../../../services/KtruRef/ktruRef.api";
import { checkKtruUsage } from "../../../services/KtruRef/ktruControl";
import type { KtruRef } from "../../../services/KtruRef/ktruRef.schema";
import type { Okpd2Ref } from "../../../services/Okpd2Ref/okpd2Ref.schema";
import { NATIONAL_REGIME_OPTIONS } from "../noticeInfo.config";
import NormingRequirementsBlock from "./NormingRequirementsBlock";
import styles from "../NoticeInfoForm.module.scss";

/**
 * Объект закупки в извещении.
 *
 * Порядок секции повторяет логику заказчика: сначала видно, какие позиции
 * ОКПД2 / КТРУ он выбрал (блок над таблицей), затем сводная таблица, в которой
 * позиции можно править и удалять, и один общий набор характеристик.
 * Национальный режим приходит из служебной записки, но при смене кода
 * подставляется заново по ПП РФ № 1875.
 */
const PurchaseObjectsSection = () => {
  const { bem } = useUtils();
  const block = bem(styles, "eis-main");
  const { register, watch, setValue, control } =
    useFormContext<NoticeInfoFormValues>();

  const items = watch("purchaseObjects.items") ?? [];
  const isIndeterminate = watch("purchaseObjects.isIndeterminateVolume");
  // Подпись главного подписанта опускает контроль нормирования до предупреждения
  const breachSignedBy = watch("normingControl.breachConfirmedByName");
  const isBreachSigned = Boolean(breachSignedBy);

  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  const { data: ktruRefs = [] } = useKtruDictionary();

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

  // Выбор ОКПД2: подставляем наименование, национальный режим по ПП 1875
  // и сбрасываем КТРУ, если оно относится к другому коду
  const handleSelectOkpd2 = (index: number, item: Okpd2Ref | null) => {
    const code = item?.code ?? "";
    setValue(`purchaseObjects.items.${index}.okpd2OrKtruCode`, code, {
      shouldDirty: true,
    });

    if (item && !items[index]?.name) {
      setValue(`purchaseObjects.items.${index}.name`, item.name);
    }

    const expected = checkOkpd2NationalRegime(code, okpd2Refs);
    setValue(
      `purchaseObjects.items.${index}.nationalRegimeType`,
      expected.regime ?? "none",
      { shouldDirty: true },
    );

    const currentKtru = items[index]?.ktruCode;
    if (currentKtru) {
      const allowed = ktruRefs.some(
        (k) => k.ktruCode === currentKtru && k.okpd2Code === code,
      );
      if (!allowed) {
        setValue(`purchaseObjects.items.${index}.ktruCode`, "");
        setValue(`purchaseObjects.items.${index}.ktruName`, "");
      }
    }
  };

  // Выбор позиции КТРУ: наименование и единица измерения каталога
  const handleSelectKtru = (index: number, item: KtruRef | null) => {
    setValue(`purchaseObjects.items.${index}.ktruCode`, item?.ktruCode ?? "", {
      shouldDirty: true,
    });
    setValue(`purchaseObjects.items.${index}.ktruName`, item?.name ?? "", {
      shouldDirty: true,
    });

    if (item) {
      if (!items[index]?.name) {
        setValue(`purchaseObjects.items.${index}.name`, item.name);
      }
      if (item.unit && !items[index]?.unit) {
        setValue(`purchaseObjects.items.${index}.unit`, item.unit);
      }
    }
  };

  return (
    <section className={block("section")}>
      <h2 className={block("section-title")}>Объект закупки</h2>

      {/* Выбранные позиции ОКПД2 / КТРУ — над остальными полями, чтобы было
          видно, что именно выбрал заказчик */}
      <div className={block("object-selection")}>
        <span className={block("caption")}>
          Позиции ОКПД2 / КТРУ, выбранные заказчиком
        </span>
        {items.length === 0 ? (
          <span className={block("muted")}>
            Позиции не выбраны — добавьте товар, работу или услугу в таблице.
          </span>
        ) : (
          <ul className={block("selection-list")}>
            {items.map((item, index) => {
              const regime = checkOkpd2NationalRegime(
                item.okpd2OrKtruCode,
                okpd2Refs,
              );
              const ktru = findKtruByCode(ktruRefs, item.ktruCode);

              return (
                <li
                  key={`selection-${index}`}
                  className={block("selection-item")}
                >
                  <span className={block("selection-code")}>
                    {item.okpd2OrKtruCode || "ОКПД2 не выбран"}
                  </span>
                  {item.ktruCode && (
                    <span className={block("selection-ktru")}>
                      КТРУ {item.ktruCode}
                      {ktru ? ` — ${ktru.name}` : ""}
                    </span>
                  )}
                  <span className={block("selection-name")}>
                    {item.name || "Наименование не заполнено"}
                  </span>
                  {regime.regime && (
                    <span className={block("selection-regime")}>
                      {regime.regime === "ban"
                        ? "запрет (ПП РФ № 1875, прил. № 1)"
                        : "ограничение (ПП РФ № 1875, прил. № 2)"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Предупреждения КТРУ: позиция есть в каталоге — характеристики
            берутся из КТРУ (ПП РФ № 145) */}
        {items.map((item, index) => {
          const ktruIssue = checkKtruUsage(
            ktruRefs,
            item.okpd2OrKtruCode,
            item.ktruCode,
          );
          if (!ktruIssue) return null;

          return (
            <span
              key={`ktru-issue-${index}`}
              className={block(
                ktruIssue.level === "error" ? "red-note" : "yellow-warning",
              )}
            >
              {ktruIssue.level === "warning" && (
                <span className={block("warning-badge")}>!</span>
              )}
              <span>{ktruIssue.message}</span>
            </span>
          );
        })}
      </div>

      <div className={block("form-grid")}>
        <div className={block("row", ["single"])}>
          <div className={block("field-col")}>
            <CustomCheckbox
              label="Лекарственные препараты (признак устанавливается только при закупке лекарственных препаратов)"
              {...register("purchaseObjects.isMedicines")}
            />

            <CustomCheckbox
              label="Невозможно определить количество (объем) закупаемых товаров, работ, услуг"
              {...register("purchaseObjects.isIndeterminateVolume")}
            />
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
                    ktruCode: "",
                    ktruName: "",
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

            {/* Сводная таблица позиций: редактирование и удаление на месте */}
            <div className={block("positions-table-wrap")}>
              <table className={block("positions-table")}>
                <thead>
                  <tr>
                    <th>№</th>
                    <th>ОКПД2 / КТРУ</th>
                    <th>Наименование</th>
                    <th>Ед. изм.</th>
                    <th>Кол-во</th>
                    <th>Цена за ед., руб.</th>
                    <th>Стоимость, руб.</th>
                    <th>Нац. режим</th>
                    <th aria-label="Действия" />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const currentQty = items[index]?.quantity || 0;
                    const currentPrice = items[index]?.unitPrice || 0;
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
                    const ktruIssue = checkKtruUsage(
                      ktruRefs,
                      items[index]?.okpd2OrKtruCode,
                      items[index]?.ktruCode,
                    );

                    const hasWarnings = Boolean(
                      normedRef?.isNormed ||
                      auctionCheck.inAuctionList ||
                      regimeIssue ||
                      ktruIssue ||
                      violation,
                    );

                    return (
                      <Fragment key={field.id}>
                        <tr>
                          <td className={block("positions-index")}>
                            {index + 1}
                          </td>
                          <td className={block("positions-code-cell")}>
                            <Okpd2Select
                              code={items[index]?.okpd2OrKtruCode}
                              name={items[index]?.name}
                              onSelect={(item) =>
                                handleSelectOkpd2(index, item)
                              }
                            />
                            <KtruSelect
                              className={block("select")}
                              okpd2Code={items[index]?.okpd2OrKtruCode}
                              ktruCode={items[index]?.ktruCode}
                              onSelect={(item) => handleSelectKtru(index, item)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="Наименование позиции"
                              className={block("input")}
                              {...register(
                                `purchaseObjects.items.${index}.name`,
                              )}
                            />
                          </td>
                          <td>
                            <OkeiSelect
                              compact
                              value={items[index]?.unit ?? ""}
                              valueMode="name"
                              placeholder="Ед. по ОКЕИ…"
                              onChange={(nextUnit) =>
                                setValue(
                                  `purchaseObjects.items.${index}.unit`,
                                  nextUnit,
                                  { shouldDirty: true },
                                )
                              }
                            />
                          </td>
                          <td>
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
                          </td>
                          <td>
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
                          </td>
                          <td>
                            <MoneyInput
                              className={block("input")}
                              value={items[index]?.totalPrice}
                              readOnly
                              ariaLabel={`Стоимость, позиция ${index + 1}`}
                            />
                          </td>
                          <td>
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
                            {regimeCheck.regime && (
                              <span className={block("caption")}>
                                ПП РФ № 1875:{" "}
                                {regimeCheck.regime === "ban"
                                  ? "запрет"
                                  : "ограничение"}
                                {regimeCheck.groupLabel
                                  ? ` — ${regimeCheck.groupLabel}`
                                  : ""}
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className={block("small-btn", ["danger"])}
                              onClick={() => remove(index)}
                            >
                              Удалить
                            </button>
                          </td>
                        </tr>

                        {hasWarnings && (
                          <tr>
                            <td
                              colSpan={9}
                              className={block("positions-warnings")}
                            >
                              {normedRef?.isNormed && (
                                <span className={block("yellow-warning")}>
                                  <span className={block("warning-badge")}>
                                    !
                                  </span>
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
                                  <span className={block("warning-badge")}>
                                    !
                                  </span>
                                  <span>
                                    Аукционный перечень (РП РФ № 471-р): для
                                    кода {auctionCheck.code} обязателен
                                    электронный аукцион (кроме котировок / ед.
                                    поставщика).
                                  </span>
                                </span>
                              )}
                              {ktruIssue && (
                                <span
                                  className={block(
                                    ktruIssue.level === "error"
                                      ? "red-note"
                                      : "yellow-warning",
                                  )}
                                >
                                  {ktruIssue.level === "warning" && (
                                    <span className={block("warning-badge")}>
                                      !
                                    </span>
                                  )}
                                  <span>{ktruIssue.message}</span>
                                </span>
                              )}
                              {regimeIssue && (
                                <span
                                  className={block(
                                    regimeIssue.level === "error"
                                      ? "red-note"
                                      : "yellow-warning",
                                  )}
                                >
                                  {regimeIssue.message}
                                </span>
                              )}
                              {violation &&
                                (isBreachSigned ? (
                                  <span className={block("yellow-warning")}>
                                    <span className={block("warning-badge")}>
                                      !
                                    </span>
                                    <span>
                                      Предельная цена превышена на{" "}
                                      {formatRub(violation.excess)}, нарушение
                                      принято главным подписантом.
                                    </span>
                                  </span>
                                ) : (
                                  <span className={block("red-note")}>
                                    Так делать нельзя: цена за единицу{" "}
                                    {formatRub(violation.unitPrice)} превышает
                                    предельную {formatRub(violation.normLimit)}{" "}
                                    (ПП РФ N 926). Сохранение извещения
                                    заблокировано до подписи главного
                                    подписанта.
                                  </span>
                                ))}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Один набор характеристик на всю закупку */}
            <NormingRequirementsBlock />

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
