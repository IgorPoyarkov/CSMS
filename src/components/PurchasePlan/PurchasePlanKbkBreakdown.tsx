import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  positionKbkEntries,
  toNumber,
  type PurchasePlan,
  type PurchasePlanPosition,
  type PurchasePlanSpecialPurchase,
} from "../../services/PurchasePlan/purchasePlan.schema";
import { formatKbk, formatMoneyValue } from "./purchasePlan.config";
import styles from "./PurchasePlanKbkBreakdown.module.scss";

/**
 * Разбивка объёма финансового обеспечения плана-графика по кодам бюджетной
 * классификации для вкладки «Итоговые показатели».
 *
 * Коды собираются из детализации записей (kbkEntries), а у старых записей —
 * из одиночного kbk: там сумм по коду нет, поэтому вся сумма записи относится
 * к её единственному КБК. Учитываются и позиции плана-графика, и особые
 * закупки — иначе итог разбивки не совпадёт с итогом по плану-графику.
 * Клик по коду открывает окно со списком записей и их суммами по этому КБК.
 */
interface PurchasePlanKbkBreakdownProps {
  plan: PurchasePlan;
  baseYear: number;
  // Клик по записи в окне кода: карточка сама решает, куда вести — позиция
  // плана-графика открывается своей страницей, особая закупка — вкладкой
  // «Особые закупки»
  onOpenRecord?: (target: KbkRecordTarget) => void;
}

// Запись, выбранная в окне кода, и точка перехода к ней
export interface KbkRecordTarget {
  kind: "position" | "special";
  id?: string | number;
}

// Суммы по графам формы ПГ: всего, текущий год, плановый период и
// последующие годы
interface KbkAmounts {
  total: number;
  current: number;
  first: number;
  second: number;
  subsequent: number;
}

// Запись (позиция ПГ или особая закупка), в которой встречается код
interface KbkRecordUsage {
  key: string;
  kind: "position" | "special";
  // Идентификатор записи в плане-графике: по нему открывается позиция ПГ
  recordId?: string | number;
  title: string;
  documentNumber: string;
  ikz: string;
  // Сколько всего КБК у записи: при нескольких кодах сумма по одному коду
  // не равна объёму финансового обеспечения записи
  kbkCount: number;
  recordTotal: number;
  amounts: KbkAmounts;
}

interface KbkGroup extends KbkAmounts {
  kbk: string;
  records: KbkRecordUsage[];
}

interface FinanceSource {
  amountTotal?: string | number;
  amountCurrentYear?: string | number;
  amountPlanPeriodFirstYear?: string | number;
  amountPlanPeriodSecondYear?: string | number;
  amountSubsequentYears?: string | number;
}

const EMPTY_AMOUNTS: KbkAmounts = {
  total: 0,
  current: 0,
  first: 0,
  second: 0,
  subsequent: 0,
};

const amountsOf = (source: FinanceSource): KbkAmounts => {
  const current = toNumber(source.amountCurrentYear) ?? 0;
  const first = toNumber(source.amountPlanPeriodFirstYear) ?? 0;
  const second = toNumber(source.amountPlanPeriodSecondYear) ?? 0;
  const subsequent = toNumber(source.amountSubsequentYears) ?? 0;
  const yearsTotal = current + first + second + subsequent;
  const declared = toNumber(source.amountTotal);

  return {
    // «Всего» из формы приоритетнее суммы годов, но нулевое значение при
    // заполненных годах считаем незаполненным — так импортированные записи
    // не теряют объём финансового обеспечения
    total: declared === null || declared === 0 ? yearsTotal : declared,
    current,
    first,
    second,
    subsequent,
  };
};

const addAmounts = (left: KbkAmounts, right: KbkAmounts): KbkAmounts => ({
  total: left.total + right.total,
  current: left.current + right.current,
  first: left.first + right.first,
  second: left.second + right.second,
  subsequent: left.subsequent + right.subsequent,
});

const collectKbkGroups = (
  positions: PurchasePlanPosition[],
  specialPurchases: PurchasePlanSpecialPurchase[],
): KbkGroup[] => {
  const groups = new Map<string, KbkGroup>();

  const addRecord = (
    record: Omit<KbkRecordUsage, "amounts">,
    kbk: string,
    amounts: KbkAmounts,
  ) => {
    const code = kbk.trim();

    if (!code) {
      return;
    }

    const group = groups.get(code) ?? {
      kbk: code,
      ...EMPTY_AMOUNTS,
      records: [],
    };
    const summed = addAmounts(group, amounts);

    groups.set(code, {
      kbk: code,
      total: summed.total,
      current: summed.current,
      first: summed.first,
      second: summed.second,
      subsequent: summed.subsequent,
      records: [...group.records, { ...record, amounts }],
    });
  };

  // Общая для позиций и особых закупок разборка: у каждой записи может быть
  // несколько КБК с собственными суммами
  const addEntries = (
    item: Pick<
      PurchasePlanPosition,
      | "kbk"
      | "kbkEntries"
      | "amountTotal"
      | "amountCurrentYear"
      | "amountPlanPeriodFirstYear"
      | "amountPlanPeriodSecondYear"
      | "amountSubsequentYears"
    >,
    base: Omit<KbkRecordUsage, "amounts" | "kbkCount" | "recordTotal">,
  ) => {
    const entries = positionKbkEntries(item);

    if (entries.length === 0) {
      return;
    }

    const recordAmounts = amountsOf(item);
    const recordBase = { ...base, kbkCount: entries.length };

    entries.forEach((entry, entryIndex) => {
      const entryAmounts = amountsOf(entry);
      // Старые записи хранят КБК без детализации сумм: у такой записи код
      // один, поэтому объём финансового обеспечения относится к нему целиком
      const amounts =
        entries.length === 1 &&
        entryAmounts.total === 0 &&
        recordAmounts.total > 0
          ? recordAmounts
          : entryAmounts;

      addRecord(
        {
          ...recordBase,
          key: `${recordBase.key}-${entryIndex}`,
          recordTotal: recordAmounts.total,
        },
        entry.kbk ?? "",
        amounts,
      );
    });
  };

  positions.forEach((position, index) => {
    addEntries(position, {
      key: `position-${position.id ?? index}`,
      kind: "position",
      recordId: position.id,
      title:
        position.objectOfPurchase ||
        position.objectName ||
        position.okpd2Name ||
        "Позиция плана-графика без наименования",
      documentNumber: position.uniqueNumber || position.purchaseNumber || "",
      ikz: position.identificationCode || "",
    });
  });

  specialPurchases.forEach((item, index) => {
    addEntries(item, {
      key: `special-${item.id ?? index}`,
      kind: "special",
      recordId: item.id,
      title: item.typeName || "Особая закупка без основания",
      documentNumber: item.positionNumber || item.purchaseNumber || "",
      ikz: item.ikz || "",
    });
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      records: [...group.records].sort(
        (left, right) =>
          right.amounts.total - left.amounts.total ||
          left.title.localeCompare(right.title, "ru"),
      ),
    }))
    .sort(
      (left, right) =>
        right.total - left.total || left.kbk.localeCompare(right.kbk, "ru"),
    );
};

// Сортировка сводки: графа и направление. По количеству записей графу не
// сортируем — это счётчик, а не объём; сортируются код и все суммы.
type SortDirection = "asc" | "desc";

type KbkSortKey =
  "kbk" | "total" | "current" | "first" | "second" | "subsequent";

interface TableSort {
  key: KbkSortKey;
  dir: SortDirection;
}

/** Повторный клик по графе меняет направление, новая графа начинает с asc. */
const toggleTableSort = (
  current: TableSort | null,
  key: KbkSortKey,
): TableSort =>
  current?.key === key
    ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
    : { key, dir: "asc" };

/** Код сравниваем как текст, суммы — как числа. */
const compareSortValues = (a: string | number, b: string | number): number =>
  typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b), "ru", { numeric: true });

const sortGroups = (groups: KbkGroup[], sort: TableSort | null): KbkGroup[] => {
  if (!sort) return groups;

  return [...groups].sort((left, right) => {
    const result = compareSortValues(left[sort.key], right[sort.key]);
    return sort.dir === "asc" ? result : -result;
  });
};

interface SortableThProps {
  label: string;
  sortKey: KbkSortKey;
  sort: TableSort | null;
  onSort: (key: KbkSortKey) => void;
}

/** Заголовок сортируемой графы: название и значок направления. */
function SortableTh({ label, sortKey, sort, onSort }: SortableThProps) {
  const direction = sort && sort.key === sortKey ? sort.dir : null;

  return (
    <th
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : "none"
      }
    >
      <button
        type="button"
        className={styles["sort-header"]}
        onClick={() => onSort(sortKey)}
        title={`Сортировать по «${label}»`}
      >
        <span>{label}</span>
        <span
          className={`${styles["sort-icon"]} ${
            direction ? styles["sort-icon-active"] : ""
          }`}
          aria-hidden="true"
        >
          {direction === "asc" ? "▲" : direction === "desc" ? "▼" : "⇅"}
        </span>
      </button>
    </th>
  );
}

export default function PurchasePlanKbkBreakdown({
  plan,
  baseYear,
  onOpenRecord,
}: PurchasePlanKbkBreakdownProps) {
  const [openKbk, setOpenKbk] = useState<string | null>(null);
  // Порядок по умолчанию — как коды идут в плане-графике
  const [sort, setSort] = useState<TableSort | null>(null);

  const groups = useMemo(
    () => collectKbkGroups(plan.positions ?? [], plan.specialPurchases ?? []),
    [plan.positions, plan.specialPurchases],
  );

  const sortedGroups = useMemo(() => sortGroups(groups, sort), [groups, sort]);

  const handleSort = useCallback(
    (key: KbkSortKey) => setSort((current) => toggleTableSort(current, key)),
    [],
  );

  // Итоги считаем по исходным группам: сортировка порядок строк меняет,
  // но не суммы
  const totals = useMemo(
    () => groups.reduce((acc, group) => addAmounts(acc, group), EMPTY_AMOUNTS),
    [groups],
  );

  // Колонка «Всего по записи» нужна только там, где у записи несколько КБК:
  // у остальных она повторяет сумму по коду, поэтому в окне кода её скрываем
  const openGroup = useMemo(
    () => groups.find((group) => group.kbk === openKbk) ?? null,
    [groups, openKbk],
  );

  const showRecordTotal = useMemo(
    () => openGroup?.records.some((record) => record.kbkCount > 1) ?? false,
    [openGroup],
  );

  const closeModal = useCallback(() => setOpenKbk(null), []);

  return (
    <div className={styles.breakdown}>
      <div className={styles.head}>
        <h3 className={styles.title}>
          Разбивка по кодам бюджетной классификации
        </h3>
        <p className={styles.hint}>
          Позиции плана-графика и особые закупки. Нажмите на код, чтобы увидеть
          записи с этим КБК и их суммы. Заголовок графы сортирует таблицу по
          этой графе
        </p>
      </div>

      {groups.length === 0 ? (
        <p className={styles.empty}>
          В плане-графике нет записей с заполненными КБК.
        </p>
      ) : (
        <div className={styles.wrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <SortableTh
                  label="КБК"
                  sortKey="kbk"
                  sort={sort}
                  onSort={handleSort}
                />
                {/* По количеству записей не сортируем: это счётчик, а не объём */}
                <th>Записей</th>
                <SortableTh
                  label="Всего, руб."
                  sortKey="total"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTh
                  label={`${baseYear} год, руб.`}
                  sortKey="current"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTh
                  label={`${baseYear + 1} год, руб.`}
                  sortKey="first"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTh
                  label={`${baseYear + 2} год, руб.`}
                  sortKey="second"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableTh
                  label="Последующие годы, руб."
                  sortKey="subsequent"
                  sort={sort}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedGroups.map((group) => (
                <tr key={group.kbk}>
                  <td>
                    <button
                      type="button"
                      className={styles["kbk-btn"]}
                      title="Показать записи с этим КБК"
                      onClick={() => setOpenKbk(group.kbk)}
                    >
                      {formatKbk(group.kbk)}
                    </button>
                  </td>
                  <td className={styles.count}>{group.records.length}</td>
                  <td className={styles.num}>
                    {formatMoneyValue(group.total)}
                  </td>
                  <td className={styles.num}>
                    {formatMoneyValue(group.current)}
                  </td>
                  <td className={styles.num}>
                    {formatMoneyValue(group.first)}
                  </td>
                  <td className={styles.num}>
                    {formatMoneyValue(group.second)}
                  </td>
                  <td className={styles.num}>
                    {formatMoneyValue(group.subsequent)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Итого по КБК</td>
                {/* Запись с несколькими КБК попадает в несколько строк, поэтому
                    сумму по графе не подсчитываем */}
                <td className={styles.count}>—</td>
                <td className={styles.num}>{formatMoneyValue(totals.total)}</td>
                <td className={styles.num}>
                  {formatMoneyValue(totals.current)}
                </td>
                <td className={styles.num}>{formatMoneyValue(totals.first)}</td>
                <td className={styles.num}>
                  {formatMoneyValue(totals.second)}
                </td>
                <td className={styles.num}>
                  {formatMoneyValue(totals.subsequent)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {openGroup && (
        <KbkRecordsModal
          group={openGroup}
          showRecordTotal={showRecordTotal}
          onClose={closeModal}
          onOpenRecord={onOpenRecord}
        />
      )}
    </div>
  );
}

interface KbkRecordsModalProps {
  group: KbkGroup;
  showRecordTotal: boolean;
  onClose: () => void;
  onOpenRecord?: (target: KbkRecordTarget) => void;
}

function KbkRecordsModal({
  group,
  showRecordTotal,
  onClose,
  onOpenRecord,
}: KbkRecordsModalProps) {
  // Escape закрывает окно, как и остальные модальные формы проекта
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Переход к записи: окно закрываем сами — при смене вкладки компонент
  // размонтируется, а при переходе на страницу позиции модалка не должна
  // оставаться в истории
  const openRecord = (record: KbkRecordUsage) => {
    if (!onOpenRecord) {
      return;
    }

    if (record.kind === "position" && record.recordId === undefined) {
      return;
    }

    onClose();
    onOpenRecord({
      kind: record.kind,
      id: record.recordId,
    });
  };

  // Портал в body: контент страницы лежит в своём контексте наложения
  // (AppLayout .content), из-за чего fixed-окно внутри карточки оставалось
  // под мобильной шапкой
  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-plan-kbk-modal-title"
      >
        <header className={styles["modal-head"]}>
          <div>
            <h3
              className={styles["modal-title"]}
              id="purchase-plan-kbk-modal-title"
            >
              Записи с КБК{" "}
              <span className={styles.mono}>{formatKbk(group.kbk)}</span>
            </h3>
            <p className={styles["modal-sub"]}>
              Записей: {group.records.length} · всего{" "}
              {formatMoneyValue(group.total)} руб.
            </p>
            {onOpenRecord && (
              <p className={styles["modal-hint"]}>
                Нажмите на запись, чтобы открыть её
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles["close-btn"]}
            onClick={onClose}
            aria-label="Закрыть список записей"
          >
            ✕
          </button>
        </header>

        <div className={styles["modal-body"]}>
          <table className={styles["records-table"]}>
            <thead>
              <tr>
                <th>№</th>
                <th>Наименование записи</th>
                <th>ИКЗ / номер записи</th>
                <th>Сумма по КБК, руб.</th>
                {showRecordTotal && <th>Всего по записи, руб.</th>}
              </tr>
            </thead>
            <tbody>
              {group.records.map((record, index) => {
                // Кликабельны только записи, у которых есть куда перейти
                const canOpen =
                  Boolean(onOpenRecord) &&
                  (record.kind === "special" || record.recordId !== undefined);

                return (
                  <tr
                    key={record.key}
                    className={canOpen ? styles["record-row"] : undefined}
                    tabIndex={canOpen ? 0 : undefined}
                    title={
                      canOpen
                        ? record.kind === "special"
                          ? "Открыть особую закупку"
                          : "Открыть позицию плана-графика"
                        : undefined
                    }
                    onClick={canOpen ? () => openRecord(record) : undefined}
                    onKeyDown={
                      canOpen
                        ? (event: ReactKeyboardEvent) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openRecord(record);
                            }
                          }
                        : undefined
                    }
                  >
                    <td className={styles.count}>{index + 1}</td>
                    <td>
                      <span className={styles["record-title"]}>
                        {record.title}
                      </span>
                      {record.kind === "special" && (
                        <span className={styles.badge}>Особая закупка</span>
                      )}
                      {/* На узких экранах колонка ИКЗ скрыта, номер остаётся здесь */}
                      <span className={styles["record-ref"]}>
                        {record.documentNumber || "Номер записи не указан"}
                      </span>
                      {/* Запись с несколькими КБК: на телефоне колонка «Всего
                          по записи» скрыта, поэтому объём показываем подписью */}
                      {record.kbkCount > 1 && (
                        <span className={styles["record-total-note"]}>
                          Всего по записи:{" "}
                          {formatMoneyValue(record.recordTotal)} руб.
                        </span>
                      )}
                      {/* На телефоне нет hover, поэтому переход показываем
                          ссылкой под наименованием */}
                      {canOpen && (
                        <span className={styles["record-open"]}>
                          {record.kind === "special"
                            ? "Открыть особую закупку →"
                            : "Открыть позицию →"}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={styles.mono}>
                        {record.documentNumber || "—"}
                      </span>
                      {record.ikz && (
                        <span className={styles.sub}>{record.ikz}</span>
                      )}
                    </td>
                    <td className={styles.num}>
                      {formatMoneyValue(record.amounts.total)}
                    </td>
                    {showRecordTotal && (
                      <td className={styles.num}>
                        {formatMoneyValue(record.recordTotal)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Итого по КБК</td>
                <td className={styles.num}>{formatMoneyValue(group.total)}</td>
                {showRecordTotal && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>,
    document.body,
  );
}
