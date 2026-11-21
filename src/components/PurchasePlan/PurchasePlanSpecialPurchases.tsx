import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import useUtils from "../../hooks/useUtils";
import {
  emptyPurchasePlanSpecialPurchase,
  toNumber,
  type PurchasePlan,
  type PurchasePlanSpecialPurchase,
} from "../../services/PurchasePlan/purchasePlan.schema";
import {
  formatMoneyValue,
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
  { key: "amountCurrentYear", label: "Текущий год" },
  { key: "amountPlanPeriodFirstYear", label: "1-й год план." },
  { key: "amountPlanPeriodSecondYear", label: "2-й год план." },
  { key: "amountSubsequentYears", label: "Последующие" },
] as const;

type AmountKey = (typeof AMOUNT_FIELDS)[number]["key"];

// В состоянии храним число без разделителей, показываем с разрядами —
// так в графе помещаются суммы в миллиарды (как в карточке позиции)
const normalizeMoneyInput = (value: string): string => {
  const raw = value.replace(/[\s ]/g, "").replace(",", ".");
  const [integer, ...fraction] = raw.split(".");
  const digits = integer.replace(/\D/g, "").slice(0, 15);

  if (!fraction.length) {
    return digits;
  }

  return `${digits}.${fraction.join("").replace(/\D/g, "").slice(0, 2)}`;
};

const displayMoneyInput = (value: string | number | undefined): string => {
  const raw = String(value ?? "").replace(",", ".");

  if (!raw) {
    return "";
  }

  const [integer, fraction] = raw.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return fraction !== undefined ? `${grouped},${fraction}` : grouped;
};

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

  /* Типы, уже использованные в плане: свой список подсказок вместо datalist,
     который браузер показывает в произвольном месте. */
  const usedTypes = useMemo(() => {
    const seen = new Map<string, string>();

    for (const item of items) {
      if (item.typeCode && !seen.has(item.typeCode)) {
        seen.set(item.typeCode, item.typeName || item.typeCode);
      }
    }

    return [...seen.entries()].map(([code, name]) => ({ code, name }));
  }, [items]);

  const [typeDropdown, setTypeDropdown] = useState<{
    index: number;
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [typeActiveIndex, setTypeActiveIndex] = useState(0);
  const typeAnchorRef = useRef<HTMLInputElement | null>(null);
  const typeListRef = useRef<HTMLDivElement | null>(null);

  const typeFilter = typeDropdown
    ? String(items[typeDropdown.index]?.typeCode ?? "")
    : "";
  const visibleTypes = useMemo(
    () =>
      usedTypes.filter(
        (item) =>
          !typeFilter ||
          item.code.includes(typeFilter) ||
          item.name.includes(typeFilter),
      ),
    [typeFilter, usedTypes],
  );

  function openTypeDropdown(index: number, anchor: HTMLInputElement) {
    const rect = anchor.getBoundingClientRect();
    const width = Math.max(rect.width, 320);
    setTypeDropdown({
      index,
      top: rect.bottom + 2,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
    });
    typeAnchorRef.current = anchor;
    setTypeActiveIndex(0);
  }

  function selectType(index: number, code: string, name: string) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, typeCode: code, typeName: name || item.typeName }
          : item,
      ),
    );
    setTypeDropdown(null);
  }

  function handleTypeKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (event.key === "Escape") {
      setTypeDropdown(null);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!typeDropdown) {
        openTypeDropdown(index, event.currentTarget);
        return;
      }
      if (!visibleTypes.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setTypeActiveIndex(
        (current) =>
          (current + step + visibleTypes.length) % visibleTypes.length,
      );
      return;
    }
    if (event.key === "Enter" && typeDropdown && visibleTypes.length) {
      event.preventDefault();
      const item = visibleTypes[typeActiveIndex] ?? visibleTypes[0];
      selectType(index, item.code, item.name);
    }
  }

  // Закрываем список по клику вне него, уходу фокуса и прокрутке/ресайзу
  useEffect(() => {
    if (!typeDropdown) return;
    function closeOnOutside(event: Event) {
      const target = event.target as Node | null;
      if (!target) return;
      if (typeListRef.current?.contains(target)) return;
      if (typeAnchorRef.current?.contains(target)) return;
      setTypeDropdown(null);
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("focusin", closeOnOutside);
    window.addEventListener("scroll", closeOnOutside, true);
    window.addEventListener("resize", closeOnOutside);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("focusin", closeOnOutside);
      window.removeEventListener("scroll", closeOnOutside, true);
      window.removeEventListener("resize", closeOnOutside);
    };
  }, [typeDropdown]);

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

  // «Всего» расчётное: как и в карточке позиции, хранится в данных для XSD,
  // но не редактируется вручную
  function updateAmount(index: number, key: AmountKey, raw: string) {
    const value = normalizeMoneyInput(raw);

    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, [key]: value };
        const sum = sumYears(next);
        return {
          ...next,
          amountTotal: sum ? String(Number(sum.toFixed(2))) : "",
        };
      }),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyPurchasePlanSpecialPurchase(baseYear)]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function sumYears(item: PurchasePlanSpecialPurchase): number {
    return AMOUNT_FIELDS.reduce(
      (total, field) => total + (toNumber(item[field.key]) ?? 0),
      0,
    );
  }

  const totalAmount = items.reduce(
    (total, item) => total + sumYears(item),
    0,
  );

  return (
    <fieldset className={block("section")}>
      <legend>Особые закупки</legend>

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
            {/* Все графы фиксированы: таблица одинаковой ширины с таблицами
                карточки позиции и не даёт горизонтальной полосы */}
            <colgroup>
              <col className={block("col", ["num"])} />
              <col className={block("col", ["type"])} />
              <col className={block("col", ["code"])} />
              <col className={block("col", ["year"])} />
              <col className={block("col", ["number"])} />
              <col className={block("col", ["kvr"])} />
              <col className={block("col", ["amounts"])} />
              <col className={block("col", ["action"])} />
            </colgroup>
            <thead>
              <tr>
                <th>№</th>
                <th>Тип особой закупки</th>
                <th>ИКЗ / ИКУ</th>
                <th>Год размещения</th>
                <th>№ закупки</th>
                <th>КВР / КБК</th>
                <th>Финансовое обеспечение, руб.</th>
                <th className={block("th", ["action-head"])} />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <Fragment key={item.id ?? index}>
                  <tr>
                    <td className={block("cell", ["center"])}>{index + 1}</td>
                    <td>
                      <div className={block("stack")}>
                        <input
                          className={block("input", ["code"])}
                          placeholder="Код типа"
                          aria-label="Код типа особой закупки"
                          value={item.typeCode}
                          onFocus={(event) =>
                            openTypeDropdown(index, event.currentTarget)
                          }
                          onClick={(event) =>
                            openTypeDropdown(index, event.currentTarget)
                          }
                          onBlur={() =>
                            setTypeDropdown((current) =>
                              current?.index === index ? null : current,
                            )
                          }
                          onKeyDown={(event) =>
                            handleTypeKeyDown(event, index)
                          }
                          onChange={(event) =>
                            updateField(index, "typeCode", event.target.value)
                          }
                        />
                        <input
                          className={block("input")}
                          placeholder="Наименование типа"
                          aria-label="Наименование типа особой закупки"
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
                          aria-label="ИКЗ особой закупки"
                          maxLength={36}
                          value={item.ikz ?? ""}
                          onChange={(event) =>
                            updateField(index, "ikz", event.target.value)
                          }
                        />
                        <input
                          className={block("input", ["code"])}
                          placeholder="ИКУ, 20 цифр"
                          aria-label="ИКУ особой закупки"
                          maxLength={20}
                          value={item.iku ?? ""}
                          onChange={(event) =>
                            updateField(index, "iku", event.target.value)
                          }
                        />
                        <input
                          className={block("input")}
                          placeholder="Реестровый номер"
                          aria-label="Реестровый номер позиции"
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
                        aria-label="Год размещения"
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
                        aria-label="Номер закупки"
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
                          aria-label="КВР"
                          maxLength={3}
                          value={item.kvr ?? ""}
                          onChange={(event) =>
                            updateField(index, "kvr", event.target.value)
                          }
                        />
                        <input
                          className={block("input", ["code"])}
                          placeholder="КБК, 20 цифр"
                          aria-label="КБК"
                          maxLength={20}
                          value={item.kbk ?? ""}
                          onChange={(event) =>
                            updateField(index, "kbk", event.target.value)
                          }
                        />
                        <input
                          className={block("input", ["code"])}
                          placeholder="КОКС (ОКС/ОНИ)"
                          aria-label="КОКС"
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
                            placeholder="0,00"
                            aria-label={field.label}
                            inputMode="decimal"
                            value={displayMoneyInput(item[field.key])}
                            onChange={(event) =>
                              updateAmount(index, field.key, event.target.value)
                            }
                          />
                        ))}
                        <span className={block("calc-total")}>
                          {formatMoneyValue(toNumber(item.amountTotal) ?? 0)}
                        </span>
                      </div>
                    </td>
                    <td className={block("cell", ["action"])}>
                      <button
                        type="button"
                        className={block("remove")}
                        onClick={() => removeItem(index)}
                      >
                        Убрать
                      </button>
                    </td>
                  </tr>
                  {/* Детали изменения позиции — под строкой, как в карточке */}
                  <tr className={block("detail-row")}>
                    <td colSpan={7}>
                      <div className={block("details")}>
                        <label className={block("detail-field")}>
                          <span>Статус изменения</span>
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
                        </label>
                        <label className={block("check")}>
                          <input
                            type="checkbox"
                            checked={Boolean(item.isNotFederalFinancing)}
                            onChange={(event) =>
                              updateField(
                                index,
                                "isNotFederalFinancing",
                                event.target.checked,
                              )
                            }
                          />
                          Без федерального софинансирования
                        </label>
                      </div>
                    </td>
                    <td />
                  </tr>
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className={block("cell", ["right"])}>
                  Итого по особым закупкам
                </td>
                <td className={block("cell", ["total"])}>
                  {formatMoneyValue(totalAmount)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className={block("actions")}>
        <button type="button" className={block("add")} onClick={addItem}>
          Добавить особую закупку
        </button>
        <button
          type="button"
          className={block("save")}
          disabled={isSaving}
          // Пустые строки (добавлены, но не заполнены) не сохраняем: иначе они
          // копятся в записи плана и мешают выгрузке в ЕИС
          onClick={() =>
            onSave(
              items.filter((item) => String(item.typeCode ?? "").trim() !== ""),
            )
          }
        >
          {isSaving ? "Сохранение..." : "Сохранить особые закупки"}
        </button>
      </div>

      {/* Свой список типов: портал ставит его под нажатым полем */}
      {typeDropdown &&
        createPortal(
          <div
            ref={typeListRef}
            className={block("type-list")}
            style={{
              top: typeDropdown.top,
              left: typeDropdown.left,
              width: typeDropdown.width,
            }}
          >
            {visibleTypes.length ? (
              visibleTypes.map((item, optionIndex) => (
                <button
                  key={item.code}
                  type="button"
                  className={block(
                    "type-option",
                    optionIndex === typeActiveIndex ? ["active"] : [],
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() =>
                    selectType(typeDropdown.index, item.code, item.name)
                  }
                >
                  {item.code} — {item.name}
                </button>
              ))
            ) : (
              <span className={block("type-empty")}>
                Ранее использованных типов нет — введите код вручную
              </span>
            )}
          </div>,
          document.body,
        )}
    </fieldset>
  );
}
