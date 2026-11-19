import { useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import {
  emptyPurchasePlanSpecialPurchase,
  toNumber,
  type PurchasePlan,
  type PurchasePlanSpecialPurchase,
} from "../../services/PurchasePlan/purchasePlan.schema";
import {
  formatMoney,
  modificationStatusOptions,
  placementYearOptions,
} from "./purchasePlan.config";
import styles from "./PurchasePlanSpecialPurchases.module.scss";

/**
 * Особые закупки плана-графика (tenderPlan2020SpecialPurchasePositionType,
 * IntegrationTPTypes.xsd, Альбом ЕИС 17.0).
 *
 * В ЕИС 17.0 особые закупки передаются блоком specialPurchasePositions:
 * у каждой позиции есть тип из справочника nsiSpecialPurchases2020, ИКЗ,
 * ИКУ, реестровый номер позиции, планируемый год размещения извещения,
 * номер закупки, КВР/КБК, КОКС и финансовое обеспечение по годам.
 * Устаревший блок specialPurchases при приёме игнорируется, поэтому
 * редактор повторяет структуру актуальной позиции.
 */

// Текущий год фиксируем при загрузке модуля: вызывать Date в рендере нельзя
const CURRENT_YEAR = new Date().getFullYear();

interface PurchasePlanSpecialPurchasesProps {
  plan: PurchasePlan;
  isSaving: boolean;
  onSave: (items: PurchasePlanSpecialPurchase[]) => void;
}

// Графы финансового обеспечения: те же годы, что и у записи ПГ
const AMOUNT_FIELDS = [
  { key: "amountTotal", label: "Всего" },
  { key: "amountCurrentYear", label: "Текущий год" },
  { key: "amountPlanPeriodFirstYear", label: "1-й год план." },
  { key: "amountPlanPeriodSecondYear", label: "2-й год план." },
  { key: "amountSubsequentYears", label: "Последующие" },
] as const;

type AmountKey = (typeof AMOUNT_FIELDS)[number]["key"];

export default function PurchasePlanSpecialPurchases({
  plan,
  isSaving,
  onSave,
}: PurchasePlanSpecialPurchasesProps) {
  const { bem } = useUtils();
  const block = bem(styles, "special-purchases");

  const baseYear = Number(plan.planYear) || CURRENT_YEAR;
  const yearOptions = placementYearOptions(baseYear);

  // Локальная копия списка: правки уходят на сервер кнопкой «Сохранить»
  const [items, setItems] = useState<PurchasePlanSpecialPurchase[]>(
    plan.specialPurchases ?? [],
  );

  // Типы, уже использованные в плане: подсказка для datalist без
  // выдуманных кодов справочника nsiSpecialPurchases2020
  const usedTypes = useMemo(() => {
    const seen = new Map<string, string>();

    for (const item of items) {
      if (item.typeCode && !seen.has(item.typeCode)) {
        seen.set(item.typeCode, item.typeName || item.typeCode);
      }
    }

    return [...seen.entries()].map(([code, name]) => ({ code, name }));
  }, [items]);

  function updateField<K extends keyof PurchasePlanSpecialPurchase>(
    index: number,
    key: K,
    value: PurchasePlanSpecialPurchase[K],
  ) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyPurchasePlanSpecialPurchase(baseYear)]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  // Сумма по годам — для контроля: «всего» должно совпадать с разбивкой
  function yearsSum(item: PurchasePlanSpecialPurchase): number {
    return AMOUNT_FIELDS.reduce((total, field) => {
      if (field.key === "amountTotal") {
        return total;
      }

      return total + (toNumber(item[field.key]) ?? 0);
    }, 0);
  }

  const totalAmount = items.reduce(
    (total, item) => total + (toNumber(item.amountTotal) ?? 0),
    0,
  );

  return (
    <fieldset className={block("section")}>
      <legend>Особые закупки ({items.length})</legend>

      <p className={block("hint")}>
        Блок specialPurchasePositions по схеме ЕИС 17.0
        (tenderPlan2020SpecialPurchasePositionType). Тип закупки выбирается из
        справочника nsiSpecialPurchases2020; ИКЗ контролируется на соответствие
        году размещения, ИКУ, номеру закупки и КВР.
      </p>

      {items.length === 0 ? (
        <p className={block("status")}>
          Особые закупки не внесены. Если план-график содержит закупки,
          размещаемые в соответствии с ч. 1 ст. 93 44-ФЗ, добавьте их отдельными
          позициями особой закупки.
        </p>
      ) : (
        <div className={block("table-wrap")}>
          <table className={block("table")}>
            <thead>
              <tr>
                <th>№</th>
                <th>Тип особой закупки (nsiSpecialPurchases2020)</th>
                <th>ИКЗ / ИКУ</th>
                <th>Год размещения</th>
                <th>№ закупки</th>
                <th>КВР / КБК</th>
                <th>Финансовое обеспечение, рублей</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const sumByYears = yearsSum(item);
                const total = toNumber(item.amountTotal);
                const isMismatch =
                  total !== null &&
                  sumByYears > 0 &&
                  Math.abs(total - sumByYears) > 1e-6;

                return (
                  <tr key={item.id ?? index}>
                    <td className={block("cell", ["center"])}>{index + 1}</td>
                    <td>
                      <div className={block("stack")}>
                        <input
                          className={block("input")}
                          list="special-purchase-types"
                          placeholder="Код типа"
                          value={item.typeCode}
                          onChange={(event) =>
                            updateField(index, "typeCode", event.target.value)
                          }
                        />
                        <input
                          className={block("input")}
                          placeholder="Наименование типа"
                          value={item.typeName ?? ""}
                          onChange={(event) =>
                            updateField(index, "typeName", event.target.value)
                          }
                        />
                      </div>
                    </td>
                    <td>
                      <div className={block("stack")}>
                        <input
                          className={block("input", ["code"])}
                          placeholder="ИКЗ, 36 цифр"
                          maxLength={36}
                          value={item.ikz ?? ""}
                          onChange={(event) =>
                            updateField(index, "ikz", event.target.value)
                          }
                        />
                        <input
                          className={block("input", ["code"])}
                          placeholder="ИКУ, 20 цифр"
                          maxLength={20}
                          value={item.iku ?? ""}
                          onChange={(event) =>
                            updateField(index, "iku", event.target.value)
                          }
                        />
                        <input
                          className={block("input")}
                          placeholder="Реестровый номер позиции"
                          value={item.positionNumber ?? ""}
                          onChange={(event) =>
                            updateField(
                              index,
                              "positionNumber",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </td>
                    <td>
                      <select
                        className={block("select")}
                        value={String(item.publishYear ?? baseYear)}
                        onChange={(event) =>
                          updateField(index, "publishYear", event.target.value)
                        }
                      >
                        {yearOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className={block("input", ["number"])}
                        placeholder="0001"
                        maxLength={4}
                        value={item.purchaseNumber ?? ""}
                        onChange={(event) =>
                          updateField(
                            index,
                            "purchaseNumber",
                            event.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <div className={block("stack")}>
                        <input
                          className={block("input", ["number"])}
                          placeholder="КВР, 3 цифры"
                          maxLength={3}
                          value={item.kvr ?? ""}
                          onChange={(event) =>
                            updateField(index, "kvr", event.target.value)
                          }
                        />
                        <input
                          className={block("input", ["code"])}
                          placeholder="КБК, 20 цифр"
                          maxLength={20}
                          value={item.kbk ?? ""}
                          onChange={(event) =>
                            updateField(index, "kbk", event.target.value)
                          }
                        />
                        <input
                          className={block("input", ["code"])}
                          placeholder="КОКС (ОКС/ОНИ)"
                          maxLength={20}
                          value={item.koksCode ?? ""}
                          onChange={(event) =>
                            updateField(index, "koksCode", event.target.value)
                          }
                        />
                      </div>
                    </td>
                    <td>
                      <div className={block("amounts")}>
                        {AMOUNT_FIELDS.map((field) => (
                          <input
                            key={field.key}
                            className={block("input", ["money"])}
                            placeholder={field.label}
                            aria-label={field.label}
                            value={String(item[field.key] ?? "")}
                            onChange={(event) =>
                              updateField(
                                index,
                                field.key as AmountKey,
                                event.target.value,
                              )
                            }
                          />
                        ))}
                        <span
                          className={
                            isMismatch
                              ? block("sum", ["mismatch"])
                              : block("sum")
                          }
                        >
                          По годам: {formatMoney(sumByYears)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={block("stack")}>
                        <select
                          className={block("select")}
                          value={item.modificationStatus ?? "N"}
                          onChange={(event) =>
                            updateField(
                              index,
                              "modificationStatus",
                              event.target.value as "N" | "E",
                            )
                          }
                        >
                          {modificationStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={block("remove")}
                          onClick={() => removeItem(index)}
                        >
                          Убрать
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className={block("cell", ["right"])}>
                  Итого по особым закупкам:
                </td>
                <td colSpan={2} className={block("cell", ["total"])}>
                  {formatMoney(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <datalist id="special-purchase-types">
        {usedTypes.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </datalist>

      <div className={block("actions")}>
        <button type="button" className={block("add")} onClick={addItem}>
          Добавить особую закупку
        </button>
        <button
          type="button"
          className={block("save")}
          disabled={isSaving}
          onClick={() => onSave(items)}
        >
          {isSaving ? "Сохранение..." : "Сохранить особые закупки"}
        </button>
      </div>
    </fieldset>
  );
}
