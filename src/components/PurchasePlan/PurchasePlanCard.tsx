import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import useUtils from "../../hooks/useUtils";
import {
  usePurchasePlan,
  useUpdatePurchasePlan,
} from "../../services/PurchasePlan/purchasePlan.api";
import { useCurrentOrganization } from "../../services/Organization/organization.api";
import {
  formatKbk,
  formatMoney,
  formatMoneyValue,
  ownerRoleOptions,
  pfhdTypeOptions,
  planPeriodLabels,
  planTotalAmount,
  positionStatusLabel,
  positionStatusOptions,
  purchasePlanStatusLabel,
} from "./purchasePlan.config";
import {
  positionKbkCodes,
  positionKbkEntries,
  toNumber,
  type PurchasePlanPosition,
  type PurchasePlanSpecialPurchase,
} from "../../services/PurchasePlan/purchasePlan.schema";
import { usePurchaseNotes } from "../../services/PurchaseNote/purchaseNote.api";
import { purchaseNotesForPosition } from "../../services/PurchaseNote/purchaseNote.schema";
import { checkOkpd2AuctionList } from "../../services/Okpd2Ref/auctionListControl";
import {
  findOkpd2ByCode,
  useOkpd2Dictionary,
} from "../../services/Okpd2Ref/okpd2Ref.api";
import LegalActRefs from "../LegalAct/LegalActRefs";
import PurchaseNoteStatusBadge from "../PurchaseNote/PurchaseNoteStatusBadge";
import PageSizePicker, { type PageSizeValue } from "../UI/PageSizePicker";
import PurchasePlanVersionsModal from "./PurchasePlanVersionsModal";
import { usePurchasePlanVersions } from "../../services/PurchasePlan/purchasePlanVersion.api";
import {
  buildTenderPlan2020XmlPreview,
  validatePurchasePlanEis17,
} from "../../services/Eis/eis17Types";
import { downloadText } from "../../services/Eis/eisExport";
import styles from "./PurchasePlanCard.module.scss";

type PlanTabKey = "general" | "positions" | "special" | "summary";

const VALID_TABS: readonly PlanTabKey[] = [
  "general",
  "positions",
  "special",
  "summary",
];

// Размеры страниц таблицы позиций ПГ — как в ЕИС (10 / 25 / 50 / все)
const PAGE_SIZES = [10, 25, 50] as const;
const ALL_PAGES = "all";

interface FinancialTotals {
  total: number;
  currentYear: number;
  firstYear: number;
  secondYear: number;
  subsequentYears: number;
}

const emptyTotals = (): FinancialTotals => ({
  total: 0,
  currentYear: 0,
  firstYear: 0,
  secondYear: 0,
  subsequentYears: 0,
});

const addTotals = (acc: FinancialTotals, item: {
  amountTotal?: string | number;
  amountCurrentYear?: string | number;
  amountPlanPeriodFirstYear?: string | number;
  amountPlanPeriodSecondYear?: string | number;
  amountSubsequentYears?: string | number;
}): FinancialTotals => ({
  total: acc.total + (toNumber(item.amountTotal) ?? 0),
  currentYear: acc.currentYear + (toNumber(item.amountCurrentYear) ?? 0),
  firstYear: acc.firstYear + (toNumber(item.amountPlanPeriodFirstYear) ?? 0),
  secondYear: acc.secondYear + (toNumber(item.amountPlanPeriodSecondYear) ?? 0),
  subsequentYears:
    acc.subsequentYears + (toNumber(item.amountSubsequentYears) ?? 0),
});

export default function PurchasePlanCard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: organization, isLoading: isOrgLoading } =
    useCurrentOrganization();
  const organizationId = organization?.id;
  const {
    data: plan,
    isLoading,
    isError,
    error,
  } = usePurchasePlan(id, organizationId);
  const { mutate: updatePlan, isPending: isUpdatingPlan } =
    useUpdatePurchasePlan();
  const { data: okpd2Refs = [] } = useOkpd2Dictionary();
  const { data: purchaseNotes = [] } = usePurchaseNotes(organizationId);
  const { data: planVersions = [] } = usePurchasePlanVersions(
    id,
    organizationId,
  );

  const [confirmDeletePositionId, setConfirmDeletePositionId] = useState<
    string | null
  >(null);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [showEisXml, setShowEisXml] = useState(false);
  const [fallbackYear] = useState(() => new Date().getFullYear());
  const { bem, formatDate } = useUtils();
  const block = bem(styles, "purchase-plan-card");

  // Активная вкладка синхронизируется с query-параметром ?tab= (general / positions / special / summary)
  const rawTab = searchParams.get("tab") as PlanTabKey | null;
  const activeTab: PlanTabKey =
    rawTab && VALID_TABS.includes(rawTab) ? rawTab : "general";

  const selectTab = (tab: PlanTabKey) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "general") {
      next.delete("tab");
    } else {
      next.set("tab", tab);
    }
    setSearchParams(next, { replace: true });
  };

  // Фильтры и пагинация вкладки «Позиции плана-графика»
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState<PageSizeValue>(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);

  const [openActionsPositionId, setOpenActionsPositionId] = useState<
    string | null
  >(null);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      const target = event.target as Node | null;

      if (
        target instanceof Element &&
        !target.closest("details[data-plan-actions]")
      ) {
        setOpenActionsPositionId(null);
        setConfirmDeletePositionId(null);
      }
    }

    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, []);

  function handleDeletePosition(positionId: string | number | undefined) {
    if (!plan || !plan.id || positionId === undefined) return;
    const nextPositions = (plan.positions ?? []).filter(
      (item) => String(item.id) !== String(positionId),
    );
    updatePlan(
      {
        id: plan.id,
        data: {
          ...plan,
          positions: nextPositions,
        },
      },
      {
        onSuccess: () => {
          setConfirmDeletePositionId(null);
          setOpenActionsPositionId(null);
        },
      },
    );
  }

  const positions = useMemo(() => plan?.positions ?? [], [plan]);
  const specialPurchases: PurchasePlanSpecialPurchase[] = useMemo(
    () => plan?.specialPurchases ?? [],
    [plan],
  );

  // Доступные годы размещения для фильтра позиций
  const availablePlacementYears = useMemo(() => {
    const set = new Set<string>();
    for (const pos of positions) {
      if (pos.plannedPlacementYear) {
        set.add(String(pos.plannedPlacementYear));
      }
    }
    return Array.from(set).sort();
  }, [positions]);

  const filteredPositions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const compactQuery = query.replace(/\s/g, "");

    return positions.filter((position) => {
      const posStatus = position.status ?? "planned";
      if (statusFilter !== "all" && posStatus !== statusFilter) {
        return false;
      }
      if (
        yearFilter !== "all" &&
        String(position.plannedPlacementYear ?? "") !== yearFilter
      ) {
        return false;
      }
      if (!query) {
        return true;
      }

      const haystack = [
        position.identificationCode,
        position.uniqueNumber,
        position.purchaseNumber,
        position.objectOfPurchase,
        position.objectName,
        position.okpd2Code,
        position.okpd2Name,
        position.ktruCode,
        position.ktruName,
        position.authorizedBodyName,
        ...positionKbkCodes(position),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        haystack.includes(query) ||
        positionKbkCodes(position)
          .join("")
          .replace(/\s/g, "")
          .includes(compactQuery) ||
        (position.identificationCode ?? "").toLowerCase().includes(compactQuery)
      );
    });
  }, [positions, searchQuery, statusFilter, yearFilter]);

  const isPaged = pageSize !== ALL_PAGES;
  const totalPages = isPaged
    ? Math.max(1, Math.ceil(filteredPositions.length / Number(pageSize)))
    : 1;
  const currentPage = Math.min(page, totalPages);
  const visiblePositions = isPaged
    ? filteredPositions.slice(
        (currentPage - 1) * Number(pageSize),
        currentPage * Number(pageSize),
      )
    : filteredPositions;

  // Сводные финансовые показатели по активным и исключённым позициям + особым закупкам
  const summaryStats = useMemo(() => {
    const activePositions = positions.filter((p) => p.status !== "cancelled");
    const cancelledPositions = positions.filter(
      (p) => p.status === "cancelled",
    );

    const positionsTotals = activePositions.reduce(addTotals, emptyTotals());
    const cancelledTotals = cancelledPositions.reduce(
      addTotals,
      emptyTotals(),
    );
    const specialTotals = specialPurchases.reduce(addTotals, emptyTotals());

    const grandTotals: FinancialTotals = {
      total: positionsTotals.total + specialTotals.total,
      currentYear: positionsTotals.currentYear + specialTotals.currentYear,
      firstYear: positionsTotals.firstYear + specialTotals.firstYear,
      secondYear: positionsTotals.secondYear + specialTotals.secondYear,
      subsequentYears:
        positionsTotals.subsequentYears + specialTotals.subsequentYears,
    };

    // Группировка по КБК
    const kbkMap = new Map<string, FinancialTotals>();
    for (const pos of activePositions) {
      const entries = positionKbkEntries(pos);
      if (entries.length === 0) {
        const key = "Без детализации по КБК";
        const cur = kbkMap.get(key) ?? emptyTotals();
        kbkMap.set(key, addTotals(cur, pos));
      } else if (entries.length === 1 && !entries[0].amountTotal) {
        const key = entries[0].kbk || "Без детализации по КБК";
        const cur = kbkMap.get(key) ?? emptyTotals();
        kbkMap.set(key, addTotals(cur, pos));
      } else {
        for (const entry of entries) {
          const key = entry.kbk || "Без кода КБК";
          const cur = kbkMap.get(key) ?? emptyTotals();
          kbkMap.set(key, addTotals(cur, entry));
        }
      }
    }

    // Группировка по КВР
    const kvrMap = new Map<string, FinancialTotals>();
    for (const pos of activePositions) {
      if (pos.kvrEntries && pos.kvrEntries.length > 0) {
        for (const entry of pos.kvrEntries) {
          const key = entry.kvr || "Не указан";
          const cur = kvrMap.get(key) ?? emptyTotals();
          kvrMap.set(key, addTotals(cur, entry));
        }
      } else {
        const fallbackKbk = pos.kbk || pos.kbkEntries?.[0]?.kbk || "";
        const derivedKvr =
          pos.kvr ||
          (fallbackKbk.length >= 3 ? fallbackKbk.slice(-3) : "") ||
          (pos.identificationCode && pos.identificationCode.length === 36
            ? pos.identificationCode.slice(-3)
            : "") ||
          "Не указан";
        const cur = kvrMap.get(derivedKvr) ?? emptyTotals();
        kvrMap.set(derivedKvr, addTotals(cur, pos));
      }
    }
    for (const sp of specialPurchases) {
      const derivedKvr =
        sp.kvr ||
        (sp.ikz && sp.ikz.length === 36 ? sp.ikz.slice(-3) : "") ||
        "Особые закупки";
      const cur = kvrMap.get(derivedKvr) ?? emptyTotals();
      kvrMap.set(derivedKvr, addTotals(cur, sp));
    }

    const kbkRows = Array.from(kbkMap.entries())
      .map(([code, sums]) => ({ code, sums }))
      .sort((a, b) => a.code.localeCompare(b.code, "ru"));

    const kvrRows = Array.from(kvrMap.entries())
      .map(([code, sums]) => ({ code, sums }))
      .sort((a, b) => a.code.localeCompare(b.code, "ru"));

    return {
      activeCount: activePositions.length,
      cancelledCount: cancelledPositions.length,
      positionsTotals,
      cancelledTotals,
      specialTotals,
      grandTotals,
      kbkRows,
      kvrRows,
    };
  }, [positions, specialPurchases]);

  if (isOrgLoading) {
    return (
      <p className={block("status")}>Определяем организацию заказчика...</p>
    );
  }

  if (!organizationId) {
    return (
      <div className={block()}>
        <p className={block("status", ["error"])}>
          К вашей учётной записи не привязана организация-заказчик, поэтому
          планы-графики недоступны. Обратитесь к администратору системы.
        </p>
        <button
          type="button"
          className={block("back")}
          onClick={() => navigate("/purchase-plans")}
        >
          ← К списку планов-графиков
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <p className={block("status")}>Загрузка плана-графика...</p>;
  }

  if (isError || !plan) {
    return (
      <div className={block()}>
        <p className={block("status", ["error"])}>
          План-график недоступен: {String(error)}
        </p>
        <button
          type="button"
          className={block("back")}
          onClick={() => navigate("/purchase-plans")}
        >
          ← К списку планов-графиков
        </button>
      </div>
    );
  }

  const { customer } = plan;
  const planId = plan.id as string | number;
  const yearNum = Number(plan.planYear) || fallbackYear;
  const firstPlanYr = plan.planPeriodFirstYear || String(yearNum + 1);
  const secondPlanYr = plan.planPeriodSecondYear || String(yearNum + 2);
  const periodLabels = planPeriodLabels(plan.planYear);

  const ownerRoleText =
    ownerRoleOptions.find((o) => o.value === (plan.ownerRole ?? "CU"))?.label ??
    plan.ownerRole ??
    "—";
  const pfhdTypeText =
    pfhdTypeOptions.find((o) => o.value === (plan.pfhdType ?? "IND"))?.label ??
    plan.pfhdType ??
    "—";

  const declaredTotal = planTotalAmount(plan);
  const kpiCurrent = summaryStats.grandTotals.currentYear;
  const kpiFirst = summaryStats.grandTotals.firstYear;
  const kpiSecond = summaryStats.grandTotals.secondYear;
  const kpiSubsequent = summaryStats.grandTotals.subsequentYears;

  function renderActionsCell(position: PurchasePlanPosition): React.ReactNode {
    const positionKey = String(position.id ?? "");
    const isConfirmingDelete = confirmDeletePositionId === positionKey;

    return (
      <details
        className={block("menu")}
        data-plan-actions
        open={openActionsPositionId === positionKey}
        onToggle={(event) => {
          const isOpen = event.currentTarget.open;
          setOpenActionsPositionId(isOpen ? positionKey : null);
          if (!isOpen) {
            setConfirmDeletePositionId(null);
          }
        }}
      >
        <summary className={block("menu-trigger")}>Действия</summary>
        <div className={block("menu-list")}>
          <button
            className={block("menu-item")}
            type="button"
            onClick={() => {
              setOpenActionsPositionId(null);
              navigate(
                `/purchase-plans/${planId}/positions/${position.id}/edit`,
              );
            }}
          >
            Открыть / изменить
          </button>
          <button
            className={block("menu-item")}
            type="button"
            disabled={position.id === undefined}
            onClick={() => {
              setOpenActionsPositionId(null);
              navigate(
                `/nmck-calculator?planId=${planId}&positionId=${position.id}`,
              );
            }}
          >
            Рассчитать НМЦК
          </button>
          <button
            className={block("menu-item")}
            type="button"
            disabled={position.id === undefined}
            onClick={() => {
              setOpenActionsPositionId(null);
              navigate(
                `/purchase-plans/${planId}/positions/${position.id}/requirement`,
              );
            }}
          >
            Сформировать потребность
          </button>
          {!isConfirmingDelete ? (
            <button
              className={block("menu-item", ["danger"])}
              type="button"
              disabled={isUpdatingPlan || position.id === undefined}
              onClick={() => setConfirmDeletePositionId(positionKey)}
            >
              Удалить
            </button>
          ) : (
            <div className={block("menu-confirm")}>
              <span>Удалить эту позицию ПГ?</span>
              <div className={block("menu-confirm-actions")}>
                <button
                  type="button"
                  className={block("menu-confirm-btn")}
                  disabled={isUpdatingPlan}
                  onClick={() => handleDeletePosition(position.id)}
                >
                  {isUpdatingPlan ? "Удаление..." : "Да, удалить"}
                </button>
                <button
                  type="button"
                  disabled={isUpdatingPlan}
                  onClick={() => setConfirmDeletePositionId(null)}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </details>
    );
  }

  function renderPositionRow(position: PurchasePlanPosition, striped = false) {
    const rowClass = block("row", [...(striped ? ["striped"] : [])]);
    const status = position.status ?? "planned";
    const posNotes = purchaseNotesForPosition(purchaseNotes, position.id);
    const kbkList = positionKbkCodes(position);

    const normedRef = findOkpd2ByCode(okpd2Refs, position.okpd2Code);
    const auctionCheck = checkOkpd2AuctionList(position.okpd2Code, okpd2Refs);
    const okpd2Name = position.okpd2Name || normedRef?.name;
    const normTip = normedRef?.isNormed
      ? normedRef.normLimit !== undefined
        ? `Обязательное нормирование: цена единицы не выше ${formatMoney(normedRef.normLimit)} (ПП РФ N 926)`
        : "Обязательное нормирование: предельная цена единицы устанавливается правовым актом (ПП РФ N 926)"
      : undefined;
    const auctionTip = auctionCheck.inAuctionList
      ? "Аукционный перечень (РП РФ от 21.03.2016 № 471-р): при конкурентной закупке обязателен электронный аукцион"
      : undefined;

    const hasYearSplit =
      (toNumber(position.amountCurrentYear) ?? 0) > 0 ||
      (toNumber(position.amountPlanPeriodFirstYear) ?? 0) > 0 ||
      (toNumber(position.amountPlanPeriodSecondYear) ?? 0) > 0 ||
      (toNumber(position.amountSubsequentYears) ?? 0) > 0;

    return (
      <Fragment key={String(position.id ?? position.serialNumber)}>
        <tr className={rowClass}>
          <td className={block("cell", ["center", "narrow"])}>
            {position.plannedPlacementYear || "—"}
          </td>
          <td className={block("cell", ["center", "narrow"])}>
            <span className={block("code", ["bold"])}>
              {position.purchaseNumber
                ? String(position.purchaseNumber).padStart(4, "0")
                : "—"}
            </span>
            {position.uniqueNumber && (
              <span
                className={block("sub")}
                title="Уникальный номер позиции в ПГ"
              >
                УНП: {position.uniqueNumber.slice(-6)}
              </span>
            )}
          </td>
          <td className={block("cell", ["wide"])}>
            <button
              type="button"
              className={block("object-link")}
              onClick={() =>
                position.id !== undefined &&
                navigate(
                  `/purchase-plans/${planId}/positions/${position.id}/edit`,
                )
              }
            >
              {position.objectOfPurchase || "Без наименования"}
            </button>
            {position.objectName &&
              position.objectName !== position.objectOfPurchase && (
                <span className={block("sub-text")}>
                  {position.objectName}
                </span>
              )}
            {(position.authorizedBodyName ||
              position.jointOrganizerName ||
              position.isEnergyServiceContract ||
              position.isConstructionWorks) && (
              <div className={block("meta-inline")}>
                {position.authorizedBodyName && (
                  <span className={block("meta-chip")}>
                    УО: {position.authorizedBodyName}
                  </span>
                )}
                {position.jointOrganizerName && (
                  <span className={block("meta-chip")}>
                    Совместная: {position.jointOrganizerName}
                  </span>
                )}
                {position.isEnergyServiceContract && (
                  <span className={block("meta-chip")}>Энергосервис</span>
                )}
                {position.isConstructionWorks && (
                  <span className={block("meta-chip")}>ОКС / КОКС</span>
                )}
              </div>
            )}
          </td>
          <td className={block("cell")}>
            <div className={block("okpd2")}>
              {position.okpd2Code && (
                <span className={block("code")}>{position.okpd2Code}</span>
              )}
              <span className={block("okpd2-name")}>
                {okpd2Name || position.okpd2Code || "—"}
                {normTip && (
                  <span
                    className={block("info")}
                    title={normTip}
                    aria-label={normTip}
                  >
                    i
                  </span>
                )}
                {auctionTip && (
                  <span
                    className={block("info")}
                    title={auctionTip}
                    aria-label={auctionTip}
                  >
                    А
                  </span>
                )}
              </span>
              {position.ktruCode && (
                <span className={block("sub")}>
                  КТРУ: {position.ktruCode}
                </span>
              )}
            </div>
          </td>
          <td className={block("cell", ["amount"])} rowSpan={2}>
            <span className={block("amount")}>
              {formatMoneyValue(position.amountTotal)}
            </span>
            {hasYearSplit && (
              <div className={block("amount-years")}>
                <span>
                  {yearNum}: {formatMoneyValue(position.amountCurrentYear ?? 0)}
                </span>
                <span>
                  {firstPlanYr}:{" "}
                  {formatMoneyValue(position.amountPlanPeriodFirstYear ?? 0)}
                </span>
                <span>
                  {secondPlanYr}:{" "}
                  {formatMoneyValue(position.amountPlanPeriodSecondYear ?? 0)}
                </span>
                {(toNumber(position.amountSubsequentYears) ?? 0) > 0 && (
                  <span>
                    Последующие:{" "}
                    {formatMoneyValue(position.amountSubsequentYears)}
                  </span>
                )}
              </div>
            )}
          </td>
          <td className={block("cell", ["center"])} rowSpan={2}>
            <div className={block("status-stack")}>
              <span className={block("status-tag", [status, "compact"])}>
                {positionStatusLabel(status)}
              </span>
              {position.statusDate && (
                <span className={block("sub", ["compact"])}>
                  от {formatDate(position.statusDate)}
                </span>
              )}
              {posNotes.map((note) => (
                <div
                  key={String(note.id ?? note.noteNumber)}
                  className={block("note-status-line")}
                >
                  <span className={block("sub", ["compact"])}>
                    СЗ №{note.noteNumber}:
                  </span>
                  <PurchaseNoteStatusBadge status={note.status} compact />
                </div>
              ))}
            </div>
          </td>
          <td className={block("cell", ["center", "narrow"])} rowSpan={2}>
            {position.isPublicDiscussionRequired ? "Да" : "Нет"}
          </td>
          <td className={block("cell", ["actions"])} rowSpan={2}>
            {renderActionsCell(position)}
          </td>
        </tr>
        <tr className={block("row", ["ikz", ...(striped ? ["striped"] : [])])}>
          <td className={block("cell", ["ikz"])} colSpan={4}>
            <div className={block("ikz-bar")}>
              <span className={block("ikz-item")}>
                <span className={block("ikz-label")}>ИКЗ:</span>{" "}
                {position.identificationCode ? (
                  <span className={block("code", ["ikz"])}>
                    {position.identificationCode}
                  </span>
                ) : (
                  <span className={block("ikz-empty")}>не сформирован</span>
                )}
              </span>
              {kbkList.length > 0 && (
                <span className={block("ikz-item")}>
                  <span className={block("ikz-label")}>КБК:</span>{" "}
                  <span className={block("code")}>
                    {kbkList.map((k) => formatKbk(k)).join(", ")}
                  </span>
                </span>
              )}
            </div>
          </td>
        </tr>
      </Fragment>
    );
  }

  return (
    <section className={block()}>
      {/* Хлебные крошки ЕИС (epz/orderplan/pg2020) */}
      <nav className={block("breadcrumbs")} aria-label="Навигационная цепочка">
        <Link to="/" className={block("crumb")}>
          Главная
        </Link>
        <span className={block("crumb-sep")} aria-hidden="true">
          /
        </span>
        <Link to="/purchase-plans" className={block("crumb")}>
          Планы-графики (44-ФЗ)
        </Link>
        <span className={block("crumb-sep")} aria-hidden="true">
          /
        </span>
        <span className={block("crumb", ["current"])}>
          План-график № {plan.planNumber || "без номера"}
        </span>
      </nav>

      {/* Карточка заголовка документа (cardMainInfo ЕИС pg2020) */}
      <header className={block("card-header")}>
        <div className={block("card-main")}>
          <div className={block("doc-top")}>
            <div className={block("doc-eyebrow-row")}>
              <span className={block("doc-type")}>
                План-график закупок · 44-ФЗ
              </span>
              <span className={block("status-tag", [plan.status])}>
                {purchasePlanStatusLabel(plan.status)}
              </span>
              <button
                type="button"
                className={block("version-chip")}
                onClick={() => setIsVersionsOpen(true)}
                title="Открыть историю редакций и сравнение версий"
              >
                Версия № {plan.versionNumber || "1"}
                {planVersions.length > 0
                  ? ` (в истории: ${planVersions.length})`
                  : ""}
              </button>
            </div>

            <h1 className={block("title")}>
              План-график № {plan.planNumber || "без номера"} на {plan.planYear}{" "}
              год и плановый период {firstPlanYr}–{secondPlanYr} гг.
            </h1>

            <p className={block("customer-line")}>
              <span className={block("customer-label")}>Заказчик:</span>{" "}
              <strong>{customer.fullName || customer.shortName}</strong>
            </p>
            <p className={block("customer-meta")}>
              {customer.inn ? `ИНН ${customer.inn}` : ""}
              {customer.kpp ? ` · КПП ${customer.kpp}` : ""}
              {customer.regNum || customer.consRegistryNum
                ? ` · СПЗ/СвР ${customer.regNum || customer.consRegistryNum}`
                : ""}
              {customer.oktmo ? ` · ОКТМО ${customer.oktmo}` : ""}
            </p>

            <div className={block("dates-strip")}>
              <div className={block("date-item")}>
                <span className={block("date-label")}>Утверждён</span>
                <span className={block("date-value")}>
                  {plan.approvalDate ? formatDate(plan.approvalDate) : "—"}
                </span>
              </div>
              <div className={block("date-item")}>
                <span className={block("date-label")}>Размещён в ЕИС</span>
                <span className={block("date-value")}>
                  {plan.publishDate
                    ? formatDate(plan.publishDate)
                    : "не размещён"}
                </span>
              </div>
              <div className={block("date-item")}>
                <span className={block("date-label")}>Позиций в плане</span>
                <span className={block("date-value")}>{positions.length}</span>
              </div>
              <div className={block("date-item")}>
                <span className={block("date-label")}>Особые закупки</span>
                <span className={block("date-value")}>
                  {specialPurchases.length}
                </span>
              </div>
            </div>
          </div>

          <div className={block("finance-box")}>
            <span className={block("finance-caption")}>
              Актуальный объём финансового обеспечения
            </span>
            <span className={block("finance-total")}>
              {formatMoney(declaredTotal)}
            </span>
            <div className={block("finance-years")}>
              <div className={block("finance-year")}>
                <span>{plan.planYear} г.</span>
                <strong>{formatMoneyValue(kpiCurrent)} ₽</strong>
              </div>
              <div className={block("finance-year")}>
                <span>{firstPlanYr} г.</span>
                <strong>{formatMoneyValue(kpiFirst)} ₽</strong>
              </div>
              <div className={block("finance-year")}>
                <span>{secondPlanYr} г.</span>
                <strong>{formatMoneyValue(kpiSecond)} ₽</strong>
              </div>
              <div className={block("finance-year")}>
                <span>Последующие</span>
                <strong>{formatMoneyValue(kpiSubsequent)} ₽</strong>
              </div>
            </div>
          </div>
        </div>

        <div className={block("toolbar-actions")}>
          <button
            type="button"
            className={block("btn", ["primary"])}
            onClick={() => navigate(`/purchase-plans/${planId}/positions/new`)}
          >
            + Добавить позицию
          </button>
          <button
            type="button"
            className={block("btn")}
            onClick={() => navigate(`/purchase-plans/${planId}/edit`)}
          >
            Редактировать план-график
          </button>
          <button
            type="button"
            className={block("btn")}
            onClick={() => setIsVersionsOpen(true)}
          >
            История версий ({planVersions.length})
          </button>
          <button
            type="button"
            className={block("btn")}
            onClick={() => setShowEisXml((prev) => !prev)}
          >
            {showEisXml ? "Скрыть ЕИС 17.0 / XML" : "Проверка ЕИС 17.0 / XML"}
          </button>
          <button
            type="button"
            className={block("btn")}
            onClick={() => navigate("/purchase-notes")}
          >
            Реестр потребностей (СЗ)
          </button>
        </div>
      </header>

      {/* Проверка схемы ЕИС 17.0 и просмотр XML (вызывается кнопкой из шапки) */}
      {showEisXml && (() => {
        const validation = validatePurchasePlanEis17(plan);
        const xmlPreview = buildTenderPlan2020XmlPreview(plan);
        return (
          <div className={block("eis-preview")}>
            <div className={block("eis-preview-head")}>
              <strong>
                Контроль схемы ЕИС 17.0 (tenderPlan2020Type):{" "}
                {validation.valid
                  ? "ошибок XSD нет"
                  : `ошибок: ${validation.errorsCount}`}
                {validation.warningsCount > 0
                  ? `, предупреждений: ${validation.warningsCount}`
                  : ""}
              </strong>
              <button
                type="button"
                className={block("btn", ["small"])}
                onClick={() =>
                  downloadText(
                    xmlPreview,
                    `tenderPlan2020_${plan.planNumber || "draft"}.xml`,
                    "application/xml;charset=utf-8",
                  )
                }
              >
                Скачать XML 17.0
              </button>
            </div>
            {validation.issues.length > 0 && (
              <ul className={block("eis-issues")}>
                {validation.issues.map((issue, idx) => (
                  <li
                    key={`${issue.field}-${idx}`}
                    className={block("eis-issue", [issue.severity])}
                  >
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
            <pre className={block("eis-xml")}>{xmlPreview}</pre>
          </div>
        );
      })()}

      {/* Навигационные вкладки официального образца ЕИС pg2020 */}
      <div className={block("tabs")} role="tablist" aria-label="Разделы плана-графика">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "general"}
          className={block("tab", activeTab === "general" ? ["active"] : [])}
          onClick={() => selectTab("general")}
        >
          Общая информация
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "positions"}
          className={block("tab", activeTab === "positions" ? ["active"] : [])}
          onClick={() => selectTab("positions")}
        >
          Позиции плана-графика{" "}
          <span className={block("tab-count")}>{positions.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "special"}
          className={block("tab", activeTab === "special" ? ["active"] : [])}
          onClick={() => selectTab("special")}
        >
          Особые закупки{" "}
          <span className={block("tab-count")}>{specialPurchases.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "summary"}
          className={block("tab", activeTab === "summary" ? ["active"] : [])}
          onClick={() => selectTab("summary")}
        >
          Итоговые показатели
        </button>
      </div>

      {/* ===================================================================== */}
      {/* Вкладка 1: Общая информация (blockInfo ЕИС pg2020/general-info.html) */}
      {/* ===================================================================== */}
      {activeTab === "general" && (
        <div className={block("tab-panel")} role="tabpanel">
          <div className={block("info-grid")}>
            <section className={block("info-block")}>
              <h2 className={block("info-title")}>
                Общие сведения о плане-графике
              </h2>
              <dl className={block("dl")}>
                <div className={block("dl-row")}>
                  <dt>Реестровый номер плана-графика</dt>
                  <dd className={block("mono")}>{plan.planNumber || "—"}</dd>
                </div>
                <div className={block("dl-row")}>
                  <dt>Финансовый год и плановый период</dt>
                  <dd>
                    {plan.planYear} год (плановый период {firstPlanYr}–
                    {secondPlanYr} гг.)
                  </dd>
                </div>
                <div className={block("dl-row")}>
                  <dt>Статус документа</dt>
                  <dd>
                    <span className={block("status-tag", [plan.status])}>
                      {purchasePlanStatusLabel(plan.status)}
                    </span>
                  </dd>
                </div>
                <div className={block("dl-row")}>
                  <dt>Номер версии (редакции)</dt>
                  <dd>{plan.versionNumber || "1"}</dd>
                </div>
                <div className={block("dl-row")}>
                  <dt>Роль владельца версии (ЕИС 17.0)</dt>
                  <dd>{ownerRoleText}</dd>
                </div>
                <div className={block("dl-row")}>
                  <dt>Вид ПФХД (tenderPlan2020)</dt>
                  <dd>{pfhdTypeText}</dd>
                </div>
                {plan.externalId && (
                  <div className={block("dl-row")}>
                    <dt>Внешний идентификатор (externalId)</dt>
                    <dd className={block("mono")}>{plan.externalId}</dd>
                  </div>
                )}
                <div className={block("dl-row")}>
                  <dt>Особые отметки / основание</dt>
                  <dd>{plan.remarks || "—"}</dd>
                </div>
              </dl>
            </section>

            <section className={block("info-block")}>
              <h2 className={block("info-title")}>
                Сведения об утверждении, контроле и размещении
              </h2>
              <dl className={block("dl")}>
                <div className={block("dl-row")}>
                  <dt>Дата создания документа</dt>
                  <dd>
                    {plan.createDate ? formatDate(plan.createDate) : "—"}
                  </dd>
                </div>
                <div className={block("dl-row")}>
                  <dt>Дата утверждения плана-графика</dt>
                  <dd>
                    {plan.approvalDate ? formatDate(plan.approvalDate) : "—"}
                  </dd>
                </div>
                <div className={block("dl-row")}>
                  <dt>Лицо, утвердившее план-график</dt>
                  <dd>{plan.approvalAuthor || "—"}</dd>
                </div>
                <div className={block("dl-row")}>
                  <dt>Дата направления на контроль (ч. 5 ст. 99)</dt>
                  <dd>
                    {plan.directDate ? formatDate(plan.directDate) : "—"}
                  </dd>
                </div>
                <div className={block("dl-row")}>
                  <dt>Дата размещения первой версии</dt>
                  <dd>
                    {plan.firstVersionPublishDate
                      ? formatDate(plan.firstVersionPublishDate)
                      : "—"}
                  </dd>
                </div>
                <div className={block("dl-row")}>
                  <dt>Дата размещения актуальной версии</dt>
                  <dd>
                    {plan.publishDate
                      ? formatDate(plan.publishDate)
                      : "не опубликован"}
                  </dd>
                </div>
                <div className={block("dl-row")}>
                  <dt>Ссылка на план-график в ЕИС</dt>
                  <dd>
                    {plan.eisUrl ? (
                      <a
                        href={plan.eisUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={block("ext-link")}
                      >
                        {plan.eisUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <section className={block("info-block")}>
            <h2 className={block("info-title")}>
              Сведения о заказчике (организации, сформировавшей план-график)
            </h2>
            <dl className={block("dl", ["two-col"])}>
              <div className={block("dl-row")}>
                <dt>Полное наименование заказчика</dt>
                <dd>{customer.fullName || "—"}</dd>
              </div>
              <div className={block("dl-row")}>
                <dt>Краткое наименование</dt>
                <dd>{customer.shortName || "—"}</dd>
              </div>
              <div className={block("dl-row")}>
                <dt>ИНН / КПП / ОГРН</dt>
                <dd className={block("mono")}>
                  {customer.inn || "—"} / {customer.kpp || "—"} /{" "}
                  {customer.ogrn || "—"}
                </dd>
              </div>
              <div className={block("dl-row")}>
                <dt>Код по Сводному реестру / СПЗ</dt>
                <dd className={block("mono")}>
                  {customer.consRegistryNum || "—"} / {customer.regNum || "—"}
                </dd>
              </div>
              <div className={block("dl-row")}>
                <dt>Код по ОКТМО / ОКТМО ППО</dt>
                <dd className={block("mono")}>
                  {customer.oktmo || "—"}
                  {customer.oktmoPpo ? ` / ${customer.oktmoPpo}` : ""}
                </dd>
              </div>
              <div className={block("dl-row")}>
                <dt>ОКОПФ / ОКФС</dt>
                <dd className={block("mono")}>
                  {customer.okopf || "—"} / {customer.okfs || "—"}
                </dd>
              </div>
              <div className={block("dl-row")}>
                <dt>Место нахождения (юридический адрес)</dt>
                <dd>{customer.legalAddress || "—"}</dd>
              </div>
              <div className={block("dl-row")}>
                <dt>Почтовый адрес</dt>
                <dd>{customer.postalAddress || "—"}</dd>
              </div>
              <div className={block("dl-row")}>
                <dt>Ответственное должностное лицо</dt>
                <dd>
                  {customer.responsiblePerson || "—"}
                  {customer.responsiblePhone
                    ? ` (тел. ${customer.responsiblePhone})`
                    : ""}
                </dd>
              </div>
              <div className={block("dl-row")}>
                <dt>Контактный телефон / Электронная почта</dt>
                <dd>
                  {customer.phone || "—"} / {customer.email || "—"}
                </dd>
              </div>
            </dl>
          </section>

          <div className={block("quick-jump")}>
            <div>
              <strong>Позиции плана-графика: {positions.length}</strong>
              <span>
                {" "}
                · активных: {summaryStats.activeCount}, исключённых:{" "}
                {summaryStats.cancelledCount} · сумма по позициям:{" "}
                {formatMoney(summaryStats.positionsTotals.total)}
              </span>
            </div>
            <div className={block("quick-jump-actions")}>
              <button
                type="button"
                className={block("btn", ["small"])}
                onClick={() => selectTab("positions")}
              >
                Открыть позиции плана-графика →
              </button>
              <button
                type="button"
                className={block("btn", ["small"])}
                onClick={() => selectTab("summary")}
              >
                Итоговые показатели →
              </button>
            </div>
          </div>

          <LegalActRefs component="PurchasePlanCard" />
        </div>
      )}

      {/* ===================================================================== */}
      {/* Вкладка 2: Позиции плана-графика (EIS pg2020/positions.html)          */}
      {/* ===================================================================== */}
      {activeTab === "positions" && (
        <div className={block("tab-panel")} role="tabpanel">
          <div className={block("section-head")}>
            <h2 className={block("section-title")}>
              Позиции плана-графика ({filteredPositions.length} из{" "}
              {positions.length})
            </h2>
            <button
              type="button"
              className={block("btn", ["primary", "small"])}
              onClick={() =>
                navigate(`/purchase-plans/${planId}/positions/new`)
              }
            >
              + Добавить позицию
            </button>
          </div>

          {positions.length === 0 ? (
            <div className={block("empty-box")}>
              <p className={block("status")}>
                Позиции плана-графика не внесены. Добавьте первую закупку или
                отредактируйте план-график.
              </p>
              <button
                type="button"
                className={block("btn", ["primary"])}
                onClick={() =>
                  navigate(`/purchase-plans/${planId}/positions/new`)
                }
              >
                + Добавить позицию плана-графика
              </button>
            </div>
          ) : (
            <>
              <div className={block("toolbar")}>
                <input
                  className={block("search")}
                  type="search"
                  placeholder="Поиск по ИКЗ, УНП, номеру закупки, объекту, ОКПД2, КТРУ или КБК…"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(1);
                  }}
                />
                <select
                  className={block("filter-select")}
                  aria-label="Фильтр по статусу позиции"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Все статусы</option>
                  {positionStatusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {availablePlacementYears.length > 1 && (
                  <select
                    className={block("filter-select")}
                    aria-label="Фильтр по году размещения"
                    value={yearFilter}
                    onChange={(e) => {
                      setYearFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">Все годы</option>
                    {availablePlacementYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr} год
                      </option>
                    ))}
                  </select>
                )}

                <PageSizePicker
                  sizes={[...PAGE_SIZES, ALL_PAGES]}
                  value={pageSize}
                  allLabel="все"
                  onChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>

              {visiblePositions.length === 0 ? (
                <p className={block("status")}>
                  По заданным условиям позиций плана-графика не найдено.
                </p>
              ) : (
                <div
                  className={
                    openActionsPositionId
                      ? block("table-wrapper", ["open"])
                      : block("table-wrapper")
                  }
                >
                  <table className={block("table")}>
                    <thead>
                      <tr>
                        <th rowSpan={2} className={block("th", ["year"])}>
                          Планируемый год размещения
                        </th>
                        <th
                          className={block("th", ["narrow"])}
                          data-col="number"
                        >
                          № закупки / УНП
                        </th>
                        <th>Наименование объекта (объектов) закупки</th>
                        <th>Наименование по ОКПД2 / КТРУ</th>
                        <th rowSpan={2}>
                          Объём финансового обеспечения (₽)
                        </th>
                        <th rowSpan={2} className={block("th", ["narrow"])}>
                          Статус / СЗ
                        </th>
                        <th rowSpan={2} className={block("th", ["narrow"])}>
                          Общ. обс.
                        </th>
                        <th rowSpan={2}>Действия</th>
                      </tr>
                      <tr>
                        <th colSpan={3}>
                          Идентификационный код закупки (ИКЗ) и КБК
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePositions.map((position, index) =>
                        renderPositionRow(position, index % 2 === 1),
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {isPaged && filteredPositions.length > 0 && (
                <div className={block("pagination")}>
                  <button
                    type="button"
                    className={block("page-btn")}
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    ← Назад
                  </button>
                  <span className={block("page-info")}>
                    Страница {currentPage} из {totalPages} (показано{" "}
                    {visiblePositions.length} из {filteredPositions.length})
                  </span>
                  <button
                    type="button"
                    className={block("page-btn")}
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Вперёд →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* Вкладка 3: Особые закупки (EIS pg2020/special-purchases.html)         */}
      {/* ===================================================================== */}
      {activeTab === "special" && (
        <div className={block("tab-panel")} role="tabpanel">
          <div className={block("section-head")}>
            <h2 className={block("section-title")}>
              Особые закупки (п. 4, 5, 23, 26, 33, 42, 44 ч. 1 ст. 93 44-ФЗ)
            </h2>
          </div>

          {specialPurchases.length === 0 ? (
            <div className={block("empty-box")}>
              <p className={block("status")}>
                Особые закупки в данном плане-графике не предусмотрены (или все
                закупки сформированы отдельными позициями во вкладке «Позиции
                плана-графика»).
              </p>
            </div>
          ) : (
            <div className={block("table-wrapper")}>
              <table className={block("table")}>
                <thead>
                  <tr>
                    <th>Код / Основание особой закупки</th>
                    <th className={block("th", ["narrow"])}>№ / Год</th>
                    <th>ИКЗ особой закупки</th>
                    <th className={block("th", ["narrow"])}>КВР</th>
                    <th>Всего, ₽</th>
                    <th>{periodLabels.currentYear}</th>
                    <th>{periodLabels.firstPlanYear}</th>
                    <th>{periodLabels.secondPlanYear}</th>
                    <th>Последующие</th>
                  </tr>
                </thead>
                <tbody>
                  {specialPurchases.map((sp, idx) => (
                    <tr
                      key={String(sp.id ?? `${sp.typeCode}-${idx}`)}
                      className={block("row", idx % 2 === 1 ? ["striped"] : [])}
                    >
                      <td>
                        <strong>{sp.typeCode}</strong>
                        {sp.typeName && (
                          <div className={block("sub-text")}>{sp.typeName}</div>
                        )}
                      </td>
                      <td className={block("cell", ["center", "narrow"])}>
                        {sp.purchaseNumber || "—"} / {sp.publishYear || plan.planYear}
                      </td>
                      <td>
                        <span className={block("code", ["ikz"])}>
                          {sp.ikz || "—"}
                        </span>
                      </td>
                      <td className={block("cell", ["center", "narrow"])}>
                        <span className={block("code")}>{sp.kvr || "—"}</span>
                      </td>
                      <td className={block("cell", ["amount"])}>
                        <strong>{formatMoneyValue(sp.amountTotal)}</strong>
                      </td>
                      <td className={block("cell", ["amount"])}>
                        {formatMoneyValue(sp.amountCurrentYear)}
                      </td>
                      <td className={block("cell", ["amount"])}>
                        {formatMoneyValue(sp.amountPlanPeriodFirstYear)}
                      </td>
                      <td className={block("cell", ["amount"])}>
                        {formatMoneyValue(sp.amountPlanPeriodSecondYear)}
                      </td>
                      <td className={block("cell", ["amount"])}>
                        {formatMoneyValue(sp.amountSubsequentYears)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={block("total-row")}>
                    <td colSpan={4}>
                      <strong>Итого по особым закупкам:</strong>
                    </td>
                    <td className={block("cell", ["amount"])}>
                      <strong>
                        {formatMoneyValue(summaryStats.specialTotals.total)}
                      </strong>
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(summaryStats.specialTotals.currentYear)}
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(summaryStats.specialTotals.firstYear)}
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(summaryStats.specialTotals.secondYear)}
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(
                        summaryStats.specialTotals.subsequentYears,
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* Вкладка 4: Итоговые показатели (EIS pg2020/final-indicators.html)     */}
      {/* ===================================================================== */}
      {activeTab === "summary" && (
        <div className={block("tab-panel")} role="tabpanel">
          <div className={block("section-head")}>
            <h2 className={block("section-title")}>
              Итоговые показатели финансового обеспечения плана-графика
            </h2>
            <span className={block("reconcile-note")}>
              {Math.abs(declaredTotal - summaryStats.grandTotals.total) < 1
                ? "Сверка итогов пройдена: заявленный объём совпадает с суммой записей"
                : `Отклонение от заявленного объёма: ${formatMoney(
                    declaredTotal - summaryStats.grandTotals.total,
                  )}`}
            </span>
          </div>

          <section className={block("summary-section")}>
            <h3 className={block("summary-subtitle")}>
              Свод по разделам плана-графика (в рублях)
            </h3>
            <div className={block("table-wrapper")}>
              <table className={block("table")}>
                <thead>
                  <tr>
                    <th>Показатель</th>
                    <th>Всего, ₽</th>
                    <th>Текущий год ({plan.planYear})</th>
                    <th>1-й год план. ({firstPlanYr})</th>
                    <th>2-й год план. ({secondPlanYr})</th>
                    <th>Последующие годы</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      Позиции плана-графика (действующие:{" "}
                      {summaryStats.activeCount})
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(summaryStats.positionsTotals.total)}
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(
                        summaryStats.positionsTotals.currentYear,
                      )}
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(summaryStats.positionsTotals.firstYear)}
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(
                        summaryStats.positionsTotals.secondYear,
                      )}
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(
                        summaryStats.positionsTotals.subsequentYears,
                      )}
                    </td>
                  </tr>
                  <tr className={block("row", ["striped"])}>
                    <td>
                      Особые закупки (позиций: {specialPurchases.length})
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(summaryStats.specialTotals.total)}
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(summaryStats.specialTotals.currentYear)}
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(summaryStats.specialTotals.firstYear)}
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(summaryStats.specialTotals.secondYear)}
                    </td>
                    <td className={block("cell", ["amount"])}>
                      {formatMoneyValue(
                        summaryStats.specialTotals.subsequentYears,
                      )}
                    </td>
                  </tr>
                  {summaryStats.cancelledCount > 0 && (
                    <tr>
                      <td className={block("muted-text")}>
                        Справочно: исключённые позиции ({summaryStats.cancelledCount})
                      </td>
                      <td className={block("cell", ["amount"])}>
                        {formatMoneyValue(summaryStats.cancelledTotals.total)}
                      </td>
                      <td className={block("cell", ["amount"])}>
                        {formatMoneyValue(
                          summaryStats.cancelledTotals.currentYear,
                        )}
                      </td>
                      <td className={block("cell", ["amount"])}>
                        {formatMoneyValue(
                          summaryStats.cancelledTotals.firstYear,
                        )}
                      </td>
                      <td className={block("cell", ["amount"])}>
                        {formatMoneyValue(
                          summaryStats.cancelledTotals.secondYear,
                        )}
                      </td>
                      <td className={block("cell", ["amount"])}>
                        {formatMoneyValue(
                          summaryStats.cancelledTotals.subsequentYears,
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className={block("total-row")}>
                    <td>
                      <strong>Итого предусмотрено планом-графиком:</strong>
                    </td>
                    <td className={block("cell", ["amount"])}>
                      <strong>
                        {formatMoneyValue(summaryStats.grandTotals.total)}
                      </strong>
                    </td>
                    <td className={block("cell", ["amount"])}>
                      <strong>
                        {formatMoneyValue(summaryStats.grandTotals.currentYear)}
                      </strong>
                    </td>
                    <td className={block("cell", ["amount"])}>
                      <strong>
                        {formatMoneyValue(summaryStats.grandTotals.firstYear)}
                      </strong>
                    </td>
                    <td className={block("cell", ["amount"])}>
                      <strong>
                        {formatMoneyValue(summaryStats.grandTotals.secondYear)}
                      </strong>
                    </td>
                    <td className={block("cell", ["amount"])}>
                      <strong>
                        {formatMoneyValue(
                          summaryStats.grandTotals.subsequentYears,
                        )}
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className={block("summary-section")}>
            <h3 className={block("summary-subtitle")}>
              Объём финансового обеспечения в разрезе кодов бюджетной
              классификации (КБК)
            </h3>
            {summaryStats.kbkRows.length === 0 ? (
              <p className={block("status")}>
                Данные по КБК отсутствуют — нет активных позиций плана-графика.
              </p>
            ) : (
              <div className={block("table-wrapper")}>
                <table className={block("table")}>
                  <thead>
                    <tr>
                      <th>Код бюджетной классификации (КБК)</th>
                      <th>Всего, ₽</th>
                      <th>Текущий ({plan.planYear})</th>
                      <th>1-й год ({firstPlanYr})</th>
                      <th>2-й год ({secondPlanYr})</th>
                      <th>Последующие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryStats.kbkRows.map(({ code, sums }, idx) => (
                      <tr
                        key={code}
                        className={block("row", idx % 2 === 1 ? ["striped"] : [])}
                      >
                        <td>
                          <span className={block("code")}>
                            {formatKbk(code)}
                          </span>
                        </td>
                        <td className={block("cell", ["amount"])}>
                          <strong>{formatMoneyValue(sums.total)}</strong>
                        </td>
                        <td className={block("cell", ["amount"])}>
                          {formatMoneyValue(sums.currentYear)}
                        </td>
                        <td className={block("cell", ["amount"])}>
                          {formatMoneyValue(sums.firstYear)}
                        </td>
                        <td className={block("cell", ["amount"])}>
                          {formatMoneyValue(sums.secondYear)}
                        </td>
                        <td className={block("cell", ["amount"])}>
                          {formatMoneyValue(sums.subsequentYears)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={block("summary-section")}>
            <h3 className={block("summary-subtitle")}>
              Объём финансового обеспечения в разрезе кодов видов расходов
              (КВР)
            </h3>
            {summaryStats.kvrRows.length === 0 ? (
              <p className={block("status")}>Данные по КВР отсутствуют.</p>
            ) : (
              <div className={block("table-wrapper")}>
                <table className={block("table")}>
                  <thead>
                    <tr>
                      <th>КВР</th>
                      <th>Всего, ₽</th>
                      <th>Текущий ({plan.planYear})</th>
                      <th>1-й год ({firstPlanYr})</th>
                      <th>2-й год ({secondPlanYr})</th>
                      <th>Последующие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryStats.kvrRows.map(({ code, sums }, idx) => (
                      <tr
                        key={code}
                        className={block("row", idx % 2 === 1 ? ["striped"] : [])}
                      >
                        <td>
                          <span className={block("code")}>{code}</span>
                        </td>
                        <td className={block("cell", ["amount"])}>
                          <strong>{formatMoneyValue(sums.total)}</strong>
                        </td>
                        <td className={block("cell", ["amount"])}>
                          {formatMoneyValue(sums.currentYear)}
                        </td>
                        <td className={block("cell", ["amount"])}>
                          {formatMoneyValue(sums.firstYear)}
                        </td>
                        <td className={block("cell", ["amount"])}>
                          {formatMoneyValue(sums.secondYear)}
                        </td>
                        <td className={block("cell", ["amount"])}>
                          {formatMoneyValue(sums.subsequentYears)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {isVersionsOpen && (
        <PurchasePlanVersionsModal
          plan={plan}
          onClose={() => setIsVersionsOpen(false)}
        />
      )}
    </section>
  );
}
