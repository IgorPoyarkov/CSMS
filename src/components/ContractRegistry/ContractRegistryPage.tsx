import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  totalPaid,
  paymentPercent,
  totalPenalties,
  isContractOverdue,
  contractIkzError,
  paymentDeadlineDate,
  paymentXsdCodeFor,
  type ContractRegistryItem,
  type ContractStage,
  type ContractPayment,
  type ContractPenalty,
  type ContractDelivery,
} from "../../services/ContractRegistry/contractRegistry.schema";
import {
  useContractRegistry,
  useContractStages,
  useContractPayments,
  useContractPenalties,
  useContractDeliveries,
  useDeleteContract,
} from "../../services/ContractRegistry/contractRegistry.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import { useGetProcurements } from "../../services/Procurements/procurement.api";
import { useNotices } from "../../services/Procurements/noticeInfo.api";
import { usePurchasePlans } from "../../services/PurchasePlan/purchasePlan.api";
import { positionKbkCodes } from "../../services/PurchasePlan/purchasePlan.schema";
import { ikzPositionKey } from "../../services/Eis/eisIdentifiers";
import useUtils from "../../hooks/useUtils";
import PageSizePicker, { type PageSizeValue } from "../UI/PageSizePicker";
import SmpSection from "./ContractSmpSection";
import ContractEventsSection from "./ContractEventsSection";
import ContractEisSection from "./ContractEisSection";
import styles from "./ContractRegistry.module.scss";

const STATUS_LABELS: Record<string, string> = {
  signed: "Заключён",
  in_execution: "Исполняется",
  completed: "Завершён",
  terminated: "Расторгнут",
  suspended: "Приостановлен",
};

const STAGE_LABELS: Record<string, string> = {
  planned: "Запланирован",
  in_progress: "Выполняется",
  completed: "Выполнен",
  delayed: "Просрочен",
};

const PAYMENT_LABELS: Record<string, string> = {
  advance: "Аванс",
  intermediate: "Промежуточный",
  final: "Финальный",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Запланирован",
  sent: "Отправлен",
  paid: "Оплачен",
  rejected: "Отклонён",
};

const PENALTY_LABELS: Record<string, string> = {
  delay: "Просрочка",
  quality: "Качество",
  delivery: "Поставка",
  other: "Прочее",
};

const PENALTY_STATUS_LABELS: Record<string, string> = {
  accrued: "Начислена",
  collected: "Взыскана",
  disputed: "Оспорена",
  written_off: "Списана",
};

const DELIVERY_LABELS: Record<string, string> = {
  accepted: "Принято",
  accepted_with_notes: "Принято с замечаниями",
  rejected: "Отклонено",
};

const formatMoney = (value: string | number | undefined | null): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!num && num !== 0) return "—";
  return num.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Группа реестра по виду способа закупки. Способ берётся из извещения,
 * привязанного к контракту (`procurementId`), а если извещения в системе
 * нет — из загруженной закупки ЕИС (поле «Тип закупки»).
 */
type ContractGroup = "all" | "competitive" | "single";

const CONTRACT_GROUP_TITLES: Record<ContractGroup, string> = {
  all: "Реестр контрактов (ст. 82, 103 ФЗ-44)",
  competitive: "Контракты по конкурентным способам",
  single: "Контракты у единственного поставщика (ст. 93)",
};

/** Закупка у единственного поставщика: код EP93 или текст способа. */
const isSingleSupplierWay = (way: string): boolean =>
  /EP93/i.test(way) || /единственн/i.test(way);

/** Занести КБК закупки в справочник, пустые коды пропускаем. */
const mapProcurementKbk = (
  target: Map<string, string>,
  procurementId: string | number | null | undefined,
  kbk: string | null | undefined,
): void => {
  if (procurementId === undefined || procurementId === null || !kbk) return;
  target.set(String(procurementId), kbk);
};

/** КБК контракта: хотя бы один выбранный код должен встречаться в его коде. */
const matchesKbkFilter = (
  codes: string[] | undefined,
  selected: string[],
): boolean =>
  selected.length === 0 ||
  Boolean(codes?.some((code) => selected.includes(code)));

// Сколько контрактов показывать на странице
const PAGE_SIZES = [5, 10, 25, "all"] as const;

/** Сортировка: по году заключения (возр/убыв), по цене, по статусу. */
type SortCriterion = "year" | "price" | "status" | "none";

/** Фильтр по статусу: по умолчанию — на исполнении. */
type StatusFilter = ContractRegistryItem["status"] | "all";

export default function ContractRegistryPage() {
  const { data: organization } = useCurrentOrganization();
  const orgId = organization?.id;
  const { formatDate } = useUtils();

  const { data: contracts, isLoading } = useContractRegistry(orgId);
  const { mutate: deleteContract } = useDeleteContract();

  // Группа приходит из подменю шапки: ?group=competitive | ?group=single
  const [searchParams] = useSearchParams();
  const groupParam = searchParams.get("group");
  const group: ContractGroup =
    groupParam === "competitive" || groupParam === "single"
      ? groupParam
      : "all";

  const { data: procurements } = useGetProcurements();
  const { data: notices } = useNotices();
  const { data: plans } = usePurchasePlans(orgId);

  // Способ закупки по id закупки: сначала извещение системы, затем запись ЕИС
  const placingWayByProcurement = useMemo(() => {
    const map = new Map<string, string>();
    (procurements ?? []).forEach((procurement) => {
      if (procurement.id !== undefined && procurement.id !== null) {
        map.set(String(procurement.id), procurement.procurementType ?? "");
      }
    });
    (notices ?? []).forEach((notice) => {
      const id = notice.procurementId;
      if (id !== undefined && id !== null && id !== "") {
        map.set(String(id), notice.generalInfo?.placingWayCode ?? "");
      }
    });
    return map;
  }, [procurements, notices]);

  // КБК контракта. Основной источник — запись плана-графика: ИКЗ позиции и ИКЗ
  // карточки реестра сходятся по стабильной части кода (год, ИНН/КПП заказчика,
  // код позиции плана), поэтому связка работает даже без ссылки на закупку.
  // Запасной путь — КБК закупки или извещения по procurementId.
  const kbkByContract = useMemo(() => {
    const kbkByPlanIkz = new Map<string, string[]>();
    (plans ?? []).forEach((plan) => {
      (plan.positions ?? []).forEach((position) => {
        const key = ikzPositionKey(position.identificationCode ?? "");
        if (!key) return;
        const codes = positionKbkCodes(position);
        if (codes.length === 0) return;
        const prev = kbkByPlanIkz.get(key) ?? [];
        kbkByPlanIkz.set(key, [...new Set([...prev, ...codes])]);
      });
    });

    const kbkByProcurement = new Map<string, string>();
    (procurements ?? []).forEach((procurement) => {
      if (procurement.id !== undefined && procurement.id !== null) {
        mapProcurementKbk(kbkByProcurement, procurement.id, procurement.kbk);
      }
    });
    (notices ?? []).forEach((notice) => {
      mapProcurementKbk(
        kbkByProcurement,
        notice.procurementId,
        notice.generalInfo?.kbk,
      );
    });

    const map = new Map<string, string[]>();
    (contracts ?? []).forEach((contract) => {
      if (contract.id === undefined || contract.id === null) return;
      const fromPlan = kbkByPlanIkz.get(
        ikzPositionKey(contract.ikz ?? "") ?? "",
      );
      const fromProcurement = kbkByProcurement.get(
        String(contract.procurementId ?? ""),
      );
      const codes = fromPlan?.length
        ? fromPlan
        : fromProcurement
          ? [fromProcurement]
          : [];
      if (codes.length > 0) map.set(String(contract.id), codes);
    });
    return map;
  }, [contracts, plans, procurements, notices]);

  // ─── Состояния фильтров, сортировки и пагинации ───────────────────────────
  const [pageSize, setPageSize] = useState<PageSizeValue>(10);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("in_execution");
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>("year");
  const [sortAsc, setSortAsc] = useState(false);
  // КБК: одно поле на поиск, выбор из списка и ручной ввод. Текст сразу
  // сужает список, Enter добавляет код — из пула или введённый вручную.
  const [selectedKbks, setSelectedKbks] = useState<string[]>([]);
  const [kbkQuery, setKbkQuery] = useState("");
  const [kbkOpen, setKbkOpen] = useState(false);
  const [kbkActive, setKbkActive] = useState(0);
  const kbkInputRef = useRef<HTMLInputElement | null>(null);
  const kbkDropdownRef = useRef<HTMLDivElement | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Выборка до фильтра по КБК: по ней же строим список доступных КБК,
  // чтобы в подсказках не оставался единственный уже выбранный код
  const filteredContracts = useMemo(() => {
    const list = contracts ?? [];
    let result: ContractRegistryItem[];
    if (group === "all") {
      result = list;
    } else {
      result = list.filter((contract) => {
        const way = placingWayByProcurement.get(
          String(contract.procurementId ?? ""),
        );
        if (!way) return false;
        return group === "single"
          ? isSingleSupplierWay(way)
          : !isSingleSupplierWay(way);
      });
    }

    // ─── Фильтрация по статусу (по умолчанию — на исполнении) ──────────────
    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    // ─── Фильтрация по периоду заключения ──────────────────────────────────
    if (dateFrom) {
      result = result.filter((c) => (c.contractDate ?? "") >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((c) => (c.contractDate ?? "") <= dateTo);
    }

    return result;
  }, [
    contracts,
    group,
    placingWayByProcurement,
    statusFilter,
    dateFrom,
    dateTo,
  ]);

  // КБК текущего пула контрактов — тот самый список, из которого выбирают:
  // код + сколько контрактов в выборке на нём стоят
  const kbkOptions = useMemo(() => {
    const counts = new Map<string, number>();
    filteredContracts.forEach((contract) => {
      (kbkByContract.get(String(contract.id)) ?? []).forEach((kbk) => {
        counts.set(kbk, (counts.get(kbk) ?? 0) + 1);
      });
    });
    return [...counts.entries()]
      .map(([kbk, count]) => ({ kbk, count }))
      .sort((a, b) => a.kbk.localeCompare(b.kbk) || b.count - a.count);
  }, [filteredContracts, kbkByContract]);

  // Поиск сужает сам список кодов, а не выборку контрактов. Порядок тот же,
  // что и в kbkOptions: по коду, затем по числу контрактов.
  const kbkNeedle = kbkQuery.trim().toLowerCase().replace(/ё/g, "е");
  const shownKbkOptions = kbkNeedle
    ? kbkOptions.filter((option) =>
        option.kbk.toLowerCase().replace(/ё/g, "е").includes(kbkNeedle),
      )
    : kbkOptions;

  // Код, которого нет в пуле, всё равно можно применить: строка «Добавить»
  // ведёт себя как обычный вариант списка, поэтому клавиатура работает едино.
  const kbkManualCode = kbkQuery.trim();
  const kbkManualVisible =
    kbkManualCode.length > 0 &&
    !kbkOptions.some((option) => option.kbk === kbkManualCode);
  const kbkOptionCount = shownKbkOptions.length + (kbkManualVisible ? 1 : 0);

  // Активная строка списка должна оставаться в зоне видимости при стрелках
  useEffect(() => {
    if (!kbkOpen) return;
    kbkDropdownRef.current
      ?.querySelector<HTMLElement>(`[data-index="${kbkActive}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [kbkActive, kbkOpen]);

  function setKbkSelected(code: string) {
    setSelectedKbks((prev) =>
      prev.includes(code)
        ? prev.filter((value) => value !== code)
        : [...prev, code],
    );
    setPage(1);
  }

  function addKbk(code: string) {
    const value = code.trim();
    if (!value) return;
    setSelectedKbks((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setKbkQuery("");
    setKbkActive(0);
    setPage(1);
  }

  function removeKbk(code: string) {
    setSelectedKbks((prev) => prev.filter((value) => value !== code));
    setPage(1);
  }

  function handleKbkKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setKbkOpen(true);
      setKbkActive((current) =>
        Math.min(current + 1, Math.max(kbkOptionCount - 1, 0)),
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setKbkActive((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (kbkOpen && kbkOptionCount > 0) {
        if (kbkActive < shownKbkOptions.length) {
          setKbkSelected(shownKbkOptions[kbkActive].kbk);
        } else {
          addKbk(kbkManualCode);
        }
        return;
      }
      addKbk(kbkManualCode);
      return;
    }
    if (event.key === "Escape") {
      setKbkOpen(false);
      setKbkActive(0);
      return;
    }
    if (
      event.key === "Backspace" &&
      kbkQuery === "" &&
      selectedKbks.length > 0
    ) {
      removeKbk(selectedKbks[selectedKbks.length - 1]);
    }
  }

  const visibleContracts = useMemo(() => {
    // ─── Фильтрация по КБК: выбранные из списка коды ───────────────────────
    const result = filteredContracts.filter((contract) =>
      matchesKbkFilter(kbkByContract.get(String(contract.id)), selectedKbks),
    );

    // ─── Сортировка ─────────────────────────────────────────────────────────
    const statusOrder: Record<string, number> = {
      signed: 0,
      in_execution: 1,
      suspended: 2,
      completed: 3,
      terminated: 4,
    };

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortCriterion === "year") {
        const ya = (a.contractDate ?? "").slice(0, 4);
        const yb = (b.contractDate ?? "").slice(0, 4);
        cmp = ya.localeCompare(yb);
      } else if (sortCriterion === "price") {
        cmp =
          (parseFloat(a.contractPrice) || 0) -
          (parseFloat(b.contractPrice) || 0);
      } else if (sortCriterion === "status") {
        cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [filteredContracts, kbkByContract, selectedKbks, sortCriterion, sortAsc]);

  // ─── Пагинация ────────────────────────────────────────────────────────────
  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(visibleContracts.length / Number(pageSize)));
  const safePage = Math.min(page, totalPages);
  const start = pageSize === "all" ? 0 : (safePage - 1) * Number(pageSize);
  const pagedContracts =
    pageSize === "all"
      ? visibleContracts
      : visibleContracts.slice(start, start + Number(pageSize));

  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const toggleExpand = (id: string | number | undefined) => {
    if (id === undefined) return;
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (isLoading) {
    return <div className={styles.loader}>Загрузка реестра контрактов...</div>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{CONTRACT_GROUP_TITLES[group]}</h2>
      {group !== "all" && (
        <p className={styles.groupHint}>
          Группа определяется по способу закупки из извещения, привязанного к
          контракту. Контракты без привязки к извещению в группу не попадают.
        </p>
      )}

      {/* ─── Панель фильтров и сортировки ──────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarFilters}>
          {/* Статус */}
          <div className={styles.toolbarFiltersGroup}>
            <label className={styles.toolbarLabel}>Статус</label>
            <select
              className={styles.toolbarSelect}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
            >
              <option value="all">все</option>
              <option value="signed">Заключён</option>
              <option value="in_execution">Исполняется</option>
              <option value="completed">Завершён</option>
              <option value="terminated">Расторгнут</option>
              <option value="suspended">Приостановлен</option>
            </select>
          </div>

          {/* КБК: комбинированное поле — поиск, выбор из пула и ручной ввод */}
          <div className={styles.kbkBlock}>
            <label className={styles.toolbarLabel} htmlFor="contract-kbk">
              КБК
            </label>
            <div
              className={styles.kbkCombobox}
              onBlur={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                ) {
                  setKbkOpen(false);
                }
              }}
            >
              <div className={styles.kbkField}>
                <input
                  id="contract-kbk"
                  ref={kbkInputRef}
                  className={styles.kbkSearch}
                  type="text"
                  role="combobox"
                  aria-expanded={kbkOpen}
                  aria-controls="contract-kbk-options"
                  aria-autocomplete="list"
                  aria-activedescendant={
                    kbkOpen && kbkOptionCount > 0
                      ? `contract-kbk-option-${kbkActive}`
                      : undefined
                  }
                  placeholder="Введите или выберите КБК…"
                  value={kbkQuery}
                  onChange={(event) => {
                    setKbkQuery(event.target.value);
                    setKbkOpen(true);
                    setKbkActive(0);
                  }}
                  onFocus={() => setKbkOpen(true)}
                  onKeyDown={handleKbkKeyDown}
                  autoComplete="off"
                />
                <span className={styles.kbkCounter}>
                  {selectedKbks.length > 0
                    ? `Выбрано: ${selectedKbks.length}`
                    : `Кодов в пуле: ${kbkOptions.length}`}
                </span>
              </div>

              {kbkOpen && (
                <div
                  id="contract-kbk-options"
                  ref={kbkDropdownRef}
                  className={styles.kbkDropdown}
                  role="listbox"
                  aria-label="КБК текущего пула контрактов"
                >
                  {shownKbkOptions.map(({ kbk, count }, index) => {
                    const isSelected = selectedKbks.includes(kbk);
                    return (
                      <button
                        key={kbk}
                        type="button"
                        id={`contract-kbk-option-${index}`}
                        data-index={index}
                        role="option"
                        aria-selected={isSelected}
                        className={`${styles.kbkOption} ${
                          index === kbkActive ? styles.kbkOptionActive : ""
                        }`}
                        onMouseEnter={() => setKbkActive(index)}
                        onClick={() => {
                          setKbkSelected(kbk);
                          kbkInputRef.current?.focus();
                        }}
                      >
                        <span className={styles.kbkOptionMark}>
                          {isSelected ? "✓" : ""}
                        </span>
                        <span className={styles.kbkCode}>{kbk}</span>
                        <span className={styles.kbkCount}>{count}</span>
                      </button>
                    );
                  })}

                  {kbkManualVisible && (
                    <button
                      type="button"
                      id={`contract-kbk-option-${shownKbkOptions.length}`}
                      data-index={shownKbkOptions.length}
                      role="option"
                      aria-selected={false}
                      className={`${styles.kbkOption} ${
                        kbkActive === shownKbkOptions.length
                          ? styles.kbkOptionActive
                          : ""
                      }`}
                      onMouseEnter={() => setKbkActive(shownKbkOptions.length)}
                      onClick={() => addKbk(kbkManualCode)}
                    >
                      <span className={styles.kbkOptionMark}>+</span>
                      <span className={styles.kbkCode}>
                        Добавить код «{kbkManualCode}»
                      </span>
                    </button>
                  )}

                  {kbkOptionCount === 0 && (
                    <span className={styles.kbkEmpty}>
                      {kbkOptions.length === 0
                        ? "В текущей выборке контрактов КБК не определены: код берётся из записи плана-графика по ИКЗ либо из связанной закупки."
                        : "По введённому фрагменту кодов нет — нажмите Enter, чтобы применить его как код."}
                    </span>
                  )}
                </div>
              )}
            </div>

            {selectedKbks.length > 0 && (
              <div className={styles.kbkChips}>
                {selectedKbks.map((code) => (
                  <span key={code} className={styles.kbkChip}>
                    <span className={styles.kbkCode}>{code}</span>
                    <button
                      type="button"
                      className={styles.kbkChipRemove}
                      aria-label={`Убрать КБК ${code}`}
                      onClick={() => removeKbk(code)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  className={styles.kbkClear}
                  onClick={() => {
                    setSelectedKbks([]);
                    setPage(1);
                  }}
                >
                  Сбросить выбор
                </button>
              </div>
            )}
          </div>

          {/* Период заключения */}
          <div className={styles.toolbarFiltersGroup}>
            <label className={styles.toolbarLabel}>Период заключения</label>
            <div className={styles.toolbarDateRange}>
              <input
                className={styles.toolbarInput}
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                placeholder="От"
              />
              <span>–</span>
              <input
                className={styles.toolbarInput}
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                placeholder="До"
              />
            </div>
          </div>

          {/* Сортировка: критерий */}
          <div className={styles.toolbarFiltersGroup}>
            <label className={styles.toolbarLabel}>Сортировка</label>
            <div className={styles.toolbarSortRow}>
              <select
                className={styles.toolbarSelect}
                value={sortCriterion}
                onChange={(e) =>
                  setSortCriterion(e.target.value as SortCriterion)
                }
              >
                <option value="year">Год заключения</option>
                <option value="price">Цена контракта</option>
                <option value="status">Статус</option>
              </select>
              <button
                className={styles.toolbarSortToggle}
                type="button"
                onClick={() => setSortAsc((v) => !v)}
                title={sortAsc ? "По возрастанию" : "По убыванию"}
              >
                {sortAsc ? "▲" : "▼"}
              </button>
            </div>
          </div>
        </div>

        <PageSizePicker
          sizes={PAGE_SIZES}
          value={pageSize}
          onChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {pagedContracts.length === 0 ? (
        <div className={styles.empty}>
          Контрактов по заданным условиям не найдено
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {pagedContracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                expanded={expandedId === contract.id}
                onToggle={() => toggleExpand(contract.id)}
                onDelete={() => {
                  if (contract.id && confirm("Удалить контракт из реестра?")) {
                    deleteContract(contract.id);
                  }
                }}
                formatDate={formatDate}
              />
            ))}
          </div>

          {/* ─── Пагинация ──────────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className={styles.pager}>
              <button
                type="button"
                className={styles.pagerButton}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
              >
                Назад
              </button>
              <span className={styles.pagerInfo}>
                {start + 1}–
                {Math.min(
                  start + pagedContracts.length,
                  visibleContracts.length,
                )}{" "}
                из {visibleContracts.length}
              </span>
              <button
                type="button"
                className={styles.pagerButton}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={safePage === totalPages}
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Карточка контракта ─────────────────────────────────────────────────────

interface ContractCardProps {
  contract: ContractRegistryItem;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  formatDate: (date?: string) => string;
}

function ContractCard({
  contract,
  expanded,
  onToggle,
  onDelete,
  formatDate,
}: ContractCardProps) {
  const overdue = isContractOverdue(contract);

  return (
    <div className={`${styles.card} ${overdue ? styles.cardOverdue : ""}`}>
      <div className={styles.cardHeader} onClick={onToggle}>
        <div className={styles.cardHeaderLeft}>
          <span className={styles.contractNumber}>
            {contract.contractNumber}
          </span>
          <span className={styles.contractName}>{contract.contractName}</span>
        </div>
        <div className={styles.cardHeaderRight}>
          <span
            className={`${styles.statusBadge} ${styles[`status_${contract.status}`]}`}
          >
            {STATUS_LABELS[contract.status]}
          </span>
          {overdue && <span className={styles.overdueBadge}>Просрочен</span>}
          <span className={styles.chevron}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      <div className={styles.cardSummary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Поставщик</span>
          <span className={styles.summaryValue}>{contract.supplierName}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Цена контракта</span>
          <span className={styles.summaryValue}>
            {formatMoney(contract.contractPrice)} ₽
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>НМЦК</span>
          <span className={styles.summaryValue}>
            {formatMoney(contract.initialMaxPrice)} ₽
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Аванс</span>
          <span className={styles.summaryValue}>
            {formatMoney(contract.advanceAmount)} ₽
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Заключён</span>
          <span className={styles.summaryValue}>
            {formatDate(contract.contractDate)}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Срок исполнения</span>
          <span className={styles.summaryValue}>
            {formatDate(contract.executionStartDate)} —{" "}
            {formatDate(contract.executionEndDate)}
          </span>
        </div>
      </div>

      {expanded && (
        <div className={styles.cardBody}>
          <ContractEisSection contract={contract} />
          <PaymentSummary contract={contract} />
          <ContractEventsSection contractId={contract.id ?? ""} />
          <StagesSection contractId={contract.id} />
          <PaymentsSection contractId={contract.id} />
          <PenaltiesSection contractId={contract.id} />
          <DeliveriesSection contractId={contract.id} />
          {contract.subcontractingSmpNoteNumber && (
            <SmpSection
              contractId={contract.id ?? ""}
              contractPrice={contract.contractPrice}
              smpRequiredPercent={contract.smpRequiredPercent}
              subcontractingSmpNoteNumber={contract.subcontractingSmpNoteNumber}
            />
          )}

          <div className={styles.cardFooter}>
            <div className={styles.meta}>
              {contractIkzError(contract.ikz) && (
                <span className={styles.cellDanger}>
                  {contractIkzError(contract.ikz)}
                </span>
              )}
              {contract.eisPublishDate && (
                <span>
                  Опубликован в ЕИС: {formatDate(contract.eisPublishDate)}
                </span>
              )}
              {contract.treasuryPublishDate && (
                <span>
                  В Казначействе: {formatDate(contract.treasuryPublishDate)}
                </span>
              )}
              {contract.signedByName && (
                <span>Подписал: {contract.signedByName}</span>
              )}
            </div>
            <div className={styles.footerActions}>
              {/* Изменение или расторжение по ст. 95: снимок контракта
                  подставляется в форму из этой же карточки */}
              <Link
                className={styles.btnSecondary}
                to={`/contract-changes/new?contractId=${String(
                  contract.id ?? "",
                )}`}
              >
                Изменение / расторжение
              </Link>
              {/* Электронное актирование по ст. 94: снимок контракта
                  подставляется в форму приёмки из этой же карточки */}
              <Link
                className={styles.btnSecondary}
                to={`/acceptances/new?contractId=${String(contract.id ?? "")}`}
              >
                Приёмка
              </Link>
              <button className={styles.btnDanger} onClick={onDelete}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Сводка по оплатам ──────────────────────────────────────────────────────

function PaymentSummary({ contract }: { contract: ContractRegistryItem }) {
  const { data: payments } = useContractPayments(contract.id);
  const paid = totalPaid(payments ?? []);
  const percent = paymentPercent(paid, contract.contractPrice);

  return (
    <div className={styles.summaryBar}>
      <div className={styles.summaryBarInfo}>
        <span>
          Оплачено: <strong>{formatMoney(paid)} ₽</strong> из{" "}
          <strong>{formatMoney(contract.contractPrice)} ₽</strong>
        </span>
        <span className={percent >= 100 ? styles.cellSuccess : undefined}>
          {percent}%
        </span>
      </div>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressValue}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Сортировка таблиц карточки контракта ──────────────────────────────────

type SortDirection = "asc" | "desc";

interface TableSort {
  key: string;
  dir: SortDirection;
}

/** Повторный клик по той же колонке меняет направление, новая — начинает с asc. */
const toggleTableSort = (current: TableSort | null, key: string): TableSort =>
  current?.key === key
    ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
    : { key, dir: "asc" };

/** Числа сравниваем как числа, даты ISO и текст — через localeCompare. */
const compareSortValues = (a: unknown, b: unknown): number => {
  const numA = typeof a === "number" ? a : Number.NaN;
  const numB = typeof b === "number" ? b : Number.NaN;
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
  const textA = a === null || a === undefined ? "" : String(a);
  const textB = b === null || b === undefined ? "" : String(b);
  return textA.localeCompare(textB, "ru", { numeric: true });
};

const sortTableRows = <T,>(
  rows: T[],
  sort: TableSort | null,
  getValue: (row: T, key: string) => unknown,
): T[] => {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    const result = compareSortValues(
      getValue(a, sort.key),
      getValue(b, sort.key),
    );
    return sort.dir === "asc" ? result : -result;
  });
};

interface SortableThProps {
  label: string;
  sortKey: string;
  sort: TableSort | null;
  onSort: (key: string) => void;
}

/** Заголовок колонки: название и кнопка переключения направления. */
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
        className={styles.sortHeader}
        onClick={() => onSort(sortKey)}
        title={`Сортировать по «${label}»`}
      >
        <span>{label}</span>
        <span
          className={`${styles.sortIcon} ${
            direction ? styles.sortIconActive : ""
          }`}
          aria-hidden="true"
        >
          {direction === "asc" ? "▲" : direction === "desc" ? "▼" : "↕"}
        </span>
      </button>
    </th>
  );
}

// ─── Этапы ──────────────────────────────────────────────────────────────────

function StagesSection({ contractId }: { contractId?: string | number }) {
  const { data: stages } = useContractStages(contractId);
  const [sort, setSort] = useState<TableSort | null>(null);

  if (!stages || stages.length === 0) return null;

  const handleSort = (key: string) =>
    setSort((current) => toggleTableSort(current, key));

  const rows = sortTableRows(stages, sort, (stage, key) => {
    switch (key) {
      case "number":
        return Number(stage.stageNumber) || 0;
      case "sid":
        return stage.sid ?? "";
      case "name":
        return stage.name ?? "";
      case "period":
        return stage.startDate ?? "";
      case "amount":
        return Number(stage.amount) || 0;
      case "years":
        return (
          (Number(stage.paymentsSumInfo?.currentYear) || 0) +
          (Number(stage.paymentsSumInfo?.firstYear) || 0) +
          (Number(stage.paymentsSumInfo?.secondYear) || 0) +
          (Number(stage.paymentsSumInfo?.subsequentYears) || 0)
        );
      case "paid":
        return Number(stage.paidAmount) || 0;
      case "status":
        return STAGE_LABELS[stage.status] ?? "";
      default:
        return "";
    }
  });

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>Этапы исполнения</h4>
      <table className={styles.table}>
        <thead>
          <tr>
            <SortableTh
              label="№"
              sortKey="number"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Идентификатор ЕИС (sid)"
              sortKey="sid"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Наименование"
              sortKey="name"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Период"
              sortKey="period"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Сумма, ₽"
              sortKey="amount"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="По годам (paymentsSumInfo)"
              sortKey="years"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Оплачено, ₽"
              sortKey="paid"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Статус"
              sortKey="status"
              sort={sort}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((s: ContractStage) => (
            <tr key={s.id}>
              <td>{s.stageNumber}</td>
              <td>{s.sid || "—"}</td>
              <td>{s.name}</td>
              <td>
                {s.startDate} — {s.endDate}
              </td>
              <td>{formatMoney(s.amount)}</td>
              <td>
                {[
                  s.paymentsSumInfo?.currentYear,
                  s.paymentsSumInfo?.firstYear,
                  s.paymentsSumInfo?.secondYear,
                  s.paymentsSumInfo?.subsequentYears,
                ]
                  .map((value) => formatMoney(value))
                  .join(" / ")}
              </td>
              <td>{formatMoney(s.paidAmount)}</td>
              <td>
                <span
                  className={`${styles.stageBadge} ${styles[`stage_${s.status}`]}`}
                >
                  {STAGE_LABELS[s.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ─── Платежи ────────────────────────────────────────────────────────────────

function PaymentsSection({ contractId }: { contractId?: string | number }) {
  const { data: payments } = useContractPayments(contractId);
  const [sort, setSort] = useState<TableSort | null>(null);

  if (!payments || payments.length === 0) return null;

  const handleSort = (key: string) =>
    setSort((current) => toggleTableSort(current, key));

  const rows = sortTableRows(payments, sort, (payment, key) => {
    switch (key) {
      case "document":
        return payment.paymentDocumentNumber ?? "";
      case "date":
        return payment.paymentDate ?? "";
      case "type":
        return PAYMENT_LABELS[payment.paymentType] ?? "";
      case "xsd":
        return payment.paymentTypeCode || paymentXsdCodeFor(payment.paymentType);
      case "amount":
        return Number(payment.amount) || 0;
      case "bank":
        return payment.bankDocumentNumber ?? "";
      case "registry":
        return payment.regNumberExecution ?? "";
      case "due":
        return paymentDeadlineDate(payment) ?? "";
      case "status":
        return PAYMENT_STATUS_LABELS[payment.status] ?? "";
      case "treasury":
        return payment.treasuryExecution ? 1 : 0;
      default:
        return "";
    }
  });

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>Платежи (ст. 34 ч. 12, 13.1)</h4>
      <table className={styles.table}>
        <thead>
          <tr>
            <SortableTh
              label="Документ"
              sortKey="document"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Дата"
              sortKey="date"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Тип"
              sortKey="type"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Код XSD"
              sortKey="xsd"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Сумма, ₽"
              sortKey="amount"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Банковский документ"
              sortKey="bank"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Реестровый номер исполнения"
              sortKey="registry"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Срок оплаты"
              sortKey="due"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Статус"
              sortKey="status"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Казначейство"
              sortKey="treasury"
              sort={sort}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((p: ContractPayment) => (
            <tr key={p.id}>
              <td>{p.paymentDocumentNumber || "—"}</td>
              <td>{p.paymentDate || "—"}</td>
              <td>{PAYMENT_LABELS[p.paymentType]}</td>
              <td>{p.paymentTypeCode || paymentXsdCodeFor(p.paymentType)}</td>
              <td>{formatMoney(p.amount)}</td>
              <td>{p.bankDocumentNumber || "—"}</td>
              <td>{p.regNumberExecution || "—"}</td>
              <td>{paymentDeadlineDate(p) || "—"}</td>
              <td>
                <span
                  className={`${styles.payBadge} ${styles[`pay_${p.status}`]}`}
                >
                  {PAYMENT_STATUS_LABELS[p.status]}
                </span>
              </td>
              <td>{p.treasuryExecution ? "Да" : "Нет"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ─── Неустойки ──────────────────────────────────────────────────────────────

function PenaltiesSection({ contractId }: { contractId?: string | number }) {
  const { data: penalties } = useContractPenalties(contractId);
  const [sort, setSort] = useState<TableSort | null>(null);

  if (!penalties || penalties.length === 0) return null;

  const total = totalPenalties(penalties);

  const handleSort = (key: string) =>
    setSort((current) => toggleTableSort(current, key));

  const rows = sortTableRows(penalties, sort, (penalty, key) => {
    switch (key) {
      case "detected":
        return penalty.detectedDate ?? "";
      case "type":
        return PENALTY_LABELS[penalty.type] ?? "";
      case "description":
        return penalty.description ?? "";
      case "amount":
        return Number(penalty.amount) || 0;
      case "status":
        return PENALTY_STATUS_LABELS[penalty.status] ?? "";
      case "reference":
        return penalty.reference ?? "";
      default:
        return "";
    }
  });

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>
        Неустойки (ст. 34 ч. 5) — итого: {formatMoney(total)} ₽
      </h4>
      <table className={styles.table}>
        <thead>
          <tr>
            <SortableTh
              label="Выявлено"
              sortKey="detected"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Тип"
              sortKey="type"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Нарушение"
              sortKey="description"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Сумма, ₽"
              sortKey="amount"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Статус"
              sortKey="status"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Основание"
              sortKey="reference"
              sort={sort}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((p: ContractPenalty) => (
            <tr key={p.id}>
              <td>{p.detectedDate}</td>
              <td>{PENALTY_LABELS[p.type]}</td>
              <td className={styles.description}>{p.description}</td>
              <td className={styles.cellDanger}>{formatMoney(p.amount)}</td>
              <td>{PENALTY_STATUS_LABELS[p.status]}</td>
              <td className={styles.reference}>{p.reference}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ─── Поставки ───────────────────────────────────────────────────────────────

function DeliveriesSection({ contractId }: { contractId?: string | number }) {
  const { data: deliveries } = useContractDeliveries(contractId);
  const [sort, setSort] = useState<TableSort | null>(null);

  if (!deliveries || deliveries.length === 0) return null;

  const handleSort = (key: string) =>
    setSort((current) => toggleTableSort(current, key));

  const rows = sortTableRows(deliveries, sort, (delivery, key) => {
    switch (key) {
      case "date":
        return delivery.deliveryDate ?? "";
      case "name":
        return delivery.itemName ?? "";
      case "quantity":
        return Number(delivery.quantity) || 0;
      case "amount":
        return Number(delivery.amount) || 0;
      case "act":
        return delivery.acceptanceActNumber ?? "";
      case "result":
        return DELIVERY_LABELS[delivery.result] ?? "";
      default:
        return "";
    }
  });

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>Поставки и приёмка (ст. 94)</h4>
      <table className={styles.table}>
        <thead>
          <tr>
            <SortableTh
              label="Дата"
              sortKey="date"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Наименование"
              sortKey="name"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Кол-во"
              sortKey="quantity"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Сумма, ₽"
              sortKey="amount"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Акт"
              sortKey="act"
              sort={sort}
              onSort={handleSort}
            />
            <SortableTh
              label="Результат"
              sortKey="result"
              sort={sort}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((d: ContractDelivery) => (
            <tr key={d.id}>
              <td>{d.deliveryDate}</td>
              <td>{d.itemName}</td>
              <td>
                {d.quantity} {d.unit}
              </td>
              <td>{formatMoney(d.amount)}</td>
              <td>
                {d.acceptanceActNumber}
                {d.acceptanceActDate ? ` от ${d.acceptanceActDate}` : ""}
              </td>
              <td>
                <span
                  className={`${styles.deliveryBadge} ${styles[`del_${d.result}`]}`}
                >
                  {DELIVERY_LABELS[d.result]}
                </span>
                {d.notes && <div className={styles.notes}>{d.notes}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
