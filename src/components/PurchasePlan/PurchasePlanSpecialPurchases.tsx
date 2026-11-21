import { Fragment, useMemo, useState } from "react";
import useUtils from "../../hooks/useUtils";
import {
  buildIkzParts,
  buildKbk,
  buildPositionUniqueNumber,
  emptyPurchasePlanSpecialPurchase,
  splitKbk,
  toNumber,
  type PurchasePlan,
  type PurchasePlanKbkEntry,
  type PurchasePlanPosition,
  type PurchasePlanSpecialPurchase,
} from "../../services/PurchasePlan/purchasePlan.schema";
import {
  useSpecialPurchaseTypes,
  type SpecialPurchaseType,
} from "../../services/SpecialPurchaseType/specialPurchaseType.api";
import CustomSelect from "../UI/CustomSelect";
import {
  formatKbk,
  formatMoneyValue,
  modificationDecisionOptions,
  placementYearOptions,
  tpChangeReasonOptions,
} from "./purchasePlan.config";
import styles from "./PurchasePlanSpecialPurchases.module.scss";

/**
 * Особые закупки плана-графика (tenderPlan2020SpecialPurchasePositionType,
 * IntegrationTPTypes.xsd, Альбом ЕИС 17.0).
 *
 * Порядок работы с вкладкой:
 * 1) выбрать тип из справочника (пользователь видит только наименования);
 * 2) ниже выбрать год осуществления закупки (текущий год ПГ и ещё четыре);
 * 3) только после этого заполнить номер закупки, КБК и финансы.
 *
 * ИКЗ рассчитывается из сведений и поэтому вынесен в строку года: в строке
 * позиции на его месте показан КБК, а сами разряды КБК редактируются
 * детализацией, как в карточке основной позиции. При нескольких КБК в ИКЗ
 * вместо КВР из КБК ставится 000.
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

// Разряды КБК — те же четыре поля, что в карточке основной позиции
const KBK_PART_FIELDS = [
  { key: "chapter", label: "Глава", placeholder: "200", length: 3 },
  {
    key: "section",
    label: "Раздел (подраздел)",
    placeholder: "1101",
    length: 4,
  },
  {
    key: "targetArticle",
    label: "Целевая статья",
    placeholder: "0000000000",
    length: 10,
  },
  { key: "expenseType", label: "Вид расходов", placeholder: "244", length: 3 },
] as const;

type KbkPartKey = (typeof KBK_PART_FIELDS)[number]["key"];

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

/** Строки детализации КБК: старые позиции с одиночным kbk не теряются. */
const kbkEntriesOf = (
  item: PurchasePlanSpecialPurchase,
): PurchasePlanKbkEntry[] => {
  if (item.kbkEntries?.length) return item.kbkEntries;

  // У старых позиций был только готовый код — разложим его на разряды,
  // чтобы детализация сразу была доступна для правки
  return item.kbk ? [{ ...splitKbk(item.kbk), kbk: item.kbk }] : [{ kbk: "" }];
};

/** Итоговый код строки детализации: собранный из разрядов либо старый kbk. */
const builtKbk = (entry: PurchasePlanKbkEntry): string =>
  buildKbk(entry) || String(entry.kbk ?? "");

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

  // Подписи граф — как в карточке основной позиции формы ПГ
  const amountHeaders: Record<AmountKey | "amountTotal", string> = {
    amountCurrentYear: `Сумма на ${baseYear} год, руб.`,
    amountPlanPeriodFirstYear: `Сумма на ${baseYear + 1} год, руб.`,
    amountPlanPeriodSecondYear: `Сумма на ${baseYear + 2} год, руб.`,
    amountSubsequentYears: "Сумма на последующие годы, руб.",
    amountTotal: "Всего, руб.",
  };

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

  // Позиции, пришедшие из плана, при правке получают статус E и блок
  // «Сведения об изменении» — как карточка основной позиции
  const [initialIds] = useState<Set<string>>(
    () =>
      new Set((plan.specialPurchases ?? []).map((item) => String(item.id))),
  );
  const [modifiedIds, setModifiedIds] = useState<Set<string>>(
    () => new Set(),
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

  // Правка существующей позиции автоматически открывает блок изменения
  function applyChange(
    index: number,
    updater: (item: PurchasePlanSpecialPurchase) => PurchasePlanSpecialPurchase,
  ) {
    const current = items[index];
    const isExisting = Boolean(current && initialIds.has(String(current.id)));

    if (isExisting) {
      const id = String(current.id);
      setModifiedIds((prev) =>
        prev.has(id) ? prev : new Set(prev).add(id),
      );
    }

    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...updater(item),
              ...(isExisting ? { modificationStatus: "E" as const } : {}),
            }
          : item,
      ),
    );
  }

  function openModification(index: number) {
    const item = items[index];
    if (!item) return;

    const id = String(item.id);
    setModifiedIds((prev) => new Set(prev).add(id));
    setItems((prev) =>
      prev.map((current, itemIndex) =>
        itemIndex === index
          ? {
              ...current,
              modificationStatus: "E",
              modificationDecision:
                current.modificationDecision ?? "purchaseChanged",
            }
          : current,
      ),
    );
  }

  // При нескольких КБК в ИКЗ вместо КВР из КБК идёт 000. Строка детализации
  // считается добавленной сразу — заполнять её необязательно, чтобы признак
  // «несколько кодов» проявился сразу после нажатия «Добавить КБК».
  const kvrOf = (item: PurchasePlanSpecialPurchase): string => {
    const entries = kbkEntriesOf(item);
    if (entries.length > 1) return "000";

    const code = builtKbk(entries[0] ?? {}) || String(item.kbk ?? "");
    const kvr = code.replace(/\D/g, "").slice(-3);

    return kvr.length === 3 ? kvr : "";
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
      kbk: builtKbk(kbkEntriesOf(item)[0] ?? {}),
    });

  const sumYears = (item: PurchasePlanSpecialPurchase): number =>
    AMOUNT_FIELDS.reduce(
      (total, field) => total + (toNumber(item[field.key]) ?? 0),
      0,
    );

  const kbkTotal = (
    entry: PurchasePlanKbkEntry | undefined,
    key: AmountKey,
  ): number => toNumber(entry?.[key]) ?? 0;

  const totalAmount = items.reduce(
    (total, item) => total + sumYears(item),
    0,
  );

  function updateField<K extends keyof PurchasePlanSpecialPurchase>(
    index: number,
    key: K,
    value: PurchasePlanSpecialPurchase[K],
  ) {
    applyChange(index, (item) => ({ ...item, [key]: value }));
  }

  function updateAmount(index: number, key: AmountKey, raw: string) {
    const value = normalizeMoneyInput(raw);

    applyChange(index, (item) => {
      const next = { ...item, [key]: value };
      const sum = sumYears(next);
      return {
        ...next,
        amountTotal: sum ? String(Number(sum.toFixed(2))) : "",
      };
    });
  }

  function syncKbkEntries(
    item: PurchasePlanSpecialPurchase,
    entries: PurchasePlanKbkEntry[],
  ): PurchasePlanSpecialPurchase {
    const normalized = entries.map((entry) => ({
      ...entry,
      kbk: builtKbk(entry),
    }));

    return {
      ...item,
      kbkEntries: normalized,
      kbk: normalized[0]?.kbk || "",
    };
  }

  function updateKbkPart(
    index: number,
    entryIndex: number,
    key: KbkPartKey,
    value: string,
  ) {
    const raw = key === "targetArticle" ? value.toUpperCase() : value.replace(/\D/g, "");

    applyChange(index, (item) =>
      syncKbkEntries(
        item,
        kbkEntriesOf(item).map((entry, current) =>
          current === entryIndex ? { ...entry, [key]: raw } : entry,
        ),
      ),
    );
  }

  function updateKbkAmount(
    index: number,
    entryIndex: number,
    key: AmountKey,
    raw: string,
  ) {
    const value = normalizeMoneyInput(raw);

    applyChange(index, (item) =>
      syncKbkEntries(
        item,
        kbkEntriesOf(item).map((entry, current) => {
          if (current !== entryIndex) return entry;
          const next = { ...entry, [key]: value };
          const sum = AMOUNT_FIELDS.reduce(
            (total, field) => total + (toNumber(next[field.key]) ?? 0),
            0,
          );

          return {
            ...next,
            amountTotal: sum ? String(Number(sum.toFixed(2))) : "",
          };
        }),
      ),
    );
  }

  function addKbk(index: number) {
    applyChange(index, (item) =>
      syncKbkEntries(item, [...kbkEntriesOf(item), { kbk: "" }]),
    );
  }

  function removeKbk(index: number, entryIndex: number) {
    applyChange(index, (item) => {
      const entries = kbkEntriesOf(item);
      const next =
        entries.length > 1
          ? entries.filter((_, current) => current !== entryIndex)
          : [{ kbk: "" }];

      return syncKbkEntries(item, next);
    });
  }

  function updateYearGroup(
    rows: Array<{ item: PurchasePlanSpecialPurchase; index: number }>,
    year: string,
  ) {
    for (const row of rows) {
      applyChange(row.index, (item) => ({ ...item, publishYear: year }));
    }
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
          const kbkEntries = kbkEntriesOf(item);

          return {
            ...item,
            serialNumber: serial !== null ? String(serial) : item.serialNumber,
            positionNumber:
              (serial !== null
                ? buildPositionUniqueNumber(plan.planNumber, serial)
                : "") ||
              item.positionNumber ||
              "",
            // Детализация КБК хранится вместе с одиночным кодом для ЕИС
            kbkEntries,
            kbk: builtKbk(kbkEntries[0] ?? {}) || "",
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
      {
        name: string;
        years: Map<
          string,
          Array<{ item: PurchasePlanSpecialPurchase; index: number }>
        >;
      }
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
        закупки из справочника, затем год осуществления закупки, после этого
        заполните номер закупки, КБК и финансовое обеспечение. ИКЗ рассчитывается
        автоматически и показан в строке года.
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
              disabled={!draftType}
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
              <col className={block("col", ["purchase"])} />
              <col className={block("col", ["kbk"])} />
              {AMOUNT_FIELDS.map((field) => (
                <col key={field.key} className={block("col", ["amount"])} />
              ))}
              <col className={block("col", ["total"])} />
              <col className={block("col", ["action"])} />
            </colgroup>
            <thead>
              <tr>
                <th>№ п/п</th>
                <th>Номер закупки, включенной в план-график закупок</th>
                <th>Код бюджетной классификации</th>
                {AMOUNT_FIELDS.map((field) => (
                  <th key={field.key}>{amountHeaders[field.key]}</th>
                ))}
                <th>{amountHeaders.amountTotal}</th>
                <th className={block("th", ["action-head"])} />
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group.code || "no-type"}>
                  <tr className={block("group-row")}>
                    <td colSpan={9}>{group.name}</td>
                  </tr>
                  {group.years.map((yearGroup) => (
                    <Fragment key={yearGroup.year}>
                      <tr className={block("year-row")}>
                        <td colSpan={9}>
                          <div className={block("year-line")}>
                            <label className={block("year-field")}>
                              <span>Год осуществления закупки</span>
                              <select
                                className={block("select", ["year"])}
                                aria-label="Год осуществления закупки"
                                value={yearGroup.year}
                                onChange={(event) =>
                                  updateYearGroup(
                                    yearGroup.rows,
                                    event.target.value,
                                  )
                                }
                              >
                                {yearOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className={block("year-ikz")}>
                              <span>Идентификационный код закупки</span>
                              {yearGroup.rows.map(({ item }) => {
                                const parts = ikzPartsOf(item);

                                return (
                                  <div
                                    key={item.id ?? item.serialNumber}
                                    className={block("year-ikz-line")}
                                  >
                                    <b>{item.purchaseNumber || "—"}</b>
                                    <span className={block("ikz-code")}>
                                      {parts.code || "ИКЗ не собран"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {yearGroup.rows.map(({ item, index }) => {
                        const entries = kbkEntriesOf(item);
                        const isExisting = initialIds.has(String(item.id));
                        const isModified = modifiedIds.has(String(item.id));

                        return (
                          <Fragment key={item.id ?? index}>
                            <tr>
                              <td className={block("cell", ["serial"])}>
                                {serialOf(item) ?? index + 1}
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
                              <td className={block("cell", ["kbk"])}>
                                <span className={block("kbk-code")}>
                                  {formatKbk(builtKbk(entries[0] ?? {}))}
                                </span>
                              </td>
                              {AMOUNT_FIELDS.map((field) => (
                                <td key={field.key}>
                                  <input
                                    className={block("input", ["money"])}
                                    placeholder="0,00"
                                    aria-label={amountHeaders[field.key]}
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
                                <div className={block("row-actions")}>
                                  {isExisting && !isModified && (
                                    <button
                                      type="button"
                                      className={block("remove")}
                                      onClick={() => openModification(index)}
                                    >
                                      Изменить
                                    </button>
                                  )}
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
                            <tr className={block("detail-row")}>
                              <td colSpan={8}>
                                <div className={block("details")}>
                                  <div className={block("detail-title")}>
                                    Детализация по кодам бюджетной классификации
                                  </div>
                                  <table className={block("kbk-table")}>
                                    <colgroup>
                                      {KBK_PART_FIELDS.map((part) => (
                                        <col
                                          key={part.key}
                                          className={block("col", [part.key])}
                                        />
                                      ))}
                                      {AMOUNT_FIELDS.map((field) => (
                                        <col
                                          key={field.key}
                                          className={block("col", ["kbk-money"])}
                                        />
                                      ))}
                                      <col className={block("col", ["action"])} />
                                    </colgroup>
                                    <thead>
                                      <tr>
                                        <th colSpan={KBK_PART_FIELDS.length}>
                                          Код бюджетной классификации
                                        </th>
                                        <th colSpan={AMOUNT_FIELDS.length}>
                                          Объём финансового обеспечения
                                        </th>
                                        <th
                                          rowSpan={2}
                                          className={block("th", ["action-head"])}
                                        />
                                      </tr>
                                      <tr>
                                        {KBK_PART_FIELDS.map((part) => (
                                          <th
                                            key={part.key}
                                            className={block("th", ["sub"])}
                                          >
                                            {part.label}
                                          </th>
                                        ))}
                                        {AMOUNT_FIELDS.map((field) => (
                                          <th
                                            key={field.key}
                                            className={block("th", ["sub"])}
                                          >
                                            {amountHeaders[field.key]}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {entries.map((entry, entryIndex) => (
                                        <tr key={`${item.id}-kbk-${entryIndex}`}>
                                          {KBK_PART_FIELDS.map((part) => (
                                            <td key={part.key}>
                                              <input
                                                className={block("input", ["code"])}
                                                placeholder={part.placeholder}
                                                aria-label={`${part.label} КБК`}
                                                maxLength={part.length}
                                                value={String(entry[part.key] ?? "")}
                                                onChange={(event) =>
                                                  updateKbkPart(
                                                    index,
                                                    entryIndex,
                                                    part.key,
                                                    event.target.value,
                                                  )
                                                }
                                              />
                                            </td>
                                          ))}
                                          {AMOUNT_FIELDS.map((field) => (
                                            <td key={field.key}>
                                              <input
                                                className={block("input", ["money"])}
                                                placeholder="0,00"
                                                aria-label={`${amountHeaders[field.key]} КБК`}
                                                inputMode="decimal"
                                                value={displayMoneyInput(entry[field.key])}
                                                onChange={(event) =>
                                                  updateKbkAmount(
                                                    index,
                                                    entryIndex,
                                                    field.key,
                                                    event.target.value,
                                                  )
                                                }
                                              />
                                            </td>
                                          ))}
                                          <td className={block("cell", ["action"])}>
                                            <button
                                              type="button"
                                              className={block("remove")}
                                              onClick={() =>
                                                removeKbk(index, entryIndex)
                                              }
                                            >
                                              Убрать
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                      <tr>
                                        <td colSpan={KBK_PART_FIELDS.length + AMOUNT_FIELDS.length + 1}>
                                          <button
                                            type="button"
                                            className={block("add")}
                                            onClick={() => addKbk(index)}
                                          >
                                            Добавить КБК
                                          </button>
                                        </td>
                                      </tr>
                                    </tbody>
                                    <tfoot>
                                      <tr>
                                        <td colSpan={KBK_PART_FIELDS.length}>
                                          Итого по кодам бюджетной классификации
                                        </td>
                                        {AMOUNT_FIELDS.map((field) => (
                                          <td
                                            key={field.key}
                                            className={block("cell", ["total"])}
                                          >
                                            {formatMoneyValue(
                                              entries.reduce(
                                                (total, entry) =>
                                                  total + kbkTotal(entry, field.key),
                                                0,
                                              ),
                                            )}
                                          </td>
                                        ))}
                                        <td />
                                      </tr>
                                    </tfoot>
                                  </table>

                                  <div className={block("ikz-parts")}>
                                    <span>
                                      Год: <b>{ikzPartsOf(item).year || "—"}</b>
                                    </span>
                                    <span>
                                      ИКУ:{" "}
                                      <b>{ikzPartsOf(item).customerCode || "—"}</b>
                                    </span>
                                    <span>
                                      № закупки:{" "}
                                      <b>
                                        {ikzPartsOf(item).purchaseNumber || "—"}
                                      </b>
                                    </span>
                                    <span>
                                      Порядок:{" "}
                                      <b>{ikzPartsOf(item).orderNumber}</b>
                                    </span>
                                    <span>
                                      ОКПД2: <b>{ikzPartsOf(item).okpd2}</b>
                                    </span>
                                    <span>
                                      КВР из КБК:{" "}
                                      <b>{kvrOf(item) || "—"}</b>
                                    </span>
                                  </div>

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
                                    ОКС / недвижимость без софинансирования из
                                    федерального бюджета
                                  </label>

                                  {isModified && (
                                    <div className={block("modification")}>
                                      <div className={block("detail-title")}>
                                        Сведения об изменении / отмене позиции
                                        (positionModification)
                                      </div>
                                      <table className={block("mod-table")}>
                                        <colgroup>
                                          <col className={block("col", ["mod-label"])} />
                                          <col className={block("col", ["mod-value"])} />
                                        </colgroup>
                                        <thead>
                                          <tr>
                                            <th>Наименование поля</th>
                                            <th>Значение</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <th scope="row">
                                              Основание внесения изменений
                                              (changeReason)
                                            </th>
                                            <td>
                                              <select
                                                className={block("select")}
                                                value={item.changeReasonCode ?? ""}
                                                onChange={(event) => {
                                                  const code = event.target.value;
                                                  const found =
                                                    tpChangeReasonOptions.find(
                                                      (option) =>
                                                        option.code === code,
                                                    );
                                                  applyChange(index, (current) => ({
                                                    ...current,
                                                    changeReasonCode: code,
                                                    changeReasonName:
                                                      found?.name ?? "",
                                                  }));
                                                }}
                                              >
                                                <option value="">
                                                  — Не выбрано —
                                                </option>
                                                {tpChangeReasonOptions.map(
                                                  (option) => (
                                                    <option
                                                      key={option.code}
                                                      value={option.code}
                                                    >
                                                      {option.code}. {option.name}
                                                    </option>
                                                  ),
                                                )}
                                              </select>
                                            </td>
                                          </tr>
                                          <tr>
                                            <th scope="row">
                                              Вынесенное решение (decision)
                                            </th>
                                            <td>
                                              <div className={block("radio-row")}>
                                                {modificationDecisionOptions.map(
                                                  (option) => (
                                                    <label
                                                      key={option.value}
                                                      className={block("radio")}
                                                    >
                                                      <input
                                                        type="radio"
                                                        name={`special-modification-${item.id}`}
                                                        value={option.value}
                                                        checked={
                                                          (item.modificationDecision ??
                                                            "notSpecified") ===
                                                          option.value
                                                        }
                                                        onChange={() =>
                                                          updateField(
                                                            index,
                                                            "modificationDecision",
                                                            option.value,
                                                          )
                                                        }
                                                      />
                                                      <span>{option.label}</span>
                                                    </label>
                                                  ),
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                          <tr>
                                            <th scope="row">
                                              Содержание изменений позиции
                                              (description)
                                            </th>
                                            <td>
                                              <textarea
                                                className={block("textarea")}
                                                rows={3}
                                                placeholder="Обоснование корректировки или отмены позиции"
                                                value={
                                                  item.modificationDescription ?? ""
                                                }
                                                onChange={(event) =>
                                                  updateField(
                                                    index,
                                                    "modificationDescription",
                                                    event.target.value,
                                                  )
                                                }
                                              />
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
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
                <td colSpan={7} className={block("cell", ["right"])}>
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
