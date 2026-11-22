import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
import ContractCardProjectionSection from "./ContractCardProjectionSection";
import ContractAcceptanceSection from "./ContractAcceptanceSection";
import ContractPaymentForm from "./ContractPaymentForm";
import ContractDeliveryForm from "./ContractDeliveryForm";
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
 * Папка реестра: контракты одного года заключения. Год берётся из
 * `contractDate` — даты подписания контракта; записи без даты собираются
 * в отдельную папку «Без даты заключения».
 */
interface ContractFolder {
  year: string;
  title: string;
  contracts: ContractRegistryItem[];
  total: number;
}

/** Корешок «Весь реестр»: прежний общий список остаётся доступен. */
const FOLDER_ALL = "__all__";
const FOLDER_NO_YEAR = "__none__";

const contractFolderYear = (contract: ContractRegistryItem): string => {
  const year = (contract.contractDate ?? "").slice(0, 4);
  return /^\d{4}$/.test(year) ? year : FOLDER_NO_YEAR;
};

const folderTitle = (year: string): string =>
  year === FOLDER_NO_YEAR ? "Без даты заключения" : `${year} год`;

/** Компактная сумма для узкой метки папки: 1,25 млрд ₽ вместо 1 250 000 000,00. */
const formatMoneyShort = (value: number): string => {
  if (!value) return "0 ₽";
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("ru-RU", {
      maximumFractionDigits: 2,
    })} млрд ₽`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("ru-RU", {
      maximumFractionDigits: 2,
    })} млн ₽`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString("ru-RU")} тыс. ₽`;
  }
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽`;
};

/** «109 контрактов», «1 контракт» — плитка папки читается как подпись. */
const contractsLabel = (count: number): string => {
  const tail = count % 100;
  if (tail >= 11 && tail <= 14) return `${count} контрактов`;
  switch (count % 10) {
    case 1:
      return `${count} контракт`;
    case 2:
    case 3:
    case 4:
      return `${count} контракта`;
    default:
      return `${count} контрактов`;
  }
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

/** Сортировка таблицы контрактов: колонка и направление. */
type SortDirection = "asc" | "desc";

interface TableSort {
  key: string;
  dir: SortDirection;
}

/** Фильтр по статусу: по умолчанию — на исполнении. */
type StatusFilter = ContractRegistryItem["status"] | "all";

// ─── Сортировка таблицы контрактов ─────────────────────────────────────────

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

export default function ContractRegistryPage() {
  const { data: organization } = useCurrentOrganization();
  const orgId = organization?.id;
  const { formatDate } = useUtils();

  const { data: contracts, isLoading } = useContractRegistry(orgId);
  const { mutate: deleteContract } = useDeleteContract();

  // Параметры адреса: ?group=competitive | ?group=single — группа из подменю
  // шапки, ?folder=2026 | ?folder=__all__ — раскрытая папка реестра.
  const [searchParams, setSearchParams] = useSearchParams();
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
  // Сортировка по общему заголовку таблицы: свежие контракты сверху
  const [tableSort, setTableSort] = useState<TableSort | null>({
    key: "date",
    dir: "desc",
  });
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
  // Поставщик выбирается кликом по его названию в строке контракта
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);

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

    // ─── Фильтрация по поставщику (клик по названию в строке) ──────────────
    if (supplierFilter) {
      result = result.filter((c) => (c.supplierName ?? "") === supplierFilter);
    }

    return result;
  }, [
    contracts,
    group,
    placingWayByProcurement,
    statusFilter,
    dateFrom,
    dateTo,
    supplierFilter,
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

    // ─── Сортировка по колонке общего заголовка ────────────────────────────
    return sortTableRows(result, tableSort, (contract, key) => {
      switch (key) {
        case "number":
          return contract.contractNumber ?? "";
        case "supplier":
          return contract.supplierName ?? "";
        case "price":
          return Number(contract.contractPrice) || 0;
        case "advance":
          return Number(contract.advanceAmount) || 0;
        case "date":
          return contract.contractDate ?? "";
        case "execution":
          return contract.executionEndDate ?? "";
        case "status":
          return STATUS_LABELS[contract.status] ?? "";
        default:
          return "";
      }
    });
  }, [filteredContracts, kbkByContract, selectedKbks, tableSort]);

  // ─── Папки по годам заключения ────────────────────────────────────────────
  // Раскладка идёт после фильтров и сортировки: внутри папки сохраняется
  // выбранный порядок граф, а суммы и счётчики считаются по её контрактам.
  const contractFolders = useMemo<ContractFolder[]>(() => {
    const buckets = new Map<string, ContractRegistryItem[]>();
    visibleContracts.forEach((contract) => {
      const year = contractFolderYear(contract);
      const bucket = buckets.get(year);
      if (bucket) bucket.push(contract);
      else buckets.set(year, [contract]);
    });

    return [...buckets.entries()]
      .map(([year, folderContracts]) => ({
        year,
        title: folderTitle(year),
        contracts: folderContracts,
        total: folderContracts.reduce(
          (sum, contract) => sum + (Number(contract.contractPrice) || 0),
          0,
        ),
      }))
      .sort((a, b) => {
        // Свежие годы сверху, записи без даты — в конце
        if (a.year === FOLDER_NO_YEAR) return 1;
        if (b.year === FOLDER_NO_YEAR) return -1;
        return b.year.localeCompare(a.year);
      });
  }, [visibleContracts]);

  // Сумма по всей выборке — для плитки «Все»
  const allContractsTotal = useMemo(
    () =>
      visibleContracts.reduce(
        (sum, contract) => sum + (Number(contract.contractPrice) || 0),
        0,
      ),
    [visibleContracts],
  );

  // Раскрытая папка живёт в адресе (?folder=2026, ?folder=__all__): ссылку
  // можно закрепить. Пока параметра нет — на экране только плитки папок.
  const folderParam = searchParams.get("folder");
  const showAllFolders = folderParam === FOLDER_ALL;
  const activeFolder =
    folderParam && !showAllFolders
      ? (contractFolders.find((folder) => folder.year === folderParam) ?? null)
      : null;
  const folderOpen = showAllFolders || activeFolder !== null;
  const activeContracts: ContractRegistryItem[] = showAllFolders
    ? visibleContracts
    : (activeFolder?.contracts ?? []);
  const activeContractsTotal = activeContracts.reduce(
    (sum, contract) => sum + (Number(contract.contractPrice) || 0),
    0,
  );

  // Выбор папки пишется в адрес; повторный выбор той же папки её закрывает.
  // Новая папка — своя первая страница.
  const openContractFolder = (year: string | null) => {
    const next = year === folderParam ? null : year;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next) params.set("folder", next);
      else params.delete("folder");
      return params;
    });
    setPage(1);
  };

  // ─── Траектории плиток папок ──────────────────────────────────────────────
  // Параболу в CSS не выразить: path() требует конкретные координаты, а они
  // зависят от раскладки (четыре колонки, три, две — разные ширины плиток).
  // Поэтому меряем сетку и каждую плитку по layout-координатам и кладём путь в
  // --fly-path. Точка старта у всех плиток одна — центр сетки: они вылетают
  // «веером» и приходят каждая на своё место.
  const folderGridRef = useRef<HTMLDivElement | null>(null);

  const layoutFolderFlight = useCallback(() => {
    const grid = folderGridRef.current;
    if (!grid) return;
    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-folder-tile]"),
    );
    if (cards.length === 0) return;
    // Сумма offsetLeft/offsetTop по цепочке offsetParent: у сетки и у плитки
    // offsetParent может быть разным, сравнивать координаты «в лоб» нельзя.
    // offsetLeft не зависит от transform, поэтому уже запущенная анимация замер
    // не портит.
    const absoluteOffset = (element: HTMLElement) => {
      let x = 0;
      let y = 0;
      let node: HTMLElement | null = element;
      while (node) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      return { x, y };
    };
    const gridOrigin = absoluteOffset(grid);
    const centerX = gridOrigin.x + grid.offsetWidth / 2;
    const centerY = gridOrigin.y + grid.offsetHeight / 2;

    cards.forEach((card) => {
      const origin = absoluteOffset(card);
      const halfW = card.offsetWidth / 2;
      const halfH = card.offsetHeight / 2;
      // Насколько центр плитки отстоит от центра сетки — это и есть размах дуги
      const dx = centerX - (origin.x + halfW);
      const dy = centerY - (origin.y + halfH);
      // offset-anchor ставит в точку пути центр карточки, а сами координаты
      // пути отсчитываются от её статичного левого верхнего угла. Значит старт
      // пути — «смещение до центра сетки + полуразмер», а финиш — ровно
      // полуразмер: иначе плитка встаёт мимо своего места на полкорпуса.
      // В path() координаты безразмерные: «M 10px 20px» — невалидный SVG-путь,
      // и объявление отбрасывается целиком.
      const startX = dx + halfW;
      const startY = dy + halfH;
      // Контрольная точка выше середины хорды: путь выгибается параболой, а не
      // идёт отрезком. Подъём растёт с размахом, чтобы дуга читалась и у
      // боковых плиток, и у средних.
      const controlX = startX / 2 + halfW / 2 + dx * 0.05;
      const controlY =
        startY / 2 + halfH / 2 - Math.max(60, Math.abs(dx) * 0.26);
      card.style.setProperty(
        "--fly-path",
        `path("M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${halfW.toFixed(1)} ${halfH.toFixed(1)}")`,
      );
    });
  }, []);

  // Замер до первой отрисовки: анимация стартует сразу с готовой траекторией.
  // Сетка появляется только после загрузки контрактов, поэтому мало
  // useLayoutEffect — подписка идёт на момент монтирования узла: к этому
  // времени плитки уже в DOM, и путь считается до первого кадра.
  const attachFolderGrid = useCallback(
    (node: HTMLDivElement | null) => {
      folderGridRef.current = node;
      if (node) layoutFolderFlight();
    },
    [layoutFolderFlight],
  );

  // Возврат из открытого листа: плитки снова сеткой — пересчитываем путь
  useLayoutEffect(() => {
    if (!folderOpen) layoutFolderFlight();
  }, [folderOpen, layoutFolderFlight]);

  // Ресайз меняет ширину плитки, а вместе с ней и «полуразмер» в конце пути:
  // без пересчёта карточка осталась бы смещённой на половину разницы ширин,
  // ведь offset-distance уже стоит на 100 %.
  useEffect(() => {
    const onResize = () => {
      if (!folderOpen) layoutFolderFlight();
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [folderOpen, layoutFolderFlight]);

  // ─── Пагинация ────────────────────────────────────────────────────────────
  const totalPages =
    pageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(activeContracts.length / Number(pageSize)));
  const safePage = Math.min(page, totalPages);
  const start = pageSize === "all" ? 0 : (safePage - 1) * Number(pageSize);
  const pagedContracts =
    pageSize === "all"
      ? activeContracts
      : activeContracts.slice(start, start + Number(pageSize));

  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  const toggleExpand = (id: string | number | undefined) => {
    if (id === undefined) return;
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleTableSort = (key: string) =>
    setTableSort((current) => toggleTableSort(current, key));

  // Клик по поставщику включает фильтр по нему, повторный — снимает
  const toggleSupplierFilter = (supplier: string | undefined) => {
    const value = (supplier ?? "").trim();
    if (!value) return;
    setSupplierFilter((prev) => (prev === value ? null : value));
    setPage(1);
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
      <p className={styles.groupHint}>
        {folderOpen
          ? "Папка раскрыта: папки остаются на экране — любую можно выбрать одним кликом, «Все папки» закрывает лист."
          : "Выберите папку по году заключения — внутри неё весь список контрактов за этот год."}
      </p>

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

      {visibleContracts.length === 0 ? (
        <div className={styles.empty}>
          Контрактов по заданным условиям не найдено
        </div>
      ) : (
        <>
          {supplierFilter && (
            <div className={styles.activeFilter}>
              <span>
                Поставщик: <strong>{supplierFilter}</strong>
              </span>
              <button
                type="button"
                className={styles.activeFilterClear}
                onClick={() => {
                  setSupplierFilter(null);
                  setPage(1);
                }}
              >
                Сбросить
              </button>
            </div>
          )}

          {/* Папки по годам заключения: крупные плитки под фильтрами. Пока
              папка не выбрана, таблицы на экране нет — только папки; после
              выбора лист контрактов занимает основную колонку, а папки
              собираются в рельс справа, чтобы их можно было перевыбрать. */}
          <div
            className={`${styles.folderStage} ${
              folderOpen ? styles.folderStageOpen : ""
            }`}
          >
            <div
              ref={attachFolderGrid}
              className={styles.folderGrid}
              role="group"
              aria-label="Папки по годам заключения"
            >
              <button
                type="button"
                data-folder-tile=""
                className={`${styles.folderCard} ${styles.folderCardAll} ${
                  showAllFolders ? styles.folderCardActive : ""
                }`}
                aria-pressed={showAllFolders}
                onClick={() => openContractFolder(FOLDER_ALL)}
              >
                <span className={styles.folderCardLabel}>Сводный реестр</span>
                <span className={styles.folderCardYear}>Все</span>
                <span className={styles.folderCardMeta}>
                  {contractsLabel(visibleContracts.length)} ·{" "}
                  {formatMoneyShort(allContractsTotal)}
                </span>
                <span className={styles.folderCardArrow} aria-hidden="true">
                  →
                </span>
              </button>

              {contractFolders.map((folder) => (
                <button
                  key={folder.year}
                  type="button"
                  data-folder-tile=""
                  className={`${styles.folderCard} ${
                    activeFolder?.year === folder.year
                      ? styles.folderCardActive
                      : ""
                  }`}
                  aria-pressed={activeFolder?.year === folder.year}
                  onClick={() => openContractFolder(folder.year)}
                >
                  <span className={styles.folderCardLabel}>
                    {folder.year === FOLDER_NO_YEAR
                      ? "Без даты заключения"
                      : `Папка · ${folder.year}`}
                  </span>
                  <span className={styles.folderCardYear}>
                    {folder.year === FOLDER_NO_YEAR ? "—" : folder.year}
                  </span>
                  <span className={styles.folderCardMeta}>
                    {contractsLabel(folder.contracts.length)} ·{" "}
                    {formatMoneyShort(folder.total)}
                  </span>
                  <span className={styles.folderCardArrow} aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>

            {folderOpen && (
              <div key={folderParam} className={styles.folderPanel}>
                <div className={styles.folderHeader}>
                  <button
                    type="button"
                    className={styles.folderBack}
                    onClick={() => openContractFolder(null)}
                  >
                    <span aria-hidden="true">←</span>
                    Все папки
                  </button>
                  <h3 className={styles.folderTitle}>
                    {showAllFolders
                      ? "Весь реестр"
                      : (activeFolder?.title ?? "Реестр контрактов")}
                  </h3>
                  <p className={styles.folderMeta}>
                    {contractsLabel(activeContracts.length)} ·{" "}
                    {formatMoneyShort(activeContractsTotal)}
                  </p>
                </div>

                <div className={styles.contractsTableWrap}>
                  <table className={`${styles.table} ${styles.contractsTable}`}>
                    {/* Ширины колонок фиксированы: фильтрация не должна их менять */}
                    <colgroup>
                      <col className={styles.colNumber} />
                      <col className={styles.colSupplier} />
                      <col className={styles.colPrice} />
                      <col className={styles.colAdvance} />
                      <col className={styles.colDate} />
                      <col className={styles.colExecution} />
                      <col className={styles.colStatus} />
                      <col className={styles.colExpand} />
                    </colgroup>
                    <thead>
                      <tr>
                        <SortableTh
                          label="Номер"
                          sortKey="number"
                          sort={tableSort}
                          onSort={handleTableSort}
                        />
                        <SortableTh
                          label="Поставщик"
                          sortKey="supplier"
                          sort={tableSort}
                          onSort={handleTableSort}
                        />
                        <SortableTh
                          label="Цена, ₽"
                          sortKey="price"
                          sort={tableSort}
                          onSort={handleTableSort}
                        />
                        <SortableTh
                          label="Аванс, ₽"
                          sortKey="advance"
                          sort={tableSort}
                          onSort={handleTableSort}
                        />
                        <SortableTh
                          label="Заключён"
                          sortKey="date"
                          sort={tableSort}
                          onSort={handleTableSort}
                        />
                        <SortableTh
                          label="Срок исполнения"
                          sortKey="execution"
                          sort={tableSort}
                          onSort={handleTableSort}
                        />
                        <SortableTh
                          label="Статус"
                          sortKey="status"
                          sort={tableSort}
                          onSort={handleTableSort}
                        />
                        <th className={styles.expandCell}>
                          <span className="visually-hidden">Развернуть</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedContracts.map((contract, rowIndex) => (
                        <ContractRow
                          key={contract.id}
                          contract={contract}
                          index={rowIndex}
                          expanded={expandedId === contract.id}
                          onToggle={() => toggleExpand(contract.id)}
                          onSupplierClick={toggleSupplierFilter}
                          activeSupplier={supplierFilter}
                          onDelete={() => {
                            if (
                              contract.id &&
                              confirm("Удалить контракт из реестра?")
                            ) {
                              deleteContract(contract.id);
                            }
                          }}
                          formatDate={formatDate}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ─── Пагинация ──────────────────────────────────────────────────── */}
                {totalPages > 1 && (
                  <div className={styles.pager}>
                    <button
                      type="button"
                      className={styles.pagerButton}
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                      disabled={safePage === 1}
                    >
                      Назад
                    </button>
                    <span className={styles.pagerInfo}>
                      {start + 1}–
                      {Math.min(
                        start + pagedContracts.length,
                        activeContracts.length,
                      )}{" "}
                      из {activeContracts.length}
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
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Строка таблицы контрактов ──────────────────────────────────────────────

interface ContractRowProps {
  contract: ContractRegistryItem;
  /** Порядковый номер в выборке: задаёт задержку построчного раскрытия */
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSupplierClick: (supplier: string | undefined) => void;
  activeSupplier: string | null;
  formatDate: (date?: string) => string;
}

/**
 * Строка таблицы контрактов: наименование — отдельной полноширинной строкой
 * (по нему чаще всего ищут контракт), реквизиты — в колонках общего заголовка,
 * подробности (ЕИС, платежи, этапы, неустойки, поставки, СМП) — в отдельной
 * строке, которая раскрывается по клику на название, реквизиты или шеврон.
 */
function ContractRow({
  contract,
  index,
  expanded,
  onToggle,
  onDelete,
  onSupplierClick,
  activeSupplier,
  formatDate,
}: ContractRowProps) {
  const overdue = isContractOverdue(contract);
  // Каскад построчного раскрытия: задержка растёт по порядку, но не дальше
  // восьмой строки — на 25 записях лист не должен пустовать почти секунду.
  const rowStyle = { animationDelay: `${Math.min(index, 8) * 40}ms` };

  return (
    <>
      <tr
        style={rowStyle}
        className={`${styles.contractTitleRow} ${
          overdue ? styles.contractRowOverdue : ""
        } ${expanded ? styles.contractRowExpanded : ""}`}
        onClick={onToggle}
      >
        <td colSpan={8}>{contract.contractName}</td>
      </tr>

      <tr
        style={rowStyle}
        className={`${styles.contractRow} ${
          expanded ? styles.contractRowExpanded : ""
        }`}
        onClick={onToggle}
      >
        <td className={styles.contractNumber}>{contract.contractNumber}</td>
        <td>
          {contract.supplierName ? (
            <button
              type="button"
              className={`${styles.supplierButton} ${
                activeSupplier === contract.supplierName
                  ? styles.supplierButtonActive
                  : ""
              }`}
              aria-pressed={activeSupplier === contract.supplierName}
              title="Показать контракты этого поставщика"
              onClick={(event) => {
                event.stopPropagation();
                onSupplierClick(contract.supplierName);
              }}
            >
              {contract.supplierName}
            </button>
          ) : (
            "—"
          )}
        </td>
        <td className={styles.moneyCell}>
          {formatMoney(contract.contractPrice)}
        </td>
        <td className={styles.moneyCell}>
          {formatMoney(contract.advanceAmount)}
        </td>
        <td>{formatDate(contract.contractDate)}</td>
        <td>
          {formatDate(contract.executionStartDate)} —{" "}
          {formatDate(contract.executionEndDate)}
        </td>
        <td>
          <span className={styles.statusCell}>
            <span
              className={`${styles.statusBadge} ${styles[`status_${contract.status}`]}`}
            >
              {STATUS_LABELS[contract.status]}
            </span>
            {overdue && <span className={styles.overdueBadge}>Просрочен</span>}
          </span>
        </td>
        <td className={styles.expandCell}>
          <button
            type="button"
            className={styles.chevronButton}
            aria-expanded={expanded}
            aria-label={expanded ? "Свернуть контракт" : "Развернуть контракт"}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
          >
            {expanded ? "▲" : "▼"}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className={styles.expandedRow}>
          <td colSpan={8} className={styles.expandedCell}>
            <div className={styles.cardBody}>
              <ContractEisSection contract={contract} />
              <PaymentSummary contract={contract} />
              {/* Фактические акты приёмки и платёжные поручения из публичной
                  карточки ЕИС: ручные contractPayments и contractDeliveries
                  сейчас пусты, поэтому без проекции сводка показывает «0 %» */}
              <ContractCardProjectionSection contractId={contract.id} />
              {/* Приёмка из нашего контура (csms-api): документы, которые
                  проходят сценарии ст. 94, в отличие от выгрузки ЕИС выше */}
              <ContractAcceptanceSection contractId={contract.id} />
              <ContractEventsSection contractId={contract.id ?? ""} />
              <StagesSection contractId={contract.id} />
              <PaymentsSection contractId={contract.id} />
              <PenaltiesSection contractId={contract.id} />
              <DeliveriesSection contractId={contract.id} />
              {/* Требование СМП наследуется из служебки, но у контрактов,
                  импортированных из ЕИС, его нет: блок не скрываем, иначе объём
                  и уже загруженные сведения СМП вообще не увидеть */}
              <SmpSection
                contractId={contract.id ?? ""}
                contractPrice={contract.contractPrice}
                smpRequiredPercent={contract.smpRequiredPercent}
                subcontractingSmpNoteNumber={
                  contract.subcontractingSmpNoteNumber
                }
              />

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
                    to={`/acceptances/new?contractId=${String(
                      contract.id ?? "",
                    )}`}
                  >
                    Приёмка
                  </Link>
                  <button className={styles.btnDanger} onClick={onDelete}>
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
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

// ─── Этапы ──────────────────────────────────────────────────────────────────

function StagesSection({ contractId }: { contractId?: string | number }) {
  const { data: stages } = useContractStages(contractId);

  if (!stages || stages.length === 0) return null;

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>Этапы исполнения</h4>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>№</th>
            <th>Идентификатор ЕИС (sid)</th>
            <th>Наименование</th>
            <th>Период</th>
            <th>Сумма, ₽</th>
            <th>По годам (paymentsSumInfo)</th>
            <th>Оплачено, ₽</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s: ContractStage) => (
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
  const [formOpen, setFormOpen] = useState(false);

  if (!contractId) return null;

  const list = payments ?? [];

  return (
    <section className={styles.subSection}>
      <div className={styles.subHeader}>
        <h4 className={styles.subTitle}>
          Платежи (ручной учёт, ст. 34 ч. 12, 13.1)
        </h4>
        {!formOpen && (
          <button
            type="button"
            className={styles.btnSmall}
            onClick={() => setFormOpen(true)}
          >
            + Платёж
          </button>
        )}
      </div>

      {formOpen && (
        <ContractPaymentForm
          contractId={contractId}
          onDone={() => setFormOpen(false)}
        />
      )}

      {list.length === 0 ? (
        <p className={styles.projectionEmpty}>
          Ручных платежей нет. Фактическая оплата из выгрузки ЕИС — в секции
          «Приёмка и оплата по данным карточки ЕИС».
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Документ</th>
              <th>Дата</th>
              <th>Тип</th>
              <th>Код XSD</th>
              <th>Сумма, ₽</th>
              <th>Банковский документ</th>
              <th>Реестровый номер исполнения</th>
              <th>Срок оплаты</th>
              <th>Статус</th>
              <th>Казначейство</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p: ContractPayment) => (
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
      )}
    </section>
  );
}

// ─── Неустойки ──────────────────────────────────────────────────────────────

function PenaltiesSection({ contractId }: { contractId?: string | number }) {
  const { data: penalties } = useContractPenalties(contractId);

  if (!penalties || penalties.length === 0) return null;

  const total = totalPenalties(penalties);

  return (
    <section className={styles.subSection}>
      <h4 className={styles.subTitle}>
        Неустойки (ст. 34 ч. 5) — итого: {formatMoney(total)} ₽
      </h4>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Выявлено</th>
            <th>Тип</th>
            <th>Нарушение</th>
            <th>Сумма, ₽</th>
            <th>Статус</th>
            <th>Основание</th>
          </tr>
        </thead>
        <tbody>
          {penalties.map((p: ContractPenalty) => (
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
  const [formOpen, setFormOpen] = useState(false);

  if (!contractId) return null;

  const list = deliveries ?? [];

  return (
    <section className={styles.subSection}>
      <div className={styles.subHeader}>
        <h4 className={styles.subTitle}>
          Поставки и приёмка (ручной реестр, ст. 94)
        </h4>
        {!formOpen && (
          <button
            type="button"
            className={styles.btnSmall}
            onClick={() => setFormOpen(true)}
          >
            + Акт
          </button>
        )}
      </div>

      {formOpen && (
        <ContractDeliveryForm
          contractId={contractId}
          onDone={() => setFormOpen(false)}
        />
      )}

      {list.length === 0 ? (
        <p className={styles.projectionEmpty}>
          Поставок нет. Полный сценарий приёмки — с расхождениями, отказом и
          регистрацией в ЕИС — ведётся в электронном актировании.
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Наименование</th>
              <th>Кол-во</th>
              <th>Сумма, ₽</th>
              <th>Акт</th>
              <th>Результат</th>
            </tr>
          </thead>
          <tbody>
            {list.map((d: ContractDelivery) => (
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
      )}

      <div className={styles.projectionMeta}>
        <span>Новые приёмки оформляются в электронном актировании</span>
        <Link
          className={styles.projectionLink}
          to={`/acceptances?contractId=${String(contractId)}`}
        >
          Открыть приёмки по контракту
        </Link>
      </div>
    </section>
  );
}
