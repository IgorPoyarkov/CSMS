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
  type PurchasePlanKoksEntry,
  type PurchasePlanPosition,
  type PurchasePlanSpecialPurchase,
} from "../../services/PurchasePlan/purchasePlan.schema";
import {
  useSpecialPurchaseTypes,
  type SpecialPurchaseType,
} from "../../services/SpecialPurchaseType/specialPurchaseType.api";
import type { KoksRef } from "../../services/KoksRef/koksRef.api";
import { AUTHORIZED_BODIES } from "./purchasePlan.mock";
import KoksPickerModal from "./KoksPickerModal";
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
 * 1) выбрать основание (тип) из справочника — видны только наименования;
 * 2) выбрать планируемый год размещения извещения (только 3 года планового
 *    периода) и создать позицию;
 * 3) заполнить номер закупки, КБК, при необходимости КОКС и финансы.
 *
 * У одной позиции ровно один ИКЗ: он вынесен в отдельный схлопнутый уровень
 * внутри вида закупки. Первые две цифры ИКЗ — год размещения, поэтому год
 * виден прямо в заголовке группы и отдельно его дублировать не нужно.
 * При нескольких КБК в ИКЗ вместо КВР из КБК ставится 000.
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
  return item.kbk
    ? [
        {
          ...splitKbk(item.kbk),
          kbk: item.kbk,
          amountTotal: item.amountTotal ?? "",
          amountCurrentYear: item.amountCurrentYear ?? "",
          amountPlanPeriodFirstYear: item.amountPlanPeriodFirstYear ?? "",
          amountPlanPeriodSecondYear: item.amountPlanPeriodSecondYear ?? "",
          amountSubsequentYears: item.amountSubsequentYears ?? "",
        },
      ]
    : [{ kbk: "" }];
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
  // Для особых закупок доступны только три года планового периода: позицию
  // и ИКЗ нельзя завести за его пределами (в отличие от основной карточки).
  const yearOptions = placementYearOptions(baseYear, 2);

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

  // Год работает как фильтр списка: под одним основанием может быть несколько
  // позиций с разными годами и, соответственно, разными ИКЗ.
  const [yearFilter, setYearFilter] = useState("");

  // Дополнительная фильтрация: вид закупки и поиск по реквизитам позиции
  const [typeFilter, setTypeFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Два уровня схлопнутых списков: вид закупки → ИКЗ позиции (в ИКЗ зашит
  // год). По умолчанию закрыты оба, раскрываются кликом по заголовку; поиск
  // и фильтры раскрывают их целиком, чтобы найденные строки не прятались.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedIkz, setExpandedIkz] = useState<Set<string>>(
    () => new Set(),
  );

  // Справочник КОКС открывается только для позиций, где он действительно нужен
  const [koksPicker, setKoksPicker] = useState<{
    itemIndex: number;
    entryIndex: number;
  } | null>(null);

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

  // Ключ группы ИКЗ привязан к позиции, а не к самому коду: при правке года
  // или номера закупки код меняется, а раскрытый список остаётся раскрытым
  const ikzKeyOf = (item: PurchasePlanSpecialPurchase): string =>
    String(item.id || item.positionNumber || "");

  // Год берём из первых двух разрядов ИКЗ, а не из отдельного поля позиции
  const ikzYearOf = (yearPart: string): string =>
    yearPart ? String(2000 + Number(yearPart)) : "—";

  const sumYears = (item: PurchasePlanSpecialPurchase): number =>
    AMOUNT_FIELDS.reduce(
      (total, field) => total + (toNumber(item[field.key]) ?? 0),
      0,
    );

  // Год, вид закупки и поиск — фильтры списка. Индексы сохраняются, чтобы
  // правки попадали в исходный массив items, а не в отфильтрованную копию.
  const normalizedSearch = searchTerm.trim().toLowerCase().replace(/\s/g, "");
  const filtersActive = Boolean(
    yearFilter || typeFilter || normalizedSearch,
  );

  const visibleRows = useMemo(
    () =>
      items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => {
          if (
            yearFilter &&
            String(item.publishYear ?? baseYear) !== yearFilter
          ) {
            return false;
          }
          if (typeFilter && String(item.typeCode ?? "") !== typeFilter) {
            return false;
          }
          if (!normalizedSearch) return true;

          // Номер закупки, уникальный номер, КБК (в том числе с разрядами)
          // и ИКЗ — всё, что пользователь видит в таблице и детализации
          const kbkText = [
            String(item.kbk ?? ""),
            ...(item.kbkEntries ?? []).map(builtKbk),
          ].join(" ");
          const haystack = [
            item.purchaseNumber,
            item.positionNumber,
            item.typeName,
            kbkText,
            formatKbk(String(item.kbk ?? "")),
            item.ikz,
          ]
            .join(" ")
            .toLowerCase()
            .replace(/\s/g, "");

          return haystack.includes(normalizedSearch);
        }),
    [items, yearFilter, typeFilter, normalizedSearch, baseYear],
  );

  // Схлопнутые группы раскрываются целиком, когда включён любой фильтр:
  // иначе найденные позиции были бы спрятаны под заголовком вида закупки
  function expandAllGroups() {
    setExpandedGroups(
      new Set(items.map((item) => item.typeCode || "no-type")),
    );
    setExpandedIkz(new Set(items.map(ikzKeyOf)));
  }

  function toggleGroup(code: string) {
    const key = code || "no-type";
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleIkz(key: string) {
    setExpandedIkz((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const kbkTotal = (
    entry: PurchasePlanKbkEntry | undefined,
    key: AmountKey,
  ): number => toNumber(entry?.[key]) ?? 0;

  const totalAmount = visibleRows.reduce(
    (total, { item }) => total + sumYears(item),
    0,
  );

  function updateField<K extends keyof PurchasePlanSpecialPurchase>(
    index: number,
    key: K,
    value: PurchasePlanSpecialPurchase[K],
  ) {
    applyChange(index, (item) => {
      const next = { ...item, [key]: value };

      // Снимая флаг централизованной закупки, очищаем выбранный орган,
      // чтобы в XML не ушёл лишний centralizedPurchaseInfo
      if (key === "hasCentralizedPurchase" && !value) {
        next.centralizedPurchaseOrg = "";
      }
      // Так же очищаем КОКС, если потребность в детализации отпала
      if (key === "hasKoks" && !value) {
        next.koksEntries = [];
        next.koksCode = "";
        next.koksName = "";
      }
      if (key === "hasKoks" && value && !item.koksEntries?.length) {
        next.koksEntries = [{ koksCode: "" }];
      }

      return next;
    });
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

  /** Старые позиции с одиночным КОКС тоже открываются в детализации. */
  const koksEntriesOf = (
    item: PurchasePlanSpecialPurchase,
  ): PurchasePlanKoksEntry[] => {
    if (item.koksEntries?.length) return item.koksEntries;
    if (item.koksCode) {
      return [
        {
          koksCode: item.koksCode,
          koksName: item.koksName ?? "",
          amountTotal: item.amountTotal ?? "",
        },
      ];
    }

    return [];
  };

  function updateKoksCode(index: number, entryIndex: number, raw: string) {
    applyChange(index, (item) => ({
      ...item,
      koksEntries: koksEntriesOf(item).map((entry, current) =>
        current === entryIndex ? { ...entry, koksCode: raw } : entry,
      ),
    }));
  }

  function updateKoksAmount(
    index: number,
    entryIndex: number,
    key: AmountKey,
    raw: string,
  ) {
    const value = normalizeMoneyInput(raw);

    applyChange(index, (item) => ({
      ...item,
      koksEntries: koksEntriesOf(item).map((entry, current) => {
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
    }));
  }

  function addKoks(index: number) {
    applyChange(index, (item) => ({
      ...item,
      koksEntries: [...koksEntriesOf(item), { koksCode: "" }],
    }));
  }

  function removeKoks(index: number, entryIndex: number) {
    applyChange(index, (item) => ({
      ...item,
      koksEntries: koksEntriesOf(item).filter(
        (_, current) => current !== entryIndex,
      ),
    }));
  }

  function pickKoks(code: string, name: string) {
    if (!koksPicker) return;
    const { itemIndex, entryIndex } = koksPicker;

    applyChange(itemIndex, (item) => ({
      ...item,
      koksEntries: koksEntriesOf(item).map((entry, current) =>
        current === entryIndex
          ? { ...entry, koksCode: code, koksName: name }
          : entry,
      ),
    }));
    setKoksPicker(null);
  }

  function addItem() {
    if (!draftType) return;

    const newItem: PurchasePlanSpecialPurchase = {
      ...emptyPurchasePlanSpecialPurchase(baseYear),
      serialNumber: String(nextSerial),
      positionNumber: buildPositionUniqueNumber(plan.planNumber, nextSerial),
      typeCode: draftType.code,
      typeName: draftType.name,
      publishYear: draftYear,
      purchaseNumber: nextPurchaseNumber,
    };

    setItems((prev) =>
      renumberSpecialItems([...prev, newItem], mainMaxSerial + 1),
    );
    // Новую позицию сразу видно: раскрываем её вид закупки и ИКЗ
    setExpandedGroups((prev) => new Set(prev).add(draftType.code));
    setExpandedIkz((prev) => new Set(prev).add(ikzKeyOf(newItem)));
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

  // Два уровня группировки: вид закупки → ИКЗ позиции. Год зашит в первых
  // двух разрядах ИКЗ, поэтому заголовок ИКЗ сам показывает выбранный год.
  type SpecialRow = { item: PurchasePlanSpecialPurchase; index: number };
  type IkzGroup = {
    key: string;
    code: string;
    year: string;
    rows: SpecialRow[];
  };
  const groups: Array<{
    code: string;
    name: string;
    rows: SpecialRow[];
    ikzGroups: IkzGroup[];
  }> = [];
  const byType = new Map<string, { name: string; rows: SpecialRow[] }>();

  for (const row of visibleRows) {
    const code = row.item.typeCode || "";
    const name = row.item.typeName || "Основание не выбрано";

    if (!byType.has(code)) {
      byType.set(code, { name, rows: [] });
    }
    const group = byType.get(code)!;
    if (
      group.name === "Основание не выбрано" &&
      name !== "Основание не выбрано"
    ) {
      group.name = name;
    }
    group.rows.push(row);
  }

  for (const [code, group] of byType) {
    const rows = [...group.rows].sort(
      (a, b) => (serialOf(a.item) ?? 0) - (serialOf(b.item) ?? 0),
    );
    const byIkz = new Map<string, IkzGroup>();

    for (const row of rows) {
      const parts = ikzPartsOf(row.item);
      const key = ikzKeyOf(row.item);

      if (!byIkz.has(key)) {
        byIkz.set(key, {
          key,
          code: parts.code,
          year: ikzYearOf(parts.year),
          rows: [],
        });
      }
      byIkz.get(key)!.rows.push(row);
    }

    groups.push({
      code,
      name: group.name,
      rows,
      ikzGroups: [...byIkz.values()],
    });
  }
  groups.sort(
    (a, b) =>
      (serialOf(a.rows[0]?.item) ?? 0) - (serialOf(b.rows[0]?.item) ?? 0),
  );

  // Кнопка «Раскрыть все / Свернуть все» работает с обоими уровнями сразу
  const allTypeKeys = new Set(items.map((item) => item.typeCode || "no-type"));
  const allIkzKeys = new Set(items.map(ikzKeyOf));
  const allExpanded =
    items.length > 0 &&
    [...allTypeKeys].every((key) => expandedGroups.has(key)) &&
    [...allIkzKeys].every((key) => expandedIkz.has(key));

  return (
    <fieldset className={block("section")}>
      <legend>Особые закупки</legend>

      <p className={block("hint")}>
        Блок specialPurchasePositions по схеме ЕИС 17.0. Выберите основание из
        справочника и планируемый год размещения извещения (только три года
        планового периода), затем заполните номер закупки, КБК и, при
        необходимости, КОКС. У каждой позиции ровно один расчётный ИКЗ — он
        вынесен в заголовок вложенной группы, год внутри него виден по первым
        цифрам. Год, вид закупки и поиск фильтруют список.
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
        <label className={block("filter")}>
          <span>Планируемый год размещения извещения</span>
          <select
            className={block("select", ["filter"])}
            aria-label="Фильтр по планируемому году размещения извещения"
            value={yearFilter}
            onChange={(event) => {
              setYearFilter(event.target.value);
              expandAllGroups();
            }}
          >
            <option value="">Все годы</option>
            {yearOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={block("reset")}
          onClick={() => {
            if (allExpanded) {
              setExpandedGroups(new Set());
              setExpandedIkz(new Set());
            } else {
              expandAllGroups();
            }
          }}
        >
          {allExpanded ? "Свернуть все" : "Раскрыть все"}
        </button>
        <button
          type="button"
          className={block("save")}
          disabled={isSaving}
          onClick={saveItems}
        >
          {isSaving ? "Сохранение..." : "Сохранить изменения"}
        </button>
      </div>

      <div className={block("filters")}>
        <label className={block("filter")}>
          <span>Поиск по позициям</span>
          <input
            className={block("input", ["search"])}
            type="search"
            placeholder="Номер закупки, КБК, уникальный номер, ИКЗ"
            aria-label="Поиск по особым закупкам"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              expandAllGroups();
            }}
          />
        </label>
        <label className={block("filter")}>
          <span>Вид закупки</span>
          <select
            className={block("select", ["filter"])}
            aria-label="Фильтр по виду закупки"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              expandAllGroups();
            }}
          >
            <option value="">Все виды закупки</option>
            {typeOptions.map((type) => (
              <option key={type.code} value={type.code}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        {filtersActive && (
          <button
            type="button"
            className={block("reset")}
            onClick={() => {
              setYearFilter("");
              setTypeFilter("");
              setSearchTerm("");
            }}
          >
            Сбросить фильтры
          </button>
        )}
        <span className={block("found")}>
          Позиций: {visibleRows.length}
        </span>
      </div>

      {isAdding && (
        <div className={block("wizard")}>
          <label className={block("wizard-field")}>
            <span>Основание особой закупки</span>
            <CustomSelect
              listData={typeOptions}
              selectedValue={draftType?.code ?? ""}
              placeholder="Выберите основание из справочника"
              getKey={(type) => type.code}
              getLabel={(type) => type.name}
              searchable
              searchPlaceholder="Поиск по наименованию типа…"
              onClick={(_code, type) => setDraftType(type)}
            />
          </label>
          <label className={block("wizard-field", ["year"])}>
            <span>Планируемый год размещения извещения</span>
            <select
              className={block("select")}
              aria-label="Планируемый год размещения извещения"
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
              {groups.map((group) => {
                const groupKey = group.code || "no-type";
                const isExpanded = expandedGroups.has(groupKey);

                return (
                <Fragment key={groupKey}>
                  <tr className={block("group-row")}>
                    <td colSpan={8}>
                      <button
                        type="button"
                        className={block("group-toggle")}
                        aria-expanded={isExpanded}
                        onClick={() => toggleGroup(group.code)}
                      >
                        <span className={block("group-chevron")}>
                          {isExpanded ? "▾" : "▸"}
                        </span>
                        Вид закупки: {group.name}
                        <span className={block("group-count")}>
                          {group.rows.length}
                        </span>
                      </button>
                    </td>
                  </tr>
                  {isExpanded &&
                    group.ikzGroups.map((ikzGroup) => {
                      const isIkzExpanded = expandedIkz.has(ikzGroup.key);

                      return (
                        <Fragment key={ikzGroup.key}>
                          <tr className={block("ikz-group-row")}>
                            <td colSpan={8}>
                              <button
                                type="button"
                                className={block("ikz-toggle")}
                                aria-expanded={isIkzExpanded}
                                title={ikzGroup.code}
                                onClick={() => toggleIkz(ikzGroup.key)}
                              >
                                <span className={block("group-chevron")}>
                                  {isIkzExpanded ? "▾" : "▸"}
                                </span>
                                <span className={block("ikz-label")}>ИКЗ</span>
                                <span className={block("ikz-group-code")}>
                                  {ikzGroup.code || "ИКЗ не собран"}
                                </span>
                                <span className={block("ikz-year")}>
                                  {ikzGroup.year}
                                </span>
                              </button>
                            </td>
                          </tr>
                          {isIkzExpanded &&
                            ikzGroup.rows.map(({ item, index }) => {
                              const entries = kbkEntriesOf(item);
                              const kbkCodes = entries
                                .map((entry) =>
                                  builtKbk(entry) || String(entry.kbk ?? ""),
                                )
                                .filter(Boolean);
                              const isExisting = initialIds.has(String(item.id));
                              const isModified = modifiedIds.has(String(item.id));

                              return (
                                <Fragment key={item.id ?? index}>
                            <tr>
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
                                {/* Как и соседние графы — поле с текстом.
                                    Кодов может быть несколько: показываем
                                    первый с многоточием, полный список —
                                    по наведению. */}
                                <input
                                  className={block("input", ["kbk"])}
                                  type="text"
                                  readOnly
                                  placeholder="—"
                                  aria-label="Код бюджетной классификации"
                                  value={
                                    kbkCodes.length
                                      ? `${formatKbk(kbkCodes[0])}${kbkCodes.length > 1 ? " …" : ""}`
                                      : ""
                                  }
                                  title={
                                    kbkCodes.length > 1
                                      ? kbkCodes
                                          .map(
                                            (code, codeIndex) =>
                                              `${codeIndex + 1}. ${formatKbk(code)}`,
                                          )
                                          .join("\n")
                                      : undefined
                                  }
                                />
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
                                      className={block("edit")}
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
                                    Удалить
                                  </button>
                                </div>
                              </td>
                            </tr>
                            <tr className={block("detail-row")}>
                              <td colSpan={7}>
                                <div className={block("details")}>
                                  <div className={block("common-fields")}>
                                    {/* Как в карточке обычной позиции:
                                        лейбл слева, значение рядом */}
                                    <div
                                      className={block("detail-field", [
                                        "unique",
                                      ])}
                                    >
                                      <span>
                                        Уникальный номер позиции в
                                        плане-графике закупок
                                      </span>
                                      <span className={block("plain-value")}>
                                        {item.positionNumber ||
                                          "Будет сформирован при сохранении позиции"}
                                      </span>
                                    </div>
                                    <div
                                      className={block("detail-field", ["year"])}
                                    >
                                      <label
                                        htmlFor={`special-year-${item.id}`}
                                      >
                                        Планируемый год размещения извещения
                                      </label>
                                      <select
                                        id={`special-year-${item.id}`}
                                        className={block("select", ["year"])}
                                        value={String(
                                          item.publishYear ?? baseYear,
                                        )}
                                        onChange={(event) =>
                                          updateField(
                                            index,
                                            "publishYear",
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
                                    </div>
                                  </div>

                                  {/* ИКЗ виден в заголовке вложенной группы,
                                      внутри карточки блок с ним не дублируем */}
                                  <div className={block("option-fields")}>
                                    <label className={block("check")}>
                                      <input
                                        type="checkbox"
                                        checked={Boolean(
                                          item.hasCentralizedPurchase,
                                        )}
                                        onChange={(event) =>
                                          updateField(
                                            index,
                                            "hasCentralizedPurchase",
                                            event.target.checked,
                                          )
                                        }
                                      />
                                      Централизованная закупка
                                    </label>
                                    {item.hasCentralizedPurchase && (
                                      <div className={block("subcontrol")}>
                                        <span className={block("detail-title")}>
                                          Наименование уполномоченного органа
                                          (учреждения)
                                        </span>
                                        <CustomSelect
                                          listData={AUTHORIZED_BODIES}
                                          selectedValue={
                                            item.centralizedPurchaseOrg ?? ""
                                          }
                                          placeholder="Выберите уполномоченный орган"
                                          getKey={(body) => body.name}
                                          getLabel={(body) => body.name}
                                          searchable
                                          searchPlaceholder="Поиск уполномоченного органа…"
                                          onClick={(name) =>
                                            updateField(
                                              index,
                                              "centralizedPurchaseOrg",
                                              String(name),
                                            )
                                          }
                                        />
                                      </div>
                                    )}
                                  </div>

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
                                              Удалить
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

                                  {/* Признак КОКС переносим сразу после КБК —
                                      рядом с остальными флагами по ОКС/НИ */}
                                  <div className={block("option-fields")}>
                                    <label className={block("check")}>
                                      <input
                                        type="checkbox"
                                        checked={Boolean(
                                          item.hasKoks ||
                                            item.koksEntries?.length ||
                                            item.koksCode,
                                        )}
                                        onChange={(event) =>
                                          updateField(
                                            index,
                                            "hasKoks",
                                            event.target.checked,
                                          )
                                        }
                                      />
                                      Код объекта капитального строительства /
                                      недвижимого имущества
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
                                      ОКС / недвижимость без софинансирования из
                                      федерального бюджета
                                    </label>
                                  </div>

                                  {item.hasKoks && (
                                    <div className={block("koks-detail")}>
                                      <div className={block("detail-title")}>
                                        Детализация по кодам КОКС — ОКС/ОНИ
                                      </div>
                                      <table className={block("koks-table")}>
                                        <colgroup>
                                          <col
                                            className={block("col", ["koks"])}
                                          />
                                          {AMOUNT_FIELDS.map((field) => (
                                            <col
                                              key={field.key}
                                              className={block("col", [
                                                "kbk-money",
                                              ])}
                                            />
                                          ))}
                                          <col
                                            className={block("col", ["action"])}
                                          />
                                        </colgroup>
                                        <thead>
                                          <tr>
                                            <th>Код КОКС (ОКС/ОНИ)</th>
                                            {AMOUNT_FIELDS.map((field) => (
                                              <th key={field.key}>
                                                {amountHeaders[field.key]}
                                              </th>
                                            ))}
                                            <th />
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {koksEntriesOf(item).map(
                                            (entry, entryIndex) => (
                                              <tr
                                                key={`${item.id}-koks-${entryIndex}`}
                                              >
                                                <td>
                                                  <div
                                                    className={block("koks-cell")}
                                                  >
                                                    <input
                                                      className={block("input", [
                                                        "code",
                                                      ])}
                                                      placeholder="25000000000000000000"
                                                      aria-label="Код КОКС"
                                                      value={entry.koksCode ?? ""}
                                                      onChange={(event) =>
                                                        updateKoksCode(
                                                          index,
                                                          entryIndex,
                                                          event.target.value,
                                                        )
                                                      }
                                                    />
                                                    <button
                                                      type="button"
                                                      className={block("pick")}
                                                      onClick={() =>
                                                        setKoksPicker({
                                                          itemIndex: index,
                                                          entryIndex,
                                                        })
                                                      }
                                                    >
                                                      Выбрать из справочника
                                                    </button>
                                                    {entry.koksName && (
                                                      <span
                                                        className={block(
                                                          "koks-name",
                                                        )}
                                                      >
                                                        {entry.koksName}
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                                {AMOUNT_FIELDS.map((field) => (
                                                  <td key={field.key}>
                                                    <input
                                                      className={block("input", [
                                                        "money",
                                                      ])}
                                                      placeholder="0,00"
                                                      aria-label={`${amountHeaders[field.key]} КОКС`}
                                                      inputMode="decimal"
                                                      value={displayMoneyInput(
                                                        entry[field.key],
                                                      )}
                                                      onChange={(event) =>
                                                        updateKoksAmount(
                                                          index,
                                                          entryIndex,
                                                          field.key,
                                                          event.target.value,
                                                        )
                                                      }
                                                    />
                                                  </td>
                                                ))}
                                                <td
                                                  className={block("cell", [
                                                    "action",
                                                  ])}
                                                >
                                                  <button
                                                    type="button"
                                                    className={block("remove")}
                                                    onClick={() =>
                                                      removeKoks(
                                                        index,
                                                        entryIndex,
                                                      )
                                                    }
                                                  >
                                                    Удалить
                                                  </button>
                                                </td>
                                              </tr>
                                            ),
                                          )}
                                        </tbody>
                                        <tfoot>
                                          <tr>
                                            <td
                                              colSpan={
                                                AMOUNT_FIELDS.length + 2
                                              }
                                            >
                                              <button
                                                type="button"
                                                className={block("add")}
                                                onClick={() => addKoks(index)}
                                              >
                                                Добавить КОКС
                                              </button>
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  )}

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
                                                            "purchaseChanged") ===
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
                      );
                    })}
                </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className={block("cell", ["right"])}>
                  Итого по особым закупкам
                </td>
                <td className={block("cell", ["total"])}>
                  {formatMoneyValue(totalAmount)}
                </td>
                <td className={block("cell", ["right"])} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Сохранение всего плана: onSave уходит на PUT /purchasePlans/:id */}
      {items.length > 0 && (
        <div className={block("bottom-actions")}>
          <button
            type="button"
            className={block("save")}
            disabled={isSaving}
            onClick={saveItems}
          >
            {isSaving ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </div>
      )}

      {koksPicker && (
        <KoksPickerModal
          onClose={() => setKoksPicker(null)}
          onSelect={(code: KoksRef) => pickKoks(code.code, code.name)}
        />
      )}
    </fieldset>
  );
}
