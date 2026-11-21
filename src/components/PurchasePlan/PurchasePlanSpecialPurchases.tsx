import { Fragment, useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import {
  buildIkzParts,
  buildPositionUniqueNumber,
  emptyPurchasePlanSpecialPurchase,
  toNumber,
  type PurchasePlan,
  type PurchasePlanPosition,
  type PurchasePlanSpecialPurchase,
} from "../../services/PurchasePlan/purchasePlan.schema";
import {
  useSpecialPurchaseTypes,
  type SpecialPurchaseType,
} from "../../services/SpecialPurchaseType/specialPurchaseType.api";
import CustomSelect from "../UI/CustomSelect";
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
 * Порядок работы с вкладкой:
 * 1) выбрать тип из справочника (пользователь видит только наименования);
 * 2) выбрать год осуществления закупки;
 * 3) только после этого заполнить номер закупки, КБК и финансы.
 *
 * ИКЗ не вводится вручную — он собирается из тех же сведений, что и у основной
 * позиции: год размещения, ИНН/КПП (или ИКУ) заказчика, номер закупки,
 * сквозной порядковый номер, КВР из последних трёх разрядов КБК.
 */

// Текущий год фиксируем при загрузке модуля: вызывать Date в рендере нельзя
const CURRENT_YEAR = new Date().getFullYear();

interface PurchasePlanSpecialPurchasesProps {
  plan: PurchasePlan;
  positions: PurchasePlanPosition[];
  isSaving: boolean;
  onSave: (items: PurchasePlanSpecialPurchase[]) => void;
}

// Графы финансового обеспечения: текущий + два года планового периода
// и последующие годы. Плюс расчётная графа «Всего» — всего пять лет/столбцов.
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

/** Порядковый номер из уникального номера позиции, если поле не заполнено. */
const serialOf = (
  item: PurchasePlanSpecialPurchase | PurchasePlanPosition,
): number | null => {
  const direct = toNumber(item.serialNumber);
  if (direct !== null) return direct;

  const unique =
    "uniqueNumber" in item
      ? item.uniqueNumber
      : (item as PurchasePlanSpecialPurchase).positionNumber;

  return toNumber(String(unique ?? "").slice(-6));
};

/**
 * Привести особые позиции к порядку «тип → год → старый номер» и присвоить
 * сквозные номера после основных позиций. Порядок совпадает с таблицей.
 */
const renumberSpecialItems = (
  list: PurchasePlanSpecialPurchase[],
  firstSerial: number,
): PurchasePlanSpecialPurchase[] => {
  const typeRank = new Map<string, number>();

  for (const item of list) {
    const code = String(item.typeCode ?? "");
    if (!typeRank.has(code)) typeRank.set(code, typeRank.size);
  }

  return [...list]
    .sort((a, b) => {
      const rankA = typeRank.get(String(a.typeCode ?? "")) ?? 0;
      const rankB = typeRank.get(String(b.typeCode ?? "")) ?? 0;
      if (rankA !== rankB) return rankA - rankB;

      const yearA = Number(a.publishYear) || 0;
      const yearB = Number(b.publishYear) || 0;
      if (yearA !== yearB) return yearA - yearB;

      return (serialOf(a) ?? 0) - (serialOf(b) ?? 0);
    })
    .map((item, index) => ({
      ...item,
      serialNumber: String(firstSerial + index),
    }));
};

export default function PurchasePlanSpecialPurchases({
  plan,
  positions,
  isSaving,
  onSave,
}: PurchasePlanSpecialPurchasesProps) {
  const { bem } = useUtils();
  const block = bem(styles, "special-purchases");

  const baseYear = Number(plan.planYear) || CURRENT_YEAR;
  const yearOptions = placementYearOptions(baseYear);

  // Сквозная нумерация: особые позиции продолжают ряд основных позиций.
  const mainMaxSerial = Math.max(
    0,
    ...positions
      .map(serialOf)
      .filter((value): value is number => value !== null),
  );

  // Локальная копия списка: правки уходят на сервер кнопкой «Сохранить».
  // Строки идут в том же порядке, в каком показываются в таблице, и получают
  // сквозной номер после основных позиций.
  const [items, setItems] = useState<PurchasePlanSpecialPurchase[]>(() =>
    renumberSpecialItems(plan.specialPurchases ?? [], mainMaxSerial + 1),
  );

  // Справочник НСИ — основной источник. Пока датасет не загружен, API
  // возвращает резервный перечень; типы из самого плана добавляем к нему,
  // чтобы сохранённые позиции всегда оставались доступны в списке.
  const { data: specialTypes } = useSpecialPurchaseTypes();
  const typesFromPlan = useMemo(() => {
    const seen = new Map<string, SpecialPurchaseType>();

    for (const item of items) {
      if (item.typeCode && !seen.has(item.typeCode)) {
        seen.set(item.typeCode, {
          code: item.typeCode,
          name: item.typeName || item.typeCode,
        });
      }
    }

    return [...seen.values()];
  }, [items]);
  const typeOptions = useMemo(() => {
    const seen = new Map<string, SpecialPurchaseType>();

    for (const type of specialTypes?.items ?? []) {
      seen.set(type.code, type);
    }
    for (const type of typesFromPlan) {
      if (!seen.has(type.code)) seen.set(type.code, type);
    }

    return [...seen.values()];
  }, [specialTypes, typesFromPlan]);

  const [isAdding, setIsAdding] = useState(false);
  const [draftType, setDraftType] = useState<SpecialPurchaseType | null>(null);
  const [draftYear, setDraftYear] = useState(String(baseYear));

  // Сквозная нумерация: основные и особые позиции делят один ряд номеров
  const nextSerial = useMemo(() => {
    const used = [
      ...positions.map(serialOf),
      ...items.map(serialOf),
    ].filter((value): value is number => value !== null);

    return Math.max(0, ...used) + 1;
  }, [positions, items]);

  // Номер закупки по умолчанию — следующий после всех записей плана
  const nextPurchaseNumber = useMemo(() => {
    const used = [...positions, ...items]
      .map((item) => toNumber(item.purchaseNumber))
      .filter((value): value is number => value !== null);

    return String(Math.max(0, ...used) + 1).padStart(4, "0").slice(-4);
  }, [positions, items]);

  // КВР отдельно не вводится: это последние 3 разряда КБК
  const kvrOf = (item: PurchasePlanSpecialPurchase): string => {
    const digits = String(item.kbk ?? "").replace(/\D/g, "");
    return digits.length >= 3 ? digits.slice(-3) : "";
  };

  // Порядковый номер в ИКЗ считаем по всем записям плана с тем же номером
  // закупки — как в карточке основной позиции, но с учётом особых закупок
  const purchaseOrderNumberOf = (item: PurchasePlanSpecialPurchase): string => {
    const number = String(item.purchaseNumber ?? "").replace(/\D/g, "");

    if (!number) return "000";

    const samePurchase = [
      ...positions.map((position) => ({
        id: position.id,
        number: String(position.purchaseNumber ?? "").replace(/\D/g, ""),
      })),
      ...items.map((current) => ({
        id: current.id,
        number: String(current.purchaseNumber ?? "").replace(/\D/g, ""),
      })),
    ].filter((entry) => entry.number === number);

    if (samePurchase.length <= 1) return "000";

    const selfIndex = samePurchase.findIndex(
      (entry) => String(entry.id) === String(item.id),
    );
    const order = selfIndex >= 0 ? selfIndex + 1 : samePurchase.length + 1;

    return String(order).padStart(3, "0").slice(-3);
  };

  // ИКЗ собирается из сведений, пользователь его не редактирует
  const ikzPartsOf = (item: PurchasePlanSpecialPurchase) =>
    buildIkzParts({
      planYear: item.publishYear,
      inn: plan.customer.inn,
      kpp: plan.customer.kpp,
      iku: item.iku,
      purchaseNumber: item.purchaseNumber,
      purchaseOrderNumber: purchaseOrderNumberOf(item),
      serialNumber: item.serialNumber,
      // У особой закупки нет ОКПД2 — в ИКЗ идут нули, как при нескольких кодах
      okpd2Code: "",
      hasMultipleOkpd2: false,
      kvr: kvrOf(item),
      kbk: item.kbk,
    });

  const sumYears = (item: PurchasePlanSpecialPurchase): number =>
    AMOUNT_FIELDS.reduce(
      (total, field) => total + (toNumber(item[field.key]) ?? 0),
      0,
    );

  const totalAmount = items.reduce(
    (total, item) => total + sumYears(item),
    0,
  );

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
    if (!draftType) return;

    const item = emptyPurchasePlanSpecialPurchase(baseYear);

    setItems((prev) =>
      renumberSpecialItems(
        [
          ...prev,
          {
            ...item,
            serialNumber: String(nextSerial),
            positionNumber: buildPositionUniqueNumber(
              plan.planNumber,
              nextSerial,
            ),
            typeCode: draftType.code,
            typeName: draftType.name,
            publishYear: draftYear,
            purchaseNumber: nextPurchaseNumber,
          },
        ],
        mainMaxSerial + 1,
      ),
    );
    setIsAdding(false);
    setDraftType(null);
    setDraftYear(String(baseYear));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function saveItems() {
    onSave(
      items
        .map((item) => {
          const sum = sumYears(item);
          const serial = serialOf(item);
          return {
            ...item,
            serialNumber: serial !== null ? String(serial) : item.serialNumber,
            positionNumber:
              (serial !== null
                ? buildPositionUniqueNumber(plan.planNumber, serial)
                : "") ||
              item.positionNumber ||
              "",
            // КВР и ИКЗ вычисляются из сведений и хранятся для XSD
            kvr: kvrOf(item),
            ikz: ikzPartsOf(item).code,
            amountTotal: sum ? String(Number(sum.toFixed(2))) : "",
          };
        })
        .filter(
          (item) =>
            String(item.purchaseNumber ?? "") ||
            String(item.kbk ?? "") ||
            String(item.amountTotal ?? ""),
        ),
    );
  }

  // Группируем по типу, внутри типа — по году размещения
  const groups = useMemo(() => {
    const byType = new Map<
      string,
      { name: string; years: Map<string, Array<{ item: PurchasePlanSpecialPurchase; index: number }>> }
    >();

    items.forEach((item, index) => {
      const code = item.typeCode || "";
      const name = item.typeName || "Тип не выбран";
      const year = String(item.publishYear ?? baseYear);

      if (!byType.has(code)) {
        byType.set(code, { name, years: new Map() });
      }
      const group = byType.get(code)!;
      if (group.name === "Тип не выбран" && name !== "Тип не выбран") {
        group.name = name;
      }
      if (!group.years.has(year)) {
        group.years.set(year, []);
      }
      group.years.get(year)!.push({ item, index });
    });

    const sortedGroups = [...byType.entries()].map(([code, group]) => {
      const years = [...group.years.entries()]
        .map(([year, rows]) => ({
          year,
          rows: [...rows].sort(
            (a, b) => (serialOf(a.item) ?? 0) - (serialOf(b.item) ?? 0),
          ),
        }))
        .sort((a, b) => Number(a.year) - Number(b.year));

      return {
        code,
        name: group.name,
        years,
        firstSerial: years[0]?.rows[0]
          ? (serialOf(years[0].rows[0].item) ?? 0)
          : 0,
      };
    });

    return sortedGroups
      .sort((a, b) => a.firstSerial - b.firstSerial)
      .map(({ code, name, years }) => ({ code, name, years }));
  }, [items, baseYear]);

  return (
    <fieldset className={block("section")}>
      <legend>Особые закупки</legend>

      <p className={block("hint")}>
        Блок specialPurchasePositions по схеме ЕИС 17.0. Сначала выберите тип
        закупки из справочника и год осуществления закупки, затем заполните
        номер закупки, КБК и финансовое обеспечение. ИКЗ и КВР рассчитываются
        автоматически.
      </p>

      {!specialTypes?.fromNsi && (
        <p className={block("reference-note")}>
          Официальный справочник НСИ пока не загружен — показан резервный
          перечень типов из ч. 1 ст. 93 44-ФЗ.
        </p>
      )}

      <div className={block("actions")}>
        <button
          type="button"
          className={block("add")}
          onClick={() => setIsAdding((current) => !current)}
        >
          {isAdding ? "Скрыть выбор типа" : "+ Добавить особую закупку"}
        </button>
        <button
          type="button"
          className={block("save")}
          disabled={isSaving}
          onClick={saveItems}
        >
          {isSaving ? "Сохранение..." : "Сохранить особые закупки"}
        </button>
      </div>

      {isAdding && (
        <div className={block("wizard")}>
          <label className={block("wizard-field")}>
            <span>Тип особой закупки</span>
            <CustomSelect
              listData={typeOptions}
              selectedValue={draftType?.code ?? ""}
              placeholder="Выберите тип из справочника"
              getKey={(type) => type.code}
              getLabel={(type) => type.name}
              searchable
              searchPlaceholder="Поиск по наименованию типа…"
              onClick={(_code, type) => setDraftType(type)}
            />
          </label>
          <label className={block("wizard-field", ["year"])}>
            <span>Год осуществления закупки</span>
            <select
              className={block("select")}
              aria-label="Год осуществления закупки"
              value={draftYear}
              onChange={(event) => setDraftYear(event.target.value)}
            >
              {yearOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={block("wizard-add")}
            disabled={!draftType}
            onClick={addItem}
          >
            Создать позицию
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className={block("status")}>
          Особые закупки не внесены. Выберите тип и год кнопкой выше — после
          этого появится строка для заполнения номера закупки, КБК и сумм.
        </p>
      ) : (
        <div className={block("table-wrap")}>
          <table className={block("table")}>
            <colgroup>
              <col className={block("col", ["serial"])} />
              <col className={block("col", ["ikz"])} />
              <col className={block("col", ["purchase"])} />
              <col className={block("col", ["kbk"])} />
              <col className={block("col", ["amount"])} />
              <col className={block("col", ["amount"])} />
              <col className={block("col", ["amount"])} />
              <col className={block("col", ["amount"])} />
              <col className={block("col", ["total"])} />
              <col className={block("col", ["action"])} />
            </colgroup>
            <thead>
              <tr>
                <th>№ п/п</th>
                <th>ИКЗ (формируется из сведений)</th>
                <th>Номер закупки</th>
                <th>КБК</th>
                {AMOUNT_FIELDS.map((field) => (
                  <th key={field.key}>{field.label}</th>
                ))}
                <th>Всего</th>
                <th className={block("th", ["action-head"])} />
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group.code || "no-type"}>
                  <tr className={block("group-row")}>
                    <td colSpan={10}>{group.name}</td>
                  </tr>
                  {group.years.map((yearGroup) => (
                    <Fragment key={yearGroup.year}>
                      <tr className={block("year-row")}>
                        <td colSpan={10}>
                          Год осуществления закупки: {yearGroup.year}
                        </td>
                      </tr>
                      {yearGroup.rows.map(({ item, index }) => {
                        const parts = ikzPartsOf(item);

                        return (
                          <Fragment key={item.id ?? index}>
                            <tr>
                              <td className={block("cell", ["serial"])}>
                                {serialOf(item) ?? index + 1}
                              </td>
                              <td>
                                <div className={block("ikz")}>
                                  <span className={block("ikz-code")}>
                                    {parts.code || "ИКЗ не собран"}
                                  </span>
                                  {!parts.code && (
                                    <span className={block("ikz-error")}>
                                      Проверьте ИНН/КПП, номер закупки и КБК
                                    </span>
                                  )}
                                </div>
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
                                <input
                                  className={block("input", ["code"])}
                                  placeholder="20 символов"
                                  aria-label="КБК"
                                  maxLength={20}
                                  value={item.kbk ?? ""}
                                  onChange={(event) =>
                                    updateField(index, "kbk", event.target.value)
                                  }
                                />
                              </td>
                              {AMOUNT_FIELDS.map((field) => (
                                <td key={field.key}>
                                  <input
                                    className={block("input", ["money"])}
                                    placeholder="0,00"
                                    aria-label={field.label}
                                    inputMode="decimal"
                                    value={displayMoneyInput(item[field.key])}
                                    onChange={(event) =>
                                      updateAmount(
                                        index,
                                        field.key,
                                        event.target.value,
                                      )
                                    }
                                  />
                                </td>
                              ))}
                              <td className={block("cell", ["calculated"])}>
                                {formatMoneyValue(sumYears(item))}
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
                            <tr className={block("detail-row")}>
                              <td colSpan={9}>
                                <div className={block("details")}>
                                  <div className={block("ikz-parts")}>
                                    <span>
                                      Год: <b>{parts.year || "—"}</b>
                                    </span>
                                    <span>
                                      ИКУ: <b>{parts.customerCode || "—"}</b>
                                    </span>
                                    <span>
                                      № закупки:{" "}
                                      <b>{parts.purchaseNumber || "—"}</b>
                                    </span>
                                    <span>
                                      Порядок: <b>{parts.orderNumber}</b>
                                    </span>
                                    <span>
                                      ОКПД2: <b>{parts.okpd2}</b>
                                    </span>
                                    <span>
                                      КВР из КБК: <b>{parts.kvr || "—"}</b>
                                    </span>
                                  </div>
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
                                      {modificationStatusOptions.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </label>
                                  <label className={block("check")}>
                                    <input
                                      type="checkbox"
                                      checked={Boolean(
                                        item.isNotFederalFinancing,
                                      )}
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
                        );
                      })}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={8} className={block("cell", ["right"])}>
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
    </fieldset>
  );
}
